import { useEffect, useState } from "react";
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function useGlobalSettings() {
    const [loading, setLoading] = useState(true);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
    const [hasSeenSettingsOnboarding, setHasSeenSettingsOnboarding] = useState(false);
    const [selectedAdAccountIds, setSelectedAdAccountIds] = useState([])

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/settings/global`, {
                credentials: "include",
            });
            const data = await res.json();
            console.log("Raw API response:", data); // Debug log
            console.log("selectedAdAccountIds from API:", data?.settings?.selectedAdAccountIds)


            setHasSeenOnboarding(data?.settings?.hasSeenOnboarding || false);
            setHasSeenSettingsOnboarding(data?.settings?.hasSeenSettingsOnboarding || false);
            setSelectedAdAccountIds(data?.settings?.selectedAdAccountIds || [])

        } catch (err) {
            console.error("Failed to fetch global settings:", err);
            setHasSeenOnboarding(false);
            setSelectedAdAccountIds([]);
            setHasSeenSettingsOnboarding(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();

        // Listen for updates and refetch
        const handleUpdate = () => fetchSettings();
        window.addEventListener('globalSettingsUpdated', handleUpdate);

        return () => window.removeEventListener('globalSettingsUpdated', handleUpdate);
    }, []);




    return {
        loading,
        hasSeenOnboarding,
        hasSeenSettingsOnboarding,
        setHasSeenSettingsOnboarding,
        selectedAdAccountIds, // Changed from selectedAdAccountId


    };
}