"use client"

import { useAuth } from "@/lib/AuthContext"
import { Navigate, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { LogOutIcon } from "lucide-react"
import { Toaster } from "sonner"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import useGlobalSettings from "@/lib/useGlobalSettings"
import AdAccountSettings from "@/components/settings/AdAccountSettings"
import BillingSettings from "@/components/settings/Billing"
import useSubscription from "@/lib/useSubscriptionSettings"
import SettingsOnboardingPopup from "@/components/SettingsOnboardingPopup"
import AdAccountSelectionPopup from "@/components/AdAccountSelectionPopup"
import RocketBtn from '@/assets/rocket2.webp';
import Folder from '@/assets/icons/cog-three.svg?react';
import Card from '@/assets/icons/card.svg?react';
import TeamSettings from "@/components/settings/TeamSettings"
import UsersIcon from "@/assets/icons/users.svg?react";
import DesktopIcon from '@/assets/Desktop.webp';
import "../settings.css"
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';
const SETTINGS_TABS = ["adaccount", "billing", "team"]

export default function Settings() {
    const { isLoggedIn, userName, profilePicUrl, handleLogout, authLoading } = useAuth()
    const [showSettingsPopup, setShowSettingsPopup] = useState(false)
    const [showAdAccountPopup, setShowAdAccountPopup] = useState(false)
    const navigate = useNavigate()
    const {
        subscriptionData,
        loading: subscriptionLoading,
    } = useSubscription()
    const urlParams = new URLSearchParams(window.location.search)
    const requestedTab = urlParams.get('tab')
    const initialTab = SETTINGS_TABS.includes(requestedTab) ? requestedTab : 'adaccount'
    const preselectedAdAccount = urlParams.get('adAccount')
    const [activeTab, setActiveTab] = useState(initialTab)

    const tabIconMap = {
        adaccount: Folder,
        billing: Card,
        team: UsersIcon,
    }

    const { hasSeenSettingsOnboarding, setHasSeenSettingsOnboarding, loading, selectedAdAccountIds } = useGlobalSettings()

    const tabDescriptionMap = {
        adaccount: "Configure default settings and values to pre-fill into ads for all your ad accounts.",
        billing: "Manage your subscription, billing methods, and view invoices.",
        team: "Manage your team, invite members, or join an existing team.",
    }

    const tabTitleMap = {
        adaccount: "Ad Account Settings",
        billing: "Billing and Subscription",
        team: "Team Management",
    };

    const tabLabelMap = {
        adaccount: "Preferences",
        billing: "Billing",
        team: "Team",
    }


    const handleCloseSettingsPopup = () => {
        setShowSettingsPopup(false)
        fetch(`${API_BASE_URL}/settings/save`, {
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
        if (!SETTINGS_TABS.includes(activeTab)) {
            setActiveTab("adaccount")
            const newUrl = new URL(window.location)
            newUrl.searchParams.set("tab", "adaccount")
            window.history.replaceState({}, '', newUrl)
        }
    }, [activeTab])


    useEffect(() => {
        if (!loading && !hasSeenSettingsOnboarding) {
            setShowSettingsPopup(true)
        }
    }, [loading, hasSeenSettingsOnboarding])

    useEffect(() => {
        if (loading || subscriptionLoading) return;

        if ((subscriptionData.planType === 'brand' || subscriptionData.planType === 'starter') && (!selectedAdAccountIds || selectedAdAccountIds.length === 0)) {
            setShowAdAccountPopup(true)
        }
    }, [subscriptionData.planType, selectedAdAccountIds])

    if (authLoading) return null
    if (!isLoggedIn) return <Navigate to="/login" />

    return (
        <>

            <div className="mobile-message fixed inset-0 bg-white flex flex-col items-center justify-center p-6 z-[100] lg:hidden">
                <div className="text-center max-w-md">
                    <img src={DesktopIcon} alt="Desktop computer" className="w-24 h-24 mb-4 mx-auto" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Desktop Recommended</h1>
                    <p className="text-gray-600 mb-6">
                        Blip works best on a bigger screen. <br></br> We've sent you an email to help you<br></br> pick up from here.
                    </p>
                    <button
                        onClick={() => navigate("/")}
                        className="mt-4 px-6 py-2 text-sm text-white bg-blue-600 rounded-xl hover:text-blue-700 transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>


            <div className="flex min-h-screen bg-[#fafafa]">
                {/* Sidebar */}
                <div className="w-[290px] flex flex-col h-screen sticky top-0 px-4 py-6 max-lg:w-[80px] max-lg:min-w-[80px] max-lg:px-2">
                    <div className=" rounded-3xl p-4 flex flex-col h-full">
                        {/* Main Content */}
                        <div className="flex-1 flex flex-col">
                            {/* Back to Home Button */}
                            <Button
                                onClick={() => navigate("/")}
                                className="flex items-center pl-3 justify-start gap-1 bg-white border border-gray-200 shadow-sm rounded-[20px] py-7 font-medium w-full mb-4 hover:!bg-white hover:shadow-md"
                                variant="ghost"
                            >
                                <img src={RocketBtn} alt="Home" className="w-8 h-8 object-contain" />
                                <div className="h-6 w-px bg-gray-300 mr-2 max-lg:hidden" />
                                <span className="text-gray-700 font-semibold max-lg:hidden">Back To Launcher</span>
                            </Button>

                            {/* Tab Buttons */}
                            <div className="space-y-2">
                                {SETTINGS_TABS.map((tab) => {
                                    const Icon = tabIconMap[tab];
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => handleTabChange(tab)}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-4 py-2 rounded-2xl transition-colors h-10",
                                                activeTab === tab
                                                    ? "bg-[#ECECEE] border border-black/[0.02] font-semibold text-black"
                                                    : "border border-transparent text-black hover:bg-black/[0.04]",
                                                "justify-start max-lg:justify-center max-lg:px-2 relative",
                                            )}
                                        >
                                            <Icon
                                                aria-label={`${tab} icon`}
                                                className={cn(
                                                    "w-5 h-5 max-lg:w-6 max-lg:h-6 transition-all duration-500 ease-in-out object-contain flex-shrink-0 text-black",
                                                    activeTab === tab
                                                        ? "opacity-100"
                                                        : "opacity-70"
                                                )}
                                            />
                                            <span className="text-sm font-medium max-lg:hidden transition-colors duration-500 ease-in-out text-black">
                                                {tabLabelMap[tab]}
                                            </span>
                                            {activeTab === tab && (
                                                <span className="ml-auto h-2 w-2 rounded-full bg-black max-lg:hidden" aria-hidden="true" />
                                            )}

                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer Profile + Logout */}
                        <div className="pt-4 mt-auto">
                            <div className="w-full flex items-center bg-white border border-gray-200 shadow-sm rounded-[20px] pl-3 pr-3 py-2 max-lg:justify-center max-lg:p-2">
                                <div className="flex items-center gap-2 flex-grow max-lg:hidden">
                                    <img
                                        src={profilePicUrl || "/placeholder.svg"}
                                        alt="Profile"
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                    <span className="text-sm font-medium text-black truncate max-w-[120px]">{userName}</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="h-6 w-px bg-gray-300 max-lg:hidden" />
                                    <button onClick={handleLogout} className="ml-3 rounded-full transition max-lg:ml-0" title="Logout">
                                        <LogOutIcon className="w-4 h-4 max-lg:w-5 max-lg:h-5 text-black" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Area */}
                <main className="flex-1 py-6 pr-6">
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm h-[calc(100vh-3rem)] flex flex-col overflow-hidden relative">
                        <div className="flex-1 overflow-auto">
                            <div className="w-full max-w-[52rem] mx-auto p-16">
                                <p className="text-sm text-gray-400 mb-1 text-left">Settings / {tabLabelMap[activeTab]}</p>
                                <h1 className="text-xl font-semibold mb-1 text-left">
                                    {tabTitleMap[activeTab]}
                                </h1>

                                <p className="text-gray-400 text-sm mb-6 text-left">{tabDescriptionMap[activeTab]}</p>

                                <div className="w-full">
                                    {activeTab === "adaccount" && (
                                        <AdAccountSettings
                                            preselectedAdAccount={preselectedAdAccount}
                                            onTriggerAdAccountPopup={() => setShowAdAccountPopup(true)}
                                            subscriptionData={subscriptionData}
                                        />
                                    )}
                                    {activeTab === "billing" && <BillingSettings />}
                                    {activeTab === "team" && <TeamSettings />}

                                </div>
                            </div>
                        </div>
                        <div id="settings-save-bar-portal" className="absolute bottom-0 left-0 w-full z-50" />

                    </div>
                </main>

                <div>
                    <Toaster richColors position="bottom-left" closeButton />
                </div>
                {showSettingsPopup && <SettingsOnboardingPopup onClose={handleCloseSettingsPopup} />}
                <AdAccountSelectionPopup
                    isOpen={showAdAccountPopup}
                    onClose={() => setShowAdAccountPopup(false)}
                    selectedAdAccountIds={selectedAdAccountIds}

                />
            </div>
        </>
    )
}
