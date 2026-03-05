// "use client"

// import { useState, useEffect, useCallback } from "react"
// import { Button } from "@/components/ui/button"
// import { Loader2, FileBarChart2, Printer } from "lucide-react"
// import {
//     Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay,
// } from "@/components/ui/dialog"
// import {
//     ComposedChart, BarChart as ReBarChart, LineChart, Bar, Line, XAxis, YAxis,
//     CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
// } from "recharts"
// import { cn } from "@/lib/utils"

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'

// // ---- Colors ----
// const CPC_COLOR = "#6366f1"
// const CTR_COLOR = "#10b981"
// const CPM_COLOR = "#6b7280"
// const FREQ_COLOR = "#6366f1"
// const FTIR_COLOR = "#0891b2"
// const SPEND_COLOR = "#6366f1"
// const KPI_COLOR = "#f59e0b"
// const PROSPECTING_COLOR = "#6366f1"
// const RETARGETING_COLOR = "#f59e0b"

// // ---- Formatters ----
// function fmt$(v, decimals = 0) {
//     if (v === null || v === undefined) return "\u2014"
//     if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
//     return `$${v.toFixed(decimals)}`
// }
// function fmtPct(v, decimals = 1) {
//     if (v === null || v === undefined) return "\u2014"
//     return `${(v * 100).toFixed(decimals)}%`
// }
// function fmtNum(v, decimals = 2) {
//     if (v === null || v === undefined) return "\u2014"
//     return v.toFixed(decimals)
// }

// // ---- Subcomponents ----

// function MetricCard({ label, value, sub, color }) {
//     return (
//         <div className="bg-gray-50 rounded-lg p-4 flex flex-col gap-1">
//             <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
//             <p className="text-2xl font-bold" style={{ color: color || "#111827" }}>{value}</p>
//             {sub && <p className="text-xs text-gray-400">{sub}</p>}
//         </div>
//     )
// }

// function SectionHeader({ num, title, sub }) {
//     return (
//         <div className="mb-4">
//             <div className="flex items-baseline gap-2">
//                 <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{num}</span>
//                 <h3 className="text-base font-semibold text-gray-900">{title}</h3>
//             </div>
//             {sub && <p className="text-xs text-gray-400 mt-0.5 ml-8">{sub}</p>}
//         </div>
//     )
// }

// function ChartTooltipContent({ active, payload, label, formatters }) {
//     if (!active || !payload?.length) return null
//     return (
//         <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-xs min-w-[140px]">
//             <p className="font-semibold text-gray-600 mb-1">{label}</p>
//             {payload.map((entry) => (
//                 <div key={entry.name} className="flex justify-between gap-3">
//                     <span style={{ color: entry.color }}>{entry.name}</span>
//                     <span className="text-gray-800 font-medium">
//                         {formatters?.[entry.name] ? formatters[entry.name](entry.value) : entry.value}
//                     </span>
//                 </div>
//             ))}
//         </div>
//     )
// }

// // ---- Section 1: Traffic ----
// function TrafficSection({ traffic }) {
//     const dateLabel = (d) => d.slice(5).replace("-", "/")
//     return (
//         <div className="bg-white rounded-lg border border-gray-100 p-6">
//             <SectionHeader num={1} title="Traffic Overview" sub="Trailing 30 days \u00b7 Cost Per Link Click, Link CTR, and CPM" />
//             <div className="grid grid-cols-3 gap-4 mb-6">
//                 <MetricCard label="Avg Cost Per Link Click" value={fmt$(traffic.avgCostPerClick, 2)} color={CPC_COLOR} />
//                 <MetricCard label="Avg Link CTR" value={traffic.avgCtr !== null ? `${traffic.avgCtr.toFixed(2)}%` : "\u2014"} color={CTR_COLOR} />
//                 <MetricCard label="Avg CPM" value={fmt$(traffic.avgCpm, 2)} color={CPM_COLOR} />
//             </div>
//             <div className="grid grid-cols-3 gap-4">
//                 {[
//                     { key: "costPerClick", label: "Cost Per Click (CPC)", color: CPC_COLOR, fmt: (v) => `$${(v ?? 0).toFixed(2)}`, yFmt: (v) => `$${v.toFixed(0)}` },
//                     { key: "ctr", label: "Link Click-Through Rate (CTR)", color: CTR_COLOR, fmt: (v) => `${(v ?? 0).toFixed(2)}%`, yFmt: (v) => `${v.toFixed(1)}%` },
//                     { key: "cpm", label: "Cost Per 1,000 Impressions (CPM)", color: CPM_COLOR, fmt: (v) => `$${(v ?? 0).toFixed(2)}`, yFmt: (v) => `$${v.toFixed(0)}` },
//                 ].map(({ key, label, color, fmt: tooltipFmt, yFmt }) => (
//                     <div key={key}>
//                         <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
//                         <div style={{ height: 160 }}>
//                             <ResponsiveContainer width="100%" height="100%">
//                                 <LineChart data={traffic.daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
//                                     <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
//                                     <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={dateLabel} interval="preserveStartEnd" stroke="#d1d5db" tickLine={false} />
//                                     <YAxis tick={{ fontSize: 9 }} stroke="#d1d5db" tickLine={false} axisLine={false} tickFormatter={yFmt} width={36} />
//                                     <Tooltip formatter={(v) => [tooltipFmt(v), label.split(" (")[0]]} />
//                                     <Line type="monotone" dataKey={key} stroke={color} dot={false} strokeWidth={2} connectNulls />
//                                 </LineChart>
//                             </ResponsiveContainer>
//                         </div>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     )
// }

