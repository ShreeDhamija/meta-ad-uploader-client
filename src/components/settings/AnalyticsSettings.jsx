"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    CheckCircle2,
    XCircle,
    DollarSign,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    ChevronRight,
    Zap
} from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogOverlay,
} from "@/components/ui/dialog"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
import { ChevronsUpDown, Loader2 } from "lucide-react" // Add ChevronsUpDown, keep Loader2
// import useGlobalSettings from "@/lib/useGlobalSettings"
import { useAppData } from "@/lib/AppContext"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function AnalyticsSettings() {
    const { adAccounts, adAccountsLoading } = useAppData()
    // const { selectedAdAccountIds, loading: settingsLoading } = useGlobalSettings()
    const [selectedAdAccount, setSelectedAdAccount] = useState(null)
    const [activeSubTab, setActiveSubTab] = useState('anomalies') // 'anomalies' | 'recommendations'

    // Anomalies state
    const [anomalies, setAnomalies] = useState([])
    const [anomalySummary, setAnomalySummary] = useState(null)
    const [anomaliesLoading, setAnomaliesLoading] = useState(false)
    const [lastChecked, setLastChecked] = useState(null)

    // Recommendations state
    const [recommendations, setRecommendations] = useState([])
    const [recSummary, setRecSummary] = useState(null)
    const [recommendationsLoading, setRecommendationsLoading] = useState(false)

    // Apply recommendation state
    const [applyingId, setApplyingId] = useState(null)
    const [showApplyDialog, setShowApplyDialog] = useState(false)
    const [selectedRec, setSelectedRec] = useState(null)


    const [openAdAccount, setOpenAdAccount] = useState(false)
    const [searchValue, setSearchValue] = useState("")

    // Memoized filtered ad accounts
    const filteredAdAccounts = useMemo(() => {
        if (!searchValue) return adAccounts || [];
        const lowerSearchValue = searchValue.toLowerCase();
        return (adAccounts || []).filter(
            (acct) =>
                (acct.name?.toLowerCase() || "").includes(lowerSearchValue) ||
                acct.id.toLowerCase().includes(lowerSearchValue)
        );
    }, [adAccounts, searchValue]);

    // Memoized selected ad account display name
    const selectedAdAccountName = useMemo(() => {
        if (!selectedAdAccount) return "Select an Ad Account";
        return adAccounts?.find((acct) => acct.id === selectedAdAccount)?.name || selectedAdAccount;
    }, [selectedAdAccount, adAccounts]);

    // Handler
    const handleAdAccountSelect = (accountId) => {
        setSelectedAdAccount(accountId)
        setOpenAdAccount(false)
    }


    // Set default ad account when data loads
    useEffect(() => {
        if (!adAccountsLoading && adAccounts?.length > 0 && !selectedAdAccount) {
            setSelectedAdAccount(adAccounts[0].id)
        }
    }, [adAccountsLoading, adAccounts, selectedAdAccount])

    // Fetch data when ad account changes
    useEffect(() => {
        if (selectedAdAccount) {
            if (activeSubTab === 'anomalies') {
                fetchAnomalies()
            } else {
                fetchRecommendations()
            }
        }
    }, [selectedAdAccount, activeSubTab])

    const fetchAnomalies = async () => {
        if (!selectedAdAccount) return
        setAnomaliesLoading(true)
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/analytics/anomalies?adAccountId=${selectedAdAccount}`,
                { credentials: 'include' }
            )
            const data = await response.json()
            if (response.ok) {
                setAnomalies(data.anomalies || [])
                setAnomalySummary(data.summary)
                setLastChecked(data.checkedAt)
            } else {
                toast.error(data.error || 'Failed to fetch anomalies')
            }
        } catch (error) {
            console.error('Fetch anomalies error:', error)
            toast.error('Failed to fetch anomalies')
        } finally {
            setAnomaliesLoading(false)
        }
    }

    const fetchRecommendations = async () => {
        if (!selectedAdAccount) return
        setRecommendationsLoading(true)
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/analytics/recommendations?adAccountId=${selectedAdAccount}`,
                { credentials: 'include' }
            )
            const data = await response.json()
            if (response.ok) {
                setRecommendations(data.recommendations || [])
                setRecSummary(data.summary)
            } else {
                toast.error(data.error || 'Failed to fetch recommendations')
            }
        } catch (error) {
            console.error('Fetch recommendations error:', error)
            toast.error('Failed to fetch recommendations')
        } finally {
            setRecommendationsLoading(false)
        }
    }

    const handleApplyRecommendation = (rec) => {
        setSelectedRec(rec)
        setShowApplyDialog(true)
    }

    const confirmApplyRecommendation = async () => {
        if (!selectedRec) return
        setApplyingId(selectedRec.id)
        setShowApplyDialog(false)

        try {
            const response = await fetch(`${API_BASE_URL}/api/analytics/apply-recommendation`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityType: selectedRec.entityType,
                    entityId: selectedRec.entityId,
                    newBudget: selectedRec.suggestedBudget
                })
            })

            const data = await response.json()
            if (data.success) {
                toast.success(`Budget updated to $${selectedRec.suggestedBudget.toFixed(2)}/day`)
                // Remove from list
                setRecommendations(prev => prev.filter(r => r.id !== selectedRec.id))
            } else {
                toast.error(data.error || 'Failed to apply recommendation')
            }
        } catch (error) {
            console.error('Apply recommendation error:', error)
            toast.error('Failed to apply recommendation')
        } finally {
            setApplyingId(null)
            setSelectedRec(null)
        }
    }

    const dismissRecommendation = (recId) => {
        setRecommendations(prev => prev.filter(r => r.id !== recId))
        toast.success('Recommendation dismissed')
    }

    // Get ad account name from ID
    const getAdAccountName = (accountId) => {
        const account = adAccounts?.find(a => a.id === accountId)
        return account?.name || accountId
    }

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
                        <p className="text-sm text-gray-400 mt-1">
                            Connect an ad account in Preferences to use Analytics
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Ad Account Selector */}
            <div className="flex items-center justify-between">
                <Popover open={openAdAccount} onOpenChange={setOpenAdAccount}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            className="w-[280px] justify-between rounded-2xl h-11 bg-white shadow-sm hover:bg-white"
                        >
                            {selectedAdAccountName}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="min-w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-xl"
                        align="start"
                        sideOffset={4}
                    >
                        <Command filter={() => 1} loop={false} value="">
                            <CommandInput
                                placeholder="Search ad accounts..."
                                value={searchValue}
                                onValueChange={setSearchValue}
                                className="bg-white"
                            />
                            <CommandList className="max-h-[500px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
                                {adAccountsLoading ? (
                                    <div className="flex items-center justify-center py-6 gap-2 text-sm text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Fetching ad accounts...
                                    </div>
                                ) : (
                                    <CommandGroup>
                                        {filteredAdAccounts.map((acct) => (
                                            <CommandItem
                                                key={acct.id}
                                                value={acct.id}
                                                onSelect={handleAdAccountSelect}
                                                className={`
                                    px-4 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150
                                    hover:bg-gray-100
                                    ${selectedAdAccount === acct.id ? "bg-gray-100 font-semibold" : ""}
                                `}
                                                data-selected={acct.id === selectedAdAccount}
                                            >
                                                {acct.name || acct.id}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => activeSubTab === 'anomalies' ? fetchAnomalies() : fetchRecommendations()}
                    disabled={anomaliesLoading || recommendationsLoading}
                    className="rounded-2xl h-11 px-4"
                >
                    <RefreshCw className={cn("w-4 h-4 mr-2", (anomaliesLoading || recommendationsLoading) && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                <button
                    onClick={() => setActiveSubTab('anomalies')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all",
                        activeSubTab === 'anomalies'
                            ? "bg-white shadow-sm text-gray-900"
                            : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    <AlertTriangle className="w-4 h-4" />
                    Anomaly Alerts
                    {anomalySummary?.total > 0 && (
                        <Badge variant="destructive" className="ml-1 rounded-full px-2 py-0.5 text-xs">
                            {anomalySummary.total}
                        </Badge>
                    )}
                </button>
                <button
                    onClick={() => setActiveSubTab('recommendations')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all",
                        activeSubTab === 'recommendations'
                            ? "bg-white shadow-sm text-gray-900"
                            : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    <Zap className="w-4 h-4" />
                    Budget Recommendations
                    {recSummary?.total > 0 && (
                        <Badge className="ml-1 rounded-full px-2 py-0.5 text-xs bg-blue-100 text-blue-700">
                            {recSummary.total}
                        </Badge>
                    )}
                </button>
            </div>

            {/* Anomalies Tab Content */}
            {activeSubTab === 'anomalies' && (
                <div className="space-y-4">
                    {/* Summary Cards */}
                    {anomalySummary && (
                        <div className="grid grid-cols-3 gap-3">
                            <Card className="rounded-2xl border-gray-200">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Alerts</p>
                                            <p className="text-2xl font-bold mt-1">{anomalySummary.total}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5 text-gray-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="rounded-2xl border-red-200 bg-red-50/50">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-red-600 uppercase tracking-wide">Critical</p>
                                            <p className="text-2xl font-bold mt-1 text-red-700">{anomalySummary.critical}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                            <XCircle className="w-5 h-5 text-red-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="rounded-2xl border-yellow-200 bg-yellow-50/50">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-yellow-700 uppercase tracking-wide">Warnings</p>
                                            <p className="text-2xl font-bold mt-1 text-yellow-700">{anomalySummary.warning}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Loading State */}
                    {anomaliesLoading && (
                        <Card className="rounded-3xl">
                            <CardContent className="py-12">
                                <div className="flex flex-col items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-3" />
                                    <p className="text-gray-500">Scanning for anomalies...</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Empty State */}
                    {!anomaliesLoading && anomalies.length === 0 && (
                        <Card className="rounded-3xl">
                            <CardContent className="py-12">
                                <div className="flex flex-col items-center justify-center">
                                    <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                                    <p className="text-gray-700 font-medium">All Clear!</p>
                                    <p className="text-sm text-gray-400 mt-1">No anomalies detected in your ad account</p>
                                    {lastChecked && (
                                        <p className="text-xs text-gray-400 mt-3">
                                            Last checked: {new Date(lastChecked).toLocaleTimeString()}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Anomalies List */}
                    {!anomaliesLoading && anomalies.length > 0 && (
                        <div className="space-y-3">
                            {anomalies.map(anomaly => (
                                <Card
                                    key={anomaly.id}
                                    className={cn(
                                        "rounded-2xl transition-all hover:shadow-md",
                                        anomaly.severity === 'critical'
                                            ? "border-red-200 bg-red-50/30"
                                            : "border-yellow-200 bg-yellow-50/30"
                                    )}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                                                    anomaly.severity === 'critical' ? "bg-red-100" : "bg-yellow-100"
                                                )}>
                                                    {anomaly.type === 'cpr_spike' ? (
                                                        <TrendingUp className={cn(
                                                            "w-5 h-5",
                                                            anomaly.severity === 'critical' ? "text-red-600" : "text-yellow-600"
                                                        )} />
                                                    ) : (
                                                        <DollarSign className={cn(
                                                            "w-5 h-5",
                                                            anomaly.severity === 'critical' ? "text-red-600" : "text-yellow-600"
                                                        )} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-gray-900">{anomaly.message}</p>
                                                        <Badge
                                                            variant={anomaly.severity === 'critical' ? 'destructive' : 'outline'}
                                                            className="rounded-full text-xs"
                                                        >
                                                            {anomaly.severity}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-500 mt-0.5">
                                                        {anomaly.adsetName}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Campaign: {anomaly.campaignName}
                                                    </p>

                                                    {/* Details */}
                                                    <div className="flex gap-4 mt-3 text-xs">
                                                        {anomaly.type === 'cpr_spike' && (
                                                            <>
                                                                <div className="bg-white rounded-lg px-3 py-1.5 border">
                                                                    <span className="text-gray-500">Today: </span>
                                                                    <span className="font-medium">${anomaly.details.todayCPR}</span>
                                                                </div>
                                                                <div className="bg-white rounded-lg px-3 py-1.5 border">
                                                                    <span className="text-gray-500">7d Avg: </span>
                                                                    <span className="font-medium">${anomaly.details.avgCPR}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                        {anomaly.type === 'overspend' && (
                                                            <>
                                                                <div className="bg-white rounded-lg px-3 py-1.5 border">
                                                                    <span className="text-gray-500">Spent: </span>
                                                                    <span className="font-medium">${anomaly.details.todaySpend}</span>
                                                                </div>
                                                                <div className="bg-white rounded-lg px-3 py-1.5 border">
                                                                    <span className="text-gray-500">Budget: </span>
                                                                    <span className="font-medium">${anomaly.details.dailyBudget}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-300" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Recommendations Tab Content */}
            {activeSubTab === 'recommendations' && (
                <div className="space-y-4">
                    {/* Summary Cards */}
                    {recSummary && (
                        <div className="grid grid-cols-3 gap-3">
                            <Card className="rounded-2xl border-gray-200">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                                            <p className="text-2xl font-bold mt-1">{recSummary.total}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Zap className="w-5 h-5 text-gray-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="rounded-2xl border-green-200 bg-green-50/50">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-green-600 uppercase tracking-wide">Scale Up</p>
                                            <p className="text-2xl font-bold mt-1 text-green-700">{recSummary.increases}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                            <ArrowUpRight className="w-5 h-5 text-green-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="rounded-2xl border-orange-200 bg-orange-50/50">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-orange-600 uppercase tracking-wide">Scale Down</p>
                                            <p className="text-2xl font-bold mt-1 text-orange-700">{recSummary.decreases}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                            <ArrowDownRight className="w-5 h-5 text-orange-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Loading State */}
                    {recommendationsLoading && (
                        <Card className="rounded-3xl">
                            <CardContent className="py-12">
                                <div className="flex flex-col items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-3" />
                                    <p className="text-gray-500">Analyzing performance trends...</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Empty State */}
                    {!recommendationsLoading && recommendations.length === 0 && (
                        <Card className="rounded-3xl">
                            <CardContent className="py-12">
                                <div className="flex flex-col items-center justify-center">
                                    <CheckCircle2 className="w-12 h-12 text-blue-500 mb-3" />
                                    <p className="text-gray-700 font-medium">No Recommendations Right Now</p>
                                    <p className="text-sm text-gray-400 mt-1 text-center max-w-sm">
                                        We analyze CPA trends with stable spend. Check back when your campaigns have 6+ days of data.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Recommendations List */}
                    {!recommendationsLoading && recommendations.length > 0 && (
                        <div className="space-y-3">
                            {recommendations.map(rec => (
                                <Card
                                    key={rec.id}
                                    className={cn(
                                        "rounded-2xl transition-all hover:shadow-md",
                                        rec.recommendationType === 'increase'
                                            ? "border-green-200 bg-green-50/30"
                                            : "border-orange-200 bg-orange-50/30"
                                    )}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                                                    rec.recommendationType === 'increase' ? "bg-green-100" : "bg-orange-100"
                                                )}>
                                                    {rec.recommendationType === 'increase' ? (
                                                        <ArrowUpRight className="w-5 h-5 text-green-600" />
                                                    ) : (
                                                        <ArrowDownRight className="w-5 h-5 text-orange-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-gray-900">
                                                            {rec.recommendationType === 'increase' ? 'Increase' : 'Decrease'} budget by 15%
                                                        </p>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "rounded-full text-xs",
                                                                rec.entityType === 'campaign' ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"
                                                            )}
                                                        >
                                                            {rec.entityType === 'campaign' ? 'CBO Campaign' : 'Adset'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-0.5">
                                                        {rec.entityName}
                                                    </p>
                                                    {rec.campaignName && rec.entityType === 'adset' && (
                                                        <p className="text-xs text-gray-400">
                                                            Campaign: {rec.campaignName}
                                                        </p>
                                                    )}
                                                    <p className="text-sm text-gray-500 mt-2">
                                                        {rec.reason}
                                                    </p>

                                                    {/* Budget Change Preview */}
                                                    <div className="flex items-center gap-3 mt-3">
                                                        <div className="bg-white rounded-lg px-3 py-2 border flex items-center gap-2">
                                                            <span className="text-xs text-gray-500">Current:</span>
                                                            <span className="font-semibold">${rec.currentBudget.toFixed(2)}/day</span>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                                        <div className={cn(
                                                            "rounded-lg px-3 py-2 border flex items-center gap-2",
                                                            rec.recommendationType === 'increase'
                                                                ? "bg-green-100 border-green-200"
                                                                : "bg-orange-100 border-orange-200"
                                                        )}>
                                                            <span className="text-xs text-gray-600">Suggested:</span>
                                                            <span className="font-semibold">${rec.suggestedBudget.toFixed(2)}/day</span>
                                                        </div>
                                                    </div>

                                                    {/* CPA Details */}
                                                    <div className="flex gap-3 mt-2 text-xs">
                                                        <span className="text-gray-500">
                                                            CPA: ${rec.details.previousCPA} → ${rec.details.recentCPA}
                                                            <span className={cn(
                                                                "ml-1 font-medium",
                                                                rec.recommendationType === 'increase' ? "text-green-600" : "text-orange-600"
                                                            )}>
                                                                ({rec.details.cpaChangePercent}%)
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-col gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApplyRecommendation(rec)}
                                                    disabled={applyingId === rec.id}
                                                    className={cn(
                                                        "rounded-xl h-9 px-4",
                                                        rec.recommendationType === 'increase'
                                                            ? "bg-green-600 hover:bg-green-700"
                                                            : "bg-orange-600 hover:bg-orange-700"
                                                    )}
                                                >
                                                    {applyingId === rec.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        'Apply'
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => dismissRecommendation(rec.id)}
                                                    className="rounded-xl h-9 px-4 text-gray-500 hover:text-gray-700"
                                                >
                                                    Dismiss
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Apply Confirmation Dialog */}
            <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
                <DialogOverlay className="bg-black/50" />
                <DialogContent className="sm:max-w-[425px] !rounded-[30px] p-8 space-y-6">
                    <DialogHeader className="space-y-4">
                        <DialogTitle className="text-xl">Apply Budget Change</DialogTitle>
                        <DialogDescription className="text-base leading-relaxed">
                            {selectedRec && (
                                <>
                                    This will change the daily budget for <strong>{selectedRec.entityName}</strong> from{' '}
                                    <strong>${selectedRec.currentBudget.toFixed(2)}</strong> to{' '}
                                    <strong>${selectedRec.suggestedBudget.toFixed(2)}</strong>.
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowApplyDialog(false)}
                            className="rounded-2xl flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmApplyRecommendation}
                            className={cn(
                                "rounded-2xl flex-1",
                                selectedRec?.recommendationType === 'increase'
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-orange-600 hover:bg-orange-700"
                            )}
                        >
                            Yes, Apply Change
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Info Footer */}
            <Card className="rounded-2xl bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Activity className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div className="text-sm text-gray-500">
                            <p className="font-medium text-gray-600 mb-1">How Analytics Works</p>
                            <ul className="space-y-1 text-xs">
                                <li>• <strong>Anomaly Detection:</strong> Alerts when cost per result spikes 50%+ vs 7-day average, or when spend exceeds 150% of daily budget</li>
                                <li>• <strong>Budget Recommendations:</strong> Suggests ±15% budget changes when CPA improves/worsens 10%+ with stable spend over 3 days</li>
                                <li>• Recommendations respect CBO vs ABO — campaign-level for CBO, adset-level for ABO</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}