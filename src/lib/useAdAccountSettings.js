import { useEffect, useState } from "react";

export default function useAdAccountSettings(adAccountId) {
    const [loading, setLoading] = useState(true);
    const [documentExists, setDocumentExists] = useState(true); // Track if document exists
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
                const res = await fetch(`https://api.withblip.com/settings/ad-account?adAccountId=${adAccountId}`, {
                    credentials: "include",
                });
                const data = await res.json();

                // Check if the document exists based on response
                if (res.status === 404 || !data.settings || data.error === 'Document not found') {
                    setDocumentExists(false);
                    // Set default empty settings when document doesn't exist
                    setSettings({
                        defaultPage: null,
                        defaultInstagram: null,
                        defaultAdName: "",
                        defaultLink: "",
                        defaultCTA: "LEARN_MORE",
                        defaultUTMs: [],
                        copyTemplates: {},
                        defaultTemplateName: "",
                        creativeEnhancements: {},
                        adNameFormula: null // <--- SET TO NULL INSTEAD OF A DEFAULT OBJECT

                    });
                } else {
                    setDocumentExists(true);
                    const s = data.settings || {};
                    setSettings({
                        defaultPage: s.defaultPage || null,
                        defaultInstagram: s.defaultInstagram || null,
                        defaultAdName: s.defaultAdName || "",
                        defaultLink: s.defaultLink || "",
                        defaultCTA: s.defaultCTA || "LEARN_MORE",
                        defaultUTMs: Array.isArray(s.defaultUTMs) ? s.defaultUTMs : [], // ← store as array
                        copyTemplates: s.copyTemplates,
                        defaultTemplateName: s.defaultTemplateName || "" || {},
                        creativeEnhancements: s.creativeEnhancements || {},
                        adNameFormula: s.adNameFormula || null // <--- SET TO NULL IF IT DOESN'T EXIST


                    });
                }
            } catch (err) {
                console.error("Failed to fetch ad account settings:", err);
                setDocumentExists(false);
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

    };
}