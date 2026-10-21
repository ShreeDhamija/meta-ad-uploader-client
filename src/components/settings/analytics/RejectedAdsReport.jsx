"use client"

/* eslint-disable react/prop-types */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ShieldAlert, ExternalLink, ImageOff, ChevronDown, Loader, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppData } from "@/lib/AppContext"
import { buildAdsManagerAdUrl } from "./CreativeEnhancementsReport"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

// ── Palette (matches CreativeEnhancementsReport) ─────────────────────────────
const PINK_DEEP = "#C70845"
const PINK_SOFT = "#FCD9E3"
const BLUE = "#2563EB"
const INK = "#0F1115"
const MUTED = "#6B7280"
const LINE = "#E7E9EE"
const PAPER = "#FFFFFF"
const PAPER_2 = "#F8F9FB"
const FONT = "'Inter Tight', system-ui, sans-serif"

const STATUS_STYLES = {
    DISAPPROVED: { label: "Rejected", className: "bg-red-100 text-red-700" },
    WITH_ISSUES: { label: "With issues", className: "bg-amber-100 text-amber-700" },
    PENDING_BILLING_INFO: { label: "Pending billing", className: "bg-gray-100 text-gray-600" },
}

const formatStatus = (status) =>
    status ? status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "—"

function StatusPill({ status }) {
    const style = STATUS_STYLES[status]
    return (
        <span className={cn("text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap", style?.className || "bg-gray-100 text-gray-600")}>
            {style?.label || formatStatus(status)}
        </span>
    )
}

function Reason({ reason }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="min-w-0 cursor-default">
                    {reason.title && (
                        <p className="text-[12px] font-semibold leading-snug" style={{ color: INK, margin: 0 }}>{reason.title}</p>
                    )}
                    {reason.message && (
                        <p className="text-[11.5px] leading-snug line-clamp-2" style={{ color: MUTED, margin: "1px 0 0" }}>{reason.message}</p>
                    )}
                </div>
            </TooltipTrigger>
            {reason.message && (
                <TooltipContent side="top" className="max-w-[420px] break-words text-xs">{reason.message}</TooltipContent>
            )}
        </Tooltip>
    )
}

