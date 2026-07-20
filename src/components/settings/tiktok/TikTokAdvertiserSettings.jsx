import TikTokIcon from "@/assets/icons/tiktok.svg?react"
import TikTokIconUrl from "@/assets/icons/tiktok.svg"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { saveTikTokSettings } from "@/lib/saveTikTokSettings"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"
import useTikTokAdvertiserSettings from "@/lib/useTikTokAdvertiserSettings"
import { useAppData } from "@/lib/AppContext"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, HelpCircle, Layout, Loader, Loader2, RefreshCcw, Info, Trash, Plus, X, Upload, Pencil, Folder, Search } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import TikTokCopyTemplates from "./TikTokCopyTemplates"
import TikTokLinkParameters from "./TikTokLinkParameters"
import LabelIcon from "@/assets/icons/label.svg?react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import ReorderAdNameParts from "@/components/ui/ReorderAdNameParts"
import CTAIcon from '@/assets/icons/cta.svg?react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

const CTA_OPTIONS = [
    { value: 'LEARN_MORE', label: 'Learn More' },
    { value: 'SHOP_NOW', label: 'Shop Now' },
    { value: 'SIGN_UP', label: 'Sign Up' },
    { value: 'DOWNLOAD_NOW', label: 'Download' },
    { value: 'CONTACT_US', label: 'Contact Us' },
    { value: 'ORDER_NOW', label: 'Order Now' },
    { value: 'BOOK_NOW', label: 'Book Now' },
    { value: 'PLAY_GAME', label: 'Play Game' },
    { value: 'APPLY_NOW', label: 'Apply Now' },
    { value: 'WATCH_NOW', label: 'Watch Now' },
    { value: 'INSTALL_NOW', label: 'Install Now' },
    { value: 'GET_QUOTE', label: 'Get Quote' },
    { value: 'SUBSCRIBE', label: 'Subscribe' },
    { value: 'CALL_NOW', label: 'Call Now' },
    { value: 'LISTEN_NOW', label: 'Listen Now' },
    { value: 'VISIT_STORE', label: 'Visit Store' },
    { value: 'SEND_MESSAGE', label: 'Send Message' },
    { value: 'VIEW_PROFILE', label: 'View Profile' },
    { value: 'READ_MORE', label: 'Read More' },
    { value: 'GET_TICKETS_NOW', label: 'Get Tickets Now' },
    { value: 'WATCH_LIVE', label: 'Watch Live' },
    { value: 'GET_SHOWTIMES', label: 'Get Showtimes' },
    { value: 'CHECK_AVAILABILITY', label: 'Check Availability' },
    { value: 'EXPERIENCE_NOW', label: 'Experience Now' },
    { value: 'INTERESTED', label: 'Interested' },
    { value: 'VIEW_NOW', label: 'View Now' },
    { value: 'SHOOT_WITH_THIS_EFFECT', label: 'Shoot with this effect' },
    { value: 'PREORDER_NOW', label: 'Preorder Now' },
    { value: 'VIEW_VIDEO_WITH_THIS_EFFECT', label: 'View video with this effect' },
    { value: 'JOIN_THIS_HASHTAG', label: 'Join this hashtag' },
];

const DRAFT_CACHE_KEY = 'tiktokAdvertiserSettings_draft';