// // ---- Section 2: Funnel ----
// function FunnelSection({ funnel }) {
//     const chartData = funnel.weekly.map((w) => ({
//         week: `${w.weekStart.slice(5).replace("-", "/")}\u2013${w.weekEnd.slice(5).replace("-", "/")}`,
//         Frequency: w.frequency,
//         "FTIR %": w.ftir !== null ? w.ftir * 100 : null,
//     }))
//     return (
//         <div className="bg-white rounded-lg border border-gray-100 p-6">
//             <SectionHeader num={2} title="Funnel Health" sub="Trailing 3 months \u00b7 weekly averages \u00b7 Frequency and First-Time Impression Rate" />
//             <div className="grid grid-cols-2 gap-4 mb-6">
//                 <MetricCard label="Avg Weekly Frequency" value={fmtNum(funnel.avgFrequency)} sub="impressions per unique user" color={FREQ_COLOR} />
//                 <MetricCard label="Avg First-Time Impression Rate" value={fmtPct(funnel.avgFtir)} sub="reach \u00f7 impressions \u00b7 higher is healthier" color={FTIR_COLOR} />
//             </div>
//             <div style={{ height: 220 }}>
//                 <ResponsiveContainer width="100%" height="100%">
//                     <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
//                         <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
//                         <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="#d1d5db" tickLine={false} />
//                         <YAxis yAxisId="freq" tick={{ fontSize: 10 }} stroke="#d1d5db" tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(1)} width={36} />
//                         <YAxis yAxisId="ftir" orientation="right" tick={{ fontSize: 10 }} stroke="#d1d5db" tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} width={44} />
//                         <Tooltip content={<ChartTooltipContent formatters={{ Frequency: (v) => v.toFixed(2), "FTIR %": (v) => `${v.toFixed(1)}%` }} />} />
//                         <Legend wrapperStyle={{ fontSize: 11 }} />
//                         <Line yAxisId="freq" type="monotone" dataKey="Frequency" stroke={FREQ_COLOR} strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: FREQ_COLOR }} />
//                         <Line yAxisId="ftir" type="monotone" dataKey="FTIR %" stroke={FTIR_COLOR} strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: FTIR_COLOR }} />
//                     </ComposedChart>
//                 </ResponsiveContainer>
//             </div>
//         </div>
//     )
// }

// // ---- Section 3: Monthly Spend ----
// function MonthlySpendSection({ monthlySpend, kpiType }) {
//     const kpiLabel = kpiType === "roas" ? "ROAS" : "CPA"
//     const kpiFmt = (v) => kpiType === "roas" ? `${v.toFixed(2)}\u00d7` : `$${v.toFixed(0)}`
//     return (
//         <div className="bg-white rounded-lg border border-gray-100 p-6">
//             <SectionHeader num={3} title="Monthly Ad Spend" sub={`Last 6 months \u00b7 total account spend and blended ${kpiLabel} by calendar month`} />
//             <div style={{ height: 240 }}>
//                 <ResponsiveContainer width="100%" height="100%">
//                     <ComposedChart data={monthlySpend} margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
//                         <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
//                         <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#d1d5db" tickLine={false} />
//                         <YAxis yAxisId="spend" tick={{ fontSize: 10 }} stroke="#d1d5db" tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} width={48} />
//                         <YAxis yAxisId="kpi" orientation="right" tick={{ fontSize: 10 }} stroke="#d1d5db" tickLine={false} axisLine={false} tickFormatter={kpiFmt} width={44} />
//                         <Tooltip content={<ChartTooltipContent formatters={{ Spend: (v) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, [kpiLabel]: kpiFmt }} />} />
//                         <Legend wrapperStyle={{ fontSize: 11 }} />
//                         <Bar yAxisId="spend" dataKey="spend" name="Spend" fill={SPEND_COLOR} radius={[3, 3, 0, 0]}>
//                             {monthlySpend.map((_, i) => (
//                                 <Cell key={i} fill={i === monthlySpend.length - 1 ? "#818cf8" : SPEND_COLOR} />
//                             ))}
//                         </Bar>
//                         <Line yAxisId="kpi" type="monotone" dataKey="kpi" name={kpiLabel} stroke={KPI_COLOR} dot={{ r: 4, strokeWidth: 0, fill: KPI_COLOR }} strokeWidth={2} connectNulls />
//                     </ComposedChart>
//                 </ResponsiveContainer>
//             </div>
//         </div>
//     )
// }

// // ---- Section 4: Audience ----
// function AudienceSection({ audience }) {
//     const [filter, setFilter] = useState("all")
//     const [showAll, setShowAll] = useState(false)

//     const filtered = audience.adsets.filter((a) => filter === "all" || a.type === filter)
//     const visible = showAll ? filtered : filtered.slice(0, 8)
//     const total = audience.totalSpend30d

//     const spendPct = (v) => total > 0 ? `${((v / total) * 100).toFixed(0)}%` : "\u2014"

//     const splitData = [
//         { name: "Prospecting", spend: audience.prospectingSpend, fill: PROSPECTING_COLOR },
//         { name: "Retargeting", spend: audience.retargetingSpend, fill: RETARGETING_COLOR },
//     ]

//     return (
//         <div className="bg-white rounded-lg border border-gray-100 p-6">
//             <SectionHeader num={4} title="Audience Strategy" sub="Adsets with delivery in last 30 days (including paused) \u00b7 prospecting vs retargeting classification" />

//             <div className="grid grid-cols-3 gap-4 mb-6">
//                 <MetricCard label="Prospecting Spend (30d)" value={fmt$(audience.prospectingSpend)} sub={`${spendPct(audience.prospectingSpend)} of total`} color={PROSPECTING_COLOR} />
//                 <MetricCard label="Retargeting Spend (30d)" value={fmt$(audience.retargetingSpend)} sub={`${spendPct(audience.retargetingSpend)} of total`} color={RETARGETING_COLOR} />
//                 <MetricCard label="Total Account Spend (30d)" value={fmt$(audience.totalSpend30d)} />
//             </div>

//             <div style={{ height: 80 }} className="mb-6">
//                 <ResponsiveContainer width="100%" height="100%">
//                     <ReBarChart layout="vertical" data={splitData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
//                         <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} stroke="#d1d5db" tickLine={false} />
//                         <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} stroke="#d1d5db" tickLine={false} axisLine={false} />
//                         <Tooltip formatter={(v) => [`$${(v || 0).toLocaleString()}`, ""]} cursor={{ fill: "#f9fafb" }} />
//                         <Bar dataKey="spend" radius={[0, 3, 3, 0]}>
//                             {splitData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
//                         </Bar>
//                     </ReBarChart>
//                 </ResponsiveContainer>
//             </div>

