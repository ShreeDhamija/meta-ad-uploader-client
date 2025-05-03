export async function saveCopyTemplate(adAccountId, templateName, templateData, setAsDefault = false) {
    const payload = {
        copyTemplates: {
            [templateName]: templateData
        }
    };

    if (setAsDefault) {
        payload.defaultTemplateName = templateName;
    }

    const response = await fetch("https://meta-ad-uploader-server-production.up.railway.app/settings/save", {
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
