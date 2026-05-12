"use client"

import { useState, useEffect, useRef } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { Button } from "@/components/ui/button"
import {
    Activity, BarChart3, AlertTriangle, History, HeartPulse, Stethoscope,
} from "lucide-react"
import {
    ComposedChart, Bar, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

// ── Colors (match AdAccountAudit) ────────────────────────────────────────────
const BLUE = "#2563eb"
const BLUE_DARK = "#1d4ed8"
const BLUE_BG = "#eff6ff"
const RED = "#ef4444"
const RED_BG = "#fef2f2"
const RED_BAR = "#fca5a5"
const GREEN = "#10b981"
const GREEN_BG = "#ecfdf5"
const AMBER_BG = "#fffbeb"
const GRAY = "#9ca3af"
const NEUTRAL_BAR = "#e5e7eb"

// ── Shared chart styling ─────────────────────────────────────────────────────
const GRID_STROKE = "#f0f0f0"
const AXIS_TICK = { fontSize: 10, fill: "#9ca3af" }
const AXIS_LINE = { stroke: "#e5e7eb" }

// ── Sidebar config ───────────────────────────────────────────────────────────
const SIDEBAR_SECTIONS = [
    { id: "summary", label: "Summary", Icon: Activity },
    { id: "trend", label: "Spend & KPI", Icon: BarChart3 },
    { id: "anomaly", label: "Anomaly", Icon: AlertTriangle },
    { id: "changes", label: "Changes", Icon: History },
    { id: "health", label: "Event Health", Icon: HeartPulse },
]

// ── Formatters ───────────────────────────────────────────────────────────────
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
// REUSABLE SUBCOMPONENTS (styled to match AdAccountAudit)
// ═════════════════════════════════════════════════════════════════════════════

function SectionHeader({ title, sub }) {
    return (
        <div className="mb-5">
            <h3 className="text-[15px] font-semibold text-gray-900 leading-tight">{title}</h3>
            {sub && <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{sub}</p>}
        </div>
    )
}

function SectionCard({ children, id }) {
    return (
        <div id={`diagnostic-${id}`} className="bg-white rounded-3xl border-[0.5px] border-gray-100 shadow-xs p-6">
            {children}
        </div>
    )
}

function MetricCard({ label, value, sub, color }) {
    return (
        <div className="bg-white rounded-3xl p-4 flex flex-col gap-1 border-[0.5px] border-gray-100 shadow-xs">
            <p className="text-[10px] font-semibold text-gray-400">{label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: color || "#111827" }}>{value}</p>
            {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
        </div>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 0: SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

function SummarySection({ report }) {
    const { mode, kpiLabel, anomalyPeriod, previousPeriod, culprits, changes, eventHealth, dateRange } = report

    const insights = []

    if (anomalyPeriod && previousPeriod) {
        const anomalyKpi = anomalyPeriod.avgKpi
        const prevKpi = previousPeriod.avgKpi
        let delta = null
        if (anomalyKpi != null && prevKpi != null && prevKpi !== 0) {
            delta = ((anomalyKpi - prevKpi) / prevKpi) * 100
        }
        const worse = mode === "cpr" ? (delta > 0) : (delta < 0)
        insights.push({
            label: "Anomaly Detected",
            statement: `${anomalyPeriod.days}-day period (${fmtDateShort(anomalyPeriod.startDate)}–${fmtDateShort(anomalyPeriod.endDate)}) with ${kpiLabel} ${fmtKpi(anomalyKpi, mode)} vs prior ${fmtKpi(prevKpi, mode)}${delta != null ? ` (${delta > 0 ? "+" : ""}${delta.toFixed(0)}%)` : ""}.`,
            status: worse ? "warn" : "good",
        })
    } else {
        insights.push({
            label: "Anomaly Detected",
            statement: `No sustained period of elevated ${kpiLabel} found in the trailing 14 days relative to baseline.`,
            status: "good",
        })
    }

    if (anomalyPeriod) {
        insights.push({
            label: "Contributing Factors",
            statement: culprits?.length
                ? `${culprits.length} ${culprits.length === 1 ? "entity" : "entities"} had meaningful spend swings (>25% of anomaly spend, >15% delta).`
                : "No individual campaign, adset, or ad explains the anomaly on its own.",
            status: culprits?.length ? "warn" : "neutral",
        })
    }

    insights.push({
        label: "Recent Changes",
        statement: changes?.length
            ? `${changes.length} significant ${changes.length === 1 ? "change" : "changes"} detected near the evaluation window.`
            : "No significant budget or targeting changes detected.",
        status: changes?.length ? "neutral" : "good",
    })

    if (eventHealth) {
        const statusMap = { healthy: "good", warning: "warn", stale: "bad" }
        insights.push({
            label: "Event Health",
            statement: `${eventHealth.eventName} — last fired ${eventHealth.lastFiredAgo || "unknown"}.`,
            status: statusMap[eventHealth.status] || "neutral",
        })
    }

    const dotColors = {
        good: { dot: "#22c55e", ring: "#dcfce7" },
        warn: { dot: "#f59e0b", ring: "#fef3c7" },
        bad: { dot: "#ef4444", ring: "#fef2f2" },
        neutral: { dot: "#9ca3af", ring: "#f3f4f6" },
    }

    // Headline
    let headline = `Diagnosing ${fmtDateShort(dateRange.since)} — ${fmtDateShort(dateRange.until)}.`
    if (anomalyPeriod && previousPeriod && anomalyPeriod.avgKpi != null && previousPeriod.avgKpi != null) {
        const delta = ((anomalyPeriod.avgKpi - previousPeriod.avgKpi) / previousPeriod.avgKpi) * 100
        const worse = mode === "cpr" ? delta > 0 : delta < 0
        headline = `${kpiLabel} ${worse ? "worsened" : "improved"} from ${fmtKpi(previousPeriod.avgKpi, mode)} to ${fmtKpi(anomalyPeriod.avgKpi, mode)} over a ${anomalyPeriod.days}-day stretch (${delta > 0 ? "+" : ""}${delta.toFixed(0)}%).`
    } else if (!anomalyPeriod) {
        headline = `No anomaly detected in the trailing 14 days. ${kpiLabel} held within baseline range.`
    }

    return (
        <SectionCard id="summary">
            <SectionHeader title="Diagnostic Summary" sub="Trailing 14 days · automated anomaly detection on account-level performance" />

            <div className="rounded-2xl border p-4 mb-5 bg-blue-500">
                <p
                    className="text-[13px] font-medium leading-relaxed text-white"
                    dangerouslySetInnerHTML={{
                        __html: headline
                            .replace(/\$[\d,.]+k?/g, "<strong>$&</strong>")
                            .replace(/\d+(\.\d+)?[×%]/g, "<strong>$&</strong>"),
                    }}
                />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
                {insights.map(ins => {
                    const d = dotColors[ins.status] || dotColors.neutral
                    return (
                        <div key={ins.label} className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.015)] p-3 flex gap-2.5 items-start">
                            <div className="w-2 h-2 rounded-full mt-[5px] flex-shrink-0 shadow-[0_0_0_3px_var(--ring)]" style={{ background: d.dot, "--ring": d.ring }} />
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 mb-0.5">{ins.label}</p>
                                <p className="text-[12px] text-gray-600 leading-relaxed">{ins.statement}</p>
                            </div>
                        </div>
                    )
                })}
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
                sub={`Daily spend (bars) and ${kpiLabel} (line)${anomalyPeriod ? " · Anomaly period highlighted in red" : ""}`}
            />
            <div className="grid grid-cols-3 gap-3 mb-5">
                <MetricCard label="Total Spend (14d)" value={fmtCurrency(totalSpend)} color={BLUE} />
                <MetricCard label={`Avg ${kpiLabel} (14d)`} value={fmtKpi(avgKpi, mode)} color={mode === "cpr" ? "#111827" : GREEN} />
                <MetricCard
                    label="Anomaly Days"
                    value={anomalyPeriod ? `${anomalyPeriod.days}` : "0"}
                    sub={anomalyPeriod ? `${fmtDateShort(anomalyPeriod.startDate)}–${fmtDateShort(anomalyPeriod.endDate)}` : "no anomaly"}
                    color={anomalyPeriod ? RED : GRAY}
                />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-3" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="date" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} interval="preserveStartEnd" />
                        <YAxis yAxisId="kpi" orientation="left" tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} tickFormatter={kpiAxisFmt} />
                        <YAxis yAxisId="spend" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} tickFormatter={fmtSpendShort} />
                        <Tooltip
                            formatter={(value, name) => {
                                if (value == null) return ["N/A", name]
                                if (name === "Spend") return [fmtSpendShort(Number(value)), "Spend"]
                                return [mode === "cpr" ? `$${Number(value).toFixed(2)}` : `${Number(value).toFixed(2)}×`, kpiLabel]
                            }}
                            contentStyle={{
                                borderRadius: "14px",
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                fontSize: "12px",
                                padding: "8px 12px",
                            }}
                        />
                        <Bar yAxisId="spend" dataKey="spend" name="Spend" radius={[3, 3, 0, 0]} maxBarSize={22}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.isAnomaly ? RED_BAR : NEUTRAL_BAR} />
                            ))}
                        </Bar>
                        <Line
                            yAxisId="kpi"
                            type="monotone"
                            dataKey="kpi"
                            name={kpiLabel}
                            stroke={BLUE}
                            strokeWidth={2}
                            connectNulls={false}
                            dot={(props) => {
                                const { cx, cy, index } = props
                                if (cx == null || cy == null) return null
                                const isAnomaly = chartData[index]?.isAnomaly
                                return <circle key={index} cx={cx} cy={cy} r={3} fill={isAnomaly ? RED : BLUE} strokeWidth={0} />
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
                <SectionHeader title="Anomaly Detail" sub="Period-over-period comparison and contributing campaigns / adsets / ads" />
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    <span className="font-semibold">No anomaly detected.</span> {kpiLabel} held within baseline range over the trailing 14 days.
                </div>
            </SectionCard>
        )
    }

    return (
        <SectionCard id="anomaly">
            <SectionHeader
                title={`Anomaly: ${fmtDateShort(anomalyPeriod.startDate)} — ${fmtDateShort(anomalyPeriod.endDate)} (${anomalyPeriod.days} ${anomalyPeriod.days === 1 ? "day" : "days"})`}
                sub="Compared against the same-length window immediately before the anomaly"
            />
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rounded-2xl border border-red-200 p-4" style={{ background: RED_BG }}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-red-600 mb-2">Anomaly Period ({anomalyPeriod.days}d)</p>
                    <div className="flex items-baseline gap-6">
                        <div>
                            <p className="text-[10px] text-red-500">{kpiLabel}</p>
                            <p className="text-xl font-bold text-red-700 tabular-nums">{fmtKpi(anomalyPeriod.avgKpi, mode)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-red-500">Spend</p>
                            <p className="text-xl font-bold text-red-700 tabular-nums">{fmtCurrency(anomalyPeriod.spend)}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-green-200 p-4" style={{ background: GREEN_BG }}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-green-600 mb-2">Comparison Period ({previousPeriod.days}d)</p>
                    <div className="flex items-baseline gap-6">
                        <div>
                            <p className="text-[10px] text-green-600">{kpiLabel}</p>
                            <p className="text-xl font-bold text-green-700 tabular-nums">{fmtKpi(previousPeriod.avgKpi, mode)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-green-600">Spend</p>
                            <p className="text-xl font-bold text-green-700 tabular-nums">{fmtCurrency(previousPeriod.spend)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-2">
                <p className="text-[11px] font-semibold text-gray-500 mb-2">Contributing Factors</p>
                <p className="text-[10px] text-gray-400 mb-3">Entities with &gt;25% of anomaly spend and meaningful spend swings (&gt;15%)</p>
            </div>

            {culprits.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50/70">
                            <tr>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Level</th>
                                <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Name</th>
                                <th className="text-right px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Anomaly Spend</th>
                                <th className="text-right px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Prev Spend</th>
                                <th className="text-right px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Δ Spend</th>
                                <th className="text-right px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Prev {kpiLabel}</th>
                                <th className="text-right px-3.5 py-2.5 text-[10px] font-semibold text-gray-400">Anomaly {kpiLabel}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {culprits.map((c) => (
                                <tr key={`${c.level}-${c.id}`} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-3.5 py-2.5">
                                        <span
                                            className={cn(
                                                "inline-block px-2.5 py-0.5 text-[10px] rounded-full font-semibold",
                                                c.level === "campaign" ? "text-blue-700" : c.level === "adset" ? "text-purple-700" : "text-amber-700",
                                            )}
                                            style={{
                                                background:
                                                    c.level === "campaign" ? BLUE_BG :
                                                        c.level === "adset" ? "#f5f3ff" : AMBER_BG,
                                            }}
                                        >
                                            {c.level}
                                        </span>
                                    </td>
                                    <td className="px-3.5 py-2.5 max-w-[260px]">
                                        <p className="text-gray-800 font-medium truncate" title={c.name}>{c.name}</p>
                                        {c.parent && <p className="text-[10px] text-gray-400 truncate" title={c.parent}>{c.parent}</p>}
                                    </td>
                                    <td className="px-3.5 py-2.5 text-right text-gray-600 tabular-nums">{fmtCurrency(c.anomalySpend)}</td>
                                    <td className="px-3.5 py-2.5 text-right text-gray-600 tabular-nums">{fmtCurrency(c.prevSpend)}</td>
                                    <td className="px-3.5 py-2.5 text-right tabular-nums">
                                        <span className={c.spendDelta > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                                            {c.spendDelta > 0 ? "+" : ""}{c.spendDelta.toFixed(0)}%
                                        </span>
                                    </td>
                                    <td className="px-3.5 py-2.5 text-right text-gray-600 tabular-nums">{fmtKpi(c.prevKpi, mode)}</td>
                                    <td className="px-3.5 py-2.5 text-right text-gray-600 tabular-nums">{fmtKpi(c.anomalyKpi, mode)}</td>
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
                sub={anomalyDetected ? "Budget shifts >25% and targeting/audience changes near the anomaly period" : "Budget shifts >25% and targeting/audience changes over the last 7 days"}
            />
            {changes.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50/70">
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
                                            className={cn(
                                                "inline-block px-2.5 py-0.5 text-[10px] rounded-full font-semibold",
                                                c.type === "budget" ? "text-amber-700" : "text-indigo-700",
                                            )}
                                            style={{ background: c.type === "budget" ? AMBER_BG : "#eef2ff" }}
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
                <p className="text-sm text-gray-500 italic">No significant budget changes (&gt;25%) or audience targeting changes detected.</p>
            )}
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
                <SectionHeader title="Event Health" sub="Check whether your primary conversion event is firing as expected" />
                <p className="text-sm text-gray-500 italic">Event health check was not available for this account.</p>
            </SectionCard>
        )
    }

    const palette = {
        healthy: { bg: GREEN_BG, border: "border-green-200", text: "text-green-700", title: "text-green-800", label: "Event Healthy", iconBg: "bg-green-100", iconColor: "text-green-600" },
        warning: { bg: AMBER_BG, border: "border-amber-200", text: "text-amber-700", title: "text-amber-800", label: "Event Warning", iconBg: "bg-amber-100", iconColor: "text-amber-600" },
        stale: { bg: RED_BG, border: "border-red-200", text: "text-red-700", title: "text-red-800", label: "Event Stale", iconBg: "bg-red-100", iconColor: "text-red-600" },
    }[eventHealth.status] || { bg: "#f9fafb", border: "border-gray-200", text: "text-gray-700", title: "text-gray-800", label: "Event Status Unknown", iconBg: "bg-gray-100", iconColor: "text-gray-500" }

    return (
        <SectionCard id="health">
            <SectionHeader title="Event Health" sub="Activity status for the primary conversion event in the evaluation window" />
            <div className={cn("flex items-start gap-3 p-4 rounded-2xl border", palette.bg && "", palette.border)} style={{ background: palette.bg }}>
                <div className={cn("flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center", palette.iconBg)}>
                    <Stethoscope className={cn("w-5 h-5", palette.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold", palette.title)}>
                        {palette.label}
                        <span className="font-normal text-gray-600">
                            {" — "}
                            {eventHealth.eventType === "custom_conversion" ? "Custom Conversion" : "Pixel Event"}: {eventHealth.eventName}
                        </span>
                    </p>
                    <p className={cn("text-sm mt-1", palette.text)}>{eventHealth.detail}</p>
                    <div className="flex gap-4 mt-2 text-[11px] text-gray-500">
                        <span>Last fired: {eventHealth.lastFiredAgo || "unknown"}</span>
                        {eventHealth.isUnavailable && <span className="text-red-600 font-medium">Marked unavailable</span>}
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
    const [activeSection, setActiveSection] = useState("summary")
    const contentRef = useRef(null)

    useEffect(() => {
        if (open && adAccountId && !report && !isGenerating) generateReport()
        if (!open) { setReport(null); setError(null); setActiveSection("summary") }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, adAccountId])

    // Scroll spy
    useEffect(() => {
        const container = contentRef.current
        if (!container || !report) return
        const ids = SIDEBAR_SECTIONS.map(s => s.id)
        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container
            const atBottom = scrollHeight - scrollTop - clientHeight < 40
            if (atBottom) {
                for (let i = ids.length - 1; i >= 0; i--) {
                    if (document.getElementById(`diagnostic-${ids[i]}`)) { setActiveSection(ids[i]); return }
                }
            }
            let current = "summary"
            for (const id of ids) {
                const el = document.getElementById(`diagnostic-${id}`)
                if (el && el.getBoundingClientRect().top < 220) current = id
            }
            setActiveSection(current)
        }
        container.addEventListener("scroll", handleScroll, { passive: true })
        return () => container.removeEventListener("scroll", handleScroll)
    }, [report])

    const scrollTo = (id) => {
        const el = document.getElementById(`diagnostic-${id}`)
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }

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
        } catch (e) { setError("Network error — please try again.") }
        finally { setIsGenerating(false) }
    }

    const reportDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

    if (!open) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed bg-black/50 z-50"
                style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh" }}
                onClick={() => onOpenChange(false)}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-[24px] shadow-2xl w-full max-w-[1020px] max-h-[92vh] overflow-hidden flex flex-col border border-gray-100"
                    onClick={(e) => e.stopPropagation()}
                    style={{ animation: "diagnosticSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}
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
                                            style={{ background: BLUE_BG, color: BLUE_DARK }}
                                        >
                                            {report.kpiLabel}
                                            {report.mode === "cpr" && report.conversionEvent
                                                ? ` · ${String(report.conversionEvent).replace(/^offsite_conversion\.fb_pixel_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`
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

                    {/* Body: Sidebar + Scrollable Content */}
                    <div className="flex-1 flex overflow-hidden min-h-0">
                        {report && !isGenerating && (
                            <nav className="w-[180px] flex-shrink-0 border-r border-gray-100 p-2.5 overflow-y-auto bg-[#fafafa]">
                                {SIDEBAR_SECTIONS.map(({ id, label, Icon }) => {
                                    const isActive = activeSection === id
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => scrollTo(id)}
                                            className={cn(
                                                "w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-150 mb-0.5",
                                                isActive
                                                    ? "bg-gray-100 text-gray-900"
                                                    : "text-gray-500 hover:bg-gray-100/60 hover:text-gray-700",
                                            )}
                                        >
                                            <span className={cn(
                                                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                                                isActive ? "bg-white shadow-xs border border-gray-200" : "bg-gray-100/60",
                                            )}>
                                                <Icon className="w-3.5 h-3.5 text-gray-500 opacity-80" />
                                            </span>
                                            <span className="flex-1 truncate">{label}</span>
                                            {isActive && (
                                                <span className="w-[3px] h-[18px] rounded-full flex-shrink-0" style={{ background: "linear-gradient(180deg, #1a1a1a, #9ca3af)" }} />
                                            )}
                                        </button>
                                    )
                                })}
                            </nav>
                        )}

                        <div ref={contentRef} className="flex-1 overflow-y-auto p-5 custom-scrollbar" style={{ background: "#f8f9fb" }}>
                            {isGenerating && (
                                <div className="flex flex-col items-center justify-center py-24 text-sm text-gray-500">
                                    <div className="mb-3"><Helix size="44" speed="2.5" color={BLUE} /></div>
                                    <p className="font-medium text-gray-600">Analyzing the last 14 days…</p>
                                    <p className="text-xs text-gray-400 mt-1">Scanning for anomalies, culprits, and account changes</p>
                                </div>
                            )}
                            {error && !isGenerating && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">
                                    {error}
                                    <button onClick={generateReport} className="ml-3 underline text-red-600 hover:text-red-800 font-medium">Retry</button>
                                </div>
                            )}
                            {report && !isGenerating && (
                                <div className="space-y-4" style={{ animation: "diagnosticFadeIn 0.4s ease" }}>
                                    <SummarySection report={report} />
                                    <TrendSection dailyData={report.dailyData} anomalyPeriod={report.anomalyPeriod} mode={report.mode} kpiLabel={report.kpiLabel} />
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
