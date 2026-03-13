
"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts"

const METRIC_OPTIONS = {
    costPerLinkClick: {
        label: 'Cost Per Link Click',
        color: '#3b82f6',
        tickFormatter: (value) => `$${value.toFixed(2)}`,
        valueFormatter: (value) => value !== null && value !== undefined ? `$${value.toFixed(2)}` : 'N/A',
        subtitle: 'Weekly cost per link click over ~6 months',
        yAxisWidth: 56,
    },
    cpm: {
        label: 'CPM',
        color: '#f97316',
        tickFormatter: (value) => `$${value.toFixed(2)}`,
        valueFormatter: (value) => value !== null && value !== undefined ? `$${value.toFixed(2)}` : 'N/A',
        subtitle: 'Weekly CPM over ~6 months',
        yAxisWidth: 56,
    },
    linkCtr: {
        label: 'Link Click-Through Rate',
        color: '#14b8a6',
        tickFormatter: (value) => `${value.toFixed(1)}%`,
        valueFormatter: (value) => value !== null && value !== undefined ? `${value.toFixed(2)}%` : 'N/A',
        subtitle: 'Weekly link CTR over ~6 months',
        yAxisWidth: 52,
    },
    frequency: {
        label: 'Frequency',
        color: '#a855f7',
        tickFormatter: (value) => `${value.toFixed(1)}x`,
        valueFormatter: (value) => value !== null && value !== undefined ? `${value.toFixed(2)}x` : 'N/A',
        subtitle: 'Weekly frequency over ~6 months',
        yAxisWidth: 48,
    },
}

export default function WeeklyChart({ data, loading }) {
    const [selectedMetric, setSelectedMetric] = useState("costPerLinkClick")

    const chartData = useMemo(() => {
        if (!data?.weeklyInsights?.length) return []

        return data.weeklyInsights.map((w) => {
            const d = new Date(w.weekStart + 'T00:00:00')
            const spend = w.spend ?? 0
            const impressions = w.impressions ?? 0
            const linkClicks = w.linkClicks ?? 0

            return {
                label: `${d.getMonth() + 1}/${d.getDate()}`,
                costPerLinkClick: w.costPerLinkClick,
                cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
                linkCtr: impressions > 0 ? (linkClicks / impressions) * 100 : null,
                frequency: w.frequency,
                spend,
                impressions,
                reach: w.reach,
                linkClicks,
            }
        })
    }, [data])

    const selectedMetricConfig = METRIC_OPTIONS[selectedMetric]

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        const row = payload[0]?.payload
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
                <p className="font-semibold text-gray-900 mb-2">Week of {label}</p>
                <div className="space-y-1">
                    <p className="text-gray-600">
                        {selectedMetricConfig.label}:{" "}
                        <span className="font-medium" style={{ color: selectedMetricConfig.color }}>
                            {selectedMetricConfig.valueFormatter(row?.[selectedMetric])}
                        </span>
                    </p>
                    <div className="border-t border-gray-100 mt-1.5 pt-1.5">
                        <p className="text-gray-600">Spend: <span className="font-medium">${row.spend?.toFixed(2)}</span></p>
                        <p className="text-gray-600">Impressions: <span className="font-medium">{(row.impressions || 0).toLocaleString()}</span></p>
                        <p className="text-gray-600">Reach: <span className="font-medium">{(row.reach || 0).toLocaleString()}</span></p>
                        <p className="text-gray-600">Link Clicks: <span className="font-medium">{(row.linkClicks || 0).toLocaleString()}</span></p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <Card className="rounded-2xl border-gray-200">
            <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium text-gray-900">Weekly Account Metrics</p>
                        <p className="text-xs text-gray-400">{selectedMetricConfig.subtitle}</p>
                    </div>
                    <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                        <SelectTrigger className="h-8 w-[190px] rounded-xl border-gray-200 bg-white text-xs font-medium shadow-sm">
                            <SelectValue placeholder="Select metric" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl bg-white">
                            <SelectItem value="costPerLinkClick">Cost Per Link Click</SelectItem>
                            <SelectItem value="cpm">CPM</SelectItem>
                            <SelectItem value="linkCtr">Link Click-Through Rate</SelectItem>
                            <SelectItem value="frequency">Frequency</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-[220px]">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">
                        No weekly data available
                    </div>
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e5e7eb' }}
                                    interval={Math.max(Math.floor(chartData.length / 8), 1)}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => selectedMetricConfig.tickFormatter(value)}
                                    width={selectedMetricConfig.yAxisWidth}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey={selectedMetric}
                                    name={selectedMetricConfig.label}
                                    stroke={selectedMetricConfig.color}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0, fill: selectedMetricConfig.color }}
                                    connectNulls
                                />
                            </LineChart>
                        </ResponsiveContainer>

                        <div className="mt-3 flex items-center gap-2">
                            <span
                                className="h-[3px] w-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: selectedMetricConfig.color }}
                            />
                            <span className="text-[11px] font-medium" style={{ color: selectedMetricConfig.color }}>
                                {selectedMetricConfig.label}
                            </span>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
