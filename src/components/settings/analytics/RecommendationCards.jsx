
"use client"

import { useState, useMemo } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    TrendingUp, TrendingDown, Pause, Loader2, XCircle, Activity,
    Star, Eye, CheckCircle2, AlertTriangle, Zap, ChevronDown,
} from "lucide-react"
import { toast } from "sonner"
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogOverlay,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

function HelixLoader({ color = "black", size = "45", label }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <Helix size={size} speed="2.5" color={color} />
            {label ? <p className="text-sm text-gray-500">{label}</p> : null}
        </div>
    )
}

// ── Bold figures in recommendation messages ──────────────
// Wraps $amounts, percentages, and multiplier values in <strong> tags
function BoldedMessage({ text }) {
    if (!text) return null
    // Match: $123.45, $123, 50%, 50.5%, 2.5x, 3x, and parenthetical amounts like ($30)
    const parts = text.split(/(\$[\d,]+(?:\.\d+)?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?x\b)/gi)
    return (
        <span>
            {parts.map((part, i) =>
                /^(\$[\d,]+(?:\.\d+)?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?x)$/i.test(part)
                    ? <strong key={i} className="font-semibold text-gray-900">{part}</strong>
                    : <span key={i}>{part}</span>
            )}
        </span>
    )
}

// ── Type config for budget recommendation cards ─────────
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
        btnClass: 'bg-blue-600 hover:bg-blue-700', Icon: Star, label: 'Scale Winner',
    },
    consolidate: {
        color: 'purple', bgClass: 'border-purple-200 bg-purple-50/30', iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600', badgeBg: 'bg-purple-100 text-purple-700 border-purple-200',
        btnClass: 'bg-purple-600 hover:bg-purple-700', Icon: Activity, label: 'Consolidate',
    },
    trend_alert: {
        color: 'amber',
        bgClass: 'border-amber-200 bg-amber-50/30',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        badgeBg: 'bg-amber-100 text-amber-700 border-amber-200',
        btnClass: '',
        Icon: AlertTriangle,
        label: 'Alert',
    },
}

/**
 * RecommendationCards (merged)
 *
 * Combines budget recommendations and poor performing ads into a single
 * scrollable view. Budget recommendations are shown first with a section
 * header, followed by poor performing ads with their own header.
 *
 * Props:
 *  - data: recommendations API response { recommendations, accountAverageCPA, accountAverageROAS, primaryResultType }
 *  - loading: boolean for recommendations
 *  - mode: 'cpr' | 'roas'
 *  - adAccountId: string
 *  - adAccounts: array
 *  - onApplied: () => void — refresh recommendations
 *  - poorAdsData: poor performing ads API response { ads, accountAverageCPA, primaryActionType }
 *  - poorAdsLoading: boolean
 *  - onPoorAdsApplied: () => void — refresh poor ads
 */
