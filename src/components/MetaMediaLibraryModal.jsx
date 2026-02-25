// import { useState, useEffect } from "react";
// import axios from "axios"
// import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Checkbox } from "@/components/ui/checkbox";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Loader2, Image as ImageIcon, Video, FolderOpen } from "lucide-react";
// import { toast } from "sonner";

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

// export function MetaMediaLibraryModal({
//     adAccountId,
//     isLoggedIn,
//     importedFiles,
//     setImportedFiles,
// }) {
//     const [open, setOpen] = useState(false);
//     const [activeTab, setActiveTab] = useState("static");

//     // Images state
//     const [images, setImages] = useState([]);
//     const [imagesPagination, setImagesPagination] = useState({ hasMore: false, nextCursor: null });
//     const [loadingImages, setLoadingImages] = useState(false);
//     const [loadingMoreImages, setLoadingMoreImages] = useState(false);

//     // Videos state
//     const [videos, setVideos] = useState([]);
//     const [videosPagination, setVideosPagination] = useState({ hasMore: false, nextCursor: null });
//     const [loadingVideos, setLoadingVideos] = useState(false);
//     const [loadingMoreVideos, setLoadingMoreVideos] = useState(false);

//     // Selection state
//     const [selectedImages, setSelectedImages] = useState(new Set());
//     const [selectedVideos, setSelectedVideos] = useState(new Set());

//     const fetchImages = async (cursor) => {
//         if (!adAccountId) return;

//         if (cursor) {
//             setLoadingMoreImages(true);
//         } else {
//             setLoadingImages(true);
//             setImages([]);
//         }

//         try {
//             const params = { adAccountId };
//             if (cursor) {
//                 params.after = cursor;
//             }

//             const response = await axios.get(`${API_BASE_URL}/auth/library-images`, {
//                 params,
//                 withCredentials: true,
//             });

//             const data = response.data;

//             if (data.success) {
//                 if (cursor) {
//                     setImages(prev => [...prev, ...data.data]);
//                 } else {
//                     setImages(data.data);
//                 }
//                 setImagesPagination(data.pagination);
//             } else {
//                 toast.error("Failed to fetch images: " + data.error);
//             }
//         } catch (error) {
//             toast.error("Failed to fetch images");
//             console.error(error);
//         } finally {
//             setLoadingImages(false);
//             setLoadingMoreImages(false);
//         }
//     };

//     const fetchVideos = async (cursor) => {
//         if (!adAccountId) return;

//         if (cursor) {
//             setLoadingMoreVideos(true);
//         } else {
//             setLoadingVideos(true);
//             setVideos([]);
//         }

//         try {
//             const params = { adAccountId };
//             if (cursor) {
//                 params.after = cursor;
//             }

//             const response = await axios.get(`${API_BASE_URL}/auth/library-videos`, {
//                 params,
//                 withCredentials: true,
//             });

//             const data = response.data;

//             if (data.success) {
//                 if (cursor) {
//                     setVideos(prev => [...prev, ...data.data]);
//                 } else {
//                     setVideos(data.data);
//                 }
//                 setVideosPagination(data.pagination);
//             } else {
//                 toast.error("Failed to fetch videos: " + data.error);
//             }
//         } catch (error) {
//             toast.error("Failed to fetch videos");
//             console.error(error);
//         } finally {
//             setLoadingVideos(false);
//             setLoadingMoreVideos(false);
//         }
//     };

//     useEffect(() => {
//         if (open) {
//             fetchImages();
//             fetchVideos();
//             // Reset selections when modal opens
//             setSelectedImages(new Set());
//             setSelectedVideos(new Set());
//         }
//     }, [open, adAccountId]);

//     const toggleImageSelection = (hash) => {
//         const newSelection = new Set(selectedImages);
//         if (newSelection.has(hash)) {
//             newSelection.delete(hash);
//         } else {
//             newSelection.add(hash);
//         }
//         setSelectedImages(newSelection);
//     };

//     const toggleVideoSelection = (id) => {
//         const newSelection = new Set(selectedVideos);
//         if (newSelection.has(id)) {
//             newSelection.delete(id);
//         } else {
//             newSelection.add(id);
//         }
//         setSelectedVideos(newSelection);
//     };

//     const handleImport = () => {
//         const selectedImagesList = images.filter((img) =>
//             selectedImages.has(img.hash)
//         );
//         const selectedVideosList = videos.filter((vid) =>
//             selectedVideos.has(vid.id)
//         );

//         const totalSelected = selectedImagesList.length + selectedVideosList.length;

//         if (totalSelected === 0) {
//             toast.warning("Please select at least one item to import");
//             return;
//         }

