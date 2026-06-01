"use client"

/* eslint-disable react/prop-types */

import { useEffect, useMemo, useRef, useState } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { Camera } from "lucide-react"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

const COLUMNS = [
    { key: "spend", label: "Amount Spend", format: formatCurrency },
    { key: "purchases", label: "Purchases", format: formatInteger },
    { key: "roas", label: "ROAS", format: formatRoas },
    { key: "costPerAddToCart", label: "Cost / Add to Cart", format: formatCurrency },
    { key: "costPerInitiateCheckout", label: "Cost / Initiate Checkout", format: formatCurrency },
    { key: "costPerPurchase", label: "Cost / Purchase", format: formatCurrency },
]

function parseDate(value) {
    if (!value) return null
    const [year, month, day] = value.split("-").map(Number)
    if (!year || !month || !day) return null
    return new Date(year, month - 1, day)
}

function formatShortDate(value) {
    const d = parseDate(value)
    if (!d) return ""
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatWeekRange(row) {
    const start = formatShortDate(row.since)
    const end = formatShortDate(row.until)
    if (!start || !end) return row.week || "-"
    return `${start} - ${end}`
}

function formatCurrency(value) {
    if (value === null || value === undefined) return "-"
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`
    return `$${value.toFixed(2)}`
}

function formatInteger(value) {
    if (value === null || value === undefined) return "-"
    return Math.round(value).toLocaleString()
}

function formatRoas(value) {
    if (value === null || value === undefined) return "-"
    return `${value.toFixed(2)}x`
}

function getColumnDomains(rows) {
    const domains = {}
    for (const col of COLUMNS) {
        const values = rows
            .map(row => row[col.key])
            .filter(value => value !== null && value !== undefined && Number.isFinite(Number(value)))
            .map(Number)
        domains[col.key] = {
            min: values.length ? Math.min(...values) : null,
            max: values.length ? Math.max(...values) : null,
        }
    }
    return domains
}

function getHeatStyle(value, domain) {
    if (value === null || value === undefined || !domain || domain.min === null || domain.max === null) {
        return { backgroundColor: "#ffffff", color: "#111827" }
    }
    if (domain.max === domain.min) {
        return { backgroundColor: "#ffffff", color: "#111827" }
    }

    const pct = Math.max(0, Math.min(1, (Number(value) - domain.min) / (domain.max - domain.min)))
    if (pct <= 0.02) return { backgroundColor: "#ffffff", color: "#111827" }

    const alpha = 0.12 + pct * 0.78
    const textColor = pct > 0.55 ? "#ffffff" : "#111827"
    return {
        backgroundColor: `rgba(22, 163, 74, ${alpha.toFixed(3)})`,
        color: textColor,
    }
}

export default function TrailingSixWeeksSnapshot({ adAccountId, enabled, refreshKey, className }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const cacheRef = useRef({})

    useEffect(() => {
        if (!enabled || !adAccountId) {
            setData(null)
            setLoading(false)
            setError(null)
            return
        }

        const cacheKey = `${adAccountId}::${refreshKey || 0}`
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
        if (refreshKey) params.set("rk", String(refreshKey))

        fetch(`${API_BASE_URL}/api/analytics/trailing-six-weeks-snapshot?${params}`, {
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
            .catch(err => {
                if (!cancelled) setError(err.message || "Error loading snapshot")
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => { cancelled = true }
    }, [adAccountId, enabled, refreshKey])

    const rows = data?.weeks || []
    const domains = useMemo(() => getColumnDomains(rows), [rows])

    if (!enabled) return null

    return (
        <div className={cn("px-4 pt-4", className)}>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-red-50">
                            <Camera className="h-4 w-4 text-red-500" strokeWidth={2.4} />
                        </div>
                        <p className="truncate text-sm font-semibold text-gray-900">Trailing 6 Weeks Snapshot</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-[170px] items-center justify-center">
                        <Helix size="34" speed="2.5" color="#ef4444" />
                    </div>
                ) : error ? (
                    <div className="flex h-[130px] items-center justify-center px-4 text-center text-sm text-red-500">
                        {error}
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex h-[130px] items-center justify-center text-sm text-gray-400">
                        No snapshot data available
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-50/80">
                                    <th className="w-[150px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                        Week
                                    </th>
                                    {COLUMNS.map(col => (
                                        <th key={col.key} className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => (
                                    <tr key={`${row.since}-${row.until}`} className="border-t border-gray-100">
                                        <td className="px-4 py-3 text-left">
                                            <div className="font-medium text-gray-900">{row.week}</div>
                                            <div className="mt-0.5 text-xs text-gray-400">{formatWeekRange(row)}</div>
                                        </td>
                                        {COLUMNS.map(col => (
                                            <td key={col.key} className="px-2 py-2 text-right">
                                                <div
                                                    className="ml-auto min-w-[92px] rounded-lg px-2.5 py-2 text-sm font-semibold tabular-nums transition-colors"
                                                    style={getHeatStyle(row[col.key], domains[col.key])}
                                                >
                                                    {col.format(row[col.key])}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
