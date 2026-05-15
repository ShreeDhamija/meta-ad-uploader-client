import { useEffect, useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

/**
 * Fetches and caches TikTok advertiser preferences from tiktokDb.
 * Mirrors useAdAccountSettings but for TikTok advertisers.
 *
 * Returns the full settings object, a loading flag, a setter, and a refetch fn.
 */
export default function useTikTokAdvertiserSettings(advertiserId) {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null); // null = not yet loaded

  const tiktokHeaders = useCallback(() => {
    const uid   = localStorage.getItem('tiktok_uid');
    const token = localStorage.getItem('tiktok_token');
    return {
      ...(uid   && { 'x-tiktok-user-id': uid }),
      ...(token && { 'x-tiktok-token': token }),
    };
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!advertiserId) {
      setSettings(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/tiktok/settings/advertiser?advertiserId=${advertiserId}`,
        { credentials: 'include', headers: tiktokHeaders() }
      );
      const data = await res.json();
      setSettings(data.settings || {});
    } catch (err) {
      console.error('[useTikTokAdvertiserSettings] Failed to fetch settings:', err);
      setSettings({});
    } finally {
      setLoading(false);
    }
  }, [advertiserId, tiktokHeaders]);

  // Re-fetch whenever advertiserId changes
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, setSettings, loading, refetch: fetchSettings };
}
