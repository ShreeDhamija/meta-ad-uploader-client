const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';


export async function saveSettings({ globalSettings, adAccountSettings, adAccountId }) {
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
