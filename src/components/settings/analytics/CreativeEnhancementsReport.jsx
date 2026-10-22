"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
    Sparkles, DollarSign, Search, List, ChevronsUpDown, ChevronDown, Loader,
    ImageOff, RefreshCw, Check, AlertTriangle, ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppData } from "@/lib/AppContext"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

// ── Palette (matches AdAccountAudit) ─────────────────────────────────────────
const PINK_DEEP = "#C70845"
const PINK_SOFT = "#FCD9E3"
const BLUE = "#2563EB"
const INK = "#0F1115"
const INK_2 = "#2A2E35"
const MUTED = "#6B7280"
const LINE = "#E7E9EE"
const PAPER = "#FFFFFF"
const PAPER_2 = "#F8F9FB"
const FONT = "'Inter Tight', system-ui, sans-serif"

const DATE_PRESETS = [
    { label: "1 Day", value: "yesterday" },
    { label: "3 Days", value: "last_3d" },
    { label: "7 Days", value: "last_7d" },
    { label: "30 Days", value: "last_30d" },
]

const APPLY_CHUNK = 50

// Meta creative_features_spec key → label. Labels follow the creative
// enhancement settings (settings/CreativeEnhancements.jsx); unknown keys fall
// back to a humanized key.
const ENHANCEMENT_LABELS = {
    image_templates: "Add Overlays",
    image_template: "Add Overlays",
    image_touchups: "Visual Touch-ups",
    video_auto_crop: "Visual Touch-ups (Video)",
    text_optimizations: "Text Improvements",
    enhance_cta: "Enhance CTA",
    image_brightness_and_contrast: "Adjust Brightness and Contrast",
    inline_comment: "Relevant Comments",
    image_uncrop: "Expand Image",
    text_generation: "Text Generation",
    text_translation: "Translate Text",
    translate_voiceover: "Translate Voiceover",
    reveal_details_over_time: "Reveal Details Over Time",
    show_summary: "Show Summaries",
    image_animation: "Image Animations",
    image_text_translation: "Translate Image Text",
    video_filtering: "Video Filter",
    video_uncrop: "Video Uncrop",
    pac_relaxation: "Flex Media",
    description_automation: "Dynamic Descriptions",
    site_extensions: "Add Site Links",
    local_store_extension: "Store Locator",
    product_extensions: "Add Catalog Items",
    product_browsing: "Product Browsing",
    add_text_overlay: "Dynamic Overlays",
    media_type_automation: "Allow Product Video",
    adapt_to_placement: "Image Touch-ups (Catalog)",
    creative_stickers: "Create Sticker CTA",
    image_background_gen: "Generate Backgrounds",
    dynamic_partner_content: "Dynamic Partnership Ads",
    audio: "Music",
    profile_card: "Profile End Card",
}

const FORMAT_LABELS = {
    image: "Image",
    video: "Video",
    carousel: "Carousel",
    flexible: "Flexible",
    multi_media: "Multi-media",
    placement_customized: "Placement customized",
}

const enhancementLabel = (key) =>
    ENHANCEMENT_LABELS[key] || key.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase())

const truncateText = (text, maxLength = 70) =>
    text && text.length > maxLength ? `${text.substring(0, maxLength)}…` : text

// Same link shape as the job queue's "View in Ads Manager" (ad-creation-form),
// selecting the ad instead of the ad set.
export const buildAdsManagerAdUrl = (adAccountId, businessId, adId) => {
    const params = [
        String(adAccountId).replace("_", "="),
        ...(businessId ? [`business_id=${businessId}`, `global_scope_id=${businessId}`] : []),
        `selected_ad_ids=${adId}`,
    ]
    return `https://adsmanager.facebook.com/adsmanager/manage/ads/edit/standalone?${params.join("&")}`
}

const formatSpend = (spend) => `$${(parseFloat(spend) || 0).toFixed(2)}`

const formatDate = (value) => {
    if (!value) return "—"
    const date = new Date(value)
    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const formatStatus = (status) => {
    if (!status) return "—"
    return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export const sortCampaignsActiveFirst = (items) =>
    [...items].sort((a, b) => Number(b.status === "ACTIVE") - Number(a.status === "ACTIVE"))

function StatusPill({ status }) {
    return (
        <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap",
            status === "ACTIVE" ? "bg-green-100 text-green-700"
                : status === "PAUSED" ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
        )}>
            {formatStatus(status)}
        </span>
    )
}

