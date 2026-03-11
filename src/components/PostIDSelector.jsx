// "use client"

// import { useState, useCallback, memo, useEffect, useRef } from "react"
// import axios from "axios"
// import { toast } from "sonner"
// import { Button } from "@/components/ui/button"
// import { Checkbox } from "@/components/ui/checkbox"
// import { Switch } from "@/components/ui/switch"
// import { Label } from "@/components/ui/label"
// import { ScrollArea } from "@/components/ui/scroll-area"
// import { Input } from "@/components/ui/input"
// import { Loader, ChevronDown, ImageOff, RefreshCw, List, Search } from "lucide-react"
// import {
//     DropdownMenu,
//     DropdownMenuContent,
//     DropdownMenuItem,
//     DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

// const DATE_PRESETS = [
//     { label: '1 Day', value: 'yesterday' },
//     { label: '3 Days', value: 'last_3d' },
//     { label: '7 Days', value: 'last_7d' },
//     { label: '30 Days', value: 'last_30d' },
// ]

// function PostSelectorInline({ adAccountId, onImport, usePostID, setUsePostID }) {
//     const renderCount = useRef(0);
//     const prevAdAccountId = useRef(adAccountId);
//     const prevOnImport = useRef(onImport);
//     const importedAdsRef = useRef(new Map())

//     useEffect(() => {
//         renderCount.current += 1;
//         console.log('🔄 PostSelectorInline render #', renderCount.current);

//         if (prevAdAccountId.current !== adAccountId) {
//             console.log('🔍 adAccountId changed:', prevAdAccountId.current, '->', adAccountId);
//             prevAdAccountId.current = adAccountId;
//         }

//         if (prevOnImport.current !== onImport) {
//             console.log('⚠️ onImport reference changed!');
//             prevOnImport.current = onImport;
//         }
//     });

//     const [ads, setAds] = useState([])
//     const [selectedAdIds, setSelectedAdIds] = useState(new Set())
//     const [isLoading, setIsLoading] = useState(false)
//     const [isLoadingMore, setIsLoadingMore] = useState(false)
//     const [error, setError] = useState(null)
//     const [nextCursor, setNextCursor] = useState(null)
//     const [hasMore, setHasMore] = useState(false)
//     const [hasFetched, setHasFetched] = useState(false)
//     const [datePreset, setDatePreset] = useState('last_7d')

//     // Search state
//     const [viewMode, setViewMode] = useState('list')
//     const [searchQuery, setSearchQuery] = useState('')
//     const [isSearching, setIsSearching] = useState(false)

//     const fetchAds = useCallback(async (cursor = null, preset = datePreset) => {
//         if (!adAccountId) {
//             setError("No ad account selected")
//             return
//         }

//         const isInitialLoad = !cursor
//         if (isInitialLoad) {
//             setIsLoading(true)
//             setAds([])
//             setSelectedAdIds(new Set())
//         } else {
//             setIsLoadingMore(true)
//         }
//         setError(null)

//         try {
//             const params = {
//                 adAccountId,
//                 datePreset: preset,
//             }

//             if (cursor) {
//                 params.after = cursor
//             }

//             const response = await axios.get(`${API_BASE_URL}/auth/ad-insights`, {
//                 params,
//                 withCredentials: true
//             })

//             const { data, paging } = response.data

//             if (isInitialLoad) {
//                 setAds(data || [])
//                 setHasFetched(true)
//             } else {
//                 setAds(prev => {
//                     const existingIds = new Set(prev.map(ad => ad.ad_id))
//                     const newAds = (data || []).filter(ad => !existingIds.has(ad.ad_id))
//                     return [...prev, ...newAds]
//                 })
//             }

//             if (paging?.cursors?.after && paging?.next) {
//                 setNextCursor(paging.cursors.after)
//                 setHasMore(true)
//             } else {
//                 setNextCursor(null)
//                 setHasMore(false)
//             }

//         } catch (err) {
//             console.error("Error fetching ads:", err)
//             const errorMessage = err.response?.data?.error || err.message || "Failed to fetch ads"
//             setError(errorMessage)
//             toast.error(errorMessage)
//         } finally {
//             setIsLoading(false)
//             setIsLoadingMore(false)
//         }
//     }, [adAccountId, datePreset])

//     const searchAds = useCallback(async () => {
//         if (!adAccountId) {
//             setError("No ad account selected")
//             return
//         }

//         if (!searchQuery.trim()) {
//             toast.error("Please enter an ad name to search")
//             return
//         }

//         setIsSearching(true)
//         setIsLoading(true)
//         setAds([])
//         setSelectedAdIds(new Set())
//         setNextCursor(null)
//         setHasMore(false)
//         setError(null)

//         try {
//             const response = await axios.get(`${API_BASE_URL}/auth/ad-search`, {
//                 params: {
//                     adAccountId,
//                     searchQuery: searchQuery.trim()
//                 },
//                 withCredentials: true
//             })

//             const { data } = response.data
//             setAds(data || [])
//             setHasFetched(true)

//         } catch (err) {
//             console.error("Error searching ads:", err)
//             const errorMessage = err.response?.data?.error || err.message || "Failed to search ads"
//             setError(errorMessage)
//             toast.error(errorMessage)
//         } finally {
//             setIsLoading(false)
//             setIsSearching(false)
//         }
//     }, [adAccountId, searchQuery])

//     useEffect(() => {
//         if (adAccountId && viewMode === 'list') {
//             fetchAds(null, datePreset)
//         }
//     }, [adAccountId])

//     const handleDatePresetChange = (newPreset) => {
//         setDatePreset(newPreset)
//         fetchAds(null, newPreset)
//     }

//     const handleViewModeChange = (mode) => {
//         if (mode === viewMode) return
//         setViewMode(mode)
//         setAds([])
//         setSelectedAdIds(new Set())
//         setError(null)
//         setHasFetched(false)
//         setNextCursor(null)
//         setHasMore(false)

