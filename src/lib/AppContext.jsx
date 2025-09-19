import { useEffect, useState, useContext, useMemo, createContext } from "react"
import useSubscription from "@/lib/useSubscriptionSettings"
import useGlobalSettings from "@/lib/useGlobalSettings"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

const AppContext = createContext()

export const AppProvider = ({ children }) => {
  const [pages, setPages] = useState([])
  const [adAccounts, setAdAccounts] = useState([])
  const [allAdAccounts, setAllAdAccounts] = useState([]);

  const { subscriptionData } = useSubscription()
  const { selectedAdAccountIds } = useGlobalSettings() // Changed from selectedAdAccountId


  // Filter ad accounts based on plan type
  const filteredAdAccounts = useMemo(() => {
    if (subscriptionData.planType === 'brand' && selectedAdAccountIds.length > 0) {
      return allAdAccounts.filter(account => selectedAdAccountIds.includes(account.id))
    }
    return allAdAccounts
  }, [allAdAccounts, subscriptionData.planType, selectedAdAccountIds])



  useEffect(() => {
    const fetchAdAccounts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/fetch-ad-accounts`, {
          credentials: "include",
        })
        const data = await res.json()
        if (data.success && data.adAccounts) {
          setAdAccounts(data.adAccounts)
          setAllAdAccounts(data.adAccounts) // Store all accounts

        }
      } catch (err) {
        console.error("Failed to fetch ad accounts:", err)
      }
    }
    const fetchPages = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/fetch-pages`, {
          credentials: "include",
        })
        const data = await res.json()
        if (data.success && data.pages) {
          setPages(data.pages)
        }
      } catch (err) {
        console.error("Failed to fetch pages:", err)
      }
    }

    // Only fetch if empty
    if (adAccounts.length === 0) fetchAdAccounts()
    if (pages.length === 0) fetchPages()
  }, [])


  useEffect(() => {
    setAdAccounts(filteredAdAccounts)
  }, [filteredAdAccounts])

  return (
    <AppContext.Provider value={{
      pages, setPages, adAccounts, setAdAccounts, allAdAccounts
    }}>
      {children}
    </AppContext.Provider>
  )
}
export const useAppData = () => useContext(AppContext)
