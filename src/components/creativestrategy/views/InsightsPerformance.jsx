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
import { CsScrollArea } from "../ui";

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

function Section({ title, actions, children, noDivider = false }) {
  return (
    <section className={`cs-intel-insight ${noDivider ? "is-no-divider" : ""}`}>
      <header><h2>{title}</h2>{actions}</header>
      <div className="cs-intel-insight__body">{children}</div>
    </section>
  );
}
Section.propTypes = { title: PropTypes.string.isRequired, actions: PropTypes.node, children: PropTypes.node, noDivider: PropTypes.bool };

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
  cpa: { label: "Lowest CPA", value: (ad) => cpaOf(ad), asc: true },
  conversions: { label: "Conversions", value: (ad) => num(ad.purchases) || null },
  ctr: { label: "CTR", value: (ad) => num(ad.ctr) || null },
  hook_rate: { label: "Hook rate", value: (ad) => num(ad.hookRate) || null },
};
const FORMATS = [{ key: "all", label: "All" }, { key: "video", label: "Video" }, { key: "static", label: "Static" }];

const pct = (v, digits = 1) => `${v.toFixed(digits)}%`;

/** CPA against the account's blended CPA: within ±10% is "at average". */
function cpaTone(cpa, avgCpa) {
  if (!cpa || !avgCpa) return { tone: "", note: null };
  const ratio = cpa / avgCpa;
  if (ratio <= 0.9) return { tone: "is-good", note: `${Math.round((1 - ratio) * 100)}% below avg` };
  if (ratio >= 1.1) return { tone: "is-bad", note: `${Math.round((ratio - 1) * 100)}% above avg` };
  return { tone: "", note: "at avg" };
}

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

