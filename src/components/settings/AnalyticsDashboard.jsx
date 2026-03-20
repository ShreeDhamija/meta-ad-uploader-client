"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
import {
    AlertTriangle, RefreshCw, Loader2, ChevronsUpDown,
    Target, Settings2, Activity, Zap, Eye, CheckCircle2, BarChart3, FileBarChart2, FileText
} from "lucide-react"
import { toast } from "sonner"
import { useAppData } from "@/lib/AppContext"
import useAdAccountSettings from "@/lib/useAdAccountSettings"
import useGlobalSettings from "@/lib/useGlobalSettings"
import { saveSettings } from "@/lib/saveSettings"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import slackIcon from "@/assets/icons/slack.svg"
import slackWhite from "@/assets/icons/analytics/slackwhite.svg"
import KPIChart from "./analytics/KPIChart"
import WeeklyChart from "./analytics/WeeklyChart"
import RecommendationCards from "./analytics/RecommendationCards"
import AnomalyCards from "./analytics/AnomalyCards"
import AnalyticsOnboarding from "./analytics/AnalyticsOnboarding"
import AggregateKPIDialog from "./analytics/AggregateKPIDialog"
import AdAccountAudit from "./analytics/AdAccountAudit"
import SlackAlertsDialog from "./analytics/SlackAlertsDialog"
import AccountSummaryDialog from "./analytics/AccountSummaryDialog"


const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

const DEFAULT_THRESHOLDS = {
    cpaSpike: 50,
    overspend: 150,
};

// Slack brand color
const SLACK_PURPLE = '#4A154B';

