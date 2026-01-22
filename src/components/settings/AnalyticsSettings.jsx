// "use client"

// import { useState, useEffect, useMemo, useCallback } from "react"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Card, CardContent } from "@/components/ui/card"
// import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
// import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Switch } from "@/components/ui/switch"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import {
//     AlertTriangle,
//     TrendingUp,
//     TrendingDown,
//     RefreshCw,
//     CheckCircle2,
//     XCircle,
//     DollarSign,
//     Activity,
//     ArrowUpRight,
//     ArrowDownRight,
//     Loader2,
//     ChevronRight,
//     Zap,
//     ChevronsUpDown,
//     Eye,
//     Target,
//     BarChart3,
//     Settings2,
//     Bell,
//     Slack
// } from "lucide-react"
// import { toast } from "sonner"
// import {
//     Dialog,
//     DialogContent,
//     DialogDescription,
//     DialogFooter,
//     DialogHeader,
//     DialogTitle,
//     DialogOverlay,
// } from "@/components/ui/dialog"
// import { useAppData } from "@/lib/AppContext"
// import { cn } from "@/lib/utils"

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

// // Available conversion events for Meta Ads
// const CONVERSION_EVENTS = [
//     { value: 'purchase', label: 'Purchase' },
//     { value: 'lead', label: 'Lead' },
//     { value: 'complete_registration', label: 'Complete Registration' },
//     { value: 'add_to_cart', label: 'Add to Cart' },
//     { value: 'initiate_checkout', label: 'Initiate Checkout' },
//     { value: 'add_payment_info', label: 'Add Payment Info' },
//     { value: 'subscribe', label: 'Subscribe' },
//     { value: 'start_trial', label: 'Start Trial' },
//     { value: 'app_install', label: 'App Install' },
//     { value: 'contact', label: 'Contact' },
//     { value: 'customize_product', label: 'Customize Product' },
//     { value: 'donate', label: 'Donate' },
//     { value: 'find_location', label: 'Find Location' },
//     { value: 'schedule', label: 'Schedule' },
//     { value: 'search', label: 'Search' },
//     { value: 'submit_application', label: 'Submit Application' },
//     { value: 'view_content', label: 'View Content' },
//     { value: 'link_click', label: 'Link Click' },
//     { value: 'landing_page_view', label: 'Landing Page View' },
// ];

// // Default anomaly thresholds
// const DEFAULT_THRESHOLDS = {
//     cpaSpike: 50, // CPA spike percentage threshold
//     overspend: 150, // Overspend percentage threshold
// };

// // Mini sparkline chart component for 7-day trends
// const MiniSparkline = ({ data, color = "blue", height = 40, showDots = false }) => {
//     if (!data || data.length === 0) return null;

//     const values = data.map(d => d.value);
//     const min = Math.min(...values);
//     const max = Math.max(...values);
//     const range = max - min || 1;

//     const width = 120;
//     const padding = 4;
//     const chartWidth = width - padding * 2;
//     const chartHeight = height - padding * 2;

//     const points = values.map((v, i) => ({
//         x: padding + (i / (values.length - 1)) * chartWidth,
//         y: padding + chartHeight - ((v - min) / range) * chartHeight
//     }));

//     const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

//     const colorMap = {
//         blue: { stroke: '#3b82f6', fill: '#3b82f620' },
//         green: { stroke: '#22c55e', fill: '#22c55e20' },
//         orange: { stroke: '#f97316', fill: '#f9731620' },
//         purple: { stroke: '#a855f7', fill: '#a855f720' },
//     };

//     const colors = colorMap[color] || colorMap.blue;

//     // Area path
//     const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

//     return (
//         <svg width={width} height={height} className="overflow-visible">
//             <path d={areaD} fill={colors.fill} />
//             <path d={pathD} fill="none" stroke={colors.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//             {showDots && points.map((p, i) => (
//                 <circle key={i} cx={p.x} cy={p.y} r="3" fill={colors.stroke} />
//             ))}
//         </svg>
//     );
// };

// // Dual-line chart for spend vs CPA comparison
// const SpendCpaChart = ({ spendData, cpaData, height = 60 }) => {
//     if (!spendData || !cpaData || spendData.length === 0) return null;

//     const width = 180;
//     const padding = 8;
//     const chartWidth = width - padding * 2;
//     const chartHeight = height - padding * 2;

//     // Normalize spend values
//     const spendValues = spendData.map(d => d.value);
//     const spendMin = Math.min(...spendValues);
//     const spendMax = Math.max(...spendValues);
//     const spendRange = spendMax - spendMin || 1;

//     // Normalize CPA values
//     const cpaValues = cpaData.map(d => d.value);
//     const cpaMin = Math.min(...cpaValues);
//     const cpaMax = Math.max(...cpaValues);
//     const cpaRange = cpaMax - cpaMin || 1;

//     const spendPoints = spendValues.map((v, i) => ({
//         x: padding + (i / (spendValues.length - 1)) * chartWidth,
//         y: padding + chartHeight - ((v - spendMin) / spendRange) * chartHeight
//     }));

//     const cpaPoints = cpaValues.map((v, i) => ({
//         x: padding + (i / (cpaValues.length - 1)) * chartWidth,
//         y: padding + chartHeight - ((v - cpaMin) / cpaRange) * chartHeight
//     }));

//     const spendPathD = spendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
//     const cpaPathD = cpaPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

//     // Day labels
//     const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].slice(-spendData.length);

//     return (
//         <div className="flex flex-col gap-1">
//             <svg width={width} height={height} className="overflow-visible">
//                 {/* Spend line (blue) */}
//                 <path d={spendPathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//                 {/* CPA line (purple) */}
//                 <path d={cpaPathD} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" />
//             </svg>
//             <div className="flex justify-between px-1">
//                 {days.map((day, i) => (
//                     <span key={i} className="text-[9px] text-gray-400">{day}</span>
//                 ))}
//             </div>
//             <div className="flex items-center gap-3 mt-1">
//                 <div className="flex items-center gap-1">
//                     <div className="w-3 h-0.5 bg-blue-500 rounded" />
//                     <span className="text-[10px] text-gray-500">Spend</span>
//                 </div>
//                 <div className="flex items-center gap-1">
//                     <div className="w-3 h-0.5 bg-purple-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #a855f7 0, #a855f7 4px, transparent 4px, transparent 6px)' }} />
//                     <span className="text-[10px] text-gray-500">CPA</span>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default function AnalyticsSettings() {
//     const { adAccounts, adAccountsLoading } = useAppData()

//     // Ad account selection state
//     const [selectedAdAccount, setSelectedAdAccount] = useState(null)
//     const [openAdAccount, setOpenAdAccount] = useState(false)
//     const [searchValue, setSearchValue] = useState("")

//     // Key Conversion Event state (persisted per ad account)
//     const [conversionEvents, setConversionEvents] = useState(() => {
//         try {
//             const saved = localStorage.getItem('analytics_conversion_events');
//             return saved ? JSON.parse(saved) : {};
//         } catch {
//             return {};
//         }
//     });

//     // Anomaly threshold settings (persisted)
//     const [anomalyThresholds, setAnomalyThresholds] = useState(() => {
//         try {
//             const saved = localStorage.getItem('analytics_anomaly_thresholds');
//             return saved ? JSON.parse(saved) : DEFAULT_THRESHOLDS;
//         } catch {
//             return DEFAULT_THRESHOLDS;
//         }
//     });

