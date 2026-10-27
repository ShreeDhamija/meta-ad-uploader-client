"use client"

import { useState, useEffect, useRef } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { Button } from "@/components/ui/button"
import { Activity, Stethoscope } from "lucide-react"
import {
    ComposedChart, Bar, Line, XAxis, YAxis,
    CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from "recharts"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import ReportShareMenu from "./ReportShareMenu"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

// ── Palette (aligned with AdAccountAudit) ───────────────────────────────────
const ORANGE = "#FF4800"
const ORANGE_DEEP = "#D93B00"
const ORANGE_LIGHT = "#FFC7A8"
const ORANGE_SOFT = "#FFE6DA"
const PINK = "#F00D55"
const PINK_DEEP = "#C70845"
const PINK_SOFT = "#FCD9E3"
const BLUE = "#2563EB"
const BLUE_SOFT = "#EFF6FF"
const BLUE_BORDER = "#BFDBFE"

const INK = "#0F1115"
const INK_2 = "#2A2E35"
const MUTED = "#6B7280"
const MUTED_2 = "#9CA3AF"
const LINE = "#E7E9EE"
const LINE_2 = "#D8DCE3"
const PAPER = "#FFFFFF"
const PAPER_2 = "#F8F9FB"

const GOOD = "#22c55e"
const GOOD_DEEP = "#15803d"
const WARN = "#f59e0b"
const BAD = "#ef4444"
const GOOD_SOFT = "rgba(34,197,94,0.08)"
const WARN_SOFT = "rgba(245,158,11,0.10)"
const BAD_SOFT = "rgba(239,68,68,0.08)"

// ── Shared chart styling ─────────────────────────────────────────────────────
const FONT = "'Inter Tight', system-ui, sans-serif"
const GRID_STROKE = "#EEF0F4"
const AXIS_TICK = { fontSize: 10, fill: MUTED_2, fontFamily: FONT }
const AXIS_LINE = { stroke: LINE }
const TOOLTIP_STYLE = {
    borderRadius: "12px",
    border: `1px solid ${LINE}`,
    boxShadow: "none",
    fontSize: "12px",
    padding: "8px 12px",
    fontFamily: FONT,
}

// ── Formatters ───────────────────────────────────────────────────────────────
function formatEventName(actionType) {
    if (!actionType) return "Auto-detected event"
    if (actionType.startsWith("offsite_conversion.fb_pixel_custom.")) {
        return actionType.slice("offsite_conversion.fb_pixel_custom.".length)
            .replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase())
    }
    if (actionType === "offsite_conversion.fb_pixel_custom") return "Custom Event"
    if (actionType.startsWith("offsite_conversion.custom.")) return "Custom Conversion"
    if (actionType.startsWith("offsite_conversion.fb_pixel_")) {
        return actionType.slice("offsite_conversion.fb_pixel_".length)
            .replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase())
    }
    return actionType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}
function formatEventDetail(detail, eventName) {
    if (!detail || !eventName) return detail
    return detail.split(eventName).join(formatEventName(eventName))
}

function fmtCurrency(v) {
    if (v === null || v === undefined) return "—"
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(2)}`
}
function fmtSpendShort(v) {
    if (v === null || v === undefined) return "—"
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(0)}`
}
function fmtKpi(v, mode) {
    if (v === null || v === undefined) return "N/A"
    return mode === "cpr" ? `$${v.toFixed(2)}` : `${v.toFixed(2)}×`
}
function fmtDateShort(d) {
    if (!d) return ""
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ═════════════════════════════════════════════════════════════════════════════
// REUSABLE PRIMITIVES
// ═════════════════════════════════════════════════════════════════════════════

function SmallLabel({ children, className, style }) {
    return (
        <p
            className={cn("font-medium", className)}
            style={{ fontSize: 10.5, color: MUTED, margin: 0, ...style }}
        >
            {children}
        </p>
    )
}

function SectionHeader({ title, sub }) {
    return (
        <div className="flex items-start justify-between mb-5">
            <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.015em", margin: 0, color: INK }}>
                    {title}
                </h3>
                {sub && (
                    <p style={{ fontSize: 11.5, color: MUTED, margin: "4px 0 0", maxWidth: 560 }}>
                        {sub}
                    </p>
                )}
            </div>
        </div>
    )
}

function SectionCard({ children, id, dark }) {
    return (
        <div
            id={`diagnostic-${id}`}
            className="rounded-3xl"
            style={{
                background: dark ? INK : PAPER,
                border: `1px solid ${dark ? INK : LINE}`,
                padding: "22px 24px 24px",
                color: dark ? "#fff" : INK,
                fontFamily: FONT,
            }}
        >
            {children}
        </div>
    )
}

function MetricCard({ label, value, unit, sub, dark }) {
    return (
        <div
            className="flex flex-col gap-3 p-4 min-w-0"
            style={{
                background: dark ? INK : PAPER,
                color: dark ? "#fff" : INK,
            }}
        >
            <SmallLabel style={{ color: dark ? "rgba(255,255,255,0.55)" : MUTED }}>{label}</SmallLabel>
            <p
                className="tabular-nums"
                style={{
                    fontSize: 40,
                    fontWeight: 800,
                    letterSpacing: "-0.015em",
                    lineHeight: 1,
                    margin: 0,
                    color: dark ? "#fff" : INK,
                }}
            >
                {value}
                {unit && <span style={{ fontSize: 40, fontWeight: 600, color: dark ? "#fff" : INK, marginLeft: 2 }}>{unit}</span>}
            </p>
            {sub && (
                <p style={{ fontSize: 11.5, color: dark ? "rgba(255,255,255,0.6)" : MUTED, margin: 0 }}>
                    {sub}
                </p>
            )}
        </div>
    )
}

function MetricGrid({ children, columns = 3, className, style }) {
    const items = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean)
    return (
        <div
            className={className}
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                ...style,
            }}
        >
            {items.map((child, idx) => (
                <div
                    key={child.key || idx}
                    style={{
                        borderLeft: idx % columns === 0 ? 0 : `1px dotted ${LINE_2}`,
                        borderTop: idx < columns ? 0 : `1px dotted ${LINE_2}`,
                    }}
                >
                    {child}
                </div>
            ))}
        </div>
    )
}

function InsightTile({ label, value, valuePrefix, valueUnit, desc, status = "neutral" }) {
    const colors = {
        good: { dot: GOOD, ring: "rgba(34,197,94,0.18)" },
        warn: { dot: WARN, ring: "rgba(245,158,11,0.20)" },
        bad: { dot: BAD, ring: "rgba(239,68,68,0.18)" },
        neutral: { dot: MUTED_2, ring: "rgba(156,163,175,0.20)" },
    }[status]

    return (
        <div className="relative" style={{ background: PAPER, padding: "14px 16px 15px" }}>
            <span
                className="absolute"
                style={{
                    top: 14,
                    right: 14,
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    background: colors.dot,
                    boxShadow: `0 0 0 4px ${colors.ring}`,
                }}
            />
            <SmallLabel style={{ fontSize: 9.5, marginBottom: 22, paddingRight: 20 }}>{label}</SmallLabel>
            <div
                className="tabular-nums"
                style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1, color: INK }}
            >
                {valuePrefix && <span style={{ fontSize: 30, fontWeight: 600, color: INK }}>{valuePrefix}</span>}
                {value}
                {valueUnit && <span style={{ fontSize: 30, fontWeight: 600, color: INK, marginLeft: 1 }}>{valueUnit}</span>}
            </div>
            {desc && <p style={{ fontSize: 11.5, color: MUTED, margin: "6px 0 0", lineHeight: 1.4 }}>{desc}</p>}
        </div>
    )
}

