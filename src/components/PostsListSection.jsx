"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader, ChevronDown, ImageOff, Search } from "lucide-react"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function PostsListSection({
    pageId,
    importedPosts = [],
    setImportedPosts, // PARENT SETTER
}) {
    // 1. LOCAL BUFFER STATE
    // We store selections here first. We do NOT touch the parent yet.
    const [selectedPostIds, setSelectedPostIds] = useState(new Set())

    // API Data state
    const [posts, setPosts] = useState([])
    const [isLoadingPosts, setIsLoadingPosts] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [error, setError] = useState(null)
    const [nextCursor, setNextCursor] = useState(null)
    const [hasMore, setHasMore] = useState(false)
    const [hasFetched, setHasFetched] = useState(false)

    // Reset local state when page changes
    useEffect(() => {
        setPosts([])
        setSelectedPostIds(new Set()) // Clear local selection
        setHasFetched(false)
        setError(null)
        setNextCursor(null)
        setHasMore(false)
    }, [pageId])

    // Fetch Logic (Memoized)
    const fetchPosts = useCallback(async (cursor = null) => {
        if (!pageId) return

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
                params: { pageId, after: cursor },
                withCredentials: true
            })
            const { data, paging } = response.data

            setPosts(prev => isInitialLoad ? (data || []) : [...prev, ...(data || [])])

            if (paging?.cursors?.after && paging?.next) {
                setNextCursor(paging.cursors.after)
                setHasMore(true)
            } else {
                setNextCursor(null)
                setHasMore(false)
            }
        } catch (err) {
            console.error(err)
            setError("Failed to fetch posts")
        } finally {
            setIsLoadingPosts(false)
            setIsLoadingMore(false)
        }
    }, [pageId])

    // 2. TOGGLE LOCAL ONLY
    // Wrapped in useCallback to ensure stability
    const togglePostSelection = useCallback((postId) => {
        setSelectedPostIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(postId)) newSet.delete(postId)
            else newSet.add(postId)
            return newSet
        })
    }, [])

    // 3. PUSH TO PARENT (The "Commit" Action)
    // This runs ONCE when button is clicked. Impossible to cause a loop.
    const handleImport = useCallback(() => {
        // Find actual post objects based on IDs
        const postsToAdd = posts.filter(p => selectedPostIds.has(p.id))

        if (postsToAdd.length === 0) return

        setImportedPosts(prev => {
            // Prevent duplicates logic
            const currentIds = new Set(prev.map(p => p.id))
            const uniqueNewPosts = postsToAdd.filter(p => !currentIds.has(p.id))
            return [...prev, ...uniqueNewPosts]
        })

        toast.success(`Added ${postsToAdd.length} posts`)
        setSelectedPostIds(new Set()) // Clear selection after adding
    }, [posts, selectedPostIds, setImportedPosts])

    // Helper to calculate count efficiently
    const selectedCount = selectedPostIds.size

    return (
        <div className="space-y-4">
            <Button
                type="button"
                onClick={() => fetchPosts()}
                disabled={!pageId || isLoadingPosts}
                className="w-full bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl h-[48px]"
            >
                {isLoadingPosts ? (
                    <><Loader className="h-4 w-4 mr-2 animate-spin" /> Loading...</>
                ) : (
                    <><Search className="h-4 w-4 mr-2" /> {hasFetched ? 'Refresh' : 'Load Posts'}</>
                )}
            </Button>

            {hasFetched && (
                <div className="border border-gray-200 rounded-xl p-3">
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        {posts.map((post) => (
                            <div
                                key={post.id}
                                className={cn(
                                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors mb-2",
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
                                {/* Thumbnail & Content logic here... */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm line-clamp-2">{post.message || "No caption"}</p>
                                    <span className="text-xs text-gray-500">{new Date(post.created_time).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}

                        {hasMore && (
                            <Button variant="outline" className="w-full mt-2" onClick={() => fetchPosts(nextCursor)} disabled={isLoadingMore}>
                                Load More
                            </Button>
                        )}
                    </div>

                    {/* THE CIRCUIT BREAKER: The Add Button */}
                    <div className="pt-3 border-t mt-3">
                        <Button
                            type="button"
                            onClick={handleImport}
                            disabled={selectedCount === 0}
                            className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl"
                        >
                            Add {selectedCount > 0 ? `${selectedCount} ` : ''} Posts
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}