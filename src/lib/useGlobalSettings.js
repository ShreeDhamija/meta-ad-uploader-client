import { useEffect, useState } from "react";

export default function useGlobalSettings() {
    const [loading, setLoading] = useState(true);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
    const [globalDocumentExists, setGlobalDocumentExists] = useState(true); // Add this
    const [adNameFormula, setAdNameFormula] = useState({
        order: ["adType", "dateType", "fileName", "iteration"], // default order
        values: {
            adType: "",
            dateType: "",
            useFileName: false,
            iteration: "",
            customTexts: {} // Add this
        },
        selected: [] // Also add this if it's not already there
    });
    const [hasSeenSettingsOnboarding, setHasSeenSettingsOnboarding] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch("https://api.withblip.com/settings/global", {
                    credentials: "include",
                });
                const data = await res.json();
                if (res.status === 404 || !data.settings || data.error === 'Document not found') {
                    setGlobalDocumentExists(false);
                } else {
                    // Check if document has any meaningful fields
                    const hasAdNameFormula = data.settings?.adNameFormula &&
                        (data.settings.adNameFormula.order ||
                            data.settings.adNameFormula.selected ||
                            data.settings.adNameFormula.values);

                    const hasAnySettings = hasAdNameFormula ||
                        data.settings?.hasSeenOnboarding ||
                        data.settings?.hasSeenSettingsOnboarding;

                    setGlobalDocumentExists(hasAnySettings);
                }

                const rawFormula = data.settings?.adNameFormula || {};
                const defaultOrder = ["adType", "dateType", "fileName", "iteration"];

                setAdNameFormula({
                    order: Array.from(new Set([...(rawFormula.order || defaultOrder)])),
                    selected: Array.isArray(rawFormula.selected) ? rawFormula.selected : [],
                    values: {
                        adType: rawFormula.values?.adType || "",
                        dateType: rawFormula.values?.dateType || "MonthYYYY",
                        fileName: rawFormula.values?.fileName || "",
                        iteration: rawFormula.values?.iteration || "",
                        customTexts: rawFormula.values?.customTexts || {}
                    }
                });

                setHasSeenOnboarding(data.settings?.hasSeenOnboarding || false);
                setHasSeenSettingsOnboarding(data.settings?.hasSeenSettingsOnboarding || false);

            } catch (err) {
                console.error("Failed to fetch global settings:", err);
                setGlobalDocumentExists(false); // Set to false on error

            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);


    return {
        loading,
        adNameFormula,
        setAdNameFormula,
        hasSeenOnboarding,
        hasSeenSettingsOnboarding,
        setHasSeenSettingsOnboarding,
        globalDocumentExists

    };
}
