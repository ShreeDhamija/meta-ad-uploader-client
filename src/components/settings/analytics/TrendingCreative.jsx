"use client"

/* eslint-disable react/prop-types */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import {
    Image as ImageIcon, ExternalLink, TrendingUp, SlidersHorizontal, XCircle, Info, RotateCcw,
    Columns3, Table2, LayoutGrid, ArrowDown, ArrowUp,
} from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { SearchableCombobox, sortCampaignsActiveFirst } from "./CreativeEnhancementsReport"
import { InlineThresholdApply, InlineThresholdInput, useThresholdDraft } from "./InlineThreshold"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

const BLUE = "#3b82f6"

const DAY_OPTIONS = ["7", "14", "30"]

// Units match what the server compares: CPC in account currency, ROAS as a
// multiple, CTRs in percent. ROAS only applies in ROAS mode.
const METRIC_FILTERS = [
    { key: "cpc", label: "CPC", unit: "$" },
    { key: "roas", label: "ROAS", unit: "x", roasOnly: true },
    { key: "ctr", label: "CTR", unit: "%" },
    { key: "outboundCtr", label: "Outbound CTR", unit: "%" },
]

// 3s video views slider stops. The last stop means "no upper limit" (100k+);
// the first means "no lower limit".
const VIEW_STEPS = [0, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]
const VIEW_MAX_INDEX = VIEW_STEPS.length - 1

const EMPTY_FILTERS = {
    days: "7",
    campaignId: "",
    adsetId: "",
    ...Object.fromEntries(METRIC_FILTERS.flatMap(f => [[`${f.key}Min`, ""], [`${f.key}Max`, ""]])),
    videoViewsMin: "",
    videoViewsMax: "",
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
    videoAvgWatchTime: "Average time a video was played",
    retention: "Share of video plays still watching at each point. Later points cover wider time ranges.",
    ageBreakdown: "Share of impressions by age band. Meta estimates these values.",
}

const STORAGE_KEYS = { hidden: "blip.trendingCreatives.hiddenColumns", view: "blip.trendingCreatives.view" }

function readStored(key, fallback) {
    try {
        const raw = window.localStorage.getItem(key)
        return raw == null ? fallback : JSON.parse(raw)
    } catch {
        return fallback
    }
}

