"use client"

/* eslint-disable react/prop-types */

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Users, ChartColumn, ChartLine } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import AnalyticsDateRangePicker from "./AnalyticsDateRangePicker"
import { formatBucketLabel, formatBucketTooltipTitle, resolveAllowedGranularity } from "./dateRangeUtils"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

// Meta's audience segments, as each account defines them in its advertising settings.
const SEGMENTS = {
    prospecting: { label: "New Audience", color: "#2563eb" },
    engaged: { label: "Engaged Audience", color: "#0ea5e9" },
    existing: { label: "Existing Customers", color: "#16a34a" },
    unknown: { label: "Unknown", color: "#d1d5db" },
}
const segmentLabel = (key) => SEGMENTS[key]?.label || key
const segmentColor = (key) => SEGMENTS[key]?.color || "#9ca3af"

function formatSpend(v) {
    if (v == null) return "—"
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(0)}`
}

const TOP_RADIUS = 18
const BOTTOM_RADIUS = 6

function roundedRectPath(x, top, width, bottom, rt, rb) {
    return [
        `M${x},${top + rt}`,
        `A${rt},${rt} 0 0 1 ${x + rt},${top}`,
        `L${x + width - rt},${top}`,
        `A${rt},${rt} 0 0 1 ${x + width},${top + rt}`,
        `L${x + width},${bottom - rb}`,
        `A${rb},${rb} 0 0 1 ${x + width - rb},${bottom}`,
        `L${x + rb},${bottom}`,
        `A${rb},${rb} 0 0 1 ${x},${bottom - rb}`,
        "Z",
    ].join(" ")
}

// One segment of a stacked column, clipped to the rounded outline of the whole
// column — so the column reads as one rounded bar however thin its top segment
// is, and a week where the top segment is $0 is still rounded.
function StackSegment({ x, y, width, height, fill, payload, index, dataKey, segments, clipPrefix }) {
    const value = Number(payload?.[dataKey]) || 0
    if (!height || height <= 0 || !width || !value) return null
    const pxPerUnit = height / value
    const position = segments.indexOf(dataKey)
    const sum = (keys) => keys.reduce((total, key) => total + (Number(payload?.[key]) || 0), 0)
    const top = y - sum(segments.slice(position + 1)) * pxPerUnit
    const bottom = y + height + sum(segments.slice(0, position)) * pxPerUnit
    const columnHeight = bottom - top
    const rt = Math.min(TOP_RADIUS, width / 2, columnHeight / 2)
    const rb = Math.min(BOTTOM_RADIUS, width / 2, columnHeight / 2)
    const clipId = `${clipPrefix}-${position}-${index}`
    return (
        <g>
            <defs>
                <clipPath id={clipId}>
                    <path d={roundedRectPath(x, top, width, bottom, rt, rb)} />
                </clipPath>
            </defs>
            <rect x={x} y={y} width={width} height={height} fill={fill} clipPath={`url(#${clipId})`} />
        </g>
    )
}

function CustomTooltip({ active, payload, segments }) {
    if (!active || !payload?.length) return null
    const row = payload[0]?.payload
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-lg">
            <p className="mb-2 font-semibold text-gray-900">
                {row?.tooltipTitle} · {formatSpend(row?.__total)} total
            </p>
            <div className="space-y-1">
                {[...segments].reverse().map(key => {
                    const usd = row?.[`${key}__usd`] || 0
                    const share = row?.__total > 0 ? (usd / row.__total) * 100 : 0
                    return (
                        <p key={key} className="flex items-center gap-2 text-gray-600">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segmentColor(key) }} />
                            <span>{segmentLabel(key)}</span>
                            <span className="ml-auto pl-4 font-medium text-gray-900">
                                {formatSpend(usd)} <span className="font-normal text-gray-400">({share.toFixed(0)}%)</span>
                            </span>
                        </p>
                    )
                })}
            </div>
        </div>
    )
}

