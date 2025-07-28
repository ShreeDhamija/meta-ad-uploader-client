import { useEffect, useState, useContext, createContext } from "react"
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

const AppContext = createContext()

export const AppProvider = ({ children }) => {
  const [pages, setPages] = useState([])
  const [adAccounts, setAdAccounts] = useState([])
  const [allAdAccounts, setAllAdAccounts] = useState([]);


  useEffect(() => {
    const fetchAdAccounts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/fetch-ad-accounts`, {
          credentials: "include",
        })
        const data = await res.json()
        if (data.success && data.adAccounts) {
          setAdAccounts(data.adAccounts)
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

  return (
    <AppContext.Provider value={{ pages, setPages, adAccounts, setAdAccounts }}>
      {children}
    </AppContext.Provider>
  )
}
export const useAppData = () => useContext(AppContext)