function writeStored(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
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
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`
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

const isVideoAd = (ad) => ad.videoViews3s != null || ad.thruplays != null || ad.videoAvgWatchTime != null || (ad.retention?.length > 0)

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

// Table / grid columns. `best` is the direction a column sorts in on first
// click (best first); chart columns don't sort. Video columns are dropped when
// no ad in the results has video data, and show "—" on image ads.
const COLUMNS = [
    { key: "spend", label: "Spend", best: "desc", value: a => a.currentSpend, render: a => <>{formatSpend(a.currentSpend)}<DeltaBadge delta={a.spendDelta} /></> },
    { key: "cpa", label: "CPA", best: "asc", value: a => a.cpa, render: a => (a.cpa != null ? `$${Math.round(a.cpa)}` : "—") },
    { key: "roas", label: "ROAS", best: "desc", roasOnly: true, value: a => a.roas, render: a => formatRoas(a.roas) },
    { key: "cpc", label: "CPC", best: "asc", value: a => a.cpc, render: a => formatMoney(a.cpc) },
    { key: "ctr", label: "CTR", best: "desc", value: a => a.ctr, render: a => formatPct(a.ctr) },
    { key: "outboundCtr", label: "Outbound CTR", best: "desc", value: a => a.outboundCtr, render: a => formatPct(a.outboundCtr) },
    { key: "cvrOutbound", label: "CVR", best: "desc", value: a => a.cvrOutbound, render: a => formatPct(a.cvrOutbound) },
    { key: "cvrLandingPage", label: "CVR (LPV)", best: "desc", value: a => a.cvrLandingPage, render: a => formatPct(a.cvrLandingPage) },
    { key: "hookRate", label: "Hook rate", best: "desc", video: true, value: a => a.hookRate, render: a => formatPct(a.hookRate, 1) },
    { key: "holdRate", label: "3s → ThruPlay", best: "desc", video: true, value: a => a.holdRate, render: a => formatPct(a.holdRate, 1) },
    { key: "videoViews3s", label: "3s views", best: "desc", video: true, value: a => a.videoViews3s, render: a => formatCount(a.videoViews3s) },
    { key: "videoAvgWatchTime", label: "Avg watch", best: "desc", video: true, value: a => a.videoAvgWatchTime, render: a => formatWatchTime(a.videoAvgWatchTime) },
    { key: "retention", label: "Retention", chart: true, video: true },
    { key: "ageBreakdown", label: "Viewer age", chart: true },
]
const COLUMN_BY_KEY = Object.fromEntries(COLUMNS.map(c => [c.key, c]))

// Missing values always sort last; ties go to spend.
function sortAds(ads, sort) {
    const column = COLUMN_BY_KEY[sort.key]
    if (!column?.value) return ads
    const sign = sort.dir === "asc" ? 1 : -1
    return [...ads].sort((a, b) => {
        const av = column.value(a)
        const bv = column.value(b)
        if (av == null && bv == null) return b.currentSpend - a.currentSpend
        if (av == null) return 1
        if (bv == null) return -1
        return (av - bv) * sign || b.currentSpend - a.currentSpend
    })
}

function Thumbnail({ url, name, href, className }) {
    const [errored, setErrored] = useState(false)
    const content = url && !errored ? (
        <img src={url} alt={name} className={cn("flex-shrink-0 object-cover", className)} onError={() => setErrored(true)} />
    ) : (
        <div className={cn("flex flex-shrink-0 items-center justify-center bg-gray-100", className)}>
            <ImageIcon className="h-6 w-6 text-gray-300" />
        </div>
    )
    if (!href) return content
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block flex-shrink-0 transition-opacity hover:opacity-90">
            {content}
        </a>
    )
}

// Shows the full text in a tooltip only when it's cut off.
function OverflowText({ text, className }) {
    const ref = useRef(null)
    const [open, setOpen] = useState(false)
    if (!text) return null
    return (
        <Tooltip open={open} onOpenChange={(next) => setOpen(next && !!ref.current && ref.current.scrollWidth > ref.current.clientWidth)}>
            <TooltipTrigger asChild>
                <span ref={ref} className={cn("block truncate", className)}>{text}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs break-words">{text}</TooltipContent>
        </Tooltip>
    )
}

function HintIcon({ hint }) {
    if (!hint) return null
    return (
        <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
                <Info className="h-3 w-3 flex-shrink-0 cursor-default text-gray-300" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px] text-xs normal-case">{hint}</TooltipContent>
        </Tooltip>
    )
}

function SortHeader({ column, sort, onSort }) {
    const active = sort.key === column.key
    const bestFirst = active && sort.dir === column.best
    return (
        <span className="inline-flex items-center gap-1">
            <button
                type="button"
                onClick={() => onSort(column.key)}
                className={cn("group inline-flex items-center gap-1 transition-colors hover:text-gray-800", active && "text-gray-800")}
            >
                {column.label}
                {active
                    ? (bestFirst
                        ? <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
                        : <ArrowUp className="h-3.5 w-3.5 text-blue-600" />)
                    // Hidden with opacity, not removed, so the header width doesn't shift on hover.
                    : <ArrowDown className="h-3.5 w-3.5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />}
            </button>
            <HintIcon hint={METRIC_HINTS[column.key]} />
        </span>
    )
}

function EmptyPanel({ children, height }) {
    return (
        <div className="flex items-center justify-center rounded-xl bg-gray-50 text-xs text-gray-400" style={{ height }}>
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

function RetentionChart({ values, height = 96, compact = false }) {
    // Bins past the video's end come back as 0 — drop the trailing run.
    const data = useMemo(() => {
        if (!values?.length) return []
        let end = values.length
        while (end > 1 && !values[end - 1]) end--
        return values.slice(0, end).map((value, i) => ({ label: RETENTION_LABELS[i] || `${i}`, value }))
    }, [values])

    if (data.length < 2) return <EmptyPanel height={height}>No retention data</EmptyPanel>

    return (
        <div className="w-full" style={{ height }}>
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
                        hide={compact}
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

function AgeBars({ rows, height = 96, compact = false }) {
    if (!rows?.length) return <EmptyPanel height={height}>No age data</EmptyPanel>
    const max = Math.max(...rows.map(r => r.pct), 1)
    const barMax = height - (compact ? 30 : 44)
    return (
        <div className="flex items-end gap-1" style={{ height }}>
            {rows.map(row => (
                <Tooltip key={row.age} delayDuration={100}>
                    <TooltipTrigger asChild>
                        <div className="flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end gap-0.5">
                            {!compact && <span className="text-[10px] font-medium text-gray-600">{Math.round(row.pct)}%</span>}
                            <div
                                className="w-full rounded-t bg-blue-500/80 transition-colors hover:bg-blue-500"
                                style={{ height: `${Math.max((row.pct / max) * barMax, 2)}px` }}
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

function AdNameCell({ ad }) {
    return (
        <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
                <OverflowText text={ad.adName} className="min-w-0 text-sm font-semibold leading-tight text-gray-900" />
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
            <OverflowText
                text={[ad.campaignName, ad.adsetName].filter(Boolean).join(" › ")}
                className="mt-0.5 text-xs leading-tight text-gray-400"
            />
        </div>
    )
}

function ChartCell({ column, ad, height, compact }) {
    if (column.key === "retention") {
        return isVideoAd(ad) ? <RetentionChart values={ad.retention} height={height} compact={compact} /> : <span className="text-gray-300">—</span>
    }
    return <AgeBars rows={ad.ageBreakdown} height={height} compact={compact} />
}

function AdsTable({ ads, columns, sort, onSort }) {
    const th = "whitespace-nowrap border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs font-medium text-gray-500"
    const td = "whitespace-nowrap border-b border-gray-100 px-4 py-3 text-left align-middle text-sm text-gray-800"
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200">
            <ScrollArea viewportClassName="max-h-[70vh]">
                <table className="w-full min-w-max border-separate border-spacing-0">
                    <thead className="sticky top-0 z-20">
                        <tr>
                            <th className={cn(th, "sticky left-0 z-30 min-w-[380px] border-r")}>Ad</th>
                            {columns.map(column => (
                                <th key={column.key} className={th}>
                                    {column.chart ? (
                                        <span className="inline-flex items-center gap-1">
                                            {column.label}
                                            <HintIcon hint={METRIC_HINTS[column.key]} />
                                        </span>
                                    ) : (
                                        <SortHeader column={column} sort={sort} onSort={onSort} />
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ads.map(ad => {
                            const video = isVideoAd(ad)
                            return (
                                <tr key={ad.adId} className="group">
                                    <td className="sticky left-0 z-10 max-w-[380px] border-b border-r border-gray-100 border-r-gray-200 bg-white px-4 py-3 transition-colors group-hover:bg-gray-50">
                                        <div className="flex items-center gap-4">
                                            <Thumbnail url={ad.thumbnailUrl} name={ad.adName} href={ad.postUrl} className="h-[104px] w-[104px] rounded-2xl" />
                                            <AdNameCell ad={ad} />
                                        </div>
                                    </td>
                                    {columns.map(column => (
                                        <td
                                            key={column.key}
                                            className={cn(td, "transition-colors group-hover:bg-gray-50", column.chart && (column.key === "retention" ? "w-[180px] min-w-[180px]" : "w-[240px] min-w-[240px]"))}
                                        >
                                            {column.chart
                                                ? <ChartCell column={column} ad={ad} height={88} compact={column.key === "retention"} />
                                                : column.video && !video ? <span className="text-gray-300">—</span> : column.render(ad)}
                                        </td>
                                    ))}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </ScrollArea>
        </div>
    )
}

function AdsGrid({ ads, columns }) {
    const metricColumns = columns.filter(c => !c.chart)
    const chartColumns = columns.filter(c => c.chart)
    return (
        <ScrollArea viewportClassName="max-h-[75vh]">
            <div className="grid grid-cols-1 gap-x-3 gap-y-6 pr-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {ads.map(ad => {
                    const video = isVideoAd(ad)
                    const metrics = metricColumns.filter(c => video || !c.video)
                    const charts = chartColumns.filter(c => video || !c.video)
                    return (
                        <div key={ad.adId} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-gray-100 p-3 transition-colors hover:border-gray-200">
                            <Thumbnail url={ad.thumbnailUrl} name={ad.adName} href={ad.postUrl} className="aspect-square w-full rounded-xl" />
                            <AdNameCell ad={ad} />
                            {metrics.length > 0 && (
                                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                                    {metrics.map(column => (
                                        <div key={column.key} className="min-w-0">
                                            <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                                <span className="truncate">{column.label}</span>
                                                <HintIcon hint={METRIC_HINTS[column.key]} />
                                            </div>
                                            <div className="mt-0.5 whitespace-nowrap text-sm font-medium text-gray-800">{column.render(ad)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {charts.map(column => (
                                <div key={column.key} className="min-w-0">
                                    <div className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                        {column.label}
                                        <HintIcon hint={METRIC_HINTS[column.key]} />
                                    </div>
                                    <ChartCell column={column} ad={ad} height={88} />
                                </div>
                            ))}
                        </div>
                    )
                })}
            </div>
        </ScrollArea>
    )
}

function ColumnsPicker({ columns, hidden, onChange }) {
    const visibleCount = columns.filter(c => !hidden.includes(c.key)).length
    const toggle = (key, checked) => onChange(checked ? hidden.filter(k => k !== key) : [...hidden, key])
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl">
                    <Columns3 className="mr-1.5 h-3.5 w-3.5" />
                    Columns
                    {visibleCount < columns.length && (
                        <span className="ml-1.5 text-[11px] text-gray-400">{visibleCount}/{columns.length}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={6} className="w-[240px] rounded-2xl bg-white p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">Show columns</span>
                    {hidden.length > 0 && (
                        <button type="button" className="text-[11px] text-gray-400 hover:text-gray-700" onClick={() => onChange([])}>
                            Show all
                        </button>
                    )}
                </div>
                <div className="space-y-1">
                    {columns.map(column => {
                        const id = `trending-col-${column.key}`
                        return (
                            <label key={column.key} htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-sm text-gray-700 hover:bg-gray-50">
                                <Checkbox
                                    id={id}
                                    checked={!hidden.includes(column.key)}
                                    onCheckedChange={(checked) => toggle(column.key, checked === true)}
                                />
                                {column.label}
                            </label>
                        )
                    })}
                </div>
            </PopoverContent>
        </Popover>
    )
}

function ViewToggle({ view, onChange }) {
    const options = [
        { key: "table", icon: Table2, label: "Table view" },
        { key: "grid", icon: LayoutGrid, label: "Grid view" },
    ]
    return (
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-0.5">
            {options.map(({ key, icon: Icon, label }) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => onChange(key)}
                    title={label}
                    aria-label={label}
                    aria-pressed={view === key}
                    className={cn(
                        "rounded-lg px-2 py-1 transition-colors",
                        view === key ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-700",
                    )}
                >
                    <Icon className="h-4 w-4" />
                </button>
            ))}
        </div>
    )
}

const viewStepIndex = (value, fallback) => {
    if (value === "" || value == null) return fallback
    const n = Number(value)
    let best = 0
    VIEW_STEPS.forEach((step, i) => { if (Math.abs(step - n) < Math.abs(VIEW_STEPS[best] - n)) best = i })
    return best
}
const viewStepLabel = (index) => (index >= VIEW_MAX_INDEX ? "100k+" : formatCount(VIEW_STEPS[index]))

function FilterPanel({ applied, onApply, onClose, isRoasMode, getCampaigns, getAdSets }) {
    const [draft, setDraft] = useState(applied)
    const [campaignEntry] = useState(() => getCampaigns())
    const [campaigns, setCampaigns] = useState(campaignEntry.data || [])
    const [campaignsLoading, setCampaignsLoading] = useState(!campaignEntry.data)
    const [adSets, setAdSets] = useState([])
    const [adSetsLoading, setAdSetsLoading] = useState(false)
    const [openCampaign, setOpenCampaign] = useState(false)
    const [campaignSearch, setCampaignSearch] = useState("")
    const [openAdSet, setOpenAdSet] = useState(false)
    const [adSetSearch, setAdSetSearch] = useState("")
    const adSetRequestRef = useRef(null)

    useEffect(() => {
        if (campaignEntry.data) return
        let cancelled = false
        campaignEntry.promise
            .then(data => { if (!cancelled) setCampaigns(data) })
            .catch(() => { if (!cancelled) toast.error("Failed to fetch campaigns") })
            .finally(() => { if (!cancelled) setCampaignsLoading(false) })
        return () => { cancelled = true }
    }, [campaignEntry])

    // Cached per campaign for the session (getAdSets), so reopening the panel is instant.
    const loadAdSets = useCallback((campaignId) => {
        const entry = getAdSets(campaignId)
        adSetRequestRef.current = entry
        if (entry.data) { setAdSets(entry.data); setAdSetsLoading(false); return }
        setAdSets([])
        setAdSetsLoading(true)
        entry.promise
            .then(data => { if (adSetRequestRef.current === entry) setAdSets(data) })
            .catch(() => { if (adSetRequestRef.current === entry) toast.error("Failed to fetch ad sets") })
            .finally(() => { if (adSetRequestRef.current === entry) setAdSetsLoading(false) })
    }, [getAdSets])

    useEffect(() => {
        if (applied.campaignId) loadAdSets(applied.campaignId)
    }, [applied.campaignId, loadAdSets])

    const set = (key, value) => setDraft(prev => ({ ...prev, [key]: value }))
    const setNumber = (key, value) => set(key, value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))

    const handleCampaignChange = (id) => {
        setDraft(prev => ({ ...prev, campaignId: id, adsetId: "" }))
        setAdSetSearch("")
        setOpenCampaign(false)
        loadAdSets(id)
    }

    const filteredCampaigns = useMemo(() => {
        const q = campaignSearch.toLowerCase()
        return campaigns.filter(c => (c.name || c.id).toLowerCase().includes(q))
    }, [campaigns, campaignSearch])

    const filteredAdSets = useMemo(() => {
        const q = adSetSearch.toLowerCase()
        return adSets.filter(a => (a.name || a.id).toLowerCase().includes(q))
    }, [adSets, adSetSearch])

    const metricFilters = METRIC_FILTERS.filter(f => isRoasMode || !f.roasOnly)
    const viewRange = [viewStepIndex(draft.videoViewsMin, 0), viewStepIndex(draft.videoViewsMax, VIEW_MAX_INDEX)]
    const setViewRange = ([lo, hi]) => setDraft(prev => ({
        ...prev,
        videoViewsMin: lo > 0 ? String(VIEW_STEPS[lo]) : "",
        videoViewsMax: hi < VIEW_MAX_INDEX ? String(VIEW_STEPS[hi]) : "",
    }))
    const viewsFiltered = viewRange[0] > 0 || viewRange[1] < VIEW_MAX_INDEX

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
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
                        align="start"
                        maxWidth="700px"
                        avoidCollisions
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
                        align="end"
                        maxWidth="700px"
                        avoidCollisions
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_96px_96px] gap-2 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                    <span>Metric</span>
                    <span>Min</span>
                    <span>Max</span>
                </div>
                {metricFilters.map(f => (
                    <div key={f.key} className="grid grid-cols-[1fr_96px_96px] items-center gap-2">
                        <span className="text-sm text-gray-700">
                            {f.label}
                            <span className="ml-1 text-xs text-gray-400">({f.unit})</span>
                        </span>
                        {["Min", "Max"].map(bound => (
                            <Input
                                key={bound}
                                type="text"
                                inputMode="decimal"
                                placeholder="Any"
                                value={draft[`${f.key}${bound}`]}
                                onChange={(e) => setNumber(`${f.key}${bound}`, e.target.value)}
                                className="h-8 rounded-xl text-sm"
                            />
                        ))}
                    </div>
                ))}
            </div>

            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">3s video views</span>
                    <span className="text-xs font-medium text-gray-500">
                        {viewsFiltered ? `${viewStepLabel(viewRange[0])} – ${viewStepLabel(viewRange[1])}` : "Any"}
                    </span>
                </div>
                <Slider
                    min={0}
                    max={VIEW_MAX_INDEX}
                    step={1}
                    minStepsBetweenThumbs={1}
                    value={viewRange}
                    onValueChange={setViewRange}
                    aria-label="3s video views range"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                    <span>0</span>
                    <span>100k+</span>
                </div>
                <p className="text-[11px] text-gray-400">
                    Image ads are left out when a 3s video views range is set.
                </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
                <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-gray-500"
                    onClick={() => setDraft(EMPTY_FILTERS)}
                >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Reset
                </Button>
                <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
                <Button size="sm" className="flex-1 rounded-xl" onClick={() => onApply(draft)}>Search</Button>
            </div>
        </div>
    )
}

export default function TrendingCreative({ adAccountId, conversionEvent, mode = "cpr", refreshKey, waiting = false, growthPct = 35, onGrowthPctChange, className }) {
    const growthDraft = useThresholdDraft(growthPct, onGrowthPctChange)
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [filters, setFilters] = useState(EMPTY_FILTERS)
    const [filterOpen, setFilterOpen] = useState(false)
    const [sort, setSort] = useState({ key: "spend", dir: "desc" })
    const [hiddenColumns, setHiddenColumns] = useState(() => readStored(STORAGE_KEYS.hidden, []))
    const [view, setView] = useState(() => (readStored(STORAGE_KEYS.view, "table") === "grid" ? "grid" : "table"))
    const isRoasMode = mode === "roas"

    // ROAS isn't a column outside ROAS mode, so its filter is dropped there.
    const activeFilters = useMemo(() => Object.fromEntries(
        Object.entries(filters).filter(([key, value]) =>
            value !== ""
            && !(key === "days" && value === "7")
            && (isRoasMode || !key.startsWith("roas"))),
    ), [filters, isRoasMode])
    const filterCount = useMemo(() => {
        let count = 0
        if (activeFilters.days) count++
        if (activeFilters.campaignId || activeFilters.adsetId) count++
        for (const key of [...METRIC_FILTERS.map(f => f.key), "videoViews"]) {
            if (activeFilters[`${key}Min`] || activeFilters[`${key}Max`]) count++
        }
        return count
    }, [activeFilters])

    // Session-scoped response cache. Keyed by accountId + conversionEvent +
    // filters + refreshKey — includes refreshKey so the user's manual refresh
    // (which bumps chartsRefreshKey in AnalyticsDashboard) automatically lands
    // on a fresh cache key and bypasses any stale entry. Mirrors the useRef-map
    // pattern used elsewhere in AnalyticsDashboard (recsCacheRef, etc.).
    const cacheRef = useRef({})

    // Same pattern for the filter's campaign / ad set lists: one request per
    // account / campaign until the account changes or the user refreshes.
    const listCacheRef = useRef({})
    useEffect(() => { listCacheRef.current = {} }, [adAccountId, refreshKey])
    const cachedList = useCallback((key, url, pick) => {
        const cache = listCacheRef.current
        if (!cache[key]) {
            const entry = { data: null }
            entry.promise = fetch(url, { credentials: "include" })
                .then(r => r.json())
                .then(body => { entry.data = pick(body); return entry.data })
                .catch(err => {
                    if (listCacheRef.current[key] === entry) delete listCacheRef.current[key]
                    throw err
                })
            cache[key] = entry
        }
        return cache[key]
    }, [])
    const getCampaigns = useCallback(() => cachedList(
        `campaigns:${adAccountId}`,
        `${API_BASE_URL}/auth/fetch-campaigns?adAccountId=${adAccountId}`,
        body => sortCampaignsActiveFirst(body.campaigns || []),
    ), [cachedList, adAccountId])
    const getAdSets = useCallback((campaignId) => cachedList(
        `adsets:${campaignId}`,
        `${API_BASE_URL}/auth/fetch-adsets?campaignId=${campaignId}`,
        body => body.adSets || [],
    ), [cachedList])

    // Filters belong to one ad account.
    useEffect(() => { setFilters(EMPTY_FILTERS) }, [adAccountId])

    useEffect(() => { writeStored(STORAGE_KEYS.hidden, hiddenColumns) }, [hiddenColumns])
    useEffect(() => { writeStored(STORAGE_KEYS.view, view) }, [view])

    useEffect(() => {
        if (!adAccountId) { setData(null); return }
        // Render the shell immediately; fetch once the conversion event is known.
        if (waiting) { setData(null); setLoading(true); setError(null); return }
        const cacheKey = `${adAccountId}::${mode}::${conversionEvent || "__auto__"}::${growthPct}::${JSON.stringify(activeFilters)}::${refreshKey || 0}`

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

        const params = new URLSearchParams({ adAccountId, mode, growthPct: String(growthPct), ...activeFilters })
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
    }, [adAccountId, conversionEvent, mode, refreshKey, waiting, activeFilters, growthPct])

    // Columns that apply to these results: ROAS only in ROAS mode, video columns
    // only when at least one ad has video data.
    const availableColumns = useMemo(() => {
        const anyVideo = (data?.ads || []).some(isVideoAd)
        return COLUMNS.filter(c => (isRoasMode || !c.roasOnly) && (anyVideo || !c.video))
    }, [data, isRoasMode])
    const visibleColumns = availableColumns.filter(c => !hiddenColumns.includes(c.key))
    const sortedAds = useMemo(() => sortAds(data?.ads || [], sort), [data, sort])

    const handleSort = (key) => {
        setSort(prev => (prev.key === key
            ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
            : { key, dir: COLUMN_BY_KEY[key].best }))
    }

    const isSearch = data?.mode === "search"
    const days = data?.window?.days || Number(filters.days)
    const subtitle = isSearch
        ? `${data.ads.length}${data.totalMatches > data.ads.length ? ` of ${data.totalMatches}` : ""} matching ads in the last ${days} days. Spend change is vs the ${days} days before.`
        : (
            <>
                Ads with &gt;
                <InlineThresholdInput {...growthDraft} suffix="%" disabled={!onGrowthPctChange} />
                spend growth over the last 7 days vs the prior 7 days.
                <InlineThresholdApply {...growthDraft} />
            </>
        )

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
                            <ColumnsPicker columns={availableColumns} hidden={hiddenColumns} onChange={setHiddenColumns} />
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
                                            <>
                                                <span className="ml-1.5 rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
                                                    {filterCount}
                                                </span>
                                                {/* A span, not a nested button: clears without opening the panel. */}
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label="Clear filters"
                                                    title="Clear filters"
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); setFilters(EMPTY_FILTERS) }}
                                                    onKeyDown={(e) => {
                                                        if (e.key !== "Enter" && e.key !== " ") return
                                                        e.stopPropagation(); e.preventDefault(); setFilters(EMPTY_FILTERS)
                                                    }}
                                                    className="-mr-1 ml-1.5 inline-flex items-center justify-center text-red-500 transition-colors hover:text-red-600"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </span>
                                            </>
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
                                            applied={filters}
                                            isRoasMode={isRoasMode}
                                            getCampaigns={getCampaigns}
                                            getAdSets={getAdSets}
                                            onApply={(next) => { setFilters(next); setFilterOpen(false) }}
                                            onClose={() => setFilterOpen(false)}
                                        />
                                    )}
                                </PopoverContent>
                            </Popover>
                            <ViewToggle view={view} onChange={setView} />
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
                    ) : view === "grid" ? (
                        <AdsGrid ads={sortedAds} columns={visibleColumns} />
                    ) : (
                        <AdsTable ads={sortedAds} columns={visibleColumns} sort={sort} onSort={handleSort} />
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
