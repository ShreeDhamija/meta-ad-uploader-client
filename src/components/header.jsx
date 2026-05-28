"use client"

import AnalyticsIcon from "@/assets/icons/Analytics.svg?react"
import ZapIcon from "@/assets/icons/Zap.svg?react"
import ChatIcon from "@/assets/icons/chat.svg?react"
import RocketBtn from "@/assets/rocket2.webp"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/AuthContext"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import useNotifications from "@/lib/useNotifications"
import useSubscription from "@/lib/useSubscriptionSettings"
import { Bell, Clock, LogOutIcon, Settings } from "lucide-react"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

// High-fidelity Platform Switcher Icons
function MetaIcon({ className, active }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
      <path d="M16.2 6.5c-1.3 0-2.5.5-3.5 1.4-.6.6-1.1 1.4-1.5 2.2-.4-.8-.9-1.6-1.5-2.2-1-.9-2.2-1.4-3.5-1.4C4.1 6.5 2 8.7 2 11.5S4.1 16.5 6.2 16.5c1.3 0 2.5-.5 3.5-1.4.6-.6 1.1-1.4 1.5-2.2.4.8.9 1.6 1.5 2.2 1 .9 2.2 1.4 3.5 1.4 2.1 0 4.2-2.2 4.2-5s-2.1-5-4.2-5zm0 8c-1 0-1.8-.4-2.5-1-.5-.5-.9-1.2-1.2-2 .3-.8.7-1.5 1.2-2 .7-.6 1.5-1 2.5-1 1.2 0 2.2 1.1 2.2 3s-1 3-2.2 3zm-10 0c-1.2 0-2.2-1.1-2.2-3s1-3 2.2-3c1 0 1.8.4 2.5 1 .5.5.9 1.2 1.2 2-.3.8-.7 1.5-1.2 2-.7.6-1.5 1-2.5 1z" fill={active ? "#1877F2" : "#71717A"} />
    </svg>
  )
}

function TikTokIcon({ className, active }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <path d="M12.525 2c.063 4.238 2.664 7.234 6.786 7.426v3.743c-2.433-.122-4.526-1.04-5.918-2.61v7.625C13.393 21.94 10.378 24 6.946 24 3.111 24 0 20.73 0 16.71c0-4.022 3.111-7.29 6.946-7.29.566 0 1.107.07 1.626.196v3.746c-.519-.175-1.066-.27-1.626-.27-2.029 0-3.673 1.71-3.673 3.82 0 2.106 1.644 3.82 3.673 3.82 2.052 0 3.738-1.584 3.738-3.693V2h1.865z" fill={active ? "#000000" : "#71717A"} />
    </svg>
  )
}