export default function RecommendationCards({
    data, loading, mode, adAccountId, adAccounts, onApplied,
    poorAdsData, poorAdsLoading, onPoorAdsApplied,
}) {
    // ── Budget Recommendations State ────────────────────
    const [applyingId, setApplyingId] = useState(null)
    const [dismissed, setDismissed] = useState(new Set())
    const [editedBudgets, setEditedBudgets] = useState({})
    const [confirmDialog, setConfirmDialog] = useState(null) // { rec, action } or { type: 'single'|'bulk', ad?, count? }
    const [scaleWinnersExpanded, setScaleWinnersExpanded] = useState(false)

    // ── Poor Performing Ads State ───────────────────────
    const [selected, setSelected] = useState(new Set())
    const [pausingId, setPausingId] = useState(null)
    const [pausedIds, setPausedIds] = useState(new Set())

    // ── Budget Recommendations Logic ────────────────────
    function recKey(r) {
        return `${r.adId || r.adsetId || r.campaignId}-${r.type}`
    }

    const recs = useMemo(() => {
        if (!data?.recommendations) return []
        return data.recommendations.filter(r => !dismissed.has(recKey(r)))
    }, [data, dismissed])

    const handleDismiss = (rec) => {
        setDismissed(prev => new Set([...prev, recKey(rec)]))

    }

    const handleApply = async (rec) => {
        const key = recKey(rec)

        // Safety: don't send API calls for non-actionable recs
        if (rec.level === 'account' || rec.type === 'consolidate' || rec.type === 'trend_alert') {
            return
        }

        setApplyingId(key)
        setConfirmDialog(null)

        try {
            let body = { entityType: rec.level, entityId: rec.level === 'campaign' ? rec.campaignId : (rec.adsetId || rec.adId) }

            if (rec.type === 'pause') {
                body.action = 'pause'
            } else if (editedBudgets[key]) {
                const editedValue = parseFloat(editedBudgets[key])
                if (isNaN(editedValue) || editedValue <= 0) {
                    toast.error('Please enter a valid budget amount')
                    setApplyingId(null)
                    return
                }
                body.newBudget = editedValue
                body.budgetType = rec.lifetimeBudget && !rec.dailyBudget ? 'lifetime' : 'daily'
            } else if (rec.budgetChange) {
                const currentBudget = rec.dailyBudget || rec.lifetimeBudget || 0
                if (currentBudget <= 0) {
                    toast.error('Cannot adjust budget — no budget data available')
                    setApplyingId(null)
                    return
                }
                body.action = rec.budgetChange > 0 ? 'increase_budget' : 'decrease_budget'
                body.budgetChangePercent = Math.abs(rec.budgetChange)
                body.currentBudget = currentBudget
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

    // ── Poor Performing Ads Logic ───────────────────────
    const ads = useMemo(() => {
        if (!poorAdsData?.ads) return []
        return poorAdsData.ads.filter(ad => !pausedIds.has(ad.adId))
    }, [poorAdsData, pausedIds])

    const allSelected = ads.length > 0 && selected.size === ads.length
    const someSelected = selected.size > 0 && selected.size < ads.length
    const bulkPauseLabel = `Pause ${selected.size} Selected`

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
        if (onPoorAdsApplied) onPoorAdsApplied()
    }

    const getDaysOld = (createdTime) => {
        if (!createdTime) return null
        return Math.round((Date.now() - new Date(createdTime).getTime()) / (1000 * 60 * 60 * 24))
    }

    const getAvgDailySpend = (spend, createdTime) => {
        if (!spend || !createdTime) return null
        const daysOld = getDaysOld(createdTime)
        if (!daysOld || daysOld <= 0) return null
        const activeDays = Math.min(daysOld, 14)
        return spend / activeDays
    }

    // ── Combined loading state ──────────────────────────
    if (loading && poorAdsLoading) {
        return (
            <Card className="rounded-2xl">
                <CardContent className="py-12">
                    <HelixLoader color="#3b82f6" label="Analyzing your campaigns..." />
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8">

            {/* ════════════════════════════════════════════════
                SECTION 1: BUDGET RECOMMENDATIONS
            ════════════════════════════════════════════════ */}
            <div className="space-y-4">
                {/* Section header */}
                <div className="px-1">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-blue-500" />
                        Budget Recommendations {recs.length > 0 && <span className="text-base font-normal text-gray-400">({recs.length})</span>}

                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Compares each campaign and ad set's {mode === 'roas' ? 'ROAS' : 'CPA'} against the
                        spend-weighted account average over 3-day windows. <br></br>Recommends scaling outperformers
                        and reducing or pausing underperformers.
                    </p>
                </div>

                {loading ? (
                    <Card className="rounded-2xl">
                        <CardContent className="py-10">
                            <HelixLoader color="#3b82f6" size="36" label="Generating recommendations..." />
                        </CardContent>
                    </Card>
                ) : (
                    <>
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
                                    <span>Primary Event: <span className="font-medium text-gray-700">{data.primaryResultType.replace(/^offsite_conversion\.fb_pixel_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span></span>
                                )}
                            </div>
                        )}

                        {/* Recommendation cards (no filter pills) */}
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
                                {(() => {
                                    const scaleWinners = recs.filter(r => r.type === 'scale_winner')
                                    const otherRecs = recs.filter(r => r.type !== 'scale_winner')
                                    const groupWinners = scaleWinners.length >= 5

                                    const renderRecCard = (rec, { neutralStyle = false } = {}) => {
                                        const key = recKey(rec)
                                        const baseCfg = TYPE_CONFIG[rec.type] || TYPE_CONFIG.reduce
                                        const cfg = (neutralStyle && rec.type === 'scale_winner') ? {
                                            ...baseCfg,
                                            bgClass: 'border-gray-200 bg-white',
                                            iconBg: 'bg-gray-100',
                                            iconColor: 'text-gray-500',
                                            badgeBg: 'bg-gray-100 text-gray-600 border-gray-200',
                                            btnClass: 'bg-gray-700 hover:bg-gray-800',
                                        } : baseCfg
                                        const Icon = baseCfg.Icon
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
                                                                <div className="min-w-0">
                                                                    {rec.type === 'scale_winner' && !neutralStyle && (
                                                                        <Badge className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white border-blue-600 whitespace-nowrap mb-1">
                                                                            Scale Winner
                                                                        </Badge>
                                                                    )}
                                                                    {rec.type === 'trend_alert' && rec.alertKind && (
                                                                        <Badge className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white border-amber-500 whitespace-nowrap mb-1">
                                                                            {rec.alertKind === 'rising_frequency' ? 'Rising Frequency' :
                                                                                rec.alertKind === 'falling_ctr' ? 'Falling CTR' :
                                                                                    rec.alertKind === 'rising_cpm' ? 'Rising CPM' :
                                                                                        rec.alertKind === 'falling_cr' ? 'Falling Conversion Rate' :
                                                                                            'Trend Alert'}
                                                                        </Badge>
                                                                    )}
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <p className="font-medium text-gray-900 text-sm break-words line-clamp-2 min-w-0">
                                                                            {rec.type === 'scale_winner' ? rec.adName : (rec.adsetName || rec.campaignName)}
                                                                        </p>
                                                                        {rec.type !== 'scale_winner' && (
                                                                            <Badge variant="outline" className={cn(
                                                                                "text-[10px] px-1.5 py-0 rounded-full flex-shrink-0",
                                                                                rec.type === 'trend_alert'
                                                                                    ? "bg-amber-100 text-amber-700 border-amber-200"
                                                                                    : "bg-gray-100 text-gray-500 border-gray-200"
                                                                            )}>
                                                                                {rec.type === 'trend_alert' ? 'alert' : rec.level}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <p className="text-sm text-gray-600 mt-1">
                                                                    <BoldedMessage text={rec.message} />
                                                                </p>

                                                                {rec.level !== 'campaign' && rec.level !== 'account' && rec.campaignName && (
                                                                    <p className="text-xs text-gray-400 mt-0.5">Campaign: {rec.campaignName}</p>
                                                                )}

                                                                {rec.type !== 'pause' && rec.type !== 'scale_winner' && rec.type !== 'trend_alert' && suggestedBudget && (
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

                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            {(rec.type === 'trend_alert' || rec.type === 'consolidate') ? (
                                                                null
                                                            ) : rec.type === 'scale_winner' ? (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const account = adAccounts?.find(a => a.id === adAccountId);
                                                                        const bizId = account?.business_id || '';
                                                                        const url = `https://adsmanager.facebook.com/adsmanager/manage/ads/edit/standalone?act=${adAccountId}&business_id=${bizId}&global_scope_id=${bizId}&selected_adset_ids=${rec.adsetId}&selected_ad_ids=${rec.adId}`;
                                                                        window.open(url, '_blank');
                                                                    }}
                                                                    className={cn("rounded-xl text-xs", cfg.btnClass)}
                                                                >
                                                                    <Eye className="w-4 h-4 mr-1" />
                                                                    View Ad
                                                                </Button>
                                                            ) : (
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
                                                            )}
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
                                    }

                                    return (
                                        <>
                                            {/* Grouped Scale Winners collapsible card */}
                                            {groupWinners && scaleWinners.length > 0 && (
                                                <Card className="rounded-2xl border-blue-200 bg-blue-50/30">
                                                    <CardContent className="p-0">
                                                        <button
                                                            onClick={() => setScaleWinnersExpanded(prev => !prev)}
                                                            className="w-full p-4 flex items-center justify-between gap-3"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-100">
                                                                    <Star className="w-5 h-5 text-blue-600" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white border-blue-600 whitespace-nowrap">
                                                                            Scale Winners
                                                                        </Badge>
                                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full bg-blue-100 text-blue-700 border-blue-200">
                                                                            {scaleWinners.length} ads
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-sm text-blue-700 mt-1 font-medium">
                                                                        {scaleWinners.length} ads are doing well that you should scale
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <ChevronDown className={cn(
                                                                "w-5 h-5 text-blue-500 transition-transform flex-shrink-0",
                                                                scaleWinnersExpanded && "rotate-180"
                                                            )} />
                                                        </button>

                                                        {scaleWinnersExpanded && (
                                                            <div className="px-4 pb-4 space-y-2 border-t border-blue-100 pt-3">
                                                                {scaleWinners.map(rec => renderRecCard(rec, { neutralStyle: true }))}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {/* Individual scale winners when fewer than 5 */}
                                            {!groupWinners && scaleWinners.map(rec => renderRecCard(rec))}

                                            {/* All other recommendation cards */}
                                            {otherRecs.map(rec => renderRecCard(rec))}
                                        </>
                                    )
                                })()}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ════════════════════════════════════════════════
                SECTION 2: POOR PERFORMING ADS
            ════════════════════════════════════════════════ */}
            <div className="space-y-4">
                {/* Section header — red banner */}
                <div className="px-1">
                    <div className="bg-red-500 rounded-2xl px-5 py-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-white" />
                            Poor Performing Ads {ads.length > 0 && <span className="text-base font-normal text-red-200">({ads.length})</span>}
                        </h2>
                        <p className="text-sm text-red-100 mt-1">
                            Ads with spend {'>'} 0.5X account avg CPA, running 14+ days, performing below average
                        </p>
                    </div>
                </div>

                {(poorAdsLoading || !poorAdsData) ? (
                    <Card className="rounded-2xl">
                        <CardContent className="py-10">
                            <HelixLoader color="#ef4444" size="36" label="Scanning for poor performing ads..." />
                        </CardContent>
                    </Card>
                ) : ads.length === 0 ? (
                    <Card className="rounded-2xl border-green-200 bg-green-50/50">
                        <CardContent className="py-8">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                                <p className="font-medium text-green-700">No Poor Performers Detected</p>
                                <p className="text-sm text-green-600">All active ads ≥14 days old are performing within acceptable range</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Account average context */}
                        {poorAdsData?.accountAverageCPA > 0 && mode === 'cpr' && (
                            <div className="text-xs text-gray-500 px-1">
                                Account Average CPA: <span className="font-medium text-gray-700">${poorAdsData.accountAverageCPA.toFixed(2)}</span>
                                {poorAdsData.primaryActionType && <span className="ml-3">Primary Event: <span className="font-medium text-gray-700">{poorAdsData.primaryActionType.replace(/^offsite_conversion\.fb_pixel_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span></span>}                            </div>
                        )}

                        {/* Ads list */}
                        <div className="space-y-2">
                            {/* Select all header */}
                            <div className="flex items-center justify-between gap-3 px-4 py-2">
                                <div className="flex items-center gap-3 min-w-0">
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
                                        Select {ads.length} poor performing ad{ads.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                                {selected.size > 0 && (
                                    <Button
                                        size="sm"
                                        onClick={() => setConfirmDialog({ type: 'bulk', count: selected.size })}
                                        disabled={pausingId === 'bulk'}
                                        className="rounded-xl bg-red-600 hover:bg-red-700 text-xs text-white flex-shrink-0"
                                    >
                                        {pausingId === 'bulk' ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                        ) : (
                                            <Pause className="w-3 h-3 mr-1" />
                                        )}
                                        {bulkPauseLabel}
                                    </Button>
                                )}
                            </div>

                            {ads.map((ad) => {
                                const daysOld = getDaysOld(ad.createdTime)
                                const avgDailySpend = getAvgDailySpend(ad.spend, ad.createdTime)
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
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <p className="font-medium text-gray-900 text-sm break-words line-clamp-2 min-w-0">{ad.adName}</p>
                                                        {daysOld && (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full bg-gray-100 text-gray-500 border-gray-200 flex-shrink-0">
                                                                {daysOld}d old
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-0.5 break-words line-clamp-1">Campaign: {ad.campaignName}</p>

                                                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                                                        <span className="text-xs text-gray-500">
                                                            Total Spend: <span className="font-medium text-gray-700">${ad.spend.toFixed(2)}</span>
                                                        </span>
                                                        {avgDailySpend !== null && (
                                                            <span className="text-xs text-gray-500">
                                                                Avg Daily: <span className="font-medium text-gray-700">${avgDailySpend.toFixed(2)}/day</span>
                                                            </span>
                                                        )}
                                                        {mode === 'cpr' && (
                                                            <span className="text-xs text-gray-500">
                                                                CPA: <span className={cn("font-medium",
                                                                    ad.cpa === null ? "text-red-600" : ad.cpa > (poorAdsData?.accountAverageCPA || 0) ? "text-orange-600" : "text-gray-700"
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
                                                    size="sm"
                                                    onClick={() => setConfirmDialog({ type: 'single', ad })}
                                                    disabled={isPausing}
                                                    className="rounded-xl text-xs bg-red-600 text-white hover:bg-red-700 flex-shrink-0"
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
                    </>
                )}
            </div>

            {/*
                SHARED CONFIRM DIALOG
                Handles: budget rec pause, single ad pause, bulk ad pause
             */}
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
                            : confirmDialog?.type === 'single'
                                ? `Are you sure you want to pause "${confirmDialog.ad?.adName}"? This will stop delivery immediately.`
                                : confirmDialog?.rec
                                    ? <>Are you sure you want to pause <span className="font-medium">{confirmDialog.rec.adsetName || confirmDialog.rec.campaignName}</span>? This will stop delivery immediately.</>
                                    : ''
                        }
                    </p>
                    <DialogFooter className="flex gap-3 mt-4">
                        <Button variant="outline" onClick={() => setConfirmDialog(null)} className="rounded-xl flex-1">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (confirmDialog?.type === 'bulk') bulkPause()
                                else if (confirmDialog?.type === 'single') pauseAd(confirmDialog.ad.adId)
                                else if (confirmDialog?.rec) handleApply(confirmDialog.rec)
                            }}
                            className="rounded-xl flex-1 bg-red-600 hover:bg-red-700"
                        >
                            {confirmDialog?.type === 'bulk' ? `Pause ${confirmDialog.count} Ads` : 'Pause'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
