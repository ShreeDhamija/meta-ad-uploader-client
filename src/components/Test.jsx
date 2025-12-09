"use client"

import { useState, useCallback, memo, useEffect, useRef } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader, ChevronDown, ImageOff } from "lucide-react"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

function PostSelectorInline({ pageId, onImport }) {
    // DEBUG: Track renders and prop changes
    const renderCount = useRef(0);
    const prevPageId = useRef(pageId);
    const prevOnImport = useRef(onImport);

    useEffect(() => {
        renderCount.current += 1;
        console.log('🔄 PostSelectorInline render #', renderCount.current);

        if (prevPageId.current !== pageId) {
            console.log('📝 pageId changed:', prevPageId.current, '->', pageId);
            prevPageId.current = pageId;
        }

        if (prevOnImport.current !== onImport) {
            console.log('⚠️ onImport reference changed!');
            prevOnImport.current = onImport;
        }
    });

    const [posts, setPosts] = useState([])
    const [selectedPostIds, setSelectedPostIds] = useState(new Set())
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [error, setError] = useState(null)
    const [nextCursor, setNextCursor] = useState(null)
    const [hasMore, setHasMore] = useState(false)
    const [hasFetched, setHasFetched] = useState(false)




    // Rest of your code stays the same...
    const fetchPosts = useCallback(async (cursor = null) => {
        if (!pageId) {
            setError("No page selected")
            return
        }

        const isInitialLoad = !cursor
        if (isInitialLoad) {
            setIsLoading(true)
            setPosts([])
            setSelectedPostIds(new Set())
        } else {
            setIsLoadingMore(true)
        }
        setError(null)

        try {
            const response = await axios.get(`${API_BASE_URL}/auth/page-posts`, {
                params: {
                    pageId,
                    after: cursor
                },
                withCredentials: true
            })

            const { data, paging } = response.data

            if (isInitialLoad) {
                setPosts(data || [])
                setHasFetched(true)
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
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }, [pageId])

    const togglePostSelection = (postId) => {
        setSelectedPostIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(postId)) {
                newSet.delete(postId)
            } else {
                newSet.add(postId)
            }
            return newSet
        })
    }

    const handleImport = () => {
        const selectedPosts = posts.filter(p => selectedPostIds.has(p.id))
        onImport(selectedPosts)
    }

    const loadMore = () => {
        if (nextCursor && !isLoadingMore) {
            fetchPosts(nextCursor)
        }
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const truncateMessage = (message, maxLength = 80) => {
        if (!message) return "No caption"
        if (message.length <= maxLength) return message
        return message.substring(0, maxLength) + "..."
    }

    return (
        <div className="space-y-4">
            {/* All your existing JSX */}
            <Button
                onClick={() => fetchPosts()}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
                {isLoading ? (
                    <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Fetching Posts...
                    </>
                ) : (
                    hasFetched ? 'Refetch Posts' : 'Fetch Posts'
                )}
            </Button>

            {isLoading && !hasFetched && (
                <div className="flex items-center justify-center py-8">
                    <Loader className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            )}

            {error && (
                <div className="flex flex-col items-center justify-center text-center p-4 border border-red-200 rounded-lg bg-red-50">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button variant="outline" onClick={() => fetchPosts()}>
                        Retry
                    </Button>
                </div>
            )}

            {hasFetched && !isLoading && posts.length === 0 && !error && (
                <div className="flex items-center justify-center py-8 text-gray-500 border border-gray-200 rounded-lg">
                    No eligible posts found for this page
                </div>
            )}

            {posts.length > 0 && (
                <>
                    <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-gray-500">
                            {selectedPostIds.size} selected
                        </span>
                    </div>

                    <div className="space-y-2">
                        {posts.map((post) => (
                            <label
                                key={post.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedPostIds.has(post.id)
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <Checkbox
                                    checked={selectedPostIds.has(post.id)}
                                    onCheckedChange={() => togglePostSelection(post.id)}
                                />


                                <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
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
                                        className={`w-full h-full items-center justify-center ${post.full_picture ? 'hidden' : 'flex'}`}
                                    >
                                        <ImageOff className="h-6 w-6 text-gray-400" />
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
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs text-gray-400 font-mono">
                                            {post.id.split('_')[1]}
                                        </span>
                                    </div>
                                </div>
                            </label>
                        ))}

                        {hasMore && (
                            <div className="pt-2">
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
                                            Load More Posts
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>

                    <Button
                        type="button"
                        onClick={handleImport}
                        disabled={selectedPostIds.size === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        Import {selectedPostIds.size > 0 ? `(${selectedPostIds.size})` : ''}
                    </Button>
                </>
            )}
        </div>
    )
}

export default memo(PostSelectorInline)