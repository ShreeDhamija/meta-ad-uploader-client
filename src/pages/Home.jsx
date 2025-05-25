"use client"

import { useState, useEffect } from "react"
import { toast, Toaster } from "sonner"
import Header from "../components/header"
import AdAccountSettings from "../components/ad-account-settings"
import AdCreationForm from "../components/ad-creation-form"
import MediaPreview from "../components/media-preview"
import { useAuth } from "../lib/AuthContext"
import { useNavigate } from "react-router-dom"
import { useAppData } from "@/lib/AppContext"
import useGlobalSettings from "@/lib/useGlobalSettings";
import useAdAccountSettings from "@/lib/useAdAccountSettings";
import OnboardingPopup from "../components/onboarding-popup" // create this component



export default function Home() {
    // Shared state between components
    const { isLoggedIn, userName, handleLogout, authLoading } = useAuth()
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)

    // Ad Account Settings state
    const [selectedAdAccount, setSelectedAdAccount] = useState("")
    const [campaigns, setCampaigns] = useState([])
    const [selectedCampaign, setSelectedCampaign] = useState("")
    const [adSets, setAdSets] = useState([])
    const [selectedAdSets, setSelectedAdSets] = useState([])
    const [showDuplicateBlock, setShowDuplicateBlock] = useState(false)
    const [duplicateAdSet, setDuplicateAdSet] = useState("")
    const [campaignObjective, setCampaignObjective] = useState("")

    // Ad Creation Form state
    const [adName, setAdName] = useState("Ad Name Formula will be displayed here")
    const [headlines, setHeadlines] = useState([""])
    const [descriptions, setDescriptions] = useState([""])
    const [messages, setMessages] = useState([""])
    const [pageId, setPageId] = useState("")
    const [instagramAccountId, setInstagramAccountId] = useState("")
    const [link, setLink] = useState("")
    const [cta, setCta] = useState("LEARN_MORE")
    const [adType, setAdType] = useState("")
    const [dateFormat, setDateFormat] = useState("")
    const [includeFileName, setIncludeFileName] = useState(false)
    const [customAdName, setCustomAdName] = useState("")
    const [thumbnail, setThumbnail] = useState(null)
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [showOnboardingPopup, setShowOnboardingPopup] = useState(false);

    // Media Preview state
    const [files, setFiles] = useState([])
    const [videoThumbs, setVideoThumbs] = useState({})
    const {
        adAccounts,
        setAdAccounts,
        pages,
        setPages
    } = useAppData()

    const { adNameFormula, hasSeenOnboarding, setHasSeenOnboarding } = useGlobalSettings();
    const { settings: adAccountSettings } = useAdAccountSettings(selectedAdAccount);
    const [adOrder, setAdOrder] = useState(["adType", "dateType", "fileName"]);


    if (authLoading) return null; // or a loading spinner if you want

    useEffect(() => {
        if (!isLoggedIn) {
            navigate("/login");
            return;
        }

        const { values, order } = adNameFormula;

        setAdType(values?.adType || "");
        setDateFormat(values?.dateType || "");
        setIncludeFileName(values?.useFileName || false);
        setAdOrder(order || ["adType", "dateType", "fileName"]);
        if (!hasSeenOnboarding) {
            setShowOnboardingPopup(true);
        }
    }, [isLoggedIn, navigate, adNameFormula]);

    useEffect(() => {
        if (!selectedAdAccount) return;

        if (adAccountSettings.defaultPage?.id) {
            setPageId(adAccountSettings.defaultPage.id);
        }

        if (adAccountSettings.defaultInstagram?.id) {
            setInstagramAccountId(adAccountSettings.defaultInstagram.id);
        }

        if (adAccountSettings.defaultLink) {
            setLink(adAccountSettings.defaultLink);
        }

        if (adAccountSettings.defaultCTA) {
            setCta(adAccountSettings.defaultCTA);
        }

        // Template logic
        const templates = adAccountSettings.copyTemplates || {};
        const templateKeys = Object.keys(templates);

        if (templateKeys.length === 0) return; // ⬅️ No templates, do nothing

        const initialTemplateName = templateKeys.includes(adAccountSettings.defaultTemplateName)
            ? adAccountSettings.defaultTemplateName
            : templateKeys[0];

        setSelectedTemplate(initialTemplateName);

        const selectedTemplateData = templates[initialTemplateName];
        if (selectedTemplateData) {
            setMessages(selectedTemplateData.primaryTexts || [""]);
            setHeadlines(selectedTemplateData.headlines || [""]);
        }
    }, [selectedAdAccount, adAccountSettings]);


    const handleOnboardingComplete = async () => {
        try {
            await fetch("https://meta-ad-uploader-server-production.up.railway.app/settings/save", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    globalSettings: { hasSeenOnboarding: true }
                }),
            });
            setHasSeenOnboarding(true);
        } catch (err) {
            console.error("Failed to update onboarding flag:", err);
        }
    }

    const handleGoToSettings = () => {
        handleOnboardingComplete();
        navigate("/settings");
    }

    const handleGoToHome = () => {
        setShowOnboardingPopup(false);
        handleOnboardingComplete();
    }


    return (
        <div className="w-full max-w-[1220px] mx-auto py-8 px-2 sm:px-4 md:px-6 mt-[20px]">
            <Header isLoggedIn={isLoggedIn} userName={userName} handleLogout={handleLogout} />
            <div className="flex flex-col xl:flex-row gap-6">
                <div className="w-full xl:w-[500px] flex-shrink-0 space-y-6">
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
                    />

                    <AdCreationForm
                        isLoading={isLoading}
                        setIsLoading={setIsLoading}
                        pages={pages}
                        pageId={pageId}
                        setPageId={setPageId}
                        instagramAccountId={instagramAccountId}
                        setInstagramAccountId={setInstagramAccountId}
                        adName={adName}
                        setAdName={setAdName}
                        adType={adType}
                        setAdType={setAdType}
                        dateFormat={dateFormat}
                        setDateFormat={setDateFormat}
                        includeFileName={includeFileName}
                        setIncludeFileName={setIncludeFileName}
                        adOrder={adOrder}
                        setAdOrder={setAdOrder}
                        customAdName={customAdName}
                        setCustomAdName={setCustomAdName}
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

                    />
                </div>

                <div className="flex-1 min-w-0 max-w-[calc(100%-500px-1.5rem)]">
                    <MediaPreview files={files} setFiles={setFiles} videoThumbs={videoThumbs} />
                </div>
            </div>
            <Toaster richColors position="bottom-right" closeButton />
            {showOnboardingPopup && (
                <OnboardingPopup
                    onClose={handleGoToHome}
                    onGoToSettings={handleGoToSettings}
                />
            )}

        </div>

    )
}

