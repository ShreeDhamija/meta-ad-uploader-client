// //"use client"
// import { useAuth } from "@/lib/AuthContext"
// import { Navigate, useNavigate } from "react-router-dom"
// import { Button } from "@/components/ui/button"
// import { LogOutIcon } from "lucide-react"
// import { Home } from "lucide-react"
// import { Toaster } from "sonner"
// import { useState, useEffect } from "react"
// import { cn } from "@/lib/utils"
// import GlobalSettings from "@/components/settings/global-settings"
// import useGlobalSettings from "@/lib/useGlobalSettings"
// import AdAccountSettings from "@/components/settings/AdAccountSettings"
// import ViewAds from "@/components/settings/view-ads"
// import SettingsOnboardingPopup from "@/components/SettingsOnboardingPopup"



// export default function Settings() {
//     const { isLoggedIn, userName, profilePicUrl, handleLogout, authLoading } = useAuth()
//     const [showSettingsPopup, setShowSettingsPopup] = useState(false);
//     const navigate = useNavigate()
//     const [activeTab, setActiveTab] = useState("adaccount")
//     const tabIconMap = {
//         global: "https://unpkg.com/@mynaui/icons/icons/cog-four.svg",
//         adaccount: "https://meta-ad-uploader-server-production.up.railway.app/icons/folder.svg",
//         billing: "https://meta-ad-uploader-server-production.up.railway.app/icons/card.svg",
//         viewads: "https://meta-ad-uploader-server-production.up.railway.app/icons/viewads.svg", // use your own icon or placeholder

//     }

//     const {
//         hasSeenSettingsOnboarding,
//         setHasSeenSettingsOnboarding,
//         loading
//     } = useGlobalSettings()

//     // No JavaScript-based responsive state needed

//     const tabDescriptionMap = {
//         global: "These preferences will apply to ALL ad accounts in your account.",
//         adaccount: "Configure default settings and values to pre-fill into ads for all your ad accounts.",
//         billing: "Manage your billing methods and invoices here.",
//         viewads: "Preview all ads created in the last hour.",
//     }
//     // below tabDescriptionMap
//     const tabLabelMap = {
//         global: "Global",
//         adaccount: "Ad Account",
//         billing: "Billing",
//         viewads: "View Ads",
//     };


//     const handleCloseSettingsPopup = () => {
//         setShowSettingsPopup(false);
//         fetch("https://meta-ad-uploader-server-production.up.railway.app/settings/save", {
//             method: "POST",
//             credentials: "include",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//                 globalSettings: { hasSeenSettingsOnboarding: true },
//             }),
//         }).then(() => setHasSeenSettingsOnboarding(true));
//     };


//     if (authLoading) return null; // or a loading spinner if you want
//     if (!isLoggedIn) return <Navigate to="/login" />

//     useEffect(() => {
//         if (!loading && !hasSeenSettingsOnboarding) {
//             setShowSettingsPopup(true);
//         }
//     }, [loading, hasSeenSettingsOnboarding]);

//     return (
//         <div className="flex">
//             {/* Sidebar */}
//             <div className="w-[290px] bg-[#f1f1f1] border-r border-gray-200 flex flex-col justify-between h-screen sticky top-0 px-2 max-lg:w-[80px] max-lg:min-w-[80px] max-lg:px-1 ">
//                 <div className="p-4 space-y-2">
//                     {/* Back to Home Button */}
//                     <Button
//                         onClick={() => navigate("/")}
//                         className="flex items-center justify-center gap-2 bg-gradient-to-b from-white to-neutral-100 border border-gray-300 shadow-sm rounded-full py-6 text- font-medium"
//                         variant="ghost"
//                     >
//                         <Home className="w-8 h-8 max-lg:w-8 max-lg:h-8 text-gray-700" />
//                         <div className="h-4 w-px bg-gray-300 max-lg:hidden" />
//                         <span className="text-gray-700 max-lg:hidden">Back To Home</span>
//                     </Button>

