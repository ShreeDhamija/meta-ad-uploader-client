"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOutIcon, Settings, Clock, Bell } from "lucide-react"
import ZapIcon from "@/assets/icons/Zap.svg?react"
import ChatIcon from "@/assets/icons/chat.svg?react"
import AnalyticsIcon from "@/assets/icons/Analytics.svg?react"
import RocketBtn from "@/assets/rocket2.webp"
import TikTokUserPlaceholder from "@/assets/TikTokUser.jpg"
import { useAuth } from "@/lib/AuthContext"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import { useLocation, useNavigate } from "react-router-dom"
import useSubscription from "@/lib/useSubscriptionSettings"
import useNotifications from "@/lib/useNotifications"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function TikTokHeader({ showMessenger, hideMessenger }) {
  const { isLoggedIn, userName, profilePicUrl, handleLogout } = useAuth()
  const { logoutTikTok, isTikTokLoggedIn, tiktokUser } = useTikTokAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    subscriptionData,
    isOnTrial,
    isTrialExpired,
    hasActiveAccess,
    isPaidSubscriber,
    loading: subscriptionLoading
  } = useSubscription()

  const { notifications, hasUnread, loading: notificationsLoading, markAsRead } = useNotifications()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const isAnalyticsPage = location.pathname === "/analytics"
  const isTikTokPage = location.pathname === "/tiktok-ads"

  // On the TikTok page, show TikTok user info; otherwise fall back to Meta auth
  const displayName = isTikTokPage
    ? (tiktokUser?.display_name || tiktokUser?.name || "")
    : userName
  const displayPic = isTikTokPage
    ? (tiktokUser?.avatar_url || tiktokUser?.profile_image_url || TikTokUserPlaceholder)
    : (profilePicUrl || TikTokUserPlaceholder)
  const headerCardShadow = "shadow-[0px_1px_2px_rgba(0,0,0,0.06)]"

  const handleDropdownClose = (open) => {
    setDropdownOpen(open)
    if (!open && notifications.length > 0) {
      markAsRead()
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMins = Math.floor((now - date) / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

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
      {isAnalyticsPage ? (
        <button
          onClick={() => navigate("/")}
          className={`flex items-center gap-3 bg-white border border-black/10 rounded-[20px] px-3 py-2 ${headerCardShadow} hover:shadow-md transition cursor-pointer`}
        >
          <img
            src={RocketBtn}
            alt="Launcher"
            className="w-9 h-9 object-contain"
          />
          <span className="text-[14px] font-medium text-gray-700 whitespace-nowrap">Go To Launcher</span>
        </button>
      ) : (
        <div className={`flex items-center gap-3 bg-white border border-black/10 rounded-[20px] px-3 py-2 ${headerCardShadow}`}>
          <img
            src={displayPic}
            alt="Profile"
            className="w-9 h-9 rounded-full border border-zinc-300 object-cover"
          />
          <span className="text-[14px] font-medium text-gray-700 whitespace-nowrap">{displayName}</span>
        </div>
      )}

      {/* Action Buttons (Right) */}
      <div className={`flex items-center gap-3 bg-white border border-black/10 rounded-[20px] px-3 py-2 ml-2 ${headerCardShadow}`}>

        {/* Trial/Subscription Status Button - hide on mobile */}
        {!subscriptionLoading && (isOnTrial() || !hasActiveAccess()) && (
          <>
            <button
              onClick={handleUpgrade}
              className={`flex items-center gap-2 px-3 py-1 rounded-full transition text-sm font-medium cursor-pointer ${getTrialButtonStyle()}`}
              title={
                isSubscriptionExpired() ? "Your subscription has expired" :
                  isTrialExpired() ? "Your trial has expired" :
                    `${subscriptionData.trialDaysLeft} days remaining in trial`
              }
            >
              <Clock className="w-4 h-4" />
              {/* Trial status text — the one label kept below 1000px */}
              <span>{getTrialText()}</span>
            </button>
            <Button
              onClick={handleUpgrade}
              size="sm"
              className={`flex h-7 px-3 py-4 text-[13px] text-white font-medium rounded-full cursor-pointer ${!hasActiveAccess() ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              <ZapIcon className="w-3.5 h-3.5" />
              <span>{!hasActiveAccess() ? 'Subscribe' : 'Upgrade'}</span>
            </Button>
            <div className="block h-8 w-px bg-gray-300  " />
          </>
        )}

        {/* Notifications Dropdown */}
        {hasUnread && (
          <>
            <DropdownMenu open={dropdownOpen} onOpenChange={handleDropdownClose}>
              <DropdownMenuTrigger asChild>
                <button
                  title="Notifications"
                  className="relative p-1.5 rounded-full hover:bg-gray-100 transition focus:outline-none cursor-pointer"
                >
                  <Bell className="w-5 h-5 text-gray-700" />
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 bg-white rounded-2xl">
                <DropdownMenuLabel>What's New</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notificationsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 cursor-default !rounded-xl">
                        <p className="text-sm text-gray-700">{n.message}</p>
                        <p className="text-xs text-gray-400">{formatTime(n.createdAt)}</p>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Divider after bell */}
            <div className="hidden min-[1000px]:block h-8 w-px bg-gray-300  " />
          </>
        )}

        <button
          onClick={() => navigate(isTikTokPage ? "/settings?tab=tiktok" : "/settings")}
          title="Settings"
          className="flex items-center gap-1.5 rounded-full transition bg-transparent hover:bg-gray-100 focus:bg-transparent active:bg-transparent !focus:outline-none !focus:ring-0 !active:ring-0 px-4 py-2 cursor-pointer"
          style={{
            outline: "none",
            boxShadow: "none",
            border: "none",
          }}
        >
          <Settings className="w-5 h-5 text-black" />
          <span className="hidden min-[1000px]:inline text-gray-900 text-[14px] font-medium">Preferences</span>
        </button>
        <div className="hidden min-[1000px]:block h-8 w-px bg-gray-300" />
        <button
          onClick={() => navigate("/analytics")}
          title="Analytics"
          className="flex items-center gap-1.5 rounded-full transition-colors px-2 py-2   bg-transparent hover:bg-gray-100 focus:bg-transparent active:bg-transparent cursor-pointer"
        >
          <AnalyticsIcon className="size-5" />
          <span className="hidden min-[1000px]:inline text-[14px] text-gray-900 font-medium">Analytics</span>
        </button>
        <div className="hidden min-[1000px]:block h-8 w-px bg-gray-300  " />
        {/* Chat Support Button */}
        <button
          onClick={handleChatToggle}
          title="Support Chat"
          className="py-2 bg-transparent hover:bg-gray-100 text-gray-700 rounded-full flex items-center justify-center transition-colors px-3 gap-1.5 cursor-pointer"
        >
          <ChatIcon className="size-5" />
          <span className="hidden min-[1000px]:inline text-[14px] text-gray-900 font-medium">Chat With Us</span>
        </button>

        <div className="hidden min-[1000px]:block h-8 w-px bg-gray-300  " />

        <button
          onClick={isTikTokPage ? logoutTikTok : handleLogout}
          title={isTikTokPage ? "Logout of TikTok" : "Logout"}
          className="p-1 rounded-full transition !bg-transparent hover:!bg-transparent focus:outline-none focus:ring-0 active:ring-0 cursor-pointer"
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
