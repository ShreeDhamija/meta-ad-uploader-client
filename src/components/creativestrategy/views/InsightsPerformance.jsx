// Insights performance views ported from the source app's Insights tab:
//   SpendCpaChart  — "Spend vs CPA" bubble chart (PerformanceCharts.tsx)
//   TopPerformers  — top 50 ads as one horizontally scrolling row of vertical
//                    cards (WinnersSpotlight.tsx)
// Both read the same per-ad rows the rest of Insights uses (camelCase fields).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { AlertTriangle, ChevronLeft, ChevronRight, Play, Search, X, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const VIDEO_COLOR = "#2563eb";
const STATIC_COLOR = "#f59e0b";

const isVideoAd = (ad) => String(ad.mediaType || "").toLowerCase() === "video";
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const thumbOf = (ad) => ad.imageUrl || ad.thumbnailUrl || null;

function fmt$(v) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}
function fmtCents(v) {
  return v >= 100 ? fmt$(v) : `$${v.toFixed(2)}`;
}
const cpaOf = (ad) => num(ad.costPerPurchase) || (num(ad.purchases) > 0 ? num(ad.spend) / num(ad.purchases) : null);

/** Spend-weighted CPA across ads (total spend ÷ total conversions). */
function blendedCpa(ads) {
  let spend = 0; let conversions = 0;
  for (const ad of ads) { spend += num(ad.spend); conversions += num(ad.purchases); }
  return conversions > 0 ? spend / conversions : null;
}

/** Fatigued = frequency above 3, or above 2 with CPA 20%+ over the account average. */
function isFatigued(ad, avgCpa) {
  const freq = num(ad.frequency);
  if (freq > 3) return true;
  const cpa = num(ad.costPerPurchase);
  return freq > 2 && cpa > 0 && avgCpa != null && cpa > avgCpa * 1.2;
}

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos); const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Tukey "far out" fences (Q1 − 3·IQR, Q3 + 3·IQR): only extreme points — a
 * one-conversion $900 CPA, or one ad with 10× everyone's spend — are hidden.
 */
function outlierFences(values) {
  if (values.length < 8) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25); const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  if (iqr <= 0) return null;
  return { lo: q1 - 3 * iqr, hi: q3 + 3 * iqr };
}

function Section({ title, actions, children }) {
  return (
    <section className="cs-intel-insight">
      <header><h2>{title}</h2>{actions}</header>
      <div className="cs-intel-insight__body">{children}</div>
    </section>
  );
}
Section.propTypes = { title: PropTypes.string.isRequired, actions: PropTypes.node, children: PropTypes.node };

// ── Spend vs CPA ─────────────────────────────────────────────────────────────

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="flex max-w-[340px] gap-2.5 rounded-lg border border-neutral-200 bg-white p-2 text-xs shadow-md">
      {d.thumb
        ? <img src={d.thumb} alt="" className="h-20 w-14 shrink-0 rounded object-cover bg-neutral-100" />
        : <div className="grid h-20 w-14 shrink-0 place-items-center rounded bg-neutral-100 text-neutral-400"><Zap className="h-4 w-4" /></div>}
      <div className="min-w-0">
        {/* Full name, wrapped — ad names are long and often differ only at the end. */}
        <p className="break-words font-medium text-neutral-800">{d.name}</p>
        <p className="mt-1 text-neutral-500">Spend: {fmt$(d.spend)}</p>
        <p className="text-neutral-500">CPA: {fmt$(d.cpa)}</p>
        <p className="text-neutral-500">Conversions: {d.conversions}</p>
      </div>
    </div>
  );
}
ScatterTooltip.propTypes = { active: PropTypes.bool, payload: PropTypes.array };