//                     {/* Tab Buttons */}
//                     <div className="pt-4 space-y-2">
//                         {["adaccount", "global", "billing", "viewads"].map((tab) => (
//                             <button
//                                 key={tab}
//                                 onClick={() => {
//                                     setActiveTab(tab)
//                                     document.activeElement.blur()
//                                 }}
//                                 className={cn(
//                                     "w-full flex items-center gap-2 px-4 py-2 rounded-xl transition",
//                                     activeTab === tab
//                                         ? "bg-gradient-to-b from-white to-neutral-100 border border-gray-300 font-semibold shadow-sm"
//                                         : "hover:bg-gray-200",
//                                     "justify-start max-lg:justify-center max-lg:px-2",
//                                 )}
//                             >
//                                 <img
//                                     src={tabIconMap[tab] || "/placeholder.svg"}
//                                     alt={`${tab} icon`}
//                                     className={cn(
//                                         "w-5 h-5 max-lg:w-6 max-lg:h-6 transition",
//                                         activeTab === tab
//                                             ? "" // let original color show
//                                             : "grayscale brightness-75 contrast-75 opacity-60",
//                                     )}
//                                 />
//                                 <span className="text-sm max-lg:hidden">
//                                     {tab === "global" ? "Global Settings" : tab === "adaccount" ? "Ad Account Settings" : tab === "viewads" ? "View Ads" : "Billing"}
//                                 </span>
//                             </button>
//                         ))}
//                     </div>
//                 </div>

//                 {/* Footer Profile + Logout */}
//                 <div className="px-6 pb-6 max-lg:px-2">
//                     <div className="w-full flex items-center bg-gradient-to-b from-white to-neutral-100 border border-gray-300 shadow-sm rounded-full pl-3 pr-3 py-2 max-lg:justify-center max-lg:p-2">
//                         {/* Profile image + name - hidden on small screens */}
//                         <div className="flex items-center gap-2 flex-grow max-lg:hidden">
//                             <img
//                                 src={profilePicUrl || "/placeholder.svg"}
//                                 alt="Profile"
//                                 className="w-7 h-7 rounded-full object-cover"
//                             />
//                             <span className="text-sm font-medium text-black truncate max-w-[120px]">{userName}</span>
//                         </div>

//                         {/* Divider and logout button grouped together */}
//                         <div className="flex items-center">
//                             <div className="h-6 w-px bg-gray-300 max-lg:hidden" />
//                             <button onClick={handleLogout} className="ml-3 rounded-full transition max-lg:ml-0" title="Logout">
//                                 <LogOutIcon className="w-4 h-4 max-lg:w-5 max-lg:h-5 text-red-600" />
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Main Area */}
//             <main className="flex-1 flex flex-col items-center justify-start p-10 bg-white">
//                 <div className="w-full max-w-3xl">
//                     <p className="text-sm text-gray-400 mb-1">
//                         {/* Settings / {activeTab.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase())} */}
//                         Settings / {tabLabelMap[activeTab]}

//                     </p>
//                     <h1 className="text-xl font-semibold mb-1 text-left">
//                         {activeTab === "global"
//                             ? "Global Preferences"
//                             : activeTab === "adaccount"
//                                 ? "Ad Account Settings"
//                                 : activeTab === "viewads"
//                                     ? "Recently Created Ads"
//                                     :
//                                     "Billing and Subscription"}
//                     </h1>
//                     <p className="text-gray-400 text-sm mb-6 text-left">{tabDescriptionMap[activeTab]}</p>

//                     {/* Settings Area */}
//                     <div className="w-full max-w-3xl">
//                         {/* Render component by tab */}
//                         {activeTab === "global" && <GlobalSettings />}
//                         {/* Add others like this later: */}
//                         {activeTab === "adaccount" && <AdAccountSettings />}
//                         {activeTab === "viewads" && <ViewAds />}

//                     </div>
//                 </div>
//             </main>
//             <div>
//                 <Toaster richColors position="bottom-left" closeButton />
//             </div>
//             {showSettingsPopup && (
//                 <SettingsOnboardingPopup
//                     onClose={handleCloseSettingsPopup}
//                 />
//             )}