//     // Slack integration state
//     const [slackEnabled, setSlackEnabled] = useState(() => {
//         try {
//             return localStorage.getItem('analytics_slack_enabled') === 'true';
//         } catch {
//             return false;
//         }
//     });

//     // Settings dialog state
//     const [showSettingsDialog, setShowSettingsDialog] = useState(false);
//     const [tempThresholds, setTempThresholds] = useState(anomalyThresholds);

//     // Tab state
//     const [activeSubTab, setActiveSubTab] = useState('anomalies')

//     // Quick stats state
//     const [quickStats, setQuickStats] = useState(null)
//     const [quickStatsLoading, setQuickStatsLoading] = useState(false)

//     // Anomalies state
//     const [anomalies, setAnomalies] = useState([])
//     const [nearThreshold, setNearThreshold] = useState([])
//     const [anomalySummary, setAnomalySummary] = useState(null)
//     const [adsetInsights, setAdsetInsights] = useState([])
//     const [anomaliesLoading, setAnomaliesLoading] = useState(false)
//     const [lastChecked, setLastChecked] = useState(null)

//     // Recommendations state
//     const [recommendations, setRecommendations] = useState([])
//     const [recSummary, setRecSummary] = useState(null)
//     const [analysisResults, setAnalysisResults] = useState([])
//     const [recommendationsLoading, setRecommendationsLoading] = useState(false)

//     // Apply recommendation state
//     const [applyingId, setApplyingId] = useState(null)
//     const [showApplyDialog, setShowApplyDialog] = useState(false)
//     const [selectedRec, setSelectedRec] = useState(null)
//     const [editedBudget, setEditedBudget] = useState('')

//     // Get selected conversion event for current ad account
//     const selectedConversionEvent = useMemo(() => {
//         return conversionEvents[selectedAdAccount] || 'purchase';
//     }, [conversionEvents, selectedAdAccount]);

//     // Memoized filtered ad accounts
//     const filteredAdAccounts = useMemo(() => {
//         if (!searchValue) return adAccounts || [];
//         const lowerSearchValue = searchValue.toLowerCase();
//         return (adAccounts || []).filter(
//             (acct) =>
//                 (acct.name?.toLowerCase() || "").includes(lowerSearchValue) ||
//                 acct.id.toLowerCase().includes(lowerSearchValue)
//         );
//     }, [adAccounts, searchValue]);

//     // Memoized selected ad account display name
//     const selectedAdAccountName = useMemo(() => {
//         if (!selectedAdAccount) return "Select an Ad Account";
//         return adAccounts?.find((acct) => acct.id === selectedAdAccount)?.name || selectedAdAccount;
//     }, [selectedAdAccount, adAccounts]);

//     // Handler for ad account selection
//     const handleAdAccountSelect = (accountId) => {
//         setSelectedAdAccount(accountId)
//         setOpenAdAccount(false)
//     }

//     // Handler for conversion event change
//     const handleConversionEventChange = (event) => {
//         const newEvents = { ...conversionEvents, [selectedAdAccount]: event };
//         setConversionEvents(newEvents);
//         localStorage.setItem('analytics_conversion_events', JSON.stringify(newEvents));
//         // Refetch data with new conversion event
//         toast.success(`Conversion event updated to ${CONVERSION_EVENTS.find(e => e.value === event)?.label}`);
//     };

//     // Handler for threshold changes
//     const handleSaveThresholds = () => {
//         setAnomalyThresholds(tempThresholds);
//         localStorage.setItem('analytics_anomaly_thresholds', JSON.stringify(tempThresholds));
//         setShowSettingsDialog(false);
//         toast.success('Anomaly thresholds updated');
//     };

//     // Handler for Slack toggle
//     const handleSlackToggle = (enabled) => {
//         setSlackEnabled(enabled);
//         localStorage.setItem('analytics_slack_enabled', enabled.toString());
//         if (enabled) {
//             toast.success('Slack notifications enabled');
//         } else {
//             toast.info('Slack notifications disabled');
//         }
//     };

//     // Set default ad account when data loads
//     useEffect(() => {
//         if (!adAccountsLoading && adAccounts?.length > 0 && !selectedAdAccount) {
//             setSelectedAdAccount(adAccounts[0].id)
//         }
//     }, [adAccountsLoading, adAccounts, selectedAdAccount])

//     // Fetch data when ad account or conversion event changes
//     useEffect(() => {
//         if (selectedAdAccount) {
//             fetchQuickStats()
//             if (activeSubTab === 'anomalies') {
//                 fetchAnomalies()
//             } else {
//                 fetchRecommendations()
//             }
//         }
//     }, [selectedAdAccount, activeSubTab, selectedConversionEvent])

//     const fetchQuickStats = async () => {
//         if (!selectedAdAccount) return
//         setQuickStatsLoading(true)
//         try {
//             const response = await fetch(
//                 `${API_BASE_URL}/api/analytics/quick-stats?adAccountId=${selectedAdAccount}&conversionEvent=${selectedConversionEvent}`,
//                 { credentials: 'include' }
//             )
//             const data = await response.json()
//             if (response.ok) {
//                 setQuickStats(data)
//             } else {
//                 console.error('Quick stats error:', data.error)
//             }
//         } catch (error) {
//             console.error('Fetch quick stats error:', error)
//         } finally {
//             setQuickStatsLoading(false)
//         }
//     }

//     const fetchAnomalies = async () => {
//         if (!selectedAdAccount) return
//         setAnomaliesLoading(true)
//         try {
//             const response = await fetch(
//                 `${API_BASE_URL}/api/analytics/anomalies?adAccountId=${selectedAdAccount}&conversionEvent=${selectedConversionEvent}&cpaThreshold=${anomalyThresholds.cpaSpike}&overspendThreshold=${anomalyThresholds.overspend}`,
//                 { credentials: 'include' }
//             )
//             const data = await response.json()
//             if (response.ok) {
//                 setAnomalies(data.anomalies || [])
//                 setNearThreshold(data.nearThreshold || [])
//                 setAnomalySummary(data.summary)
//                 setAdsetInsights(data.adsetInsights || [])
//                 setLastChecked(data.checkedAt)
//             } else {
//                 toast.error(data.error || 'Failed to fetch anomalies')
//             }
//         } catch (error) {
//             console.error('Fetch anomalies error:', error)
//             toast.error('Failed to fetch anomalies')
//         } finally {
//             setAnomaliesLoading(false)
//         }
//     }

//     const fetchRecommendations = async () => {
//         if (!selectedAdAccount) return
//         setRecommendationsLoading(true)
//         try {
//             const response = await fetch(
//                 `${API_BASE_URL}/api/analytics/recommendations?adAccountId=${selectedAdAccount}&conversionEvent=${selectedConversionEvent}`,
//                 { credentials: 'include' }
//             )
//             const data = await response.json()
//             if (response.ok) {
//                 setRecommendations(data.recommendations || [])
//                 setRecSummary(data.summary)
//                 setAnalysisResults(data.analysisResults || [])
//             } else {
//                 toast.error(data.error || 'Failed to fetch recommendations')
//             }
//         } catch (error) {
//             console.error('Fetch recommendations error:', error)
//             toast.error('Failed to fetch recommendations')
//         } finally {
//             setRecommendationsLoading(false)
//         }
//     }

//     const handleApplyRecommendation = (rec) => {
//         setSelectedRec(rec)
//         setEditedBudget(rec.suggestedBudget.toFixed(2))
//         setShowApplyDialog(true)
//     }

