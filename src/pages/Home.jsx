// "use client"

import React, { useState, useEffect, useCallback } from "react"
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
import AdAccountSelectionPopup from "../components/AdAccountSelectionPopup"
import { useIntercom } from "@/lib/useIntercom";
import DesktopIcon from '@/assets/Desktop.webp';
import TrialExpiredPopup from '../components/TrialExpiredPopup';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';


// Check if user has active access


class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 text-center">
                    <p className="text-red-600 mb-2">Something went wrong</p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}


const sortAdSets = (adSets) => {
    const priority = { ACTIVE: 1, PAUSED: 2 };
    return [...adSets].sort((a, b) => {
        const aPriority = priority[a.status] || 3;
        const bPriority = priority[b.status] || 3;
        if (aPriority !== bPriority) return aPriority - bPriority;
        const aSpend = parseFloat(a.spend || 0);
        const bSpend = parseFloat(b.spend || 0);
        return bSpend - aSpend;
    });
};

// Move these functions outside the component - around line 20, before the component
const sortCampaigns = (campaigns) => {
    const priority = { ACTIVE: 1, PAUSED: 2 };
    return [...campaigns].sort((a, b) => {
        const aPriority = priority[a.status] || 3;
        const bPriority = priority[b.status] || 3;
        if (aPriority !== bPriority) return aPriority - bPriority;
        if (a.status === "ACTIVE" && b.status === "ACTIVE") {
            const aSpend = parseFloat(a.spend) || 0;
            const bSpend = parseFloat(b.spend) || 0;
            return bSpend - aSpend;
        }
        return 0;
    });
};


