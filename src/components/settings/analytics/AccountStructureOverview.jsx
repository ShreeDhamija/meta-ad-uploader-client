"use client"

/* eslint-disable react/prop-types */

import { useEffect, useMemo, useRef, useState } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { ChevronRight, ExternalLink, Network } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useAppData } from "@/lib/AppContext"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

const LEARNING_STATUS = {
    SUCCESS: { label: "Exited learning", className: "bg-green-50 text-green-700 ring-green-200" },
    LEARNING: { label: "Learning", className: "bg-amber-50 text-amber-700 ring-amber-200" },
    LEARNING_LIMITED: { label: "Learning limited", className: "bg-red-50 text-red-700 ring-red-200" },
    FAIL: { label: "Learning limited", className: "bg-red-50 text-red-700 ring-red-200" },
}

// 6 columns shared by the header, campaign rows and ad set rows.
const GRID = "grid grid-cols-[minmax(240px,2.4fr)_minmax(110px,0.9fr)_minmax(90px,0.7fr)_minmax(80px,0.6fr)_minmax(150px,1.2fr)_minmax(120px,0.9fr)] gap-x-4"

function formatSpend(v) {
    if (v == null) return "—"
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 10_000) return `$${(v / 1000).toFixed(1)}k`
    return `$${Math.round(v).toLocaleString()}`
}

function formatBudget(daily, lifetime) {
    if (daily) return `${formatSpend(daily)}/day`
    if (lifetime) return `${formatSpend(lifetime)} lifetime`
    return null
}

