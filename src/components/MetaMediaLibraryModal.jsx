import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Image as ImageIcon, Video, FolderOpen } from "lucide-react";
import { toast } from "sonner";

export function MetaMediaLibraryModal({
    adAccountId,
    isLoggedIn,
    importedFiles,
    setImportedFiles,
}) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("static");

    // Images state
    const [images, setImages] = useState([]);
    const [imagesPagination, setImagesPagination] = useState({ hasMore: false, nextCursor: null });
    const [loadingImages, setLoadingImages] = useState(false);
    const [loadingMoreImages, setLoadingMoreImages] = useState(false);

    // Videos state
    const [videos, setVideos] = useState([]);
    const [videosPagination, setVideosPagination] = useState({ hasMore: false, nextCursor: null });
    const [loadingVideos, setLoadingVideos] = useState(false);
    const [loadingMoreVideos, setLoadingMoreVideos] = useState(false);

    // Selection state
    const [selectedImages, setSelectedImages] = useState(new Set());
    const [selectedVideos, setSelectedVideos] = useState(new Set());

    const fetchImages = async (cursor) => {
        if (!adAccountId) return;

        if (cursor) {
            setLoadingMoreImages(true);
        } else {
            setLoadingImages(true);
            setImages([]);
        }

        try {
            const params = new URLSearchParams({ adAccountId });
            if (cursor) {
                params.append("after", cursor);
            }

            const response = await fetch(`/api/meta/media/images?${params.toString()}`, {
                credentials: "include",
            });
            const data = await response.json();

            if (data.success) {
                if (cursor) {
                    setImages(prev => [...prev, ...data.data]);
                } else {
                    setImages(data.data);
                }
                setImagesPagination(data.pagination);
            } else {
                toast.error("Failed to fetch images: " + data.error);
            }
        } catch (error) {
            toast.error("Failed to fetch images");
            console.error(error);
        } finally {
            setLoadingImages(false);
            setLoadingMoreImages(false);
        }
    };

    const fetchVideos = async (cursor) => {
        if (!adAccountId) return;

        if (cursor) {
            setLoadingMoreVideos(true);
        } else {
            setLoadingVideos(true);
            setVideos([]);
        }

        try {
            const params = new URLSearchParams({ adAccountId });
            if (cursor) {
                params.append("after", cursor);
            }

            const response = await fetch(`/api/meta/media/videos?${params.toString()}`, {
                credentials: "include",
            });
            const data = await response.json();

            if (data.success) {
                if (cursor) {
                    setVideos(prev => [...prev, ...data.data]);
                } else {
                    setVideos(data.data);
                }
                setVideosPagination(data.pagination);
            } else {
                toast.error("Failed to fetch videos: " + data.error);
            }
        } catch (error) {
            toast.error("Failed to fetch videos");
            console.error(error);
        } finally {
            setLoadingVideos(false);
            setLoadingMoreVideos(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchImages();
            fetchVideos();
            // Reset selections when modal opens
            setSelectedImages(new Set());
            setSelectedVideos(new Set());
        }
    }, [open, adAccountId]);

    const toggleImageSelection = (hash) => {
        const newSelection = new Set(selectedImages);
        if (newSelection.has(hash)) {
            newSelection.delete(hash);
        } else {
            newSelection.add(hash);
        }
        setSelectedImages(newSelection);
    };

    const toggleVideoSelection = (id) => {
        const newSelection = new Set(selectedVideos);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedVideos(newSelection);
    };

    const handleImport = () => {
        const selectedImagesList = images.filter((img) =>
            selectedImages.has(img.hash)
        );
        const selectedVideosList = videos.filter((vid) =>
            selectedVideos.has(vid.id)
        );

        const totalSelected = selectedImagesList.length + selectedVideosList.length;

        if (totalSelected === 0) {
            toast.warning("Please select at least one item to import");
            return;
        }

        // Convert to importedFiles format with type property
        const newImportedFiles = [
            ...selectedImagesList.map(img => ({
                type: "image",
                url: img.url,
                name: img.name,
                hash: img.hash,
                created_time: img.created_time,
                source: "meta_library",
            })),
            ...selectedVideosList.map(vid => ({
                type: "video",
                id: vid.id,
                name: vid.title,
                thumbnail_url: vid.thumbnail_url,
                created_time: vid.created_time,
                source: "meta_library",
            })),
        ];

        // Add to parent's importedFiles state
        setImportedFiles(prev => [...prev, ...newImportedFiles]);

        toast.success(
            `Successfully imported ${totalSelected} item${totalSelected > 1 ? "s" : ""}`,
            {
                description: `${selectedImagesList.length} image${selectedImagesList.length !== 1 ? "s" : ""} and ${selectedVideosList.length} video${selectedVideosList.length !== 1 ? "s" : ""}`,
            }
        );

        // Reset selections and close modal
        setSelectedImages(new Set());
        setSelectedVideos(new Set());
        setOpen(false);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleLoadMoreImages = () => {
        if (imagesPagination.nextCursor) {
            fetchImages(imagesPagination.nextCursor);
        }
    };

    const handleLoadMoreVideos = () => {
        if (videosPagination.nextCursor) {
            fetchVideos(videosPagination.nextCursor);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button
                size="sm"
                disabled={!isLoggedIn}
                className="rounded-xl flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white hover:text-white"
                onClick={() => {
                    if (!adAccountId) {
                        toast.error("Please select an ad account");
                        return;
                    }
                    setOpen(true);
                }}
            >
                <FolderOpen className="h-4 w-4 text-white hover:text-white" />
                Import From Meta Media Library
            </Button>
            <DialogContent className="max-w-3xl max-h-[80vh] rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                        Meta Media Library
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1">
                        <TabsTrigger
                            value="static"
                            className="rounded-xl flex items-center gap-2"
                        >
                            <ImageIcon className="h-4 w-4" />
                            Static ({images.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="video"
                            className="rounded-xl flex items-center gap-2"
                        >
                            <Video className="h-4 w-4" />
                            Video ({videos.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="static" className="mt-4">
                        {loadingImages ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : images.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                                <p>No images found in your media library</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-end mb-3">
                                    <span className="text-sm text-gray-500">
                                        {selectedImages.size} selected
                                    </span>
                                </div>
                                <ScrollArea className="h-[400px] pr-4">
                                    <div className="space-y-2">
                                        {images.map((image) => (
                                            <div
                                                key={image.hash}
                                                onClick={() => toggleImageSelection(image.hash)}
                                                className={`flex items-center gap-4 p-3 rounded-2xl border-2 cursor-pointer transition-all hover:border-primary/50 ${selectedImages.has(image.hash)
                                                    ? "border-primary bg-primary/5"
                                                    : "border-gray-200"
                                                    }`}
                                            >
                                                <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                                    <img
                                                        src={image.url}
                                                        alt={image.name}
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => {
                                                            e.target.src =
                                                                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E";
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">
                                                        {image.name || "Untitled"}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatDate(image.created_time)}
                                                    </p>
                                                </div>
                                                <Checkbox
                                                    checked={selectedImages.has(image.hash)}
                                                    className="rounded-lg h-5 w-5"
                                                />
                                            </div>
                                        ))}

                                        {/* Load More Button */}
                                        {imagesPagination.hasMore && (
                                            <div className="flex justify-center pt-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={handleLoadMoreImages}
                                                    disabled={loadingMoreImages}
                                                    className="rounded-xl"
                                                >
                                                    {loadingMoreImages ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            Loading...
                                                        </>
                                                    ) : (
                                                        "Load More"
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="video" className="mt-4">
                        {loadingVideos ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : videos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <Video className="h-12 w-12 mb-2 opacity-50" />
                                <p>No videos found in your media library</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-end mb-3">
                                    <span className="text-sm text-gray-500">
                                        {selectedVideos.size} selected
                                    </span>
                                </div>
                                <ScrollArea className="h-[400px] pr-4">
                                    <div className="space-y-2">
                                        {videos.map((video) => (
                                            <div
                                                key={video.id}
                                                onClick={() => toggleVideoSelection(video.id)}
                                                className={`flex items-center gap-4 p-3 rounded-2xl border-2 cursor-pointer transition-all hover:border-primary/50 ${selectedVideos.has(video.id)
                                                    ? "border-primary bg-primary/5"
                                                    : "border-gray-200"
                                                    }`}
                                            >
                                                <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 flex items-center justify-center">
                                                    {video.thumbnail_url ? (
                                                        <img
                                                            src={video.thumbnail_url}
                                                            alt={video.title}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <Video className="h-8 w-8 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">
                                                        {video.title || "Untitled"}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatDate(video.created_time)}
                                                    </p>
                                                </div>
                                                <Checkbox
                                                    checked={selectedVideos.has(video.id)}
                                                    className="rounded-lg h-5 w-5"
                                                />
                                            </div>
                                        ))}

                                        {/* Load More Button */}
                                        {videosPagination.hasMore && (
                                            <div className="flex justify-center pt-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={handleLoadMoreVideos}
                                                    disabled={loadingMoreVideos}
                                                    className="rounded-xl"
                                                >
                                                    {loadingMoreVideos ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            Loading...
                                                        </>
                                                    ) : (
                                                        "Load More"
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </>
                        )}
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        className="rounded-xl"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={selectedImages.size === 0 && selectedVideos.size === 0}
                        className="rounded-xl"
                    >
                        Import ({selectedImages.size + selectedVideos.size})
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}