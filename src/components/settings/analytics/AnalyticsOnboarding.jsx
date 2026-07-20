"use client"

/* eslint-disable react/prop-types */

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, ChevronDown, ChevronUp, Check, Target } from "lucide-react"
import { toast } from "sonner"
import { saveSettings } from "@/lib/saveSettings"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

/**
 * AnalyticsOnboarding
 *
 * Shows on first login (when hasSeenAnalyticsOnboarding is false).
 * Lets user configure each ad account as CPA or ROAS focused, pick a conversion
 * event (CPA), and set a benchmark Target KPI — all saved per ad account.
 *
 * Rendered as a plain centered overlay (no shadcn Dialog) to avoid the slide-in
 * animation and centering offset; matches the Optimization Focus popup style.
 *
 * Props:
 *  - open: boolean
 *  - onComplete: (savedSettingsByAccount?: object) => void  — called after saving/dismissing
 *  - adAccounts: array of { id, name }
 */
export default function AnalyticsOnboarding({ open, onComplete, adAccounts }) {
    // Per-account config:
    //   { [accountId]: { mode: 'roas' | 'cpa', conversionEvent: string|null,
    //                    targetCPA: string, targetROAS: string } }
    const [accountConfigs, setAccountConfigs] = useState({})
    const [expandedAccount, setExpandedAccount] = useState(null)

    // Conversion events cache: { [accountId]: { loading, events, error } }
    const [eventsCache, setEventsCache] = useState({})

    const [saving, setSaving] = useState(false)

    // Initialize defaults (ROAS for all)
    useEffect(() => {
        if (open && adAccounts?.length > 0) {
            const initial = {}
            for (const acct of adAccounts) {
                initial[acct.id] = { mode: 'roas', conversionEvent: null, targetCPA: '', targetROAS: '' }
            }
            setAccountConfigs(initial)
            // Auto-expand first account
            if (adAccounts.length === 1) {
                setExpandedAccount(adAccounts[0].id)
            }
        }
    }, [open, adAccounts])

    const fetchConversionEvents = useCallback(async (accountId) => {
        if (eventsCache[accountId]?.events) return // already loaded

        setEventsCache(prev => ({
            ...prev,
            [accountId]: { loading: true, events: null, error: null },
        }))

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/analytics/conversion-events?adAccountId=${accountId}`,
                { credentials: 'include' }
            )
            const data = await res.json()

            if (res.ok) {
                setEventsCache(prev => ({
                    ...prev,
                    [accountId]: { loading: false, events: data.events || [], error: null },
                }))

                // Auto-select the top event if user is in CPA mode and hasn't picked one yet
                if (data.events?.length > 0) {
                    setAccountConfigs(prev => {
                        const current = prev[accountId]
                        if (current && current.mode === 'cpa' && !current.conversionEvent) {
                            return {
                                ...prev,
                                [accountId]: { ...current, conversionEvent: data.events[0].event },
                            }
                        }
                        return prev
                    })
                }
            } else {
                setEventsCache(prev => ({
                    ...prev,
                    [accountId]: { loading: false, events: [], error: data.error },
                }))
            }
        } catch (err) {
            console.error('Failed to fetch conversion events:', err)
            setEventsCache(prev => ({
                ...prev,
                [accountId]: { loading: false, events: [], error: err.message },
            }))
        }
    }, [eventsCache])

    const handleToggleMode = (accountId, isRoas) => {
        const mode = isRoas ? 'roas' : 'cpa'
        setAccountConfigs(prev => {
            const updated = { ...prev[accountId], mode }
            // Auto-select top event when switching to CPA if cache is already loaded
            if (!isRoas && !updated.conversionEvent && eventsCache[accountId]?.events?.length > 0) {
                updated.conversionEvent = eventsCache[accountId].events[0].event
            }
            return { ...prev, [accountId]: updated }
        })

        // Fetch events when switching to CPA
        if (!isRoas) {
            fetchConversionEvents(accountId)
        }
    }

    const handleSelectEvent = (accountId, event) => {
        setAccountConfigs(prev => ({
            ...prev,
            [accountId]: { ...prev[accountId], conversionEvent: event },
        }))
    }

    const handleSetTarget = (accountId, value) => {
        setAccountConfigs(prev => {
            const current = prev[accountId]
            const key = current.mode === 'roas' ? 'targetROAS' : 'targetCPA'
            return { ...prev, [accountId]: { ...current, [key]: value } }
        })
    }

    const handleExpandAccount = (accountId) => {
        const isExpanding = expandedAccount !== accountId
        setExpandedAccount(isExpanding ? accountId : null)

        // Pre-fetch events when expanding
        if (isExpanding && accountConfigs[accountId]?.mode === 'cpa') {
            fetchConversionEvents(accountId)
        }
    }

    // Mark onboarding seen + close (used by X, click-outside, and Skip).
    const markSeenAndClose = useCallback(async () => {
        try {
            await saveSettings({ globalSettings: { hasSeenAnalyticsOnboarding: true } })
            window.dispatchEvent(new Event('globalSettingsUpdated'))
        } catch (err) {
            console.error('Failed to mark onboarding as seen:', err)
        }
        onComplete()
    }, [onComplete])

    const getSettingsForAccount = (config) => {
        const isCpa = config.mode === 'cpa'
        return {
            analyticsMode: config.mode,
            conversionEvent: isCpa ? config.conversionEvent : null,
            targetCPA: isCpa && config.targetCPA ? parseFloat(config.targetCPA) : null,
            targetROAS: !isCpa && config.targetROAS ? parseFloat(config.targetROAS) : null,
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const savedSettingsByAccount = Object.fromEntries(
                Object.entries(accountConfigs).map(([accountId, config]) => [
                    accountId,
                    getSettingsForAccount(config),
                ])
            )

            // Save mode + conversion event + target KPI to each ad account's settings
            const savePromises = Object.entries(savedSettingsByAccount).map(([accountId, adAccountSettings]) => {
                return saveSettings({
                    adAccountId: accountId,
                    adAccountSettings,
                })
            })
            await Promise.all(savePromises)

            // Mark onboarding as seen via /settings/save globalSettings path
            await saveSettings({
                globalSettings: { hasSeenAnalyticsOnboarding: true },
            })

            // Dispatch event so useGlobalSettings refetches
            window.dispatchEvent(new Event('globalSettingsUpdated'))

            toast.success('Analytics preferences saved')
            onComplete(savedSettingsByAccount)
        } catch (err) {
            console.error('Failed to save onboarding settings:', err)
            toast.error('Failed to save preferences')
        } finally {
            setSaving(false)
        }
    }

    if (!open || !adAccounts?.length) return null

    return (
        <>
            {/* Overlay — explicit inline sizing so it always covers the viewport
                and centers the card without the shadcn slide-in animation. */}
            <div
                className="fixed bg-black/50 z-50"
                style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh" }}
                onClick={saving ? undefined : markSeenAndClose}
            />

            {/* The card needs a definite height, not just max-height, so the
                flex ScrollArea gets a real viewport instead of being measured
                at full content height and clipped by overflow-hidden. */}
            <div
                className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-[560px] h-[min(96dvh,912px)] max-h-[calc(100dvh-2rem)] bg-white rounded-[28px] shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header (fixed) */}
                    <div className="flex items-start justify-between p-8 pb-4 flex-shrink-0">
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Set Up Your Analytics
                            </h2>
                            <ol className="text-sm text-gray-500 space-y-1 list-decimal pl-5">
                                <li>Select your Optimization Focus for each ad account : CPA or ROAS</li>
                                <li>Set benchmark KPIs</li>
                                <li className="font-bold text-black">You can change this later in Optimization Focus</li>
                            </ol>
                        </div>
                        <button
                            onClick={markSeenAndClose}
                            disabled={saving}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1 flex-shrink-0"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Ad accounts list (scrollable) */}
                    <ScrollArea className="min-h-0 flex-1 overflow-hidden">
                        <div className="px-8 pb-6 space-y-3">
                            {adAccounts.map((acct) => {
                                const config = accountConfigs[acct.id] || { mode: 'roas', conversionEvent: null, targetCPA: '', targetROAS: '' }
                                const isExpanded = expandedAccount === acct.id
                                const cache = eventsCache[acct.id]
                                const isRoas = config.mode === 'roas'

                                return (
                                    <Card key={acct.id} className="rounded-2xl border-gray-200 overflow-hidden">
                                        <CardContent className="p-0">
                                            {/* Account header row */}
                                            <button
                                                onClick={() => handleExpandAccount(acct.id)}
                                                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="text-left">
                                                    <p className="text-sm font-medium text-gray-900 truncate max-w-[280px]">
                                                        {acct.name || acct.id}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {isRoas ? 'ROAS focused' : `CPA focused${config.conversionEvent ? ` · ${config.conversionEvent.replace(/_/g, ' ')}` : ''}`}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "px-2.5 py-1 rounded-lg text-xs font-medium",
                                                        isRoas
                                                            ? "bg-blue-50 text-blue-700"
                                                            : "bg-green-50 text-green-700"
                                                    )}>
                                                        {isRoas ? 'ROAS' : 'CPA'}
                                                    </div>
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </div>
                                            </button>

                                            {/* Expanded config */}
                                            {isExpanded && (
                                                <div className="px-5 pb-4 pt-1 border-t border-gray-100 space-y-4">
                                                    {/* Mode toggle */}
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <Label className="text-sm text-gray-700">Optimization Focus</Label>
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                {isRoas
                                                                    ? 'Analyzing return on ad spend'
                                                                    : 'Analyzing cost per conversion action'}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("text-xs font-medium", !isRoas ? "text-green-600" : "text-gray-400")}>CPA</span>
                                                            {/* Custom unchecked color so CPA doesn't look like "off" */}
                                                            <Switch
                                                                checked={isRoas}
                                                                onCheckedChange={(checked) => handleToggleMode(acct.id, checked)}
                                                                className="data-[state=unchecked]:bg-green-500"
                                                            />
                                                            <span className={cn("text-xs font-medium", isRoas ? "text-blue-600" : "text-gray-400")}>ROAS</span>
                                                        </div>
                                                    </div>

                                                    {/* Conversion event picker (only for CPA) */}
                                                    {!isRoas && (
                                                        <div className="space-y-2">
                                                            <Label className="text-sm text-gray-700">Conversion Event</Label>
                                                            {cache?.loading ? (
                                                                <div className="flex items-center gap-2 py-3">
                                                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                                                    <span className="text-xs text-gray-400">Loading events from ad sets...</span>
                                                                </div>
                                                            ) : cache?.events?.length > 0 ? (
                                                                <div className="max-h-[180px] overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 custom-scrollbar">
                                                                    {cache.events.map((evt) => {
                                                                        const isSelected = config.conversionEvent === evt.event
                                                                        return (
                                                                            <button
                                                                                key={evt.event}
                                                                                onClick={() => handleSelectEvent(acct.id, evt.event)}
                                                                                className={cn(
                                                                                    "w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors",
                                                                                    isSelected
                                                                                        ? "bg-blue-50"
                                                                                        : "hover:bg-gray-50"
                                                                                )}
                                                                            >
                                                                                <div>
                                                                                    <p className={cn(
                                                                                        "text-sm",
                                                                                        isSelected ? "font-medium text-blue-700" : "text-gray-700"
                                                                                    )}>
                                                                                        {evt.label}
                                                                                    </p>
                                                                                    {evt.activeAdsets > 0 && (
                                                                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                                                                            {evt.activeAdsets} active ad set{evt.activeAdsets !== 1 ? 's' : ''}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                                {isSelected && (
                                                                                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                                                                )}
                                                                            </button>
                                                                        )
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-gray-400 py-2">
                                                                    No conversion events found. Standard events will be auto-detected.
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Target KPI (benchmark) */}
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Target className="w-4 h-4 text-blue-500" />
                                                            <Label className="text-sm text-gray-700">
                                                                Target {isRoas ? 'ROAS' : 'CPA'}
                                                            </Label>
                                                        </div>
                                                        <p className="text-xs text-gray-400">
                                                            Sets a benchmark for budget recommendations.
                                                        </p>
                                                        {isRoas ? (
                                                            <div className="relative w-32">
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    value={config.targetROAS}
                                                                    onChange={(e) => handleSetTarget(acct.id, e.target.value)}
                                                                    placeholder="e.g. 3.0"
                                                                    className="w-32 px-3 pr-7 py-2.5 border border-gray-300 rounded-2xl bg-white text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                />
                                                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">x</span>
                                                            </div>
                                                        ) : (
                                                            <div className="relative w-32">
                                                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={config.targetCPA}
                                                                    onChange={(e) => handleSetTarget(acct.id, e.target.value)}
                                                                    placeholder="e.g. 30"
                                                                    className="w-32 pl-7 pr-3 py-2.5 border border-gray-300 rounded-2xl bg-white text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </ScrollArea>

                    {/* Sticky blue bottom bar */}
                    <div className="flex-shrink-0 bg-blue-600 px-8 py-2.5 flex items-center justify-center gap-6 rounded-b-[28px]">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-xl bg-white text-blue-600 hover:bg-gray-100 px-6 h-9 font-medium"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Preferences'
                            )}
                        </Button>
                        <button
                            onClick={markSeenAndClose}
                            disabled={saving}
                            className="text-white text-sm font-medium hover:underline disabled:opacity-50"
                        >
                            Skip For Now
                        </button>
                </div>
            </div>
        </>
    )
}
