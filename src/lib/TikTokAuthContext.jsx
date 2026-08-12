import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { writeCache, clearTikTokSessionData } from '@/lib/dataCache'
import { useAuth } from '@/lib/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'

const TikTokAuthContext = createContext(null)

export function TikTokAuthProvider({ children }) {
  const { isLoggedIn, userId: metaUid, features, refreshAuth } = useAuth()
  const [tiktokUser, setTikTokUser] = useState(null)
  const [isTikTokLoggedIn, setIsTikTokLoggedIn] = useState(false)
  const [tiktokAdvertisers, setTikTokAdvertisers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const clearTikTokState = useCallback(() => {
    setIsTikTokLoggedIn(false)
    setTikTokUser(null)
    setTikTokAdvertisers([])
    clearTikTokSessionData()
  }, [])

  const refreshTikTokUser = useCallback(async () => {
    if (!isLoggedIn || features.tiktokLauncher !== true) {
      clearTikTokState()
      setIsLoading(false)
      return null
    }

    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/tiktok/auth/me`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.connected || !data.profile) {
        clearTikTokState()
        return data
      }

      setIsTikTokLoggedIn(true)
      setTikTokUser(data.profile)
      setTikTokAdvertisers(data.advertisers || [])
      writeCache('tiktokAdvertisers', data.advertisers || [])
      return data
    } catch (error) {
      console.error('[TikTok Auth] Failed to refresh connection:', error.message)
      clearTikTokState()
      return null
    } finally {
      setIsLoading(false)
    }
  }, [clearTikTokState, features.tiktokLauncher, isLoggedIn])

  const logoutTikTok = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tiktok/auth/disconnect`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        toast.error('Failed to disconnect TikTok')
        return false
      }

      clearTikTokState()
      await refreshAuth()
      toast.info('TikTok disconnected. Your Blip session is still active.')
      return true
    } catch (error) {
      console.error('[TikTok Auth] Disconnect failed:', error.message)
      toast.error('TikTok disconnect error: ' + error.message)
      return false
    }
  }, [clearTikTokState, refreshAuth])

  const tiktokFetch = useCallback((url, options = {}) => fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
    },
  }), [])

  useEffect(() => {
    refreshTikTokUser()
  }, [metaUid, refreshTikTokUser])

  return (
    <TikTokAuthContext.Provider
      value={{
        isTikTokLoggedIn,
        tiktokUser,
        tiktokAdvertisers,
        refreshTikTokUser,
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
