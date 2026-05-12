"use client"

import { useState, useEffect, useMemo } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

const COLORS = [
    "#2563eb", "#dc2626", "#16a34a", "#9333ea",
    "#ea580c", "#0891b2", "#be185d", "#65a30d",
]

const DIMENSIONS = [
    { key: "placement", label: "Placement", subtitle: "Ad spend by publisher platform + position" },
    { key: "age", label: "Age", subtitle: "Ad spend by age group" },
    { key: "gender", label: "Gender", subtitle: "Ad spend by gender" },
]

function getDimensionConfig(key) {
    return DIMENSIONS.find(d => d.key === key) || DIMENSIONS[0]
}

function formatWeek(dateStr) {
    if (!dateStr) return ""
    const date = new Date(dateStr + "T00:00:00")
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatSpend(v) {
    if (v == null) return "—"
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(0)}`
}

function formatPct(v) {
    if (v == null) return "—"
    return `${v.toFixed(1)}%`
}

function truncateName(name, max = 30) {
    if (!name) return ""
    return name.length > max ? name.slice(0, max - 1) + "…" : name
}

function CustomTooltip({ active, payload, label, viewMode, hiddenSeries }) {
    if (!active || !payload?.length) return null
    const visible = payload.filter(p => !hiddenSeries.has(p.dataKey))
    if (!visible.length) return null
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-lg">
            <p className="mb-2 font-semibold text-gray-900">Week of {label}</p>
            <div className="space-y-1">
                {visible.map(item => (
                    <p key={item.dataKey} className="flex items-center gap-2 text-gray-600">
                        <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="max-w-[180px] truncate">{item.name}</span>
                        <span className="ml-auto font-medium text-gray-900">
                            {viewMode === "percent" ? formatPct(Number(item.value)) : formatSpend(Number(item.value))}
                        </span>
                    </p>
                ))}
            </div>
        </div>
    )
}

export default function WeeklyPlacementChart({ adAccountId, dateRange, refreshKey }) {
    const [data, setData] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [hiddenSeries, setHiddenSeries] = useState(new Set())
    const [viewMode, setViewMode] = useState("dollar")
    const [breakdown, setBreakdown] = useState("placement")

    const dimensionConfig = getDimensionConfig(breakdown)

    useEffect(() => {
        setHiddenSeries(new Set())
    }, [adAccountId, breakdown])

    useEffect(() => {
        if (!adAccountId) { setData(null); return }
        let cancelled = false
        setIsLoading(true)
        setError(null)
        const params = new URLSearchParams({ adAccountId, breakdown })
        if (dateRange?.since && dateRange?.until) {
            params.set("since", dateRange.since)
            params.set("until", dateRange.until)
        }
        if (refreshKey) params.set("rk", String(refreshKey))
        fetch(`${API_BASE_URL}/api/analytics/weekly-placement-breakdown?${params}`, {
            credentials: "include",
            cache: "no-store",
        })
            .then(r => {
                if (!r.ok) return r.json().then(e => { throw new Error(e.error || "Failed to fetch") })
                return r.json()
            })
            .then(d => { if (!cancelled) setData(d) })
            .catch(err => { if (!cancelled) setError(err.message || "Error") })
            .finally(() => { if (!cancelled) setIsLoading(false) })
        return () => { cancelled = true }
    }, [adAccountId, breakdown, refreshKey, dateRange?.since, dateRange?.until])

    const series = data?.placements || []

    const chartData = useMemo(() => {
        return (data?.series || []).map(row => {
            const weekLabel = formatWeek(row.week)
            if (viewMode === "dollar") {
                return { ...row, week: weekLabel }
            }
            const total = series.reduce((sum, p) => sum + (Number(row[p]) || 0), 0)
            const pctRow = { week: weekLabel }
            for (const p of series) {
                pctRow[p] = total > 0 ? ((Number(row[p]) || 0) / total) * 100 : 0
            }
            return pctRow
        })
    }, [data, series, viewMode])

    const handleToggleSeries = (key) => {
        setHiddenSeries(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key); else next.add(key)
            return next
        })
    }

    return (
        <div className="p-4">
            <div className="mb-[22px] flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">Spend Breakdown</p>
                    <p className="text-xs text-gray-400">{dimensionConfig.subtitle}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Dimension toggle (segmented pill, matches app style) */}
                    <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-0.5">
                        {DIMENSIONS.map(d => (
                            <button
                                key={d.key}
                                onClick={() => setBreakdown(d.key)}
                                className={cn(
                                    "px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all",
                                    breakdown === d.key
                                        ? "bg-white text-gray-900 shadow-xs ring-1 ring-black/5"
                                        : "text-gray-500 hover:text-gray-700",
                                )}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                    {/* $ / % toggle */}
                    <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-0.5">
                        {[
                            { key: "dollar", label: "$" },
                            { key: "percent", label: "%" },
                        ].map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setViewMode(opt.key)}
                                className={cn(
                                    "px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all min-w-[28px]",
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

            {isLoading ? (
                <div className="flex items-center justify-center h-[260px]">
                    <Helix size="36" speed="2.5" color="#3b82f6" />
                </div>
            ) : error ? (
                <div className="flex items-center justify-center h-[260px] text-sm text-red-500">{error}</div>
            ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">
                    No data available for this period
                </div>
            ) : (
                <>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="week"
                                tick={{ fontSize: 10, fill: "#9ca3af" }}
                                tickLine={false}
                                axisLine={{ stroke: "#e5e7eb" }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: "#9ca3af" }}
                                tickLine={false}
                                axisLine={{ stroke: "#e5e7eb" }}
                                tickFormatter={viewMode === "percent" ? (v) => `${v.toFixed(0)}%` : formatSpend}
                                domain={viewMode === "percent" ? [0, 100] : undefined}
                                width={48}
                            />
                            <Tooltip content={<CustomTooltip viewMode={viewMode} hiddenSeries={hiddenSeries} />} />
                            {series.map((key, i) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    name={key}
                                    stroke={COLORS[i % COLORS.length]}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                    connectNulls
                                    hide={hiddenSeries.has(key)}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>

                    {series.length > 0 && (
                        <div className="mt-3">
                            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 px-1 w-full">
                                {series.map((name, i) => {
                                    const isHidden = hiddenSeries.has(name)
                                    return (
                                        <button
                                            key={name}
                                            onClick={() => handleToggleSeries(name)}
                                            title={name}
                                            className="flex items-center gap-2 text-left min-w-0 py-0.5 group"
                                        >
                                            <span
                                                className="w-3 h-[3px] rounded-full flex-shrink-0 transition-opacity"
                                                style={{
                                                    backgroundColor: COLORS[i % COLORS.length],
                                                    opacity: isHidden ? 0.25 : 1,
                                                }}
                                            />
                                            <span
                                                className={cn(
                                                    "text-[11px] truncate transition-colors",
                                                    isHidden
                                                        ? "text-gray-300 line-through"
                                                        : "text-gray-600 group-hover:text-gray-900",
                                                )}
                                            >
                                                {truncateName(name)}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
