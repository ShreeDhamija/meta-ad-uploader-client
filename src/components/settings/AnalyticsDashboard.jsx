"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import {
    AlertTriangle, TrendingUp, RefreshCw, Loader2, ChevronsUpDown,
    Target, BarChart3, Settings2, Activity, Zap, Eye, XCircle,
} from "lucide-react"
import { toast } from "sonner"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogOverlay,
} from "@/components/ui/dialog"
import { useAppData } from "@/lib/AppContext"
import { cn } from "@/lib/utils"

import KPIChart from "./analytics/KPIChart"
import WeeklyChart from "./analytics/WeeklyChart"
import RecommendationCards from "./analytics/RecommendationCards"
import PoorPerformingAds from "./analytics/PoorPerformingAds"
import AnomalyCards from "./analytics/AnomalyCards"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

const DEFAULT_THRESHOLDS = {
    cpaSpike: 50,
    overspend: 150,
};

export default function AnalyticsDashboard() {
    const { adAccounts, adAccountsLoading } = useAppData()

    // ── Core state ──────────────────────────────────────────
    const [selectedAdAccount, setSelectedAdAccount] = useState(null)
    const [openAdAccount, setOpenAdAccount] = useState(false)
    const [searchValue, setSearchValue] = useState("")
    const [metricMode, setMetricMode] = useState("cpr") // cpr | roas
    const [modeAutoDetected, setModeAutoDetected] = useState(false) // track if mode was auto-set
    const [activeTab, setActiveTab] = useState("recommendations")
    const [chartDays, setChartDays] = useState(14)

    // ── Settings ────────────────────────────────────────────
    const [showSettingsDialog, setShowSettingsDialog] = useState(false)
    const [anomalyThresholds, setAnomalyThresholds] = useState(DEFAULT_THRESHOLDS)
    const [tempThresholds, setTempThresholds] = useState(DEFAULT_THRESHOLDS)

    // ── Data state ──────────────────────────────────────────
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

    // Track what we've already fetched for this account+mode combo
    const fetchedRef = useRef({})

    // ── Derived ─────────────────────────────────────────────
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

    // ── Auto-detect mode from account info ──────────────────
    const fetchAccountInfo = useCallback(async (accountId) => {
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/analytics/account-info?adAccountId=${accountId}`,
                { credentials: 'include' }
            )
            const data = await res.json()
            if (res.ok && data.suggestedMode) {
                setMetricMode(data.suggestedMode)
                setModeAutoDetected(true)
            }
        } catch (err) {
            console.error('Account info error:', err)
            // Silently fall back to default (cpr)
        }
    }, [])

    // ── Fetch functions ─────────────────────────────────────
    const fetchRecommendations = useCallback(async (force = false) => {
        if (!selectedAdAccount) return
        const key = `recs-${selectedAdAccount}-${metricMode}`
        if (!force && fetchedRef.current[key]) return
        fetchedRef.current[key] = true

        setRecsLoading(true)
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/analytics/recommendations?adAccountId=${selectedAdAccount}&mode=${metricMode}`,
                { credentials: 'include' }
            )
            const data = await res.json()
            if (res.ok) setRecommendations(data)
            else toast.error(data.error || 'Failed to fetch recommendations')
        } catch (err) {
            console.error('Recommendations error:', err)
            toast.error('Failed to fetch recommendations')
        } finally { setRecsLoading(false) }
    }, [selectedAdAccount, metricMode])

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
        const key = `poor-${selectedAdAccount}-${metricMode}`
        if (!force && fetchedRef.current[key]) return
        fetchedRef.current[key] = true

        setPoorAdsLoading(true)
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/analytics/poor-performing-ads?adAccountId=${selectedAdAccount}&mode=${metricMode}`,
                { credentials: 'include' }
            )
            const data = await res.json()
            if (res.ok) setPoorAds(data)
            else toast.error(data.error || 'Failed to fetch poor performing ads')
        } catch (err) {
            console.error('Poor ads error:', err)
            toast.error('Failed to fetch poor performing ads')
        } finally { setPoorAdsLoading(false) }
    }, [selectedAdAccount, metricMode])

    const fetchDailyInsights = useCallback(async (force = false) => {
        if (!selectedAdAccount) return
        const key = `daily-${selectedAdAccount}-${chartDays}`
        if (!force && fetchedRef.current[key]) return
        fetchedRef.current[key] = true

        setDailyLoading(true)
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/analytics/daily-insights?adAccountId=${selectedAdAccount}&days=${chartDays}`,
                { credentials: 'include' }
            )
            const data = await res.json()
            if (res.ok) setDailyInsights(data)
        } catch (err) {
            console.error('Daily insights error:', err)
        } finally { setDailyLoading(false) }
    }, [selectedAdAccount, chartDays])

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
    // Auto-select first ad account
    useEffect(() => {
        if (!adAccountsLoading && adAccounts?.length > 0 && !selectedAdAccount) {
            setSelectedAdAccount(adAccounts[0].id)
        }
    }, [adAccountsLoading, adAccounts, selectedAdAccount])

    // When account changes: auto-detect mode, then fetch charts
    useEffect(() => {
        if (selectedAdAccount) {
            fetchAccountInfo(selectedAdAccount)
            fetchDailyInsights()
            fetchWeeklyInsights()
        }
    }, [selectedAdAccount, fetchAccountInfo, fetchDailyInsights, fetchWeeklyInsights])

    // Fetch active tab data whenever tab/account/mode changes
    useEffect(() => {
        if (!selectedAdAccount) return
        if (activeTab === 'recommendations') fetchRecommendations()
        else if (activeTab === 'anomalies') fetchAnomalies()
        else if (activeTab === 'poor-ads') fetchPoorAds()
    }, [activeTab, selectedAdAccount, metricMode, fetchRecommendations, fetchAnomalies, fetchPoorAds])

    // Re-fetch daily insights when chart days toggle changes
    useEffect(() => {
        if (selectedAdAccount) fetchDailyInsights()
    }, [chartDays, fetchDailyInsights])



    // ── Handlers ────────────────────────────────────────────
    const handleAdAccountSelect = (accountId) => {
        setSelectedAdAccount(accountId)
        setOpenAdAccount(false)
        setModeAutoDetected(false)

        // Clear all data and fetch tracking
        setRecommendations(null); setAnomalies(null); setPoorAds(null)
        setDailyInsights(null); setWeeklyInsights(null)
        fetchedRef.current = {}
    }

    const handleRefresh = () => {
        fetchedRef.current = {}
        fetchAccountInfo(selectedAdAccount)
        fetchDailyInsights(true)
        fetchWeeklyInsights(true)
        if (activeTab === 'recommendations') fetchRecommendations(true)
        else if (activeTab === 'anomalies') fetchAnomalies(true)
        else if (activeTab === 'poor-ads') fetchPoorAds(true)
        toast.success('Refreshing data...')
    }

    const handleSaveThresholds = () => {
        setAnomalyThresholds(tempThresholds)
        setShowSettingsDialog(false)
        // Force re-fetch anomalies with new thresholds
        delete fetchedRef.current[`anomalies-${selectedAdAccount}`]
        toast.success('Anomaly thresholds updated')
    }

    const handleModeChange = (mode) => {
        setMetricMode(mode)
        setModeAutoDetected(false)
        // Clear mode-dependent data
        setRecommendations(null)
        setPoorAds(null)
        const prefix = `recs-${selectedAdAccount}`
        const poorPrefix = `poor-${selectedAdAccount}`
        Object.keys(fetchedRef.current).forEach(k => {
            if (k.startsWith(prefix) || k.startsWith(poorPrefix)) delete fetchedRef.current[k]
        })
    }


    const isAnyLoading = recsLoading || anomaliesLoading || poorAdsLoading || dailyLoading || weeklyLoading

    // ── Loading / Empty states ──────────────────────────────
    if (adAccountsLoading) {
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
            {/* ── Header: Account Selector + Mode Toggle + Target KPI + Actions ── */}
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
                        onClick={() => { setTempThresholds(anomalyThresholds); setShowSettingsDialog(true); }}
                        className="rounded-2xl h-11 px-4"
                    >
                        <Settings2 className="w-4 h-4 mr-2" />
                        Settings
                    </Button>
                    <Button
                        variant="outline" size="sm"
                        onClick={handleRefresh}
                        disabled={isAnyLoading}
                        className="rounded-2xl h-11 px-4"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", isAnyLoading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* ── Charts Row ─────────────────────────────────────── */}
            {selectedAdAccount && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

            {/* ── Tab Switcher ───────────────────────────────────── */}
            <div className="w-full">
                <div className="grid grid-cols-3 p-1 bg-gray-100 rounded-2xl w-full border border-gray-200/60">
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
                        {recsCount > 0 && (
                            <Badge className="ml-1 text-xs px-1.5 py-0 bg-blue-100 text-blue-700 hover:bg-blue-100 rounded-2xl">
                                {recsCount}
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
                    <button
                        onClick={() => setActiveTab('poor-ads')}
                        className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-2xl transition-all duration-200",
                            activeTab === 'poor-ads'
                                ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                        )}
                    >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">Poor Performers</span>
                        <span className="sm:hidden">Poor</span>
                        {poorAdsCount > 0 && (
                            <Badge className="ml-1 text-xs px-1.5 py-0 bg-orange-100 text-orange-700 hover:bg-orange-100 rounded-2xl">
                                {poorAdsCount}
                            </Badge>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Tab Content ────────────────────────────────────── */}
            {activeTab === 'recommendations' && (
                <RecommendationCards
                    data={recommendations}
                    loading={recsLoading}
                    mode={metricMode}
                    adAccountId={selectedAdAccount}
                    onApplied={() => fetchRecommendations(true)}
                />
            )}

            {activeTab === 'anomalies' && (
                <AnomalyCards
                    data={anomalies}
                    loading={anomaliesLoading}
                    thresholds={anomalyThresholds}
                />
            )}

            {activeTab === 'poor-ads' && (
                <PoorPerformingAds
                    data={poorAds}
                    loading={poorAdsLoading}
                    mode={metricMode}
                    adAccountId={selectedAdAccount}
                    onApplied={() => fetchPoorAds(true)}
                />
            )}

            {/* ── Info Footer ────────────────────────────────────── */}
            <Card className="rounded-2xl bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Activity className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-500">
                            <p className="font-medium text-gray-600 mb-1">How Analytics Works</p>
                            <p className="text-xs leading-relaxed">
                                <strong>Recommendations</strong> compare each campaign/adset's {metricMode === 'cpr' ? 'CPA' : 'ROAS'} against
                                the spend-weighted account average over 3-day windows. Actions range from scale (20–60% increase) to pause
                                (50%+ worse than average). <strong>Anomalies</strong> flag CPA spikes exceeding {anomalyThresholds.cpaSpike}%
                                of the 7-day average and overspend above {anomalyThresholds.overspend}% of daily budget.
                                <strong> Poor Performers</strong> identifies active ads ≥14 days old that aren't converting efficiently.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Settings Dialog ─────────────────────────────────── */}
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                <DialogOverlay className="bg-black/50" />
                <DialogContent className="sm:max-w-[500px] !rounded-[30px] p-8 space-y-6">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Settings2 className="w-5 h-5" />
                            Analytics Settings
                        </DialogTitle>
                        <DialogDescription>
                            Configure anomaly detection thresholds
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                                Anomaly Thresholds
                            </h3>

                            <div className="space-y-4 pl-6">
                                <div className="space-y-2">
                                    <Label htmlFor="cpaThreshold" className="text-sm text-gray-600">
                                        CPA Spike Threshold (%)
                                    </Label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            id="cpaThreshold"
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
                                    <Label htmlFor="overspendThreshold" className="text-sm text-gray-600">
                                        Overspend Threshold (%)
                                    </Label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            id="overspendThreshold"
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
                        <div className="space-y-4">
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-[#4A154B] flex items-center justify-center">
                                    <Slack className="w-3 h-3 text-white" />
                                </div>
                                Slack Alerts
                            </h3>

                            <div className="pl-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">Enable anomaly alerts</p>
                                        <p className="text-xs text-gray-500">
                                            Get notified in Slack when CPA spikes or overspend is detected
                                        </p>
                                    </div>
                                    <Switch
                                        checked={slackAlertsEnabled}
                                        onCheckedChange={setSlackAlertsEnabled}
                                    />
                                </div>

                                {slackAlertsEnabled && !slackConnected && (

                                    <a href={`${API_BASE_URL}/api/slack/install?adAccountId=${selectedAdAccount}`}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-colors"
                                        style={{ backgroundColor: '#4A154B' }}
                                    >
                                        <Slack className="w-4 h-4" />
                                        Connect to Slack
                                    </a>
                                )}

                                {slackAlertsEnabled && slackConnected && (
                                    <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-xl">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Connected to Slack
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
                        <Button variant="outline" onClick={() => setShowSettingsDialog(false)} className="rounded-2xl flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveThresholds} className="rounded-2xl flex-1 bg-blue-600 hover:bg-blue-700">
                            Save Settings
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}