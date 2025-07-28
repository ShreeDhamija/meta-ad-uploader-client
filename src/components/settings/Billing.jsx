"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import useSubscription from "@/lib/useSubscriptionSettings"
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function BillingSettings() {
    const [isLoading, setIsLoading] = useState(false)
    const {
        loading,
        subscriptionData,
        refreshSubscriptionData,
        hasActiveAccess,
        isOnTrial,
        isTrialExpired,
        isPaidSubscriber,
    } = useSubscription()

    const handleUpgrade = async () => {
        // For now, just show a message since we don't have Stripe yet
        toast.info("Upgrade functionality will be available soon!")
    }

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
                    Active
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
                                <img src="https://unpkg.com/@mynaui/icons/icons/credit-card.svg" />
                                Your Plan
                            </CardTitle>
                            <CardDescription className="text-gray-500 text-xs">Your current plan type</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 mb-1">Plan Type</p>
                            {getStatusBadge()}
                        </div>

                        {isOnTrial() && (
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-600 mb-1">Trial Ends</p>
                                <p className="text-md font-semibold text-red-500">{subscriptionData.trialDaysLeft} days</p>
                            </div>
                        )}
                    </div>

                    {/* Upgrade Button */}
                    {!isPaidSubscriber() && (
                        <Button
                            onClick={handleUpgrade}
                            disabled={isLoading}
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-2xl text-base font-medium h-12"
                            size="lg"
                        >
                            <span className="mr-2">🚀</span>
                            Upgrade To Pro | $400/mo
                        </Button>
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
                            <div className="text-2xl font-bold text-gray-900">$400</div>
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
        </div>
    )
}
