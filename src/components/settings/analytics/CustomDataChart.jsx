"use client"

/* eslint-disable react/prop-types */

// ════════════════════════════════════════════════════════════════════════════
// FEATURE START: CUSTOM DATA + CUSTOM METRICS (added 2026-10-23)
// ----------------------------------------------------------------------------
// The 5th chart: selected Google Sheet columns and custom metrics over the
// selected date range, bucketed like the other charts (daily / weekly /
// monthly). Sheet values are summed per bucket; custom metrics are evaluated
// per bucket from that bucket's sums (Meta from /weekly-insights, which is
// fetched at the same granularity), so a CPA-style metric stays a true ratio.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, CheckCircle2 } from "lucide-react"
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts"
import { formatBucketLabel, formatBucketTooltipTitle } from "./dateRangeUtils"
import { describeCustomKey, formatMetricValue, resolveMetricKey } from "./customMetrics"

const COLORS = ["#10b981", "#6366f1", "#f43f5e", "#f59e0b", "#0ea5e9", "#8b5cf6", "#84cc16", "#ec4899"]

function toDateStr(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
}

/**
 * Bucket start dates for since..until, matching Meta's time_increment
 * (1 / 7 / monthly) which /weekly-insights uses: weekly buckets run 7 days
 * from `since`; monthly buckets start at `since`, then each 1st.
 */
function buildBucketStarts(since, until, granularity) {
    if (!since || !until) return []
    const start = new Date(`${since}T00:00:00`)
    const end = new Date(`${until}T00:00:00`)
    const out = []
    const d = new Date(start)
    while (d <= end) {
        out.push(toDateStr(d))
        if (granularity === "monthly") {
            d.setDate(1)
            d.setMonth(d.getMonth() + 1)
        } else {
            d.setDate(d.getDate() + (granularity === "weekly" ? 7 : 1))
        }
    }
    return out
}

function tickFormatter(format) {
    return (v) => {
        if (format === "currency") return Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`
        if (format === "percent") return `${v.toFixed(1)}%`
        return Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${+v.toFixed(2)}`
    }
}

