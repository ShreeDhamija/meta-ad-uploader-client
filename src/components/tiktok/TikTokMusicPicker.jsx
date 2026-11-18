import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader, Music, Pause, Play, RefreshCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTikTokAuth } from "@/lib/TikTokAuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";
const PAGE_SIZE = 50;

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return null;
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

// TikTok file names read like "bgm_track_0998_pop_rock_emotive_piano" — make them legible
const prettyName = (name) => {
  const cleaned = String(name || "")
    .replace(/^bgm_track_\d+_/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : name;
};

const trackMeta = (track) => [track.style, formatDuration(track.duration)].filter(Boolean).join(" · ");

/**
 * Music track picker for TikTok image ads. Image ads on manual Reach, Traffic and Lead
 * Generation campaigns are created as CAROUSEL_ADS, which TikTok requires a music_id for.
 *
 * @param {{ advertiserId: string, value: Object|null, onChange: (track: Object|null) => void }} props
 */
export default function TikTokMusicPicker({ advertiserId, value, onChange }) {
  const { tiktokFetch } = useTikTokAuth();
  const [open, setOpen] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);
  const loadedForRef = useRef(null);

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const loadPage = useCallback(
    async (nextPage) => {
      if (!advertiserId) return;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ advertiserId, page: String(nextPage), page_size: String(PAGE_SIZE) });
        const res = await tiktokFetch(`${API_BASE_URL}/api/tiktok/music?${params}`);
        const data = await res.json();
        if (!res.ok || data.success === false) throw new Error(data.error || "Couldn't load music");
        const rows = Array.isArray(data.music) ? data.music : [];
        setTracks((prev) => {
          const base = nextPage === 1 ? [] : prev;
          const seen = new Set(base.map((t) => t.music_id));
          return [...base, ...rows.filter((t) => !seen.has(t.music_id))];
        });
        const info = data.page_info;
        setHasMore(info?.total_page ? nextPage < info.total_page : rows.length === PAGE_SIZE);
        setPage(nextPage);
      } catch (err) {
        setError(err.message || "Couldn't load music");
      } finally {
        setLoading(false);
      }
    },
    [advertiserId, tiktokFetch],
  );

  // Music is per advertiser: a new advertiser clears the list and the chosen track
  useEffect(() => {
    if (loadedForRef.current === advertiserId) return;
    const hadAdvertiser = loadedForRef.current !== null;
    loadedForRef.current = advertiserId;
    stopPreview();
    setTracks([]);
    setPage(0);
    setHasMore(false);
    setError("");
    if (hadAdvertiser && value) onChange(null);
    if (advertiserId) loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advertiserId]);

  useEffect(() => stopPreview, [stopPreview]);

  const togglePreview = (track) => {
    if (playingId === track.music_id) {
      stopPreview();
      return;
    }
    stopPreview();
    if (!track.url) return;
    const audio = new Audio(track.url);
    audio.onended = () => setPlayingId((id) => (id === track.music_id ? null : id));
    audio.play().catch(() => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(track.music_id);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((t) => `${prettyName(t.name)} ${t.name} ${t.style || ""} ${t.music_id}`.toLowerCase().includes(q));
  }, [tracks, search]);

  const PlayButton = ({ track, className }) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        togglePreview(track);
      }}
      disabled={!track.url}
      aria-label={playingId === track.music_id ? `Pause ${prettyName(track.name)}` : `Play ${prettyName(track.name)}`}
      className={cn(
        "h-7 w-7 shrink-0 rounded-full flex items-center justify-center transition-colors",
        playingId === track.music_id ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
        !track.url && "opacity-40 cursor-not-allowed",
        className,
      )}
    >
      {playingId === track.music_id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
    </button>
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-col m-0 pt-1">
        <Label className="flex items-center gap-2 font-semibold text-sm">
          <Music className="w-4 h-4" />
          Music for image ads
        </Label>
        <span className="text-xs text-gray-500 leading-relaxed">
          TikTok plays a music track over image ads. The track you pick is used for every image in this batch.
        </span>
      </div>

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setSearch("");
            stopPreview();
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={!advertiserId}
            className="w-full justify-between border border-gray-300 rounded-2xl bg-white shadow flex items-center hover:bg-white px-3 py-4.5"
          >
            {value ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-6 w-6 shrink-0 rounded-full bg-black text-white flex items-center justify-center">
                  <Music className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium text-gray-900 truncate">{prettyName(value.name)}</span>
                {trackMeta(value) && <span className="text-xs text-gray-400 shrink-0">{trackMeta(value)}</span>}
              </div>
            ) : (
              <span className="text-sm font-normal text-gray-500">Select a music track</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] !max-w-none p-0 rounded-xl bg-white border border-gray-100 shadow-xl"
        >
          <div className="flex flex-col overflow-hidden rounded-xl bg-white text-gray-900">
            <div className="mx-2 mt-2 mb-1 flex items-center rounded-2xl border border-gray-300 bg-white px-3 shadow">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name or style..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 text-gray-900 border-none focus:ring-0"
              />
            </div>

            <div className="max-h-[360px] overflow-y-auto rounded-xl p-1">
              {error && tracks.length === 0 ? (
                <div className="py-6 px-3 text-center space-y-2">
                  <p className="text-xs text-red-600">{error}</p>
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => loadPage(1)}>
                    <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Try again
                  </Button>
                </div>
              ) : loading && tracks.length === 0 ? (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Loader className="h-4 w-4 animate-spin" /> Loading music...
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500">
                  {tracks.length === 0 ? "No music available for this advertiser." : "No results."}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((track) => {
                    const selected = value?.music_id === track.music_id;
                    return (
                      <div
                        key={track.music_id}
                        role="option"
                        aria-selected={selected}
                        tabIndex={0}
                        onClick={() => {
                          onChange(track);
                          setOpen(false);
                          setSearch("");
                          stopPreview();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onChange(track);
                            setOpen(false);
                            stopPreview();
                          }
                        }}
                        className={cn(
                          "w-full text-left px-2 py-2 cursor-pointer rounded-xl transition-colors duration-150 hover:bg-gray-100 flex items-center gap-3 outline-none focus-visible:bg-gray-100",
                          selected && "bg-gray-50",
                        )}
                      >
                        <PlayButton track={track} />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm text-gray-900 truncate", selected ? "font-semibold" : "font-medium")}>
                            {prettyName(track.name)}
                          </p>
                          {trackMeta(track) && <p className="text-xs text-gray-400 truncate">{trackMeta(track)}</p>}
                        </div>
                        {selected && <Check className="h-4 w-4 shrink-0 text-gray-900" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {hasMore && tracks.length > 0 && !search.trim() && (
                <div className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={loading}
                    onClick={() => loadPage(page + 1)}
                    className="w-full rounded-xl text-xs text-gray-600"
                  >
                    {loading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : "Load more tracks"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {value && (
        <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
          <PlayButton track={value} className="h-6 w-6" />
          <span>Preview the selected track</span>
        </div>
      )}
    </div>
  );
}
