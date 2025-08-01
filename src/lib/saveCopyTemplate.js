const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';


export async function saveCopyTemplate(adAccountId, templateName, templateData, setAsDefault = false) {
    const payload = {
        copyTemplates: {
            [templateName]: templateData
        }
    };

    if (setAsDefault) {
        payload.defaultTemplateName = templateName;
    }

    const response = await fetch(`${API_BASE_URL}/settings/save`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            adAccountId,
            adAccountSettings: payload
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(err || "Failed to save template");
    }

    return response.json();
}
