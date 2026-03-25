import { useEffect, useState, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";

/**
 * useTeamSync hook
 * 
 * Fetches and manages the team settings sync status.
 * Returns everything the UI needs to show the sync toggle
 * and handle enable/disable.
 */
export default function useTeamSync() {
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [syncStatus, setSyncStatus] = useState({
        inTeam: false,
        syncEnabled: false,
        isOwner: false,
        teamName: null,
    });

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/settings/sync/status`, {
                credentials: "include",
            });
            const data = await res.json();
            setSyncStatus(data);
        } catch (err) {
            console.error("Failed to fetch sync status:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const enableSync = useCallback(async () => {
        setToggling(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settings/sync/enable`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();

            if (data.success) {
                setSyncStatus((prev) => ({ ...prev, syncEnabled: true }));
                return { success: true, message: data.message, seededCount: data.seededCount };
            }
            return { success: false, error: data.error };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            setToggling(false);
        }
    }, []);

    const disableSync = useCallback(async () => {
        setToggling(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settings/sync/disable`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();

            if (data.success) {
                setSyncStatus((prev) => ({ ...prev, syncEnabled: false }));
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            setToggling(false);
        }
    }, []);

    return {
        loading,
        toggling,
        ...syncStatus,
        enableSync,
        disableSync,
        refetch: fetchStatus,
    };
}