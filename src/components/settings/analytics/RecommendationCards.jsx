"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    TrendingUp, TrendingDown, Pause, Loader2, XCircle, Activity, Star,
    ArrowUpRight, ArrowDownRight,
} from "lucide-react"
import { toast } from "sonner"
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogOverlay,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

const TYPE_CONFIG = {
    scale: {
        color: 'green', bgClass: 'border-green-200 bg-green-50/30', iconBg: 'bg-green-100',
        iconColor: 'text-green-600', badgeBg: 'bg-green-100 text-green-700 border-green-200',
        btnClass: 'bg-green-600 hover:bg-green-700', Icon: TrendingUp, label: 'Scale',
    },
    reduce: {
        color: 'orange', bgClass: 'border-orange-200 bg-orange-50/30', iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600', badgeBg: 'bg-orange-100 text-orange-700 border-orange-200',
        btnClass: 'bg-orange-600 hover:bg-orange-700', Icon: TrendingDown, label: 'Reduce',
    },
    pause: {
        color: 'red', bgClass: 'border-red-200 bg-red-50/30', iconBg: 'bg-red-100',
        iconColor: 'text-red-600', badgeBg: 'bg-red-100 text-red-700 border-red-200',
        btnClass: 'bg-red-600 hover:bg-red-700', Icon: Pause, label: 'Pause',
    },
    scale_winner: {
        color: 'blue', bgClass: 'border-blue-200 bg-blue-50/30', iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600', badgeBg: 'bg-blue-100 text-blue-700 border-blue-200',
        btnClass: 'bg-blue-600 hover:bg-blue-700', Icon: Star, label: 'Winner',
    },
}

const FILTER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'scale', label: 'Scale' },
    { key: 'reduce', label: 'Reduce' },
    { key: 'pause', label: 'Pause' },
]

