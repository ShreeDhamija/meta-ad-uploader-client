"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader, ChevronDown, ImageOff, Search } from "lucide-react"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function PostsListSection({
    pageId,
    importedPosts = [], // Default to empty array
    setImportedPosts,
}) {
    // 1. Local state for selection (IDs only) to prevent parent render loops during selection
    const [selectedPostIds, setSelectedPostIds] = useState(new Set())

    // Data fetching state
    const [posts, setPosts] = useState([])
    const [isLoadingPosts, setIsLoadingPosts] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [error, setError] = useState(null)
    const [nextCursor, setNextCursor] = useState(null)
    const [hasMore, setHasMore] = useState(false)
    const [hasFetched, setHasFetched] = useState(false)

    // Reset when page changes
    useEffect(() => {
        setPosts([])
        setSelectedPostIds(new Set())
        setHasFetched(false)
        setError(null)
        setNextCursor(null)
        setHasMore(false)
    }, [pageId])

    // Fetch posts
    const fetchPosts = useCallback(async (cursor = null) => {
        if (!pageId) {
            setError("Please select a page first")
            return
        }

        const isInitialLoad = !cursor
        if (isInitialLoad) {
            setIsLoadingPosts(true)
            setPosts([])
            setHasFetched(true)
        } else {
            setIsLoadingMore(true)
        }
        setError(null)

        try {
            const response = await axios.get(`${API_BASE_URL}/auth/page-posts`, {
                params: {
                    pageId,
                    after: cursor,
                },
                withCredentials: true
            })

            const { data, paging } = response.data

            if (isInitialLoad) {
                setPosts(data || [])
            } else {
                setPosts(prev => [...prev, ...(data || [])])
            }

            if (paging?.cursors?.after && paging?.next) {
                setNextCursor(paging.cursors.after)
                setHasMore(true)
            } else {
                setNextCursor(null)
                setHasMore(false)
            }

        } catch (err) {
            console.error("Error fetching posts:", err)
            const errorMessage = err.response?.data?.error || err.message || "Failed to fetch posts"
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setIsLoadingPosts(false)
            setIsLoadingMore(false)
        }
    }, [pageId])

    // 2. Toggle Selection - Updates LOCAL state only
    const togglePostSelection = useCallback((postId) => {
        setSelectedPostIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(postId)) {
                newSet.delete(postId)
            } else {
                newSet.add(postId)
            }
            return newSet
        })
    }, [])

    // 3. Handle Import - Updates PARENT state only on button click
    const handleImport = useCallback(() => {
        // Get the full post objects corresponding to the selected IDs
        const selectedPosts = posts.filter(p => selectedPostIds.has(p.id))

        if (selectedPosts.length === 0) return;

        setImportedPosts(prev => {
            const currentPosts = Array.isArray(prev) ? prev : [];
            // Create a Set of existing IDs to prevent duplicates
            // Handles cases where importedPosts might be objects or just IDs
            const existingIds = new Set(currentPosts.map(p => p?.id || p));

            const newPosts = selectedPosts.filter(p => !existingIds.has(p.id))
            return [...currentPosts, ...newPosts]
        })

        toast.success(`Imported ${selectedPosts.length} post(s)`)

        // Optional: Clear selection after import
        setSelectedPostIds(new Set())
    }, [posts, selectedPostIds, setImportedPosts])

    const loadMore = useCallback(() => {
        if (nextCursor && !isLoadingMore) {
            fetchPosts(nextCursor)
        }
    }, [nextCursor, isLoadingMore, fetchPosts])

    // Helper functions for display
    const formatDate = (dateString) => {
        if (!dateString) return ''
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        })
    }

    const truncateMessage = (message, maxLength = 80) => {
        if (!message) return "No caption"
        if (message.length <= maxLength) return message
        return message.substring(0, maxLength) + "..."
    }

    return (
        <div className="space-y-4">
            {/* Load Button */}
            <Button
                type="button"
                onClick={() => fetchPosts()}
                disabled={!pageId || isLoadingPosts}
                className="w-full bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl h-[48px]"
            >
                {isLoadingPosts ? (
                    <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Loading Posts...
                    </>
                ) : (
                    <>
                        <Search className="h-4 w-4 mr-2" />
                        {hasFetched ? 'Refresh Posts from Page' : 'Load Posts from Page'}
                    </>
                )}
            </Button>

            {!pageId && (
                <p className="text-xs text-gray-500 text-center">
                    Select a Facebook Page above to load posts
                </p>
            )}

            {/* List Section */}
            {hasFetched && (
                <div className="border border-gray-200 rounded-xl p-3">
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        {isLoadingPosts ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                                <p className="text-red-500 mb-4 text-sm">{error}</p>
                                <Button variant="outline" onClick={() => fetchPosts()}>Retry</Button>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                                No posts found for this page
                            </div>
                        ) : (
                            <div className="space-y-2 pr-1">
                                {posts.map((post) => (
                                    <div
                                        key={post.id}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                                            selectedPostIds.has(post.id)
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                        )}
                                        onClick={() => togglePostSelection(post.id)}
                                    >
                                        <Checkbox
                                            checked={selectedPostIds.has(post.id)}
                                            className="mt-1 pointer-events-none"
                                        />

                                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                            {post.full_picture ? (
                                                <img
                                                    src={post.full_picture}
                                                    alt="Post thumbnail"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none'
                                                        e.target.nextSibling.style.display = 'flex'
                                                    }}
                                                />
                                            ) : null}
                                            <div
                                                className={cn(
                                                    "w-full h-full items-center justify-center",
                                                    post.full_picture ? "hidden" : "flex"
                                                )}
                                            >
                                                <ImageOff className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900 line-clamp-2">
                                                {truncateMessage(post.message)}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-500">
                                                    {formatDate(post.created_time)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {hasMore && (
                                    <div className="pt-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full rounded-xl"
                                            onClick={loadMore}
                                            disabled={isLoadingMore}
                                        >
                                            {isLoadingMore ? "Loading..." : "Load More Posts"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Import Button Section */}
                    {posts.length > 0 && (
                        <div className="pt-3 border-t mt-3">
                            <Button
                                type="button"
                                onClick={handleImport}
                                disabled={selectedPostIds.size === 0}
                                className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl"
                            >
                                Add {selectedPostIds.size > 0 ? `${selectedPostIds.size} ` : ''} Selected Post{selectedPostIds.size !== 1 ? 's' : ''}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}