
"use client"

/* eslint-disable react/prop-types */

import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    Loader2, XCircle, Activity, Pause,
    CheckCircle2, AlertTriangle, Zap, ChevronDown, RefreshCw, RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogOverlay,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import scaleIcon from "@/assets/icons/analytics/recommendations/scale.svg"
import reduceIcon from "@/assets/icons/analytics/recommendations/reduce.svg"
import pauseIcon from "@/assets/icons/analytics/recommendations/pause.svg"
import consolidateIcon from "@/assets/icons/analytics/recommendations/Consolidate.svg"
import trendAlertIcon from "@/assets/icons/analytics/recommendations/trend_alert.svg"
import scaleWinnerIcon from "@/assets/icons/analytics/recommendations/Scale_Winner.svg"
import fatigueIcon from "@/assets/icons/analytics/recommendations/Fatigue.svg"
import spendShiftIcon from "@/assets/icons/analytics/recommendations/Spend_Shift.svg"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

function getDismissedStorageKey(adAccountId, mode) {
    return `analytics-dismissed-recommendations:${adAccountId}:${mode}`
}

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
function BoldedMessage({ text, emphasisClassName = "text-gray-900" }) {
    if (!text) return null
    // Match: $123.45, $123, 50%, 50.5%, 2.5x, 3x, and parenthetical amounts like ($30)
    const parts = text.split(/(\$[\d,]+(?:\.\d+)?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?x\b)/gi)
    return (
        <span>
            {parts.map((part, i) =>
                /^(\$[\d,]+(?:\.\d+)?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?x)$/i.test(part)
                    ? <strong key={i} className={cn("font-semibold", emphasisClassName)}>{part}</strong>
                    : <span key={i}>{part}</span>
            )}
        </span>
    )
}

// ── Type config for budget recommendation cards ─────────
const TYPE_CONFIG = {
    scale: {
        color: 'green', bgClass: 'border-green-400 bg-green-50/30', badgeBg: 'bg-green-100 text-green-700 border-green-200',
        btnClass: 'bg-green-600 hover:bg-green-700', titleText: 'text-green-900', bodyText: 'text-green-900/70',
        metaText: 'text-green-900', subtleText: 'text-green-700', badgeLabelBg: 'bg-green-100 text-green-900 border-green-200',
        iconSrc: scaleIcon, label: 'Scale',
    },
    reduce: {
        color: 'yellow', bgClass: 'border-yellow-400 bg-yellow-50/30', badgeBg: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        btnClass: 'bg-yellow-500 text-white hover:bg-yellow-600', titleText: 'text-yellow-900', bodyText: 'text-yellow-900/70',
        metaText: 'text-yellow-900', subtleText: 'text-yellow-700', badgeLabelBg: 'bg-yellow-100 text-yellow-900 border-yellow-200',
        iconSrc: reduceIcon, label: 'Reduce',
    },
    pause: {
        color: 'red', bgClass: 'border-red-400 bg-red-50/80', badgeBg: 'bg-red-100 text-red-700 border-red-200',
        btnClass: 'bg-red-600 hover:bg-red-700', titleText: 'text-red-900', bodyText: 'text-red-900/70',
        metaText: 'text-red-900', subtleText: 'text-red-700', badgeLabelBg: 'bg-red-100 text-red-900 border-red-200',
        iconSrc: pauseIcon, label: 'Pause',
    },
    scale_winner: {
        color: 'blue', bgClass: ' border-sky-400 bg-sky-100/30', badgeBg: 'bg-blue-100 text-blue-700 border-blue-200',
        btnClass: 'bg-blue-600 hover:bg-blue-700', titleText: 'text-blue-900', bodyText: 'text-blue-900/70',
        metaText: 'text-blue-900', subtleText: 'text-blue-700', badgeLabelBg: 'bg-blue-100 text-blue-900 border-blue-200',
        iconSrc: scaleWinnerIcon, label: 'Scale Winner',
    },
    consolidate: {
        color: 'orange', bgClass: 'border-orange-400 bg-orange-50/80', badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',
        btnClass: 'bg-orange-600 hover:bg-orange-700', titleText: 'text-orange-900', bodyText: 'text-orange-900/70',
        metaText: 'text-orange-900', subtleText: 'text-orange-700', badgeLabelBg: 'bg-orange-100 text-orange-900 border-orange-200',
        iconSrc: consolidateIcon, label: 'Consolidate',
    },
    creative_fatigue: {
        color: 'orange', bgClass: 'border-orange-400 bg-orange-50/80', badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',
        btnClass: 'bg-orange-600 hover:bg-orange-700', titleText: 'text-orange-900', bodyText: 'text-orange-900/70',
        metaText: 'text-orange-900', subtleText: 'text-orange-700', badgeLabelBg: 'bg-orange-100 text-orange-900 border-orange-200',
        iconSrc: fatigueIcon, label: 'Creative Fatigue',
    },
    trend_alert: {
        color: 'amber',
        bgClass: 'border-amber-400 bg-amber-50/80',
        badgeBg: 'bg-amber-100 text-amber-700 border-amber-200',
        titleText: 'text-amber-900',
        bodyText: 'text-amber-900',
        metaText: 'text-amber-800',
        subtleText: 'text-amber-700',
        badgeLabelBg: 'bg-amber-100 text-amber-900 border-amber-200',
        btnClass: '',
        iconSrc: trendAlertIcon,
        label: 'Alert',
    },
    spend_shift: {
        color: 'amber',
        bgClass: 'border-amber-400 bg-amber-50/80',
        badgeBg: 'bg-amber-100 text-amber-700 border-amber-200',
        titleText: 'text-amber-900',
        bodyText: 'text-amber-900',
        metaText: 'text-amber-800',
        subtleText: 'text-amber-700',
        badgeLabelBg: 'bg-amber-100 text-amber-900 border-amber-200',
        btnClass: '',
        iconSrc: spendShiftIcon,
        label: 'Spend Shift',
    },
}

