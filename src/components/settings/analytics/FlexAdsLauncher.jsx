"use client"

/* eslint-disable react/prop-types */

import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { ExternalLink, Image as ImageIcon, Video, BicepsFlexed, ArrowRight, Loader2, Plus } from "lucide-react"
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

// Backend paginates in two tiers to avoid Meta's "please reduce the amount of
// data" error: initial load fetches LIMIT_INITIAL, "Load more" refetches at
// LIMIT_EXPANDED. These must agree with FLEX_CANDIDATE_LIMIT_DEFAULT /
// FLEX_CANDIDATE_LIMIT_MAX on the server.
const LIMIT_INITIAL = 10
const LIMIT_EXPANDED = 30

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
// The url for image ads comes from `asset.url` (creative.image_url chain) and
// for videos from `asset.thumbnail_url` (creative.thumbnail_url chain). Both
// are resolved server-side in getCreativePreviewUrl.
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

// ── Main component ──────────────────────────────────────────────────────────

export default function FlexAdsLauncher({ adAccountId, conversionEvent, mode = "cpr", refreshKey, className }) {
    const navigate = useNavigate()
    // `data` is tagged with the accountId it was fetched for. This lets us
    // detect the brief render between an adAccountId prop change and the
    // useEffect re-running — during that gap, raw state still reflects the
    // OLD account but the prop is the NEW one. By checking
    // `data.accountId !== adAccountId` we can treat the component as
    // loading until the new effect's setData lands, avoiding a one-frame
    // flash of the previous account's table.
    const [data, setData] = useState(null)            // { accountId, candidates, hasMore } | null
    // Initial `loading` is derived from the prop: if the parent passes an
    // adAccountId on first mount, we know a fetch is about to fire — start in
    // loading state so the very first paint shows the Helix instead of
    // flashing the empty-state branch for one frame.
    const [loading, setLoading] = useState(() => !!adAccountId)
    const [loadingMore, setLoadingMore] = useState(false)  // "Load more" refetch in flight
    const [error, setError] = useState(null)
    const [selectedAdIds, setSelectedAdIds] = useState(() => new Set())
    // Track the limit we requested most recently so re-renders (and the Load
    // More button) know whether we're already at the expanded ceiling.
    const [currentLimit, setCurrentLimit] = useState(LIMIT_INITIAL)

    // Derived loading: true if a fetch is explicitly in flight OR our cached
    // data belongs to a different account than the current prop. Use this
    // (not raw `loading`) in the render condition.
    const isLoading = loading || (!!adAccountId && data != null && data.accountId !== adAccountId)

    // Session-scoped response cache, keyed by adAccountId + conversionEvent
    // + mode + refreshKey. Two notes vs. TrendingCreative/CreativeHitRateChart:
    //   1. Cache value also stores `requestedLimit` so re-entering an account
    //      where the user previously clicked Load More restores the expanded
    //      view (and hides the Load More button) without a refetch.
    //   2. The Load More handler writes the expanded payload back to the
    //      same key, replacing the initial 10-result entry with the 30.
    const cacheRef = useRef({})
    const getCacheKey = (acct) =>
        `${acct}::${conversionEvent || "__auto__"}::${mode}::${refreshKey || 0}`

    // Shared fetcher used by both the initial effect and the "Load more"
    // click. Keeps the URL-building / parsing logic in one place.
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

    // Initial fetch (LIMIT_INITIAL=10) whenever account / event / mode / refresh changes.
    //
    // Uses the `cancelled` flag pattern (matches TrendingCreative) — checked
    // in EVERY callback including `.finally`. Subtle but critical: if an
    // AbortController is used and only the fetch is aborted, the stale
    // `.finally(() => setLoading(false))` still fires for the OLD effect and
    // overrides the NEW effect's `setLoading(true)` — producing a flash of
    // the previous account's data between the loading state and the new
    // fetch resolving. The cancelled flag prevents that.
    useEffect(() => {
        if (!adAccountId) {
            setData(null); setLoading(false); setError(null)
            setSelectedAdIds(new Set()); setCurrentLimit(LIMIT_INITIAL)
            return
        }

        // Cache hit — render instantly (no Helix, no fetch). Restore the
        // requestedLimit alongside data so the Load More button correctly
        // hides itself if the user had previously expanded for this account.
        const cacheKey = getCacheKey(adAccountId)
        const cached = cacheRef.current[cacheKey]
        if (cached) {
            setData(cached)
            setCurrentLimit(cached.requestedLimit || LIMIT_INITIAL)
            setLoading(false)
            setError(null)
            // Selection is intentionally NOT restored — the user's previous
            // pick set is associated with one launch session; returning to an
            // account starts a fresh selection. Matches scaleWinners' UX.
            setSelectedAdIds(new Set())
            return
        }

        let cancelled = false
        setLoading(true)
        setError(null)
        // Clear stale data proactively. Without this, a slow refetch lets the
        // previous account's candidates remain visible briefly even with the
        // loading spinner active in some render orders.
        setData(null)
        setSelectedAdIds(new Set())
        setCurrentLimit(LIMIT_INITIAL)

        // Capture the adAccountId we're fetching for so the response is
        // tagged correctly even if the prop changes between request and
        // response. (The cancelled flag would normally catch this, but
        // tagging gives us a single source of truth that survives any race.)
        const requestedAccountId = adAccountId
        fetchCandidates(LIMIT_INITIAL)
            .then(body => {
                if (cancelled) return
                const payload = { ...body, accountId: requestedAccountId, requestedLimit: LIMIT_INITIAL }
                cacheRef.current[cacheKey] = payload
                setData(payload)
            })
            .catch(err => { if (!cancelled) setError(err.message || "Error loading data") })
            .finally(() => { if (!cancelled) setLoading(false) })

        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adAccountId, conversionEvent, mode, refreshKey])

    // "Load more" — refetch with LIMIT_EXPANDED. Preserves current selection
    // since the first 10 results are guaranteed to be a prefix of the 30
    // (both are sorted by spend desc with the same filters).
    const handleLoadMore = () => {
        if (loadingMore || currentLimit >= LIMIT_EXPANDED) return
        setLoadingMore(true)
        setError(null)
        const requestedAccountId = adAccountId
        const cacheKey = getCacheKey(requestedAccountId)
        fetchCandidates(LIMIT_EXPANDED)
            .then(body => {
                // Defensive: ignore the response if the user switched accounts
                // mid-Load-More. Without this, the expanded data would leak
                // into the new account's view tagged with the wrong id.
                if (requestedAccountId !== adAccountId) return
                const payload = { ...body, accountId: requestedAccountId, requestedLimit: LIMIT_EXPANDED }
                // Overwrite the cached initial-10 entry with the expanded 30
                // so re-entering this account skips the fetch AND shows the
                // expanded view directly.
                cacheRef.current[cacheKey] = payload
                setData(payload)
                setCurrentLimit(LIMIT_EXPANDED)
            })
            .catch(err => setError(err.message || "Failed to load more"))
            .finally(() => setLoadingMore(false))
    }

    // Only surface candidates if `data` belongs to the current account. When
    // adAccountId changes, React renders once with the new prop before the
    // useEffect fires — during that gap, returning [] (and showing isLoading
    // = true above) prevents stale rows from flashing through.
    const candidates = useMemo(() => {
        if (!data || data.accountId !== adAccountId) return []
        return data.candidates ?? []
    }, [data, adAccountId])

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

    // When nothing is selected, leave the label empty — the launch button on
    // its own is a sufficient call-to-action. As soon as the user starts
    // picking, show progress toward the minimum and final selection counts.
    const selectionLabel =
        selectedAdIds.size === 0
            ? ""
            : selectedAdIds.size < MIN_SELECTION
                ? `Select ${MIN_SELECTION - selectedAdIds.size} more ad${MIN_SELECTION - selectedAdIds.size === 1 ? "" : "s"}`
                : `${selectedAdIds.size} of ${candidates.length} selected`

    return (
        <TooltipProvider delayDuration={150}>
            <Card className={cn("rounded-3xl border-gray-200", className)}>
                <CardContent className="p-6">
                    <div className="mb-4 px-1">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                            <BicepsFlexed className="h-5 w-5 text-purple-500" />
                            Flex Ads — Winner Bundle
                            {candidates.length > 0 && (
                                <span className="text-base font-normal text-gray-400">({candidates.length})</span>
                            )}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Highest-spending ads from the last 14 days (excluding existing flex ads and carousels).
                        </p>
                    </div>

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

                    {/* "Load more" — only visible when the backend signaled there
                        are additional candidates beyond the initial 10. Refetches
                        with limit=30; the first 10 are guaranteed to be a prefix
                        of the 30 so selection is preserved. */}
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

                    {/* Permanent launch button. Always rendered (even on empty/error states)
                        so the affordance is visible; disabled until MIN_SELECTION ads picked. */}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs text-gray-500">{selectionLabel}</span>
                        <Button
                            onClick={handleLaunch}
                            disabled={!canLaunch}
                            className="h-10 gap-2 rounded-xl bg-blue-600 px-5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
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
