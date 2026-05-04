import { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'

// 🔍 Log environment on load so we know which API URL is being used
console.log('🌐 [TikTokAuthContext] Loaded. API_BASE_URL =', API_BASE_URL)
console.log('🌐 [TikTokAuthContext] VITE_API_URL env =', import.meta.env.VITE_API_URL || 'NOT SET')

const TikTokAuthContext = createContext(null)

export function TikTokAuthProvider({ children }) {
  const [isTikTokLoggedIn, setIsTikTokLoggedIn] = useState(false)
  const [tiktokUser, setTikTokUser] = useState(null)
  const [tiktokAdvertisers, setTikTokAdvertisers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshTikTokUser = async () => {
    const endpoint = `${API_BASE_URL}/api/tiktok/auth/me`
    try {
      console.log('\n🔍====== [TikTok Auth] refreshTikTokUser ======')
      console.log('  Fetching URL      :', endpoint)
      console.log('  credentials       : include')
      console.log('  document.cookie   :', document.cookie || 'EMPTY (httpOnly cookies not visible here)')

      const res = await fetch(endpoint, { credentials: 'include' })

      console.log('  HTTP Status       :', res.status, res.statusText)
      console.log('  Response Headers  :')
      res.headers.forEach((value, key) => console.log(`    ${key}: ${value}`))

      const rawText = await res.text()
      console.log('  Raw Response Body :', rawText)

      let data
      try {
        data = JSON.parse(rawText)
      } catch (parseErr) {
        console.error('❌ [TikTok Auth] Failed to parse JSON response:', parseErr)
        setIsTikTokLoggedIn(false)
        setTikTokUser(null)
        setTikTokAdvertisers([])
        return
      }

      console.log('  Parsed data.connected :', data.connected)
      console.log('  Parsed data.user      :', JSON.stringify(data.user || null))
      console.log('  Parsed data.error     :', data.error || 'none')
      console.log('  Advertiser count      :', data.advertisers?.length ?? 0)
      console.log('==============================\n')

      if (res.ok) {
        if (data.connected && data.user) {
          console.log('✅ [TikTok Auth] User IS connected:', data.user.name)
          setIsTikTokLoggedIn(true)
          setTikTokUser(data.user)
          setTikTokAdvertisers(data.advertisers || [])
        } else {
          console.warn('⚠️ [TikTok Auth] Response OK but connected=false. Reason:', data.error || 'unknown')
          setIsTikTokLoggedIn(false)
          setTikTokUser(null)
          setTikTokAdvertisers([])
        }
      } else {
        console.warn('⚠️ [TikTok Auth] Non-OK HTTP status:', res.status, '| body:', rawText)
        setIsTikTokLoggedIn(false)
        setTikTokUser(null)
        setTikTokAdvertisers([])
      }
    } catch (err) {
      console.error('❌ [TikTok Auth] Network/fetch error calling', endpoint, err)
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