//             {audience.topExclusions?.length > 0 && (
//                 <div className="mb-5">
//                     <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Most-Used Exclusion Audiences</p>
//                     <div className="flex flex-wrap gap-2">
//                         {audience.topExclusions.map((exc) => (
//                             <span key={exc.name} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
//                                 {exc.name} <span className="text-gray-400">\u00d7{exc.count}</span>
//                             </span>
//                         ))}
//                     </div>
//                 </div>
//             )}

//             <div className="mb-3 flex items-center gap-2">
//                 {["all", "prospecting", "retargeting"].map((t) => (
//                     <button key={t} onClick={() => setFilter(t)}
//                         className={cn("px-3 py-1 text-xs rounded-full font-medium transition-colors",
//                             filter === t
//                                 ? t === "prospecting" ? "bg-indigo-100 text-indigo-700" : t === "retargeting" ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-700"
//                                 : "bg-gray-50 text-gray-500 hover:bg-gray-100"
//                         )}>
//                         {t.charAt(0).toUpperCase() + t.slice(1)}
//                         {t !== "all" && <span className="ml-1 text-gray-400">({audience.adsets.filter(a => a.type === t).length})</span>}
//                     </button>
//                 ))}
//                 <span className="ml-auto text-xs text-gray-400">{filtered.length} adsets</span>
//             </div>

//             <div className="overflow-x-auto rounded-lg border border-gray-100">
//                 <table className="min-w-full text-sm">
//                     <thead className="bg-gray-50">
//                         <tr>
//                             <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Adset</th>
//                             <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Type</th>
//                             <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 min-w-[200px]">Targeting</th>
//                             <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Exclusions</th>
//                             <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">30d Spend</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-50">
//                         {visible.map((adset) => (
//                             <tr key={adset.id} className="hover:bg-gray-50">
//                                 <td className="px-3 py-2 text-gray-800 max-w-[180px] truncate" title={adset.name}>{adset.name}</td>
//                                 <td className="px-3 py-2">
//                                     <span className={cn("inline-block px-2 py-0.5 text-xs rounded-full font-medium",
//                                         adset.type === "prospecting" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"
//                                     )}>
//                                         {adset.type === "prospecting" ? "Pros." : "Retas."}
//                                     </span>
//                                 </td>
//                                 <td className="px-3 py-2 text-gray-600 text-xs max-w-[220px]">{adset.targetingSummary}</td>
//                                 <td className="px-3 py-2 text-gray-500 text-xs max-w-[180px]">
//                                     {adset.exclusions.length
//                                         ? adset.exclusions.slice(0, 2).join(", ") + (adset.exclusions.length > 2 ? "\u2026" : "")
//                                         : <span className="text-gray-300">\u2014</span>}
//                                 </td>
//                                 <td className="px-3 py-2 text-right font-medium text-gray-800">{fmt$(adset.spend30d)}</td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>
//             {filtered.length > 8 && (
//                 <button onClick={() => setShowAll(v => !v)} className="mt-2 text-xs text-indigo-600 hover:text-indigo-800">
//                     {showAll ? "Show less" : `Show all ${filtered.length} adsets`}
//                 </button>
//             )}
//         </div>
//     )
// }

// // ---- Section 5: Learning Phase ----
// function LearningSection({ learning }) {
//     const pct = learning.learningSpendPct
//     const pctDisplay = pct !== null ? `${(pct * 100).toFixed(1)}%` : "\u2014"
//     let status = "good"
//     if (pct !== null) {
//         if (pct >= 0.5) status = "bad"
//         else if (pct >= 0.2) status = "warn"
//     }
//     const cfg = {
//         good: { label: "Healthy", bg: "bg-green-50", text: "text-green-700", border: "border-green-200", numColor: "#059669" },
//         warn: { label: "Monitor", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", numColor: "#d97706" },
//         bad: { label: "Action needed", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", numColor: "#dc2626" },
//     }[status]

//     return (
//         <div className="bg-white rounded-lg border border-gray-100 p-6">
//             <SectionHeader num={5} title="% of Budget in Learning Phase" sub="Last 7 days \u00b7 ad sets in Learning or Learning Limited (including paused)" />
//             <div className="flex items-start gap-6">
//                 <div className={cn("flex-shrink-0 border rounded-xl px-8 py-6 text-center", cfg.bg, cfg.border)}>
//                     <p className="text-5xl font-bold" style={{ color: cfg.numColor }}>{pctDisplay}</p>
//                     <p className={cn("text-sm font-medium mt-1", cfg.text)}>{cfg.label}</p>
//                 </div>
//                 <div className="flex-1 space-y-3 pt-1">
//                     <div className="grid grid-cols-2 gap-3">
//                         <MetricCard label="Learning Spend (7d)" value={fmt$(learning.learningSpend)} sub="spend from Learning / Learning Limited ad sets" />
//                         <MetricCard label="Total Spend (7d)" value={fmt$(learning.totalSpend)} sub="all ad sets" />
//                     </div>
//                     <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
//                         <p><span className="font-medium text-green-700">{"< 20%"}</span> \u2014 Healthy. Most budget is running in stable, optimized ad sets.</p>
//                         <p><span className="font-medium text-amber-700">20\u201350%</span> \u2014 Monitor. A significant portion of budget is in learning; avoid additional structural changes.</p>
//                         <p><span className="font-medium text-red-700">{"> 50%"}</span> \u2014 Action needed. Consolidate ad sets or pause new launches until learning completes.</p>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     )
// }

