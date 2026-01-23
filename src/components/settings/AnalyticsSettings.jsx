"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    Zap,
    ChevronsUpDown,
    Eye,
    Target,
    BarChart3,
    Settings2,
    Bell,
    Slack,
    X,
    Clock,
    Rocket
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
import { useAppData } from "@/lib/AppContext"
import { cn } from "@/lib/utils"
import useAdAccountSettings from "@/lib/useAdAccountSettings"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

// Helper function to format time saved
const formatTimeSaved = (adsCount) => {
    const minutes = adsCount * 5;
    const hours = (minutes / 60).toFixed(1);
    return hours;
};

// Available conversion events for Meta Ads
const CONVERSION_EVENTS = [
    { value: 'purchase', label: 'Purchase' },
    { value: 'lead', label: 'Lead' },
    { value: 'complete_registration', label: 'Complete Registration' },
    { value: 'add_to_cart', label: 'Add to Cart' },
    { value: 'initiate_checkout', label: 'Initiate Checkout' },
    { value: 'add_payment_info', label: 'Add Payment Info' },
    { value: 'subscribe', label: 'Subscribe' },
    { value: 'start_trial', label: 'Start Trial' },
    { value: 'app_install', label: 'App Install' },
    { value: 'contact', label: 'Contact' },
    { value: 'customize_product', label: 'Customize Product' },
    { value: 'donate', label: 'Donate' },
    { value: 'find_location', label: 'Find Location' },
    { value: 'schedule', label: 'Schedule' },
    { value: 'search', label: 'Search' },
    { value: 'submit_application', label: 'Submit Application' },
    { value: 'view_content', label: 'View Content' },
    { value: 'link_click', label: 'Link Click' },
    { value: 'landing_page_view', label: 'Landing Page View' },
];

// Default anomaly thresholds
const DEFAULT_THRESHOLDS = {
    cpaSpike: 50,
    overspend: 150,
};