//         // Convert to importedFiles format with type property
//         const newImportedFiles = [
//             ...selectedImagesList.map(img => ({
//                 type: "image",
//                 url: img.url,
//                 name: img.name,
//                 hash: img.hash,
//                 created_time: img.created_time,
//                 source: "meta_library",
//                 width: img.width,
//                 height: img.height,
//             })),
//             ...selectedVideosList.map(vid => ({
//                 type: "video",
//                 id: vid.id,
//                 name: vid.title,
//                 thumbnail_url: vid.thumbnail_url,
//                 created_time: vid.created_time,
//                 source: "meta_library",
//                 width: vid.width,
//                 height: vid.height,
//             })),
//         ];

//         // Add to parent's importedFiles state
//         setImportedFiles(prev => [...prev, ...newImportedFiles]);
//         // Reset selections and close modal
//         setSelectedImages(new Set());
//         setSelectedVideos(new Set());
//         setOpen(false);
//     };

//     const handleLoadMoreImages = () => {
//         if (imagesPagination.nextCursor) {
//             fetchImages(imagesPagination.nextCursor);
//         }
//     };

//     const handleLoadMoreVideos = () => {
//         if (videosPagination.nextCursor) {
//             fetchVideos(videosPagination.nextCursor);
//         }
//     };

//     return (
//         <>
//             <Button
//                 type="button"
//                 size="sm"
//                 disabled={!isLoggedIn}
//                 className="rounded-xl flex items-center gap-2 bg-zinc-700 hover:bg-zinc-800 text-white hover:text-white"
//                 onClick={() => {
//                     if (!adAccountId) {
//                         toast.error("Please select an ad account");
//                         return;
//                     }
//                     setOpen(true);
//                 }}
//             >
//                 <FolderOpen className="h-4 w-4 text-white hover:text-white" />
//                 Import From Meta Media Library
//             </Button>

//             {open && (
//                 <>
//                     {/* Overlay */}
//                     <div
//                         className="fixed inset-0 bg-black/50 z-50"
//                         onClick={() => setOpen(false)}
//                     />

//                     {/* Modal */}
//                     <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[80vh] rounded-3xl bg-white p-6 shadow-lg">
//                         {/* Header */}
//                         <div className="mb-4">
//                             <h2 className="text-lg font-semibold flex items-center gap-2">
//                                 <FolderOpen className="h-4 w-4" />
//                                 Meta Media Library
//                             </h2>
//                         </div>

//                         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//                             <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1">
//                                 <TabsTrigger
//                                     value="static"
//                                     className="rounded-xl flex items-center gap-2"
//                                 >
//                                     <ImageIcon className="h-4 w-4" />
//                                     Static ({images.length})
//                                 </TabsTrigger>
//                                 <TabsTrigger
//                                     value="video"
//                                     className="rounded-xl flex items-center gap-2"
//                                 >
//                                     <Video className="h-4 w-4" />
//                                     Video ({videos.length})
//                                 </TabsTrigger>
//                             </TabsList>

//                             <TabsContent value="static" className="mt-4">
//                                 {loadingImages ? (
//                                     <div className="flex items-center justify-center py-12">
//                                         <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
//                                     </div>
//                                 ) : images.length === 0 ? (
//                                     <div className="flex flex-col items-center justify-center py-12 text-gray-500">
//                                         <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
//                                         <p>No images found in your media library</p>
//                                     </div>
//                                 ) : (
//                                     <>
//                                         <ScrollArea className="h-[600px] pr-4 outline-none focus:outline-none">
//                                             <div className="grid grid-cols-5 gap-3">
//                                                 {images.map((image) => (
//                                                     <label
//                                                         key={image.hash}
//                                                         className="relative cursor-pointer group"
//                                                     >
//                                                         <div className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${selectedImages.has(image.hash)
//                                                             ? "border-primary ring-2 ring-primary/30"
//                                                             : "border-gray-200 hover:border-primary/50"
//                                                             }`}>
//                                                             <img
//                                                                 src={image.url}
//                                                                 alt={image.name}
//                                                                 className="h-full w-full object-cover"
//                                                                 onError={(e) => {
//                                                                     e.target.src =
//                                                                         "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E";
//                                                                 }}
//                                                             />
//                                                             <Checkbox
//                                                                 checked={selectedImages.has(image.hash)}
//                                                                 onCheckedChange={() => toggleImageSelection(image.hash)}
//                                                                 className="absolute top-2 right-2 rounded-md h-5 w-5 bg-white/80 border-gray-300"
//                                                             />
//                                                         </div>
//                                                         <p className="mt-1 text-xs text-gray-700 truncate text-center px-1">
//                                                             {image.name || "Untitled"}
//                                                         </p>
//                                                     </label>
//                                                 ))}
//                                             </div>

