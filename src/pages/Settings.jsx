"use client"

import { useAuth } from "@/lib/AuthContext"
import { Navigate, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { CircleHelp, LogOutIcon } from "lucide-react"
import { Toaster } from "sonner"
import { useState, useEffect } from "react"
import PropTypes from "prop-types"
import { cn } from "@/lib/utils"
import useGlobalSettings from "@/lib/useGlobalSettings"
import AdAccountSettings from "@/components/settings/AdAccountSettings"
import TikTokAdvertiserSettings from "@/components/settings/tiktok/TikTokAdvertiserSettings"
import BillingSettings from "@/components/settings/Billing"
import useSubscription from "@/lib/useSubscriptionSettings"
import SettingsOnboardingPopup from "@/components/SettingsOnboardingPopup"
import AdAccountSelectionPopup from "@/components/AdAccountSelectionPopup"
import RocketBtn from '@/assets/rocket2.webp';
import Folder from '@/assets/icons/cog-three.svg?react';
import Card from '@/assets/icons/card.svg?react';
import TeamSettings from "@/components/settings/TeamSettings"
import HelpFAQs from "@/components/settings/HelpFAQs"
import { useIntercom } from "@/lib/useIntercom";
import UsersIcon from "@/assets/icons/users.svg?react";
import TikTokIcon from "@/assets/icons/tiktok.svg?react"
import MetaIcon from "@/assets/icons/meta.svg?react"
import TikTokUserPlaceholder from "@/assets/TikTokUser.jpg"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import TikTokConnectDialog from "@/components/TikTokConnectDialog"
import DesktopIcon from '@/assets/Desktop.webp';
import {
    getRequiredSelectionPlatforms,
    META_PLATFORM,
    TIKTOK_PLATFORM,
} from "@/lib/accountSelection"
import "../settings.css"
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';
const META_SETTINGS_TABS = ["adaccount", "billing", "team", "help"]
const TIKTOK_SETTINGS_TABS = ["tiktok", "billing", "team", "help"]
const TIKTOK_SWITCH_TAB = "tiktok-switch"
const META_SWITCH_TAB = "meta-switch"

export default function Settings({ platform = "meta" }) {
    const isTikTok = platform === "tiktok"
    const settingsTabs = isTikTok ? TIKTOK_SETTINGS_TABS : META_SETTINGS_TABS
    const { isLoggedIn, userName, profilePicUrl, handleLogout, authLoading, features } = useAuth()
    const { isTikTokLoggedIn, tiktokUser, isLoading: tiktokLoading } = useTikTokAuth()
    const providerSwitchTab = isTikTok ? META_SWITCH_TAB : TIKTOK_SWITCH_TAB
    const sidebarTabs = features.tiktokLauncher === true
        ? [...settingsTabs, providerSwitchTab]
        : settingsTabs
    const [showSettingsPopup, setShowSettingsPopup] = useState(false)
    const [showAdAccountPopup, setShowAdAccountPopup] = useState(false)
    const [popupPlatforms, setPopupPlatforms] = useState([META_PLATFORM])
    const [showTikTokConnectDialog, setShowTikTokConnectDialog] = useState(false)
    const navigate = useNavigate()
    const {
        subscriptionData,
        loading: subscriptionLoading,
    } = useSubscription()
    const { showMessenger } = useIntercom(true)
    const urlParams = new URLSearchParams(window.location.search)
    const requestedTab = urlParams.get('tab')
    const defaultTab = isTikTok ? "tiktok" : "adaccount"
    const initialTab = settingsTabs.includes(requestedTab) ? requestedTab : defaultTab
    const preselectedAdAccount = urlParams.get('adAccount')
    const [activeTab, setActiveTab] = useState(initialTab)

    const tabIconMap = {
        adaccount: Folder,
        tiktok: TikTokIcon,
        [TIKTOK_SWITCH_TAB]: TikTokIcon,
        [META_SWITCH_TAB]: MetaIcon,
        billing: Card,
        team: UsersIcon,
        help: CircleHelp,
    }

    const {
        hasSeenSettingsOnboarding,
        setHasSeenSettingsOnboarding,
        loading,
        selectedAdAccountIds,
        selectedTikTokAdvertiserIds,
    } = useGlobalSettings()

    const tabDescriptionMap = {
        adaccount: "Configure default settings and values to pre-fill into ads for all your ad accounts.",
        tiktok: "Configure default settings, UTMs and ad copy for your TikTok advertiser accounts.",
        billing: "Manage your subscription, billing methods, and view invoices.",
        team: "Manage your team, invite members, or join an existing team.",
        help: "Find quick answers and step-by-step video walkthroughs for common Blip workflows.",
    }

    const tabTitleMap = {
        adaccount: "Ad Account Settings",
        tiktok: "TikTok Ad Account Settings",
        billing: "Billing and Subscription",
        team: "Team Management",
        help: "Help & FAQs",
    };

    const tabLabelMap = {
        adaccount: "Preferences",
        tiktok: "Preferences",
        [TIKTOK_SWITCH_TAB]: "TikTok",
        [META_SWITCH_TAB]: "Meta",
        billing: "Billing",
        team: "Team",
        help: "Help & FAQs",
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

    const handleProviderSwitch = () => {
        if (isTikTok) {
            navigate("/settings")
            return
        }
        if (tiktokLoading) return
        if (isTikTokLoggedIn) {
            navigate("/tiktok-settings")
            return
        }
        setShowTikTokConnectDialog(true)
    }

    useEffect(() => {
        if (!settingsTabs.includes(activeTab)) {
            setActiveTab(defaultTab)
            const newUrl = new URL(window.location)
            newUrl.searchParams.set("tab", defaultTab)
            window.history.replaceState({}, '', newUrl)
        }
    }, [activeTab, defaultTab, settingsTabs])


    useEffect(() => {
        if (isTikTok) {
            setShowSettingsPopup(false)
            return
        }
        if (!loading && !hasSeenSettingsOnboarding) {
            setShowSettingsPopup(true)
        }
    }, [isTikTok, loading, hasSeenSettingsOnboarding])

    useEffect(() => {
        if (loading || subscriptionLoading || tiktokLoading) return;

        const requiredPlatforms = getRequiredSelectionPlatforms({
            planType: subscriptionData.planType,
            selectedMetaIds: selectedAdAccountIds,
            selectedTikTokIds: selectedTikTokAdvertiserIds,
            isTikTokConnected: isTikTokLoggedIn,
            requireTikTokTrialSelection: isTikTok,
        })
        if (requiredPlatforms.length > 0) {
            setPopupPlatforms(requiredPlatforms)
            setShowAdAccountPopup(true)
        }
    }, [
        isTikTok,
        isTikTokLoggedIn,
        loading,
        selectedAdAccountIds,
        selectedTikTokAdvertiserIds,
        subscriptionData.planType,
        subscriptionLoading,
        tiktokLoading,
    ])

    if (authLoading || (isTikTok && tiktokLoading)) return null
    if (!isLoggedIn) return <Navigate to="/login" />

    return (
        <>

            <div className="mobile-message fixed inset-0 bg-white flex flex-col items-center justify-center p-6 z-[100] lg:hidden">
                <div className="text-center max-w-md">
                    <img src={DesktopIcon} alt="Desktop computer" className="w-24 h-24 mb-4 mx-auto" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Desktop Recommended</h1>
                    <p className="text-gray-600 mb-6">
                        Blip works best on a bigger screen. <br></br> We&apos;ve sent you an email to help you<br></br> pick up from here.
                    </p>
                    <button
                        onClick={() => navigate(isTikTok ? "/tiktok-ads" : "/")}
                        className="mt-4 px-6 py-2 text-sm text-white bg-blue-600 rounded-xl hover:text-blue-700 transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>

            <div className="flex min-h-screen bg-neutral-100">
                {/* Sidebar */}
                <div className="w-[290px] flex flex-col h-screen sticky top-0 px-4 py-6 max-lg:w-[80px] max-lg:min-w-[80px] max-lg:px-2">
                    <div className="rounded-3xl bg-neutral-100 p-4 flex flex-col h-full">
                        {/* Main Content */}
                        <div className="flex-1 flex flex-col">
                            {/* Back to Home Button */}
                            <Button
                                onClick={() => navigate(isTikTok ? "/tiktok-ads" : "/")}
                                className="flex items-center pl-3 justify-start gap-1 bg-white hover:bg-white border border-neutral-200 shadow-xs hover:shadow-sm rounded-[20px] py-7 font-medium w-full mb-4 text-neutral-700"
                                variant="ghost"
                            >
                                <img src={RocketBtn} alt="Home" className="w-8 h-8 object-contain" />
                                <div className="h-6 w-px bg-neutral-300 mr-2 max-lg:hidden" />
                                <span className="text-neutral-700 font-semibold max-lg:hidden">Back To Launcher</span>
                            </Button>

                            {/* Tab Buttons */}
                            <div className="space-y-2">
                                {sidebarTabs.map((tab) => {
                                    const Icon = tabIconMap[tab];
                                    const isProviderSwitch = tab === TIKTOK_SWITCH_TAB || tab === META_SWITCH_TAB;
                                    const isTikTokConnectionPending = tab === TIKTOK_SWITCH_TAB && tiktokLoading;
                                    return (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => isProviderSwitch ? handleProviderSwitch() : handleTabChange(tab)}
                                            disabled={isTikTokConnectionPending}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-4 py-2 rounded-2xl transition-all h-10",
                                                activeTab === tab
                                                    ? "bg-white border border-gray-300 shadow font-semibold text-neutral-900"
                                                    : "border border-transparent text-neutral-700 hover:bg-neutral-200",
                                                isTikTokConnectionPending && "cursor-wait opacity-60",
                                                "justify-start max-lg:justify-center max-lg:px-2 relative",
                                            )}
                                        >
                                            <Icon
                                                aria-label={`${tab} icon`}
                                                className="w-5 h-5 max-lg:w-6 max-lg:h-6 transition-all duration-500 ease-in-out object-contain flex-shrink-0 text-neutral-700 opacity-100"
                                            />
                                            <span className="text-sm font-medium max-lg:hidden transition-colors duration-500 ease-in-out">
                                                {tabLabelMap[tab]}
                                            </span>
                                            {activeTab === tab && (
                                                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neutral-500 max-lg:hidden" aria-hidden="true" />
                                            )}

                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer Profile + Logout */}
                        <div className="pt-4 mt-auto">
                            <div className="w-full flex items-center bg-neutral-50 border border-neutral-200 shadow-xs rounded-[20px] pl-3 pr-3 py-2 max-lg:justify-center max-lg:p-2">
                                <div className="flex items-center gap-2 flex-grow max-lg:hidden">
                                    <img
                                        src={isTikTok
                                            ? (tiktokUser?.picture || tiktokUser?.avatar_url || tiktokUser?.profile_image_url || TikTokUserPlaceholder)
                                            : (profilePicUrl || "/placeholder.svg")}
                                        alt="Profile"
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                    <span className="text-sm font-medium text-neutral-800 truncate max-w-[120px]">
                                        {isTikTok ? (tiktokUser?.name || "TikTok User") : userName}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <div className="h-6 w-px bg-neutral-300 max-lg:hidden" />
                                    <button onClick={handleLogout} className="ml-3 rounded-full transition max-lg:ml-0" title="Logout">
                                        <LogOutIcon className="w-4 h-4 max-lg:w-5 max-lg:h-5 text-neutral-700" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Area */}
                <main className="flex-1 py-6 pr-6">
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-xs h-[calc(100vh-3rem)] flex flex-col overflow-hidden relative">
                        <div className="flex-1 overflow-auto">
                            <div className="w-full max-w-[52rem] mx-auto p-16">
                                <div className="mb-6">
                                    <p className="text-sm text-gray-400 mb-1 text-left">Settings / {tabLabelMap[activeTab]}</p>
                                    <h1 className="text-xl font-semibold mb-1 text-left">
                                        {tabTitleMap[activeTab]}
                                    </h1>
                                    <p className="text-gray-400 text-sm text-left">{tabDescriptionMap[activeTab]}</p>
                                </div>

                                <div className="w-full">
                                    {activeTab === "adaccount" && (
                                        <AdAccountSettings
                                            preselectedAdAccount={preselectedAdAccount}
                                            onTriggerAdAccountPopup={() => {
                                                setPopupPlatforms([META_PLATFORM])
                                                setShowAdAccountPopup(true)
                                            }}
                                            subscriptionData={subscriptionData}
                                        />
                                    )}
                                    {activeTab === "tiktok" && (
                                        <TikTokAdvertiserSettings
                                            subscriptionData={subscriptionData}
                                            onTriggerAdAccountPopup={() => {
                                                setPopupPlatforms([TIKTOK_PLATFORM])
                                                setShowAdAccountPopup(true)
                                            }}
                                        />
                                    )}
                                    {activeTab === "billing" && <BillingSettings platform={platform} />}
                                    {activeTab === "team" && <TeamSettings />}
                                    {activeTab === "help" && <HelpFAQs onOpenChat={showMessenger} />}

                                </div>
                            </div>
                        </div>
                        <div id="settings-save-bar-portal" className="absolute bottom-0 left-0 w-full z-50" />

                    </div>
                </main>

                <div>
                    <Toaster richColors position="bottom-left" closeButton />
                </div>
                {!isTikTok && showSettingsPopup && <SettingsOnboardingPopup onClose={handleCloseSettingsPopup} />}
                <AdAccountSelectionPopup
                    isOpen={showAdAccountPopup}
                    onClose={() => setShowAdAccountPopup(false)}
                    selectedAdAccountIds={selectedAdAccountIds}
                    selectedTikTokAdvertiserIds={selectedTikTokAdvertiserIds}
                    platforms={popupPlatforms}
                    planType={subscriptionData.planType}
                />
                <TikTokConnectDialog
                    open={showTikTokConnectDialog}
                    onOpenChange={setShowTikTokConnectDialog}
                />
            </div>
        </>
    )
}

Settings.propTypes = {
    platform: PropTypes.oneOf(["meta", "tiktok"]),
}
