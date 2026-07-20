"use client"

/* eslint-disable react/prop-types */

import { useEffect, useMemo, useRef, useState } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { Image as ImageIcon, Trophy, ExternalLink, ChevronDown, BadgePercent } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip as ShadTooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

function formatMonthLabel(yyyyMM) {
    const [year, month] = yyyyMM.split("-")
    const d = new Date(Number(year), Number(month) - 1, 1)
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
}

function formatMonthFull(yyyyMM) {
    const [year, month] = yyyyMM.split("-")
    const d = new Date(Number(year), Number(month) - 1, 1)
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function formatSpend(v) {
    if (v == null) return "—"
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(0)}`
}

function buildAdUrl(adId) {
    if (!adId) return null
    return `https://www.facebook.com/adsmanager/manage/ads?selected_ad_ids=${adId}`
}

function CreativeThumbnail({ url, name }) {
    const [errored, setErrored] = useState(false)
    if (url && !errored) {
        return (
            <img
                src={url}
                alt={name}
                className="h-[88px] w-[88px] flex-shrink-0 rounded-xl object-cover"
                onError={() => setErrored(true)}
            />
        )
    }
    return (
        <div className="flex h-[88px] w-[88px] flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
            <ImageIcon className="h-6 w-6 text-gray-300" />
        </div>
    )
}

function TruncatedWithTooltip({ text, max, className }) {
    if (!text) return null
    if (text.length <= max) return <span className={className}>{text}</span>
    return (
        <ShadTooltip delayDuration={150}>
            <TooltipTrigger asChild>
                <span className={cn(className, "cursor-default")}>{text.slice(0, max)}…</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs break-words">
                {text}
            </TooltipContent>
        </ShadTooltip>
    )
}

function CreativeRow({ creative }) {
    const adUrl = buildAdUrl(creative.adId)
    return (
        <div className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-gray-50">
            <CreativeThumbnail url={creative.thumbnailUrl} name={creative.adName} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <TruncatedWithTooltip
                        text={creative.adName}
                        max={96}
                        className="text-sm text-gray-800"
                    />
                    {adUrl && (
                        <a
                            href={adUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 text-gray-400 transition-colors hover:text-blue-600"
                            title="Open ad in Meta Ads Manager"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    )}
                </div>
            </div>
            <div className="ml-2 w-20 flex-shrink-0 text-right text-sm font-medium text-gray-800 tabular-nums">
                {formatSpend(creative.spend)}
            </div>
        </div>
    )
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    const row = payload[0]?.payload
    const launches = row?.launches
    const winners = row?.winners
    const isMatured = row?.isMatured
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-lg">
            <p className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
                {label}
                {isMatured === false && (
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        maturing
                    </span>
                )}
            </p>
            <div className="space-y-1">
                <p className="flex items-center gap-2 text-gray-600">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Launches
                    <span className="ml-auto font-medium text-gray-900">{launches ?? 0}</span>
                </p>
                <p className="flex items-center gap-2 text-gray-600">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Winners
                    <span className="ml-auto font-medium text-gray-900">{winners ?? 0}</span>
                </p>
            </div>
        </div>
    )
}

