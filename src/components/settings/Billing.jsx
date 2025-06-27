import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Calendar, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import useSubscription from "@/lib/useSubscriptionSettings";

export default function BillingSettings() {
    const [isLoading, setIsLoading] = useState(false);
    const {
        loading,
        subscriptionData,
        refreshSubscriptionData,
        hasActiveAccess,
        isOnTrial,
        isTrialExpired,
        isPaidSubscriber
    } = useSubscription();

    const handleUpgrade = async () => {
        // For now, just show a message since we don't have Stripe yet
        toast.info('Upgrade functionality will be available soon!');
    };

    // Remove Stripe-related functions since we don't need them yet
    // const handleCancelSubscription = async () => { ... }
    // const handleManageBilling = async () => { ... }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-24 bg-gray-200 rounded-lg"></div>
                </div>
            </div>
        );
    }

    const getStatusIcon = () => {
        if (isPaidSubscriber()) return <CheckCircle className="w-5 h-5 text-green-600" />;
        if (isTrialExpired()) return <AlertCircle className="w-5 h-5 text-red-600" />;
        if (isOnTrial()) return <Clock className="w-5 h-5 text-blue-600" />;
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    };

    const getStatusBadge = () => {
        if (isPaidSubscriber()) return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
        if (isTrialExpired()) return <Badge variant="destructive">Trial Expired</Badge>;
        if (isOnTrial()) return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Free Trial</Badge>;
        return <Badge variant="outline">Inactive</Badge>;
    };

    // const formatDate = (dateString) => {
    //     if (!dateString) return 'N/A';
    //     const date = new Date(dateString);
    //     return date.toLocaleDateString('en-US', {
    //         year: 'numeric',
    //         month: 'long',
    //         day: 'numeric'
    //     });
    // };

    return (
        <div className="space-y-6">
            {/* Current Plan Status */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                {getStatusIcon()}
                                Current Plan
                            </CardTitle>
                            <CardDescription>
                                Your current subscription status and plan details
                            </CardDescription>
                        </div>
                        {getStatusBadge()}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Plan Type</p>
                            <p className="text-lg font-semibold capitalize">
                                {subscriptionData.planType?.replace('_', ' ') || 'Free Trial'}
                            </p>
                        </div>

                        {isOnTrial() && (
                            <div>
                                <p className="text-sm font-medium text-gray-600">Trial Days Remaining</p>
                                <p className="text-lg font-semibold text-blue-600">
                                    {subscriptionData.trialDaysLeft} days
                                </p>
                            </div>
                        )}

                        {/* {subscriptionData.trialEndDate && (
                            <div>
                                <p className="text-sm font-medium text-gray-600">
                                    {isOnTrial() ? 'Trial Ends' : 'Trial Ended'}
                                </p>
                                <p className="text-lg font-semibold">
                                    {formatDate(subscriptionData.trialEndDate?.seconds ?
                                        new Date(subscriptionData.trialEndDate.seconds * 1000) :
                                        subscriptionData.trialEndDate)}
                                </p>
                            </div>
                        )} */}

                        {/* Remove next billing date section since we don't have paid plans yet */}
                    </div>

                    {/* Trial Warning */}
                    {isOnTrial() && subscriptionData.trialDaysLeft <= 3 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                                <p className="text-sm font-medium text-yellow-800">
                                    Your trial expires in {subscriptionData.trialDaysLeft} day{subscriptionData.trialDaysLeft !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <p className="text-sm text-yellow-700 mt-1">
                                Upgrade now to continue using all features without interruption.
                            </p>
                        </div>
                    )}

                    {/* Trial Expired Warning */}
                    {isTrialExpired() && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <p className="text-sm font-medium text-red-800">
                                    Your trial has expired
                                </p>
                            </div>
                            <p className="text-sm text-red-700 mt-1">
                                Upgrade to a paid plan to continue using the service.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Billing Actions
                    </CardTitle>
                    <CardDescription>
                        Manage your subscription and billing preferences
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {!isPaidSubscriber() && (
                            <Button
                                onClick={handleUpgrade}
                                disabled={isLoading}
                                className="flex items-center gap-2"
                            >
                                <CreditCard className="w-4 h-4" />
                                {isTrialExpired() ? 'Subscribe Now' : 'Upgrade to Pro'}
                            </Button>
                        )}

                        {/* Remove paid subscriber actions since we don't have Stripe yet */}
                    </div>

                    {/* Placeholder for future features */}
                    <div className="pt-4 border-t">
                        <p className="text-sm text-gray-500 mb-2">Coming Soon:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-400">
                            <span>• Download Invoices</span>
                            <span>• Usage Analytics</span>
                            <span>• Team Plans</span>
                            <span>• Add-on Features</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Plan Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Plan Features</CardTitle>
                    <CardDescription>
                        What's included in your current plan
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Unlimited ad creation</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Multiple ad account support</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Template management</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Priority support</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}