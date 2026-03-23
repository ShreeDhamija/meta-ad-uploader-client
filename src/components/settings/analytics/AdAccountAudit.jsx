"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
    Loader2, FileBarChart2, TrendingUp, Filter, DollarSign,
    Users, GraduationCap, FileText, Sparkles, LayoutDashboard,
} from "lucide-react"
import {
    ComposedChart, BarChart as ReBarChart, LineChart, Bar, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts"
import { cn } from "@/lib/utils"
import Audience from "@/assets/icons/analytics/Audience.svg"
import LearningPhase from "@/assets/icons/analytics/LearningPhase.svg"
import Opportunities from "@/assets/icons/analytics/Opportunities.svg"
import Summary from "@/assets/icons/analytics/Summary.svg"
import CopyUtil from "@/assets/icons/analytics/CopyUtil.svg"
import Audit from "@/assets/icons/analytics/Audit.svg"
import MonthlySpend from "@/assets/icons/analytics/MonthlySpend.svg"
import Traffic from "@/assets/icons/analytics/Traffic.svg"
import FunnelHealth from "@/assets/icons/analytics/FunnelHealth.svg"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'

// ── Colors (all blues — zero purple) ─────────────────────────────────────────
const BLUE = "#2563eb"
const BLUE_LIGHT = "#3b82f6"
const BLUE_DARK = "#1d4ed8"
const BLUE_BG = "#eff6ff"
const BLUE_BORDER = "#dbeafe"
const GREEN = "#10b981"
const CYAN = "#0891b2"
const AMBER = "#f59e0b"
const GRAY = "#6b7280"

// Chart colors (mapped from old indigo/purple → blue)
const CPC_COLOR = BLUE
const CTR_COLOR = GREEN
const CPM_COLOR = GRAY
const FREQ_COLOR = BLUE
const FTIR_COLOR = CYAN
const SPEND_COLOR = BLUE
const KPI_COLOR = AMBER
const PROSPECTING_COLOR = BLUE
const RETARGETING_COLOR = AMBER

// ── Shared chart styling ─────────────────────────────────────────────────────
const GRID_STROKE = "#f0f0f0"
const AXIS_TICK = { fontSize: 10, fill: '#9ca3af' }
const AXIS_LINE = { stroke: '#e5e7eb' }
const TOOLTIP_STYLE = {
    borderRadius: '14px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    fontSize: '12px',
    padding: '8px 12px',
}

// ── Sidebar config ───────────────────────────────────────────────────────────
const SIDEBAR_SECTIONS = [
    { id: "summary", label: "Summary", icon: Summary },
    { id: "traffic", label: "Traffic", icon: Traffic },
    { id: "funnel", label: "Funnel Health", icon: FunnelHealth },
    { id: "spend", label: "Monthly Spend", icon: MonthlySpend },
    { id: "audience", label: "Audience", icon: Audience },
    { id: "learning", label: "Learning Phase", icon: LearningPhase },
    { id: "copy", label: "Copy Util.", icon: CopyUtil },
    { id: "opportunities", label: "Opportunities", icon: Opportunities },
]

// ── Formatters ───────────────────────────────────────────────────────────────
function fmt$(v, decimals = 0) {
    if (v === null || v === undefined) return "\u2014"
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(decimals)}`
}
function fmtPct(v, decimals = 1) {
    if (v === null || v === undefined) return "\u2014"
    return `${(v * 100).toFixed(decimals)}%`
}
function fmtNum(v, decimals = 2) {
    if (v === null || v === undefined) return "\u2014"
    return v.toFixed(decimals)
}

// ═════════════════════════════════════════════════════════════════════════════
// REUSABLE SUBCOMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function MetricCard({ label, value, sub, color }) {
    return (
        <div className="bg-white rounded-3xl p-4 flex flex-col gap-1 border-[0.5px] border-gray-50 shadow-sm">
            <p className="text-[10px] font-semibold text-gray-400">{label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: color || "#111827" }}>{value}</p>
            {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
        </div>
    )
}

function SectionHeader({ title, sub }) {
    return (
        <div className="mb-5">
            <h3 className="text-[15px] font-semibold text-gray-900 leading-tight">{title}</h3>
            {sub && <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{sub}</p>}
        </div>
    )
}

// V2-style section card: white, rounded-2xl, subtle ring shadow
function SectionCard({ children, id }) {
    return (
        <div
            id={`audit-${id}`}
            className="bg-white rounded-3xl border-[0.5px] border-gray-50 shadow-sm p-6"
        >
            {children}
        </div>
    )
}

function ChartTooltipContent({ active, payload, label, formatters }) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 text-xs min-w-[140px] shadow-lg">
            <p className="font-semibold text-gray-600 mb-1.5">{label}</p>
            {payload.map((entry) => (
                <div key={entry.name} className="flex justify-between gap-4">
                    <span style={{ color: entry.color }}>{entry.name}</span>
                    <span className="text-gray-800 font-medium tabular-nums">
                        {formatters?.[entry.name] ? formatters[entry.name](entry.value) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    )
}

// ── Donut ring (for learning + audience) ─────────────────────────────────────
function DonutRing({ value, total, color = BLUE, size = 100 }) {
    const pct = total > 0 ? value / total : 0
    const r = (size - 12) / 2
    const circ = 2 * Math.PI * r
    const offset = circ * (1 - pct)
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={9} />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={9}
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)" }}
            />
            <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="18" fontWeight="700" fill="#1a1a1a">
                {(pct * 100).toFixed(0)}%
            </text>
        </svg>
    )
}

// ═════════════════════════════════════════════════════════════════════════════  
// SECTION 0: EXECUTIVE SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

function SummarySection({ report, kpiType, kpiTarget }) {
    if (!report) return null

    const { traffic, funnel, monthlySpend, audience, learning, copyUtilization } = report
    const kpiLabel = kpiType === "roas" ? "ROAS" : "CPA"

    const insights = []

    // Spend trend
    if (monthlySpend?.length >= 2) {
        const cur = monthlySpend[monthlySpend.length - 1]
        const prev = monthlySpend[monthlySpend.length - 2]
        const delta = prev.spend > 0 ? ((cur.spend - prev.spend) / prev.spend * 100).toFixed(0) : null
        if (delta !== null) {
            insights.push({
                label: "Spend Trend",
                statement: `Spend is ${delta > 0 ? "up" : "down"} ${Math.abs(delta)}% month-over-month at ${fmt$(cur.spend)}.`,
                status: Math.abs(delta) < 25 ? "neutral" : delta > 0 ? "good" : "warn",
            })
        }
    }

    // KPI vs target
    if (monthlySpend?.length >= 1 && kpiTarget) {
        const cur = monthlySpend[monthlySpend.length - 1]
        if (cur.kpi != null) {
            const above = kpiType === "roas" ? cur.kpi < kpiTarget : cur.kpi > kpiTarget
            const gap = Math.abs(cur.kpi - kpiTarget)
            const fmtGap = kpiType === "roas" ? `${gap.toFixed(2)}×` : `$${gap.toFixed(1)}`
            insights.push({
                label: `${kpiLabel} vs Target`,
                statement: `Blended ${kpiLabel} is ${kpiType === "roas" ? `${cur.kpi.toFixed(2)}×` : `$${cur.kpi.toFixed(1)}`} — ${fmtGap} ${above ? "worse than" : "better than"} your ${kpiType === "roas" ? `${kpiTarget}×` : `$${kpiTarget}`} target.`,
                status: above ? "warn" : "good",
            })
        }
    }

    // Learning phase
    if (learning) {
        const pct = learning.learningSpendPct
        if (pct !== null) {
            insights.push({
                label: "Learning Phase",
                statement: `${(pct * 100).toFixed(0)}% of budget is in learning${pct < 0.2 ? " — within healthy range." : ". Consider consolidating ad sets."}`,
                status: pct < 0.2 ? "good" : pct < 0.5 ? "warn" : "bad",
            })
        }
    }

    // Audience split
    if (audience && audience.totalSpend30d > 0) {
        const prospPct = ((audience.prospectingSpend / audience.totalSpend30d) * 100).toFixed(0)
        insights.push({
            label: "Audience Split",
            statement: `${prospPct}% prospecting / ${100 - prospPct}% retargeting allocation.`,
            status: prospPct >= 55 && prospPct <= 85 ? "good" : "neutral",
        })
    }

    // Frequency / fatigue
    if (funnel && funnel.avgFrequency != null) {
        const ok = funnel.avgFrequency < 2.0
        insights.push({
            label: "Ad Fatigue",
            statement: `Weekly frequency at ${funnel.avgFrequency.toFixed(2)}${ok ? " — no signs of fatigue." : ". Approaching fatigue threshold — refresh creative."}`,
            status: ok ? "good" : "warn",
        })
    }

    // Copy utilization
    if (copyUtilization) {
        insights.push({
            label: "Copy Slots",
            statement: `${copyUtilization.maximizingCount}/${copyUtilization.totalCount} top ads are maximizing copy variants.${copyUtilization.totalCount - copyUtilization.maximizingCount > 0 ? ` ${copyUtilization.totalCount - copyUtilization.maximizingCount} ads have room to improve.` : ""}`,
            status: copyUtilization.maximizingCount >= copyUtilization.totalCount * 0.8 ? "good" : "warn",
        })
    }

    // Traffic CPC direction
    if (traffic?.daily?.length >= 14) {
        const recent = traffic.daily.slice(-7)
        const prior = traffic.daily.slice(-14, -7)
        const avgRecent = recent.reduce((s, d) => s + (d.costPerClick || 0), 0) / recent.length
        const avgPrior = prior.reduce((s, d) => s + (d.costPerClick || 0), 0) / prior.length
        if (avgPrior > 0) {
            const delta = ((avgRecent - avgPrior) / avgPrior * 100).toFixed(0)
            insights.push({
                label: "CPC Trend",
                statement: `Cost per click is ${delta > 0 ? "up" : "down"} ${Math.abs(delta)}% over the last 7 days vs prior 7 days.`,
                status: delta <= 0 ? "good" : "warn",
            })
        }
    }

    const dotColors = {
        good: { dot: "#22c55e", ring: "#dcfce7" },
        warn: { dot: "#f59e0b", ring: "#fef3c7" },
        bad: { dot: "#ef4444", ring: "#fef2f2" },
        neutral: { dot: "#9ca3af", ring: "#f3f4f6" },
    }

    // Build top-line statement
    let headline = ""
    if (monthlySpend?.length >= 2) {
        const cur = monthlySpend[monthlySpend.length - 1]
        const prev = monthlySpend[monthlySpend.length - 2]
        const delta = prev.spend > 0 ? ((cur.spend - prev.spend) / prev.spend * 100).toFixed(0) : "0"
        headline = `You spent ${fmt$(cur.spend)} this month (${delta > 0 ? "+" : ""}${delta}% MoM)`
        if (cur.kpi != null) {
            headline += ` with a blended ${kpiLabel} of ${kpiType === "roas" ? `${cur.kpi.toFixed(2)}×` : `$${cur.kpi.toFixed(1)}`}`
        }
        if (kpiTarget) {
            const above = kpiType === "roas" ? cur.kpi < kpiTarget : cur.kpi > kpiTarget
            const gap = Math.abs((cur.kpi || 0) - kpiTarget)
            const fmtGap = kpiType === "roas" ? `${gap.toFixed(2)}×` : `$${gap.toFixed(1)}`
            headline += above
                ? `. That's ${fmtGap} above target — focus on consolidating underperformers.`
                : `. That's ${fmtGap} better than target — consider scaling top audiences.`
        } else {
            headline += "."
        }
    }

    return (
        <SectionCard id="summary">
            <SectionHeader title="Account Summary" sub="Key signals for your Meta ad account this period" />

            {headline && (
                <div className="rounded-2xl border p-4 mb-5 bg-blue-500">
                    <p className="text-[13px] font-medium leading-relaxed text-white"
                        dangerouslySetInnerHTML={{ __html: headline.replace(/\$[\d,.]+k?/g, '<strong>$&</strong>').replace(/\d+(\.\d+)?[×%]/g, '<strong>$&</strong>') }}
                    />
                </div>
            )}

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
// SECTION 1: TRAFFIC
// ═════════════════════════════════════════════════════════════════════════════

function TrafficSection({ traffic }) {
    const dateLabel = (d) => d.slice(5).replace("-", "/")
    return (
        <SectionCard id="traffic">
            <SectionHeader title="Traffic Overview" sub="Trailing 30 days · Cost Per Link Click, Link CTR, and CPM" />
            <div className="grid grid-cols-3 gap-3 mb-5">
                <MetricCard label="Avg Cost Per Link Click" value={fmt$(traffic.avgCostPerClick, 2)} color={CPC_COLOR} />
                <MetricCard label="Avg Link CTR" value={traffic.avgCtr !== null ? `${traffic.avgCtr.toFixed(2)}%` : "\u2014"} color={CTR_COLOR} />
                <MetricCard label="Avg CPM" value={fmt$(traffic.avgCpm, 0)} color={CPM_COLOR} />
            </div>
            <div className="grid grid-cols-3 gap-4">
                {[
                    { key: "costPerClick", label: "Cost Per Click (CPC)", color: CPC_COLOR, fmt: (v) => `$${(v ?? 0).toFixed(2)}`, yFmt: (v) => `$${v.toFixed(0)}` },
                    { key: "ctr", label: "Link Click-Through Rate (CTR)", color: CTR_COLOR, fmt: (v) => `${(v ?? 0).toFixed(2)}%`, yFmt: (v) => `${v.toFixed(1)}%` },
                    { key: "cpm", label: "Cost Per 1,000 Impressions (CPM)", color: CPM_COLOR, fmt: (v) => `$${(v ?? 0).toFixed(2)}`, yFmt: (v) => `$${v.toFixed(0)}` },
                ].map(({ key, label, color, fmt: tooltipFmt, yFmt }) => (
                    <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-3">
                        <p className="text-[10px] font-semibold text-gray-400 mb-2">{label}</p>
                        <div style={{ height: 150 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={traffic.daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                                    <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={dateLabel} interval="preserveStartEnd" axisLine={AXIS_LINE} tickLine={false} />
                                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={yFmt} width={36} />
                                    <Tooltip
                                        contentStyle={TOOLTIP_STYLE}
                                        formatter={(v) => [tooltipFmt(v), label.split(" (")[0]]}
                                        labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                                    />
                                    <Line type="natural" dataKey={key} stroke={color} dot={false} strokeWidth={2} connectNulls />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: FUNNEL
// ═════════════════════════════════════════════════════════════════════════════

function FunnelSection({ funnel }) {
    const chartData = funnel.weekly.map((w) => ({
        week: `${w.weekStart.slice(5).replace("-", "/")}–${w.weekEnd.slice(5).replace("-", "/")}`,
        Frequency: w.frequency,
        "FTIR %": w.ftir !== null ? w.ftir * 100 : null,
    }))
    return (
        <SectionCard id="funnel">
            <SectionHeader title="Funnel Health" sub="Trailing 3 months · weekly averages · Frequency and First-Time Impression Rate" />
            <div className="grid grid-cols-2 gap-3 mb-5">
                <MetricCard label="Avg Weekly Frequency" value={fmtNum(funnel.avgFrequency)} sub="impressions per unique user" color={FREQ_COLOR} />
                <MetricCard label="Avg First-Time Impression Rate" value={fmtPct(funnel.avgFtir)} sub="reach ÷ impressions · higher is healthier" color={FTIR_COLOR} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-3" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="week" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
                        <YAxis yAxisId="freq" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(1)} width={36} />
                        <YAxis yAxisId="ftir" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} width={44} />
                        <Tooltip content={<ChartTooltipContent formatters={{ Frequency: (v) => v.toFixed(2), "FTIR %": (v) => `${v.toFixed(1)}%` }} />} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line yAxisId="freq" type="natural" dataKey="Frequency" stroke={FREQ_COLOR} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: FREQ_COLOR }} />
                        <Line yAxisId="ftir" type="natural" dataKey="FTIR %" stroke={FTIR_COLOR} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: FTIR_COLOR }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: MONTHLY SPEND
// ═════════════════════════════════════════════════════════════════════════════

function MonthlySpendSection({ monthlySpend, kpiType }) {
    const kpiLabel = kpiType === "roas" ? "ROAS" : "CPA"
    const kpiFmt = (v) => kpiType === "roas" ? `${v.toFixed(2)}×` : `$${v.toFixed(0)}`
    return (
        <SectionCard id="spend">
            <SectionHeader title="Monthly Ad Spend" sub={`Last 6 months · total account spend and blended ${kpiLabel} by calendar month`} />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-3" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlySpend} margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={{ ...AXIS_TICK, fontSize: 11 }} axisLine={AXIS_LINE} tickLine={false} />
                        <YAxis yAxisId="spend" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} width={48} />
                        <YAxis yAxisId="kpi" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={kpiFmt} width={44} />
                        <Tooltip content={<ChartTooltipContent formatters={{ Spend: (v) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, [kpiLabel]: kpiFmt }} />} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar yAxisId="spend" dataKey="spend" name="Spend" fill={SPEND_COLOR} radius={[6, 6, 0, 0]}>
                            {monthlySpend.map((_, i) => (
                                <Cell key={i} fill={i === monthlySpend.length - 1 ? BLUE_LIGHT : `${BLUE}88`} />
                            ))}
                        </Bar>
                        <Line yAxisId="kpi" type="natural" dataKey="kpi" name={kpiLabel} stroke={KPI_COLOR} dot={{ r: 3, strokeWidth: 0, fill: KPI_COLOR }} strokeWidth={2} connectNulls />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: AUDIENCE
// ═════════════════════════════════════════════════════════════════════════════

function AudienceSection({ audience }) {
    const [filter, setFilter] = useState("all")
    const [showAll, setShowAll] = useState(false)

    const filtered = audience.adsets.filter((a) => filter === "all" || a.type === filter)
    const visible = showAll ? filtered : filtered.slice(0, 8)
    const total = audience.totalSpend30d

    const spendPct = (v) => total > 0 ? `${((v / total) * 100).toFixed(0)}%` : "\u2014"

    const splitData = [
        { name: "Prospecting", spend: audience.prospectingSpend, fill: PROSPECTING_COLOR },
        { name: "Retargeting", spend: audience.retargetingSpend, fill: RETARGETING_COLOR },
    ]

    return (
        <SectionCard id="audience">
            <SectionHeader title="Audience Strategy" sub="Adsets with delivery in last 30 days (including paused) · prospecting vs retargeting classification" />

            <div className="grid grid-cols-3 gap-3 mb-5">
                <MetricCard label="Prospecting Spend (30d)" value={fmt$(audience.prospectingSpend)} sub={`${spendPct(audience.prospectingSpend)} of total`} color={PROSPECTING_COLOR} />
                <MetricCard label="Retargeting Spend (30d)" value={fmt$(audience.retargetingSpend)} sub={`${spendPct(audience.retargetingSpend)} of total`} color={RETARGETING_COLOR} />
                <MetricCard label="Total Account Spend (30d)" value={fmt$(audience.totalSpend30d)} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-3 mb-5" style={{ height: 90 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart layout="vertical" data={splitData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                        <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} axisLine={AXIS_LINE} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fontSize: 11 }} width={80} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`$${(v || 0).toLocaleString()}`, ""]} cursor={{ fill: "#f9fafb" }} />
                        <Bar dataKey="spend" radius={[0, 6, 6, 0]}>
                            {splitData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                        </Bar>
                    </ReBarChart>
                </ResponsiveContainer>
            </div>

            {audience.topExclusions?.length > 0 && (
                <div className="mb-4">
                    <p className="text-[10px] font-semibold text-gray-400 mb-2">Most-Used Exclusion Audiences</p>
                    <div className="flex flex-wrap gap-1.5">
                        {audience.topExclusions.map((exc) => (
                            <span key={exc.name} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-600 text-[11px] rounded-full border border-gray-100">
                                {exc.name} <span className="text-gray-400">×{exc.count}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter toggle — V2 style matching parent CPA/ROAS toggle */}
            <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex p-0.5 bg-gray-100 rounded-2xl border border-gray-200/60">
                    {["all", "prospecting", "retargeting"].map((t) => (
                        <button key={t} onClick={() => setFilter(t)}
                            className={cn(
                                "px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all duration-200",
                                filter === t
                                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                    : "text-gray-500 hover:text-gray-700"
                            )}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                            {t !== "all" && <span className="ml-1 text-gray-400">({audience.adsets.filter(a => a.type === t).length})</span>}
                        </button>
                    ))}
                </div>
                <span className="ml-auto text-[10px] text-gray-400">{filtered.length} adsets</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50/70">
                        <tr>
                            <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400 ">Adset</th>
                            <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400 ">Type</th>
                            <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400  min-w-[200px]">Targeting</th>
                            <th className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400 ">Exclusions</th>
                            <th className="text-right px-3.5 py-2.5 text-[10px] font-semibold text-gray-400 ">30d Spend</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {visible.map((adset) => (
                            <tr key={adset.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-3.5 py-2.5 text-gray-800 max-w-[180px] truncate font-medium" title={adset.name}>{adset.name}</td>
                                <td className="px-3.5 py-2.5">
                                    <span className={cn("inline-block px-2.5 py-0.5 text-[10px] rounded-full font-semibold",
                                        adset.type === "prospecting" ? "text-blue-700" : "text-amber-700"
                                    )} style={{ background: adset.type === "prospecting" ? BLUE_BG : "#fffbeb" }}>
                                        {adset.type === "prospecting" ? "Pros." : "Retas."}
                                    </span>
                                </td>
                                <td className="px-3.5 py-2.5 text-gray-500 text-xs max-w-[220px] truncate" title={adset.targetingSummary}>{adset.targetingSummary}</td>
                                <td className="px-3.5 py-2.5 text-gray-500 text-xs max-w-[180px]">
                                    <td className="px-3.5 py-2.5 text-gray-500 text-xs max-w-[180px] truncate" title={adset.exclusions.length ? adset.exclusions.join(", ") : ""}>
                                        {adset.exclusions.length
                                            ? adset.exclusions.slice(0, 2).join(", ") + (adset.exclusions.length > 2 ? "…" : "")
                                            : <span className="text-gray-300">—</span>}
                                    </td>
                                </td>
                                <td className="px-3.5 py-2.5 text-right font-semibold text-gray-800 tabular-nums">{fmt$(adset.spend30d)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filtered.length > 8 && (
                <button onClick={() => setShowAll(v => !v)} className={cn("mt-2 text-xs font-medium hover:underline", `text-[${BLUE}]`)}>
                    {showAll ? "Show less" : `Show all ${filtered.length} adsets`}
                </button>
            )}
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5: LEARNING PHASE
// ═════════════════════════════════════════════════════════════════════════════

function LearningSection({ learning }) {
    const pct = learning.learningSpendPct
    const pctDisplay = pct !== null ? `${(pct * 100).toFixed(1)}%` : "\u2014"
    let status = "good"
    if (pct !== null) {
        if (pct >= 0.5) status = "bad"
        else if (pct >= 0.2) status = "warn"
    }
    const cfg = {
        good: { label: "Healthy", bg: "bg-green-50", text: "text-green-700", border: "border-green-200", numColor: "#059669", dotColor: "#22c55e", ringColor: "#dcfce7" },
        warn: { label: "Monitor", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", numColor: "#d97706", dotColor: "#f59e0b", ringColor: "#fef3c7" },
        bad: { label: "Action needed", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", numColor: "#dc2626", dotColor: "#ef4444", ringColor: "#fef2f2" },
    }[status]

    return (
        <SectionCard id="learning">
            <SectionHeader title="% of Budget in Learning Phase" sub="Last 7 days · ad sets in Learning or Learning Limited (including paused)" />
            <div className="flex items-start gap-6">
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    <DonutRing value={learning.learningSpend} total={learning.totalSpend} color={cfg.numColor} size={110} />
                    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold", cfg.bg, cfg.text, `border ${cfg.border}`)}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dotColor }} />
                        {cfg.label}
                    </span>
                </div>
                <div className="flex-1 space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                        <MetricCard label="Learning Spend (7d)" value={fmt$(learning.learningSpend)} sub="spend from Learning / Learning Limited ad sets" />
                        <MetricCard label="Total Spend (7d)" value={fmt$(learning.totalSpend)} sub="all ad sets" />
                    </div>
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-2xl p-3.5 space-y-1 border border-gray-100">
                        <p><span className="font-semibold text-green-700">{"< 20%"}</span> — Healthy. Most budget is running in stable, optimized ad sets.</p>
                        <p><span className="font-semibold text-amber-700">20–50%</span> — Monitor. A significant portion of budget is in learning; avoid additional structural changes.</p>
                        <p><span className="font-semibold text-red-700">{"> 50%"}</span> — Action needed. Consolidate ad sets or pause new launches until learning completes.</p>
                    </div>
                </div>
            </div>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 6: COPY UTILIZATION
// ═════════════════════════════════════════════════════════════════════════════

function CopyUtilizationSection({ copyUtilization }) {
    const isGood = copyUtilization.status === "maximizing"
    const color = isGood ? "#059669" : AMBER
    const r = 32, circ = 2 * Math.PI * r
    const offset = circ * (1 - copyUtilization.maximizingCount / copyUtilization.totalCount)

    return (
        <SectionCard id="copy">
            <SectionHeader title="Copy Utilization" sub="Top 10 ads by 30-day spend · primary text and headline field usage" />
            <div className="flex items-center gap-5 mb-4">
                <svg width={80} height={80} viewBox="0 0 80 80" className="flex-shrink-0">
                    <circle cx={40} cy={40} r={r} fill="none" stroke="#f3f4f6" strokeWidth={7} />
                    <circle cx={40} cy={40} r={r} fill="none" stroke={color} strokeWidth={7}
                        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                        transform="rotate(-90 40 40)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
                    <text x={40} y={43} textAnchor="middle" fontSize="15" fontWeight="700" fill="#1a1a1a">
                        {copyUtilization.maximizingCount}/{copyUtilization.totalCount}
                    </text>
                </svg>
                <div className="flex-1 pt-1">
                    <p className={cn("text-sm font-semibold mb-1", isGood ? "text-green-700" : "text-amber-700")}>
                        {isGood ? "✓ " : "⚠ "}{copyUtilization.statusText}
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Ads using all 5 primary text variants and 5 headline variants allow Meta's algorithm to test more combinations, improving delivery efficiency and reducing cost over time.
                    </p>
                </div>
            </div>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 7: OPPORTUNITIES
// ═════════════════════════════════════════════════════════════════════════════

function StyledOpportunitiesContent({ text }) {
    if (!text) return <p className="text-sm text-gray-400 italic">No opportunities generated yet.</p>

    const lines = text.split("\n")
    const blocks = []
    let currentHeading = null
    let currentBullets = []

    const flush = () => {
        if (currentHeading || currentBullets.length > 0) {
            blocks.push({ heading: currentHeading, bullets: [...currentBullets] })
            currentHeading = null
            currentBullets = []
        }
    }

    for (const raw of lines) {
        const line = raw.trim()
        if (!line) continue

        // Detect **Heading** lines
        const headingMatch = line.match(/^\*\*(.+?)\*\*$/)
        if (headingMatch) {
            flush()
            currentHeading = headingMatch[1]
            continue
        }

        // Detect bullet lines (• or - or * prefixed)
        const bulletMatch = line.match(/^[•\-\*]\s*(.+)/)
        if (bulletMatch) {
            currentBullets.push(bulletMatch[1])
            continue
        }

        // Fallback: treat as a bullet if under a heading, otherwise as heading
        if (currentHeading) {
            currentBullets.push(line)
        } else {
            flush()
            currentHeading = line
        }
    }
    flush()

    // Color the dot differently per section
    const dotColors = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#0891b2"]

    return (
        <div className="space-y-5">
            {blocks.map((block, bi) => (
                <div key={bi}>
                    {block.heading && (
                        <h4 className="text-[13px] font-semibold text-gray-900 mb-2.5 flex items-center gap-2">
                            <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: dotColors[bi % dotColors.length] }}
                            />
                            {block.heading}
                        </h4>
                    )}
                    {block.bullets.length > 0 && (
                        <ul className="space-y-2 pl-3.5">
                            {block.bullets.map((b, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-[12.5px] text-gray-600 leading-relaxed">
                                    <span
                                        className="w-[5px] h-[5px] rounded-full mt-[7px] flex-shrink-0 opacity-40"
                                        style={{ background: dotColors[bi % dotColors.length] }}
                                    />
                                    <span>{b}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}
        </div>
    )
}


function OpportunitiesSection({ text, isLoading, error }) {
    return (
        <SectionCard id="opportunities">
            <SectionHeader title="Areas of Opportunity" sub="AI-generated analysis based on account performance data" />

            {isLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-7 h-7 animate-spin mb-3" style={{ color: BLUE }} />
                    <p className="text-sm font-medium text-gray-600">Generating suggestions…</p>
                    <p className="text-xs text-gray-400 mt-1">Analyzing your account data with AI</p>
                </div>
            )}
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl mb-3 border border-red-100">{error}</p>}

            {!isLoading && text && (
                <div className="bg-gray-50/60 rounded-2xl border border-gray-100 p-5">
                    <StyledOpportunitiesContent text={text} />
                </div>
            )}

            {!isLoading && !text && !error && (
                <p className="text-sm text-gray-400 italic py-8 text-center">
                    Opportunities will appear here after the report loads…
                </p>
            )}
        </SectionCard>
    )
}


// ═════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export default function AdAccountAudit({
    open, onOpenChange, adAccountId, adAccountName,
    kpiType = "cpa", conversionEvent = null, targetCPA = null, targetROAS = null,
}) {
    const [report, setReport] = useState(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState(null)
    const [opportunitiesText, setOpportunitiesText] = useState("")
    const [isLoadingOpps, setIsLoadingOpps] = useState(false)
    const [oppsError, setOppsError] = useState(null)
    const [activeSection, setActiveSection] = useState("summary")
    const contentRef = useRef(null)

    const kpiTarget = kpiType === "cpa" ? targetCPA : targetROAS

    useEffect(() => {
        if (open && adAccountId && !report && !isGenerating) generateReport()
        if (!open) { setReport(null); setError(null); setOpportunitiesText(""); setOppsError(null); setActiveSection("summary") }
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
                // Pick the last section that actually exists in DOM
                for (let i = ids.length - 1; i >= 0; i--) {
                    if (document.getElementById(`audit-${ids[i]}`)) {
                        setActiveSection(ids[i])
                        return
                    }
                }
            }

            let current = "summary"
            for (const id of ids) {
                const el = document.getElementById(`audit-${id}`)
                if (el && el.getBoundingClientRect().top < 220) current = id
            }
            setActiveSection(current)
        }
        container.addEventListener("scroll", handleScroll, { passive: true })
        return () => container.removeEventListener("scroll", handleScroll)
    }, [report])

    const scrollTo = (id) => {
        const el = document.getElementById(`audit-${id}`)
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    const generateReport = async () => {
        setIsGenerating(true); setError(null); setReport(null); setOpportunitiesText("")
        const params = new URLSearchParams({ adAccountId, kpiType })
        if (kpiType === "cpa" && conversionEvent) params.set("conversionEvent", conversionEvent)
        try {
            const res = await fetch(`${API_BASE_URL}/api/analytics/audit/report?${params}`, { credentials: "include" })
            if (!res.ok) { const err = await res.json(); setError(err.error || "Failed to generate report"); return }
            const data = await res.json(); setReport(data); fetchOpportunities(data)

            console.log('[AUDIT FE] conversionEvent prop:', conversionEvent);
            console.log('[AUDIT FE] kpiType:', kpiType);
            console.log('[AUDIT FE] monthlySpend kpi values:', data.monthlySpend?.map(m => ({ month: m.month, kpi: m.kpi })));
            setReport(data); fetchOpportunities(data)
        } catch (e) { setError("Network error — please try again.") }
        finally { setIsGenerating(false) }
    }

    const fetchOpportunities = async (reportData) => {
        setIsLoadingOpps(true); setOppsError(null)
        try {
            const res = await fetch(`${API_BASE_URL}/api/analytics/audit/opportunities`, {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({
                    accountName: adAccountName, kpiType, kpiTarget: kpiTarget || "",
                    conversionEvent: kpiType === "cpa" ? conversionEvent : "",
                    traffic: reportData.traffic, funnel: reportData.funnel, monthlySpend: reportData.monthlySpend,
                    audience: reportData.audience, learning: reportData.learning, copyUtilization: reportData.copyUtilization,
                }),
            })
            if (!res.ok) { const err = await res.json(); setOppsError(err.error || "Failed to generate opportunities") }
            else { const data = await res.json(); setOpportunitiesText(data.opportunities || "") }
        } catch { setOppsError("Network error — could not generate opportunities.") }
        finally { setIsLoadingOpps(false) }
    }

    const reportDate = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })

    if (!open) return null

    // Determine which sidebar sections to show (copy only if data exists)
    const visibleSections = report
        ? SIDEBAR_SECTIONS.filter(s => s.id !== "copy" || report.copyUtilization)
        : SIDEBAR_SECTIONS

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50"
                style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", top: -25, left: 0, right: 0, bottom: 0, position: 'fixed' }}
                onClick={() => onOpenChange(false)}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-[24px] shadow-2xl w-full max-w-[1020px] max-h-[92vh] overflow-hidden flex flex-col border border-gray-100"
                    onClick={(e) => e.stopPropagation()}
                    style={{ animation: "auditSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}
                >
                    {/* ── Sticky header ── */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
                        <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                            <div
                                className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-white border border-gray-200 shadow-sm"
                            >
                                <img src={Audit} alt="" className="w-[18px] h-[18px]" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-[16px] font-bold text-gray-900 truncate leading-tight">
                                    {adAccountName || "Ad Account Audit"}
                                </h2>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    Ad Account Audit · {reportDate}
                                    {kpiTarget && (
                                        <span
                                            className="ml-2 px-2.5 py-0.5 text-[10px] font-semibold rounded-full"
                                            style={{ background: BLUE_BG, color: BLUE_DARK }}
                                        >
                                            Target {kpiType.toUpperCase()}: {kpiType === "cpa" ? `$${kpiTarget}` : `${kpiTarget}×`}
                                            {kpiType === "cpa" && conversionEvent ? ` · ${conversionEvent.replace(/^offsite_conversion\.fb_pixel_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}` : ""}                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {report && !isGenerating && (
                                <Button variant="outline" size="sm" onClick={generateReport} className="rounded-2xl text-xs gap-1.5 h-9">
                                    <FileBarChart2 className="w-3.5 h-3.5" />
                                    Re-run Audit
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

                    {/* ── Body: Sidebar + Scrollable Content ── */}
                    <div className="flex-1 flex overflow-hidden min-h-0">

                        {/* Sidebar — anchor navigation */}
                        {report && !isGenerating && (
                            <nav className="w-[180px] flex-shrink-0 border-r border-gray-100 p-2.5 overflow-y-auto bg-[#fafafa]">
                                {visibleSections.map(({ id, label, icon }) => {
                                    const isActive = activeSection === id
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => scrollTo(id)}
                                            className={cn(
                                                "w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-150 mb-0.5",
                                                isActive
                                                    ? "bg-gray-100 text-gray-900"
                                                    : "text-gray-500 hover:bg-gray-100/60 hover:text-gray-700"
                                            )}
                                        >
                                            <span className={cn(
                                                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                                                isActive ? "bg-white shadow-sm border border-gray-200" : "bg-gray-100/60"
                                            )}>
                                                <img src={icon} alt="" className="w-3.5 h-3.5 opacity-70" />
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

                        {/* Scrollable content area */}
                        <div ref={contentRef} className="flex-1 overflow-y-auto p-5 custom-scrollbar" style={{ background: "#f8f9fb" }}>
                            {isGenerating && (
                                <div className="flex flex-col items-center justify-center py-24 text-sm text-gray-500">
                                    <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: BLUE }} />
                                    <p className="font-medium text-gray-600">Fetching account data from Meta…</p>
                                    <p className="text-xs text-gray-400 mt-1">This usually takes 5–15 seconds</p>
                                </div>
                            )}
                            {error && !isGenerating && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">
                                    {error}
                                    <button onClick={generateReport} className="ml-3 underline text-red-600 hover:text-red-800 font-medium">Retry</button>
                                </div>
                            )}
                            {report && !isGenerating && (
                                <div className="space-y-4" style={{ animation: "auditFadeIn 0.4s ease" }}>
                                    <SummarySection report={report} kpiType={report.kpiType || kpiType} kpiTarget={kpiTarget} />
                                    <TrafficSection traffic={report.traffic} />
                                    <FunnelSection funnel={report.funnel} />
                                    <MonthlySpendSection monthlySpend={report.monthlySpend} kpiType={report.kpiType || kpiType} />
                                    <AudienceSection audience={report.audience} />
                                    <LearningSection learning={report.learning} />
                                    {report.copyUtilization && <CopyUtilizationSection copyUtilization={report.copyUtilization} />}
                                    <OpportunitiesSection text={opportunitiesText} isLoading={isLoadingOpps} error={oppsError} onChange={setOpportunitiesText} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Keyframe animations */}
            <style>{`
                @keyframes auditSlideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes auditFadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    )
}