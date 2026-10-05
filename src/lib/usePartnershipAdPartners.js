import { useAuth } from "@/lib/AuthContext";
import { partnersCacheGeneration, partnersCacheKey, readPartnersCache, writePartnersCache } from "@/lib/dataCache";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";

export default function usePartnershipAdPartners(instagramAccountId, pageId) {
  const { userId } = useAuth();
  const cacheKey = partnersCacheKey(API_BASE_URL, userId, pageId, instagramAccountId);
  const [state, setState] = useState({ key: null, partners: [], isLoading: false, error: null, lastUpdated: null });
  const activeRequest = useRef(null);

  const fetchPartners = useCallback(async (force = false) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const generation = partnersCacheGeneration();
    const isCurrent = () => !controller.signal.aborted && generation === partnersCacheGeneration();

    if (!cacheKey) {
      setState({ key: cacheKey, partners: [], isLoading: false, error: null, lastUpdated: null });
      return;
    }
    setState((previous) => ({
      key: cacheKey, partners: [], isLoading: true, error: null,
      lastUpdated: previous.key === cacheKey ? previous.lastUpdated : null,
    }));

    try {
      if (!force) {
        const cached = await readPartnersCache(cacheKey);
        if (!isCurrent()) return;
        if (cached !== null) {
          setState({ key: cacheKey, partners: cached.partners, isLoading: false, error: null, lastUpdated: cached.savedAt });
          return;
        }
      }

      const response = await axios.get(`${API_BASE_URL}/auth/partnership-ads/partners`, {
        params: { instagramAccountId, pageId },
        withCredentials: true,
        signal: controller.signal,
      });
      if (!isCurrent()) return;
      if (!response.data.success || !Array.isArray(response.data.data)) {
        throw new Error('Failed to fetch partners');
      }
      const partners = response.data.data.map((partner) => ({
        id: partner.id,
        creatorIgId: partner.creator_ig_id,
        creatorUsername: partner.creator_username,
        creatorFbPageId: partner.creator_fb_page_id,
      }));
      const lastUpdated = Date.now();
      setState({ key: cacheKey, partners, isLoading: false, error: null, lastUpdated });
      // The server returns only after all pages succeed. Failed refreshes never
      // replace the last complete cached list or extend its original expiry.
      void writePartnersCache(cacheKey, partners, generation, lastUpdated);
    } catch (err) {
      if (!isCurrent()) return;
      setState((previous) => ({
        key: cacheKey,
        partners: [],
        isLoading: false,
        lastUpdated: previous.key === cacheKey ? previous.lastUpdated : null,
        error: err.response?.data?.error || 'Failed to fetch partners. Please refresh to try again.',
      }));
    }
  }, [cacheKey, instagramAccountId, pageId]);

  useEffect(() => {
    fetchPartners();
    return () => activeRequest.current?.abort();
  }, [fetchPartners]);

  const refetch = useCallback(() => fetchPartners(true), [fetchPartners]);
  // Never show the previous account's partners while the new effect starts.
  const current = state.key === cacheKey
    ? state
    : { partners: [], isLoading: Boolean(cacheKey), error: null, lastUpdated: null };
  return { partners: current.partners, isLoading: current.isLoading, error: current.error, lastUpdated: current.lastUpdated, refetch };
}
