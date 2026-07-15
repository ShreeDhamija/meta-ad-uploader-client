import { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { readCache, writeCache, clearCache } from '@/lib/dataCache'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'



const TikTokAuthContext = createContext(null)

export function TikTokAuthProvider({ children }) {
  const [tiktokUser, setTikTokUser] = useState(() => {
    try {
      const stored = localStorage.getItem('tiktok_user')
      return stored ? JSON.parse(stored) : null
    } catch (_) {
      return null
    }
  })
  const [isTikTokLoggedIn, setIsTikTokLoggedIn] = useState(() => {
    try {
      return !!localStorage.getItem('tiktok_uid')
    } catch (_) {
      return false
    }
  })
  const [tiktokAdvertisers, setTikTokAdvertisers] = useState(readCache('tiktokAdvertisers') || [])
  const [isLoading, setIsLoading] = useState(true)

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
    // Persist auth data to localStorage so the server can recover the session from Firestore
    if (user?.tiktokId) {
      try { localStorage.setItem('tiktok_uid', user.tiktokId) } catch (_) { }
    }
    if (accessToken) {
      try { localStorage.setItem('tiktok_token', accessToken) } catch (_) { }
    }
    if (advertisers?.length > 0) {
      try {
        const ids = advertisers.map(a => a.advertiser_id || a.id).filter(Boolean)
        if (ids.length) localStorage.setItem('tiktok_advertiser_ids', JSON.stringify(ids))
      } catch (_) { }
    }
  }

  const refreshTikTokUser = async () => {
    const endpoint = `${API_BASE_URL}/api/tiktok/auth/me`
    try {

      // Send stored tiktokId as a hint so the server can recover from Firestore
      const storedUid = (() => { try { return localStorage.getItem('tiktok_uid') } catch (_) { return null } })()
      const storedToken = (() => { try { return localStorage.getItem('tiktok_token') } catch (_) { return null } })()
      const storedAdvertiserIds = (() => { try { return localStorage.getItem('tiktok_advertiser_ids') } catch (_) { return null } })()
      const headers = { 'Content-Type': 'application/json' }
      if (storedUid) {
        headers['x-tiktok-user-id'] = storedUid
      }
      if (storedToken) {
        headers['x-tiktok-token'] = storedToken
      }
      if (storedAdvertiserIds) {
        headers['x-tiktok-advertiser-ids'] = storedAdvertiserIds
      }

      const res = await fetch(endpoint, { credentials: 'include', headers })

      const rawText = await res.text()
      let data
      try {
        data = JSON.parse(rawText)
      } catch (parseErr) {
        console.error('❌ [TikTok Auth] Failed to parse JSON response:', parseErr, '\nRaw body:', rawText)
        setIsTikTokLoggedIn(false)
        setTikTokUser(null)
        try { localStorage.removeItem('tiktok_uid') } catch (_) { }
        try { localStorage.removeItem('tiktok_token') } catch (_) { }
        try { localStorage.removeItem('tiktok_advertiser_ids') } catch (_) { }
        try { localStorage.removeItem('tiktok_user') } catch (_) { }
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
          // Keep localStorage in sync
          if (data.user?.tiktokId) {
            try { localStorage.setItem('tiktok_uid', data.user.tiktokId) } catch (_) { }
          }
          if (data.accessToken) {
            try { localStorage.setItem('tiktok_token', data.accessToken) } catch (_) { }
          }
          if (data.advertisers?.length > 0) {
            try {
              const ids = data.advertisers.map(a => a.advertiser_id || a.id).filter(Boolean)
              if (ids.length) localStorage.setItem('tiktok_advertiser_ids', JSON.stringify(ids))
            } catch (_) { }
          }
        } else {
          console.warn('⚠️ [TikTok Auth] Response OK but connected=false. Reason:', data.error || 'unknown')
          setIsTikTokLoggedIn(false)
          setTikTokUser(null)
          try { localStorage.removeItem('tiktok_uid') } catch (_) { }
          try { localStorage.removeItem('tiktok_token') } catch (_) { }
          try { localStorage.removeItem('tiktok_advertiser_ids') } catch (_) { }
          try { localStorage.removeItem('tiktok_user') } catch (_) { }
          setTikTokAdvertisers([])
          writeCache('tiktokAdvertisers', [])
        }
      } else {
        console.warn('⚠️ [TikTok Auth] Non-OK HTTP status:', res.status, '| body:', rawText)
        setIsTikTokLoggedIn(false)
        setTikTokUser(null)
        try { localStorage.removeItem('tiktok_uid') } catch (_) { }
        try { localStorage.removeItem('tiktok_token') } catch (_) { }
        try { localStorage.removeItem('tiktok_advertiser_ids') } catch (_) { }
        try { localStorage.removeItem('tiktok_user') } catch (_) { }
        setTikTokAdvertisers([])
        writeCache('tiktokAdvertisers', [])
      }
    } catch (err) {
      console.error('❌ [TikTok Auth] Network/fetch error calling', endpoint, err)
      setIsTikTokLoggedIn(false)
      setTikTokUser(null)
      try { localStorage.removeItem('tiktok_uid') } catch (_) { }
      try { localStorage.removeItem('tiktok_token') } catch (_) { }
      try { localStorage.removeItem('tiktok_advertiser_ids') } catch (_) { }
      try { localStorage.removeItem('tiktok_user') } catch (_) { }
      setTikTokAdvertisers([])
      writeCache('tiktokAdvertisers', [])
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
        // Clear tokens FIRST to prevent auto-recovery
        try { localStorage.removeItem('tiktok_uid') } catch (_) { }
        try { localStorage.removeItem('tiktok_token') } catch (_) { }
        try { localStorage.removeItem('tiktok_advertiser_ids') } catch (_) { }
        try { localStorage.removeItem('tiktok_user') } catch (_) { }

        clearCache('tiktokAdvertisers')
        clearCache('tiktokIdentities')

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
    const storedUid = (() => { try { return localStorage.getItem('tiktok_uid') } catch (_) { return null } })()
    const storedToken = (() => { try { return localStorage.getItem('tiktok_token') } catch (_) { return null } })()
    const storedAdvertiserIds = (() => { try { return localStorage.getItem('tiktok_advertiser_ids') } catch (_) { return null } })()
    const extraHeaders = {}
    if (storedUid) extraHeaders['x-tiktok-user-id'] = storedUid
    if (storedToken) extraHeaders['x-tiktok-token'] = storedToken
    if (storedAdvertiserIds) extraHeaders['x-tiktok-advertiser-ids'] = storedAdvertiserIds

    return fetch(url, {
      credentials: 'include',
      ...options,
      headers: {
        ...extraHeaders,
        ...(options.headers || {}),
      },
    })
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
