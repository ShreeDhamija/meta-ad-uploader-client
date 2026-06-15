"use client"

import { useState, useCallback, memo, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Loader, ChevronDown, ImageOff, RefreshCw, Search, Check, AlertTriangle } from "lucide-react"
import { useTikTokAuth } from "@/lib/TikTokAuthContext"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

function TikTokPostSelectorInline({
  advertiserId,
  identityId,
  identityType = "TT_ACCOUNT",
  identityObj = null,
  onImport,
  importedPosts = [],
}) {
  const { tiktokFetch } = useTikTokAuth()
  const [posts, setPosts] = useState([])
  const [selectedPostIds, setSelectedPostIds] = useState(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [hasFetched, setHasFetched] = useState(false)

  const selectedPostsMapRef = useRef(new Map())

  // Keep track of importedPosts in parent to sync selections
  useEffect(() => {
    const nextSet = new Set(importedPosts.map(p => p.id))
    setSelectedPostIds(nextSet)

    // Sync ref map
    selectedPostsMapRef.current.clear()
    importedPosts.forEach(post => {
      selectedPostsMapRef.current.set(post.id, post)
    })
  }, [importedPosts])

  const fetchPosts = useCallback(async (targetCursor = null, isLoadMore = false) => {
    if (!advertiserId || !identityId) {
      setPosts([])
      setHasMore(false)
      return
    }

    if (isLoadMore) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
      setPosts([])
    }
    setError(null)

    try {
      const finalIdentityType = identityObj?.identity_type || identityType;
      const params = new URLSearchParams({
        advertiserId,
        identityId,
        identityType: finalIdentityType,
        pageSize: "20"
      })

      if (targetCursor) {
        params.append("cursor", targetCursor.toString());
      }

      if (identityObj?.identity_authorized_bc_id) {
        params.append("identityAuthorizedBcId", identityObj.identity_authorized_bc_id);
      }

      const res = await tiktokFetch(`${API_BASE_URL}/api/tiktok/tt-video-list?${params}`)
      const resData = await res.json()

      if (!res.ok) {
        throw new Error(resData.error || "Failed to fetch posts")
      }

      // Format response structure from TikTok API: resData.data.video_list (new endpoint) or resData.data.videos or resData.data.list
      const data = resData.data
      const list = data?.video_list || data?.videos || data?.list || []

      const formattedList = list.map(item => {
        const itemId = item.item_id || item.item_info?.item_id;
        const posterUrl = item.video_info?.poster_url || item.video_info?.preview_url || item.thumbnail_url || "";
        const caption = item.text || item.caption || item.item_info?.text || (item.recommendation_level ? `Recommendation: ${item.recommendation_level} (${item.item_id || item.item_info?.item_id})` : `Recommended Video (${item.item_id || item.item_info?.item_id})`);
        const tiktokName = item.user_info?.tiktok_name || identityObj?.display_name || "Organic Video";
        const authEndTime = item.auth_info?.auth_end_time || null;

        const postIdentityId = item.user_info?.identity_id || identityObj?.identity_id || identityId;
        const postIdentityType = item.user_info?.identity_type || identityObj?.identity_type || identityType;
        const postIdentityAuthorizedBcId = identityObj?.identity_authorized_bc_id || "";

        return {
          id: itemId,
          image_url: posterUrl,
          preview_url: item.video_info?.preview_url || "",
          previewUrl: item.video_info?.preview_url || "",
          ad_name: caption,
          tiktok_name: tiktokName,
          auth_code: item.item_info?.auth_code || "",
          identity_id: postIdentityId,
          identity_type: postIdentityType,
          identity_authorized_bc_id: postIdentityAuthorizedBcId,
          likes: item.video_info?.like_count || item.likes || 0,
          views: item.video_info?.view_count || item.video_views || 0,
          auth_end_time: authEndTime,
          raw: item
        };
      })

      if (isLoadMore) {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id))
          const newPosts = formattedList.filter(p => !existingIds.has(p.id))
          return [...prev, ...newPosts]
        })
      } else {
        setPosts(formattedList)
        setHasFetched(true)
      }

      const nextCursor = data?.cursor ?? null
      setCursor(nextCursor)
      setHasMore(data?.has_more ?? false)
    } catch (err) {
      console.error("Error fetching TikTok posts:", err)
      const errMsg = err.message || "Failed to fetch organic posts"
      setError(errMsg)
      toast.error(errMsg)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [advertiserId, identityId, identityType, identityObj, tiktokFetch])

  // Trigger initial fetch when inputs change
  useEffect(() => {
    fetchPosts(null, false)
  }, [advertiserId, identityId, identityType, identityObj])

  const togglePostSelection = (post) => {
    const isSelected = selectedPostIds.has(post.id)
    const newSet = new Set(selectedPostIds)

    if (isSelected) {
      newSet.delete(post.id)
      selectedPostsMapRef.current.delete(post.id)
    } else {
      newSet.add(post.id)
      selectedPostsMapRef.current.set(post.id, post)
    }

    setSelectedPostIds(newSet)
    onImport(Array.from(selectedPostsMapRef.current.values()))
  }

  const loadMore = () => {
    if (hasMore && !isLoadingMore) {
      fetchPosts(cursor, true)
    }
  }

  const getExpiryWarning = (endTimeStr) => {
    if (!endTimeStr) return null
    const endTime = new Date(endTimeStr)
    const now = new Date()
    if (isNaN(endTime.getTime())) return null

    const diffTime = endTime - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return { type: 'expired', message: 'Expired!' }
    } else if (diffDays <= 7) {
      return { type: 'warning', message: `Expires in ${diffDays}d` }
    }
    return null
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "k"
    return num.toString()
  }

  const filteredPosts = posts.filter(post =>
    post.ad_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 space-y-3 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 font-medium">
            {selectedPostIds.size} post{selectedPostIds.size === 1 ? "" : "s"} selected
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => fetchPosts(0, false)}
            disabled={isLoading}
            className="px-3 py-5 bg-white text-black border border-gray-300 rounded-xl hover:bg-gray-55 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh List
          </Button>
        </div>

        <div className="flex items-center gap-2 px-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search posts by caption or item ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
            />
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 flex-shrink-0">
            <Loader className="h-5 w-5 animate-spin text-gray-400" />
            <span className="text-sm text-gray-500">Fetching organic posts...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center text-center p-4 border border-red-200 rounded-2xl bg-red-50/50 flex-shrink-0 m-1">
            <p className="text-red-500 text-sm mb-3 font-medium">{error}</p>
            <Button size="sm" variant="outline" onClick={() => fetchPosts(0, false)}>
              Retry
            </Button>
          </div>
        )}

        {hasFetched && !isLoading && filteredPosts.length === 0 && !error && (
          <div className="flex items-center justify-center py-12 text-gray-500 border border-gray-200 border-dashed rounded-2xl flex-shrink-0 m-1 text-sm bg-gray-50/50">
            No posts found.
          </div>
        )}

        {filteredPosts.length > 0 && (
          <div className="grid grid-cols-[20px_48px_1fr_75px_75px_120px] gap-3 px-3 py-2.5 text-xs font-semibold text-white bg-zinc-800 rounded-xl items-center shadow-sm">
            <div></div>
            <div>Cover</div>
            <div>Caption</div>
            <div className="text-right">Likes</div>
            <div className="text-right">Views</div>
            <div className="text-center">Auth Status</div>
          </div>
        )}
      </div>

      {filteredPosts.length > 0 && (
        <ScrollArea className="flex-1 pr-2 outline-none custom-scrollbar">
          <div className="space-y-1.5 pb-4">
            {filteredPosts.map((post) => {
              const isSelected = selectedPostIds.has(post.id)
              const expiry = getExpiryWarning(post.auth_end_time)

              return (
                <label
                  key={post.id}
                  className={`grid grid-cols-[auto_48px_1fr_75px_75px_120px] gap-3 items-center p-3 rounded-2xl border cursor-pointer transition-all duration-150 ${isSelected
                    ? 'border-zinc-850 bg-zinc-50/70 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => togglePostSelection(post)}
                    className="border-gray-400"
                  />

                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                    {post.image_url ? (
                      <img
                        src={post.image_url}
                        alt="Post thumbnail"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full items-center justify-center ${post.image_url ? 'hidden' : 'flex'}`}>
                      <ImageOff className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  {/* Caption Text */}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-relaxed" title={post.ad_name}>
                      {post.ad_name}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">ID: {post.id}</p>
                  </div>

                  {/* Likes */}
                  <div className="text-right text-xs font-medium text-gray-700">
                    {formatNumber(post.likes)}
                  </div>

                  {/* Views */}
                  <div className="text-right text-xs font-medium text-gray-700">
                    {formatNumber(post.views)}
                  </div>

                  {/* Expiry Warning / Status */}
                  <div className="flex justify-center">
                    {expiry ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${expiry.type === 'expired'
                        ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
                        : 'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {expiry.message}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 flex items-center gap-1">
                        <Check className="h-3 w-3 shrink-0" />
                        Active
                      </span>
                    )}
                  </div>
                </label>
              )
            })}

            {hasMore && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full rounded-xl py-5 border-gray-300 text-sm font-medium hover:bg-gray-50"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin text-gray-500" />
                      Loading more posts...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2 text-gray-500" />
                      Load More Posts
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

export default memo(TikTokPostSelectorInline)