export default function CustomDataChart({
    displayKeys,
    customMetrics,
    sheetName,
    sheetDaily,
    weeklyInsights,
    dateRange,
    granularity = "weekly",
    loading,
    error,
    showDefaultTooltip = false,
}) {
    const series = useMemo(
        () => displayKeys
            .map((k) => describeCustomKey(k, customMetrics))
            .filter(Boolean)
            .map((s, i) => ({ ...s, color: COLORS[i % COLORS.length] })),
        [displayKeys, customMetrics]
    )

    // Lines shown; defaults to the first two (one per Y axis).
    const [selected, setSelected] = useState(() => series.slice(0, 2).map((s) => s.key))
    useEffect(() => {
        setSelected((prev) => {
            const kept = prev.filter((k) => series.some((s) => s.key === k))
            if (kept.length === prev.length && kept.length > 0) return prev
            return kept.length > 0 ? kept : series.slice(0, 2).map((s) => s.key)
        })
    }, [series])

    const chartData = useMemo(() => {
        const starts = buildBucketStarts(dateRange?.since, dateRange?.until, granularity)
        if (starts.length === 0) return []

        const metaByStart = new Map((weeklyInsights?.weeklyInsights || []).map((w) => [w.weekStart, w]))
        const sheetByStart = new Map(starts.map((s) => [s, {}]))
        for (const [date, row] of Object.entries(sheetDaily || {})) {
            // Last bucket starting on or before this date
            let bucket = null
            for (const s of starts) { if (s <= date) bucket = s; else break }
            if (!bucket) continue
            const sums = sheetByStart.get(bucket)
            for (const [col, v] of Object.entries(row)) sums[col] = (sums[col] || 0) + v
        }

        return starts.map((start) => {
            const meta = metaByStart.get(start) || null
            const sheetSums = sheetByStart.get(start)
            const ctx = {
                meta: (def) => (meta ? def.bucket(meta) ?? null : null),
                // A bucket with no sheet rows reads as 0, like a day with no spend.
                sheet: (col) => (sheetDaily ? sheetSums[col] ?? 0 : null),
            }
            const point = {
                date: start,
                label: formatBucketLabel(start, granularity),
                tooltipTitle: formatBucketTooltipTitle(start, granularity),
            }
            for (const s of series) {
                const v = resolveMetricKey(s.key, ctx, customMetrics)
                point[s.key] = v !== null && Number.isFinite(v) ? v : null
            }
            return point
        })
    }, [dateRange?.since, dateRange?.until, granularity, weeklyInsights, sheetDaily, series, customMetrics])

    const selectedSeries = series.filter((s) => selected.includes(s.key))
    const hasAnyValue = chartData.some((p) => selectedSeries.some((s) => p[s.key] !== null))
    const shouldShowDefaultTooltip = showDefaultTooltip && chartData.length === 1

    const toggle = (key) => {
        setSelected((prev) => {
            if (prev.includes(key)) return prev.length === 1 ? prev : prev.filter((k) => k !== key)
            return [...prev, key]
        })
    }

    const dropdownLabel = selectedSeries.length === 1 ? selectedSeries[0].label : `${selectedSeries.length} metrics`

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null
        const row = payload[0]?.payload
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
                <p className="font-semibold text-gray-900 mb-2">{row?.tooltipTitle || row?.label}</p>
                <div className="space-y-1">
                    {selectedSeries.map((s) => (
                        <p key={s.key} className="text-gray-600">
                            {s.label}:{" "}
                            <span className="font-medium" style={{ color: s.color }}>
                                {formatMetricValue(row?.[s.key], s.format)}
                            </span>
                        </p>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="p-4">
            <div className="mb-[22px] flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">Custom Data</p>
                    <p className="text-xs text-gray-400 truncate">
                        {sheetName ? `${sheetName} · ` : ""}{selectedSeries.map((s) => s.label).join(", ")}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-[200px]">
                    <Helix size="36" speed="2.5" color="#10b981" />
                </div>
            ) : error && !hasAnyValue ? (
                <div className="flex items-center justify-center h-[200px] px-6 text-center text-sm text-amber-700">
                    {error}
                </div>
            ) : series.length === 0 || !hasAnyValue ? (
                <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">
                    No custom data for this date range
                </div>
            ) : (
                <>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData} margin={{ top: 5, right: 0, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e5e7eb' }}
                                interval={Math.max(Math.floor(chartData.length / 12), 0)}
                            />
                            {selectedSeries.map((s, index) => (
                                <YAxis
                                    key={s.key}
                                    yAxisId={s.key}
                                    orientation={index % 2 === 0 ? "left" : "right"}
                                    hide={index > 1}
                                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={tickFormatter(s.format)}
                                    width={index > 1 ? 0 : 56}
                                />
                            ))}
                            <Tooltip
                                content={<CustomTooltip />}
                                defaultIndex={shouldShowDefaultTooltip ? 0 : undefined}
                                active={shouldShowDefaultTooltip ? true : undefined}
                            />
                            {selectedSeries.map((s) => (
                                <Line
                                    key={s.key}
                                    yAxisId={s.key}
                                    type="monotone"
                                    dataKey={s.key}
                                    name={s.label}
                                    stroke={s.color}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0, fill: s.color }}
                                    connectNulls
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>

                    <div className="relative mt-3">
                        <div className="flex flex-wrap items-center justify-start gap-x-12 gap-y-1.5 px-1 w-full sm:pr-[180px]">
                            {selectedSeries.map((s) => (
                                <div key={s.key} className="flex items-center gap-2">
                                    <span className="h-[3px] w-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                                    <span className="text-[11px] font-medium" style={{ color: s.color }}>{s.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 flex justify-center sm:mt-0 sm:absolute sm:right-0 sm:top-0">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-8 min-w-[170px] justify-between rounded-xl border-gray-200 bg-white px-3 text-xs font-medium shadow-xs hover:bg-white"
                                    >
                                        <span className="truncate">{dropdownLabel}</span>
                                        <ChevronDown className="ml-2 h-3.5 w-3.5 text-gray-400" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[240px] rounded-2xl bg-white p-2 shadow-lg">
                                    <DropdownMenuLabel className="px-2 py-1 text-xs font-semibold text-gray-500">
                                        Show on graph
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="mx-1 my-1 bg-gray-100" />
                                    {series.map((s) => (
                                        <DropdownMenuItem
                                            key={s.key}
                                            onSelect={(e) => e.preventDefault()}
                                            onClick={() => toggle(s.key)}
                                            className="cursor-pointer rounded-xl px-3 py-2 text-sm focus:bg-gray-100 flex items-center gap-2"
                                        >
                                            {selected.includes(s.key) ? (
                                                <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                            ) : (
                                                <span className="h-4 w-4 flex-shrink-0" />
                                            )}
                                            <span className="truncate">{s.label}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// FEATURE END: CUSTOM DATA + CUSTOM METRICS
// ════════════════════════════════════════════════════════════════════════════
