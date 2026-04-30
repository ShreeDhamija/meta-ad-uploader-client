import { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'

const TikTokAuthContext = createContext(null)

export function TikTokAuthProvider({ children }) {
  const [isTikTokLoggedIn, setIsTikTokLoggedIn] = useState(false)
  const [tiktokUser, setTikTokUser] = useState(null)
  const [tiktokAdvertisers, setTikTokAdvertisers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshTikTokUser = async () => {
    try {
      console.log("🔍 [TikTok Auth] Checking authentication status...");
      const res = await fetch(`${API_BASE_URL}/api/tiktok/auth/me`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.connected && data.user) {
          console.log("✅ [TikTok Auth] User connected:", data.user.name);
          setIsTikTokLoggedIn(true)
          setTikTokUser(data.user)
          setTikTokAdvertisers(data.advertisers || [])
        } else {
          console.log("ℹ️ [TikTok Auth] User not connected.");
          setIsTikTokLoggedIn(false)
          setTikTokUser(null)
          setTikTokAdvertisers([])
        }
      } else {
        console.log("ℹ️ [TikTok Auth] Failed to fetch status - Not logged in.");
        setIsTikTokLoggedIn(false)
        setTikTokUser(null)
        setTikTokAdvertisers([])
      }
    } catch (err) {
      console.error('❌ [TikTok Auth] Error fetching status:', err)
      setIsTikTokLoggedIn(false)
      setTikTokUser(null)
      setTikTokAdvertisers([])
    } finally {
      setIsLoading(false)
    }
  }

  const logoutTikTok = async () => {
    try {
      console.log("🚪 [TikTok Auth] Logging out...");
      const res = await fetch(`${API_BASE_URL}/api/tiktok/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        console.log("✅ [TikTok Auth] Logout successful.");
        toast.info('Logged out of TikTok successfully!')
        setIsTikTokLoggedIn(false)
        setTikTokUser(null)
        setTikTokAdvertisers([])
      } else {
        console.warn("⚠️ [TikTok Auth] Logout failed on server.");
        toast.error('Failed to log out of TikTok')
      }
    } catch (error) {
      console.error("❌ [TikTok Auth] Logout error:", error)
      toast.error('TikTok logout error: ' + error.message)
    }
  }

  useEffect(() => {
    refreshTikTokUser()
  }, [])

  return (
    <TikTokAuthContext.Provider
      value={{
        isTikTokLoggedIn,
        tiktokUser,
        tiktokAdvertisers,
        refreshTikTokUser,
        logoutTikTok,
        isLoading,
      }}
    >
      {children}
    </TikTokAuthContext.Provider>
  )
}

export const useTikTokAuth = () => {
  const context = useContext(TikTokAuthContext)
  if (!context) throw new Error('useTikTokAuth must be used within TikTokAuthProvider')
  return context
}
