import { createContext, useContext, useEffect, useState } from "react"
import { toast } from "sonner"



const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState("")
  const [profilePicUrl, setProfilePicUrl] = useState("")
  const [authLoading, setAuthLoading] = useState(true);


  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("https://meta-ad-uploader-server-production.up.railway.app/auth/me", {
          credentials: "include",
        })
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            toast.success("Logged In Successfully!")
            setIsLoggedIn(true)
            setUserName(data.user.name)
            setProfilePicUrl(data.user.profilePicUrl || "")

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
      const res = await fetch("https://meta-ad-uploader-server-production.up.railway.app/auth/logout", {
        credentials: "include",
      })
      if (res.ok) {
        toast.info("Logged out successfully!")
        setIsLoggedIn(false)
        setUserName("")
        setProfilePicUrl("")
      } else {
        toast.error("Failed to log out")
      }
    } catch (error) {
      toast.error("Logout error: " + error.message)
    }
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, userName, profilePicUrl, handleLogout }}>
      {!authLoading && children} {/* ✅ only render app after auth check */}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