// Mini sparkline chart component for 7-day trends
const MiniSparkline = ({ data, color = "blue", height = 40, showDots = false }) => {
    if (!data || data.length === 0) return null;

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 120;
    const padding = 4;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = values.map((v, i) => ({
        x: padding + (i / (values.length - 1)) * chartWidth,
        y: padding + chartHeight - ((v - min) / range) * chartHeight
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const colorMap = {
        blue: { stroke: '#3b82f6', fill: '#3b82f620' },
        green: { stroke: '#22c55e', fill: '#22c55e20' },
        orange: { stroke: '#f97316', fill: '#f9731620' },
        purple: { stroke: '#a855f7', fill: '#a855f720' },
    };

    const colors = colorMap[color] || colorMap.blue;
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
        <svg width={width} height={height} className="overflow-visible">
            <path d={areaD} fill={colors.fill} />
            <path d={pathD} fill="none" stroke={colors.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {showDots && points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill={colors.stroke} />
            ))}
        </svg>
    );
};

// Dual-line chart for spend vs CPA comparison
const SpendCpaChart = ({ spendData, cpaData, height = 60 }) => {
    if (!spendData || !cpaData || spendData.length === 0) return null;

    const width = 180;
    const padding = 8;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const spendValues = spendData.map(d => d.value);
    const spendMin = Math.min(...spendValues);
    const spendMax = Math.max(...spendValues);
    const spendRange = spendMax - spendMin || 1;

    const cpaValues = cpaData.map(d => d.value);
    const cpaMin = Math.min(...cpaValues);
    const cpaMax = Math.max(...cpaValues);
    const cpaRange = cpaMax - cpaMin || 1;

    const spendPoints = spendValues.map((v, i) => ({
        x: padding + (i / (spendValues.length - 1)) * chartWidth,
        y: padding + chartHeight - ((v - spendMin) / spendRange) * chartHeight
    }));

    const cpaPoints = cpaValues.map((v, i) => ({
        x: padding + (i / (cpaValues.length - 1)) * chartWidth,
        y: padding + chartHeight - ((v - cpaMin) / cpaRange) * chartHeight
    }));

    const spendPathD = spendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const cpaPathD = cpaPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].slice(-spendData.length);

    return (
        <div className="flex flex-col gap-1">
            <svg width={width} height={height} className="overflow-visible">
                <path d={spendPathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d={cpaPathD} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" />
            </svg>
            <div className="flex justify-between px-1">
                {days.map((day, i) => (
                    <span key={i} className="text-[9px] text-gray-400">{day}</span>
                ))}
            </div>
            <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-blue-500 rounded" />
                    <span className="text-[10px] text-gray-500">Spend</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-purple-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #a855f7 0, #a855f7 4px, transparent 4px, transparent 6px)' }} />
                    <span className="text-[10px] text-gray-500">CPA</span>
                </div>
            </div>
        </div>
    );
};

export default function AnalyticsSettings() {
    const { adAccounts, adAccountsLoading } = useAppData()

    // Ad account selection state
    const [selectedAdAccount, setSelectedAdAccount] = useState(null)
    const [openAdAccount, setOpenAdAccount] = useState(false)
    const [searchValue, setSearchValue] = useState("")

    // Use ad account settings hook to get adsCreatedCount
    const { loading: adAccountSettingsLoading, settings: adAccountSettings } = useAdAccountSettings(selectedAdAccount)

    // Total stats popup state
    const [showStatsPopup, setShowStatsPopup] = useState(false)
    const [allStats, setAllStats] = useState([])
    const [loadingAllStats, setLoadingAllStats] = useState(false)

    // Key Conversion Event state (persisted per ad account)
    const [conversionEvents, setConversionEvents] = useState(() => {
        try {
            const saved = localStorage.getItem('analytics_conversion_events');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    // Anomaly threshold settings (persisted)
    const [anomalyThresholds, setAnomalyThresholds] = useState(() => {
        try {
            const saved = localStorage.getItem('analytics_anomaly_thresholds');
            return saved ? JSON.parse(saved) : DEFAULT_THRESHOLDS;
        } catch {
            return DEFAULT_THRESHOLDS;
        }
    });

    // Slack integration state
    const [slackEnabled, setSlackEnabled] = useState(() => {
        try {
            return localStorage.getItem('analytics_slack_enabled') === 'true';
        } catch {
            return false;
        }
    });

    // Settings dialog state
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [tempThresholds, setTempThresholds] = useState(anomalyThresholds);

    // Tab state
    const [activeSubTab, setActiveSubTab] = useState('anomalies')

    // Quick stats state
    const [quickStats, setQuickStats] = useState(null)
    const [quickStatsLoading, setQuickStatsLoading] = useState(false)

    // Anomalies state
    const [anomalies, setAnomalies] = useState([])
    const [nearThreshold, setNearThreshold] = useState([])
    const [anomalySummary, setAnomalySummary] = useState(null)
    const [adsetInsights, setAdsetInsights] = useState([])
    const [anomaliesLoading, setAnomaliesLoading] = useState(false)
    const [lastChecked, setLastChecked] = useState(null)

    // Recommendations state
    const [recommendations, setRecommendations] = useState([])
    const [recSummary, setRecSummary] = useState(null)
    const [analysisResults, setAnalysisResults] = useState([])
    const [recommendationsLoading, setRecommendationsLoading] = useState(false)

    // Apply recommendation state
    const [applyingId, setApplyingId] = useState(null)

    // Editable budgets - keyed by recommendation id
    const [editedBudgets, setEditedBudgets] = useState({})

    // Get selected conversion event for current ad account
    const selectedConversionEvent = useMemo(() => {
        return conversionEvents[selectedAdAccount] || 'purchase';
    }, [conversionEvents, selectedAdAccount]);

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

    // Calculate totals for popup
    const totalAdsAllAccounts = useMemo(() => {
        return allStats.reduce((sum, s) => sum + s.adsCreatedCount, 0);
    }, [allStats]);

    const totalHoursSavedAll = useMemo(() => {
        return formatTimeSaved(totalAdsAllAccounts);
    }, [totalAdsAllAccounts]);

    // Fetch all ad account stats
    const fetchAllAdAccountStats = async () => {
        setLoadingAllStats(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settings/all-ad-accounts-stats`, {
                credentials: "include",
            });
            const data = await res.json();
            setAllStats(data.stats || []);
            setShowStatsPopup(true);
        } catch (err) {
            console.error("Failed to fetch all stats:", err);
            toast.error("Failed to fetch stats");
        } finally {
            setLoadingAllStats(false);
        }
    };

    // Handler for ad account selection
    const handleAdAccountSelect = (accountId) => {
        setSelectedAdAccount(accountId)
        setOpenAdAccount(false)

        // Clear existing data when switching accounts
        setQuickStats(null)
        setAnomalies([])
        setNearThreshold([])
        setAnomalySummary(null)
        setAdsetInsights([])
        setRecommendations([])
        setRecSummary(null)
        setAnalysisResults([])
        setLastChecked(null)
        setEditedBudgets({})
    }

    // Handler for conversion event change
    const handleConversionEventChange = (event) => {
        const newEvents = { ...conversionEvents, [selectedAdAccount]: event };
        setConversionEvents(newEvents);
        localStorage.setItem('analytics_conversion_events', JSON.stringify(newEvents));
        toast.success(`Conversion event updated to ${CONVERSION_EVENTS.find(e => e.value === event)?.label}`);
    };

    // Handler for threshold changes
    const handleSaveThresholds = () => {
        setAnomalyThresholds(tempThresholds);
        localStorage.setItem('analytics_anomaly_thresholds', JSON.stringify(tempThresholds));
        setShowSettingsDialog(false);
        toast.success('Anomaly thresholds updated');
    };

    // Handler for Slack toggle
    const handleSlackToggle = (enabled) => {
        setSlackEnabled(enabled);
        localStorage.setItem('analytics_slack_enabled', enabled.toString());
        if (enabled) {
            toast.success('Slack notifications enabled');
        } else {
            toast.info('Slack notifications disabled');
        }
    };

    // Set default ad account when data loads
    useEffect(() => {
        if (!adAccountsLoading && adAccounts?.length > 0 && !selectedAdAccount) {
            setSelectedAdAccount(adAccounts[0].id)
        }
    }, [adAccountsLoading, adAccounts, selectedAdAccount])

    // Fetch data when ad account or conversion event changes
    useEffect(() => {
        if (selectedAdAccount) {
            fetchQuickStats()
            if (activeSubTab === 'anomalies') {
                fetchAnomalies()
            } else {
                fetchRecommendations()
            }
        }
    }, [selectedAdAccount, activeSubTab, selectedConversionEvent])

    const fetchQuickStats = async () => {
        if (!selectedAdAccount) return
        setQuickStatsLoading(true)
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/analytics/quick-stats?adAccountId=${selectedAdAccount}&conversionEvent=${selectedConversionEvent}`,
                { credentials: 'include' }
            )
            const data = await response.json()
            if (response.ok) {
                setQuickStats(data)
            } else {
                console.error('Quick stats error:', data.error)
            }
        } catch (error) {
            console.error('Fetch quick stats error:', error)
        } finally {
            setQuickStatsLoading(false)
        }
    }

    const fetchAnomalies = async () => {
        if (!selectedAdAccount) return
        setAnomaliesLoading(true)
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/analytics/anomalies?adAccountId=${selectedAdAccount}&conversionEvent=${selectedConversionEvent}&cpaThreshold=${anomalyThresholds.cpaSpike}&overspendThreshold=${anomalyThresholds.overspend}`,
                { credentials: 'include' }
            )
            const data = await response.json()
            if (response.ok) {
                setAnomalies(data.anomalies || [])
                setNearThreshold(data.nearThreshold || [])
                setAnomalySummary(data.summary)
                setAdsetInsights(data.adsetInsights || [])
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
                `${API_BASE_URL}/api/analytics/recommendations?adAccountId=${selectedAdAccount}&conversionEvent=${selectedConversionEvent}`,
                { credentials: 'include' }
            )
            const data = await response.json()
            if (response.ok) {
                setRecommendations(data.recommendations || [])
                setRecSummary(data.summary)
                setAnalysisResults(data.analysisResults || [])
                // Initialize editable budgets with suggested values
                const initialBudgets = {};
                (data.recommendations || []).forEach(rec => {
                    initialBudgets[rec.id] = rec.suggestedBudget.toFixed(2);
                });
                setEditedBudgets(initialBudgets);
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

    // Apply recommendation directly (no dialog)
    const applyRecommendation = async (rec) => {
        const budgetToApply = parseFloat(editedBudgets[rec.id] || rec.suggestedBudget);
        if (isNaN(budgetToApply) || budgetToApply <= 0) {
            toast.error('Please enter a valid budget amount');
            return;
        }

        setApplyingId(rec.id)

        try {
            const response = await fetch(`${API_BASE_URL}/api/analytics/apply-recommendation`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityType: rec.entityType,
                    entityId: rec.entityId,
                    newBudget: budgetToApply
                })
            })

            const data = await response.json()
            if (data.success) {
                toast.success(`Budget updated to $${budgetToApply.toFixed(2)}/day`)
                setRecommendations(prev => prev.filter(r => r.id !== rec.id))
                setEditedBudgets(prev => {
                    const newBudgets = { ...prev };
                    delete newBudgets[rec.id];
                    return newBudgets;
                });
            } else {
                toast.error(data.error || 'Failed to apply recommendation')
            }
        } catch (error) {
            console.error('Apply recommendation error:', error)
            toast.error('Failed to apply recommendation')
        } finally {
            setApplyingId(null)
        }
    }

    const dismissRecommendation = (recId) => {
        setRecommendations(prev => prev.filter(r => r.id !== recId))
        setEditedBudgets(prev => {
            const newBudgets = { ...prev };
            delete newBudgets[recId];
            return newBudgets;
        });
        toast.success('Recommendation dismissed')
    }

    // Format currency
    const formatCurrency = (value) => {
        if (value === null || value === undefined) return 'N/A'
        return `$${parseFloat(value).toFixed(2)}`
    }

    // Format percent with color
    const formatPercent = (value, inverse = false) => {
        if (value === null || value === undefined) return null
        const num = parseFloat(value)
        const isPositive = inverse ? num < 0 : num > 0
        return {
            text: `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`,
            color: isPositive ? 'text-green-600' : num < 0 ? 'text-red-600' : 'text-gray-600'
        }
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
            {/* Ad Account Selector + Settings */}
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
                                <CommandList className="max-h-[300px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
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
                </div>

                <div className="flex items-center gap-2">
                    {/* View Total Ad Launches Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchAllAdAccountStats}
                        disabled={loadingAllStats}
                        className="rounded-2xl h-11 px-4"
                    >
                        {loadingAllStats ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Rocket className="w-4 h-4 mr-2" />
                        )}
                        View Total Ad Launches
                    </Button>

                    {/* Settings Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setTempThresholds(anomalyThresholds);
                            setShowSettingsDialog(true);
                        }}
                        className="rounded-2xl h-11 px-4"
                    >
                        <Settings2 className="w-4 h-4 mr-2" />
                        Settings
                    </Button>

                    {/* Refresh Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            fetchQuickStats()
                            if (activeSubTab === 'anomalies') fetchAnomalies()
                            else fetchRecommendations()
                        }}
                        disabled={anomaliesLoading || recommendationsLoading || quickStatsLoading}
                        className="rounded-2xl h-11 px-4"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", (anomaliesLoading || recommendationsLoading || quickStatsLoading) && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Current Account Stats - Only show if adsCreatedCount > 0 */}
            {adAccountSettingsLoading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading stats...</span>
                </div>
            ) : adAccountSettings?.adsCreatedCount > 0 && (
                <Card className="rounded-2xl border-blue-200 bg-gradient-to-r from-blue-50 to-green-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Rocket className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Ads Launched</p>
                                    <p className="text-lg font-bold text-blue-600">{adAccountSettings.adsCreatedCount}</p>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-gray-200" />
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Time Saved</p>
                                    <p className="text-lg font-bold text-green-600">{formatTimeSaved(adAccountSettings.adsCreatedCount)} hours</p>
                                </div>
                            </div>
                            <div className="flex-1" />
                            <p className="text-[10px] text-gray-400 self-end">counting since Jan 22</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Stats Header */}
            {quickStats && (
                <div className="grid grid-cols-4 gap-3">
                    <Card className="rounded-2xl border-gray-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                                    <DollarSign className="w-3 h-3 text-blue-600" />
                                </div>
                                <p className="text-xs text-gray-500">Today's Spend</p>
                            </div>
                            <p className="text-xl font-bold">{formatCurrency(quickStats.today.spend)}</p>
                            {quickStats.trends.spendVsYesterday !== 0 && (
                                <p className={cn("text-xs mt-1", formatPercent(quickStats.trends.spendVsYesterday)?.color)}>
                                    {formatPercent(quickStats.trends.spendVsYesterday)?.text} vs yesterday
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-gray-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                                    <BarChart3 className="w-3 h-3 text-gray-600" />
                                </div>
                                <p className="text-xs text-gray-500">7-Day Spend</p>
                            </div>
                            <p className="text-xl font-bold">{formatCurrency(quickStats.last7Days.spend)}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Avg: {formatCurrency(quickStats.last7Days.avgDailySpend)}/day
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-gray-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                                    <Target className="w-3 h-3 text-purple-600" />
                                </div>
                                <p className="text-xs text-gray-500">Today's CPA</p>
                            </div>
                            <p className="text-xl font-bold">
                                {quickStats.today.cpa ? formatCurrency(quickStats.today.cpa) : 'N/A'}
                            </p>
                            {quickStats.trends.cpaVsYesterday !== null && (
                                <p className={cn("text-xs mt-1", formatPercent(quickStats.trends.cpaVsYesterday, true)?.color)}>
                                    {formatPercent(quickStats.trends.cpaVsYesterday, true)?.text} vs yesterday
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-gray-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                                </div>
                                <p className="text-xs text-gray-500">Today's Results</p>
                            </div>
                            <p className="text-xl font-bold">{quickStats.today.results || 0}</p>
                            <p className="text-xs text-gray-400 mt-1 truncate">
                                {CONVERSION_EVENTS.find(e => e.value === selectedConversionEvent)?.label || 'conversions'}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Sub-tabs - Pill Switcher Design */}
            <div className="w-full mb-6">
                <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl w-full border border-gray-200/60">
                    <button
                        onClick={() => setActiveSubTab('anomalies')}
                        className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                            activeSubTab === 'anomalies'
                                ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                        )}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Anomaly Detection
                        {anomalySummary?.total > 0 && (
                            <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0 rounded-xl">
                                {anomalySummary.total}
                            </Badge>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveSubTab('recommendations')}
                        className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                            activeSubTab === 'recommendations'
                                ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                        )}
                    >
                        <Zap className="w-4 h-4" />
                        Budget Recommendations
                        {recSummary?.total > 0 && (
                            <Badge className="ml-1 text-xs px-1.5 py-0 bg-blue-100 text-blue-700 hover:bg-blue-100 rounded-xl">
                                {recSummary.total}
                            </Badge>
                        )}
                    </button>
                </div>
            </div>


            {/* Anomalies Tab Content */}
            {activeSubTab === 'anomalies' && (
                <div className="space-y-4">
                    {/* Slack Integration Toggle */}
                    <Card className="rounded-2xl border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#4A154B] flex items-center justify-center">
                                        <Slack className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Slack Notifications</p>
                                        <p className="text-xs text-gray-500">Get anomaly alerts sent to your Slack channel</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {slackEnabled && (
                                        <Badge variant="outline" className="rounded-full text-xs bg-green-50 text-green-700 border-green-200">
                                            Connected
                                        </Badge>
                                    )}
                                    <Switch
                                        checked={slackEnabled}
                                        onCheckedChange={handleSlackToggle}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {anomaliesLoading ? (
                        <Card className="rounded-2xl">
                            <CardContent className="py-12">
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    <p className="text-sm text-gray-500">Analyzing ad performance...</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : anomalies.length === 0 ? (
                        <Card className="rounded-2xl border-green-200 bg-green-50/50">
                            <CardContent className="py-8">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                                    <p className="font-medium text-green-700">All Clear!</p>
                                    <p className="text-sm text-green-600">No anomalies detected in your ad performance</p>
                                    {lastChecked && (
                                        <p className="text-xs text-gray-400 mt-2">Last checked: {new Date(lastChecked).toLocaleString()}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {anomalies.map((anomaly, index) => (
                                <Card key={anomaly.id || index} className={cn(
                                    "rounded-2xl",
                                    anomaly.severity === 'critical'
                                        ? "border-red-200 bg-red-50/30"
                                        : "border-orange-200 bg-orange-50/30"
                                )}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                                    anomaly.severity === 'critical' ? "bg-red-100" : "bg-orange-100"
                                                )}>
                                                    <AlertTriangle className={cn(
                                                        "w-5 h-5",
                                                        anomaly.severity === 'critical' ? "text-red-600" : "text-orange-600"
                                                    )} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{anomaly.adsetName}</p>
                                                    <p className="text-sm text-gray-600 mt-0.5">
                                                        {anomaly.message || (anomaly.type === 'cpa_spike'
                                                            ? `CPA increased by ${anomaly.details?.changePercent}%`
                                                            : `Overspent by ${anomaly.details?.overspendPercent}%`
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">Campaign: {anomaly.campaignName}</p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        {anomaly.type === 'cpa_spike' && (
                                                            <>
                                                                <span className="text-xs text-gray-500">
                                                                    Today: <span className="font-medium text-orange-600">${anomaly.details?.todayCPA}</span>
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    7d Avg: <span className="font-medium">${anomaly.details?.avgCPA}</span>
                                                                </span>
                                                            </>
                                                        )}
                                                        {anomaly.type === 'overspend' && (
                                                            <>
                                                                <span className="text-xs text-gray-500">
                                                                    Spent: <span className="font-medium text-orange-600">${anomaly.details?.todaySpend}</span>
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    Budget: <span className="font-medium">${anomaly.details?.dailyBudget}</span>
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={cn(
                                                anomaly.severity === 'critical'
                                                    ? "bg-red-100 text-red-700 border-red-200"
                                                    : "bg-orange-100 text-orange-700 border-orange-200"
                                            )}>
                                                {anomaly.severity}
                                            </Badge>
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
                    {recommendationsLoading ? (
                        <Card className="rounded-2xl">
                            <CardContent className="py-12">
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    <p className="text-sm text-gray-500">Generating budget recommendations...</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : recommendations.length === 0 ? (
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
                            {recommendations.map((rec) => (
                                <Card key={rec.id} className={cn(
                                    "rounded-2xl",
                                    rec.recommendationType === 'increase' ? "border-green-200 bg-green-50/30" : "border-orange-200 bg-orange-50/30"
                                )}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                                    rec.recommendationType === 'increase' ? "bg-green-100" : "bg-orange-100"
                                                )}>
                                                    {rec.recommendationType === 'increase' ? (
                                                        <TrendingUp className="w-5 h-5 text-green-600" />
                                                    ) : (
                                                        <TrendingDown className="w-5 h-5 text-orange-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{rec.entityName}</p>
                                                    <p className="text-sm text-gray-600 mt-0.5">{rec.reason}</p>
                                                    {rec.campaignName && rec.entityType === 'adset' && (
                                                        <p className="text-xs text-gray-400 mt-1">Campaign: {rec.campaignName}</p>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-3">
                                                        <span className="text-xs text-gray-500">
                                                            Current: <span className="font-medium">{formatCurrency(rec.currentBudget)}/day</span>
                                                        </span>
                                                        <span className="text-xs">→</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-gray-500">New:</span>
                                                            <div className="relative">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={editedBudgets[rec.id] || ''}
                                                                    onChange={(e) => setEditedBudgets(prev => ({ ...prev, [rec.id]: e.target.value }))}
                                                                    className={cn(
                                                                        "w-24 pl-5 pr-2 py-1 text-xs font-medium border rounded-lg focus:outline-none focus:ring-2",
                                                                        rec.recommendationType === 'increase'
                                                                            ? "border-green-300 focus:ring-green-500 text-green-700"
                                                                            : "border-orange-300 focus:ring-orange-500 text-orange-700"
                                                                    )}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-gray-500">/day</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => dismissRecommendation(rec.id)}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => applyRecommendation(rec)}
                                                    disabled={applyingId === rec.id}
                                                    className={cn(
                                                        "rounded-xl",
                                                        rec.recommendationType === 'increase'
                                                            ? "bg-green-600 hover:bg-green-700"
                                                            : "bg-orange-600 hover:bg-orange-700"
                                                    )}
                                                >
                                                    {applyingId === rec.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>Apply</>
                                                    )}
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

            {/* Settings Dialog */}
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                <DialogOverlay className="bg-black/50" />
                <DialogContent className="sm:max-w-[500px] !rounded-[30px] p-8 space-y-6">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Settings2 className="w-5 h-5" />
                            Analytics Settings
                        </DialogTitle>
                        <DialogDescription>
                            Configure conversion events and anomaly detection thresholds
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Conversion Event Setting */}
                        <div className="space-y-4">
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                <Target className="w-4 h-4 text-purple-500" />
                                Key Conversion Event
                            </h3>

                            <div className="pl-6">
                                <p className="text-sm text-gray-500 mb-3">
                                    Results and CPA are calculated based on this event
                                </p>
                                <Select value={selectedConversionEvent} onValueChange={handleConversionEventChange}>
                                    <SelectTrigger className="w-full rounded-xl">
                                        <SelectValue placeholder="Select conversion event" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl bg-white">
                                        {CONVERSION_EVENTS.map((event) => (
                                            <SelectItem key={event.value} value={event.value} className="rounded-lg">
                                                {event.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="border-t border-gray-200" />

                        {/* Anomaly Thresholds */}
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
                                            onBlur={(e) => {
                                                const num = parseInt(e.target.value) || 50;
                                                setTempThresholds(prev => ({ ...prev, cpaSpike: num }));
                                            }}
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
                                            onBlur={(e) => {
                                                const num = parseInt(e.target.value) || 150;
                                                setTempThresholds(prev => ({ ...prev, overspend: num }));
                                            }}
                                            className="w-24 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <span className="text-sm text-gray-500">
                                            Alert when daily spend exceeds this % of budget (ABO only)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowSettingsDialog(false)}
                            className="rounded-2xl flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveThresholds}
                            className="rounded-2xl flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            Save Settings
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Total Ad Launches Popup */}
            <Dialog open={showStatsPopup} onOpenChange={setShowStatsPopup}>
                <DialogOverlay className="bg-black/50" />
                <DialogContent className="sm:max-w-[500px] !rounded-[30px] p-0 overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            <Rocket className="w-5 h-5 text-blue-600" />
                            Total Ad Launches
                        </DialogTitle>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl text-center">
                                <div className="text-3xl font-bold text-blue-600">{totalAdsAllAccounts}</div>
                                <div className="text-sm text-gray-600 mt-1">Total Ads Launched</div>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-2xl text-center">
                                <div className="text-3xl font-bold text-green-600">{totalHoursSavedAll}h</div>
                                <div className="text-sm text-gray-600 mt-1">Total Time Saved</div>
                            </div>
                        </div>

                        {allStats.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                <div className="text-sm font-medium text-gray-500 mb-3">By Ad Account</div>
                                {allStats.map((stat) => {
                                    const accountName = adAccounts?.find(a => a.id === stat.adAccountId)?.name || stat.adAccountId;
                                    return (
                                        <div key={stat.adAccountId} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                            <span className="text-sm text-gray-700 truncate flex-1">{accountName}</span>
                                            <div className="flex items-center gap-3 ml-2">
                                                <span className="text-sm font-semibold text-blue-600">{stat.adsCreatedCount} ads</span>
                                                <span className="text-xs text-green-600">{formatTimeSaved(stat.adsCreatedCount)}h saved</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-8">
                                <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p>No ads launched yet across any account</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                        <p className="text-[10px] text-gray-400">counting since Jan 22</p>
                        <Button
                            variant="outline"
                            onClick={() => setShowStatsPopup(false)}
                            className="rounded-2xl"
                        >
                            Close
                        </Button>
                    </div>
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
                                <li>• <strong>Anomaly Detection:</strong> Alerts when CPA spikes {anomalyThresholds.cpaSpike}%+ vs 7-day average, or when spend exceeds {anomalyThresholds.overspend}% of daily budget (ABO only)</li>
                                <li>• <strong>Budget Recommendations:</strong> Suggests ±15% budget changes when CPA improves/worsens 10%+ with stable spend over 3-day periods</li>
                                <li>• <strong>Key Conversion Event:</strong> Results and CPA are calculated based on your selected conversion event ({CONVERSION_EVENTS.find(e => e.value === selectedConversionEvent)?.label})</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}