"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader, ChevronDown, ImageOff, RefreshCcw, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"

// Icons - you may need to adjust these imports based on your project
const FacebookIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
)

const InstagramIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
)

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function PagePostSelector({
    // Auth & loading states
    isLoggedIn,
    isLoading,
    setIsLoading,

    // Pages data
    pages,
    setPages,
    pagesLoading,

    // Selected values
    pageId,
    setPageId,
    instagramAccountId,
    setInstagramAccountId,

    // Import handler
    onImportPosts,

    // Selected ad sets for context
    selectedAdSets,
}) {
    // Local state for posts
    const [posts, setPosts] = useState([])
    const [selectedPostIds, setSelectedPostIds] = useState(new Set())
    const [isLoadingPosts, setIsLoadingPosts] = useState(false)
    const [isPagesLoading, setIsPagesLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [error, setError] = useState(null)
    const [nextCursor, setNextCursor] = useState(null)
    const [hasMore, setHasMore] = useState(false)
    const [hasFetched, setHasFetched] = useState(false)

    // Dropdown states
    const [openPage, setOpenPage] = useState(false)
    const [openInstagram, setOpenInstagram] = useState(false)
    const [pageSearchValue, setPageSearchValue] = useState("")
    const [instagramSearchValue, setInstagramSearchValue] = useState("")

    // Filter pages based on search
    const filteredPages = pages.filter((page) =>
        page.name?.toLowerCase().includes(pageSearchValue.toLowerCase()) ||
        page.id?.includes(pageSearchValue)
    )

    // Filter Instagram accounts
    const filteredInstagramAccounts = pages.filter(
        (page) =>
            page.instagramAccount?.id &&
            (page.instagramAccount.username?.toLowerCase().includes(instagramSearchValue.toLowerCase()) ||
                page.instagramAccount.id?.includes(instagramSearchValue))
    )

    // Reset posts when page changes
    useEffect(() => {
        setPosts([])
        setSelectedPostIds(new Set())
        setHasFetched(false)
        setError(null)
        setNextCursor(null)
        setHasMore(false)
    }, [pageId])


    const refreshPages = async () => {
        setIsLoading(true);
        pagesLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/fetch-pages`, {
                credentials: "include"
            });

            const data = await res.json();

            if (data.pages) {
                toast.success("Pages refreshed successfully!");
                setPages(data.pages);

                // ✅ Retain selected page and IG account if still valid
                const updatedPage = data.pages.find((p) => p.id === pageId);
                const updatedInstagram = data.pages
                    .find((p) => p.instagramAccount?.id === instagramAccountId)
                    ?.instagramAccount;

                if (!updatedPage) setPageId("");
                if (!updatedInstagram) setInstagramAccountId("");
            } else {
                toast.error("No pages returned.");
            }
        } catch (err) {
            toast.error(`Failed to fetch pages: ${err.message || "Unknown error"}`);
            console.error("Failed to fetch pages:", err);
        } finally {
            setIsLoading(false);
            setIsPagesLoading(false);
        }
    };

    // Fetch posts from the page
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
            setIsLoadingPosts(false)
            setIsLoadingMore(false)
        }
    }, [pageId])

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
        if (onImportPosts) {
            onImportPosts(selectedPosts)
        }
        toast.success(`Imported ${selectedPosts.length} post${selectedPosts.length !== 1 ? 's' : ''}`)
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
        <Card className="shadow-sm border rounded-2xl">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Import from Page Posts</CardTitle>
                <CardDescription>
                    Select a Facebook Page and import existing posts as ad creatives
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Page Selector */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                            <FacebookIcon className="w-4 h-4" />
                            Select a Page
                        </Label>
                        <RefreshCcw
                            className={cn(
                                "h-4 w-4 cursor-pointer transition-all duration-200",
                                isPagesLoading
                                    ? "h-3.5 w-3.5 text-gray-300 animate-[spin_3s_linear_infinite]"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                            onClick={refreshPages}
                        />
                    </div>
                    <Popover open={openPage} onOpenChange={setOpenPage}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openPage}
                                disabled={!isLoggedIn || pagesLoading || isPagesLoading}
                                className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow hover:bg-white"
                            >
                                {(pagesLoading || isPagesLoading) ? (
                                    <div className="flex items-center gap-2">
                                        <Loader className="h-4 w-4 animate-spin" />
                                        <span>Loading pages...</span>
                                    </div>
                                ) : pageId ? (
                                    <div className="flex items-center gap-2">
                                        <img
                                            src={
                                                pages.find((page) => page.id === pageId)?.profilePicture ||
                                                "https://api.withblip.com/backup_page_image.png"
                                            }
                                            alt="Page"
                                            className="w-5 h-5 rounded-full object-cover"
                                        />
                                        <span>{pages.find((page) => page.id === pageId)?.name || pageId}</span>
                                    </div>
                                ) : (
                                    "Select a Page"
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="min-w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-xl"
                            align="start"
                            sideOffset={4}
                            side="bottom"
                            avoidCollisions={false}
                            style={{
                                minWidth: "var(--radix-popover-trigger-width)",
                                width: "auto",
                                maxWidth: "var(--radix-popover-trigger-width)",
                            }}
                        >
                            <Command filter={() => 1} loop={false} defaultValue={pageId}>
                                <CommandInput
                                    placeholder="Search pages..."
                                    value={pageSearchValue}
                                    onValueChange={setPageSearchValue}
                                />
                                <CommandEmpty>No page found.</CommandEmpty>
                                <CommandList className="max-h-[500px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
                                    <CommandGroup>
                                        {filteredPages.length > 0 ? (
                                            filteredPages.map((page) => (
                                                <CommandItem
                                                    key={page.id}
                                                    value={page.id}
                                                    onSelect={() => {
                                                        setPageId(page.id)
                                                        setOpenPage(false)
                                                        if (page.instagramAccount?.id) {
                                                            setInstagramAccountId(page.instagramAccount.id)
                                                        } else {
                                                            setInstagramAccountId("")
                                                        }
                                                    }}
                                                    className={cn(
                                                        "px-3 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
                                                        "data-[selected=true]:bg-gray-100",
                                                        pageId === page.id && "bg-gray-100 rounded-xl font-semibold",
                                                        "hover:bg-gray-100",
                                                        "flex items-center gap-2"
                                                    )}
                                                    data-selected={page.id === pageId}
                                                >
                                                    <img
                                                        src={page.profilePicture || "/placeholder.svg"}
                                                        alt={`${page.name} profile`}
                                                        className="w-6 h-6 rounded-full object-cover border border-gray-300"
                                                    />
                                                    <span className="truncate">{page.name}</span>
                                                    <span className="text-xs text-gray-400 ml-2">{page.id}</span>
                                                </CommandItem>
                                            ))
                                        ) : (
                                            <CommandItem disabled className="opacity-50 cursor-not-allowed">
                                                No page found.
                                            </CommandItem>
                                        )}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Instagram Selector */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <InstagramIcon className="w-4 h-4" />
                        Select Instagram Account
                    </Label>
                    <Popover open={openInstagram} onOpenChange={setOpenInstagram}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openInstagram}
                                className="w-full justify-between border border-gray-400 rounded-xl bg-white shadow hover:bg-white"
                                disabled={filteredInstagramAccounts.length === 0}
                            >
                                {instagramAccountId ? (
                                    <div className="flex items-center gap-2">
                                        <img
                                            src={
                                                pages.find((p) => p.instagramAccount?.id === instagramAccountId)?.instagramAccount?.profilePictureUrl ||
                                                "https://api.withblip.com/backup_page_image.png"
                                            }
                                            alt="Instagram"
                                            className="w-5 h-5 rounded-full object-cover"
                                        />
                                        <span>
                                            {pages.find((p) => p.instagramAccount?.id === instagramAccountId)?.instagramAccount?.username || instagramAccountId}
                                        </span>
                                    </div>
                                ) : (
                                    "Select Instagram Account"
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="min-w-[--radix-popover-trigger-width] !max-w-none p-0 bg-white shadow-lg rounded-xl"
                            align="start"
                            sideOffset={4}
                            side="bottom"
                            avoidCollisions={false}
                            style={{
                                minWidth: "var(--radix-popover-trigger-width)",
                                width: "auto",
                                maxWidth: "var(--radix-popover-trigger-width)",
                            }}
                        >
                            <Command loop={false}>
                                <CommandInput
                                    placeholder="Search Instagram usernames..."
                                    value={instagramSearchValue}
                                    onValueChange={setInstagramSearchValue}
                                />
                                <CommandEmpty>No Instagram accounts found.</CommandEmpty>
                                <CommandList className="max-h-[300px] overflow-y-auto rounded-xl custom-scrollbar" selectOnFocus={false}>
                                    <CommandGroup>
                                        {filteredInstagramAccounts.map((page) => (
                                            <CommandItem
                                                key={page.instagramAccount.id}
                                                value={page.instagramAccount.id}
                                                onSelect={() => {
                                                    setInstagramAccountId(page.instagramAccount.id)
                                                    setOpenInstagram(false)
                                                }}
                                                className={cn(
                                                    "px-3 py-2 cursor-pointer m-1 rounded-xl transition-colors duration-150",
                                                    instagramAccountId === page.instagramAccount.id && "bg-gray-100 font-semibold",
                                                    "hover:bg-gray-100 flex items-center gap-2"
                                                )}
                                            >
                                                <img
                                                    src={page.instagramAccount.profilePictureUrl || "https://api.withblip.com/backup_page_image.png"}
                                                    alt={`${page.instagramAccount.username} profile`}
                                                    className="w-6 h-6 rounded-full object-cover border border-gray-300"
                                                />
                                                <span>{page.instagramAccount.username}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Load Posts Button */}
                <div className="pt-2">
                    <Button
                        onClick={() => fetchPosts()}
                        disabled={!pageId || isLoadingPosts}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                    >
                        {isLoadingPosts ? (
                            <>
                                <Loader className="h-4 w-4 mr-2 animate-spin" />
                                Loading Posts...
                            </>
                        ) : (
                            <>
                                <Search className="h-4 w-4 mr-2" />
                                Load Posts from Page
                            </>
                        )}
                    </Button>
                </div>

                {/* Posts Section - Only show after fetching */}
                {hasFetched && (
                    <div className="border-t pt-4 mt-4">
                        {/* Selection controls */}
                        <div className="flex items-center justify-between pb-3 border-b mb-3">
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={selectAll}
                                    disabled={posts.length === 0}
                                    className="rounded-lg"
                                >
                                    Select All
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearSelection}
                                    disabled={selectedPostIds.size === 0}
                                    className="rounded-lg"
                                >
                                    Clear
                                </Button>
                            </div>
                            <span className="text-sm text-gray-500">
                                {selectedPostIds.size} selected
                            </span>
                        </div>

                        {/* Posts list */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {isLoadingPosts ? (
                                <div className="flex items-center justify-center h-48">
                                    <Loader className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                                    <p className="text-red-500 mb-4">{error}</p>
                                    <Button variant="outline" onClick={() => fetchPosts()} className="rounded-lg">
                                        Retry
                                    </Button>
                                </div>
                            ) : posts.length === 0 ? (
                                <div className="flex items-center justify-center h-48 text-gray-500">
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
                                            {/* Checkbox */}
                                            <Checkbox
                                                checked={selectedPostIds.has(post.id)}
                                                onCheckedChange={() => togglePostSelection(post.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />

                                            {/* Thumbnail */}
                                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
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
                                                className="w-full rounded-xl"
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

                        {/* Import button */}
                        {posts.length > 0 && (
                            <div className="flex justify-end pt-4 border-t mt-4">
                                <Button
                                    onClick={handleImport}
                                    disabled={selectedPostIds.size === 0}
                                    className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                                >
                                    Import {selectedPostIds.size > 0 ? `(${selectedPostIds.size})` : ''} Selected Posts
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}