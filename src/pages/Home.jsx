import React, { useState, useEffect, useCallback, useRef } from "react"
import { toast, Toaster } from "sonner"
import { useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid";

import Header from "../components/header"
import AdAccountSettings from "../components/ad-account-settings"
import AdCreationForm from "../components/ad-creation-form"
import MediaPreview from "../components/media-preview"
import OnboardingPopup from "../components/onboarding-popup"
import AnalyticsHomePopup from "../components/AnalyticsHomePopup"
import PowerupPopup from "../components/PowerupPopup"

import { useAuth } from "../lib/AuthContext"
import { useAppData } from "@/lib/AppContext"
import useGlobalSettings from "@/lib/useGlobalSettings"
import useAdAccountSettings from "@/lib/useAdAccountSettings"
import useSubscription from "@/lib/useSubscriptionSettings"
import { saveSettings } from "@/lib/saveSettings"
import AdAccountSelectionPopup from "../components/AdAccountSelectionPopup"
import { useIntercom } from "@/lib/useIntercom";
import DesktopIcon from '@/assets/Desktop.webp';
import TrialExpiredPopup from '../components/TrialExpiredPopup';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';
const HOME_CACHE_KEY = 'home_adAccountSettings_cache';
const ANALYTICS_LAUNCH_AT = new Date("2026-04-09T12:00:00+05:30");
const POWERUP_LAUNCH_AT = new Date("2026-04-20T12:20:00+05:30");
const IS_STAGING = import.meta.env.VITE_APP_ENV === "staging";
const ANALYTICS_HOME_POPUP_ENABLED = IS_STAGING;
const POWERUP_HOME_POPUP_ENABLED = true;
const MEDIA_PREVIEW_LAUNCH_DURATION_MS = 560;

const parseUserCreatedAt = (value) => {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "string" || typeof value === "number") {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const seconds = value?._seconds ?? value?.seconds;
    const nanoseconds = value?._nanoseconds ?? value?.nanoseconds ?? 0;

    if (typeof seconds === "number") {
        const parsed = new Date(seconds * 1000 + Math.floor(nanoseconds / 1000000));
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
};

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

const cloneSnapshotValue = (value) => {
    if (Array.isArray(value)) return [...value];
    if (value && typeof value === "object") {
        return JSON.parse(JSON.stringify(value));
    }
    return value;
};

const snapshotValuesEqual = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

export default function Home() {
    const { isLoggedIn, userName, handleLogout, authLoading, userCreatedAt } = useAuth()
    const { showMessenger, hideMessenger } = useIntercom();
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)

    // Onboarding
    const [showOnboardingPopup, setShowOnboardingPopup] = useState(false)
    const [showPowerupPopup, setShowPowerupPopup] = useState(false)
    const [showAnalyticsHomePopup, setShowAnalyticsHomePopup] = useState(false)
    const {
        hasSeenOnboarding,
        setHasSeenOnboarding,
        hasSeenSettingsOnboarding,
        hasSeenPowerupPopup,
        setHasSeenPowerupPopup,
        hasSeenAnalyticsHomePopup,
        setHasSeenAnalyticsHomePopup,
        loading,
        selectedAdAccountIds
    } = useGlobalSettings();
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
    const preferredTemplateRef = useRef(null);
    const campaignsLoadedForAccountRef = useRef(null);
    const adSetsLoadedForSelectionRef = useRef("");

    const getCachedState = () => {
        try {
            const cached = localStorage.getItem(HOME_CACHE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                const isRecent = Date.now() - data.timestamp < 24 * 60 * 60 * 1000;
                if (isRecent) return data;
            }
        } catch (e) {
            console.error('Failed to parse home cache:', e);
        }
        return null;
    };

    const cachedState = getCachedState();

    // Ad account selection and setup
    const [selectedAdAccount, setSelectedAdAccount] = useState(cachedState?.selectedAdAccount || "")
    const [campaigns, setCampaigns] = useState(cachedState?.campaigns || [])
    const [selectedCampaign, setSelectedCampaign] = useState(cachedState?.selectedCampaign || [])
    const [adSets, setAdSets] = useState(cachedState?.adSets || [])
    const [selectedAdSets, setSelectedAdSets] = useState(cachedState?.selectedAdSets || [])
    const [showDuplicateBlock, setShowDuplicateBlock] = useState(cachedState?.showDuplicateBlock || false)
    const [duplicateAdSet, setDuplicateAdSet] = useState(cachedState?.duplicateAdSet || "")
    const [newAdSetName, setNewAdSetName] = useState(cachedState?.newAdSetName || "")
    const [campaignObjective, setCampaignObjective] = useState(cachedState?.campaignObjective || [])
    const [showDuplicateCampaignBlock, setShowDuplicateCampaignBlock] = useState(cachedState?.showDuplicateCampaignBlock || false)
    const [duplicateCampaign, setDuplicateCampaign] = useState(cachedState?.duplicateCampaign || "")
    const [newCampaignName, setNewCampaignName] = useState(cachedState?.newCampaignName || "")

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
    const [phoneNumber, setPhoneNumber] = useState("")
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
    const [dropboxFiles, setDropboxFiles] = useState([]);
    const [frameioFiles, setFrameioFiles] = useState([]);
    const [launchPaused, setLaunchPaused] = useState(false); // <-- New state
    const [isCarouselAd, setIsCarouselAd] = useState(false);
    const [adType, setAdType] = useState('regular'); // 'regular' | 'carousel' | 'flexible'
    const [enablePlacementCustomization, setEnablePlacementCustomization] = useState(false);
    const [fileGroups, setFileGroups] = useState([]);
    const [files, setFiles] = useState([])
    const [importedPosts, setImportedPosts] = useState([])
    const [importedFiles, setImportedFiles] = useState([]);
    const [videoThumbs, setVideoThumbs] = useState({})
    const { adAccounts, setAdAccounts, pages, setPages, pagesLoading, adAccountsLoading, refetchAdAccounts } = useAppData()
    const { settings: adAccountSettings, documentExists, refetchCopyTemplates } = useAdAccountSettings(selectedAdAccount)
    const [hasAnyAdAccountSettings, setHasAnyAdAccountSettings] = useState(false);
    const [selectedShopDestination, setSelectedShopDestination] = useState("")
    const [selectedShopDestinationType, setSelectedShopDestinationType] = useState("")
    const userHasActiveAccess = hasActiveAccess();
    const [isLoadingAdSets, setIsLoadingAdSets] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [useExistingPosts, setUseExistingPosts] = useState(false);
    const [selectedIgOrganicPosts, setSelectedIgOrganicPosts] = useState([]);
    const [isLaunchingMediaPreview, setIsLaunchingMediaPreview] = useState(false);
    const [selectedForm, setSelectedForm] = useState(null);
    const [isPartnershipAd, setIsPartnershipAd] = useState(false);
    const [partnerIgAccountId, setPartnerIgAccountId] = useState("");
    const [partnerFbPageId, setPartnerFbPageId] = useState("");
    const [partnershipIdentityMode, setPartnershipIdentityMode] = useState("dynamic");
    const [adScheduleStartTime, setAdScheduleStartTime] = useState(null);
    const [adScheduleEndTime, setAdScheduleEndTime] = useState(null);

    const [variants, setVariants] = useState([{ id: "default", name: "Default", snapshot: null }]);
    const [activeVariantId, setActiveVariantId] = useState("default");
    const [fileVariantMap, setFileVariantMap] = useState({});
    const [groupVariantMap, setGroupVariantMap] = useState({});
    const [postVariantMap, setPostVariantMap] = useState({});

    const [showMobileBanner, setShowMobileBanner] = useState(true);
    const mediaPreviewLaunchTimeoutRef = useRef(null);

    if (authLoading) return null

    useEffect(() => {
        return () => {
            if (mediaPreviewLaunchTimeoutRef.current) {
                clearTimeout(mediaPreviewLaunchTimeoutRef.current);
            }
        };
    }, []);

    const triggerMediaPreviewLaunch = useCallback(() => {
        const hasMediaToLaunch = (
            files.length > 0 ||
            driveFiles.length > 0 ||
            dropboxFiles.length > 0 ||
            frameioFiles.length > 0 ||
            importedPosts.length > 0 ||
            importedFiles.length > 0 ||
            selectedIgOrganicPosts.length > 0
        );

        if (!hasMediaToLaunch) {
            return Promise.resolve();
        }

        if (mediaPreviewLaunchTimeoutRef.current) {
            clearTimeout(mediaPreviewLaunchTimeoutRef.current);
        }

        const prefersReducedMotion = typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        const launchDuration = prefersReducedMotion ? 140 : MEDIA_PREVIEW_LAUNCH_DURATION_MS;

        setIsLaunchingMediaPreview(true);

        return new Promise((resolve) => {
            mediaPreviewLaunchTimeoutRef.current = setTimeout(() => {
                setIsLaunchingMediaPreview(false);
                mediaPreviewLaunchTimeoutRef.current = null;
                resolve();
            }, launchDuration);
        });
    }, [
        files.length,
        driveFiles.length,
        dropboxFiles.length,
        frameioFiles.length,
        importedPosts.length,
        importedFiles.length,
        selectedIgOrganicPosts.length,
    ]);


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
        if (!isLoggedIn || loading || showOnboardingPopup || showAnalyticsHomePopup || showPowerupPopup) return

        const parsedCreatedAt = parseUserCreatedAt(userCreatedAt)
        const isValidCreatedAt = parsedCreatedAt && !Number.isNaN(parsedCreatedAt.getTime())
        if (!isValidCreatedAt) return

        const isEligibleForAnalyticsHomePopup =
            ANALYTICS_HOME_POPUP_ENABLED &&
            parsedCreatedAt < ANALYTICS_LAUNCH_AT &&
            !hasSeenAnalyticsHomePopup

        if (isEligibleForAnalyticsHomePopup) {
            setShowAnalyticsHomePopup(true)
            return
        }

        const isEligibleForPowerupHomePopup =
            POWERUP_HOME_POPUP_ENABLED &&
            parsedCreatedAt < POWERUP_LAUNCH_AT &&
            !hasSeenPowerupPopup

        if (isEligibleForPowerupHomePopup) {
            setShowPowerupPopup(true)
        }
    }, [
        isLoggedIn,
        loading,
        showOnboardingPopup,
        showAnalyticsHomePopup,
        showPowerupPopup,
        hasSeenAnalyticsHomePopup,
        hasSeenPowerupPopup,
        userCreatedAt,
    ])

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



    }, [subscriptionLoading, isTrialExpired, userHasActiveAccess, hasDismissedTrialPopup]);


    // Cache ad account settings state
    useEffect(() => {
        // Only cache if there's a selected ad account
        if (!selectedAdAccount) {
            localStorage.removeItem(HOME_CACHE_KEY);
            return;
        }

        const cacheData = {
            selectedAdAccount,
            campaigns,
            selectedCampaign,
            adSets,
            selectedAdSets,
            showDuplicateBlock,
            duplicateAdSet,
            newAdSetName,
            campaignObjective,
            showDuplicateCampaignBlock,
            duplicateCampaign,
            newCampaignName,
            timestamp: Date.now()
        };

        localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(cacheData));
    }, [
        selectedAdAccount,
        campaigns,
        selectedCampaign,
        adSets,
        selectedAdSets,
        showDuplicateBlock,
        duplicateAdSet,
        newAdSetName,
        campaignObjective,
        showDuplicateCampaignBlock,
        duplicateCampaign,
        newCampaignName,

    ]);


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

    useEffect(() => {
        if (selectedAdAccount) return;

        setPageId("");
        setInstagramAccountId("");
        setLink([""]);
        setPhoneNumber("");
        setCta("LEARN_MORE");
        setSelectedTemplate(undefined);
        setMessages([""]);
        setHeadlines([""]);
        setDescriptions([""]);
        setAdOrder(["adType", "dateType", "fileName", "iteration"]);
        setSelectedItems([]);
        setAdValues({ dateType: "MonthYYYY", customTexts: {} });
        setAdNameFormulaV2({ rawInput: "" });
    }, [selectedAdAccount]);

    useEffect(() => {
        if (!selectedAdAccount) return;

        setPageId(adAccountSettings.defaultPage?.id || "");
        setInstagramAccountId(adAccountSettings.defaultInstagram?.id || "");

        const defaultLink = adAccountSettings.links?.find(link => link.isDefault);
        const linkToUse = defaultLink?.url || adAccountSettings.links?.[0]?.url || "";
        setLink([linkToUse]);

        setCta(adAccountSettings.defaultCTA || "LEARN_MORE");
        setAdNameFormulaV2(adAccountSettings.adNameFormulaV2 || { rawInput: "" });

        const formula = adAccountSettings.adNameFormula;
        if (!formula || Object.keys(formula).length === 0) {
            setAdOrder(["adType", "dateType", "fileName", "iteration"]);
            setSelectedItems([]);
            setAdValues({ dateType: "MonthYYYY", customTexts: {} });
            return;
        }

        setAdValues({
            dateType: formula.values?.dateType || "MonthYYYY",
            customTexts: formula.values?.customTexts || {}
        });
        setAdOrder(formula.order || ["adType", "dateType", "fileName", "iteration"]);
        setSelectedItems(formula.selected || []);
    }, [
        selectedAdAccount,
        adAccountSettings.defaultPage,
        adAccountSettings.defaultInstagram,
        adAccountSettings.links,
        adAccountSettings.defaultCTA,
        adAccountSettings.adNameFormula,
        adAccountSettings.adNameFormulaV2,
    ]);

    useEffect(() => {
        if (!selectedAdAccount) return;

        const templates = adAccountSettings.copyTemplates || {};
        const keys = Object.keys(templates);

        if (keys.length === 0) {
            setSelectedTemplate(undefined);
            setMessages([""]);
            setHeadlines([""]);
            setDescriptions([""]);
            return;
        }

        const preferredName = preferredTemplateRef.current;
        const initialTemplateName = preferredName && keys.includes(preferredName)
            ? preferredName
            : keys.includes(adAccountSettings.defaultTemplateName)
                ? adAccountSettings.defaultTemplateName
                : keys[0];

        preferredTemplateRef.current = null;

        setSelectedTemplate(initialTemplateName);
        const selectedTemplateData = templates[initialTemplateName];
        setMessages(selectedTemplateData?.primaryTexts || [""]);
        setHeadlines(selectedTemplateData?.headlines || [""]);
        setDescriptions(selectedTemplateData?.descriptions || [""]);
    }, [
        selectedAdAccount,
        adAccountSettings.copyTemplates,
        adAccountSettings.defaultTemplateName,
    ]);

    // When the ad account changes while variants exist, wipe each variant's saved snapshot
    // so that switching to it inherits the new account's defaults instead of restoring stale values
    // (page/IG/templates/ad sets that no longer apply to the new account).
    const previousAdAccountRef = useRef(selectedAdAccount);
    useEffect(() => {
        if (previousAdAccountRef.current === selectedAdAccount) return;
        const hadPrevious = Boolean(previousAdAccountRef.current);
        previousAdAccountRef.current = selectedAdAccount;
        if (!hadPrevious) return;
        setVariants((prev) => prev.map((variant) => ({ ...variant, snapshot: null })));
    }, [selectedAdAccount]);



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

    async function markPowerupPopupSeen() {
        const previousValue = hasSeenPowerupPopup
        setHasSeenPowerupPopup(true)

        try {
            await saveSettings({
                globalSettings: { hasSeenPowerupPopup: true },
            })
            window.dispatchEvent(new Event('globalSettingsUpdated'))
        } catch (err) {
            setHasSeenPowerupPopup(previousValue)
            console.error("Failed to save powerup popup flag:", err)
        }
    }

    const handleClosePowerupPopup = async () => {
        setShowPowerupPopup(false)
        await markPowerupPopupSeen()
    }

    const markAnalyticsHomePopupSeen = async () => {
        const previousValue = hasSeenAnalyticsHomePopup
        setHasSeenAnalyticsHomePopup(true)

        try {
            await saveSettings({
                globalSettings: { hasSeenAnalyticsHomePopup: true },
            })
            window.dispatchEvent(new Event('globalSettingsUpdated'))
        } catch (err) {
            setHasSeenAnalyticsHomePopup(previousValue)
            console.error("Failed to save analytics home popup flag:", err)
        }
    }

    const handleCloseAnalyticsHomePopup = async () => {
        setShowAnalyticsHomePopup(false)
        await markAnalyticsHomePopupSeen()
    }

    const handleCheckOutAnalytics = () => {
        setShowAnalyticsHomePopup(false)
        navigate("/analytics")
        markAnalyticsHomePopupSeen()
    }
    const onItemToggle = (item) => {
        setSelectedItems((prev) =>
            prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
        );
    };

    const captureCurrentSnapshot = useCallback(() => ({
        headlines: cloneSnapshotValue(headlines),
        descriptions: cloneSnapshotValue(descriptions),
        messages: cloneSnapshotValue(messages),
        link: cloneSnapshotValue(link),
        customLink,
        showCustomLink,
        cta,
        phoneNumber,
        selectedAdAccount,
        selectedCampaign: cloneSnapshotValue(selectedCampaign),
        selectedAdSets: cloneSnapshotValue(selectedAdSets),
        adSets: cloneSnapshotValue(adSets),
        duplicateAdSet,
        newAdSetName,
        showDuplicateBlock,
        duplicateCampaign,
        newCampaignName,
        showDuplicateCampaignBlock,
        campaignObjective: cloneSnapshotValue(campaignObjective),
        pageId,
        instagramAccountId,
        selectedShopDestination,
        selectedShopDestinationType,
        selectedForm,
        selectedTemplate,
        isPartnershipAd,
        partnerIgAccountId,
        partnerFbPageId,
        partnershipIdentityMode,
        adNameFormulaV2: cloneSnapshotValue(adNameFormulaV2),
        adValues: cloneSnapshotValue(adValues),
        adScheduleStartTime,
        adScheduleEndTime,
        launchPaused,
    }), [
        headlines,
        descriptions,
        messages,
        link,
        customLink,
        showCustomLink,
        cta,
        phoneNumber,
        selectedAdAccount,
        selectedCampaign,
        selectedAdSets,
        adSets,
        duplicateAdSet,
        newAdSetName,
        showDuplicateBlock,
        duplicateCampaign,
        newCampaignName,
        showDuplicateCampaignBlock,
        campaignObjective,
        pageId,
        instagramAccountId,
        selectedShopDestination,
        selectedShopDestinationType,
        selectedForm,
        selectedTemplate,
        isPartnershipAd,
        partnerIgAccountId,
        partnerFbPageId,
        partnershipIdentityMode,
        adNameFormulaV2,
        adValues,
        adScheduleStartTime,
        adScheduleEndTime,
        launchPaused,
    ]);

    const hydrateFromSnapshot = useCallback((snapshot) => {
        if (!snapshot) return;

        setHeadlines(cloneSnapshotValue(snapshot.headlines) || [""]);
        setDescriptions(cloneSnapshotValue(snapshot.descriptions) || [""]);
        setMessages(cloneSnapshotValue(snapshot.messages) || [""]);
        setLink(cloneSnapshotValue(snapshot.link) || [""]);
        setCustomLink(snapshot.customLink || "");
        setShowCustomLink(Boolean(snapshot.showCustomLink));
        setCta(snapshot.cta || "LEARN_MORE");
        setPhoneNumber(snapshot.phoneNumber || "");
        setSelectedAdAccount(snapshot.selectedAdAccount || "");
        setSelectedCampaign(cloneSnapshotValue(snapshot.selectedCampaign) || []);
        setSelectedAdSets(cloneSnapshotValue(snapshot.selectedAdSets) || []);
        if (snapshot.adSets) {
            setAdSets(cloneSnapshotValue(snapshot.adSets));
        }
        setDuplicateAdSet(snapshot.duplicateAdSet || "");
        setNewAdSetName(snapshot.newAdSetName || "");
        setShowDuplicateBlock(Boolean(snapshot.showDuplicateBlock));
        setDuplicateCampaign(snapshot.duplicateCampaign || "");
        setNewCampaignName(snapshot.newCampaignName || "");
        setShowDuplicateCampaignBlock(Boolean(snapshot.showDuplicateCampaignBlock));
        setCampaignObjective(cloneSnapshotValue(snapshot.campaignObjective) || []);
        setPageId(snapshot.pageId || "");
        setInstagramAccountId(snapshot.instagramAccountId || "");
        setSelectedShopDestination(snapshot.selectedShopDestination || "");
        setSelectedShopDestinationType(snapshot.selectedShopDestinationType || "");
        setSelectedForm(snapshot.selectedForm || null);
        setSelectedTemplate(snapshot.selectedTemplate ?? "");
        setIsPartnershipAd(Boolean(snapshot.isPartnershipAd));
        setPartnerIgAccountId(snapshot.partnerIgAccountId || "");
        setPartnerFbPageId(snapshot.partnerFbPageId || "");
        setPartnershipIdentityMode(snapshot.partnershipIdentityMode || "dynamic");
        setAdNameFormulaV2(cloneSnapshotValue(snapshot.adNameFormulaV2) || { rawInput: "" });
        setAdValues(cloneSnapshotValue(snapshot.adValues) || { dateType: "MonthYYYY", customTexts: {} });
        setAdScheduleStartTime(snapshot.adScheduleStartTime || null);
        setAdScheduleEndTime(snapshot.adScheduleEndTime || null);
        setLaunchPaused(Boolean(snapshot.launchPaused));
    }, [
        setHeadlines,
        setDescriptions,
        setMessages,
        setLink,
        setCustomLink,
        setShowCustomLink,
        setCta,
        setPhoneNumber,
        setSelectedAdAccount,
        setSelectedCampaign,
        setSelectedAdSets,
        setAdSets,
        setDuplicateAdSet,
        setNewAdSetName,
        setShowDuplicateBlock,
        setDuplicateCampaign,
        setNewCampaignName,
        setShowDuplicateCampaignBlock,
        setCampaignObjective,
        setPageId,
        setInstagramAccountId,
        setSelectedShopDestination,
        setSelectedShopDestinationType,
        setSelectedForm,
        setSelectedTemplate,
        setIsPartnershipAd,
        setPartnerIgAccountId,
        setPartnerFbPageId,
        setPartnershipIdentityMode,
        setAdNameFormulaV2,
        setAdValues,
        setAdScheduleStartTime,
        setAdScheduleEndTime,
        setLaunchPaused,
    ]);

    const switchVariant = useCallback((targetId) => {
        if (targetId === activeVariantId) return;

        const targetVariant = variants.find((variant) => variant.id === targetId);
        if (!targetVariant) return;

        const currentSnapshot = captureCurrentSnapshot();

        setVariants((prev) => prev.map((variant) => {
            if (variant.id === activeVariantId) {
                return { ...variant, snapshot: currentSnapshot };
            }
            if (variant.id === targetId) {
                return { ...variant, snapshot: null };
            }
            return variant;
        }));

        hydrateFromSnapshot(targetVariant.snapshot);
        setActiveVariantId(targetId);
        setSelectedFiles(new Set());
    }, [activeVariantId, captureCurrentSnapshot, hydrateFromSnapshot, variants]);

    const getVariantSnapshot = useCallback((variantId) => {
        if (variantId === activeVariantId) {
            return captureCurrentSnapshot();
        }

        return variants.find((variant) => variant.id === variantId)?.snapshot || null;
    }, [activeVariantId, captureCurrentSnapshot, variants]);

    const isFormFieldModified = useCallback((fieldKeys) => {
        if (activeVariantId === "default") return false;

        const activeSnapshot = getVariantSnapshot(activeVariantId);
        const defaultSnapshot = getVariantSnapshot("default");
        if (!activeSnapshot || !defaultSnapshot) return false;

        const keys = Array.isArray(fieldKeys) ? fieldKeys : [fieldKeys];
        return keys.some((key) => !snapshotValuesEqual(activeSnapshot[key], defaultSnapshot[key]));
    }, [activeVariantId, getVariantSnapshot]);

    const handleAddVariant = useCallback(() => {
        const usedLetters = new Set(
            variants
                .filter((variant) => variant.id !== "default")
                .map((variant) => variant.name.replace(/^(Form|Variant)\s+/, ""))
        );
        const nextLetter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find((letter) => !usedLetters.has(letter));

        if (!nextLetter) {
            toast.error("Maximum 26 Variants");
            return;
        }

        const currentSnapshot = captureCurrentSnapshot();
        const defaultSnapshot = cloneSnapshotValue(getVariantSnapshot("default")) || cloneSnapshotValue(currentSnapshot);
        const newVariantId = uuidv4();

        setVariants((prev) => [
            ...prev.map((variant) => (
                variant.id === activeVariantId
                    ? { ...variant, snapshot: currentSnapshot }
                    : variant
            )),
            { id: newVariantId, name: `Variant ${nextLetter}`, snapshot: defaultSnapshot }
        ]);
        setSelectedFiles(new Set());
    }, [activeVariantId, captureCurrentSnapshot, getVariantSnapshot, variants]);

    const handleDeleteVariant = useCallback((variantId) => {
        if (variantId === "default") return;

        const defaultVariant = variants.find((variant) => variant.id === "default");
        const wasActive = variantId === activeVariantId;
        const reassignedCount =
            Object.values(fileVariantMap).filter((value) => value === variantId).length +
            Object.values(groupVariantMap).filter((value) => value === variantId).length +
            Object.values(postVariantMap).filter((value) => value === variantId).length;

        setFileVariantMap((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                if (next[key] === variantId) delete next[key];
            });
            return next;
        });

        setGroupVariantMap((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                if (next[key] === variantId) delete next[key];
            });
            return next;
        });

        setPostVariantMap((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                if (next[key] === variantId) delete next[key];
            });
            return next;
        });

        setVariants((prev) => prev.filter((variant) => variant.id !== variantId));

        if (wasActive) {
            hydrateFromSnapshot(defaultVariant?.snapshot);
            setActiveVariantId("default");
            setVariants((prev) => prev.map((variant) => (
                variant.id === "default" ? { ...variant, snapshot: null } : variant
            )));
        }

        toast.success(
            reassignedCount > 0
                ? `Variant deleted. ${reassignedCount} assignment${reassignedCount === 1 ? "" : "s"} moved to Default.`
                : "Variant deleted."
        );
    }, [activeVariantId, fileVariantMap, groupVariantMap, postVariantMap, hydrateFromSnapshot, variants]);

    const handleDeleteAllVariants = useCallback(() => {
        if (variants.length <= 1) return;

        const defaultVariant = variants.find((variant) => variant.id === "default");
        const defaultSnapshot = activeVariantId === "default"
            ? captureCurrentSnapshot()
            : defaultVariant?.snapshot;
        const clearedAssignments = Object.keys(fileVariantMap).length + Object.keys(groupVariantMap).length + Object.keys(postVariantMap).length;

        setFileVariantMap({});
        setGroupVariantMap({});
        setPostVariantMap({});
        setVariants([{ id: "default", name: "Default", snapshot: null }]);
        setSelectedFiles(new Set());

        if (activeVariantId !== "default" && defaultSnapshot) {
            hydrateFromSnapshot(defaultSnapshot);
        }

        setActiveVariantId("default");

        toast.success(
            clearedAssignments > 0
                ? `All variants deleted. ${clearedAssignments} assignment${clearedAssignments === 1 ? "" : "s"} moved to Default.`
                : "All variants deleted."
        );
    }, [
        activeVariantId,
        captureCurrentSnapshot,
        fileVariantMap,
        groupVariantMap,
        postVariantMap,
        hydrateFromSnapshot,
        variants,
    ]);

    useEffect(() => {
        const activeVariantIds = new Set(variants.map((variant) => variant.id));

        setFileVariantMap((prev) => {
            const next = { ...prev };
            let changed = false;

            Object.keys(next).forEach((key) => {
                if (!activeVariantIds.has(next[key])) {
                    delete next[key];
                    changed = true;
                }
            });

            return changed ? next : prev;
        });

        setGroupVariantMap((prev) => {
            const next = { ...prev };
            let changed = false;

            Object.keys(next).forEach((key) => {
                if (!activeVariantIds.has(next[key])) {
                    delete next[key];
                    changed = true;
                }
            });

            return changed ? next : prev;
        });

        setPostVariantMap((prev) => {
            const next = { ...prev };
            let changed = false;

            Object.keys(next).forEach((key) => {
                if (!activeVariantIds.has(next[key])) {
                    delete next[key];
                    changed = true;
                }
            });

            return changed ? next : prev;
        });
    }, [variants]);

    useEffect(() => {
        const validFileIds = new Set([
            ...files.map((file) => file.isDrive ? file.id : file.uniqueId || file.name),
            ...driveFiles.map((file) => file.id),
            ...dropboxFiles.map((file) => file.dropboxId),
            ...frameioFiles.map((file) => file.frameioId),
            ...importedFiles.map((file) => file.type === "image" ? file.hash : file.id),
        ]);
        const groupedFileIds = new Set(
            fileGroups.flatMap((group) => group.fileIds || [])
        );

        setFileVariantMap((prev) => {
            const next = { ...prev };
            let changed = false;

            Object.keys(next).forEach((key) => {
                if (!validFileIds.has(key) || groupedFileIds.has(key)) {
                    delete next[key];
                    changed = true;
                }
            });

            return changed ? next : prev;
        });
    }, [files, driveFiles, dropboxFiles, frameioFiles, importedFiles, fileGroups]);

    useEffect(() => {
        const validGroupIds = new Set(fileGroups.map((group) => group.id));

        setGroupVariantMap((prev) => {
            const next = { ...prev };
            let changed = false;

            Object.keys(next).forEach((key) => {
                if (!validGroupIds.has(key)) {
                    delete next[key];
                    changed = true;
                }
            });

            return changed ? next : prev;
        });
    }, [fileGroups]);

    useEffect(() => {
        const validPostKeys = new Set([
            ...importedPosts.map((post) => `post:${post.id}`),
            ...selectedIgOrganicPosts.map((post) => `igpost:${post.source_instagram_media_id}`),
        ]);

        setPostVariantMap((prev) => {
            const next = { ...prev };
            let changed = false;

            Object.keys(next).forEach((key) => {
                if (!validPostKeys.has(key)) {
                    delete next[key];
                    changed = true;
                }
            });

            return changed ? next : prev;
        });
    }, [importedPosts, selectedIgOrganicPosts]);

    useEffect(() => {
        if (!selectedAdAccount) {
            campaignsLoadedForAccountRef.current = null;
            setCampaigns([]);
            return;
        }

        if (campaignsLoadedForAccountRef.current === selectedAdAccount) {
            return;
        }

        let cancelled = false;

        const fetchCampaignsForSelectedAccount = async () => {
            try {
                const res = await fetch(
                    `${API_BASE_URL}/auth/fetch-campaigns?adAccountId=${selectedAdAccount}`,
                    { credentials: "include" }
                );
                const data = await res.json();
                if (!cancelled && data.campaigns) {
                    setCampaigns(sortCampaigns(data.campaigns));
                    campaignsLoadedForAccountRef.current = selectedAdAccount;
                }
            } catch (err) {
                if (!cancelled) {
                    console.error("Failed to fetch campaigns for selected ad account:", err);
                }
            }
        };

        fetchCampaignsForSelectedAccount();

        return () => {
            cancelled = true;
        };
    }, [selectedAdAccount, setCampaigns]);

    useEffect(() => {
        const selectionKey = `${selectedAdAccount}:${JSON.stringify([...selectedCampaign].sort())}`;

        if (!selectedAdAccount || selectedCampaign.length === 0) {
            adSetsLoadedForSelectionRef.current = "";
            setAdSets([]);
            return;
        }

        if (adSetsLoadedForSelectionRef.current === selectionKey) {
            return;
        }

        let cancelled = false;

        const fetchAdSetsForSelection = async () => {
            try {
                const adSetPromises = selectedCampaign.map((id) =>
                    fetch(`${API_BASE_URL}/auth/fetch-adsets?campaignId=${id}`, {
                        credentials: "include"
                    }).then((res) => res.json())
                );

                const results = await Promise.all(adSetPromises);

                const allAdSets = results.flatMap((data, index) => {
                    if (!data.adSets) return [];
                    return data.adSets.map((adset) => ({
                        ...adset,
                        campaignId: selectedCampaign[index],
                        campaignName: campaigns.find((campaign) => campaign.id === selectedCampaign[index])?.name
                    }));
                });

                if (!cancelled) {
                    setAdSets(sortAdSets(allAdSets));
                    adSetsLoadedForSelectionRef.current = selectionKey;
                }
            } catch (err) {
                if (!cancelled) {
                    console.error("Failed to fetch ad sets for selected campaigns:", err);
                }
            }
        };

        fetchAdSetsForSelection();

        return () => {
            cancelled = true;
        };
    }, [campaigns, selectedAdAccount, selectedCampaign, setAdSets]);


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
            setShowTrialExpiredPopup(false);
            toast.success("Trial Extended Successfully, reloading...")
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    };

    const handleAdSetAdCountsUpdate = useCallback((countsByAdSet) => {
        if (!countsByAdSet || Object.keys(countsByAdSet).length === 0) {
            return;
        }

        setAdSets((prev) => {
            let didUpdate = false;

            const nextAdSets = prev.map((adSet) => {
                const increment = countsByAdSet[adSet.id];
                if (!increment) {
                    return adSet;
                }

                didUpdate = true;
                const currentTotalAds = Number(adSet.totalAds) || 0;

                return {
                    ...adSet,
                    totalAds: currentTotalAds + increment,
                };
            });

            return didUpdate ? sortAdSets(nextAdSets) : prev;
        });
    }, []);

    const handleLocalAdSetCreated = useCallback(({ newAdSetId, sourceAdSetId, name, campaignId }) => {
        if (!newAdSetId) {
            return;
        }

        setAdSets((prev) => {
            if (prev.some((adSet) => adSet.id === newAdSetId)) {
                return prev;
            }

            const sourceAdSet = prev.find((adSet) => adSet.id === sourceAdSetId);
            const fallbackCampaign = campaigns.find((campaign) => campaign.id === campaignId);

            const createdAdSet = {
                ...(sourceAdSet || {}),
                id: newAdSetId,
                name: name || sourceAdSet?.name || newAdSetId,
                campaignId: campaignId || sourceAdSet?.campaignId,
                campaignName: sourceAdSet?.campaignName || fallbackCampaign?.name,
                totalAds: 0,
                spend: 0,
            };

            return sortAdSets([...prev, createdAdSet]);
        });
    }, [campaigns]);




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
                <div className="flex flex-col lg:flex-row gap-6 min-w-0">
                    <div className={`flex-1 lg:flex-[55] min-w-0 space-y-6 ${!userHasActiveAccess ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}`}>
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
                            isFormFieldModified={isFormFieldModified}
                            variants={variants}
                            activeVariantId={activeVariantId}
                        />

                        <AdCreationForm
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
                            adAccounts={adAccounts}
                            setAdAccounts={setAdAccounts}
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
                            phoneNumber={phoneNumber}
                            setPhoneNumber={setPhoneNumber}
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
                            selectedIgOrganicPosts={selectedIgOrganicPosts}
                            setSelectedIgOrganicPosts={setSelectedIgOrganicPosts}
                            videoThumbs={videoThumbs}
                            setVideoThumbs={setVideoThumbs}
                            selectedAdSets={selectedAdSets}
                            setSelectedAdSets={setSelectedAdSets}
                            duplicateAdSet={duplicateAdSet}
                            setDuplicateAdSet={setDuplicateAdSet}
                            campaigns={campaigns}
                            selectedCampaign={selectedCampaign}
                            setSelectedCampaign={setSelectedCampaign}
                            selectedAdAccount={selectedAdAccount}
                            setSelectedAdAccount={setSelectedAdAccount}
                            adSets={adSets}
                            copyTemplates={adAccountSettings.copyTemplates || {}}
                            defaultTemplateName={adAccountSettings.defaultTemplateName || ""}
                            selectedTemplate={selectedTemplate}
                            setSelectedTemplate={setSelectedTemplate}
                            driveFiles={driveFiles}
                            setDriveFiles={setDriveFiles}
                            dropboxFiles={dropboxFiles}
                            setDropboxFiles={setDropboxFiles}
                            frameioFiles={frameioFiles}
                            setFrameioFiles={setFrameioFiles}
                            selectedShopDestination={selectedShopDestination}
                            setSelectedShopDestination={setSelectedShopDestination}
                            selectedShopDestinationType={selectedShopDestinationType}
                            setSelectedShopDestinationType={setSelectedShopDestinationType}
                            selectedForm={selectedForm}
                            setSelectedForm={setSelectedForm}
                            newAdSetName={newAdSetName}
                            setNewAdSetName={setNewAdSetName}
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
                            refetchCopyTemplates={refetchCopyTemplates}
                            preferredTemplateRef={preferredTemplateRef}
                            onAdSetCountsCreated={handleAdSetAdCountsUpdate}
                            onAdSetCreated={handleLocalAdSetCreated}
                            isPartnershipAd={isPartnershipAd}
                            setIsPartnershipAd={setIsPartnershipAd}
                            partnerIgAccountId={partnerIgAccountId}
                            setPartnerIgAccountId={setPartnerIgAccountId}
                            partnerFbPageId={partnerFbPageId}
                            setPartnerFbPageId={setPartnerFbPageId}
                            partnershipIdentityMode={partnershipIdentityMode}
                            setPartnershipIdentityMode={setPartnershipIdentityMode}
                            adScheduleStartTime={adScheduleStartTime}
                            setAdScheduleStartTime={setAdScheduleStartTime}
                            adScheduleEndTime={adScheduleEndTime}
                            setAdScheduleEndTime={setAdScheduleEndTime}
                            variants={variants}
                            setVariants={setVariants}
                            activeVariantId={activeVariantId}
                            setActiveVariantId={setActiveVariantId}
                            switchVariant={switchVariant}
                            handleAddVariant={handleAddVariant}
                            handleDeleteVariant={handleDeleteVariant}
                            handleDeleteAllVariants={handleDeleteAllVariants}
                            isFormFieldModified={isFormFieldModified}
                            fileVariantMap={fileVariantMap}
                            setFileVariantMap={setFileVariantMap}
                            groupVariantMap={groupVariantMap}
                            setGroupVariantMap={setGroupVariantMap}
                            postVariantMap={postVariantMap}
                            setPostVariantMap={setPostVariantMap}
                            onBeforeMediaClear={triggerMediaPreviewLaunch}


                        />
                    </div>

                    {/* <div className="flex-1 min-w-0"> */}
                    <div className={`flex-1 lg:flex-[45] min-w-0 ${!userHasActiveAccess ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}`}>
                        <ErrorBoundary>
                            <MediaPreview
                                files={[...files, ...driveFiles.map((f) => ({ ...f, isDrive: true }))]}
                                setFiles={setFiles}
                                importedPosts={importedPosts}
                                setImportedPosts={setImportedPosts}
                                driveFiles={driveFiles}
                                setDriveFiles={setDriveFiles}
                                dropboxFiles={dropboxFiles}
                                setDropboxFiles={setDropboxFiles}
                                frameioFiles={frameioFiles}
                                setFrameioFiles={setFrameioFiles}
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
                                selectedIgOrganicPosts={selectedIgOrganicPosts}
                                setSelectedIgOrganicPosts={setSelectedIgOrganicPosts}
                                variants={variants}
                                activeVariantId={activeVariantId}
                                handleAddVariant={handleAddVariant}
                                handleDeleteAllVariants={handleDeleteAllVariants}
                                fileVariantMap={fileVariantMap}
                                setFileVariantMap={setFileVariantMap}
                                groupVariantMap={groupVariantMap}
                                setGroupVariantMap={setGroupVariantMap}
                                postVariantMap={postVariantMap}
                                setPostVariantMap={setPostVariantMap}
                                hasSeenPowerupPopup={hasSeenPowerupPopup}
                                setShowPowerupPopup={setShowPowerupPopup}
                                isLaunchingMedia={isLaunchingMediaPreview}
                            />
                        </ErrorBoundary>

                    </div>
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

            {showAnalyticsHomePopup && (
                <AnalyticsHomePopup
                    onClose={handleCloseAnalyticsHomePopup}
                    onCheckOutAnalytics={handleCheckOutAnalytics}
                />
            )}

            {showPowerupPopup && (
                <PowerupPopup onClose={handleClosePowerupPopup} />
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
                    isTeamOwner={!!subscriptionData.isTeamOwner && !!subscriptionData.teamId}
                    isTeamMember={!subscriptionData.isTeamOwner && !!subscriptionData.teamId}
                />
            )}

            <AdAccountSelectionPopup
                isOpen={showAdAccountPopup}
                onClose={() => setShowAdAccountPopup(false)}
            />

            <Toaster richColors position="bottom-left" closeButton />


        </>
    )
}