// // ---- Section 6: Copy Utilization ----
// function CopyUtilizationSection({ copyUtilization }) {
//     const isGood = copyUtilization.status === "maximizing"
//     return (
//         <div className="bg-white rounded-lg border border-gray-100 p-6">
//             <SectionHeader num={6} title="Copy Utilization" sub="Top 10 ads by 30-day spend \u00b7 primary text and headline field usage" />
//             <div className="flex items-start gap-6 mb-5">
//                 <div className={cn("flex-shrink-0 border rounded-xl px-6 py-4 text-center",
//                     isGood ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
//                 )}>
//                     <p className={cn("text-4xl font-bold", isGood ? "text-green-700" : "text-amber-700")}>
//                         {copyUtilization.maximizingCount}/{copyUtilization.totalCount}
//                     </p>
//                     <p className={cn("text-xs font-medium mt-1", isGood ? "text-green-600" : "text-amber-600")}>maximizing</p>
//                 </div>
//                 <div className="flex-1 pt-1">
//                     <p className={cn("text-sm font-semibold mb-2", isGood ? "text-green-700" : "text-amber-700")}>
//                         {isGood ? "\u2713 " : "\u26a0 "}{copyUtilization.statusText}
//                     </p>
//                     <p className="text-xs text-gray-500">
//                         Ads using all 5 primary text variants and 5 headline variants allow Meta&#39;s algorithm to test more combinations, improving delivery efficiency and reducing cost over time.
//                     </p>
//                 </div>
//             </div>
//         </div>
//     )
// }

// // ---- Section 7: Opportunities ----
// function OpportunitiesSection({ text, isLoading, error, onChange }) {
//     return (
//         <div className="bg-white rounded-lg border border-gray-100 p-6">
//             <SectionHeader num={7} title="Areas of Opportunity" sub="AI-generated analysis based on account performance data \u00b7 editable" />
//             {isLoading && (
//                 <div className="space-y-2">
//                     {[...Array(6)].map((_, i) => (
//                         <div key={i} className={cn("h-3 bg-gray-100 rounded animate-pulse", ["w-3/4", "w-full", "w-5/6", "w-4/5", "w-full", "w-2/3"][i])} />
//                     ))}
//                 </div>
//             )}
//             {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-3">{error}</p>}
//             {!isLoading && (
//                 <textarea
//                     value={text}
//                     onChange={(e) => onChange(e.target.value)}
//                     className="w-full min-h-[350px] text-sm text-gray-700 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y leading-relaxed"
//                     placeholder="Areas of Opportunity will appear here automatically after the report loads\u2026"
//                 />
//             )}
//         </div>
//     )
// }


// // ============================================
// // Main Export: AdAccountAudit dialog
// // ============================================

// /**
//  * AdAccountAudit
//  *
//  * Full-account audit dialog. Auto-generates report on open.
//  *
//  * Props:
//  *  - open: boolean
//  *  - onOpenChange: (open) => void
//  *  - adAccountId: string (e.g. "act_123456")
//  *  - adAccountName: string
//  *  - kpiType: "cpa" | "roas" (from saved settings or auto-detected)
//  *  - conversionEvent: string | null (for CPA mode)
//  *  - targetCPA: number | null
//  *  - targetROAS: number | null
//  */
// export default function AdAccountAudit({
//     open,
//     onOpenChange,
//     adAccountId,
//     adAccountName,
//     kpiType = "cpa",
//     conversionEvent = null,
//     targetCPA = null,
//     targetROAS = null,
// }) {
//     const [report, setReport] = useState(null)
//     const [isGenerating, setIsGenerating] = useState(false)
//     const [error, setError] = useState(null)

//     const [opportunitiesText, setOpportunitiesText] = useState("")
//     const [isLoadingOpps, setIsLoadingOpps] = useState(false)
//     const [oppsError, setOppsError] = useState(null)

//     const kpiTarget = kpiType === "cpa" ? targetCPA : targetROAS

//     // Auto-generate report when dialog opens
//     useEffect(() => {
//         if (open && adAccountId && !report && !isGenerating) {
//             generateReport()
//         }
//         if (!open) {
//             // Reset on close
//             setReport(null)
//             setError(null)
//             setOpportunitiesText("")
//             setOppsError(null)
//         }
//     }, [open, adAccountId])

//     const generateReport = async () => {
//         setIsGenerating(true)
//         setError(null)
//         setReport(null)
//         setOpportunitiesText("")

//         const params = new URLSearchParams({ adAccountId, kpiType })
//         if (kpiType === "cpa" && conversionEvent) params.set("conversionEvent", conversionEvent)

//         try {
//             const res = await fetch(`${API_BASE_URL}/api/analytics/audit/report?${params}`, {
//                 credentials: "include",
//             })
//             if (!res.ok) {
//                 const err = await res.json()
//                 setError(err.error || "Failed to generate report")
//                 return
//             }
//             const data = await res.json()
//             setReport(data)
//             // Auto-fetch opportunities
//             fetchOpportunities(data)
//         } catch (e) {
//             setError("Network error \u2014 please try again.")
//         } finally {
//             setIsGenerating(false)
//         }
//     }

//     const fetchOpportunities = async (reportData) => {
//         setIsLoadingOpps(true)
//         setOppsError(null)
//         try {
//             const res = await fetch(`${API_BASE_URL}/api/analytics/audit/opportunities`, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 credentials: "include",
//                 body: JSON.stringify({
//                     accountName: adAccountName,
//                     kpiType,
//                     kpiTarget: kpiTarget || "",
//                     conversionEvent: kpiType === "cpa" ? conversionEvent : "",
//                     traffic: reportData.traffic,
//                     funnel: reportData.funnel,
//                     monthlySpend: reportData.monthlySpend,
//                     audience: reportData.audience,
//                     learning: reportData.learning,
//                     copyUtilization: reportData.copyUtilization,
//                 }),
//             })
//             if (!res.ok) {
//                 const err = await res.json()
//                 setOppsError(err.error || "Failed to generate opportunities")
//             } else {
//                 const data = await res.json()
//                 setOpportunitiesText(data.opportunities || "")
//             }
//         } catch {
//             setOppsError("Network error \u2014 could not generate opportunities.")
//         } finally {
//             setIsLoadingOpps(false)
//         }
//     }

//     const reportDate = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })

