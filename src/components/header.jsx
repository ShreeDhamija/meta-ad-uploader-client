"use client"

import { Button } from "@/components/ui/button"
import { LogOutIcon, Settings, Clock, CreditCard } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"
import { useNavigate } from "react-router-dom"
import useSubscription from "@/lib/useSubscriptionSettings"

export default function Header() {
  const { isLoggedIn, userName, profilePicUrl, handleLogout } = useAuth()
  const navigate = useNavigate()
  const { subscriptionData, isOnTrial, isTrialExpired, loading: subscriptionLoading } = useSubscription()
  const isTeamMember = subscriptionData.teamId && !subscriptionData.isTeamOwner;


  const handleUpgrade = () => {
    navigate('/settings?tab=billing')
  }

  const getTrialButtonStyle = () => {
    if (isTrialExpired()) {
      return "text-red-600 hover:text-red-700"
    }
    if (subscriptionData.trialDaysLeft <= 3) {
      return "text-yellow-600 hover:text-yellow-700"
    }
    return "text-blue-600 hover:text-blue-700"
  }

  const getTrialText = () => {
    if (isTrialExpired()) {
      return "Trial Expired"
    }
    const days = subscriptionData.trialDaysLeft
    return `${days} day${days !== 1 ? 's' : ''} left`
  }

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
        {/* Trial Status Button - only show if on trial and not loading */}
        {!subscriptionLoading && isOnTrial() && !isTeamMember && (
          <>
            <button
              onClick={handleUpgrade}
              className={`flex items-center gap-2 px-3 py-1 rounded-full transition text-sm font-medium ${getTrialButtonStyle()}`}
              title={isTrialExpired() ? "Your trial has expired" : `${subscriptionData.trialDaysLeft} days remaining in trial`}
            >
              <Clock className="w-4 h-4" />
              <span>{getTrialText()}</span>
            </button>
            <Button
              onClick={handleUpgrade}
              size="sm"
              className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-full"
            >
              <CreditCard className="w-3 h-3 mr-1" />
              Upgrade
            </Button>
            <div className="h-8 w-px bg-gray-300" />
          </>
        )}

        {/* Trial Expired Warning - only show if expired */}
        {!subscriptionLoading && isTrialExpired() && !isTeamMember && (
          <>
            <button
              onClick={handleUpgrade}
              className="flex items-center gap-2 px-3 py-1 rounded-full transition text-sm font-medium text-red-600 hover:text-red-700 bg-red-50"
              title="Your trial has expired - upgrade to continue"
            >
              <Clock className="w-4 h-4" />
              <span>Trial Expired</span>
            </button>
            <Button
              onClick={handleUpgrade}
              size="sm"
              className="h-7 px-3 text-xs bg-red-600 hover:bg-red-700 text-white rounded-full"
            >
              <CreditCard className="w-3 h-3 mr-1" />
              Subscribe
            </Button>
            <div className="h-8 w-px bg-gray-300" />
          </>
        )}

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
    </header>
  )
}