"use client"

/* eslint-disable react/prop-types */

import { useEffect, useState } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { Image as ImageIcon, TrendingUp, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

function formatSpend(v) {
    if (v == null) return "—"
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(0)}`
}

function formatWatchTime(seconds) {
    if (seconds == null) return "—"
    const s = Math.round(seconds)
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const rem = s % 60
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

function DeltaBadge({ delta }) {
    if (delta === null || delta === undefined) {
        return (
            <span className="ml-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                New
            </span>
        )
    }
    const positive = delta >= 0
    const label = `${positive ? "+" : ""}${Math.round(delta)}%`
    return (
        <span
            className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500",
            )}
        >
            {label}
        </span>
    )
}

function Thumbnail({ url, name, postUrl }) {
    const [errored, setErrored] = useState(false)
    const img = url && !errored ? (
        <img
            src={url}
            alt={name}
            className="h-[88px] w-[88px] rounded-xl object-cover"
            onError={() => setErrored(true)}
        />
    ) : (
        <div className="flex h-[88px] w-[88px] flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
            <ImageIcon className="h-6 w-6 text-gray-300" />
        </div>
    )
    if (postUrl) {
        return (
            <a href={postUrl} target="_blank" rel="noopener noreferrer" className="group relative block">
                {img}
                <span className="pointer-events-none absolute right-1 top-1 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <ExternalLink className="h-3 w-3 text-white" />
                </span>
            </a>
        )
    }
    return img
}

export default function TrendingCreative({ adAccountId, conversionEvent, refreshKey, className }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!adAccountId) { setData(null); return }
        let cancelled = false
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({ adAccountId })
        if (conversionEvent) params.set("conversionEvent", conversionEvent)
        if (refreshKey) params.set("rk", String(refreshKey))

        fetch(`${API_BASE_URL}/api/analytics/trending-creative?${params}`, {
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
    }, [adAccountId, conversionEvent, refreshKey])

    return (
        <div className={cn("p-4", className)}>
            <div className="mb-[22px] flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                        <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                        Trending Creatives
                    </p>
                    <p className="text-xs text-gray-400">
                        Ads with &gt;35% spend growth vs prior 7 days
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex h-[200px] items-center justify-center">
                    <Helix size="36" speed="2.5" color="#3b82f6" />
                </div>
            ) : error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            ) : !data || data.ads.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
                    No trending creatives in the last 7 days
                </div>
            ) : (
                <div className="overflow-y-auto" style={{ maxHeight: "50vh" }}>
                    <table className="min-w-full">
                        <thead className="sticky top-0 z-10 bg-white">
                            <tr className="border-b border-gray-100">
                                <th className="w-[100px] pb-2 pr-3" />
                                <th className="pb-2 pr-4 text-left text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                    Ad
                                </th>
                                <th className="px-3 pb-2 text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                    Spend
                                </th>
                                <th className="px-3 pb-2 text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                    CPA
                                </th>
                                <th className="px-3 pb-2 text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                    CTR
                                </th>
                                <th className="px-3 pb-2 text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                    Watch
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.ads.map((ad) => (
                                <tr key={ad.adId} className="transition-colors hover:bg-gray-50">
                                    <td className="py-2.5 pr-3">
                                        <Thumbnail url={ad.thumbnailUrl} name={ad.adName} postUrl={ad.postUrl} />
                                    </td>
                                    <td className="py-2.5 pr-4 align-middle">
                                        {ad.postUrl ? (
                                            <a
                                                href={ad.postUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium leading-tight text-gray-800 hover:text-blue-600"
                                                title={ad.adName}
                                            >
                                                {ad.adName.length > 40 ? `${ad.adName.slice(0, 40)}…` : ad.adName}
                                            </a>
                                        ) : (
                                            <p
                                                className="text-sm font-medium leading-tight text-gray-800"
                                                title={ad.adName}
                                            >
                                                {ad.adName.length > 40 ? `${ad.adName.slice(0, 40)}…` : ad.adName}
                                            </p>
                                        )}
                                        <p
                                            className="mt-0.5 max-w-[180px] truncate text-xs leading-tight text-gray-400"
                                            title={ad.campaignName}
                                        >
                                            {ad.campaignName}
                                        </p>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle">
                                        <span className="text-sm font-medium text-gray-800">
                                            {formatSpend(ad.currentSpend)}
                                        </span>
                                        <DeltaBadge delta={ad.spendDelta} />
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-sm font-medium text-gray-800">
                                        {ad.cpa != null ? `$${Math.round(ad.cpa)}` : "—"}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-sm font-medium text-gray-800">
                                        {ad.ctr != null ? `${ad.ctr.toFixed(2)}%` : "—"}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-center align-middle text-sm font-medium text-gray-800">
                                        {formatWatchTime(ad.videoAvgWatchTime)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