//     return (
//         <Dialog open={open} onOpenChange={onOpenChange}>
//             <DialogOverlay className="bg-black/50" />
//             <DialogContent className="sm:max-w-[960px] !rounded-[24px] p-0 max-h-[92vh] overflow-hidden flex flex-col">
//                 {/* Sticky header */}
//                 <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
//                     <div>
//                         <DialogTitle className="text-lg font-bold text-gray-900">
//                             {adAccountName || "Ad Account Audit"}
//                         </DialogTitle>
//                         <p className="text-xs text-gray-500 mt-0.5">
//                             Ad Account Audit {reportDate}
//                             {kpiTarget && (
//                                 <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
//                                     Target {kpiType.toUpperCase()}: {kpiType === "cpa" ? `$${kpiTarget}` : `${kpiTarget}\u00d7`}
//                                     {kpiType === "cpa" && conversionEvent ? ` \u00b7 ${conversionEvent}` : ""}
//                                 </span>
//                             )}
//                         </p>
//                     </div>
//                     <div className="flex items-center gap-2">
//                         {report && (
//                             <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl text-xs gap-1.5">
//                                 <Printer className="w-3.5 h-3.5" />
//                                 Print
//                             </Button>
//                         )}
//                         {report && !isGenerating && (
//                             <Button variant="outline" size="sm" onClick={generateReport} className="rounded-xl text-xs gap-1.5">
//                                 <FileBarChart2 className="w-3.5 h-3.5" />
//                                 Re-run
//                             </Button>
//                         )}
//                     </div>
//                 </div>

//                 {/* Scrollable content */}
//                 <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">
//                     {/* Loading state */}
//                     {isGenerating && (
//                         <div className="flex flex-col items-center justify-center py-20 text-sm text-gray-500">
//                             <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
//                             Fetching account data from Meta. This usually takes a few seconds.
//                         </div>
//                     )}

//                     {/* Error */}
//                     {error && !isGenerating && (
//                         <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
//                             {error}
//                             <button onClick={generateReport} className="ml-3 underline text-red-600 hover:text-red-800">
//                                 Retry
//                             </button>
//                         </div>
//                     )}

//                     {/* Report sections */}
//                     {report && !isGenerating && (
//                         <>
//                             <TrafficSection traffic={report.traffic} />
//                             <FunnelSection funnel={report.funnel} />
//                             <MonthlySpendSection monthlySpend={report.monthlySpend} kpiType={report.kpiType || kpiType} />
//                             <AudienceSection audience={report.audience} />
//                             <LearningSection learning={report.learning} />
//                             {report.copyUtilization && <CopyUtilizationSection copyUtilization={report.copyUtilization} />}
//                             <OpportunitiesSection text={opportunitiesText} isLoading={isLoadingOpps} error={oppsError} onChange={setOpportunitiesText} />
//                         </>
//                     )}
//                 </div>
//             </DialogContent>
//         </Dialog>
//     )
// }
























// "use client"

// import { useState, useEffect, useCallback, useMemo } from "react"
// import { Loader2, BarChart3 } from "lucide-react"
// import {
//     Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay,
// } from "@/components/ui/dialog"
// import {
//     ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
//     ResponsiveContainer,
// } from "recharts"
// import { cn } from "@/lib/utils"

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

// /**
//  * AggregateKPIDialog
//  *
//  * Shows a grid of mini KPI charts — one per linked ad account.
//  * Each card shows the account name, a CPA/ROAS badge, and a mini
//  * composed chart (bars for spend, line for the KPI metric).
//  * Accounts with no data are filtered out.
//  *
//  * Props:
//  *  - open: boolean
//  *  - onOpenChange: (open) => void
//  *  - adAccounts: [{ id, name }]
//  */
// export default function AggregateKPIDialog({ open, onOpenChange, adAccounts }) {
//     const [days, setDays] = useState(14)
//     const [loading, setLoading] = useState(false)
//     // { [accountId]: { insights: [], primaryActionType, mode } }
//     const [accountData, setAccountData] = useState({})
//     const [fetchedKey, setFetchedKey] = useState(null)

//     // Fetch ad account settings + daily insights for all accounts
//     const fetchAll = useCallback(async () => {
//         if (!adAccounts?.length) return
//         const key = `${adAccounts.map(a => a.id).join(',')}-${days}`
//         if (key === fetchedKey) return

//         setLoading(true)
//         try {
//             const results = await Promise.all(
//                 adAccounts.map(async (acct) => {
//                     try {
//                         // Fetch account info (for mode) and daily insights in parallel
//                         const [infoRes, insightsRes] = await Promise.all([
//                             fetch(
//                                 `${API_BASE_URL}/api/analytics/account-info?adAccountId=${acct.id}`,
//                                 { credentials: 'include' }
//                             ),
//                             fetch(
//                                 `${API_BASE_URL}/api/analytics/daily-insights?adAccountId=${acct.id}&days=${days}`,
//                                 { credentials: 'include' }
//                             ),
//                         ])

//                         const info = await infoRes.json()
//                         const insights = await insightsRes.json()

//                         // Also try to get saved mode from ad account settings
//                         let savedMode = null
//                         try {
//                             const settingsRes = await fetch(
//                                 `${API_BASE_URL}/settings/ad-account?adAccountId=${acct.id}`,
//                                 { credentials: 'include' }
//                             )
//                             const settingsData = await settingsRes.json()
//                             savedMode = settingsData?.settings?.analyticsMode || null
//                         } catch (e) { /* silent */ }

//                         // Determine mode: saved > suggested > fallback to cpa
//                         let mode = 'cpa'
//                         if (savedMode === 'roas') mode = 'roas'
//                         else if (savedMode === 'cpa') mode = 'cpa'
//                         else if (info.suggestedMode === 'roas') mode = 'roas'

//                         return {
//                             id: acct.id,
//                             name: acct.name || acct.id,
//                             mode,
//                             insights: insights.dailyInsights || [],
//                             primaryActionType: insights.primaryActionType,
//                         }
//                     } catch (err) {
//                         console.error(`Failed for ${acct.id}:`, err)
//                         return { id: acct.id, name: acct.name || acct.id, mode: 'cpa', insights: [] }
//                     }
//                 })
//             )

//             const map = {}
//             for (const r of results) map[r.id] = r
//             setAccountData(map)
//             setFetchedKey(key)
//         } catch (err) {
//             console.error('Aggregate fetch error:', err)
//         } finally {
//             setLoading(false)
//         }
//     }, [adAccounts, days, fetchedKey])

