"use client"

/* eslint-disable react/prop-types */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { Image as ImageIcon, ExternalLink, TrendingUp, SlidersHorizontal, X, Info } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { SearchableCombobox, sortCampaignsActiveFirst } from "./CreativeEnhancementsReport"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

const BLUE = "#3b82f6"

const DAY_OPTIONS = ["7", "14", "30"]

// Units match what the server compares: CPC in account currency, ROAS as a
// multiple, CTRs in percent, video views as a count of 3-second views.
const METRIC_FILTERS = [
    { key: "cpc", label: "CPC (link)", unit: "$", step: "0.01" },
    { key: "roas", label: "ROAS", unit: "x", step: "0.1" },
    { key: "ctr", label: "CTR (link)", unit: "%", step: "0.1" },
    { key: "outboundCtr", label: "Outbound CTR", unit: "%", step: "0.1" },
    { key: "videoViews", label: "3s video views", unit: "", step: "1" },
]

const EMPTY_FILTERS = {
    days: "7",
    campaignId: "",
    adsetId: "",
    ...Object.fromEntries(METRIC_FILTERS.flatMap(f => [[`${f.key}Min`, ""], [`${f.key}Max`, ""]])),
}

// video_play_curve_actions bins: seconds 0–14, then widening ranges.
const RETENTION_LABELS = [
    ...Array.from({ length: 15 }, (_, i) => `${i}s`),
    "15–20s", "20–25s", "25–30s", "30–40s", "40–50s", "50–60s", "60s+",
]

const METRIC_HINTS = {
    cpc: "Cost per link click",
    ctr: "Link click-through rate",
    outboundCtr: "Outbound clicks ÷ impressions",
    cvrOutbound: "Conversions ÷ outbound clicks",
    cvrLandingPage: "Conversions ÷ landing-page views",
    hookRate: "3-second video views ÷ impressions",
    holdRate: "ThruPlays ÷ 3-second video views. A ThruPlay is a play to the end, or at least 15 seconds on longer videos.",
    videoViews3s: "Video plays of at least 3 seconds",
    watch: "Average time a video was played",
}

