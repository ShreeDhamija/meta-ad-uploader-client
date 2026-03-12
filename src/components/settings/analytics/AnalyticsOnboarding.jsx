"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, ChevronDown, ChevronUp, Check } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogOverlay,
} from "@/components/ui/dialog"
import { saveSettings } from "@/lib/saveSettings"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

/**
 * AnalyticsOnboarding
 *
 * Shows on first login (when hasSeenAnalyticsOnboarding is false).
 * Lets user configure each ad account as CPA or ROAS focused.
 * When CPA is selected, shows a list of conversion events to pick from.
 *
 * Props:
 *  - open: boolean
 *  - onComplete: () => void  — called after saving, marks global setting
 *  - adAccounts: array of { id, name }
 */
export default function AnalyticsOnboarding({ open, onComplete, adAccounts }) {
    // Per-account config: { [accountId]: { mode: 'roas' | 'cpa', conversionEvent: string | null } }
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
                initial[acct.id] = { mode: 'roas', conversionEvent: null }
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

    const handleExpandAccount = (accountId) => {
        const isExpanding = expandedAccount !== accountId
        setExpandedAccount(isExpanding ? accountId : null)

        // Pre-fetch events when expanding
        if (isExpanding && accountConfigs[accountId]?.mode === 'cpa') {
            fetchConversionEvents(accountId)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // Save mode + conversion event to each ad account's settings
            const savePromises = Object.entries(accountConfigs).map(([accountId, config]) =>
                saveSettings({
                    adAccountId: accountId,
                    adAccountSettings: {
                        analyticsMode: config.mode,
                        conversionEvent: config.mode === 'cpa' ? config.conversionEvent : null,
                    },
                })
            )
            await Promise.all(savePromises)

            // Mark onboarding as seen via /settings/save globalSettings path
            await saveSettings({
                globalSettings: { hasSeenAnalyticsOnboarding: true },
            })

            // Dispatch event so useGlobalSettings refetches
            window.dispatchEvent(new Event('globalSettingsUpdated'))

            toast.success('Analytics preferences saved')
            onComplete()
        } catch (err) {
            console.error('Failed to save onboarding settings:', err)
            toast.error('Failed to save preferences')
        } finally {
            setSaving(false)
        }
    }

    if (!adAccounts?.length) return null

    return (
        <Dialog open={open} onOpenChange={async (isOpen) => {
            if (!isOpen) {
                try {
                    await saveSettings({ globalSettings: { hasSeenAnalyticsOnboarding: true } })
                    window.dispatchEvent(new Event('globalSettingsUpdated'))
                } catch (err) {
                    console.error('Failed to mark onboarding as seen:', err)
                }
                onComplete()
            }
        }}>
            <DialogOverlay className="bg-black/50" />
            <DialogContent
                className="sm:max-w-[560px] !rounded-[30px] !p-0 flex flex-col max-h-[90vh] overflow-hidden !gap-0"
                onOpenAutoFocus={(e) => e.preventDefault()}

            >
                {/* Scrollable area: header + cards */}
                <div className="p-8 pb-4 space-y-5 flex-1 overflow-y-auto min-h-0">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl">
                            Set Up Your Analytics
                        </DialogTitle>
                        <DialogDescription className="space-y-1">
                            <span>
                                Choose whether each ad account is optimized for CPA (cost per action) or ROAS (return on ad spend).
                            </span>
                            <span className="block font-semibold text-gray-700">
                                You can change this later in settings.
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        {adAccounts.map((acct) => {
                            const config = accountConfigs[acct.id] || { mode: 'roas', conversionEvent: null }
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
                                                        {/* Change 1: custom unchecked color so CPA doesn't look like "off" */}
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
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>

                {/* Change 3: sticky blue bottom bar */}
                <div className="flex-shrink-0 bg-blue-600 px-8 py-2.5 flex items-center justify-center gap-6 rounded-b-[30px]">
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
                        onClick={onComplete}
                        disabled={saving}
                        className="text-white text-sm font-medium hover:underline disabled:opacity-50"
                    >
                        Skip For Now
                    </button>

                </div>
            </DialogContent>
        </Dialog>
    )

}