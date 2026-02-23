import { useEffect, useState } from "react";
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function useAdAccountSettings(adAccountId) {
    const [loading, setLoading] = useState(true);
    const [documentExists, setDocumentExists] = useState(true);
    const [isFirstEverSave, setIsFirstEverSave] = useState(false);
    const [settings, setSettings] = useState({
        defaultPage: null,
        defaultInstagram: null,
        defaultAdName: "",
    });


    useEffect(() => {
        if (!adAccountId) return;
        setLoading(true);
        const fetchAdAccountSettings = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/settings/ad-account?adAccountId=${adAccountId}`, {
                    credentials: "include",
                });
                const data = await res.json();


                if (res.status === 404 || !data.settings || data.error === 'Document not found') {
                    setDocumentExists(false);
                    setIsFirstEverSave(data.isFirstEverSave || false);

                    setSettings({
                        defaultPage: null,
                        defaultInstagram: null,
                        defaultAdName: "",
                        defaultLinkName: "",
                        links: [],
                        defaultCTA: "LEARN_MORE",
                        defaultUTMs: [],
                        copyTemplates: {},
                        defaultTemplateName: "",
                        creativeEnhancements: {},
                        adNameFormulaV2: { rawInput: "" },
                        // Analytics settings (defaults)
                        anomalyThresholds: { cpaSpike: 50, overspend: 150 },
                        targetCPA: null,
                        targetROAS: null,
                        slackAlertsEnabled: false,
                    });
                } else {
                    setDocumentExists(true);
                    setIsFirstEverSave(false);

                    const s = data.settings || {};
                    // Migration logic: convert old defaultLink to new links array
                    let links = [];

                    if (s.links && Array.isArray(s.links)) {
                        links = s.links;
                    } else if (s.defaultLink) {
                        links = [{
                            url: s.defaultLink,
                            isDefault: true
                        }];
                    }
                    setSettings({
                        defaultPage: s.defaultPage || null,
                        defaultInstagram: s.defaultInstagram || null,
                        defaultAdName: s.defaultAdName || "",
                        links: links,
                        defaultCTA: s.defaultCTA || "LEARN_MORE",
                        defaultUTMs: Array.isArray(s.defaultUTMs) ? s.defaultUTMs : [],
                        copyTemplates: s.copyTemplates,
                        defaultTemplateName: s.defaultTemplateName || "" || {},
                        creativeEnhancements: s.creativeEnhancements || {},
                        adNameFormulaV2: s.adNameFormulaV2 || { rawInput: "" },
                        adsCreatedCount: s.adsCreatedCount || 0,
                        // Analytics settings (from Firestore)
                        anomalyThresholds: s.anomalyThresholds || { cpaSpike: 50, overspend: 150 },
                        targetCPA: s.targetCPA || null,
                        targetROAS: s.targetROAS || null,
                        slackAlertsEnabled: s.slackAlertsEnabled || false,
                    });
                }
            } catch (err) {
                console.error("Failed to fetch ad account settings:", err);
                setDocumentExists(false);
                setIsFirstEverSave(false);

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
        isFirstEverSave,
    };
}