//     const confirmApplyRecommendation = async () => {
//         if (!selectedRec) return

//         const budgetToApply = parseFloat(editedBudget);
//         if (isNaN(budgetToApply) || budgetToApply <= 0) {
//             toast.error('Please enter a valid budget amount');
//             return;
//         }

//         setApplyingId(selectedRec.id)
//         setShowApplyDialog(false)

//         try {
//             const response = await fetch(`${API_BASE_URL}/api/analytics/apply-recommendation`, {
//                 method: 'POST',
//                 credentials: 'include',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     entityType: selectedRec.entityType,
//                     entityId: selectedRec.entityId,
//                     newBudget: budgetToApply
//                 })
//             })

//             const data = await response.json()
//             if (data.success) {
//                 toast.success(`Budget updated to $${budgetToApply.toFixed(2)}/day`)
//                 setRecommendations(prev => prev.filter(r => r.id !== selectedRec.id))
//             } else {
//                 toast.error(data.error || 'Failed to apply recommendation')
//             }
//         } catch (error) {
//             console.error('Apply recommendation error:', error)
//             toast.error('Failed to apply recommendation')
//         } finally {
//             setApplyingId(null)
//             setSelectedRec(null)
//             setEditedBudget('')
//         }
//     }

//     const dismissRecommendation = (recId) => {
//         setRecommendations(prev => prev.filter(r => r.id !== recId))
//         toast.success('Recommendation dismissed')
//     }

//     // Format currency
//     const formatCurrency = (value) => {
//         if (value === null || value === undefined) return 'N/A'
//         return `$${parseFloat(value).toFixed(2)}`
//     }

//     // Format percent with color
//     const formatPercent = (value, inverse = false) => {
//         if (value === null || value === undefined) return null
//         const num = parseFloat(value)
//         const isPositive = inverse ? num < 0 : num > 0
//         return {
//             text: `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`,
//             color: isPositive ? 'text-green-600' : num < 0 ? 'text-red-600' : 'text-gray-600'
//         }
//     }

//     if (adAccountsLoading) {
//         return (
//             <div className="flex items-center justify-center py-12">
//                 <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
//             </div>
//         )
//     }

//     if (!adAccounts || adAccounts.length === 0) {
//         return (
//             <Card className="rounded-3xl shadow-lg shadow-gray-200/50">
//                 <CardContent className="pt-6">
//                     <div className="text-center py-8">
//                         <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
//                         <p className="text-gray-600 font-medium">No Ad Accounts Connected</p>
//                         <p className="text-sm text-gray-400 mt-1">
//                             Connect an ad account in Preferences to use Analytics
//                         </p>
//                     </div>
//                 </CardContent>
//             </Card>
//         )
//     }

//     return (
//         <div className="space-y-6">
//             {/* Ad Account Selector + Conversion Event + Settings */}
//             <div className="flex items-center justify-between gap-3 flex-wrap">
//                 <div className="flex items-center gap-3 flex-wrap">
//                     {/* Ad Account Dropdown */}
//                     <Popover open={openAdAccount} onOpenChange={setOpenAdAccount}>
//                         <PopoverTrigger asChild>
//                             <Button
//                                 variant="outline"
//                                 role="combobox"
//                                 className="w-[280px] justify-between rounded-2xl h-11 bg-white shadow-sm hover:bg-white"
//                             >
//                                 {selectedAdAccountName}
//                                 <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//                             </Button>
//                         </PopoverTrigger>
//                         <PopoverContent
//                             className="min-w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-xl"
//                             align="start"
//                             sideOffset={4}
//                         >
//                             <Command filter={() => 1} loop={false} value="">
//                                 <CommandInput
//                                     placeholder="Search ad accounts..."
//                                     value={searchValue}
//                                     onValueChange={setSearchValue}
//                                     className="bg-white"
//                                 />
//                                 <CommandList className="max-h-[300px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
//                                     {adAccountsLoading ? (
//                                         <div className="flex items-center justify-center py-6 gap-2 text-sm text-gray-500">
//                                             <Loader2 className="h-4 w-4 animate-spin" />
//                                             Fetching ad accounts...
//                                         </div>
//                                     ) : (
//                                         <CommandGroup>
//                                             {filteredAdAccounts.map((acct) => (
//                                                 <CommandItem
//                                                     key={acct.id}
//                                                     value={acct.id}
//                                                     onSelect={handleAdAccountSelect}
//                                                     className={`
//                                                         px-4 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150
//                                                         hover:bg-gray-100
//                                                         ${selectedAdAccount === acct.id ? "bg-gray-100 font-semibold" : ""}
//                                                     `}
//                                                 >
//                                                     {acct.name || acct.id}
//                                                 </CommandItem>
//                                             ))}
//                                         </CommandGroup>
//                                     )}
//                                 </CommandList>
//                             </Command>
//                         </PopoverContent>
//                     </Popover>

//                     {/* Key Conversion Event Dropdown */}
//                     <Select value={selectedConversionEvent} onValueChange={handleConversionEventChange}>
//                         <SelectTrigger className="w-[200px] rounded-2xl h-11 bg-white shadow-sm">
//                             <div className="flex items-center gap-2">
//                                 <Target className="w-4 h-4 text-purple-500" />
//                                 <SelectValue placeholder="Conversion Event" />
//                             </div>
//                         </SelectTrigger>
//                         <SelectContent className="rounded-xl bg-white">
//                             {CONVERSION_EVENTS.map((event) => (
//                                 <SelectItem key={event.value} value={event.value} className="rounded-lg">
//                                     {event.label}
//                                 </SelectItem>
//                             ))}
//                         </SelectContent>
//                     </Select>
//                 </div>

//                 <div className="flex items-center gap-2">
//                     {/* Settings Button */}
//                     <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => {
//                             setTempThresholds(anomalyThresholds);
//                             setShowSettingsDialog(true);
//                         }}
//                         className="rounded-2xl h-11 px-4"
//                     >
//                         <Settings2 className="w-4 h-4 mr-2" />
//                         Settings
//                     </Button>

//                     {/* Refresh Button */}
//                     <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => {
//                             fetchQuickStats()
//                             if (activeSubTab === 'anomalies') fetchAnomalies()
//                             else fetchRecommendations()
//                         }}
//                         disabled={anomaliesLoading || recommendationsLoading || quickStatsLoading}
//                         className="rounded-2xl h-11 px-4"
//                     >
//                         <RefreshCw className={cn("w-4 h-4 mr-2", (anomaliesLoading || recommendationsLoading || quickStatsLoading) && "animate-spin")} />
//                         Refresh
//                     </Button>
//                 </div>
//             </div>

//             {/* Quick Stats Header */}
//             {quickStats && (
//                 <div className="grid grid-cols-4 gap-3">
//                     <Card className="rounded-2xl border-gray-200">
//                         <CardContent className="p-4">
//                             <div className="flex items-center gap-1.5 mb-2">
//                                 <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
//                                     <DollarSign className="w-3 h-3 text-blue-600" />
//                                 </div>
//                                 <p className="text-xs text-gray-500">Today's Spend</p>
//                             </div>
//                             <p className="text-xl font-bold">{formatCurrency(quickStats.today.spend)}</p>
//                             {quickStats.trends.spendVsYesterday !== 0 && (
//                                 <p className={cn("text-xs mt-1", formatPercent(quickStats.trends.spendVsYesterday)?.color)}>
//                                     {formatPercent(quickStats.trends.spendVsYesterday)?.text} vs yesterday
//                                 </p>
//                             )}
//                         </CardContent>
//                     </Card>

