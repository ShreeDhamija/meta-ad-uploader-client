import { useEffect, useRef } from 'react';
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

  const lastFetchedIdRef = useRef(null);

  useEffect(() => {
    if (advertiserId && advertiserId !== lastFetchedIdRef.current) {
      lastFetchedIdRef.current = advertiserId;
      fetchTikTokSettings(advertiserId, true);
    }
  }, [advertiserId, fetchTikTokSettings]);

  const setSettings = (nextVal) => {
    if (advertiserId) {
      const current = tiktokSettings[advertiserId] || {};
      const updated = typeof nextVal === 'function' ? nextVal(current) : nextVal;
      updateTikTokSettingsCache(advertiserId, { ...updated, _documentExists: true });
    }
  };

  const refetch = () => {
    if (advertiserId) {
      return fetchTikTokSettings(advertiserId, true);
    }
  };

  const documentExists = settings ? (settings._documentExists ?? false) : false;

  return { settings, setSettings, loading, refetch, documentExists };
}
