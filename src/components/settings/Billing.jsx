"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle } from "lucide-react"
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
    const handleUpgrade = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/stripe/create-checkout-session`, {
                method: 'POST',
                credentials: 'include',
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
        if (isPaidSubscriber())
            return (
                <Badge variant="default" className="bg-green-100 text-green-800">
                    Pro
                </Badge>
            )
        if (isTrialExpired()) return <Badge variant="destructive">Trial Expired</Badge>
        if (isOnTrial())
            return (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Free Trial
                </Badge>
            )
        return <Badge variant="outline">Inactive</Badge>
    }

    return (
        <div className="space-y-6">
            {/* Merged Plan Status and Actions Card */}
            <Card className="rounded-3xl shadow-lg shadow-gray-200/50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <CardIcon className="w-5 h-5" />
                                Manage your billing
                            </CardTitle>
                            <CardDescription className="text-gray-500 text-xs">Upgrade, cancel or add team seats!</CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-600 mb-1 !shadow-none">Plan Type</p>
                            {getStatusBadge()}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Upgrade Button */}
                    {!isPaidSubscriber() && (
                        <Button
                            onClick={handleUpgrade}
                            disabled={isLoading}
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-2xl text-base font-medium h-12"
                            size="lg"
                        >
                            <span className="mr-2">🚀</span>
                            Upgrade To Pro | $500/mo
                        </Button>
                    )}

                    {isPaidSubscriber() && (
                        <div className="space-y-2">
                            {subscriptionData.willCancelAt ? (
                                <>
                                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-2">
                                        <p className="text-sm text-orange-800">
                                            Your subscription will continue until {new Date(subscriptionData.willCancelAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleReactivate}
                                        disabled={isLoading}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-12"
                                    >
                                        Reactivate Subscription | $500/mo
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
                                    Your trial expires in {subscriptionData.trialDaysLeft} day
                                    {subscriptionData.trialDaysLeft !== 1 ? "s" : ""}
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
            <Card className="rounded-3xl shadow-lg shadow-gray-200/50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <img src="https://unpkg.com/@mynaui/icons/icons/rocket.svg" />
                                Pro Plan Benefits
                            </CardTitle>
                            <CardDescription className="text-gray-500" text-xs>{"Here's everything you get by upgrading"}</CardDescription>
                        </div>
                        <div className="text-right items-center flex flex-row space-x-1">
                            <div className="text-2xl font-bold text-gray-900">$500</div>
                            <div className="text-sm text-gray-400">/month</div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span>Unlimited Ad Creation</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span>Multiple ad account support</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span>Template management</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span>Priority support</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
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