//         if (mode === 'list') {
//             setSearchQuery('')
//             fetchAds(null, datePreset)
//         }
//     }

//     const handleSearchKeyDown = (e) => {
//         if (e.key === 'Enter') {
//             searchAds()
//         }
//     }


//     const toggleAdSelection = (adId) => {
//         setSelectedAdIds(prev => {
//             const newSet = new Set(prev)
//             if (newSet.has(adId)) {
//                 newSet.delete(adId)
//                 importedAdsRef.current.delete(adId)
//             } else {
//                 newSet.add(adId)
//                 const ad = ads.find(a => a.id === adId)
//                 if (ad) importedAdsRef.current.set(adId, ad)
//             }
//             return newSet
//         })
//     }

//     // Lines 215-218, change to:
//     useEffect(() => {
//         if (isLoading || isSearching) return
//         onImport(Array.from(importedAdsRef.current.values()))
//     }, [selectedAdIds, onImport, isLoading, isSearching])

//     const loadMore = () => {
//         if (nextCursor && !isLoadingMore) {
//             fetchAds(nextCursor, datePreset)
//         }
//     }

//     const formatSpend = (spend) => {
//         const amount = parseFloat(spend) || 0
//         return `$${amount.toFixed(2)}`
//     }

//     const truncateText = (text, maxLength = 40) => {
//         if (!text) return "—"
//         if (text.length <= maxLength) return text
//         return text.substring(0, maxLength) + "..."
//     }

//     const extractPostId = (objectStoryId) => {
//         if (!objectStoryId) return "—"
//         const parts = objectStoryId.split('_')
//         return parts.length > 1 ? parts[1] : objectStoryId
//     }

//     const getDatePresetLabel = () => {
//         const preset = DATE_PRESETS.find(p => p.value === datePreset)
//         return preset ? preset.label : '7 Days'
//     }

//     const formatStatus = (status) => {
//         if (!status) return '—'
//         return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
//     }

//     return (
//         <div className="flex flex-col h-full overflow-hidden">

//             {(ads.length > 0 || viewMode === 'search' || isLoading || hasFetched) && (
//                 <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
//                     {/* Header Section - Fixed, never scrolls */}
//                     <div className="flex-shrink-0 space-y-3 pb-2">
//                         <div className="flex items-center justify-between">
//                             <span className="text-sm text-gray-500">
//                                 {selectedAdIds.size} selected
//                             </span>

//                             <Button
//                                 size="sm"
//                                 onClick={() => fetchAds(null, datePreset)}
//                                 disabled={isLoading || viewMode === 'search'}
//                                 className={`px-3 py-5 bg-white text-black border border-gray-300 rounded-xl hover:bg-white ${viewMode === 'search' ? 'opacity-50 cursor-not-allowed' : ''
//                                     }`}
//                             >
//                                 <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
//                                 Refresh Ads
//                             </Button>

//                         </div>

//                         {/* Duplication Mode Toggle + View Mode Buttons */}
//                         <div className="flex items-center justify-between py-2 px-1">
//                             <div className="flex items-center gap-2">
//                                 <Switch
//                                     id="use-post-id"
//                                     checked={usePostID}
//                                     onCheckedChange={setUsePostID}
//                                 />
//                                 <Label htmlFor="use-post-id" className="text-sm text-gray-600 cursor-pointer">
//                                     Use Post ID
//                                 </Label>
//                             </div>

//                             {/* View Mode Toggle Buttons */}
//                             <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden h-8">
//                                 <button
//                                     type="button"
//                                     onClick={() => handleViewModeChange('list')}
//                                     className={`flex items-center justify-center px-2.5 h-full transition-colors ${viewMode === 'list'
//                                         ? 'bg-black text-white'
//                                         : 'bg-white text-gray-400'
//                                         }`}
//                                     title="Top spending ads"
//                                 >
//                                     <List className="h-4 w-4" />
//                                 </button>
//                                 <div className="w-px h-full bg-gray-300" />
//                                 <button
//                                     type="button"
//                                     onClick={() => handleViewModeChange('search')}
//                                     className={`flex items-center justify-center px-2.5 h-full transition-colors ${viewMode === 'search'
//                                         ? 'bg-black text-white'
//                                         : 'bg-white text-gray-400'
//                                         }`}
//                                     title="Search ads by name"
//                                 >
//                                     <Search className="h-4 w-4" />
//                                 </button>
//                             </div>
//                         </div>

//                         {/* Search Bar - Only visible in search mode */}
//                         {viewMode === 'search' && (
//                             <div className="flex items-center gap-2 px-1">
//                                 <Input
//                                     type="text"
//                                     placeholder="Enter ad name to search..."
//                                     value={searchQuery}
//                                     onChange={(e) => setSearchQuery(e.target.value)}
//                                     onKeyDown={handleSearchKeyDown}
//                                     className="flex-1 h-9 text-sm rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
//                                 />
//                                 <Button
//                                     size="sm"
//                                     onClick={searchAds}
//                                     disabled={isSearching || !searchQuery.trim()}
//                                     className="px-4 h-9 bg-black text-white rounded-xl"
//                                 >
//                                     {isSearching ? (
//                                         <Loader className="h-4 w-4 animate-spin" />
//                                     ) : (
//                                         <Search className="h-4 w-4" />
//                                     )}
//                                 </Button>
//                             </div>
//                         )}

//                         {/* Loading State */}
//                         {isLoading && (
//                             <div className="flex items-center justify-center gap-2 py-8 flex-shrink-0">
//                                 <Loader className="h-6 w-6 animate-spin text-gray-400" />
//                                 <span className="text-sm text-gray-500">
//                                     {viewMode === 'search' ? 'Searching ads...' : 'Fetching ads...'}
//                                 </span>
//                             </div>
//                         )}