function MonthTabSwitcher({ months, selectedMonth, onSelect }) {
    return (
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-0.5">
                {months.map((m) => {
                    const isActive = selectedMonth === m.monthKey
                    return (
                        <button
                            key={m.monthKey}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => onSelect(m.monthKey)}
                            className={cn(
                                "px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all",
                                isActive
                                    ? "bg-white text-gray-900 shadow-xs ring-1 ring-black/5"
                                    : "text-gray-500 hover:text-gray-700",
                            )}
                        >
                            {formatMonthLabel(m.monthKey)}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default function CreativeHitRateChart({ adAccountId, conversionEvent, refreshKey, className }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [selectedMonth, setSelectedMonth] = useState(null)
    const [showAll, setShowAll] = useState(false)

    // Session-scoped response cache (see TrendingCreative for rationale).
    // Cache key includes refreshKey, so the user's manual chart refresh
    // lands on a fresh key and bypasses any stale entry automatically.
    const cacheRef = useRef({})

    useEffect(() => {
        if (!adAccountId) { return }
        const cacheKey = `${adAccountId}::${conversionEvent || "__auto__"}::${refreshKey || 0}`

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

        const params = new URLSearchParams({ adAccountId })
        if (conversionEvent) params.set("conversionEvent", conversionEvent)
        if (refreshKey) params.set("rk", String(refreshKey))

        fetch(`${API_BASE_URL}/api/analytics/creative-hit-rate?${params}`, {
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
    }, [adAccountId, conversionEvent, refreshKey])

    // Default selected month = most recent month with launches (else last month).
    // The API returns rows shaped { month, launches, winners, ... }, so the key is `.month`.
    useEffect(() => {
        if (!data?.months?.length) return
        if (selectedMonth && data.months.some(m => m.month === selectedMonth)) return
        const withLaunches = [...data.months].reverse().find(m => m.launches > 0)
        setSelectedMonth(withLaunches?.month || data.months[data.months.length - 1].month)
    }, [data, selectedMonth])

    // Reset expand-all when month changes.
    useEffect(() => { setShowAll(false) }, [selectedMonth])

    const chartData = useMemo(() => {
        if (!data?.months) return []
        return data.months.map(m => ({
            month: formatMonthLabel(m.month),
            monthKey: m.month,
            launches: m.launches,
            winners: m.winners,
            isMatured: m.isMatured,
        }))
    }, [data])

    const hasAnyLaunches = chartData.some(d => d.launches > 0)
    const hasMaturingMonth = chartData.some(d => d.isMatured === false)

    const selectedMonthData = data?.months?.find(m => m.month === selectedMonth) || null
    const selectedCreatives = (selectedMonth && data?.creativesByMonth?.[selectedMonth]) || []
    const winners = selectedCreatives.filter(c => c.isWinner)
    const losers = selectedCreatives.filter(c => !c.isWinner)

    const monthTabsModel = (data?.months || []).map(m => ({ monthKey: m.month }))

    return (
        <TooltipProvider delayDuration={150}>
            <Card className={cn("rounded-3xl border-gray-200", className)}>
                <CardContent className="p-6">
                    <div className="mb-4 px-1">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                            <BadgePercent className="h-5 w-5 text-amber-500" />
                            Creative Hit Rate
                            {data?.winnerThreshold != null && (
                                <span className="text-base font-normal text-gray-400">
                                    winner ≥ {formatSpend(data.winnerThreshold)}
                                </span>
                            )}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Unique creative launches per month. Winners reach 10× the account&apos;s average CPA in spend within 90 days of launch.
                            {hasMaturingMonth && " Recent months still maturing."}
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <Helix size="36" speed="2.5" color="#3b82f6" />
                            <p className="text-sm text-gray-500">
                                Analyzing creative history — this can take up to 60 seconds depending on ad volume…
                            </p>
                        </div>
                    ) : error ? (
                        <div className="flex h-[260px] items-center justify-center text-sm text-red-500">{error}</div>
                    ) : !hasAnyLaunches ? (
                        <div className="flex h-[260px] items-center justify-center text-sm text-gray-400">
                            No creative launches found in the trailing 6 months
                        </div>
                    ) : (
                        <>
                            {/* ── Bar chart ───────────────────────────────────── */}
                            <div className="[&_*:focus]:outline-none [&_*:focus-visible]:outline-none">
                                <ResponsiveContainer width="100%" height={260}>
                                    <ComposedChart
                                        data={chartData}
                                        margin={{ top: 5, right: 0, left: -10, bottom: 5 }}
                                        style={{ cursor: "pointer" }}
                                        onClick={(state) => {
                                            const k = state?.activePayload?.[0]?.payload?.monthKey
                                            if (k) setSelectedMonth(k)
                                        }}
                                    >
                                        <defs>
                                            <linearGradient id="hitRateBarFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.95} />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.55} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="month"
                                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                                            tickLine={false}
                                            axisLine={{ stroke: "#e5e7eb" }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                                            tickLine={false}
                                            axisLine={false}
                                            width={32}
                                            allowDecimals={false}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
                                        <Bar
                                            dataKey="launches"
                                            fill="url(#hitRateBarFill)"
                                            radius={[6, 6, 0, 0]}
                                            maxBarSize={48}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="winners"
                                            stroke="#f59e0b"
                                            strokeWidth={2}
                                            dot={{ r: 4, strokeWidth: 0, fill: "#f59e0b" }}
                                            activeDot={{ r: 6, strokeWidth: 0, fill: "#f59e0b" }}
                                            connectNulls={false}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mt-3 flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-3 rounded-sm bg-gradient-to-b from-blue-400 to-blue-500" />
                                    <span className="text-[11px] font-medium text-blue-500">Launches</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-[3px] w-3 rounded-full bg-amber-500" />
                                    <span className="text-[11px] font-medium text-amber-500">Winners</span>
                                </div>
                            </div>

                            {/* ── Inline winners panel ───────────────────────── */}
                            {selectedMonth && (
                                <div className="mt-6 border-t border-gray-100 pt-5">
                                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                                                <Trophy className="h-4 w-4 text-amber-500" />
                                                Winners for {formatMonthFull(selectedMonth)}
                                                {selectedMonthData && (
                                                    <span className="ml-1 text-sm font-normal text-gray-400">
                                                        {selectedMonthData.winners} of {selectedMonthData.launches} launches
                                                    </span>
                                                )}
                                            </p>
                                            {selectedMonthData?.isMatured === false && (
                                                <p className="mt-0.5 text-xs text-gray-400">
                                                    90-day evaluation window not yet complete
                                                </p>
                                            )}
                                        </div>
                                        <MonthTabSwitcher
                                            months={monthTabsModel}
                                            selectedMonth={selectedMonth}
                                            onSelect={setSelectedMonth}
                                        />
                                    </div>

                                    {winners.length === 0 ? (
                                        <div className="flex items-center justify-center rounded-xl bg-gray-50 py-8 text-sm text-gray-400">
                                            No winners this month
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {winners.map(c => (
                                                <CreativeRow key={c.adName} creative={c} />
                                            ))}
                                        </div>
                                    )}

                                    {/* Show-all expansion (mirrors "Show dismissed recommendations") */}
                                    {losers.length > 0 && (
                                        <>
                                            {showAll && (
                                                <div className="mt-3 space-y-1 opacity-90">
                                                    {losers.map(c => (
                                                        <CreativeRow key={c.adName} creative={c} />
                                                    ))}
                                                </div>
                                            )}
                                            {/* Toggle is sticky only while expanded — keeps "Hide" reachable
                                                when the list overflows; non-sticky when collapsed since the
                                                button is already right there next to the winners. */}
                                            <div
                                                className={cn(
                                                    "mt-3 flex justify-center",
                                                    showAll && "sticky bottom-3 z-10",
                                                )}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAll(prev => !prev)}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-gray-900"
                                                >
                                                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAll && "rotate-180")} />
                                                    {showAll
                                                        ? `Hide other launches`
                                                        : `View all ${selectedMonthData?.launches ?? selectedCreatives.length} creatives from ${formatMonthLabel(selectedMonth)}`}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
