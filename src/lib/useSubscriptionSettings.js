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

            // Session is unrecoverable client-side (likely cookie rotation race).
            // Force a clean re-auth: set a flag so AuthContext skips /auth/me on
            // the next load, best-effort kill the server session, then redirect.
            // Skip if we're already on /login — AppContext mounts these hooks
            // globally, and re-firing the redirect from there causes a loop.
            if (res.status === 401) {
                if (window.location.pathname !== '/login') {
                    sessionStorage.setItem('forceLogout', '1');
                    fetch(`${API_BASE_URL}/auth/logout`, {
                        method: 'POST',
                        credentials: 'include',
                        keepalive: true,
                    }).catch(() => { });
                    window.location.href = '/login';
                }
                return;
            }

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