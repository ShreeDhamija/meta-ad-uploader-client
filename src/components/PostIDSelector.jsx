"use client"

import { useState, useCallback, memo, useEffect, useRef } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Loader, ChevronDown, ImageOff, RefreshCw, List, Search } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

const DATE_PRESETS = [
    { label: '1 Day', value: 'yesterday' },
    { label: '3 Days', value: 'last_3d' },
    { label: '7 Days', value: 'last_7d' },
    { label: '30 Days', value: 'last_30d' },
]

function PostSelectorInline({ adAccountId, onImport, usePostID, setUsePostID }) {
    const renderCount = useRef(0);
    const prevAdAccountId = useRef(adAccountId);
    const prevOnImport = useRef(onImport);

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
    const [viewMode, setViewMode] = useState('list')
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)

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

    useEffect(() => {
        if (adAccountId && viewMode === 'list') {
            fetchAds(null, datePreset)
        }
    }, [adAccountId])

    const handleDatePresetChange = (newPreset) => {
        setDatePreset(newPreset)
        fetchAds(null, newPreset)
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
            } else {
                newSet.add(adId)
            }
            return newSet
        })
    }

    // Lines 215-218, change to:
    useEffect(() => {
        if (isLoading || isSearching) return;
        const selectedAds = ads.filter(ad => selectedAdIds.has(ad.id));
        onImport(selectedAds);
    }, [selectedAdIds, ads, onImport, isLoading, isSearching]);

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

    const getDatePresetLabel = () => {
        const preset = DATE_PRESETS.find(p => p.value === datePreset)
        return preset ? preset.label : '7 Days'
    }

    const formatStatus = (status) => {
        if (!status) return '—'
        return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">

            {(ads.length > 0 || viewMode === 'search' || isLoading || hasFetched) && (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {/* Header Section - Fixed, never scrolls */}
                    <div className="flex-shrink-0 space-y-3 pb-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                {selectedAdIds.size} selected
                            </span>

                            <Button
                                size="sm"
                                onClick={() => fetchAds(null, datePreset)}
                                disabled={isLoading || viewMode === 'search'}
                                className={`px-3 py-5 bg-white text-black border border-gray-300 rounded-xl hover:bg-white ${viewMode === 'search' ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                            >
                                <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh Ads
                            </Button>

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

                            {/* View Mode Toggle Buttons */}
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
                                    <List className="h-4 w-4" />
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

                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex items-center justify-center gap-2 py-8 flex-shrink-0">
                                <Loader className="h-6 w-6 animate-spin text-gray-400" />
                                <span className="text-sm text-gray-500">
                                    {viewMode === 'search' ? 'Searching ads...' : 'Fetching ads...'}
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
                                    : 'No ads with valid post IDs found'
                                }
                            </div>
                        )}

                        {/* Column Headers - Fixed */}
                        {ads.length > 0 && (
                            <div className="grid grid-cols-[20px_48px_1fr_120px_110px] gap-2 px-2 py-2 text-xs font-medium text-white bg-blue-500 rounded-xl items-center">
                                <div></div>
                                <div className="-ml-4">Thumbnail</div>
                                <div>Ad Name</div>
                                <div>Ad Set</div>
                                <div className="text-right whitespace-nowrap">
                                    {viewMode === 'search' ? (
                                        <span>Status</span>
                                    ) : (
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
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {ads.length > 0 && (
                        <ScrollArea className="flex-1 pr-4 outline-none focus:outline-none">
                            <div className="space-y-1">
                                {ads.map((ad) => (
                                    <label
                                        key={ad.id}
                                        className={`grid grid-cols-[auto_48px_1fr_120px_110px] gap-2 items-center p-3 rounded-lg border cursor-pointer transition-colors ${selectedAdIds.has(ad.id)
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
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

                                        {/* Ad Set Name */}
                                        <div className="flex items-center gap-1">
                                            <span
                                                className="text-xs text-gray-900 truncate"
                                                title={ad.adset_name}
                                            >
                                                {truncateText(ad.adset_name, 75)}
                                            </span>
                                        </div>

                                        {/* Spend or Status */}
                                        <div className="text-right">
                                            {viewMode === 'search' ? (
                                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${ad.effective_status === 'ACTIVE'
                                                    ? 'bg-green-100 text-green-700'
                                                    : ad.effective_status === 'PAUSED'
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {formatStatus(ad.effective_status || ad.status)}
                                                </span>
                                            ) : (
                                                <span className="text-sm font-medium text-gray-900">
                                                    {formatSpend(ad.spend)}
                                                </span>
                                            )}
                                        </div>
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