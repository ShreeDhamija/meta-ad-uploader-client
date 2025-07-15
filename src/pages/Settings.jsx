"use client"

import { useAuth } from "@/lib/AuthContext"
import { Navigate, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { LogOutIcon } from "lucide-react"
import { Home } from "lucide-react"
import { Toaster } from "sonner"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import GlobalSettings from "@/components/settings/global-settings"
import useGlobalSettings from "@/lib/useGlobalSettings"
import AdAccountSettings from "@/components/settings/AdAccountSettings"
import BillingSettings from "@/components/settings/Billing"
import ViewAds from "@/components/settings/view-ads"
import SettingsOnboardingPopup from "@/components/SettingsOnboardingPopup"
import HomeBtn from '@/assets/icons/home.svg?react';

export default function Settings() {
    const { isLoggedIn, userName, profilePicUrl, handleLogout, authLoading } = useAuth()
    const [showSettingsPopup, setShowSettingsPopup] = useState(false)
    const navigate = useNavigate()
    // const [activeTab, setActiveTab] = useState("adaccount")
    const urlParams = new URLSearchParams(window.location.search)
    const initialTab = urlParams.get('tab') || 'adaccount'
    const preselectedAdAccount = urlParams.get('adAccount') // Add this line
    const [activeTab, setActiveTab] = useState(initialTab)
    const tabIconMap = {
        global: "https://api.withblip.com/icons/settings.svg",
        adaccount: "https://api.withblip.com/icons/folder.svg",
        billing: "https://api.withblip.com/icons/card.svg",
        viewads: "https://api.withblip.com/icons/viewads.svg", // use your own icon or placeholder
    }

    const { hasSeenSettingsOnboarding, setHasSeenSettingsOnboarding, loading } = useGlobalSettings()

    const tabDescriptionMap = {
        global: "These preferences will apply to ALL ad accounts in your account.",
        adaccount: "Configure default settings and values to pre-fill into ads for all your ad accounts.",
        billing: "Manage your subscription, billing methods, and view invoices.",
        viewads: "Preview all ads created in the last hour.",
    }

    const tabLabelMap = {
        global: "Global",
        adaccount: "Ad Account",
        billing: "Billing",
        viewads: "View Ads",
    }

    const handleCloseSettingsPopup = () => {
        setShowSettingsPopup(false)
        fetch("https://api.withblip.com/settings/save", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                globalSettings: { hasSeenSettingsOnboarding: true },
            }),
        }).then(() => setHasSeenSettingsOnboarding(true))
    }

    const handleTabChange = (tab) => {
        setActiveTab(tab)
        // Update URL without page reload
        const newUrl = new URL(window.location)
        newUrl.searchParams.set('tab', tab)
        window.history.pushState({}, '', newUrl)
        document.activeElement.blur()
    }

    useEffect(() => {
        if (!loading && !hasSeenSettingsOnboarding) {
            setShowSettingsPopup(true)
        }
    }, [loading, hasSeenSettingsOnboarding])

    if (authLoading) return null // or a loading spinner if you want
    if (!isLoggedIn) return <Navigate to="/login" />

    return (
        <div className="flex bg-gray-100 min-h-screen">
            {/* Sidebar */}
            <div className="w-[290px] flex flex-col h-screen sticky top-0 px-4 py-6 max-lg:w-[80px] max-lg:min-w-[80px] max-lg:px-2">
                <div className=" rounded-3xl p-4 flex flex-col h-full">
                    {/* Main Content (will take all available vertical space except the footer) */}
                    <div className="flex-1 flex flex-col">
                        {/* Back to Home Button */}
                        <Button
                            onClick={() => navigate("/")}
                            className="flex items-center justify-start gap-2 bg-white border border-gray-200 shadow-sm rounded-[20px] py-6 text- font-medium w-full mb-4 !hover:bg-gray-100"
                            variant="ghost"
                        >
                            <HomeBtn className="!w-5 !h-5" />
                            <div className="h-4 w-px bg-gray-300 max-lg:hidden" />
                            <span className="text-gray-700 max-lg:hidden">Back To Home</span>
                        </Button>

                        {/* Tab Buttons */}
                        <div className="space-y-2">
                            {["adaccount", "global", "billing", "viewads"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => handleTabChange(tab)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-4 py-2 rounded-2xl",
                                        activeTab === tab
                                            ? "bg-gradient-to-b from-zinc-600 to-zinc-700 border border-2 border-zinc-200/20 font-semibold text-white shadow-md"
                                            : "hover:bg-gray-300",
                                        "justify-start max-lg:justify-center max-lg:px-2",
                                    )}
                                >
                                    <img
                                        src={tabIconMap[tab] || "/placeholder.svg"}
                                        alt={`${tab} icon`}
                                        className={cn(
                                            "w-5 h-5 max-lg:w-6 max-lg:h-6 transition-all duration-500 ease-in-out object-contain flex-shrink-0",
                                            activeTab === tab
                                                ? "brightness-0 invert" // let original color show
                                                : "grayscale brightness-75 contrast-75 opacity-60",
                                        )}
                                    />
                                    <span className="text-sm font-medium max-lg:hidden transition-colors duration-500 ease-in-out">
                                        {tab === "global"
                                            ? "Global Settings"
                                            : tab === "adaccount"
                                                ? "Ad Account Settings"
                                                : tab === "viewads"
                                                    ? "View Ads"
                                                    : "Billing"}
                                    </span>
                                </button>
                            ))}
                        </div>
                        {/* Any other content, just add margin-bottom as needed */}
                    </div>

                    {/* Footer Profile + Logout pinned to bottom */}
                    <div className="pt-4 mt-auto">
                        <div className="w-full flex items-center bg-white border border-gray-200 shadow-sm rounded-[20px] pl-3 pr-3 py-2 max-lg:justify-center max-lg:p-2">
                            {/* Profile image + name - hidden on small screens */}
                            <div className="flex items-center gap-2 flex-grow max-lg:hidden">
                                <img
                                    src={profilePicUrl || "/placeholder.svg"}
                                    alt="Profile"
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                                <span className="text-sm font-medium text-black truncate max-w-[120px]">{userName}</span>
                            </div>
                            {/* Divider and logout button grouped together */}
                            <div className="flex items-center">
                                <div className="h-6 w-px bg-gray-300 max-lg:hidden" />
                                <button onClick={handleLogout} className="ml-3 rounded-full transition max-lg:ml-0" title="Logout">
                                    <LogOutIcon className="w-4 h-4 max-lg:w-5 max-lg:h-5 text-red-600" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <main className="flex-1 py-6 pr-6">
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm h-[calc(100vh-3rem)] flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto">
                        <div className="w-full max-w-3xl mx-auto p-16">
                            <p className="text-sm text-gray-400 mb-1 text-left">Settings / {tabLabelMap[activeTab]}</p>
                            <h1 className="text-xl font-semibold mb-1 text-left">
                                {activeTab === "global"
                                    ? "Global Preferences"
                                    : activeTab === "adaccount"
                                        ? "Ad Account Settings"
                                        : activeTab === "viewads"
                                            ? "Recently Created Ads"
                                            : "Billing and Subscription"}
                            </h1>
                            <p className="text-gray-400 text-sm mb-6 text-left">{tabDescriptionMap[activeTab]}</p>

                            <div className="w-full">
                                {activeTab === "global" && <GlobalSettings />}
                                {activeTab === "adaccount" && <AdAccountSettings preselectedAdAccount={preselectedAdAccount} />}
                                {activeTab === "viewads" && <ViewAds />}
                                {activeTab === "billing" && <BillingSettings />}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <div>
                <Toaster richColors position="bottom-right" closeButton />
            </div>
            {showSettingsPopup && <SettingsOnboardingPopup onClose={handleCloseSettingsPopup} />}
        </div>
    )
}
