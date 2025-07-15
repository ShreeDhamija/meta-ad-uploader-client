import { useEffect, useState, useContext, createContext } from "react"

const AppContext = createContext()

export const AppProvider = ({ children }) => {
  const [pages, setPages] = useState([])
  const [adAccounts, setAdAccounts] = useState([])
  const [allAdAccounts, setAllAdAccounts] = useState([]);


  useEffect(() => {
    const fetchAdAccounts = async () => {
      try {
        const res = await fetch("https://api.withblip.com/auth/fetch-ad-accounts", {
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
    // const fetchAdAccounts = async () => {
    //   try {
    //     // Fetch all available ad accounts from Meta
    //     const allAdAccountsResponse = await fetch('https://api.withblip.com/auth/fetch-ad-accounts', {
    //       credentials: 'include'
    //     });
    //     const allAdAccountsData = await allAdAccountsResponse.json();

    //     // Store all available accounts
    //     setAllAdAccounts(allAdAccountsData.adAccounts);

    //     // Try to get user's selected ad accounts from database
    //     try {
    //       const userAdAccountsResponse = await fetch(`https://api.withblip.com/settings/ad-account?adAccountId=user-ad-accounts`, {
    //         credentials: 'include'
    //       });
    //       const userAdAccountsData = await userAdAccountsResponse.json();

    //       if (userAdAccountsData.settings && Array.isArray(userAdAccountsData.settings) && userAdAccountsData.settings.length > 0) {
    //         // Filter to only show user's selected ad accounts
    //         const filteredAdAccounts = allAdAccountsData.adAccounts.filter(account =>
    //           userAdAccountsData.settings.includes(account.id)
    //         );
    //         setAdAccounts(filteredAdAccounts);
    //       } else {
    //         // If no saved selection exists, show all available accounts
    //         setAdAccounts(allAdAccountsData.adAccounts);
    //       }
    //     } catch (dbError) {
    //       // If database call fails, show all available accounts
    //       setAdAccounts(allAdAccountsData.adAccounts);
    //     }

    //   } catch (error) {
    //     console.error('Error fetching ad accounts:', error);
    //   }
    // };

    const fetchPages = async () => {
      try {
        const res = await fetch("https://api.withblip.com/auth/fetch-pages", {
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
