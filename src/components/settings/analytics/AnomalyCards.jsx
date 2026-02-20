"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    AlertTriangle, CheckCircle2, Loader2, Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function AnomalyCards({ data, loading, thresholds }) {
    if (loading) {
        return (
            <Card className="rounded-2xl">
                <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-500">Analyzing ad performance for anomalies...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const anomalies = data?.anomalies || []
    const nearThreshold = data?.nearThreshold || []

    if (anomalies.length === 0 && nearThreshold.length === 0) {
        return (
            <Card className="rounded-2xl border-green-200 bg-green-50/50">
                <CardContent className="py-8">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                        <p className="font-medium text-green-700">All Clear!</p>
                        <p className="text-sm text-green-600">No anomalies detected in your ad performance</p>
                        {data?.checkedAt && (
                            <p className="text-xs text-gray-400 mt-2">Last checked: {new Date(data.checkedAt).toLocaleString()}</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {/* Summary bar */}
            {data?.summary && (
                <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
                    <span>{data.summary.total} anomal{data.summary.total === 1 ? 'y' : 'ies'} detected</span>
                    {data.summary.critical > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 rounded-full">
                            {data.summary.critical} critical
                        </Badge>
                    )}
                    {data.summary.warning > 0 && (
                        <Badge className="text-[10px] px-1.5 py-0 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-100">
                            {data.summary.warning} warning
                        </Badge>
                    )}
                    {data.checkedAt && (
                        <span className="ml-auto text-gray-400">Checked: {new Date(data.checkedAt).toLocaleTimeString()}</span>
                    )}
                </div>
            )}

            {/* Anomaly cards */}
            {anomalies.map((anomaly, index) => (
                <Card key={anomaly.id || index} className={cn(
                    "rounded-2xl",
                    anomaly.severity === 'critical'
                        ? "border-red-200 bg-red-50/30"
                        : "border-orange-200 bg-orange-50/30"
                )}>
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                    anomaly.severity === 'critical' ? "bg-red-100" : "bg-orange-100"
                                )}>
                                    <AlertTriangle className={cn(
                                        "w-5 h-5",
                                        anomaly.severity === 'critical' ? "text-red-600" : "text-orange-600"
                                    )} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-gray-900">{anomaly.adsetName}</p>
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full bg-gray-100 text-gray-500 border-gray-200">
                                            {anomaly.type === 'cpa_spike' ? 'CPA Spike' : 'Overspend'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-0.5">{anomaly.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">Campaign: {anomaly.campaignName}</p>

                                    <div className="flex items-center gap-4 mt-2">
                                        {anomaly.type === 'cpa_spike' && anomaly.details && (
                                            <>
                                                <span className="text-xs text-gray-500">
                                                    Today: <span className="font-medium text-orange-600">${anomaly.details.todayCPA}</span>
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    7d Avg: <span className="font-medium">${anomaly.details.avgCPA}</span>
                                                </span>
                                                <span className="text-xs font-medium text-red-600">
                                                    +{anomaly.details.changePercent}%
                                                </span>
                                            </>
                                        )}
                                        {anomaly.type === 'overspend' && anomaly.details && (
                                            <>
                                                <span className="text-xs text-gray-500">
                                                    Spent: <span className="font-medium text-orange-600">${anomaly.details.todaySpend}</span>
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    Budget: <span className="font-medium">${anomaly.details.dailyBudget}</span>
                                                </span>
                                                <span className="text-xs font-medium text-red-600">
                                                    +{anomaly.details.overspendPercent}% over
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Badge variant="outline" className={cn(
                                "flex-shrink-0 rounded-full",
                                anomaly.severity === 'critical'
                                    ? "bg-red-100 text-red-700 border-red-200"
                                    : "bg-orange-100 text-orange-700 border-orange-200"
                            )}>
                                {anomaly.severity}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            ))}

            {/* Near-threshold warnings */}
            {nearThreshold.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 px-1 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        Approaching Thresholds
                    </p>
                    {nearThreshold.map((item, i) => (
                        <Card key={i} className="rounded-2xl border-gray-200 bg-gray-50/50">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                        <Eye className="w-4 h-4 text-yellow-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-700 truncate">{item.adsetName}</p>
                                        <p className="text-xs text-gray-500">{item.message}</p>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full bg-yellow-50 text-yellow-700 border-yellow-200 flex-shrink-0">
                                        watching
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
