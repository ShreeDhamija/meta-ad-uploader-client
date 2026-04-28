"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
    AlertTriangle, Loader2, ChevronsUpDown, RefreshCw,
    Target, Settings2, Activity, Zap, CheckCircle2, BarChart3, FileBarChart2, FileText, ChevronDown
} from "lucide-react"
import { toast } from "sonner"
import { useAppData } from "@/lib/AppContext"
import useAdAccountSettings from "@/lib/useAdAccountSettings"
import useGlobalSettings from "@/lib/useGlobalSettings"
import { saveSettings } from "@/lib/saveSettings"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import slackWhite from "@/assets/icons/analytics/slackwhite.svg"
import KPIChart from "./analytics/KPIChart"
import WeeklyChart from "./analytics/WeeklyChart"
import AnalyticsDateRangePicker from "./analytics/AnalyticsDateRangePicker"
import RecommendationCards from "./analytics/RecommendationCards"
import AnalyticsOnboarding from "./analytics/AnalyticsOnboarding"
import AggregateKPIDialog from "./analytics/AggregateKPIDialog"
import AdAccountAudit from "./analytics/AdAccountAudit"
import SlackAlertsDialog from "./analytics/SlackAlertsDialog"
import AccountSummaryDialog from "./analytics/AccountSummaryDialog"
import {
    buildAnalyticsDateQueryParams,
    createAnalyticsDateRangeFromPreset,
    getAnalyticsDateRangeCacheKey,
} from "./analytics/dateRangeUtils"


const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';
const SELECTED_ACCOUNT_KEY = 'analytics-selected-ad-account'

const DEFAULT_THRESHOLDS = {
    cpaSpike: 50,
    overspend: 150,
};

