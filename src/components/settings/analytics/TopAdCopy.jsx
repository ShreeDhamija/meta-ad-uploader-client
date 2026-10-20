"use client"

/* eslint-disable react/prop-types */

import { useEffect, useRef, useState } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { Check, ChevronDown, Copy, Type } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

const WINDOWS = [30, 90]

const COPY_TYPES = [
    { key: "primary", label: "Primary text", plural: "primary text" },
    { key: "headline", label: "Headlines", singular: "Headline", plural: "headlines" },
    { key: "description", label: "Descriptions", singular: "Description", plural: "descriptions" },
]

const CONFIDENCE_STYLES = {
    high: "bg-emerald-50 text-emerald-600",
    medium: "bg-amber-50 text-amber-600",
    low: "bg-gray-100 text-gray-500",
}

function formatSpend(v) {
    if (v == null) return "—"
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(0)}`
}

function formatCpa(v) {
    if (v == null) return "—"
    return v >= 100 ? `$${Math.round(v)}` : `$${v.toFixed(2)}`
}

function formatRoas(v) {
    if (v == null) return "—"
    return `${v.toFixed(2)}x`
}

function VsAccountBadge({ pct }) {
    if (pct == null) return <span className="text-sm text-gray-300">—</span>
    const positive = pct >= 0
    return (
        <span
            className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500",
            )}
        >
            {positive ? "+" : ""}{Math.round(pct)}%
        </span>
    )
}

function CopyText({ text }) {
    const [expanded, setExpanded] = useState(false)
    const [copied, setCopied] = useState(false)
    const long = text.length > 180

    const handleCopy = () => {
        navigator.clipboard.writeText(text)
            .then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
            })
            .catch(() => toast.error("Couldn't copy the text"))
    }

    return (
        <div className="flex items-start gap-2">
            <p
                className={cn(
                    "whitespace-pre-line text-sm leading-snug text-gray-800",
                    !expanded && "line-clamp-3",
                    long && "cursor-pointer",
                )}
                onClick={() => long && setExpanded(e => !e)}
            >
                {text}
            </p>
            <button
                type="button"
                onClick={handleCopy}
                className="mt-0.5 flex-shrink-0 text-gray-300 transition-colors hover:text-blue-600"
                title="Copy text"
            >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
        </div>
    )
}

function AdsUsing({ copy }) {
    const label = `${copy.adCount} ${copy.adCount === 1 ? "ad" : "ads"}`
    return (
        <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
                <span className="mt-1 inline-block cursor-default text-xs text-gray-400 underline decoration-dotted underline-offset-2">
                    {label}
                </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm">
                <div className="space-y-1.5">
                    {copy.ads.map(ad => (
                        <div key={ad.adId} className="flex items-center gap-2">
                            {ad.thumbnailUrl ? (
                                <img src={ad.thumbnailUrl} alt="" className="h-7 w-7 flex-shrink-0 rounded object-cover" />
                            ) : (
                                <div className="h-7 w-7 flex-shrink-0 rounded bg-gray-100" />
                            )}
                            <div className="min-w-0">
                                <p className="truncate text-xs font-medium">{ad.adName}</p>
                                <p className="truncate text-[10px] opacity-70">{ad.campaignName} · {formatSpend(ad.spend)}</p>
                            </div>
                        </div>
                    ))}
                    {copy.adCount > copy.ads.length && (
                        <p className="text-[10px] opacity-70">+{copy.adCount - copy.ads.length} more</p>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    )
}

function CopyTable({ copies, isRoasMode, ranked, textLabel }) {
    const th = "px-3 pb-2 text-center text-[10px] font-medium uppercase tracking-wide text-gray-400"
    const td = "whitespace-nowrap px-3 py-3 text-center align-top text-sm font-medium text-gray-800"
    return (
        <table className="min-w-full">
            <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-gray-100">
                    {ranked && <th className="w-8 pb-2" />}
                    <th className="pb-2 pr-4 text-left text-[10px] font-medium uppercase tracking-wide text-gray-400">{textLabel}</th>
                    <th className={th}>Spend</th>
                    <th className={th}>Results</th>
                    <th className={th}>CPA</th>
                    {isRoasMode && <th className={th}>ROAS</th>}
                    <th className={th}>CTR</th>
                    {ranked && <th className={th}>vs Account</th>}
                    {ranked && <th className={th}>Evidence</th>}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {copies.map((copy, i) => (
                    <tr key={copy.key} className="transition-colors hover:bg-gray-50">
                        {ranked && <td className="py-3 pr-1 align-top text-sm font-semibold text-gray-400">{i + 1}</td>}
                        <td className="max-w-[480px] py-3 pr-4 align-top">
                            <CopyText text={copy.text} />
                            <AdsUsing copy={copy} />
                        </td>
                        <td className={td}>{formatSpend(copy.spend)}</td>
                        <td className={td}>{copy.results}</td>
                        <td className={td}>{formatCpa(copy.cpa)}</td>
                        {isRoasMode && <td className={td}>{formatRoas(copy.roas)}</td>}
                        <td className={td}>{copy.ctr != null ? `${copy.ctr.toFixed(2)}%` : "—"}</td>
                        {ranked && <td className={td}><VsAccountBadge pct={copy.vsAccountPct} /></td>}
                        {ranked && (
                            <td className={td}>
                                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize", CONFIDENCE_STYLES[copy.confidence])}>
                                    {copy.confidence}
                                </span>
                            </td>
                        )}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function CoverageNote({ data, view, type }) {
    if (!data.coverage || !view?.coverage) return null
    const c = { ...data.coverage, ...view.coverage }
    const ads = n => `${n} ${n === 1 ? "ad" : "ads"}`
    const notes = []
    if (c.unsplitAds > 0) {
        notes.push(`${ads(c.unsplitAds)} with several ${type.plural} (${formatSpend(c.unsplitSpend)}) had no per-text results from Meta`)
    }
    if (c.noCopyAds > 0) {
        notes.push(`${ads(c.noCopyAds)} (${formatSpend(c.noCopySpend)}) had no readable ${type.key === "primary" ? "primary text" : type.singular.toLowerCase()}`)
    }
    if (c.carouselAds > 0) {
        notes.push(`${ads(c.carouselAds)} (${formatSpend(c.carouselSpend)}) are carousels, whose ${type.plural} are per card and not ranked`)
    }
    if (c.skippedGoalSpend > 0) {
        notes.push(`${formatSpend(c.skippedGoalSpend)} from reach, engagement and traffic ad sets was left out`)
    }
    if (c.hitAdCap) notes.push("only the highest-spend ads were analyzed")
    return (
        <p className="mt-4 px-1 text-xs leading-relaxed text-gray-400">
            Analyzed {formatSpend(c.analyzedSpend)}
            {c.analyzedPct != null && ` of ${formatSpend(c.accountSpend)} spend (${Math.round(c.analyzedPct)}%)`}.
            {" "}Text needs {data.thresholds.minResults}+ results and {data.thresholds.minImpressions.toLocaleString()}+ impressions to be ranked
            {view.insufficientCount > 0 && ` (${view.insufficientCount} not ranked yet)`}.
            {notes.length > 0 && ` ${notes.join("; ")}.`}
        </p>
    )
}

function SegmentedToggle({ options, value, onChange }) {
    return (
        <div className="inline-flex rounded-xl bg-gray-100 p-0.5">
            {options.map(option => (
                <button
                    key={option.key}
                    type="button"
                    onClick={() => onChange(option.key)}
                    className={cn(
                        "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                        value === option.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}

export default function TopAdCopy({ adAccountId, conversionEvent, mode = "cpr", refreshKey, className }) {
    const [days, setDays] = useState(30)
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [showUnconverting, setShowUnconverting] = useState(false)
    const [copyType, setCopyType] = useState("primary")
    const isRoasMode = mode === "roas"
    const type = COPY_TYPES.find(t => t.key === copyType)
    // All three types arrive in one response, so switching never refetches.
    const view = data?.types?.[copyType]

    // Session-scoped response cache, keyed like TrendingCreative (refreshKey
    // included so a manual dashboard refresh skips stale entries).
    const cacheRef = useRef({})

    useEffect(() => {
        if (!adAccountId) { setData(null); return }
        const cacheKey = `${adAccountId}::${mode}::${conversionEvent || "__auto__"}::${days}::${refreshKey || 0}`

        if (cacheRef.current[cacheKey]) {
            setData(cacheRef.current[cacheKey])
            setLoading(false)
            setError(null)
            return
        }

        let cancelled = false
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({ adAccountId, mode, days: String(days) })
        if (conversionEvent) params.set("conversionEvent", conversionEvent)
        if (refreshKey) params.set("rk", String(refreshKey))

        fetch(`${API_BASE_URL}/api/analytics/top-copy?${params}`, {
            credentials: "include",
            cache: "no-store",
        })
            .then(r => r.json().then(body => ({ ok: r.ok, body })))
            .then(({ ok, body }) => {
                if (cancelled) return
                if (!ok) throw new Error(body.error || "Failed to load")
                cacheRef.current[cacheKey] = body
                setData(body)
            })
            .catch(err => { if (!cancelled) setError(err.message || "Error loading data") })
            .finally(() => { if (!cancelled) setLoading(false) })

        return () => { cancelled = true }
    }, [adAccountId, conversionEvent, mode, days, refreshKey])

    const kpiLabel = isRoasMode ? "ROAS" : "CPA"

    return (
        <TooltipProvider delayDuration={150}>
            <Card className={cn("rounded-3xl border-gray-200", className)}>
                <CardContent className="p-6">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
                        <div>
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                <Type className="h-5 w-5 text-blue-500" />
                                Top Ad Copy
                                {view?.rankedCount > 0 && (
                                    <span className="text-base font-normal text-gray-400">({view.rankedCount})</span>
                                )}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Primary text, headlines and descriptions ranked by {kpiLabel} across every ad that ran them, last {days} days.
                                {data?.account && (isRoasMode
                                    ? ` Account ROAS ${formatRoas(data.account.roas)}.`
                                    : ` Account CPA ${formatCpa(data.account.cpa)}.`)}
                            </p>
                        </div>
                        <SegmentedToggle
                            options={WINDOWS.map(w => ({ key: w, label: `${w}d` }))}
                            value={days}
                            onChange={setDays}
                        />
                    </div>

                    <div className="mb-3 px-1">
                        <SegmentedToggle options={COPY_TYPES} value={copyType} onChange={setCopyType} />
                    </div>

                    {loading ? (
                        <div className="flex h-[200px] items-center justify-center">
                            <Helix size="36" speed="2.5" color="#3b82f6" />
                        </div>
                    ) : error ? (
                        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                    ) : data?.needsConversionEvent ? (
                        <div className="flex h-[160px] items-center justify-center text-center text-sm text-gray-400">
                            Choose a conversion event in Analytics settings to rank copy by CPA.
                        </div>
                    ) : !view || view.copies.length === 0 ? (
                        <>
                            <div className="flex h-[160px] items-center justify-center text-center text-sm text-gray-400">
                                No {type.plural} with {data?.thresholds?.minResults ?? 5}+ results in the last {days} days
                            </div>
                            {view && <CoverageNote data={data} view={view} type={type} />}
                        </>
                    ) : (
                        <>
                            <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
                                <CopyTable copies={view.copies} isRoasMode={isRoasMode} ranked textLabel={type.singular || type.label} />
                            </div>
                            <CoverageNote data={data} view={view} type={type} />
                        </>
                    )}

                    {!loading && !error && view?.unconvertingCount > 0 && (
                        <div className="mt-4 border-t border-gray-100 pt-3">
                            <button
                                type="button"
                                onClick={() => setShowUnconverting(s => !s)}
                                className="flex items-center gap-1.5 px-1 text-sm font-medium text-gray-600 hover:text-gray-900"
                            >
                                <ChevronDown className={cn("h-4 w-4 transition-transform", showUnconverting && "rotate-180")} />
                                Spent {formatSpend(data.thresholds.unconvertingSpend)}+ with under {data.thresholds.minResults} results ({view.unconvertingCount})
                            </button>
                            {showUnconverting && (
                                <div className="mt-2 overflow-y-auto" style={{ maxHeight: "40vh" }}>
                                    <CopyTable copies={view.unconverting} isRoasMode={isRoasMode} ranked={false} textLabel={type.singular || type.label} />
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
