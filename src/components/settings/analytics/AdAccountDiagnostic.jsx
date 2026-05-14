"use client"

import { useState, useEffect } from "react"
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

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

// ── Palette (aligned with AdAccountAudit) ───────────────────────────────────
const ORANGE = "#FF4800"
const ORANGE_DEEP = "#D93B00"
const ORANGE_LIGHT = "#FFC7A8"
const ORANGE_SOFT = "#FFE6DA"
const PINK = "#F00D55"
const PINK_DEEP = "#C70845"
const PINK_SOFT = "#FCD9E3"

const INK = "#0F1115"
const INK_2 = "#2A2E35"
const MUTED = "#6B7280"
const MUTED_2 = "#9CA3AF"
const LINE = "#E7E9EE"
const LINE_2 = "#D8DCE3"
const PAPER = "#FFFFFF"
const PAPER_2 = "#F8F9FB"

const GOOD = "#22c55e"
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
            className={cn("font-semibold", className)}
            style={{ fontSize: 10.5, color: MUTED, margin: 0, ...style }}
        >
            {children}
        </p>
    )
}

function SectionHeader({ title, sub, tag }) {
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
            {tag && (
                <div className="flex items-center gap-1.5" style={{ fontSize: 10, fontWeight: 600, color: MUTED }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: ORANGE }} />
                    {tag}
                </div>
            )}
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
            className="rounded-3xl flex flex-col gap-1.5 p-4"
            style={{
                background: dark ? INK : PAPER,
                border: `1px solid ${dark ? INK : LINE}`,
                color: dark ? "#fff" : INK,
            }}
        >
            <SmallLabel style={{ color: dark ? "rgba(255,255,255,0.55)" : MUTED }}>{label}</SmallLabel>
            <p
                className="tabular-nums"
                style={{
                    fontSize: 40,
                    fontWeight: 900,
                    letterSpacing: "-0.015em",
                    lineHeight: 1,
                    margin: 0,
                    color: dark ? "#fff" : INK,
                }}
            >
                {value}
                {unit && <span style={{ fontSize: 40, fontWeight: 700, opacity: 0.55, marginLeft: 2 }}>{unit}</span>}
            </p>
            {sub && (
                <p style={{ fontSize: 11.5, color: dark ? "rgba(255,255,255,0.6)" : MUTED, margin: 0 }}>
                    {sub}
                </p>
            )}
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
        <div className="relative rounded-3xl" style={{ background: PAPER, border: `1px solid ${LINE}`, padding: "14px 16px 15px" }}>
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
            <SmallLabel style={{ fontSize: 9.5, marginBottom: 6, paddingRight: 20 }}>{label}</SmallLabel>
            <div
                className="tabular-nums"
                style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1, color: INK }}
            >
                {valuePrefix && <span style={{ fontSize: 30, fontWeight: 700, opacity: 0.45 }}>{valuePrefix}</span>}
                {value}
                {valueUnit && <span style={{ fontSize: 30, fontWeight: 700, opacity: 0.45, marginLeft: 1 }}>{valueUnit}</span>}
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
            label: "Anomaly Detected",
            value: anomalyKpi != null ? anomalyKpi.toFixed(mode === "cpr" ? 2 : 2) : "—",
            valuePrefix: mode === "cpr" && anomalyKpi != null ? "$" : undefined,
            valueUnit: mode !== "cpr" && anomalyKpi != null ? "×" : undefined,
            desc: `${anomalyPeriod.days}-day period (${fmtDateShort(anomalyPeriod.startDate)}–${fmtDateShort(anomalyPeriod.endDate)}) vs prior ${fmtKpi(prevKpi, mode)}${delta != null ? ` (${delta > 0 ? "+" : ""}${delta.toFixed(0)}%)` : ""}.`,
            status: worse ? "warn" : "good",
        })
    } else {
        tiles.push({
            label: "Anomaly Detected",
            value: "0",
            desc: `No sustained period of elevated ${kpiLabel} found in the trailing 14 days relative to baseline.`,
            status: "good",
        })
    }

    if (anomalyPeriod) {
        tiles.push({
            label: "Contributing Factors",
            value: culprits?.length || 0,
            desc: culprits?.length
                ? `${culprits.length} ${culprits.length === 1 ? "entity" : "entities"} had meaningful spend swings (>25% of anomaly spend, >15% delta).`
                : "No individual campaign, adset, or ad explains the anomaly on its own.",
            status: culprits?.length ? "warn" : "neutral",
        })
    }

    tiles.push({
        label: "Recent Changes",
        value: changes?.length || 0,
        desc: changes?.length
            ? `${changes.length} significant ${changes.length === 1 ? "change" : "changes"} detected near the evaluation window.`
            : "No significant budget or targeting changes detected.",
        status: changes?.length ? "neutral" : "good",
    })

    if (eventHealth) {
        const statusMap = { healthy: "good", warning: "warn", stale: "bad" }
        tiles.push({
            label: "Event Health",
            value: eventHealth.status === "healthy" ? "Healthy" : eventHealth.status === "warning" ? "Warn" : eventHealth.status === "stale" ? "Stale" : "—",
            desc: `${eventHealth.eventName} — last fired ${eventHealth.lastFiredAgo || "unknown"}.`,
            status: statusMap[eventHealth.status] || "neutral",
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
        headline = `No anomaly detected in the trailing 14 days. ${kpiLabel} held within baseline range.`
    }

    return (
        <SectionCard id="summary">
            <SectionHeader
                title="Diagnostic Summary"
                sub="Trailing 14 days · automated anomaly detection on account-level performance."
                tag="01 · Overview"
            />

            <div className="rounded-3xl mb-3" style={{ background: ORANGE, color: "#fff", padding: "16px 20px" }}>
                <p
                    style={{ fontSize: 16, lineHeight: 1.45, fontWeight: 400, color: "#fff", maxWidth: 800, margin: 0 }}
                    dangerouslySetInnerHTML={{
                        __html: headline
                            .replace(/\$[\d,.]+k?/g, "<strong>$&</strong>")
                            .replace(/\d+(\.\d+)?[×%]/g, "<strong>$&</strong>"),
                    }}
                />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
                {tiles.map(tile => <InsightTile key={tile.label} {...tile} />)}
            </div>
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
                sub={`Daily spend (bars) and ${kpiLabel} (line)${anomalyPeriod ? " · Anomaly period highlighted in pink" : ""}.`}
                tag="02 · Trend"
            />
            <div className="grid grid-cols-3 gap-3 mb-4">
                <MetricCard label="Total Spend · 14d" value={fmtCurrency(totalSpend)} />
                <MetricCard label={`Avg ${kpiLabel} · 14d`} value={fmtKpi(avgKpi, mode)} />
                <MetricCard
                    label="Anomaly Days"
                    value={anomalyPeriod ? `${anomalyPeriod.days}` : "0"}
                    sub={anomalyPeriod ? `${fmtDateShort(anomalyPeriod.startDate)}–${fmtDateShort(anomalyPeriod.endDate)}` : "no anomaly"}
                />
            </div>

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
                <SectionHeader title="Anomaly Detail" sub="Period-over-period comparison and contributing campaigns / adsets / ads." tag="04 · Anomaly" />
                <div className="rounded-3xl px-4 py-3 text-sm" style={{ background: GOOD_SOFT, border: `1px solid rgba(34,197,94,0.22)`, color: INK_2 }}>
                    <span className="font-semibold" style={{ color: GOOD }}>No anomaly detected.</span> {kpiLabel} held within baseline range over the trailing 14 days.
                </div>
            </SectionCard>
        )
    }

    return (
        <SectionCard id="anomaly">
            <SectionHeader
                title={`Anomaly: ${fmtDateShort(anomalyPeriod.startDate)} — ${fmtDateShort(anomalyPeriod.endDate)} (${anomalyPeriod.days} ${anomalyPeriod.days === 1 ? "day" : "days"})`}
                sub="Compared against the same-length window immediately before the anomaly."
                tag="04 · Anomaly"
            />
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rounded-3xl p-4" style={{ background: ORANGE_SOFT, border: `1px solid rgba(255,72,0,0.24)` }}>
                    <SmallLabel style={{ color: ORANGE_DEEP, marginBottom: 8 }}>Anomaly period ({anomalyPeriod.days}d)</SmallLabel>
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
                    <SmallLabel style={{ color: GOOD, marginBottom: 8 }}>Comparison period ({previousPeriod.days}d)</SmallLabel>
                    <div className="flex items-baseline gap-6">
                        <div>
                            <SmallLabel style={{ color: GOOD }}>{kpiLabel}</SmallLabel>
                            <p className="text-xl font-bold tabular-nums" style={{ color: GOOD, letterSpacing: "-0.005em" }}>{fmtKpi(previousPeriod.avgKpi, mode)}</p>
                        </div>
                        <div>
                            <SmallLabel style={{ color: GOOD }}>Spend</SmallLabel>
                            <p className="text-xl font-bold tabular-nums" style={{ color: GOOD, letterSpacing: "-0.005em" }}>{fmtCurrency(previousPeriod.spend)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-2">
                <SmallLabel style={{ marginBottom: 2 }}>Contributing Factors</SmallLabel>
                <p style={{ fontSize: 11.5, color: MUTED, margin: "0 0 12px" }}>Entities with &gt;25% of anomaly spend and meaningful spend swings (&gt;15%).</p>
            </div>

            {culprits.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl" style={{ border: `1px solid ${LINE}` }}>
                    <table className="min-w-full text-sm">
                        <thead style={{ background: PAPER_2 }}>
                            <tr>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Level</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Name</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Anomaly Spend</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Prev Spend</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Spend Change %</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Prev {kpiLabel}</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Anomaly {kpiLabel}</th>
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
                <p className="text-sm text-gray-500 italic">No individual campaigns, adsets, or ads had spend swings large enough to explain the anomaly on their own.</p>
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
                sub={anomalyDetected ? "Budget shifts >25% and targeting/audience changes near the anomaly period." : "Budget shifts >25% and targeting/audience changes over the last 7 days."}
                tag="05 · Changes"
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
                <p className="text-sm italic" style={{ color: MUTED }}>No significant budget changes (&gt;25%) or audience targeting changes detected.</p>
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

function PerformanceMetricsChart({
    adAccountId,
    kpiType = "cpa",
    conversionEvent,
    refreshKey,
    since,
    until,
    breakdown = "daily",
}) {
    const controlled = !!(since && until)
    const [days, setDays] = useState(14)
    const [summary, setSummary] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [leftMetric, setLeftMetric] = useState("cplc")
    const [rightMetric, setRightMetric] = useState("cr")

    useEffect(() => {
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
                const res = await fetch(`${API_BASE_URL}/api/analytics/account-daily-summary?${params}`, {
                    credentials: "include",
                    cache: "no-store",
                })
                if (!res.ok) {
                    let errMsg = "Failed to load"
                    try { const err = await res.json(); errMsg = err.error || errMsg } catch { /* */ }
                    throw new Error(errMsg)
                }
                const data = await res.json()
                if (!cancelled) setSummary(data)
            } catch (err) {
                if (!cancelled) setError(err.message || "Error")
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [adAccountId, kpiType, conversionEvent, days, since, until, controlled, breakdown, refreshKey])

    const leftCfg = getPerfMetricConfig(leftMetric)
    const rightCfg = getPerfMetricConfig(rightMetric)

    const chartData = (summary?.dailyData || []).map(d => ({
        date: formatPerfPeriodLabel(d.date, breakdown),
        left: resolvePerfMetric(leftMetric, d),
        right: resolvePerfMetric(rightMetric, d),
    }))

    if (!adAccountId) return null

    return (
        <SectionCard id="performance">
            <div className="flex items-start justify-between mb-5 gap-3">
                <div className="min-w-0">
                    <SectionHeader title="Performance Metrics" sub="Compare account-level delivery metrics over the selected period." tag="03 · Performance" />
                    <div className="flex items-center gap-2 mt-2">
                        <PerfMetricSelector value={leftMetric} onChange={setLeftMetric} exclude={rightMetric} />
                        <span className="text-[10px] text-gray-400">vs</span>
                        <PerfMetricSelector value={rightMetric} onChange={setRightMetric} exclude={leftMetric} />
                    </div>
                </div>
                {!controlled && (
                    <div className="flex items-center gap-1 rounded-xl p-0.5 flex-shrink-0" style={{ background: PAPER_2, border: `1px solid ${LINE}` }}>
                        {[14, 30].map(d => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                className="px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all"
                                style={{
                                    background: days === d ? INK : "transparent",
                                    color: days === d ? "#fff" : MUTED,
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
                        <Helix size="32" speed="2.5" color={ORANGE} />
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
                <SectionHeader title="Event Health" sub="Check whether your primary conversion event is firing as expected." tag="06 · Health" />
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
            <SectionHeader title="Event Health" sub="Activity status for the primary conversion event in the evaluation window." tag="06 · Health" />
            <div className="flex items-start gap-3 p-4 rounded-3xl" style={{ background: palette.bg, border: `1px solid ${palette.border}` }}>
                <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: PAPER, color: palette.color, border: `1px solid ${palette.border}` }}>
                    <Stethoscope className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: palette.color }}>
                        {palette.label}
                        <span className="font-normal" style={{ color: INK_2 }}>
                            {" — "}
                            {eventHealth.eventType === "custom_conversion" ? "Custom Conversion" : "Pixel Event"}: {eventHealth.eventName}
                        </span>
                    </p>
                    <p className="text-sm mt-1" style={{ color: INK_2 }}>{eventHealth.detail}</p>
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
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export default function AdAccountDiagnostic({
    open, onOpenChange, adAccountId, adAccountName,
    kpiType = "cpa", conversionEvent = null,
}) {
    const [report, setReport] = useState(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState(null)
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        if (open && adAccountId && !report && !isGenerating) generateReport()
        if (!open) { setReport(null); setError(null) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, adAccountId])

    const generateReport = async () => {
        setIsGenerating(true); setError(null); setReport(null)
        const params = new URLSearchParams({ adAccountId, kpiType })
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
                        <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-white border border-gray-200 shadow-xs">
                                <Stethoscope className="w-[18px] h-[18px] text-gray-700" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-[16px] font-bold text-gray-900 truncate leading-tight">
                                    {adAccountName || "Diagnostic Report"}
                                </h2>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    Diagnostic Report · {reportDate}
                                    {report && (
                                        <span
                                            className="ml-2 px-2.5 py-0.5 text-[10px] font-semibold rounded-full"
                                            style={{ background: ORANGE_SOFT, color: ORANGE_DEEP }}
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
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {report && !isGenerating && (
                                <Button variant="outline" size="sm" onClick={generateReport} className="rounded-2xl text-xs gap-1.5 h-9">
                                    <Activity className="w-3.5 h-3.5" />
                                    Re-run Diagnostic
                                </Button>
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

                    <TooltipProvider delayDuration={0}>
                        <div className="flex-1 flex overflow-hidden min-h-0">
                            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0" style={{ padding: 28, background: PAPER_2, fontFamily: FONT }}>
                            {isGenerating && (
                                <div className="flex flex-col items-center justify-center py-24">
                                    <div style={{ marginBottom: 12 }}><Helix size="44" speed="2.5" color={ORANGE} /></div>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: INK_2, margin: 0 }}>Analyzing the last 14 days…</p>
                                    <p style={{ fontSize: 11.5, color: MUTED, marginTop: 4 }}>Scanning for anomalies, culprits, and account changes</p>
                                </div>
                            )}
                            {error && !isGenerating && (
                                <div style={{ background: PINK_SOFT, border: `1px solid ${PINK_SOFT}`, color: PINK_DEEP, fontSize: 13, borderRadius: 16, padding: "12px 16px" }}>
                                    {error}
                                    <button
                                        onClick={generateReport}
                                        style={{ marginLeft: 12, textDecoration: "underline", color: PINK_DEEP, fontWeight: 600, background: "transparent", border: 0, cursor: "pointer" }}
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                            {report && !isGenerating && (
                                <div className="flex flex-col gap-5" style={{ animation: "diagnosticFadeIn 0.4s ease" }}>
                                    <SummarySection report={report} />
                                    <TrendSection dailyData={report.dailyData} anomalyPeriod={report.anomalyPeriod} mode={report.mode} kpiLabel={report.kpiLabel} />
                                    <PerformanceMetricsChart
                                        adAccountId={adAccountId}
                                        kpiType={kpiType}
                                        conversionEvent={report.conversionEvent || conversionEvent}
                                        refreshKey={refreshKey}
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
                                </div>
                            )}
                            </div>
                        </div>
                    </TooltipProvider>
                </div>
            </div>

            <style>{`
                @keyframes diagnosticSlideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes diagnosticFadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    )
}