function formatEventName(actionType) {
    if (!actionType) return 'Auto-detected event'
    if (actionType.startsWith('offsite_conversion.fb_pixel_custom.')) {
        return actionType.slice('offsite_conversion.fb_pixel_custom.'.length)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase())
    }
    if (actionType === 'offsite_conversion.fb_pixel_custom') return 'Custom Event'
    if (actionType.startsWith('offsite_conversion.custom.')) return 'Custom Conversion'
    if (actionType.startsWith('offsite_conversion.fb_pixel_')) {
        return actionType.slice('offsite_conversion.fb_pixel_'.length)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase())
    }
    return actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function AnalyticsDashboard() {
    const { adAccounts, adAccountsLoading } = useAppData()
    const { loading: globalSettingsLoading, hasSeenAnalyticsOnboarding } = useGlobalSettings()

    // ── Onboarding state 
    const [showOnboarding, setShowOnboarding] = useState(false)

    // ── Core state
    const [selectedAdAccount, setSelectedAdAccount] = useState(() => {
        try { return localStorage.getItem(SELECTED_ACCOUNT_KEY) || null } catch { return null }
    })
    const [openAdAccount, setOpenAdAccount] = useState(false)
    const [searchValue, setSearchValue] = useState("")
    // const [metricMode, setMetricMode] = useState("cpr") // cpr | roas
    // const [modeAutoDetected, setModeAutoDetected] = useState(false)
    const [activeTab, setActiveTab] = useState("budget")
    const [analyticsDateRange, setAnalyticsDateRange] = useState(() => createAnalyticsDateRangeFromPreset("last_30d"))

    // ── Aggregate KPI dialog 
    const [showAggregateDialog, setShowAggregateDialog] = useState(false)

    // ── Settings 
    const [showSettingsDialog, setShowSettingsDialog] = useState(false)
    // const [anomalyThresholds, setAnomalyThresholds] = useState(DEFAULT_THRESHOLDS)
    const [tempThresholds, setTempThresholds] = useState(DEFAULT_THRESHOLDS)

    // ── Target KPI (lives in settings dialog, feeds recommendations) 
    const [tempTargetCPA, setTempTargetCPA] = useState("")
    const [tempTargetROAS, setTempTargetROAS] = useState("")

    // ── Mode/Event preferences in settings dialog 
    const [tempAnalyticsMode, setTempAnalyticsMode] = useState("roas")
    const [tempConversionEvent, setTempConversionEvent] = useState(null)
    const [conversionEvents, setConversionEvents] = useState([])
    const [conversionEventsLoading, setConversionEventsLoading] = useState(false)
    const [stableMetricMode, setStableMetricMode] = useState("cpr")

    // ── Slack state 
    const [slackConnected, setSlackConnected] = useState(false)
    const [slackChannelName, setSlackChannelName] = useState(null)
    // const [slackAlertsEnabled, setSlackAlertsEnabled] = useState(false)
    const [tempSlackAlertsEnabled, setTempSlackAlertsEnabled] = useState(false)
    const [slackDisconnecting, setSlackDisconnecting] = useState(false)
    const [showSlackDialog, setShowSlackDialog] = useState(false)
    const [showSummaryDialog, setShowSummaryDialog] = useState(false)
    // ── Data state 
    const [recommendations, setRecommendations] = useState(null)
    const [recsLoading, setRecsLoading] = useState(false)
    const [budgetRefreshSignal, setBudgetRefreshSignal] = useState(null)

    const [poorAds, setPoorAds] = useState(null)
    const [poorAdsLoading, setPoorAdsLoading] = useState(false)

    const [dailyInsights, setDailyInsights] = useState(null)
    const [dailyLoading, setDailyLoading] = useState(false)

    const [weeklyInsights, setWeeklyInsights] = useState(null)
    const [weeklyLoading, setWeeklyLoading] = useState(false)
    const [savingSettings, setSavingSettings] = useState(false)



    const [auditOpen, setAuditOpen] = useState(false)
    // Per-account response caches (session-scoped, cleared on tab close)
    const recsCacheRef = useRef({})       // { [accountId]: responsePayload }
    const poorAdsCacheRef = useRef({})    // { [accountId]: responsePayload }
    const fetchedRef = useRef({})         // dedup guard for account-info
    const dailyInsightsCacheRef = useRef({})
    const dailyInsightsAbortRef = useRef(null)
    const weeklyInsightsCacheRef = useRef({})
    const weeklyInsightsAbortRef = useRef(null)
    const pendingDailySettingsRef = useRef(null)
    const currentAccountRef = useRef(null)


    // ── Ad account settings hook ────────────────────────────
    const {
        settings: adAccountSettings,
        setSettings: setAdAccountSettings,
        loading: adAccountSettingsLoading
    } = useAdAccountSettings(selectedAdAccount)

    const metricMode = adAccountSettingsLoading
        ? stableMetricMode
        : adAccountSettings?.analyticsMode === 'roas' ? 'roas' : 'cpr'
    const targetCPA = adAccountSettings?.targetCPA ?? null
    const targetROAS = adAccountSettings?.targetROAS ?? null
    const anomalyThresholds = adAccountSettings?.anomalyThresholds ?? DEFAULT_THRESHOLDS
    const slackAlertsEnabled = adAccountSettings?.slackAlertsEnabled ?? false
    const preferencesLoading = Boolean(selectedAdAccount) && adAccountSettingsLoading

    useEffect(() => {
        if (adAccountSettingsLoading) return
        setStableMetricMode(adAccountSettings?.analyticsMode === 'roas' ? 'roas' : 'cpr')
    }, [adAccountSettingsLoading, adAccountSettings?.analyticsMode])

    useEffect(() => {
        if (!showSettingsDialog || adAccountSettingsLoading) return

        setTempThresholds(anomalyThresholds)
        setTempTargetCPA(targetCPA ? String(targetCPA) : "")
        setTempTargetROAS(targetROAS ? String(targetROAS) : "")
        setTempSlackAlertsEnabled(slackAlertsEnabled)
        setTempAnalyticsMode(adAccountSettings?.analyticsMode || 'roas')
        setTempConversionEvent(adAccountSettings?.conversionEvent || null)
    }, [
        showSettingsDialog,
        adAccountSettingsLoading,
        anomalyThresholds,
        targetCPA,
        targetROAS,
        slackAlertsEnabled,
        adAccountSettings?.analyticsMode,
        adAccountSettings?.conversionEvent
    ])


    // ── Show onboarding on first visit ──────────────────────
    useEffect(() => {
        if (!globalSettingsLoading && !adAccountsLoading && adAccounts?.length > 0 && !hasSeenAnalyticsOnboarding) {
            setShowOnboarding(true)
        }
    }, [globalSettingsLoading, adAccountsLoading, adAccounts, hasSeenAnalyticsOnboarding])


    // useEffect(() => {
    //     if (!adAccountSettingsLoading && adAccountSettings) {
    //         if (adAccountSettings.anomalyThresholds) {
    //             setAnomalyThresholds(adAccountSettings.anomalyThresholds)
    //             setTempThresholds(adAccountSettings.anomalyThresholds)
    //         }
    //         if (adAccountSettings.slackAlertsEnabled !== undefined) {
    //             setSlackAlertsEnabled(adAccountSettings.slackAlertsEnabled)
    //             setTempSlackAlertsEnabled(adAccountSettings.slackAlertsEnabled)
    //         }
    //         if (adAccountSettings.targetCPA !== undefined && adAccountSettings.targetCPA !== null) {
    //             setTargetCPA(adAccountSettings.targetCPA)
    //             setTempTargetCPA(String(adAccountSettings.targetCPA))
    //         } else {
    //             setTargetCPA(null)
    //             setTempTargetCPA("")
    //         }
    //         if (adAccountSettings.targetROAS !== undefined && adAccountSettings.targetROAS !== null) {
    //             setTargetROAS(adAccountSettings.targetROAS)
    //             setTempTargetROAS(String(adAccountSettings.targetROAS))
    //         } else {
    //             setTargetROAS(null)
    //             setTempTargetROAS("")
    //         }

    //         // Load saved analytics mode preference
    //         if (adAccountSettings.analyticsMode) {
    //             const savedMode = adAccountSettings.analyticsMode === 'roas' ? 'roas' : 'cpr'
    //             setMetricMode(savedMode)
    //             modeCache.current[selectedAdAccount] = savedMode
    //             setModeAutoDetected(false)
    //         }
    //     }
    // }, [adAccountSettingsLoading, adAccountSettings, selectedAdAccount])

    // ── Check Slack connection (per-user, runs once) 

    useEffect(() => {
        const checkSlack = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/analytics/slack/status`, { credentials: 'include' })
                const data = await res.json()
                setSlackConnected(!!data.connected)
                setSlackChannelName(data.channelName || null)
            } catch { /* silent */ }
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

    const adAccountDropdownHeight = useMemo(() => {
        const rowCount = filteredAdAccounts.length + (adAccounts?.length > 1 ? 1 : 0)
        return Math.min(300, Math.max(44, rowCount * 40 + 8))
    }, [filteredAdAccounts.length, adAccounts?.length])

    const optimizationFocusLabel = useMemo(() => {
        if (metricMode === 'roas') return 'Optimization Focus: ROAS'

        const conversionEventLabel = adAccountSettings?.conversionEvent
            ? formatEventName(adAccountSettings.conversionEvent)
            : null

        return conversionEventLabel
            ? `Optimization Focus: CPA · ${conversionEventLabel}`
            : 'Optimization Focus: CPA'
    }, [metricMode, adAccountSettings?.conversionEvent])

    const anomalyDetectionDescription = useMemo(() => {
        const cpaSpike = parseInt(anomalyThresholds.cpaSpike, 10) || DEFAULT_THRESHOLDS.cpaSpike
        const overspend = parseInt(anomalyThresholds.overspend, 10) || DEFAULT_THRESHOLDS.overspend

        return `monitors CPA spikes above ${cpaSpike}% of the 7-day average and overspend above ${overspend}% of daily budget.`
    }, [anomalyThresholds.cpaSpike, anomalyThresholds.overspend])

    const recsCount = recommendations?.recommendations?.length || 0
    const poorAdsCount = poorAds?.ads?.length || 0




    const fetchAccountInfo = useCallback(async (accountId) => {
        const key = `account-info-${accountId}`
        if (fetchedRef.current[key]) return
        fetchedRef.current[key] = true

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/analytics/account-info?adAccountId=${accountId}`,
                { credentials: 'include' }
            )
            const data = await res.json()

            // Only auto-set mode if user has no saved preference
            if (res.ok && data.suggestedMode && !adAccountSettings?.analyticsMode) {
                setAdAccountSettings(prev => ({
                    ...prev,
                    analyticsMode: data.suggestedMode === 'roas' ? 'roas' : 'cpa'
                }))
            }
        } catch (err) {
            console.error('Account info error:', err)
        }
    }, [adAccountSettings?.analyticsMode, setAdAccountSettings])

    // ── Fetch conversion events for settings dialog ─────────
    const fetchConversionEvents = useCallback(async (accountId) => {
        setConversionEvents([])
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




    const fetchRecommendations = useCallback(async (force = false) => {
        if (!selectedAdAccount) return
        const accountAtStart = selectedAdAccount

        // Return cached data unless forced
        if (!force && recsCacheRef.current[accountAtStart]) {
            setRecommendations(recsCacheRef.current[accountAtStart])
            setRecsLoading(false)
            return
        }

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

            // Discard if user switched accounts while we were fetching
            if (currentAccountRef.current !== accountAtStart) return

            if (res.ok) {
                recsCacheRef.current[accountAtStart] = data
                setRecommendations(data)
            } else {
                toast.error(data.error || 'Failed to fetch recommendations')
            }
        } catch (err) {
            if (currentAccountRef.current !== accountAtStart) return
            console.error('Recommendations error:', err)
            toast.error('Failed to fetch recommendations')
        } finally {
            // Only update loading state if we're still on the same account
            if (currentAccountRef.current === accountAtStart) setRecsLoading(false)
        }
    }, [selectedAdAccount, metricMode, targetCPA, targetROAS, adAccountSettings?.conversionEvent])




    const fetchPoorAds = useCallback(async (force = false) => {
        if (!selectedAdAccount) return
        const accountAtStart = selectedAdAccount

        if (!force && poorAdsCacheRef.current[accountAtStart]) {
            setPoorAds(poorAdsCacheRef.current[accountAtStart])
            setPoorAdsLoading(false)
            return
        }

        setPoorAdsLoading(true)
        try {
            let url = `${API_BASE_URL}/api/analytics/poor-performing-ads?adAccountId=${selectedAdAccount}&mode=${metricMode}`
            if (adAccountSettings?.conversionEvent) {
                url += `&conversionEvent=${encodeURIComponent(adAccountSettings.conversionEvent)}`
            }

            const res = await fetch(url, { credentials: 'include' })
            const data = await res.json()

            if (currentAccountRef.current !== accountAtStart) return

            if (res.ok) {
                poorAdsCacheRef.current[accountAtStart] = data
                setPoorAds(data)
            } else {
                toast.error(data.error || 'Failed to fetch poor performing ads')
            }
        } catch (err) {
            if (currentAccountRef.current !== accountAtStart) return
            console.error('Poor ads error:', err)
            toast.error('Failed to fetch poor performing ads')
        } finally {
            if (currentAccountRef.current === accountAtStart) setPoorAdsLoading(false)
        }
    }, [selectedAdAccount, metricMode, adAccountSettings?.conversionEvent])


    const buildAnalyticsQueryString = useCallback((accountId, dateRange, extraParams = {}) => {
        const params = buildAnalyticsDateQueryParams(dateRange)
        params.set("adAccountId", accountId)

        Object.entries(extraParams).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== "") {
                params.set(key, value)
            }
        })

        return params.toString()
    }, [])

    const getDailyInsightsCacheKey = useCallback((accountId, dateRange, conversionEvent) => {
        return `${accountId}::${getAnalyticsDateRangeCacheKey(dateRange)}::${conversionEvent || "__auto__"}`
    }, [])

    const getWeeklyInsightsCacheKey = useCallback((accountId, dateRange) => {
        return `${accountId}::${getAnalyticsDateRangeCacheKey(dateRange)}`
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

    const clearWeeklyInsightsCache = useCallback((accountId = null) => {
        if (!accountId) {
            weeklyInsightsCacheRef.current = {}
            return
        }

        const prefix = `${accountId}::`
        Object.keys(weeklyInsightsCacheRef.current).forEach((key) => {
            if (key.startsWith(prefix)) delete weeklyInsightsCacheRef.current[key]
        })
    }, [])

    const loadDailyInsights = useCallback(async ({
        accountId = selectedAdAccount,
        dateRange = analyticsDateRange,
        conversionEvent = adAccountSettings?.conversionEvent || null,
        force = false,
    } = {}) => {
        if (!accountId) return

        if (dailyInsightsAbortRef.current) {
            dailyInsightsAbortRef.current.abort()
            dailyInsightsAbortRef.current = null
        }

        const cacheKey = getDailyInsightsCacheKey(accountId, dateRange, conversionEvent)
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
            const query = buildAnalyticsQueryString(accountId, dateRange, { conversionEvent })
            const url = `${API_BASE_URL}/api/analytics/daily-insights?${query}`

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
    }, [
        selectedAdAccount,
        analyticsDateRange,
        adAccountSettings?.conversionEvent,
        buildAnalyticsQueryString,
        getDailyInsightsCacheKey,
    ])

    const fetchWeeklyInsights = useCallback(async ({
        accountId = selectedAdAccount,
        dateRange = analyticsDateRange,
        force = false,
    } = {}) => {
        if (!accountId) return

        if (weeklyInsightsAbortRef.current) {
            weeklyInsightsAbortRef.current.abort()
            weeklyInsightsAbortRef.current = null
        }

        const cacheKey = getWeeklyInsightsCacheKey(accountId, dateRange)
        const cachedPayload = weeklyInsightsCacheRef.current[cacheKey]

        if (!force && cachedPayload) {
            setWeeklyInsights(cachedPayload)
            setWeeklyLoading(false)
            return
        }

        const controller = new AbortController()
        weeklyInsightsAbortRef.current = controller

        setWeeklyInsights(null)
        setWeeklyLoading(true)
        try {
            const query = buildAnalyticsQueryString(accountId, dateRange)
            const res = await fetch(`${API_BASE_URL}/api/analytics/weekly-insights?${query}`, {
                credentials: 'include',
                signal: controller.signal,
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch weekly insights')
            }

            if (controller.signal.aborted || weeklyInsightsAbortRef.current !== controller) return

            weeklyInsightsCacheRef.current[cacheKey] = data
            setWeeklyInsights(data)
        } catch (err) {
            if (err.name === 'AbortError') return
            console.error('Weekly insights error:', err)
        } finally {
            if (weeklyInsightsAbortRef.current === controller) {
                weeklyInsightsAbortRef.current = null
                setWeeklyLoading(false)
            }
        }
    }, [
        selectedAdAccount,
        analyticsDateRange,
        buildAnalyticsQueryString,
        getWeeklyInsightsCacheKey,
    ])

    // ── Data fetching triggers ──────────────────────────────
    useEffect(() => {
        if (adAccountsLoading || !adAccounts?.length) return

        // If we already have a valid selection, just ensure refs are set
        if (selectedAdAccount && adAccounts.some(a => a.id === selectedAdAccount)) {
            if (!currentAccountRef.current) {
                currentAccountRef.current = selectedAdAccount
                pendingDailySettingsRef.current = selectedAdAccount
            }
            return
        }

        // No valid selection — pick first account
        const fallback = adAccounts[0].id
        pendingDailySettingsRef.current = fallback
        currentAccountRef.current = fallback
        setSelectedAdAccount(fallback)
        try { localStorage.setItem(SELECTED_ACCOUNT_KEY, fallback) } catch { }
    }, [adAccountsLoading, adAccounts, selectedAdAccount])




    // Traffic metrics don't depend on settings, fetch immediately.
    useEffect(() => {
        if (selectedAdAccount) {
            fetchWeeklyInsights()
        }
    }, [selectedAdAccount, analyticsDateRange, fetchWeeklyInsights])

    // Account info auto-detection should only run AFTER settings have loaded,
    // so modeCache is already populated if the user has a saved preference
    useEffect(() => {
        if (selectedAdAccount && !adAccountSettingsLoading) {
            fetchAccountInfo(selectedAdAccount)
        }
    }, [selectedAdAccount, adAccountSettingsLoading, fetchAccountInfo])




    useEffect(() => {
        if (!selectedAdAccount) return
        if (adAccountSettingsLoading) return

        fetchRecommendations()
        fetchPoorAds()
    }, [selectedAdAccount, adAccountSettingsLoading, fetchRecommendations, fetchPoorAds])

    useEffect(() => {
        if (!showSettingsDialog || !selectedAdAccount || adAccountSettingsLoading) return
        if (tempAnalyticsMode !== 'cpa') return

        fetchConversionEvents(selectedAdAccount)
    }, [showSettingsDialog, selectedAdAccount, adAccountSettingsLoading, tempAnalyticsMode, fetchConversionEvents])

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
            if (weeklyInsightsAbortRef.current) {
                weeklyInsightsAbortRef.current.abort()
                weeklyInsightsAbortRef.current = null
            }
            setDailyInsights(null)
            setDailyLoading(false)
            setWeeklyInsights(null)
            setWeeklyLoading(false)
            return
        }

        if (adAccountSettingsLoading || pendingDailySettingsRef.current === selectedAdAccount) {
            return
        }

        loadDailyInsights()
    }, [
        selectedAdAccount,
        analyticsDateRange,
        adAccountSettingsLoading,
        adAccountSettings?.conversionEvent,
        loadDailyInsights,
    ])

    useEffect(() => {
        return () => {
            if (dailyInsightsAbortRef.current) {
                dailyInsightsAbortRef.current.abort()
            }
            if (weeklyInsightsAbortRef.current) {
                weeklyInsightsAbortRef.current.abort()
            }
        }
    }, [])



    const handleAdAccountSelect = (accountId) => {
        currentAccountRef.current = accountId
        pendingDailySettingsRef.current = accountId
        setSelectedAdAccount(accountId)
        setOpenAdAccount(false)
        try { localStorage.setItem(SELECTED_ACCOUNT_KEY, accountId) } catch { }

        // Abort any in-flight fetches
        if (dailyInsightsAbortRef.current) {
            dailyInsightsAbortRef.current.abort()
            dailyInsightsAbortRef.current = null
        }
        if (weeklyInsightsAbortRef.current) {
            weeklyInsightsAbortRef.current.abort()
            weeklyInsightsAbortRef.current = null
        }

        // Restore from session cache if available, otherwise null + fetch later
        const recsCache = recsCacheRef.current[accountId]
        const poorCache = poorAdsCacheRef.current[accountId]
        setRecommendations(recsCache ?? null)
        setPoorAds(poorCache ?? null)
        setRecsLoading(!recsCache)
        setPoorAdsLoading(!poorCache)

        const dailyKey = getDailyInsightsCacheKey(accountId, analyticsDateRange, adAccountSettings?.conversionEvent)
        const weeklyKey = getWeeklyInsightsCacheKey(accountId, analyticsDateRange)
        const cachedDaily = dailyInsightsCacheRef.current[dailyKey]
        const cachedWeekly = weeklyInsightsCacheRef.current[weeklyKey]
        setDailyInsights(cachedDaily ?? null)
        setWeeklyInsights(cachedWeekly ?? null)
        setDailyLoading(!cachedDaily)
        setWeeklyLoading(!cachedWeekly)
    }

    const handleRefreshBudgetRecommendations = useCallback(() => {
        if (!selectedAdAccount || adAccountSettingsLoading) return

        setBudgetRefreshSignal(`${selectedAdAccount}:${Date.now()}`)
        delete recsCacheRef.current[selectedAdAccount]
        setRecommendations(null)
        setRecsLoading(true)
        fetchRecommendations(true)
    }, [selectedAdAccount, adAccountSettingsLoading, fetchRecommendations])

    const handleRefreshPoorAds = useCallback(() => {
        if (!selectedAdAccount || adAccountSettingsLoading) return

        delete poorAdsCacheRef.current[selectedAdAccount]
        setPoorAds(null)
        setPoorAdsLoading(true)
        fetchPoorAds(true)
    }, [selectedAdAccount, adAccountSettingsLoading, fetchPoorAds])

    const handleRefreshCharts = useCallback(() => {
        if (!selectedAdAccount || adAccountSettingsLoading) return

        clearDailyInsightsCache(selectedAdAccount)
        clearWeeklyInsightsCache(selectedAdAccount)
        loadDailyInsights({ force: true })
        fetchWeeklyInsights({ force: true })
    }, [selectedAdAccount, adAccountSettingsLoading, clearDailyInsightsCache, clearWeeklyInsightsCache, loadDailyInsights, fetchWeeklyInsights])

    const handleSaveSettings = async () => {
        setSavingSettings(true)
        const newTargetCPA = tempTargetCPA ? parseFloat(tempTargetCPA) : null
        const newTargetROAS = tempTargetROAS ? parseFloat(tempTargetROAS) : null
        const modeForStorage = tempAnalyticsMode === 'roas' ? 'roas' : 'cpa'
        const nextConversionEvent = tempConversionEvent
        const nextMetricMode = modeForStorage === 'roas' ? 'roas' : 'cpr'
        const previousConversionEvent = adAccountSettings?.conversionEvent || null
        const shouldRefreshRecommendations =
            targetCPA !== newTargetCPA ||
            targetROAS !== newTargetROAS ||
            metricMode !== nextMetricMode ||
            previousConversionEvent !== nextConversionEvent
        const shouldRefreshPoorAds =
            metricMode !== nextMetricMode ||
            previousConversionEvent !== nextConversionEvent
        const shouldRefreshDailyInsights = previousConversionEvent !== nextConversionEvent

        try {
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

            // One update — all derived values update in a single render
            setAdAccountSettings(prev => ({
                ...prev,
                anomalyThresholds: tempThresholds,
                targetCPA: newTargetCPA,
                targetROAS: newTargetROAS,
                slackAlertsEnabled: tempSlackAlertsEnabled,
                analyticsMode: modeForStorage,
                conversionEvent: nextConversionEvent,
            }))
            setShowSettingsDialog(false)

            if (shouldRefreshRecommendations) {
                delete recsCacheRef.current[selectedAdAccount]
                setRecsLoading(true)
                setRecommendations(null)
            }

            if (shouldRefreshPoorAds) {
                delete poorAdsCacheRef.current[selectedAdAccount]
                setPoorAdsLoading(true)
                setPoorAds(null)
            }

            if (shouldRefreshDailyInsights) {
                clearDailyInsightsCache(selectedAdAccount)
                loadDailyInsights({
                    force: true,
                    accountId: selectedAdAccount,
                    dateRange: analyticsDateRange,
                    conversionEvent: nextConversionEvent,
                })
            }

            toast.success('Settings saved')
        } catch (err) {
            console.error('[Settings] Save FAILED:', err.message)
            toast.error(`Failed to save settings: ${err.message}`)
        } finally {
            setSavingSettings(false)
        }
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
                setAdAccountSettings(prev => ({ ...prev, slackAlertsEnabled: false }))
                setTempSlackAlertsEnabled(false)
                toast.success('Slack disconnected')
            } else {
                const data = await res.json().catch(() => ({}))
                toast.error(`Disconnect failed: ${data.error || res.status}`)
            }
        } catch {
            toast.error('Failed to disconnect Slack')
        } finally {
            setSlackDisconnecting(false)
        }
    }

    const openSettingsDialog = () => {
        setShowSettingsDialog(true)
    }

    const handleOnboardingComplete = () => {
        setShowOnboarding(false)
    }

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
                                className="w-[280px] justify-between rounded-2xl h-11 bg-white shadow-xs hover:bg-white"
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
                                    className="bg-transparent"
                                    wrapperClassName="bg-gray-50 border-gray-200 rounded-[20px]"
	                                />
                                <ScrollArea className="rounded-xl" style={{ height: adAccountDropdownHeight }}>
                                    <CommandList className="max-h-none overflow-visible rounded-xl" selectOnFocus={false}>
                                        {adAccounts?.length > 1 && (
                                            <CommandGroup>
                                                <CommandItem
                                                    value="__aggregate_kpi_view"
                                                    onSelect={() => {
                                                        setOpenAdAccount(false)
                                                        setShowAggregateDialog(true)
                                                    }}
                                                    className="mx-2 my-1 cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 font-medium shadow transition-colors duration-150 hover:!bg-gray-50 data-[selected=true]:bg-gray-50"
                                                >
                                                    <BarChart3 className="w-4 h-4 text-gray-500" />
                                                    Aggregate KPI View
                                                </CommandItem>
                                            </CommandGroup>
                                        )}
                                        <CommandGroup>
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
                                </ScrollArea>
	                            </Command>
	                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline" size="sm"
                        onClick={openSettingsDialog}
                        className="rounded-2xl h-11 min-w-[220px] max-w-full px-4"
                    >
                        <Settings2 className="w-4 h-4 mr-2" />
                        {adAccountSettingsLoading ? (
                            <span className="h-4 w-44 rounded-full bg-gray-200 animate-pulse" />
                        ) : (
                            <span className="truncate">{optimizationFocusLabel}</span>
                        )}
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="rounded-2xl h-11 px-4">
                                <FileText className="w-4 h-4 mr-2" />
                                Reports
                                <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[220px] rounded-2xl bg-white p-2 shadow-lg">
                            <DropdownMenuItem
                                onClick={() => setAuditOpen(true)}
                                className="cursor-pointer rounded-xl px-3 py-2 text-sm focus:bg-gray-100"
                            >
                                <FileBarChart2 className="w-4 h-4 text-gray-500" />
                                Audit Account
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setShowSummaryDialog(true)}
                                className="cursor-pointer rounded-xl px-3 py-2 text-sm focus:bg-gray-100"
                            >
                                <FileText className="w-4 h-4 text-gray-500" />
                                Account Summary
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        variant="outline" size="sm"
                        onClick={() => setShowSlackDialog(true)}
                        className="rounded-2xl h-11 w-11 p-0 flex items-center justify-center hover:bg-[#4A154B] bg-[#611f69] shadow-xs transition-colors"
                        title="Slack Alerts"
                    >
                        <img src={slackWhite} alt="Slack" className="w-5 h-5" />
                    </Button>


                </div>
            </div>

            {/* ── Charts Row  */}
            {selectedAdAccount && (
                <Card className="rounded-3xl border-gray-200 overflow-visible">
                    <CardContent className="p-0">
                        <div className="flex justify-end items-center gap-2 px-4 pt-4 lg:hidden">
                            <AnalyticsDateRangePicker
                                value={analyticsDateRange}
                                onChange={setAnalyticsDateRange}
                                compact
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefreshCharts}
                                disabled={dailyLoading || weeklyLoading}
                                className="rounded-xl h-9 w-9 p-0"
                                title="Refresh charts"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", (dailyLoading || weeklyLoading) && "animate-spin")} />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 lg:relative lg:min-h-[360px] lg:grid-cols-2 lg:pt-4">
                            <div>
                                <KPIChart
                                    data={dailyInsights}
                                    loading={dailyLoading}
                                    mode={metricMode}
                                />
                            </div>
                            <div className="border-t border-gray-200 lg:border-t-0">
                                <WeeklyChart
                                    data={weeklyInsights}
                                    loading={weeklyLoading}
                                />
                            </div>
                            <div className="pointer-events-none absolute left-1/2 top-[7%] hidden h-[90%] -translate-x-1/2 border-l border-dashed border-gray-300 lg:block" />
                            <div className="absolute left-1/2 top-0 z-20 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 lg:flex">
                                <AnalyticsDateRangePicker
                                    value={analyticsDateRange}
                                    onChange={setAnalyticsDateRange}
                                    compact
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefreshCharts}
                                    disabled={dailyLoading || weeklyLoading}
                                    className="rounded-xl h-9 w-9 p-0 bg-white"
                                    title="Refresh charts"
                                >
                                    <RefreshCw className={cn("w-3.5 h-3.5", (dailyLoading || weeklyLoading) && "animate-spin")} />
                                </Button>
                            </div>
                        </div>

                    </CardContent>
                </Card>
            )}

            {/* ── Tab Switcher ── */}
            <div className="w-full">
                <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl w-full border border-gray-200/60">
                    <button
                        onClick={() => setActiveTab('budget')}
                        className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-2xl transition-all duration-200",
                            activeTab === 'budget'
                                ? "bg-white text-gray-900 shadow-xs ring-1 ring-black/5"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                        )}
                    >
                        <Zap className="w-4 h-4" />
                        <span className="hidden sm:inline">Budget Recommendations</span>
                        <span className="sm:hidden">Budget</span>
                        {!recsLoading && recommendations && recsCount > 0 ? (
                            <Badge className="ml-1 text-xs px-1.5 py-0 bg-blue-100 text-blue-800 hover:bg-yellow-100 rounded-2xl shadow-none">
                                {recsCount}
                            </Badge>
                        ) : null}
                    </button>
                    <button
                        onClick={() => setActiveTab('poor-performers')}
                        className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-2xl transition-all duration-200",
                            activeTab === 'poor-performers'
                                ? "bg-white text-gray-900 shadow-xs ring-1 ring-black/5"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                        )}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        <span className="hidden sm:inline">Poor Performers</span>
                        <span className="sm:hidden">Poor</span>
                        {!poorAdsLoading && poorAds && poorAdsCount > 0 && (
                            <Badge className="ml-1 text-xs px-1.5 py-0 bg-red-100 text-red-700 hover:bg-red-100 rounded-2xl shadow-none">
                                {poorAdsCount}
                            </Badge>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Tab Content ── */}
            {preferencesLoading ? (
                <Card className="rounded-2xl">
                    <CardContent className="py-12">
                        <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            <p className="text-sm text-gray-500">Loading saved analytics preferences before fetching insights...</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {activeTab === 'budget' && (
                        <RecommendationCards
                            section="budget"
                            data={recommendations}
                            loading={recsLoading}
                            mode={metricMode}
                            adAccountId={selectedAdAccount}
                            adAccounts={adAccounts}
                            poorAdsData={poorAds}
                            poorAdsLoading={poorAdsLoading}
                            onRefreshBudgetRecommendations={handleRefreshBudgetRecommendations}
                            onRefreshPoorAds={handleRefreshPoorAds}
                            budgetRefreshing={recsLoading}
                            budgetRefreshToken={budgetRefreshSignal}
                        />
                    )}

                    {activeTab === 'poor-performers' && (
                        <RecommendationCards
                            section="poor-performers"
                            data={recommendations}
                            loading={recsLoading}
                            mode={metricMode}
                            adAccountId={selectedAdAccount}
                            adAccounts={adAccounts}
                            poorAdsData={poorAds}
                            poorAdsLoading={poorAdsLoading}
                            onRefreshBudgetRecommendations={handleRefreshBudgetRecommendations}
                            onRefreshPoorAds={handleRefreshPoorAds}
                            budgetRefreshing={recsLoading}
                            budgetRefreshToken={budgetRefreshSignal}
                        />
                    )}
                </>
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
                                        compare each campaign/adset&apos;s {metricMode === 'cpr' ? 'CPA' : 'ROAS'} against
                                        {(metricMode === 'cpr' && targetCPA) || (metricMode === 'roas' && targetROAS)
                                            ? ' your target KPI (or account average if target is less strict)'
                                            : ' the spend-weighted account average'
                                        } over 3-day windows.
                                    </span>
                                </div>

                                <div>
                                    <strong className="block text-gray-600">
                                        Poor Performers
                                    </strong>
                                    <span>
                                        identifies active ads ≥14 days old that aren&apos;t converting efficiently.
                                    </span>
                                </div>

                                <div>
                                    <strong className="block text-gray-600">
                                        Anomaly Detection
                                    </strong>
                                    <span>
                                        {adAccountSettingsLoading ? (
                                            <span className="inline-block h-3 w-80 max-w-full rounded-full bg-gray-200 align-middle animate-pulse" />
                                        ) : (
                                            anomalyDetectionDescription
                                        )}
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
                onSlackAlertsEnabledChange={(val) => setAdAccountSettings(prev => ({ ...prev, slackAlertsEnabled: val }))}
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
                        className="fixed bg-black/50 z-50"
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100vw",
                            height: "100dvh",
                        }}
                        onClick={() => setShowSettingsDialog(false)}
                    />

	                    <div
	                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
	                        onClick={() => setShowSettingsDialog(false)}
	                    >
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

                                {adAccountSettingsLoading ? (
                                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                        <p className="text-sm text-gray-500">Loading saved analytics preferences...</p>
                                    </div>
                                ) : (
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
                                                                {conversionEvents.map((evt) => {
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
                                                                                {evt.count > 0 && (
                                                                                    <p className="text-[10px] text-gray-400">
                                                                                        {evt.count} ad set{evt.count !== 1 ? 's' : ''}
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
                                                            className="w-28 px-3 py-2.5 border border-gray-300 rounded-2xl bg-white text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                                            className="w-28 px-3 py-2.5 border border-gray-300 rounded-2xl bg-white text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                            <p className="text-xs text-gray-500 pl-6">
                                                Anomaly detection compares current CPA and spend pacing against recent account baselines, then flags unusual spikes early so you can review them before they compound.
                                            </p>

                                            <div className="space-y-4 pl-6">
                                                <div className="space-y-2">
                                                    <p className="text-sm text-gray-600">CPA Spike Threshold (%)</p>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="number"
                                                            value={tempThresholds.cpaSpike}
                                                            onChange={(e) => setTempThresholds(prev => ({ ...prev, cpaSpike: e.target.value }))}
                                                            onBlur={(e) => setTempThresholds(prev => ({ ...prev, cpaSpike: parseInt(e.target.value) || 50 }))}
                                                            className="w-24 px-3 py-2.5 border border-gray-300 rounded-2xl bg-white text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                                            className="w-24 px-3 py-2.5 border border-gray-300 rounded-2xl bg-white text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                        <span className="text-sm text-gray-500">
                                                            Alert when daily spend exceeds this % of budget (ABO only)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>




                                    </div>
                                )}
                            </div>

                            {/* Sticky blue bottom bar */}
                            <div className="flex-shrink-0 bg-blue-600 px-8 py-1.5 flex items-center justify-center gap-6 rounded-b-[28px]">

                                <button
                                    onClick={handleSaveSettings}
                                    disabled={savingSettings || adAccountSettingsLoading}
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
