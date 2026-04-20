const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';
import { logPopupDebug } from "@/lib/popupDebug";

const POPUP_RELATED_GLOBAL_SETTING_KEYS = [
    "hasSeenOnboarding",
    "hasSeenSettingsOnboarding",
    "hasSeenPowerupPopup",
    "hasSeenAnalyticsHomePopup",
    "selectedAdAccountIds",
];


export async function saveSettings({ globalSettings, adAccountSettings, adAccountId }) {
    const changedGlobalSettingKeys = Object.keys(globalSettings || {}).filter((key) =>
        POPUP_RELATED_GLOBAL_SETTING_KEYS.includes(key)
    );

    if (changedGlobalSettingKeys.length > 0) {
        logPopupDebug(
            "saveSettings.globalSettings",
            {
                changedGlobalSettingKeys,
                globalSettings,
                adAccountId,
            },
            { trace: true }
        );
    }

    const response = await fetch(`${API_BASE_URL}/settings/save`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            globalSettings,
            adAccountId,
            adAccountSettings
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(err || "Failed to save settings");
    }

    return response.json();
}