function formatSpend(v) {
    if (v == null) return "—"
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(0)}`
}

function formatMoney(v) {
    return v == null ? "—" : `$${v.toFixed(2)}`
}

function formatPct(v, digits = 2) {
    return v == null ? "—" : `${v.toFixed(digits)}%`
}

function formatRoas(v) {
    if (v == null) return "—"
    return `${v.toFixed(2)}x`
}

function formatCount(v) {
    if (v == null) return "—"
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
    return String(Math.round(v))
}

function formatWatchTime(seconds) {
    if (seconds == null) return "—"
    const s = Math.round(seconds)
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const rem = s % 60
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

function activeFilterCount(filters) {
    let count = 0
    if (filters.days !== "7") count++
    if (filters.campaignId || filters.adsetId) count++
    for (const f of METRIC_FILTERS) {
        if (filters[`${f.key}Min`] !== "" || filters[`${f.key}Max`] !== "") count++
    }
    return count
}

function DeltaBadge({ delta }) {
    if (delta === null || delta === undefined) {
        return (
            <span className="ml-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                New
            </span>
        )
    }
    const positive = delta >= 0
    const label = `${positive ? "+" : ""}${Math.round(delta)}%`
    return (
        <span
            className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500",
            )}
        >
            {label}
        </span>
    )
}

function Thumbnail({ url, name, href }) {
    const [errored, setErrored] = useState(false)
    const content = url && !errored ? (
        <img
            src={url}
            alt={name}
            className="h-[104px] w-[104px] flex-shrink-0 rounded-2xl object-cover"
            onError={() => setErrored(true)}
        />
    ) : (
        <div className="flex h-[104px] w-[104px] flex-shrink-0 items-center justify-center rounded-2xl bg-gray-100">
            <ImageIcon className="h-6 w-6 text-gray-300" />
        </div>
    )
    if (!href) return content
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 transition-opacity hover:opacity-90">
            {content}
        </a>
    )
}

function TruncatedWithTooltip({ text, max, className, tooltipSide = "top" }) {
    if (!text) return null
    const truncated = text.length > max ? `${text.slice(0, max)}…` : text
    if (text.length <= max) {
        return <span className={className}>{text}</span>
    }
    return (
        <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
                <span className={cn(className, "cursor-default")}>{truncated}</span>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} className="max-w-xs break-words">
                {text}
            </TooltipContent>
        </Tooltip>
    )
}

function MetricCell({ label, value, hint, muted }) {
    return (
        <div className="min-w-0">
            <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                <span className="truncate">{label}</span>
                {hint && (
                    <Tooltip delayDuration={150}>
                        <TooltipTrigger asChild>
                            <Info className="h-3 w-3 flex-shrink-0 cursor-default text-gray-300" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px] text-xs normal-case">{hint}</TooltipContent>
                    </Tooltip>
                )}
            </div>
            <div className={cn("mt-0.5 text-sm font-medium", muted ? "text-gray-300" : "text-gray-800")}>{value}</div>
        </div>
    )
}

function PanelTitle({ children, hint }) {
    return (
        <div className="mb-2 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
            {children}
            {hint && (
                <Tooltip delayDuration={150}>
                    <TooltipTrigger asChild>
                        <Info className="h-3 w-3 cursor-default text-gray-300" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px] text-xs normal-case">{hint}</TooltipContent>
                </Tooltip>
            )}
        </div>
    )
}

function EmptyPanel({ children }) {
    return (
        <div className="flex h-[96px] items-center justify-center rounded-xl bg-gray-50 text-xs text-gray-400">
            {children}
        </div>
    )
}

function RetentionTooltip({ active, payload }) {
    if (!active || !payload?.length) return null
    const point = payload[0].payload
    return (
        <div className="rounded-lg border border-gray-100 bg-white px-2.5 py-1.5 text-xs shadow-sm">
            <div className="text-gray-500">{point.label}</div>
            <div className="font-medium text-gray-800">{point.value.toFixed(0)}% of plays</div>
        </div>
    )
}

function RetentionChart({ values }) {
    // Bins past the video's end come back as 0 — drop the trailing run.
    const data = useMemo(() => {
        if (!values?.length) return []
        let end = values.length
        while (end > 1 && !values[end - 1]) end--
        return values.slice(0, end).map((value, i) => ({ label: RETENTION_LABELS[i] || `${i}`, value }))
    }, [values])

    if (data.length < 2) return <EmptyPanel>No retention data</EmptyPanel>

    return (
        <div className="h-[96px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="trendingRetentionFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={BLUE} stopOpacity={0.18} />
                            <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={18}
                    />
                    <YAxis domain={[0, 100]} hide />
                    <ChartTooltip content={<RetentionTooltip />} cursor={{ stroke: "#d1d5db", strokeWidth: 1 }} />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={BLUE}
                        strokeWidth={2}
                        fill="url(#trendingRetentionFill)"
                        activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

function AgeBars({ rows }) {
    if (!rows?.length) return <EmptyPanel>No age data</EmptyPanel>
    const max = Math.max(...rows.map(r => r.pct), 1)
    return (
        <div className="flex h-[96px] items-end gap-1.5">
            {rows.map(row => (
                <Tooltip key={row.age} delayDuration={100}>
                    <TooltipTrigger asChild>
                        <div className="flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end gap-1">
                            <span className="text-[10px] font-medium text-gray-600">{Math.round(row.pct)}%</span>
                            <div
                                className="w-full rounded-t bg-blue-500/80 transition-colors hover:bg-blue-500"
                                style={{ height: `${Math.max((row.pct / max) * 52, 2)}px` }}
                            />
                            <span className="w-full truncate text-center text-[9px] text-gray-400">{row.age}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                        {row.age}: {row.pct.toFixed(1)}% · {formatCount(row.impressions)} impressions
                    </TooltipContent>
                </Tooltip>
            ))}
        </div>
    )
}

function AdRow({ ad, isRoasMode }) {
    const isVideo = ad.videoViews3s != null
    const videoValue = (formatted) => (isVideo ? formatted : "N/A")
    const metrics = [
        { label: "CPA", value: ad.cpa != null ? `$${Math.round(ad.cpa)}` : "—" },
        ...(isRoasMode ? [{ label: "ROAS", value: formatRoas(ad.roas) }] : []),
        { label: "CPC", value: formatMoney(ad.cpc), hint: METRIC_HINTS.cpc },
        { label: "CTR", value: formatPct(ad.ctr), hint: METRIC_HINTS.ctr },
        { label: "Outbound CTR", value: formatPct(ad.outboundCtr), hint: METRIC_HINTS.outboundCtr },
        { label: "CVR", value: formatPct(ad.cvrOutbound), hint: METRIC_HINTS.cvrOutbound },
        { label: "CVR (LPV)", value: formatPct(ad.cvrLandingPage), hint: METRIC_HINTS.cvrLandingPage },
        { label: "Hook rate", value: videoValue(formatPct(ad.hookRate, 1)), hint: METRIC_HINTS.hookRate, muted: !isVideo },
        { label: "3s → ThruPlay", value: videoValue(formatPct(ad.holdRate, 1)), hint: METRIC_HINTS.holdRate, muted: !isVideo },
        { label: "3s views", value: videoValue(formatCount(ad.videoViews3s)), hint: METRIC_HINTS.videoViews3s, muted: !isVideo },
        { label: "Avg watch", value: videoValue(formatWatchTime(ad.videoAvgWatchTime)), hint: METRIC_HINTS.watch, muted: !isVideo },
    ]

    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 p-4 transition-colors hover:border-gray-200 xl:flex-row">
            <div className="flex min-w-0 gap-4 xl:w-[55%]">
                <Thumbnail url={ad.thumbnailUrl} name={ad.adName} href={ad.postUrl} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <TruncatedWithTooltip
                                    text={ad.adName}
                                    max={48}
                                    className="text-sm font-semibold leading-tight text-gray-900"
                                />
                                {ad.postUrl && (
                                    <a
                                        href={ad.postUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-shrink-0 text-gray-400 transition-colors hover:text-blue-600"
                                        title="Open ad on Facebook"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                )}
                            </div>
                            <div className="mt-0.5 max-w-[320px]">
                                <TruncatedWithTooltip
                                    text={[ad.campaignName, ad.adsetName].filter(Boolean).join(" › ")}
                                    max={52}
                                    className="text-xs leading-tight text-gray-400"
                                />
                            </div>
                        </div>
                        <div className="flex-shrink-0 whitespace-nowrap text-right">
                            <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Spend</div>
                            <div className="text-sm font-semibold text-gray-900">
                                {formatSpend(ad.currentSpend)}
                                <DeltaBadge delta={ad.spendDelta} />
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-2.5 sm:grid-cols-4 lg:grid-cols-6">
                        {metrics.map(m => <MetricCell key={m.label} {...m} />)}
                    </div>
                </div>
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                    <PanelTitle hint="Share of video plays still watching at each point. Later points cover wider time ranges.">
                        Retention
                    </PanelTitle>
                    {isVideo ? <RetentionChart values={ad.retention} /> : <EmptyPanel>Not a video ad</EmptyPanel>}
                </div>
                <div className="min-w-0">
                    <PanelTitle hint="Share of impressions by age band. Meta estimates these values.">
                        Viewer age
                    </PanelTitle>
                    <AgeBars rows={ad.ageBreakdown} />
                </div>
            </div>
        </div>
    )
}

function FilterPanel({ adAccountId, applied, onApply, onClose }) {
    const [draft, setDraft] = useState(applied)
    const [campaigns, setCampaigns] = useState([])
    const [campaignsLoading, setCampaignsLoading] = useState(false)
    const [adSets, setAdSets] = useState([])
    const [adSetsLoading, setAdSetsLoading] = useState(false)
    const [openCampaign, setOpenCampaign] = useState(false)
    const [campaignSearch, setCampaignSearch] = useState("")
    const [openAdSet, setOpenAdSet] = useState(false)
    const [adSetSearch, setAdSetSearch] = useState("")

    const fetchAdSets = useCallback(async (campaignId) => {
        setAdSetsLoading(true)
        try {
            const res = await fetch(`${API_BASE_URL}/auth/fetch-adsets?campaignId=${campaignId}`, { credentials: "include" })
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

    useEffect(() => {
        let cancelled = false
        setCampaignsLoading(true)
        fetch(`${API_BASE_URL}/auth/fetch-campaigns?adAccountId=${adAccountId}`, { credentials: "include" })
            .then(r => r.json())
            .then(data => { if (!cancelled) setCampaigns(sortCampaignsActiveFirst(data.campaigns || [])) })
            .catch(err => {
                console.error("Failed to fetch campaigns:", err)
                if (!cancelled) toast.error("Failed to fetch campaigns")
            })
            .finally(() => { if (!cancelled) setCampaignsLoading(false) })
        if (applied.campaignId) fetchAdSets(applied.campaignId)
        return () => { cancelled = true }
    }, [adAccountId, applied.campaignId, fetchAdSets])

    const set = (key, value) => setDraft(prev => ({ ...prev, [key]: value }))

    const handleCampaignChange = (id) => {
        setDraft(prev => ({ ...prev, campaignId: id, adsetId: "" }))
        setAdSets([])
        setAdSetSearch("")
        setOpenCampaign(false)
        fetchAdSets(id)
    }

    const filteredCampaigns = useMemo(() => {
        const q = campaignSearch.toLowerCase()
        return campaigns.filter(c => (c.name || c.id).toLowerCase().includes(q))
    }, [campaigns, campaignSearch])

    const filteredAdSets = useMemo(() => {
        const q = adSetSearch.toLowerCase()
        return adSets.filter(a => (a.name || a.id).toLowerCase().includes(q))
    }, [adSets, adSetSearch])

    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label className="text-xs text-gray-700">Date range</Label>
                <div className="inline-flex rounded-full bg-gray-100 p-0.5">
                    {DAY_OPTIONS.map(d => (
                        <button
                            key={d}
                            type="button"
                            onClick={() => set("days", d)}
                            className={cn(
                                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                                draft.days === d ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800",
                            )}
                        >
                            Last {d}d
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-700">Campaign</Label>
                        {draft.campaignId && (
                            <button
                                type="button"
                                className="text-[11px] text-gray-400 hover:text-gray-700"
                                onClick={() => { setDraft(prev => ({ ...prev, campaignId: "", adsetId: "" })); setAdSets([]) }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <SearchableCombobox
                        open={openCampaign}
                        onOpenChange={setOpenCampaign}
                        disabled={campaignsLoading || campaigns.length === 0}
                        loading={campaignsLoading}
                        loadingLabel="Fetching campaigns..."
                        triggerLabel={campaigns.length === 0
                            ? "No campaigns available"
                            : campaigns.find(c => c.id === draft.campaignId)?.name || "All campaigns"}
                        placeholder="Search campaigns..."
                        search={campaignSearch}
                        onSearchChange={setCampaignSearch}
                        emptyLabel="No campaigns found."
                        items={filteredCampaigns}
                        selectedId={draft.campaignId}
                        onSelect={handleCampaignChange}
                    />
                </div>
                <div className="min-w-0 space-y-1.5">
                    <Label className="text-xs text-gray-700">Ad set</Label>
                    <SearchableCombobox
                        open={openAdSet}
                        onOpenChange={setOpenAdSet}
                        disabled={!draft.campaignId || adSetsLoading || adSets.length === 0}
                        loading={adSetsLoading}
                        loadingLabel="Fetching ad sets..."
                        triggerLabel={!draft.campaignId
                            ? "Select a campaign first"
                            : adSets.length === 0
                                ? "No ad sets in this campaign"
                                : adSets.find(a => a.id === draft.adsetId)?.name || "All ad sets"}
                        placeholder="Search ad sets..."
                        search={adSetSearch}
                        onSearchChange={setAdSetSearch}
                        emptyLabel="No ad sets found."
                        items={filteredAdSets}
                        selectedId={draft.adsetId}
                        onSelect={(id) => { set("adsetId", id); setOpenAdSet(false) }}
                        renderMeta={(adset) => adset.totalAds != null && (
                            <span className="mr-1.5 text-xs text-gray-400">
                                ({adset.totalAds} {adset.totalAds === 1 ? "Ad" : "Ads"})
                            </span>
                        )}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_96px_96px] gap-2 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                    <span>Metric</span>
                    <span>Min</span>
                    <span>Max</span>
                </div>
                {METRIC_FILTERS.map(f => (
                    <div key={f.key} className="grid grid-cols-[1fr_96px_96px] items-center gap-2">
                        <span className="text-sm text-gray-700">
                            {f.label}
                            {f.unit && <span className="ml-1 text-xs text-gray-400">({f.unit})</span>}
                        </span>
                        {["Min", "Max"].map(bound => (
                            <Input
                                key={bound}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step={f.step}
                                placeholder="Any"
                                value={draft[`${f.key}${bound}`]}
                                onChange={(e) => set(`${f.key}${bound}`, e.target.value)}
                                className="h-8 rounded-xl text-sm"
                            />
                        ))}
                    </div>
                ))}
                <p className="pt-1 text-[11px] text-gray-400">
                    Ads without data for a filtered metric (e.g. image ads for video views) are left out.
                </p>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <button
                    type="button"
                    className="text-xs font-medium text-gray-500 hover:text-gray-800"
                    onClick={() => setDraft(EMPTY_FILTERS)}
                >
                    Reset
                </button>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={onClose}>Cancel</Button>
                    <Button size="sm" className="rounded-xl" onClick={() => onApply(draft)}>Search</Button>
                </div>
            </div>
        </div>
    )
}

export default function TrendingCreative({ adAccountId, conversionEvent, mode = "cpr", refreshKey, waiting = false, className }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [filters, setFilters] = useState(EMPTY_FILTERS)
    const [filterOpen, setFilterOpen] = useState(false)
    const isRoasMode = mode === "roas"
    const filterCount = activeFilterCount(filters)

    // Session-scoped response cache. Keyed by accountId + conversionEvent +
    // filters + refreshKey — includes refreshKey so the user's manual refresh
    // (which bumps chartsRefreshKey in AnalyticsDashboard) automatically lands
    // on a fresh cache key and bypasses any stale entry. Mirrors the useRef-map
    // pattern used elsewhere in AnalyticsDashboard (recsCacheRef, etc.).
    const cacheRef = useRef({})

    // Filters belong to one ad account.
    useEffect(() => { setFilters(EMPTY_FILTERS) }, [adAccountId])

    useEffect(() => {
        if (!adAccountId) { setData(null); return }
        // Render the shell immediately; fetch once the conversion event is known.
        if (waiting) { setData(null); setLoading(true); setError(null); return }
        const activeFilters = Object.fromEntries(
            Object.entries(filters).filter(([key, value]) => value !== "" && !(key === "days" && value === "7")),
        )
        const cacheKey = `${adAccountId}::${mode}::${conversionEvent || "__auto__"}::${JSON.stringify(activeFilters)}::${refreshKey || 0}`

        // Cache hit — render instantly, no Helix.
        if (cacheRef.current[cacheKey]) {
            setData(cacheRef.current[cacheKey])
            setLoading(false)
            setError(null)
            return
        }

        let cancelled = false
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({ adAccountId, mode, ...activeFilters })
        if (conversionEvent) params.set("conversionEvent", conversionEvent)
        if (refreshKey) params.set("rk", String(refreshKey))

        fetch(`${API_BASE_URL}/api/analytics/trending-creative?${params}`, {
            credentials: "include",
            cache: "no-store",
        })
            .then(r => r.json().then(body => ({ ok: r.ok, body })))
            .then(({ ok, body }) => {
                if (cancelled) return
                if (!ok) throw new Error(body.error || "Failed to load")
                cacheRef.current[cacheKey] = body
                setData(body)
            })
            .catch(err => { if (!cancelled) setError(err.message || "Error loading data") })
            .finally(() => { if (!cancelled) setLoading(false) })

        return () => { cancelled = true }
    }, [adAccountId, conversionEvent, mode, refreshKey, waiting, filters])

    const isSearch = data?.mode === "search"
    const days = data?.window?.days || Number(filters.days)
    const subtitle = isSearch
        ? `${data.ads.length}${data.totalMatches > data.ads.length ? ` of ${data.totalMatches}` : ""} matching ads in the last ${days} days, sorted by spend. Spend change is vs the ${days} days before.`
        : "Ads with >35% spend growth over the last 7 days vs the prior 7 days."

    return (
        <TooltipProvider delayDuration={150}>
            <Card className={cn("rounded-3xl border-gray-200", className)}>
                <CardContent className="p-6">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
                        <div className="min-w-0">
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                                {filterCount > 0 ? "Creative Search" : "Trending Creatives"}
                                {data?.ads?.length > 0 && (
                                    <span className="text-base font-normal text-gray-400">({data.ads.length})</span>
                                )}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {filterCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-xl text-gray-500"
                                    onClick={() => setFilters(EMPTY_FILTERS)}
                                >
                                    <X className="mr-1 h-3.5 w-3.5" />
                                    Clear filters
                                </Button>
                            )}
                            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!adAccountId}
                                        className={cn("rounded-xl", filterCount > 0 && "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50")}
                                    >
                                        <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                                        Filter
                                        {filterCount > 0 && (
                                            <span className="ml-1.5 rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
                                                {filterCount}
                                            </span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    align="end"
                                    sideOffset={6}
                                    className="w-[460px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-4 shadow-lg"
                                >
                                    {filterOpen && (
                                        <FilterPanel
                                            adAccountId={adAccountId}
                                            applied={filters}
                                            onApply={(next) => { setFilters(next); setFilterOpen(false) }}
                                            onClose={() => setFilterOpen(false)}
                                        />
                                    )}
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex h-[200px] flex-col items-center justify-center gap-3">
                            <Helix size="36" speed="2.5" color={BLUE} />
                            {filterCount > 0 && <p className="text-xs text-gray-400">Searching ads in this account…</p>}
                        </div>
                    ) : error ? (
                        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                    ) : !data || data.ads.length === 0 ? (
                        <div className="flex h-[160px] items-center justify-center text-sm text-gray-400">
                            {filterCount > 0 ? "No ads match these filters" : "No trending creatives in the last 7 days"}
                        </div>
                    ) : (
                        <div className="custom-scrollbar space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "75vh" }}>
                            {data.ads.map(ad => <AdRow key={ad.adId} ad={ad} isRoasMode={isRoasMode} />)}
                        </div>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
