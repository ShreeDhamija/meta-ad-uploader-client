// "use client"

import { useState, useEffect } from "react"
import { toast, Toaster } from "sonner"
import { useNavigate } from "react-router-dom"

import Header from "../components/header"
import AdAccountSettings from "../components/ad-account-settings"
import AdCreationForm from "../components/ad-creation-form"
import MediaPreview from "../components/media-preview"
import OnboardingPopup from "../components/onboarding-popup"

import { useAuth } from "../lib/AuthContext"
import { useAppData } from "@/lib/AppContext"
import useGlobalSettings from "@/lib/useGlobalSettings"
import useAdAccountSettings from "@/lib/useAdAccountSettings"
import useSubscription from "@/lib/useSubscriptionSettings"


export default function Home() {
    const { isLoggedIn, userName, handleLogout, authLoading } = useAuth()
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)

    // Onboarding
    const [showOnboardingPopup, setShowOnboardingPopup] = useState(false)
    const { adNameFormula, hasSeenOnboarding, setHasSeenOnboarding, hasSeenSettingsOnboarding, loading } = useGlobalSettings()
    const { subscriptionData, hasActiveAccess, isTrialExpired, loading: subscriptionLoading } = useSubscription();

    // Ad account selection and setup
    const [selectedAdAccount, setSelectedAdAccount] = useState("")
    const [campaigns, setCampaigns] = useState([])
    const [selectedCampaign, setSelectedCampaign] = useState("")
    const [adSets, setAdSets] = useState([])
    const [selectedAdSets, setSelectedAdSets] = useState([])
    const [showDuplicateBlock, setShowDuplicateBlock] = useState(false)
    const [duplicateAdSet, setDuplicateAdSet] = useState("")
    const [newAdSetName, setNewAdSetName] = useState("")
    const [campaignObjective, setCampaignObjective] = useState("")
    const [showDuplicateCampaignBlock, setShowDuplicateCampaignBlock] = useState(false)
    const [duplicateCampaign, setDuplicateCampaign] = useState("")
    const [newCampaignName, setNewCampaignName] = useState("")


    // Ad creation form
    const [adName, setAdName] = useState("Ad Name Formula will be displayed here")
    const [headlines, setHeadlines] = useState([""])
    const [descriptions, setDescriptions] = useState([""])
    const [messages, setMessages] = useState([""])
    const [pageId, setPageId] = useState("")
    const [instagramAccountId, setInstagramAccountId] = useState("")
    const [link, setLink] = useState([""])
    const [cta, setCta] = useState("LEARN_MORE")

    const [thumbnail, setThumbnail] = useState(null)
    const [selectedTemplate, setSelectedTemplate] = useState("")
    const [adOrder, setAdOrder] = useState(["adType", "dateType", "fileName", "iteration", "customText"]);
    const [selectedItems, setSelectedItems] = useState(["adType", "dateType", "fileName"]);
    const [adValues, setAdValues] = useState({
        dateType: "MonthYYYY",
    });
    const [customTextValue, setCustomTextValue] = useState("");

    const [driveFiles, setDriveFiles] = useState([])
    const [launchPaused, setLaunchPaused] = useState(false); // <-- New state


    const [files, setFiles] = useState([])
    const [videoThumbs, setVideoThumbs] = useState({})

    const { adAccounts, setAdAccounts, pages, setPages } = useAppData()
    const { settings: adAccountSettings } = useAdAccountSettings(selectedAdAccount)

    const [selectedShopDestination, setSelectedShopDestination] = useState("")
    const [selectedShopDestinationType, setSelectedShopDestinationType] = useState("")



    if (authLoading) return null


    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            navigate("/login");
        }
    }, [authLoading, isLoggedIn]);


    //  Show onboarding popup once settings are loaded
    useEffect(() => {
        if (!isLoggedIn || loading) return
        if (!hasSeenOnboarding) {
            setShowOnboardingPopup(true)
        }
    }, [isLoggedIn, loading, hasSeenOnboarding])

    useEffect(() => {
        if (!isLoggedIn || loading) return;
        const { values, order, selected } = adNameFormula;
        setAdValues({
            dateType: values?.dateType || "MonthYYYY",
        });
        const defaultOrder = ["adType", "dateType", "fileName", "iteration", "customText"];
        const mergedOrder = Array.from(new Set([...(order || ["adType", "dateType", "fileName", "iteration"]), "customText"]));
        setAdOrder(mergedOrder);

        setSelectedItems(selected || ["adType", "dateType", "fileName"]);
    }, [isLoggedIn, loading, adNameFormula]);



    // 🧠 Load default ad account settings
    useEffect(() => {
        if (!selectedAdAccount) return

        if (adAccountSettings.defaultPage?.id) {
            setPageId(adAccountSettings.defaultPage.id)
        }

        if (adAccountSettings.defaultInstagram?.id) {
            setInstagramAccountId(adAccountSettings.defaultInstagram.id)
        }

        if (adAccountSettings.defaultLink) {
            setLink([adAccountSettings.defaultLink])
        }


        if (adAccountSettings.defaultCTA) {
            setCta(adAccountSettings.defaultCTA)
        }

        // Copy templates
        const templates = adAccountSettings.copyTemplates || {}
        const keys = Object.keys(templates)
        if (keys.length === 0) return

        const initialTemplateName = keys.includes(adAccountSettings.defaultTemplateName)
            ? adAccountSettings.defaultTemplateName
            : keys[0]

        setSelectedTemplate(initialTemplateName)

        const selectedTemplateData = templates[initialTemplateName]
        if (selectedTemplateData) {
            setMessages(selectedTemplateData.primaryTexts || [""])
            setHeadlines(selectedTemplateData.headlines || [""])
        }
    }, [selectedAdAccount, adAccountSettings])

    const handleCloseOnboarding = () => {
        setShowOnboardingPopup(false) // closes instantly

        fetch("https://api.withblip.com/settings/save", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                globalSettings: { hasSeenOnboarding: true },
            }),
        }).then(() => {
            setHasSeenOnboarding(true)
        }).catch((err) => {
            console.error("Failed to save onboarding flag:", err)
        })
    }
    const onItemToggle = (item) => {
        setSelectedItems((prev) =>
            prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
        );
    };


    return (
        <div className="w-full max-w-[1600px] mx-auto py-8 px-2 sm:px-4 md:px-6">
            <Header isLoggedIn={isLoggedIn} userName={userName} handleLogout={handleLogout} />
            <div className="flex flex-col xl:flex-row gap-6 min-w-0">
                {/* <div className="w-full xl:w-auto xl:min-w-[500px] xl:max-w-[770px] xl:flex-shrink-0 space-y-6"> */}
                <div className="flex-1 xl:flex-[55] min-w-0 space-y-6">
                    <AdAccountSettings
                        isLoading={isLoading}
                        setIsLoading={setIsLoading}
                        adAccounts={adAccounts}
                        setAdAccounts={setAdAccounts}
                        selectedAdAccount={selectedAdAccount}
                        setSelectedAdAccount={setSelectedAdAccount}
                        campaigns={campaigns}
                        setCampaigns={setCampaigns}
                        selectedCampaign={selectedCampaign}
                        setSelectedCampaign={setSelectedCampaign}
                        adSets={adSets}
                        setAdSets={setAdSets}
                        selectedAdSets={selectedAdSets}
                        setSelectedAdSets={setSelectedAdSets}
                        showDuplicateBlock={showDuplicateBlock}
                        setShowDuplicateBlock={setShowDuplicateBlock}
                        duplicateAdSet={duplicateAdSet}
                        setDuplicateAdSet={setDuplicateAdSet}
                        setCampaignObjective={setCampaignObjective}
                        newAdSetName={newAdSetName}
                        setNewAdSetName={setNewAdSetName}
                        showDuplicateCampaignBlock={showDuplicateCampaignBlock}
                        setShowDuplicateCampaignBlock={setShowDuplicateCampaignBlock}
                        duplicateCampaign={duplicateCampaign}
                        setDuplicateCampaign={setDuplicateCampaign}
                        newCampaignName={newCampaignName}
                        setNewCampaignName={setNewCampaignName}
                    />

                    <AdCreationForm
                        isLoading={isLoading}
                        setIsLoading={setIsLoading}
                        pages={pages}
                        setPages={setPages}
                        pageId={pageId}
                        setPageId={setPageId}
                        instagramAccountId={instagramAccountId}
                        setInstagramAccountId={setInstagramAccountId}
                        adName={adName}
                        setAdName={setAdName}
                        adOrder={adOrder}
                        setAdOrder={setAdOrder}
                        selectedItems={selectedItems}
                        setSelectedItems={setSelectedItems}
                        onItemToggle={onItemToggle}
                        adValues={adValues}
                        setAdValues={setAdValues}
                        customTextValue={customTextValue}
                        setCustomTextValue={setCustomTextValue}
                        messages={messages}
                        setMessages={setMessages}
                        headlines={headlines}
                        setHeadlines={setHeadlines}
                        descriptions={descriptions}
                        setDescriptions={setDescriptions}
                        link={link}
                        setLink={setLink}
                        cta={cta}
                        setCta={setCta}
                        thumbnail={thumbnail}
                        setThumbnail={setThumbnail}
                        files={files}
                        setFiles={setFiles}
                        videoThumbs={videoThumbs}
                        setVideoThumbs={setVideoThumbs}
                        selectedAdSets={selectedAdSets}
                        duplicateAdSet={duplicateAdSet}
                        selectedCampaign={selectedCampaign}
                        selectedAdAccount={selectedAdAccount}
                        adSets={adSets}
                        copyTemplates={adAccountSettings.copyTemplates || {}}
                        defaultTemplateName={adAccountSettings.defaultTemplateName || ""}
                        selectedTemplate={selectedTemplate}
                        setSelectedTemplate={setSelectedTemplate}
                        driveFiles={driveFiles}
                        setDriveFiles={setDriveFiles}
                        selectedShopDestination={selectedShopDestination}
                        setSelectedShopDestination={setSelectedShopDestination}
                        selectedShopDestinationType={selectedShopDestinationType}
                        setSelectedShopDestinationType={setSelectedShopDestinationType}
                        newAdSetName={newAdSetName}
                        launchPaused={launchPaused}
                        setLaunchPaused={setLaunchPaused}
                    />
                </div>

                {/* <div className="flex-1 min-w-0"> */}
                <div className="flex-1 xl:flex-[45] min-w-0">
                    <MediaPreview
                        files={[...files, ...driveFiles.map((f) => ({ ...f, isDrive: true }))]}
                        setFiles={setFiles}
                        setDriveFiles={setDriveFiles}
                        videoThumbs={videoThumbs}
                    />

                </div>
            </div>

            {showOnboardingPopup && (
                <OnboardingPopup
                    userName={userName}
                    hasSeenSettingsOnboarding={hasSeenSettingsOnboarding} // Add this prop
                    onClose={handleCloseOnboarding}
                    onGoToSettings={() => {
                        console.log("onGoToSettings called")
                        console.log("navigate function:", navigate)
                        console.log("typeof navigate:", typeof navigate)

                        try {
                            // Navigate FIRST, before unmounting the component
                            console.log("About to call navigate")
                            navigate("/settings")
                            console.log("Navigate called successfully")

                            // Then update state and save settings
                            setHasSeenOnboarding(true)
                            setShowOnboardingPopup(false)

                            // Save settings after navigation
                            fetch("https://api.withblip.com/settings/save", {
                                method: "POST",
                                credentials: "include",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ globalSettings: { hasSeenOnboarding: true } }),
                            }).catch(error => console.error("Settings save error:", error))

                        } catch (error) {
                            console.error("Error in onGoToSettings:", error)
                        }
                    }}
                />
            )}

            <Toaster richColors position="bottom-right" closeButton />
        </div>
    )
}