//                                             {/* Load More Button */}
//                                             {imagesPagination.hasMore && (
//                                                 <div className="flex justify-center pt-4">
//                                                     <Button
//                                                         type="button"
//                                                         onClick={handleLoadMoreImages}
//                                                         disabled={loadingMoreImages}
//                                                         className="w-full rounded-xl bg-zinc-700 text-white hover:bg-zinc-800 hover:text-white"
//                                                     >
//                                                         {loadingMoreImages ? (
//                                                             <>
//                                                                 <Loader2 className="h-4 w-4 animate-spin mr-2" />
//                                                                 Loading...
//                                                             </>
//                                                         ) : (
//                                                             "Load More"
//                                                         )}
//                                                     </Button>
//                                                 </div>
//                                             )}
//                                         </ScrollArea>
//                                     </>
//                                 )}
//                             </TabsContent>

//                             <TabsContent value="video" className="mt-4">
//                                 {loadingVideos ? (
//                                     <div className="flex items-center justify-center py-12">
//                                         <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
//                                     </div>
//                                 ) : videos.length === 0 ? (
//                                     <div className="flex flex-col items-center justify-center py-12 text-gray-500">
//                                         <Video className="h-12 w-12 mb-2 opacity-50" />
//                                         <p>No videos found in your media library</p>
//                                     </div>
//                                 ) : (
//                                     <>
//                                         <ScrollArea className="h-[600px] pr-4 outline-none focus:outline-none">
//                                             <div className="grid grid-cols-5 gap-3">
//                                                 {videos.map((video) => (
//                                                     <label
//                                                         key={video.id}
//                                                         className="relative cursor-pointer group"
//                                                     >
//                                                         <div className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all bg-gray-800 ${selectedVideos.has(video.id)
//                                                             ? "border-primary ring-2 ring-primary/30"
//                                                             : "border-gray-200 hover:border-primary/50"
//                                                             }`}>
//                                                             {video.thumbnail_url ? (
//                                                                 <img
//                                                                     src={video.thumbnail_url}
//                                                                     alt={video.title}
//                                                                     className="h-full w-full object-cover"
//                                                                 />
//                                                             ) : (
//                                                                 <div className="h-full w-full flex items-center justify-center">
//                                                                     <Video className="h-8 w-8 text-gray-400" />
//                                                                 </div>
//                                                             )}
//                                                             <Checkbox
//                                                                 checked={selectedVideos.has(video.id)}
//                                                                 onCheckedChange={() => toggleVideoSelection(video.id)}
//                                                                 className="absolute top-2 right-2 rounded-md h-5 w-5 bg-white/80 border-gray-300"
//                                                             />
//                                                         </div>
//                                                         <p className="mt-1 text-xs text-gray-700 truncate text-center px-1">
//                                                             {video.title || "Untitled"}
//                                                         </p>
//                                                     </label>
//                                                 ))}
//                                             </div>

//                                             {/* Load More Button */}
//                                             {videosPagination.hasMore && (
//                                                 <div className="flex justify-center pt-4">
//                                                     <Button
//                                                         type="button"
//                                                         onClick={handleLoadMoreVideos}
//                                                         disabled={loadingMoreVideos}
//                                                         className="w-full rounded-xl bg-zinc-700 text-white hover:bg-zinc-800 hover:text-white"
//                                                     >
//                                                         {loadingMoreVideos ? (
//                                                             <>
//                                                                 <Loader2 className="h-4 w-4 animate-spin mr-2" />
//                                                                 Loading...
//                                                             </>
//                                                         ) : (
//                                                             "Load More"
//                                                         )}
//                                                     </Button>
//                                                 </div>
//                                             )}
//                                         </ScrollArea>
//                                     </>
//                                 )}
//                             </TabsContent>
//                         </Tabs>

//                         <div className="flex justify-end gap-3 mt-4 pt-4">
//                             <Button
//                                 variant="outline"
//                                 onClick={() => setOpen(false)}
//                                 className="rounded-xl"
//                             >
//                                 Cancel
//                             </Button>
//                             <Button
//                                 onClick={handleImport}
//                                 disabled={selectedImages.size === 0 && selectedVideos.size === 0}
//                                 className="rounded-xl"
//                             >
//                                 Import ({selectedImages.size + selectedVideos.size})
//                             </Button>
//                         </div>
//                     </div>
//                 </>
//             )}
//         </>
//     );
// }