//                     <Card className="rounded-2xl border-gray-200">
//                         <CardContent className="p-4">
//                             <div className="flex items-center gap-1.5 mb-2">
//                                 <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
//                                     <BarChart3 className="w-3 h-3 text-gray-600" />
//                                 </div>
//                                 <p className="text-xs text-gray-500">7-Day Spend</p>
//                             </div>
//                             <p className="text-xl font-bold">{formatCurrency(quickStats.last7Days.spend)}</p>
//                             <p className="text-xs text-gray-400 mt-1">
//                                 Avg: {formatCurrency(quickStats.last7Days.avgDailySpend)}/day
//                             </p>
//                         </CardContent>
//                     </Card>

//                     <Card className="rounded-2xl border-gray-200">
//                         <CardContent className="p-4">
//                             <div className="flex items-center gap-1.5 mb-2">
//                                 <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
//                                     <Target className="w-3 h-3 text-purple-600" />
//                                 </div>
//                                 <p className="text-xs text-gray-500">Today's CPA</p>
//                             </div>
//                             <p className="text-xl font-bold">
//                                 {quickStats.today.cpa ? formatCurrency(quickStats.today.cpa) : 'N/A'}
//                             </p>
//                             {quickStats.trends.cpaVsYesterday !== null && (
//                                 <p className={cn("text-xs mt-1", formatPercent(quickStats.trends.cpaVsYesterday, true)?.color)}>
//                                     {formatPercent(quickStats.trends.cpaVsYesterday, true)?.text} vs yesterday
//                                 </p>
//                             )}
//                         </CardContent>
//                     </Card>

//                     <Card className="rounded-2xl border-gray-200">
//                         <CardContent className="p-4">
//                             <div className="flex items-center gap-1.5 mb-2">
//                                 <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
//                                     <TrendingUp className="w-3 h-3 text-green-600" />
//                                 </div>
//                                 <p className="text-xs text-gray-500">Today's Results</p>
//                             </div>
//                             <p className="text-xl font-bold">{quickStats.today.results.toLocaleString()}</p>
//                             <p className="text-xs text-gray-400 mt-1 truncate">
//                                 {CONVERSION_EVENTS.find(e => e.value === selectedConversionEvent)?.label || 'conversions'}
//                             </p>
//                         </CardContent>
//                     </Card>
//                 </div>
//             )}

//             {/* Sub-tab Navigation */}
//             <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
//                 <button
//                     onClick={() => setActiveSubTab('anomalies')}
//                     className={cn(
//                         "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all",
//                         activeSubTab === 'anomalies'
//                             ? "bg-white shadow-sm text-gray-900"
//                             : "text-gray-500 hover:text-gray-700"
//                     )}
//                 >
//                     <AlertTriangle className="w-4 h-4" />
//                     Anomaly Alerts
//                     {anomalySummary?.total > 0 && (
//                         <Badge variant="destructive" className="ml-1 rounded-full px-2 py-0.5 text-xs">
//                             {anomalySummary.total}
//                         </Badge>
//                     )}
//                 </button>
//                 <button
//                     onClick={() => setActiveSubTab('recommendations')}
//                     className={cn(
//                         "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all",
//                         activeSubTab === 'recommendations'
//                             ? "bg-white shadow-sm text-gray-900"
//                             : "text-gray-500 hover:text-gray-700"
//                     )}
//                 >
//                     <Zap className="w-4 h-4" />
//                     Budget Recommendations
//                     {recSummary?.total > 0 && (
//                         <Badge className="ml-1 rounded-full px-2 py-0.5 text-xs bg-blue-100 text-blue-700">
//                             {recSummary.total}
//                         </Badge>
//                     )}
//                 </button>
//             </div>

//             {/* ==================== ANOMALIES TAB ==================== */}
//             {activeSubTab === 'anomalies' && (
//                 <div className="space-y-4">
//                     {/* Slack Integration Toggle */}
//                     <Card className="rounded-2xl border-gray-200 bg-gradient-to-r from-gray-50 to-white">
//                         <CardContent className="p-4">
//                             <div className="flex items-center justify-between">
//                                 <div className="flex items-center gap-3">
//                                     <div className="w-10 h-10 rounded-xl bg-[#4A154B] flex items-center justify-center">
//                                         <Slack className="w-5 h-5 text-white" />
//                                     </div>
//                                     <div>
//                                         <p className="font-medium text-gray-900">Slack Notifications</p>
//                                         <p className="text-xs text-gray-500">Get anomaly alerts sent to your Slack channel</p>
//                                     </div>
//                                 </div>
//                                 <div className="flex items-center gap-3">
//                                     {slackEnabled && (
//                                         <Badge variant="outline" className="rounded-full text-xs bg-green-50 text-green-700 border-green-200">
//                                             Connected
//                                         </Badge>
//                                     )}
//                                     <Switch
//                                         checked={slackEnabled}
//                                         onCheckedChange={handleSlackToggle}
//                                     />
//                                 </div>
//                             </div>
//                             {slackEnabled && (
//                                 <p className="text-xs text-gray-400 mt-3 pl-[52px]">
//                                     Alerts will be sent to #ads-alerts when anomalies are detected
//                                 </p>
//                             )}
//                         </CardContent>
//                     </Card>

//                     {/* Loading State */}
//                     {anomaliesLoading && (
//                         <Card className="rounded-3xl">
//                             <CardContent className="py-12">
//                                 <div className="flex flex-col items-center justify-center">
//                                     <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-3" />
//                                     <p className="text-gray-500">Scanning for anomalies...</p>
//                                 </div>
//                             </CardContent>
//                         </Card>
//                     )}

//                     {/* Anomalies List */}
//                     {!anomaliesLoading && anomalies.length > 0 && (
//                         <div className="space-y-3">
//                             {anomalies.map(anomaly => (
//                                 <Card
//                                     key={anomaly.id}
//                                     className={cn(
//                                         "rounded-2xl transition-all hover:shadow-md",
//                                         anomaly.severity === 'critical'
//                                             ? "border-red-200 bg-red-50/30"
//                                             : "border-yellow-200 bg-yellow-50/30"
//                                     )}
//                                 >
//                                     <CardContent className="p-4">
//                                         <div className="flex items-start justify-between">
//                                             <div className="flex items-start gap-3">
//                                                 <div className={cn(
//                                                     "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
//                                                     anomaly.severity === 'critical' ? "bg-red-100" : "bg-yellow-100"
//                                                 )}>
//                                                     {anomaly.type === 'cpa_spike' ? (
//                                                         <TrendingUp className={cn(
//                                                             "w-5 h-5",
//                                                             anomaly.severity === 'critical' ? "text-red-600" : "text-yellow-600"
//                                                         )} />
//                                                     ) : (
//                                                         <DollarSign className={cn(
//                                                             "w-5 h-5",
//                                                             anomaly.severity === 'critical' ? "text-red-600" : "text-yellow-600"
//                                                         )} />
//                                                     )}
//                                                 </div>
//                                                 <div>
//                                                     <div className="flex items-center gap-2">
//                                                         <p className="font-medium text-gray-900">{anomaly.message}</p>
//                                                         <Badge
//                                                             variant={anomaly.severity === 'critical' ? 'destructive' : 'outline'}
//                                                             className="rounded-full text-xs"
//                                                         >
//                                                             {anomaly.severity}
//                                                         </Badge>
//                                                     </div>
//                                                     <p className="text-sm text-gray-500 mt-0.5">{anomaly.adsetName}</p>
//                                                     <p className="text-xs text-gray-400 mt-1">Campaign: {anomaly.campaignName}</p>

