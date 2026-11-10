// Monthly Review (= the source app's Product Intelligence "Monthly Review" tab).
// Reads the product's stored snapshot (built by the monthly_review job: one
// Meta pull + stored analysis; rebuilt weekly by the cron or the Refresh
// button). Month pills at the top switch the month: its KPIs, summary and
// each concept's variants with the winner (most spend in the window). Below,
// a six-month leaderboard of the winners' existing tags.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { CalendarRange, ChevronDown, ChevronRight, Filter, Loader2, X, Zap } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorBanner, ProgressiveSection } from "../ui";
import { JobBadge, useJobRunner } from "../JobsContext";

const money = (v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${Math.round(v || 0)}`);
const NAME_FILTER_MAX = 100;

const DIMENSIONS = [
  { key: "persona", label: "Persona" },
  { key: "primary_angle", label: "Angle" },
  { key: "messaging_theme", label: "Theme" },
  { key: "hook_style", label: "Hook style" },
  { key: "emotional_trigger", label: "Emotion" },
  { key: "visual_style", label: "Visual" },
  { key: "awareness_stage", label: "Awareness" },
  { key: "format", label: "Format" },
];
const LEADERBOARD_TOP = 10;

/** One warm hue, light → deep: the newest month is the most prominent segment. */
const monthShade = (i, n) => `hsl(28 88% ${Math.round(82 - (40 * i) / Math.max(1, n - 1))}%)`;

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
          <JobBadge job={job} />
          <div className="flex flex-col items-end gap-2">
            <button type="button" onClick={run} disabled={!selectedProductId || jobActive} className="cs-primary-button">
              {jobActive && <Loader2 className="h-4 w-4 animate-spin" />}
              {jobActive ? "Pulling from Meta…" : review ? "Refresh Review" : "Build Review"}
            </button>
            <p className="text-[11px] text-neutral-500">Updated: {computedLabel && review ? <time dateTime={snapshot.computedAt}>{computedLabel}</time> : "Not built yet"}</p>
          </div>
        </div>,
      )}
      <ErrorBanner message={err} />

      {!selectedProductId ? (
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
            <div className="cs-weekly-switcher" role="tablist" aria-label="Month">
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
            <NameFilterControl current={data?.nameFilter ?? null} busy={jobActive} onSave={saveNameFilter} />
          </div>

          <ReviewMeta review={review} snapshot={snapshot} nameFilter={data?.nameFilter ?? null} />

          {activeMonth && <MonthKpis month={activeMonth} />}

          {activeMonth?.summary && <MonthSummary summary={activeMonth.summary} label={activeMonth.label} />}

          <section className="cs-intel-panel">
            <header className="cs-intel-panel__header">
              <h2>Concepts launched · {activeMonth?.label}</h2>
              <span className="text-[11px] text-neutral-500">Winner = most spend in the review window</span>
            </header>
            <div className="cs-intel-panel__body space-y-3">
              {!activeMonth || activeMonth.concepts.length === 0 ? (
                <p className="text-xs text-neutral-500">No concepts launched in {activeMonth?.label || "this month"}{token ? ` with "${token}" in the name` : ""}.</p>
              ) : activeMonth.concepts.map((c) => (
                <ConceptCard key={c.key} concept={c} media={media} token={token} onPreview={setPreview} />
              ))}
            </div>
          </section>

          <Leaderboard review={review} dimension={dimension} setDimension={setDimension} token={token} />
        </>
      )}

      <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="break-words text-sm">{preview?.name}</DialogTitle>
            <DialogDescription>{preview?.isVideo ? "Video ad · opening frame" : "Static ad"}</DialogDescription>
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
      {review.naming_pattern?.description && (
        <span title="Learned from this ad account's ad names">Grouped by your naming: <span className="font-mono text-neutral-700">{review.naming_pattern.description}</span></span>
      )}
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
    ["Spend", money(spend)],
    ["Conversions", conversions || "—"],
    ["Blended CPA", conversions > 0 ? money(spend / conversions) : "—"],
  ];
  return (
    <div className="cs-intel-kpis" aria-label={`${month.label} totals`}>
      {kpis.map(([label, value]) => <div key={label} className="cs-intel-kpi"><span>{label}</span><strong>{value}</strong></div>)}
      <p className="sr-only">{winners.length} concepts have a winner.</p>
    </div>
  );
}
MonthKpis.propTypes = { month: PropTypes.object.isRequired };

function MonthSummary({ summary, label }) {
  return (
    <section className="cs-intel-panel">
      <header className="cs-intel-panel__header"><h2>{label} summary</h2></header>
      <div className="cs-intel-panel__body space-y-3">
        <p className="text-[13.5px] font-medium leading-relaxed text-neutral-800">{summary.headline}</p>
        <div className="cs-intel-two-column">
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

function ConceptCard({ concept, media, token, onPreview }) {
  const winner = concept.variants.find((v) => v.is_winner);
  const thumb = winner?.storage_path ? media[winner.storage_path] : null;
  const isVideo = String(winner?.media_type || concept.format || "").toLowerCase().includes("video");
  // Only the winner shows at first; a concept with no winner shows every variant.
  const [expanded, setExpanded] = useState(false);
  const others = winner ? concept.variants.length - 1 : 0;
  const rows = winner && !expanded ? [winner] : concept.variants;
  const name = (n) => creativeName(n, token);

  return (
    <div className="cs-monthly-concept">
      <div className="cs-monthly-concept__head">
        <button
          type="button"
          disabled={!thumb}
          onClick={() => thumb && onPreview({ url: thumb, isVideo, name: name(winner.ad_names[0]) })}
          className="cs-monthly-concept__thumb"
          title={thumb ? "View the winning variant" : "No stored creative for the winner"}
        >
          {thumb ? <img src={thumb} alt="" loading="lazy" /> : <Zap className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="break-words text-[14px] font-semibold text-neutral-800">{concept.concept}</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {concept.format && `${concept.format} · `}{concept.variants.length} variant{concept.variants.length === 1 ? "" : "s"} · {money(concept.spend)} total spend
          </p>
        </div>
      </div>
      <table className="cs-monthly-table">
        <thead>
          <tr>
            <th className="text-left">Variant</th>
            <th>Spend</th>
            <th>Share</th>
            <th>Conv.</th>
            <th>CPA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => {
            const toggle = v.is_winner && others > 0;
            return (
              <tr
                key={v.key}
                className={`${v.is_winner ? "is-winner" : ""} ${toggle ? "is-toggle" : ""}`}
                onClick={toggle ? () => setExpanded((e) => !e) : undefined}
                title={toggle ? (expanded ? "Hide the other variants" : `Show the other ${others} variant${others === 1 ? "" : "s"}`) : undefined}
              >
                <td className="text-left">
                  <div className="flex items-start gap-1.5">
                    {toggle && (expanded ? <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500" /> : <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500" />)}
                    {v.is_winner && <span className="cs-monthly-winner">Winner</span>}
                    <div className="min-w-0">
                      <p className={`break-all ${v.is_winner ? "font-medium text-neutral-800" : "text-neutral-700"}`} title={v.ad_names[0]}>{name(v.ad_names[0])}</p>
                      {v.ad_names.length > 1 && <p className="text-[11px] text-neutral-500">+{v.ad_names.length - 1} duplicate{v.ad_names.length === 2 ? "" : "s"} merged</p>}
                      {v.is_winner && (v.tags?.persona || v.tags?.primary_angle) && (
                        <div className="cs-intel-tag-row mt-1.5">
                          {v.tags.persona && <span className="cs-intel-attribute-pill is-tone-2" title="Persona (from the Insights audit)">{v.tags.persona}</span>}
                          {v.tags.primary_angle && <span className="cs-intel-attribute-pill is-tone-1" title="Angle (from the Insights analysis)">{v.tags.primary_angle}</span>}
                        </div>
                      )}
                      {v.is_winner && !v.analyzed && <p className="text-[11px] text-neutral-500">Not analyzed yet — no tags or stored creative</p>}
                      {toggle && !expanded && <p className="mt-0.5 text-[11px] text-neutral-500">+{others} other variant{others === 1 ? "" : "s"}</p>}
                    </div>
                  </div>
                </td>
                <td>{money(v.spend)}</td>
                <td className="text-neutral-500">{Math.round((v.spend_share || 0) * 100)}%</td>
                <td>{v.conversions || "—"}</td>
                <td>{v.cpa != null ? money(v.cpa) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
ConceptCard.propTypes = { concept: PropTypes.object.isRequired, media: PropTypes.object.isRequired, token: PropTypes.string, onPreview: PropTypes.func.isRequired };

function Leaderboard({ review, dimension, setDimension, token }) {
  const [open, setOpen] = useState(null);
  const monthsOldestFirst = useMemo(() => [...review.months].reverse(), [review]);
  const rows = (review.leaderboard?.[dimension] || []).slice(0, LEADERBOARD_TOP);
  const max = Math.max(1, ...rows.map((r) => r.wins));
  const descriptions = review.descriptions?.[dimension] || {};
  // The winning variants behind each bar.
  const winnersByValue = useMemo(() => {
    const map = new Map();
    for (const m of review.months) {
      for (const c of m.concepts) {
        const w = c.variants.find((v) => v.is_winner);
        const value = w?.tags?.[dimension];
        if (!w || !value) continue;
        const list = map.get(value) || [];
        list.push({ month: m.label, concept: c.concept, ad: creativeName(w.ad_names[0], token), spend: w.spend });
        map.set(value, list);
      }
    }
    for (const list of map.values()) list.sort((a, b) => b.spend - a.spend);
    return map;
  }, [review, dimension, token]);

  return (
    <section className="cs-intel-panel">
      <header className="cs-intel-panel__header">
        <div>
          <h2>Learnings leaderboard · last six months</h2>
          <p className="mt-0.5 text-[11.5px] text-neutral-500">What the winning variant of each concept had in common</p>
        </div>
        <div className="cs-weekly-switcher is-compact" role="tablist" aria-label="Leaderboard dimension">
          {DIMENSIONS.map((d) => (
            <button key={d.key} type="button" role="tab" aria-selected={dimension === d.key} onClick={() => { setDimension(d.key); setOpen(null); }}
              className={`cs-weekly-switcher__item ${dimension === d.key ? "is-active" : ""}`}>
              {d.label}
            </button>
          ))}
        </div>
      </header>
      <div className="cs-intel-panel__body">
        {rows.length === 0 ? (
          <p className="text-xs text-neutral-500">No winners carry this tag yet. Tags come from Insights analysis, which covers each account&apos;s top spenders.</p>
        ) : (
          <div className="space-y-2">
            <div className="cs-monthly-legend">
              {monthsOldestFirst.map((m, i) => <span key={m.month}><i style={{ background: monthShade(i, monthsOldestFirst.length) }} />{m.label}</span>)}
            </div>
            {rows.map((r) => {
              const winners = winnersByValue.get(r.value) || [];
              const isOpen = open === r.value;
              return (
                <div key={r.value} className="cs-monthly-bar-row">
                  <button type="button" className="cs-monthly-bar-row__trigger" onClick={() => setOpen(isOpen ? null : r.value)} aria-expanded={isOpen}>
                    <div className="cs-monthly-bar-row__label">
                      <strong title={r.value}>{r.value}</strong>
                      {descriptions[r.value] && <span title={descriptions[r.value]}>{descriptions[r.value]}</span>}
                    </div>
                    <div className="cs-monthly-bar-row__track">
                      <div className="cs-monthly-bar-row__bar" style={{ width: `${(r.wins / max) * 100}%` }}>
                        {monthsOldestFirst.map((m, i) => {
                          const n = r.by_month?.[m.month] || 0;
                          return n > 0 ? <span key={m.month} title={`${m.label}: ${n}`} style={{ flexGrow: n, background: monthShade(i, monthsOldestFirst.length) }} /> : null;
                        })}
                      </div>
                    </div>
                    <span className="cs-monthly-bar-row__count">{r.wins} win{r.wins === 1 ? "" : "s"} · {money(r.winning_spend)}</span>
                  </button>
                  {isOpen && winners.length > 0 && (
                    <ul className="cs-monthly-bar-row__winners">
                      {winners.slice(0, 8).map((w, i) => (
                        <li key={i}><span>{w.month} · {w.concept} · {money(w.spend)}</span><p>{w.ad}</p></li>
                      ))}
                      {winners.length > 8 && <li><span>+{winners.length - 8} more winning ads</span></li>}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {review.untagged_winners > 0 && (
          <p className="mt-3 text-[11px] text-neutral-500">
            {review.untagged_winners} winning variant{review.untagged_winners === 1 ? " has" : "s have"} no Insights analysis yet, so no tags to rank. Run Analysis on the Insights tab to cover more of them.
          </p>
        )}
      </div>
    </section>
  );
}
Leaderboard.propTypes = { review: PropTypes.object.isRequired, dimension: PropTypes.string.isRequired, setDimension: PropTypes.func.isRequired, token: PropTypes.string };

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