export default function Home() {
    const { isLoggedIn, userName, handleLogout, authLoading } = useAuth()
    const { showMessenger, hideMessenger } = useIntercom();
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)

    // Onboarding
    const [showOnboardingPopup, setShowOnboardingPopup] = useState(false)
    const { hasSeenOnboarding, setHasSeenOnboarding, hasSeenSettingsOnboarding, loading, selectedAdAccountIds } = useGlobalSettings();
    const {
        subscriptionData,
        isOnTrial,
        isTrialExpired,
        hasActiveAccess,
        isPaidSubscriber,
        loading: subscriptionLoading,
        canExtendTrial,
        extendTrial
    } = useSubscription()
    const [showTrialExpiredPopup, setShowTrialExpiredPopup] = useState(false);
    const [hasDismissedTrialPopup, setHasDismissedTrialPopup] = useState(false);
    const [showAdAccountPopup, setShowAdAccountPopup] = useState(false)

    // Ad account selection and setup
    const [selectedAdAccount, setSelectedAdAccount] = useState("")
    const [campaigns, setCampaigns] = useState([])
    const [selectedCampaign, setSelectedCampaign] = useState([])
    const [adSets, setAdSets] = useState([])
    const [selectedAdSets, setSelectedAdSets] = useState([])
    const [showDuplicateBlock, setShowDuplicateBlock] = useState(false)
    const [duplicateAdSet, setDuplicateAdSet] = useState("")
    const [newAdSetName, setNewAdSetName] = useState("")
    const [campaignObjective, setCampaignObjective] = useState([])
    const [showDuplicateCampaignBlock, setShowDuplicateCampaignBlock] = useState(false)
    const [duplicateCampaign, setDuplicateCampaign] = useState("")
    const [newCampaignName, setNewCampaignName] = useState("")


    // Ad creation form
    const [adName, setAdName] = useState("Default Ad Name With Blip")
    const [adNameFormulaV2, setAdNameFormulaV2] = useState({ rawInput: "" });
    const [headlines, setHeadlines] = useState([""])
    const [descriptions, setDescriptions] = useState([""])
    const [messages, setMessages] = useState([""])
    const [pageId, setPageId] = useState("")
    const [instagramAccountId, setInstagramAccountId] = useState("")
    const [link, setLink] = useState([""])
    const [customLink, setCustomLink] = useState("")
    const [showCustomLink, setShowCustomLink] = useState(false)
    const [cta, setCta] = useState("LEARN_MORE")

    const [thumbnail, setThumbnail] = useState(null)
    const [selectedTemplate, setSelectedTemplate] = useState("")
    const [adOrder, setAdOrder] = useState(["adType", "dateType", "fileName", "iteration"]); // Remove "customText"
    const [selectedItems, setSelectedItems] = useState(["adType", "dateType", "fileName"]); // This is fine
    const [adValues, setAdValues] = useState({
        dateType: "MonthYYYY",
        customTexts: {} // Add this for consistency
    });
    const [driveFiles, setDriveFiles] = useState([])
    const [launchPaused, setLaunchPaused] = useState(false); // <-- New state
    const [isCarouselAd, setIsCarouselAd] = useState(false);
    const [adType, setAdType] = useState('regular'); // 'regular' | 'carousel' | 'flexible'
    const [enablePlacementCustomization, setEnablePlacementCustomization] = useState(false);
    const [fileGroups, setFileGroups] = useState([]);
    const [files, setFiles] = useState([])
    const [importedPosts, setImportedPosts] = useState([])
    const [importedFiles, setImportedFiles] = useState([]);
    const [videoThumbs, setVideoThumbs] = useState({})
    const { adAccounts, setAdAccounts, pages, setPages, pagesLoading, adAccountsLoading } = useAppData()
    const { settings: adAccountSettings, documentExists } = useAdAccountSettings(selectedAdAccount)
    const [hasAnyAdAccountSettings, setHasAnyAdAccountSettings] = useState(false);
    const [selectedShopDestination, setSelectedShopDestination] = useState("")
    const [selectedShopDestinationType, setSelectedShopDestinationType] = useState("")
    const userHasActiveAccess = hasActiveAccess();
    const [isLoadingAdSets, setIsLoadingAdSets] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [useExistingPosts, setUseExistingPosts] = useState(false);

    const [showMobileBanner, setShowMobileBanner] = useState(true);

    if (authLoading) return null


    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            navigate("/login");
        }
    }, [authLoading, isLoggedIn]);



    useEffect(() => {
        if (!isLoggedIn || loading) return
        if (!hasSeenOnboarding) {
            setShowOnboardingPopup(true)
        }
    }, [isLoggedIn, loading, hasSeenOnboarding])

    useEffect(() => {
        if (loading || subscriptionLoading) return;

        if ((subscriptionData.planType === 'brand' || subscriptionData.planType === 'starter') && (!selectedAdAccountIds || selectedAdAccountIds.length === 0)) {
            setShowAdAccountPopup(true)
        }
    }, [subscriptionData.planType, selectedAdAccountIds])

    useEffect(() => {

        if (
            !subscriptionLoading &&
            isTrialExpired &&
            !userHasActiveAccess &&
            !hasDismissedTrialPopup
        ) {
            setShowTrialExpiredPopup(true);
        }
        setShowTrialExpiredPopup(true);


    }, [subscriptionLoading, isTrialExpired, userHasActiveAccess, hasDismissedTrialPopup]);



    useEffect(() => {
        const checkSettings = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/settings/has-any-ad-account-settings`, {
                    credentials: "include",
                });
                const data = await res.json();
                setHasAnyAdAccountSettings(data.hasAnySettings || false);
            } catch (err) {
                console.error("Failed to check ad account settings:", err);
            }
        };

        if (isLoggedIn) {
            checkSettings();
        }
    }, [isLoggedIn]);

    // --- NEW, CORRECTED CODE ---
    useEffect(() => {
        // This part handles resetting when no ad account is selected.
        if (!selectedAdAccount) {
            // Reset all settings to their initial "blank" state
            setPageId("");
            setInstagramAccountId("");
            // setSelectedLink(""); // ✅ Updated
            setLink([""]);  // ❌ Change this
            setCta("LEARN_MORE");
            setSelectedTemplate(undefined);
            setMessages([""]);
            setHeadlines([""]);
            setDescriptions([""]);

            // --- Core logic for your request (Scenario 1) ---
            // No ad account selected, so show all fields unchecked.
            setAdOrder(["adType", "dateType", "fileName", "iteration"]);
            setSelectedItems([]); // Set to empty array to uncheck all.
            setAdValues({ dateType: "MonthYYYY", customTexts: {} });
            setAdNameFormulaV2({ rawInput: "" }); // Reset V2 formula
            return; // Exit the hook early
        }

        // This part runs only when an ad account IS selected.

        // Load default Page, Instagram, Link, CTA
        setPageId(adAccountSettings.defaultPage?.id || "");
        setInstagramAccountId(adAccountSettings.defaultInstagram?.id || "");
        const defaultLink = adAccountSettings.links?.find(link => link.isDefault);
        const linkToUse = defaultLink?.url || adAccountSettings.links?.[0]?.url || "";
        setLink([linkToUse]);

        setCta(adAccountSettings.defaultCTA || "LEARN_MORE");
        setAdNameFormulaV2(adAccountSettings.adNameFormulaV2 || { rawInput: "" });

        // --- Core logic for your request (Scenario 2) ---
        const formula = adAccountSettings.adNameFormula;
        // Check if the formula is missing, null, or an empty object.
        if (!formula || Object.keys(formula).length === 0) {
            // Formula doesn't exist for this account, so show all fields unchecked.
            setAdOrder(["adType", "dateType", "fileName", "iteration"]);
            setSelectedItems([]); // Set to empty array to uncheck all.
            setAdValues({ dateType: "MonthYYYY", customTexts: {} });
        } else {
            // A valid formula exists, so load its settings.
            setAdValues({
                dateType: formula.values?.dateType || "MonthYYYY",
                customTexts: formula.values?.customTexts || {}
            });
            setAdOrder(formula.order || ["adType", "dateType", "fileName", "iteration"]);
            setSelectedItems(formula.selected || []);
        }

        // Load Copy templates (this logic is fine as is)
        const templates = adAccountSettings.copyTemplates || {};
        const keys = Object.keys(templates);

        if (keys.length === 0) {
            setSelectedTemplate(undefined);
            setMessages([""]);
            setHeadlines([""]);
            setDescriptions([""]);
        } else {
            const initialTemplateName = keys.includes(adAccountSettings.defaultTemplateName)
                ? adAccountSettings.defaultTemplateName
                : keys[0];

            setSelectedTemplate(initialTemplateName);
            const selectedTemplateData = templates[initialTemplateName];
            setMessages(selectedTemplateData?.primaryTexts || [""]);
            setHeadlines(selectedTemplateData?.headlines || [""]);
            setDescriptions(selectedTemplateData?.descriptions || [""]);
        }

    }, [selectedAdAccount, adAccountSettings]); // Keep dependencies the same



    const handleCloseOnboarding = () => {
        setShowOnboardingPopup(false) // closes instantly

        fetch(`${API_BASE_URL}/settings/save`, {
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


    const handleAdAccountChange = useCallback(async (value) => {
        const adAccountId = value
        setSelectedAdAccount(adAccountId)
        setCampaigns([])
        setAdSets([])
        // setSelectedCampaign("")
        setSelectedCampaign([])
        setSelectedAdSets([])
        if (!adAccountId) return

        // setIsAdAccountChanging(true);
        setIsLoading(true)
        try {
            const res = await fetch(
                `${API_BASE_URL}/auth/fetch-campaigns?adAccountId=${adAccountId}`,
                { credentials: "include" },
            )
            const data = await res.json()
            if (data.campaigns) {
                const priority = {
                    ACTIVE: 1,
                    PAUSED: 2,
                }

                const sortedCampaigns = sortCampaigns(data.campaigns);
                setCampaigns(sortedCampaigns);



            }
        } catch (err) {
            toast.error(`Failed to fetch campaigns: ${err.message || "Unknown error occurred"}`)
            console.error("Failed to fetch campaigns:", err)
        } finally {
            setIsLoading(false)
            // setIsAdAccountChanging(false);
        }
    });

    const handleOnboardingImport = async (adAccountId) => {
        try {
            // Set the selected ad account
            await handleAdAccountChange(adAccountId);
            setAdName("Ad Generated Through Blip");

            // Fetch copy
            const copyRes = await fetch(`${API_BASE_URL}/auth/fetch-single-recent-copy`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adAccountId })
            });

            if (!copyRes.ok) {
                throw new Error('Failed to fetch copy');
            }

            const copyData = await copyRes.json();

            // Fetch URL
            const urlRes = await fetch(`${API_BASE_URL}/auth/fetch-single-recent-url?adAccountId=${adAccountId}`, {
                credentials: 'include'
            });

            if (!urlRes.ok) {
                throw new Error('Failed to fetch URL');
            }

            const urlData = await urlRes.json();

            // Fetch pages
            const pagesRes = await fetch(`${API_BASE_URL}/auth/fetch-recent-pages?adAccountId=${adAccountId}`, {
                credentials: 'include'
            });
            const pagesData = await pagesRes.json();

            // Set the imported values to state
            if (copyData && copyData.primaryText) {
                setMessages([copyData.primaryText]);
            }
            if (copyData && copyData.headline) {
                setHeadlines([copyData.headline]);
            }
            if (urlData && urlData.link) {
                setCustomLink(urlData.link);
                setShowCustomLink(true);
            }
            if (pagesData && pagesData.pageId) {
                setPageId(pagesData.pageId);
            }
            if (pagesData && pagesData.instagramAccountId) {
                setInstagramAccountId(pagesData.instagramAccountId);
            }

            toast.success('Ad data imported successfully');
        } catch (error) {
            console.error('Failed to import ad data:', error);
            toast.error('Failed to import ad data');
        }
    };
    const refreshAdSets = useCallback(async () => {
        if (!selectedCampaign) return
        setIsLoading(true)
        setIsLoadingAdSets(true);

        try {
            const res = await fetch(
                `${API_BASE_URL}/auth/fetch-adsets?campaignId=${selectedCampaign}`,
                { credentials: "include" },
            )
            const data = await res.json()
            if (data.adSets) {
                setAdSets(sortAdSets(data.adSets))
                toast.success("Ad sets updated!")
            }
        } catch (err) {
            toast.error(`Failed to fetch ad sets: ${err.message || "Unknown error"}`)
            console.error("Failed to fetch ad sets:", err)
        } finally {
            setIsLoading(false)
            setIsLoadingAdSets(false);

        }
    });

    const handleExtendTrial = async () => {
        const result = await extendTrial();
        if (result.success) {
            setShowTrialExpiredPopup(false); // Close the popup
            // Optionally show a success toast
        }
    };




    return (

        <>

            {/* Mobile message - hidden on desktop */}
            {showMobileBanner && (
                <div className="mobile-message fixed inset-0 bg-white flex-col items-center justify-center p-6 z-50 hidden">
                    <div className="text-center max-w-md">
                        <img src={DesktopIcon} alt="Desktop computer" className="w-24 h-24 mb-4 mx-auto" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Desktop Recommended</h1>
                        <p className="text-gray-600 mb-6">
                            Thanks for signing up! <br></br>Blip works best on a bigger screen. <br></br> We've sent you an email to help you<br></br> pick up from here.
                        </p>
                        <button
                            onClick={() => setShowMobileBanner(false)}
                            className="mt-4 px-6 py-2 text-sm text-white bg-blue-600 rounded-xl hover:text-blue-700 transition-colors"
                        >
                            Continue Anyway
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full max-w-[1600px] mx-auto py-8 px-2 sm:px-4 md:px-6">
                <Header isLoggedIn={isLoggedIn} userName={userName} handleLogout={handleLogout} showMessenger={showMessenger} hideMessenger={hideMessenger} />
                <div className="flex flex-col xl:flex-row gap-6 min-w-0">
                    <div className={`flex-1 xl:flex-[55] min-w-0 space-y-6 ${!userHasActiveAccess ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}`}>
                        <AdAccountSettings
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
                            isLoadingAdSets={isLoadingAdSets}
                            adAccounts={adAccounts}
                            setAdAccounts={setAdAccounts}
                            selectedAdAccount={selectedAdAccount}
                            setSelectedAdAccount={setSelectedAdAccount}
                            adAccountsLoading={adAccountsLoading}
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
                            campaignObjective={campaignObjective}
                            setCampaignObjective={setCampaignObjective}
                            newAdSetName={newAdSetName}
                            setNewAdSetName={setNewAdSetName}
                            showDuplicateCampaignBlock={showDuplicateCampaignBlock}
                            setShowDuplicateCampaignBlock={setShowDuplicateCampaignBlock}
                            duplicateCampaign={duplicateCampaign}
                            setDuplicateCampaign={setDuplicateCampaign}
                            newCampaignName={newCampaignName}
                            setNewCampaignName={setNewCampaignName}
                            documentExists={documentExists}
                            refreshAdSets={refreshAdSets}
                            sortAdSets={sortAdSets}
                            sortCampaigns={sortCampaigns}
                            useExistingPosts={useExistingPosts}
                            setUseExistingPosts={setUseExistingPosts}
                        />

                        <AdCreationForm
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
                            pages={pages}
                            setPages={setPages}
                            pagesLoading={pagesLoading}
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
                            messages={messages}
                            setMessages={setMessages}
                            headlines={headlines}
                            setHeadlines={setHeadlines}
                            descriptions={descriptions}
                            setDescriptions={setDescriptions}
                            link={link}
                            setLink={setLink}
                            customLink={customLink}
                            setCustomLink={setCustomLink}
                            showCustomLink={showCustomLink}
                            setShowCustomLink={setShowCustomLink}
                            cta={cta}
                            setCta={setCta}
                            thumbnail={thumbnail}
                            setThumbnail={setThumbnail}
                            files={files}
                            setFiles={setFiles}
                            importedPosts={importedPosts}
                            setImportedPosts={setImportedPosts}
                            importedFiles={importedFiles}
                            setImportedFiles={setImportedFiles}
                            videoThumbs={videoThumbs}
                            setVideoThumbs={setVideoThumbs}
                            selectedAdSets={selectedAdSets}
                            duplicateAdSet={duplicateAdSet}
                            campaigns={campaigns}
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
                            isCarouselAd={isCarouselAd}
                            setIsCarouselAd={setIsCarouselAd}
                            adType={adType}
                            setAdType={setAdType}
                            enablePlacementCustomization={enablePlacementCustomization}
                            setEnablePlacementCustomization={setEnablePlacementCustomization}
                            fileGroups={fileGroups}
                            setFileGroups={setFileGroups}
                            adAccountSettings={adAccountSettings}
                            refreshAdSets={refreshAdSets}
                            adNameFormulaV2={adNameFormulaV2}
                            setAdNameFormulaV2={setAdNameFormulaV2}
                            campaignObjective={campaignObjective}
                            selectedFiles={selectedFiles}
                            setSelectedFiles={setSelectedFiles}
                            useExistingPosts={useExistingPosts}
                        />
                    </div>

                    {/* <div className="flex-1 min-w-0"> */}
                    <div className={`flex-1 xl:flex-[45] min-w-0 ${!userHasActiveAccess ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}`}>
                        <ErrorBoundary>
                            <MediaPreview
                                files={[...files, ...driveFiles.map((f) => ({ ...f, isDrive: true }))]}
                                setFiles={setFiles}
                                importedPosts={importedPosts}
                                setImportedPosts={setImportedPosts}
                                driveFiles={driveFiles}
                                setDriveFiles={setDriveFiles}
                                importedFiles={importedFiles}
                                setImportedFiles={setImportedFiles}
                                videoThumbs={videoThumbs}
                                isCarouselAd={isCarouselAd}
                                adType={adType}
                                enablePlacementCustomization={enablePlacementCustomization}
                                setEnablePlacementCustomization={setEnablePlacementCustomization}
                                fileGroups={fileGroups}
                                setFileGroups={setFileGroups}
                                selectedAdSets={selectedAdSets}
                                adSets={adSets}
                                duplicateAdSet={duplicateAdSet}
                                selectedFiles={selectedFiles}
                                setSelectedFiles={setSelectedFiles}

                            />
                        </ErrorBoundary>

                    </div>
                </div>

                {showOnboardingPopup && (
                    <OnboardingPopup
                        userName={userName}
                        hasSeenSettingsOnboarding={hasSeenSettingsOnboarding} // Add this prop
                        onClose={handleCloseOnboarding}
                        adAccounts={adAccounts} // your ad accounts array
                        onImport={handleOnboardingImport}
                        hasAnySettings={hasAnyAdAccountSettings}  // PASS THIS
                        onGoToSettings={() => {

                            try {
                                // Navigate FIRST, before unmounting the component                                
                                navigate("/settings")

                                // Then update state and save settings
                                setHasSeenOnboarding(true)
                                setShowOnboardingPopup(false)

                                // Save settings after navigation
                                fetch(`${API_BASE_URL}/settings/save`, {
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

                {showTrialExpiredPopup && (
                    <TrialExpiredPopup
                        onClose={() => {
                            setShowTrialExpiredPopup(false);
                            setHasDismissedTrialPopup(true);
                        }}
                        onUpgrade={() => {
                            // Navigate to billing tab in settings
                            navigate("/settings?tab=billing");
                            setShowTrialExpiredPopup(false);
                            setHasDismissedTrialPopup(true);
                        }}
                        joinTeam={() => {
                            // Navigate to billing tab in settings
                            navigate("/settings?tab=team");
                            setShowTrialExpiredPopup(false);
                            setHasDismissedTrialPopup(true);
                        }}
                        onChatWithUs={() => {
                            showMessenger();
                            setShowTrialExpiredPopup(false);
                            setHasDismissedTrialPopup(true);
                        }}
                        canExtendTrial={canExtendTrial()}
                        onExtendTrial={handleExtendTrial}
                    />
                )}

                <AdAccountSelectionPopup
                    isOpen={showAdAccountPopup}
                    onClose={() => setShowAdAccountPopup(false)}
                />

                <Toaster richColors position="bottom-left" closeButton />


            </div>
        </>
    )
}
