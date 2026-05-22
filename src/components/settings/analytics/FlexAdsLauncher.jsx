"use client"

/* eslint-disable react/prop-types */

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { ExternalLink, Image as ImageIcon, Video, Zap, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

// Minimum candidates that must be selected before the launch button activates.
// Below 2 there's no point bundling anything — the home flex flow accepts
// single assets but the analytics use-case is explicitly about combining
// multiple winners.
const MIN_SELECTION = 2

// ── Formatting helpers ──────────────────────────────────────────────────────

function formatSpend(v) {
    if (v == null) return "—"
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(0)}`
}

function formatKpi(kpi, mode) {
    if (kpi == null) return "—"
    return mode === "roas" ? `${kpi.toFixed(2)}x` : `$${kpi.toFixed(2)}`
}

function formatDate(iso) {
    if (!iso) return "—"
    try {
        return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    } catch {
        return "—"
    }
}

function buildAdManagerUrl(adId) {
    if (!adId) return null
    return `https://www.facebook.com/adsmanager/manage/ads?selected_ad_ids=${adId}`
}

// ── Small UI subcomponents ──────────────────────────────────────────────────

function MediaTypeBadge({ type }) {
    if (type === "video") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                <Video className="h-3 w-3" />
                Video
            </span>
        )
    }
    if (type === "image") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                <ImageIcon className="h-3 w-3" />
                Image
            </span>
        )
    }
    return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            —
        </span>
    )
}

