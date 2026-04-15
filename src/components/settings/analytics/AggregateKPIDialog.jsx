"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Loader2, BarChart3, X } from "lucide-react"
import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

/**
 * AggregateKPIDialog
 *
 * Shows a grid of mini KPI charts — one per linked ad account.
 * Each card shows the account name, a CPA/ROAS badge, and a mini
 * composed chart (bars for spend, line for the KPI metric).
 * Accounts with no data are filtered out.
 *
 * Props:
 *  - open: boolean
 *  - onOpenChange: (open) => void
 *  - adAccounts: [{ id, name }]
 */
export default function AggregateKPIDialog({ open, onOpenChange, adAccounts }) {
    const [days, setDays] = useState(14)
    const [loading, setLoading] = useState(false)
    // { [accountId]: { insights: [], primaryActionType, mode } }
    const [accountData, setAccountData] = useState({})
    const [fetchedKey, setFetchedKey] = useState(null)

    // Fetch ad account settings + daily insights for all accounts
    const fetchAll = useCallback(async () => {
        if (!adAccounts?.length) return
        const key = `${adAccounts.map(a => a.id).join(',')}-${days}`
        if (key === fetchedKey) return

        setLoading(true)
        try {
            const results = await Promise.all(
                adAccounts.map(async (acct) => {
                    try {
                        // Fetch account info (for mode) and daily insights in parallel
                        const [infoRes, insightsRes] = await Promise.all([
                            fetch(
                                `${API_BASE_URL}/api/analytics/account-info?adAccountId=${acct.id}`,
                                { credentials: 'include' }
                            ),
                            fetch(
                                `${API_BASE_URL}/api/analytics/daily-insights?adAccountId=${acct.id}&days=${days}`,
                                { credentials: 'include' }
                            ),
                        ])

                        const info = await infoRes.json()
                        const insights = await insightsRes.json()

                        // Also try to get saved mode from ad account settings
                        let savedMode = null
                        try {
                            const settingsRes = await fetch(
                                `${API_BASE_URL}/settings/ad-account?adAccountId=${acct.id}`,
                                { credentials: 'include' }
                            )
                            const settingsData = await settingsRes.json()
                            savedMode = settingsData?.settings?.analyticsMode || null
                        } catch (e) { /* silent */ }

                        // Determine mode: saved > suggested > fallback to cpa
                        let mode = 'cpa'
                        if (savedMode === 'roas') mode = 'roas'
                        else if (savedMode === 'cpa') mode = 'cpa'
                        else if (info.suggestedMode === 'roas') mode = 'roas'

                        return {
                            id: acct.id,
                            name: acct.name || acct.id,
                            mode,
                            insights: insights.dailyInsights || [],
                            primaryActionType: insights.primaryActionType,
                        }
                    } catch (err) {
                        console.error(`Failed for ${acct.id}:`, err)
                        return { id: acct.id, name: acct.name || acct.id, mode: 'cpa', insights: [] }
                    }
                })
            )

            const map = {}
            for (const r of results) map[r.id] = r
            setAccountData(map)
            setFetchedKey(key)
        } catch (err) {
            console.error('Aggregate fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [adAccounts, days, fetchedKey])

    useEffect(() => {
        if (open) fetchAll()
    }, [open, days, fetchAll])

    useEffect(() => {
        if (!open) { setFetchedKey(null); setAccountData({}) }
    }, [open])

    // Count hidden accounts (no data)
    const hiddenCount = useMemo(() => {
        if (loading) return 0
        return (adAccounts || []).filter(acct => {
            const data = accountData[acct.id]
            return data && (!data.insights || data.insights.length === 0)
        }).length
    }, [loading, adAccounts, accountData])

    if (!open) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed bg-black/50 z-50"
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100dvh",
                }}
                onClick={() => onOpenChange(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-[30px] shadow-2xl w-full max-w-[960px] max-h-[95vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-8 pb-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-600">
                                Account Overview — Last {days} Days
                            </span>
                            <div className="flex p-0.5 bg-gray-100 rounded-lg border border-gray-200/60">
                                <button
                                    onClick={() => setDays(14)}
                                    className={cn(
                                        "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                                        days === 14 ? "bg-white shadow-xs text-gray-900" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    14d
                                </button>
                                <button
                                    onClick={() => setDays(30)}
                                    className={cn(
                                        "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                                        days === 30 ? "bg-white shadow-xs text-gray-900" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    30d
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-8 pb-8 overflow-y-auto space-y-5">
                        {loading ? (
                            <div className="flex items-center justify-center h-[300px]">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {(adAccounts || []).filter((acct) => {
                                        const data = accountData[acct.id]
                                        return !data || (data.insights && data.insights.length > 0)
                                    }).map((acct) => {
                                        const data = accountData[acct.id]
                                        if (!data) return (
                                            <MiniChartCard
                                                key={acct.id}
                                                name={acct.name || acct.id}
                                                mode="cpa"
                                                chartData={[]}
                                                loading={true}
                                            />
                                        )
                                        return (
                                            <MiniChartCard
                                                key={acct.id}
                                                name={data.name}
                                                mode={data.mode}
                                                insights={data.insights}
                                                loading={false}
                                            />
                                        )
                                    })}
                                </div>
                                {hiddenCount > 0 && (
                                    <p className="text-xs text-gray-400 text-center mt-2">
                                        {hiddenCount} account{hiddenCount > 1 ? 's' : ''} hidden (no data in this period)
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}


/**
 * MiniChartCard — a single account's mini KPI chart
 */
function MiniChartCard({ name, mode, insights = [], loading: isLoading }) {
    const { chartData, avgMetric, maxSpend } = useMemo(() => {
        if (!insights?.length) return { chartData: [], avgMetric: 0, maxSpend: 0 }

        const metricKey = mode === 'roas' ? 'roas' : 'cpa'

        // Aggregate all campaigns per day
        const dateMap = new Map()
        for (const row of insights) {
            if (!dateMap.has(row.date)) {
                dateMap.set(row.date, { totalSpend: 0, weightedMetric: 0, count: 0 })
            }
            const d = dateMap.get(row.date)
            const val = row[metricKey]
            const spend = row.spend || 0
            d.totalSpend += spend
            if (val !== null && val !== undefined) {
                d.weightedMetric += val * Math.max(spend, 1)
                d.count++
            }
        }

        let metricSum = 0, metricCount = 0, maxSpend = 0
        const chartData = [...dateMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, d]) => {
                const dt = new Date(date + 'T00:00:00')
                const metric = d.count > 0
                    ? (d.totalSpend > 0 ? d.weightedMetric / d.totalSpend : d.weightedMetric / d.count)
                    : null
                if (metric !== null) { metricSum += metric; metricCount++ }
                if (d.totalSpend > maxSpend) maxSpend = d.totalSpend
                return {
                    label: `${dt.getMonth() + 1}/${dt.getDate()}`,
                    spend: d.totalSpend,
                    metric,
                }
            })

        return { chartData, avgMetric: metricCount > 0 ? metricSum / metricCount : 0, maxSpend }
    }, [insights, mode])

    const isRoas = mode === 'roas'
    const formatMetric = isRoas
        ? (v) => v !== null && v !== undefined ? `${v.toFixed(2)}x` : ''
        : (v) => v !== null && v !== undefined ? `$${v.toFixed(0)}` : ''

    return (
        <div className="border border-gray-200 rounded-2xl p-4 bg-white">
            {/* Header */}
            <div className="flex items-start justify-between mb-1.5">
                <p className="text-xs font-medium text-gray-900 truncate max-w-[140px] leading-tight">
                    {name}
                </p>
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-semibold flex-shrink-0 ml-2",
                    isRoas
                        ? "bg-blue-50 text-blue-600"
                        : "bg-green-50 text-green-600"
                )}>
                    {isRoas ? 'ROAS' : 'CPA'}
                </span>
            </div>

            {/* Chart */}
            {isLoading ? (
                <div className="flex items-center justify-center h-[140px]">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                </div>
            ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-[140px] text-[10px] text-gray-300">
                    No data
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={140}>
                    <ComposedChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 8, fill: '#bbb' }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            yAxisId="metric"
                            orientation="left"
                            tick={{ fontSize: 8, fill: '#bbb' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => isRoas ? `${v.toFixed(1)}x` : `$${Math.round(v)}`}
                            width={32}
                        />
                        <YAxis
                            yAxisId="spend"
                            orientation="right"
                            tick={{ fontSize: 8, fill: '#bbb' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `$${Math.round(v)}`}
                            width={32}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px', border: '1px solid #e5e7eb',
                                fontSize: '10px', padding: '4px 8px',
                            }}
                            formatter={(value, name) => {
                                if (name === 'metric') return [formatMetric(value), isRoas ? 'ROAS' : 'CPA']
                                return [`$${value?.toFixed(0)}`, 'Spend']
                            }}
                        />
                        <Bar
                            yAxisId="spend"
                            dataKey="spend"
                            fill="#e0e7ff"
                            radius={[2, 2, 0, 0]}
                            barSize={6}
                        />
                        <Line
                            yAxisId="metric"
                            type="monotone"
                            dataKey="metric"
                            stroke={isRoas ? "#3b82f6" : "#22c55e"}
                            strokeWidth={1.5}
                            dot={false}
                            connectNulls
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}