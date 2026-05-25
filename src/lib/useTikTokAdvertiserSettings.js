import { useEffect } from 'react';
import { useAppData } from './AppContext';

/**
 * Fetches and caches TikTok advertiser preferences globally in AppContext.
 * Avoids redundant backend calls and instantly resolves preferences on mount.
 */
export default function useTikTokAdvertiserSettings(advertiserId) {
  const { 
    tiktokSettings, 
    tiktokSettingsLoading, 
    fetchTikTokSettings, 
    updateTikTokSettingsCache 
  } = useAppData();

  const settings = advertiserId ? (tiktokSettings[advertiserId] || null) : null;
  const loading = advertiserId ? (tiktokSettingsLoading[advertiserId] || false) : false;

  useEffect(() => {
    if (advertiserId && !tiktokSettings[advertiserId]) {
      fetchTikTokSettings(advertiserId);
    }
  }, [advertiserId, fetchTikTokSettings, tiktokSettings]);

  const setSettings = (nextVal) => {
    if (advertiserId) {
      const current = tiktokSettings[advertiserId] || {};
      const updated = typeof nextVal === 'function' ? nextVal(current) : nextVal;
      updateTikTokSettingsCache(advertiserId, updated);
    }
  };

  const refetch = () => {
    if (advertiserId) {
      return fetchTikTokSettings(advertiserId, true);
    }
  };

  return { settings, setSettings, loading, refetch };
}
