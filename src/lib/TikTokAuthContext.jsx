import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { writeCache, clearCache, clearTikTokSessionData } from '@/lib/dataCache'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'



const TikTokAuthContext = createContext(null)

export function TikTokAuthProvider({ children }) {
  // Start with clean defaults — server is the source of truth (like AuthContext).
  // Never hydrate from localStorage; stale keys from a deleted user would leak.
  const [tiktokUser, setTikTokUser] = useState(null)
  const [isTikTokLoggedIn, setIsTikTokLoggedIn] = useState(false)
  const [tiktokAdvertisers, setTikTokAdvertisers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState("") // Add this


  // Called directly by TikTokCallback after the exchange endpoint succeeds
  const setTikTokSession = (user, advertisers = [], accessToken = null) => {
    setIsTikTokLoggedIn(true)
    setTikTokUser(user)
    if (user) {
      try { localStorage.setItem('tiktok_user', JSON.stringify(user)) } catch (_) { }
    }
    setTikTokAdvertisers(advertisers)
    writeCache('tiktokAdvertisers', advertisers)
    setIsLoading(false)
    if (user?.tiktokId) {
      setUserId(user.tiktokId)
    }
  }

  const refreshTikTokUser = useCallback(async () => {
    const endpoint = `${API_BASE_URL}/api/tiktok/auth/me`
    try {
      const headers = { 'Content-Type': 'application/json' }
      const res = await fetch(endpoint, { credentials: 'include', headers })

      const rawText = await res.text()
      let data
      try {
        data = JSON.parse(rawText)
      } catch (parseErr) {
        console.error('❌ [TikTok Auth] Failed to parse JSON response:', parseErr, '\nRaw body:', rawText)
        setIsTikTokLoggedIn(false)
        setTikTokUser(null)
        clearTikTokSessionData()
        setTikTokAdvertisers([])
        return
      }

      if (res.ok) {
        if (data.connected && data.user) {
          setIsTikTokLoggedIn(true)
          setTikTokUser(data.user)
          try { localStorage.setItem('tiktok_user', JSON.stringify(data.user)) } catch (_) { }
          setTikTokAdvertisers(data.advertisers || [])
          writeCache('tiktokAdvertisers', data.advertisers || [])
          if (data.user?.tiktokId) {
            setUserId(data.user.tiktokId)
          }
        } else {
          console.warn('⚠️ [TikTok Auth] Response OK but connected=false. Reason:', data.error || 'unknown')
          setIsTikTokLoggedIn(false)
          setTikTokUser(null)
          clearTikTokSessionData()
          setTikTokAdvertisers([])
        }
      } else {
        console.warn('⚠️ [TikTok Auth] Non-OK HTTP status:', res.status, '| body:', rawText)
        setIsTikTokLoggedIn(false)
        setTikTokUser(null)
        clearTikTokSessionData()
        setTikTokAdvertisers([])
      }
    } catch (err) {
      console.error('❌ [TikTok Auth] Network/fetch error calling', endpoint, err)
      setIsTikTokLoggedIn(false)
      setTikTokUser(null)
      clearTikTokSessionData()
      setTikTokAdvertisers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logoutTikTok = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tiktok/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        clearTikTokSessionData()
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

  // ── tiktokFetch: a drop-in replacement for fetch() that auto-injects TikTok auth headers.
  // Use this for all /api/tiktok/* requests from anywhere in the app.
  const tiktokFetch = (url, options = {}) => {
    return fetch(url, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    })
  }

  useEffect(() => {
    refreshTikTokUser()
    console.log("userId>>> ", userId)
    if (!userId) {
      setTikTokUser(null)
      // setIsTikTokLoggedIn(false)
      setTikTokAdvertisers([])
      // setIsLoading(false)
    } else {
      setIsLoading(true)
    }
  }, [userId])

  return (
    <TikTokAuthContext.Provider
      value={{
        isTikTokLoggedIn,
        tiktokUser,
        tiktokAdvertisers,
        refreshTikTokUser,
        setTikTokSession,
        logoutTikTok,
        isLoading,
        tiktokFetch,
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