import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from "sonner"
import { Loader2, Image as ImageIcon, Video, FolderOpen } from "lucide-react";
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
    const [mediaSource, setMediaSource] = useState('meta_library');
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
    const [igPagination, setIgPagination] = useState({ hasMore: false, nextCursor: null });
    const [loadingMoreMetaImages, setLoadingMoreMetaImages] = useState(false);
    const [loadingMoreMetaVideos, setLoadingMoreMetaVideos] = useState(false);
    const [loadingMoreIg, setLoadingMoreIg] = useState(false);

    const mapMetaImages = (rawImages) => rawImages.map(img => ({
        type: 'image',
        hash: img.hash,
        name: img.name,
        width: img.width,
        height: img.height,
        previewUrl: img.url,
    }));

    const mapMetaVideos = (rawVideos) => rawVideos.map(vid => ({
        type: 'video',
        id: vid.id,
        name: vid.title || `Video ${vid.id}`,
        width: vid.width,
        height: vid.height,
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
            setMetaImages(prev => [...prev, ...mapMetaImages(res.data?.data || [])]);
            setMetaImagesPagination(res.data?.pagination || { hasMore: false, nextCursor: null });
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
            setMetaVideos(prev => [...prev, ...mapMetaVideos(res.data?.data || [])]);
            setMetaVideosPagination(res.data?.pagination || { hasMore: false, nextCursor: null });
        } catch (err) {
            console.error('Error loading more videos:', err);
            toast.error('Failed to load more videos');
        } finally {
            setLoadingMoreMetaVideos(false);
        }
    }, [adAccountId, metaVideosPagination.nextCursor]);

    const fetchInstagramPosts = useCallback(async () => {
        if (!instagramAccountId) {
            toast.error('Please select an Instagram account first');
            setMediaSource('meta_library');
            return;
        }
        setLoadingIg(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/auth/instagram-media`, {
                params: { igUserId: instagramAccountId },
                withCredentials: true,
            });
            setIgImages(res.data?.images || []);
            setIgVideos(res.data?.videos || []);
            setIgPagination(res.data?.pagination || { hasMore: false, nextCursor: null });
        } catch (err) {
            console.error('Error fetching IG posts:', err);
            toast.error(err.response?.data?.error || 'Failed to load Instagram posts');
        } finally {
            setLoadingIg(false);
        }
    }, [instagramAccountId]);

    const loadMoreIg = useCallback(async () => {
        if (!igPagination.nextCursor) return;
        setLoadingMoreIg(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/auth/instagram-media`, {
                params: { igUserId: instagramAccountId, after: igPagination.nextCursor },
                withCredentials: true,
            });
            setIgImages(prev => [...prev, ...(res.data?.images || [])]);
            setIgVideos(prev => [...prev, ...(res.data?.videos || [])]);
            setIgPagination(res.data?.pagination || { hasMore: false, nextCursor: null });
        } catch (err) {
            console.error('Error loading more IG posts:', err);
            toast.error('Failed to load more Instagram posts');
        } finally {
            setLoadingMoreIg(false);
        }
    }, [instagramAccountId, igPagination.nextCursor]);

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
    const displayItems =
        mediaSource === 'meta_library'
            ? activeTab === 'images' ? metaImages : metaVideos
            : activeTab === 'images' ? igImages : igVideos;
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
                Import From Meta Media Library
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
                    <Select value={mediaSource} onValueChange={handleSourceChange}>
                        <SelectTrigger className="w-[200px] rounded-xl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                            <SelectItem value="meta_library">Meta Media Library</SelectItem>
                            <SelectItem value="instagram">Instagram Posts</SelectItem>
                        </SelectContent>
                    </Select>
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
                                <div className="grid grid-cols-5 gap-3">
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
                                                <div className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${selected
                                                    ? 'border-primary ring-2 ring-primary/30'
                                                    : 'border-gray-200 hover:border-primary/50'
                                                    }`}>
                                                    {preview ? (
                                                        <img
                                                            src={preview}
                                                            alt={label}
                                                            loading="lazy"
                                                            className="h-full w-full object-cover"
                                                            onError={(e) => {
                                                                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E";
                                                            }}
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
                                                <p className="mt-1 text-xs text-gray-700 truncate text-center px-1">
                                                    {label || 'Untitled'}
                                                </p>
                                                {!isMeta && item.like_count !== undefined && (
                                                    <p className="mt-0.5 text-[10px] text-gray-400 text-center">
                                                        ♥ {item.like_count} &nbsp;💬 {item.comments_count || 0}
                                                    </p>
                                                )}
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
                        ) : (mediaSource === 'meta_library' ? metaVideos : igVideos).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <Video className="h-12 w-12 mb-2 opacity-50" />
                                <p>No videos found.</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[400px] pr-4 outline-none focus:outline-none">
                                <div className="grid grid-cols-5 gap-3">
                                    {(mediaSource === 'meta_library' ? metaVideos : igVideos).map((item) => {
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
                                                <div className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all bg-gray-800 ${selected
                                                    ? 'border-primary ring-2 ring-primary/30'
                                                    : 'border-gray-200 hover:border-primary/50'
                                                    }`}>
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
                                                <p className="mt-1 text-xs text-gray-700 truncate text-center px-1">
                                                    {label || 'Untitled'}
                                                </p>
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
            </div>
        </>
    );
}