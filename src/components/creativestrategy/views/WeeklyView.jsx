// Weekly Strategy — generate, filter, review, and brief strategist concepts.
// The existing weekly APIs are retained behind the shared Creative Strategy UI.
import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  ChevronRight, CircleCheck, CircleX, ClipboardList, ExternalLink, ImagePlus, Loader2, MousePointerClick, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { creativeApi } from "@/lib/creativeApi";
import { AdMediaProvider, AdThumbImg } from "../meta-media";
import AdDetailDrawer, { adsManagerAdUrl } from "./AdDetailDrawer";
import RunModelControls from "../RunModelControls";
import { useRunModels } from "../useRunModels";
import { RUN_OPERATIONS } from "../run-model-operations";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { EmptyState, ErrorBanner, PartialResultsNotice, ProgressiveSection } from "../ui";
import { useJobRunner, useJobs } from "../JobsContext";
import RunBy from "../run-by";

const isActive = (job) => job.status == null || job.status === "queued" || job.status === "running";

// Production shape from the strategist (required on every concept): who has
// to make it, and does it need a camera? Ported from the source app.
const PRODUCTION_NOTES = {
  edit_only: { label: "Edit only", hint: "Makeable from footage and assets we already have — no creator needed." },
  partial_reshoot: { label: "Partial reshoot", hint: "Mostly existing material, but one new beat has to be captured." },
  new_shoot: { label: "New shoot", hint: "Needs a content creator to film new footage before editing." },
};
const UGC_FILTER = "__ugc__";
const productionKey = (value) => String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
/** "UGC" = a new shoot whose output isn't a static (a creator in front of a camera). */
const isUgcShoot = (idea) => productionKey(idea.productionNote) === "new_shoot" && !/static|image|carousel/i.test(idea.format ?? "");
const ALL_FILTERS = { persona: "all", angle: "all", format: "all", awareness: "all", production: "all" };

const TIERS = [
  { key: "all", label: "All" },
  { key: "iteration", label: "Iterations" },
  { key: "format_transformation", label: "Format Flips" },
  { key: "inspired", label: "Inspired" },
  { key: "big_swing", label: "Big Swings" },
  { key: "net_new", label: "Net-new" },
];

// The board's two halves: concepts that trace back to a running ad, and fresh
// ones with no ad behind them (the latest analysis's gap ideas land here).
const CONCEPT_GROUPS = [
  { key: "ads", title: "Built on your ads", hint: "Iterations, format flips and big swings on ads already running. Each one traces back to a real ad and its results." },
  { key: "fresh", title: "Fresh concepts to test", hint: "New ideas with no existing ad behind them: gaps found in the latest ad analysis, empty persona × awareness cells and borrowed inspiration. Lower confidence, more upside." },
];
const AD_BASED_TIERS = new Set(["iteration", "format_transformation", "big_swing"]);
const conceptGroupOf = (idea) => (idea.tier ? (AD_BASED_TIERS.has(idea.tier) ? "ads" : "fresh") : idea.conceptType === "iteration" ? "ads" : "fresh");
/** Fresh concepts developed from an ad-analysis gap idea cite "seed:<name>". */
const isAnalysisIdea = (idea) => /^seed:/i.test(String(idea.referenceSource ?? ""));

const STATUSES = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Dismissed" },
];