export default function RejectedAdsReport({ open, onOpenChange, adAccountId, adAccountName }) {
    const { adAccounts } = useAppData()
    const businessId = useMemo(
        () => (adAccounts || []).find(account => account.id === adAccountId)?.business_id || "",
        [adAccounts, adAccountId]
    )

    const [ads, setAds] = useState([])
    const [nextCursor, setNextCursor] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [error, setError] = useState(null)
    const [hasFetched, setHasFetched] = useState(false)
    const backdropPressRef = useRef(false)
    const requestRef = useRef(0)

    const fetchAds = useCallback(async (cursor = null) => {
        if (!adAccountId) return
        const requestId = ++requestRef.current
        if (cursor) setIsLoadingMore(true)
        else { setIsLoading(true); setAds([]); setNextCursor(null) }
        setError(null)
        try {
            const params = new URLSearchParams({ adAccountId, ...(cursor && { after: cursor }) })
            const res = await fetch(`${API_BASE_URL}/api/analytics/rejected-ads?${params}`, { credentials: "include" })
            const data = await res.json()
            if (requestId !== requestRef.current) return
            if (!res.ok) throw new Error(data.details || data.error || "Failed to load rejected ads")
            setAds(prev => (cursor ? [...prev, ...(data.ads || [])] : data.ads || []))
            setNextCursor(data.nextCursor || null)
            setHasFetched(true)
        } catch (err) {
            if (requestId === requestRef.current) setError(err.message || "Failed to load rejected ads")
        } finally {
            if (requestId === requestRef.current) { setIsLoading(false); setIsLoadingMore(false) }
        }
    }, [adAccountId])

    // A different account starts over.
    useEffect(() => {
        requestRef.current++
        setAds([])
        setNextCursor(null)
        setHasFetched(false)
        setError(null)
    }, [adAccountId])

    useEffect(() => {
        if (open && !hasFetched && !isLoading && !error) fetchAds()
    }, [open, hasFetched, isLoading, error, fetchAds])

    if (!open) return null

    return (
        <>
            <div
                style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", background: "rgba(15,17,21,0.55)", zIndex: 50 }}
            />
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ fontFamily: FONT }}
                onMouseDown={(e) => { backdropPressRef.current = e.target === e.currentTarget }}
                onClick={(e) => {
                    if (backdropPressRef.current && e.target === e.currentTarget) onOpenChange(false)
                    backdropPressRef.current = false
                }}
            >
                <div
                    className="w-full max-w-[1080px] h-[92vh] overflow-hidden flex flex-col"
                    style={{
                        background: PAPER,
                        borderRadius: 24,
                        border: `1px solid ${LINE}`,
                        animation: "rejectedAdsSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                >
                    {/* Sticky header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
                        <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-white border border-gray-200 shadow-xs">
                                <ShieldAlert className="w-[18px] h-[18px] text-gray-700" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-[16px] font-bold text-gray-900 truncate leading-tight">
                                    {adAccountName || "Rejected Ads"}
                                </h2>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    Rejected Ads · Ads Meta rejected or can&apos;t deliver, and the reason Meta gives
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-2xl h-9 text-xs gap-1.5"
                                onClick={() => fetchAds()}
                                disabled={isLoading || isLoadingMore}
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                                Refresh
                            </Button>
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

                    {/* Body */}
                    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar min-h-0" style={{ padding: 24, background: PAPER_2 }}>
                        {isLoading && (
                            <div className="flex-1 flex flex-col items-center justify-center py-10">
                                <div style={{ marginBottom: 12 }}><Helix size="40" speed="2.5" color={BLUE} /></div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: INK, margin: 0 }}>Checking ads for rejections and issues…</p>
                            </div>
                        )}

                        {error && !isLoading && (
                            <div style={{ background: PINK_SOFT, color: PINK_DEEP, fontSize: 13, borderRadius: 16, padding: "12px 16px" }}>
                                {error}
                                <button
                                    onClick={() => fetchAds()}
                                    style={{ marginLeft: 12, textDecoration: "underline", color: PINK_DEEP, fontWeight: 600, background: "transparent", border: 0, cursor: "pointer" }}
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {!isLoading && !error && hasFetched && ads.length === 0 && (
                            <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
                                No rejected ads or ads with issues in this account
                            </div>
                        )}

                        {!isLoading && ads.length > 0 && (
                            <TooltipProvider delayDuration={150}>
                                <div className="flex flex-col gap-2" style={{ animation: "rejectedAdsFadeIn 0.3s ease" }}>
                                    <p style={{ fontSize: 11.5, color: MUTED, margin: "0 0 4px" }}>
                                        {ads.length} {ads.length === 1 ? "ad" : "ads"}{nextCursor ? " loaded" : ""} that are rejected, have delivery issues or are waiting on billing.
                                    </p>

                                    <div className="grid grid-cols-[48px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.6fr)] gap-x-6 px-3 text-[10.5px] font-medium uppercase tracking-wide" style={{ color: MUTED }}>
                                        <span />
                                        <span>Ad</span>
                                        <span>Campaign / Ad set</span>
                                        <span>Status &amp; reason</span>
                                    </div>

                                    {ads.map((ad) => (
                                        <div
                                            key={ad.id}
                                            className="rounded-2xl bg-white p-3 grid grid-cols-[48px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.6fr)] gap-x-6 items-start"
                                            style={{ border: `1px solid ${LINE}` }}
                                        >
                                            <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                                                {ad.thumbnailUrl ? (
                                                    <img
                                                        src={ad.thumbnailUrl}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.currentTarget.style.display = "none" }}
                                                    />
                                                ) : (
                                                    <ImageOff className="h-5 w-5 text-gray-400" />
                                                )}
                                            </div>

                                            <div className="min-w-0 self-center">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <p className="text-sm font-semibold truncate" style={{ color: INK, margin: 0 }}>
                                                                {ad.name || ad.id}
                                                            </p>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-[360px] break-words text-xs">{ad.name || ad.id}</TooltipContent>
                                                    </Tooltip>
                                                    <a
                                                        href={buildAdsManagerAdUrl(adAccountId, businessId, ad.id)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-shrink-0 text-gray-400 hover:text-blue-500 transition-colors"
                                                        aria-label="Open in Ads Manager"
                                                        title="Open in Ads Manager"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>
                                                </div>
                                                <p className="text-[11.5px]" style={{ color: MUTED, margin: "2px 0 0" }}>
                                                    Set to {formatStatus(ad.configuredStatus).toLowerCase()}
                                                </p>
                                            </div>

                                            <div className="min-w-0 self-center">
                                                <p className="text-[12.5px] truncate" style={{ color: INK, margin: 0 }} title={ad.campaignName || ""}>
                                                    {ad.campaignName || "—"}
                                                </p>
                                                <p className="text-[11.5px] truncate" style={{ color: MUTED, margin: "2px 0 0" }} title={ad.adsetName || ""}>
                                                    {ad.adsetName || "—"}
                                                </p>
                                            </div>

                                            <div className="min-w-0 flex flex-col gap-2">
                                                <div><StatusPill status={ad.effectiveStatus} /></div>
                                                {ad.reasons.length === 0 ? (
                                                    <p className="text-[11.5px]" style={{ color: MUTED, margin: 0 }}>Meta didn&apos;t give a reason</p>
                                                ) : (
                                                    ad.reasons.map((reason, i) => <Reason key={i} reason={reason} />)
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {nextCursor && (
                                        <Button
                                            variant="outline"
                                            className="w-full rounded-2xl mt-1"
                                            onClick={() => fetchAds(nextCursor)}
                                            disabled={isLoadingMore}
                                        >
                                            {isLoadingMore ? (
                                                <><Loader className="h-4 w-4 mr-2 animate-spin" />Loading...</>
                                            ) : (
                                                <><ChevronDown className="h-4 w-4 mr-2" />Load more ads</>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </TooltipProvider>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes rejectedAdsSlideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes rejectedAdsFadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    )
}
