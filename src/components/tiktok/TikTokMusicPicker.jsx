import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader, Music, Pause, Play, RefreshCcw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTikTokAuth } from "@/lib/TikTokAuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";
const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 400;

// TikTok only lists carousel music through a search, so these are the ways in (see /api/tiktok/music)
const TABS = [
  { id: "keyword", label: "Search" },
  { id: "liked", label: "Liked" },
  { id: "history", label: "Recent" },
  { id: "uploaded", label: "Uploaded" },
];
const EMPTY_TEXT = {
  keyword: "No tracks match this search.",
  liked: "No liked tracks on this account yet.",
  history: "No recently used tracks yet.",
  uploaded: "No music uploaded to this account yet.",
};
const SUGGESTIONS = ["Pop", "Upbeat", "Chill", "Happy", "Hip Hop", "Electronic", "Acoustic", "Cinematic"];

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return null;
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

// Library file names read like "bgm_track_0998_pop_rock_emotive_piano" — make them legible
const prettyName = (name) => {
  const cleaned = String(name || "")
    .replace(/^bgm_track_\d+_/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : name;
};

const trackMeta = (track) => [track.author, track.style, formatDuration(track.duration)].filter(Boolean).join(" · ");

/**
 * Music track picker for TikTok image ads. Image ads on manual Reach, Traffic and Lead
 * Generation campaigns are created as CAROUSEL_ADS, which TikTok requires a music_id for —
 * and only music listed for the CAROUSEL_ADS scene is accepted. On Smart+ Traffic the track
 * is optional (`optional`): image ads there can be created without music.
 *
 * @param {{ advertiserId: string, value: Object|null, onChange: (track: Object|null) => void, optional?: boolean }} props
 */
export default function TikTokMusicPicker({ advertiserId, value, onChange, optional = false }) {
  const { tiktokFetch } = useTikTokAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("keyword");
  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");
  // One result list per tab + keyword, so switching tabs doesn't refetch
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);
  const requestRef = useRef(0);

  const resultKey = tab === "keyword" ? `keyword:${keyword.toLowerCase()}` : tab;
  const current = results[resultKey];

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  useEffect(() => stopPreview, [stopPreview]);

  // Music is per advertiser: a new advertiser starts from a clean slate
  useEffect(() => {
    setResults({});
    stopPreview();
  }, [advertiserId, stopPreview]);

  // Debounce typing into a search
  useEffect(() => {
    const t = setTimeout(() => setKeyword(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(
    async (key, mode, term, page) => {
      if (!advertiserId) return;
      const requestId = ++requestRef.current;
      setLoading(true);
      setResults((prev) => ({ ...prev, [key]: { ...(prev[key] || { tracks: [] }), error: "" } }));
      try {
        const params = new URLSearchParams({ advertiserId, mode, page: String(page), page_size: String(PAGE_SIZE) });
        if (mode === "keyword") params.set("keyword", term);
        const res = await tiktokFetch(`${API_BASE_URL}/api/tiktok/music?${params}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw new Error(data.error || "Couldn't load music");
        const rows = Array.isArray(data.music) ? data.music : [];
        const info = data.page_info;
        const hasMore = data.paginated ? (info?.total_page ? page < info.total_page : rows.length === PAGE_SIZE) : false;
        setResults((prev) => {
          const base = page === 1 ? [] : prev[key]?.tracks || [];
          const seen = new Set(base.map((t) => t.music_id));
          return { ...prev, [key]: { tracks: [...base, ...rows.filter((t) => !seen.has(t.music_id))], page, hasMore, error: "" } };
        });
      } catch (err) {
        setResults((prev) => ({ ...prev, [key]: { ...(prev[key] || { tracks: [] }), error: err.message || "Couldn't load music" } }));
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [advertiserId, tiktokFetch],
  );

  // Fetch the current tab's list the first time it's shown
  useEffect(() => {
    if (!open || !advertiserId || results[resultKey]) return;
    if (tab === "keyword" && !keyword) return;
    load(resultKey, tab, keyword, 1);
  }, [open, advertiserId, tab, keyword, resultKey, results, load]);

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

  const choose = (track) => {
    onChange(track);
    setOpen(false);
    stopPreview();
  };

  const renderPlay = (track, size = "h-8 w-8") => {
    const playing = playingId === track.music_id;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          togglePreview(track);
        }}
        disabled={!track.url}
        aria-label={playing ? `Pause ${prettyName(track.name)}` : `Play ${prettyName(track.name)}`}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg flex items-center justify-center transition-colors",
          size,
          track.cover_url ? "bg-gray-200" : playing ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
          !track.url && "opacity-40 cursor-not-allowed",
        )}
      >
        {track.cover_url && <img src={track.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <span
          className={cn(
            "relative flex items-center justify-center",
            track.cover_url && "h-full w-full bg-black/35 text-white hover:bg-black/50",
          )}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </span>
      </button>
    );
  };

  const tracks = current?.tracks || [];
  const showSuggestions = tab === "keyword" && !keyword;

  return (
    <div className="space-y-2">
      <div className="flex flex-col m-0 pt-1">
        <Label className="flex items-center gap-2 font-semibold text-sm">
          <Music className="w-4 h-4" />
          Music for image ads
          {optional && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Optional
            </span>
          )}
        </Label>
        <span className="text-xs text-gray-500 leading-relaxed">
          {optional
            ? "Smart+ Traffic image ads can run without music. Pick a track to add one to every image in this batch."
            : "TikTok plays a music track over image ads. The track you pick is used for every image in this batch."}
        </span>
      </div>

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) stopPreview();
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
                {value.cover_url ? (
                  <img src={value.cover_url} alt="" className="h-6 w-6 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="h-6 w-6 shrink-0 rounded-full bg-black text-white flex items-center justify-center">
                    <Music className="h-3.5 w-3.5" />
                  </span>
                )}
                <span className="text-sm font-medium text-gray-900 truncate">{prettyName(value.name)}</span>
                {trackMeta(value) && <span className="text-xs text-gray-400 truncate">{trackMeta(value)}</span>}
              </div>
            ) : (
              <span className="text-sm font-normal text-gray-500">{optional ? "No music" : "Select a music track"}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] !max-w-none p-0 rounded-xl bg-white border border-gray-100 shadow-xl"
        >
          <div className="flex flex-col overflow-hidden rounded-xl bg-white text-gray-900">
            {/* Source tabs */}
            <div className="mx-2 mt-2 grid grid-cols-4 gap-1 rounded-2xl bg-gray-100 p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    stopPreview();
                  }}
                  className={cn(
                    "rounded-xl py-1.5 text-xs font-semibold transition-colors",
                    tab === t.id ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-800",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "keyword" && (
              <div className="mx-2 mt-2 mb-1 flex items-center rounded-2xl border border-gray-300 bg-white px-3 shadow">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-gray-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search TikTok's music library..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter searches now instead of submitting the ad form
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setKeyword(searchInput.trim());
                    }
                  }}
                  className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 text-gray-900 border-none focus:ring-0"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setKeyword("");
                    }}
                    aria-label="Clear search"
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            <div className="max-h-[340px] overflow-y-auto rounded-xl p-1 mt-1">
              {showSuggestions ? (
                <div className="px-2 py-3 space-y-2">
                  <p className="text-xs text-gray-500">Search by mood, genre or name, or try one of these:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setSearchInput(s);
                          setKeyword(s);
                        }}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : current?.error && tracks.length === 0 ? (
                <div className="py-6 px-3 text-center space-y-2">
                  <p className="text-xs text-red-600">{current.error}</p>
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => load(resultKey, tab, keyword, 1)}>
                    <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Try again
                  </Button>
                </div>
              ) : !current || (loading && tracks.length === 0) ? (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Loader className="h-4 w-4 animate-spin" /> Loading music...
                </div>
              ) : tracks.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500">{EMPTY_TEXT[tab]}</div>
              ) : (
                <div className="space-y-0.5">
                  {tracks.map((track) => {
                    const selected = value?.music_id === track.music_id;
                    return (
                      <div
                        key={track.music_id}
                        role="option"
                        aria-selected={selected}
                        tabIndex={0}
                        onClick={() => choose(track)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            choose(track);
                          }
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 cursor-pointer rounded-xl transition-colors duration-150 hover:bg-gray-100 flex items-center gap-3 outline-none focus-visible:bg-gray-100",
                          selected && "bg-gray-50",
                        )}
                      >
                        {renderPlay(track)}
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

              {!showSuggestions && current?.hasMore && tracks.length > 0 && (
                <div className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={loading}
                    onClick={() => load(resultKey, tab, keyword, (current.page || 1) + 1)}
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
          {renderPlay(value, "h-6 w-6")}
          <span>Preview the selected track</span>
          {optional && (
            <button
              type="button"
              onClick={() => {
                stopPreview();
                onChange(null);
              }}
              className="ml-auto inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-900"
            >
              <X className="h-3.5 w-3.5" />
              Remove track
            </button>
          )}
        </div>
      )}
    </div>
  );
}