export default function WeeklyView({ ctx }) {
  const {
    selectedBrandId, selectedProductId, selectedBrand, renderHeaderActions,
  } = ctx;
  const adAccountId = selectedBrand?.metaAdAccountId || null;
  const models = useRunModels(selectedBrandId);
  const currentBrand = useRef(selectedBrandId);
  currentBrand.current = selectedBrandId;
  const loadRequest = useRef(0);
  const [ideas, setIdeas] = useState([]);
  const [run, setRun] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [err, setErr] = useState(null);
  const [tier, setTier] = useState("all");
  const [status, setStatusFilter] = useState("pending");
  const [filters, setFilters] = useState(ALL_FILTERS);
  const [startingBrief, setStartingBrief] = useState(null);
  const [startingStatic, setStartingStatic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null);
  // The ad a card builds on, opened in the same drawer Insights uses. The card
  // only carries a summary, so the full analyzed row is loaded on click.
  const [anchorDrawerAd, setAnchorDrawerAd] = useState(null);
  const [openingAnchor, setOpeningAnchor] = useState(null);

  const openAnchor = async (adId) => {
    if (!selectedProductId || !adId || openingAnchor) return;
    setOpeningAnchor(adId);
    try {
      const { ad } = await creativeApi.getInsightAd(selectedProductId, adId);
      setAnchorDrawerAd(ad);
    } catch (error) {
      toast.error(error.message || "Couldn't load that ad");
    } finally {
      setOpeningAnchor(null);
    }
  };

  const load = useCallback(async (brandId, { silent = false } = {}) => {
    const request = ++loadRequest.current;
    if (!brandId) { setIdeas([]); setRun(null); return; }
    if (!silent) setLoading(true);
    try {
      const response = await creativeApi.getWeekly(brandId);
      if (currentBrand.current !== brandId || request !== loadRequest.current) return;
      setIdeas(response.ideas || []);
      setRun(response.latestRun || null);
      setSchedule(response.schedule || null);
    } catch (error) {
      if (currentBrand.current === brandId && request === loadRequest.current) setErr(error.message);
    } finally {
      if (!silent && currentBrand.current === brandId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIdeas([]);
    setRun(null);
    setSchedule(null);
    setErr(null);
    if (selectedBrandId) load(selectedBrandId);
    else { setIdeas([]); setRun(null); }
  }, [load, selectedBrandId]);

  const { job: weeklyJob, start: startWeekly } = useJobRunner({
    kind: "weekly_strategy",
    brandId: selectedBrandId,
    enabled: Boolean(selectedBrandId),
    onComplete: () => load(selectedBrandId),
  });
  const jobActive = weeklyJob && (weeklyJob.status == null || weeklyJob.status === "queued" || weeklyJob.status === "running");

  useEffect(() => {
    if (!jobActive || !selectedBrandId) return undefined;
    const interval = window.setInterval(() => load(selectedBrandId, { silent: true }), 2500);
    return () => window.clearInterval(interval);
  }, [jobActive, load, selectedBrandId]);

  const runStrategy = async () => {
    if (!selectedBrandId) return;
    setErr(null);
    try {
      const { jobId } = await creativeApi.runWeekly(selectedBrandId, models.forRun(RUN_OPERATIONS.weekly));
      startWeekly(jobId); models.reset(RUN_OPERATIONS.weekly);
    } catch (error) {
      setErr(error.message);
    }
  };

  const approve = async (id) => {
    setUpdating(`${id}:approved`);
    try {
      await creativeApi.approveIdea(id);
      await load(selectedBrandId);
    } catch (error) {
      setErr(error.message);
    } finally {
      setUpdating(null);
    }
  };

  const updateStatus = async (id, nextStatus) => {
    setUpdating(`${id}:${nextStatus}`);
    try {
      await creativeApi.setIdeaStatus(id, nextStatus);
      await load(selectedBrandId);
    } catch (error) {
      setErr(error.message);
    } finally {
      setUpdating(null);
    }
  };

  // Concept briefs run as weekly_brief jobs (progress and results show in the
  // job tracker). Several can run at once; each card shows its own spinner and
  // the board reloads when one finishes, since the brief is saved on the idea.
  const { jobs: allJobs, track } = useJobs();
  const briefJobs = Object.values(allJobs).filter((job) => job.meta?.kind === "weekly_brief" && job.meta?.brandId === selectedBrandId);
  const briefing = new Set(briefJobs.filter(isActive).map((job) => job.ideaId || job.meta?.ideaId).filter(Boolean));
  if (startingBrief) briefing.add(startingBrief);
  // "Generate Static" runs a generate_ad job tied to the concept (job.ideaId),
  // so the image also lands in Generate → Statics for that product.
  const staticJobs = Object.values(allJobs).filter((job) => job.meta?.kind === "generate_ad" && job.meta?.brandId === selectedBrandId && (job.ideaId || job.meta?.ideaId));
  const generatingStatics = new Set(staticJobs.filter(isActive).map((job) => job.ideaId || job.meta?.ideaId));
  if (startingStatic) generatingStatics.add(startingStatic);
  const watchedBriefs = useRef(new Set());
  const conceptJobs = [...briefJobs, ...staticJobs];
  const finishedBriefKey = conceptJobs.filter((job) => !isActive(job) && watchedBriefs.current.has(job.id)).map((job) => job.id).join(",");
  for (const job of conceptJobs) if (isActive(job)) watchedBriefs.current.add(job.id);
  useEffect(() => {
    if (!finishedBriefKey || !selectedBrandId) return;
    for (const id of finishedBriefKey.split(",")) watchedBriefs.current.delete(id);
    load(selectedBrandId, { silent: true });
  }, [finishedBriefKey, load, selectedBrandId]);

  const makeBrief = async (id) => {
    setErr(null);
    setStartingBrief(id);
    try {
      const { jobId } = await creativeApi.generateBrief(id, undefined, models.forRun(RUN_OPERATIONS.weeklyBrief));
      models.reset(RUN_OPERATIONS.weeklyBrief);
      track(jobId, { kind: "weekly_brief", brandId: selectedBrandId, ideaId: id });
    } catch (error) {
      setErr(error.message);
    } finally {
      setStartingBrief(null);
    }
  };

  const makeStatic = async (id) => {
    setErr(null);
    setStartingStatic(id);
    try {
      const { jobId, productId } = await creativeApi.generateIdeaStatic(id, undefined, models.forRun(RUN_OPERATIONS.weeklyStatic));
      models.reset(RUN_OPERATIONS.weeklyStatic);
      track(jobId, { kind: "generate_ad", brandId: selectedBrandId, productId, ideaId: id });
    } catch (error) {
      setErr(error.message);
    } finally {
      setStartingStatic(null);
    }
  };

  const byStatus = ideas.filter((idea) => (
    status === "pending" ? (idea.status ?? "pending") === "pending"
      : status === "approved" ? idea.status === "approved" || idea.status === "sent_to_inspo"
        : idea.status === "rejected"
  ));
  const tierCounts = TIERS.reduce((result, item) => {
    result[item.key] = item.key === "all" ? byStatus.length : byStatus.filter((idea) => idea.tier === item.key).length;
    return result;
  }, {});
  const statusCounts = {
    pending: ideas.filter((idea) => (idea.status ?? "pending") === "pending").length,
    approved: ideas.filter((idea) => idea.status === "approved" || idea.status === "sent_to_inspo").length,
    rejected: ideas.filter((idea) => idea.status === "rejected").length,
  };
  const unique = (key) => [...new Set(ideas.map((idea) => idea[key]).filter(Boolean))];
  const options = {
    persona: unique("targetPersona"),
    angle: unique("suggestedAngle"),
    format: unique("format"),
    awareness: unique("awarenessStage"),
    production: [...Object.keys(PRODUCTION_NOTES).filter((key) => ideas.some((idea) => productionKey(idea.productionNote) === key)),
      ...(ideas.some(isUgcShoot) ? [UGC_FILTER] : [])],
  };
  const shown = byStatus.filter((idea) =>
    (tier === "all" || idea.tier === tier) &&
    (filters.persona === "all" || idea.targetPersona === filters.persona) &&
    (filters.angle === "all" || idea.suggestedAngle === filters.angle) &&
    (filters.format === "all" || idea.format === filters.format) &&
    (filters.awareness === "all" || idea.awarenessStage === filters.awareness) &&
    (filters.production === "all" || (filters.production === UGC_FILTER ? isUgcShoot(idea) : productionKey(idea.productionNote) === filters.production)));
  const conceptGroups = CONCEPT_GROUPS.map((group) => {
    const items = shown.filter((idea) => conceptGroupOf(idea) === group.key);
    return { ...group, items, columns: [items.filter((_, index) => index % 2 === 0), items.filter((_, index) => index % 2 === 1)] };
  }).filter((group) => group.items.length > 0);
  const lastRunAt = run?.startedAt || run?.completedAt;
  const lastRunDate = lastRunAt ? new Date(lastRunAt) : null;
  const lastRunLabel = lastRunDate && !Number.isNaN(lastRunDate.getTime()) ? lastRunDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not run yet";
  const nextRunAt = schedule?.nextRunAt;
  const nextRunLabel = nextRunAt ? new Date(nextRunAt).toLocaleString("en-AU", {
    timeZone: schedule.timeZone, dateStyle: "medium", timeStyle: "short",
  }) : null;
  const filtersActive = Object.values(filters).some((value) => value !== "all");
  const weeklyPhase = weeklyJob?.progress?.phase;


  return (
    <AdMediaProvider key={selectedProductId || "none"} productId={selectedProductId}>
    <div className="space-y-5">
      {renderHeaderActions(
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col items-end gap-2">
          <button type="button" onClick={runStrategy} disabled={!selectedBrandId || jobActive} className="cs-primary-button">
            {jobActive && <Loader2 className="h-4 w-4 animate-spin" />}
            {jobActive ? "Running Strategy…" : "Run Strategy"}
          </button>
          {selectedBrandId && <div className="space-y-1 text-right text-[11px] text-neutral-500">
            <p>Last run: {lastRunAt ? <time dateTime={lastRunAt}>{lastRunLabel}</time> : lastRunLabel}{lastRunAt && run?.by && <>{" "}<RunBy uid={run.by.uid} auto={run.by.auto} /></>}</p>
            <p>Next run: {nextRunAt ? <><time dateTime={nextRunAt}>{nextRunLabel}</time> (Sydney time)</> : loading ? "Loading…" : schedule?.enabled === false ? "Not scheduled" : "Unavailable"}</p>
          </div>}
          </div>
        </div>
      )}
      {ideas.length === 0 && !loading && !jobActive && !err && <p className="text-xs font-normal text-neutral-400">Needs analyzed ads and completed research</p>}

      {selectedBrandId && <RunModelControls models={models} operations={RUN_OPERATIONS.weekly} disabled={Boolean(jobActive)} />}
      {ideas.length > 0 && <RunModelControls models={models} operations={RUN_OPERATIONS.weeklyBrief} title="Models for the next idea brief" disabled={Boolean(startingBrief)} />}
      {ideas.some((idea) => idea.format === "static") && <RunModelControls models={models} operations={RUN_OPERATIONS.weeklyStatic} title="Models for the next static" disabled={Boolean(startingStatic)} />}
      <ErrorBanner message={err} />
      <PartialResultsNotice active={Boolean(jobActive)} completed={0} total={1} label="concept board" />

      {!selectedBrandId ? (
        <EmptyState icon={MousePointerClick} title="No account selected" hint="Select an account above to run the weekly strategist." className="min-h-[420px]" />
      ) : (
        <>
          {ideas.length === 0 ? (
            <ProgressiveSection
              title="Concept board"
              description={jobActive ? "Concepts will appear here as soon as the strategist finishes computing them." : "Run Strategy to generate concepts from analyzed ads and research."}
              active={loading || weeklyPhase === "running_strategist" || weeklyPhase === "saving_concepts"}
              cards={6}
            />
          ) : (
            <div className="space-y-4">
              <div className="cs-weekly-filters">
                <div className="cs-weekly-switchers-row">
                  <SegmentedFilter items={STATUSES} value={status} onChange={setStatusFilter} counts={statusCounts} />
                  <SegmentedFilter items={TIERS} value={tier} onChange={setTier} counts={tierCounts} compact />
                </div>
                <div className="cs-weekly-dropdown-row">
                  {[
                    ["persona", "Persona", options.persona],
                    ["angle", "Angle", options.angle],
                    ["format", "Format", options.format],
                    ["awareness", "Awareness", options.awareness],
                    ["production", "Production", options.production],
                  ].map(([key, label, values]) => (
                    <Select key={key} value={filters[key]} onValueChange={(value) => setFilters((current) => ({ ...current, [key]: value }))}>
                      <SelectTrigger className="cs-weekly-filter-select w-full px-3">
                        <SelectValue placeholder={label} />
                      </SelectTrigger>
                      <SelectContent className="cs-select-content bg-white">
                        <SelectItem value="all">{label}: All</SelectItem>
                        {values.map((value) => <SelectItem key={value} value={value}>{key === "production" ? (value === UGC_FILTER ? "UGC (creator shoot)" : PRODUCTION_NOTES[value]?.label ?? value) : value}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ))}
                  {filtersActive && (
                    <button type="button" onClick={() => setFilters(ALL_FILTERS)} className="cs-weekly-clear">Clear filters</button>
                  )}
                </div>
              </div>

              {shown.length === 0 ? (
                <EmptyState icon={MousePointerClick} title="Nothing here" hint={filtersActive ? "No concepts match these filters." : `No ${status} concepts in this tier.`} />
              ) : conceptGroups.map((group) => (
                <section key={group.key} className="cs-weekly-group">
                  <header className="cs-weekly-group__header">
                    <h2>{group.title} <span>{group.items.length}</span></h2>
                    <p>{group.hint}</p>
                  </header>
                  <div className="cs-weekly-grid">
                    {group.columns.map((column, columnIndex) => (
                      <div key={columnIndex} className="cs-weekly-grid__column">
                        {column.map((idea) => (
                          <ConceptCard
                            key={idea.id}
                            idea={idea}
                            brief={idea.sourceEvidence?.brief_copy}
                            briefing={briefing}
                            generatingStatics={generatingStatics}
                            updating={updating}
                            approve={approve}
                            updateStatus={updateStatus}
                            makeBrief={makeBrief}
                            makeStatic={makeStatic}
                            openAnchor={selectedProductId ? openAnchor : null}
                            openingAnchor={openingAnchor}
                            adAccountId={adAccountId}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
      <AdDetailDrawer
        ad={anchorDrawerAd}
        onClose={() => setAnchorDrawerAd(null)}
        productId={selectedProductId}
        sourceAd={anchorDrawerAd}
        adAccountId={adAccountId}
      />
    </div>
    </AdMediaProvider>
  );
}

function SegmentedFilter({ items, value, onChange, counts, compact = false }) {
  return (
    <div className={`cs-weekly-switcher ${compact ? "is-compact" : ""}`}>
      {items.map((item) => (
        <button key={item.key} type="button" onClick={() => onChange(item.key)} className={`cs-weekly-switcher__item ${value === item.key ? "is-active" : ""}`}>
          {item.label} <span>{counts[item.key] || 0}</span>
        </button>
      ))}
    </div>
  );
}

function ConceptCard({ idea, brief, briefing, generatingStatics, updating, approve, updateStatus, makeBrief, makeStatic, openAnchor = null, openingAnchor = null, adAccountId = null }) {
  const writing = briefing.has(idea.id);
  const isStatic = idea.format === "static";
  const statics = idea.statics || [];
  const generatingStatic = generatingStatics.has(idea.id);
  const approved = idea.status === "approved" || idea.status === "sent_to_inspo";
  const rejected = idea.status === "rejected";
  const approving = updating === `${idea.id}:approved`;
  const rejecting = updating === `${idea.id}:rejected`;
  const resetting = updating === `${idea.id}:pending`;

  return (
    <article className="cs-weekly-card">
      <header className="cs-weekly-card__header">
        <h3>{idea.title}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`cs-weekly-pill is-tier tier-${idea.tier}`}>{formatTier(idea.tier)}</span>
          {isAnalysisIdea(idea) && <span className="cs-weekly-pill" title={`Developed from the ad analysis idea "${String(idea.referenceSource).replace(/^seed:\s*/i, "")}"`}>From ad analysis gap</span>}
          {approved && <span className="cs-weekly-pill is-status is-approved">Approved</span>}
          {rejected && <span className="cs-weekly-pill is-status">Dismissed</span>}
        </div>
      </header>

      <div className="cs-weekly-card__body">
        <AnchorAdRow idea={idea} onOpen={openAnchor} opening={openingAnchor === idea.anchorAdId} adAccountId={adAccountId} />
        <p className="text-sm font-normal leading-6 text-[#5f524c]">{idea.conceptDescription}</p>
        {idea.suggestedAngle && <p className="mt-4 text-sm text-[#3b2c26]"><strong>Angle:</strong> <span className="underline decoration-[#6c3403]/35 underline-offset-4">{idea.suggestedAngle}</span></p>}
        {idea.hypothesis && <p className="mt-3 text-xs font-normal leading-5 text-[#6d605a]"><strong className="text-[#4f4039]">Hypothesis:</strong> {idea.hypothesis}</p>}
        {idea.whyNow && <p className="mt-2 text-xs font-normal leading-5 text-[#6d605a]"><strong className="text-[#4f4039]">Why now:</strong> {idea.whyNow}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {idea.format && <span className="cs-weekly-pill">{idea.format}</span>}
          {idea.awarenessStage && <span className="cs-weekly-pill">{idea.awarenessStage}</span>}
          {idea.targetPersona && <span className="cs-weekly-pill">{idea.targetPersona}</span>}
          {PRODUCTION_NOTES[productionKey(idea.productionNote)] && (
            <span className={`cs-weekly-pill is-production is-${productionKey(idea.productionNote)}`} title={PRODUCTION_NOTES[productionKey(idea.productionNote)].hint}>
              {PRODUCTION_NOTES[productionKey(idea.productionNote)].label}
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {isStatic && (
            <button type="button" onClick={() => makeStatic(idea.id)} disabled={generatingStatic} className="cs-weekly-static-button">
              {generatingStatic ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {generatingStatic ? "Generating…" : statics.length ? "New Static" : "Generate Static"}
            </button>
          )}
          <button type="button" onClick={() => makeBrief(idea.id)} disabled={writing} className="cs-weekly-brief-button">
            {writing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
            {writing ? "Writing…" : idea.format === "static" ? (brief ? "Regenerate Brief" : "Generate Brief") : (brief ? "Regenerate Script" : "Generate Script")}
          </button>
          <span className="flex-1" />
          {!approved && (
            <button type="button" onClick={() => approve(idea.id)} disabled={Boolean(updating)} className="cs-weekly-decision is-approve">
              {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />} Approve
            </button>
          )}
          {!rejected && (
            <button type="button" onClick={() => updateStatus(idea.id, "rejected")} disabled={Boolean(updating)} className="cs-weekly-decision is-dismiss">
              {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleX className="h-4 w-4" />} Dismiss
            </button>
          )}
          {(approved || rejected) && (
            <button type="button" onClick={() => updateStatus(idea.id, "pending")} disabled={Boolean(updating)} className="cs-weekly-reset">
              {resetting ? "Resetting…" : "Reset"}
            </button>
          )}
        </div>

        {isStatic && (generatingStatic || statics.length > 0) && <ConceptStatics statics={statics} generating={generatingStatic} />}
        {brief && <Brief brief={brief} />}
      </div>
    </article>
  );
}

const ANCHOR_LABELS = { iteration: "Iterates on", format_transformation: "Format flip of", big_swing: "Big swing on" };
const anchorMoney = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`;

/**
 * The ad an anchored concept builds on, by its real Meta ad name. Opens that
 * ad's full analysis in the Insights drawer; an ad no longer in Insights
 * keeps its saved name and links to Ads Manager instead.
 */
function AnchorAdRow({ idea, onOpen = null, opening = false, adAccountId = null }) {
  if (!idea.anchorAdId) return null;
  const ad = idea.anchorAd;
  const name = ad?.adName || idea.anchorAdName || "Unnamed ad";
  const label = ANCHOR_LABELS[idea.tier] || "Built on";
  const managerUrl = adsManagerAdUrl(adAccountId, idea.anchorAdId);
  const stats = ad ? [
    Number(ad.spend) > 0 && `${anchorMoney(ad.spend)} spend`,
    Number(ad.costPerPurchase) > 0 && `${anchorMoney(ad.costPerPurchase)} CPA`,
  ].filter(Boolean) : [];
  const thumb = <AdThumbImg ad={ad} className="cs-weekly-anchor__thumb" fallback={<span className="cs-weekly-anchor__thumb is-empty"><Zap className="h-4 w-4" /></span>} />;
  const text = <span className="min-w-0 flex-1">
    <span className="cs-weekly-anchor__label">{label}</span>
    <span className="cs-weekly-anchor__name" title={name}>{name}</span>
    {ad ? stats.length > 0 && <span className="cs-weekly-anchor__meta">{stats.join(" · ")}</span>
      : <span className="cs-weekly-anchor__meta">No longer in Insights</span>}
  </span>;

  if (ad && onOpen) {
    return <button type="button" className="cs-weekly-anchor is-link" onClick={() => onOpen(idea.anchorAdId)} disabled={opening} title="Open this ad's analysis">
      {thumb}{text}
      {opening ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
    </button>;
  }
  return <div className="cs-weekly-anchor">
    {ad ? thumb : <span className="cs-weekly-anchor__thumb is-empty"><Zap className="h-4 w-4" /></span>}{text}
    {managerUrl && <a href={managerUrl} target="_blank" rel="noopener noreferrer" className="cs-weekly-anchor__external" title="Open in Ads Manager">
      <ExternalLink className="h-4 w-4" />
    </a>}
  </div>;
}

/** Statics made from this concept (newest first). Each is also in Generate → Statics. */
function ConceptStatics({ statics, generating }) {
  return (
    <div>
      <div className="cs-weekly-statics">
        {generating && (
          <div className="cs-weekly-static is-pending" role="status">
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating static…
          </div>
        )}
        {statics.map((item) => (
          <a key={item.id} href={item.imageUrl || undefined} target="_blank" rel="noreferrer" className="cs-weekly-static" title="Open full size">
            {item.imageUrl ? <img src={item.imageUrl} alt="Static generated from this concept" loading="lazy" /> : <span className="text-[10.5px] text-[#8a746c]">Image unavailable</span>}
          </a>
        ))}
      </div>
      {statics.length > 0 && <p className="cs-weekly-statics-note">Also saved in Generate → Statics.</p>}
    </div>
  );
}

function Brief({ brief }) {
  return (
    <div className="cs-weekly-brief-result">
      {brief.hooks?.length > 0 && <BriefSection title="Hooks"><ol className="ml-4 list-decimal">{brief.hooks.map((hook, index) => <li key={index}>{hook}</li>)}</ol></BriefSection>}
      {brief.script && <BriefSection title="Script"><pre className="whitespace-pre-wrap font-sans">{brief.script}</pre></BriefSection>}
      {brief.headlines?.length > 0 && <BriefSection title="Headlines"><ol className="ml-4 list-decimal">{brief.headlines.map((headline, index) => <li key={index}>{headline}</li>)}</ol></BriefSection>}
      {brief.static_brief && <BriefSection title="Static Brief"><pre className="whitespace-pre-wrap font-sans">{brief.static_brief}</pre></BriefSection>}
    </div>
  );
}

function BriefSection({ title, children }) {
  return <div><p className="font-semibold text-[#3b170b]">{title}</p>{children}</div>;
}

function formatTier(value) {
  return TIERS.find((tier) => tier.key === value)?.label || value || "Concept";
}

WeeklyView.propTypes = { ctx: PropTypes.object.isRequired };
SegmentedFilter.propTypes = { items: PropTypes.array.isRequired, value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired, counts: PropTypes.object.isRequired, compact: PropTypes.bool };
ConceptCard.propTypes = {
  idea: PropTypes.object.isRequired,
  brief: PropTypes.object,
  briefing: PropTypes.instanceOf(Set).isRequired,
  generatingStatics: PropTypes.instanceOf(Set).isRequired,
  updating: PropTypes.string,
  approve: PropTypes.func.isRequired,
  updateStatus: PropTypes.func.isRequired,
  makeBrief: PropTypes.func.isRequired,
  makeStatic: PropTypes.func.isRequired,
  openAnchor: PropTypes.func,
  openingAnchor: PropTypes.string,
  adAccountId: PropTypes.string,
};
AnchorAdRow.propTypes = { idea: PropTypes.object.isRequired, onOpen: PropTypes.func, opening: PropTypes.bool, adAccountId: PropTypes.string };
ConceptStatics.propTypes = { statics: PropTypes.array.isRequired, generating: PropTypes.bool.isRequired };
Brief.propTypes = { brief: PropTypes.object.isRequired };
BriefSection.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
