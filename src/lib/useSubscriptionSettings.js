import { useEffect, useState } from "react";
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function useSubscription() {
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
            const res = await fetch(`${API_BASE_URL}/api/subscription/status`, {
                credentials: "include",
            });

            if (res.ok) {
                const data = await res.json();
                setSubscriptionData(data);
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
    }, []);

    const refreshSubscriptionData = () => {
        fetchSubscriptionData();
    };

    const hasActiveAccess = () => {
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

    return {
        loading,
        subscriptionData,
        refreshSubscriptionData,
        hasActiveAccess,
        isOnTrial,
        isTrialExpired,
        isPaidSubscriber
    };
}