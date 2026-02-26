import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from "sonner"
import { Loader2, Image as ImageIcon, Video, FolderOpen, Heart, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';
const IG_CACHE_KEY = 'ig_media_cache';

const getIgCache = (igUserId) => {
    try {
        const cached = JSON.parse(sessionStorage.getItem(IG_CACHE_KEY));
        if (cached && cached.igUserId === igUserId) return cached;
    } catch { }
    return null;
};

const setIgCache = (igUserId, images, videos, pagination) => {
    sessionStorage.setItem(IG_CACHE_KEY, JSON.stringify({ igUserId, images, videos, pagination }));
};

export default function MetaMediaLibraryModal({
    adAccountId,
    isLoggedIn,
    importedFiles = [],
    setImportedFiles,
    instagramAccountId,
    selectedIgOrganicPosts = [],
    setSelectedIgOrganicPosts = () => { },
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [mediaSource, setMediaSource] = useState('instagram');
    const [activeTab, setActiveTab] = useState('images');

    const [metaImages, setMetaImages] = useState([]);
    const [metaVideos, setMetaVideos] = useState([]);
    const [loadingMeta, setLoadingMeta] = useState(false);
    const [selectedMetaFiles, setSelectedMetaFiles] = useState([]);

    const [igImages, setIgImages] = useState([]);
    const [igVideos, setIgVideos] = useState([]);
    const [loadingIg, setLoadingIg] = useState(false);
    const [selectedIgPosts, setSelectedIgPosts] = useState([]);
    // Pagination state
    const [metaImagesPagination, setMetaImagesPagination] = useState({ hasMore: false, nextCursor: null });
    const [metaVideosPagination, setMetaVideosPagination] = useState({ hasMore: false, nextCursor: null });
    const [igPagination, setIgPagination] = useState({ hasMore: false, nextCursor: null, tagsNextCursor: null });
    const [loadingMoreMetaImages, setLoadingMoreMetaImages] = useState(false);
    const [loadingMoreMetaVideos, setLoadingMoreMetaVideos] = useState(false);
    const [loadingMoreIg, setLoadingMoreIg] = useState(false);
    const [filterCollaborators, setFilterCollaborators] = useState(false);

    const mapMetaImages = (rawImages) => rawImages.map(img => ({
        type: 'image',
        hash: img.hash,
        name: img.name,
        width: img.width,
        height: img.height,
        url: img.url,
        previewUrl: img.url,
    }));

    const mapMetaVideos = (rawVideos) => rawVideos.map(vid => ({
        type: 'video',
        id: vid.id,
        name: vid.title || `Video ${vid.id}`,
        width: vid.width,
        height: vid.height,
        thumbnail_url: vid.thumbnail_url,
        previewUrl: vid.thumbnail_url,
    }));

    const fetchMetaLibrary = useCallback(async () => {
        if (!adAccountId) return;
        setLoadingMeta(true);
        try {
            const imgRes = await axios.get(`${API_BASE_URL}/auth/library-images`, {
                params: { adAccountId },
                withCredentials: true,
            });
            setMetaImages(mapMetaImages(imgRes.data?.data || []));
            setMetaImagesPagination(imgRes.data?.pagination || { hasMore: false, nextCursor: null });

            const vidRes = await axios.get(`${API_BASE_URL}/auth/library-videos`, {
                params: { adAccountId },
                withCredentials: true,
            });
            setMetaVideos(mapMetaVideos(vidRes.data?.data || []));
            setMetaVideosPagination(vidRes.data?.pagination || { hasMore: false, nextCursor: null });
        } catch (err) {
            console.error('Error fetching Meta library:', err);
            toast.error('Failed to load Meta media library');
        } finally {
            setLoadingMeta(false);
        }
    }, [adAccountId]);

    const loadMoreMetaImages = useCallback(async () => {
        if (!metaImagesPagination.nextCursor) return;
        setLoadingMoreMetaImages(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/auth/library-images`, {
                params: { adAccountId, after: metaImagesPagination.nextCursor },
                withCredentials: true,
            });
            const newData = res.data?.data || [];
            const newPagination = res.data?.pagination || { hasMore: false, nextCursor: null };
            setMetaImages(prev => [...prev, ...mapMetaImages(newData)]);
            setMetaImagesPagination(newPagination);
            if (!newPagination.hasMore) {
                toast.info('No more images to load');
            }
        } catch (err) {
            console.error('Error loading more images:', err);
            toast.error('Failed to load more images');
        } finally {
            setLoadingMoreMetaImages(false);
        }
    }, [adAccountId, metaImagesPagination.nextCursor]);

    const loadMoreMetaVideos = useCallback(async () => {
        if (!metaVideosPagination.nextCursor) return;
        setLoadingMoreMetaVideos(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/auth/library-videos`, {
                params: { adAccountId, after: metaVideosPagination.nextCursor },
                withCredentials: true,
            });
            const newData = res.data?.data || [];
            const newPagination = res.data?.pagination || { hasMore: false, nextCursor: null };
            setMetaVideos(prev => [...prev, ...mapMetaVideos(newData)]);
            setMetaVideosPagination(newPagination);
            if (!newPagination.hasMore) {
                toast.info('No more videos to load');
            }
        } catch (err) {
            console.error('Error loading more videos:', err);
            toast.error('Failed to load more videos');
        } finally {
            setLoadingMoreMetaVideos(false);
        }
    }, [adAccountId, metaVideosPagination.nextCursor]);




    const fetchInstagramPosts = useCallback(async (forceRefresh = false) => {
        if (!instagramAccountId) {
            toast.error('Please select an Instagram account first');
            setMediaSource('meta_library');
            return;
        }

        if (forceRefresh) {
            sessionStorage.removeItem(IG_CACHE_KEY);
        }

        // Check cache first
        if (!forceRefresh) {
            const cached = getIgCache(instagramAccountId);
            if (cached) {
                setIgImages(cached.images);
                setIgVideos(cached.videos);
                setIgPagination(cached.pagination);
                return;
            }
        }

        setLoadingIg(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/auth/instagram-media`, {
                params: { igUserId: instagramAccountId },
                withCredentials: true,
            });
            const images = res.data?.images || [];
            const videos = res.data?.videos || [];
            const pagination = res.data?.pagination || { hasMore: false, nextCursor: null, tagsNextCursor: null };

            setIgImages(images);
            setIgVideos(videos);
            setIgPagination(pagination);
            setIgCache(instagramAccountId, images, videos, pagination);
        } catch (err) {
            console.error('Error fetching IG posts:', err);
            toast.error(err.response?.data?.error || 'Failed to load Instagram posts');
        } finally {
            setLoadingIg(false);
        }
    }, [instagramAccountId]);


    const loadMoreIg = useCallback(async () => {
        if (!igPagination.nextCursor && !igPagination.tagsNextCursor) return;
        setLoadingMoreIg(true);
        try {
            const params = { igUserId: instagramAccountId };
            if (igPagination.nextCursor) {
                params.after = igPagination.nextCursor;
            }
            if (igPagination.tagsNextCursor) {
                params.tagsAfter = igPagination.tagsNextCursor;
            }

            const res = await axios.get(`${API_BASE_URL}/auth/instagram-media`, {
                params,
                withCredentials: true,
            });

            const newImages = res.data?.images || [];
            const newVideos = res.data?.videos || [];
            const newPagination = res.data?.pagination || { hasMore: false, nextCursor: null, tagsNextCursor: null };

            setIgImages(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const dedupedImages = newImages.filter(p => !existingIds.has(p.id));
                const updated = [...prev, ...dedupedImages];
                setIgVideos(prevVids => {
                    const existingVidIds = new Set(prevVids.map(p => p.id));
                    const dedupedVideos = newVideos.filter(p => !existingVidIds.has(p.id));
                    const updatedVids = [...prevVids, ...dedupedVideos];
                    setIgCache(instagramAccountId, updated, updatedVids, newPagination);
                    return updatedVids;
                });
                return updated;
            });
            setIgPagination(newPagination);
            if (!newPagination.hasMore) {
                toast.info('No more posts to load');
            }

        } catch (err) {
            console.error('Error loading more IG posts:', err);
            toast.error('Failed to load more Instagram posts');
        } finally {
            setLoadingMoreIg(false);
        }
    }, [instagramAccountId, igPagination.nextCursor, igPagination.tagsNextCursor]);

    const openModal = () => {
        setIsOpen(true);
        setSelectedMetaFiles([]);
        setSelectedIgPosts([]);
        if (mediaSource === 'meta_library') {
            fetchMetaLibrary();
        } else {
            fetchInstagramPosts();
        }
    };

    const handleSourceChange = (source) => {
        setMediaSource(source);
        setActiveTab('images');
        setSelectedMetaFiles([]);
        setSelectedIgPosts([]);

        if (source === 'instagram') {
            if (!instagramAccountId) {
                toast.error('Please select an Instagram account first');
                setMediaSource('meta_library');
                return;
            }
            if (igImages.length === 0 && igVideos.length === 0) {
                fetchInstagramPosts();
            }
        } else {
            if (metaImages.length === 0 && metaVideos.length === 0) {
                fetchMetaLibrary();
            }
        }
    };

    const getMetaFileId = (file) => (file.type === 'image' ? file.hash : file.id);

    const isMetaSelected = (file) =>
        selectedMetaFiles.some((f) => getMetaFileId(f) === getMetaFileId(file));

    const toggleMetaFile = (file) => {
        setSelectedMetaFiles((prev) =>
            prev.some((f) => getMetaFileId(f) === getMetaFileId(file))
                ? prev.filter((f) => getMetaFileId(f) !== getMetaFileId(file))
                : [...prev, file]
        );
    };

    const isIgSelected = (post) => selectedIgPosts.some((p) => p.id === post.id);

    const toggleIgPost = (post) => {
        setSelectedIgPosts((prev) =>
            prev.some((p) => p.id === post.id)
                ? prev.filter((p) => p.id !== post.id)
                : [...prev, post]
        );
    };

    const handleImport = () => {
        console.log('handleImport debug:', {
            mediaSource,
            selectedIgPosts,
            selectedIgPostsLength: selectedIgPosts.length,
            selectedMetaFilesLength: selectedMetaFiles.length,
        });

        if (mediaSource === 'meta_library') {
            const existingIds = new Set(importedFiles.map(getMetaFileId));
            const newFiles = selectedMetaFiles.filter((f) => !existingIds.has(getMetaFileId(f)));
            setImportedFiles((prev) => [...prev, ...newFiles]);
            toast.success(`Imported ${newFiles.length} file${newFiles.length !== 1 ? 's' : ''} from Meta library`);
        } else {
            const mapped = selectedIgPosts.map((post) => ({
                source_instagram_media_id: post.id,
                ad_name: post.caption ? post.caption.substring(0, 60) : `IG Post ${post.id}`,
                caption: post.caption || '',
                media_type: post.type,
                previewUrl: post.previewUrl || post.thumbnail_url || post.media_url,
                permalink: post.permalink,
            }));
            const existingIds = new Set(selectedIgOrganicPosts.map((p) => p.source_instagram_media_id));
            const newPosts = mapped.filter((p) => !existingIds.has(p.source_instagram_media_id));
            setSelectedIgOrganicPosts((prev) => [...prev, ...newPosts]);
            toast.success(`Imported ${newPosts.length} Instagram post${newPosts.length !== 1 ? 's' : ''}`);
        }
        setIsOpen(false);
    };

    const isLoading = mediaSource === 'meta_library' ? loadingMeta : loadingIg;
    const displayItems = (() => {
        if (mediaSource === 'meta_library') {
            return activeTab === 'images' ? metaImages : metaVideos;
        }
        const items = activeTab === 'images' ? igImages : igVideos;
        return filterCollaborators ? items.filter(item => item.collaborators && item.collaborators.length > 0) : items;
    })();


    const selectionCount =
        mediaSource === 'meta_library' ? selectedMetaFiles.length : selectedIgPosts.length;

    if (!isOpen) {
        return (
            <Button
                type="button"
                size="sm"
                disabled={!isLoggedIn}
                className="rounded-xl flex items-center gap-2 bg-zinc-700 hover:bg-zinc-800 text-white hover:text-white"
                onClick={() => {
                    if (!adAccountId) {
                        toast.error("Please select an ad account");
                        return;
                    }
                    openModal();
                }}
            >
                <FolderOpen className="h-4 w-4 text-white hover:text-white" />
                Import From Meta
            </Button>
        );
    }

    // NEW:
    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-50"
                onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[80vh] rounded-3xl bg-white p-6 shadow-lg flex flex-col">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        {mediaSource === 'meta_library' ? 'Meta Media Library' : 'Instagram Posts'}
                    </h2>
                    <div className="flex items-center gap-2">
                        <Select value={mediaSource} onValueChange={handleSourceChange}>
                            <SelectTrigger className="w-[200px] rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white rounded-lg">
                                <SelectItem value="instagram" className="rounded-lg cursor-pointer">Instagram Posts</SelectItem>
                                <SelectItem value="meta_library" className="rounded-lg cursor-pointer">Meta Media Library</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (mediaSource === 'instagram') {
                                    fetchInstagramPosts(true);
                                } else {
                                    fetchMetaLibrary();
                                }
                            }}
                            disabled={mediaSource === 'instagram' ? loadingIg : loadingMeta}
                            className="rounded-xl h-9 px-3 flex items-center gap-1.5"
                        >
                            {(mediaSource === 'instagram' ? loadingIg : loadingMeta) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>↻ Refresh</>
                            )}
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1">
                        <TabsTrigger value="images" className="rounded-xl flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            {mediaSource === 'instagram' ? 'Posts (Image)' : 'Images'} ({mediaSource === 'meta_library' ? metaImages.length : igImages.length})
                        </TabsTrigger>
                        <TabsTrigger value="videos" className="rounded-xl flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            {mediaSource === 'instagram' ? 'Reels / Videos' : 'Videos'} ({mediaSource === 'meta_library' ? metaVideos.length : igVideos.length})
                        </TabsTrigger>
                    </TabsList>
                    {mediaSource === 'instagram' && (
                        <div className="flex items-center gap-2 mt-3 mb-1 px-1">
                            <Checkbox
                                id="collab-filter"
                                checked={filterCollaborators}
                                onCheckedChange={(checked) => setFilterCollaborators(!!checked)}
                                className="rounded-md h-4 w-4 border-gray-300"
                            />
                            <label htmlFor="collab-filter" className="text-xs font-medium text-gray-700 flex items-center gap-1 cursor-pointer">
                                <Users className="h-3.5 w-3.5" /> Show only posts with collaborators
                            </label>
                        </div>
                    )}

                    <TabsContent value="images" className="mt-4 flex-1 overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : displayItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                                <p>{mediaSource === 'instagram' && !instagramAccountId
                                    ? 'No Instagram account selected. Please select one first.'
                                    : 'No images found.'}</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[400px] pr-4 outline-none focus:outline-none">
                                <div className="grid grid-cols-4 gap-3">
                                    {displayItems.map((item) => {
                                        const isMeta = mediaSource === 'meta_library';
                                        const selected = isMeta ? isMetaSelected(item) : isIgSelected(item);
                                        const preview = item.previewUrl || item.thumbnail_url || item.url || item.media_url || '';
                                        const itemId = isMeta ? getMetaFileId(item) : item.id;
                                        const label = isMeta
                                            ? item.name
                                            : item.caption
                                                ? item.caption.length > 50 ? item.caption.substring(0, 50) + '…' : item.caption
                                                : item.name;



                                        return (
                                            <label key={itemId} className="relative cursor-pointer group">
                                                <div className={`rounded-xl overflow-hidden border transition-all ${selected
                                                    ? 'border-primary ring-2 ring-primary/30'
                                                    : 'border-gray-200 hover:border-primary/50'
                                                    }`}>
                                                    <div className="relative aspect-square bg-gray-800">
                                                        {preview ? (
                                                            <img
                                                                src={preview}
                                                                alt={label}
                                                                loading="lazy"
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                                                                No Preview
                                                            </div>
                                                        )}
                                                        <Checkbox
                                                            checked={selected}
                                                            onCheckedChange={() => isMeta ? toggleMetaFile(item) : toggleIgPost(item)}
                                                            className="absolute top-2 right-2 rounded-md h-5 w-5 bg-white/80 border-gray-300"
                                                        />
                                                    </div>
                                                    {!isMeta ? (
                                                        <div className="bg-white border-t border-gray-200 px-2.5 py-2">
                                                            {item.like_count !== undefined && (
                                                                <div className="flex items-center gap-3 text-black mb-1">
                                                                    <span className="flex items-center gap-1 text-xs font-medium">
                                                                        <Heart className="h-3.5 w-3.5" /> {item.like_count}
                                                                    </span>
                                                                    <span className="flex items-center gap-1 text-xs font-medium">
                                                                        <MessageCircle className="h-3.5 w-3.5" /> {item.comments_count || 0}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {item.caption && (
                                                                <p className="text-xs text-gray-700 line-clamp-3 text-left">
                                                                    {item.caption}
                                                                </p>
                                                            )}
                                                            {item.collaborators && item.collaborators.length > 0 && (
                                                                <p className="text-xs text-purple-600 font-medium mt-1">
                                                                    {item.username ? `@${item.username}` : ''} · Collaborator{item.collaborators.length > 1 ? 's' : ''}: {item.collaborators.map(c => `@${c.username}`).join(', ')}
                                                                </p>
                                                            )}


                                                            {item.permalink && (

                                                                <a href={item.permalink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-blue-500 font-medium mt-1 inline-block"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    View Post
                                                                </a>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="mt-1 text-xs text-gray-700 truncate text-center px-1 py-1">
                                                            {label || 'Untitled'}
                                                        </p>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                {/* Load More for images */}
                                {mediaSource === 'meta_library' && metaImagesPagination.hasMore && (
                                    <div className="flex justify-center pt-4">
                                        <Button
                                            type="button"
                                            onClick={loadMoreMetaImages}
                                            disabled={loadingMoreMetaImages}
                                            className="w-full rounded-xl bg-zinc-700 text-white hover:bg-zinc-800 hover:text-white"
                                        >
                                            {loadingMoreMetaImages ? (
                                                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading...</>
                                            ) : "Load More"}
                                        </Button>
                                    </div>
                                )}
                                {mediaSource === 'instagram' && igPagination.hasMore && (
                                    <div className="flex justify-center pt-4">
                                        <Button
                                            type="button"
                                            onClick={loadMoreIg}
                                            disabled={loadingMoreIg}
                                            className="w-full rounded-xl bg-zinc-700 text-white hover:bg-zinc-800 hover:text-white"
                                        >
                                            {loadingMoreIg ? (
                                                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading...</>
                                            ) : "Load More"}
                                        </Button>
                                    </div>
                                )}
                            </ScrollArea>
                        )}
                    </TabsContent>

                    <TabsContent value="videos" className="mt-4 flex-1 overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : displayItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <Video className="h-12 w-12 mb-2 opacity-50" />
                                <p>No videos found.</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[400px] pr-4 outline-none focus:outline-none">
                                <div className="grid grid-cols-4 gap-3">
                                    {displayItems.map((item) => {
                                        const isMeta = mediaSource === 'meta_library';
                                        const selected = isMeta ? isMetaSelected(item) : isIgSelected(item);
                                        const preview = item.previewUrl || item.thumbnail_url || item.url || item.media_url || '';
                                        const itemId = isMeta ? getMetaFileId(item) : item.id;
                                        const label = isMeta
                                            ? item.name
                                            : item.caption
                                                ? item.caption.length > 50 ? item.caption.substring(0, 50) + '…' : item.caption
                                                : item.name;


                                        return (
                                            <label key={itemId} className="relative cursor-pointer group">
                                                <div className={`rounded-xl overflow-hidden border transition-all ${selected
                                                    ? 'border-primary ring-2 ring-primary/30'
                                                    : 'border-gray-200 hover:border-primary/50'
                                                    }`}>
                                                    <div className="relative aspect-square bg-gray-800">
                                                        {preview ? (
                                                            <img
                                                                src={preview}
                                                                alt={label}
                                                                loading="lazy"
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center">
                                                                <Video className="h-8 w-8 text-gray-400" />
                                                            </div>
                                                        )}
                                                        <Checkbox
                                                            checked={selected}
                                                            onCheckedChange={() => isMeta ? toggleMetaFile(item) : toggleIgPost(item)}
                                                            className="absolute top-2 right-2 rounded-md h-5 w-5 bg-white/80 border-gray-300"
                                                        />
                                                    </div>
                                                    {!isMeta ? (
                                                        <div className="bg-white border-t border-gray-200 px-2.5 py-2">
                                                            {item.like_count !== undefined && (
                                                                <div className="flex items-center gap-3 text-black mb-1">
                                                                    <span className="flex items-center gap-1 text-xs font-medium">
                                                                        <Heart className="h-3.5 w-3.5" /> {item.like_count}
                                                                    </span>
                                                                    <span className="flex items-center gap-1 text-xs font-medium">
                                                                        <MessageCircle className="h-3.5 w-3.5" /> {item.comments_count || 0}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {item.caption && (
                                                                <p className="text-xs text-gray-700 line-clamp-3 text-left">
                                                                    {item.caption}
                                                                </p>
                                                            )}

                                                            {item.collaborators && item.collaborators.length > 0 && (
                                                                <p className="text-xs text-purple-600 font-medium mt-1">
                                                                    {item.username ? `@${item.username}` : ''} · Collaborator{item.collaborators.length > 1 ? 's' : ''}: {item.collaborators.map(c => `@${c.username}`).join(', ')}
                                                                </p>
                                                            )}


                                                            {item.permalink && (

                                                                <a href={item.permalink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-blue-500 font-medium mt-1 inline-block"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    View Post
                                                                </a>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="mt-1 text-xs text-gray-700 truncate text-center px-1 py-1">
                                                            {label || 'Untitled'}
                                                        </p>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                {/* Load More for videos */}
                                {mediaSource === 'meta_library' && metaVideosPagination.hasMore && (
                                    <div className="flex justify-center pt-4">
                                        <Button
                                            type="button"
                                            onClick={loadMoreMetaVideos}
                                            disabled={loadingMoreMetaVideos}
                                            className="w-full rounded-xl bg-zinc-700 text-white hover:bg-zinc-800 hover:text-white"
                                        >
                                            {loadingMoreMetaVideos ? (
                                                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading...</>
                                            ) : "Load More"}
                                        </Button>
                                    </div>
                                )}
                                {mediaSource === 'instagram' && igPagination.hasMore && (
                                    <div className="flex justify-center pt-4">
                                        <Button
                                            type="button"
                                            onClick={loadMoreIg}
                                            disabled={loadingMoreIg}
                                            className="w-full rounded-xl bg-zinc-700 text-white hover:bg-zinc-800 hover:text-white"
                                        >
                                            {loadingMoreIg ? (
                                                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading...</>
                                            ) : "Load More"}
                                        </Button>
                                    </div>
                                )}
                            </ScrollArea>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Footer */}
                <div className="flex justify-between items-center gap-3 mt-4 pt-4 border-t">
                    <div>
                        {selectionCount > 0 && (
                            <span className="text-sm text-primary font-medium">
                                {selectionCount} selected
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={selectionCount === 0}
                            className="rounded-xl"
                        >
                            Import ({selectionCount})
                        </Button>
                    </div>
                </div>
            </div >
        </>
    );
}