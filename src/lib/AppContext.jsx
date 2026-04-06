// import { useEffect, useState, useContext, useMemo, createContext } from "react"
// import useSubscription from "@/lib/useSubscriptionSettings"
// import useGlobalSettings from "@/lib/useGlobalSettings"

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

// const AppContext = createContext()

// export const AppProvider = ({ children }) => {
//   const [pages, setPages] = useState([])
//   const [adAccounts, setAdAccounts] = useState([])
//   const [allAdAccounts, setAllAdAccounts] = useState([]);
//   const [pagesLoading, setPagesLoading] = useState(false);
//   const [adAccountsLoading, setAdAccountsLoading] = useState(false);

//   const { subscriptionData } = useSubscription()
//   const { selectedAdAccountIds } = useGlobalSettings() // Changed from selectedAdAccountId


//   // Filter ad accounts based on plan type
//   const filteredAdAccounts = useMemo(() => {
//     if (subscriptionData.planType === 'starter' && selectedAdAccountIds.length > 0) {
//       // Starter plan: show only 1 selected account
//       return allAdAccounts.filter(account => selectedAdAccountIds.includes(account.id))
//     } else if (subscriptionData.planType === 'brand' && selectedAdAccountIds.length > 0) {
//       // Brand plan: show up to 3 selected accounts
//       return allAdAccounts.filter(account => selectedAdAccountIds.includes(account.id))
//     }
//     // Pro/Agency plan: show all accounts
//     return allAdAccounts
//   }, [allAdAccounts, subscriptionData.planType, selectedAdAccountIds])



//   useEffect(() => {
//     const fetchAdAccounts = async () => {
//       setAdAccountsLoading(true);
//       try {
//         const res = await fetch(`${API_BASE_URL}/auth/fetch-ad-accounts`, {
//           credentials: "include",
//         })
//         const data = await res.json()
//         if (data.success && data.adAccounts) {
//           setAdAccounts(data.adAccounts)
//           setAllAdAccounts(data.adAccounts) // Store all accounts

//         }
//       } catch (err) {
//         console.error("Failed to fetch ad accounts:", err)
//       } finally {
//         setAdAccountsLoading(false);
//       }
//     }
//     const fetchPages = async () => {
//       setPagesLoading(true);
//       try {
//         const res = await fetch(`${API_BASE_URL}/auth/fetch-pages`, {
//           credentials: "include",
//         })
//         const data = await res.json()
//         if (data.success && data.pages) {
//           setPages(data.pages)
//         }
//       } catch (err) {
//         console.error("Failed to fetch pages:", err)
//       }
//       finally {
//         setPagesLoading(false);
//       }
//     }

//     // Only fetch if empty
//     if (adAccounts.length === 0) fetchAdAccounts()
//     if (pages.length === 0) fetchPages()
//   }, [])


//   useEffect(() => {
//     setAdAccounts(filteredAdAccounts)
//   }, [filteredAdAccounts])

//   return (
//     <AppContext.Provider value={{
//       pages, setPages, adAccounts, setAdAccounts, allAdAccounts, pagesLoading, adAccountsLoading
//     }}>
//       {children}
//     </AppContext.Provider>
//   )
// }
// export const useAppData = () => useContext(AppContext)
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
    if (!cachedPages) fetchPages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppData = () => useContext(AppContext)