//                         {/* Error State */}
//                         {error && (
//                             <div className="flex flex-col items-center justify-center text-center p-4 border border-red-200 rounded-lg bg-red-50 flex-shrink-0">
//                                 <p className="text-red-500 mb-4">{error}</p>
//                                 <Button variant="outline" onClick={() => {
//                                     if (viewMode === 'search') {
//                                         searchAds()
//                                     } else {
//                                         fetchAds(null, datePreset)
//                                     }
//                                 }}>
//                                     Retry
//                                 </Button>
//                             </div>
//                         )}

//                         {/* Empty State */}
//                         {hasFetched && !isLoading && ads.length === 0 && !error && (
//                             <div className="flex items-center justify-center py-8 text-gray-500 border border-gray-200 rounded-lg flex-shrink-0">
//                                 {viewMode === 'search'
//                                     ? 'No ads found matching your search'
//                                     : 'No ads with valid post IDs found'
//                                 }
//                             </div>
//                         )}

//                         {/* Column Headers - Fixed */}
//                         {ads.length > 0 && (
//                             <div className="grid grid-cols-[20px_48px_1fr_120px_110px] gap-2 px-2 py-2 text-xs font-medium text-white bg-blue-500 rounded-xl items-center">
//                                 <div></div>
//                                 <div className="-ml-4">Thumbnail</div>
//                                 <div>Ad Name</div>
//                                 <div>Ad Set</div>
//                                 <div className="text-right whitespace-nowrap">
//                                     {viewMode === 'search' ? (
//                                         <span>Status</span>
//                                     ) : (
//                                         <DropdownMenu>
//                                             <DropdownMenuTrigger asChild>
//                                                 <button className="flex items-center gap-1 ml-auto hover:opacity-80 transition-opacity">
//                                                     <span>Spend ({getDatePresetLabel()})</span>
//                                                     <ChevronDown className="h-3 w-3" />
//                                                 </button>
//                                             </DropdownMenuTrigger>
//                                             <DropdownMenuContent align="end" className="bg-white rounded-xl">
//                                                 {DATE_PRESETS.map((preset) => (
//                                                     <DropdownMenuItem
//                                                         key={preset.value}
//                                                         onClick={() => handleDatePresetChange(preset.value)}
//                                                         className={datePreset === preset.value ? 'bg-gray-100' : ''}
//                                                     >
//                                                         {preset.label}
//                                                     </DropdownMenuItem>
//                                                 ))}
//                                             </DropdownMenuContent>
//                                         </DropdownMenu>
//                                     )}
//                                 </div>
//                             </div>
//                         )}
//                     </div>

//                     {ads.length > 0 && (
//                         <ScrollArea className="flex-1 pr-4 outline-none focus:outline-none">
//                             <div className="space-y-1">
//                                 {ads.map((ad) => (
//                                     <label
//                                         key={ad.id}
//                                         className={`grid grid-cols-[auto_48px_1fr_120px_110px] gap-2 items-center p-3 rounded-lg border cursor-pointer transition-colors ${selectedAdIds.has(ad.id)
//                                             ? 'border-blue-500 bg-blue-50'
//                                             : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
//                                             }`}
//                                     >
//                                         <Checkbox
//                                             checked={selectedAdIds.has(ad.id)}
//                                             onCheckedChange={() => toggleAdSelection(ad.id)}
//                                         />

//                                         {/* Thumbnail */}
//                                         <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
//                                             {ad.image_url ? (
//                                                 <img
//                                                     src={ad.image_url}
//                                                     alt="Ad thumbnail"
//                                                     className="w-full h-full object-cover"
//                                                     onError={(e) => {
//                                                         e.target.style.display = 'none'
//                                                         e.target.nextSibling.style.display = 'flex'
//                                                     }}
//                                                 />
//                                             ) : null}
//                                             <div
//                                                 className={`w-full h-full items-center justify-center ${ad.image_url ? 'hidden' : 'flex'}`}
//                                             >
//                                                 <ImageOff className="h-5 w-5 text-gray-400" />
//                                             </div>
//                                         </div>

//                                         {/* Ad Name */}
//                                         <div className="min-w-0">
//                                             <p className="text-xs text-gray-900 truncate" title={ad.ad_name}>
//                                                 {truncateText(ad.ad_name, 75)}
//                                             </p>
//                                         </div>

//                                         {/* Ad Set Name */}
//                                         <div className="flex items-center gap-1">
//                                             <span
//                                                 className="text-xs text-gray-900 truncate"
//                                                 title={ad.adset_name}
//                                             >
//                                                 {truncateText(ad.adset_name, 75)}
//                                             </span>
//                                         </div>

//                                         {/* Spend or Status */}
//                                         <div className="text-right">
//                                             {viewMode === 'search' ? (
//                                                 <span className={`text-xs font-medium px-2 py-1 rounded-full ${ad.effective_status === 'ACTIVE'
//                                                     ? 'bg-green-100 text-green-700'
//                                                     : ad.effective_status === 'PAUSED'
//                                                         ? 'bg-yellow-100 text-yellow-700'
//                                                         : 'bg-gray-100 text-gray-600'
//                                                     }`}>
//                                                     {formatStatus(ad.effective_status || ad.status)}
//                                                 </span>
//                                             ) : (
//                                                 <span className="text-sm font-medium text-gray-900">
//                                                     {formatSpend(ad.spend)}
//                                                 </span>
//                                             )}
//                                         </div>
//                                     </label>
//                                 ))}