function TruncatedWithTooltip({ text, max, className }) {
    if (!text) return null
    if (text.length <= max) return <span className={className}>{text}</span>
    return (
        <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
                <span className={cn(className, "cursor-default")}>{text.slice(0, max)}…</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs break-words">
                {text}
            </TooltipContent>
        </Tooltip>
    )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function FlexAdsLauncher({ adAccountId, conversionEvent, mode = "cpr", refreshKey, className }) {
    const navigate = useNavigate()
    const [data, setData] = useState(null)            // { candidates: [...] }
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [selectedAdIds, setSelectedAdIds] = useState(() => new Set())

    // Fetch candidates whenever account / conversion event / mode / refresh changes.
    useEffect(() => {
        if (!adAccountId) { setData(null); setSelectedAdIds(new Set()); return }
        let cancelled = false
        setLoading(true)
        setError(null)
        setSelectedAdIds(new Set())

        const params = new URLSearchParams({ adAccountId, mode })
        if (conversionEvent) params.set("conversionEvent", conversionEvent)
        if (refreshKey) params.set("rk", String(refreshKey))

        fetch(`${API_BASE_URL}/api/analytics/flex-ads/candidates?${params}`, {
            credentials: "include",
            cache: "no-store",
        })
            .then(r => r.json().then(body => ({ ok: r.ok, body })))
            .then(({ ok, body }) => {
                if (cancelled) return
                if (!ok) throw new Error(body.error || "Failed to load")
                setData(body)
            })
            .catch(err => { if (!cancelled) setError(err.message || "Error loading data") })
            .finally(() => { if (!cancelled) setLoading(false) })

        return () => { cancelled = true }
    }, [adAccountId, conversionEvent, mode, refreshKey])

    const candidates = useMemo(() => data?.candidates ?? [], [data])

    const allSelected = candidates.length > 0 && selectedAdIds.size === candidates.length
    const toggleAll = () => {
        setSelectedAdIds(allSelected ? new Set() : new Set(candidates.map(c => c.adId)))
    }
    const toggleOne = (id) => {
        setSelectedAdIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })
    }

    const canLaunch = selectedAdIds.size >= MIN_SELECTION

    // Build the importedFiles payload that the home page already knows how to
    // consume (shape per file: { type:'image', hash, name } or
    // { type:'video', id, name, thumbnailUrl? }). Dedupe by hash/video_id so
    // two source ads sharing the same asset don't appear twice in the launcher.
    function handleLaunch() {
        if (!canLaunch) return
        const selected = candidates.filter(c => selectedAdIds.has(c.adId))

        const seen = new Set()
        const importedFiles = []
        for (const c of selected) {
            const a = c.asset
            if (!a) continue
            const key = a.type === "image" ? `i:${a.hash}` : `v:${a.id}`
            if (seen.has(key)) continue
            seen.add(key)
            importedFiles.push(a)
        }

        if (importedFiles.length === 0) return

        // Mirror the scaleWinners handoff in RecommendationCards: navigate to
        // home with state — Home.jsx consumes and clears it on mount.
        navigate("/", {
            state: { importedFiles, adAccountId },
        })
    }

    const selectionLabel =
        selectedAdIds.size === 0
            ? `Select at least ${MIN_SELECTION} ads to launch a flex ad`
            : selectedAdIds.size < MIN_SELECTION
                ? `Select ${MIN_SELECTION - selectedAdIds.size} more ad${MIN_SELECTION - selectedAdIds.size === 1 ? "" : "s"}`
                : `${selectedAdIds.size} of ${candidates.length} selected`

    return (
        <TooltipProvider delayDuration={150}>
            <Card className={cn("rounded-3xl border-gray-200", className)}>
                <CardContent className="p-6">
                    <div className="mb-4 px-1">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                            <Zap className="h-5 w-5 text-amber-500" />
                            Flex Ads — Winner Bundle
                            {candidates.length > 0 && (
                                <span className="text-base font-normal text-gray-400">({candidates.length})</span>
                            )}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Top {candidates.length || 30} highest-spending ads from the last 13 days (created within last 14 days,
                            excluding existing flex ads and carousels). Pick winners, then continue in the launcher to set campaign,
                            copy, and link.
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex h-[200px] items-center justify-center">
                            <Helix size="36" speed="2.5" color="#3b82f6" />
                        </div>
                    ) : error ? (
                        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                    ) : candidates.length === 0 ? (
                        <div className="flex h-[160px] items-center justify-center text-sm text-gray-400">
                            No candidate ads found in the last 14 days
                        </div>
                    ) : (
                        <div className="overflow-y-auto rounded-2xl border border-gray-100" style={{ maxHeight: "55vh" }}>
                            <table className="min-w-full">
                                <thead className="sticky top-0 z-10 bg-gray-50">
                                    <tr className="border-b border-gray-100">
                                        <th className="w-10 px-3 py-2.5 text-center">
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={toggleAll}
                                                aria-label="Select all"
                                            />
                                        </th>
                                        <th className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                            Ad
                                        </th>
                                        <th className="px-3 py-2.5 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                            Type
                                        </th>
                                        <th className="px-3 py-2.5 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                            Spend
                                        </th>
                                        <th className="px-3 py-2.5 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                            {mode === "roas" ? "ROAS" : "CPA"}
                                        </th>
                                        <th className="px-3 py-2.5 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                            Conv.
                                        </th>
                                        <th className="px-3 py-2.5 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                            Created
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 bg-white">
                                    {candidates.map((c) => {
                                        const checked = selectedAdIds.has(c.adId)
                                        const adUrl = buildAdManagerUrl(c.adId)
                                        return (
                                            <tr
                                                key={c.adId}
                                                className={cn("transition-colors", checked ? "bg-blue-50/40" : "hover:bg-gray-50")}
                                            >
                                                <td className="px-3 py-2.5 text-center align-middle">
                                                    <Checkbox
                                                        checked={checked}
                                                        onCheckedChange={() => toggleOne(c.adId)}
                                                        aria-label={`Select ${c.adName}`}
                                                    />
                                                </td>
                                                <td className="px-3 py-2.5 align-middle">
                                                    <div className="flex items-center gap-1.5">
                                                        <TruncatedWithTooltip
                                                            text={c.adName}
                                                            max={42}
                                                            className="text-sm font-medium leading-tight text-gray-800"
                                                        />
                                                        {adUrl && (
                                                            <a
                                                                href={adUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex-shrink-0 text-gray-400 transition-colors hover:text-blue-600"
                                                                title="Open in Ads Manager"
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div className="mt-0.5 max-w-[260px]">
                                                        <TruncatedWithTooltip
                                                            text={c.campaignName}
                                                            max={36}
                                                            className="text-xs leading-tight text-gray-400"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle">
                                                    <MediaTypeBadge type={c.mediaType} />
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-sm font-medium text-gray-800">
                                                    {formatSpend(c.spend)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-sm font-medium text-gray-800">
                                                    {formatKpi(c.kpi, mode)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-sm text-gray-600">
                                                    {c.conversions ?? 0}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-xs text-gray-500">
                                                    {formatDate(c.createdTime)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Permanent launch button. Always rendered (even on empty/error states)
                        so the affordance is visible; disabled until MIN_SELECTION ads picked. */}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs text-gray-500">{selectionLabel}</span>
                        <Button
                            onClick={handleLaunch}
                            disabled={!canLaunch}
                            className="h-10 gap-2 rounded-xl bg-blue-600 px-5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Zap className="h-4 w-4" />
                            Launch Flex Ads
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                    {canLaunch && (
                        <p className="mt-2 text-right text-[11px] text-gray-400">
                            You&apos;ll be taken to the launcher to set the campaign, copy, and link.
                        </p>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