function EnhancementChip({ featureKey, pending, disabled, onToggle }) {
    return (
        <label
            className={cn(
                "inline-flex items-center gap-2 rounded-full border pl-3 pr-1.5 py-1 text-[11.5px] font-medium transition-colors",
                pending ? "border-dashed border-gray-300 bg-gray-50 text-gray-400" : "border-gray-200 bg-white text-gray-800",
                disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
            )}
        >
            <span className={cn(pending && "line-through")}>{enhancementLabel(featureKey)}</span>
            <Switch
                checked={!pending}
                disabled={disabled}
                onCheckedChange={(checked) => onToggle(featureKey, !checked)}
                className="scale-75"
            />
        </label>
    )
}

function RowStatus({ status }) {
    if (!status) return null
    if (status.state === "applying") {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                <Loader className="h-3.5 w-3.5 animate-spin" /> Updating…
            </span>
        )
    }
    if (status.state === "error") {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: PINK_DEEP }}>
                        <AlertTriangle className="h-3.5 w-3.5" /> Failed
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[360px] break-words text-xs">{status.error}</TooltipContent>
            </Tooltip>
        )
    }
    if (status.warnings?.length) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> Updated — check
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[420px] break-words text-xs">
                    {status.warnings.map((warning, i) => <div key={i}>{warning}</div>)}
                </TooltipContent>
            </Tooltip>
        )
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
            <Check className="h-3.5 w-3.5" /> Updated
        </span>
    )
}

// A name that shows its full text in a tooltip only when it's cut off.
function OverflowTooltipText({ text, className }) {
    const ref = useRef(null)
    const [open, setOpen] = useState(false)
    return (
        <Tooltip
            open={open}
            onOpenChange={(next) => setOpen(next && !!ref.current && ref.current.scrollWidth > ref.current.clientWidth)}
        >
            <TooltipTrigger asChild>
                <span ref={ref} className={className}>{text}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[480px] break-words text-xs">{text}</TooltipContent>
        </Tooltip>
    )
}