//     useEffect(() => {
//         if (open) fetchAll()
//     }, [open, days, fetchAll])

//     useEffect(() => {
//         if (!open) { setFetchedKey(null); setAccountData({}) }
//     }, [open])

//     // Count hidden accounts (no data)
//     const hiddenCount = useMemo(() => {
//         if (loading) return 0
//         return (adAccounts || []).filter(acct => {
//             const data = accountData[acct.id]
//             return data && (!data.insights || data.insights.length === 0)
//         }).length
//     }, [loading, adAccounts, accountData])

//     return (
//         <Dialog open={open} onOpenChange={onOpenChange}>
//             <DialogOverlay className="bg-black/50" />
//             <DialogContent className="sm:max-w-[960px] !rounded-[30px] p-8 space-y-5 max-h-[95vh] overflow-y-auto">
//                 <DialogHeader className="space-y-1">
//                     <div className="flex items-center gap-4">
//                         <DialogTitle className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
//                             Account Overview — Last {days} Days
//                         </DialogTitle>
//                         <div className="flex p-0.5 bg-gray-100 rounded-lg border border-gray-200/60">
//                             <button
//                                 onClick={() => setDays(14)}
//                                 className={cn(
//                                     "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
//                                     days === 14 ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
//                                 )}
//                             >
//                                 14d
//                             </button>
//                             <button
//                                 onClick={() => setDays(30)}
//                                 className={cn(
//                                     "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
//                                     days === 30 ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
//                                 )}
//                             >
//                                 30d
//                             </button>
//                         </div>
//                     </div>
//                 </DialogHeader>

//                 {loading ? (
//                     <div className="flex items-center justify-center h-[300px]">
//                         <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
//                     </div>
//                 ) : (
//                     <>
//                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
//                             {(adAccounts || []).filter((acct) => {
//                                 // While loading show all; once loaded, filter out accounts with no data
//                                 const data = accountData[acct.id]
//                                 return !data || (data.insights && data.insights.length > 0)
//                             }).map((acct) => {
//                                 const data = accountData[acct.id]
//                                 if (!data) return (
//                                     <MiniChartCard
//                                         key={acct.id}
//                                         name={acct.name || acct.id}
//                                         mode="cpa"
//                                         chartData={[]}
//                                         loading={true}
//                                     />
//                                 )
//                                 return (
//                                     <MiniChartCard
//                                         key={acct.id}
//                                         name={data.name}
//                                         mode={data.mode}
//                                         insights={data.insights}
//                                         loading={false}
//                                     />
//                                 )
//                             })}
//                         </div>
//                         {hiddenCount > 0 && (
//                             <p className="text-xs text-gray-400 text-center mt-2">
//                                 {hiddenCount} account{hiddenCount > 1 ? 's' : ''} hidden (no data in this period)
//                             </p>
//                         )}
//                     </>
//                 )}
//             </DialogContent>
//         </Dialog>
//     )
// }


// /**
//  * MiniChartCard — a single account's mini KPI chart
//  */
// function MiniChartCard({ name, mode, insights = [], loading: isLoading }) {
//     const { chartData, avgMetric, maxSpend } = useMemo(() => {
//         if (!insights?.length) return { chartData: [], avgMetric: 0, maxSpend: 0 }

//         const metricKey = mode === 'roas' ? 'roas' : 'cpa'

//         // Aggregate all campaigns per day
//         const dateMap = new Map()
//         for (const row of insights) {
//             if (!dateMap.has(row.date)) {
//                 dateMap.set(row.date, { totalSpend: 0, weightedMetric: 0, count: 0 })
//             }
//             const d = dateMap.get(row.date)
//             const val = row[metricKey]
//             const spend = row.spend || 0
//             d.totalSpend += spend
//             if (val !== null && val !== undefined) {
//                 d.weightedMetric += val * Math.max(spend, 1)
//                 d.count++
//             }
//         }

//         let metricSum = 0, metricCount = 0, maxSpend = 0
//         const chartData = [...dateMap.entries()]
//             .sort(([a], [b]) => a.localeCompare(b))
//             .map(([date, d]) => {
//                 const dt = new Date(date + 'T00:00:00')
//                 const metric = d.count > 0
//                     ? (d.totalSpend > 0 ? d.weightedMetric / d.totalSpend : d.weightedMetric / d.count)
//                     : null
//                 if (metric !== null) { metricSum += metric; metricCount++ }
//                 if (d.totalSpend > maxSpend) maxSpend = d.totalSpend
//                 return {
//                     label: `${dt.getMonth() + 1}/${dt.getDate()}`,
//                     spend: d.totalSpend,
//                     metric,
//                 }
//             })

//         return { chartData, avgMetric: metricCount > 0 ? metricSum / metricCount : 0, maxSpend }
//     }, [insights, mode])

//     const isRoas = mode === 'roas'
//     const formatMetric = isRoas
//         ? (v) => v !== null && v !== undefined ? `${v.toFixed(2)}x` : ''
//         : (v) => v !== null && v !== undefined ? `$${v.toFixed(0)}` : ''

//     return (
//         <div className="border border-gray-200 rounded-2xl p-4 bg-white">
//             {/* Header */}
//             <div className="flex items-start justify-between mb-1.5">
//                 <p className="text-xs font-medium text-gray-900 truncate max-w-[140px] leading-tight">
//                     {name}
//                 </p>
//                 <span className={cn(
//                     "px-2 py-0.5 rounded-md text-[10px] font-semibold flex-shrink-0 ml-2",
//                     isRoas
//                         ? "bg-blue-50 text-blue-600"
//                         : "bg-green-50 text-green-600"
//                 )}>
//                     {isRoas ? 'ROAS' : 'CPA'}
//                 </span>
//             </div>

