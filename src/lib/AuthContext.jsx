import { createContext, useContext, useEffect, useState } from "react"
import { toast } from "sonner"
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';


const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState("")
  const [profilePicUrl, setProfilePicUrl] = useState("")
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState("") // Add this
  const [userEmail, setUserEmail] = useState("") // Add this
  const [userCreatedAt, setUserCreatedAt] = useState(null) // Add this


  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include",
        })
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            toast.success("Logged In Successfully!")
            setIsLoggedIn(true)
            setUserName(data.user.name)
            setProfilePicUrl(data.user.profilePicUrl || "")
            setUserId(data.user.id) // Add this
            setUserEmail(data.user.email) // Add this
            setUserCreatedAt(data.user.createdAt) // Add this

          }
        }
      } catch (err) {
        console.error("Error fetching user info:", err)
      } finally {
        setAuthLoading(false); // ✅ mark loading finished

      }
    }
    checkAuth()
  }, [])



  const handleLogout = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: "include",

      })
      if (res.ok) {
        localStorage.removeItem(HOME_CACHE_KEY);
        toast.info("Logged out successfully!")
        setIsLoggedIn(false)
        setUserName("")
        setProfilePicUrl("")
        setUserId("") // Add this
        setUserEmail("") // Add this
        setUserCreatedAt(null) // Add this
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
        userEmail,
        userCreatedAt,
        authLoading
      }}
    >
      {!authLoading && children}
    </AuthContext.Provider>

  )
}

export const useAuth = () => useContext(AuthContext)