//         </div>

//     )
// }
//"use client"
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

export default function Settings() {
    const { isLoggedIn, userName, profilePicUrl, handleLogout, authLoading } = useAuth()
    const [showSettingsPopup, setShowSettingsPopup] = useState(false)
    const navigate = useNavigate()
    // const [activeTab, setActiveTab] = useState("adaccount")
    const urlParams = new URLSearchParams(window.location.search)
    const initialTab = urlParams.get('tab') || 'adaccount'
    const [activeTab, setActiveTab] = useState(initialTab)
    const tabIconMap = {
        global: "https://unpkg.com/@mynaui/icons/icons/cog-four.svg",
        adaccount: "https://meta-ad-uploader-server-production.up.railway.app/icons/folder.svg",
        billing: "https://meta-ad-uploader-server-production.up.railway.app/icons/card.svg",
        viewads: "https://meta-ad-uploader-server-production.up.railway.app/icons/viewads.svg", // use your own icon or placeholder
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
        fetch("https://meta-ad-uploader-server-production.up.railway.app/settings/save", {
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

    // useEffect(() => {
    //     if (!loading && !hasSeenSettingsOnboarding) {
    //         setShowSettingsPopup(true)
    //     }
    // }, [loading, hasSeenSettingsOnboarding])

    // if (authLoading) return null // or a loading spinner if you want
    // if (!isLoggedIn) return <Navigate to="/login" />

    return (
        <div className="flex bg-gray-100 min-h-screen">
            {/* Sidebar */}
            <div className="w-[290px] flex flex-col justify-between h-screen sticky top-0 px-4 py-6 max-lg:w-[80px] max-lg:min-w-[80px] max-lg:px-2">
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-4 shadow-lg border-2 space-y-4">
                    {/* Back to Home Button */}
                    <Button
                        onClick={() => navigate("/")}
                        className="flex items-center justify-start gap-2 bg-[#f8f8f8] border border-gray-200 shadow-sm rounded-[20px] py-6 text- font-medium w-full"
                        variant="ghost"
                    >
                        <img src="https://unpkg.com/@mynaui/icons/icons/home.svg" />
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
                                    "w-full flex items-center gap-2 px-4 py-2 rounded-xl transition",
                                    activeTab === tab
                                        ? "bg-gray-100 border font-semibold shadow-sm"
                                        : "hover:bg-gray-200",
                                    "justify-start max-lg:justify-center max-lg:px-2",
                                )}
                            >
                                <img
                                    src={tabIconMap[tab] || "/placeholder.svg"}
                                    alt={`${tab} icon`}
                                    className={cn(
                                        "w-5 h-5 max-lg:w-6 max-lg:h-6 transition object-contain flex-shrink-0",
                                        activeTab === tab
                                            ? "" // let original color show
                                            : "grayscale brightness-75 contrast-75 opacity-60",
                                    )}
                                />
                                <span className="text-sm max-lg:hidden">
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

                    {/* Footer Profile + Logout */}
                    <div className="pt-4">
                        <div className="w-full flex items-center bg-[#f8f8f8] border border-gray-200 shadow-sm rounded-[20px] pl-3 pr-3 py-2 max-lg:justify-center max-lg:p-2">
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
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm h-full p-16">
                    <div className="w-full max-w-3xl mx-auto">
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

                        {/* Settings Area */}
                        <div className="w-full">
                            {/* Render component by tab */}
                            {activeTab === "global" && <GlobalSettings />}
                            {activeTab === "adaccount" && <AdAccountSettings />}
                            {activeTab === "viewads" && <ViewAds />}
                            {activeTab === "billing" && <BillingSettings />}

                        </div>
                    </div>
                </div>
            </main>
            <div>
                <Toaster richColors position="bottom-left" closeButton />
            </div>
            {showSettingsPopup && <SettingsOnboardingPopup onClose={handleCloseSettingsPopup} />}
        </div>
    )
}