function ChartTooltipContent({ active, payload, label, formatters }) {
    if (!active || !payload?.length) return null
    return (
        <div style={{ background: PAPER, borderRadius: 12, border: `1px solid ${LINE}`, padding: "8px 12px", fontSize: 12, minWidth: 140, fontFamily: FONT }}>
            <p style={{ fontWeight: 700, color: INK_2, margin: "0 0 6px", fontSize: 11 }}>{label}</p>
            {payload.map((entry) => (
                <div key={entry.name} className="flex justify-between gap-4">
                    <span style={{ color: entry.color, fontWeight: 500 }}>{entry.name}</span>
                    <span className="tabular-nums" style={{ color: INK, fontWeight: 700 }}>
                        {formatters?.[entry.name] ? formatters[entry.name](entry.value) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 0: SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

function SummarySection({ report }) {
    const { mode, kpiLabel, anomalyPeriod, previousPeriod, culprits, changes, eventHealth, dateRange } = report

    const tiles = []

    if (anomalyPeriod && previousPeriod) {
        const anomalyKpi = anomalyPeriod.avgKpi
        const prevKpi = previousPeriod.avgKpi
        let delta = null
        if (anomalyKpi != null && prevKpi != null && prevKpi !== 0) {
            delta = ((anomalyKpi - prevKpi) / prevKpi) * 100
        }
        const worse = mode === "cpr" ? (delta > 0) : (delta < 0)
        tiles.push({
            label: `Selected Period ${kpiLabel}`,
            value: anomalyKpi != null ? anomalyKpi.toFixed(mode === "cpr" ? 2 : 2) : "—",
            valuePrefix: mode === "cpr" && anomalyKpi != null ? "$" : undefined,
            valueUnit: mode !== "cpr" && anomalyKpi != null ? "×" : undefined,
            desc: `${anomalyPeriod.days}-day period (${fmtDateShort(anomalyPeriod.startDate)}–${fmtDateShort(anomalyPeriod.endDate)}) vs prior ${fmtKpi(prevKpi, mode)}${delta != null ? ` (${delta > 0 ? "+" : ""}${delta.toFixed(0)}%)` : ""}.`,
            status: worse ? "warn" : "good",
        })
    } else {
        tiles.push({
            label: `Selected Period ${kpiLabel}`,
            value: "—",
            desc: "No delivery data was found for the selected period — try a different date range.",
            status: "neutral",
        })
    }

    if (anomalyPeriod) {
        tiles.push({
            label: "Contributing Factors",
            value: culprits?.length || 0,
            desc: culprits?.length
                ? `${culprits.length} ${culprits.length === 1 ? "entity" : "entities"} with a meaningful share of spend swung 15%+ (campaigns, ad sets) or 25%+ (ads).`
                : "No individual campaign, ad set, or ad explains the change on its own.",
            status: culprits?.length ? "warn" : "neutral",
        })
    }

    const flaggedTraffic = report.trafficChanges?.flagged || []
    if (report.trafficChanges) {
        tiles.push({
            label: "Traffic Metrics Flagged",
            value: flaggedTraffic.length,
            desc: flaggedTraffic.length
                ? `${flaggedTraffic.map(m => TRAFFIC_LABEL[m]).join(", ")} moved more than ${report.trafficChanges.thresholdPct}% vs the comparison period.`
                : `No traffic metric moved more than ${report.trafficChanges.thresholdPct}% between the periods.`,
            status: flaggedTraffic.length ? "warn" : "good",
        })
    }

    tiles.push({
        label: "Recent Changes",
        value: changes?.length || 0,
        desc: changes?.length
            ? `${changes.length} significant ${changes.length === 1 ? "change" : "changes"} from 48 hours before through the selected period.`
            : "No significant budget or targeting changes detected.",
        status: changes?.length ? "neutral" : "good",
    })

    if (eventHealth) {
        const statusMap = { healthy: "good", warning: "warn", stale: "bad" }
        tiles.push({
            label: "Event Health",
            value: eventHealth.status === "healthy" ? "Healthy" : eventHealth.status === "warning" ? "Warn" : eventHealth.status === "stale" ? "Stale" : "—",
            desc: `${formatEventName(eventHealth.eventName)} — last fired ${eventHealth.lastFiredAgo || "unknown"}.`,
            status: statusMap[eventHealth.status] || "neutral",
        })
    }

    if (report.pixelHealth) {
        const errorCount = report.pixelHealth.issues.filter(i => i.severity === "error").length
        const issueCount = report.pixelHealth.issues.length
        tiles.push({
            label: "Events Manager",
            value: issueCount,
            desc: issueCount
                ? `${issueCount} ${issueCount === 1 ? "issue" : "issues"} to fix in match quality, Conversions API, matching or diagnostics.`
                : "No Events Manager issues found.",
            status: errorCount ? "bad" : issueCount ? "warn" : "good",
        })
    }

    // Headline
    let headline = `Diagnosing ${fmtDateShort(dateRange.since)} — ${fmtDateShort(dateRange.until)}.`
    if (anomalyPeriod && previousPeriod && anomalyPeriod.avgKpi != null && previousPeriod.avgKpi != null) {
        const delta = ((anomalyPeriod.avgKpi - previousPeriod.avgKpi) / previousPeriod.avgKpi) * 100
        const worse = mode === "cpr" ? delta > 0 : delta < 0
        const stretch = anomalyPeriod.days === 1
            ? `on ${fmtDateShort(anomalyPeriod.startDate)}`
            : `over ${fmtDateShort(anomalyPeriod.startDate)} — ${fmtDateShort(anomalyPeriod.endDate)} (${anomalyPeriod.days} days)`
        headline = `${kpiLabel} ${worse ? "worsened" : "improved"} from ${fmtKpi(previousPeriod.avgKpi, mode)} to ${fmtKpi(anomalyPeriod.avgKpi, mode)} ${stretch} (${delta > 0 ? "+" : ""}${delta.toFixed(0)}%).`
    } else if (!anomalyPeriod) {
        headline = "No delivery data was found for the selected period."
    }

    return (
        <SectionCard id="summary">
            <SectionHeader
                title="Diagnostic Summary"
                sub="Trailing 14 days · the period you selected vs the same-length period immediately before it."
            />

            <div className="rounded-3xl mb-3" style={{ background: PAPER, border: `1px solid ${ORANGE}`, color: INK, padding: "16px 20px" }}>
                <p
                    style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 400, color: INK, maxWidth: 800, margin: 0 }}
                    dangerouslySetInnerHTML={{
                        __html: headline
                            .replace(/\$[\d,.]+k?/g, "<strong>$&</strong>")
                            .replace(/\d+(\.\d+)?[×%]/g, "<strong>$&</strong>"),
                    }}
                />
            </div>

            <MetricGrid columns={2}>
                {tiles.map(tile => <InsightTile key={tile.label} {...tile} />)}
            </MetricGrid>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: TREND CHART (Spend bars + KPI line, anomaly highlighted)
// ═════════════════════════════════════════════════════════════════════════════

function TrendSection({ dailyData, anomalyPeriod, mode, kpiLabel }) {
    const startIdx = anomalyPeriod ? dailyData.findIndex(d => d.date === anomalyPeriod.startDate) : -1
    const endIdx = anomalyPeriod ? dailyData.findIndex(d => d.date === anomalyPeriod.endDate) : -1

    const chartData = dailyData.map((d, i) => ({
        date: fmtDateShort(d.date),
        spend: d.spend,
        kpi: d.kpi,
        isAnomaly: startIdx >= 0 && endIdx >= 0 && i >= startIdx && i <= endIdx,
    }))

    const kpiAxisFmt = (v) => mode === "cpr" ? `$${Math.round(v)}` : `${v.toFixed(1)}×`

    const totalSpend = dailyData.reduce((s, d) => s + d.spend, 0)
    const validKpis = dailyData.filter(d => d.kpi !== null).map(d => d.kpi)
    const avgKpi = validKpis.length ? validKpis.reduce((a, b) => a + b, 0) / validKpis.length : null

    return (
        <SectionCard id="trend">
            <SectionHeader
                title={`Account Spend & ${kpiLabel} — Trailing 14 Days`}
                sub={`Daily spend (bars) and ${kpiLabel} (line)${anomalyPeriod ? " · Selected period highlighted in pink" : ""}.`}
            />
            <MetricGrid columns={3} className="mb-4">
                <MetricCard label="Total Spend · 14d" value={fmtCurrency(totalSpend)} />
                <MetricCard label={`Avg ${kpiLabel} · 14d`} value={fmtKpi(avgKpi, mode)} />
                <MetricCard
                    label="Selected Days"
                    value={anomalyPeriod ? `${anomalyPeriod.days}` : "0"}
                    sub={anomalyPeriod ? `${fmtDateShort(anomalyPeriod.startDate)}–${fmtDateShort(anomalyPeriod.endDate)}` : "no delivery"}
                />
            </MetricGrid>

            <div className="rounded-2xl" style={{ background: PAPER, border: `1px solid ${LINE}`, padding: "14px 12px 8px", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="date" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} interval="preserveStartEnd" />
                        <YAxis yAxisId="kpi" orientation="left" tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} tickFormatter={kpiAxisFmt} />
                        <YAxis yAxisId="spend" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} tickFormatter={fmtSpendShort} />
                        <RechartsTooltip
                            content={<ChartTooltipContent formatters={{
                                Spend: (v) => fmtSpendShort(Number(v)),
                                [kpiLabel]: (v) => mode === "cpr" ? `$${Number(v).toFixed(2)}` : `${Number(v).toFixed(2)}×`,
                            }} />}
                        />
                        <Bar yAxisId="spend" dataKey="spend" name="Spend" radius={[3, 3, 0, 0]} maxBarSize={22}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.isAnomaly ? PINK : ORANGE_LIGHT} />
                            ))}
                        </Bar>
                        <Line
                            yAxisId="kpi"
                            type="monotone"
                            dataKey="kpi"
                            name={kpiLabel}
                            stroke={PINK}
                            strokeWidth={2.5}
                            connectNulls={false}
                            dot={(props) => {
                                const { cx, cy, index } = props
                                if (cx == null || cy == null) return null
                                const isAnomaly = chartData[index]?.isAnomaly
                                return <circle key={index} cx={cx} cy={cy} r={3} fill={isAnomaly ? PINK : ORANGE} strokeWidth={0} />
                            }}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: ANOMALY DETAIL (period comparison + culprits)
// ═════════════════════════════════════════════════════════════════════════════

function AnomalySection({ anomalyPeriod, previousPeriod, culprits, mode, kpiLabel }) {
    if (!anomalyPeriod || !previousPeriod) {
        return (
            <SectionCard id="anomaly">
                <SectionHeader title="Selected Period" sub="Period-over-period comparison and contributing campaigns / ad sets / ads." />
                <div className="rounded-3xl px-4 py-3 text-sm" style={{ background: PAPER_2, border: `1px solid ${LINE}`, color: INK_2 }}>
                    <span className="font-semibold">No data for the selected period.</span> No delivery data was found for it — try a different date range.
                </div>
            </SectionCard>
        )
    }

    return (
        <SectionCard id="anomaly">
            <SectionHeader
                title={`Selected Period: ${fmtDateShort(anomalyPeriod.startDate)} — ${fmtDateShort(anomalyPeriod.endDate)} (${anomalyPeriod.days} ${anomalyPeriod.days === 1 ? "day" : "days"})`}
                sub="Compared against the same-length window immediately before it."
            />
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rounded-3xl p-4" style={{ background: ORANGE_SOFT, border: `1px solid rgba(255,72,0,0.24)` }}>
                    <SmallLabel style={{ color: ORANGE_DEEP, marginBottom: 8 }}>Selected period ({anomalyPeriod.days}d)</SmallLabel>
                    <div className="flex items-baseline gap-6">
                        <div>
                            <SmallLabel style={{ color: ORANGE_DEEP }}>{kpiLabel}</SmallLabel>
                            <p className="text-xl font-bold tabular-nums" style={{ color: ORANGE_DEEP, letterSpacing: "-0.005em" }}>{fmtKpi(anomalyPeriod.avgKpi, mode)}</p>
                        </div>
                        <div>
                            <SmallLabel style={{ color: ORANGE_DEEP }}>Spend</SmallLabel>
                            <p className="text-xl font-bold tabular-nums" style={{ color: ORANGE_DEEP, letterSpacing: "-0.005em" }}>{fmtCurrency(anomalyPeriod.spend)}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-3xl p-4" style={{ background: GOOD_SOFT, border: `1px solid rgba(34,197,94,0.22)` }}>
                    <SmallLabel style={{ color: GOOD_DEEP, marginBottom: 8 }}>Comparison period ({previousPeriod.days}d)</SmallLabel>
                    <div className="flex items-baseline gap-6">
                        <div>
                            <SmallLabel style={{ color: GOOD_DEEP }}>{kpiLabel}</SmallLabel>
                            <p className="text-xl font-bold tabular-nums" style={{ color: GOOD_DEEP, letterSpacing: "-0.005em" }}>{fmtKpi(previousPeriod.avgKpi, mode)}</p>
                        </div>
                        <div>
                            <SmallLabel style={{ color: GOOD_DEEP }}>Spend</SmallLabel>
                            <p className="text-xl font-bold tabular-nums" style={{ color: GOOD_DEEP, letterSpacing: "-0.005em" }}>{fmtCurrency(previousPeriod.spend)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-2">
                <SmallLabel style={{ marginBottom: 2 }}>Contributing Factors</SmallLabel>
                <p style={{ fontSize: 11.5, color: MUTED, margin: "0 0 12px" }}>Spend swings of 15%+ for campaigns and ad sets and 25%+ for ads, among those carrying a meaningful share of spend in either period. Largest dollar swings first.</p>
            </div>

            {culprits.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl" style={{ border: `1px solid ${LINE}` }}>
                    <table className="min-w-full text-sm">
                        <thead style={{ background: PAPER_2 }}>
                            <tr>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Level</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Name</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Selected Spend</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Prev Spend</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Spend Change %</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Prev {kpiLabel}</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Selected {kpiLabel}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {culprits.map((c) => (
                                <tr key={`${c.level}-${c.id}`} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-3.5 py-2.5">
                                        <span
                                            className="inline-block px-2.5 py-0.5 text-[10px] rounded-md font-semibold"
                                            style={{
                                                background:
                                                    c.level === "campaign" ? ORANGE_SOFT :
                                                        c.level === "adset" ? PINK_SOFT : PAPER_2,
                                                color: c.level === "campaign" ? ORANGE_DEEP : c.level === "adset" ? PINK_DEEP : INK_2,
                                            }}
                                        >
                                            {c.level}
                                        </span>
                                    </td>
                                    <td className="px-3.5 py-2.5 max-w-[260px]">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <p className="text-gray-800 font-medium truncate cursor-default">{c.name}</p>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-[360px] break-words">{c.name}</TooltipContent>
                                        </Tooltip>
                                        {c.parent && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <p className="text-[10px] text-gray-400 truncate cursor-default">{c.parent}</p>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="max-w-[360px] break-words">{c.parent}</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </td>
                                    <td className="px-3.5 py-2.5 text-left text-gray-600 tabular-nums">{fmtCurrency(c.anomalySpend)}</td>
                                    <td className="px-3.5 py-2.5 text-left text-gray-600 tabular-nums">{fmtCurrency(c.prevSpend)}</td>
                                    <td className="px-3.5 py-2.5 text-left tabular-nums">
                                        <span style={{ color: c.spendDelta > 0 ? PINK_DEEP : ORANGE_DEEP, fontWeight: 700 }}>
                                            {c.spendDelta > 0 ? "+" : ""}{c.spendDelta.toFixed(0)}%
                                        </span>
                                    </td>
                                    <td className="px-3.5 py-2.5 text-left text-gray-600 tabular-nums">{fmtKpi(c.prevKpi, mode)}</td>
                                    <td className="px-3.5 py-2.5 text-left text-gray-600 tabular-nums">{fmtKpi(c.anomalyKpi, mode)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-sm text-gray-500 italic">No campaign, ad set or ad with a meaningful share of spend swung enough (15%+ for campaigns and ad sets, 25%+ for ads) to explain the change on its own.</p>
            )}
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: CHANGES
// ═════════════════════════════════════════════════════════════════════════════

function ChangesSection({ changes, anomalyDetected }) {
    return (
        <SectionCard id="changes">
            <SectionHeader
                title="Account Changes"
                sub={anomalyDetected ? "Budget shifts >25% and ad set targeting changes from 48 hours before the selected period through its last day." : "Budget shifts >25% and ad set targeting changes over the last 7 days."}
            />
            {changes.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl" style={{ border: `1px solid ${LINE}` }}>
                    <table className="min-w-full text-sm">
                        <thead style={{ background: PAPER_2 }}>
                            <tr>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Date</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Type</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Object</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {changes.map((c, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-3.5 py-2.5 text-gray-600 whitespace-nowrap text-xs">{c.date ? fmtDateShort(c.date) : "—"}</td>
                                    <td className="px-3.5 py-2.5">
                                        <span
                                            className="inline-block px-2.5 py-0.5 text-[10px] rounded-md font-semibold"
                                            style={{
                                                background: c.type === "budget" ? ORANGE_SOFT : PINK_SOFT,
                                                color: c.type === "budget" ? ORANGE_DEEP : PINK_DEEP,
                                            }}
                                        >
                                            {c.type}
                                        </span>
                                    </td>
                                    <td className="px-3.5 py-2.5 text-gray-700 text-xs max-w-[200px] truncate" title={c.objectName}>{c.objectName || "—"}</td>
                                    <td className="px-3.5 py-2.5 text-gray-600 text-xs whitespace-pre-wrap max-w-[360px]">{c.detail}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-sm italic" style={{ color: MUTED }}>No budget changes over 25% or ad set targeting changes in this window.</p>
            )}
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// PERFORMANCE METRICS CHART (Cost Per Link Click / CR / CPM / CTR with 14d/30d toggle)
// ═════════════════════════════════════════════════════════════════════════════

const PERF_METRIC_OPTIONS = [
    { key: "cplc", label: "Cost Per Link Click", format: (v) => `$${v.toFixed(2)}`, color: ORANGE },
    { key: "cr", label: "Conversion Rate", format: (v) => `${v.toFixed(2)}%`, color: PINK },
    { key: "cpm", label: "CPM", format: (v) => `$${v.toFixed(2)}`, color: ORANGE_DEEP },
    { key: "ctr", label: "Click-Through Rate", format: (v) => `${v.toFixed(2)}%`, color: PINK_DEEP },
]

function getPerfMetricConfig(key) {
    return PERF_METRIC_OPTIONS.find(m => m.key === key) || PERF_METRIC_OPTIONS[0]
}

function resolvePerfMetric(key, d) {
    switch (key) {
        case "cplc": return (d.clicks && d.clicks > 0 && d.spend > 0) ? d.spend / d.clicks : null
        case "cr": return (d.clicks && d.clicks > 0 && d.conversions) ? (d.conversions / d.clicks) * 100 : null
        case "cpm": return d.cpm ?? null
        case "ctr": return d.ctr ?? null
        default: return null
    }
}

function formatPerfPeriodLabel(dateStr, breakdown = "daily") {
    const date = new Date(dateStr + "T00:00:00")
    if (breakdown === "monthly") return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function PerfMetricSelector({ value, onChange, exclude }) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-7 text-[11px] rounded-lg px-2 py-1 text-gray-700 bg-white border-gray-200 shadow-none focus:ring-1 w-auto gap-1.5">
                <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl bg-white shadow-none">
                {PERF_METRIC_OPTIONS.filter(m => m.key === value || m.key !== exclude).map(m => (
                    <SelectItem key={m.key} value={m.key} className="text-[11px] rounded-md">
                        {m.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

const PERF_DAY_OPTIONS = [14, 30]

async function fetchAccountDailySummary(params) {
    const res = await fetch(`${API_BASE_URL}/api/analytics/account-daily-summary?${params}`, {
        credentials: "include",
        cache: "no-store",
    })
    if (!res.ok) {
        let errMsg = "Failed to load"
        try { const err = await res.json(); errMsg = err.error || errMsg } catch { /* */ }
        throw new Error(errMsg)
    }
    return res.json()
}

// staticSummaries ({ 14: summary, 30: summary }) renders a shared snapshot
// without fetching; onSummary(days, summary) reports each loaded range so a
// share can include it.
function PerformanceMetricsChart({
    adAccountId,
    kpiType = "cpa",
    conversionEvent,
    refreshKey,
    since,
    until,
    breakdown = "daily",
    staticSummaries,
    onSummary,
}) {
    const controlled = !!(since && until)
    const [days, setDays] = useState(14)
    const [fetchedSummary, setSummary] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [leftMetric, setLeftMetric] = useState("cplc")
    const [rightMetric, setRightMetric] = useState("cr")
    const summary = staticSummaries ? staticSummaries[days] || null : fetchedSummary
    const dayOptions = staticSummaries ? PERF_DAY_OPTIONS.filter(d => staticSummaries[d]) : PERF_DAY_OPTIONS

    useEffect(() => {
        if (staticSummaries) return
        if (!adAccountId) { setSummary(null); return }
        let cancelled = false
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({ adAccountId, kpiType })
        if (conversionEvent) params.set("conversionEvent", conversionEvent)
        if (controlled) {
            params.set("since", since)
            params.set("until", until)
        } else {
            params.set("days", String(days))
        }
        if (breakdown !== "daily") params.set("breakdown", breakdown)
        if (refreshKey) params.set("rk", String(refreshKey))

        async function load() {
            try {
                const data = await fetchAccountDailySummary(params)
                if (!cancelled) {
                    setSummary(data)
                    if (!controlled) onSummary?.(days, data)
                }
            } catch (err) {
                if (!cancelled) setError(err.message || "Error")
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adAccountId, kpiType, conversionEvent, days, since, until, controlled, breakdown, refreshKey, staticSummaries])

    const leftCfg = getPerfMetricConfig(leftMetric)
    const rightCfg = getPerfMetricConfig(rightMetric)

    const chartData = (summary?.dailyData || []).map(d => ({
        date: formatPerfPeriodLabel(d.date, breakdown),
        left: resolvePerfMetric(leftMetric, d),
        right: resolvePerfMetric(rightMetric, d),
    }))

    if (!adAccountId && !staticSummaries) return null

    return (
        <SectionCard id="performance">
            <div className="flex items-start justify-between mb-5 gap-3">
                <div className="min-w-0">
                    <SectionHeader title="Performance Metrics" sub="Compare account-level delivery metrics over the selected period." />
                    <div className="flex items-center gap-2 mt-2">
                        <PerfMetricSelector value={leftMetric} onChange={setLeftMetric} exclude={rightMetric} />
                        <span className="text-[10px] text-gray-400">vs</span>
                        <PerfMetricSelector value={rightMetric} onChange={setRightMetric} exclude={leftMetric} />
                    </div>
                </div>
                {!controlled && dayOptions.length > 0 && (
                    <div className="flex items-center gap-1 rounded-xl p-0.5 flex-shrink-0" style={{ background: PAPER_2, border: `1px solid ${LINE}` }}>
                        {dayOptions.map(d => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                className="px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all"
                                style={{
                                    background: days === d ? PAPER : "transparent",
                                    color: days === d ? INK : MUTED,
                                    border: days === d ? `1px solid ${LINE}` : "1px solid transparent",
                                    boxShadow: days === d ? "0 1px 4px rgba(15,17,21,0.08)" : "none",
                                }}
                            >
                                {d} Days
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="rounded-2xl" style={{ background: PAPER, border: `1px solid ${LINE}`, padding: "14px 12px 8px", height: 280 }}>
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Helix size="32" speed="2.5" color={BLUE} />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full text-red-500 text-sm">{error}</div>
                ) : chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">No data available</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 4" stroke={GRID_STROKE} vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={AXIS_TICK}
                                axisLine={AXIS_LINE}
                                tickLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                tick={{ fontSize: 10, fill: leftCfg.color }}
                                tickLine={false}
                                axisLine={false}
                                width={52}
                                tickFormatter={(v) => leftCfg.format(v)}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fontSize: 10, fill: rightCfg.color }}
                                tickLine={false}
                                axisLine={false}
                                width={52}
                                tickFormatter={(v) => rightCfg.format(v)}
                            />
                            <RechartsTooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => {
                                if (value == null) return ["N/A", name]
                                const cfg = name === "left" ? leftCfg : rightCfg
                                return [cfg.format(Number(value)), cfg.label]
                            }} />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="left"
                                name="left"
                                stroke={leftCfg.color}
                                strokeWidth={2}
                                dot={{ r: 2.5, strokeWidth: 0, fill: leftCfg.color }}
                                connectNulls={false}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="right"
                                name="right"
                                stroke={rightCfg.color}
                                strokeWidth={2}
                                dot={{ r: 2.5, strokeWidth: 0, fill: rightCfg.color }}
                                connectNulls={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: EVENT HEALTH
// ═════════════════════════════════════════════════════════════════════════════

function EventHealthSection({ eventHealth }) {
    if (!eventHealth) {
        return (
            <SectionCard id="health">
                <SectionHeader title="Event Health" sub="Check whether your primary conversion event is firing as expected." />
                <p className="text-sm italic" style={{ color: MUTED }}>Event health check was not available for this account.</p>
            </SectionCard>
        )
    }

    const palette = {
        healthy: { bg: GOOD_SOFT, border: "rgba(34,197,94,0.22)", color: GOOD, label: "Event Healthy" },
        warning: { bg: WARN_SOFT, border: "rgba(245,158,11,0.24)", color: WARN, label: "Event Warning" },
        stale: { bg: BAD_SOFT, border: "rgba(239,68,68,0.24)", color: BAD, label: "Event Stale" },
    }[eventHealth.status] || { bg: PAPER_2, border: LINE, color: MUTED, label: "Event Status Unknown" }

    return (
        <SectionCard id="health">
            <SectionHeader title="Event Health" sub="Activity status for the primary conversion event in the evaluation window." />
            <div className="flex items-start gap-3 p-4 rounded-3xl" style={{ background: palette.bg, border: `1px solid ${palette.border}` }}>
                <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: PAPER, color: palette.color, border: `1px solid ${palette.border}` }}>
                    <Stethoscope className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: palette.color }}>
                        {palette.label}
                        <span className="font-normal" style={{ color: INK_2 }}>
                            {" — "}
                            {eventHealth.eventType === "custom_conversion" ? "Custom Conversion" : "Pixel Event"}: {formatEventName(eventHealth.eventName)}
                        </span>
                    </p>
                    <p className="text-sm mt-1" style={{ color: INK_2 }}>{formatEventDetail(eventHealth.detail, eventHealth.eventName)}</p>
                    <div className="flex gap-4 mt-2 text-[11px]" style={{ color: MUTED }}>
                        <span>Last fired: {eventHealth.lastFiredAgo || "unknown"}</span>
                        {eventHealth.isUnavailable && <span style={{ color: BAD, fontWeight: 600 }}>Marked unavailable</span>}
                    </div>
                </div>
            </div>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5: TRAFFIC METRIC CHANGES
// ═════════════════════════════════════════════════════════════════════════════

const TRAFFIC_LABEL = { cpc: "CPC (link)", cpm: "CPM", ctr: "CTR (link)", cr: "Conv. rate" }

function fmtTraffic(metric, v) {
    if (v === null || v === undefined) return "—"
    return metric === "ctr" || metric === "cr" ? `${v.toFixed(2)}%` : `$${v.toFixed(2)}`
}
function fmtDelta(d) {
    if (d === null || d === undefined) return "—"
    return `${d > 0 ? "+" : ""}${d.toFixed(0)}%`
}

// Link CPC, CPM, link CTR and conversion rate: selected period vs comparison
// period and, for each that moved more than the threshold, the campaigns that
// moved the same way. Lower is better for CPC/CPM, higher for CTR and CR.
function TrafficChangesSection({ traffic, eventLabel }) {
    if (!traffic) return null
    const worse = (m, d) => d !== null && d !== undefined && (m === "ctr" || m === "cr" ? d < 0 : d > 0)
    const toneFor = (m, d, flagged) => (!flagged ? MUTED : worse(m, d) ? BAD : GOOD_DEEP)

    return (
        <SectionCard id="traffic">
            <SectionHeader
                title="Traffic Metric Changes"
                sub={`Selected period vs comparison period. Metrics that moved more than ${traffic.thresholdPct}% are flagged, with the campaigns that moved the same way. Conversion rate is ${eventLabel} conversions per link click.`}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {traffic.accountMetrics.map((m) => {
                    const flagged = traffic.flagged.includes(m.metric)
                    const bad = flagged && worse(m.metric, m.deltaPct)
                    return (
                        <div
                            key={m.metric}
                            className="rounded-2xl p-3.5"
                            style={{
                                background: !flagged ? PAPER_2 : bad ? BAD_SOFT : GOOD_SOFT,
                                border: `1px solid ${!flagged ? LINE : bad ? "rgba(239,68,68,0.24)" : "rgba(34,197,94,0.22)"}`,
                            }}
                        >
                            <SmallLabel style={{ marginBottom: 6 }}>{TRAFFIC_LABEL[m.metric]}</SmallLabel>
                            <p className="tabular-nums" style={{ fontSize: 13, color: INK_2, margin: 0 }}>
                                {fmtTraffic(m.metric, m.prev)} → <span style={{ fontWeight: 700, color: INK }}>{fmtTraffic(m.metric, m.anomaly)}</span>{" "}
                                <span style={{ color: toneFor(m.metric, m.deltaPct, flagged), fontWeight: flagged ? 700 : 500 }}>({fmtDelta(m.deltaPct)})</span>
                            </p>
                        </div>
                    )
                })}
            </div>
            {traffic.flagged.length === 0 ? (
                <p className="text-sm italic" style={{ color: MUTED }}>No traffic metric moved more than {traffic.thresholdPct}% between the periods.</p>
            ) : traffic.campaigns.length === 0 ? (
                <p className="text-sm italic" style={{ color: MUTED }}>The account-level change isn&apos;t concentrated in any campaign with enough delivery in both periods — it&apos;s spread across them.</p>
            ) : (
                <div className="overflow-x-auto rounded-2xl" style={{ border: `1px solid ${LINE}` }}>
                    <table className="min-w-full text-sm">
                        <thead style={{ background: PAPER_2 }}>
                            <tr>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Campaign</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Spend (prev → selected)</th>
                                {traffic.flagged.map(m => (
                                    <th key={m} className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">{TRAFFIC_LABEL[m]}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {traffic.campaigns.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-3.5 py-2.5 max-w-[260px]">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <p className="text-gray-800 font-medium truncate cursor-default">{c.name}</p>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-[360px] break-words">{c.name}</TooltipContent>
                                        </Tooltip>
                                    </td>
                                    <td className="px-3.5 py-2.5 text-gray-600 tabular-nums whitespace-nowrap">{fmtCurrency(c.prevSpend)} → {fmtCurrency(c.anomalySpend)}</td>
                                    {traffic.flagged.map(m => {
                                        const v = c.metrics[m]
                                        const hit = c.impactedBy.includes(m)
                                        return (
                                            <td key={m} className="px-3.5 py-2.5 tabular-nums whitespace-nowrap">
                                                <span className="text-gray-600">{fmtTraffic(m, v.prev)} → {fmtTraffic(m, v.anomaly)}</span>{" "}
                                                <span style={{ color: hit ? toneFor(m, v.deltaPct, true) : MUTED_2, fontWeight: hit ? 700 : 500 }}>{fmtDelta(v.deltaPct)}</span>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 6: EVENTS MANAGER HEALTH (match quality, Conversions API, matching, diagnostics)
// ═════════════════════════════════════════════════════════════════════════════

const RATING_STYLE = {
    Great: { background: GOOD_SOFT, color: GOOD_DEEP },
    Good: { background: GOOD_SOFT, color: GOOD_DEEP },
    OK: { background: WARN_SOFT, color: "#b45309" },
    Poor: { background: BAD_SOFT, color: "#b91c1c" },
}
const CAPI_LABEL = {
    browser_and_server: { text: "Browser and Server", color: GOOD_DEEP },
    browser_only: { text: "Browser only — Conversions API not sending", color: "#b91c1c" },
    server_only: { text: "Server only — no browser pixel events", color: "#b45309" },
    no_events: { text: "No events this week", color: "#b91c1c" },
}

function PixelHealthSection({ report }) {
    const [showAll, setShowAll] = useState(false)
    if (!report) return null
    const errorsOnly = report.pixels.length === 0 && report.errors.length > 0

    return (
        <SectionCard id="pixel">
            <SectionHeader
                title="Events Manager Health"
                sub={`Key conversion event: ${report.primaryEvent.name || report.primaryEvent.stored || "not set"}${report.primaryEvent.source === "roas_default" ? " (ROAS account — Purchase by default)" : ""} · Event Match Quality, Conversions API, Automatic Website Matching and diagnostics, read live from Events Manager.`}
            />

            {report.issues.length > 0 ? (
                <div className="flex flex-col gap-2 mb-4">
                    {report.issues.map((issue, idx) => {
                        const isError = issue.severity === "error"
                        return (
                            <div
                                key={idx}
                                className="rounded-2xl px-4 py-2.5 text-sm"
                                style={{
                                    background: isError ? BAD_SOFT : WARN_SOFT,
                                    border: `1px solid ${isError ? "rgba(239,68,68,0.24)" : "rgba(245,158,11,0.24)"}`,
                                    color: isError ? "#991b1b" : "#92400e",
                                }}
                            >
                                {issue.message}
                                {issue.link && (
                                    <a href={issue.link} target="_blank" rel="noreferrer" className="ml-2 underline text-xs">Fix in Events Manager</a>
                                )}
                            </div>
                        )
                    })}
                </div>
            ) : !errorsOnly ? (
                <div className="rounded-2xl px-4 py-2.5 text-sm mb-4" style={{ background: GOOD_SOFT, border: "1px solid rgba(34,197,94,0.22)", color: GOOD_DEEP }}>
                    No issues found: diagnostics pass, major events rate Good or better, Automatic Website Matching is fully on and the key event fires from Browser and Server.
                </div>
            ) : null}

            {report.errors.length > 0 && (
                <ul className="mb-4 space-y-1" style={{ fontSize: 11.5, color: MUTED }}>
                    {report.errors.map((e, idx) => <li key={idx}>⚠ {e}</li>)}
                </ul>
            )}

            {report.pixels.map((p) => {
                const major = p.events.filter(e => e.isMajor)
                const shown = showAll ? p.events : major.length > 0 ? major : p.events.slice(0, 5)
                const failing = p.diagnostics.filter(d => d.failing)
                return (
                    <div key={p.id} className="mb-4 last:mb-0">
                        {report.pixels.length > 1 && <p className="text-sm font-semibold mb-2" style={{ color: INK }}>{p.name}</p>}

                        <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 mb-3" style={{ color: INK_2 }}>
                            <p style={{ margin: 0 }}>
                                Conversions API{p.capi ? ` (${p.capi.eventName})` : ""}:{" "}
                                {p.capi ? (
                                    <span style={{ fontWeight: 600, color: CAPI_LABEL[p.capi.status].color }}>
                                        {CAPI_LABEL[p.capi.status].text}
                                        <span style={{ fontWeight: 400, color: MUTED_2, marginLeft: 4 }}>
                                            ({p.capi.browser.toLocaleString()} browser / {p.capi.server.toLocaleString()} server, 7 days)
                                        </span>
                                    </span>
                                ) : <span style={{ color: MUTED_2 }}>not checked</span>}
                            </p>
                            <p style={{ margin: 0 }}>
                                Automatic Website Matching:{" "}
                                {p.automaticMatching ? (
                                    !p.automaticMatching.enabled ? <span style={{ fontWeight: 600, color: "#b91c1c" }}>off</span>
                                        : p.automaticMatching.missing.length ? <span style={{ fontWeight: 600, color: "#b45309" }}>on, missing {p.automaticMatching.missing.join(", ")}</span>
                                            : <span style={{ fontWeight: 600, color: GOOD_DEEP }}>on, every field</span>
                                ) : <span style={{ color: MUTED_2 }}>not read</span>}
                            </p>
                        </div>

                        {p.events.length > 0 && (
                            <>
                                <div className="overflow-x-auto rounded-2xl" style={{ border: `1px solid ${LINE}` }}>
                                    <table className="min-w-full text-sm">
                                        <thead style={{ background: PAPER_2 }}>
                                            <tr>
                                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Event</th>
                                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Match quality</th>
                                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Parameters under 50% coverage</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {shown.map(e => (
                                                <tr key={e.eventName} style={e.isPrimary ? { background: BLUE_SOFT } : undefined}>
                                                    <td className="px-3.5 py-2.5 text-gray-800">
                                                        {e.eventName}
                                                        {e.isPrimary && <span className="ml-1.5 text-[10px] font-semibold" style={{ color: BLUE }}>key event</span>}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 tabular-nums whitespace-nowrap">
                                                        {e.score !== null ? (
                                                            <>
                                                                <span className="font-semibold text-gray-900">{e.score.toFixed(1)}</span>
                                                                <span className="text-gray-400">/10</span>
                                                                {e.rating && <span className="ml-2 rounded-md px-2 py-0.5 text-[10px] font-semibold" style={RATING_STYLE[e.rating]}>{e.rating}</span>}
                                                            </>
                                                        ) : <span className="text-gray-300">—</span>}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-xs text-gray-600">
                                                        {e.weakParams.length > 0
                                                            ? e.weakParams.map(w => `${w.label} ${Math.round(w.coverage)}%`).join(" · ")
                                                            : e.params.length > 0 ? <span className="text-gray-400">all parameters at 50%+</span> : <span className="text-gray-300">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {p.events.length > shown.length && !showAll && (
                                    <button onClick={() => setShowAll(true)} className="mt-2 text-xs text-gray-500 hover:text-gray-800">
                                        Show all {p.events.length} events
                                    </button>
                                )}
                            </>
                        )}

                        {p.diagnostics.length > 0 && (
                            <p className="mt-3" style={{ fontSize: 11.5, color: MUTED }}>
                                Events Manager diagnostics: {failing.length === 0 ? `all ${p.diagnostics.length} pass` : `${failing.length} of ${p.diagnostics.length} failing (listed above)`}.
                            </p>
                        )}
                    </div>
                )
            })}
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════

// Title block of the report's top bar — shared by the dialog and the public
// shared-report page (pages/SharedReport.jsx) so both read the same.
export function DiagnosticReportTitle({ accountName, reportDate, report }) {
    return (
        <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-white border border-gray-200 shadow-xs">
                <Stethoscope className="w-[18px] h-[18px] text-gray-700" />
            </div>
            <div className="min-w-0">
                <h2 className="text-[16px] font-bold text-gray-900 truncate leading-tight">
                    {accountName || "Diagnostic Report"}
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                    Diagnostic Report · {reportDate}
                    {report && (
                        <span
                            className="ml-2 px-2.5 py-0.5 text-[10px] font-semibold rounded-full"
                            style={{ background: BLUE_SOFT, color: BLUE, border: `1px solid ${BLUE_BORDER}` }}
                        >
                            {report.kpiLabel}
                            {report.mode === "cpr" && report.conversionEvent
                                ? ` · ${formatEventName(report.conversionEvent)}`
                                : ""}
                        </span>
                    )}
                </p>
            </div>
        </div>
    )
}

// The report's sections, as rendered in the dialog and on the shared page.
// perfSummaries renders the performance chart from a snapshot instead of fetching.
export function DiagnosticReportView({ report, adAccountId, kpiType, conversionEvent, refreshKey, perfSummaries, onPerfSummary }) {
    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex flex-col gap-5" style={{ animation: "diagnosticFadeIn 0.4s ease" }}>
                <SummarySection report={report} />
                <TrendSection dailyData={report.dailyData} anomalyPeriod={report.anomalyPeriod} mode={report.mode} kpiLabel={report.kpiLabel} />
                <PerformanceMetricsChart
                    adAccountId={adAccountId}
                    kpiType={kpiType}
                    conversionEvent={report.conversionEvent || conversionEvent}
                    refreshKey={refreshKey}
                    staticSummaries={perfSummaries}
                    onSummary={onPerfSummary}
                />
                <TrafficChangesSection
                    traffic={report.trafficChanges}
                    eventLabel={formatEventName(report.eventHealth?.eventName || report.conversionEvent)}
                />
                <AnomalySection
                    anomalyPeriod={report.anomalyPeriod}
                    previousPeriod={report.previousPeriod}
                    culprits={report.culprits || []}
                    mode={report.mode}
                    kpiLabel={report.kpiLabel}
                />
                <ChangesSection changes={report.changes || []} anomalyDetected={!!report.anomalyPeriod} />
                <EventHealthSection eventHealth={report.eventHealth} />
                <PixelHealthSection report={report.pixelHealth} />
            </div>
        </TooltipProvider>
    )
}

export const DIAGNOSTIC_ANIMATION_STYLES = `
    @keyframes diagnosticSlideUp {
        from { opacity: 0; transform: translateY(16px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes diagnosticFadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
    }
`

const toDateInput = (d) => d.toISOString().split("T")[0]
// The selectable window: the trailing 14 days, ending yesterday.
function getPeriodBounds() {
    const max = new Date(); max.setDate(max.getDate() - 1)
    const min = new Date(max); min.setDate(min.getDate() - 13)
    return { min: toDateInput(min), max: toDateInput(max) }
}
// Default selected period: the last 3 days, ending yesterday (same as the server).
function getDefaultPeriod() {
    const { max } = getPeriodBounds()
    const start = new Date(max + "T00:00:00"); start.setDate(start.getDate() - 2)
    return { start: toDateInput(start), end: max }
}

const DATE_INPUT_CLASS = "h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"

export default function AdAccountDiagnostic({
    open, onOpenChange, adAccountId, adAccountName,
    kpiType = "cpa", conversionEvent = null,
}) {
    const [report, setReport] = useState(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState(null)
    const [refreshKey, setRefreshKey] = useState(0)
    const [period, setPeriod] = useState(getDefaultPeriod)
    const perfSummariesRef = useRef({})
    const bounds = getPeriodBounds()
    const periodInvalid = !period.start || !period.end || period.start > period.end ||
        period.start < bounds.min || period.end > bounds.max

    useEffect(() => {
        if (open && adAccountId && !report && !isGenerating) generateReport(getDefaultPeriod())
        if (!open) { setReport(null); setError(null); setPeriod(getDefaultPeriod()) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, adAccountId])

    const generateReport = async (selected = period) => {
        setIsGenerating(true); setError(null); setReport(null)
        perfSummariesRef.current = {}
        const params = new URLSearchParams({ adAccountId, kpiType, anomalyStart: selected.start, anomalyEnd: selected.end })
        if (kpiType === "cpa" && conversionEvent) params.set("conversionEvent", conversionEvent)
        try {
            const res = await fetch(`${API_BASE_URL}/api/analytics/diagnostic-report?${params}`, { credentials: "include" })
            if (!res.ok) {
                let errMsg = "Failed to generate diagnostic report"
                try { const err = await res.json(); errMsg = err.error || errMsg } catch { /* */ }
                setError(errMsg); return
            }
            const data = await res.json()
            setReport(data)
            setRefreshKey(Date.now())
        } catch { setError("Network error — please try again.") }
        finally { setIsGenerating(false) }
    }

    const reportDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    const effectiveConversionEvent = report?.conversionEvent || conversionEvent

    // The shared page shows the performance chart for both ranges, so load
    // whichever one the user didn't open.
    const getShareSnapshot = async () => {
        const perfSummaries = { ...perfSummariesRef.current }
        await Promise.all(PERF_DAY_OPTIONS.filter(d => !perfSummaries[d]).map(async (d) => {
            const params = new URLSearchParams({ adAccountId, kpiType, days: String(d) })
            if (effectiveConversionEvent) params.set("conversionEvent", effectiveConversionEvent)
            try { perfSummaries[d] = await fetchAccountDailySummary(params) } catch { /* range left out of the share */ }
        }))
        return { report, kpiType, conversionEvent: effectiveConversionEvent, reportDate, perfSummaries }
    }

    if (!open) return null

    return (
        <>
            <div
                onClick={() => onOpenChange(false)}
                style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", background: "rgba(15,17,21,0.55)", zIndex: 50 }}
            />

            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ fontFamily: FONT }}
                onClick={() => onOpenChange(false)}
            >
                <div
                    className="w-full max-w-[1080px] max-h-[92vh] overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: PAPER,
                        borderRadius: 24,
                        border: `1px solid ${LINE}`,
                        animation: "diagnosticSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                >
                    {/* Sticky header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
                        <DiagnosticReportTitle accountName={adAccountName} reportDate={reportDate} report={report} />
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {report && !isGenerating && (
                                <ReportShareMenu
                                    type="diagnostic"
                                    adAccountId={adAccountId}
                                    snapshotKey={report}
                                    getSnapshot={getShareSnapshot}
                                />
                            )}
                            <button
                                onClick={() => onOpenChange(false)}
                                className="w-9 h-9 rounded-[10px] bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Selected period: compared against the same-length period before it */}
                    <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap flex-shrink-0 bg-white">
                        <span className="text-xs font-semibold text-gray-700">Period to diagnose</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={period.start}
                                min={bounds.min}
                                max={period.end || bounds.max}
                                onChange={(e) => setPeriod(prev => ({ ...prev, start: e.target.value }))}
                                className={DATE_INPUT_CLASS}
                            />
                            <span className="text-xs text-gray-400">to</span>
                            <input
                                type="date"
                                value={period.end}
                                min={period.start || bounds.min}
                                max={bounds.max}
                                onChange={(e) => setPeriod(prev => ({ ...prev, end: e.target.value }))}
                                className={DATE_INPUT_CLASS}
                            />
                        </div>
                        <Button
                            size="sm"
                            onClick={() => generateReport()}
                            disabled={isGenerating || periodInvalid}
                            className="rounded-2xl text-xs gap-1.5 h-9 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            <Activity className="w-3.5 h-3.5" />
                            {report ? "Re-run Diagnostic" : "Run Diagnostic"}
                        </Button>
                        <p className="w-full sm:w-auto sm:flex-1 text-[11px] text-gray-400 m-0">
                            Pick the dates within the last 14 days you consider the anomaly — they&apos;re compared against an equal-length period immediately before.
                        </p>
                    </div>

                    <TooltipProvider delayDuration={0}>
                        <div className="flex-1 flex overflow-hidden min-h-0">
                            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0" style={{ padding: 28, background: PAPER_2, fontFamily: FONT }}>
                            {isGenerating && (
                                <div className="flex flex-col items-center justify-center py-24">
                                    <div style={{ marginBottom: 12 }}><Helix size="44" speed="2.5" color={BLUE} /></div>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: INK_2, margin: 0 }}>Analyzing the last 14 days…</p>
                                    <p style={{ fontSize: 11.5, color: MUTED, marginTop: 4 }}>Comparing the selected period, finding culprits, account changes and Events Manager health</p>
                                </div>
                            )}
                            {error && !isGenerating && (
                                <div style={{ background: PINK_SOFT, border: `1px solid ${PINK_SOFT}`, color: PINK_DEEP, fontSize: 13, borderRadius: 16, padding: "12px 16px" }}>
                                    {error}
                                    <button
                                        onClick={() => generateReport()}
                                        style={{ marginLeft: 12, textDecoration: "underline", color: PINK_DEEP, fontWeight: 600, background: "transparent", border: 0, cursor: "pointer" }}
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                            {report && !isGenerating && (
                                <DiagnosticReportView
                                    report={report}
                                    adAccountId={adAccountId}
                                    kpiType={kpiType}
                                    conversionEvent={conversionEvent}
                                    refreshKey={refreshKey}
                                    onPerfSummary={(d, summary) => { perfSummariesRef.current[d] = summary }}
                                />
                            )}
                            </div>
                        </div>
                    </TooltipProvider>
                </div>
            </div>

            <style>{DIAGNOSTIC_ANIMATION_STYLES}</style>
        </>
    )
}
