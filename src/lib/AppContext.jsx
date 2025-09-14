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
  const { selectedAdAccountId } = useGlobalSettings()


  // Filter ad accounts based on plan type
  const filteredAdAccounts = useMemo(() => {
    if (subscriptionData.planType === 'brand' && selectedAdAccountId) {
      return allAdAccounts.filter(account => account.id === selectedAdAccountId)
    }
    return allAdAccounts
  }, [allAdAccounts, subscriptionData.planType, selectedAdAccountId])



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
