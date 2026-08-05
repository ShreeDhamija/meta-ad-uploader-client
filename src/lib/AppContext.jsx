import { useEffect, useState, useContext, useMemo, useCallback, createContext, useRef } from "react"
import PropTypes from "prop-types"
import useSubscription from "@/lib/useSubscriptionSettings"
import useGlobalSettings from "@/lib/useGlobalSettings"
import { readCache, writeCache, clearCache } from "@/lib/dataCache"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import { getPlanAccountLimit } from "@/lib/accountSelection"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';
const asArray = (value) => Array.isArray(value) ? value : []

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

  const [pages, setPages] = useState(asArray(cachedPages))
  const [adAccounts, setAdAccounts] = useState(asArray(cachedAccounts))
  const [allAdAccounts, setAllAdAccounts] = useState(asArray(cachedAccounts))
  const [pagesLoading, setPagesLoading] = useState(false)
  const [adAccountsLoading, setAdAccountsLoading] = useState(false)
  const [tiktokIdentities, setTiktokIdentities] = useState(readCache('tiktokIdentities') || {})
  const [tiktokIdentitiesLoading, setTiktokIdentitiesLoading] = useState({})
  const tiktokIdentitiesRef = useRef(tiktokIdentities)
  const tiktokIdentitiesLoaded = useRef(new Set(
    Object.entries(tiktokIdentities)
      .filter(([, identities]) => Array.isArray(identities) && identities.length > 0)
      .map(([advertiserId]) => advertiserId),
  ))
  const tiktokIdentityRequests = useRef(new Map())
  const tiktokIdentityGeneration = useRef(0)
  const [allTikTokAdvertisers, setAllTikTokAdvertisers] = useState(readCache('tiktokAdvertisers') || [])
  const [tiktokAdvertisersLoading, setTiktokAdvertisersLoading] = useState(false)
  const {
    tiktokUser,
    isTikTokLoggedIn,
    tiktokAdvertisers: authenticatedTikTokAdvertisers,
    isLoading: tiktokAuthLoading,
    tiktokFetch,
  } = useTikTokAuth()
  const previousTikTokSubject = useRef(tiktokUser?.subject || null)

  const { subscriptionData } = useSubscription()
  const { selectedAdAccountIds, selectedTikTokAdvertiserIds } = useGlobalSettings()

  const filteredAdAccounts = useMemo(() => {
    if (subscriptionData.planType === 'starter' && selectedAdAccountIds.length > 0) {
      return allAdAccounts.filter(a => selectedAdAccountIds.includes(a.id))
    } else if (subscriptionData.planType === 'brand' && selectedAdAccountIds.length > 0) {
      return allAdAccounts.filter(a => selectedAdAccountIds.includes(a.id))
    }
    return allAdAccounts
  }, [allAdAccounts, subscriptionData.planType, selectedAdAccountIds])

  const filteredTikTokAdvertisers = useMemo(() => {
    const limit = getPlanAccountLimit(subscriptionData.planType)
    const shouldFilter = (
      (Number.isFinite(limit) || subscriptionData.planType === 'free_trial')
      && selectedTikTokAdvertiserIds.length > 0
    )
    if (!shouldFilter) return allTikTokAdvertisers
    return allTikTokAdvertisers.filter((advertiser) => {
      const id = String(advertiser.advertiser_id || advertiser.id)
      return selectedTikTokAdvertiserIds.includes(id)
    })
  }, [allTikTokAdvertisers, selectedTikTokAdvertiserIds, subscriptionData.planType])

  const fetchAdAccounts = useCallback(async () => {
    setAdAccountsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/fetch-ad-accounts`, { credentials: "include" })
      const data = await res.json()
      if (data.success && Array.isArray(data.adAccounts)) {
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
      if (data.success && Array.isArray(data.pages)) {
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
    if (!advertiserId || !isTikTokLoggedIn) return []
    const key = String(advertiserId)
    if (!force && tiktokIdentitiesLoaded.current.has(key)) {
      return tiktokIdentitiesRef.current[key] || []
    }
    if (tiktokIdentityRequests.current.has(key)) {
      return tiktokIdentityRequests.current.get(key)
    }

    setTiktokIdentitiesLoading((previous) => ({ ...previous, [advertiserId]: true }))
    const requestGeneration = tiktokIdentityGeneration.current
    const request = (async () => {
      try {
        const res = await tiktokFetch(
          `${API_BASE_URL}/api/tiktok/fetch-identities?advertiserId=${encodeURIComponent(advertiserId)}&_t=${Date.now()}`,
          { headers: { Accept: 'application/json' } },
        )
        if (!res.ok) return []
        const data = await res.json()
        const list = data.identities || []
        if (requestGeneration !== tiktokIdentityGeneration.current) return []
        tiktokIdentitiesLoaded.current.add(key)
        setTiktokIdentities((previous) => {
          const updated = { ...previous, [key]: list }
          tiktokIdentitiesRef.current = updated
          writeCache('tiktokIdentities', updated)
          return updated
        })
        return list
      } catch (err) {
        console.error("Failed to fetch TikTok identities:", err)
        return []
      } finally {
        if (tiktokIdentityRequests.current.get(key) === request) {
          tiktokIdentityRequests.current.delete(key)
          setTiktokIdentitiesLoading((previous) => ({ ...previous, [key]: false }))
        }
      }
    })()

    tiktokIdentityRequests.current.set(key, request)
    return request
  }, [isTikTokLoggedIn, tiktokFetch])

  const fetchTikTokAdvertisers = useCallback(async () => {
    if (!isTikTokLoggedIn) return []
    setTiktokAdvertisersLoading(true)
    try {
      const res = await tiktokFetch(`${API_BASE_URL}/api/tiktok/fetch-advertisers`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) return []
      const data = await res.json()
      const advertisers = data.advertisers || []
      setAllTikTokAdvertisers(advertisers)
      writeCache('tiktokAdvertisers', advertisers)
      return advertisers
    } catch (err) {
      console.error("Failed to fetch TikTok advertisers:", err)
      return []
    } finally {
      setTiktokAdvertisersLoading(false)
    }
  }, [isTikTokLoggedIn, tiktokFetch])


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
    // Run once on mount. Do NOT add the cached values as deps — they are re-read
    // from localStorage each render (new reference), which would re-fire this
    // effect every render and cause an infinite fetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setAdAccounts(filteredAdAccounts)
  }, [filteredAdAccounts])

  useEffect(() => {
    if (tiktokAuthLoading) return

    const subject = tiktokUser?.subject || null
    if (previousTikTokSubject.current !== subject) {
      setTiktokIdentities({})
      tiktokIdentitiesRef.current = {}
      tiktokIdentitiesLoaded.current.clear()
      tiktokIdentityGeneration.current += 1
      tiktokIdentityRequests.current.clear()
      previousTikTokSubject.current = subject
    }

    if (!subject || !isTikTokLoggedIn) {
      setAllTikTokAdvertisers([])
      return
    }

    // /api/tiktok/auth/me already returns the current advertiser list. Keep the
    // shared app state in sync with that response instead of clearing it and
    // relying on a second fetch or a manual refresh.
    setAllTikTokAdvertisers(authenticatedTikTokAdvertisers)
    writeCache('tiktokAdvertisers', authenticatedTikTokAdvertisers)
  }, [
    authenticatedTikTokAdvertisers,
    isTikTokLoggedIn,
    tiktokAuthLoading,
    tiktokUser,
  ])

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
      tiktokAdvertisers: filteredTikTokAdvertisers,
      allTikTokAdvertisers,
      tiktokAdvertisersLoading,
      fetchTikTokAdvertisers,
    }}>
      {children}
    </AppContext.Provider>
  )
}

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useAppData = () => useContext(AppContext)
