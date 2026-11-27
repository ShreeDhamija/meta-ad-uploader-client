// Monthly Review (= the source app's Product Intelligence "Monthly Review" tab).
// Reads the product's stored snapshot (built by the monthly_review job: one
// Meta pull + stored analysis; rebuilt weekly by the cron or the Refresh
// button). The six-month "what the winners had in common" chart comes first:
// one column per launch month, split by the winners' existing tags. Month
// pills below it switch the month: its scorecards, summary, and each concept
// (a batch of ad variants) with its winning variant.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { CalendarRange, ChevronDown, Filter, Layers, Loader2, Play, Trophy, X, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { creativeApi } from "@/lib/creativeApi";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorBanner, ProgressiveSection } from "../ui";
import { useJobRunner } from "../JobsContext";
import RunBy from "../run-by";
import StrategyMapView from "./StrategyMapView";
import { MAP_LAYOUTS } from "../strategy-map";

// The map is the default; the original review (leaderboard + concepts per
// launch month) stays as its own tab.
const REVIEW_TABS = [
  { key: "map", label: "Strategy map", hint: "What exists, what's working, and where the gaps are." },
  { key: "months", label: "Month by month", hint: "Every concept launched each month and the variant that won it." },
];

const money = (v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${Math.round(v || 0)}`);
const NAME_FILTER_MAX = 100;

const DIMENSIONS = [
  { key: "persona", label: "Persona", plural: "personas" },
  { key: "primary_angle", label: "Angle", plural: "angles" },
  { key: "messaging_theme", label: "Messaging theme", plural: "themes" },
  { key: "hook_style", label: "Hook style", plural: "hook styles" },
  { key: "emotional_trigger", label: "Emotion", plural: "emotions" },
  { key: "visual_style", label: "Visual style", plural: "visual styles" },
  { key: "awareness_stage", label: "Awareness stage", plural: "awareness stages" },
  { key: "format", label: "Format", plural: "formats" },
];
const LEADERBOARD_TOP = 10;

// Chart series: the top values in fixed categorical order (validated palette:
// adjacent CVD ΔE ≥ 9.1, normal-vision ΔE ≥ 19.6 on a light surface), then
// "Other" and "Not analyzed" in neutral grays. Colors follow the value's rank
// for the chosen dimension over the whole six months, so a month never
// repaints a value.
const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const OTHER = { key: "__other", label: "Other", color: "#a8a29e" };
const UNTAGGED = { key: "__untagged", label: "Not analyzed yet", color: "#dcd9d4" };

/** The ad name without its campaign / format / month prefix when a name filter is set. */
function creativeName(name, token) {
  if (!token || !name) return name;
  const parts = name.split("__");
  const i = parts.findIndex((p) => p.toLowerCase().includes(token.toLowerCase()));
  if (i < 0 || i === parts.length - 1) return name;
  return parts.slice(i + 1).map((p) => p.trim()).filter(Boolean).join("__") || name;
}

export default function MonthlyReviewView({ ctx }) {
  const { selectedProductId, renderHeaderActions } = ctx;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [month, setMonth] = useState(null);
  const [dimension, setDimension] = useState("persona");
  const [preview, setPreview] = useState(null);
  const [tab, setTab] = useState("map");
  const [mapLayout, setMapLayout] = useState("grid");
  const currentProduct = useRef(selectedProductId);
  currentProduct.current = selectedProductId;

  const load = useCallback(async (pid) => {
    if (!pid) return;
    setLoading(true);
    setErr(null);
    try {
      const response = await creativeApi.getMonthlyReview(pid);
      if (currentProduct.current === pid) setData(response);
    } catch (e) {
      if (currentProduct.current === pid) setErr(e.message);
    } finally {
      if (currentProduct.current === pid) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setData(null); setMonth(null); setErr(null);
    if (selectedProductId) load(selectedProductId);
  }, [load, selectedProductId]);

  const { job, start } = useJobRunner({ kind: "monthly_review", productId: selectedProductId, onComplete: () => load(selectedProductId), onFail: () => load(selectedProductId) });
  const jobActive = Boolean(job && (job.status == null || job.status === "queued" || job.status === "running"));
  // Refresh/setup also analyze winners Insights never read (it only covers
  // top spenders), then rebuild the review so they get tags.
  const { job: winnersJob } = useJobRunner({ kind: "analyze_ads", productId: selectedProductId, match: (j) => j.only === "winners", restoreFinished: false });
  const winnersActive = Boolean(winnersJob && (winnersJob.status == null || winnersJob.status === "queued" || winnersJob.status === "running"));

  const run = async () => {
    if (!selectedProductId) return;
    setErr(null);
    try { const { jobId } = await creativeApi.runMonthlyReview(selectedProductId); start(jobId); }
    catch (e) { setErr(e.message); }
  };

  const snapshot = data?.snapshot || null;
  const review = snapshot?.review || null;
  const media = data?.media || {};
  const token = review?.name_token ?? null;
  const months = review?.months || [];
  const activeMonth = months.find((m) => m.month === month) || months.find((m) => m.concepts.length > 0) || months[0] || null;

  const saveNameFilter = async (value) => {
    await creativeApi.saveMonthlyReviewNameFilter(selectedProductId, value);
    setData((current) => (current ? { ...current, nameFilter: value } : current));
    await run();
  };

  const computedLabel = snapshot?.computedAt
    ? new Date(snapshot.computedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <div className="space-y-5">
      {renderHeaderActions(
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-2">
            <button type="button" onClick={run} disabled={!selectedProductId || jobActive} className="cs-primary-button">
              {jobActive && <Loader2 className="h-4 w-4 animate-spin" />}
              {jobActive ? "Pulling from Meta…" : review ? "Refresh Review" : "Build Review"}
            </button>
            <p className="text-[11px] text-neutral-500">Updated: {computedLabel && review ? <time dateTime={snapshot.computedAt}>{computedLabel}</time> : "Not built yet"}{computedLabel && review && snapshot.computedBy && <>{" "}<RunBy uid={snapshot.computedBy.uid} auto={snapshot.computedBy.auto} /></>}</p>
          </div>
        </div>,
      )}
      <ErrorBanner message={err} />

      {selectedProductId && (
        <div className="cs-monthly-tabs">
          <div className="cs-weekly-switchers-row">
            <div className="cs-weekly-switcher" role="tablist" aria-label="Monthly review view">
              {REVIEW_TABS.map((t) => (
                <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`cs-weekly-switcher__item ${tab === t.key ? "is-active" : ""}`}>{t.label}</button>
              ))}
            </div>
            {tab === "map" && (
              <div className="cs-weekly-switcher" role="tablist" aria-label="Map layout">
                {MAP_LAYOUTS.map((l) => (
                  <button key={l.key} type="button" role="tab" aria-selected={mapLayout === l.key} onClick={() => setMapLayout(l.key)} className={`cs-weekly-switcher__item ${mapLayout === l.key ? "is-active" : ""}`}>{l.label}</button>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11.5px] text-neutral-500">{REVIEW_TABS.find((t) => t.key === tab).hint}</p>
        </div>
      )}

      {tab === "map" && selectedProductId ? (
        <StrategyMapView ctx={ctx} view={mapLayout} onViewChange={setMapLayout} refreshKey={snapshot?.computedAt ?? null} onOpenMonth={(m) => { setMonth(m); setTab("months"); }} />
      ) : !selectedProductId ? (
        <EmptyState icon={CalendarRange} title="No product selected" hint="Select a product above to see its monthly creative review." className="min-h-[420px]" />
      ) : loading && !data ? (
        <ProgressiveSection title="Monthly review" description="Loading the stored review…" active cards={4} />
      ) : !review ? (
        <EmptyState
          icon={CalendarRange}
          title={snapshot?.status === "no_ad_account" ? "No Meta ad account linked" : snapshot?.status === "error" ? "The last build failed" : "No review built yet"}
          hint={snapshot?.status === "error" ? snapshot.note : snapshot?.status === "no_ad_account" ? snapshot.note : "It rebuilds automatically every week, or click Build Review. Concepts are grouped from your ad names over the last six months."}
          action={<NameFilterControl current={data?.nameFilter ?? null} busy={jobActive} onSave={saveNameFilter} />}
          className="min-h-[420px]"
        />
      ) : (
        <>
          <div className="cs-monthly-toolbar">
            <ReviewMeta review={review} snapshot={snapshot} nameFilter={data?.nameFilter ?? null} />
            <NameFilterControl current={data?.nameFilter ?? null} busy={jobActive} onSave={saveNameFilter} />
          </div>

          {winnersActive && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900" role="status">
              <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
              <p>Analyzing winning variants that haven&apos;t been analyzed yet, so they get persona, angle and style tags. The review rebuilds on its own when this finishes. Follow it in the job tracker.</p>
            </div>
          )}

          {/* Six-month view first: it doesn't depend on the month picked below. */}
          <Leaderboard review={review} dimension={dimension} setDimension={setDimension} token={token} winnersActive={winnersActive} />

          <div className="cs-monthly-month-bar">
            <div className="text-center">
              <h2>Month by month</h2>
              <p>Pick a launch month to see the concepts it shipped and which variant won each batch.</p>
            </div>
            <div className="cs-weekly-switcher cs-monthly-month-switcher" role="tablist" aria-label="Launch month">
              {months.map((m) => (
                <button
                  key={m.month}
                  type="button"
                  role="tab"
                  aria-selected={activeMonth?.month === m.month}
                  onClick={() => setMonth(m.month)}
                  className={`cs-weekly-switcher__item ${activeMonth?.month === m.month ? "is-active" : ""}`}
                >
                  {m.label} <span>{m.concepts.length}</span>
                </button>
              ))}
            </div>
          </div>

          {activeMonth && (
            <div className={`cs-monthly-overview ${activeMonth.summary ? "" : "is-single"}`}>
              <MonthKpis month={activeMonth} />
              {activeMonth.summary && <MonthSummary summary={activeMonth.summary} label={activeMonth.label} />}
            </div>
          )}

          {activeMonth && <ConceptsLaunched key={activeMonth.month} month={activeMonth} media={media} token={token} onPreview={setPreview} />}
        </>
      )}

      <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="break-words text-sm">{preview?.name}</DialogTitle>
            <DialogDescription>{preview?.caption || (preview?.isVideo ? "Video ad · opening frame" : "Static ad")}</DialogDescription>
          </DialogHeader>
          {preview && <img src={preview.url} alt="" className="w-full rounded-xl object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
MonthlyReviewView.propTypes = { ctx: PropTypes.object.isRequired };

function ReviewMeta({ review, snapshot, nameFilter }) {
  const totalConcepts = review.months.reduce((s, m) => s + m.concepts.length, 0);
  const builtWith = review.name_token ?? null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
      <span>{totalConcepts} concepts · {review.ads_seen} ads over six months</span>
      {review.parser === "generic" && <span title="No consistent naming convention could be learned, so names are grouped on their non-version parts">Grouped by ad name (no naming convention found)</span>}
      {review.ads_unparsed > 0 && <span>{review.ads_unparsed} ad{review.ads_unparsed === 1 ? "" : "s"} didn&apos;t fit and {review.ads_unparsed === 1 ? "is" : "are"} left out</span>}
      {(nameFilter ?? null) !== builtWith && <span className="text-amber-600">Name filter changed — refresh to rebuild</span>}
      {snapshot.status === "error" && <span className="text-amber-600">Last refresh failed ({snapshot.note}) — showing the previous build</span>}
      {snapshot.note && snapshot.status !== "error" && <span>{snapshot.note}</span>}
    </div>
  );
}
ReviewMeta.propTypes = { review: PropTypes.object.isRequired, snapshot: PropTypes.object.isRequired, nameFilter: PropTypes.string };

function MonthKpis({ month }) {
  const variants = month.concepts.reduce((s, c) => s + c.variants.length, 0);
  const spend = month.concepts.reduce((s, c) => s + c.spend, 0);
  const conversions = month.concepts.reduce((s, c) => s + c.variants.reduce((t, v) => t + (v.conversions || 0), 0), 0);
  const winners = month.concepts.map((c) => c.variants.find((v) => v.is_winner)).filter(Boolean);
  const kpis = [
    ["Concepts launched", month.concepts.length],
    ["Variants tested", variants],
    ["Avg. variants per concept", month.concepts.length ? (variants / month.concepts.length).toFixed(1) : "—"],
    ["Spend", money(spend)],
    ["Conversions", conversions || "—"],
    ["Blended CPA", conversions > 0 ? money(spend / conversions) : "—"],
  ];
  return (
    <section className="cs-intel-panel cs-monthly-scorecards" aria-label={`${month.label} totals`}>
      <header className="cs-intel-panel__header"><h2>{month.label} scorecard</h2></header>
      <div className="cs-intel-panel__body">
        <div className="cs-monthly-kpi-grid">
          {kpis.map(([label, value]) => <div key={label} className="cs-intel-kpi"><span>{label}</span><strong>{value}</strong></div>)}
        </div>
        <p className="sr-only">{winners.length} concepts have a winner.</p>
      </div>
    </section>
  );
}
MonthKpis.propTypes = { month: PropTypes.object.isRequired };

function MonthSummary({ summary, label }) {
  return (
    <section className="cs-intel-panel">
      <header className="cs-intel-panel__header"><h2>{label} summary</h2></header>
      <div className="cs-intel-panel__body space-y-3">
        <p className="text-[13.5px] font-medium leading-relaxed text-neutral-800">{summary.headline}</p>
        <div className="cs-intel-two-column cs-monthly-summary-boxes">
          {summary.winning_angles?.length > 0 && (
            <div className="cs-intel-content-card">
              <h3 className="cs-intel-subsection-title">Winning angles</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[12.5px] leading-relaxed text-neutral-600">{summary.winning_angles.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </div>
          )}
          {summary.learnings?.length > 0 && (
            <div className="cs-intel-content-card">
              <h3 className="cs-intel-subsection-title">Take into next month</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[12.5px] leading-relaxed text-neutral-600">{summary.learnings.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
MonthSummary.propTypes = { summary: PropTypes.object.isRequired, label: PropTypes.string.isRequired };

// Concepts with less spend than this are small tests: counted, but folded away
// by default so the month reads as its real bets.
const SMALL_TEST_SPEND = 100;
const CONCEPT_SORTS = {
  spend: { label: "Spend", by: (a, b) => b.spend - a.spend },
  cpa: { label: "Lowest CPA", by: (a, b) => (a.cpa ?? Infinity) - (b.cpa ?? Infinity) || b.spend - a.spend },
  variants: { label: "Most variants", by: (a, b) => b.variants.length - a.variants.length || b.spend - a.spend },
};

const conceptStats = (concept) => {
  const conversions = concept.variants.reduce((s, v) => s + (v.conversions || 0), 0);
  return { ...concept, conversions, cpa: conversions > 0 ? concept.spend / conversions : null };
};

function ConceptsLaunched({ month, media, token, onPreview }) {
  const [sortKey, setSortKey] = useState("spend");
  const [showSmall, setShowSmall] = useState(false);
  const concepts = useMemo(() => month.concepts.map(conceptStats), [month]);
  const totals = useMemo(() => {
    const spend = concepts.reduce((s, c) => s + c.spend, 0);
    const conversions = concepts.reduce((s, c) => s + c.conversions, 0);
    return { spend, avgCpa: conversions > 0 ? spend / conversions : null };
  }, [concepts]);
  const sorted = useMemo(() => [...concepts].sort(CONCEPT_SORTS[sortKey].by), [concepts, sortKey]);
  const main = sorted.filter((c) => c.spend >= SMALL_TEST_SPEND);
  const small = sorted.filter((c) => c.spend < SMALL_TEST_SPEND);
  // A month of nothing but small tests still shows them.
  const visible = main.length === 0 || showSmall ? sorted : main;

  return (
    <section className="cs-intel-panel">
      <header className="cs-intel-panel__header">
        <div className="min-w-0">
          <h2>Concepts launched · {month.label}</h2>
          <p className="cs-intel-panel__subheader">
            Each card is one concept: a batch of ad variants (different hooks, edits or cuts) testing the same idea. The winning variant, shown first, is the one Meta put the most spend behind.
          </p>
        </div>
        {concepts.length > 1 && (
          <Select value={sortKey} onValueChange={setSortKey}>
            <SelectTrigger className="cs-weekly-filter-select cs-panel-select" aria-label="Sort concepts"><SelectValue /></SelectTrigger>
            <SelectContent className="cs-select-content bg-white">
              {Object.entries(CONCEPT_SORTS).map(([key, s]) => <SelectItem key={key} value={key}>Sort: {s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </header>
      <div className="cs-intel-panel__body">
        {concepts.length === 0 ? (
          <p className="text-xs text-neutral-500">No concepts launched in {month.label}{token ? ` with "${token}" in the name` : ""}.</p>
        ) : (
          <div className="cs-mc-list">
            {visible.map((c) => (
              <ConceptCard key={c.key} concept={c} monthSpend={totals.spend} avgCpa={totals.avgCpa} media={media} token={token} onPreview={onPreview} />
            ))}
            {main.length > 0 && small.length > 0 && (
              <button type="button" className="cs-research-details-button cs-intel-more-button" aria-expanded={showSmall} onClick={() => setShowSmall((s) => !s)}>
                {showSmall
                  ? <>Hide small tests<ChevronDown className="h-3.5 w-3.5 rotate-180" /></>
                  : <>Show {small.length} small test{small.length === 1 ? "" : "s"} under {money(SMALL_TEST_SPEND)}<ChevronDown className="h-3.5 w-3.5" /></>}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
ConceptsLaunched.propTypes = { month: PropTypes.object.isRequired, media: PropTypes.object.isRequired, token: PropTypes.string, onPreview: PropTypes.func.isRequired };

/** CPA against the month's blended CPA: within ±10% is neutral. */
const cpaTone = (cpa, avg) => (cpa == null || !avg ? "" : cpa <= avg * 0.9 ? "is-good" : cpa >= avg * 1.1 ? "is-bad" : "");
const isVideoVariant = (variant, concept) => String(variant?.media_type || concept.format || "").toLowerCase().includes("video");

function ConceptCard({ concept, monthSpend, avgCpa, media, token, onPreview }) {
  const [open, setOpen] = useState(false);
  const winner = concept.variants.find((v) => v.is_winner);
  const thumb = winner?.storage_path ? media[winner.storage_path] : null;
  const isVideo = isVideoVariant(winner, concept);
  const name = (n) => creativeName(n, token);
  const variants = [...concept.variants].sort((a, b) => b.spend - a.spend);
  const multi = variants.length > 1;
  const share = monthSpend > 0 ? concept.spend / monthSpend : 0;
  // The other variants of the batch that have a stored creative to show.
  const siblings = variants.filter((v) => !v.is_winner && v.storage_path && media[v.storage_path]).slice(0, 4);
  const openVariant = (v) => {
    const url = v.storage_path ? media[v.storage_path] : null;
    if (!url) return;
    const rank = variants.indexOf(v) + 1;
    onPreview({
      url, isVideo: isVideoVariant(v, concept), name: name(v.ad_names[0]),
      caption: `${v.is_winner ? "Winning variant" : `Variant ${rank} of ${variants.length}`} · ${Math.round((v.spend_share || 0) * 100)}% of the batch's spend`,
    });
  };

  return (
    <article className={`cs-mc ${open ? "is-open" : ""}`}>
      {/* The winning variant leads the card: it's what the batch produced. */}
      {winner && (
        <div className={`cs-mc__winner-banner ${multi ? "" : "is-solo"}`}>
          <span className="cs-mc__winner-pill">
            <Trophy className="h-3.5 w-3.5" />
            {multi ? `Winning variant · beat ${variants.length - 1} other${variants.length === 2 ? "" : "s"} in this batch` : "Only variant in this concept"}
          </span>
          <span className="cs-mc__winner-banner-name" title={winner.ad_names[0]}>{name(winner.ad_names[0])}</span>
        </div>
      )}
      <div className="cs-mc__main">
        <button
          type="button"
          disabled={!thumb}
          onClick={() => winner && openVariant(winner)}
          className={`cs-mc__thumb ${multi ? "is-batch" : ""}`}
          title={thumb ? "View the winning variant" : "No stored creative for the winner"}
        >
          {thumb ? <img src={thumb} alt="" loading="lazy" /> : <Zap className="h-4 w-4" />}
          {thumb && isVideo && <span className="cs-mc__play"><Play className="h-3 w-3 fill-white" /></span>}
          {winner && <span className="cs-mc__thumb-badge"><Trophy className="h-2.5 w-2.5" />{multi ? "Winner" : "Only variant"}</span>}
        </button>

        <div className="cs-mc__body">
          <p className="cs-mc__eyebrow">
            <Layers className="h-3 w-3" />
            {multi ? `Concept · batch of ${variants.length} variants` : "Concept · 1 variant"}
          </p>
          <div className="cs-mc__title-row">
            <h3 title={concept.concept}>{concept.concept}</h3>
            <div className="cs-mc__chips">
              {concept.format && <span>{concept.format}</span>}
              <span>{Math.round(share * 100)}% of month spend</span>
            </div>
          </div>

          {siblings.length > 0 && (
            <div className="cs-mc__siblings" aria-label="Other variants in this batch">
              <small>Other variants</small>
              {siblings.map((v) => (
                <button key={v.key} type="button" onClick={() => openVariant(v)} title={`${name(v.ad_names[0])} · ${money(v.spend)}`}>
                  <img src={media[v.storage_path]} alt="" loading="lazy" />
                </button>
              ))}
              {variants.length - 1 > siblings.length && <span>+{variants.length - 1 - siblings.length}</span>}
            </div>
          )}

          {winner && (winner.tags?.persona || winner.tags?.primary_angle || !winner.analyzed) && (
            <div className="cs-intel-tag-row">
              {winner.tags?.persona && <span className="cs-intel-attribute-pill is-tone-2" title="Persona (from the Insights audit)">{winner.tags.persona}</span>}
              {winner.tags?.primary_angle && <span className="cs-intel-attribute-pill is-tone-1" title="Angle (from the Insights analysis)">{winner.tags.primary_angle}</span>}
              {!winner.analyzed && <span className="text-[11px] text-neutral-500">Winner not analyzed yet, so no tags</span>}
            </div>
          )}
        </div>

        <dl className="cs-mc__stats">
          <div><dt>Batch spend</dt><dd>{money(concept.spend)}</dd></div>
          <div><dt>Conv.</dt><dd>{concept.conversions || "—"}</dd></div>
          <div><dt>CPA</dt><dd className={cpaTone(concept.cpa, avgCpa)}>{concept.cpa != null ? money(concept.cpa) : "—"}</dd></div>
        </dl>
      </div>

      {multi && (
        <button type="button" className="cs-mc__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "Hide the batch" : `See all ${variants.length} variants in this batch`}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}

      {open && (
        <ol className="cs-mc__variants">
          {variants.map((v, i) => (
            <li key={v.key} className={v.is_winner ? "is-winner" : ""}>
              <span className="cs-mc__rank">{v.is_winner ? <Trophy className="h-3.5 w-3.5" /> : i + 1}</span>
              <div className="cs-mc__variant-name">
                <p title={v.ad_names[0]}>{name(v.ad_names[0])}</p>
                {v.ad_names.length > 1 && <small>+{v.ad_names.length - 1} duplicate{v.ad_names.length === 2 ? "" : "s"} merged (same creative relaunched)</small>}
              </div>
              <div className="cs-mc__share" title={`${Math.round((v.spend_share || 0) * 100)}% of this batch's spend`}>
                <i style={{ width: `${Math.max((v.spend_share || 0) * 100, 2)}%` }} />
                <span>{Math.round((v.spend_share || 0) * 100)}%</span>
              </div>
              <span className="cs-mc__num">{money(v.spend)}</span>
              <span className="cs-mc__num">{v.conversions || "—"}</span>
              <span className={`cs-mc__num ${cpaTone(v.cpa, avgCpa)}`}>{v.cpa != null ? money(v.cpa) : "—"}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
ConceptCard.propTypes = {
  concept: PropTypes.object.isRequired, monthSpend: PropTypes.number.isRequired, avgCpa: PropTypes.number,
  media: PropTypes.object.isRequired, token: PropTypes.string, onPreview: PropTypes.func.isRequired,
};

/** Hover card for one month's column: its winners by value, largest first. */
function MonthTooltip({ active, payload, label, series }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const items = series.map((s) => ({ ...s, count: row[s.key] || 0 })).filter((s) => s.count > 0).sort((a, b) => b.count - a.count);
  return (
    <div className="cs-monthly-tooltip">
      <p><strong>{label}</strong> · {row.total} winning concept{row.total === 1 ? "" : "s"}</p>
      <ul>
        {items.map((s) => (
          <li key={s.key}><i style={{ background: s.color }} /><span>{s.label}</span><strong>{s.count}</strong></li>
        ))}
      </ul>
    </div>
  );
}
MonthTooltip.propTypes = { active: PropTypes.bool, payload: PropTypes.array, label: PropTypes.string, series: PropTypes.array.isRequired };

function Leaderboard({ review, dimension, setDimension, token, winnersActive }) {
  const [open, setOpen] = useState(null);
  const dim = DIMENSIONS.find((d) => d.key === dimension) || DIMENSIONS[0];
  const monthsOldestFirst = useMemo(() => [...review.months].reverse(), [review]);
  const rows = (review.leaderboard?.[dimension] || []).slice(0, LEADERBOARD_TOP);
  const descriptions = review.descriptions?.[dimension] || {};

  // Every winning variant (the top spender of each concept), by month.
  const winnersByMonth = useMemo(() => monthsOldestFirst.map((m) => ({
    month: m,
    winners: m.concepts.map((c) => ({ concept: c, winner: c.variants.find((v) => v.is_winner) })).filter((x) => x.winner),
  })), [monthsOldestFirst]);

  // The top values (ranked over all six months) each get a series color;
  // everything else folds into Other. Winners with no tag for this dimension
  // stay visible as "Not analyzed yet" so each column counts every winner.
  const { series, chartData, colorOf } = useMemo(() => {
    const ranked = (review.leaderboard?.[dimension] || []).map((r) => r.value);
    const top = ranked.slice(0, SERIES_COLORS.length);
    const named = top.map((value, i) => ({ key: `v${i}`, label: value, color: SERIES_COLORS[i] }));
    const keyOf = new Map(top.map((value, i) => [value, `v${i}`]));
    const data = winnersByMonth.map(({ month, winners }) => {
      const row = { label: month.label, total: winners.length };
      for (const { winner } of winners) {
        const value = winner.tags?.[dimension];
        const key = !value ? UNTAGGED.key : keyOf.get(value) || OTHER.key;
        row[key] = (row[key] || 0) + 1;
      }
      return row;
    });
    const used = (key) => data.some((row) => row[key] > 0);
    const shown = [...named, ...(used(OTHER.key) ? [OTHER] : []), ...(used(UNTAGGED.key) ? [UNTAGGED] : [])];
    return {
      series: shown,
      // Every series present in every month (0 when absent), so the stack and
      // its total label always have a top segment to sit on.
      chartData: data.map((row) => ({ ...Object.fromEntries(shown.map((s) => [s.key, 0])), ...row })),
      colorOf: (value) => (keyOf.has(value) ? SERIES_COLORS[top.indexOf(value)] : OTHER.color),
    };
  }, [review, dimension, winnersByMonth]);

  // The winning variants behind each ranked value.
  const winnersByValue = useMemo(() => {
    const map = new Map();
    for (const { month, winners } of winnersByMonth) {
      for (const { concept, winner } of winners) {
        const value = winner.tags?.[dimension];
        if (!value) continue;
        const list = map.get(value) || [];
        list.push({ month: month.label, concept: concept.concept, variants: concept.variants.length, ad: creativeName(winner.ad_names[0], token), spend: winner.spend });
        map.set(value, list);
      }
    }
    for (const list of map.values()) list.sort((a, b) => b.spend - a.spend);
    return map;
  }, [winnersByMonth, dimension, token]);

  const anyWinners = chartData.some((row) => row.total > 0);

  return (
    <section className="cs-intel-panel">
      <header className="cs-intel-panel__header">
        <div className="min-w-0">
          <h2>What the winners had in common · last six months</h2>
          <p className="cs-intel-panel__subheader">
            Every concept you launch is a batch of variants, and the variant that spends the most is its winner. Each column is a launch month, split by the {dim.plural} of that month&apos;s winners, so you can see what keeps winning and whether it&apos;s shifting. The ranked list below adds up the wins over all six months.
          </p>
        </div>
        <Select value={dimension} onValueChange={(value) => { setDimension(value); setOpen(null); }}>
          <SelectTrigger className="cs-weekly-filter-select cs-panel-select" aria-label="Group winners by"><SelectValue /></SelectTrigger>
          <SelectContent className="cs-select-content bg-white">
            {DIMENSIONS.map((d) => <SelectItem key={d.key} value={d.key}>Group by: {d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </header>
      <div className="cs-intel-panel__body">
        {!anyWinners ? (
          <p className="text-xs text-neutral-500">No winning variants in the last six months yet.</p>
        ) : (
          <>
            <div className="cs-monthly-legend" aria-label="Chart legend">
              {series.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}
            </div>
            <div className="cs-monthly-chart" role="img" aria-label={`Winning concepts per launch month, split by ${dim.plural}`}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 18, right: 8, bottom: 0, left: -18 }} barCategoryGap="28%">
                  <CartesianGrid vertical={false} stroke="#e7e5e4" />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#d6d3d1" }} tick={{ fontSize: 11, fill: "#78716c" }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#a8a29e" }} />
                  <Tooltip content={<MonthTooltip series={series} />} cursor={{ fill: "rgba(120, 113, 108, 0.08)" }} />
                  {series.map((s, i) => (
                    <Bar key={s.key} dataKey={s.key} name={s.label} stackId="winners" fill={s.color} stroke="#fff" strokeWidth={2}
                      maxBarSize={72} isAnimationActive={false}>
                      {/* Column total above the topmost segment. */}
                      {i === series.length - 1 && <LabelList dataKey="total" position="top" fontSize={11} fill="#57534e" />}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {rows.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="cs-intel-subsection-title">Most winning {dim.plural} · six-month total</h3>
            {rows.map((r, index) => {
              const winners = winnersByValue.get(r.value) || [];
              const isOpen = open === r.value;
              return (
                <div key={r.value} className="cs-monthly-rank-row">
                  <button type="button" className="cs-monthly-rank-row__trigger" onClick={() => setOpen(isOpen ? null : r.value)} aria-expanded={isOpen}>
                    <span className="cs-monthly-rank-row__index">{index + 1}</span>
                    <i className="cs-monthly-rank-row__swatch" style={{ background: colorOf(r.value) }} aria-hidden="true" />
                    <div className="cs-monthly-rank-row__label">
                      <strong title={r.value}>{r.value}</strong>
                      {descriptions[r.value] && <span title={descriptions[r.value]}>{descriptions[r.value]}</span>}
                    </div>
                    <span className="cs-monthly-rank-row__count">{r.wins} winning concept{r.wins === 1 ? "" : "s"} · {money(r.winning_spend)} on the winners</span>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && winners.length > 0 && (
                    <ul className="cs-monthly-bar-row__winners">
                      {winners.slice(0, 8).map((w, i) => (
                        <li key={i}><span>{w.month} · {w.concept} · winner of {w.variants} variant{w.variants === 1 ? "" : "s"} · {money(w.spend)}</span><p>{w.ad}</p></li>
                      ))}
                      {winners.length > 8 && <li><span>+{winners.length - 8} more winning ads</span></li>}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {rows.length === 0 && anyWinners && (
          <p className="mt-3 text-xs text-neutral-500">No winners carry a {dim.label.toLowerCase()} tag yet. Tags come from Insights analysis, which covers each account&apos;s top spenders.</p>
        )}
        {review.untagged_winners > 0 && !winnersActive && (
          <p className="mt-3 text-[11px] text-neutral-500">
            {review.untagged_winners} winning variant{review.untagged_winners === 1 ? " hasn't" : "s haven't"} been analyzed yet, so they have no tags to group by. Insights only analyzes your top spenders, so Refresh Review analyzes the remaining winners (and the Monday refresh does too). With many winners this can take a while.
          </p>
        )}
      </div>
    </section>
  );
}
Leaderboard.propTypes = { review: PropTypes.object.isRequired, dimension: PropTypes.string.isRequired, setDimension: PropTypes.func.isRequired, token: PropTypes.string, winnersActive: PropTypes.bool };

/**
 * Optional "ad name contains" filter, for an account shared by several
 * products or one that mixes unrelated ads. Saving rebuilds the review.
 */
function NameFilterControl({ current, busy, onSave }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const trimmed = draft.trim();

  const save = async (value) => {
    setSaving(true);
    setError(null);
    try { await onSave(value); setOpen(false); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { setDraft(current ?? ""); setError(null); } }}>
      <PopoverTrigger asChild>
        <button type="button" disabled={busy} className="cs-monthly-filter-button">
          <Filter className="h-3.5 w-3.5" />
          {current ? <>Name contains <strong>&ldquo;{current}&rdquo;</strong></> : "All ads in account"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 bg-white">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-neutral-800">Ad name filter</p>
          <p className="text-xs leading-relaxed text-neutral-500">
            By default the review covers every ad that spent in this account, grouped by your naming convention. If this account runs ads for several products, enter text every ad for this product contains. A month right after it (e.g. ABCJul) sets the launch month; otherwise the ad&apos;s created month is used.
          </p>
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (trimmed && trimmed !== current) save(trimmed); }}>
          <input
            autoFocus
            value={draft}
            maxLength={NAME_FILTER_MAX}
            placeholder="e.g. SKU12"
            onChange={(e) => setDraft(e.target.value)}
            className="cs-generate-control h-9 min-w-0 flex-1 px-3 text-sm"
          />
          <button type="submit" disabled={!trimmed || trimmed === current || saving} className="cs-primary-button !h-9 !px-4">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </form>
        {current && (
          <button type="button" disabled={saving} onClick={() => save(null)} className="flex w-full items-center justify-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900">
            <X className="h-3.5 w-3.5" />Clear filter (all ads in account)
          </button>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </PopoverContent>
    </Popover>
  );
}
NameFilterControl.propTypes = { current: PropTypes.string, busy: PropTypes.bool, onSave: PropTypes.func.isRequired };
