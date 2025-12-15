"use client"

import { useState, useCallback, memo, useEffect, useRef } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader, ChevronDown, ImageOff, RefreshCw } from "lucide-react"
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

function PostSelectorInline({ adAccountId, onImport }) {
    const renderCount = useRef(0);
    const prevAdAccountId = useRef(adAccountId);
    const prevOnImport = useRef(onImport);
    const scrollContainerRef = useRef(null);

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

    useEffect(() => {
        if (adAccountId) {
            fetchAds(null, datePreset)
        }
    }, [adAccountId])

    const handleDatePresetChange = (newPreset) => {
        setDatePreset(newPreset)
        fetchAds(null, newPreset)
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

    const handleImport = () => {
        const selectedAds = ads.filter(ad => selectedAdIds.has(ad.id))
        onImport(selectedAds)
    }

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

    // Handle wheel events to prevent parent scroll when at boundaries
    const handleWheel = useCallback((e) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const isAtTop = scrollTop === 0;
        const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1;

        // Prevent scroll propagation when at boundaries and trying to scroll further
        if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
            e.preventDefault();
        }
    }, []);

    return (
        // CRITICAL FIX: Use a flex column container with fixed max height
        // This creates a "scroll boundary" that prevents expansion
        <div className="flex flex-col h-full max-h-[600px] overflow-hidden">

            {/* Loading State - Fixed height, doesn't affect layout */}
            {isLoading && (
                <div className="flex items-center justify-center gap-2 py-8 flex-shrink-0">
                    <Loader className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Fetching ads...</span>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="flex flex-col items-center justify-center text-center p-4 border border-red-200 rounded-lg bg-red-50 flex-shrink-0">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button variant="outline" onClick={() => fetchAds(null, datePreset)}>
                        Retry
                    </Button>
                </div>
            )}

            {/* Empty State */}
            {hasFetched && !isLoading && ads.length === 0 && !error && (
                <div className="flex items-center justify-center py-8 text-gray-500 border border-gray-200 rounded-lg flex-shrink-0">
                    No ads with valid post IDs found
                </div>
            )}

            {/* Main Content - Only renders when we have ads */}
            {ads.length > 0 && (
                <>
                    {/* Header Section - Fixed, never scrolls */}
                    <div className="flex-shrink-0 space-y-3 pb-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                {selectedAdIds.size} selected
                            </span>
                            <Button
                                size="sm"
                                onClick={() => fetchAds(null, datePreset)}
                                disabled={isLoading}
                                className="px-3 py-4 bg-zinc-800 hover:bg-black text-white rounded-lg"
                            >
                                <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh Ads
                            </Button>
                        </div>

                        {/* Column Headers - Fixed */}
                        <div className="grid grid-cols-[20px_48px_1fr_120px_110px] gap-2 px-2 py-2 text-xs font-medium text-white bg-blue-500 rounded-xl items-center">
                            <div></div>
                            <div className="-ml-4">Thumbnail</div>
                            <div>Ad Name</div>
                            <div>Post ID</div>
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
                        </div>
                    </div>

                    <div
                        ref={scrollContainerRef}
                        onWheel={handleWheel}
                        className="flex-1 min-h-0 overflow-y-auto overscroll-contain isolate space-y-1 pr-1"
                        style={{
                            // Extra insurance against scroll propagation
                            overscrollBehavior: 'contain',
                            WebkitOverflowScrolling: 'touch',
                        }}
                    >
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
                                        {truncateText(ad.ad_name, 50)}
                                    </p>
                                </div>

                                {/* Post ID */}
                                <div className="flex items-center gap-1">
                                    <span
                                        className="text-xs text-gray-900 truncate"
                                        title={ad.post_id}
                                    >
                                        {truncateText(ad.adset_name, 50)}
                                    </span>
                                </div>

                                {/* Spend */}
                                <div className="text-right">
                                    <span className="text-sm font-medium text-gray-900">
                                        {formatSpend(ad.spend)}
                                    </span>
                                </div>
                            </label>
                        ))}

                        {/* Load More Button - Inside scroll container */}
                        {hasMore && (
                            <div className="pt-2 pb-2">
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

                    {/* Import Button - Fixed at bottom, never scrolls */}
                    <div className="flex-shrink-0 pt-3">
                        <Button
                            type="button"
                            onClick={handleImport}
                            disabled={selectedAdIds.size === 0}
                            className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl"
                        >
                            Import {selectedAdIds.size > 0 ? `(${selectedAdIds.size})` : ''}
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}

export default memo(PostSelectorInline)