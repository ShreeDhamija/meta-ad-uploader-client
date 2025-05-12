"use client"

import { Button } from "@/components/ui/button"
import { LogOutIcon, Settings } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"
import { useNavigate } from "react-router-dom"

export default function Header() {
  const { isLoggedIn, userName, profilePicUrl, handleLogout } = useAuth()
  const navigate = useNavigate()



  return (
    <header className="flex justify-between items-center py-3 mb-4">
      {/* Profile Section (Left) */}
      <div className="flex items-center gap-3 bg-white shadow-md border border-gray-300 rounded-[40px] px-3 py-2">
        <img
          src={profilePicUrl}
          alt="Profile"
          className="w-9 h-9 rounded-full border border-zinc-300 object-cover"
        />
        <span className="text-sm font-medium text-gray-800 whitespace-nowrap">{userName}</span>
      </div>

      {/* Action Buttons (Right) */}
      <div className="flex items-center gap-2 bg-white shadow-md border border-gray-300 rounded-[40px] px-3 py-2 ml-2">
        <button
          onClick={() => navigate("/settings")}
          title="Settings"
          className="flex items-center gap-1 p-1 rounded-full transition !bg-transparent hover:!bg-transparent !focus:outline-none !focus:ring-0 !active:ring-0"
          style={{
            backgroundColor: "transparent",
            outline: "none",
            boxShadow: "none",
            border: "none",
          }}
        >
          <Settings className="w-5 h-5 text-gray-700" />
          <span className="text-gray-700 text-sm">Preferences</span>
        </button>
        <div className="h-8 w-px bg-gray-300" />

        <button
          onClick={handleLogout}
          title="Logout"
          className="p-1 rounded-full transition !bg-transparent hover:!bg-transparent focus:outline-none focus:ring-0 active:ring-0"
          style={{
            backgroundColor: "transparent",
            outline: "none",
            boxShadow: "none",
            border: "none",
          }}
        >
          <LogOutIcon className="w-5 h-5 text-red-600" />
        </button>
      </div>
    </header >

  )
}
