import { useEffect, useState } from "react";

export default function useAdAccountSettings(adAccountId) {
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        defaultPage: null,
        defaultInstagram: null,
        defaultAdName: "",
    });

    useEffect(() => {
        if (!adAccountId) return;

        const fetchAdAccountSettings = async () => {
            try {
                const res = await fetch(`https://meta-ad-uploader-server-production.up.railway.app/settings/ad-account?adAccountId=${adAccountId}`, {
                    credentials: "include",
                });
                const data = await res.json();
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


                });


            } catch (err) {
                console.error("Failed to fetch ad account settings:", err);
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
    };
}
