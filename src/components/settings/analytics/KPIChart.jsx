"use client"

import { useMemo, useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine,
} from "recharts"

const COLORS = [
    "#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444",
    "#06b6d4", "#eab308", "#ec4899", "#14b8a6", "#6366f1",
]

const MAX_NAME_LENGTH = 25

function truncateName(name) {
    if (!name) return ''
    return name.length > MAX_NAME_LENGTH ? name.slice(0, MAX_NAME_LENGTH) + '…' : name
}

export default function KPIChart({ data, loading, mode, days, onDaysChange }) {
    const { chartData, campaigns, avgValue } = useMemo(() => {
        if (!data?.dailyInsights?.length) return { chartData: [], campaigns: [], avgValue: 0 }

        const metric = mode === 'roas' ? 'roas' : 'cpa'

        const dateMap = new Map()
        const campaignSet = new Set()

        for (const row of data.dailyInsights) {
            campaignSet.add(row.campaignName)
            if (!dateMap.has(row.date)) dateMap.set(row.date, {})
            dateMap.get(row.date)[row.campaignName] = row[metric]
        }

        const campaigns = [...campaignSet].sort()
        const chartData = [...dateMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, values]) => {
                const d = new Date(date + 'T00:00:00')
                return {
                    date,
                    label: `${d.getMonth() + 1}/${d.getDate()}`,
                    ...values,
                }
            })

        let sum = 0, count = 0
        for (const row of data.dailyInsights) {
            if (row[metric] !== null && row[metric] !== undefined) {
                sum += row[metric]
                count++
            }
        }
        const avgValue = count > 0 ? sum / count : 0

        return { chartData, campaigns, avgValue }
    }, [data, mode])

    const [hiddenCampaigns, setHiddenCampaigns] = useState(new Set())

    const handleToggleCampaign = useCallback((name) => {
        setHiddenCampaigns(prev => {
            const next = new Set(prev)
            if (next.has(name)) next.delete(name)
            else next.add(name)
            return next
        })
    }, [])

    // Track whether legend is scrollable to show fade hint
    const legendRef = useRef(null)
    const [canScroll, setCanScroll] = useState(false)
    const [scrolledToBottom, setScrolledToBottom] = useState(false)

    useEffect(() => {
        const el = legendRef.current
        if (!el) return
        const check = () => {
            setCanScroll(el.scrollHeight > el.clientHeight)
            setScrolledToBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 2)
        }
        check()
        el.addEventListener('scroll', check)
        const ro = new ResizeObserver(check)
        ro.observe(el)
        return () => { el.removeEventListener('scroll', check); ro.disconnect() }
    }, [campaigns])

    const visibleAvg = useMemo(() => {
        if (!data?.dailyInsights?.length || campaigns.length === 0) return avgValue
        if (hiddenCampaigns.size === 0) return avgValue
        const metric = mode === 'roas' ? 'roas' : 'cpa'
        let sum = 0, count = 0
        for (const row of data.dailyInsights) {
            if (hiddenCampaigns.has(row.campaignName)) continue
            if (row[metric] !== null && row[metric] !== undefined) { sum += row[metric]; count++ }
        }
        return count > 0 ? sum / count : 0
    }, [data, mode, hiddenCampaigns, campaigns, avgValue])

    const metricLabel = mode === 'roas' ? 'ROAS' : 'CPA'
    const formatValue = mode === 'roas'
        ? (v) => v !== null && v !== undefined ? `${v.toFixed(2)}x` : 'N/A'
        : (v) => v !== null && v !== undefined ? `$${v.toFixed(2)}` : 'N/A'

    return (
        <Card className="rounded-2xl border-gray-200">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-sm font-medium text-gray-900">Daily {metricLabel} by Campaign</p>
                        <p className="text-xs text-gray-400">
                            {data?.primaryActionType ? `Event: ${data.primaryActionType}` : 'Auto-detected event'}
                        </p>
                    </div>
                    <div className="flex p-0.5 bg-gray-100 rounded-lg border border-gray-200/60">
                        <button
                            onClick={() => onDaysChange(14)}
                            className={cn(
                                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                                days === 14 ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            14d
                        </button>
                        <button
                            onClick={() => onDaysChange(30)}
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
                    <div className="flex items-center justify-center h-[220px]">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">
                        No data available for this period
                    </div>
                ) : (
                    <>
                        {/* Chart — fixed height, never squished */}
                        <ResponsiveContainer width="100%" height={220}>
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
                                {campaigns.map((name, i) => (
                                    <Line
                                        key={name}
                                        type="monotone"
                                        dataKey={name}
                                        stroke={COLORS[i % COLORS.length]}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, strokeWidth: 0 }}
                                        connectNulls
                                        hide={hiddenCampaigns.has(name)}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>

                        {/* Custom legend — scrollable, 2-col grid, left-aligned */}
                        {campaigns.length > 0 && (
                            <div className="relative mt-3">
                                <div
                                    ref={legendRef}
                                    className="max-h-[88px] overflow-y-auto custom-scrollbar"
                                >
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                        {campaigns.map((name, i) => {
                                            const isHidden = hiddenCampaigns.has(name)
                                            return (
                                                <button
                                                    key={name}
                                                    onClick={() => handleToggleCampaign(name)}
                                                    title={name}
                                                    className="flex items-center gap-2 text-left min-w-0 py-0.5 group"
                                                >
                                                    <span
                                                        className="w-3 h-[3px] rounded-full flex-shrink-0 transition-opacity"
                                                        style={{
                                                            backgroundColor: COLORS[i % COLORS.length],
                                                            opacity: isHidden ? 0.25 : 1,
                                                        }}
                                                    />
                                                    <span
                                                        className={cn(
                                                            "text-[11px] truncate transition-colors",
                                                            isHidden
                                                                ? "text-gray-300 line-through"
                                                                : "text-gray-600 group-hover:text-gray-900"
                                                        )}
                                                    >
                                                        {truncateName(name)}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                {/* Fade hint when more items below */}
                                {canScroll && !scrolledToBottom && (
                                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b" />
                                )}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}