//                                 {/* Load More Button - Only in list mode */}
//                                 {viewMode === 'list' && hasMore && (
//                                     <div className="pt-2 pb-4">
//                                         <Button
//                                             variant="outline"
//                                             className="w-full"
//                                             onClick={loadMore}
//                                             disabled={isLoadingMore}
//                                         >
//                                             {isLoadingMore ? (
//                                                 <>
//                                                     <Loader className="h-4 w-4 mr-2 animate-spin" />
//                                                     Loading...
//                                                 </>
//                                             ) : (
//                                                 <>
//                                                     <ChevronDown className="h-4 w-4 mr-2" />
//                                                     Load More Ads
//                                                 </>
//                                             )}
//                                         </Button>
//                                     </div>
//                                 )}
//                             </div>
//                         </ScrollArea>
//                     )}
//                 </div>
//             )}
//         </div>
//     )
// }

// export default memo(PostSelectorInline)

"use client"

import { useState, useCallback, memo, useEffect, useRef, useMemo } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Loader, ChevronDown, ImageOff, RefreshCw, DollarSign, Search, List, ChevronsUpDown, RefreshCcw, Check } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

const DATE_PRESETS = [
    { label: '1 Day', value: 'yesterday' },
    { label: '3 Days', value: 'last_3d' },
    { label: '7 Days', value: 'last_7d' },
    { label: '30 Days', value: 'last_30d' },
]

