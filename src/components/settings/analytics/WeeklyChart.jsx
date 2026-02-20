"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from "recharts"

export default function WeeklyChart({ data, loading }) {
    const chartData = useMemo(() => {
        if (!data?.weeklyInsights?.length) return []

        return data.weeklyInsights.map((w) => {
            const d = new Date(w.weekStart + 'T00:00:00')
            return {
                label: `${d.getMonth() + 1}/${d.getDate()}`,
                spend: w.spend,
                costPerLinkClick: w.costPerLinkClick,
                impressions: w.impressions,
                reach: w.reach,
                linkClicks: w.linkClicks,
                frequency: w.frequency,
            }
        })
    }, [data])

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        const row = payload[0]?.payload
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
                <p className="font-semibold text-gray-900 mb-2">Week of {label}</p>
                <div className="space-y-1">
                    <p className="text-gray-600">Spend: <span className="font-medium text-blue-600">${row.spend?.toFixed(2)}</span></p>
                    <p className="text-gray-600">Cost/Link Click: <span className="font-medium text-purple-600">${row.costPerLinkClick?.toFixed(2) || 'N/A'}</span></p>
                    <p className="text-gray-600">Impressions: <span className="font-medium">{(row.impressions || 0).toLocaleString()}</span></p>
                    <p className="text-gray-600">Reach: <span className="font-medium">{(row.reach || 0).toLocaleString()}</span></p>
                    <p className="text-gray-600">Link Clicks: <span className="font-medium">{(row.linkClicks || 0).toLocaleString()}</span></p>
                    {row.frequency && <p className="text-gray-600">Frequency: <span className="font-medium">{row.frequency.toFixed(2)}</span></p>}
                </div>
            </div>
        )
    }

    return (
        <Card className="rounded-2xl border-gray-200">
            <CardContent className="p-4">
                <div className="mb-3">
                    <p className="text-sm font-medium text-gray-900">Weekly Account Metrics</p>
                    <p className="text-xs text-gray-400">Spend and cost per link click over ~3 months</p>
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
                    <ResponsiveContainer width="100%" height={220}>
                        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e5e7eb' }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                yAxisId="spend"
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                tickLine={false} axisLine={false}
                                tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`}
                                width={60}
                            />
                            <YAxis
                                yAxisId="cplc"
                                orientation="right"
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                tickLine={false} axisLine={false}
                                tickFormatter={(v) => `$${v.toFixed(2)}`}
                                width={50}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar
                                yAxisId="spend" dataKey="spend" name="Weekly Spend"
                                fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6"
                                strokeWidth={1} radius={[4, 4, 0, 0]}
                            />
                            <Line
                                yAxisId="cplc" type="monotone" dataKey="costPerLinkClick" name="Cost/Link Click"
                                stroke="#a855f7" strokeWidth={2} dot={false}
                                activeDot={{ r: 4, strokeWidth: 0, fill: '#a855f7' }}
                                connectNulls
                            />
                            <Legend
                                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                                iconSize={12}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    )
}