// align / maxWidth / avoidCollisions let a caller open the list toward the
// page's other edge and keep long names on screen (TrendingCreative's filter).
export function SearchableCombobox({
    open, onOpenChange, disabled, triggerLabel, loading, loadingLabel, placeholder, search, onSearchChange,
    emptyLabel, items, selectedId, onSelect, renderMeta,
    align = "start", maxWidth = "48rem", avoidCollisions = false,
}) {
    return (
        <TooltipProvider delayDuration={300}>
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between border border-gray-300 rounded-2xl py-4.5 bg-white shadow transition-colors duration-150 hover:bg-white"
                >
                    <div className="w-full overflow-hidden flex items-center gap-2">
                        {loading && <Loader className="h-3.5 w-3.5 animate-spin" />}
                        <OverflowTooltipText
                            text={loading ? loadingLabel : triggerLabel}
                            className={cn("block min-w-0 truncate flex-1 text-left", loading && "text-gray-500")}
                        />
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="!w-auto p-0 bg-white shadow-lg rounded-2xl"
                align={align}
                sideOffset={4}
                side="bottom"
                avoidCollisions={avoidCollisions}
                collisionPadding={16}
                style={{
                    minWidth: "var(--radix-popover-trigger-width)",
                    width: "max-content",
                    maxWidth: `min(calc(100vw - 2rem), ${maxWidth})`,
                }}
            >
                <Command loop={false}>
                    <CommandInput
                        placeholder={placeholder}
                        value={search}
                        onValueChange={onSearchChange}
                        className="bg-transparent"
                        wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
                    />
                    <CommandEmpty>{emptyLabel}</CommandEmpty>
                    <CommandList className="max-h-none overflow-visible rounded-2xl" selectOnFocus={false}>
                        <ScrollArea viewportClassName="max-h-[400px]">
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={item.name || item.id}
                                    onSelect={() => onSelect(item.id)}
                                    className={cn(
                                        "px-4 py-2 cursor-pointer m-1 rounded-2xl transition-colors duration-150",
                                        selectedId === item.id && "bg-gray-100 font-semibold",
                                        item.status !== "ACTIVE" && "text-gray-400"
                                    )}
                                >
                                    <div className="flex justify-between items-center w-full truncate">
                                        <OverflowTooltipText text={item.name || item.id} className="min-w-0 truncate" />
                                        <span className="flex items-center">
                                            {renderMeta?.(item)}
                                            {item.status === "ACTIVE" && <span className="ml-2 w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                                        </span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        </ScrollArea>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
        </TooltipProvider>
    )
}

export default function CreativeEnhancementsReport({ open, onOpenChange, adAccountId, adAccountName }) {
    const { adAccounts } = useAppData()
    const businessId = useMemo(
        () => (adAccounts || []).find(account => account.id === adAccountId)?.business_id || "",
        [adAccounts, adAccountId]
    )
    const [viewMode, setViewMode] = useState("list") // 'list' | 'search' | 'adset'
    const [datePreset, setDatePreset] = useState("last_30d")
    const [ads, setAds] = useState([])
    const [nextCursor, setNextCursor] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [error, setError] = useState(null)
    const [hasFetched, setHasFetched] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    // Ad set browse
    const [campaigns, setCampaigns] = useState([])
    const [campaignsLoading, setCampaignsLoading] = useState(false)
    const [campaignId, setCampaignId] = useState("")
    const [adSets, setAdSets] = useState([])
    const [adSetsLoading, setAdSetsLoading] = useState(false)
    const [adSetId, setAdSetId] = useState("")
    const [openCampaign, setOpenCampaign] = useState(false)
    const [campaignSearch, setCampaignSearch] = useState("")
    const [openAdSet, setOpenAdSet] = useState(false)
    const [adSetSearch, setAdSetSearch] = useState("")

    // { [adId]: [featureKey] } — enhancements the user switched off but hasn't applied
    const [pendingOff, setPendingOff] = useState({})
    // { [adId]: { state: 'applying' | 'done' | 'error', error?, warnings? } }
    const [rowStatus, setRowStatus] = useState({})
    const [isApplying, setIsApplying] = useState(false)
    const [confirmBulk, setConfirmBulk] = useState(false)

    // Only the latest list request may write results.
    const requestRef = useRef({ id: 0, controller: null })
    // Last results per view, restored when switching tabs.
    const viewCacheRef = useRef({})
    // Close only when the press both starts and ends on the backdrop. A tab
    // switch can resize the card mid-click, so the mouseup may land outside it.
    const backdropPressRef = useRef(false)

    const startRequest = useCallback(() => {
        requestRef.current.controller?.abort()
        const controller = new AbortController()
        requestRef.current = { id: requestRef.current.id + 1, controller }
        return { requestId: requestRef.current.id, signal: controller.signal }
    }, [])

    const cancelInFlightRequest = useCallback(() => {
        requestRef.current.controller?.abort()
        requestRef.current = { id: requestRef.current.id + 1, controller: null }
    }, [])

    const isCurrentRequest = useCallback((requestId) => requestRef.current.id === requestId, [])

    useEffect(() => () => requestRef.current.controller?.abort(), [])

    const fetchAds = useCallback(async ({ mode, cursor = null, preset = "last_30d", query = "", adsetId = "" }) => {
        if (!adAccountId) return
        const isInitialLoad = !cursor
        if (isInitialLoad) {
            setIsLoading(true)
            setAds([])
            setNextCursor(null)
        } else {
            setIsLoadingMore(true)
        }
        setError(null)
        const { requestId, signal } = startRequest()

        try {
            const response = await axios.get(`${API_BASE_URL}/api/analytics/creative-enhancements/ads`, {
                params: {
                    adAccountId,
                    mode: mode === "list" ? "spend" : mode,
                    datePreset: preset,
                    ...(cursor && { after: cursor }),
                    ...(mode === "search" && { q: query }),
                    ...(mode === "adset" && { adsetId }),
                },
                withCredentials: true,
                signal,
            })
            if (!isCurrentRequest(requestId)) return
            const { ads: data = [], nextCursor: cursorAfter = null } = response.data || {}
            setAds(prev => {
                if (isInitialLoad) return data
                const seen = new Set(prev.map(ad => ad.id))
                return [...prev, ...data.filter(ad => !seen.has(ad.id))]
            })
            setNextCursor(cursorAfter)
            setHasFetched(true)
        } catch (err) {
            if (axios.isCancel(err) || !isCurrentRequest(requestId)) return
            const message = err.response?.data?.error || err.message || "Failed to load ads"
            setError(message)
            toast.error(message)
        } finally {
            if (isCurrentRequest(requestId)) {
                setIsLoading(false)
                setIsLoadingMore(false)
            }
        }
    }, [adAccountId, startRequest, isCurrentRequest])

    const fetchCampaigns = useCallback(async () => {
        if (!adAccountId) return
        setCampaignsLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/auth/fetch-campaigns?adAccountId=${adAccountId}`, { credentials: "include" })
            const data = await res.json()
            setCampaigns(sortCampaignsActiveFirst(data.campaigns || []))
        } catch (err) {
            console.error("Failed to fetch campaigns:", err)
            toast.error("Failed to fetch campaigns")
        } finally {
            setCampaignsLoading(false)
        }
    }, [adAccountId])

    const fetchAdSets = useCallback(async (selectedCampaignId) => {
        setAdSetsLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/auth/fetch-adsets?campaignId=${selectedCampaignId}`, { credentials: "include" })
            const data = await res.json()
            setAdSets(data.adSets || [])
        } catch (err) {
            console.error("Failed to fetch ad sets:", err)
            toast.error("Failed to fetch ad sets")
            setAdSets([])
        } finally {
            setAdSetsLoading(false)
        }
    }, [])

    // Reset everything on close or account change; load top spenders on open.
    useEffect(() => {
        cancelInFlightRequest()
        viewCacheRef.current = {}
        setViewMode("list")
        setDatePreset("last_30d")
        setAds([])
        setNextCursor(null)
        setHasFetched(false)
        setError(null)
        setIsLoading(false)
        setIsLoadingMore(false)
        setSearchQuery("")
        setCampaigns([])
        setCampaignId("")
        setAdSets([])
        setAdSetId("")
        setPendingOff({})
        setRowStatus({})
        setConfirmBulk(false)
        if (open && adAccountId) fetchAds({ mode: "list", preset: "last_30d" })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, adAccountId])

    const handleViewModeChange = (mode) => {
        if (mode === viewMode) return
        cancelInFlightRequest()
        if (hasFetched && !isLoading && !error) {
            viewCacheRef.current[viewMode] = { ads, nextCursor }
        }
        setViewMode(mode)
        setIsLoading(false)
        setIsLoadingMore(false)
        setError(null)
        setConfirmBulk(false)

        const cached = viewCacheRef.current[mode]
        if (cached) {
            setAds(cached.ads)
            setNextCursor(cached.nextCursor)
            setHasFetched(true)
            return
        }
        setAds([])
        setNextCursor(null)
        setHasFetched(false)
        if (mode === "list") fetchAds({ mode, preset: datePreset })
        if (mode === "adset" && campaigns.length === 0 && !campaignsLoading) fetchCampaigns()
        if (mode === "adset" && adSetId) fetchAds({ mode, preset: datePreset, adsetId: adSetId })
    }

    const handleDatePresetChange = (preset) => {
        setDatePreset(preset)
        viewCacheRef.current = {}
        if (viewMode === "list") fetchAds({ mode: "list", preset })
        if (viewMode === "search" && searchQuery.trim()) fetchAds({ mode: "search", preset, query: searchQuery.trim() })
        if (viewMode === "adset" && adSetId) fetchAds({ mode: "adset", preset, adsetId: adSetId })
    }

    const refreshCurrentView = () => {
        if (viewMode === "list") fetchAds({ mode: "list", preset: datePreset })
        if (viewMode === "search" && searchQuery.trim()) fetchAds({ mode: "search", preset: datePreset, query: searchQuery.trim() })
        if (viewMode === "adset" && adSetId) fetchAds({ mode: "adset", preset: datePreset, adsetId: adSetId })
    }

    const runSearch = () => {
        const query = searchQuery.trim()
        if (!query) {
            toast.error("Enter an ad name or ID to search")
            return
        }
        fetchAds({ mode: "search", preset: datePreset, query })
    }

    const handleCampaignChange = (id) => {
        cancelInFlightRequest()
        setIsLoading(false)
        setCampaignId(id)
        setAdSetId("")
        setAdSets([])
        setAds([])
        setHasFetched(false)
        setError(null)
        setOpenCampaign(false)
        fetchAdSets(id)
    }

    const handleAdSetChange = (id) => {
        setAdSetId(id)
        setOpenAdSet(false)
        fetchAds({ mode: "adset", preset: datePreset, adsetId: id })
    }

    const filteredCampaigns = useMemo(() => {
        const q = campaignSearch.toLowerCase()
        return campaigns.filter(c => (c.name || c.id).toLowerCase().includes(q))
    }, [campaigns, campaignSearch])

    const filteredAdSets = useMemo(() => {
        const q = adSetSearch.toLowerCase()
        return adSets.filter(a => (a.name || a.id).toLowerCase().includes(q))
    }, [adSets, adSetSearch])

    const toggleFeature = (adId, featureKey, turnOff) => {
        setPendingOff(prev => {
            const keys = new Set(prev[adId] || [])
            if (turnOff) keys.add(featureKey)
            else keys.delete(featureKey)
            const next = { ...prev }
            if (keys.size) next[adId] = [...keys]
            else delete next[adId]
            return next
        })
    }

    const toggleAllForAd = (ad, turnOff) => {
        setPendingOff(prev => {
            const next = { ...prev }
            if (turnOff && ad.enabledFeatures.length) next[ad.id] = [...ad.enabledFeatures]
            else delete next[ad.id]
            return next
        })
    }

    const pendingAdCount = Object.keys(pendingOff).length
    const pendingFeatureCount = Object.values(pendingOff).reduce((sum, keys) => sum + keys.length, 0)
    const loadedEnabledCount = ads.reduce((sum, ad) => sum + ad.enabledFeatures.length, 0)
    const loadedAdsWithEnhancements = ads.filter(ad => ad.enabledFeatures.length > 0).length

    // Apply results to the visible list and any cached tab lists.
    const updateAdEverywhere = (adId, patch) => {
        const apply = list => list.map(ad => (ad.id === adId ? { ...ad, ...patch } : ad))
        setAds(prev => apply(prev))
        for (const key of Object.keys(viewCacheRef.current)) {
            viewCacheRef.current[key] = { ...viewCacheRef.current[key], ads: apply(viewCacheRef.current[key].ads) }
        }
    }

    const applyUpdates = async (updates) => {
        if (!updates.length || isApplying) return
        setIsApplying(true)
        setConfirmBulk(false)
        setRowStatus(prev => ({
            ...prev,
            ...Object.fromEntries(updates.map(u => [u.adId, { state: "applying" }])),
        }))

        let succeeded = 0
        let failed = 0
        for (let i = 0; i < updates.length; i += APPLY_CHUNK) {
            const chunk = updates.slice(i, i + APPLY_CHUNK)
            let results
            try {
                const response = await axios.post(
                    `${API_BASE_URL}/api/analytics/creative-enhancements/apply`,
                    { adAccountId, updates: chunk },
                    { withCredentials: true }
                )
                results = response.data?.results || []
            } catch (err) {
                const message = err.response?.data?.error || err.message || "Request failed"
                results = chunk.map(u => ({ adId: u.adId, ok: false, error: message }))
            }

            for (const result of results) {
                if (result.ok) {
                    succeeded++
                    const update = chunk.find(u => u.adId === result.adId)
                    const ad = ads.find(a => a.id === result.adId)
                    const enabledFeatures = result.enabledFeatures
                        || (ad?.enabledFeatures || []).filter(key => !update?.turnOff.includes(key))
                    updateAdEverywhere(result.adId, {
                        enabledFeatures,
                        ...(result.newCreativeId && { creativeId: result.newCreativeId }),
                    })
                    setPendingOff(prev => {
                        const next = { ...prev }
                        delete next[result.adId]
                        return next
                    })
                    setRowStatus(prev => ({ ...prev, [result.adId]: { state: "done", warnings: result.warnings || [] } }))
                } else {
                    failed++
                    setRowStatus(prev => ({ ...prev, [result.adId]: { state: "error", error: result.error || "Update failed" } }))
                }
            }
        }

        setIsApplying(false)
        if (failed === 0) toast.success(`Updated ${succeeded} ${succeeded === 1 ? "ad" : "ads"}`)
        else toast.error(`Updated ${succeeded}, failed ${failed}. Hover a failed row for details.`)
    }

    const applyPending = () => {
        applyUpdates(Object.entries(pendingOff).map(([adId, turnOff]) => ({ adId, turnOff })))
    }

    const applyTurnOffAllLoaded = () => {
        const updates = ads
            .filter(ad => ad.enabledFeatures.length > 0)
            .map(ad => ({ adId: ad.id, turnOff: ad.enabledFeatures }))
        setPendingOff(prev => ({ ...prev, ...Object.fromEntries(updates.map(u => [u.adId, u.turnOff])) }))
        applyUpdates(updates)
    }

    const getDatePresetLabel = () => DATE_PRESETS.find(p => p.value === datePreset)?.label || "30 Days"

    const emptyMessage = viewMode === "search"
        ? "No matching ads have creative enhancements turned on"
        : viewMode === "adset"
            ? "No ads in this ad set have creative enhancements turned on"
            : "None of the top-spending ads have creative enhancements turned on"

    if (!open) return null

    return (
        <>
            <div
                style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", background: "rgba(15,17,21,0.55)", zIndex: 50 }}
            />
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ fontFamily: FONT }}
                onMouseDown={(e) => { backdropPressRef.current = e.target === e.currentTarget }}
                onClick={(e) => {
                    if (backdropPressRef.current && e.target === e.currentTarget) onOpenChange(false)
                    backdropPressRef.current = false
                }}
            >
                <div
                    className="w-full max-w-[1080px] h-[92vh] overflow-hidden flex flex-col"
                    style={{
                        background: PAPER,
                        borderRadius: 24,
                        border: `1px solid ${LINE}`,
                        animation: "enhancementsSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                >
                    {/* Sticky header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
                        <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-white border border-gray-200 shadow-xs">
                                <Sparkles className="w-[18px] h-[18px] text-gray-700" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-[16px] font-bold text-gray-900 truncate leading-tight">
                                    {adAccountName || "Creative Enhancements"}
                                </h2>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    Creative Enhancements · Turn off Advantage+ enhancements without changing anything else on the ad
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="w-9 h-9 rounded-[10px] bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Controls */}
                    <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0 bg-white space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <Tabs value={viewMode} onValueChange={handleViewModeChange}>
                                <TabsList className="rounded-full">
                                    <TabsTrigger value="list" className="rounded-full px-2.5" title="Top spending ads">
                                        <DollarSign className="h-4 w-4" />
                                    </TabsTrigger>
                                    <TabsTrigger value="search" className="rounded-full px-2.5" title="Search ads by name or ID">
                                        <Search className="h-4 w-4" />
                                    </TabsTrigger>
                                    <TabsTrigger value="adset" className="rounded-full px-2.5" title="Browse by campaign & ad set">
                                        <List className="h-4 w-4" />
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="rounded-2xl h-9 text-xs gap-1">
                                            Spend ({getDatePresetLabel()})
                                            <ChevronDown className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-white rounded-xl">
                                        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                                            Spend window
                                        </DropdownMenuLabel>
                                        {DATE_PRESETS.map((preset) => (
                                            <DropdownMenuItem
                                                key={preset.value}
                                                onClick={() => handleDatePresetChange(preset.value)}
                                                className={datePreset === preset.value ? "bg-gray-100" : ""}
                                            >
                                                {preset.label}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={refreshCurrentView}
                                    disabled={isLoading || isApplying}
                                    className="rounded-2xl h-9 text-xs gap-1.5"
                                >
                                    <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
                                    Refresh
                                </Button>
                            </div>
                        </div>

                        {viewMode === "search" && (
                            <div className="flex items-center gap-2">
                                <Input
                                    type="text"
                                    placeholder="Enter ad name or ID to search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") runSearch() }}
                                    className="flex-1 h-9 text-sm rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                                <Button
                                    size="sm"
                                    onClick={runSearch}
                                    disabled={isLoading || !searchQuery.trim()}
                                    className="px-4 h-9 bg-black text-white rounded-xl"
                                >
                                    {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                            </div>
                        )}

                        {viewMode === "adset" && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5 min-w-0">
                                    <Label className="text-xs text-gray-700">Campaign</Label>
                                    <SearchableCombobox
                                        open={openCampaign}
                                        onOpenChange={setOpenCampaign}
                                        disabled={campaignsLoading || campaigns.length === 0}
                                        loading={campaignsLoading}
                                        loadingLabel="Fetching campaigns..."
                                        triggerLabel={campaigns.length === 0
                                            ? "No campaigns available"
                                            : campaigns.find(c => c.id === campaignId)?.name || "Select a campaign"}
                                        placeholder="Search campaigns..."
                                        search={campaignSearch}
                                        onSearchChange={setCampaignSearch}
                                        emptyLabel="No campaigns found."
                                        items={filteredCampaigns}
                                        selectedId={campaignId}
                                        onSelect={handleCampaignChange}
                                    />
                                </div>
                                <div className="space-y-1.5 min-w-0">
                                    <Label className="text-xs text-gray-700">Ad set</Label>
                                    <SearchableCombobox
                                        open={openAdSet}
                                        onOpenChange={setOpenAdSet}
                                        disabled={!campaignId || adSetsLoading || adSets.length === 0}
                                        loading={adSetsLoading}
                                        loadingLabel="Fetching ad sets..."
                                        triggerLabel={!campaignId
                                            ? "Select a campaign first"
                                            : adSets.length === 0
                                                ? "No ad sets in this campaign"
                                                : adSets.find(a => a.id === adSetId)?.name || "Select an ad set"}
                                        placeholder="Search ad sets..."
                                        search={adSetSearch}
                                        onSearchChange={setAdSetSearch}
                                        emptyLabel="No ad sets found."
                                        items={filteredAdSets}
                                        selectedId={adSetId}
                                        onSelect={handleAdSetChange}
                                        renderMeta={(adset) => adset.totalAds != null && (
                                            <span className="text-xs text-gray-400 mr-1.5">
                                                ({adset.totalAds} {adset.totalAds === 1 ? "Ad" : "Ads"})
                                            </span>
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Body */}
                    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar min-h-0" style={{ padding: 24, background: PAPER_2 }}>
                        {isLoading && (
                            <div className="flex-1 flex flex-col items-center justify-center py-10">
                                <div style={{ marginBottom: 12 }}><Helix size="40" speed="2.5" color={BLUE} /></div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: INK_2, margin: 0 }}>
                                    {viewMode === "search" ? "Searching ads…" : "Reading creatives from Meta…"}
                                </p>
                                <p style={{ fontSize: 11.5, color: MUTED, marginTop: 4 }}>Only ads with enhancements turned on are shown</p>
                            </div>
                        )}

                        {error && !isLoading && (
                            <div style={{ background: PINK_SOFT, color: PINK_DEEP, fontSize: 13, borderRadius: 16, padding: "12px 16px" }}>
                                {error}
                                <button
                                    onClick={refreshCurrentView}
                                    style={{ marginLeft: 12, textDecoration: "underline", color: PINK_DEEP, fontWeight: 600, background: "transparent", border: 0, cursor: "pointer" }}
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {!isLoading && !error && viewMode === "adset" && !adSetId && (
                            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                                {campaignId ? "Select an ad set to view its ads" : "Select a campaign to get started"}
                            </div>
                        )}

                        {!isLoading && !error && viewMode === "search" && !hasFetched && (
                            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                                Search by ad name or paste an ad ID
                            </div>
                        )}

                        {!isLoading && !error && hasFetched && ads.length === 0 && (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500 text-sm">
                                {emptyMessage}
                                {viewMode === "list" && nextCursor && (
                                    <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => fetchAds({ mode: "list", cursor: nextCursor, preset: datePreset })} disabled={isLoadingMore}>
                                        {isLoadingMore ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                                        Check more ads
                                    </Button>
                                )}
                            </div>
                        )}

                        {!isLoading && ads.length > 0 && (
                            <TooltipProvider delayDuration={150}>
                                <div className="flex flex-col gap-2" style={{ animation: "enhancementsFadeIn 0.3s ease" }}>
                                    <p style={{ fontSize: 11.5, color: MUTED, margin: "0 0 4px" }}>
                                        {loadedAdsWithEnhancements} {loadedAdsWithEnhancements === 1 ? "ad" : "ads"} with {loadedEnabledCount} {loadedEnabledCount === 1 ? "enhancement" : "enhancements"} on.
                                        Ads that run from an existing post aren't shown.
                                    </p>

                                    {ads.map((ad) => {
                                        const status = rowStatus[ad.id]
                                        const pending = new Set(pendingOff[ad.id] || [])
                                        const rowBusy = status?.state === "applying"
                                        return (
                                            <div
                                                key={ad.id}
                                                className="rounded-2xl bg-white p-3"
                                                style={{ border: `1px solid ${pending.size ? BLUE : LINE}` }}
                                            >
                                                <div className="grid grid-cols-[48px_minmax(0,1fr)_140px_120px_80px] gap-x-8 items-center pr-1">
                                                    <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                                                        {ad.thumbnail ? (
                                                            <img
                                                                src={ad.thumbnail}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { e.currentTarget.style.display = "none" }}
                                                            />
                                                        ) : (
                                                            <ImageOff className="h-5 w-5 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <p className="text-sm font-semibold truncate" style={{ color: INK, margin: 0 }}>
                                                                        {truncateText(ad.name || ad.id, 70)}
                                                                    </p>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="max-w-[360px] break-words text-xs">{ad.name || ad.id}</TooltipContent>
                                                            </Tooltip>
                                                            <a
                                                                href={buildAdsManagerAdUrl(adAccountId, businessId, ad.id)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex-shrink-0 text-gray-400 hover:text-blue-500 transition-colors"
                                                                aria-label="Open in Ads Manager"
                                                                title="Open in Ads Manager"
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </a>
                                                        </div>
                                                        <p className="text-[11.5px] truncate" style={{ color: MUTED, margin: "2px 0 0" }}>
                                                            {ad.adsetName || "—"} · {FORMAT_LABELS[ad.format] || ad.format} · Created {formatDate(ad.createdTime)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-medium tabular-nums" style={{ color: INK, margin: 0 }}>{formatSpend(ad.spend)}</p>
                                                        <p className="text-[10.5px]" style={{ color: MUTED, margin: 0 }}>Spend ({getDatePresetLabel()})</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <StatusPill status={ad.effectiveStatus} />
                                                    </div>
                                                    <label
                                                        className={cn(
                                                            "flex items-center justify-end gap-1.5 text-[11px] font-medium text-gray-500",
                                                            ad.enabledFeatures.length && !rowBusy && !isApplying ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
                                                        )}
                                                        title="Turn every enhancement on this ad off or back on"
                                                    >
                                                        All
                                                        <Switch
                                                            checked={ad.enabledFeatures.some(key => !pending.has(key))}
                                                            disabled={!ad.enabledFeatures.length || rowBusy || isApplying}
                                                            onCheckedChange={(checked) => toggleAllForAd(ad, !checked)}
                                                            className="scale-75"
                                                        />
                                                    </label>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-3 pl-[80px]">
                                                    {ad.enabledFeatures.length === 0 ? (
                                                        <span className="text-[11.5px] font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                                                            All off
                                                        </span>
                                                    ) : (
                                                        ad.enabledFeatures.map((featureKey) => (
                                                            <EnhancementChip
                                                                key={featureKey}
                                                                featureKey={featureKey}
                                                                pending={pending.has(featureKey)}
                                                                disabled={rowBusy || isApplying}
                                                                onToggle={(key, turnOff) => toggleFeature(ad.id, key, turnOff)}
                                                            />
                                                        ))
                                                    )}
                                                    {status && (
                                                        <span className="ml-auto pl-3">
                                                            <RowStatus status={status} />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {viewMode === "list" && nextCursor && (
                                        <Button
                                            variant="outline"
                                            className="w-full rounded-2xl mt-1"
                                            onClick={() => fetchAds({ mode: "list", cursor: nextCursor, preset: datePreset })}
                                            disabled={isLoadingMore}
                                        >
                                            {isLoadingMore ? (
                                                <><Loader className="h-4 w-4 mr-2 animate-spin" />Loading...</>
                                            ) : (
                                                <><ChevronDown className="h-4 w-4 mr-2" />Load more ads</>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </TooltipProvider>
                        )}
                    </div>

                    {/* Footer */}
                    {ads.length > 0 && (
                        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0 bg-white">
                            {confirmBulk ? (
                                <>
                                    <p className="text-sm" style={{ color: INK_2, margin: 0 }}>
                                        Turn off all {loadedEnabledCount} {loadedEnabledCount === 1 ? "enhancement" : "enhancements"} on {loadedAdsWithEnhancements} loaded {loadedAdsWithEnhancements === 1 ? "ad" : "ads"}? Each ad gets a new creative with everything else copied over.
                                    </p>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button variant="outline" size="sm" className="rounded-2xl h-9" onClick={() => setConfirmBulk(false)}>
                                            Cancel
                                        </Button>
                                        <Button size="sm" className="rounded-2xl h-9 bg-red-600 text-white hover:bg-red-700" onClick={applyTurnOffAllLoaded}>
                                            Turn off all
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {pendingFeatureCount ? (
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[11px] font-semibold flex-shrink-0">
                                                <AlertTriangle className="h-3 w-3" />
                                                Not applied
                                            </span>
                                            <p className="text-sm font-semibold truncate" style={{ color: INK_2, margin: 0 }}>
                                                {pendingFeatureCount} {pendingFeatureCount === 1 ? "change" : "changes"} on {pendingAdCount} {pendingAdCount === 1 ? "ad" : "ads"}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm" style={{ color: MUTED, margin: 0 }}>
                                            Switch an enhancement off to queue a change
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button
                                            size="sm"
                                            className="rounded-2xl h-9 bg-red-600 text-white hover:bg-red-700"
                                            onClick={() => setConfirmBulk(true)}
                                            disabled={isApplying || loadedEnabledCount === 0}
                                        >
                                            Turn off all on loaded ads
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="rounded-2xl h-9 bg-black text-white"
                                            onClick={applyPending}
                                            disabled={isApplying || pendingFeatureCount === 0}
                                        >
                                            {isApplying && <Loader className="h-4 w-4 mr-2 animate-spin" />}
                                            Apply changes
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes enhancementsSlideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes enhancementsFadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    )
}
