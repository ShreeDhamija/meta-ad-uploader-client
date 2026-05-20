"use client"

/* eslint-disable react/prop-types */

import { useEffect, useMemo, useState } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { Image as ImageIcon, X, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

function formatMonthLabel(yyyyMM) {
    const [year, month] = yyyyMM.split("-")
    const d = new Date(Number(year), Number(month) - 1, 1)
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
}

function formatMonthFull(yyyyMM) {
    const [year, month] = yyyyMM.split("-")
    const d = new Date(Number(year), Number(month) - 1, 1)
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function formatSpend(v) {
    if (v == null) return "—"
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(0)}`
}

function CreativeThumbnail({ url, name }) {
    const [errored, setErrored] = useState(false)
    if (url && !errored) {
        return (
            <img
                src={url}
                alt={name}
                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                onError={() => setErrored(true)}
            />
        )
    }
    return (
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <ImageIcon className="h-5 w-5 text-gray-300" />
        </div>
    )
}

function CreativeRow({ creative }) {
    return (
        <div className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-gray-50">
            <CreativeThumbnail url={creative.thumbnailUrl} name={creative.adName} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-800" title={creative.adName}>{creative.adName}</p>
                <p className="mt-0.5 text-xs text-gray-400">{formatSpend(creative.spend)} spend</p>
            </div>
            {creative.isWinner && (
                <span className="flex flex-shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    <Trophy className="h-3 w-3" />
                    Winner
                </span>
            )}
        </div>
    )
}

function MonthModal({ monthKey, creatives, winnerThreshold, onClose }) {
    const winners = creatives.filter(c => c.isWinner)
    const others = creatives.filter(c => !c.isWinner)

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="flex w-full max-w-lg max-h-[80vh] flex-col rounded-3xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">
                            {formatMonthFull(monthKey)} Launches
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-400">
                            {creatives.length} unique creative{creatives.length !== 1 ? "s" : ""}
                            {winnerThreshold != null && (
                                <> · Winner threshold: {formatSpend(winnerThreshold)} spend</>
                            )}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-3 flex-shrink-0 text-gray-400 transition-colors hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-3">
                    {creatives.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">No creatives for this month.</p>
                    ) : (
                        <>
                            {winners.length > 0 && (
                                <div className="mb-3">
                                    <div className="flex items-center gap-2 px-4 py-1.5">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                                            Winners ({winners.length})
                                        </span>
                                        <div className="h-px flex-1 bg-amber-100" />
                                    </div>
                                    {winners.map(c => <CreativeRow key={c.adName} creative={c} />)}
                                </div>
                            )}
                            {others.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 px-4 py-1.5">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                            {winners.length > 0 ? `Other Launches (${others.length})` : `All Launches (${others.length})`}
                                        </span>
                                        <div className="h-px flex-1 bg-gray-100" />
                                    </div>
                                    {others.map(c => <CreativeRow key={c.adName} creative={c} />)}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    const row = payload[0]?.payload
    const launches = row?.launches
    const winners = row?.winners
    const isMatured = row?.isMatured
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-lg">
            <p className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
                {label}
                {isMatured === false && (
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        maturing
                    </span>
                )}
            </p>
            <div className="space-y-1">
                <p className="flex items-center gap-2 text-gray-600">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Launches
                    <span className="ml-auto font-medium text-gray-900">{launches ?? 0}</span>
                </p>
                <p className="flex items-center gap-2 text-gray-600">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Winners
                    <span className="ml-auto font-medium text-gray-900">{winners ?? 0}</span>
                </p>
            </div>
            <p className="mt-2 text-[10px] italic text-gray-400">Click to view creatives</p>
        </div>
    )
}

export default function CreativeHitRateChart({ adAccountId, conversionEvent, refreshKey, className }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [selectedMonth, setSelectedMonth] = useState(null)

    useEffect(() => {
        if (!adAccountId) { setData(null); return }
        let cancelled = false
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({ adAccountId })
        if (conversionEvent) params.set("conversionEvent", conversionEvent)
        if (refreshKey) params.set("rk", String(refreshKey))

        fetch(`${API_BASE_URL}/api/analytics/creative-hit-rate?${params}`, {
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

    const chartData = useMemo(() => {
        if (!data?.months) return []
        return data.months.map(m => ({
            month: formatMonthLabel(m.month),
            monthKey: m.month,
            launches: m.launches,
            winners: m.winners,
            isMatured: m.isMatured,
        }))
    }, [data])

    const hasMaturingMonth = chartData.some(d => d.isMatured === false)

    const hasAnyLaunches = chartData.some(d => d.launches > 0)
    const selectedCreatives = selectedMonth && data?.creativesByMonth
        ? (data.creativesByMonth[selectedMonth] || [])
        : []

    return (
        <>
            <div className={cn("p-4", className)}>
                <div className="mb-[22px] flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">Creative Hit Rate</p>
                        <p className="text-xs text-gray-400">
                            Unique launches per month · Winners reach 10× account avg CPA within 90 days of launch
                            {data?.winnerThreshold != null && (
                                <> · threshold {formatSpend(data.winnerThreshold)}</>
                            )}
                            {hasMaturingMonth && (
                                <> · recent months still maturing</>
                            )}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-[260px] items-center justify-center">
                        <Helix size="36" speed="2.5" color="#3b82f6" />
                    </div>
                ) : error ? (
                    <div className="flex h-[260px] items-center justify-center text-sm text-red-500">{error}</div>
                ) : !hasAnyLaunches ? (
                    <div className="flex h-[260px] items-center justify-center text-sm text-gray-400">
                        No creative launches found in the trailing 6 months
                    </div>
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height={260}>
                            <ComposedChart
                                data={chartData}
                                margin={{ top: 5, right: 0, left: -10, bottom: 5 }}
                                style={{ cursor: "pointer" }}
                            >
                                <defs>
                                    <linearGradient id="hitRateBarFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.95} />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.55} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                                    tickLine={false}
                                    axisLine={{ stroke: "#e5e7eb" }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={32}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
                                <Bar
                                    dataKey="launches"
                                    fill="url(#hitRateBarFill)"
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={48}
                                    onClick={(d) => { if (d?.monthKey) setSelectedMonth(d.monthKey) }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="winners"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    dot={{ r: 4, strokeWidth: 0, fill: "#f59e0b" }}
                                    activeDot={{
                                        r: 6, strokeWidth: 0, fill: "#f59e0b",
                                        onClick: (_, p) => { if (p?.payload?.monthKey) setSelectedMonth(p.payload.monthKey) },
                                    }}
                                    connectNulls={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>

                        <div className="mt-3 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-3 rounded-sm bg-gradient-to-b from-blue-400 to-blue-500" />
                                <span className="text-[11px] font-medium text-blue-500">Launches</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-[3px] w-3 rounded-full bg-amber-500" />
                                <span className="text-[11px] font-medium text-amber-500">Winners</span>
                            </div>
                            <span className="ml-auto text-[11px] italic text-gray-400">
                                Click a bar to view creatives
                            </span>
                        </div>
                    </>
                )}
            </div>

            {selectedMonth && (
                <MonthModal
                    monthKey={selectedMonth}
                    creatives={selectedCreatives}
                    winnerThreshold={data?.winnerThreshold ?? null}
                    onClose={() => setSelectedMonth(null)}
                />
            )}
        </>
    )
}
