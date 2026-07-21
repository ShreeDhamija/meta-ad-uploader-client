const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

/**
 * Save TikTok advertiser preferences to the tiktokDb Firestore database.
 * Mirrors the Meta saveSettings utility but targets the TikTok preferences routes.
 *
 * @param {string} advertiserId  - TikTok advertiser ID
 * @param {object} settings      - Partial or full settings object (merged server-side)
 */
export async function saveTikTokSettings(advertiserId, settings) {
  const headers = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_BASE_URL}/api/tiktok/settings/save`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ advertiserId, settings }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || 'Failed to save TikTok settings');
  }

  return response.json();
}

/**
 * Delete a TikTok ad-text template from Firestore.
 */
export async function deleteTikTokCopyTemplate(advertiserId, templateName) {
  const headers = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_BASE_URL}/api/tiktok/settings/copy-template`, {
    method: 'DELETE',
    credentials: 'include',
    headers,
    body: JSON.stringify({ advertiserId, templateName }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || 'Failed to delete TikTok copy template');
  }

  return response.json();
}
