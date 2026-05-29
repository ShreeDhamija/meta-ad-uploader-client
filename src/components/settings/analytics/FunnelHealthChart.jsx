"use client"

/* eslint-disable react/prop-types */

import { useMemo } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts"
import { formatBucketLabel, formatBucketTooltipTitle } from "./dateRangeUtils"

const METRIC_OPTIONS = {
    frequency: {
        label: 'Frequency',
        color: '#a855f7',
        tickFormatter: (value) => `${value.toFixed(1)}x`,
        valueFormatter: (value) => value !== null && value !== undefined ? `${value.toFixed(2)}x` : 'N/A',
        subtitle: 'Avg impressions per person reached',
        yAxisWidth: 48,
    },
    firstTimeImpressionRate: {
        label: 'First-Time Impression Rate',
        color: '#0ea5e9',
        tickFormatter: (value) => `${value.toFixed(0)}%`,
        valueFormatter: (value) => value !== null && value !== undefined ? `${value.toFixed(1)}%` : 'N/A',
        subtitle: 'Share of impressions hitting new users',
        yAxisWidth: 52,
    },
}

const FUNNEL_CHART_SIDE_INSET = 0

// Both metrics are always shown — the metric selector dropdown was removed.
const SELECTED_METRICS = ["frequency", "firstTimeImpressionRate"]

export default function FunnelHealthChart({ data, loading, className, granularity = 'weekly' }) {
    const selectedMetrics = SELECTED_METRICS

    const chartData = useMemo(() => {
        if (!data?.weeklyInsights?.length) return []

        return data.weeklyInsights.map((w) => {
            const impressions = w.impressions ?? 0
            const reach = w.reach ?? 0

            return {
                label: formatBucketLabel(w.weekStart, granularity),
                tooltipTitle: formatBucketTooltipTitle(w.weekStart, granularity),
                frequency: w.frequency,
                firstTimeImpressionRate: impressions > 0 ? (reach / impressions) * 100 : null,
                impressions,
                reach,
            }
        })
    }, [data, granularity])

    const selectedMetricConfigs = selectedMetrics.map((metricKey) => ({
        key: metricKey,
        ...METRIC_OPTIONS[metricKey],
    }))

    const subtitle = useMemo(() => {
        if (selectedMetricConfigs.length === 1) return selectedMetricConfigs[0].label
        return selectedMetricConfigs.map((metric) => metric.label).join(', ')
    }, [selectedMetricConfigs])

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null
        const row = payload[0]?.payload
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
                <p className="font-semibold text-gray-900 mb-2">{row?.tooltipTitle || row?.label}</p>
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
                        <p className="text-gray-600">Impressions: <span className="font-medium">{(row.impressions || 0).toLocaleString()}</span></p>
                        <p className="text-gray-600">Reach: <span className="font-medium">{(row.reach || 0).toLocaleString()}</span></p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={className ? `p-4 ${className}` : "p-4"}>
            <div className="mb-[22px] flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">Funnel Health</p>
                    <p className="text-xs text-gray-400">{subtitle}</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-[260px]">
                    <Helix size="36" speed="2.5" color="#3b82f6" />
                </div>
            ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">
                    No funnel data available
                </div>
            ) : (
                <>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={chartData} margin={{ top: 5, right: 0, left: -10, bottom: 5 }}>
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

                    <div
                        className="mt-3"
                        style={{
                            paddingLeft: `${FUNNEL_CHART_SIDE_INSET}px`,
                            paddingRight: `${FUNNEL_CHART_SIDE_INSET}px`,
                        }}
                    >
                        <div className="flex flex-wrap items-center justify-start gap-x-12 gap-y-1.5 px-1 w-full">
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
                    </div>
                </>
            )}
        </div>
    )
}