//                                                     <div className="flex gap-4 mt-3 text-xs">
//                                                         {anomaly.type === 'cpa_spike' && (
//                                                             <>
//                                                                 <div className="bg-white rounded-lg px-3 py-1.5 border">
//                                                                     <span className="text-gray-500">Today: </span>
//                                                                     <span className="font-medium">${anomaly.details.todayCPA}</span>
//                                                                 </div>
//                                                                 <div className="bg-white rounded-lg px-3 py-1.5 border">
//                                                                     <span className="text-gray-500">7d Avg: </span>
//                                                                     <span className="font-medium">${anomaly.details.avgCPA}</span>
//                                                                 </div>
//                                                             </>
//                                                         )}
//                                                         {anomaly.type === 'overspend' && (
//                                                             <>
//                                                                 <div className="bg-white rounded-lg px-3 py-1.5 border">
//                                                                     <span className="text-gray-500">Spent: </span>
//                                                                     <span className="font-medium">${anomaly.details.todaySpend}</span>
//                                                                 </div>
//                                                                 <div className="bg-white rounded-lg px-3 py-1.5 border">
//                                                                     <span className="text-gray-500">Budget: </span>
//                                                                     <span className="font-medium">${anomaly.details.dailyBudget}</span>
//                                                                 </div>
//                                                             </>
//                                                         )}
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </CardContent>
//                                 </Card>
//                             ))}
//                         </div>
//                     )}

//                     {/* Empty State with Near Threshold and Adset Insights */}
//                     {!anomaliesLoading && anomalies.length === 0 && (
//                         <div className="space-y-4">
//                             <Card className="rounded-3xl border-green-200 bg-green-50/30">
//                                 <CardContent className="py-8">
//                                     <div className="flex flex-col items-center justify-center">
//                                         <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
//                                         <p className="text-gray-700 font-medium">All Clear!</p>
//                                         <p className="text-sm text-gray-400 mt-1">No anomalies detected in your ad account</p>
//                                         {lastChecked && (
//                                             <p className="text-xs text-gray-400 mt-3">
//                                                 Last checked: {new Date(lastChecked).toLocaleTimeString()}
//                                             </p>
//                                         )}
//                                     </div>
//                                 </CardContent>
//                             </Card>

//                             {/* Near Threshold Items */}
//                             {nearThreshold.length > 0 && (
//                                 <Card className="rounded-2xl border-yellow-200 bg-yellow-50/30">
//                                     <CardContent className="p-4">
//                                         <div className="flex items-center gap-2 mb-3">
//                                             <Eye className="w-5 h-5 text-yellow-600" />
//                                             <p className="font-medium text-gray-900">Watching ({nearThreshold.length})</p>
//                                         </div>
//                                         <p className="text-sm text-gray-500 mb-3">
//                                             These items are approaching alert thresholds
//                                         </p>
//                                         <div className="space-y-2">
//                                             {nearThreshold.map((item, idx) => (
//                                                 <div key={idx} className="flex items-center justify-between bg-white rounded-xl p-3 border">
//                                                     <div>
//                                                         <span className="text-sm font-medium text-gray-700">{item.adsetName}</span>
//                                                         <p className="text-xs text-gray-400">{item.campaignName}</p>
//                                                     </div>
//                                                     <span className="text-sm font-medium text-yellow-700">{item.message}</span>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </CardContent>
//                                 </Card>
//                             )}

//                             {/* Top Adsets by Spend */}
//                             {adsetInsights.length > 0 && (
//                                 <Card className="rounded-2xl border-gray-200">
//                                     <CardContent className="p-4">
//                                         <div className="flex items-center gap-2 mb-3">
//                                             <BarChart3 className="w-5 h-5 text-gray-600" />
//                                             <p className="font-medium text-gray-900">Top Adsets Today</p>
//                                         </div>
//                                         <div className="space-y-2">
//                                             {adsetInsights.slice(0, 5).map((insight, idx) => (
//                                                 <div key={insight.adsetId} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
//                                                     <div className="flex-1 min-w-0">
//                                                         <div className="flex items-center gap-2">
//                                                             <span className="text-xs text-gray-400">#{idx + 1}</span>
//                                                             <span className="text-sm font-medium text-gray-700 truncate">{insight.adsetName}</span>
//                                                             <Badge variant="outline" className="text-xs rounded-full">
//                                                                 {insight.budgetType}
//                                                             </Badge>
//                                                         </div>
//                                                         <p className="text-xs text-gray-400 mt-1 truncate">{insight.campaignName}</p>
//                                                     </div>
//                                                     <div className="text-right ml-4">
//                                                         <p className="text-sm font-medium">{formatCurrency(insight.today.spend)}</p>
//                                                         {insight.today.cpa && (
//                                                             <p className="text-xs text-gray-400">CPA: {formatCurrency(insight.today.cpa)}</p>
//                                                         )}
//                                                     </div>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </CardContent>
//                                 </Card>
//                             )}
//                         </div>
//                     )}
//                 </div>
//             )}

//             {/* ==================== RECOMMENDATIONS TAB ==================== */}
//             {activeSubTab === 'recommendations' && (
//                 <div className="space-y-4">
//                     {/* Loading State */}
//                     {recommendationsLoading && (
//                         <Card className="rounded-3xl">
//                             <CardContent className="py-12">
//                                 <div className="flex flex-col items-center justify-center">
//                                     <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-3" />
//                                     <p className="text-gray-500">Analyzing performance trends...</p>
//                                 </div>
//                             </CardContent>
//                         </Card>
//                     )}

//                     {/* Recommendations List */}
//                     {!recommendationsLoading && recommendations.length > 0 && (
//                         <div className="space-y-3">
//                             {recommendations.map(rec => (
//                                 <Card
//                                     key={rec.id}
//                                     className={cn(
//                                         "rounded-2xl transition-all hover:shadow-md",
//                                         rec.recommendationType === 'increase'
//                                             ? "border-green-200 bg-green-50/30"
//                                             : "border-orange-200 bg-orange-50/30"
//                                     )}
//                                 >
//                                     <CardContent className="p-4">
//                                         <div className="flex items-start justify-between">
//                                             <div className="flex items-start gap-3">
//                                                 <div className={cn(
//                                                     "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
//                                                     rec.recommendationType === 'increase' ? "bg-green-100" : "bg-orange-100"
//                                                 )}>
//                                                     {rec.recommendationType === 'increase' ? (
//                                                         <ArrowUpRight className="w-5 h-5 text-green-600" />
//                                                     ) : (
//                                                         <ArrowDownRight className="w-5 h-5 text-orange-600" />
//                                                     )}
//                                                 </div>
//                                                 <div className="flex-1">
//                                                     <div className="flex items-center gap-2">
//                                                         <p className="font-medium text-gray-900">
//                                                             {rec.recommendationType === 'increase' ? 'Increase' : 'Decrease'} {rec.entityType === 'campaign' ? 'campaign budget' : 'adset budget'} by 15%
//                                                         </p>
//                                                     </div>
//                                                     <p className="text-sm text-gray-600 mt-0.5">{rec.entityName}</p>
//                                                     {rec.campaignName && rec.entityType === 'adset' && (
//                                                         <p className="text-xs text-gray-400">Campaign: {rec.campaignName}</p>
//                                                     )}
//                                                     <p className="text-sm text-gray-500 mt-2">{rec.reason}</p>

