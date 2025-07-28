const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';


export async function deleteCopyTemplate(adAccountId, templateName) {
    const response = await fetch(`${API_BASE_URL}/settings/delete-template`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            adAccountId,
            templateName
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(err || "Failed to delete template");
    }

    return response.json();
}