function formatObjective(objective) {
    if (!objective) return null
    return objective.replace(/^OUTCOME_/, "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function LearningProgress({ conversions, floor }) {
    const pct = Math.min(100, (conversions / floor) * 100)
    const done = conversions >= floor
    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                    className={cn("h-full rounded-full", done ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-gray-300")}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className={cn("w-12 text-right text-[11px] tabular-nums", done ? "font-semibold text-green-700" : "text-gray-500")}>
                {Math.round(pct)}%
            </span>
        </div>
    )
}

function StatTile({ label, value, sub }) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-[11px] font-medium text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
            {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
        </div>
    )
}

export default function AccountStructureOverview({ adAccountId, conversionEvent, refreshKey, waiting = false, className }) {
    const { adAccounts } = useAppData()
    const businessId = useMemo(
        () => (adAccounts || []).find(account => account.id === adAccountId)?.business_id || "",
        [adAccounts, adAccountId]
    )

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [collapsed, setCollapsed] = useState(() => new Set())

    const cacheRef = useRef({})

    useEffect(() => { setCollapsed(new Set()) }, [adAccountId])

    useEffect(() => {
        if (!adAccountId) { setData(null); return }
        if (waiting) { setData(null); setLoading(true); setError(null); return }
        const cacheKey = `${adAccountId}::${conversionEvent || "__auto__"}::${refreshKey || 0}`
        if (cacheRef.current[cacheKey]) {
            setData(cacheRef.current[cacheKey])
            setLoading(false)
            setError(null)
            return
        }

        let cancelled = false
        setLoading(true)
        setError(null)
        const params = new URLSearchParams({ adAccountId })
        if (conversionEvent) params.set("conversionEvent", conversionEvent)
        if (refreshKey) params.set("rk", String(refreshKey))

        fetch(`${API_BASE_URL}/api/analytics/account-structure?${params}`, { credentials: "include", cache: "no-store" })
            .then(r => r.json().then(body => ({ ok: r.ok, body })))
            .then(({ ok, body }) => {
                if (cancelled) return
                if (!ok) throw new Error(body.error || "Failed to load account structure")
                cacheRef.current[cacheKey] = body
                setData(body)
            })
            .catch(err => { if (!cancelled) setError(err.message || "Error loading data") })
            .finally(() => { if (!cancelled) setLoading(false) })

        return () => { cancelled = true }
    }, [adAccountId, conversionEvent, refreshKey, waiting])

    const campaigns = data?.campaigns || []
    const totals = data?.totals
    const floor = data?.conversionFloor || 50
    const allCollapsed = campaigns.length > 0 && collapsed.size === campaigns.length

    const toggleCampaign = (id) => setCollapsed(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id); else next.add(id)
        return next
    })
    const toggleAll = () => setCollapsed(allCollapsed ? new Set() : new Set(campaigns.map(c => c.id)))

    const adsManagerUrl = (level, id) => {
        const params = [
            String(adAccountId).replace("_", "="),
            ...(businessId ? [`business_id=${businessId}`] : []),
            `selected_${level}_ids=${id}`,
        ]
        return `https://adsmanager.facebook.com/adsmanager/manage/${level === "campaign" ? "campaigns" : "adsets"}?${params.join("&")}`
    }

    return (
        <TooltipProvider delayDuration={150}>
            <Card className={cn("rounded-3xl border-gray-200", className)}>
                <CardContent className="p-6">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
                        <div className="min-w-0">
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                <Network className="h-5 w-5 text-violet-500" />
                                Account Structure
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Active ad sets that delivered in the last 7 days, by campaign. Ad sets with {floor}+ conversions a week on their optimization event are theoretically out of the learning phase.
                            </p>
                        </div>
                        {campaigns.length > 1 && !loading && (
                            <button
                                onClick={toggleAll}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-xs transition-colors hover:bg-gray-50"
                            >
                                {allCollapsed ? "Expand all" : "Collapse all"}
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex h-[280px] items-center justify-center">
                            <Helix size="36" speed="2.5" color="#3b82f6" />
                        </div>
                    ) : error ? (
                        <div className="flex h-[200px] items-center justify-center px-6 text-center text-sm text-red-500">{error}</div>
                    ) : campaigns.length === 0 ? (
                        <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
                            Nothing delivered in the last 7 days
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                                <StatTile label="Active campaigns" value={totals.campaigns} />
                                <StatTile label="Active ad sets" value={totals.adsets} />
                                <StatTile
                                    label="Out of learning (theoretical)"
                                    value={`${totals.adsetsOutOfLearning} / ${totals.adsets}`}
                                    sub={`${floor}+ conversions in 7 days`}
                                />
                                <StatTile
                                    label={`Spend via ${floor}+ conversion ad sets`}
                                    value={totals.healthySpendPct == null ? "—" : `${Math.round(totals.healthySpendPct * 100)}%`}
                                    sub={`${formatSpend(totals.healthySpend7d)} of ${formatSpend(totals.spend7d)} (7d)`}
                                />
                            </div>

                            {/* Both axes scroll: wide on small screens, tall on big accounts. */}
                            <div className="max-h-[520px] overflow-auto rounded-2xl border border-gray-200 custom-scrollbar">
                                <div className="min-w-[900px]">
                                    <div className={cn(GRID, "sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-wide text-gray-500")}>
                                        <span>Campaign / Ad set</span>
                                        <span>Budget</span>
                                        <span className="text-right">Spend (7d)</span>
                                        <span className="text-right">Conv. (7d)</span>
                                        <span>Progress to {floor}</span>
                                        <span>Meta status</span>
                                    </div>

                                    {campaigns.map(c => {
                                        const isCollapsed = collapsed.has(c.id)
                                        const budget = formatBudget(c.dailyBudget, c.lifetimeBudget)
                                        return (
                                            <div key={c.id} className="border-b border-gray-100 last:border-b-0">
                                                {/* Campaign row */}
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => toggleCampaign(c.id)}
                                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCampaign(c.id) } }}
                                                    className={cn(GRID, "cursor-pointer items-center bg-white px-4 py-3 transition-colors hover:bg-gray-50")}
                                                >
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <ChevronRight className={cn("h-4 w-4 flex-shrink-0 text-gray-400 transition-transform", !isCollapsed && "rotate-90")} />
                                                        <div className="min-w-0">
                                                            <div className="flex min-w-0 items-center gap-1.5">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <p className="truncate text-sm font-semibold text-gray-900">{c.name}</p>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top" className="max-w-[360px] break-words text-xs">{c.name}</TooltipContent>
                                                                </Tooltip>
                                                                {c.id !== "unattributed" && (
                                                                    <a
                                                                        href={adsManagerUrl("campaign", c.id)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="flex-shrink-0 text-gray-400 transition-colors hover:text-blue-500"
                                                                        title="Open in Ads Manager"
                                                                    >
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                                                                <span className={cn(
                                                                    "rounded-full px-1.5 py-px text-[10px] font-semibold",
                                                                    c.budgetType === "CBO" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
                                                                )}>
                                                                    {c.budgetType}
                                                                </span>
                                                                {formatObjective(c.objective) && <span>{formatObjective(c.objective)}</span>}
                                                                <span className="text-gray-300">·</span>
                                                                <span>{c.adsets.length} ad set{c.adsets.length === 1 ? "" : "s"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-600">{budget || <span className="text-gray-400">Ad set level</span>}</span>
                                                    <span className="text-right text-sm font-medium tabular-nums text-gray-900">{formatSpend(c.spend7d)}</span>
                                                    <span className="text-right text-sm tabular-nums text-gray-700">{c.conversions7d.toLocaleString()}</span>
                                                    <span className="text-xs text-gray-600">
                                                        <span className={cn("font-semibold", c.adsetsOutOfLearning > 0 ? "text-green-700" : "text-gray-500")}>
                                                            {c.adsetsOutOfLearning} of {c.adsets.length}
                                                        </span>{" "}
                                                        out of learning
                                                    </span>
                                                    <span />
                                                </div>

                                                {/* Ad set rows */}
                                                {!isCollapsed && (
                                                    <div className="bg-gray-50/60">
                                                        {c.adsets.map((a, i) => {
                                                            const status = LEARNING_STATUS[a.learningStatus]
                                                            const isLast = i === c.adsets.length - 1
                                                            return (
                                                                <div key={a.id} className={cn(GRID, "items-center px-4 py-2")}>
                                                                    <div className="flex min-w-0 items-center">
                                                                        {/* Tree connector */}
                                                                        <span className="relative ml-[7px] mr-3 h-8 w-4 flex-shrink-0" aria-hidden>
                                                                            <span className={cn("absolute left-0 top-0 border-l border-gray-300", isLast ? "h-1/2" : "h-full")} />
                                                                            <span className="absolute left-0 top-1/2 w-4 border-t border-gray-300" />
                                                                        </span>
                                                                        <div className="flex min-w-0 items-center gap-1.5">
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <p className={cn("truncate text-[13px]", a.outOfLearning ? "font-medium text-gray-900" : "text-gray-700")}>{a.name}</p>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top" className="max-w-[360px] break-words text-xs">{a.name}</TooltipContent>
                                                                            </Tooltip>
                                                                            <a
                                                                                href={adsManagerUrl("adset", a.id)}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="flex-shrink-0 text-gray-400 transition-colors hover:text-blue-500"
                                                                                title="Open in Ads Manager"
                                                                            >
                                                                                <ExternalLink className="h-3 w-3" />
                                                                            </a>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-xs text-gray-600">
                                                                        {formatBudget(a.dailyBudget, a.lifetimeBudget) || <span className="text-gray-400">—</span>}
                                                                    </span>
                                                                    <span className="text-right text-[13px] tabular-nums text-gray-800">{formatSpend(a.spend7d)}</span>
                                                                    <span className={cn("text-right text-[13px] tabular-nums", a.outOfLearning ? "font-semibold text-green-700" : "text-gray-700")}>
                                                                        {a.conversions7d.toLocaleString()}
                                                                    </span>
                                                                    <LearningProgress conversions={a.conversions7d} floor={floor} />
                                                                    <span>
                                                                        {status ? (
                                                                            <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", status.className)}>
                                                                                {status.label}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[11px] text-gray-400">—</span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            <p className="mt-2.5 px-1 text-[11px] text-gray-400">
                                Progress counts each ad set&apos;s 7-day conversions against the ~{floor} a week Meta needs to exit learning. Meta status is the learning state Meta reports for the ad set today.
                            </p>
                        </>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
