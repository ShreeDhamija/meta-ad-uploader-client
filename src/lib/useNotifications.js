import { useEffect, useState, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function useNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/notifications`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setNotifications(data.notifications || []);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const markAsRead = useCallback(async () => {
        if (notifications.length === 0) return;
        try {
            await fetch(`${API_BASE_URL}/notifications/mark-read`, {
                method: "POST",
                credentials: "include",
            });
            setNotifications([]);
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    }, [notifications]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    return {
        notifications,
        hasUnread: notifications.length > 0,
        loading,
        markAsRead,
    };
}