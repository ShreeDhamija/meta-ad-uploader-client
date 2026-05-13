import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { toast } from "sonner"
import { Loader2, Video, RefreshCcw, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

export default function TikTokMediaLibraryModal({
    open,
    onClose,
    onSelect,
    advertiserId
}) {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);

    const fetchVideos = useCallback(async (isLoadMore = false) => {
        if (!advertiserId) return;
        
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        try {
            const res = await axios.get(`${API_BASE_URL}/api/tiktok/fetch-library-videos`, {
                params: { 
                    advertiserId,
                    page: isLoadMore ? page + 1 : 1,
                    pageSize: 20
                },
                withCredentials: true,
            });

            const newVideos = res.data?.videos || [];
            if (isLoadMore) {
                setVideos(prev => [...prev, ...newVideos]);
                setPage(prev => prev + 1);
            } else {
                setVideos(newVideos);
                setPage(1);
            }
            setHasMore(res.data?.pagination?.hasMore || false);
        } catch (err) {
            console.error('Error fetching TikTok library:', err);
            toast.error('Failed to load TikTok media library');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [advertiserId, page]);

    useEffect(() => {
        if (open && advertiserId) {
            fetchVideos();
        }
    }, [open, advertiserId]);

    const filteredVideos = videos.filter(v => 
        v.video_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = () => {
        if (selectedVideo) {
            onSelect(selectedVideo);
            onClose();
        }
    };

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[110] backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[120] w-full max-w-4xl max-h-[85vh] rounded-[32px] bg-white p-8 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">TikTok Creative Library</h2>
                        <p className="text-sm text-gray-500 font-medium">Select a video already uploaded to your TikTok account</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-100">
                        <X className="w-5 h-5 text-gray-400" />
                    </Button>
                </div>

                {/* Search & Actions */}
                <div className="flex gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                            placeholder="Search videos by name..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 border-gray-200 rounded-2xl h-12 bg-gray-50/50 focus:bg-white transition-colors"
                        />
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={() => fetchVideos()} 
                        className="rounded-2xl h-12 px-5 border-gray-200 hover:bg-gray-50"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                    </Button>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1 -mx-2 px-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-10 h-10 animate-spin text-zinc-300" />
                            <p className="text-gray-400 font-medium text-sm">Loading your library...</p>
                        </div>
                    ) : filteredVideos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                            <Video className="w-12 h-12 mb-3 opacity-20" />
                            <p className="font-semibold">No videos found</p>
                            <p className="text-xs">Try a different search or refresh the list</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-4 pb-4">
                            {filteredVideos.map((video) => {
                                const isSelected = selectedVideo?.video_id === video.video_id;
                                return (
                                    <div 
                                        key={video.video_id}
                                        onClick={() => setSelectedVideo(video)}
                                        className={`group relative cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
                                            isSelected ? 'border-zinc-900 shadow-lg scale-[0.98]' : 'border-gray-100 hover:border-zinc-200 bg-gray-50/30'
                                        }`}
                                    >
                                        <div className="aspect-[9/16] bg-black flex items-center justify-center relative">
                                            {video.poster_url ? (
                                                <img 
                                                    src={video.poster_url} 
                                                    alt={video.video_name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Video className="w-8 h-8 text-gray-600" />
                                            )}
                                            <div className={`absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                <Checkbox checked={isSelected} className="w-6 h-6 rounded-full border-2 border-white bg-white data-[state=checked]:bg-zinc-900" />
                                            </div>
                                        </div>
                                        <div className="p-3 bg-white">
                                            <p className="text-xs font-bold text-gray-900 truncate mb-1">{video.video_name || 'Untitled Video'}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {(video.width && video.height) ? `${video.width}x${video.height}` : 'Video'}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {video.duration ? `${Math.round(video.duration)}s` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {hasMore && (
                        <div className="py-6 flex justify-center">
                            <Button 
                                variant="ghost" 
                                onClick={() => fetchVideos(true)} 
                                disabled={loadingMore}
                                className="rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100"
                            >
                                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {loadingMore ? "Loading More..." : "Load More"}
                            </Button>
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-500">
                        {selectedVideo ? `Selected: ${selectedVideo.video_name}` : "Choose a video to continue"}
                    </p>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose} className="rounded-2xl h-12 px-8 font-semibold">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSelect} 
                            disabled={!selectedVideo}
                            className="bg-black text-white hover:bg-zinc-800 rounded-2xl h-12 px-10 font-bold shadow-xl shadow-black/10 transition-transform active:scale-95"
                        >
                            Import Video
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
