"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Loader2, BarChart3 } from "lucide-react"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay,
} from "@/components/ui/dialog"
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine,
} from "recharts"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

const COLORS = [
    "#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444",
    "#06b6d4", "#eab308", "#ec4899", "#14b8a6", "#6366f1",
]

/**
 * AggregateKPIDialog
 *
 * Shows a popup with KPI chart data aggregated across ALL linked ad accounts.
 * Each line = one ad account, showing spend-weighted daily metric.
 *
 * Props:
 *  - open: boolean
 *  - onOpenChange: (open) => void
 *  - adAccounts: [{ id, name }]
 *  - mode: 'cpr' | 'roas'
 */
export default function AggregateKPIDialog({ open, onOpenChange, adAccounts, mode }) {
    const [days, setDays] = useState(14)
    const [loading, setLoading] = useState(false)
    const [allInsights, setAllInsights] = useState([])
    const [fetchedKey, setFetchedKey] = useState(null)

    const fetchAllInsights = useCallback(async () => {
        if (!adAccounts?.length) return
        const key = `${adAccounts.map(a => a.id).join(',')}-${days}`
        if (key === fetchedKey) return

        setLoading(true)
        try {
            const results = await Promise.all(
                adAccounts.map(async (acct) => {
                    try {
                        const res = await fetch(
                            `${API_BASE_URL}/api/analytics/daily-insights?adAccountId=${acct.id}&days=${days}`,
                            { credentials: 'include' }
                        )
                        const data = await res.json()
                        if (res.ok && data.dailyInsights?.length) {
                            return data.dailyInsights.map(row => ({
                                ...row,
                                accountName: acct.name || acct.id,
                            }))
                        }
                    } catch (err) {
                        console.error(`Failed to fetch insights for ${acct.id}:`, err)
                    }
                    return []
                })
            )
            setAllInsights(results.flat())
            setFetchedKey(key)
        } catch (err) {
            console.error('Aggregate insights error:', err)
        } finally {
            setLoading(false)
        }
    }, [adAccounts, days, fetchedKey])

    useEffect(() => {
        if (open) fetchAllInsights()
    }, [open, days, fetchAllInsights])

    useEffect(() => {
        if (!open) { setFetchedKey(null); setAllInsights([]) }
    }, [open])

    const { chartData, accounts, avgValue } = useMemo(() => {
        if (!allInsights.length) return { chartData: [], accounts: [], avgValue: 0 }
        const metric = mode === 'roas' ? 'roas' : 'cpa'
        const dateAccountMap = new Map()
        const accountSet = new Set()

        for (const row of allInsights) {
            accountSet.add(row.accountName)
            if (!dateAccountMap.has(row.date)) dateAccountMap.set(row.date, {})
            const dayData = dateAccountMap.get(row.date)
            if (!dayData[row.accountName]) {
                dayData[row.accountName] = { totalSpend: 0, weightedSum: 0, count: 0 }
            }
            const val = row[metric]
            const spend = row.spend || 0
            if (val !== null && val !== undefined) {
                dayData[row.accountName].totalSpend += spend
                dayData[row.accountName].weightedSum += val * Math.max(spend, 1)
                dayData[row.accountName].count++
            }
        }

        const accounts = [...accountSet].sort()
        const chartData = [...dateAccountMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, accountData]) => {
                const d = new Date(date + 'T00:00:00')
                const entry = { date, label: `${d.getMonth() + 1}/${d.getDate()}` }
                for (const acctName of accounts) {
                    const data = accountData[acctName]
                    if (data && data.count > 0) {
                        entry[acctName] = data.totalSpend > 0
                            ? data.weightedSum / data.totalSpend
                            : data.weightedSum / data.count
                    }
                }
                return entry
            })

        let sum = 0, count = 0
        for (const row of allInsights) {
            if (row[metric] !== null && row[metric] !== undefined) { sum += row[metric]; count++ }
        }
        return { chartData, accounts, avgValue: count > 0 ? sum / count : 0 }
    }, [allInsights, mode])

    const [hiddenAccounts, setHiddenAccounts] = useState(new Set())

    const handleLegendClick = useCallback((entry) => {
        setHiddenAccounts(prev => {
            const next = new Set(prev)
            if (next.has(entry.value)) next.delete(entry.value)
            else next.add(entry.value)
            return next
        })
    }, [])

    const visibleAvg = useMemo(() => {
        if (hiddenAccounts.size === 0) return avgValue
        const metric = mode === 'roas' ? 'roas' : 'cpa'
        let sum = 0, count = 0
        for (const row of allInsights) {
            if (hiddenAccounts.has(row.accountName)) continue
            if (row[metric] !== null && row[metric] !== undefined) { sum += row[metric]; count++ }
        }
        return count > 0 ? sum / count : 0
    }, [allInsights, mode, hiddenAccounts, avgValue])

    const metricLabel = mode === 'roas' ? 'ROAS' : 'CPA'
    const formatValue = mode === 'roas'
        ? (v) => v !== null && v !== undefined ? `${v.toFixed(2)}x` : 'N/A'
        : (v) => v !== null && v !== undefined ? `$${v.toFixed(2)}` : 'N/A'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogOverlay className="bg-black/50" />
            <DialogContent className="sm:max-w-[720px] !rounded-[30px] p-8 space-y-4 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-2">
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-500" />
                        Aggregate {metricLabel} Overview
                    </DialogTitle>
                    <p className="text-sm text-gray-400">
                        Daily {metricLabel} across all {adAccounts?.length || 0} linked ad account{(adAccounts?.length || 0) !== 1 ? 's' : ''}
                    </p>
                </DialogHeader>

                <div className="flex justify-end">
                    <div className="flex p-0.5 bg-gray-100 rounded-lg border border-gray-200/60">
                        <button
                            onClick={() => setDays(14)}
                            className={cn(
                                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                                days === 14 ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            14d
                        </button>
                        <button
                            onClick={() => setDays(30)}
                            className={cn(
                                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                                days === 30 ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            30d
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-[300px]">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-sm text-gray-400">
                        No data available across accounts for this period
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e5e7eb' }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => mode === 'roas' ? `${v.toFixed(1)}x` : `$${Math.round(v)}`}
                                width={50}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '12px', border: '1px solid #e5e7eb',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px',
                                }}
                                formatter={(value, name) => [formatValue(value), name]}
                                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                            />
                            {visibleAvg > 0 && (
                                <ReferenceLine
                                    y={visibleAvg}
                                    stroke="#9ca3af"
                                    strokeDasharray="6 4"
                                    strokeWidth={1.5}
                                    label={{
                                        value: `Avg: ${formatValue(visibleAvg)}`,
                                        position: 'right',
                                        fill: '#9ca3af',
                                        fontSize: 10,
                                    }}
                                />
                            )}
                            {accounts.map((name, i) => (
                                <Line
                                    key={name}
                                    type="monotone"
                                    dataKey={name}
                                    stroke={COLORS[i % COLORS.length]}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                    connectNulls
                                    hide={hiddenAccounts.has(name)}
                                />
                            ))}
                            <Legend
                                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                                iconType="plainline"
                                iconSize={16}
                                onClick={handleLegendClick}
                                formatter={(value) => (
                                    <span style={{
                                        color: hiddenAccounts.has(value) ? '#d1d5db' : undefined,
                                        textDecoration: hiddenAccounts.has(value) ? 'line-through' : undefined,
                                        cursor: 'pointer',
                                    }}>
                                        {value}
                                    </span>
                                )}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </DialogContent>
        </Dialog>
    )
}