export default function Header({ showMessenger, hideMessenger }) {
  const { isLoggedIn, userName, profilePicUrl, handleLogout } = useAuth()
  const { isTikTokLoggedIn, tiktokUser, logoutTikTok } = useTikTokAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isTikTokPage = location.pathname.includes('tiktok')
  const handleSwitchPlatform = (platform) => {
    if (platform === 'meta') {
      if (location.pathname !== '/') {
        navigate('/')
      }
    } else if (platform === 'tiktok') {
      if (!location.pathname.includes('tiktok')) {
        navigate(isTikTokLoggedIn ? '/tiktok-ads' : '/tiktok-login')
      }
    }
  }

  const isTikTokActive = location.pathname.includes('tiktok') || (location.pathname === '/settings' && new URLSearchParams(location.search).get('tab') === 'tiktok')
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
  const showAnalyticsNav = import.meta.env.VITE_APP_ENV === "staging"
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
          className={`flex items-center gap-3 bg-white border border-black/10 rounded-[20px] px-3 py-2 ${headerCardShadow} hover:shadow-md transition`}
        >
          <img
            src={RocketBtn}
            alt="Launcher"
            className="w-9 h-9 object-contain"
          />
          <span className="text-[14px] font-medium text-gray-700 whitespace-nowrap">Go To Launcher</span>
        </button>
      ) : (() => {
        const showTikTokUser = isTikTokPage && isTikTokLoggedIn && tiktokUser
        const displayUserName = showTikTokUser ? (tiktokUser.name || tiktokUser.displayName || "TikTok User") : userName
        const displayProfilePic = showTikTokUser ? (tiktokUser.picture || tiktokUser.avatarUrl || tiktokUser.avatar_url) : profilePicUrl

        return (
          <div className={`flex items-center gap-3 bg-white border border-black/10 rounded-[20px] px-3 py-2 ${headerCardShadow}`}>
            <img
              src={displayProfilePic}
              alt="Profile"
              className="w-9 h-9 rounded-full border border-zinc-300 object-cover"
            />
            <span className="text-[14px] font-medium text-gray-700 whitespace-nowrap">{displayUserName}</span>
          </div>
        )
      })()}

      {/* Platform Switcher (Center) */}
      <div className="hidden md:flex bg-zinc-100/80 backdrop-blur-md p-1 rounded-full border border-black/5 shadow-inner select-none transition-all duration-300 gap-1">
        <button
          onClick={() => handleSwitchPlatform('meta')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 active:scale-95 ${!isTikTokActive
            ? "bg-white text-zinc-900 shadow-sm border border-black/5"
            : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50"
            }`}
        >
          <MetaIcon active={!isTikTokActive} />
          <span>Meta Ads</span>
          <span
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isLoggedIn
              ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]"
              : "bg-zinc-300"
              }`}
            title={isLoggedIn ? "Meta Connected" : "Meta Disconnected"}
          />
        </button>

        <button
          onClick={() => handleSwitchPlatform('tiktok')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 active:scale-95 ${isTikTokActive
            ? "bg-white text-zinc-900 shadow-sm border border-black/5"
            : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50"
            }`}
        >
          <TikTokIcon active={isTikTokActive} />
          <span>TikTok Ads</span>
          <span
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isTikTokLoggedIn
              ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]"
              : "bg-zinc-300"
              }`}
            title={isTikTokLoggedIn ? "TikTok Connected" : "TikTok Disconnected"}
          />
        </button>
      </div>

      {/* Action Buttons (Right) */}
      <div className={`flex items-center gap-3 bg-white border border-black/10 rounded-[20px] px-3 py-2 ml-2 ${headerCardShadow}`}>

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
              className={`hidden md:flex h-7 px-3 py-4 text-[13px] text-white font-medium rounded-full ${!hasActiveAccess() ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              <ZapIcon className="w-3.5 h-3.5" />
              {!hasActiveAccess() ? 'Subscribe' : 'Upgrade'}
            </Button>
            <div className="hidden md:block h-8 w-px bg-gray-300  " />
          </>
        )}

        {/* Notifications Dropdown */}
        {hasUnread && (
          <>
            <DropdownMenu open={dropdownOpen} onOpenChange={handleDropdownClose}>
              <DropdownMenuTrigger asChild>
                <button
                  title="Notifications"
                  className="relative p-1.5 rounded-full hover:bg-gray-100 transition focus:outline-none"
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
            <div className="h-8 w-px bg-gray-300  " />
          </>
        )}

        <button
          onClick={() => {
            const tab = location.pathname.includes('tiktok') ? 'tiktok' : 'adaccount';
            navigate(`/settings?tab=${tab}`);
          }}
          title="Settings"
          className="hidden md:flex items-center gap-1.5 rounded-full transition bg-transparent hover:bg-gray-100 focus:bg-transparent active:bg-transparent !focus:outline-none !focus:ring-0 !active:ring-0 px-4 py-2"
          style={{
            outline: "none",
            boxShadow: "none",
            border: "none",
          }}
        >
          <Settings className="w-5 h-5 text-black" />
          <span className="hidden md:inline text-gray-900 text-[14px] font-medium">Preferences</span>
        </button>
        <div className="h-8 w-px bg-gray-300" />
        {showAnalyticsNav && (
          <>
            <button
              onClick={() => navigate("/analytics")}
              title="Analytics"
              className="hidden md:flex items-center gap-1.5 rounded-full transition-colors px-2 py-2   bg-transparent hover:bg-gray-100 focus:bg-transparent active:bg-transparent"
            >
              <AnalyticsIcon className="size-5" />
              <span className="inline text-[14px] text-gray-900 font-medium">Analytics</span>
            </button>
            <div className="h-8 w-px bg-gray-300  " />
          </>
        )}
        {/* Chat Support Button */}
        <button
          onClick={handleChatToggle}
          title="Support Chat"
          className="py-2 bg-transparent hover:bg-gray-100 text-gray-700 rounded-full flex items-center justify-center transition-colors px-3 gap-1.5"
        >
          <ChatIcon className="size-5" />
          <span className="inline text-[14px] text-gray-900 font-medium">Chat With Us</span>
        </button>

        <div className="h-8 w-px bg-gray-300  " />

        <button
          onClick={async () => {
            if (location.pathname.includes('tiktok')) {
              await logoutTikTok();
            } else {
              await handleLogout();
              window.location.href = '/';
            }
          }}
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