function PostSelectorInline({
    adAccountId,
    onImport,
    usePostID,
    setUsePostID,
    // New props for adset browse view - reuse from parent
    campaigns = [],
    selectedAdAccount,
    refreshCampaigns,
    isLoadingCampaigns = false,
}) {
    const renderCount = useRef(0);
    const prevAdAccountId = useRef(adAccountId);
    const prevOnImport = useRef(onImport);
    const importedAdsRef = useRef(new Map())

    useEffect(() => {
        renderCount.current += 1;
        console.log('🔄 PostSelectorInline render #', renderCount.current);

        if (prevAdAccountId.current !== adAccountId) {
            console.log('🔍 adAccountId changed:', prevAdAccountId.current, '->', adAccountId);
            prevAdAccountId.current = adAccountId;
        }

        if (prevOnImport.current !== onImport) {
            console.log('⚠️ onImport reference changed!');
            prevOnImport.current = onImport;
        }
    });

    const [ads, setAds] = useState([])
    const [selectedAdIds, setSelectedAdIds] = useState(new Set())
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [error, setError] = useState(null)
    const [nextCursor, setNextCursor] = useState(null)
    const [hasMore, setHasMore] = useState(false)
    const [hasFetched, setHasFetched] = useState(false)
    const [datePreset, setDatePreset] = useState('last_7d')

    // Search state
    const [viewMode, setViewMode] = useState('list') // 'list' | 'search' | 'adset'
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)

    // Adset browse state
    const [adsetBrowseCampaignId, setAdsetBrowseCampaignId] = useState('')
    const [adsetBrowseAdSets, setAdsetBrowseAdSets] = useState([])
    const [adsetBrowseSelectedAdSetId, setAdsetBrowseSelectedAdSetId] = useState('')
    const [isLoadingBrowseAdSets, setIsLoadingBrowseAdSets] = useState(false)
    const [adsetBrowseDatePreset, setAdsetBrowseDatePreset] = useState('last_30d')
    const [openBrowseCampaign, setOpenBrowseCampaign] = useState(false)
    const [browseCampaignSearch, setBrowseCampaignSearch] = useState('')
    const [openBrowseAdSet, setOpenBrowseAdSet] = useState(false)
    const [browseAdSetSearch, setBrowseAdSetSearch] = useState('')

    const filteredBrowseCampaigns = useMemo(() =>
        campaigns.filter((camp) =>
            (camp.name?.toLowerCase() || camp.id.toLowerCase()).includes(browseCampaignSearch.toLowerCase())
        ),
        [campaigns, browseCampaignSearch]
    );

    const filteredBrowseAdSets = useMemo(() =>
        adsetBrowseAdSets.filter((adset) =>
            (adset.name || adset.id).toLowerCase().includes(browseAdSetSearch.toLowerCase())
        ),
        [adsetBrowseAdSets, browseAdSetSearch]
    );

    const fetchAds = useCallback(async (cursor = null, preset = datePreset) => {
        if (!adAccountId) {
            setError("No ad account selected")
            return
        }

        const isInitialLoad = !cursor
        if (isInitialLoad) {
            setIsLoading(true)
            setAds([])
            setSelectedAdIds(new Set())
        } else {
            setIsLoadingMore(true)
        }
        setError(null)

        try {
            const params = {
                adAccountId,
                datePreset: preset,
            }

            if (cursor) {
                params.after = cursor
            }

            const response = await axios.get(`${API_BASE_URL}/auth/ad-insights`, {
                params,
                withCredentials: true
            })

            const { data, paging } = response.data

            if (isInitialLoad) {
                setAds(data || [])
                setHasFetched(true)
            } else {
                setAds(prev => {
                    const existingIds = new Set(prev.map(ad => ad.ad_id))
                    const newAds = (data || []).filter(ad => !existingIds.has(ad.ad_id))
                    return [...prev, ...newAds]
                })
            }

            if (paging?.cursors?.after && paging?.next) {
                setNextCursor(paging.cursors.after)
                setHasMore(true)
            } else {
                setNextCursor(null)
                setHasMore(false)
            }

        } catch (err) {
            console.error("Error fetching ads:", err)
            const errorMessage = err.response?.data?.error || err.message || "Failed to fetch ads"
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }, [adAccountId, datePreset])

    const searchAds = useCallback(async () => {
        if (!adAccountId) {
            setError("No ad account selected")
            return
        }

        if (!searchQuery.trim()) {
            toast.error("Please enter an ad name to search")
            return
        }

        setIsSearching(true)
        setIsLoading(true)
        setAds([])
        setSelectedAdIds(new Set())
        setNextCursor(null)
        setHasMore(false)
        setError(null)

        try {
            const response = await axios.get(`${API_BASE_URL}/auth/ad-search`, {
                params: {
                    adAccountId,
                    searchQuery: searchQuery.trim()
                },
                withCredentials: true
            })

            const { data } = response.data
            setAds(data || [])
            setHasFetched(true)

        } catch (err) {
            console.error("Error searching ads:", err)
            const errorMessage = err.response?.data?.error || err.message || "Failed to search ads"
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
            setIsSearching(false)
        }
    }, [adAccountId, searchQuery])

    // Fetch ads for a specific adset
    const fetchAdsetAds = useCallback(async (adsetId, preset = adsetBrowseDatePreset) => {
        if (!adsetId) return

        setIsLoading(true)
        setAds([])
        setSelectedAdIds(new Set())
        setNextCursor(null)
        setHasMore(false)
        setError(null)

        try {
            const response = await axios.get(`${API_BASE_URL}/auth/adset-ads`, {
                params: {
                    adsetId,
                    datePreset: preset,
                },
                withCredentials: true
            })

            const { data } = response.data
            setAds(data || [])
            setHasFetched(true)

        } catch (err) {
            console.error("Error fetching adset ads:", err)
            const errorMessage = err.response?.data?.error || err.message || "Failed to fetch ads for this ad set"
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }, [adsetBrowseDatePreset])

    // Fetch adsets when a campaign is selected in browse mode
    const fetchBrowseAdSets = useCallback(async (campaignId) => {
        if (!campaignId) {
            setAdsetBrowseAdSets([])
            return
        }

        setIsLoadingBrowseAdSets(true)
        try {
            const res = await fetch(
                `${API_BASE_URL}/auth/fetch-adsets?campaignId=${campaignId}`,
                { credentials: "include" }
            )
            const data = await res.json()
            if (data.adSets) {
                setAdsetBrowseAdSets(data.adSets)
            } else {
                setAdsetBrowseAdSets([])
            }
        } catch (err) {
            console.error("Failed to fetch ad sets for browse:", err)
            toast.error("Failed to fetch ad sets")
            setAdsetBrowseAdSets([])
        } finally {
            setIsLoadingBrowseAdSets(false)
        }
    }, [])

    useEffect(() => {
        if (adAccountId && viewMode === 'list') {
            fetchAds(null, datePreset)
        }
        // Reset adset browse state when ad account changes
        setAdsetBrowseCampaignId('')
        setAdsetBrowseAdSets([])
        setAdsetBrowseSelectedAdSetId('')
        setAds([])
        setHasFetched(false)
        setError(null)
    }, [adAccountId])

    const handleDatePresetChange = (newPreset) => {
        setDatePreset(newPreset)
        fetchAds(null, newPreset)
    }

    const handleAdsetBrowseDatePresetChange = (newPreset) => {
        setAdsetBrowseDatePreset(newPreset)
        if (adsetBrowseSelectedAdSetId) {
            fetchAdsetAds(adsetBrowseSelectedAdSetId, newPreset)
        }
    }

    const handleViewModeChange = (mode) => {
        if (mode === viewMode) return
        setViewMode(mode)
        setAds([])
        setSelectedAdIds(new Set())
        setError(null)
        setHasFetched(false)
        setNextCursor(null)
        setHasMore(false)

        if (mode === 'list') {
            setSearchQuery('')
            fetchAds(null, datePreset)
        }
        // When switching to adset mode, don't auto-fetch - wait for user to select campaign/adset
        // When switching to search mode, don't auto-fetch - wait for user to type
    }

    const handleBrowseCampaignChange = (campaignId) => {
        setAdsetBrowseCampaignId(campaignId)
        setAdsetBrowseSelectedAdSetId('')
        setAdsetBrowseAdSets([])
        setAds([])
        setHasFetched(false)
        setError(null)
        setOpenBrowseCampaign(false)
        fetchBrowseAdSets(campaignId)
    }

    const handleBrowseAdSetChange = (adsetId) => {
        setAdsetBrowseSelectedAdSetId(adsetId)
        setOpenBrowseAdSet(false)
        fetchAdsetAds(adsetId, adsetBrowseDatePreset)
    }

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            searchAds()
        }
    }

    const toggleAdSelection = (adId) => {
        setSelectedAdIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(adId)) {
                newSet.delete(adId)
                importedAdsRef.current.delete(adId)
            } else {
                newSet.add(adId)
                const ad = ads.find(a => a.id === adId)
                if (ad) importedAdsRef.current.set(adId, ad)
            }
            return newSet
        })
    }

    useEffect(() => {
        if (isLoading || isSearching) return
        onImport(Array.from(importedAdsRef.current.values()))
    }, [selectedAdIds, onImport, isLoading, isSearching])

    const loadMore = () => {
        if (nextCursor && !isLoadingMore) {
            fetchAds(nextCursor, datePreset)
        }
    }

    const formatSpend = (spend) => {
        const amount = parseFloat(spend) || 0
        return `$${amount.toFixed(2)}`
    }

    const truncateText = (text, maxLength = 40) => {
        if (!text) return "—"
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength) + "..."
    }

    const extractPostId = (objectStoryId) => {
        if (!objectStoryId) return "—"
        const parts = objectStoryId.split('_')
        return parts.length > 1 ? parts[1] : objectStoryId
    }

    const getDatePresetLabel = (preset = datePreset) => {
        const p = DATE_PRESETS.find(dp => dp.value === preset)
        return p ? p.label : '7 Days'
    }

    const formatStatus = (status) => {
        if (!status) return '—'
        return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    }

    // Determine which columns to show based on view mode
    const showSpendColumn = viewMode === 'list' || viewMode === 'adset'
    const showStatusColumn = viewMode === 'search' || viewMode === 'adset'

    return (
        <div className="flex flex-col h-full overflow-hidden">

            {(ads.length > 0 || viewMode === 'search' || viewMode === 'adset' || isLoading || hasFetched) && (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {/* Header Section - Fixed, never scrolls */}
                    <div className="flex-shrink-0 space-y-3 pb-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                {selectedAdIds.size} selected
                            </span>

                            {viewMode === 'list' && (
                                <Button
                                    size="sm"
                                    onClick={() => fetchAds(null, datePreset)}
                                    disabled={isLoading}
                                    className="px-3 py-5 bg-white text-black border border-gray-300 rounded-xl hover:bg-white"
                                >
                                    <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                                    Refresh Ads
                                </Button>
                            )}

                            {viewMode === 'adset' && adsetBrowseSelectedAdSetId && (
                                <Button
                                    size="sm"
                                    onClick={() => fetchAdsetAds(adsetBrowseSelectedAdSetId, adsetBrowseDatePreset)}
                                    disabled={isLoading}
                                    className="px-3 py-5 bg-white text-black border border-gray-300 rounded-xl hover:bg-white"
                                >
                                    <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                                    Refresh Ads
                                </Button>
                            )}
                        </div>

                        {/* Duplication Mode Toggle + View Mode Buttons */}
                        <div className="flex items-center justify-between py-2 px-1">
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="use-post-id"
                                    checked={usePostID}
                                    onCheckedChange={setUsePostID}
                                />
                                <Label htmlFor="use-post-id" className="text-sm text-gray-600 cursor-pointer">
                                    Use Post ID
                                </Label>
                            </div>

                            {/* View Mode Toggle Buttons - 3 tabs */}
                            <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden h-8">
                                <button
                                    type="button"
                                    onClick={() => handleViewModeChange('list')}
                                    className={`flex items-center justify-center px-2.5 h-full transition-colors ${viewMode === 'list'
                                        ? 'bg-black text-white'
                                        : 'bg-white text-gray-400'
                                        }`}
                                    title="Top spending ads"
                                >
                                    <DollarSign className="h-4 w-4" />
                                </button>
                                <div className="w-px h-full bg-gray-300" />
                                <button
                                    type="button"
                                    onClick={() => handleViewModeChange('search')}
                                    className={`flex items-center justify-center px-2.5 h-full transition-colors ${viewMode === 'search'
                                        ? 'bg-black text-white'
                                        : 'bg-white text-gray-400'
                                        }`}
                                    title="Search ads by name"
                                >
                                    <Search className="h-4 w-4" />
                                </button>
                                <div className="w-px h-full bg-gray-300" />
                                <button
                                    type="button"
                                    onClick={() => handleViewModeChange('adset')}
                                    className={`flex items-center justify-center px-2.5 h-full transition-colors ${viewMode === 'adset'
                                        ? 'bg-black text-white'
                                        : 'bg-white text-gray-400'
                                        }`}
                                    title="Browse by campaign & ad set"
                                >
                                    <List className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Search Bar - Only visible in search mode */}
                        {viewMode === 'search' && (
                            <div className="flex items-center gap-2 px-1">
                                <Input
                                    type="text"
                                    placeholder="Enter ad name to search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    className="flex-1 h-9 text-sm rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                                <Button
                                    size="sm"
                                    onClick={searchAds}
                                    disabled={isSearching || !searchQuery.trim()}
                                    className="px-4 h-9 bg-black text-white rounded-xl"
                                >
                                    {isSearching ? (
                                        <Loader className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        )}

                        {/* Adset Browse Selectors - Only visible in adset mode */}
                        {viewMode === 'adset' && (
                            <div className="space-y-3 px-1">
                                {/* Campaign Selector */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs text-gray-700">Select a Campaign to find ads in</Label>
                                        {refreshCampaigns && (
                                            <RefreshCcw
                                                className={cn(
                                                    "h-3.5 w-3.5 cursor-pointer transition-all duration-200",
                                                    isLoadingCampaigns
                                                        ? "text-gray-300 animate-[spin_3s_linear_infinite]"
                                                        : "text-gray-500 hover:text-gray-700"
                                                )}
                                                onClick={refreshCampaigns}
                                            />
                                        )}
                                    </div>
                                    <Popover open={openBrowseCampaign} onOpenChange={setOpenBrowseCampaign}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openBrowseCampaign}
                                                disabled={campaigns.length === 0 || isLoadingCampaigns}
                                                className="w-full justify-between  border border-gray-400 rounded-xl bg-white shadow overflow-hidden whitespace-nowrap hover:!bg-white h-9 text-sm"
                                            >
                                                <div className="w-full overflow-hidden flex items-center gap-2">
                                                    {isLoadingCampaigns ? (
                                                        <>
                                                            <Loader className="h-3.5 w-3.5 animate-spin" />
                                                            <span className="block truncate flex-1 text-left text-gray-500">Loading...</span>
                                                        </>
                                                    ) : (
                                                        <span className="block truncate flex-1 text-left">
                                                            {campaigns.length === 0
                                                                ? "No campaigns available"
                                                                : adsetBrowseCampaignId
                                                                    ? campaigns.find(c => c.id === adsetBrowseCampaignId)?.name || adsetBrowseCampaignId
                                                                    : "Select a campaign"
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-[--radix-popover-trigger-width] md:w-auto md:min-w-[--radix-popover-trigger-width] p-0 bg-white shadow-lg rounded-xl"
                                            align="start"
                                            sideOffset={4}
                                            side="bottom"
                                            avoidCollisions={false}
                                        >
                                            <Command loop={false}>
                                                <CommandInput
                                                    placeholder="Search campaigns..."
                                                    value={browseCampaignSearch}
                                                    onValueChange={setBrowseCampaignSearch}
                                                />
                                                <CommandEmpty>No campaigns found.</CommandEmpty>
                                                <CommandList className="max-h-[300px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
                                                    <CommandGroup>
                                                        {filteredBrowseCampaigns.map((camp) => (
                                                            <CommandItem
                                                                key={camp.id}
                                                                value={camp.name || camp.id}
                                                                onSelect={() => handleBrowseCampaignChange(camp.id)}
                                                                className={cn(
                                                                    "px-4 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
                                                                    adsetBrowseCampaignId === camp.id && "bg-gray-100 font-semibold",
                                                                    camp.status !== "ACTIVE" && "text-gray-400"
                                                                )}
                                                            >
                                                                <div className="flex justify-between items-center w-full truncate">
                                                                    <span className="truncate">{camp.name || camp.id}</span>
                                                                    {camp.status === "ACTIVE" && (
                                                                        <span className="ml-2 w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                                                    )}
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Ad Set Selector */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-700">Select an Ad Set to find ads in</Label>
                                    <Popover open={openBrowseAdSet} onOpenChange={setOpenBrowseAdSet}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openBrowseAdSet}
                                                disabled={!adsetBrowseCampaignId || adsetBrowseAdSets.length === 0 || isLoadingBrowseAdSets}
                                                className="w-full justify-between  border border-gray-400 rounded-xl bg-white shadow overflow-hidden whitespace-nowrap hover:!bg-white h-9 text-sm"
                                            >
                                                <div className="w-full overflow-hidden flex items-center gap-2">
                                                    {isLoadingBrowseAdSets ? (
                                                        <>
                                                            <Loader className="h-3.5 w-3.5 animate-spin" />
                                                            <span className="block truncate flex-1 text-left text-gray-500">Fetching ad sets...</span>
                                                        </>
                                                    ) : (
                                                        <span className="block truncate flex-1 text-left">
                                                            {!adsetBrowseCampaignId
                                                                ? "Select a campaign first"
                                                                : adsetBrowseAdSets.length === 0 && adsetBrowseCampaignId
                                                                    ? "No ad sets in this campaign"
                                                                    : adsetBrowseSelectedAdSetId
                                                                        ? adsetBrowseAdSets.find(a => a.id === adsetBrowseSelectedAdSetId)?.name || adsetBrowseSelectedAdSetId
                                                                        : "Select an ad set"
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-[--radix-popover-trigger-width] md:w-auto md:min-w-[--radix-popover-trigger-width] p-0 bg-white shadow-lg rounded-xl"
                                            align="start"
                                            sideOffset={4}
                                            side="bottom"
                                            avoidCollisions={false}
                                        >
                                            <Command loop={false}>
                                                <CommandInput
                                                    placeholder="Search ad sets..."
                                                    value={browseAdSetSearch}
                                                    onValueChange={setBrowseAdSetSearch}
                                                />
                                                <CommandEmpty>No ad sets found.</CommandEmpty>
                                                <CommandList className="max-h-[300px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
                                                    <CommandGroup>
                                                        {filteredBrowseAdSets.map((adset) => (
                                                            <CommandItem
                                                                key={adset.id}
                                                                value={adset.name || adset.id}
                                                                onSelect={() => handleBrowseAdSetChange(adset.id)}
                                                                className={cn(
                                                                    "px-4 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
                                                                    adsetBrowseSelectedAdSetId === adset.id && "bg-gray-100 font-semibold",
                                                                    adset.status !== "ACTIVE" && "text-gray-400"
                                                                )}
                                                            >
                                                                <div className="flex justify-between items-center w-full truncate">
                                                                    <span className="truncate">{adset.name || adset.id}</span>
                                                                    <span className="flex items-center">
                                                                        {adset.totalAds != null && (
                                                                            <span className="text-xs text-gray-400 mr-1.5">({adset.totalAds} {adset.totalAds === 1 ? 'Ad' : 'Ads'})</span>
                                                                        )}
                                                                        {adset.status === "ACTIVE" && (
                                                                            <span className="ml-0 w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        )}

                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex items-center justify-center gap-2 py-8 flex-shrink-0">
                                <Loader className="h-6 w-6 animate-spin text-gray-400" />
                                <span className="text-sm text-gray-500">
                                    {viewMode === 'search' ? 'Searching ads...' : viewMode === 'adset' ? 'Fetching ads for ad set...' : 'Fetching ads...'}
                                </span>
                            </div>
                        )}

                        {/* Error State */}
                        {error && (
                            <div className="flex flex-col items-center justify-center text-center p-4 border border-red-200 rounded-lg bg-red-50 flex-shrink-0">
                                <p className="text-red-500 mb-4">{error}</p>
                                <Button variant="outline" onClick={() => {
                                    if (viewMode === 'search') {
                                        searchAds()
                                    } else if (viewMode === 'adset') {
                                        if (adsetBrowseSelectedAdSetId) fetchAdsetAds(adsetBrowseSelectedAdSetId, adsetBrowseDatePreset)
                                    } else {
                                        fetchAds(null, datePreset)
                                    }
                                }}>
                                    Retry
                                </Button>
                            </div>
                        )}

                        {/* Empty State */}
                        {hasFetched && !isLoading && ads.length === 0 && !error && (
                            <div className="flex items-center justify-center py-8 text-gray-500 border border-gray-200 rounded-lg flex-shrink-0">
                                {viewMode === 'search'
                                    ? 'No ads found matching your search'
                                    : viewMode === 'adset'
                                        ? 'No ads with valid post IDs found in this ad set'
                                        : 'No ads with valid post IDs found'
                                }
                            </div>
                        )}

                        {/* Prompt to select campaign/adset in browse mode */}
                        {viewMode === 'adset' && !hasFetched && !isLoading && !error && (
                            <div className="flex items-center justify-center py-6 text-gray-400 text-sm flex-shrink-0">
                                {!adsetBrowseCampaignId
                                    ? 'Select a campaign to get started'
                                    : !adsetBrowseSelectedAdSetId
                                        ? 'Select an ad set to view its ads'
                                        : ''
                                }
                            </div>
                        )}

                        {/* Column Headers - Fixed */}
                        {ads.length > 0 && (
                            <div className={cn(
                                "grid gap-2 px-2 py-2 text-xs font-medium text-white bg-blue-500 rounded-xl items-center",
                                viewMode === 'adset'
                                    ? "grid-cols-[20px_48px_1fr_110px_110px]"
                                    : "grid-cols-[20px_48px_1fr_120px_110px]"
                            )}>
                                <div></div>
                                <div className="-ml-4">Thumbnail</div>
                                <div>Ad Name</div>
                                {viewMode === 'adset' ? (
                                    <>
                                        <div className="text-right whitespace-nowrap">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="flex items-center gap-1 ml-auto hover:opacity-80 transition-opacity">
                                                        <span>Spend ({getDatePresetLabel(adsetBrowseDatePreset)})</span>
                                                        <ChevronDown className="h-3 w-3" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-white rounded-xl">
                                                    {DATE_PRESETS.map((preset) => (
                                                        <DropdownMenuItem
                                                            key={preset.value}
                                                            onClick={() => handleAdsetBrowseDatePresetChange(preset.value)}
                                                            className={adsetBrowseDatePreset === preset.value ? 'bg-gray-100' : ''}
                                                        >
                                                            {preset.label}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="text-right">Status</div>
                                    </>
                                ) : viewMode === 'search' ? (
                                    <>
                                        <div>Ad Set</div>
                                        <div className="text-right">Status</div>
                                    </>
                                ) : (
                                    <>
                                        <div>Ad Set</div>
                                        <div className="text-right whitespace-nowrap">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="flex items-center gap-1 ml-auto hover:opacity-80 transition-opacity">
                                                        <span>Spend ({getDatePresetLabel()})</span>
                                                        <ChevronDown className="h-3 w-3" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-white rounded-xl">
                                                    {DATE_PRESETS.map((preset) => (
                                                        <DropdownMenuItem
                                                            key={preset.value}
                                                            onClick={() => handleDatePresetChange(preset.value)}
                                                            className={datePreset === preset.value ? 'bg-gray-100' : ''}
                                                        >
                                                            {preset.label}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {ads.length > 0 && (
                        <ScrollArea className="flex-1 pr-4 outline-none focus:outline-none">
                            <div className="space-y-1">
                                {ads.map((ad) => (
                                    <label
                                        key={ad.id}
                                        className={cn(
                                            "grid gap-2 items-center p-3 rounded-lg border cursor-pointer transition-colors",
                                            viewMode === 'adset'
                                                ? "grid-cols-[auto_48px_1fr_110px_110px]"
                                                : "grid-cols-[auto_48px_1fr_120px_110px]",
                                            selectedAdIds.has(ad.id)
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        )}
                                    >
                                        <Checkbox
                                            checked={selectedAdIds.has(ad.id)}
                                            onCheckedChange={() => toggleAdSelection(ad.id)}
                                        />

                                        {/* Thumbnail */}
                                        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                                            {ad.image_url ? (
                                                <img
                                                    src={ad.image_url}
                                                    alt="Ad thumbnail"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none'
                                                        e.target.nextSibling.style.display = 'flex'
                                                    }}
                                                />
                                            ) : null}
                                            <div
                                                className={`w-full h-full items-center justify-center ${ad.image_url ? 'hidden' : 'flex'}`}
                                            >
                                                <ImageOff className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>

                                        {/* Ad Name */}
                                        <div className="min-w-0">
                                            <p className="text-xs text-gray-900 truncate" title={ad.ad_name}>
                                                {truncateText(ad.ad_name, 75)}
                                            </p>
                                        </div>

                                        {/* Adset view: Spend + Status columns (no adset name column) */}
                                        {viewMode === 'adset' ? (
                                            <>
                                                <div className="text-right">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {formatSpend(ad.spend)}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${ad.effective_status === 'ACTIVE'
                                                        ? 'bg-green-100 text-green-700'
                                                        : ad.effective_status === 'PAUSED'
                                                            ? 'bg-yellow-100 text-yellow-700'
                                                            : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {formatStatus(ad.effective_status || ad.status)}
                                                    </span>
                                                </div>
                                            </>
                                        ) : viewMode === 'search' ? (
                                            <>
                                                {/* Ad Set Name */}
                                                <div className="flex items-center gap-1">
                                                    <span
                                                        className="text-xs text-gray-900 truncate"
                                                        title={ad.adset_name}
                                                    >
                                                        {truncateText(ad.adset_name, 75)}
                                                    </span>
                                                </div>
                                                {/* Status */}
                                                <div className="text-right">
                                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${ad.effective_status === 'ACTIVE'
                                                        ? 'bg-green-100 text-green-700'
                                                        : ad.effective_status === 'PAUSED'
                                                            ? 'bg-yellow-100 text-yellow-700'
                                                            : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {formatStatus(ad.effective_status || ad.status)}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* Ad Set Name */}
                                                <div className="flex items-center gap-1">
                                                    <span
                                                        className="text-xs text-gray-900 truncate"
                                                        title={ad.adset_name}
                                                    >
                                                        {truncateText(ad.adset_name, 75)}
                                                    </span>
                                                </div>
                                                {/* Spend */}
                                                <div className="text-right">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {formatSpend(ad.spend)}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </label>
                                ))}

                                {/* Load More Button - Only in list mode */}
                                {viewMode === 'list' && hasMore && (
                                    <div className="pt-2 pb-4">
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={loadMore}
                                            disabled={isLoadingMore}
                                        >
                                            {isLoadingMore ? (
                                                <>
                                                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                                                    Loading...
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="h-4 w-4 mr-2" />
                                                    Load More Ads
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            )}
        </div>
    )
}

export default memo(PostSelectorInline)