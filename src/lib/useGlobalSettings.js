// import { useEffect, useState } from "react";
// const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

// export default function useGlobalSettings() {
//     const [loading, setLoading] = useState(true);
//     const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
//     const [hasSeenSettingsOnboarding, setHasSeenSettingsOnboarding] = useState(false);
//     const [selectedAdAccountIds, setSelectedAdAccountIds] = useState([])

//     const fetchSettings = async () => {
//         try {
//             const res = await fetch(`${API_BASE_URL}/settings/global`, {
//                 credentials: "include",
//             });
//             const data = await res.json();



//             setHasSeenOnboarding(data?.settings?.hasSeenOnboarding || false);
//             setHasSeenSettingsOnboarding(data?.settings?.hasSeenSettingsOnboarding || false);
//             setSelectedAdAccountIds(data?.settings?.selectedAdAccountIds || [])

//         } catch (err) {
//             console.error("Failed to fetch global settings:", err);
//             setHasSeenOnboarding(false);
//             setSelectedAdAccountIds([]);
//             setHasSeenSettingsOnboarding(false);
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchSettings();

//         // Listen for updates and refetch
//         const handleUpdate = () => fetchSettings();
//         window.addEventListener('globalSettingsUpdated', handleUpdate);

//         return () => window.removeEventListener('globalSettingsUpdated', handleUpdate);
//     }, []);




//     return {
//         loading,
//         hasSeenOnboarding,
//         hasSeenSettingsOnboarding,
//         setHasSeenSettingsOnboarding,
//         selectedAdAccountIds, // Changed from selectedAdAccountId


//     };
// }

import { useEffect, useMemo, useState } from "react";
import { LEGACY_FLAG_TO_CARD_ID } from "./onboardingCards";
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function useGlobalSettings() {
    const [loading, setLoading] = useState(true);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
    const [hasSeenSettingsOnboarding, setHasSeenSettingsOnboarding] = useState(false);
    const [hasSeenAnalyticsOnboarding, setHasSeenAnalyticsOnboarding] = useState(false);
    const [hasSeenAnalyticsHomePopup, setHasSeenAnalyticsHomePopup] = useState(false);
    const [hasSeenPowerupPopup, setHasSeenPowerupPopup] = useState(false);
    const [seenOnboardingCards, setSeenOnboardingCards] = useState([]);
    const [selectedAdAccountIds, setSelectedAdAccountIds] = useState([])
    const [uploadSources, setUploadSources] = useState(['local', 'drive', 'dropbox']);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/settings/global`, {
                credentials: "include",
            });
            const data = await res.json();

            setHasSeenOnboarding(data?.settings?.hasSeenOnboarding || false);
            setHasSeenSettingsOnboarding(data?.settings?.hasSeenSettingsOnboarding || false);
            setHasSeenAnalyticsOnboarding(data?.settings?.hasSeenAnalyticsOnboarding || false);
            setHasSeenAnalyticsHomePopup(data?.settings?.hasSeenAnalyticsHomePopup || false);
            setHasSeenPowerupPopup(data?.settings?.hasSeenPowerupPopup || false);
            setSeenOnboardingCards(
                Array.isArray(data?.settings?.seenOnboardingCards)
                    ? data.settings.seenOnboardingCards
                    : []
            );
            setSelectedAdAccountIds(data?.settings?.selectedAdAccountIds || [])
            setUploadSources(
                Array.isArray(data?.settings?.uploadSources)
                    ? data.settings.uploadSources
                    : ['local', 'drive', 'dropbox']
            );

        } catch (err) {
            console.error("Failed to fetch global settings:", err);
            setHasSeenOnboarding(false);
            setSelectedAdAccountIds([]);
            setHasSeenSettingsOnboarding(false);
            setHasSeenAnalyticsOnboarding(false);
            setHasSeenAnalyticsHomePopup(false);
            setHasSeenPowerupPopup(false);
            setSeenOnboardingCards([]);
            setUploadSources(['local', 'drive', 'dropbox']);
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

    // Merges new-style seenOnboardingCards with legacy per-feature flags so
    // existing users who already saw a feature popup don't see it again.
    const effectiveSeenOnboardingIds = useMemo(() => {
        const set = new Set(seenOnboardingCards);
        const legacy = { hasSeenPowerupPopup, hasSeenAnalyticsHomePopup };
        Object.entries(LEGACY_FLAG_TO_CARD_ID).forEach(([flag, id]) => {
            if (legacy[flag]) set.add(id);
        });
        return Array.from(set);
    }, [seenOnboardingCards, hasSeenPowerupPopup, hasSeenAnalyticsHomePopup]);

    return {
        loading,
        hasSeenOnboarding,
        setHasSeenOnboarding,
        hasSeenSettingsOnboarding,
        setHasSeenSettingsOnboarding,
        hasSeenAnalyticsOnboarding,
        hasSeenAnalyticsHomePopup,
        setHasSeenAnalyticsHomePopup,
        hasSeenPowerupPopup,
        setHasSeenPowerupPopup,
        seenOnboardingCards,
        setSeenOnboardingCards,
        effectiveSeenOnboardingIds,
        selectedAdAccountIds,
        uploadSources,
        setUploadSources,
    };
}
