import { useEffect, useState, useCallback, useRef } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

/**
 * Fetches TikTok advertiser preferences locally from the server,
 * mirroring the Meta useAdAccountSettings hook.
 */
export default function useTikTokAdvertiserSettings(advertiserId) {
  const [loading, setLoading] = useState(true);
  const [documentExists, setDocumentExists] = useState(false);
  const [settings, setSettings] = useState(null);

  const fetchTikTokSettings = useCallback(async (force = false) => {
    if (!advertiserId) return;
    setLoading(true);
    try {
      const storedUid = (() => { try { return localStorage.getItem('tiktok_uid') } catch (_) { return null } })()
      const storedToken = (() => { try { return localStorage.getItem('tiktok_token') } catch (_) { return null } })()
      const headers = { 'Content-Type': 'application/json' }
      if (storedUid) headers['x-tiktok-user-id'] = storedUid
      if (storedToken) headers['x-tiktok-token'] = storedToken

      const res = await fetch(`${API_BASE_URL}/api/tiktok/settings/advertiser?advertiserId=${advertiserId}&_t=${Date.now()}`, {
        credentials: "include",
        headers
      });
      const data = await res.json();

      if (res.status === 404 || !data.settings || data.error === 'Document not found') {
        setDocumentExists(false);
        setSettings({
          creativeEnhancements: {},
          defaultUTMs: [],
          links: [],
          copyTemplates: {},
          defaultTemplateName: "",
        });
      } else {
        setDocumentExists(true);
        const s = data.settings || {};
        setSettings({
          ...s,
          _documentExists: true
        });
      }
    } catch (err) {
      console.error("Failed to fetch TikTok settings:", err);
      setDocumentExists(false);
    } finally {
      setLoading(false);
    }
  }, [advertiserId]);

  const lastFetchedIdRef = useRef(null);

  useEffect(() => {
    if (advertiserId && advertiserId !== lastFetchedIdRef.current) {
      lastFetchedIdRef.current = advertiserId;
      fetchTikTokSettings();
    } else if (!advertiserId) {
      setSettings(null);
      setDocumentExists(false);
      setLoading(false);
      lastFetchedIdRef.current = null;
    }
  }, [advertiserId, fetchTikTokSettings]);

  const updateSettings = useCallback((nextVal) => {
    setSettings(prev => {
      const current = prev || {};
      const updated = typeof nextVal === "function" ? nextVal(current) : nextVal;
      return { ...updated, _documentExists: true };
    });
    setDocumentExists(true);
  }, []);

  const refetch = useCallback(() => {
    return fetchTikTokSettings(true);
  }, [fetchTikTokSettings]);

  return {
    settings,
    setSettings: updateSettings,
    loading,
    refetch,
    documentExists
  };
}
