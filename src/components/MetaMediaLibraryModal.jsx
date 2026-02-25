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

    const fetchMetaLibrary = useCallback(async () => {
        if (!adAccountId) return;
        setLoadingMeta(true);
        try {
            const imgRes = await axios.get(`${API_BASE_URL}/auth/library-images`, {
                params: { adAccountId },
                withCredentials: true,
            });
            const rawImages = imgRes.data?.data || [];
            setMetaImages(rawImages.map(img => ({
                type: 'image',
                hash: img.hash,
                name: img.name,
                width: img.width,
                height: img.height,
                previewUrl: img.url,
            })));

            const vidRes = await axios.get(`${API_BASE_URL}/auth/library-videos`, {
                params: { adAccountId },
                withCredentials: true,
            });
            const rawVideos = vidRes.data?.data || [];
            setMetaVideos(rawVideos.map(vid => ({
                type: 'video',
                id: vid.id,
                name: vid.title || `Video ${vid.id}`,
                width: vid.width,
                height: vid.height,
                previewUrl: vid.thumbnail_url,
            })));
        } catch (err) {
            console.error('Error fetching Meta library:', err);
            toast.error('Failed to load Meta media library');
        } finally {
            setLoadingMeta(false);
        }
    }, [adAccountId]);

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
        } catch (err) {
            console.error('Error fetching IG posts:', err);
            toast.error(err.response?.data?.error || 'Failed to load Instagram posts');
        } finally {
            setLoadingIg(false);
        }
    }, [instagramAccountId]);

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
            <button
                type="button"
                onClick={openModal}
                disabled={!isLoggedIn}
                className="rounded-xl flex items-center gap-2 bg-zinc-700 hover:bg-zinc-800 text-white hover:text-white"

            >
                <FolderOpen className="h-4 w-4 text-white hover:text-white" />
                Import from Library
            </button>
        );
    }

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
            onClick={() => setIsOpen(false)}
        >
            <div
                className="bg-white rounded-xl w-[90vw] max-w-[860px] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900">
                        {mediaSource === 'meta_library' ? 'Meta Media Library' : 'Instagram Posts'}
                    </h3>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md px-2 py-1 text-lg transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-5 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('images')}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'images'
                            ? 'text-blue-600 border-blue-600'
                            : 'text-gray-500 border-transparent hover:text-gray-700'
                            }`}
                    >
                        {mediaSource === 'instagram' ? 'Posts (Image)' : 'Images'}
                    </button>
                    <button
                        onClick={() => setActiveTab('videos')}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'videos'
                            ? 'text-blue-600 border-blue-600'
                            : 'text-gray-500 border-transparent hover:text-gray-700'
                            }`}
                    >
                        {mediaSource === 'instagram' ? 'Reels / Videos' : 'Videos'}
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 min-h-[300px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-gray-500 gap-3">
                            <div className="w-7 h-7 border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-sm">Loading…</p>
                        </div>
                    ) : displayItems.length === 0 ? (
                        <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
                            {mediaSource === 'instagram' && !instagramAccountId
                                ? 'No Instagram account selected. Please select one first.'
                                : `No ${activeTab} found.`}
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                            {displayItems.map((item) => {
                                const isMeta = mediaSource === 'meta_library';
                                const selected = isMeta ? isMetaSelected(item) : isIgSelected(item);
                                const preview = item.previewUrl || item.thumbnail_url || item.url || item.media_url || '';
                                const isVideo = item.type === 'video';
                                const itemId = isMeta ? getMetaFileId(item) : item.id;
                                const label = isMeta
                                    ? item.name
                                    : item.caption
                                        ? item.caption.length > 50 ? item.caption.substring(0, 50) + '…' : item.caption
                                        : item.name;

                                return (
                                    <div
                                        key={itemId}
                                        onClick={() => isMeta ? toggleMetaFile(item) : toggleIgPost(item)}
                                        className={`cursor-pointer rounded-lg border-2 p-1 transition-all ${selected
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-transparent hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="relative w-full aspect-square rounded-md overflow-hidden bg-gray-100">
                                            {isVideo && (
                                                <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded z-10">
                                                    ▶
                                                </span>
                                            )}
                                            {preview ? (
                                                <img
                                                    src={preview}
                                                    alt={label}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                                    No Preview
                                                </div>
                                            )}
                                            {selected && (
                                                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold z-10">
                                                    ✓
                                                </div>
                                            )}
                                        </div>

                                        <p className="mt-1.5 text-[11px] text-gray-700 truncate" title={label}>
                                            {label}
                                        </p>

                                        {!isMeta && item.like_count !== undefined && (
                                            <p className="mt-0.5 text-[10px] text-gray-400">
                                                ♥ {item.like_count} &nbsp;💬 {item.comments_count || 0}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <div>
                        {selectionCount > 0 && (
                            <span className="text-sm text-blue-600 font-medium">
                                {selectionCount} selected
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={mediaSource}
                            onChange={(e) => handleSourceChange(e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-700 cursor-pointer focus:outline-none focus:border-blue-500"
                        >
                            <option value="meta_library">Meta Media Library</option>
                            <option value="instagram">Instagram Posts</option>
                        </select>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-3.5 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={selectionCount === 0}
                            className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Import{selectionCount > 0 ? ` (${selectionCount})` : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}