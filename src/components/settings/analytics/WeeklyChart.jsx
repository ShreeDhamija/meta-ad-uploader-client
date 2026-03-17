
"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, Loader2, CheckCircle2 } from "lucide-react"
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
    const [selectedMetrics, setSelectedMetrics] = useState(["costPerLinkClick", "frequency"])

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

    const selectedMetricConfigs = selectedMetrics.map((metricKey) => ({
        key: metricKey,
        ...METRIC_OPTIONS[metricKey],
    }))

    const dropdownLabel = useMemo(() => {
        if (selectedMetricConfigs.length === 1) return selectedMetricConfigs[0].label
        return `${selectedMetricConfigs.length} metrics`
    }, [selectedMetricConfigs])

    const subtitle = useMemo(() => {
        if (selectedMetricConfigs.length === 1) return selectedMetricConfigs[0].subtitle
        return `${selectedMetricConfigs.map((metric) => metric.label).join(', ')} over ~6 months`
    }, [selectedMetricConfigs])

    const handleMetricToggle = (metricKey, checked) => {
        setSelectedMetrics((prev) => {
            if (checked) {
                if (prev.includes(metricKey)) return prev
                return [...prev, metricKey]
            }

            if (prev.length === 1) return prev
            return prev.filter((key) => key !== metricKey)
        })
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        const row = payload[0]?.payload
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
                <p className="font-semibold text-gray-900 mb-2">Week of {label}</p>
                <div className="space-y-1">
                    {selectedMetricConfigs.map((metric) => (
                        <p key={metric.key} className="text-gray-600">
                            {metric.label}:{" "}
                            <span className="font-medium" style={{ color: metric.color }}>
                                {metric.valueFormatter(row?.[metric.key])}
                            </span>
                        </p>
                    ))}
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
                        <p className="text-sm font-medium text-gray-900">Trailing 6 Month Metrics By Week</p>
                        <p className="text-xs text-gray-400">{subtitle}</p>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-8 min-w-[190px] justify-between rounded-xl border-gray-200 bg-white px-3 text-xs font-medium shadow-sm hover:bg-white"
                            >
                                <span className="truncate">{dropdownLabel}</span>
                                <ChevronDown className="ml-2 h-3.5 w-3.5 text-gray-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[220px] rounded-2xl bg-white p-2 shadow-lg">
                            <DropdownMenuLabel className="px-2 py-1 text-xs font-semibold text-gray-500">
                                Show on graph
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="mx-1 my-1 bg-gray-100" />
                            {Object.entries(METRIC_OPTIONS).map(([metricKey, metric]) => (
                                <DropdownMenuItem
                                    key={metricKey}
                                    onSelect={(e) => e.preventDefault()}
                                    onClick={() => handleMetricToggle(metricKey, !selectedMetrics.includes(metricKey))}
                                    className="cursor-pointer rounded-xl px-3 py-2 text-sm focus:bg-gray-100 flex items-center gap-2"
                                >
                                    {selectedMetrics.includes(metricKey) ? (
                                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                                    ) : (
                                        <span className="h-4 w-4" /> // invisible spacer to keep alignment
                                    )}
                                    {metric.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-[200px]">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">
                        No weekly data available
                    </div>
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e5e7eb' }}
                                    interval={Math.max(Math.floor(chartData.length / 8), 1)}
                                />
                                {selectedMetricConfigs.map((metric, index) => (
                                    <YAxis
                                        key={metric.key}
                                        yAxisId={metric.key}
                                        orientation={index % 2 === 0 ? "left" : "right"}
                                        hide={index > 1}
                                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => metric.tickFormatter(value)}
                                        width={index > 1 ? 0 : metric.yAxisWidth}
                                    />
                                ))}
                                <Tooltip content={<CustomTooltip />} />
                                {selectedMetricConfigs.map((metric) => (
                                    <Line
                                        key={metric.key}
                                        yAxisId={metric.key}
                                        type="monotone"
                                        dataKey={metric.key}
                                        name={metric.label}
                                        stroke={metric.color}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, strokeWidth: 0, fill: metric.color }}
                                        connectNulls
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>

                        <div className="mt-3 grid flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                            {selectedMetricConfigs.map((metric) => (
                                <div key={metric.key} className="flex items-center gap-2">
                                    <span
                                        className="h-[3px] w-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: metric.color }}
                                    />
                                    <span className="text-[11px] font-medium" style={{ color: metric.color }}>
                                        {metric.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