export default function AnalyticsDashboard() {
    const { adAccounts, adAccountsLoading } = useAppData()
    const { loading: globalSettingsLoading, hasSeenAnalyticsOnboarding } = useGlobalSettings()

    // ── Onboarding state 
    const [showOnboarding, setShowOnboarding] = useState(false)

    // ── Core state 
    const [selectedAdAccount, setSelectedAdAccount] = useState(null)
    const [openAdAccount, setOpenAdAccount] = useState(false)
    const [searchValue, setSearchValue] = useState("")
    const [metricMode, setMetricMode] = useState("cpr") // cpr | roas
    const [modeAutoDetected, setModeAutoDetected] = useState(false)
    const [activeTab, setActiveTab] = useState("recommendations")
    const [chartDays, setChartDays] = useState(14)

    // ── Aggregate KPI dialog 
    const [showAggregateDialog, setShowAggregateDialog] = useState(false)

    // ── Settings 
    const [showSettingsDialog, setShowSettingsDialog] = useState(false)
    const [anomalyThresholds, setAnomalyThresholds] = useState(DEFAULT_THRESHOLDS)
    const [tempThresholds, setTempThresholds] = useState(DEFAULT_THRESHOLDS)

    // ── Target KPI (lives in settings dialog, feeds recommendations) 
    const [targetCPA, setTargetCPA] = useState(null)
    const [targetROAS, setTargetROAS] = useState(null)
    const [tempTargetCPA, setTempTargetCPA] = useState("")
    const [tempTargetROAS, setTempTargetROAS] = useState("")

    // ── Mode/Event preferences in settings dialog 
    const [tempAnalyticsMode, setTempAnalyticsMode] = useState("roas")
    const [tempConversionEvent, setTempConversionEvent] = useState(null)
    const [conversionEvents, setConversionEvents] = useState([])
    const [conversionEventsLoading, setConversionEventsLoading] = useState(false)

    // ── Slack state 
    const [slackConnected, setSlackConnected] = useState(false)
    const [slackChannelName, setSlackChannelName] = useState(null)
    const [slackAlertsEnabled, setSlackAlertsEnabled] = useState(false)
    const [tempSlackAlertsEnabled, setTempSlackAlertsEnabled] = useState(false)
    const [slackDisconnecting, setSlackDisconnecting] = useState(false)
    const [showSlackDialog, setShowSlackDialog] = useState(false)
    const [showSummaryDialog, setShowSummaryDialog] = useState(false)
    // ── Data state 
    const [recommendations, setRecommendations] = useState(null)
    const [recsLoading, setRecsLoading] = useState(false)

    const [anomalies, setAnomalies] = useState(null)
    const [anomaliesLoading, setAnomaliesLoading] = useState(false)

    const [poorAds, setPoorAds] = useState(null)
    const [poorAdsLoading, setPoorAdsLoading] = useState(false)

    const [dailyInsights, setDailyInsights] = useState(null)
    const [dailyLoading, setDailyLoading] = useState(false)

    const [weeklyInsights, setWeeklyInsights] = useState(null)
    const [weeklyLoading, setWeeklyLoading] = useState(false)
    const [savingSettings, setSavingSettings] = useState(false)



    const [auditOpen, setAuditOpen] = useState(false)
    // Track what we've already fetched for this account+mode combo
    const fetchedRef = useRef({})
    const modeCache = useRef({})
    const dailyInsightsCacheRef = useRef({})
    const dailyInsightsAbortRef = useRef(null)
    const pendingDailySettingsRef = useRef(null)


    // ── Ad account settings hook ────────────────────────────
    const {
        settings: adAccountSettings,
        setSettings: setAdAccountSettings,
        loading: adAccountSettingsLoading
    } = useAdAccountSettings(selectedAdAccount)

    // ── Show onboarding on first visit ──────────────────────
    useEffect(() => {
        if (!globalSettingsLoading && !adAccountsLoading && adAccounts?.length > 0 && !hasSeenAnalyticsOnboarding) {
            setShowOnboarding(true)
        }
    }, [globalSettingsLoading, adAccountsLoading, adAccounts, hasSeenAnalyticsOnboarding])

    // Sync settings from hook (including analyticsMode + conversionEvent)
    useEffect(() => {
        if (!adAccountSettingsLoading && adAccountSettings) {
            if (adAccountSettings.anomalyThresholds) {
                setAnomalyThresholds(adAccountSettings.anomalyThresholds)
                setTempThresholds(adAccountSettings.anomalyThresholds)
            }
            if (adAccountSettings.slackAlertsEnabled !== undefined) {
                setSlackAlertsEnabled(adAccountSettings.slackAlertsEnabled)
                setTempSlackAlertsEnabled(adAccountSettings.slackAlertsEnabled)
            }
            if (adAccountSettings.targetCPA !== undefined && adAccountSettings.targetCPA !== null) {
                setTargetCPA(adAccountSettings.targetCPA)
                setTempTargetCPA(String(adAccountSettings.targetCPA))
            } else {
                setTargetCPA(null)
                setTempTargetCPA("")
            }
            if (adAccountSettings.targetROAS !== undefined && adAccountSettings.targetROAS !== null) {
                setTargetROAS(adAccountSettings.targetROAS)
                setTempTargetROAS(String(adAccountSettings.targetROAS))
            } else {
                setTargetROAS(null)
                setTempTargetROAS("")
            }

            // Load saved analytics mode preference
            if (adAccountSettings.analyticsMode) {
                const savedMode = adAccountSettings.analyticsMode === 'roas' ? 'roas' : 'cpr'
                setMetricMode(savedMode)
                modeCache.current[selectedAdAccount] = savedMode
                setModeAutoDetected(false)
            }
        }
    }, [adAccountSettingsLoading, adAccountSettings, selectedAdAccount])

    // ── Check Slack connection (per-user, runs once) 
    useEffect(() => {
        const checkSlack = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/analytics/slack/status`, { credentials: 'include' })
                const data = await res.json()
                setSlackConnected(!!data.connected)
                setSlackChannelName(data.channelName || null)
            } catch (err) { /* silent */ }
        }
        checkSlack()
    }, [])


    const filteredAdAccounts = useMemo(() => {
        if (!searchValue) return adAccounts || [];
        const lower = searchValue.toLowerCase();
        return (adAccounts || []).filter(
            (a) => (a.name?.toLowerCase() || "").includes(lower) || a.id.toLowerCase().includes(lower)
        );
    }, [adAccounts, searchValue])

    const selectedAdAccountName = useMemo(() => {
        if (!selectedAdAccount) return "Select an Ad Account";
        return adAccounts?.find((a) => a.id === selectedAdAccount)?.name || selectedAdAccount;
    }, [selectedAdAccount, adAccounts])

    const anomalyCount = anomalies?.summary?.total || 0
    const recsCount = recommendations?.recommendations?.length || 0
    const poorAdsCount = poorAds?.ads?.length || 0


    // Auto-detect mode from account info (fallback if no saved preference)
    const fetchAccountInfo = useCallback(async (accountId) => {
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/analytics/account-info?adAccountId=${accountId}`,
                { credentials: 'include' }
            )
            const data = await res.json()

            // Only auto-set if the user hasn't manually selected or saved a mode for this account
            if (modeCache.current[accountId]) return;

            if (res.ok && data.suggestedMode) {
                setMetricMode(data.suggestedMode)
                setModeAutoDetected(true)
            }
        } catch (err) {
            console.error('Account info error:', err)
        }
    }, [])

    // ── Fetch conversion events for settings dialog ─────────
    const fetchConversionEvents = useCallback(async (accountId) => {
        setConversionEventsLoading(true)
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/analytics/conversion-events?adAccountId=${accountId}`,
                { credentials: 'include' }
            )
            const data = await res.json()
            if (res.ok) {
                setConversionEvents(data.events || [])
            }
        } catch (err) {
            console.error('Failed to fetch conversion events:', err)
        } finally {
            setConversionEventsLoading(false)
        }
    }, [])

    // ── Fetch functions
    const fetchRecommendations = useCallback(async (force = false) => {
        if (!selectedAdAccount) return
        const key = `recs-${selectedAdAccount}-${metricMode}`
        if (!force && fetchedRef.current[key]) return
        fetchedRef.current[key] = true

        setRecsLoading(true)
        try {
            let url = `${API_BASE_URL}/api/analytics/recommendations?adAccountId=${selectedAdAccount}&mode=${metricMode}`
            if (metricMode === 'cpr' && targetCPA) url += `&targetCPA=${targetCPA}`
            if (metricMode === 'roas' && targetROAS) url += `&targetROAS=${targetROAS}`
            if (adAccountSettings?.conversionEvent) {
                url += `&conversionEvent=${encodeURIComponent(adAccountSettings.conversionEvent)}`
            }

            const res = await fetch(url, { credentials: 'include' })
            const data = await res.json()
            if (res.ok) setRecommendations(data)
            else toast.error(data.error || 'Failed to fetch recommendations')
        } catch (err) {
            console.error('Recommendations error:', err)
            toast.error('Failed to fetch recommendations')
        } finally { setRecsLoading(false) }
    }, [selectedAdAccount, metricMode, targetCPA, targetROAS, adAccountSettings?.conversionEvent])

    const fetchAnomalies = useCallback(async (force = false) => {
        if (!selectedAdAccount) return
        const key = `anomalies-${selectedAdAccount}`
        if (!force && fetchedRef.current[key]) return
        fetchedRef.current[key] = true

        setAnomaliesLoading(true)
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/analytics/anomalies?adAccountId=${selectedAdAccount}&cpaThreshold=${anomalyThresholds.cpaSpike}&overspendThreshold=${anomalyThresholds.overspend}`,
                { credentials: 'include' }
            )
            const data = await res.json()
            if (res.ok) setAnomalies(data)
            else toast.error(data.error || 'Failed to fetch anomalies')
        } catch (err) {
            console.error('Anomalies error:', err)
            toast.error('Failed to fetch anomalies')
        } finally { setAnomaliesLoading(false) }
    }, [selectedAdAccount, anomalyThresholds])

    const fetchPoorAds = useCallback(async (force = false) => {
        if (!selectedAdAccount) return
        const key = `poor-${selectedAdAccount}-${metricMode}-${adAccountSettings?.conversionEvent || '__auto__'}`
        if (!force && fetchedRef.current[key]) return
        fetchedRef.current[key] = true

        setPoorAdsLoading(true)
        try {
            let url = `${API_BASE_URL}/api/analytics/poor-performing-ads?adAccountId=${selectedAdAccount}&mode=${metricMode}`
            if (adAccountSettings?.conversionEvent) {
                url += `&conversionEvent=${encodeURIComponent(adAccountSettings.conversionEvent)}`
            }

            const res = await fetch(url, { credentials: 'include' })
            const data = await res.json()
            if (res.ok) setPoorAds(data)
            else toast.error(data.error || 'Failed to fetch poor performing ads')
        } catch (err) {
            console.error('Poor ads error:', err)
            toast.error('Failed to fetch poor performing ads')
        } finally { setPoorAdsLoading(false) }
    }, [selectedAdAccount, metricMode, adAccountSettings?.conversionEvent])


    const getDailyInsightsCacheKey = useCallback((accountId, days, conversionEvent) => {
        return `${accountId}::${days}::${conversionEvent || "__auto__"}`
    }, [])

    const clearDailyInsightsCache = useCallback((accountId = null) => {
        if (!accountId) {
            dailyInsightsCacheRef.current = {}
            return
        }

        const prefix = `${accountId}::`
        Object.keys(dailyInsightsCacheRef.current).forEach((key) => {
            if (key.startsWith(prefix)) delete dailyInsightsCacheRef.current[key]
        })
    }, [])

    const loadDailyInsights = useCallback(async ({
        accountId = selectedAdAccount,
        days = chartDays,
        conversionEvent = adAccountSettings?.conversionEvent || null,
        force = false,
    } = {}) => {
        if (!accountId) return

        if (dailyInsightsAbortRef.current) {
            dailyInsightsAbortRef.current.abort()
            dailyInsightsAbortRef.current = null
        }

        const cacheKey = getDailyInsightsCacheKey(accountId, days, conversionEvent)
        const cachedPayload = dailyInsightsCacheRef.current[cacheKey]

        if (!force && cachedPayload) {
            setDailyInsights(cachedPayload)
            setDailyLoading(false)
            return
        }

        const controller = new AbortController()
        dailyInsightsAbortRef.current = controller
        setDailyInsights(null)
        setDailyLoading(true)

        try {
            let url = `${API_BASE_URL}/api/analytics/daily-insights?adAccountId=${accountId}&days=${days}`
            if (conversionEvent) {
                url += `&conversionEvent=${encodeURIComponent(conversionEvent)}`
            }

            const res = await fetch(url, {
                credentials: 'include',
                signal: controller.signal,
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch daily insights')
            }

            if (controller.signal.aborted || dailyInsightsAbortRef.current !== controller) return

            dailyInsightsCacheRef.current[cacheKey] = data
            setDailyInsights(data)
        } catch (err) {
            if (err.name === 'AbortError') return
            console.error('Daily insights error:', err)
        } finally {
            if (dailyInsightsAbortRef.current === controller) {
                dailyInsightsAbortRef.current = null
                setDailyLoading(false)
            }
        }
    }, [selectedAdAccount, chartDays, adAccountSettings?.conversionEvent, getDailyInsightsCacheKey])

    const fetchWeeklyInsights = useCallback(async (force = false) => {
        if (!selectedAdAccount) return
        const key = `weekly-${selectedAdAccount}`
        if (!force && fetchedRef.current[key]) return
        fetchedRef.current[key] = true

        setWeeklyLoading(true)
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/analytics/weekly-insights?adAccountId=${selectedAdAccount}&weeks=26`,
                { credentials: 'include' }
            )
            const data = await res.json()
            if (res.ok) setWeeklyInsights(data)
        } catch (err) {
            console.error('Weekly insights error:', err)
        } finally { setWeeklyLoading(false) }
    }, [selectedAdAccount])

    // ── Data fetching triggers ──────────────────────────────
    useEffect(() => {
        if (!adAccountsLoading && adAccounts?.length > 0 && !selectedAdAccount) {
            pendingDailySettingsRef.current = adAccounts[0].id
            setSelectedAdAccount(adAccounts[0].id)
        }
    }, [adAccountsLoading, adAccounts, selectedAdAccount])

    useEffect(() => {
        if (selectedAdAccount) {
            fetchAccountInfo(selectedAdAccount)
            fetchWeeklyInsights()
        }
    }, [selectedAdAccount, fetchAccountInfo, fetchWeeklyInsights])

    useEffect(() => {
        if (!selectedAdAccount) return
        if (activeTab === 'recommendations') {
            fetchRecommendations()
            fetchPoorAds()
        } else if (activeTab === 'anomalies') {
            fetchAnomalies()
        }
    }, [activeTab, selectedAdAccount, metricMode, fetchRecommendations, fetchAnomalies, fetchPoorAds])

    useEffect(() => {
        if (
            selectedAdAccount &&
            !adAccountSettingsLoading &&
            pendingDailySettingsRef.current === selectedAdAccount
        ) {
            pendingDailySettingsRef.current = null
        }
    }, [selectedAdAccount, adAccountSettingsLoading, adAccountSettings?.conversionEvent])

    useEffect(() => {
        if (!selectedAdAccount) {
            if (dailyInsightsAbortRef.current) {
                dailyInsightsAbortRef.current.abort()
                dailyInsightsAbortRef.current = null
            }
            setDailyInsights(null)
            setDailyLoading(false)
            return
        }

        if (adAccountSettingsLoading || pendingDailySettingsRef.current === selectedAdAccount) {
            return
        }

        loadDailyInsights()
    }, [selectedAdAccount, chartDays, adAccountSettingsLoading, adAccountSettings?.conversionEvent, loadDailyInsights])

    useEffect(() => {
        return () => {
            if (dailyInsightsAbortRef.current) {
                dailyInsightsAbortRef.current.abort()
            }
        }
    }, [])



    const handleAdAccountSelect = (accountId) => {
        pendingDailySettingsRef.current = accountId
        setSelectedAdAccount(accountId)
        setOpenAdAccount(false)

        // Restore cached mode for this account, or default to 'cpr'
        if (modeCache.current[accountId]) {
            setMetricMode(modeCache.current[accountId])
            setModeAutoDetected(false)
        } else {
            setMetricMode("cpr")
            setModeAutoDetected(false)
        }

        setRecommendations(null); setAnomalies(null); setPoorAds(null)
        setDailyInsights(null); setWeeklyInsights(null)
        if (dailyInsightsAbortRef.current) {
            dailyInsightsAbortRef.current.abort()
            dailyInsightsAbortRef.current = null
        }
        setDailyLoading(false)
        fetchedRef.current = {}
    }

    const handleRefresh = () => {
        fetchedRef.current = {}
        clearDailyInsightsCache(selectedAdAccount)
        fetchAccountInfo(selectedAdAccount)
        loadDailyInsights({ force: true })
        fetchWeeklyInsights(true)
        if (activeTab === 'recommendations') {
            fetchRecommendations(true)
            fetchPoorAds(true)
        } else if (activeTab === 'anomalies') {
            fetchAnomalies(true)
        }
        toast.success('Refreshing data...')
    }

    const handleSaveSettings = async () => {
        setSavingSettings(true)
        const newTargetCPA = tempTargetCPA ? parseFloat(tempTargetCPA) : null
        const newTargetROAS = tempTargetROAS ? parseFloat(tempTargetROAS) : null
        const modeForStorage = tempAnalyticsMode === 'roas' ? 'roas' : 'cpa'
        const nextConversionEvent = modeForStorage === 'cpa' ? tempConversionEvent : null

        try {
            console.log('[Settings] Saving for account:', selectedAdAccount)

            await saveSettings({
                adAccountId: selectedAdAccount,
                adAccountSettings: {
                    anomalyThresholds: tempThresholds,
                    targetCPA: newTargetCPA,
                    targetROAS: newTargetROAS,
                    slackAlertsEnabled: tempSlackAlertsEnabled,
                    analyticsMode: modeForStorage,
                    conversionEvent: nextConversionEvent,
                }
            })

            setAnomalyThresholds(tempThresholds)
            setTargetCPA(newTargetCPA)
            setTargetROAS(newTargetROAS)
            setSlackAlertsEnabled(tempSlackAlertsEnabled)
            setAdAccountSettings((prev) => ({
                ...prev,
                anomalyThresholds: tempThresholds,
                targetCPA: newTargetCPA,
                targetROAS: newTargetROAS,
                slackAlertsEnabled: tempSlackAlertsEnabled,
                analyticsMode: modeForStorage,
                conversionEvent: nextConversionEvent,
            }))
            setShowSettingsDialog(false)

            const newMode = tempAnalyticsMode === 'roas' ? 'roas' : 'cpr'
            if (newMode !== metricMode) {
                handleModeChange(newMode)
            }

            delete fetchedRef.current[`anomalies-${selectedAdAccount}`]
            delete fetchedRef.current[`recs-${selectedAdAccount}-${metricMode}`]
            // FIXED: Also invalidate poor ads cache when conversion event changes
            Object.keys(fetchedRef.current).forEach(k => {
                if (k.startsWith(`poor-${selectedAdAccount}`)) delete fetchedRef.current[k]
            })
            clearDailyInsightsCache(selectedAdAccount)

            loadDailyInsights({
                force: true,
                accountId: selectedAdAccount,
                days: chartDays,
                conversionEvent: nextConversionEvent,
            })
            toast.success('Settings saved')
            if (activeTab === 'recommendations') {
                setTimeout(() => {
                    fetchRecommendations(true)
                    fetchPoorAds(true)
                }, 100)
            }
        } catch (err) {
            console.error('[Settings] Save FAILED:', err.message)
            toast.error(`Failed to save settings: ${err.message}`)
        } finally {
            setSavingSettings(false)
        }
    }



    const handleModeChange = (mode) => {
        setMetricMode(mode)

        // Save preference to cache
        if (selectedAdAccount) {
            modeCache.current[selectedAdAccount] = mode
        }

        setModeAutoDetected(false)
        setRecommendations(null)
        setPoorAds(null)
        const prefix = `recs-${selectedAdAccount}`
        const poorPrefix = `poor-${selectedAdAccount}`
        Object.keys(fetchedRef.current).forEach(k => {
            if (k.startsWith(prefix) || k.startsWith(poorPrefix)) delete fetchedRef.current[k]
        })
    }

    const handleSlackDisconnect = async () => {
        setSlackDisconnecting(true)
        try {
            const res = await fetch(`${API_BASE_URL}/api/analytics/slack/disconnect`, {
                method: 'POST', credentials: 'include',
            })
            if (res.ok) {
                setSlackConnected(false)
                setSlackChannelName(null)
                setSlackAlertsEnabled(false)
                setTempSlackAlertsEnabled(false)
                toast.success('Slack disconnected')
            } else {
                const data = await res.json().catch(() => ({}))
                toast.error(`Disconnect failed: ${data.error || res.status}`)
            }
        } catch (err) {
            toast.error('Failed to disconnect Slack')
        } finally {
            setSlackDisconnecting(false)
        }
    }

    const openSettingsDialog = () => {
        setTempThresholds(anomalyThresholds)
        setTempTargetCPA(targetCPA ? String(targetCPA) : "")
        setTempTargetROAS(targetROAS ? String(targetROAS) : "")
        setTempSlackAlertsEnabled(slackAlertsEnabled)
        // Default to saved setting or ROAS for first session
        setTempAnalyticsMode(adAccountSettings?.analyticsMode || 'roas')
        setTempConversionEvent(adAccountSettings?.conversionEvent || null)
        setShowSettingsDialog(true)
        // Pre-fetch conversion events for settings
        if (selectedAdAccount) fetchConversionEvents(selectedAdAccount)
    }

    const handleOnboardingComplete = () => {
        setShowOnboarding(false)
    }

    const isAnyLoading = recsLoading || anomaliesLoading || poorAdsLoading || dailyLoading || weeklyLoading

    // ── Loading / Empty states ──────────────────────────────
    if (adAccountsLoading || globalSettingsLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (!adAccounts || adAccounts.length === 0) {
        return (
            <Card className="rounded-3xl shadow-lg shadow-gray-200/50">
                <CardContent className="pt-6">
                    <div className="text-center py-8">
                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">No Ad Accounts Connected</p>
                        <p className="text-sm text-gray-400 mt-1">Connect an ad account in Preferences to use Analytics</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* ── Analytics Onboarding Popup ── */}
            <AnalyticsOnboarding
                open={showOnboarding}
                onComplete={handleOnboardingComplete}
                adAccounts={adAccounts}
            />

            {/* ── Aggregate KPI Dialog ── */}
            <AggregateKPIDialog
                open={showAggregateDialog}
                onOpenChange={setShowAggregateDialog}
                adAccounts={adAccounts}
                mode={metricMode}
            />

            {/* ── Header: Account Selector + Mode Toggle + Actions ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Ad Account Dropdown */}
                    <Popover open={openAdAccount} onOpenChange={setOpenAdAccount}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                className="w-[280px] justify-between rounded-2xl h-11 bg-white shadow-sm hover:bg-white"
                            >
                                <span className="truncate">{selectedAdAccountName}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="min-w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-xl"
                            align="start" sideOffset={4}
                        >
                            <Command filter={() => 1} loop={false} value="">
                                <CommandInput
                                    placeholder="Search ad accounts..."
                                    value={searchValue}
                                    onValueChange={setSearchValue}
                                    className="bg-white"
                                />
                                <CommandList className="max-h-[300px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
                                    <CommandGroup>
                                        {/* Aggregate View — first item in dropdown */}
                                        {adAccounts?.length > 1 && (
                                            <CommandItem
                                                value="__aggregate__"
                                                onSelect={() => {
                                                    setShowAggregateDialog(true)
                                                    setOpenAdAccount(false)
                                                }}
                                                className="mx-3 my-2 px-4 py-2.5 cursor-pointer rounded-xl bg-gray-50 border border-gray-200 transition-colors duration-150 hover:bg-gray-100 hover:border-gray-100 flex items-center gap-2 font-medium text-gray-700"
                                            >
                                                <BarChart3 className="w-4 h-4 text-gray-500" />
                                                Aggregate View
                                            </CommandItem>
                                        )}
                                        {filteredAdAccounts.map((acct) => (
                                            <CommandItem
                                                key={acct.id}
                                                value={acct.id}
                                                onSelect={handleAdAccountSelect}
                                                className={cn(
                                                    "px-4 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150 hover:bg-gray-100",
                                                    selectedAdAccount === acct.id && "bg-gray-100 font-semibold"
                                                )}
                                            >
                                                {acct.name || acct.id}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    {/* CPA / ROAS Toggle */}
                    <div className="flex p-1 bg-gray-100 rounded-2xl border border-gray-200/60">
                        <button
                            onClick={() => handleModeChange('cpr')}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-xl transition-all duration-200",
                                metricMode === 'cpr'
                                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            CPA
                        </button>
                        <button
                            onClick={() => handleModeChange('roas')}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-xl transition-all duration-200",
                                metricMode === 'roas'
                                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            ROAS
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline" size="sm"
                        onClick={openSettingsDialog}
                        className="rounded-2xl h-11 px-4"
                    >
                        <Settings2 className="w-4 h-4" />

                    </Button>
                    <Button
                        variant="outline" size="sm"
                        onClick={() => setShowSlackDialog(true)}
                        className="rounded-2xl h-11 w-11 p-0 flex items-center justify-center bg-[#4A154B] hover:bg-[#611f69] transition-colors"
                        title="Slack Alerts"
                    >
                        <img src={slackWhite} alt="Slack" className="w-5 h-5" />
                    </Button>

                    <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)} className="rounded-2xl h-11 px-4">
                        <FileBarChart2 className="w-3.5 h-3.5" />
                        Audit Account
                    </Button>
                    <Button
                        variant="outline" size="sm"
                        onClick={() => setShowSummaryDialog(true)}
                        className="rounded-2xl h-11 px-4"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Account Summary
                    </Button>


                </div>
            </div>

            {/* ── Charts Row  */}
            {selectedAdAccount && (
                // <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="grid grid-cols-1 gap-4">
                    <KPIChart
                        data={dailyInsights}
                        loading={dailyLoading}
                        mode={metricMode}
                        days={chartDays}
                        onDaysChange={setChartDays}
                    />
                    <WeeklyChart
                        data={weeklyInsights}
                        loading={weeklyLoading}
                    />
                </div>
            )}

            {/* ── Tab Switcher (2 tabs: Recommendations + Anomalies) ── */}
            <div className="w-full">
                <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl w-full border border-gray-200/60">
                    <button
                        onClick={() => setActiveTab('recommendations')}
                        className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-2xl transition-all duration-200",
                            activeTab === 'recommendations'
                                ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                        )}
                    >
                        <Zap className="w-4 h-4" />
                        <span className="hidden sm:inline">Recommendations</span>
                        <span className="sm:hidden">Recs</span>
                        {(recsCount + poorAdsCount) > 0 && (
                            <Badge className="ml-1 text-xs px-1.5 py-0 bg-blue-100 text-blue-700 hover:bg-blue-100 rounded-2xl">
                                {recsCount} + {poorAdsCount}
                            </Badge>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('anomalies')}
                        className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-2xl transition-all duration-200",
                            activeTab === 'anomalies'
                                ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                        )}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Anomalies
                        {anomalyCount > 0 && (
                            <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0 rounded-2xl">
                                {anomalyCount}
                            </Badge>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Tab Content ── */}
            {activeTab === 'recommendations' && (
                <RecommendationCards
                    data={recommendations}
                    loading={recsLoading}
                    mode={metricMode}
                    adAccountId={selectedAdAccount}
                    adAccounts={adAccounts}
                    onApplied={() => fetchRecommendations(true)}
                    poorAdsData={poorAds}
                    poorAdsLoading={poorAdsLoading}
                    onPoorAdsApplied={() => fetchPoorAds(true)}
                />
            )}

            {activeTab === 'anomalies' && (
                <AnomalyCards
                    data={anomalies}
                    loading={anomaliesLoading}
                    thresholds={anomalyThresholds}
                />
            )}

            {/* ── Info Footer ── */}
            <Card className="rounded-2xl bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Activity className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-500">
                            <p className="font-medium text-gray-600 mb-2">
                                How Analytics Works
                            </p>

                            <div className="text-xs leading-relaxed space-y-3">

                                <div>
                                    <strong className="block text-gray-600">
                                        Recommendations
                                    </strong>
                                    <span>
                                        compare each campaign/adset's {metricMode === 'cpr' ? 'CPA' : 'ROAS'} against
                                        {(metricMode === 'cpr' && targetCPA) || (metricMode === 'roas' && targetROAS)
                                            ? ' your target KPI (or account average if target is less strict)'
                                            : ' the spend-weighted account average'
                                        } over 3-day windows.
                                    </span>
                                </div>

                                <div>
                                    <strong className="block text-gray-600">
                                        Anomalies
                                    </strong>
                                    <span>
                                        flag CPA spikes exceeding {anomalyThresholds.cpaSpike}%
                                        of the 7-day average and overspend above {anomalyThresholds.overspend}%
                                        of daily budget.
                                    </span>
                                </div>

                                <div>
                                    <strong className="block text-gray-600">
                                        Poor Performers
                                    </strong>
                                    <span>
                                        identifies active ads ≥14 days old that aren't converting efficiently.
                                    </span>
                                </div>

                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <AdAccountAudit
                open={auditOpen}
                onOpenChange={setAuditOpen}
                adAccountId={selectedAdAccount}
                adAccountName={selectedAdAccountName}
                kpiType={metricMode === 'roas' ? 'roas' : 'cpa'}
                conversionEvent={adAccountSettings?.conversionEvent}
                targetCPA={adAccountSettings?.targetCPA}
                targetROAS={adAccountSettings?.targetROAS}
            />
            <SlackAlertsDialog
                open={showSlackDialog}
                onClose={() => setShowSlackDialog(false)}
                slackConnected={slackConnected}
                slackChannelName={slackChannelName}
                slackAlertsEnabled={slackAlertsEnabled}
                onSlackAlertsEnabledChange={setSlackAlertsEnabled}
                onSlackDisconnect={handleSlackDisconnect}
                slackDisconnecting={slackDisconnecting}
            />
            <AccountSummaryDialog
                open={showSummaryDialog}
                onClose={() => setShowSummaryDialog(false)}
                adAccountId={selectedAdAccount}
            />
            {/* ── Custom Settings Popup ── */}
            {showSettingsDialog && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-50"
                        style={{ top: -25, left: 0, right: 0, bottom: 0, position: 'fixed' }}
                        onClick={() => setShowSettingsDialog(false)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="bg-white rounded-[28px] shadow-2xl w-full max-w-[520px] max-h-[90vh] flex flex-col overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Scrollable area */}
                            <div className="p-8 pb-6 space-y-6 flex-1 overflow-y-auto min-h-0">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h2 className="text-xl font-semibold flex items-center gap-2">
                                            <Settings2 className="w-5 h-5" />
                                            Analytics Settings
                                        </h2>
                                        <p className="text-sm text-gray-500">
                                            Configure optimization mode, recommendations, anomaly detection, and alerts
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowSettingsDialog(false)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="space-y-6">

                                    {/* ── Optimization Focus ── */}
                                    <div className="space-y-4">
                                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-purple-500" />
                                            Optimization Focus
                                        </h3>
                                        <div className="space-y-4 pl-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-700">
                                                        {tempAnalyticsMode === 'roas'
                                                            ? 'Optimizing for Return on Ad Spend'
                                                            : 'Optimizing for Cost Per Action'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-xs font-medium", tempAnalyticsMode === 'cpa' ? "text-green-600" : "text-gray-400")}>CPA</span>
                                                    <Switch
                                                        checked={tempAnalyticsMode === 'roas'}
                                                        onCheckedChange={(checked) => {
                                                            const next = checked ? 'roas' : 'cpa'
                                                            setTempAnalyticsMode(next)
                                                            if (next === 'cpa' && selectedAdAccount) {
                                                                fetchConversionEvents(selectedAdAccount)
                                                            }
                                                        }}
                                                        className="data-[state=unchecked]:bg-green-500"
                                                    />
                                                    <span className={cn("text-xs font-medium", tempAnalyticsMode === 'roas' ? "text-blue-600" : "text-gray-400")}>ROAS</span>
                                                </div>
                                            </div>

                                            {tempAnalyticsMode === 'cpa' && (
                                                <div className="space-y-2">
                                                    <p className="text-sm text-gray-600">Conversion Event</p>
                                                    {conversionEventsLoading ? (
                                                        <div className="flex items-center gap-2 py-2">
                                                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                                            <span className="text-xs text-gray-400">Loading events...</span>
                                                        </div>
                                                    ) : conversionEvents.length > 0 ? (
                                                        <div className="max-h-[150px] overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 custom-scrollbar">
                                                            {conversionEvents.filter(e => e.totalAdsets > 0 || e.activeAdsets > 0).concat(
                                                                conversionEvents.filter(e => e.totalAdsets === 0 && e.activeAdsets === 0)
                                                            ).map((evt) => {
                                                                const isSelected = tempConversionEvent === evt.event
                                                                return (
                                                                    <button
                                                                        key={evt.event}
                                                                        onClick={() => setTempConversionEvent(evt.event)}
                                                                        className={cn(
                                                                            "w-full flex items-center justify-between px-3.5 py-2 text-left transition-colors",
                                                                            isSelected ? "bg-blue-50" : "hover:bg-gray-50"
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
                                                                                <p className="text-[10px] text-gray-400">
                                                                                    {evt.activeAdsets} active ad set{evt.activeAdsets !== 1 ? 's' : ''}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        {isSelected && (
                                                                            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                                                        )}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 py-2">
                                                            Events will be auto-detected from your ad sets.
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200" />

                                    {/* ── Target KPI (conditional) ── */}
                                    <div className="space-y-4">
                                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                            <Target className="w-4 h-4 text-blue-500" />
                                            Target KPI
                                        </h3>
                                        <p className="text-xs text-gray-500 pl-6">
                                            Sets a benchmark for recommendations. If your target is stricter than the account average, recommendations will use the target instead.
                                        </p>
                                        <div className="space-y-4 pl-6">
                                            {tempAnalyticsMode === 'cpa' ? (
                                                <div className="space-y-2">
                                                    <p className="text-sm text-gray-600">Target CPA ($)</p>
                                                    <input
                                                        type="number"
                                                        value={tempTargetCPA}
                                                        onChange={(e) => setTempTargetCPA(e.target.value)}
                                                        placeholder="e.g. 30"
                                                        className="w-28 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-sm text-gray-600">Target ROAS (x)</p>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={tempTargetROAS}
                                                        onChange={(e) => setTempTargetROAS(e.target.value)}
                                                        placeholder="e.g. 3.0"
                                                        className="w-28 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200" />

                                    {/* ── Anomaly Thresholds ── */}
                                    <div className="space-y-4">
                                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                                            Anomaly Thresholds
                                        </h3>

                                        <div className="space-y-4 pl-6">
                                            <div className="space-y-2">
                                                <p className="text-sm text-gray-600">CPA Spike Threshold (%)</p>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="number"
                                                        value={tempThresholds.cpaSpike}
                                                        onChange={(e) => setTempThresholds(prev => ({ ...prev, cpaSpike: e.target.value }))}
                                                        onBlur={(e) => setTempThresholds(prev => ({ ...prev, cpaSpike: parseInt(e.target.value) || 50 }))}
                                                        className="w-24 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                    <span className="text-sm text-gray-500">
                                                        Alert when CPA increases by more than this % vs 7-day average
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-sm text-gray-600">Overspend Threshold (%)</p>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="number"
                                                        value={tempThresholds.overspend}
                                                        onChange={(e) => setTempThresholds(prev => ({ ...prev, overspend: e.target.value }))}
                                                        onBlur={(e) => setTempThresholds(prev => ({ ...prev, overspend: parseInt(e.target.value) || 150 }))}
                                                        className="w-24 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                    <span className="text-sm text-gray-500">
                                                        Alert when daily spend exceeds this % of budget (ABO only)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>



                                    {/* ── Slack Alerts ── */}
                                    {/* <div className="space-y-4">
                                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: SLACK_PURPLE }}>
                                                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z" />
                                                </svg>
                                            </div>
                                            Slack Alerts
                                        </h3>

                                        <div className="pl-6 space-y-4">
                                            {!slackConnected ? (
                                                <>
                                                    <p className="text-xs text-gray-500">
                                                        Connect Slack to receive anomaly alerts in your chosen channel.
                                                    </p>

                                                    <a href={`${API_BASE_URL}/api/analytics/slack/install`}
                                                        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-sm font-medium text-white transition-colors hover:opacity-90"
                                                        style={{ backgroundColor: SLACK_PURPLE }}
                                                    >
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.124a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z" />
                                                        </svg>
                                                        Connect to Slack
                                                    </a>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                            <div>
                                                                <p className="text-sm text-gray-700">Connected to <span className="font-medium">{slackChannelName || 'Slack'}</span></p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={handleSlackDisconnect}
                                                            disabled={slackDisconnecting}
                                                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                                                        >
                                                            {slackDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm text-gray-700">Enable alerts for this account</p>
                                                            <p className="text-xs text-gray-500">
                                                                Get notified when CPA spikes or overspend is detected
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            checked={tempSlackAlertsEnabled}
                                                            onCheckedChange={setTempSlackAlertsEnabled}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div> */}
                                </div>
                            </div>

                            {/* Sticky blue bottom bar */}
                            <div className="flex-shrink-0 bg-blue-600 px-8 py-1.5 flex items-center justify-center gap-6 rounded-b-[28px]">

                                <button
                                    onClick={handleSaveSettings}
                                    disabled={savingSettings}
                                    className="rounded-xl bg-white text-blue-600 hover:bg-gray-100 px-6 h-9 text-sm font-medium transition-colors disabled:opacity-70 flex items-center gap-2"
                                >
                                    {savingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    {savingSettings ? 'Saving...' : 'Save Settings'}
                                </button>
                                <button
                                    onClick={() => setShowSettingsDialog(false)}
                                    className="text-white text-sm font-medium hover:underline"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
