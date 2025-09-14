import { useEffect, useState } from "react";
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function useGlobalSettings() {
    const [loading, setLoading] = useState(true);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
    const [hasSeenSettingsOnboarding, setHasSeenSettingsOnboarding] = useState(false);
    const [selectedAdAccountId, setSelectedAdAccountId] = useState(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/settings/global`, {
                    credentials: "include",
                });
                // We don't need to worry about 404s, the optional chaining below handles it.
                const data = await res.json();

                // Safely get settings, defaulting to false if they don't exist.
                setHasSeenOnboarding(data?.settings?.hasSeenOnboarding || false);
                setHasSeenSettingsOnboarding(data?.settings?.hasSeenSettingsOnboarding || false);
                setSelectedAdAccountId(data?.settings?.selectedAdAccountId || null);


            } catch (err) {
                console.error("Failed to fetch global settings:", err);
                // On error, assume they haven't seen popups.
                setHasSeenOnboarding(false);
                setSelectedAdAccountId(null);
                setHasSeenSettingsOnboarding(false);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);


    return {
        loading,
        hasSeenOnboarding,
        hasSeenSettingsOnboarding,
        setHasSeenSettingsOnboarding,
        selectedAdAccountId,

    };
}