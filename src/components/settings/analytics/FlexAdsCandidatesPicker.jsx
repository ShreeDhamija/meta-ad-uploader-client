"use client"

/* eslint-disable react/prop-types */

// Shared picker used by:
//   - settings/AnalyticsDashboard (via FlexAdsLauncher) — Card chrome + "Launch Flex Ads" navigation
//   - ad-creation-form (via FlexAdsImportModal)        — modal chrome + "Import to Launcher"
//
// Owns: fetch + module-level cache + table + thumbnails + Load More.
// Does NOT own: any header chrome (icon/title/description) or action button —
// the parent renders those around the picker so each context can have its own
// header style and primary action.
//
// Selection is CONTROLLED via `selectedAdIds` + `onSelectionChange` props,
// because the parent's action button needs to read the selection to decide
// when to enable itself.

import { useEffect, useMemo, useState } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { ExternalLink, Image as ImageIcon, Video, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

// Server pagination tiers — must match FLEX_CANDIDATE_LIMIT_DEFAULT /
// FLEX_CANDIDATE_LIMIT_MAX in server/analytics/routes.js.
export const LIMIT_INITIAL = 10
export const LIMIT_EXPANDED = 30

// ── Module-level session cache ──────────────────────────────────────────────
// Shared across ALL FlexAdsCandidatesPicker instances within the session so
// that the analytics dashboard and the form modal don't refetch the same data
// independently. Cleared when the tab closes (it's just a Map on the module).
//
// Key shape: `${accountId}::${conversionEvent || '__auto__'}::${mode}::${refreshKey || 0}`
// Value shape: { accountId, candidates, hasMore, requestedLimit }
const candidatesCache = new Map()
function getCacheKey(adAccountId, conversionEvent, mode, refreshKey) {
    return `${adAccountId}::${conversionEvent || "__auto__"}::${mode}::${refreshKey || 0}`
}

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

// Small fixed-size thumbnail with image-load fallback to a media-type icon.
// `url` for image ads comes from asset.url (creative.image_url chain) and for
// videos from asset.thumbnail_url (creative.thumbnail_url chain). Both are
// resolved server-side in getCreativePreviewUrl.
function Thumbnail({ url, type, name }) {
    const [errored, setErrored] = useState(false)
    if (url && !errored) {
        return (
            <img
                src={url}
                alt={name || ""}
                title={name || ""}
                className="h-10 w-10 flex-shrink-0 rounded-md object-cover"
                onError={() => setErrored(true)}
            />
        )
    }
    const Icon = type === "video" ? Video : ImageIcon
    return (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gray-100">
            <Icon className="h-4 w-4 text-gray-400" />
        </div>
    )
}

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

// ── Public hook: callers use this to read state needed for their action button ──
// Lets the parent surface `candidates`, selection helpers, and `count` for
// labels like "N of M selected" without re-implementing fetch logic.
//
// Most parents won't need this hook — they can just render <FlexAdsCandidatesPicker />
// and pass selectedAdIds in/out. It's exported for advanced cases like reading
// the candidates list to build the importedFiles payload on import.

// ── Main component ──────────────────────────────────────────────────────────

export default function FlexAdsCandidatesPicker({
    adAccountId,
    conversionEvent,
    mode = "cpr",
    refreshKey,
    selectedAdIds,                  // Set<string>
    onSelectionChange,              // (Set<string>) => void
    onCandidatesChange,             // optional: (candidates: Array) => void — fired after fetch / cache hit so parent can read available candidates (needed by Import handler to map id → asset)
    maxHeight = "55vh",             // visible scroll area height
    className,
}) {
    const [data, setData] = useState(null)            // { accountId, candidates, hasMore, requestedLimit } | null
    const [loading, setLoading] = useState(() => !!adAccountId)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState(null)
    const [currentLimit, setCurrentLimit] = useState(LIMIT_INITIAL)

    // Derived loading — true if fetch in flight OR cached data belongs to a
    // different account than the current prop. Prevents the one-frame flash
    // between an adAccountId prop change and the useEffect re-running.
    const isLoading = loading || (!!adAccountId && data != null && data.accountId !== adAccountId)

    const fetchCandidates = (limit) => {
        const params = new URLSearchParams({ adAccountId, mode, limit: String(limit) })
        if (conversionEvent) params.set("conversionEvent", conversionEvent)
        if (refreshKey) params.set("rk", String(refreshKey))
        return fetch(`${API_BASE_URL}/api/analytics/flex-ads/candidates?${params}`, {
            credentials: "include",
            cache: "no-store",
        })
            .then(r => r.json().then(body => ({ ok: r.ok, body })))
            .then(({ ok, body }) => {
                if (!ok) throw new Error(body.error || "Failed to load")
                return body
            })
    }

    // Initial fetch effect — see FlexAdsLauncher git history for the long
    // story on the `cancelled` flag vs AbortController choice (cancelled
    // also guards .finally so a stale callback can't override the new
    // effect's setLoading(true)).
    useEffect(() => {
        if (!adAccountId) {
            setData(null); setLoading(false); setError(null); setCurrentLimit(LIMIT_INITIAL)
            return
        }

        const cacheKey = getCacheKey(adAccountId, conversionEvent, mode, refreshKey)
        const cached = candidatesCache.get(cacheKey)
        if (cached) {
            setData(cached)
            setCurrentLimit(cached.requestedLimit || LIMIT_INITIAL)
            setLoading(false)
            setError(null)
            return
        }

        let cancelled = false
        setLoading(true)
        setError(null)
        setData(null)                                  // clear stale proactively
        setCurrentLimit(LIMIT_INITIAL)

        const requestedAccountId = adAccountId
        fetchCandidates(LIMIT_INITIAL)
            .then(body => {
                if (cancelled) return
                const payload = { ...body, accountId: requestedAccountId, requestedLimit: LIMIT_INITIAL }
                candidatesCache.set(cacheKey, payload)
                setData(payload)
            })
            .catch(err => { if (!cancelled) setError(err.message || "Error loading data") })
            .finally(() => { if (!cancelled) setLoading(false) })

        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adAccountId, conversionEvent, mode, refreshKey])

    // Only surface candidates if `data` belongs to the current account.
    const candidates = useMemo(() => {
        if (!data || data.accountId !== adAccountId) return []
        return data.candidates ?? []
    }, [data, adAccountId])

    // Tell the parent whenever the candidate list changes, so it can build
    // an asset payload from selectedAdIds without poking at internals.
    useEffect(() => {
        if (onCandidatesChange) onCandidatesChange(candidates)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [candidates])

    const handleLoadMore = () => {
        if (loadingMore || currentLimit >= LIMIT_EXPANDED) return
        setLoadingMore(true)
        setError(null)
        const requestedAccountId = adAccountId
        const cacheKey = getCacheKey(adAccountId, conversionEvent, mode, refreshKey)
        fetchCandidates(LIMIT_EXPANDED)
            .then(body => {
                if (requestedAccountId !== adAccountId) return
                const payload = { ...body, accountId: requestedAccountId, requestedLimit: LIMIT_EXPANDED }
                candidatesCache.set(cacheKey, payload)
                setData(payload)
                setCurrentLimit(LIMIT_EXPANDED)
            })
            .catch(err => setError(err.message || "Failed to load more"))
            .finally(() => setLoadingMore(false))
    }

    const allSelected = candidates.length > 0 && selectedAdIds.size === candidates.length
    const toggleAll = () => {
        onSelectionChange(allSelected ? new Set() : new Set(candidates.map(c => c.adId)))
    }
    const toggleOne = (id) => {
        const next = new Set(selectedAdIds)
        if (next.has(id)) next.delete(id); else next.add(id)
        onSelectionChange(next)
    }

    return (
        <TooltipProvider delayDuration={150}>
            <div className={cn("flex flex-col", className)}>
                {isLoading ? (
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
                    <div className="overflow-y-auto rounded-2xl border border-gray-100" style={{ maxHeight }}>
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
                                    {/* Empty header above the thumbnail column — the asset preview
                                        doesn't need a label, and the Ad name column reads cleaner without one. */}
                                    <th className="w-14 px-2 py-2.5" aria-hidden="true" />
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
                                            <td className="px-2 py-2 align-middle">
                                                <Thumbnail
                                                    url={c.asset?.url || c.asset?.thumbnail_url || null}
                                                    type={c.mediaType}
                                                    name={c.adName}
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

                {/* Load more — visible only when backend reported more candidates AND
                    we're showing data for the current account AND we haven't already
                    expanded. */}
                {!isLoading && data?.hasMore && data?.accountId === adAccountId && currentLimit < LIMIT_EXPANDED && (
                    <div className="mt-3 flex justify-center">
                        <Button
                            variant="outline"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="gap-2 rounded-xl text-sm"
                        >
                            {loadingMore ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading more…
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    Load more ({LIMIT_EXPANDED - LIMIT_INITIAL} more)
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </TooltipProvider>
    )
}

// Exported so parents (modal + analytics card) can build their importedFiles
// payload with consistent dedup logic when the user clicks Import/Launch.
//
// Returns an array shaped to match what ad-creation-form expects in
// importedFiles state — see media-preview.jsx ~line 252:
//   - images render via file.url
//   - videos render via file.thumbnail_url (snake_case)
export function buildImportedFilesPayload(candidates, selectedAdIds) {
    const seen = new Set()
    const out = []
    for (const c of candidates) {
        if (!selectedAdIds.has(c.adId)) continue
        const a = c.asset
        if (!a) continue
        const key = a.type === "image" ? `i:${a.hash}` : `v:${a.id}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push(a)
    }
    return out
}