//                                                     {/* Mini 7-Day Trend Chart */}
//                                                     {rec.dailyData && rec.dailyData.length > 0 && (
//                                                         <div className="mt-3 p-3 bg-white rounded-xl border">
//                                                             <p className="text-xs text-gray-500 mb-2">7-Day Trend</p>
//                                                             <SpendCpaChart
//                                                                 spendData={rec.dailyData.map(d => ({ value: d.spend }))}
//                                                                 cpaData={rec.dailyData.map(d => ({ value: d.cpa || 0 }))}
//                                                             />
//                                                         </div>
//                                                     )}

//                                                     {/* Budget Change Preview */}
//                                                     <div className="flex items-center gap-3 mt-3">
//                                                         <div className="bg-white rounded-lg px-3 py-2 border flex items-center gap-2">
//                                                             <span className="text-xs text-gray-500">Current:</span>
//                                                             <span className="font-semibold">${rec.currentBudget.toFixed(2)}/day</span>
//                                                         </div>
//                                                         <ChevronRight className="w-4 h-4 text-gray-400" />
//                                                         <div className={cn(
//                                                             "rounded-lg px-3 py-2 border flex items-center gap-2",
//                                                             rec.recommendationType === 'increase'
//                                                                 ? "bg-green-100 border-green-200"
//                                                                 : "bg-orange-100 border-orange-200"
//                                                         )}>
//                                                             <span className="text-xs text-gray-600">Suggested:</span>
//                                                             <span className="font-semibold">${rec.suggestedBudget.toFixed(2)}/day</span>
//                                                         </div>
//                                                     </div>

//                                                     {/* CPA Details */}
//                                                     <div className="flex gap-3 mt-2 text-xs">
//                                                         <span className="text-gray-500">
//                                                             CPA: ${rec.details.previousCPA} → ${rec.details.recentCPA}
//                                                             <span className={cn(
//                                                                 "ml-1 font-medium",
//                                                                 rec.recommendationType === 'increase' ? "text-green-600" : "text-orange-600"
//                                                             )}>
//                                                                 ({rec.details.cpaChangePercent}%)
//                                                             </span>
//                                                         </span>
//                                                     </div>
//                                                 </div>
//                                             </div>

//                                             {/* Action Buttons */}
//                                             <div className="flex flex-col gap-2 ml-4">
//                                                 <Button
//                                                     size="sm"
//                                                     onClick={() => handleApplyRecommendation(rec)}
//                                                     disabled={applyingId === rec.id}
//                                                     className={cn(
//                                                         "rounded-xl h-9 px-4",
//                                                         rec.recommendationType === 'increase'
//                                                             ? "bg-green-600 hover:bg-green-700"
//                                                             : "bg-orange-600 hover:bg-orange-700"
//                                                     )}
//                                                 >
//                                                     {applyingId === rec.id ? (
//                                                         <Loader2 className="w-4 h-4 animate-spin" />
//                                                     ) : (
//                                                         'Apply'
//                                                     )}
//                                                 </Button>
//                                                 <Button
//                                                     size="sm"
//                                                     variant="ghost"
//                                                     onClick={() => dismissRecommendation(rec.id)}
//                                                     className="rounded-xl h-9 px-4 text-gray-500 hover:text-gray-700"
//                                                 >
//                                                     Dismiss
//                                                 </Button>
//                                             </div>
//                                         </div>
//                                     </CardContent>
//                                 </Card>
//                             ))}
//                         </div>
//                     )}

//                     {/* Empty State with Analysis Results */}
//                     {!recommendationsLoading && recommendations.length === 0 && (
//                         <div className="space-y-4">
//                             <Card className="rounded-3xl border-blue-200 bg-blue-50/30">
//                                 <CardContent className="py-8">
//                                     <div className="flex flex-col items-center justify-center">
//                                         <CheckCircle2 className="w-12 h-12 text-blue-500 mb-3" />
//                                         <p className="text-gray-700 font-medium">No Recommendations Right Now</p>
//                                         <p className="text-sm text-gray-400 mt-1 text-center max-w-md">
//                                             We analyze CPA trends with stable spend. Recommendations appear when CPA changes ±10% over 3-day periods with stable spend.
//                                         </p>
//                                     </div>
//                                 </CardContent>
//                             </Card>

//                             {/* Analysis Results - Why no recommendations */}
//                             {analysisResults.length > 0 && (
//                                 <Card className="rounded-2xl border-gray-200">
//                                     <CardContent className="p-4">
//                                         <div className="flex items-center gap-2 mb-3">
//                                             <Activity className="w-5 h-5 text-gray-600" />
//                                             <p className="font-medium text-gray-900">Analysis Summary</p>
//                                             <span className="text-xs text-gray-400">({analysisResults.length} entities analyzed)</span>
//                                         </div>
//                                         <div className="space-y-2 max-h-[300px] overflow-y-auto">
//                                             {analysisResults.slice(0, 10).map((result, idx) => (
//                                                 <div key={result.entityId || idx} className="bg-gray-50 rounded-xl p-3">
//                                                     <div className="flex items-center justify-between">
//                                                         <div className="flex-1 min-w-0">
//                                                             <div className="flex items-center gap-2">
//                                                                 <span className="text-sm font-medium text-gray-700 truncate">{result.entityName}</span>
//                                                                 <Badge variant="outline" className="text-xs rounded-full">
//                                                                     {result.entityType}
//                                                                 </Badge>
//                                                             </div>
//                                                             {result.skipReason && (
//                                                                 <p className="text-xs text-gray-400 mt-1">{result.skipReason}</p>
//                                                             )}
//                                                         </div>
//                                                         <div className="text-right ml-4">
//                                                             {result.cpaChange !== null && (
//                                                                 <p className={cn(
//                                                                     "text-sm font-medium",
//                                                                     result.cpaChange <= -10 ? "text-green-600" :
//                                                                         result.cpaChange >= 10 ? "text-orange-600" : "text-gray-600"
//                                                                 )}>
//                                                                     CPA: {result.cpaChange >= 0 ? '+' : ''}{result.cpaChange.toFixed(1)}%
//                                                                 </p>
//                                                             )}
//                                                             {result.recommendation && (
//                                                                 <Badge className={cn(
//                                                                     "text-xs mt-1",
//                                                                     result.recommendation.includes('INCREASE') ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
//                                                                 )}>
//                                                                     {result.recommendation}
//                                                                 </Badge>
//                                                             )}
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </CardContent>
//                                 </Card>
//                             )}
//                         </div>
//                     )}
//                 </div>
//             )}

//             {/* Apply Confirmation Dialog with Editable Budget */}
//             <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
//                 <DialogOverlay className="bg-black/50" />
//                 <DialogContent className="sm:max-w-[425px] !rounded-[30px] p-8 space-y-6">
//                     <DialogHeader className="space-y-4">
//                         <DialogTitle className="text-xl">Apply Budget Change</DialogTitle>
//                         <DialogDescription className="text-base leading-relaxed">
//                             {selectedRec && (
//                                 <>
//                                     Update the daily budget for <strong>{selectedRec.entityName}</strong>
//                                 </>
//                             )}
//                         </DialogDescription>
//                     </DialogHeader>

