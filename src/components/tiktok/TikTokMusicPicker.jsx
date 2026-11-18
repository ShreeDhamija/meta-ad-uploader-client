import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, ChevronDown, ChevronUp, Loader, Music, Pause, Play, RefreshCcw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTikTokAuth } from "@/lib/TikTokAuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";
const PAGE_SIZE = 50;
const COLLAPSED_COUNT = 3;
const SEARCH_DEBOUNCE_MS = 400;

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
const MOODS = ["Pop", "Upbeat", "Chill", "Happy", "Hip Hop", "Electronic", "Acoustic", "Cinematic"];

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return null;
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const prettyName = (name) => {
  const cleaned = String(name || "")
    .replace(/^bgm_track_\d+_/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : name;
};

const trackMeta = (track) => [track.author, track.style, formatDuration(track.duration)].filter(Boolean).join(" · ");

// Music picker for image ads (CAROUSEL_ADS need a music_id); each tab shows 3 tracks until expanded.
export default function TikTokMusicPicker({ advertiserId, value, onChange }) {
  const { tiktokFetch } = useTikTokAuth();
  const [tab, setTab] = useState("keyword");
  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState(MOODS[0]);
  const [results, setResults] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);
  const requestRef = useRef(0);

  const resultKey = tab === "keyword" ? `keyword:${keyword.toLowerCase()}` : tab;
  const current = results[resultKey];
  const isExpanded = Boolean(expanded[resultKey]);
  const activeMood = tab === "keyword" && !searchInput.trim() ? MOODS.find((m) => m.toLowerCase() === keyword.toLowerCase()) : null;

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  useEffect(() => stopPreview, [stopPreview]);

  useEffect(() => {
    setResults({});
    setExpanded({});
    stopPreview();
  }, [advertiserId, stopPreview]);

  useEffect(() => {
    const term = searchInput.trim();
    if (!term) return;
    const t = setTimeout(() => setKeyword(term), SEARCH_DEBOUNCE_MS);
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

  useEffect(() => {
    if (!advertiserId || results[resultKey]) return;
    if (tab === "keyword" && !keyword) return;
    load(resultKey, tab, keyword, 1);
  }, [advertiserId, tab, keyword, resultKey, results, load]);

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

  const pickMood = (mood) => {
    setSearchInput("");
    setKeyword(mood);
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
  const visibleTracks = isExpanded ? tracks : tracks.slice(0, COLLAPSED_COUNT);

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

      <div className="rounded-2xl border border-gray-300 bg-white shadow overflow-hidden">
        <div className={cn("flex items-center gap-3 px-3 py-2.5 border-b border-gray-100", value ? "bg-gray-50" : "bg-white")}>
          {value ? (
            <>
              {renderPlay(value)}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Selected track</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {prettyName(value.name)}
                  {trackMeta(value) && <span className="ml-2 text-xs font-normal text-gray-400">{trackMeta(value)}</span>}
                </p>
              </div>
              <Check className="h-4 w-4 shrink-0 text-gray-900" />
            </>
          ) : (
            <p className="text-sm text-gray-500">No track selected yet. Pick one below.</p>
          )}
        </div>

        <div className="p-2 space-y-2">
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-gray-100 p-1">
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
            <>
              <div className="flex items-center rounded-2xl border border-gray-300 bg-white px-3 shadow">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search TikTok's music library..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (!e.target.value.trim()) setKeyword(MOODS[0]);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (searchInput.trim()) setKeyword(searchInput.trim());
                    }
                  }}
                  className="flex h-10 w-full bg-transparent py-2 text-sm outline-none placeholder:text-gray-400 text-gray-900 border-none focus:ring-0"
                />
                {searchInput && (
                  <button type="button" onClick={() => pickMood(MOODS[0])} aria-label="Clear search" className="text-gray-400 hover:text-gray-700">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {MOODS.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => pickMood(mood)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      activeMood === mood ? "border-black bg-black text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100",
                    )}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </>
          )}

          <div>
            {current?.error && tracks.length === 0 ? (
              <div className="py-5 px-3 text-center space-y-2">
                <p className="text-xs text-red-600">{current.error}</p>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => load(resultKey, tab, keyword, 1)}>
                  <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Try again
                </Button>
              </div>
            ) : !current || (loading && tracks.length === 0) ? (
              <div className="py-5 flex items-center justify-center gap-2 text-xs text-gray-500">
                <Loader className="h-4 w-4 animate-spin" /> Loading music...
              </div>
            ) : tracks.length === 0 ? (
              <div className="py-5 text-center text-xs text-gray-500">{EMPTY_TEXT[tab]}</div>
            ) : (
              <div className="space-y-0.5">
                {visibleTracks.map((track) => {
                  const selected = value?.music_id === track.music_id;
                  return (
                    <div
                      key={track.music_id}
                      role="option"
                      aria-selected={selected}
                      tabIndex={0}
                      onClick={() => onChange(track)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onChange(track);
                        }
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 cursor-pointer rounded-xl transition-colors duration-150 hover:bg-gray-100 flex items-center gap-3 outline-none focus-visible:bg-gray-100",
                        selected && "bg-gray-100",
                      )}
                    >
                      {renderPlay(track)}
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm text-gray-900 truncate", selected ? "font-semibold" : "font-medium")}>
                          {prettyName(track.name)}
                        </p>
                        {trackMeta(track) && <p className="text-xs text-gray-400 truncate">{trackMeta(track)}</p>}
                      </div>
                      {selected ? (
                        <Check className="h-4 w-4 shrink-0 text-gray-900" />
                      ) : (
                        <span className="text-xs font-medium text-gray-400 shrink-0">Use</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {tracks.length > COLLAPSED_COUNT && (
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setExpanded((prev) => ({ ...prev, [resultKey]: !isExpanded }))}
                  className="flex-1 rounded-xl text-xs text-gray-600"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5 mr-1" /> Show fewer
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5 mr-1" /> Show more ({tracks.length - COLLAPSED_COUNT})
                    </>
                  )}
                </Button>
                {isExpanded && current?.hasMore && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={loading}
                    onClick={() => load(resultKey, tab, keyword, (current.page || 1) + 1)}
                    className="flex-1 rounded-xl text-xs text-gray-600"
                  >
                    {loading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : "Load more tracks"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
