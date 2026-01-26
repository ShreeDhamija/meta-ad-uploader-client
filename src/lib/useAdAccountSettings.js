import { useEffect, useState } from "react";
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function useAdAccountSettings(adAccountId) {
    const [loading, setLoading] = useState(true);
    const [documentExists, setDocumentExists] = useState(true); // Track if document exists
    const [isFirstEverSave, setIsFirstEverSave] = useState(false); // Add this line
    const [settings, setSettings] = useState({
        defaultPage: null,
        defaultInstagram: null,
        defaultAdName: "",
    });


    useEffect(() => {
        if (!adAccountId) return;
        setLoading(true); // ← This is essential for account switches
        const fetchAdAccountSettings = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/settings/ad-account?adAccountId=${adAccountId}`, {
                    credentials: "include",
                });
                const data = await res.json();
                // In the fetch function, after getting data:


                // Check if the document exists based on response
                if (res.status === 404 || !data.settings || data.error === 'Document not found') {
                    setDocumentExists(false);
                    setIsFirstEverSave(data.isFirstEverSave || false); // Add this line

                    // Set default empty settings when document doesn't exist
                    setSettings({
                        defaultPage: null,
                        defaultInstagram: null,
                        defaultAdName: "",
                        defaultLinkName: "",
                        links: [], // NEW: Array of {url, isDefault}
                        defaultCTA: "LEARN_MORE",
                        defaultUTMs: [],
                        copyTemplates: {},
                        defaultTemplateName: "",
                        creativeEnhancements: {},
                        adNameFormulaV2: { rawInput: "" } // Add this line

                    });
                } else {
                    setDocumentExists(true);
                    setIsFirstEverSave(false); // Add this line

                    const s = data.settings || {};
                    // Migration logic: convert old defaultLink to new links array
                    let links = [];

                    if (s.links && Array.isArray(s.links)) {
                        // New format exists
                        links = s.links;
                    } else if (s.defaultLink) {
                        // Old format - migrate
                        links = [{
                            url: s.defaultLink,
                            isDefault: true
                        }];
                    }
                    setSettings({
                        defaultPage: s.defaultPage || null,
                        defaultInstagram: s.defaultInstagram || null,
                        defaultAdName: s.defaultAdName || "",
                        links: links, // NEW: Use migrated links
                        defaultCTA: s.defaultCTA || "LEARN_MORE",
                        defaultUTMs: Array.isArray(s.defaultUTMs) ? s.defaultUTMs : [], // ← store as array
                        copyTemplates: s.copyTemplates,
                        defaultTemplateName: s.defaultTemplateName || "" || {},
                        creativeEnhancements: s.creativeEnhancements || {},
                        adNameFormulaV2: s.adNameFormulaV2 || { rawInput: "" },
                        adsCreatedCount: s.adsCreatedCount || 0  // ADD THIS LINE




                    });



                }
            } catch (err) {
                console.error("Failed to fetch ad account settings:", err);
                setDocumentExists(false);
                setIsFirstEverSave(false); // Add this line

            } finally {
                setLoading(false);
            }
        };

        fetchAdAccountSettings();
    }, [adAccountId]);

    return {
        loading,
        settings,
        setSettings,
        documentExists,
        isFirstEverSave, // Add this to the return

    };
}