export function SpendCpaChart({ ads }) {
  const [showOutliers, setShowOutliers] = useState(false);
  const allData = useMemo(() => ads
    .filter((ad) => num(ad.spend) > 0)
    .map((ad) => {
      const cpa = cpaOf(ad);
      if (cpa == null) return null;
      return { name: ad.adName || "Unnamed", spend: num(ad.spend), cpa, conversions: num(ad.purchases),
        thumb: thumbOf(ad), fill: isVideoAd(ad) ? VIDEO_COLOR : STATIC_COLOR };
    })
    .filter(Boolean), [ads]);

  const { inliers, outlierCount } = useMemo(() => {
    const cpaF = outlierFences(allData.map((d) => d.cpa));
    const spendF = outlierFences(allData.map((d) => d.spend));
    const inside = (v, f) => !f || (v >= f.lo && v <= f.hi);
    const kept = allData.filter((d) => inside(d.cpa, cpaF) && inside(d.spend, spendF));
    return { inliers: kept, outlierCount: allData.length - kept.length };
  }, [allData]);

  if (allData.length < 2) return null;
  const data = showOutliers ? allData : inliers;

  return (
    <Section title="Spend vs CPA" actions={<span className="text-xs text-neutral-400">bubble size = conversions</span>}>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: VIDEO_COLOR }} /> Video</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: STATIC_COLOR }} /> Static</span>
        {outlierCount > 0 && (
          <span className="ml-auto flex items-center gap-2">
            {showOutliers ? `showing all ${allData.length} ads` : `${outlierCount} extreme outlier${outlierCount === 1 ? "" : "s"} hidden`}
            <button type="button" onClick={() => setShowOutliers((v) => !v)} className="font-medium text-[#854413] hover:underline">
              {showOutliers ? "Hide outliers" : "Show all"}
            </button>
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis type="number" dataKey="spend" name="Spend" tickFormatter={fmt$} tick={{ fontSize: 11, fill: "#78716c" }} />
          <YAxis type="number" dataKey="cpa" name="CPA" tickFormatter={fmt$} tick={{ fontSize: 11, fill: "#78716c" }} />
          <ZAxis type="number" dataKey="conversions" range={[40, 400]} name="Conversions" />
          <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={data} fillOpacity={0.75}>
            {data.map((point, index) => <Cell key={index} fill={point.fill} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </Section>
  );
}
SpendCpaChart.propTypes = { ads: PropTypes.array.isRequired };

// ── Top performers ───────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 50;
const SORTS = {
  spend: { label: "Spend", value: (ad) => num(ad.spend) || null },
  cpa: { label: "Lowest CPA", value: (ad) => num(ad.costPerPurchase) || null, asc: true },
  conversions: { label: "Conversions", value: (ad) => num(ad.purchases) || null },
  ctr: { label: "CTR", value: (ad) => num(ad.ctr) || null },
  hook_rate: { label: "Hook rate", value: (ad) => num(ad.hookRate) || null },
};
const FORMATS = [["all", "All"], ["video", "Video"], ["static", "Static"]];

function Metric({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] leading-tight text-neutral-400">{label}</p>
      <p className="truncate text-xs font-semibold leading-tight text-neutral-800 tabular-nums">{value}</p>
    </div>
  );
}
Metric.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string.isRequired };

/** Loads the image only once the card is near the visible part of the strip. */
function LazyThumb({ root, src }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return undefined;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return undefined; }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) setVisible(true); },
      { root, rootMargin: "0px 320px" });
    io.observe(el);
    return () => io.disconnect();
  }, [root, visible]);
  return <div ref={ref} className="h-full w-full">{visible && <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>;
}
LazyThumb.propTypes = { root: PropTypes.object, src: PropTypes.string.isRequired };

