"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
// import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle, Users, Copy, X, CreditCard, Trash2, Loader } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogOverlay, // Add this import

} from "@/components/ui/dialog"
import useSubscription from "@/lib/useSubscriptionSettings"
import CardIcon from '@/assets/icons/card.svg?react';
import CheckIcon from '@/assets/icons/check.svg?react';
import CheckIcon2 from '@/assets/icons/check2.svg?react';
import MailIcon from '@/assets/icons/mail.svg?react';
import RocketIcon from '@/assets/icons/rocket2.webp';
import LightningIcon from '@/assets/icons/zap.webp';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';




export default function BillingSettings() {
    const [isLoading, setIsLoading] = useState(false)
    const [showCancelDialog, setShowCancelDialog] = useState(false)
    const {
        loading,
        subscriptionData,
        refreshSubscriptionData,
        hasActiveAccess,
        isOnTrial,
        isTrialExpired,
        isPaidSubscriber,
    } = useSubscription()



    // In Billing.jsx, update the API calls:
    const handleUpgrade = async (planType = 'agency') => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/stripe/create-checkout-session`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ planType }),

            });

            const { url } = await response.json();
            window.location.href = url;
        } catch (error) {
            toast.error("Failed to start upgrade process");
        } finally {
            setIsLoading(false);
        }
    };


    const handleReactivate = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/stripe/reactivate-subscription`, {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                toast.success("Subscription reactivated successfully!");
                refreshSubscriptionData();
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to reactivate subscription");
            }
        } catch (error) {
            toast.error("Failed to reactivate subscription");
        } finally {
            setIsLoading(false);
        }
    };


    const handleCancel = () => {
        setShowCancelDialog(true);
    };

    const confirmCancel = async () => {
        setShowCancelDialog(false);
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/stripe/cancel-subscription`, {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                toast.success("Subscription will cancel at the end of your billing period");
                refreshSubscriptionData();
            }
        } catch (error) {
            toast.error("Failed to cancel subscription");
        } finally {
            setIsLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-2xl mb-4"></div>
                    <div className="h-24 bg-gray-200 rounded-2xl"></div>
                </div>
            </div>
        )
    }


    const getStatusBadge = () => {
        if (isPaidSubscriber()) {
            // Check if subscription was cancelled and date has passed
            if (subscriptionData.willCancelAt) {
                const cancelDate = new Date(subscriptionData.willCancelAt);
                const now = new Date();
                if (now > cancelDate) {
                    return <Badge variant="destructive">Expired</Badge>
                }
            }
            return (
                <Badge variant="default" className="bg-green-100 text-green-800">
                    {subscriptionData.planType}
                </Badge>
            )
        }
        if (isTrialExpired()) return <Badge variant="destructive">Trial Expired</Badge>
        if (isOnTrial())
            return (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Free Trial
                </Badge>
            )
        return <Badge variant="outline">Inactive</Badge>
    }

    const isTeamMember = subscriptionData.teamId && !subscriptionData.isTeamOwner;

    return (
        <div className="space-y-6">
            {/* Merged Plan Status and Actions Card */}

            {!isTeamMember && (
                <>

                    <Card className="rounded-3xl shadow-lg shadow-gray-200/50">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <CardIcon className="w-5 h-5" />
                                        Manage your billing
                                    </CardTitle>
                                    <CardDescription className="text-gray-500 text-xs">Upgrade or cancel your subscription</CardDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-600 mb-1 !shadow-none">Plan Type</p>
                                    {getStatusBadge()}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isPaidSubscriber() && (
                                <div className="space-y-2">
                                    {subscriptionData.willCancelAt ? (
                                        <>
                                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-2">
                                                <p className="text-sm text-orange-800">
                                                    {(() => {
                                                        const cancelDate = new Date(subscriptionData.willCancelAt);
                                                        const now = new Date();
                                                        const hasExpired = now > cancelDate;

                                                        return hasExpired
                                                            ? `Your subscription expired on ${cancelDate.toLocaleDateString()}`
                                                            : `Your subscription will continue until ${cancelDate.toLocaleDateString()}. 
                                                            Your team members will lose access after this date as well.`;
                                                    })()}
                                                </p>
                                            </div>
                                            <Button onClick={handleReactivate}
                                                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-12"
                                                disabled={isLoading}
                                            >
                                                Reactivate Subscription
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            onClick={handleCancel}
                                            variant="destructive"
                                            disabled={isLoading}
                                            className="w-full h-12 rounded-2xl"
                                        >
                                            Cancel Subscription
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Trial Warning */}
                            {isOnTrial() && subscriptionData.trialDaysLeft <= 3 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                                        <p className="text-sm font-medium text-yellow-800">
                                            {subscriptionData.trialDaysLeft == 0 ? "Your trial is expired" : `Your trial expires in ${subscriptionData.trialDaysLeft} day`}
                                            {(subscriptionData.trialDaysLeft == 1 || subscriptionData.trialDaysLeft == 0) ? "" : "s"}
                                        </p>
                                    </div>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        Upgrade now to continue using all features without interruption.
                                    </p>
                                </div>
                            )}

                            {/* Trial Expired Warning */}
                            {isTrialExpired() && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-red-600" />
                                        <p className="text-sm font-medium text-red-800">Your trial has expired</p>
                                    </div>
                                    <p className="text-sm text-red-700 mt-1">Upgrade to a paid plan to continue using the service.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pro Plan Benefits */}
                    {!isPaidSubscriber() && (
                        < div className="flex flex-col md:flex-row gap-3">
                            {/* Pro Plan */}
                            <Card className="flex-1 rounded-[20px] ">
                                <CardHeader className="p-1">
                                    <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-6 shadow-[0_2px_10px_0px_rgba(34,197,94,0.15)] border border-2 border-green-100">
                                        <div>
                                            <CardTitle className="flex items-center text-lg">
                                                <img src={RocketIcon} alt="Pro" className="w-10 h-10" />
                                                <p className="text-[26px] font-bold">Pro</p>
                                            </CardTitle>
                                            <CardDescription className="text-gray-400 text-xs">Billed monthly</CardDescription>
                                        </div>
                                        <>
                                            {/* Google Font link */}
                                            <link
                                                rel="stylesheet"
                                                href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@500&display=swap"
                                            />

                                            <div>
                                                <div
                                                    className="text-4xl font-bold text-gray-900"
                                                    style={{ fontFamily: "'DM Mono', monospace" }}
                                                >
                                                    $370
                                                </div>
                                                <div className="text-sm text-gray-400">/month</div>
                                            </div>
                                        </>

                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 p-6 pb-8">
                                    <div className="flex items-center gap-3 text-sm">
                                        <CheckIcon className="w-6 h-6" />
                                        <span className="text-[16px] text-gray-500">Unlimited Ad Accounts</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <CheckIcon className="w-6 h-6" />
                                        <span className="text-[16px] text-gray-500">Unlimited Ad Posting</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <CheckIcon className="w-6 h-6" />
                                        <span className="text-[16px] text-gray-500">Instant Settings Sync</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <CheckIcon className="w-6 h-6" />
                                        <span className="text-[16px] text-gray-500">Unlimited Team Seats</span>
                                    </div>
                                    <Button
                                        onClick={() => handleUpgrade('agency')}
                                        disabled={isLoading}
                                        className="w-full bg-zinc-800 hover:bg-zinc-900 text-white py-3 rounded-2xl text-base font-medium h-12"
                                        size="lg"
                                    >
                                        Upgrade
                                    </Button>

                                </CardContent>


                            </Card>


                            <Card className="flex-1 rounded-[20px]">
                                <CardHeader className="p-1">
                                    <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-6 shadow-[0_2px_10px_0px_rgba(255,215,0,0.15)] border border-2 border-yellow-200/50">
                                        <div>
                                            <CardTitle className="flex items-center text-lg">
                                                <img src={LightningIcon} alt="Team Seats" className="w-10 h-10" />
                                                <p className="text-[26px] font-bold">Light</p>
                                            </CardTitle>
                                            <CardDescription className="text-gray-400 text-xs">Billed monthly</CardDescription>
                                        </div>
                                        <div>
                                            <>
                                                {/* Google Font link */}
                                                <link
                                                    rel="stylesheet"
                                                    href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@500&display=swap"
                                                />

                                                <div>
                                                    <div
                                                        className="text-4xl font-bold text-gray-900"
                                                        style={{ fontFamily: "'DM Mono', monospace" }}
                                                    >
                                                        $199
                                                    </div>
                                                    <div className="text-sm text-gray-400">/month</div>
                                                </div>
                                            </>

                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 p-6 pb-8">
                                    <div className="flex items-center gap-3 text-sm">
                                        <CheckIcon2 className="w-6 h-6" />
                                        <span className="text-[16px] text-gray-500">Up to 3 Ad Accounts</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <CheckIcon2 className="w-6 h-6" />
                                        <span className="text-[16px] text-gray-500">Unlimited Ad Posting</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <CheckIcon2 className="w-6 h-6" />
                                        <span className="text-[16px] text-gray-500">Instant Settings Sync</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <CheckIcon2 className="w-6 h-6" />
                                        <span className="text-[16px] text-gray-500">Unlimited Team Seats</span>
                                    </div>
                                    <Button
                                        onClick={() => handleUpgrade('brand')}
                                        disabled={isLoading}
                                        className="w-full bg-zinc-800 hover:bg-zinc-900 text-white py-3 rounded-2xl text-base font-medium h-12"
                                        size="lg"
                                    >
                                        Upgrade
                                    </Button>

                                </CardContent>
                            </Card>

                        </div>


                    )}
                </>
            )}
            <Button
                asChild
                className="w-full flex items-center justify-center gap-2 bg-white rounded-2xl text-black border border-gray-200/90 h-12 hover:bg-gray-100/40"
            >
                <a
                    href="mailto:shree@withblip.com"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <MailIcon className="!w-6 !h-6" />
                    Contact us For Help
                </a>
            </Button>


            {isTeamMember && (
                <Card className="rounded-3xl shadow-lg shadow-gray-200/50">
                    <CardContent className="pt-6">
                        <div className="text-center py-4">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600 font-medium">You're part of a team plan</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Billing is managed by your team owner
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Cancel Confirmation Dialog */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogOverlay className="bg-black/50 !-mt-[20px]" />
                <DialogContent className="sm:max-w-[425px] !rounded-[30px] p-8 space-y-6">
                    <DialogHeader className="space-y-4">
                        <DialogTitle className="text-xl">Cancel Subscription</DialogTitle>
                        <DialogDescription className="text-base leading-relaxed">
                            Are you sure you want to cancel your subscription? Your plan will remain active until the end of your
                            current billing period.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
                        <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="rounded-2xl flex-1">
                            Keep Subscription
                        </Button>
                        <Button onClick={confirmCancel} className="bg-red-600 hover:bg-red-700 rounded-2xl flex-1">
                            Yes, Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
