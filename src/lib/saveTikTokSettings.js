const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

/**
 * Save TikTok advertiser preferences to the tiktokDb Firestore database.
 * Mirrors the Meta saveSettings utility but targets the TikTok preferences routes.
 *
 * @param {string} advertiserId  - TikTok advertiser ID
 * @param {object} settings      - Partial or full settings object (merged server-side)
 */
export async function saveTikTokSettings(advertiserId, settings) {
  const tiktokUid = localStorage.getItem('tiktok_uid');
  const tiktokToken = localStorage.getItem('tiktok_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(tiktokUid  && { 'x-tiktok-user-id': tiktokUid }),
    ...(tiktokToken && { 'x-tiktok-token': tiktokToken }),
  };

  console.log(`[saveTikTokSettings] Saving settings for advertiserId: ${advertiserId}`, settings);

  try {
    const response = await fetch(`${API_BASE_URL}/api/tiktok/settings/save`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ advertiserId, settings }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[saveTikTokSettings] Server returned non-OK status: ${response.status}`, err);
      throw new Error(err || 'Failed to save TikTok settings');
    }

    const data = await response.json();
    console.log(`[saveTikTokSettings] Successfully saved settings for advertiserId: ${advertiserId}`, data);
    return data;
  } catch (err) {
    console.error(`[saveTikTokSettings] Error catching during fetch for advertiserId: ${advertiserId}:`, err);
    throw err;
  }
}

/**
 * Delete a TikTok ad-text template from Firestore.
 */
export async function deleteTikTokCopyTemplate(advertiserId, templateName) {
  const tiktokUid = localStorage.getItem('tiktok_uid');
  const tiktokToken = localStorage.getItem('tiktok_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(tiktokUid   && { 'x-tiktok-user-id': tiktokUid }),
    ...(tiktokToken && { 'x-tiktok-token': tiktokToken }),
  };

  console.log(`[deleteTikTokCopyTemplate] Deleting template "${templateName}" for advertiserId: ${advertiserId}`);

  try {
    const response = await fetch(`${API_BASE_URL}/api/tiktok/settings/copy-template`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
      body: JSON.stringify({ advertiserId, templateName }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[deleteTikTokCopyTemplate] Server returned non-OK status: ${response.status}`, err);
      throw new Error(err || 'Failed to delete TikTok copy template');
    }

    const data = await response.json();
    console.log(`[deleteTikTokCopyTemplate] Successfully deleted template "${templateName}" for advertiserId: ${advertiserId}`, data);
    return data;
  } catch (err) {
    console.error(`[deleteTikTokCopyTemplate] Error catching during fetch for advertiserId: ${advertiserId}:`, err);
    throw err;
  }
}
