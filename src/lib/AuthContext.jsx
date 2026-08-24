import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';
import { clearCache, clearAnalyticsCache, clearTikTokSessionData } from "@/lib/dataCache"

const disconnectedProviders = {
  meta: { connected: false, requiresReauth: false },
  tiktok: { connected: false, requiresReauth: false },
}

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState("")
  const [profilePicUrl, setProfilePicUrl] = useState("")
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState("") // Add this
  const [teamId, setTeamId] = useState("")
  const [userEmail, setUserEmail] = useState("") // Add this
  const [userCreatedAt, setUserCreatedAt] = useState(null) // Add this
  const [connections, setConnections] = useState(disconnectedProviders)
  const [features, setFeatures] = useState({ tiktokLauncher: false })
  const lastMetaUidRef = useRef(localStorage.getItem('blip_last_meta_uid') || "")

  const resetAuthState = useCallback(() => {
    setIsLoggedIn(false)
    setUserName("")
    setProfilePicUrl("")
    setUserId("")
    setTeamId("")
    setUserEmail("")
    setUserCreatedAt(null)
    setConnections(disconnectedProviders)
    setFeatures({ tiktokLauncher: false })
  }, [])

  const checkAuth = useCallback(async ({ notify = false, showLoading = false } = {}) => {
    if (showLoading) setAuthLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: "include",
      })
      if (!res.ok) {
        resetAuthState()
        clearTikTokSessionData()
        return null
      }

      const data = await res.json()
      if (!data.user) {
        resetAuthState()
        clearTikTokSessionData()
        return null
      }

      const nextUid = data.user.uid || data.user.id
      if (lastMetaUidRef.current && lastMetaUidRef.current !== nextUid) {
        clearTikTokSessionData()
      }
      lastMetaUidRef.current = nextUid
      localStorage.setItem('blip_last_meta_uid', nextUid)

      if (notify) toast.success("Logged In Successfully!")
      setIsLoggedIn(true)
      setUserName(data.user.name)
      setProfilePicUrl(data.user.profilePicUrl || "")
      setUserId(nextUid)
      setTeamId(data.user.teamId || data.user.team_id || "")
      setUserEmail(data.user.email)
      setUserCreatedAt(data.user.createdAt)
      setConnections({
        meta: data.connections?.meta || { connected: true, requiresReauth: false },
        tiktok: data.connections?.tiktok || { connected: false, requiresReauth: false },
      })
      setFeatures({
        tiktokLauncher: data.features?.tiktokLauncher === true,
      })
      return data
    } catch (err) {
      console.error("Error fetching user info:", err)
      resetAuthState()
      clearTikTokSessionData()
      return null
    } finally {
      setAuthLoading(false)
    }
  }, [resetAuthState])

  useEffect(() => {
    checkAuth({ notify: true, showLoading: true })
  }, [checkAuth])

  const refreshAuth = useCallback(() => checkAuth(), [checkAuth])

  const handleLogout = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: "include",
      })
      if (res.ok) {
        toast.info("Logged out successfully!")
        clearCache()
        clearAnalyticsCache()
        clearTikTokSessionData()
        localStorage.removeItem('blip_last_meta_uid')
        lastMetaUidRef.current = ""
        resetAuthState()
      } else {
        toast.error("Failed to log out")
      }
    } catch (error) {
      toast.error("Logout error: " + error.message)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        userName,
        profilePicUrl,
        handleLogout,
        userId,
        teamId,
        userEmail,
        userCreatedAt,
        authLoading,
        connections,
        features,
        refreshAuth,
      }}
    >
      {!authLoading && children}
    </AuthContext.Provider>

  )
}

export const useAuth = () => useContext(AuthContext)
