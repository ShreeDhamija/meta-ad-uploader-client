import { createContext, useContext, useState, useEffect } from 'react'
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
      const res = await fetch(`${API_BASE_URL}/api/tiktok/auth/me`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.connected && data.user) {
          setIsTikTokLoggedIn(true)
          setTikTokUser(data.user)
          setTikTokAdvertisers(data.advertisers || [])
        } else {
          setIsTikTokLoggedIn(false)
          setTikTokUser(null)
          setTikTokAdvertisers([])
        }
      } else {
        setIsTikTokLoggedIn(false)
        setTikTokUser(null)
        setTikTokAdvertisers([])
      }
    } catch (err) {
      console.error('Error fetching TikTok user info:', err)
      setIsTikTokLoggedIn(false)
      setTikTokUser(null)
      setTikTokAdvertisers([])
    } finally {
      setIsLoading(false)
    }
  }

  const logoutTikTok = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tiktok/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        toast.info('Logged out of TikTok successfully!')
        setIsTikTokLoggedIn(false)
        setTikTokUser(null)
        setTikTokAdvertisers([])
      } else {
        toast.error('Failed to log out of TikTok')
      }
    } catch (error) {
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