//             {/* Chart */}
//             {isLoading ? (
//                 <div className="flex items-center justify-center h-[140px]">
//                     <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
//                 </div>
//             ) : chartData.length === 0 ? (
//                 <div className="flex items-center justify-center h-[140px] text-[10px] text-gray-300">
//                     No data
//                 </div>
//             ) : (
//                 <ResponsiveContainer width="100%" height={140}>
//                     <ComposedChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
//                         <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
//                         <XAxis
//                             dataKey="label"
//                             tick={{ fontSize: 8, fill: '#bbb' }}
//                             tickLine={false}
//                             axisLine={false}
//                             interval="preserveStartEnd"
//                         />
//                         <YAxis
//                             yAxisId="metric"
//                             orientation="left"
//                             tick={{ fontSize: 8, fill: '#bbb' }}
//                             tickLine={false}
//                             axisLine={false}
//                             tickFormatter={(v) => isRoas ? `${v.toFixed(1)}x` : `$${Math.round(v)}`}
//                             width={32}
//                         />
//                         <YAxis
//                             yAxisId="spend"
//                             orientation="right"
//                             tick={{ fontSize: 8, fill: '#bbb' }}
//                             tickLine={false}
//                             axisLine={false}
//                             tickFormatter={(v) => `$${Math.round(v)}`}
//                             width={32}
//                         />
//                         <Tooltip
//                             contentStyle={{
//                                 borderRadius: '8px', border: '1px solid #e5e7eb',
//                                 fontSize: '10px', padding: '4px 8px',
//                             }}
//                             formatter={(value, name) => {
//                                 if (name === 'metric') return [formatMetric(value), isRoas ? 'ROAS' : 'CPA']
//                                 return [`$${value?.toFixed(0)}`, 'Spend']
//                             }}
//                         />
//                         <Bar
//                             yAxisId="spend"
//                             dataKey="spend"
//                             fill="#e0e7ff"
//                             radius={[2, 2, 0, 0]}
//                             barSize={6}
//                         />
//                         <Line
//                             yAxisId="metric"
//                             type="monotone"
//                             dataKey="metric"
//                             stroke={isRoas ? "#3b82f6" : "#22c55e"}
//                             strokeWidth={1.5}
//                             dot={false}
//                             connectNulls
//                         />
//                     </ComposedChart>
//                 </ResponsiveContainer>
//             )}
//         </div>
//     )
// }



"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, FileBarChart2 } from "lucide-react"
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

// ---- Shared chart styling (matches KPIChart / dashboard) ----
const GRID_STROKE = "#f0f0f0"
const AXIS_TICK = { fontSize: 10, fill: '#9ca3af' }
const AXIS_LINE = { stroke: '#e5e7eb' }
const TOOLTIP_STYLE = {
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    fontSize: '12px',
}

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
        <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-1">
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
        <div className="bg-white rounded-xl border border-gray-200 px-3 py-2 text-xs min-w-[140px]"
            style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
        >
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
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <SectionHeader num={1} title="Traffic Overview" sub="Trailing 30 days · Cost Per Link Click, Link CTR, and CPM" />
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
                                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                                    <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={dateLabel} interval="preserveStartEnd" axisLine={AXIS_LINE} tickLine={false} />
                                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={yFmt} width={36} />
                                    <Tooltip
                                        contentStyle={TOOLTIP_STYLE}
                                        formatter={(v) => [tooltipFmt(v), label.split(" (")[0]]}
                                        labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                                    />
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
        week: `${w.weekStart.slice(5).replace("-", "/")}–${w.weekEnd.slice(5).replace("-", "/")}`,
        Frequency: w.frequency,
        "FTIR %": w.ftir !== null ? w.ftir * 100 : null,
    }))
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <SectionHeader num={2} title="Funnel Health" sub="Trailing 3 months · weekly averages · Frequency and First-Time Impression Rate" />
            <div className="grid grid-cols-2 gap-4 mb-6">
                <MetricCard label="Avg Weekly Frequency" value={fmtNum(funnel.avgFrequency)} sub="impressions per unique user" color={FREQ_COLOR} />
                <MetricCard label="Avg First-Time Impression Rate" value={fmtPct(funnel.avgFtir)} sub="reach ÷ impressions · higher is healthier" color={FTIR_COLOR} />
            </div>
            <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis dataKey="week" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
                        <YAxis yAxisId="freq" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(1)} width={36} />
                        <YAxis yAxisId="ftir" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} width={44} />
                        <Tooltip content={<ChartTooltipContent formatters={{ Frequency: (v) => v.toFixed(2), "FTIR %": (v) => `${v.toFixed(1)}%` }} />} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
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
    const kpiFmt = (v) => kpiType === "roas" ? `${v.toFixed(2)}×` : `$${v.toFixed(0)}`
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <SectionHeader num={3} title="Monthly Ad Spend" sub={`Last 6 months · total account spend and blended ${kpiLabel} by calendar month`} />
            <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlySpend} margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={{ ...AXIS_TICK, fontSize: 11 }} axisLine={AXIS_LINE} tickLine={false} />
                        <YAxis yAxisId="spend" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} width={48} />
                        <YAxis yAxisId="kpi" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={kpiFmt} width={44} />
                        <Tooltip content={<ChartTooltipContent formatters={{ Spend: (v) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, [kpiLabel]: kpiFmt }} />} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
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
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <SectionHeader num={4} title="Audience Strategy" sub="Adsets with delivery in last 30 days (including paused) · prospecting vs retargeting classification" />

            <div className="grid grid-cols-3 gap-4 mb-6">
                <MetricCard label="Prospecting Spend (30d)" value={fmt$(audience.prospectingSpend)} sub={`${spendPct(audience.prospectingSpend)} of total`} color={PROSPECTING_COLOR} />
                <MetricCard label="Retargeting Spend (30d)" value={fmt$(audience.retargetingSpend)} sub={`${spendPct(audience.retargetingSpend)} of total`} color={RETARGETING_COLOR} />
                <MetricCard label="Total Account Spend (30d)" value={fmt$(audience.totalSpend30d)} />
            </div>

            <div style={{ height: 80 }} className="mb-6">
                <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart layout="vertical" data={splitData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                        <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} axisLine={AXIS_LINE} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fontSize: 11 }} width={80} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={TOOLTIP_STYLE}
                            formatter={(v) => [`$${(v || 0).toLocaleString()}`, ""]}
                            cursor={{ fill: "#f9fafb" }}
                        />
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
                                {exc.name} <span className="text-gray-400">×{exc.count}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="mb-3 flex items-center gap-2">
                {["all", "prospecting", "retargeting"].map((t) => (
                    <button key={t} onClick={() => setFilter(t)}
                        className={cn("px-3 py-1 text-xs rounded-xl font-medium transition-colors",
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

            <div className="overflow-x-auto rounded-xl border border-gray-200">
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
                                        ? adset.exclusions.slice(0, 2).join(", ") + (adset.exclusions.length > 2 ? "…" : "")
                                        : <span className="text-gray-300">—</span>}
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
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <SectionHeader num={5} title="% of Budget in Learning Phase" sub="Last 7 days · ad sets in Learning or Learning Limited (including paused)" />
            <div className="flex items-start gap-6">
                <div className={cn("flex-shrink-0 border rounded-2xl px-8 py-6 text-center", cfg.bg, cfg.border)}>
                    <p className="text-5xl font-bold" style={{ color: cfg.numColor }}>{pctDisplay}</p>
                    <p className={cn("text-sm font-medium mt-1", cfg.text)}>{cfg.label}</p>
                </div>
                <div className="flex-1 space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                        <MetricCard label="Learning Spend (7d)" value={fmt$(learning.learningSpend)} sub="spend from Learning / Learning Limited ad sets" />
                        <MetricCard label="Total Spend (7d)" value={fmt$(learning.totalSpend)} sub="all ad sets" />
                    </div>
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 space-y-1">
                        <p><span className="font-medium text-green-700">{"< 20%"}</span> — Healthy. Most budget is running in stable, optimized ad sets.</p>
                        <p><span className="font-medium text-amber-700">20–50%</span> — Monitor. A significant portion of budget is in learning; avoid additional structural changes.</p>
                        <p><span className="font-medium text-red-700">{"> 50%"}</span> — Action needed. Consolidate ad sets or pause new launches until learning completes.</p>
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
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <SectionHeader num={6} title="Copy Utilization" sub="Top 10 ads by 30-day spend · primary text and headline field usage" />
            <div className="flex items-start gap-6 mb-5">
                <div className={cn("flex-shrink-0 border rounded-2xl px-6 py-4 text-center",
                    isGood ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
                )}>
                    <p className={cn("text-4xl font-bold", isGood ? "text-green-700" : "text-amber-700")}>
                        {copyUtilization.maximizingCount}/{copyUtilization.totalCount}
                    </p>
                    <p className={cn("text-xs font-medium mt-1", isGood ? "text-green-600" : "text-amber-600")}>maximizing</p>
                </div>
                <div className="flex-1 pt-1">
                    <p className={cn("text-sm font-semibold mb-2", isGood ? "text-green-700" : "text-amber-700")}>
                        {isGood ? "✓ " : "⚠ "}{copyUtilization.statusText}
                    </p>
                    <p className="text-xs text-gray-500">
                        Ads using all 5 primary text variants and 5 headline variants allow Meta's algorithm to test more combinations, improving delivery efficiency and reducing cost over time.
                    </p>
                </div>
            </div>
        </div>
    )
}

// ---- Section 7: Opportunities ----
function OpportunitiesSection({ text, isLoading, error, onChange }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <SectionHeader num={7} title="Areas of Opportunity" sub="AI-generated analysis based on account performance data · editable" />
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-7 h-7 animate-spin text-indigo-500 mb-3" />
                    <p className="text-sm font-medium text-gray-600">
                        Generating suggestions…
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Analyzing your account data with AI
                    </p>
                </div>
            )}
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl mb-3">{error}</p>}
            {!isLoading && (
                <textarea
                    value={text}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full min-h-[350px] text-sm text-gray-700 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y leading-relaxed"
                    placeholder="Areas of Opportunity will appear here automatically after the report loads…"
                />
            )}
        </div>
    )
}