export default function RecommendationCards({ data, loading, mode, adAccountId, onApplied }) {
    const [filter, setFilter] = useState('all')
    const [applyingId, setApplyingId] = useState(null)
    const [dismissed, setDismissed] = useState(new Set())
    const [editedBudgets, setEditedBudgets] = useState({})
    const [confirmDialog, setConfirmDialog] = useState(null) // { rec, action }

    const recs = useMemo(() => {
        if (!data?.recommendations) return []
        return data.recommendations.filter(r => {
            if (dismissed.has(recKey(r))) return false
            if (filter === 'all') return true
            if (filter === 'scale') return r.type === 'scale' || r.type === 'scale_winner'
            return r.type === filter
        })
    }, [data, filter, dismissed])

    function recKey(r) {
        return `${r.adId || r.adsetId || r.campaignId}-${r.type}`
    }

    const handleDismiss = (rec) => {
        setDismissed(prev => new Set([...prev, recKey(rec)]))
        toast.success('Recommendation dismissed')
    }

    const handleApply = async (rec) => {
        const key = recKey(rec)
        setApplyingId(key)
        setConfirmDialog(null)

        try {
            let body = { entityType: rec.level, entityId: rec.level === 'campaign' ? rec.campaignId : (rec.adsetId || rec.adId) }

            if (rec.type === 'pause') {
                body.action = 'pause'
            } else if (editedBudgets[key]) {
                // User edited the budget directly
                body.newBudget = parseFloat(editedBudgets[key])
                if (isNaN(body.newBudget) || body.newBudget <= 0) {
                    toast.error('Please enter a valid budget amount')
                    setApplyingId(null)
                    return
                }
            } else if (rec.budgetChange) {
                body.action = rec.budgetChange > 0 ? 'increase_budget' : 'decrease_budget'
                body.budgetChangePercent = Math.abs(rec.budgetChange)
                body.currentBudget = rec.dailyBudget || rec.lifetimeBudget || 0
                body.budgetType = rec.lifetimeBudget && !rec.dailyBudget ? 'lifetime' : 'daily'
            }

            const res = await fetch(`${API_BASE_URL}/api/analytics/apply-action`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const result = await res.json()

            if (result.success) {
                toast.success(rec.type === 'pause' ? 'Entity paused successfully' : 'Budget updated successfully')
                setDismissed(prev => new Set([...prev, key]))
                if (onApplied) onApplied()
            } else {
                toast.error(result.error || 'Failed to apply action')
            }
        } catch (err) {
            console.error('Apply error:', err)
            toast.error('Failed to apply action')
        } finally {
            setApplyingId(null)
        }
    }

    const formatMetric = (value, metric) => {
        if (value === null || value === undefined) return 'N/A'
        return metric === 'ROAS' ? `${value.toFixed(2)}x` : `$${value.toFixed(2)}`
    }

    if (loading) {
        return (
            <Card className="rounded-2xl">
                <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-500">Generating recommendations...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {/* Account average + primary event */}
            {data && (
                <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
                    {data.accountAverageCPA > 0 && mode === 'cpr' && (
                        <span>Account Avg CPA: <span className="font-medium text-gray-700">${data.accountAverageCPA.toFixed(2)}</span></span>
                    )}
                    {data.accountAverageROAS > 0 && mode === 'roas' && (
                        <span>Account Avg ROAS: <span className="font-medium text-gray-700">{data.accountAverageROAS.toFixed(2)}x</span></span>
                    )}
                    {data.primaryResultType && (
                        <span>Primary Event: <span className="font-medium text-gray-700">{data.primaryResultType}</span></span>
                    )}
                </div>
            )}

            {/* Filter tabs */}
            {data?.recommendations?.length > 0 && (
                <div className="flex items-center gap-1.5">
                    {FILTER_TABS.map(tab => {
                        const count = tab.key === 'all'
                            ? recs.length
                            : recs.filter(r => tab.key === 'scale' ? (r.type === 'scale' || r.type === 'scale_winner') : r.type === tab.key).length
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-xl transition-all",
                                    filter === tab.key
                                        ? "bg-gray-900 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                )}
                            >
                                {tab.label} {count > 0 && `(${count})`}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Recommendation cards */}
            {recs.length === 0 ? (
                <Card className="rounded-2xl border-gray-200">
                    <CardContent className="py-8">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <Activity className="w-10 h-10 text-gray-300" />
                            <p className="font-medium text-gray-600">No Recommendations</p>
                            <p className="text-sm text-gray-400">Your budgets are performing optimally based on current data</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {recs.map((rec) => {
                        const key = recKey(rec)
                        const cfg = TYPE_CONFIG[rec.type] || TYPE_CONFIG.reduce
                        const Icon = cfg.Icon
                        const applying = applyingId === key

                        const suggestedBudget = rec.budgetChange && (rec.dailyBudget || rec.lifetimeBudget)
                            ? (rec.dailyBudget || rec.lifetimeBudget) * (1 + rec.budgetChange / 100)
                            : null

                        return (
                            <Card key={key} className={cn("rounded-2xl", cfg.bgClass)}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", cfg.iconBg)}>
                                                <Icon className={cn("w-5 h-5", cfg.iconColor)} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {/* Entity name */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-medium text-gray-900 truncate">
                                                        {rec.type === 'scale_winner' ? rec.adName : (rec.adsetName || rec.campaignName)}
                                                    </p>
                                                    {/* <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 rounded-full", cfg.badgeBg)}>
                                                        {cfg.label}
                                                    </Badge> */}
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full bg-gray-100 text-gray-500 border-gray-200">
                                                        {rec.level}
                                                    </Badge>
                                                </div>

                                                {/* Message */}
                                                <p className="text-sm text-gray-600 mt-1">{rec.message}</p>

                                                {/* Campaign breadcrumb for adset/ad level */}
                                                {rec.level !== 'campaign' && rec.campaignName && (
                                                    <p className="text-xs text-gray-400 mt-0.5">Campaign: {rec.campaignName}</p>
                                                )}

                                                {/* Metrics row */}
                                                <div className="flex items-center gap-4 mt-2 flex-wrap">
                                                    <span className="text-xs text-gray-500">
                                                        {rec.metric}: <span className="font-medium">{formatMetric(rec.currentValue, rec.metric)}</span>
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        Avg: <span className="font-medium">{formatMetric(rec.benchmark, rec.metric)}</span>
                                                    </span>
                                                    {rec.spendShare !== undefined && (
                                                        <span className="text-xs text-gray-500">
                                                            Spend Share: <span className="font-medium">{rec.spendShare.toFixed(1)}%</span>
                                                        </span>
                                                    )}
                                                    {rec.spendTrend !== undefined && (
                                                        <span className={cn("text-xs flex items-center gap-0.5",
                                                            rec.spendTrend > 0 ? "text-green-600" : rec.spendTrend < 0 ? "text-red-600" : "text-gray-500"
                                                        )}>
                                                            {rec.spendTrend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                            Spend {rec.spendTrend > 0 ? '+' : ''}{rec.spendTrend.toFixed(0)}%
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Budget edit row (only for non-pause, non-winner with budget) */}
                                                {rec.type !== 'pause' && rec.type !== 'scale_winner' && suggestedBudget && (
                                                    <div className="flex items-center gap-3 mt-3">
                                                        <span className="text-xs text-gray-500">
                                                            Current: <span className="font-medium">${(rec.dailyBudget || rec.lifetimeBudget).toFixed(2)}/day</span>
                                                        </span>
                                                        <span className="text-xs">→</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-gray-500">New:</span>
                                                            <div className="relative">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={editedBudgets[key] ?? suggestedBudget.toFixed(2)}
                                                                    onChange={(e) => setEditedBudgets(prev => ({ ...prev, [key]: e.target.value }))}
                                                                    className={cn(
                                                                        "w-24 pl-5 pr-2 py-1 text-xs font-medium border rounded-lg focus:outline-none focus:ring-2",
                                                                        rec.type === 'scale'
                                                                            ? "border-green-300 focus:ring-green-500 text-green-700"
                                                                            : "border-orange-300 focus:ring-orange-500 text-orange-700"
                                                                    )}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-gray-500">/day</span>
                                                            {rec.budgetChange && (
                                                                <span className={cn("text-[10px] font-medium",
                                                                    rec.budgetChange > 0 ? "text-green-600" : "text-orange-600"
                                                                )}>
                                                                    ({rec.budgetChange > 0 ? '+' : ''}{rec.budgetChange}%)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <Button
                                                size="sm"
                                                onClick={() => rec.type === 'pause'
                                                    ? setConfirmDialog({ rec, action: 'pause' })
                                                    : handleApply(rec)
                                                }
                                                disabled={applying}
                                                className={cn("rounded-xl text-xs", cfg.btnClass)}
                                            >
                                                {applying ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    cfg.label

                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost" size="sm"
                                                onClick={() => handleDismiss(rec)}
                                                className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Pause confirmation dialog */}
            <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
                <DialogOverlay className="bg-black/50" />
                <DialogContent className="sm:max-w-[400px] !rounded-[24px] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg">Confirm Pause</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 mt-2">
                        Are you sure you want to pause <span className="font-medium">{confirmDialog?.rec?.adsetName || confirmDialog?.rec?.campaignName}</span>?
                        This will stop delivery immediately.
                    </p>
                    <DialogFooter className="flex gap-3 mt-4">
                        <Button variant="outline" onClick={() => setConfirmDialog(null)} className="rounded-xl flex-1">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => handleApply(confirmDialog.rec)}
                            className="rounded-xl flex-1 bg-red-600 hover:bg-red-700"
                        >
                            Pause
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
