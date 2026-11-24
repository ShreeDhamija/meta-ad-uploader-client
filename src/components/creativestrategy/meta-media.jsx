// Meta ad media for Insights: self-healing thumbnails and play-on-demand video.
//
// Meta CDN URLs are signed and expire (the `oe` query param is the expiry in
// hex Unix seconds). Analyzed ads have an R2 poster, but most ads only have
// the CDN URL. A thumbnail is refreshed from Meta (batched, once per ad per
// visit) when its URL has expired or fails to load. The new URL is saved
// server-side.
//
// Videos are never stored: the drawer shows the poster with a play button and
// asks the backend for a playable URL only when it's pressed.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { ExternalLink, Loader2, Play, RotateCcw } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";

/** True if a Meta CDN URL is past (or within `skewMs` of) its `oe` expiry. URLs without one never are. */
export function metaUrlExpired(url, skewMs = 5 * 60_000, now = Date.now()) {
  if (!url || !url.includes("oe=")) return false;
  try {
    const oe = new URL(url).searchParams.get("oe");
    if (!oe || !/^[0-9a-f]+$/i.test(oe)) return false;
    return parseInt(oe, 16) * 1000 - skewMs <= now;
  } catch {
    return false;
  }
}

const AdMediaContext = createContext(null);
const BATCH_DELAY_MS = 80;
const BATCH_SIZE = 100;

/**
 * Collects thumbnail refresh requests from every <AdThumbImg> under it and
 * sends them in batches. Remount it (key) per product.
 */
export function AdMediaProvider({ productId, children }) {
  // adId → fresh URL, or null when Meta had nothing for it.
  const [fresh, setFresh] = useState({});
  const requested = useRef(new Set());
  const queue = useRef([]);
  const timer = useRef(null);

  const flush = useCallback(async () => {
    timer.current = null;
    const ids = queue.current.splice(0);
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const chunk = ids.slice(i, i + BATCH_SIZE);
      let thumbnails;
      try {
        ({ thumbnails } = await creativeApi.refreshAdThumbnails(productId, chunk));
      } catch {
        thumbnails = {};
      }
      setFresh((prev) => ({ ...prev, ...Object.fromEntries(chunk.map((id) => [id, thumbnails?.[id] ?? null])) }));
    }
  }, [productId]);

  const request = useCallback((adId) => {
    if (!productId || !adId || requested.current.has(adId)) return;
    requested.current.add(adId);
    queue.current.push(adId);
    if (!timer.current) timer.current = setTimeout(flush, BATCH_DELAY_MS);
  }, [flush, productId]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = useMemo(() => ({ productId, fresh, request }), [productId, fresh, request]);
  return <AdMediaContext.Provider value={value}>{children}</AdMediaContext.Provider>;
}
AdMediaProvider.propTypes = { productId: PropTypes.string, children: PropTypes.node };

/**
 * The URL to show for an ad's thumbnail. `src` is null while an expired URL
 * is being refreshed, or when nothing loads; show a placeholder then.
 */
export function useAdThumb(ad, src = ad?.imageUrl || ad?.thumbnailUrl || null) {
  const ctx = useContext(AdMediaContext);
  const adId = ad?.adId;
  const canRefresh = Boolean(ctx?.productId && adId);
  const override = canRefresh ? ctx.fresh[adId] : undefined;
  const refreshed = override !== undefined;
  const current = refreshed ? override : src;
  const expired = canRefresh && !refreshed && metaUrlExpired(src);
  const [brokenSrc, setBrokenSrc] = useState(null);
  const request = ctx?.request;

  useEffect(() => { if (expired) request(adId); }, [expired, request, adId]);

  const onError = useCallback(() => {
    setBrokenSrc(current);
    if (canRefresh && !refreshed) request(adId);
  }, [current, canRefresh, refreshed, request, adId]);

  const shown = !current || expired || brokenSrc === current ? null : current;
  return { src: shown, onError, refreshing: canRefresh && !refreshed && (expired || brokenSrc === current) };
}

/** <img> for an ad thumbnail that refreshes itself from Meta; `fallback` when there is nothing to show. */
export function AdThumbImg({ ad, src, fallback = null, ...imgProps }) {
  const thumb = useAdThumb(ad, src ?? (ad?.imageUrl || ad?.thumbnailUrl || null));
  if (!thumb.src) return fallback;
  return <img alt="" {...imgProps} src={thumb.src} onError={thumb.onError} />;
}
AdThumbImg.propTypes = { ad: PropTypes.object, src: PropTypes.string, fallback: PropTypes.node };

/**
 * Drawer media: the poster, plus a play button for video ads that loads the
 * video from Meta only when pressed (a direct MP4 when Meta provides one,
 * otherwise Meta's own ad preview player).
 */
export function AdMediaPlayer({ ad, fallback = null }) {
  const ctx = useContext(AdMediaContext);
  const isVideo = String(ad?.mediaType || "").toLowerCase() === "video";
  const thumb = useAdThumb(ad);
  const [state, setState] = useState({ status: "idle" });
  const retried = useRef(false);

  useEffect(() => { setState({ status: "idle" }); retried.current = false; }, [ad?.adId]);

  const load = useCallback(async (fresh = false) => {
    if (!ctx?.productId || !ad?.adId) return;
    setState({ status: "loading" });
    try {
      const video = await creativeApi.getAdVideo(ctx.productId, ad.adId, fresh);
      setState({ status: "ready", ...video });
    } catch (e) {
      setState({ status: "error", message: e.message || "Couldn't load this video" });
    }
  }, [ctx?.productId, ad?.adId]);

  const onVideoError = useCallback(() => {
    // A stored URL can be revoked before its expiry: ask Meta once for a new one.
    if (!retried.current) { retried.current = true; load(true); return; }
    setState((s) => ({ status: "error", message: "This video couldn't be played", permalink: s.permalink }));
  }, [load]);

  if (state.status === "ready" && state.source) {
    return <video key={state.source} src={state.source} poster={thumb.src || undefined} controls autoPlay playsInline
      onError={onVideoError} className="block max-h-[460px] w-full bg-black object-contain" />;
  }
  if (state.status === "ready" && state.previewUrl) {
    return <div className="flex justify-center bg-white">
      <iframe src={state.previewUrl} title={`${ad.adName || "Ad"} preview`} allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen className="block h-[560px] w-full max-w-[400px] border-0" />
    </div>;
  }

  const poster = thumb.src ? <img src={thumb.src} alt="" onError={thumb.onError} /> : fallback;
  if (!isVideo || !ctx?.productId) return poster;
  const loading = state.status === "loading";
  return <div className="relative">
    {poster || <div className="aspect-[4/5]" />}
    <button type="button" onClick={() => load(false)} disabled={loading} aria-label={loading ? "Loading video" : "Play video"}
      className="absolute inset-0 grid place-items-center bg-black/10 transition-colors hover:bg-black/25 disabled:cursor-wait">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-black/60 text-white shadow-lg">
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Play className="ml-1 h-6 w-6 fill-white" />}
      </span>
    </button>
    {state.status === "error" && <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs text-neutral-700 shadow">
      <span className="min-w-0 flex-1">{state.message}</span>
      <button type="button" onClick={() => load(true)} className="inline-flex items-center gap-1 font-medium text-[#6c3403]"><RotateCcw className="h-3 w-3" />Retry</button>
      {state.permalink && <a href={state.permalink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[#6c3403]"><ExternalLink className="h-3 w-3" />Facebook</a>}
    </div>}
  </div>;
}
AdMediaPlayer.propTypes = { ad: PropTypes.object, fallback: PropTypes.node };