//                     {selectedRec && (
//                         <div className="space-y-4">
//                             <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
//                                 <span className="text-sm text-gray-600">Current Budget</span>
//                                 <span className="font-semibold">${selectedRec.currentBudget.toFixed(2)}/day</span>
//                             </div>

//                             <div className="space-y-2">
//                                 <Label htmlFor="newBudget" className="text-sm text-gray-600">New Budget ($/day)</Label>
//                                 <div className="relative">
//                                     <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
//                                     <Input
//                                         id="newBudget"
//                                         type="number"
//                                         step="0.01"
//                                         min="0"
//                                         value={editedBudget}
//                                         onChange={(e) => setEditedBudget(e.target.value)}
//                                         className="pl-9 rounded-xl h-12 text-lg font-semibold"
//                                         placeholder={selectedRec.suggestedBudget.toFixed(2)}
//                                     />
//                                 </div>
//                                 <p className="text-xs text-gray-400">
//                                     Suggested: ${selectedRec.suggestedBudget.toFixed(2)} ({selectedRec.changePercent > 0 ? '+' : ''}{selectedRec.changePercent}%)
//                                 </p>
//                             </div>

//                             {editedBudget && parseFloat(editedBudget) !== selectedRec.suggestedBudget && (
//                                 <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
//                                     <p className="text-xs text-blue-700">
//                                         You're applying a custom budget of <strong>${parseFloat(editedBudget).toFixed(2)}/day</strong> instead of the suggested ${selectedRec.suggestedBudget.toFixed(2)}/day
//                                     </p>
//                                 </div>
//                             )}
//                         </div>
//                     )}

//                     <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
//                         <Button
//                             variant="outline"
//                             onClick={() => setShowApplyDialog(false)}
//                             className="rounded-2xl flex-1"
//                         >
//                             Cancel
//                         </Button>
//                         <Button
//                             onClick={confirmApplyRecommendation}
//                             disabled={!editedBudget || parseFloat(editedBudget) <= 0}
//                             className={cn(
//                                 "rounded-2xl flex-1",
//                                 selectedRec?.recommendationType === 'increase'
//                                     ? "bg-green-600 hover:bg-green-700"
//                                     : "bg-orange-600 hover:bg-orange-700"
//                             )}
//                         >
//                             Apply Budget Change
//                         </Button>
//                     </DialogFooter>
//                 </DialogContent>
//             </Dialog>

//             {/* Settings Dialog */}
//             <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
//                 <DialogOverlay className="bg-black/50" />
//                 <DialogContent className="sm:max-w-[500px] !rounded-[30px] p-8 space-y-6">
//                     <DialogHeader className="space-y-2">
//                         <DialogTitle className="text-xl flex items-center gap-2">
//                             <Settings2 className="w-5 h-5" />
//                             Analytics Settings
//                         </DialogTitle>
//                         <DialogDescription>
//                             Configure anomaly detection thresholds and notification preferences
//                         </DialogDescription>
//                     </DialogHeader>

//                     <div className="space-y-6">
//                         {/* Anomaly Thresholds */}
//                         <div className="space-y-4">
//                             <h3 className="font-medium text-gray-900 flex items-center gap-2">
//                                 <AlertTriangle className="w-4 h-4 text-orange-500" />
//                                 Anomaly Thresholds
//                             </h3>

//                             <div className="space-y-4 pl-6">
//                                 <div className="space-y-2">
//                                     <Label htmlFor="cpaThreshold" className="text-sm text-gray-600">
//                                         CPA Spike Threshold (%)
//                                     </Label>
//                                     <div className="flex items-center gap-3">
//                                         <Input
//                                             id="cpaThreshold"
//                                             type="number"
//                                             min="10"
//                                             max="200"
//                                             value={tempThresholds.cpaSpike}
//                                             onChange={(e) => setTempThresholds(prev => ({ ...prev, cpaSpike: parseInt(e.target.value) || 50 }))}
//                                             className="rounded-xl w-24"
//                                         />
//                                         <span className="text-sm text-gray-500">
//                                             Alert when CPA increases by more than {tempThresholds.cpaSpike}% vs 7-day average
//                                         </span>
//                                     </div>
//                                 </div>

//                                 <div className="space-y-2">
//                                     <Label htmlFor="overspendThreshold" className="text-sm text-gray-600">
//                                         Overspend Threshold (%)
//                                     </Label>
//                                     <div className="flex items-center gap-3">
//                                         <Input
//                                             id="overspendThreshold"
//                                             type="number"
//                                             min="100"
//                                             max="300"
//                                             value={tempThresholds.overspend}
//                                             onChange={(e) => setTempThresholds(prev => ({ ...prev, overspend: parseInt(e.target.value) || 150 }))}
//                                             className="rounded-xl w-24"
//                                         />
//                                         <span className="text-sm text-gray-500">
//                                             Alert when daily spend exceeds {tempThresholds.overspend}% of budget (ABO only)
//                                         </span>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
//                         <Button
//                             variant="outline"
//                             onClick={() => setShowSettingsDialog(false)}
//                             className="rounded-2xl flex-1"
//                         >
//                             Cancel
//                         </Button>
//                         <Button
//                             onClick={handleSaveThresholds}
//                             className="rounded-2xl flex-1 bg-blue-600 hover:bg-blue-700"
//                         >
//                             Save Settings
//                         </Button>
//                     </DialogFooter>
//                 </DialogContent>
//             </Dialog>

//             {/* Info Footer */}
//             <Card className="rounded-2xl bg-gray-50 border-gray-200">
//                 <CardContent className="p-4">
//                     <div className="flex items-start gap-3">
//                         <Activity className="w-5 h-5 text-gray-400 mt-0.5" />
//                         <div className="text-sm text-gray-500">
//                             <p className="font-medium text-gray-600 mb-1">How Analytics Works</p>
//                             <ul className="space-y-1 text-xs">
//                                 <li>• <strong>Anomaly Detection:</strong> Alerts when CPA spikes {anomalyThresholds.cpaSpike}%+ vs 7-day average, or when spend exceeds {anomalyThresholds.overspend}% of daily budget (ABO only)</li>
//                                 <li>• <strong>Budget Recommendations:</strong> Suggests ±15% budget changes when CPA improves/worsens 10%+ with stable spend over 3-day periods</li>
//                                 <li>• <strong>Key Conversion Event:</strong> Results and CPA are calculated based on your selected conversion event ({CONVERSION_EVENTS.find(e => e.value === selectedConversionEvent)?.label})</li>
//                             </ul>
//                         </div>
//                     </div>
//                 </CardContent>
//             </Card>
//         </div>
//     )
// }