function Stat({ label, value, muted = false }) {
  return (
    <div className={`cs-top-stat ${muted ? "is-muted" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
Stat.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string.isRequired, muted: PropTypes.bool };

function PerformerCard({ ad, rank, avgCpa, root, onOpen }) {
  const video = isVideoAd(ad);
  const thumb = thumbOf(ad);
  const spend = num(ad.spend); const cpa = cpaOf(ad); const conv = num(ad.purchases);
  const ctr = num(ad.ctr); const cpm = num(ad.cpm); const freq = num(ad.frequency);
  const clicks = num(ad.clicks); const cpc = clicks > 0 ? spend / clicks : null;
  const hook = num(ad.hookRate); const watch = num(ad.avgWatchTime);
  const { tone, note } = cpaTone(cpa, avgCpa);
  const fatigued = isFatigued(ad, avgCpa);

  return (
    <article className="cs-top-card">
      <button type="button" onClick={() => thumb && onOpen(ad)} className="cs-top-card__media" aria-label={`Preview ${ad.adName || "ad"}`}>
        {thumb ? <LazyThumb root={root} src={thumb} /> : <div className="grid h-full w-full place-items-center text-[#c9a891]"><Zap className="h-5 w-5" /></div>}
        {video && thumb && <span className="cs-top-card__play"><Play className="ml-0.5 h-3.5 w-3.5 fill-white text-white" /></span>}
        <span className="cs-top-card__rank">{rank}</span>
        <span className="cs-top-card__format">{video ? "Video" : "Static"}</span>
      </button>

      <div className="cs-top-card__body">
        <p className="cs-top-card__name" title={ad.adName || "Unnamed"}>{ad.adName || "Unnamed"}</p>

        <div className="cs-top-card__headline">
          <div>
            <span>Spend</span>
            <strong>{fmt$(spend)}</strong>
          </div>
          <div className={tone}>
            <span>CPA</span>
            <strong>{cpa ? fmt$(cpa) : "—"}</strong>
          </div>
        </div>
        <p className="cs-top-card__sub">
          {conv > 0 ? `${conv.toLocaleString()} conversion${conv === 1 ? "" : "s"}` : "No conversions"}
          {note && <> · <span className={tone}>{note}</span></>}
        </p>

        <div className="cs-top-card__stats">
          <Stat label="CTR" value={ctr > 0 ? pct(ctr, 2) : "—"} />
          <Stat label="CPM" value={cpm > 0 ? fmtCents(cpm) : "—"} />
          <Stat label="CPC" value={cpc != null ? fmtCents(cpc) : "—"} />
          <Stat label="Freq." value={freq > 0 ? `${freq.toFixed(1)}×` : "—"} />
          <Stat label="Hook" value={video ? (hook > 0 ? pct(hook * 100) : "—") : "n/a"} muted={!video} />
          <Stat label="Watch" value={video ? (watch > 0 ? `${Math.round(watch)}s` : "—") : "n/a"} muted={!video} />
        </div>

        {fatigued && (
          <span className="cs-top-card__fatigue" title={`Frequency ${freq.toFixed(1)}×${cpa ? " with CPA above average" : ""}`}>
            <AlertTriangle className="h-3 w-3" />Fatigue risk
          </span>
        )}
      </div>
    </article>
  );
}
PerformerCard.propTypes = { ad: PropTypes.object.isRequired, rank: PropTypes.number.isRequired, avgCpa: PropTypes.number, root: PropTypes.object, onOpen: PropTypes.func.isRequired };

export function TopPerformers({ ads, limit = DEFAULT_LIMIT }) {
  const scrollRef = useRef(null);
  const [scrollRoot, setScrollRoot] = useState(null);
  const setStripRef = useCallback((el) => { scrollRef.current = el; setScrollRoot(el); }, []);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("all");
  const [fatiguedOnly, setFatiguedOnly] = useState(false);
  const [sortKey, setSortKey] = useState("spend");

  const avgCpa = useMemo(() => blendedCpa(ads), [ads]);
  const pool = useMemo(() => ads.filter((ad) => num(ad.spend) > 0), [ads]);
  const formatCounts = useMemo(() => ({
    all: pool.length, video: pool.filter(isVideoAd).length, static: pool.filter((ad) => !isVideoAd(ad)).length,
  }), [pool]);
  const fatiguedCount = useMemo(() => pool.filter((ad) => isFatigued(ad, avgCpa)).length, [pool, avgCpa]);

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

  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setExpanded(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  if (!pool.length) return null;
  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(el.clientWidth - 220, 220);
    el.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
  };
  const summary = filtersActive
    ? `${matchCount} match${matchCount === 1 ? "" : "es"}${matchCount > displayAds.length ? ` · top ${displayAds.length} shown` : ""}`
    : `Top ${displayAds.length} by ${SORTS[sortKey].label.toLowerCase()}`;

  return (
    <Section
      title="Top performers"
      noDivider
      actions={(
        <div className="flex items-center gap-2">
          <span className="cs-top-summary">{summary}{avgCpa ? ` · avg CPA ${fmt$(avgCpa)}` : ""}</span>
          <button type="button" onClick={() => scroll("left")} disabled={!canScrollLeft} aria-label="Scroll left" className="cs-top-arrow"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => scroll("right")} disabled={!canScrollRight} aria-label="Scroll right" className="cs-top-arrow"><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    >
      <div className="cs-top-controls">
        <div className="cs-top-search">
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ad name…" className="cs-research-input" aria-label="Search ad name" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X className="h-3.5 w-3.5" /></button>}
        </div>
        <div className="cs-weekly-switcher is-compact" role="group" aria-label="Format">
          {FORMATS.map((item) => (
            <button key={item.key} type="button" onClick={() => setFormat(item.key)} aria-pressed={format === item.key}
              className={`cs-weekly-switcher__item ${format === item.key ? "is-active" : ""}`}>
              {item.label} <span>{formatCounts[item.key]}</span>
            </button>
          ))}
        </div>
        <div className="cs-weekly-switcher is-compact">
          <button type="button" onClick={() => setFatiguedOnly((v) => !v)} aria-pressed={fatiguedOnly}
            className={`cs-weekly-switcher__item ${fatiguedOnly ? "is-active" : ""}`}>
            <AlertTriangle className="h-3 w-3" />Fatigued <span>{fatiguedCount}</span>
          </button>
        </div>
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="cs-weekly-filter-select cs-top-sort px-3"><SelectValue /></SelectTrigger>
          <SelectContent className="cs-select-content bg-white">
            {Object.keys(SORTS).map((key) => <SelectItem key={key} value={key}>Sort: {SORTS[key].label}</SelectItem>)}
          </SelectContent>
        </Select>
        {filtersActive && <button type="button" onClick={() => { setQuery(""); setFormat("all"); setFatiguedOnly(false); }} className="cs-weekly-clear">Clear filters</button>}
      </div>

      {!displayAds.length && <p className="cs-research-muted py-8 text-center">No ads match these filters.</p>}

      <CsScrollArea
        axis="x"
        viewportClassName="cs-top-strip-viewport"
        viewportRef={setStripRef}
        viewportProps={{ onScroll: updateScrollState }}
      >
        <div className="cs-top-strip">
          {displayAds.map((ad, idx) => (
            <PerformerCard key={ad.adId || idx} ad={ad} rank={idx + 1} avgCpa={avgCpa} root={scrollRoot} onOpen={setExpanded} />
          ))}
        </div>
      </CsScrollArea>

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setExpanded(null)}>
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
          <div className="cs-top-preview" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={expanded.adName || "Ad preview"}>
            <button type="button" onClick={() => setExpanded(null)} aria-label="Close" className="cs-top-preview__close"><X className="h-4 w-4" /></button>
            <div className="cs-top-preview__media"><img src={thumbOf(expanded)} alt="" /></div>
            <p>{expanded.adName}</p>
          </div>
        </div>
      )}
    </Section>
  );
}
TopPerformers.propTypes = { ads: PropTypes.array.isRequired, limit: PropTypes.number };