// The chart follows the dashboard's date range until its own picker is used;
// changing the dashboard's range again resets it.
export default function AudienceBreakdownChart({ adAccountId, dateRange: dashboardRange, granularity: dashboardGranularity = "weekly", refreshKey, className }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [viewMode, setViewMode] = useState("dollar")
    const [chartType, setChartType] = useState("bar")
    const [ownRange, setOwnRange] = useState(null)
    useEffect(() => { setOwnRange(null) }, [dashboardRange?.since, dashboardRange?.until])
    const dateRange = ownRange || dashboardRange
    // The dashboard's breakdown, unless it doesn't fit this chart's own range (e.g. monthly over 7 days).
    const granularity = ownRange ? resolveAllowedGranularity(dashboardGranularity, ownRange) : dashboardGranularity
    // Unique per chart instance, so each column's clip path id is unique on the page.
    const clipPrefix = `audience-${useId().replace(/:/g, "")}`

    // Session-scoped response cache (see TrendingCreative for rationale).
    const cacheRef = useRef({})

    useEffect(() => {
        if (!adAccountId) { setData(null); return }
        const cacheKey = `${adAccountId}::${dateRange?.since || ""}::${dateRange?.until || ""}::${granularity}::${refreshKey || 0}`
        if (cacheRef.current[cacheKey]) {
            setData(cacheRef.current[cacheKey])
            setLoading(false)
            setError(null)
            return
        }

        let cancelled = false
        setLoading(true)
        setError(null)
        const params = new URLSearchParams({ adAccountId, granularity })
        if (dateRange?.since && dateRange?.until) {
            params.set("since", dateRange.since)
            params.set("until", dateRange.until)
        }
        if (refreshKey) params.set("rk", String(refreshKey))

        fetch(`${API_BASE_URL}/api/analytics/audience-segments?${params}`, { credentials: "include", cache: "no-store" })
            .then(r => r.json().then(body => ({ ok: r.ok, body })))
            .then(({ ok, body }) => {
                if (cancelled) return
                if (!ok) throw new Error(body.error || "Failed to load audience segments")
                cacheRef.current[cacheKey] = body
                setData(body)
            })
            .catch(err => { if (!cancelled) setError(err.message || "Error loading data") })
            .finally(() => { if (!cancelled) setLoading(false) })

        return () => { cancelled = true }
    }, [adAccountId, dateRange?.since, dateRange?.until, granularity, refreshKey])

    const segments = useMemo(() => data?.segments || [], [data])
    const grandTotal = segments.reduce((sum, key) => sum + (data?.totals?.[key] || 0), 0)

    const chartData = useMemo(() => (data?.series || []).map(row => {
        const total = segments.reduce((sum, key) => sum + (Number(row[key]) || 0), 0)
        const out = {
            label: formatBucketLabel(row.period, granularity),
            tooltipTitle: formatBucketTooltipTitle(row.period, granularity),
            __total: total,
        }
        for (const key of segments) {
            const usd = Number(row[key]) || 0
            out[key] = viewMode === "percent" ? (total > 0 ? (usd / total) * 100 : 0) : usd
            out[`${key}__usd`] = usd
        }
        return out
    }), [data, segments, viewMode, granularity])

    return (
        <Card className={cn("rounded-3xl border-gray-200", className)}>
            <CardContent className="p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
                    <div className="min-w-0">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                            <Users className="h-5 w-5 text-indigo-500" />
                            Audience Breakdown
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Spend by Meta audience segment, as defined in the ad account&apos;s advertising settings.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <AnalyticsDateRangePicker value={dateRange} onChange={setOwnRange} compact />
                        <div className="flex items-center gap-0.5 rounded-xl bg-gray-100 p-0.5">
                            {[{ key: "bar", label: "Bar chart", Icon: ChartColumn }, { key: "line", label: "Line chart", Icon: ChartLine }].map(({ key, label, Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => setChartType(key)}
                                    aria-label={label}
                                    title={label}
                                    className={cn(
                                        "rounded-lg px-2.5 py-1.5 transition-all",
                                        chartType === key
                                            ? "bg-white text-gray-900 shadow-xs ring-1 ring-black/5"
                                            : "text-gray-500 hover:text-gray-700",
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-0.5 rounded-xl bg-gray-100 p-0.5">
                            {[{ key: "dollar", label: "$" }, { key: "percent", label: "%" }].map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => setViewMode(opt.key)}
                                    className={cn(
                                        "min-w-[28px] rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all",
                                        viewMode === opt.key
                                            ? "bg-white text-gray-900 shadow-xs ring-1 ring-black/5"
                                            : "text-gray-500 hover:text-gray-700",
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-[280px] items-center justify-center">
                        <Helix size="36" speed="2.5" color="#3b82f6" />
                    </div>
                ) : error ? (
                    <div className="flex h-[280px] items-center justify-center px-6 text-center text-sm text-red-500">{error}</div>
                ) : chartData.length === 0 ? (
                    <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
                        No spend in this period
                    </div>
                ) : (
                    <>
                        {/* Segment totals for the whole range */}
                        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {segments.map(key => (
                                <div key={key} className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: segmentColor(key) }} />
                                        <span className="truncate text-[11px] font-medium text-gray-500">{segmentLabel(key)}</span>
                                    </div>
                                    <p className="mt-1 text-base font-semibold text-gray-900">
                                        {formatSpend(data.totals[key])}
                                        <span className="ml-1.5 text-xs font-normal text-gray-400">
                                            {grandTotal > 0 ? `${((data.totals[key] / grandTotal) * 100).toFixed(0)}%` : ""}
                                        </span>
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="[&_*:focus]:outline-none [&_*:focus-visible]:outline-none">
                            <ResponsiveContainer width="100%" height={260}>
                                {chartType === "line" ? (
                                    <LineChart data={chartData} margin={{ top: 5, right: 8, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                                            tickLine={false}
                                            axisLine={{ stroke: "#e5e7eb" }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                                            tickLine={false}
                                            axisLine={false}
                                            domain={viewMode === "percent" ? [0, 100] : undefined}
                                            tickFormatter={(v) => (viewMode === "percent" ? `${v.toFixed(0)}%` : formatSpend(v))}
                                            width={52}
                                        />
                                        <Tooltip content={<CustomTooltip segments={segments} />} cursor={{ stroke: "#e5e7eb" }} />
                                        {segments.map((key) => (
                                            <Line
                                                key={key}
                                                dataKey={key}
                                                name={segmentLabel(key)}
                                                type="monotone"
                                                stroke={segmentColor(key)}
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                                isAnimationActive={false}
                                            />
                                        ))}
                                    </LineChart>
                                ) : (
                                    <BarChart data={chartData} margin={{ top: 5, right: 0, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                                            tickLine={false}
                                            axisLine={{ stroke: "#e5e7eb" }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                                            tickLine={false}
                                            axisLine={false}
                                            domain={viewMode === "percent" ? [0, 100] : undefined}
                                            tickFormatter={(v) => (viewMode === "percent" ? `${v.toFixed(0)}%` : formatSpend(v))}
                                            width={52}
                                        />
                                        <Tooltip content={<CustomTooltip segments={segments} />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                                        {segments.map((key) => (
                                            <Bar
                                                key={key}
                                                dataKey={key}
                                                name={segmentLabel(key)}
                                                stackId="segments"
                                                fill={segmentColor(key)}
                                                shape={(props) => <StackSegment {...props} dataKey={key} segments={segments} clipPrefix={clipPrefix} />}
                                                isAnimationActive={false}
                                            />
                                        ))}
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
