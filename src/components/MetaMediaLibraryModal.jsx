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

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify'; // adjust if you use a different toast lib

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

/**
 * MetaMediaLibraryModal
 *
 * Usage in parent:
 * <MetaMediaLibraryModal
 *   adAccountId={selectedAdAccount}
 *   isLoggedIn={isLoggedIn}
 *   importedFiles={importedFiles}
 *   setImportedFiles={setImportedFiles}
 *   instagramAccountId={instagramAccountId}
 *   selectedIgOrganicPosts={selectedIgOrganicPosts}
 *   setSelectedIgOrganicPosts={setSelectedIgOrganicPosts}
 * />
 *
 * importedFiles shape (Meta Library):
 *   { type: 'image', hash, name, width, height, previewUrl }
 *   { type: 'video', id, name, width, height, previewUrl }
 *
 * selectedIgOrganicPosts shape (IG Posts):
 *   { source_instagram_media_id, ad_name, caption, media_type, previewUrl, permalink }
 */

export default function MetaMediaLibraryModal({
    adAccountId,
    isLoggedIn,
    importedFiles,
    setImportedFiles,
    instagramAccountId,
    selectedIgOrganicPosts = [],
    setSelectedIgOrganicPosts = () => { },
}) {
    // ─── Modal visibility ────────────────────────────────────────────
    const [isOpen, setIsOpen] = useState(false);

    // ─── Source switcher: 'meta_library' | 'instagram' ───────────────
    const [mediaSource, setMediaSource] = useState('meta_library');

    // ─── Tab: 'images' | 'videos' ───────────────────────────────────
    const [activeTab, setActiveTab] = useState('images');

    // ─── Meta Media Library state ────────────────────────────────────
    const [metaImages, setMetaImages] = useState([]);
    const [metaVideos, setMetaVideos] = useState([]);
    const [loadingMeta, setLoadingMeta] = useState(false);
    const [selectedMetaFiles, setSelectedMetaFiles] = useState([]); // working selection inside modal

    // ─── Instagram Posts state ───────────────────────────────────────
    const [igImages, setIgImages] = useState([]);
    const [igVideos, setIgVideos] = useState([]);
    const [loadingIg, setLoadingIg] = useState(false);
    const [selectedIgPosts, setSelectedIgPosts] = useState([]); // working selection inside modal

    // ─────────────────────────────────────────────────────────────────
    //  FETCH: Meta Media Library
    // ─────────────────────────────────────────────────────────────────
    const fetchMetaLibrary = useCallback(async () => {
        if (!adAccountId) return;
        setLoadingMeta(true);
        try {
            // Fetch images
            const imgRes = await axios.get(`${API_BASE_URL}/auth/library-images`, {
                params: { adAccountId },
                withCredentials: true,
            });
            setMetaImages(imgRes.data?.images || imgRes.data || []);

            // Fetch videos
            const vidRes = await axios.get(`${API_BASE_URL}/auth/library-videos`, {
                params: { adAccountId },
                withCredentials: true,
            });
            setMetaVideos(vidRes.data?.videos || vidRes.data || []);
        } catch (err) {
            console.error('Error fetching Meta library:', err);
            toast.error('Failed to load Meta media library');
        } finally {
            setLoadingMeta(false);
        }
    }, [adAccountId]);

    // ─────────────────────────────────────────────────────────────────
    //  FETCH: Instagram Posts
    // ─────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────
    //  Open modal → auto-fetch current source
    // ─────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────
    //  Source switcher handler
    // ─────────────────────────────────────────────────────────────────
    const handleSourceChange = (source) => {
        setMediaSource(source);
        setActiveTab('images'); // reset tab on switch
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

    // ─────────────────────────────────────────────────────────────────
    //  Selection helpers — Meta Library
    // ─────────────────────────────────────────────────────────────────
    const getMetaFileId = (file) => (file.type === 'image' ? file.hash : file.id);

    const isMetaSelected = (file) =>
        selectedMetaFiles.some((f) => getMetaFileId(f) === getMetaFileId(file));

    const toggleMetaFile = (file) => {
        setSelectedMetaFiles((prev) => {
            if (prev.some((f) => getMetaFileId(f) === getMetaFileId(file))) {
                return prev.filter((f) => getMetaFileId(f) !== getMetaFileId(file));
            }
            return [...prev, file];
        });
    };

    // ─────────────────────────────────────────────────────────────────
    //  Selection helpers — Instagram Posts
    // ─────────────────────────────────────────────────────────────────
    const isIgSelected = (post) => selectedIgPosts.some((p) => p.id === post.id);

    const toggleIgPost = (post) => {
        setSelectedIgPosts((prev) => {
            if (prev.some((p) => p.id === post.id)) {
                return prev.filter((p) => p.id !== post.id);
            }
            return [...prev, post];
        });
    };

    // ─────────────────────────────────────────────────────────────────
    //  Import / Confirm
    // ─────────────────────────────────────────────────────────────────
    const handleImport = () => {
        if (mediaSource === 'meta_library') {
            // Merge into parent importedFiles, avoiding duplicates
            const existingIds = new Set(importedFiles.map(getMetaFileId));
            const newFiles = selectedMetaFiles.filter((f) => !existingIds.has(getMetaFileId(f)));
            setImportedFiles((prev) => [...prev, ...newFiles]);
            toast.success(`Imported ${newFiles.length} file${newFiles.length !== 1 ? 's' : ''} from Meta library`);
        } else {
            // Map IG posts into the shape the ad creation flow expects
            const mapped = selectedIgPosts.map((post) => ({
                source_instagram_media_id: post.id,
                ad_name: post.caption
                    ? post.caption.substring(0, 60)
                    : `IG Post ${post.id}`,
                caption: post.caption || '',
                media_type: post.type, // 'image' | 'video'
                previewUrl: post.previewUrl || post.thumbnail_url || post.media_url,
                permalink: post.permalink,
            }));

            // Merge into parent, avoiding duplicates
            const existingIds = new Set(
                selectedIgOrganicPosts.map((p) => p.source_instagram_media_id)
            );
            const newPosts = mapped.filter(
                (p) => !existingIds.has(p.source_instagram_media_id)
            );
            setSelectedIgOrganicPosts((prev) => [...prev, ...newPosts]);
            toast.success(`Imported ${newPosts.length} Instagram post${newPosts.length !== 1 ? 's' : ''}`);
        }

        setIsOpen(false);
    };

    // ─────────────────────────────────────────────────────────────────
    //  Which items to display based on source + tab
    // ─────────────────────────────────────────────────────────────────
    const isLoading = mediaSource === 'meta_library' ? loadingMeta : loadingIg;

    const displayItems =
        mediaSource === 'meta_library'
            ? activeTab === 'images'
                ? metaImages
                : metaVideos
            : activeTab === 'images'
                ? igImages
                : igVideos;

    const selectionCount =
        mediaSource === 'meta_library'
            ? selectedMetaFiles.length
            : selectedIgPosts.length;

    // ─────────────────────────────────────────────────────────────────
    //  Render helpers
    // ─────────────────────────────────────────────────────────────────
    const renderMetaItem = (file) => {
        const selected = isMetaSelected(file);
        const preview =
            file.previewUrl ||
            file.thumbnail_url ||
            file.url ||
            file.media_url ||
            '';

        return (
            <div
                key={getMetaFileId(file)}
                className={`mml-grid-item ${selected ? 'mml-selected' : ''}`}
                onClick={() => toggleMetaFile(file)}
            >
                <div className="mml-thumb-wrapper">
                    {file.type === 'video' && (
                        <div className="mml-video-badge">▶</div>
                    )}
                    {preview ? (
                        <img src={preview} alt={file.name} loading="lazy" />
                    ) : (
                        <div className="mml-no-preview">No Preview</div>
                    )}
                    {selected && (
                        <div className="mml-check">✓</div>
                    )}
                </div>
                <p className="mml-item-name" title={file.name}>
                    {file.name}
                </p>
            </div>
        );
    };

    const renderIgItem = (post) => {
        const selected = isIgSelected(post);
        const preview = post.previewUrl || post.thumbnail_url || post.media_url || '';

        return (
            <div
                key={post.id}
                className={`mml-grid-item ${selected ? 'mml-selected' : ''}`}
                onClick={() => toggleIgPost(post)}
            >
                <div className="mml-thumb-wrapper">
                    {post.type === 'video' && (
                        <div className="mml-video-badge">▶</div>
                    )}
                    {preview ? (
                        <img src={preview} alt={post.name} loading="lazy" />
                    ) : (
                        <div className="mml-no-preview">No Preview</div>
                    )}
                    {selected && (
                        <div className="mml-check">✓</div>
                    )}
                </div>
                <p className="mml-item-name" title={post.caption || post.name}>
                    {post.caption
                        ? post.caption.length > 50
                            ? post.caption.substring(0, 50) + '…'
                            : post.caption
                        : post.name}
                </p>
                {post.like_count !== undefined && (
                    <p className="mml-item-meta">
                        ♥ {post.like_count} &nbsp;💬 {post.comments_count || 0}
                    </p>
                )}
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────────
    //  Component
    // ─────────────────────────────────────────────────────────────────
    if (!isOpen) {
        return (
            <button
                type="button"
                className="mml-open-btn"
                onClick={openModal}
                disabled={!isLoggedIn}
            >
                Import from Library
            </button>
        );
    }

    return (
        <div className="mml-overlay" onClick={() => setIsOpen(false)}>
            <div className="mml-modal" onClick={(e) => e.stopPropagation()}>
                {/* ── Header ──────────────────────────────────── */}
                <div className="mml-header">
                    <h3>
                        {mediaSource === 'meta_library'
                            ? 'Meta Media Library'
                            : 'Instagram Posts'}
                    </h3>
                    <button
                        className="mml-close-btn"
                        onClick={() => setIsOpen(false)}
                    >
                        ✕
                    </button>
                </div>

                {/* ── Tabs ────────────────────────────────────── */}
                <div className="mml-tabs">
                    <button
                        className={`mml-tab ${activeTab === 'images' ? 'mml-tab-active' : ''}`}
                        onClick={() => setActiveTab('images')}
                    >
                        {mediaSource === 'instagram' ? 'Posts (Image)' : 'Images'}
                    </button>
                    <button
                        className={`mml-tab ${activeTab === 'videos' ? 'mml-tab-active' : ''}`}
                        onClick={() => setActiveTab('videos')}
                    >
                        {mediaSource === 'instagram' ? 'Reels / Videos' : 'Videos'}
                    </button>
                </div>

                {/* ── Grid body ───────────────────────────────── */}
                <div className="mml-body">
                    {isLoading ? (
                        <div className="mml-loading">
                            <div className="mml-spinner" />
                            <p>Loading…</p>
                        </div>
                    ) : displayItems.length === 0 ? (
                        <div className="mml-empty">
                            <p>
                                {mediaSource === 'instagram' && !instagramAccountId
                                    ? 'No Instagram account selected. Please select one first.'
                                    : `No ${activeTab} found.`}
                            </p>
                        </div>
                    ) : (
                        <div className="mml-grid">
                            {displayItems.map((item) =>
                                mediaSource === 'meta_library'
                                    ? renderMetaItem(item)
                                    : renderIgItem(item)
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ──────────────────────────────────── */}
                <div className="mml-footer">
                    <div className="mml-footer-left">
                        {selectionCount > 0 && (
                            <span className="mml-selection-count">
                                {selectionCount} selected
                            </span>
                        )}
                    </div>

                    <div className="mml-footer-right">
                        <select
                            className="mml-source-dropdown"
                            value={mediaSource}
                            onChange={(e) => handleSourceChange(e.target.value)}
                        >
                            <option value="meta_library">Meta Media Library</option>
                            <option value="instagram">Instagram Posts</option>
                        </select>

                        <button
                            className="mml-cancel-btn"
                            onClick={() => setIsOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="mml-import-btn"
                            onClick={handleImport}
                            disabled={selectionCount === 0}
                        >
                            Import{selectionCount > 0 ? ` (${selectionCount})` : ''}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Scoped Styles ───────────────────────────── */}
            <style>{`
                .mml-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                .mml-modal {
                    background: #fff;
                    border-radius: 12px;
                    width: 90vw;
                    max-width: 860px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.25);
                }

                /* Header */
                .mml-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    border-bottom: 1px solid #e5e7eb;
                }
                .mml-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #111;
                }
                .mml-close-btn {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #6b7280;
                    padding: 4px 8px;
                    border-radius: 6px;
                    transition: background 0.15s;
                }
                .mml-close-btn:hover {
                    background: #f3f4f6;
                }

                /* Tabs */
                .mml-tabs {
                    display: flex;
                    gap: 0;
                    padding: 0 20px;
                    border-bottom: 1px solid #e5e7eb;
                }
                .mml-tab {
                    background: none;
                    border: none;
                    padding: 10px 16px;
                    font-size: 13px;
                    font-weight: 500;
                    color: #6b7280;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    transition: all 0.15s;
                }
                .mml-tab:hover {
                    color: #111;
                }
                .mml-tab-active {
                    color: #2563eb;
                    border-bottom-color: #2563eb;
                }

                /* Body / Grid */
                .mml-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px 20px;
                    min-height: 300px;
                }
                .mml-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    gap: 12px;
                }
                .mml-grid-item {
                    cursor: pointer;
                    border-radius: 8px;
                    border: 2px solid transparent;
                    padding: 4px;
                    transition: all 0.15s;
                }
                .mml-grid-item:hover {
                    border-color: #d1d5db;
                    background: #f9fafb;
                }
                .mml-selected {
                    border-color: #2563eb !important;
                    background: #eff6ff !important;
                }
                .mml-thumb-wrapper {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 1;
                    border-radius: 6px;
                    overflow: hidden;
                    background: #f3f4f6;
                }
                .mml-thumb-wrapper img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }
                .mml-video-badge {
                    position: absolute;
                    top: 6px;
                    left: 6px;
                    background: rgba(0,0,0,0.6);
                    color: #fff;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    z-index: 2;
                }
                .mml-check {
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: #2563eb;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 700;
                    z-index: 2;
                }
                .mml-no-preview {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #9ca3af;
                    font-size: 12px;
                }
                .mml-item-name {
                    margin: 6px 0 0;
                    font-size: 11px;
                    color: #374151;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .mml-item-meta {
                    margin: 2px 0 0;
                    font-size: 10px;
                    color: #9ca3af;
                }

                /* Loading / Empty */
                .mml-loading, .mml-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 200px;
                    color: #6b7280;
                    gap: 12px;
                }
                .mml-spinner {
                    width: 28px;
                    height: 28px;
                    border: 3px solid #e5e7eb;
                    border-top-color: #2563eb;
                    border-radius: 50%;
                    animation: mml-spin 0.7s linear infinite;
                }
                @keyframes mml-spin {
                    to { transform: rotate(360deg); }
                }

                /* Footer */
                .mml-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 20px;
                    border-top: 1px solid #e5e7eb;
                    background: #f9fafb;
                    border-radius: 0 0 12px 12px;
                }
                .mml-footer-left {
                    display: flex;
                    align-items: center;
                }
                .mml-selection-count {
                    font-size: 13px;
                    color: #2563eb;
                    font-weight: 500;
                }
                .mml-footer-right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .mml-source-dropdown {
                    padding: 6px 10px;
                    font-size: 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    background: #fff;
                    color: #374151;
                    cursor: pointer;
                    outline: none;
                    transition: border-color 0.15s;
                }
                .mml-source-dropdown:focus {
                    border-color: #2563eb;
                }
                .mml-cancel-btn {
                    padding: 8px 14px;
                    font-size: 13px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    background: #fff;
                    color: #374151;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .mml-cancel-btn:hover {
                    background: #f3f4f6;
                }
                .mml-import-btn {
                    padding: 8px 16px;
                    font-size: 13px;
                    font-weight: 500;
                    border: none;
                    border-radius: 6px;
                    background: #2563eb;
                    color: #fff;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .mml-import-btn:hover:not(:disabled) {
                    background: #1d4ed8;
                }
                .mml-import-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* Open trigger button */
                .mml-open-btn {
                    padding: 8px 16px;
                    font-size: 13px;
                    font-weight: 500;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    background: #fff;
                    color: #374151;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .mml-open-btn:hover:not(:disabled) {
                    background: #f3f4f6;
                    border-color: #9ca3af;
                }
                .mml-open-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}