const SEVERITY_PILL = {
    low: 'bg-amber-100 text-amber-900 border-amber-200',
    medium: 'bg-orange-100 text-orange-900 border-orange-200',
    high: 'bg-red-100 text-red-900 border-red-200',
}

/**
 * RecommendationCards
 *
 * Props:
 *  - section: 'budget' | 'poor-performers'
 *  - data: recommendations API response { recommendations, accountAverageCPA, accountAverageROAS, primaryResultType }
 *  - loading: boolean for recommendations
 *  - mode: 'cpr' | 'roas'
 *  - adAccountId: string
 *  - adAccounts: array
 *  - poorAdsData: poor performing ads API response { ads, accountAverageCPA, primaryActionType }
 *  - poorAdsLoading: boolean
 */


function formatEventName(actionType) {
    if (!actionType) return 'Unknown';
    if (actionType.startsWith('offsite_conversion.fb_pixel_custom.')) {
        return actionType.slice('offsite_conversion.fb_pixel_custom.'.length)
            .replace(/\b\w/g, c => c.toUpperCase());
    }
    if (actionType === 'offsite_conversion.fb_pixel_custom') return 'Custom Event';
    if (actionType.startsWith('offsite_conversion.custom.')) return 'Custom Conversion';
    if (actionType.startsWith('offsite_conversion.fb_pixel_')) {
        return actionType.slice('offsite_conversion.fb_pixel_'.length)
            .replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    return actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}


export default function RecommendationCards({
    section = "budget",
    data, loading, mode, adAccountId, adAccounts,
    poorAdsData, poorAdsLoading,
    onRefreshBudgetRecommendations,
    onRefreshPoorAds,
    budgetRefreshing = false,
    budgetRefreshToken = null,
}) {
    const navigate = useNavigate()

    // ── Budget Recommendations State ────────────────────
    const [applyingId, setApplyingId] = useState(null)
    const [dismissed, setDismissed] = useState(new Set())
    const [editedBudgets, setEditedBudgets] = useState({})
    const [confirmDialog, setConfirmDialog] = useState(null) // { rec, action } or { type: 'single'|'bulk', ad?, count? }
    const [scaleWinnersExpanded, setScaleWinnersExpanded] = useState(false)
    const [fatigueExpanded, setFatigueExpanded] = useState(false)
    const [selectedScaleWinners, setSelectedScaleWinners] = useState(new Set()) // recKeys
    const [showDismissed, setShowDismissed] = useState(false)

    // ── Poor Performing Ads State ───────────────────────
    const [selected, setSelected] = useState(new Set())
    const [pausingId, setPausingId] = useState(null)
    const [pausedIds, setPausedIds] = useState(new Set())

    useEffect(() => {
        setApplyingId(null)
        setEditedBudgets({})
        setConfirmDialog(null)
        setScaleWinnersExpanded(false)
        setFatigueExpanded(false)
        setSelected(new Set())
        setPausingId(null)
        setPausedIds(new Set())
        setSelectedScaleWinners(new Set())
        setShowDismissed(false)
    }, [adAccountId, section, mode])

    useEffect(() => {
        if (section !== "budget" || !adAccountId || typeof window === "undefined") {
            setDismissed(new Set())
            return
        }

        try {
            const rawDismissed = window.sessionStorage.getItem(getDismissedStorageKey(adAccountId, mode))
            const parsedDismissed = rawDismissed ? JSON.parse(rawDismissed) : []
            setDismissed(new Set(Array.isArray(parsedDismissed) ? parsedDismissed : []))
        } catch {
            setDismissed(new Set())
        }
    }, [adAccountId, mode, section])

    useEffect(() => {
        if (section !== "budget" || !adAccountId || !budgetRefreshToken || typeof window === "undefined") return
        if (!budgetRefreshToken.startsWith(`${adAccountId}:`)) return

        setDismissed(new Set())
        setSelectedScaleWinners(new Set())

        try {
            window.sessionStorage.removeItem(getDismissedStorageKey(adAccountId, mode))
        } catch {
            // Ignore storage failures and keep the in-memory fallback.
        }
    }, [section, adAccountId, mode, budgetRefreshToken])

    // ── Budget Recommendations Logic ────────────────────
    function recKey(r) {
        return `${r.adId || r.adsetId || r.campaignId}-${r.type}`
    }

    const recs = useMemo(() => {
        if (!data?.recommendations) return []
        return data.recommendations.filter(r => !dismissed.has(recKey(r)))
    }, [data, dismissed])

    const dismissedRecs = useMemo(() => {
        if (!data?.recommendations) return []
        return data.recommendations.filter(r => dismissed.has(recKey(r)))
    }, [data, dismissed])

    const persistDismissed = (nextSet) => {
        try {
            window.sessionStorage.setItem(
                getDismissedStorageKey(adAccountId, mode),
                JSON.stringify([...nextSet])
            )
        } catch { /* keep in-memory fallback */ }
    }

    const handleRestore = (rec) => {
        setDismissed(prev => {
            const next = new Set(prev)
            next.delete(recKey(rec))
            persistDismissed(next)
            return next
        })
    }

    const handleDismiss = (rec) => {
        setDismissed(prev => {
            const next = new Set([...prev, recKey(rec)])
            try {
                window.sessionStorage.setItem(
                    getDismissedStorageKey(adAccountId, mode),
                    JSON.stringify([...next])
                )
            } catch { /* keep in-memory fallback */ }
            return next
        })
    }

    const handleApply = async (rec) => {
        const key = recKey(rec)

        // Safety: don't send API calls for non-actionable recs
        if (rec.level === 'account' || rec.type === 'consolidate' || rec.type === 'trend_alert' || rec.type === 'creative_fatigue' || rec.type === 'spend_shift') {
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

    // ── Scale Winners Multi-Select ──────────────────────
    const scaleWinnerRecs = useMemo(
        () => recs.filter(r => r.type === 'scale_winner'),
        [recs]
    )
    const selectableWinners = useMemo(
        () => scaleWinnerRecs.filter(r => r.post_id),
        [scaleWinnerRecs]
    )

    const showWinnerCheckboxes = selectedScaleWinners.size > 0 && selectableWinners.length >= 2

    const allWinnersSelected =
        selectableWinners.length > 0 &&
        selectableWinners.every(r => selectedScaleWinners.has(recKey(r)))
    const someWinnersSelected =
        selectedScaleWinners.size > 0 && !allWinnersSelected

    const toggleWinnerSelection = (rec) => {
        if (!rec.post_id) return
        setSelectedScaleWinners(prev => {
            const next = new Set(prev)
            const k = recKey(rec)
            if (next.has(k)) next.delete(k)
            else next.add(k)
            return next
        })
    }

    const toggleSelectAllWinners = () => {
        if (allWinnersSelected) {
            setSelectedScaleWinners(new Set())
        } else {
            setSelectedScaleWinners(new Set(selectableWinners.map(r => recKey(r))))
        }
    }

    const clearWinnerSelection = () => setSelectedScaleWinners(new Set())

    const launchSelectedWinners = () => {
        if (selectedScaleWinners.size === 0 || !adAccountId) return

        const launched = selectableWinners.filter(r =>
            selectedScaleWinners.has(recKey(r))
        )
        const payload = launched.map(r => ({
            id: r.id || r.adId,
            ad_id: r.ad_id || r.adId,
            ad_name: r.ad_name || r.adName,
            post_id: r.post_id,
            image_url: r.image_url || null,
        }))

        // Dismiss the chosen winners so they don't reappear next visit;
        // they remain accessible via the "Show dismissed recommendations" toggle.
        setDismissed(prev => {
            const next = new Set([...prev, ...launched.map(r => recKey(r))])
            persistDismissed(next)
            return next
        })
        setSelectedScaleWinners(new Set())

        navigate('/', {
            state: { scaleWinners: payload, adAccountId },
        })
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
        } catch {
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

    const getAdsManagerAdUrl = ({ adId, adsetId }) => {
        if (!adAccountId || !adId || !adsetId) return null

        const account = adAccounts?.find((entry) => entry.id === adAccountId)
        const bizId = account?.business_id
        const params = new URLSearchParams({
            act: adAccountId,
            selected_adset_ids: String(adsetId),
            selected_ad_ids: String(adId),
        })

        if (bizId) {
            params.set("business_id", bizId)
            params.set("global_scope_id", bizId)
        }

        return `https://adsmanager.facebook.com/adsmanager/manage/ads/edit/standalone?${params.toString()}`
    }

    const openAdInAdsManager = ({ adId, adsetId }) => {
        const url = getAdsManagerAdUrl({ adId, adsetId })
        if (!url) {
            toast.error("Unable to open this ad in Ads Manager")
            return
        }

        window.open(url, "_blank", "noopener,noreferrer")
    }

    const renderRecCard = (rec, { neutralStyle = false, forDismissedList = false } = {}) => {
        const key = recKey(rec)
        const baseCfg = TYPE_CONFIG[rec.type] || TYPE_CONFIG.reduce
        const cfg = (neutralStyle && (rec.type === 'scale_winner' || rec.type === 'creative_fatigue')) ? {
            ...baseCfg,
            bgClass: 'border-gray-200 bg-white',
            badgeBg: 'bg-gray-100 text-gray-600 border-gray-200',
            titleText: 'text-gray-900',
            bodyText: 'text-gray-900',
            metaText: 'text-gray-700',
            subtleText: 'text-gray-600',
            badgeLabelBg: 'bg-gray-100 text-gray-900 border-gray-200',
            btnClass: 'bg-gray-700 hover:bg-gray-800',
        } : baseCfg
        const applying = applyingId === key

        const suggestedBudget = rec.budgetChange && (rec.dailyBudget || rec.lifetimeBudget)
            ? (rec.dailyBudget || rec.lifetimeBudget) * (1 + rec.budgetChange / 100)
            : null

        const isSelectableWinner = rec.type === 'scale_winner' && !!rec.post_id && !forDismissedList
        const isSelected = isSelectableWinner && selectedScaleWinners.has(key)
        const showCardCheckbox = isSelectableWinner && showWinnerCheckboxes

        return (
            <Card key={key} className={cn(
                "rounded-3xl",
                cfg.bgClass,
                isSelected && "ring-2 ring-blue-500"
            )}>
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            {showCardCheckbox && (
                                <button
                                    onClick={() => toggleWinnerSelection(rec)}
                                    className={cn(
                                        "w-5 h-5 mt-1 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                        isSelected
                                            ? "bg-blue-600 border-blue-600"
                                            : "border-gray-300 hover:border-gray-400 bg-white"
                                    )}
                                    aria-label={isSelected ? "Unselect winner" : "Select winner"}
                                >
                                    {isSelected && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                            )}
                            <img
                                src={cfg.iconSrc}
                                alt=""
                                aria-hidden="true"
                                className="h-[38px] w-[38px] flex-shrink-0"
                                style={{ filter: "drop-shadow(0px 1px 5px rgba(0, 0, 0, 0.15))" }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="min-w-0">
                                    {rec.type === 'scale_winner' && !neutralStyle && (
                                        <Badge className={cn("text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap mb-1 !shadow-none", cfg.badgeLabelBg)}>
                                            Scale Winner
                                        </Badge>
                                    )}
                                    {rec.type === 'creative_fatigue' && !neutralStyle && (
                                        <Badge className={cn("text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap mb-1 !shadow-none", cfg.badgeLabelBg)}>
                                            Creative Fatigue
                                        </Badge>
                                    )}
                                    {rec.type === 'trend_alert' && rec.alertKind && (
                                        <Badge className={cn("text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap mb-1 !shadow-none", cfg.badgeLabelBg)}>
                                            {rec.alertKind === 'rising_frequency' ? 'Rising Frequency' :
                                                rec.alertKind === 'falling_ctr' ? 'Falling CTR' :
                                                    rec.alertKind === 'rising_cpm' ? 'Rising CPM' :
                                                        rec.alertKind === 'falling_cr' ? 'Falling Conversion Rate' :
                                                            'Trend Alert'}
                                        </Badge>
                                    )}
                                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                        <p className={cn("font-bold text-sm break-words line-clamp-2 min-w-0", cfg.titleText)}>
                                            {(rec.type === 'scale_winner' || rec.type === 'creative_fatigue')
                                                ? rec.adName
                                                : rec.type === 'spend_shift'
                                                    ? `${rec.segmentType === 'age' ? 'Age Range' : 'Placement'} Spend Shift`
                                                    : (rec.adsetName || rec.campaignName)}
                                        </p>
                                        {rec.type === 'spend_shift' && rec.segmentName && (
                                            <Badge variant="outline" className={cn("text-[11px] px-2.5 py-0.5 rounded-full flex-shrink-0", cfg.badgeLabelBg)}>
                                                {rec.segmentName}
                                            </Badge>
                                        )}
                                        {rec.type === 'spend_shift' && rec.severity && (
                                            <Badge className={cn("text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap !shadow-none capitalize flex-shrink-0", SEVERITY_PILL[rec.severity] || SEVERITY_PILL.low)}>
                                                {rec.severity} Severity
                                            </Badge>
                                        )}
                                        {rec.type !== 'scale_winner' && rec.type !== 'creative_fatigue' && rec.type !== 'spend_shift' && (
                                            <Badge variant="outline" className={cn("text-[11px] px-2.5 py-0.5 rounded-full flex-shrink-0", cfg.badgeLabelBg)}>
                                                {rec.type === 'trend_alert' ? 'alert' : rec.level}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <p className={cn("text-sm mt-1", cfg.bodyText)}>
                                    <BoldedMessage text={rec.message} emphasisClassName={cfg.titleText} />
                                </p>

                                {rec.level !== 'campaign' && rec.level !== 'account' && rec.campaignName && (
                                    <p className={cn("text-xs font-semibold mt-1.5", cfg.metaText)}>Campaign: {rec.campaignName}</p>
                                )}

                                {rec.type !== 'pause' && rec.type !== 'scale_winner' && rec.type !== 'trend_alert' && rec.type !== 'creative_fatigue' && rec.type !== 'spend_shift' && suggestedBudget && (
                                    <div className="flex items-center gap-3 mt-3">
                                        <span className={cn("text-xs", cfg.titleText)}>
                                            Current: <span className="font-medium">${(rec.dailyBudget || rec.lifetimeBudget).toFixed(2)}/day</span>
                                        </span>
                                        <span className={cn("text-xs", cfg.subtleText)}>→</span>
                                        <div className="flex items-center gap-1">
                                            <span className={cn("text-xs", cfg.subtleText)}>New:</span>
                                            <div className="relative">
                                                <span className={cn("absolute left-2 top-1/2 -translate-y-1/2 text-xs", cfg.subtleText)}>$</span>
                                                <input
                                                    type="number"
                                                    value={editedBudgets[key] ?? suggestedBudget.toFixed(2)}
                                                    onChange={(e) => setEditedBudgets(prev => ({ ...prev, [key]: e.target.value }))}
                                                    className={cn(
                                                        "w-24 pl-5 pr-2 py-2.5 text-xs font-medium border rounded-2xl bg-white shadow focus:outline-none focus:ring-2",
                                                        rec.type === 'consolidate'
                                                            ? "border-orange-300 focus:ring-orange-500 text-orange-700"
                                                            : rec.type === 'reduce'
                                                                ? "border-yellow-300 focus:ring-yellow-500 text-yellow-800"
                                                                : "border-green-300 focus:ring-green-500 text-green-700"
                                                    )}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-500">/day</span>
                                            {rec.budgetChange && (
                                                <span className={cn("text-[10px] font-medium",
                                                    rec.budgetChange > 0 ? "text-green-600" : "text-yellow-700"
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
                            {isSelectableWinner && (
                                <Button
                                    size="sm"
                                    onClick={() => toggleWinnerSelection(rec)}
                                    className={cn(
                                        "rounded-xl text-xs",
                                        isSelected
                                            ? "bg-blue-700 hover:bg-blue-800 text-white"
                                            : cfg.btnClass
                                    )}
                                >
                                    {isSelected ? 'Selected' : 'Scale'}
                                </Button>
                            )}
                            {(rec.type === 'trend_alert' || rec.type === 'consolidate' || rec.type === 'spend_shift') ? (
                                null
                            ) : (rec.type === 'scale_winner' || rec.type === 'creative_fatigue') ? (
                                <Button
                                    size="sm"
                                    variant={isSelectableWinner ? 'outline' : 'default'}
                                    onClick={() => openAdInAdsManager({ adId: rec.adId, adsetId: rec.adsetId })}
                                    className={cn(
                                        "rounded-xl text-xs",
                                        !isSelectableWinner && cfg.btnClass
                                    )}
                                >
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
                            {forDismissedList ? (
                                <Button
                                    variant="ghost" size="sm"
                                    onClick={() => handleRestore(rec)}
                                    className="h-8 px-2 text-gray-500 hover:bg-transparent hover:text-blue-600 focus-visible:bg-transparent focus-visible:text-blue-600 text-xs"
                                    title="Restore"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    variant="ghost" size="sm"
                                    onClick={() => handleDismiss(rec)}
                                    className="h-8 w-8 p-0 text-gray-400 hover:bg-transparent hover:text-red-600 focus-visible:bg-transparent focus-visible:text-red-600"
                                    title="Dismiss"
                                >
                                    <XCircle className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8">
            {section === "budget" && (
                <div className="space-y-4">
                    {/* Section header */}
                    <div className="px-1">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-blue-500" />
                                    Budget Recommendations {recs.length > 0 && <span className="text-base font-normal text-gray-400">({recs.length})</span>}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Compares each campaign and ad set&apos;s {mode === 'roas' ? 'ROAS' : 'CPA'} against the
                                    spend-weighted account average over 3-day windows. <br></br>Recommends scaling outperformers
                                    and reducing or pausing underperformers.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onRefreshBudgetRecommendations}
                                disabled={loading || budgetRefreshing}
                                className="rounded-xl h-9 px-3 flex-shrink-0"
                            >
                                <RefreshCw className={cn("w-4 h-4", (loading || budgetRefreshing) && "animate-spin")} />
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <Card className="rounded-2xl">
                            <CardContent className="py-10">
                                <HelixLoader color="#3b82f6" size="36" label="Generating recommendations can take about 10 seconds..." />
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Account average + primary event */}
                            {data && (
                                <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
                                    {data.accountAverageCPA > 0 && mode === 'cpr' && (
                                        <span>Account Avg CPA (3d): <span className="font-medium text-gray-700">${data.accountAverageCPA.toFixed(2)}</span></span>
                                    )}
                                    {data.accountAverageROAS > 0 && mode === 'roas' && (
                                        <span>Account Avg ROAS (3d): <span className="font-medium text-gray-700">{data.accountAverageROAS.toFixed(2)}x</span></span>
                                    )}
                                    {data.primaryResultType && (
                                        <span>Primary Event: <span className="font-medium text-gray-700">{formatEventName(data.primaryResultType)}</span></span>
                                    )}
                                </div>
                            )}

                            {/* Recommendation cards (no filter pills) */}
                            {recs.length === 0 && dismissedRecs.length === 0 ? (
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
                                    {recs.length === 0 && (
                                        <Card className="rounded-2xl border-gray-200">
                                            <CardContent className="py-8">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Activity className="w-10 h-10 text-gray-300" />
                                                    <p className="font-medium text-gray-600">No Recommendations</p>
                                                    <p className="text-sm text-gray-400">Your budgets are performing optimally based on current data</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                    {recs.length > 0 && (() => {
                                        const scaleWinners = recs.filter(r => r.type === 'scale_winner')
                                        const fatigueRecs = recs.filter(r => r.type === 'creative_fatigue')
                                        const otherRecs = recs.filter(r => r.type !== 'scale_winner' && r.type !== 'creative_fatigue')
                                        const groupWinners = scaleWinners.length >= 5
                                        const groupFatigue = fatigueRecs.length > 3

                                        return (
                                            <>
                                                {/* Grouped Scale Winners collapsible card */}
                                                {groupWinners && scaleWinners.length > 0 && (
                                                    <Card className="rounded-2xl border-blue-200 bg-blue-50/30">
                                                        <CardContent className="p-0">
                                                            <div
                                                                role="button"
                                                                tabIndex={0}
                                                                onClick={() => setScaleWinnersExpanded(prev => !prev)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault()
                                                                        setScaleWinnersExpanded(prev => !prev)
                                                                    }
                                                                }}
                                                                className="w-full p-4 flex items-center justify-between gap-3 cursor-pointer"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <img
                                                                        src={scaleWinnerIcon}
                                                                        alt=""
                                                                        aria-hidden="true"
                                                                        className="h-[38px] w-[38px] flex-shrink-0"
                                                                        style={{ filter: "drop-shadow(0px 1px 5px rgba(0, 0, 0, 0.15))" }}
                                                                    />
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
                                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                                    {selectableWinners.length > 0 && (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => { e.stopPropagation(); toggleSelectAllWinners() }}
                                                                                className={cn(
                                                                                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                                                                                    allWinnersSelected
                                                                                        ? "bg-blue-600 border-blue-600"
                                                                                        : someWinnersSelected
                                                                                            ? "bg-blue-200 border-blue-400"
                                                                                            : "border-blue-300 hover:border-blue-500 bg-white"
                                                                                )}
                                                                                aria-label={allWinnersSelected ? "Unselect all winners" : "Select all winners"}
                                                                                title={allWinnersSelected ? "Unselect all" : "Select all"}
                                                                            >
                                                                                {(allWinnersSelected || someWinnersSelected) && (
                                                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                                        {allWinnersSelected
                                                                                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                                            : <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                                                                                        }
                                                                                    </svg>
                                                                                )}
                                                                            </button>
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    if (allWinnersSelected) launchSelectedWinners()
                                                                                    else toggleSelectAllWinners()
                                                                                }}
                                                                                className="rounded-xl text-xs bg-blue-600 hover:bg-blue-700"
                                                                            >
                                                                                {allWinnersSelected ? `Scale ${selectableWinners.length}` : 'Scale Winners'}
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                    <ChevronDown className={cn(
                                                                        "w-5 h-5 text-blue-500 transition-transform",
                                                                        scaleWinnersExpanded && "rotate-180"
                                                                    )} />
                                                                </div>
                                                            </div>

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

                                                {/* Grouped Creative Fatigue collapsible card */}
                                                {groupFatigue && fatigueRecs.length > 0 && (
                                                    <Card className="rounded-2xl border-orange-200 bg-orange-50/30">
                                                        <CardContent className="p-0">
                                                            <button
                                                                onClick={() => setFatigueExpanded(prev => !prev)}
                                                                className="w-full p-4 flex items-center justify-between gap-3"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <img
                                                                        src={fatigueIcon}
                                                                        alt=""
                                                                        aria-hidden="true"
                                                                        className="h-[38px] w-[38px] flex-shrink-0"
                                                                        style={{ filter: "drop-shadow(0px 1px 5px rgba(0, 0, 0, 0.15))" }}
                                                                    />
                                                                    <div className="text-left">
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge className="text-[10px] px-2 py-0.5 rounded-full bg-orange-600 text-white border-orange-600 whitespace-nowrap">
                                                                                Creative Fatigue
                                                                            </Badge>
                                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full bg-orange-100 text-orange-700 border-orange-200">
                                                                                {fatigueRecs.length} ads
                                                                            </Badge>
                                                                        </div>
                                                                        <p className="text-sm text-orange-700 mt-1 font-medium">
                                                                            {fatigueRecs.length} top-spending ads showing creative fatigue — refresh them
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <ChevronDown className={cn(
                                                                    "w-5 h-5 text-orange-500 transition-transform flex-shrink-0",
                                                                    fatigueExpanded && "rotate-180"
                                                                )} />
                                                            </button>

                                                            {fatigueExpanded && (
                                                                <div className="px-4 pb-4 space-y-2 border-t border-orange-100 pt-3">
                                                                    {fatigueRecs.map(rec => renderRecCard(rec, { neutralStyle: true }))}
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {/* Individual fatigue cards when 3 or fewer */}
                                                {!groupFatigue && fatigueRecs.map(rec => renderRecCard(rec))}

                                                {/* All other recommendation cards */}
                                                {otherRecs.map(rec => renderRecCard(rec))}
                                            </>
                                        )
                                    })()}

                                    {/* Dismissed recommendations dropdown */}
                                    {dismissedRecs.length > 0 && (
                                        <div className="pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowDismissed(prev => !prev)}
                                                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                            >
                                                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showDismissed && "rotate-180")} />
                                                Show {dismissedRecs.length} dismissed recommendation{dismissedRecs.length > 1 ? 's' : ''}
                                            </button>
                                            {showDismissed && (
                                                <div className="mt-3 space-y-2 opacity-80">
                                                    {dismissedRecs.map(rec => renderRecCard(rec, { neutralStyle: true, forDismissedList: true }))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {section === "poor-performers" && (
                <div className="space-y-4">
                    <div className="px-1">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    Poor Performers {ads.length > 0 && <span className="text-base font-normal text-gray-400">({ads.length})</span>}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Ads with spend {'>'} 0.5X account average CPA, running 14+ days, and performing below account baseline.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onRefreshPoorAds}
                                disabled={poorAdsLoading}
                                className="rounded-xl h-9 px-3 flex-shrink-0"
                            >
                                <RefreshCw className={cn("w-4 h-4", poorAdsLoading && "animate-spin")} />
                            </Button>
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
                                    Account Avg CPA (14d): <span className="font-medium text-gray-700">${poorAdsData.accountAverageCPA.toFixed(2)}</span>
                                    {poorAdsData.primaryActionType && <span className="ml-3">Primary Event: <span className="font-medium text-gray-700">{formatEventName(poorAdsData.primaryActionType)}</span></span>}
                                </div>
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
                                                        <p className="text-xs text-zinc-400 mt-0.5 break-words line-clamp-1">Campaign: {ad.campaignName}</p>

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
            )}

            {/* Floating pill — appears once a scale winner is selected */}
            {section === 'budget' && selectedScaleWinners.size > 0 && (
                <div className="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-black bg-black px-2 py-2 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-2 px-3.5 py-1.5 text-sm">
                        <span className="whitespace-nowrap">
                            {selectedScaleWinners.size} ad{selectedScaleWinners.size !== 1 ? 's' : ''} selected to scale
                        </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 border-l border-white/30 pl-2">
                        <button
                            type="button"
                            onClick={launchSelectedWinners}
                            className="rounded-full bg-white text-black hover:bg-white/90 px-3.5 py-2 text-sm font-medium whitespace-nowrap transition"
                        >
                            Take to launcher
                        </button>
                        <button
                            type="button"
                            onClick={clearWinnerSelection}
                            className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                            title="Clear selection"
                            aria-label="Clear selection"
                        >
                            <XCircle className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

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
