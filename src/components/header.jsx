"use client"

import { Button } from "@/components/ui/button"
import { LogOutIcon, Settings, Clock, CreditCard, MessageCircle } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"
import { useNavigate } from "react-router-dom"
import useSubscription from "@/lib/useSubscriptionSettings"

export default function Header({ showMessenger, hideMessenger }) {
  const { isLoggedIn, userName, profilePicUrl, handleLogout } = useAuth()

  const navigate = useNavigate()
  const {
    subscriptionData,
    isOnTrial,
    isTrialExpired,
    hasActiveAccess,
    isPaidSubscriber,
    loading: subscriptionLoading
  } = useSubscription()




  const handleChatToggle = () => {
    if (showMessenger) {
      showMessenger()
    }
  }

  const handleUpgrade = () => {
    navigate('/settings?tab=billing')
  }

  const isSubscriptionExpired = () => {
    if (!subscriptionData.willCancelAt) return false;
    const cancelDate = new Date(subscriptionData.willCancelAt);
    const now = new Date();
    return now > cancelDate;
  }


  const getTrialButtonStyle = () => {
    if (!hasActiveAccess()) {
      return "text-red-600 hover:text-red-700"
    }
    if (subscriptionData.trialDaysLeft <= 3) {
      return "text-yellow-600 hover:text-yellow-700"
    }
    return "text-blue-600 hover:text-blue-700"
  }

  const getTrialText = () => {
    if (isSubscriptionExpired()) {
      return "Subscription Expired"
    }
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

        {/* Trial/Subscription Status Button - hide on mobile */}
        {!subscriptionLoading && (isOnTrial() || !hasActiveAccess()) && (
          <>
            <button
              onClick={handleUpgrade}
              className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full transition text-sm font-medium ${getTrialButtonStyle()}`}
              title={
                isSubscriptionExpired() ? "Your subscription has expired" :
                  isTrialExpired() ? "Your trial has expired" :
                    `${subscriptionData.trialDaysLeft} days remaining in trial`
              }
            >
              <Clock className="w-4 h-4" />
              <span>{getTrialText()}</span>
            </button>
            <Button
              onClick={handleUpgrade}
              size="sm"
              className={`hidden md:flex h-7 px-3 text-xs text-white rounded-full ${!hasActiveAccess() ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              <CreditCard className="w-3 h-3 mr-1" />
              {!hasActiveAccess() ? 'Subscribe' : 'Upgrade'}
            </Button>
            <div className="hidden md:block h-8 w-px bg-gray-300" />
          </>
        )}

        <button
          onClick={() => navigate("/settings")}
          title="Settings"
          className="hidden md:flex items-center gap-1 p-1 rounded-full transition !bg-transparent hover:!bg-transparent !focus:outline-none !focus:ring-0 !active:ring-0"
          style={{
            backgroundColor: "transparent",
            outline: "none",
            boxShadow: "none",
            border: "none",
          }}
        >
          <Settings className="w-5 h-5 text-gray-700" />
          <span className="hidden md:inline text-gray-700 text-sm">Preferences</span>
        </button>

        {/* Chat Support Button */}
        <button
          onClick={handleChatToggle}
          title="Support Chat"
          className="px-2 md:px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-full flex items-center justify-center transition-colors ml-2 gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="inline text-xs">Chat With Us</span>
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
