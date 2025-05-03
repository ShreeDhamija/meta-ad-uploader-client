export async function saveSettings({ globalSettings, adAccountSettings, adAccountId }) {
    const response = await fetch("https://meta-ad-uploader-server-production.up.railway.app/settings/save", {
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