export default function TikTokAdvertiserSettings({ advertisers: propAdvertisers = [] }) {
    const { tiktokAdvertisers, fetchTikTokAdvertisers } = useAppData();
    const advertisers = tiktokAdvertisers.length > 0 ? tiktokAdvertisers : propAdvertisers;
    const [selectedAdvertiser, setSelectedAdvertiser] = useState(() => {
        // 1. Check URL query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const preselected = urlParams.get('adsaccount') || urlParams.get('advertiser');
        if (preselected) {
            try {
                localStorage.setItem('last_selected_tiktok_advertiser', preselected);
            } catch (e) { }
            return preselected;
        }

        // 2. Check localStorage
        try {
            const lastSelected = localStorage.getItem('last_selected_tiktok_advertiser');
            if (lastSelected) return lastSelected;
        } catch (e) {
            console.error('Failed to read last selected advertiser:', e);
        }

        return null;
    });
    const { settings: serverSettings, setSettings: setServerSettings, loading } = useTikTokAdvertiserSettings(selectedAdvertiser);
    const [localSettings, setLocalSettings] = useState(null);
    const settings = localSettings;
    const setSettings = (nextVal) => {
        setLocalSettings(prev => {
            const current = prev || {};
            const updated = typeof nextVal === 'function' ? nextVal(current) : nextVal;
            return updated;
        });
    };
    const { isTikTokLoggedIn, refreshTikTokUser } = useTikTokAuth();
    const [refreshingAdvertisers, setRefreshingAdvertisers] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { tiktokIdentities, tiktokIdentitiesLoading, fetchTikTokIdentities } = useAppData();
    const identities = (tiktokIdentities[selectedAdvertiser] || []).filter(i => i.identity_type === 'BC_AUTH_TT');
    const loadingIdentities = tiktokIdentitiesLoading[selectedAdvertiser] || false;
    const [openIdentity, setOpenIdentity] = useState(false);
    const [openCta, setOpenCta] = useState(false);
    const [openAdvertiser, setOpenAdvertiser] = useState(false);
    const [initialSettings, setInitialSettings] = useState(null);
    // Ref that always mirrors initialSettings — lets onSaveTemplate / onSetDefault
    // read the latest base object even when called back-to-back in the same async
    // chain (React state updates are async and won't reflect immediately).
    const initialSettingsRef = useRef(null);
    // Ref to prevent initialSettings from being clobbered when a template/default
    // save triggers a settings cache update (mirrors Meta's skipFormResetRef)
    const skipSettingsResetRef = useRef(false);
    const cacheRestoredRef = useRef(false);

    // Derived — computed every render so there's never a stale-state race
    const hasChanges = Boolean(
        settings && initialSettings &&
        JSON.stringify(settings) !== JSON.stringify(initialSettings)
    );
    const [editingProduct, setEditingProduct] = useState(null);
    const [newSellingPoint, setNewSellingPoint] = useState("");

    // ── Catalog & Product state ──
    const [catalogs, setCatalogs] = useState([]);
    const [loadingCatalogs, setLoadingCatalogs] = useState(false);
    const [catalogError, setCatalogError] = useState(null);
    const [openCatalog, setOpenCatalog] = useState(false);

    const [catalogProducts, setCatalogProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productError, setProductError] = useState(null);
    const [openProduct, setOpenProduct] = useState(false);

    const selectedCatalogId = settings?.catalogSelection?.catalog_id || null;
    const selectedCatalogName = settings?.catalogSelection?.catalog_name || null;
    const selectedProductId = settings?.catalogSelection?.product_id || null;
    const selectedProductIds = Array.isArray(selectedProductId)
        ? selectedProductId
        : selectedProductId ? [selectedProductId] : [];
    const selectedProductsList = settings?.catalogSelection?.products || [];

    const displayProductName = (() => {
        if (selectedProductIds.length === 0) return null;
        if (selectedProductIds.length === 1) {
            const matched = selectedProductsList.find(p => p.product_id === selectedProductIds[0]);
            return matched?.product_name || settings?.catalogSelection?.product_name || selectedProductIds[0];
        }
        return `${selectedProductIds.length} Products Selected`;
    })();

    const displayProductImage = (() => {
        if (selectedProductIds.length === 0) return null;
        const matched = selectedProductsList.find(p => p.product_id === selectedProductIds[0]);
        return matched?.product_image_url || settings?.catalogSelection?.product_image_url || null;
    })();

    // Search query states for manual dropdown filtering
    const [advertiserSearch, setAdvertiserSearch] = useState("");
    const [identitySearch, setIdentitySearch] = useState("");
    const [catalogSearch, setCatalogSearch] = useState("");
    const [productSearch, setProductSearch] = useState("");

    const tiktokHeaders = useCallback(() => {
        const uid = localStorage.getItem('tiktok_uid');
        const token = localStorage.getItem('tiktok_token');
        return {
            ...(uid && { 'x-tiktok-user-id': uid }),
            ...(token && { 'x-tiktok-token': token }),
        };
    }, []);

    // ── Fetch catalogs from TikTok via server (bc_id resolved automatically) ──
    const fetchCatalogs = useCallback(async (advId) => {
        if (!advId) return;
        setLoadingCatalogs(true);
        setCatalogError(null);
        try {
            const uid = localStorage.getItem('tiktok_uid');
            const token = localStorage.getItem('tiktok_token');
            const url = `${API_BASE_URL}/api/tiktok/catalog/list?advertiserId=${advId}`;

            const res = await fetch(
                url,
                {
                    credentials: 'include',
                    headers: {
                        ...(uid && { 'x-tiktok-user-id': uid }),
                        ...(token && { 'x-tiktok-token': token }),
                    }
                }
            );

            const data = await res.json();

            if (data.success) {
                setCatalogs(data.catalogs || []);
            } else {
                console.error('[Catalogs] Failed to load catalogs:', data.error || 'Unknown error');
                setCatalogError('No catalogs found.');
                setCatalogs([]);
            }
        } catch (err) {
            console.error("❌ [Client fetchCatalogs] Error caught during fetch:", err);
            setCatalogError('No catalogs found.');
            setCatalogs([]);
        } finally {
            setLoadingCatalogs(false);
        }
    }, []);

    // ── Fetch products for a selected catalog ──
    const fetchCatalogProducts = useCallback(async (advId, catalogId) => {
        if (!advId || !catalogId) return;
        setLoadingProducts(true);
        setProductError(null);
        setCatalogProducts([]);
        try {
            const uid = localStorage.getItem('tiktok_uid');
            const token = localStorage.getItem('tiktok_token');
            const url = `${API_BASE_URL}/api/tiktok/catalog/products?advertiserId=${advId}&catalog_id=${catalogId}`;

            const res = await fetch(
                url,
                {
                    credentials: 'include',
                    headers: {
                        ...(uid && { 'x-tiktok-user-id': uid }),
                        ...(token && { 'x-tiktok-token': token }),
                    }
                }
            );

            const data = await res.json();

            if (data.success) {
                setCatalogProducts(data.products || []);
            } else {
                setProductError(data.error || 'Failed to load products');
            }
        } catch (err) {
            console.error("❌ [Client fetchCatalogProducts] Error caught during fetch:", err);
            setProductError(err.message);
        } finally {
            setLoadingProducts(false);
        }
    }, []);


    const handleRefreshAdvertisers = async () => {
        setRefreshingAdvertisers(true);
        try {
            await fetchTikTokAdvertisers();
            toast.success("Advertiser list refreshed successfully.");
        } catch (err) {
            console.error("❌ [Client handleRefreshAdvertisers] Error:", err);
            toast.error(err.message || "Failed to refresh advertisers.");
        } finally {
            setRefreshingAdvertisers(false);
        }
    };

    // Track initial settings & form settings (matching Meta's AdAccountSettings.jsx)
    useEffect(() => {
        if (!selectedAdvertiser || !serverSettings) return;

        const initial = JSON.parse(JSON.stringify(serverSettings));

        if (skipSettingsResetRef.current) {
            skipSettingsResetRef.current = false;
            initialSettingsRef.current = initial;
            setInitialSettings(initial);
            return;
        }

        // If cache was already restored, only update initialSettings (for hasChanges comparison)
        // but don't overwrite the form values
        if (cacheRestoredRef.current) {
            initialSettingsRef.current = initial;
            setInitialSettings(initial);
            return;
        }

        // Try to restore from cache
        try {
            const cachedDraft = localStorage.getItem(DRAFT_CACHE_KEY);
            if (cachedDraft) {
                const draft = JSON.parse(cachedDraft);
                const isForCurrentAccount = draft.advertiserId === selectedAdvertiser;
                const isRecent = Date.now() - draft.timestamp < 24 * 60 * 60 * 1000;

                if (isForCurrentAccount && isRecent) {
                    setLocalSettings(draft.settings);
                    initialSettingsRef.current = initial;
                    setInitialSettings(initial);
                    cacheRestoredRef.current = true;
                    return;
                }
            }
        } catch (e) {
            // Ignore
        }

        // No valid cache, use server values
        setLocalSettings(initial);
        initialSettingsRef.current = initial;
        setInitialSettings(initial);
    }, [serverSettings, selectedAdvertiser]);


    // Effect to save drafts of changes to localStorage (matching Meta's AdAccountSettings.jsx)
    useEffect(() => {
        if (!selectedAdvertiser || !settings || !initialSettings) return;

        if (hasChanges) {
            const draft = {
                advertiserId: selectedAdvertiser,
                settings,
                timestamp: Date.now()
            };
            try {
                localStorage.setItem(DRAFT_CACHE_KEY, JSON.stringify(draft));
            } catch (e) {
                // Ignore save errors
            }
        } else {
            // Clear cache if no unsaved changes (and cache was for this account)
            try {
                const cached = localStorage.getItem(DRAFT_CACHE_KEY);
                if (cached) {
                    const draft = JSON.parse(cached);
                    if (draft.advertiserId === selectedAdvertiser) {
                        localStorage.removeItem(DRAFT_CACHE_KEY);
                    }
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
    }, [selectedAdvertiser, settings, initialSettings, hasChanges]);

    // Fetch identities + catalogs when advertiser changes
    useEffect(() => {
        if (selectedAdvertiser) {
            fetchTikTokIdentities(selectedAdvertiser);
            // Reset catalog state
            setCatalogs([]);
            setCatalogProducts([]);
            setCatalogError(null);
            setProductError(null);
            fetchCatalogs(selectedAdvertiser);
            cacheRestoredRef.current = false;
        }
    }, [selectedAdvertiser, fetchTikTokIdentities, fetchCatalogs]);

    // Fetch catalog products when selected catalog changes (or when settings are first loaded)
    const activeCatalogId = settings?.catalogSelection?.catalog_id;
    useEffect(() => {
        if (selectedAdvertiser && activeCatalogId) {
            fetchCatalogProducts(selectedAdvertiser, activeCatalogId);
        } else {
            setCatalogProducts([]);
        }
    }, [selectedAdvertiser, activeCatalogId, fetchCatalogProducts]);


    // Auto-select the first advertiser if none is currently selected
    useEffect(() => {
        if (advertisers.length > 0 && !selectedAdvertiser) {
            const firstAdvertiserId = advertisers[0].advertiser_id || advertisers[0].id;
            setSelectedAdvertiser(firstAdvertiserId);
            try {
                localStorage.setItem('last_selected_tiktok_advertiser', firstAdvertiserId);
            } catch (e) { }

            // Update URL query parameter
            try {
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('adsaccount', firstAdvertiserId);
                newUrl.searchParams.delete('advertiser');
                window.history.replaceState({}, '', newUrl);
            } catch (e) { }
        }
    }, [advertisers, selectedAdvertiser]);

    const fetchIdentities = () => {
        if (selectedAdvertiser) {
            fetchTikTokIdentities(selectedAdvertiser, true);
        }
    };

    const handleSave = async (updatedSettings = settings) => {
        if (!selectedAdvertiser) return;
        setIsSaving(true);
        try {
            await saveTikTokSettings(selectedAdvertiser, updatedSettings);
            setServerSettings(updatedSettings);
            toast.success("Settings saved successfully");

            // Clear the cached draft
            try {
                localStorage.removeItem(DRAFT_CACHE_KEY);
            } catch (e) { }

            // Sync initialSettings to exactly what we saved — hasChanges will
            // immediately compute to false on the next render (no effect lag).
            const savedSnapshot = JSON.parse(JSON.stringify(updatedSettings));
            initialSettingsRef.current = savedSnapshot;
            setInitialSettings(savedSnapshot);
        } catch (err) {
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDismiss = () => {
        if (initialSettings) {
            setSettings(JSON.parse(JSON.stringify(initialSettings)));
        }

        // Clear the cached draft
        try {
            localStorage.removeItem(DRAFT_CACHE_KEY);
        } catch (e) { }

        // hasChanges is derived — resetting settings above will recompute it to false
    };

    const handleAdvertiserChange = (id) => {
        setSelectedAdvertiser(id);
        setOpenAdvertiser(false);
        initialSettingsRef.current = null;
        setInitialSettings(null);
        setLocalSettings(null);
        cacheRestoredRef.current = false; // Reset on advertiser change
        // Reset catalog dropdowns on advertiser change

        setCatalogs([]);
        setCatalogProducts([]);
        try {
            localStorage.setItem('last_selected_tiktok_advertiser', id);
        } catch (e) { }

        // Update URL query parameter
        try {
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('adsaccount', id);
            newUrl.searchParams.delete('advertiser');
            window.history.replaceState({}, '', newUrl);
        } catch (e) { }
    };

    if (!isTikTokLoggedIn) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center">
                    <Layout className="w-10 h-10 text-gray-200" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900">TikTok Not Connected</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto font-medium">Please connect your TikTok For Business account to manage preferences and launch ads.</p>
                </div>
                <Button
                    onClick={() => window.location.href = '/tiktok-login'}
                    className="h-12 px-8 rounded-2xl bg-black text-white font-bold"
                >
                    Connect TikTok
                </Button>
            </div>
        );
    }


    const currentSettings = settings || {};
    const currentAdvertiser = advertisers.find(a => (a.advertiser_id || a.id) === selectedAdvertiser);

    return (
        <div className="space-y-6 w-full max-w-3xl">
            {/* Advertiser Selector — mirrors Meta's Ad Account dropdown */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-md font-medium text-gray-800">Select Advertiser Account</label>
                </div>
                <div className="flex items-center gap-2">
                    <Popover open={openAdvertiser} onOpenChange={(open) => {
                        setOpenAdvertiser(open);
                        if (!open) setAdvertiserSearch("");
                    }}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between rounded-2xl border border-gray-300 bg-white shadow-xs hover:bg-white px-3 py-4.5"
                            >
                                {currentAdvertiser?.name || "Select an Advertiser Account"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="min-w-[--radix-popover-trigger-width] w-auto !max-w-none p-0 bg-white shadow-lg rounded-2xl"
                            align="start"
                            sideOffset={4}
                            side="bottom"
                            avoidCollisions={false}
                            style={{
                                minWidth: "var(--radix-popover-trigger-width)",
                                width: "auto",
                            }}
                        >
                            <div className="flex flex-col overflow-hidden rounded-2xl bg-white text-gray-900">
                                <div className="mx-2 mt-2 mb-1 flex items-center rounded-2xl border border-gray-300 bg-white px-3 shadow">
                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Search advertiser accounts..."
                                        value={advertiserSearch}
                                        onChange={(e) => setAdvertiserSearch(e.target.value)}
                                        className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 text-gray-900 border-none focus:ring-0"
                                    />
                                </div>
                                <div className="max-h-[500px] overflow-y-auto rounded-2xl custom-scrollbar p-1">
                                    {(() => {
                                        const filtered = advertisers.filter(a => {
                                            const name = (a.name || "").toLowerCase();
                                            const id = String(a.advertiser_id || a.id || "").toLowerCase();
                                            const q = advertiserSearch.toLowerCase();
                                            return name.includes(q) || id.includes(q);
                                        });
                                        if (filtered.length === 0) {
                                            return <div className="py-6 text-center text-sm text-gray-500">No accounts found.</div>;
                                        }
                                        return (
                                            <div className="space-y-0.5">
                                                {filtered.map(a => {
                                                    const id = a.advertiser_id || a.id;
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={id}
                                                            onClick={() => {
                                                                handleAdvertiserChange(id);
                                                                setAdvertiserSearch("");
                                                            }}
                                                            className={cn(
                                                                "w-full text-left px-4 py-2 cursor-pointer rounded-2xl transition-colors duration-150 hover:bg-gray-100 flex items-center justify-between",
                                                                selectedAdvertiser === id ? "bg-gray-100 font-semibold" : ""
                                                            )}
                                                        >
                                                            <span className="text-sm">{a.name}</span>
                                                            {selectedAdvertiser === id && <Check className="ml-auto w-4 h-4" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <button
                        type="button"
                        onClick={handleRefreshAdvertisers}
                        disabled={refreshingAdvertisers}
                        className="disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        <RefreshCcw className={`w-4 h-4 text-gray-500 ${refreshingAdvertisers ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {selectedAdvertiser && loading && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                        <Loader className="h-3 w-3 animate-spin" />
                        Loading Ad Account Preferences...
                    </div>
                )}
            </div>

            <fieldset disabled={!selectedAdvertiser || loading}>
                <div className={!selectedAdvertiser || loading ? "opacity-70 cursor-not-allowed space-y-6" : "space-y-6"}>
                    {/* Identity Section — mirrors Meta's bg-[#f7f7f7] section style */}
                    <div className="bg-[#f5f5f5] rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <TikTokIcon className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60" />
                                <h3 className="font-medium text-[14px] text-zinc-950">
                                    Default Linked TikTok Account
                                </h3>
                            </div>
                            <RefreshCcw
                                className={cn(
                                    "h-4 w-4 cursor-pointer transition-all duration-200",
                                    loadingIdentities
                                        ? "text-gray-300 animate-spin"
                                        : "text-gray-500 hover:text-gray-700"
                                )}
                                onClick={fetchIdentities}
                            />
                        </div>

                        <div>
                            <Popover open={openIdentity} onOpenChange={(open) => {
                                setOpenIdentity(open);
                                if (!open) setIdentitySearch("");
                            }}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={loadingIdentities}
                                        className="w-full justify-between border border-gray-300 rounded-2xl bg-white shadow flex items-center hover:bg-white px-3 py-4.5"
                                    >
                                        {loadingIdentities ? (
                                            <div className="flex items-center gap-2">
                                                <Loader className="h-4 w-4 animate-spin" />
                                                <span className="text-sm font-medium text-gray-500">Loading identities...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    const unfilteredList = tiktokIdentities[selectedAdvertiser] || [];
                                                    const found = unfilteredList.find(i => i.identity_id === currentSettings.defaultIdentityId);
                                                    return found ? (
                                                        <span className="flex items-center gap-2">
                                                            <img
                                                                src={found.avatar_url || found.profile_image || TikTokIconUrl}
                                                                alt={found.display_name}
                                                                className="w-6 h-6 rounded-full object-cover shrink-0 bg-gray-50 border border-gray-100 p-0.5"
                                                            />
                                                            <span className="text-sm font-medium text-gray-900">{found.display_name}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {currentSettings.defaultIdentityName || currentSettings.defaultIdentityId || "Select an identity"}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="min-w-[--radix-popover-trigger-width] w-auto !max-w-none p-0 rounded-xl bg-white border-gray-200 shadow-2xl"
                                    align="start"
                                    sideOffset={4}
                                    side="bottom"
                                    avoidCollisions={false}
                                    style={{
                                        minWidth: "var(--radix-popover-trigger-width)",
                                        width: "auto",
                                    }}
                                >
                                    <div className="flex flex-col overflow-hidden rounded-xl bg-white text-gray-900">
                                        <div className="mx-2 mt-2 mb-1 flex items-center rounded-2xl border border-gray-300 bg-white px-3 shadow">
                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-gray-500" />
                                            <input
                                                type="text"
                                                placeholder="Search identities..."
                                                value={identitySearch}
                                                onChange={(e) => setIdentitySearch(e.target.value)}
                                                className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 text-gray-900 border-none focus:ring-0"
                                            />
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto rounded-xl p-1">
                                            {(() => {
                                                const filtered = identities.filter(i => {
                                                    const name = (i.display_name || "").toLowerCase();
                                                    const id = String(i.identity_id || "").toLowerCase();
                                                    const q = identitySearch.toLowerCase();
                                                    return name.includes(q) || id.includes(q);
                                                });
                                                if (filtered.length === 0) {
                                                    return <div className="py-6 text-center text-xs text-gray-500">No identities found.</div>;
                                                }
                                                return (
                                                    <div className="space-y-0.5">
                                                        {filtered.map((i) => (
                                                            <button
                                                                type="button"
                                                                key={i.identity_id}
                                                                onClick={() => {
                                                                    setSettings({
                                                                        ...currentSettings,
                                                                        defaultIdentityId: i.identity_id,
                                                                        defaultIdentityName: i.display_name
                                                                    });
                                                                    setOpenIdentity(false);
                                                                    setIdentitySearch("");
                                                                }}
                                                                className="w-full text-left px-3 py-2 cursor-pointer rounded-xl transition-colors duration-150 hover:bg-gray-100 flex items-center justify-between"
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <img
                                                                        src={i.avatar_url || i.profile_image || TikTokIconUrl}
                                                                        alt={i.display_name}
                                                                        className="w-6 h-6 rounded-full object-cover shrink-0 bg-gray-50 border border-gray-100 p-0.5"
                                                                    />
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-sm font-semibold text-gray-900 truncate">{i.display_name}</span>
                                                                        <span className="text-xs text-gray-400 font-normal shrink-0 truncate">{i.username || i.identity_id}</span>
                                                                    </div>
                                                                </div>
                                                                {currentSettings.defaultIdentityId === i.identity_id && <Check className="ml-auto w-4 h-4 text-black shrink-0" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Copy Templates */}
                    <TikTokCopyTemplates
                        advertiserId={selectedAdvertiser}
                        templates={currentSettings.copyTemplates || {}}
                        defaultName={currentSettings.defaultTemplateName || ""}
                        onSaveTemplate={async (name, data, oldName) => {
                            const updated = { ...(initialSettingsRef.current?.copyTemplates || initialSettings?.copyTemplates || {}) };
                            if (oldName && oldName !== name) delete updated[oldName];
                            updated[name] = data;

                            const wasDefault = (initialSettingsRef.current || initialSettings)?.defaultTemplateName === oldName;
                            const partialUpdate = {
                                copyTemplates: updated,
                                ...(wasDefault && oldName !== name && { defaultTemplateName: name })
                            };

                            const base = initialSettingsRef.current || initialSettings || {};
                            const next = { ...base, ...partialUpdate };

                            // Update the ref synchronously so onSetDefault (called right after)
                            // always reads the latest base — React state is async.
                            initialSettingsRef.current = JSON.parse(JSON.stringify(next));

                            try {
                                await saveTikTokSettings(selectedAdvertiser, next);
                                skipSettingsResetRef.current = true;
                                setServerSettings(next);
                                setInitialSettings(JSON.parse(JSON.stringify(next)));
                                setSettings(prev => ({
                                    ...prev,
                                    ...partialUpdate
                                }));
                            } catch (err) {
                                toast.error("Failed to save template");
                            }
                        }}
                        onSetDefault={async (name) => {
                            const partialUpdate = { defaultTemplateName: name };
                            // Use the ref so we always have the latest base settings even when
                            // onSaveTemplate was just called in the same async chain.
                            const base = initialSettingsRef.current || initialSettings || {};
                            const next = { ...base, ...partialUpdate };

                            // Keep the ref in sync
                            initialSettingsRef.current = JSON.parse(JSON.stringify(next));

                            try {
                                await saveTikTokSettings(selectedAdvertiser, next);
                                skipSettingsResetRef.current = true;
                                setServerSettings(next);
                                setInitialSettings(JSON.parse(JSON.stringify(next)));
                                setSettings(prev => ({
                                    ...prev,
                                    ...partialUpdate
                                }));
                            } catch (err) {
                                toast.error("Failed to set default template");
                            }
                        }}
                        onDeleteTemplate={async (names) => {
                            const namesToDelete = Array.isArray(names) ? names : [names];
                            const updated = { ...(initialSettings?.copyTemplates || {}) };
                            namesToDelete.forEach(n => delete updated[n]);

                            const wasDefault = namesToDelete.includes(initialSettings?.defaultTemplateName);
                            const partialUpdate = {
                                copyTemplates: updated,
                                ...(wasDefault && { defaultTemplateName: "" })
                            };

                            const next = { ...(initialSettings || {}), ...partialUpdate };

                            try {
                                await saveTikTokSettings(selectedAdvertiser, next);
                                skipSettingsResetRef.current = true;
                                setServerSettings(next);
                                setInitialSettings(JSON.parse(JSON.stringify(next)));
                                setSettings(prev => ({
                                    ...prev,
                                    ...partialUpdate
                                }));
                            } catch (err) {
                                toast.error("Failed to delete template");
                            }
                        }}
                    />

                    {/* Ad Naming Convention */}
                    <div className="bg-[#f5f5f5] rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <LabelIcon className="w-5 h-5 grayscale brightness-75 contrast-75 opacity-60" />
                            <h3 className="font-medium text-[14px] text-zinc-950">
                                Set up your default ad naming conventions
                            </h3>
                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            className="text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <Info className="w-3.5 h-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="top"
                                        align="end"
                                        className="max-w-xs p-3 text-xs leading-relaxed rounded-2xl bg-zinc-800 text-white border-black"
                                    >
                                        <p className="font-medium mb-1.5">Select the Custom Date option & replace 'custom' with any combination of the tokens below.</p>
                                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                                            <span className="font-semibold">D</span><span className="text-gray-400">Day (1–31)</span>
                                            <span className="font-semibold">DD</span><span className="text-gray-400">Day, zero-padded (01–31)</span>
                                            <span className="font-semibold">M</span><span className="text-gray-400">Month (1–12)</span>
                                            <span className="font-semibold">MM</span><span className="text-gray-400">Month, zero-padded (01–12)</span>
                                            <span className="font-semibold">MMM</span><span className="text-gray-400">Month name (Jan, Feb…)</span>
                                            <span className="font-semibold">YY</span><span className="text-gray-400">Year, 2-digit (25)</span>
                                            <span className="font-semibold">YYYY</span><span className="text-gray-400">Year, 4-digit (2025)</span>
                                        </div>
                                        <p className="text-gray-400 mt-2">Use any separator: <span className="font-mono">/ - . _</span> or space</p>
                                        <p className="text-gray-400 italic mt-1.5">{"Example: {{Date(DD-MMM-YYYY)}} → 05-Mar-2025"}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <ReorderAdNameParts
                            formulaInput={currentSettings.adNameFormulaV2?.rawInput || ""}
                            onFormulaChange={(newRawInput) => {
                                setSettings({
                                    ...currentSettings,
                                    adNameFormulaV2: { rawInput: newRawInput }
                                });
                            }}
                            variant="default"
                            customVariables={currentSettings.customVariables || []}
                            onCustomVariablesChange={(newVars) => {
                                setSettings({
                                    ...currentSettings,
                                    customVariables: newVars
                                });
                            }}
                            hideInfoTooltip
                        />
                    </div>

                    {/* Links & UTMs */}
                    <TikTokLinkParameters
                        advertiserId={selectedAdvertiser}
                        links={currentSettings.links || []}
                        setLinks={(nextVal) => {
                            const currentLinks = currentSettings.links || [];
                            const evaluated = typeof nextVal === 'function' ? nextVal(currentLinks) : nextVal;
                            setSettings({ ...currentSettings, links: evaluated });
                        }}
                        utmPairs={currentSettings.defaultUTMs || []}
                        setUtmPairs={(nextVal) => {
                            const currentUTMs = currentSettings.defaultUTMs || [];
                            const evaluated = typeof nextVal === 'function' ? nextVal(currentUTMs) : nextVal;
                            setSettings({ ...currentSettings, defaultUTMs: evaluated });
                        }}
                        clickTrackingUrl={currentSettings.clickTrackingUrl || currentSettings.thirdPartyTrackingUrl || ""}
                        setClickTrackingUrl={(clickTrackingUrl) => setSettings({ ...currentSettings, clickTrackingUrl, thirdPartyTrackingUrl: clickTrackingUrl })}
                        impressionTrackingUrl={currentSettings.impressionTrackingUrl || ""}
                        setImpressionTrackingUrl={(impressionTrackingUrl) => setSettings({ ...currentSettings, impressionTrackingUrl })}
                    />

                    {/* Default CTAs — flat section like Meta */}
                    <div className="bg-[#f5f5f5] rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <CTAIcon
                                alt="CTA icon"
                                className="w-4 h-4 grayscale brightness-75 contrast-75 opacity-60"
                            />
                            <span className="text-sm font-medium">Default CTA</span>
                        </div>
                        <p className="text-gray-500 text-[12px] font-regular">
                            Your ads will use this CTA by default if not edited while posting
                        </p>
                        <div className="space-y-2">
                            <Popover open={openCta} onOpenChange={setOpenCta}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-between border border-gray-300 rounded-2xl bg-white shadow hover:bg-white px-3 py-4.5"
                                    >
                                        <span className="text-sm truncate">
                                            {currentSettings.defaultCTAs?.length > 0
                                                ? currentSettings.defaultCTAs.map(v => CTA_OPTIONS.find(o => o.value === v)?.label).join(", ")
                                                : "None selected"}
                                        </span>
                                        <ChevronsUpDown className="w-4 h-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1 bg-white rounded-2xl shadow-xl border-gray-100" side="bottom" avoidCollisions={false}>
                                    <div className="flex flex-col overflow-hidden rounded-2xl bg-white text-gray-900">
                                        <div className="max-h-[300px] overflow-y-auto rounded-2xl p-1">
                                            <div className="space-y-0.5">
                                                {CTA_OPTIONS.map(opt => (
                                                    <button
                                                        type="button"
                                                        key={opt.value}
                                                        onClick={() => {
                                                            const prev = currentSettings.defaultCTAs || [];
                                                            const next = prev.includes(opt.value)
                                                                ? prev.filter(v => v !== opt.value)
                                                                : [...prev, opt.value];
                                                            setSettings({ ...currentSettings, defaultCTAs: next });
                                                        }}
                                                        className="w-full text-left px-3 py-2 cursor-pointer rounded-xl transition-colors duration-150 hover:bg-gray-100 flex items-center gap-2"
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${currentSettings.defaultCTAs?.includes(opt.value) ? "bg-black border-black text-white" : "border-gray-200"}`}>
                                                            {currentSettings.defaultCTAs?.includes(opt.value) && <Check className="w-3 h-3" />}
                                                        </div>
                                                        <span className="text-sm font-medium">{opt.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* ─── Catalog & Product Preferences ─── */}

                    <div className="bg-[#f5f5f5] rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                </svg>
                                <h3 className="font-medium text-[14px] text-zinc-950">Catalog &amp; Product Preferences</h3>
                                {(loadingCatalogs || loadingProducts) && (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    fetchCatalogs(selectedAdvertiser);
                                    if (selectedCatalogId) fetchCatalogProducts(selectedAdvertiser, selectedCatalogId);
                                }}
                                disabled={loadingCatalogs}
                                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
                                title="Refresh catalogs"
                            >
                                <RefreshCcw className={`w-3.5 h-3.5 ${loadingCatalogs ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <p className="text-xs text-gray-500">
                            Choose a catalog and product. Your selection will auto-populate in the TikTok Ad Creation form.
                        </p>

                        {/* Catalog Error */}
                        {catalogError && (
                            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                                <Info className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-red-600">No catalogs found.</p>
                            </div>
                        )}

                        {/* Catalog Dropdown */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-700">Catalog</label>
                            <Popover open={openCatalog} onOpenChange={(open) => {
                                setOpenCatalog(open);
                                if (!open) setCatalogSearch("");
                            }}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={loadingCatalogs || !selectedAdvertiser}
                                        className="w-full justify-between border border-gray-300 rounded-2xl bg-white shadow flex items-center hover:bg-white px-3 py-4.5"
                                    >
                                        {loadingCatalogs ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                <span className="text-sm text-gray-400">Loading catalogs...</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm font-medium text-gray-900 truncate">
                                                {selectedCatalogName || 'Select a Catalog'}
                                            </span>
                                        )}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="min-w-[--radix-popover-trigger-width] w-auto !max-w-none p-0 rounded-xl bg-white border-gray-200 shadow-2xl"
                                    align="start"
                                    sideOffset={4}
                                    side="top"
                                    avoidCollisions={true}
                                    style={{ minWidth: "var(--radix-popover-trigger-width)", width: "auto" }}
                                >
                                    <div className="flex flex-col overflow-hidden rounded-xl bg-white text-gray-900">
                                        <div className="mx-2 mt-2 mb-1 flex items-center rounded-2xl border border-gray-300 bg-white px-3 shadow">
                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-gray-500" />
                                            <input
                                                type="text"
                                                placeholder="Search catalogs..."
                                                value={catalogSearch}
                                                onChange={(e) => setCatalogSearch(e.target.value)}
                                                className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 text-gray-900 border-none focus:ring-0"
                                            />
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto rounded-xl p-1">
                                            {(() => {
                                                const filtered = catalogs.filter(cat => {
                                                    const name = (cat.catalog_name || "").toLowerCase();
                                                    const id = String(cat.catalog_id || "").toLowerCase();
                                                    const q = catalogSearch.toLowerCase();
                                                    return name.includes(q) || id.includes(q);
                                                });
                                                if (filtered.length === 0) {
                                                    return (
                                                        <div className="py-6 text-center text-xs text-gray-500">
                                                            {catalogs.length === 0 ? 'No catalogs found for this advertiser.' : 'No results.'}
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div className="space-y-0.5">
                                                        {filtered.map((cat) => (
                                                            <button
                                                                type="button"
                                                                key={cat.catalog_id}
                                                                onClick={() => {
                                                                    setSettings(prev => ({
                                                                        ...prev,
                                                                        catalogSelection: {
                                                                            catalog_id: cat.catalog_id,
                                                                            catalog_name: cat.catalog_name,
                                                                            product_id: null,
                                                                            product_name: null,
                                                                            product_image_url: null,
                                                                            sku_id: null,
                                                                            item_group_id: null,
                                                                            products: [],
                                                                        }
                                                                    }));
                                                                    setCatalogProducts([]);
                                                                    setOpenCatalog(false);
                                                                    setCatalogSearch("");
                                                                }}
                                                                className={cn(
                                                                    "w-full text-left px-3 py-2 cursor-pointer rounded-xl transition-colors duration-150 hover:bg-gray-100 flex items-center gap-2",
                                                                    selectedCatalogId === cat.catalog_id ? "bg-gray-50 font-medium" : ""
                                                                )}
                                                            >
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-semibold text-gray-900 truncate">{cat.catalog_name}</p>
                                                                    <p className="text-xs text-gray-400 font-mono">{cat.catalog_id}</p>
                                                                </div>
                                                                {selectedCatalogId === cat.catalog_id && <Check className="w-4 h-4 text-black shrink-0" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Products Dropdown — shown only when a catalog is selected */}
                        {selectedCatalogId && (
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Product</label>
                                {productError && (
                                    <p className="text-xs text-red-500 mb-1">{productError}</p>
                                )}
                                <Popover open={openProduct} onOpenChange={(open) => {
                                    setOpenProduct(open);
                                    if (!open) setProductSearch("");
                                }}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            disabled={loadingProducts}
                                            className="w-full justify-between border border-gray-300 rounded-2xl bg-white shadow flex items-center hover:bg-white px-3 py-4.5"
                                        >
                                            {loadingProducts ? (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                    <span className="text-sm text-gray-400">Loading products...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {displayProductImage && (
                                                        <img
                                                            src={displayProductImage}
                                                            alt=""
                                                            className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-100"
                                                        />
                                                    )}
                                                    <span className="text-sm font-medium text-gray-900 truncate">
                                                        {displayProductName || 'Select a Product'}
                                                    </span>
                                                </div>
                                            )}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="min-w-[--radix-popover-trigger-width] w-auto !max-w-none p-0 rounded-xl bg-white border-gray-200 shadow-2xl"
                                        align="start"
                                        sideOffset={4}
                                        side="top"
                                        avoidCollisions={true}
                                        style={{ minWidth: "var(--radix-popover-trigger-width)", width: "auto" }}
                                    >
                                        <div className="flex flex-col overflow-hidden rounded-xl bg-white text-gray-900">
                                            <div className="mx-2 mt-2 mb-1 flex items-center rounded-2xl border border-gray-300 bg-white px-3 shadow">
                                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-gray-500" />
                                                <input
                                                    type="text"
                                                    placeholder="Search products..."
                                                    value={productSearch}
                                                    onChange={(e) => setProductSearch(e.target.value)}
                                                    className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 text-gray-900 border-none focus:ring-0"
                                                />
                                            </div>
                                            <div className="max-h-[360px] overflow-y-auto rounded-xl p-1">
                                                {(() => {
                                                    const filtered = catalogProducts.filter(prod => {
                                                        const name = (prod.product_name || "").toLowerCase();
                                                        const id = String(prod.product_id || "").toLowerCase();
                                                        const q = productSearch.toLowerCase();
                                                        return name.includes(q) || id.includes(q);
                                                    });
                                                    if (filtered.length === 0) {
                                                        return (
                                                            <div className="py-6 text-center text-xs text-gray-500">
                                                                {catalogProducts.length === 0 ? 'No products in this catalog.' : 'No results.'}
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className="space-y-0.5">
                                                            {filtered.map((prod) => (
                                                                <button
                                                                    type="button"
                                                                    key={prod.product_id}
                                                                    onClick={() => {
                                                                        const isSelected = selectedProductIds.includes(prod.product_id);
                                                                        let nextProductIds = [];
                                                                        let nextProductsList = [];
                                                                        if (isSelected) {
                                                                            nextProductIds = selectedProductIds.filter(id => id !== prod.product_id);
                                                                            nextProductsList = selectedProductsList.filter(p => p.product_id !== prod.product_id);
                                                                        } else {
                                                                            nextProductIds = [...selectedProductIds, prod.product_id];
                                                                            nextProductsList = [
                                                                                ...selectedProductsList.filter(p => p.product_id !== prod.product_id),
                                                                                {
                                                                                    product_id: prod.product_id,
                                                                                    product_name: prod.product_name,
                                                                                    product_image_url: prod.image_url || null,
                                                                                    sku_id: prod.sku_id || null,
                                                                                    item_group_id: prod.item_group_id || null,
                                                                                }
                                                                            ];
                                                                        }
                                                                        setSettings(prev => ({
                                                                            ...prev,
                                                                            catalogSelection: {
                                                                                ...(prev?.catalogSelection || {}),
                                                                                product_id: nextProductIds,
                                                                                product_name: nextProductsList.map(p => p.product_name).join(", "),
                                                                                product_image_url: nextProductsList[0]?.product_image_url || null,
                                                                                sku_id: nextProductsList[0]?.sku_id || null,
                                                                                item_group_id: nextProductsList[0]?.item_group_id || null,
                                                                                products: nextProductsList,
                                                                            }
                                                                        }));
                                                                    }}
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-2 cursor-pointer rounded-xl transition-colors duration-150 hover:bg-gray-100 flex items-center gap-3",
                                                                        selectedProductIds.includes(prod.product_id) ? "bg-gray-50 font-medium" : ""
                                                                    )}
                                                                >
                                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${selectedProductIds.includes(prod.product_id) ? "bg-black border-black text-white" : "border-gray-200"}`}>
                                                                        {selectedProductIds.includes(prod.product_id) && <Check className="w-3 h-3" />}
                                                                    </div>
                                                                    {prod.image_url && (
                                                                        <img
                                                                            src={prod.image_url}
                                                                            alt=""
                                                                            className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-100"
                                                                        />
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-semibold text-gray-900 truncate">{prod.product_name}</p>
                                                                        {prod.price && (
                                                                            <p className="text-xs text-gray-400">{prod.price} {prod.currency}</p>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}
                    </div>
                </div>
            </fieldset>

            {/* Portal Save Bar — identical pattern to Meta's AdAccountSettings */}
            {document.getElementById('settings-save-bar-portal') && createPortal(
                <div
                    className={`absolute bottom-0 left-0 w-full z-40 bg-blue-600 text-white transition-transform duration-300 ease-in-out ${hasChanges ? "translate-y-0" : "translate-y-full"}`}
                >
                    <div className="mx-auto max-w-3xl px-6 py-1.5 flex flex-col items-center gap-1">
                        <div className="flex items-center gap-4">
                            <Button
                                onClick={() => handleSave()}
                                className="bg-white text-blue-600 hover:bg-white rounded-xl px-6 h-9 text-sm font-semibold shadow-xs"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader className="h-4 w-4 animate-spin" />
                                        <span className="block truncate flex-1 text-left">Saving changes...</span>
                                    </>
                                ) : (
                                    <p className="text-blue-600 hover:text-blue-600">Save Changes</p>
                                )}
                            </Button>
                            <Button
                                onClick={handleDismiss}
                                variant="ghost"
                                className="text-white hover:bg-blue-700 hover:text-white rounded-xl px-4 h-9 text-sm font-medium"
                            >
                                Dismiss changes
                            </Button>
                        </div>
                    </div>
                </div>,
                document.getElementById('settings-save-bar-portal')
            )}
        </div>
    );
}