export function TopPerformers({ ads, limit = DEFAULT_LIMIT }) {
  const scrollRef = useRef(null);
  const [scrollRoot, setScrollRoot] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("all");
  const [fatiguedOnly, setFatiguedOnly] = useState(false);
  const [sortKey, setSortKey] = useState("spend");

  const avgCpa = useMemo(() => blendedCpa(ads), [ads]);
  const pool = useMemo(() => ads.filter((ad) => num(ad.spend) > 0), [ads]);

  // Filters run over every ad with spend, then the limit applies — so a search
  // can surface an ad outside the top 50.
  const { displayAds, matchCount } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const { value, asc } = SORTS[sortKey];
    const matched = pool.filter((ad) => {
      if (q && !String(ad.adName || "").toLowerCase().includes(q)) return false;
      if (format === "video" && !isVideoAd(ad)) return false;
      if (format === "static" && isVideoAd(ad)) return false;
      if (fatiguedOnly && !isFatigued(ad, avgCpa)) return false;
      return true;
    });
    const sorted = [...matched].sort((a, b) => {
      const va = value(a); const vb = value(b);
      // Ads without the metric sink to the end, ordered by spend.
      if (va == null && vb == null) return num(b.spend) - num(a.spend);
      if (va == null) return 1;
      if (vb == null) return -1;
      return asc ? va - vb : vb - va;
    });
    return { displayAds: sorted.slice(0, limit), matchCount: matched.length };
  }, [pool, query, format, fatiguedOnly, sortKey, avgCpa, limit]);

  const filtersActive = query.trim() !== "" || format !== "all" || fatiguedOnly;

  useEffect(() => { scrollRef.current?.scrollTo({ left: 0 }); }, [query, format, fatiguedOnly, sortKey]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);
  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [updateScrollState, displayAds.length]);

  if (!pool.length) return null;
  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -Math.max(el.clientWidth - 220, 220) : Math.max(el.clientWidth - 220, 220), behavior: "smooth" });
  };
  const arrow = "grid h-6 w-6 place-items-center rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-40";

  return (
    <Section
      title="Top performers"
      actions={<div className="flex items-center gap-2">
        <span className="text-xs text-neutral-400">
          {filtersActive
            ? `${matchCount} match${matchCount === 1 ? "" : "es"}${matchCount > displayAds.length ? ` · showing top ${displayAds.length}` : ""}`
            : `top ${displayAds.length} by ${SORTS[sortKey].label.toLowerCase()}`}
        </span>
        <button type="button" onClick={() => scroll("left")} disabled={!canScrollLeft} aria-label="Scroll left" className={arrow}><ChevronLeft className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => scroll("right")} disabled={!canScrollRight} aria-label="Scroll right" className={arrow}><ChevronRight className="h-3.5 w-3.5" /></button>
      </div>}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ad name…"
            className="h-8 w-full rounded-md border border-neutral-200 bg-white pl-7 pr-7 text-xs outline-none focus:border-neutral-400" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"><X className="h-3.5 w-3.5" /></button>}
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-neutral-200 bg-white">
          {FORMATS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFormat(key)} aria-pressed={format === key}
              className={`h-8 px-2.5 text-xs ${format === key ? "bg-neutral-800 text-white" : "text-neutral-600 hover:bg-neutral-50"}`}>{label}</button>
          ))}
        </div>
        <button type="button" onClick={() => setFatiguedOnly((v) => !v)} aria-pressed={fatiguedOnly}
          className={`inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs ${fatiguedOnly ? "border-amber-400 bg-amber-50 text-amber-700" : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"}`}>
          <AlertTriangle className="h-3 w-3" />Fatigued only
        </button>
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="h-8 w-[160px] bg-white text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white">
            {Object.keys(SORTS).map((key) => <SelectItem key={key} value={key} className="text-xs">Sort: {SORTS[key].label}</SelectItem>)}
          </SelectContent>
        </Select>
        {filtersActive && <button type="button" onClick={() => { setQuery(""); setFormat("all"); setFatiguedOnly(false); }} className="text-xs font-medium text-[#854413] hover:underline">Clear filters</button>}
      </div>

      {!displayAds.length && <p className="py-6 text-center text-xs text-neutral-400">No ads match these filters.</p>}

      <div ref={(el) => { scrollRef.current = el; setScrollRoot(el); }} onScroll={updateScrollState}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2" style={{ scrollbarWidth: "thin" }}>
        {displayAds.map((ad, idx) => {
          const video = isVideoAd(ad);
          const thumb = thumbOf(ad);
          const spend = num(ad.spend); const cpa = num(ad.costPerPurchase); const ctr = num(ad.ctr); const cpm = num(ad.cpm);
          const clicks = num(ad.clicks); const cpc = clicks > 0 ? spend / clicks : null;
          const watch = num(ad.avgWatchTime); const freq = num(ad.frequency);
          return (
            <div key={ad.adId || idx} className="w-[120px] shrink-0 snap-start overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {/* 9:16 thumbnail — click to enlarge */}
              <button type="button" onClick={() => thumb && setExpanded(ad)} className="group relative block aspect-[9/16] w-full bg-neutral-900">
                {thumb ? <LazyThumb root={scrollRoot} src={thumb} /> : <div className="grid h-full w-full place-items-center text-neutral-500"><Zap className="h-5 w-5" /></div>}
                {video && thumb && (
                  <div className="absolute inset-0 grid place-items-center bg-black/20 transition-colors group-hover:bg-black/40">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-black/60"><Play className="ml-0.5 h-4 w-4 fill-white text-white" /></div>
                  </div>
                )}
                <div className="absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#854413] text-[11px] font-bold text-white shadow">{idx + 1}</div>
                <span className="absolute right-1.5 top-1.5 rounded border border-white/20 bg-black/50 px-1.5 text-[9px] text-white">{video ? "Video" : "Static"}</span>
              </button>
              <div className="space-y-2 px-2 py-2">
                {/* Full name, wrapped — the differences are often at the end. */}
                <p className="break-all text-[11px] font-medium leading-snug text-neutral-800">{ad.adName || "Unnamed"}</p>
                {isFatigued(ad, avgCpa) && (
                  <span title={`Frequency ${freq.toFixed(1)}× — high frequency${ad.costPerPurchase ? " with CPA above average" : ""}`}
                    className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                    <AlertTriangle className="h-3 w-3" />Fatigue
                  </span>
                )}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  <Metric label="Spend" value={fmt$(spend)} />
                  <Metric label="CPA" value={cpa ? fmt$(cpa) : "—"} />
                  <Metric label="Conv." value={num(ad.purchases) > 0 ? String(ad.purchases) : "—"} />
                  <Metric label="CTR" value={ctr > 0 ? `${ctr.toFixed(2)}%` : "—"} />
                  <Metric label="CPM" value={cpm > 0 ? fmtCents(cpm) : "—"} />
                  <Metric label="CPC" value={cpc != null ? fmtCents(cpc) : "—"} />
                  {video && <Metric label="Hook rate" value={num(ad.hookRate) > 0 ? `${(num(ad.hookRate) * 100).toFixed(1)}%` : "—"} />}
                  {video && <Metric label="Avg watch" value={watch > 0 ? `${Math.round(watch)}s` : "—"} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setExpanded(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative mx-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setExpanded(null)} aria-label="Close"
              className="absolute -right-3 -top-3 z-10 grid h-7 w-7 place-items-center rounded-full border border-neutral-200 bg-white hover:bg-neutral-50"><X className="h-4 w-4" /></button>
            <div className="aspect-[9/16] overflow-hidden rounded-lg bg-black">
              <img src={thumbOf(expanded)} alt="" className="h-full w-full object-contain" />
            </div>
            <p className="mt-2 break-all px-1 text-sm font-medium text-white">{expanded.adName}</p>
          </div>
        </div>
      )}
    </Section>
  );
}
TopPerformers.propTypes = { ads: PropTypes.array.isRequired, limit: PropTypes.number };
