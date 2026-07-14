import { useEffect, useState, useContext, useMemo, useCallback, createContext } from "react"
import useSubscription from "@/lib/useSubscriptionSettings"
import useGlobalSettings from "@/lib/useGlobalSettings"
import { readCache, writeCache, clearCache } from "@/lib/dataCache"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

const AppContext = createContext()

// Detect fresh login / reauth from URL at module load, before first render.
const shouldBustCacheFromURL = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('loggedIn') === 'true' || params.get('reauth') === 'success';
};

export const AppProvider = ({ children }) => {
  const bustOnMount = shouldBustCacheFromURL();
  if (bustOnMount) clearCache();

  const cachedAccounts = bustOnMount ? null : readCache('adAccounts');
  const cachedPages = bustOnMount ? null : readCache('pages');

  const [pages, setPages] = useState(cachedPages || [])
  const [adAccounts, setAdAccounts] = useState(cachedAccounts || [])
  const [allAdAccounts, setAllAdAccounts] = useState(cachedAccounts || [])
  const [pagesLoading, setPagesLoading] = useState(false)
  const [adAccountsLoading, setAdAccountsLoading] = useState(false)

  const cachedTiktokIdentities = readCache('tiktokIdentities') || {}
  const [tiktokIdentities, setTiktokIdentities] = useState(cachedTiktokIdentities)
  const [tiktokIdentitiesLoading, setTiktokIdentitiesLoading] = useState({})

  const cachedTiktokSettings = readCache('tiktokSettings') || {}
  const [tiktokSettings, setTiktokSettings] = useState(cachedTiktokSettings)
  const [tiktokSettingsLoading, setTiktokSettingsLoading] = useState({})

  const { subscriptionData } = useSubscription()
  const { selectedAdAccountIds } = useGlobalSettings()

  const filteredAdAccounts = useMemo(() => {
    if (subscriptionData.planType === 'starter' && selectedAdAccountIds.length > 0) {
      return allAdAccounts.filter(a => selectedAdAccountIds.includes(a.id))
    } else if (subscriptionData.planType === 'brand' && selectedAdAccountIds.length > 0) {
      return allAdAccounts.filter(a => selectedAdAccountIds.includes(a.id))
    }
    return allAdAccounts
  }, [allAdAccounts, subscriptionData.planType, selectedAdAccountIds])

  const fetchAdAccounts = useCallback(async () => {
    setAdAccountsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/fetch-ad-accounts`, { credentials: "include" })
      const data = await res.json()
      if (data.success && data.adAccounts) {
        setAllAdAccounts(data.adAccounts)
        setAdAccounts(data.adAccounts)
        writeCache('adAccounts', data.adAccounts)
        return data.adAccounts
      }
    } catch (err) {
      console.error("Failed to fetch ad accounts:", err)
      throw err
    } finally {
      setAdAccountsLoading(false);
    }
  }, [])

  const fetchPages = useCallback(async () => {
    setPagesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/fetch-pages`, { credentials: "include" })
      const data = await res.json()
      if (data.success && data.pages) {
        setPages(data.pages)
        writeCache('pages', data.pages)
        return data.pages
      }
    } catch (err) {
      console.error("Failed to fetch pages:", err)
      throw err
    } finally {
      setPagesLoading(false);
    }
  }, [])


  const fetchTikTokIdentities = useCallback(async (advertiserId, force = false) => {
    if (!advertiserId) return [];

    if (!force) {
      if (tiktokIdentities[advertiserId]?.length > 0) {
        return tiktokIdentities[advertiserId];
      }
    }

    setTiktokIdentitiesLoading(prev => ({ ...prev, [advertiserId]: true }));
    try {
      const storedUid = (() => { try { return localStorage.getItem('tiktok_uid') } catch (_) { return null } })()
      const storedToken = (() => { try { return localStorage.getItem('tiktok_token') } catch (_) { return null } })()
      const storedAdvertiserIds = (() => { try { return localStorage.getItem('tiktok_advertiser_ids') } catch (_) { return null } })()
      const headers = { 'Content-Type': 'application/json' }
      if (storedUid) headers['x-tiktok-user-id'] = storedUid
      if (storedToken) headers['x-tiktok-token'] = storedToken
      if (storedAdvertiserIds) headers['x-tiktok-advertiser-ids'] = storedAdvertiserIds

      const res = await fetch(`${API_BASE_URL}/api/tiktok/fetch-identities?advertiserId=${advertiserId}&_t=${Date.now()}`, {
        credentials: "include",
        headers
      });
      const data = await res.json();
      const list = data.identities || [];

      setTiktokIdentities(prev => {
        const updated = { ...prev, [advertiserId]: list };
        writeCache('tiktokIdentities', updated);
        return updated;
      });
      return list;
    } catch (err) {
      console.error("Failed to fetch TikTok identities:", err);
      return [];
    } finally {
      setTiktokIdentitiesLoading(prev => ({ ...prev, [advertiserId]: false }));
    }
  }, [tiktokIdentities]);

  const fetchTikTokSettings = useCallback(async (advertiserId, force = false) => {
    if (!advertiserId) return null;

    console.log(`[AppContext] fetchTikTokSettings called for advertiserId: ${advertiserId}, force: ${force}`);

    if (!force) {
      if (tiktokSettings[advertiserId]) {
        console.log(`[AppContext] fetchTikTokSettings using cached settings for advertiserId: ${advertiserId}`, tiktokSettings[advertiserId]);
        return tiktokSettings[advertiserId];
      }
    }

    setTiktokSettingsLoading(prev => ({ ...prev, [advertiserId]: true }));
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
      const settings = data.settings || {};
      const documentExists = data.documentExists ?? false;

      console.log(`[AppContext] fetchTikTokSettings server response for advertiserId: ${advertiserId}:`, data);

      setTiktokSettings(prev => {
        const updated = {
          ...prev,
          [advertiserId]: {
            ...settings,
            _documentExists: documentExists
          }
        };
        writeCache('tiktokSettings', updated);
        return updated;
      });
      return settings;
    } catch (err) {
      console.error(`[AppContext] Failed to fetch TikTok settings for advertiserId: ${advertiserId}:`, err);
      return null;
    } finally {
      setTiktokSettingsLoading(prev => ({ ...prev, [advertiserId]: false }));
    }
  }, [tiktokSettings]);

  const updateTikTokSettingsCache = useCallback((advertiserId, nextSettings) => {
    if (!advertiserId) return;
    console.log(`[AppContext] updateTikTokSettingsCache called for advertiserId: ${advertiserId}:`, nextSettings);
    setTiktokSettings(prev => {
      const updated = { ...prev, [advertiserId]: nextSettings };
      writeCache('tiktokSettings', updated);
      return updated;
    });
  }, []);

  const refreshPagePictures = useCallback(async (pagesToRefresh) => {
    if (!pagesToRefresh.length) return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh-page-pictures`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageIds: pagesToRefresh.map(p => p.id) }),
      });
      const data = await res.json();
      if (!data.success) return;

      const picMap = new Map(data.pictures.map(p => [p.id, p]));
      setPages(prev => {
        const updated = prev.map(page => {
          const fresh = picMap.get(page.id);
          if (!fresh) return page;
          return {
            ...page,
            profilePicture: fresh.profilePicture || page.profilePicture,
            instagramAccount: page.instagramAccount ? {
              ...page.instagramAccount,
              profilePictureUrl: fresh.instagramPicUrl || page.instagramAccount.profilePictureUrl,
            } : page.instagramAccount,
          };
        });
        writeCache('pages', updated);
        return updated;
      });
    } catch (err) {
      console.error("Failed to refresh page pictures:", err);
    }
  }, []);



  useEffect(() => {
    if (bustOnMount) {
      // Strip the flag so a manual refresh won't keep busting.
      const url = new URL(window.location)
      url.searchParams.delete('loggedIn')
      url.searchParams.delete('reauth')
      window.history.replaceState({}, '', url)
      fetchAdAccounts()
      fetchPages()
      return
    }

    // Normal load: only fetch what isn't cached.
    if (!cachedAccounts) fetchAdAccounts()
    if (!cachedPages) {
      fetchPages();
    } else {
      // Cache hit — refresh just the pics in the background
      refreshPagePictures(cachedPages);
    }
  }, [])

  useEffect(() => {
    setAdAccounts(filteredAdAccounts)
  }, [filteredAdAccounts])

  return (
    <AppContext.Provider value={{
      pages, setPages,
      adAccounts, setAdAccounts,
      allAdAccounts,
      pagesLoading, adAccountsLoading,
      refetchAdAccounts: fetchAdAccounts,
      refetchPages: fetchPages,
      tiktokIdentities,
      tiktokIdentitiesLoading,
      fetchTikTokIdentities,
      tiktokSettings,
      tiktokSettingsLoading,
      fetchTikTokSettings,
      updateTikTokSettingsCache,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppData = () => useContext(AppContext)