"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
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
    cpaSpike: 50, // CPA spike percentage threshold
    overspend: 150, // Overspend percentage threshold
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

    // Area path
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

    // Normalize spend values
    const spendValues = spendData.map(d => d.value);
    const spendMin = Math.min(...spendValues);
    const spendMax = Math.max(...spendValues);
    const spendRange = spendMax - spendMin || 1;

    // Normalize CPA values
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

    // Day labels
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].slice(-spendData.length);

    return (
        <div className="flex flex-col gap-1">
            <svg width={width} height={height} className="overflow-visible">
                {/* Spend line (blue) */}
                <path d={spendPathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* CPA line (purple) */}
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
    const [showApplyDialog, setShowApplyDialog] = useState(false)
    const [selectedRec, setSelectedRec] = useState(null)
    const [editedBudget, setEditedBudget] = useState('')

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
    }

    // Handler for conversion event change
    const handleConversionEventChange = (event) => {
        const newEvents = { ...conversionEvents, [selectedAdAccount]: event };
        setConversionEvents(newEvents);
        localStorage.setItem('analytics_conversion_events', JSON.stringify(newEvents));
        // Refetch data with new conversion event
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
        setEditedBudget(rec.suggestedBudget.toFixed(2))
        setShowApplyDialog(true)
    }

    const confirmApplyRecommendation = async () => {
        if (!selectedRec) return

        const budgetToApply = parseFloat(editedBudget);
        if (isNaN(budgetToApply) || budgetToApply <= 0) {
            toast.error('Please enter a valid budget amount');
            return;
        }

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
                    newBudget: budgetToApply
                })
            })

            const data = await response.json()
            if (data.success) {
                toast.success(`Budget updated to $${budgetToApply.toFixed(2)}/day`)
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
            setEditedBudget('')
        }
    }

    const dismissRecommendation = (recId) => {
        setRecommendations(prev => prev.filter(r => r.id !== recId))
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
            {/* Ad Account Selector + Conversion Event + Settings */}
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

                    {/* Key Conversion Event Dropdown */}
                    <Select value={selectedConversionEvent} onValueChange={handleConversionEventChange}>
                        <SelectTrigger className="w-[200px] rounded-2xl h-11 bg-white shadow-sm">
                            <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-purple-500" />
                                <SelectValue placeholder="Conversion Event" />
                            </div>
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
                            {/* Spacer to push text to right */}
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
                            <p className="text-xl font-bold">{quickStats.today.conversions || 0}</p>
                            {quickStats.trends.conversionsVsYesterday !== null && (
                                <p className={cn("text-xs mt-1", formatPercent(quickStats.trends.conversionsVsYesterday)?.color)}>
                                    {formatPercent(quickStats.trends.conversionsVsYesterday)?.text} vs yesterday
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Sub-tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveSubTab('anomalies')}
                    className={cn(
                        "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                        activeSubTab === 'anomalies'
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Anomaly Detection
                        {anomalies.length > 0 && (
                            <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">
                                {anomalies.length}
                            </Badge>
                        )}
                    </div>
                </button>
                <button
                    onClick={() => setActiveSubTab('recommendations')}
                    className={cn(
                        "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                        activeSubTab === 'recommendations'
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Budget Recommendations
                        {recommendations.length > 0 && (
                            <Badge className="ml-1 text-xs px-1.5 py-0 bg-blue-100 text-blue-700">
                                {recommendations.length}
                            </Badge>
                        )}
                    </div>
                </button>
            </div>

            {/* Anomalies Tab Content */}
            {activeSubTab === 'anomalies' && (
                <div className="space-y-4">
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
                                <Card key={index} className="rounded-2xl border-orange-200 bg-orange-50/30">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                                                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{anomaly.entityName}</p>
                                                    <p className="text-sm text-gray-600 mt-0.5">{anomaly.description}</p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <span className="text-xs text-gray-500">
                                                            Type: <span className="font-medium">{anomaly.type}</span>
                                                        </span>
                                                        {anomaly.currentValue && (
                                                            <span className="text-xs text-gray-500">
                                                                Current: <span className="font-medium text-orange-600">{formatCurrency(anomaly.currentValue)}</span>
                                                            </span>
                                                        )}
                                                        {anomaly.threshold && (
                                                            <span className="text-xs text-gray-500">
                                                                Threshold: <span className="font-medium">{formatCurrency(anomaly.threshold)}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                                                {anomaly.severity || 'Warning'}
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
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <span className="text-xs text-gray-500">
                                                            Current: <span className="font-medium">{formatCurrency(rec.currentBudget)}/day</span>
                                                        </span>
                                                        <span className="text-xs">→</span>
                                                        <span className={cn(
                                                            "text-xs font-medium",
                                                            rec.recommendationType === 'increase' ? "text-green-600" : "text-orange-600"
                                                        )}>
                                                            Suggested: {formatCurrency(rec.suggestedBudget)}/day ({rec.changePercent > 0 ? '+' : ''}{rec.changePercent}%)
                                                        </span>
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
                                                    onClick={() => handleApplyRecommendation(rec)}
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

            {/* Apply Budget Dialog */}
            <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
                <DialogOverlay className="bg-black/50" />
                <DialogContent className="sm:max-w-[425px] !rounded-[30px] p-8 space-y-6">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl">Apply Budget Change</DialogTitle>
                        <DialogDescription>
                            {selectedRec && (
                                <>
                                    {selectedRec.recommendationType === 'increase' ? 'Increase' : 'Decrease'} budget for <strong>{selectedRec.entityName}</strong>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedRec && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <span className="text-sm text-gray-600">Current Budget</span>
                                <span className="font-semibold">${selectedRec.currentBudget.toFixed(2)}/day</span>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="newBudget" className="text-sm text-gray-600">New Budget ($/day)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="newBudget"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editedBudget}
                                        onChange={(e) => setEditedBudget(e.target.value)}
                                        className="pl-9 rounded-xl h-12 text-lg font-semibold"
                                        placeholder={selectedRec.suggestedBudget.toFixed(2)}
                                    />
                                </div>
                                <p className="text-xs text-gray-400">
                                    Suggested: ${selectedRec.suggestedBudget.toFixed(2)} ({selectedRec.changePercent > 0 ? '+' : ''}{selectedRec.changePercent}%)
                                </p>
                            </div>

                            {editedBudget && parseFloat(editedBudget) !== selectedRec.suggestedBudget && (
                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                                    <p className="text-xs text-blue-700">
                                        You're applying a custom budget of <strong>${parseFloat(editedBudget).toFixed(2)}/day</strong> instead of the suggested ${selectedRec.suggestedBudget.toFixed(2)}/day
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

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
                            disabled={!editedBudget || parseFloat(editedBudget) <= 0}
                            className={cn(
                                "rounded-2xl flex-1",
                                selectedRec?.recommendationType === 'increase'
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-orange-600 hover:bg-orange-700"
                            )}
                        >
                            Apply Budget Change
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                            Configure anomaly detection thresholds and notification preferences
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
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
                                        <Input
                                            id="cpaThreshold"
                                            type="number"
                                            min="10"
                                            max="200"
                                            value={tempThresholds.cpaSpike}
                                            onChange={(e) => setTempThresholds(prev => ({ ...prev, cpaSpike: parseInt(e.target.value) || 50 }))}
                                            className="rounded-xl w-24"
                                        />
                                        <span className="text-sm text-gray-500">
                                            Alert when CPA increases by more than {tempThresholds.cpaSpike}% vs 7-day average
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="overspendThreshold" className="text-sm text-gray-600">
                                        Overspend Threshold (%)
                                    </Label>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            id="overspendThreshold"
                                            type="number"
                                            min="100"
                                            max="300"
                                            value={tempThresholds.overspend}
                                            onChange={(e) => setTempThresholds(prev => ({ ...prev, overspend: parseInt(e.target.value) || 150 }))}
                                            className="rounded-xl w-24"
                                        />
                                        <span className="text-sm text-gray-500">
                                            Alert when daily spend exceeds {tempThresholds.overspend}% of budget (ABO only)
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
                        {/* Summary Stats */}
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

                        {/* Per Account Breakdown */}
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