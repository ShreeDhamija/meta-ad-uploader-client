"use client"

/* eslint-disable react/prop-types */

// ════════════════════════════════════════════════════════════════════════════
// FEATURE START: PERIOD METRICS SUMMARY (added 2026-05-19)
// ----------------------------------------------------------------------------
// Renders the row of summary tiles above the 4 charts inside the Charts Card.
// Each tile shows the metric for the selected date range and the % delta vs
// the same-length period immediately preceding it. Backed by GET
// /period-summary. Hide-on-remove: delete this file and its imports + render
// site in AnalyticsDashboard.jsx (look for matching FEATURE START/END fences).
// ════════════════════════════════════════════════════════════════════════════

import { useMemo } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { ArrowDown, ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { parseAnalyticsDate } from "./dateRangeUtils"

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatRange(range) {
    if (!range?.since || !range?.until) return ""
    const s = parseAnalyticsDate(range.since)
    const u = parseAnalyticsDate(range.until)
    if (!s || !u) return ""
    const sStr = `${MONTH_SHORT[s.getMonth()]} ${s.getDate()}`
    const uStr = `${MONTH_SHORT[u.getMonth()]} ${u.getDate()}, ${u.getFullYear()}`
    return `${sStr} – ${uStr}`
}

function formatCurrency(v) {
    if (v === null || v === undefined) return "—"
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(2)}`
}

function formatInt(v) {
    if (v === null || v === undefined) return "—"
    return Math.round(v).toLocaleString()
}

function formatRoas(v) {
    if (v === null || v === undefined) return "—"
    return `${v.toFixed(2)}x`
}

function formatPct(v) {
    if (v === null || v === undefined) return "—"
    return `${v.toFixed(2)}%`
}

function formatDelta(v) {
    if (v === null || v === undefined) return null
    const rounded = Math.abs(v) < 0.05 ? 0 : v
    return `${rounded >= 0 ? "+" : ""}${rounded.toFixed(1)}%`
}

function deltaTone(value, lowerIsBetter) {
    if (value === null || value === undefined) return "neutral"
    if (Math.abs(value) < 0.05) return "neutral"
    const isPositive = value > 0
    if (lowerIsBetter) return isPositive ? "bad" : "good"
    return isPositive ? "good" : "bad"
}

function MetricTile({ label, value, delta, lowerIsBetter, previousValue, previousLabel }) {
    const tone = deltaTone(delta, lowerIsBetter)
    const deltaText = formatDelta(delta)
    const arrow = delta === null || delta === undefined
        ? null
        : delta >= 0
            ? <ArrowUp className="w-3 h-3" strokeWidth={2.5} />
            : <ArrowDown className="w-3 h-3" strokeWidth={2.5} />

    const tooltip = previousValue !== undefined
        ? `Previous ${previousLabel ? previousLabel + ": " : ""}${previousValue}`
        : undefined

    return (
        <div
            className="flex flex-col gap-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 min-w-0"
            title={tooltip}
        >
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-base font-semibold text-gray-900 truncate">{value}</span>
                {deltaText && (
                    <span
                        className={cn(
                            "inline-flex items-center gap-0.5 text-[11px] font-medium rounded-full px-1.5 py-0.5 flex-shrink-0",
                            tone === "good" && "bg-green-50 text-green-700",
                            tone === "bad" && "bg-red-50 text-red-700",
                            tone === "neutral" && "bg-gray-100 text-gray-500",
                        )}
                    >
                        {arrow}
                        {deltaText}
                    </span>
                )}
            </div>
        </div>
    )
}

export default function PeriodMetricsSummary({ data, loading, mode = "cpr" }) {
    const isRoas = mode === "roas"

    const tiles = useMemo(() => {
        const current = data?.current || {}
        const previous = data?.previous || {}
        const deltas = data?.deltas || {}

        const kpiTile = isRoas
            ? {
                key: "roas",
                label: "ROAS",
                value: formatRoas(current.roas),
                delta: deltas.roas,
                lowerIsBetter: false,
                previousValue: formatRoas(previous.roas),
            }
            : {
                key: "cpa",
                label: "CPA",
                value: formatCurrency(current.cpa),
                delta: deltas.cpa,
                lowerIsBetter: true,
                previousValue: formatCurrency(previous.cpa),
            }

        return [
            {
                key: "spend",
                label: "Spend",
                value: formatCurrency(current.spend),
                delta: deltas.spend,
                lowerIsBetter: false,
                previousValue: formatCurrency(previous.spend),
            },
            {
                key: "conversions",
                label: "Conversions",
                value: formatInt(current.conversions),
                delta: deltas.conversions,
                lowerIsBetter: false,
                previousValue: formatInt(previous.conversions),
            },
            kpiTile,
            {
                key: "cpm",
                label: "CPM",
                value: formatCurrency(current.cpm),
                delta: deltas.cpm,
                lowerIsBetter: true,
                previousValue: formatCurrency(previous.cpm),
            },
            {
                key: "linkCtr",
                label: "Link CTR",
                value: formatPct(current.linkCtr),
                delta: deltas.linkCtr,
                lowerIsBetter: false,
                previousValue: formatPct(previous.linkCtr),
            },
            {
                key: "costPerLinkClick",
                label: "Cost / Link Click",
                value: formatCurrency(current.costPerLinkClick),
                delta: deltas.costPerLinkClick,
                lowerIsBetter: true,
                previousValue: formatCurrency(previous.costPerLinkClick),
            },
        ]
    }, [data, isRoas])

    const previousLabel = data?.previousRange ? formatRange(data.previousRange) : null

    if (loading && !data) {
        return (
            <div className="px-4 pt-4 lg:pt-10">
                <div className="flex items-center justify-center h-[72px] rounded-2xl border border-gray-200 bg-gray-50">
                    <Helix size="28" speed="2.5" color="#3b82f6" />
                </div>
            </div>
        )
    }

    if (!data) return null

    return (
        <div className="px-4 pt-4 lg:pt-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {tiles.map((t) => (
                    <MetricTile
                        key={t.key}
                        label={t.label}
                        value={t.value}
                        delta={t.delta}
                        lowerIsBetter={t.lowerIsBetter}
                        previousValue={t.previousValue}
                        previousLabel={previousLabel}
                    />
                ))}
            </div>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// FEATURE END: PERIOD METRICS SUMMARY
// ════════════════════════════════════════════════════════════════════════════
