"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, FileBarChart2, Printer } from "lucide-react"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay,
} from "@/components/ui/dialog"
import {
    ComposedChart, BarChart as ReBarChart, LineChart, Bar, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'

// ---- Colors ----
const CPC_COLOR = "#6366f1"
const CTR_COLOR = "#10b981"
const CPM_COLOR = "#6b7280"
const FREQ_COLOR = "#6366f1"
const FTIR_COLOR = "#0891b2"
const SPEND_COLOR = "#6366f1"
const KPI_COLOR = "#f59e0b"
const PROSPECTING_COLOR = "#6366f1"
const RETARGETING_COLOR = "#f59e0b"

// ---- Formatters ----
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

// ---- Subcomponents ----

function MetricCard({ label, value, sub, color }) {
    return (
        <div className="bg-gray-50 rounded-lg p-4 flex flex-col gap-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold" style={{ color: color || "#111827" }}>{value}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
    )
}

function SectionHeader({ num, title, sub }) {
    return (
        <div className="mb-4">
            <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{num}</span>
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            </div>
            {sub && <p className="text-xs text-gray-400 mt-0.5 ml-8">{sub}</p>}
        </div>
    )
}

function ChartTooltipContent({ active, payload, label, formatters }) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-xs min-w-[140px]">
            <p className="font-semibold text-gray-600 mb-1">{label}</p>
            {payload.map((entry) => (
                <div key={entry.name} className="flex justify-between gap-3">
                    <span style={{ color: entry.color }}>{entry.name}</span>
                    <span className="text-gray-800 font-medium">
                        {formatters?.[entry.name] ? formatters[entry.name](entry.value) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    )
}

// ---- Section 1: Traffic ----
function TrafficSection({ traffic }) {
    const dateLabel = (d) => d.slice(5).replace("-", "/")
    return (
        <div className="bg-white rounded-lg border border-gray-100 p-6">
            <SectionHeader num={1} title="Traffic Overview" sub="Trailing 30 days \u00b7 Cost Per Link Click, Link CTR, and CPM" />
            <div className="grid grid-cols-3 gap-4 mb-6">
                <MetricCard label="Avg Cost Per Link Click" value={fmt$(traffic.avgCostPerClick, 2)} color={CPC_COLOR} />
                <MetricCard label="Avg Link CTR" value={traffic.avgCtr !== null ? `${traffic.avgCtr.toFixed(2)}%` : "\u2014"} color={CTR_COLOR} />
                <MetricCard label="Avg CPM" value={fmt$(traffic.avgCpm, 2)} color={CPM_COLOR} />
            </div>
            <div className="grid grid-cols-3 gap-4">
                {[
                    { key: "costPerClick", label: "Cost Per Click (CPC)", color: CPC_COLOR, fmt: (v) => `$${(v ?? 0).toFixed(2)}`, yFmt: (v) => `$${v.toFixed(0)}` },
                    { key: "ctr", label: "Link Click-Through Rate (CTR)", color: CTR_COLOR, fmt: (v) => `${(v ?? 0).toFixed(2)}%`, yFmt: (v) => `${v.toFixed(1)}%` },
                    { key: "cpm", label: "Cost Per 1,000 Impressions (CPM)", color: CPM_COLOR, fmt: (v) => `$${(v ?? 0).toFixed(2)}`, yFmt: (v) => `$${v.toFixed(0)}` },
                ].map(({ key, label, color, fmt: tooltipFmt, yFmt }) => (
                    <div key={key}>
                        <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
                        <div style={{ height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={traffic.daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={dateLabel} interval="preserveStartEnd" stroke="#d1d5db" tickLine={false} />
                                    <YAxis tick={{ fontSize: 9 }} stroke="#d1d5db" tickLine={false} axisLine={false} tickFormatter={yFmt} width={36} />
                                    <Tooltip formatter={(v) => [tooltipFmt(v), label.split(" (")[0]]} />
                                    <Line type="monotone" dataKey={key} stroke={color} dot={false} strokeWidth={2} connectNulls />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ---- Section 2: Funnel ----
function FunnelSection({ funnel }) {
    const chartData = funnel.weekly.map((w) => ({
        week: `${w.weekStart.slice(5).replace("-", "/")}\u2013${w.weekEnd.slice(5).replace("-", "/")}`,
        Frequency: w.frequency,
        "FTIR %": w.ftir !== null ? w.ftir * 100 : null,
    }))
    return (
        <div className="bg-white rounded-lg border border-gray-100 p-6">
            <SectionHeader num={2} title="Funnel Health" sub="Trailing 3 months \u00b7 weekly averages \u00b7 Frequency and First-Time Impression Rate" />
            <div className="grid grid-cols-2 gap-4 mb-6">
                <MetricCard label="Avg Weekly Frequency" value={fmtNum(funnel.avgFrequency)} sub="impressions per unique user" color={FREQ_COLOR} />
                <MetricCard label="Avg First-Time Impression Rate" value={fmtPct(funnel.avgFtir)} sub="reach \u00f7 impressions \u00b7 higher is healthier" color={FTIR_COLOR} />
            </div>
            <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="#d1d5db" tickLine={false} />
                        <YAxis yAxisId="freq" tick={{ fontSize: 10 }} stroke="#d1d5db" tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(1)} width={36} />
                        <YAxis yAxisId="ftir" orientation="right" tick={{ fontSize: 10 }} stroke="#d1d5db" tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} width={44} />
                        <Tooltip content={<ChartTooltipContent formatters={{ Frequency: (v) => v.toFixed(2), "FTIR %": (v) => `${v.toFixed(1)}%` }} />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line yAxisId="freq" type="monotone" dataKey="Frequency" stroke={FREQ_COLOR} strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: FREQ_COLOR }} />
                        <Line yAxisId="ftir" type="monotone" dataKey="FTIR %" stroke={FTIR_COLOR} strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: FTIR_COLOR }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

// ---- Section 3: Monthly Spend ----
function MonthlySpendSection({ monthlySpend, kpiType }) {
    const kpiLabel = kpiType === "roas" ? "ROAS" : "CPA"
    const kpiFmt = (v) => kpiType === "roas" ? `${v.toFixed(2)}\u00d7` : `$${v.toFixed(0)}`
    return (
        <div className="bg-white rounded-lg border border-gray-100 p-6">
            <SectionHeader num={3} title="Monthly Ad Spend" sub={`Last 6 months \u00b7 total account spend and blended ${kpiLabel} by calendar month`} />
            <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlySpend} margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#d1d5db" tickLine={false} />
                        <YAxis yAxisId="spend" tick={{ fontSize: 10 }} stroke="#d1d5db" tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} width={48} />
                        <YAxis yAxisId="kpi" orientation="right" tick={{ fontSize: 10 }} stroke="#d1d5db" tickLine={false} axisLine={false} tickFormatter={kpiFmt} width={44} />
                        <Tooltip content={<ChartTooltipContent formatters={{ Spend: (v) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, [kpiLabel]: kpiFmt }} />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar yAxisId="spend" dataKey="spend" name="Spend" fill={SPEND_COLOR} radius={[3, 3, 0, 0]}>
                            {monthlySpend.map((_, i) => (
                                <Cell key={i} fill={i === monthlySpend.length - 1 ? "#818cf8" : SPEND_COLOR} />
                            ))}
                        </Bar>
                        <Line yAxisId="kpi" type="monotone" dataKey="kpi" name={kpiLabel} stroke={KPI_COLOR} dot={{ r: 4, strokeWidth: 0, fill: KPI_COLOR }} strokeWidth={2} connectNulls />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

// ---- Section 4: Audience ----
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
        <div className="bg-white rounded-lg border border-gray-100 p-6">
            <SectionHeader num={4} title="Audience Strategy" sub="Adsets with delivery in last 30 days (including paused) \u00b7 prospecting vs retargeting classification" />

            <div className="grid grid-cols-3 gap-4 mb-6">
                <MetricCard label="Prospecting Spend (30d)" value={fmt$(audience.prospectingSpend)} sub={`${spendPct(audience.prospectingSpend)} of total`} color={PROSPECTING_COLOR} />
                <MetricCard label="Retargeting Spend (30d)" value={fmt$(audience.retargetingSpend)} sub={`${spendPct(audience.retargetingSpend)} of total`} color={RETARGETING_COLOR} />
                <MetricCard label="Total Account Spend (30d)" value={fmt$(audience.totalSpend30d)} />
            </div>

            <div style={{ height: 80 }} className="mb-6">
                <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart layout="vertical" data={splitData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} stroke="#d1d5db" tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} stroke="#d1d5db" tickLine={false} axisLine={false} />
                        <Tooltip formatter={(v) => [`$${(v || 0).toLocaleString()}`, ""]} cursor={{ fill: "#f9fafb" }} />
                        <Bar dataKey="spend" radius={[0, 3, 3, 0]}>
                            {splitData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                        </Bar>
                    </ReBarChart>
                </ResponsiveContainer>
            </div>

            {audience.topExclusions?.length > 0 && (
                <div className="mb-5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Most-Used Exclusion Audiences</p>
                    <div className="flex flex-wrap gap-2">
                        {audience.topExclusions.map((exc) => (
                            <span key={exc.name} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                {exc.name} <span className="text-gray-400">\u00d7{exc.count}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="mb-3 flex items-center gap-2">
                {["all", "prospecting", "retargeting"].map((t) => (
                    <button key={t} onClick={() => setFilter(t)}
                        className={cn("px-3 py-1 text-xs rounded-full font-medium transition-colors",
                            filter === t
                                ? t === "prospecting" ? "bg-indigo-100 text-indigo-700" : t === "retargeting" ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-700"
                                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        )}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                        {t !== "all" && <span className="ml-1 text-gray-400">({audience.adsets.filter(a => a.type === t).length})</span>}
                    </button>
                ))}
                <span className="ml-auto text-xs text-gray-400">{filtered.length} adsets</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Adset</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Type</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 min-w-[200px]">Targeting</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Exclusions</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">30d Spend</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {visible.map((adset) => (
                            <tr key={adset.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-800 max-w-[180px] truncate" title={adset.name}>{adset.name}</td>
                                <td className="px-3 py-2">
                                    <span className={cn("inline-block px-2 py-0.5 text-xs rounded-full font-medium",
                                        adset.type === "prospecting" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"
                                    )}>
                                        {adset.type === "prospecting" ? "Pros." : "Retas."}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-gray-600 text-xs max-w-[220px]">{adset.targetingSummary}</td>
                                <td className="px-3 py-2 text-gray-500 text-xs max-w-[180px]">
                                    {adset.exclusions.length
                                        ? adset.exclusions.slice(0, 2).join(", ") + (adset.exclusions.length > 2 ? "\u2026" : "")
                                        : <span className="text-gray-300">\u2014</span>}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-gray-800">{fmt$(adset.spend30d)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filtered.length > 8 && (
                <button onClick={() => setShowAll(v => !v)} className="mt-2 text-xs text-indigo-600 hover:text-indigo-800">
                    {showAll ? "Show less" : `Show all ${filtered.length} adsets`}
                </button>
            )}
        </div>
    )
}

// ---- Section 5: Learning Phase ----
function LearningSection({ learning }) {
    const pct = learning.learningSpendPct
    const pctDisplay = pct !== null ? `${(pct * 100).toFixed(1)}%` : "\u2014"
    let status = "good"
    if (pct !== null) {
        if (pct >= 0.5) status = "bad"
        else if (pct >= 0.2) status = "warn"
    }
    const cfg = {
        good: { label: "Healthy", bg: "bg-green-50", text: "text-green-700", border: "border-green-200", numColor: "#059669" },
        warn: { label: "Monitor", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", numColor: "#d97706" },
        bad: { label: "Action needed", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", numColor: "#dc2626" },
    }[status]

    return (
        <div className="bg-white rounded-lg border border-gray-100 p-6">
            <SectionHeader num={5} title="% of Budget in Learning Phase" sub="Last 7 days \u00b7 ad sets in Learning or Learning Limited (including paused)" />
            <div className="flex items-start gap-6">
                <div className={cn("flex-shrink-0 border rounded-xl px-8 py-6 text-center", cfg.bg, cfg.border)}>
                    <p className="text-5xl font-bold" style={{ color: cfg.numColor }}>{pctDisplay}</p>
                    <p className={cn("text-sm font-medium mt-1", cfg.text)}>{cfg.label}</p>
                </div>
                <div className="flex-1 space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                        <MetricCard label="Learning Spend (7d)" value={fmt$(learning.learningSpend)} sub="spend from Learning / Learning Limited ad sets" />
                        <MetricCard label="Total Spend (7d)" value={fmt$(learning.totalSpend)} sub="all ad sets" />
                    </div>
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
                        <p><span className="font-medium text-green-700">{"< 20%"}</span> \u2014 Healthy. Most budget is running in stable, optimized ad sets.</p>
                        <p><span className="font-medium text-amber-700">20\u201350%</span> \u2014 Monitor. A significant portion of budget is in learning; avoid additional structural changes.</p>
                        <p><span className="font-medium text-red-700">{"> 50%"}</span> \u2014 Action needed. Consolidate ad sets or pause new launches until learning completes.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ---- Section 6: Copy Utilization ----
function CopyUtilizationSection({ copyUtilization }) {
    const isGood = copyUtilization.status === "maximizing"
    return (
        <div className="bg-white rounded-lg border border-gray-100 p-6">
            <SectionHeader num={6} title="Copy Utilization" sub="Top 10 ads by 30-day spend \u00b7 primary text and headline field usage" />
            <div className="flex items-start gap-6 mb-5">
                <div className={cn("flex-shrink-0 border rounded-xl px-6 py-4 text-center",
                    isGood ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
                )}>
                    <p className={cn("text-4xl font-bold", isGood ? "text-green-700" : "text-amber-700")}>
                        {copyUtilization.maximizingCount}/{copyUtilization.totalCount}
                    </p>
                    <p className={cn("text-xs font-medium mt-1", isGood ? "text-green-600" : "text-amber-600")}>maximizing</p>
                </div>
                <div className="flex-1 pt-1">
                    <p className={cn("text-sm font-semibold mb-2", isGood ? "text-green-700" : "text-amber-700")}>
                        {isGood ? "\u2713 " : "\u26a0 "}{copyUtilization.statusText}
                    </p>
                    <p className="text-xs text-gray-500">
                        Ads using all 5 primary text variants and 5 headline variants allow Meta&#39;s algorithm to test more combinations, improving delivery efficiency and reducing cost over time.
                    </p>
                </div>
            </div>
        </div>
    )
}

// ---- Section 7: Opportunities ----
function OpportunitiesSection({ text, isLoading, error, onChange }) {
    return (
        <div className="bg-white rounded-lg border border-gray-100 p-6">
            <SectionHeader num={7} title="Areas of Opportunity" sub="AI-generated analysis based on account performance data \u00b7 editable" />
            {isLoading && (
                <div className="space-y-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={cn("h-3 bg-gray-100 rounded animate-pulse", ["w-3/4", "w-full", "w-5/6", "w-4/5", "w-full", "w-2/3"][i])} />
                    ))}
                </div>
            )}
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-3">{error}</p>}
            {!isLoading && (
                <textarea
                    value={text}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full min-h-[350px] text-sm text-gray-700 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y leading-relaxed"
                    placeholder="Areas of Opportunity will appear here automatically after the report loads\u2026"
                />
            )}
        </div>
    )
}


// ============================================
// Main Export: AdAccountAudit dialog
// ============================================

/**
 * AdAccountAudit
 *
 * Full-account audit dialog. Auto-generates report on open.
 *
 * Props:
 *  - open: boolean
 *  - onOpenChange: (open) => void
 *  - adAccountId: string (e.g. "act_123456")
 *  - adAccountName: string
 *  - kpiType: "cpa" | "roas" (from saved settings or auto-detected)
 *  - conversionEvent: string | null (for CPA mode)
 *  - targetCPA: number | null
 *  - targetROAS: number | null
 */
export default function AdAccountAudit({
    open,
    onOpenChange,
    adAccountId,
    adAccountName,
    kpiType = "cpa",
    conversionEvent = null,
    targetCPA = null,
    targetROAS = null,
}) {
    const [report, setReport] = useState(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState(null)

    const [opportunitiesText, setOpportunitiesText] = useState("")
    const [isLoadingOpps, setIsLoadingOpps] = useState(false)
    const [oppsError, setOppsError] = useState(null)

    const kpiTarget = kpiType === "cpa" ? targetCPA : targetROAS

    // Auto-generate report when dialog opens
    useEffect(() => {
        if (open && adAccountId && !report && !isGenerating) {
            generateReport()
        }
        if (!open) {
            // Reset on close
            setReport(null)
            setError(null)
            setOpportunitiesText("")
            setOppsError(null)
        }
    }, [open, adAccountId])

    const generateReport = async () => {
        setIsGenerating(true)
        setError(null)
        setReport(null)
        setOpportunitiesText("")

        const params = new URLSearchParams({ adAccountId, kpiType })
        if (kpiType === "cpa" && conversionEvent) params.set("conversionEvent", conversionEvent)

        try {
            const res = await fetch(`${API_BASE_URL}/api/analytics/audit/report?${params}`, {
                credentials: "include",
            })
            if (!res.ok) {
                const err = await res.json()
                setError(err.error || "Failed to generate report")
                return
            }
            const data = await res.json()
            setReport(data)
            // Auto-fetch opportunities
            fetchOpportunities(data)
        } catch (e) {
            setError("Network error \u2014 please try again.")
        } finally {
            setIsGenerating(false)
        }
    }

    const fetchOpportunities = async (reportData) => {
        setIsLoadingOpps(true)
        setOppsError(null)
        try {
            const res = await fetch(`${API_BASE_URL}/api/analytics/audit/opportunities`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    accountName: adAccountName,
                    kpiType,
                    kpiTarget: kpiTarget || "",
                    conversionEvent: kpiType === "cpa" ? conversionEvent : "",
                    traffic: reportData.traffic,
                    funnel: reportData.funnel,
                    monthlySpend: reportData.monthlySpend,
                    audience: reportData.audience,
                    learning: reportData.learning,
                    copyUtilization: reportData.copyUtilization,
                }),
            })
            if (!res.ok) {
                const err = await res.json()
                setOppsError(err.error || "Failed to generate opportunities")
            } else {
                const data = await res.json()
                setOpportunitiesText(data.opportunities || "")
            }
        } catch {
            setOppsError("Network error \u2014 could not generate opportunities.")
        } finally {
            setIsLoadingOpps(false)
        }
    }

    const reportDate = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogOverlay className="bg-black/50" />
            <DialogContent className="sm:max-w-[960px] !rounded-[24px] p-0 max-h-[92vh] overflow-hidden flex flex-col">
                {/* Sticky header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div>
                        <DialogTitle className="text-lg font-bold text-gray-900">
                            {adAccountName || "Ad Account Audit"}
                        </DialogTitle>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Ad Account Audit \u00b7 {reportDate}
                            {kpiTarget && (
                                <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                                    Target {kpiType.toUpperCase()}: {kpiType === "cpa" ? `$${kpiTarget}` : `${kpiTarget}\u00d7`}
                                    {kpiType === "cpa" && conversionEvent ? ` \u00b7 ${conversionEvent}` : ""}
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {report && (
                            <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl text-xs gap-1.5">
                                <Printer className="w-3.5 h-3.5" />
                                Print
                            </Button>
                        )}
                        {report && !isGenerating && (
                            <Button variant="outline" size="sm" onClick={generateReport} className="rounded-xl text-xs gap-1.5">
                                <FileBarChart2 className="w-3.5 h-3.5" />
                                Re-run
                            </Button>
                        )}
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">
                    {/* Loading state */}
                    {isGenerating && (
                        <div className="flex flex-col items-center justify-center py-20 text-sm text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                            Fetching account data from Meta\u2026 this usually takes 5\u201315 seconds.
                        </div>
                    )}

                    {/* Error */}
                    {error && !isGenerating && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                            {error}
                            <button onClick={generateReport} className="ml-3 underline text-red-600 hover:text-red-800">
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Report sections */}
                    {report && !isGenerating && (
                        <>
                            <TrafficSection traffic={report.traffic} />
                            <FunnelSection funnel={report.funnel} />
                            <MonthlySpendSection monthlySpend={report.monthlySpend} kpiType={report.kpiType || kpiType} />
                            <AudienceSection audience={report.audience} />
                            <LearningSection learning={report.learning} />
                            {report.copyUtilization && <CopyUtilizationSection copyUtilization={report.copyUtilization} />}
                            <OpportunitiesSection text={opportunitiesText} isLoading={isLoadingOpps} error={oppsError} onChange={setOpportunitiesText} />
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}