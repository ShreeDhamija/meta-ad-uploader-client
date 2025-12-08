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
    importedPosts, // We don't read this for checkboxes anymore, just like the Modal didn't
    setImportedPosts,
}) {
    // 1. USE LOCAL STATE (Just like the Modal did)
    const [selectedPostIds, setSelectedPostIds] = useState(new Set())

    const [posts, setPosts] = useState([])
    const [isLoadingPosts, setIsLoadingPosts] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [error, setError] = useState(null)
    const [nextCursor, setNextCursor] = useState(null)
    const [hasMore, setHasMore] = useState(false)
    const [hasFetched, setHasFetched] = useState(false)

    // Reset when page changes (Like the Modal's isOpen effect)
    useEffect(() => {
        setPosts([])
        setSelectedPostIds(new Set()) // Clear local selection
        setHasFetched(false)
        setError(null)
        setNextCursor(null)
        setHasMore(false)
    }, [pageId])

    // Fetch Logic (Copied from Modal)
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
                params: { pageId, after: cursor },
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
            console.error(err)
            const msg = err.response?.data?.error || err.message || "Failed"
            setError(msg)
            toast.error(msg)
        } finally {
            setIsLoadingPosts(false)
            setIsLoadingMore(false)
        }
    }, [pageId])

    // 2. TOGGLE LOCAL STATE ONLY (Exactly like the Modal)
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

    // 3. IMPORT TO PARENT (Exactly like the Modal's handleImport)
    const handleImport = () => {
        // Find the full post objects
        const selectedPosts = posts.filter(p => selectedPostIds.has(p.id))

        // Update Parent (This is the only time we touch the parent)
        setImportedPosts(prev => {
            // Handle existing posts to avoid duplicates
            const currentPosts = Array.isArray(prev) ? prev : []
            const existingIds = new Set(currentPosts.map(p => p.id))
            const newPosts = selectedPosts.filter(p => !existingIds.has(p.id))
            return [...currentPosts, ...newPosts]
        })

        toast.success(`Imported ${selectedPosts.length} post(s)`)
        setSelectedPostIds(new Set()) // Clear selection after import
    }

    const loadMore = () => {
        if (nextCursor && !isLoadingMore) fetchPosts(nextCursor)
    }

    // Display helpers
    const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const truncateMessage = (m, l = 80) => (!m ? "No caption" : m.length <= l ? m : m.substring(0, l) + "...")

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
                    <><Search className="h-4 w-4 mr-2" /> {hasFetched ? 'Refresh Posts' : 'Load Posts'}</>
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
                                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                    {post.full_picture ? (
                                        <img src={post.full_picture} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                                    ) : null}
                                    <div className={cn("w-full h-full items-center justify-center", post.full_picture ? "hidden" : "flex")}>
                                        <ImageOff className="h-5 w-5 text-gray-400" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 line-clamp-2">{truncateMessage(post.message)}</p>
                                    <span className="text-xs text-gray-500">{formatDate(post.created_time)}</span>
                                </div>
                            </div>
                        ))}
                        {hasMore && (
                            <Button variant="outline" className="w-full mt-2" onClick={loadMore} disabled={isLoadingMore}>
                                Load More
                            </Button>
                        )}
                    </div>

                    {/* The Circuit Breaker - Only update parent here */}
                    <div className="pt-3 border-t mt-3">
                        <Button
                            type="button"
                            onClick={handleImport}
                            disabled={selectedPostIds.size === 0}
                            className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl"
                        >
                            Add {selectedPostIds.size > 0 ? `${selectedPostIds.size} ` : ''} Posts
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}