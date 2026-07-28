import { useEffect, useRef, useState } from "react";
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function useSubscription() {
    const pendingPlanTypeRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [subscriptionData, setSubscriptionData] = useState({
        subscriptionStatus: 'trial',
        planType: 'free_trial',
        trialStartDate: null,
        trialEndDate: null,
        trialDaysLeft: 0,
        isTrialExpired: false
    });

    const fetchSubscriptionData = async () => {
        try {
            setLoading(true);
            let res = await fetch(`${API_BASE_URL}/api/subscription/status`, {
                credentials: "include",
            });

            // A 401 on first load is usually a brief session race right after
            // login. Retry once before giving up — never redirect.
            if (res.status === 401) {
                await new Promise((r) => setTimeout(r, 400));
                res = await fetch(`${API_BASE_URL}/api/subscription/status`, {
                    credentials: "include",
                });
            }

            if (res.ok) {
                const data = await res.json();
                const fetchedPlanType = data.planType === 'agency' ? 'pro' : data.planType;
                const pendingPlanType = pendingPlanTypeRef.current;
                if (pendingPlanType && fetchedPlanType !== pendingPlanType) {
                    setSubscriptionData({
                        ...data,
                        planType: pendingPlanType,
                        subscriptionStatus: 'active',
                        isTrialExpired: false,
                    });
                } else {
                    pendingPlanTypeRef.current = null;
                    setSubscriptionData({
                        ...data,
                        planType: fetchedPlanType,
                    });
                }
            } else {
                console.error("Failed to fetch subscription data:", res.status);
            }
        } catch (err) {
            console.error("Failed to fetch subscription data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscriptionData();

        let refreshTimer;
        const handleSubscriptionUpdated = (event) => {
            const nextPlanType = event.detail?.planType;
            if (nextPlanType) {
                const normalizedPlanType = nextPlanType === 'agency' ? 'pro' : nextPlanType;
                pendingPlanTypeRef.current = normalizedPlanType;
                setSubscriptionData((previous) => ({
                    ...previous,
                    planType: normalizedPlanType,
                    subscriptionStatus: 'active',
                    isTrialExpired: false,
                }));
                setLoading(false);
            }
            clearTimeout(refreshTimer);
            refreshTimer = setTimeout(fetchSubscriptionData, 1500);
        };
        window.addEventListener('subscriptionUpdated', handleSubscriptionUpdated);

        return () => {
            clearTimeout(refreshTimer);
            window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdated);
        };
    }, []);

    const refreshSubscriptionData = () => {
        fetchSubscriptionData();
    };


    const hasActiveAccess = () => {
        // Check if subscription was cancelled and cancel date has passed
        if (subscriptionData.willCancelAt) {
            const cancelDate = new Date(subscriptionData.willCancelAt);
            const now = new Date();
            if (now > cancelDate) return false;
        }




        // Existing logic
        return subscriptionData.subscriptionStatus === 'active' ||
            (subscriptionData.subscriptionStatus === 'trial' && !subscriptionData.isTrialExpired);
    };

    const isOnTrial = () => {
        return subscriptionData.subscriptionStatus === 'trial' && !subscriptionData.isTrialExpired;
    };

    const isTrialExpired = () => {
        return subscriptionData.subscriptionStatus === 'trial' && subscriptionData.isTrialExpired;
    };

    const isPaidSubscriber = () => {
        return subscriptionData.subscriptionStatus === 'active';
    };

    const isPastDue = () => {
        return subscriptionData.subscriptionStatus === 'past_due';
    };


    const extendTrial = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/subscription/extend-trial`, {
                method: 'POST',
                credentials: "include",
            });

            if (res.ok) {
                await fetchSubscriptionData(); // Refresh data after extending
                return { success: true };
            } else {
                const error = await res.json();
                return { success: false, error: error.message };
            }
        } catch (err) {
            console.error("Failed to extend trial:", err);
            return { success: false, error: err.message };
        }
    };

    const canExtendTrial = () => {
        return !subscriptionData.hasExtendedTrial;
    };

    return {
        loading,
        subscriptionData,
        refreshSubscriptionData,
        hasActiveAccess,
        isOnTrial,
        isTrialExpired,
        isPaidSubscriber,
        isPastDue,
        extendTrial,      // add
        canExtendTrial
    };
}