// ============================================
// Main Export
// ============================================
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

    const kpiTarget = kpiType === "cpa" ? targetCPA : targetROAS

    useEffect(() => {
        if (open && adAccountId && !report && !isGenerating) generateReport()
        if (!open) { setReport(null); setError(null); setOpportunitiesText(""); setOppsError(null) }
    }, [open, adAccountId])

    const generateReport = async () => {
        setIsGenerating(true); setError(null); setReport(null); setOpportunitiesText("")
        const params = new URLSearchParams({ adAccountId, kpiType })
        if (kpiType === "cpa" && conversionEvent) params.set("conversionEvent", conversionEvent)
        try {
            const res = await fetch(`${API_BASE_URL}/api/analytics/audit/report?${params}`, { credentials: "include" })
            if (!res.ok) { const err = await res.json(); setError(err.error || "Failed to generate report"); return }
            const data = await res.json(); setReport(data); fetchOpportunities(data)
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

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => onOpenChange(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-[960px] max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                    {/* Sticky header */}
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                        <div className="flex-1 min-w-0 mr-4">
                            <h2 className="text-lg font-bold text-gray-900 truncate">{adAccountName || "Ad Account Audit"}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Ad Account Audit · {reportDate}
                                {kpiTarget && (
                                    <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                                        Target {kpiType.toUpperCase()}: {kpiType === "cpa" ? `$${kpiTarget}` : `${kpiTarget}×`}
                                        {kpiType === "cpa" && conversionEvent ? ` · ${conversionEvent}` : ""}
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            {report && !isGenerating && (
                                <Button variant="outline" size="sm" onClick={generateReport} className="rounded-2xl text-xs gap-1.5">
                                    <FileBarChart2 className="w-3.5 h-3.5" />
                                    Re-run Audit
                                </Button>
                            )}
                            <button onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-100 rounded-xl">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">
                        {isGenerating && (
                            <div className="flex flex-col items-center justify-center py-20 text-sm text-gray-500">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                                Fetching account data from Meta… this usually takes 5–15 seconds.
                            </div>
                        )}
                        {error && !isGenerating && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                                {error}
                                <button onClick={generateReport} className="ml-3 underline text-red-600 hover:text-red-800">Retry</button>
                            </div>
                        )}
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
                </div>
            </div>
        </>
    )
}