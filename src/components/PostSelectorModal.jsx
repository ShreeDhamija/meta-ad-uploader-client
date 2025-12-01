"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader, X, ChevronDown, ImageOff } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';


export default function PostSelectorModal({ isOpen, onClose, pageId, onImport }) {
    const [posts, setPosts] = useState([])
    const [selectedPostIds, setSelectedPostIds] = useState(new Set())
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [error, setError] = useState(null)
    const [nextCursor, setNextCursor] = useState(null)
    const [hasMore, setHasMore] = useState(false)

    // Fetch posts from the page
    const fetchPosts = useCallback(async (cursor = null) => {
        if (!pageId) {
            setError("No page selected")
            return
        }

        const isInitialLoad = !cursor
        if (isInitialLoad) {
            setIsLoading(true)
            setPosts([])
        } else {
            setIsLoadingMore(true)
        }
        setError(null)

        try {
            const response = await axios.get(`${API_BASE_URL}/auth/page-posts`, {
                params: {
                    pageId,
                    after: cursor,
                    fields: 'id,created_time,full_picture,message'
                },
                withCredentials: true
            })

            const { data, paging } = response.data

            if (isInitialLoad) {
                setPosts(data || [])
            } else {
                setPosts(prev => [...prev, ...(data || [])])
            }

            // Handle pagination
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

    // Fetch posts when modal opens
    useEffect(() => {
        if (isOpen && pageId) {
            setSelectedPostIds(new Set())
            fetchPosts()
        }
    }, [isOpen, pageId, fetchPosts])

    // Toggle post selection
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

    // Select all visible posts
    const selectAll = () => {
        setSelectedPostIds(new Set(posts.map(p => p.id)))
    }

    // Clear selection
    const clearSelection = () => {
        setSelectedPostIds(new Set())
    }

    // Handle import
    const handleImport = () => {
        const selectedPosts = posts.filter(p => selectedPostIds.has(p.id))
        onImport(selectedPosts)
        onClose()
    }

    // Load more posts
    const loadMore = () => {
        if (nextCursor && !isLoadingMore) {
            fetchPosts(nextCursor)
        }
    }

    // Format date for display
    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    // Truncate message for display
    const truncateMessage = (message, maxLength = 80) => {
        if (!message) return "No caption"
        if (message.length <= maxLength) return message
        return message.substring(0, maxLength) + "..."
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Page Posts</DialogTitle>
                    <DialogDescription>
                        Choose posts to use as ad creatives. Selected posts will be imported with their existing content.
                    </DialogDescription>
                </DialogHeader>

                {/* Selection controls */}
                <div className="flex items-center justify-between py-2 border-b">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={selectAll}
                            disabled={posts.length === 0}
                        >
                            Select All
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={clearSelection}
                            disabled={selectedPostIds.size === 0}
                        >
                            Clear
                        </Button>
                    </div>
                    <span className="text-sm text-gray-500">
                        {selectedPostIds.size} selected
                    </span>
                </div>

                {/* Posts list */}
                <div className="flex-1 overflow-y-auto min-h-[300px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4">
                            <p className="text-red-500 mb-4">{error}</p>
                            <Button variant="outline" onClick={() => fetchPosts()}>
                                Retry
                            </Button>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            No posts found for this page
                        </div>
                    ) : (
                        <div className="space-y-2 p-1">
                            {posts.map((post) => (
                                <div
                                    key={post.id}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedPostIds.has(post.id)
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    onClick={() => togglePostSelection(post.id)}
                                >
                                    {/* Checkbox */}
                                    <Checkbox
                                        checked={selectedPostIds.has(post.id)}
                                        onCheckedChange={() => togglePostSelection(post.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />

                                    {/* Thumbnail */}
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

                                    {/* Post info */}
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
                                </div>
                            ))}

                            {/* Load more button */}
                            {hasMore && (
                                <div className="pt-4 pb-2">
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
                    )}
                </div>

                {/* Footer with Import button */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={selectedPostIds.size === 0}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        Import {selectedPostIds.size > 0 ? `(${selectedPostIds.size})` : ''}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}