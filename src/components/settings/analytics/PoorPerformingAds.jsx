"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    Loader2, Pause, Activity, CheckCircle2, AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogOverlay,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function PoorPerformingAds({ data, loading, mode, adAccountId, onApplied }) {
    const [selected, setSelected] = useState(new Set())
    const [pausingId, setPausingId] = useState(null)  // single ad or 'bulk'
    const [confirmDialog, setConfirmDialog] = useState(null) // { type: 'single'|'bulk', ad?, count? }
    const [pausedIds, setPausedIds] = useState(new Set())

    const ads = useMemo(() => {
        if (!data?.ads) return []
        return data.ads.filter(ad => !pausedIds.has(ad.adId))
    }, [data, pausedIds])

    const allSelected = ads.length > 0 && selected.size === ads.length
    const someSelected = selected.size > 0 && selected.size < ads.length

    const toggleSelect = (adId) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(adId)) next.delete(adId)
            else next.add(adId)
            return next
        })
    }

    const toggleSelectAll = () => {
        if (allSelected) setSelected(new Set())
        else setSelected(new Set(ads.map(a => a.adId)))
    }

    const pauseAd = async (adId) => {
        setPausingId(adId)
        setConfirmDialog(null)
        try {
            const res = await fetch(`${API_BASE_URL}/api/analytics/apply-action`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'pause', entityType: 'ad', entityId: adId }),
            })
            const result = await res.json()
            if (result.success) {
                toast.success('Ad paused')
                setPausedIds(prev => new Set([...prev, adId]))
                setSelected(prev => { const next = new Set(prev); next.delete(adId); return next })
            } else {
                toast.error(result.error || 'Failed to pause ad')
            }
        } catch (err) {
            toast.error('Failed to pause ad')
        } finally {
            setPausingId(null)
        }
    }

    const bulkPause = async () => {
        const ids = [...selected]
        if (ids.length === 0) return
        setPausingId('bulk')
        setConfirmDialog(null)

        let success = 0, failed = 0
        for (const adId of ids) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/analytics/apply-action`, {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'pause', entityType: 'ad', entityId: adId }),
                })
                const result = await res.json()
                if (result.success) {
                    success++
                    setPausedIds(prev => new Set([...prev, adId]))
                } else { failed++ }
            } catch { failed++ }
        }

        if (success > 0) toast.success(`Paused ${success} ad${success > 1 ? 's' : ''}`)
        if (failed > 0) toast.error(`Failed to pause ${failed} ad${failed > 1 ? 's' : ''}`)
        setSelected(new Set())
        setPausingId(null)
        if (onApplied) onApplied()
    }

    const getDaysOld = (createdTime) => {
        if (!createdTime) return null
        return Math.round((Date.now() - new Date(createdTime).getTime()) / (1000 * 60 * 60 * 24))
    }

    if (loading) {
        return (
            <Card className="rounded-2xl">
                <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-500">Scanning for poor performing ads...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (ads.length === 0) {
        return (
            <Card className="rounded-2xl border-green-200 bg-green-50/50">
                <CardContent className="py-8">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                        <p className="font-medium text-green-700">No Poor Performers Detected</p>
                        <p className="text-sm text-green-600">All active ads ≥14 days old are performing within acceptable range</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {/* Account average context */}
            {data?.accountAverageCPA > 0 && mode === 'cpr' && (
                <div className="text-xs text-gray-500 px-1">
                    Account Average CPA: <span className="font-medium text-gray-700">${data.accountAverageCPA.toFixed(2)}</span>
                    {data.primaryActionType && <span className="ml-3">Primary Event: <span className="font-medium text-gray-700">{data.primaryActionType}</span></span>}
                </div>
            )}

            {/* Bulk action bar */}
            {selected.size > 0 && (
                <Card className="rounded-2xl border-red-200 bg-red-50/30">
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-red-700">
                                {selected.size} ad{selected.size > 1 ? 's' : ''} selected
                            </span>
                            <Button
                                size="sm"
                                onClick={() => setConfirmDialog({ type: 'bulk', count: selected.size })}
                                disabled={pausingId === 'bulk'}
                                className="rounded-xl bg-red-600 hover:bg-red-700 text-xs"
                            >
                                {pausingId === 'bulk' ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                    <Pause className="w-3 h-3 mr-1" />
                                )}
                                Pause Selected
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Ads list */}
            <div className="space-y-2">
                {/* Select all header */}
                <div className="flex items-center gap-3 px-4 py-2">
                    <button
                        onClick={toggleSelectAll}
                        className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                            allSelected ? "bg-red-600 border-red-600" :
                            someSelected ? "bg-red-200 border-red-400" :
                            "border-gray-300 hover:border-gray-400"
                        )}
                    >
                        {(allSelected || someSelected) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                {allSelected
                                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                                }
                            </svg>
                        )}
                    </button>
                    <span className="text-xs text-gray-500 font-medium">
                        {ads.length} poor performing ad{ads.length > 1 ? 's' : ''} found
                    </span>
                </div>

                {ads.map((ad) => {
                    const daysOld = getDaysOld(ad.createdTime)
                    const isSelected = selected.has(ad.adId)
                    const isPausing = pausingId === ad.adId

                    return (
                        <Card key={ad.adId} className={cn(
                            "rounded-2xl transition-colors",
                            isSelected ? "border-red-300 bg-red-50/20" : "border-gray-200"
                        )}>
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    {/* Checkbox */}
                                    <button
                                        onClick={() => toggleSelect(ad.adId)}
                                        className={cn(
                                            "w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                            isSelected ? "bg-red-600 border-red-600" : "border-gray-300 hover:border-gray-400"
                                        )}
                                    >
                                        {isSelected && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>

                                    {/* Ad info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900 truncate text-sm">{ad.adName}</p>
                                            {daysOld && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full bg-gray-100 text-gray-500 border-gray-200 flex-shrink-0">
                                                    {daysOld}d old
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">Campaign: {ad.campaignName}</p>

                                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                                            <span className="text-xs text-gray-500">
                                                Spend: <span className="font-medium text-gray-700">${ad.spend.toFixed(2)}</span>
                                            </span>
                                            {mode === 'cpr' && (
                                                <span className="text-xs text-gray-500">
                                                    CPA: <span className={cn("font-medium",
                                                        ad.cpa === null ? "text-red-600" : ad.cpa > (data?.accountAverageCPA || 0) ? "text-orange-600" : "text-gray-700"
                                                    )}>
                                                        {ad.cpa !== null ? `$${ad.cpa.toFixed(2)}` : 'No conversions'}
                                                    </span>
                                                </span>
                                            )}
                                            {mode === 'roas' && (
                                                <span className="text-xs text-gray-500">
                                                    ROAS: <span className={cn("font-medium",
                                                        ad.roas === null ? "text-red-600" : ad.roas < 1.0 ? "text-orange-600" : "text-gray-700"
                                                    )}>
                                                        {ad.roas !== null ? `${ad.roas.toFixed(2)}x` : 'No revenue'}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pause button */}
                                    <Button
                                        size="sm" variant="outline"
                                        onClick={() => setConfirmDialog({ type: 'single', ad })}
                                        disabled={isPausing}
                                        className="rounded-xl text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 flex-shrink-0"
                                    >
                                        {isPausing ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <>
                                                <Pause className="w-3 h-3 mr-1" />
                                                Pause
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Confirm dialog */}
            <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
                <DialogOverlay className="bg-black/50" />
                <DialogContent className="sm:max-w-[400px] !rounded-[24px] p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Confirm Pause
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 mt-2">
                        {confirmDialog?.type === 'bulk'
                            ? `Are you sure you want to pause ${confirmDialog.count} selected ad${confirmDialog.count > 1 ? 's' : ''}? This will stop delivery immediately.`
                            : `Are you sure you want to pause "${confirmDialog?.ad?.adName}"? This will stop delivery immediately.`
                        }
                    </p>
                    <DialogFooter className="flex gap-3 mt-4">
                        <Button variant="outline" onClick={() => setConfirmDialog(null)} className="rounded-xl flex-1">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => confirmDialog?.type === 'bulk' ? bulkPause() : pauseAd(confirmDialog.ad.adId)}
                            className="rounded-xl flex-1 bg-red-600 hover:bg-red-700"
                        >
                            Pause {confirmDialog?.type === 'bulk' ? `${confirmDialog.count} Ads` : 'Ad'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
