// Intelligence (= the source app's "Insights" tab). The detailed sections use
// creative_strategy_audit aggregates plus per-ad ad_creative_insights evidence.
import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { AlertTriangle, ChevronDown, ChevronRight, Filter, Loader2, X, Zap } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { matchInsightAds, funnelBuckets } from "../insight-metrics";
import { creativeApi } from "@/lib/creativeApi";
import RunModelControls from "../RunModelControls";
import { useRunModels } from "../useRunModels";
import { RUN_OPERATIONS } from "../run-model-operations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { humanize } from "../JsonView";
import { CsScrollArea, EmptyState, ErrorBanner, PartialResultsNotice, ProgressiveSection } from "../ui";
import { useJobRunner } from "../JobsContext";
import { PerformerCard, SpendCpaChart, TopPerformers } from "./InsightsPerformance";
import { AdMediaProvider } from "../meta-media";
import RunBy from "../run-by";
import AdDetailDrawer, { CreativeThumbnail, HookDetails, MediaTag, computeAccountAverages } from "./AdDetailDrawer";

const money = (n) => `$${Math.round(n || 0).toLocaleString()}`;
const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);

export default function IntelligenceView({ ctx }) {
  const {
    selectedProductId, selectedBrand, renderHeaderActions,
  } = ctx;
  const models = useRunModels(selectedProductId);
  const [ads, setAds] = useState([]);
  const [audit, setAudit] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [angles, setAngles] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [updatedBy, setUpdatedBy] = useState(null);
  const currentProduct = useRef(selectedProductId);
  currentProduct.current = selectedProductId;
  const requestId = useRef(0);
  const [trending, setTrending] = useState(null);
  const [adNameFilter, setAdNameFilter] = useState(null);
  // The ad whose full analysis is open in the right-hand drawer.
  const [drawerAd, setDrawerAd] = useState(null);

  const load = useCallback(async (pid, { silent = false } = {}) => {
    const request = ++requestId.current;
    if (!pid) return;
    if (!silent) { setLoading(true); setErr(null); }
    try {
      const [r, ang] = await Promise.all([creativeApi.getInsights(pid), creativeApi.getAngles(pid).catch(() => ({ angles: [] }))]);
      if (currentProduct.current !== pid || request !== requestId.current) return;
      setUpdatedAt(r.updatedAt || null);
      setUpdatedBy(r.updatedBy || null);
      setAdNameFilter(r.adNameFilter ?? null);
      setAds(r.ads || []); setAudit(r.audit || null); setAngles(ang.angles || []); setTrending(r.trending || null);
    } catch (e) { if (!silent && currentProduct.current === pid) setErr(e.message); } finally { if (!silent && currentProduct.current === pid) setLoading(false); }
  }, []);

  useEffect(() => {
    setAds([]); setAudit(null); setAngles([]); setTrending(null); setUpdatedAt(null); setErr(null); setDrawerAd(null);
    if (selectedProductId) load(selectedProductId);
  }, [load, selectedProductId]);

  // Tracked jobs (persist across tab switches + reload on completion).
  const { job: analyzeJob, start: startAnalyze } = useJobRunner({ kind: "analyze_ads", productId: selectedProductId, match: (j) => j.only !== "winners", onComplete: () => load(selectedProductId) });
  const analyzeActive = isActiveJob(analyzeJob);

  useEffect(() => {
    if (!analyzeActive || !selectedProductId) return undefined;
    load(selectedProductId, { silent: true });
    const interval = window.setInterval(() => load(selectedProductId, { silent: true }), 2500);
    return () => window.clearInterval(interval);
  }, [analyzeActive, load, selectedProductId]);

  const run = async () => {
    if (!selectedProductId) return;
    setErr(null);
    try { const { jobId } = await creativeApi.runInsights(selectedProductId, models.forRun(RUN_OPERATIONS.intelligence)); startAnalyze(jobId); models.reset(RUN_OPERATIONS.intelligence); }
    catch (e) { setErr(e.message); }
  };
  const a = audit || {};
  // ── Executive KPIs (computed from ads) ──
  const totalSpend = ads.reduce((s, x) => s + (x.spend || 0), 0);
  const analyzedAds = ads.filter(x => x.primaryAngle && x.mediaDescription
    && (x.mediaType !== "video" || (x.transcriptStatus && x.transcriptStatus !== "none" && x.visualHookAnalysis)));
  const spendingAds = ads.filter(x => x.spend > 0);
  const analyzedSpending = analyzedAds.filter(x => x.spend > 0);
  const spendCoverage = totalSpend > 0 ? analyzedSpending.reduce((s, x) => s + x.spend, 0) / totalSpend : 0;
  const kpis = [
    ["Ads analyzed", analyzedAds.length],
    ["Total spend", money(totalSpend)],
    ["Avg ROAS", (() => { const v = mean(ads.map((x) => x.roas).filter((x) => x > 0)); return v ? `${v.toFixed(2)}x` : "—"; })()],
    ["Avg hook rate", (() => { const v = mean(ads.map((x) => x.hookRate).filter((x) => x > 0)); return v ? `${(v * 100).toFixed(0)}%` : "—"; })()],
    ["A/B winners", ads.filter((x) => x.grade === "A" || x.grade === "B").length],
  ];

  const trendingAds = trending?.trending_ads || [];

  const topHooks = deriveHooksFromAds(ads, a.top_hooks);
  // A top ad opens with the same hook text Top hooks shows for it.
  const hookTextById = new Map(topHooks.map((hook) => [hook.adId, hook.hookText]));
  // openedFrom "hook" leads the drawer with the copy and why the hook works.
  const openAd = (ad, openedFrom = "ad") => setDrawerAd({ ...ad, openedFrom, hookText: ad.hookText || hookTextById.get(ad.adId) || ad.firstSpokenSentence || ad.firstOverlayHeadline || ad.headlineText || "" });
  // Scorecard averages for ads without a saved grade (e.g. recent launches).
  const accountAverages = computeAccountAverages(ads);
  const fatigued = ads.filter((x) => (x.frequency || 0) >= 3 && (x.spend || 0) > 100).sort((x, y) => (y.frequency || 0) - (x.frequency || 0)).slice(0, 5);
  const failedDownloads = analyzedAds.filter((x) => !x.storagePath);
  const patterns = Array.isArray(a.patterns) ? [...a.patterns].sort((x, y) =>
    ((y.spend_pct || 0) * 0.6 + (y.ad_count || 0) * 4) - ((x.spend_pct || 0) * 0.6 + (x.ad_count || 0) * 4)) : [];

  const analyzePhase = analyzeJob?.progress?.phase;
  const adWorkActive = analyzeActive && !String(analyzePhase || "").startsWith("audit");
  const auditWorkActive = analyzeActive && String(analyzePhase || "").startsWith("audit");
  const insightReadyCount = [
    ads.length > 0, patterns.length > 0, topHooks.length > 0, Array.isArray(a.messaging_themes) && a.messaging_themes.length > 0,
    Array.isArray(a.persona_ad_mapping) && a.persona_ad_mapping.length > 0, Array.isArray(a.visual_openers) && a.visual_openers.length > 0,
  ].filter(Boolean).length;
  const angleGroups = angles.reduce((groups, angle) => {
    const key = angle.status || "uncategorized";
    if (!groups[key]) groups[key] = [];
    groups[key].push(angle);
    return groups;
  }, {});

  return (
    <AdMediaProvider key={selectedProductId || "none"} productId={selectedProductId}>
    <div className="space-y-5">
      {renderHeaderActions(
        <div className="flex items-center gap-3">
        <div className="flex flex-col items-end gap-2">
        <button type="button" onClick={run} disabled={!selectedProductId || analyzeActive} className="cs-primary-button">
          {analyzeActive && <Loader2 className="h-4 w-4 animate-spin" />}
          {analyzeActive ? "Running Analysis…" : "Run Analysis"}
        </button>
        <p className="text-[11px] text-neutral-500">Updated: {updatedAt ? <time dateTime={updatedAt}>{new Date(updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time> : "Not analyzed yet"}{updatedAt && updatedBy && <>{" "}<RunBy uid={updatedBy.uid} auto={updatedBy.auto} /></>}</p>
        </div>
        </div>
      )}
      {selectedProductId && <>
        <RunModelControls models={models} operations={RUN_OPERATIONS.intelligence} disabled={Boolean(analyzeActive)} />
        <AdNameScopeControl current={adNameFilter} busy={Boolean(analyzeActive)} onSave={async (value) => {
          const saved = await creativeApi.saveAdNameFilter(selectedProductId, value);
          setAdNameFilter(saved.adNameFilter ?? null);
          await load(selectedProductId, { silent: true });
        }} />
        <p className="text-xs text-neutral-500">Model choices apply to new analyses and the next audit. Completed ad analyses are reused.</p>
      </>}
      <ErrorBanner message={err} />
      <PartialResultsNotice active={analyzeActive} completed={insightReadyCount} total={6} label="insight sections" />

      {!selectedProductId ? (
        <EmptyState icon={Zap} title="No product selected" hint="Select a product above to run and view ad analysis." />
      ) : (
        <div className="space-y-5">
      {ads.length > 0 ? (
          <div className="cs-intel-kpis">
            {kpis.map(([label, val]) => <div key={label} className="cs-intel-kpi"><span>{label}</span><strong>{val}</strong></div>)}
          </div>
        ) : <ProgressiveSection title="Performance overview" description="Meta spend, efficiency, hook rate, and winners." active={adWorkActive || loading} cards={4} />}

      {spendingAds.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-600" role="status">
          Creative analysis covers {analyzedSpending.length} of {spendingAds.length} spending ads ({Math.round(spendCoverage * 100)}% of spend). Performance metrics include all saved ads. Each refresh reuses completed analyses and processes remaining spending ads, subject to configured limits and available budget.
          {a.analysis_coverage?.sampled_ads != null && <> Strategy insights use {a.analysis_coverage.sampled_ads} analyzed ads{a.analysis_coverage.sample_method === "spend_and_evidence_diversity" ? ", selected for spend and distinct creative evidence" : ""}.</>}
          {a.analysis_coverage?.cluster_coverage?.persona_ad_mapping?.unassigned_ads > 0 && <p className="mt-1">{a.analysis_coverage.cluster_coverage.persona_ad_mapping.unassigned_ads} ads in the strategy analysis could not be assigned to a supported persona.</p>}
          {a.analysis_coverage?.stale_sections?.length > 0 && <p className="mt-1">Some insight sections are from the previous analysis while their refresh is incomplete.</p>}
        </div>
      )}
      <FailedDownloadsBanner ads={failedDownloads} total={analyzedAds.length} />
      {patterns.length > 0 ? <StrategicPatterns patterns={patterns} ads={ads} onOpenAd={openAd} /> : <ProgressiveSection title="Most common patterns by spend" active={auditWorkActive} />}
      {topHooks.length > 0 ? <TopHooksSection key={selectedProductId} hooks={topHooks} onOpenAd={openAd} /> : <ProgressiveSection title="Top hooks" active={adWorkActive} cards={2} />}
      {Array.isArray(a.visual_openers) && a.visual_openers.length > 0
        ? <VisualOpenersSection openers={a.visual_openers} ads={ads} onOpenAd={openAd} />
        : <ProgressiveSection title="Visual openers" active={auditWorkActive} cards={2} />}
      {Array.isArray(a.messaging_themes) && a.messaging_themes.length > 0
        ? <MessagingThemesSection themes={a.messaging_themes} ads={ads} onOpenAd={openAd} />
        : <ProgressiveSection title="Messaging themes" active={auditWorkActive} cards={2} />}
      {ads.length > 0 ? <FunnelBalanceSection ads={ads} /> : <ProgressiveSection title="Funnel balance" active={adWorkActive} />}
      {ads.length > 0 && <SpendCpaChart ads={ads} />}
      {Array.isArray(a.persona_ad_mapping) && a.persona_ad_mapping.length > 0
        ? <PersonaPerformanceSection mappings={a.persona_ad_mapping} ads={ads} onOpenAd={openAd} />
        : <ProgressiveSection title="Customer persona performance" active={auditWorkActive} cards={2} />}

      {/* Trending creatives and recent launches live in Top performers as filters, like Fatigued. */}
      {(ads.length > 0 || trendingAds.length > 0) && <TopPerformers key={selectedProductId} ads={ads} trending={trendingAds} trendingRefreshing={analyzeActive} onOpenAd={openAd} />}
      {/* The audit's untapped angles and gaps are listed under Ad angles → Untapped. */}

      {angles.length > 0 && <AngleGroups groups={angleGroups} ads={ads} onOpenAd={openAd} />}


      {fatigued.length > 0 && (
        <Block title="Fatigue alerts (frequency ≥ 3)">
          <div className="space-y-4">{fatigued.map((f) => <div key={f.adId} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="min-w-0 break-words text-base font-medium text-neutral-800">{f.adName || "(unnamed)"}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill>Frequency {Number(f.frequency).toFixed(1)}</Pill>
              <Pill>{money(f.spend)} spend</Pill>
            </div>
          </div>)}</div>
        </Block>
      )}
        </div>
      )}
      <AdDetailDrawer
        ad={drawerAd}
        onClose={() => setDrawerAd(null)}
        averages={accountAverages}
        productId={selectedProductId}
        adAccountId={selectedBrand?.metaAdAccountId || null}
        // Trending and hook cards can be partial copies; actions need the saved ad row.
        sourceAd={drawerAd ? ads.find((row) => row.adId === drawerAd.adId) || drawerAd : null}
      />
    </div>
    </AdMediaProvider>
  );
}

const HOOK_ERROR_INDICATORS = [
  "unable to extract", "static frame", "error:", "failed to process", "no spoken dialogue",
  "analysis unavailable", "cannot extract", "not available", "could not extract", "insufficient audio", "n/a",
];

function isHookError(text) {
  const value = String(text || "").toLowerCase().trim();
  return !value || value.length < 3 || HOOK_ERROR_INDICATORS.some((indicator) => value.includes(indicator));
}

function isSocialChrome(text) {
  const value = String(text || "").toLowerCase().trim();
  return !value || /^\S{1,25}\s+\d{1,3}[wdhms]\b/.test(value) || /\bby\s+(author|creator)\b/.test(value)
    || (/^(reply|like|share|repost|comment|follow|subscribe|send|save)\b/.test(value) && value.length < 25)
    || (/^[\p{Emoji_Presentation}\p{Emoji}\s]+\s*\d*$/u.test(value))
    || (/^@?\w{1,20}$/.test(value) && !/\s/.test(value) && value.length < 15);
}

function extractHookFromFormula(formula) {
  const pattern = String(formula?.pattern_interrupt || "");
  if (!pattern) return "";
  const quoted = pattern.match(/["“”']([^"“”']{10,})["“”']/);
  if (quoted) return quoted[1].trim();
  return pattern.length < 100 && !/\bover\s+(a|an|the)\b/i.test(pattern) ? pattern.trim() : "";
}

function normalizeHook(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSimilarHook(first, second) {
  const a = normalizeHook(first);
  const b = normalizeHook(second);
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length / longer.length <= 0.7) return false;
  let differences = 0;
  for (let index = 0; index < longer.length; index += 1) if (shorter[index] !== longer[index]) differences += 1;
  return differences / longer.length < 0.2;
}

function deriveHooksFromAds(ads, auditHooks) {
  const hooks = [];
  for (const ad of [...ads].sort((x, y) => (y.spend || 0) - (x.spend || 0))) {
    const isVideo = String(ad.mediaType || "").toLowerCase() === "video";
    const throwaway = (text) => {
      const value = String(text || "").toLowerCase().trim();
      return /^(thank you|thanks|hi|hey|hello|okay|ok|so|um|uh|well|right|alright|oh)[.!,\s]?$/i.test(value)
        || value.length < 8 || (/^(hi |hey |hello |thanks |thank you)/i.test(value) && value.length < 20);
    };
    let hookText = "";
    let hookSource = "headline";
    const audioHook = isVideo ? ad.firstSpokenSentence || "" : "";
    const overlayHook = ad.firstOverlayHeadline || "";
    if (audioHook && !isHookError(audioHook) && !throwaway(audioHook)) {
      hookText = audioHook;
      hookSource = "audio";
    } else if (overlayHook && !isHookError(overlayHook) && !isSocialChrome(overlayHook)) {
      hookText = overlayHook;
      hookSource = "overlay";
    } else if (overlayHook && isSocialChrome(overlayHook)) {
      hookText = extractHookFromFormula(ad.hookFormula);
      if (!hookText && isVideo) {
        const overlays = ad.visualHookAnalysis?.opening_text_overlays || [];
        hookText = overlays.slice(1).map((item) => String(item?.text || "").trim())
          .find((text) => text && !isHookError(text) && !isSocialChrome(text)) || "";
      }
      if (hookText) hookSource = "overlay";
    }
    if (!hookText && isVideo && audioHook && throwaway(audioHook) && ad.transcript) {
      const sentences = String(ad.transcript).split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 10);
      const fallback = sentences[1] || sentences[0] || "";
      if (fallback && !isHookError(fallback) && !throwaway(fallback)) { hookText = fallback; hookSource = "audio"; }
    }
    if (!hookText && !isVideo && ad.headlineText && !isHookError(ad.headlineText)) hookText = ad.headlineText;
    if (!hookText || isHookError(hookText)) continue;
    if (!hooks.some((prior) => isSimilarHook(prior.hookText, hookText))) hooks.push({ ...ad, hookText, hookSource });
  }

  for (const auditHook of Array.isArray(auditHooks) ? auditHooks : []) {
    const hookText = auditHook?.hook || auditHook?.text || "";
    if (!hookText || isHookError(hookText) || hooks.some((prior) => isSimilarHook(prior.hookText, hookText))) continue;
    hooks.push({
      ...auditHook,
      hookText,
      adName: auditHook.ad_name,
      adId: auditHook.ad_id || `audit-hook-${hooks.length}`,
      mediaType: auditHook.media_type,
      hookSource: auditHook.hook_source,
      costPerPurchase: auditHook.cpa,
      hookRate: auditHook.hook_rate,
      avgWatchTime: auditHook.avg_watch_time,
      primaryAngle: auditHook.primary_angle,
      hookStyle: auditHook.hook_style,
      emotionalTrigger: auditHook.emotional_trigger,
      awarenessStage: auditHook.awareness_stage,
      benefitType: auditHook.benefit_type,
      buildingBlocks: auditHook.building_blocks,
      lifeForce8: auditHook.life_force_8,
      funnelPosition: auditHook.funnel_position,
      frequency: auditHook.avg_frequency,
      whyItWorks: auditHook.why_it_works,
      hookFormula: auditHook.hook_formula,
      adsManagerCopy: { primary_text: auditHook.primary_text, headline: auditHook.headline, cta: auditHook.cta },
    });
  }
  return hooks;
}

function FailedDownloadsBanner({ ads, total }) {
  const [open, setOpen] = useState(false);
  if (!ads.length) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-2 text-left">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="flex-1 text-sm font-medium text-amber-900">{ads.length} of {total} ads are missing a saved preview</span>
        {open ? <ChevronDown className="h-4 w-4 text-amber-700" /> : <ChevronRight className="h-4 w-4 text-amber-700" />}
      </button>
      {open && <div className="mt-3 space-y-2 border-t border-amber-200 pt-3">
        {ads.map((ad) => <div key={ad.adId} className="rounded-lg bg-white/70 p-2 text-xs text-amber-900">
          <strong>{ad.adName || "Unnamed ad"}</strong><span className="text-amber-700"> · {money(ad.spend)}</span>
          {Array.isArray(ad.analysisWarnings) && ad.analysisWarnings.length > 0
            ? <ul className="mt-1 list-disc pl-4">{ad.analysisWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
            : <p className="mt-1 text-amber-700">No specific warning was recorded.</p>}
        </div>)}
      </div>}
    </div>
  );
}
FailedDownloadsBanner.propTypes = { ads: PropTypes.array.isRequired, total: PropTypes.number.isRequired };

/**
 * Ads behind an audit cluster: ad_ids when the audit saved them, else the
 * example names (which may carry an "[ad_id=…]" reference from the prompt).
 */
function resolveClusterAds(cluster, ads, nameKeys = ["example_ad_names", "ad_names", "examples"]) {
  const byId = new Map(ads.map((ad) => [ad.adId, ad]));
  const byName = new Map(ads.map((ad) => [ad.adName, ad]));
  const found = new Map();
  const add = (ad) => { if (ad && !found.has(ad.adId)) found.set(ad.adId, ad); };
  for (const id of [...(Array.isArray(cluster?.ad_ids) ? cluster.ad_ids : []), ...(Array.isArray(cluster?.example_ad_ids) ? cluster.example_ad_ids : [])]) add(byId.get(id));
  for (const key of nameKeys) {
    for (const name of Array.isArray(cluster?.[key]) ? cluster[key] : []) {
      const ref = /\[ad_id=([^\]]+)\]/.exec(String(name));
      add(ref ? byId.get(ref[1]) : byName.get(name));
      if (!ref) add(byName.get(String(name).trim()));
    }
  }
  return [...found.values()].sort((x, y) => (y.spend || 0) - (x.spend || 0));
}

/**
 * The "N ads" count. Newer audits list every ad in a pattern / opener
 * (ad_ids), so the count is the ads we can show. Older audits only saved 2-4
 * examples next to the model's own count, so that count is kept for them.
 */
function clusterAdCount(cluster, matched) {
  return Array.isArray(cluster?.ad_ids) && cluster.ad_ids.length ? matched.length : (cluster?.ad_count || matched.length);
}

/**
 * Persona-style expandable rows: a header with title, description, metrics
 * and spend bar; opening it shows extra detail and every ad, each of which
 * opens the ad drawer.
 */
function ExpandableClusters({ items, onOpenAd }) {
  const [expanded, setExpanded] = useState(null);
  return <div className="space-y-2">{items.map((item, index) => {
    const open = expanded === index;
    return <div key={`${item.title}-${index}`} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <button type="button" onClick={() => setExpanded(open ? null : index)} aria-expanded={open} className="flex w-full items-start gap-3 p-3 text-left">
        {item.thumbAd !== undefined && <CreativeThumbnail ad={item.thumbAd} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><strong className="text-[15px] text-neutral-800">{item.title}</strong>{item.badge}</div>
          {item.description && <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">{item.description}</p>}
          <MetricPills className="mt-2" items={item.pills} />
          {item.sharePct != null && <div className="cs-intel-spend-bar mt-3"><div style={{ width: `${Math.max(Math.min(item.sharePct, 100), 2)}%` }} /></div>}
        </div>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />}
      </button>
      {open && <div className="cs-intel-expanded-stack">
        {item.details}
        <section><h3 className="cs-intel-subsection-title">Ads</h3>
          {item.ads.length ? <><p className="mt-1 text-xs text-neutral-500">Open an ad for its full analysis.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">{item.ads.map((ad) => <AdEvidenceCard key={ad.adId} ad={ad} onOpen={onOpenAd} />)}</div></>
            : <p className="mt-1 text-[13px] text-neutral-500">No saved ads matched. Run Analysis to refresh.</p>}
        </section>
      </div>}
    </div>;
  })}</div>;
}
ExpandableClusters.propTypes = { items: PropTypes.array.isRequired, onOpenAd: PropTypes.func };


/** learning_sheet_level: the audit's confidence in a pattern (its own call, not the brand's Learnings list). */
const CONFIDENCE_HINT = {
  gospel: "Consistently behind most spend and results; treat as a rule for this account.",
  tested: "Has worked across several ads with real spend.",
  suspected: "Early signal from a few ads or little spend; worth testing, not proven.",
  discredited: "Ads using it are underperforming.",
};

function StrategicPatterns({ patterns, ads, onOpenAd }) {
  if (!patterns.length) return null;
  const items = patterns.map((pattern) => {
    const pct = Number(pattern.spend_pct || 0);
    const level = String(pattern.learning_sheet_level || "").toLowerCase();
    const matched = resolveClusterAds(pattern, ads);
    return {
      title: pattern.pattern_name || "Pattern",
      description: pattern.pattern || pattern.insight || "",
      badge: level && <span className="cs-intel-attribute-pill is-tone-1" title={CONFIDENCE_HINT[level] || undefined}>Confidence: {humanize(pattern.learning_sheet_level)}</span>,
      pills: [`${pct.toFixed(0)}% of spend`, pattern.emotional_driver && `Driver: ${pattern.emotional_driver}`, `${clusterAdCount(pattern, matched)} ads`, pattern.saturation_risk && `${humanize(pattern.saturation_risk)} saturation risk`],
      sharePct: pct,
      ads: matched,
    };
  });
  return <InsightSection title="Most common patterns by spend" description="The storytelling moves your ads use most, ranked by how much spend sits behind them. A pattern is how an ad makes its point, not just its topic. Confidence is the analysis's read: Gospel (a rule for this account), Tested, Suspected (early signal) or Discredited.">
    <ExpandableClusters items={items} onOpenAd={onOpenAd} />
  </InsightSection>;
}
StrategicPatterns.propTypes = { patterns: PropTypes.array.isRequired, ads: PropTypes.array.isRequired, onOpenAd: PropTypes.func };


// How a top hook opens its details: the right-hand drawer (new) or inline
// under the row (the original layout). Kept as a per-browser toggle while the
// drawer is being tried out.
const HOOK_VIEW_KEY = "cs-top-hooks-view";
function readHookView() {
  try { return localStorage.getItem(HOOK_VIEW_KEY) === "inline" ? "inline" : "drawer"; } catch { return "drawer"; }
}

function TopHooksSection({ hooks, onOpenAd }) {
  const [expanded, setExpanded] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [view, setView] = useState(readHookView);
  const visibleHooks = showAll ? hooks : hooks.slice(0, 20);
  const chooseView = (next) => {
    setView(next);
    setExpanded(null);
    try { localStorage.setItem(HOOK_VIEW_KEY, next); } catch { /* Keep session state. */ }
  };
  if (!hooks.length) return null;
  return <InsightSection title="Top hooks" tone="dark" actions={<div className="flex flex-wrap items-center gap-3">
    <span className="text-xs text-neutral-400">{visibleHooks.length < hooks.length ? `${visibleHooks.length} of ${hooks.length} distinct hooks` : `${hooks.length} distinct hooks`}</span>
    <div className="cs-hook-view-toggle" role="group" aria-label="Open hook details">
      {[["drawer", "Drawer"], ["inline", "Inline"]].map(([key, label]) => (
        <button key={key} type="button" aria-pressed={view === key} onClick={() => chooseView(key)} className={view === key ? "is-active" : ""}>{label}</button>
      ))}
    </div>
  </div>}>
    <p className="mb-3 text-xs text-neutral-400">Saved hooks with usable extracted text. Similar hooks are combined; ads without usable hook text are excluded.</p>
    <CsScrollArea viewportClassName="max-h-[720px]"><div className="cs-intel-accordion-list pr-3">{visibleHooks.map((hook, index) => {
      const open = view === "inline" && expanded === index;
      return <div key={`${hook.adId}-${index}`} className="cs-intel-accordion-card">
        <button type="button" onClick={() => (view === "drawer" ? onOpenAd(hook, "hook") : setExpanded(open ? null : index))} className="cs-intel-hook-trigger">
          <span className="cs-intel-list-index">{index + 1}</span>
          <p className="cs-intel-hook-title">“{hook.hookText}”</p>
          <MediaTag mediaType={hook.mediaType} />
          <MetricPills compact items={[`${money(hook.spend)} spend`, hook.costPerPurchase ? `${money(hook.costPerPurchase)} CPA` : null]} />
          {open ? <ChevronDown className="h-3.5 w-3.5 text-neutral-400" /> : <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />}
        </button>
        {open && <HookDetails hook={hook} />}
      </div>;
    })}</div></CsScrollArea>
    {hooks.length > 20 && <button
      type="button"
      className="cs-research-details-button cs-intel-more-button"
      aria-expanded={showAll}
      onClick={() => {
        if (showAll && expanded >= 20) setExpanded(null);
        setShowAll((current) => !current);
      }}
    >{showAll ? <>Show fewer<ChevronDown className="h-3.5 w-3.5 rotate-180" /></> : <>Show {hooks.length - 20} more hooks<ChevronDown className="h-3.5 w-3.5" /></>}</button>}
  </InsightSection>;
}
TopHooksSection.propTypes = { hooks: PropTypes.array.isRequired, onOpenAd: PropTypes.func.isRequired };

function MessagingThemesSection({ themes, ads, onOpenAd }) {
  if (!Array.isArray(themes) || !themes.length) return null;
  const enriched = themes.map((theme) => {
    const matchedAds = matchInsightAds(theme, ads);
    const spend = matchedAds.reduce((sum, ad) => sum + (ad.spend || 0), 0);
    const purchases = matchedAds.reduce((sum, ad) => sum + (ad.purchases || 0), 0);
    const repAd = matchedAds.find(ad => ad.adId === theme.representative_ad_id) || matchedAds.find(ad => ad.adName === theme.representative_ad_name) || [...matchedAds].sort((x, y) => (y.spend || 0) - (x.spend || 0))[0];
    return { ...theme, matchedAds, spend, purchases, cpa: purchases > 0 ? spend / purchases : null, repAd };
  }).sort((x, y) => y.spend - x.spend);
  const totalSpend = enriched.reduce((sum, theme) => sum + theme.spend, 0);
  const items = enriched.map((theme) => ({
    title: theme.theme,
    description: theme.description,
    thumbAd: theme.repAd ?? null,
    badge: theme.proven && <Badge variant="secondary" className="text-[9px] text-emerald-700">Proven</Badge>,
    pills: [`${money(theme.spend)} spend`, `${theme.matchedAds.length} ads`, theme.cpa ? `${money(theme.cpa)} CPA` : null, theme.awareness_level && humanize(theme.awareness_level)],
    sharePct: totalSpend > 0 ? (theme.spend / totalSpend) * 100 : null,
    ads: [...theme.matchedAds].sort((x, y) => (y.spend || 0) - (x.spend || 0)),
  }));
  return <InsightSection
    title="Messaging themes"
    tone="orange"
    description={`The core desire or problem each ad leads with, like "saves you time" or "finally sleep through the night". Every ad is placed in exactly one theme, so you can see where your spend is concentrated and which messages pay off. Proven themes have 3+ ads, a real share of spend and a CPA at or below your average. ${enriched.length} theme${enriched.length === 1 ? "" : "s"} detected.`}
  >
    <ExpandableClusters items={items} onOpenAd={onOpenAd} />
  </InsightSection>;
}
MessagingThemesSection.propTypes = { themes: PropTypes.any, ads: PropTypes.array.isRequired, onOpenAd: PropTypes.func };

function FunnelBalanceSection({ ads }) {
  const buckets = funnelBuckets(ads);
  const stages = Object.keys(buckets);
  const total = stages.reduce((sum, stage) => sum + buckets[stage].spend, 0);
  if (!total) return null;
  const activeStages = stages.filter((stage) => buckets[stage].spend > 0);
  const colors = { TOF: "is-tof", MOF: "is-mof", BOF: "is-bof", Unclassified: "is-unclassified" };
  return <InsightSection title="Funnel balance">
    <p className="mb-3 text-xs text-neutral-400">Estimated stages from current CPM and frequency relative to this account. CPA is reported as performance, not used to decide audience stage. This does not measure Meta targeting. Missing or conflicting CPM/frequency signals remain unclassified; percentages include all spending ads.</p>
    <div className="cs-intel-funnel-bar">{activeStages.map((stage) => <div key={stage} className={colors[stage]} style={{ width: `${(buckets[stage].spend / total) * 100}%` }} />)}</div>
    <div className="cs-intel-funnel-breakdown">{activeStages.map((stage) => {
      const bucket = buckets[stage]; const cpa = bucket.purchases > 0 ? bucket.spend / bucket.purchases : null;
      return <div key={stage} className={`cs-intel-funnel-segment ${colors[stage]}`} style={{ width: `${(bucket.spend / total) * 100}%` }}><div><strong>{Math.round((bucket.spend / total) * 100)}%</strong><p>{stage}</p><small>{bucket.count} ads{cpa ? ` / ${money(cpa)} CPA` : ""}</small></div></div>;
    })}</div>
  </InsightSection>;
}
FunnelBalanceSection.propTypes = { ads: PropTypes.array.isRequired };

/**
 * One card per persona. A cohort the audit matched to a Research persona uses
 * that persona's name (matched_persona_name), and cohorts matched to the same
 * Research persona are merged, so Insights and Research name people the same way.
 */
function mergePersonaCohorts(mappings) {
  const byName = new Map();
  mappings.forEach((mapping, index) => {
    const researchName = mapping.matched_persona_name || null;
    const title = researchName || mapping.persona_short_title || mapping.matched_research_persona || mapping.persona || `Persona ${index + 1}`;
    const key = researchName ? `research:${researchName.toLowerCase()}` : `cohort:${title.toLowerCase()}:${index}`;
    const current = byName.get(key);
    if (!current) { byName.set(key, { ...mapping, title, fromResearch: Boolean(researchName), cohorts: [mapping] }); return; }
    current.cohorts.push(mapping);
    // ad_ids stays unset for name-only (pre-ID) audits, so name matching still applies.
    if (current.ad_ids || mapping.ad_ids) current.ad_ids = [...new Set([...(current.ad_ids || []), ...(mapping.ad_ids || [])])];
    current.ad_names = [...new Set([...(current.ad_names || []), ...(mapping.ad_names || [])])];
    current.top_angles_used = [...new Set([...(current.top_angles_used || []), ...(mapping.top_angles_used || [])])];
    current.angles_not_yet_tested = [...new Set([...(current.angles_not_yet_tested || []), ...(mapping.angles_not_yet_tested || []), ...(mapping.top_unmet_angle ? [mapping.top_unmet_angle] : [])])];
  });
  return [...byName.values()];
}

function PersonaPerformanceSection({ mappings, ads, onOpenAd }) {
  const [expanded, setExpanded] = useState(null);
  if (!Array.isArray(mappings) || !mappings.length) return null;
  const enriched = mergePersonaCohorts(mappings).map((mapping) => {
    const matchedAds = matchInsightAds(mapping, ads);
    const spend = matchedAds.reduce((sum, ad) => sum + (ad.spend || 0), 0);
    const purchases = matchedAds.reduce((sum, ad) => sum + (ad.purchases || 0), 0);
    return { ...mapping, matchedAds, spend, cpa: purchases > 0 ? spend / purchases : null };
  }).sort((x, y) => y.spend - x.spend);
  const coveredAds = new Map(enriched.flatMap(item => item.matchedAds.map(ad => [ad.adId, ad])));
  const total = [...coveredAds.values()].reduce((sum, ad) => sum + (ad.spend || 0), 0);
  return <InsightSection title="Customer personas" tone="dark"><p className="mb-3 text-xs text-neutral-400">Personas are inferred from ad content and named after the matching Research persona when there is one. Share is of mapped ad spend; ads may support more than one persona, so shares can exceed 100% combined.</p><div className="space-y-2">{enriched.map((persona, index) => {
    const open = expanded === index; const share = total > 0 ? (persona.spend / total) * 100 : 0;
    const description = persona.cohorts.map((cohort) => cohort.persona).filter((text) => text && text !== persona.title)[0];
    const anglesNotTested = persona.angles_not_yet_tested?.length ? persona.angles_not_yet_tested : persona.top_unmet_angle ? [persona.top_unmet_angle] : [];
    return <div key={`${persona.title}-${index}`} className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><button type="button" onClick={() => setExpanded(open ? null : index)} className="flex w-full gap-3 p-3 text-left">
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-[15px] text-neutral-800">{persona.title}</strong>{persona.fromResearch && <Badge variant="secondary" className="text-[9px] text-emerald-700">Research persona</Badge>}</div>{description && <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">{description}</p>}
        <MetricPills className="mt-2" items={[`${persona.matchedAds.length} ads`, `${money(persona.spend)} spend`, `${Math.round(share)}% share`, persona.cpa ? `${money(persona.cpa)} CPA` : null]} /><div className="cs-intel-spend-bar mt-3"><div style={{ width: `${Math.max(share, 2)}%` }} /></div>
      </div>{open ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}</button>
      {open && <div className="cs-intel-expanded-stack">
        {persona.top_angles_used?.length > 0 && <section><h3 className="cs-intel-subsection-title">Angles currently in use</h3><div className="cs-intel-tag-row mt-2">{persona.top_angles_used.map((angle, angleIndex) => <span key={angle} className={`cs-intel-attribute-pill is-tone-${angleIndex % 4}`}>{angle}</span>)}</div></section>}
        {anglesNotTested.length > 0 && <section><h3 className="cs-intel-subsection-title">Still untested</h3><p className="mt-1 text-[13px] text-neutral-600">{anglesNotTested.join(", ")}</p></section>}
        <section><h3 className="cs-intel-subsection-title">Supporting ads</h3><p className="mt-1 text-xs text-neutral-500">Open an ad for its full analysis.</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{persona.matchedAds.map((ad) => <AdEvidenceCard key={ad.adId} ad={ad} onOpen={onOpenAd} />)}</div></section>
      </div>}
    </div>;
  })}</div></InsightSection>;
}
PersonaPerformanceSection.propTypes = { mappings: PropTypes.any, ads: PropTypes.array.isRequired, onOpenAd: PropTypes.func };

function VisualOpenersSection({ openers, ads, onOpenAd }) {
  if (!Array.isArray(openers) || !openers.length) return null;
  const items = openers.map((opener) => {
    const matched = resolveClusterAds(opener, ads);
    const pct = Number(opener.spend_pct || 0);
    return {
      title: opener.pattern_name || opener.trend_name || "Opener",
      description: opener.visual_description || opener.opening_description,
      thumbAd: matched[0] ?? null,
      pills: [`${clusterAdCount(opener, matched)} ads`, `${Math.round(pct)}% spend`, opener.avg_hook_rate > 0 ? `${(opener.avg_hook_rate * 100).toFixed(1)}% avg hook rate` : null],
      sharePct: pct,
      ads: matched,
    };
  });
  return <InsightSection title="Visual openers" description="Video ads — what appears in the first 2–5 seconds.">
    <ExpandableClusters items={items} onOpenAd={onOpenAd} />
  </InsightSection>;
}
VisualOpenersSection.propTypes = { openers: PropTypes.any, ads: PropTypes.array.isRequired, onOpenAd: PropTypes.func };

function AdEvidenceCard({ ad, onOpen }) {
  const content = <><CreativeThumbnail ad={ad} /><div className="min-w-0 flex-1"><strong className="block truncate text-[13px] text-neutral-800">{ad.adName || "Unnamed"}</strong><MetricPills className="mt-1.5" compact items={[`${money(ad.spend)} spend`, ad.costPerPurchase ? `${money(ad.costPerPurchase)} CPA` : null, ad.hookRate > 0 ? `${(ad.hookRate * 100).toFixed(1)}% HR` : null]} /></div><MediaTag mediaType={ad.mediaType} />{onOpen && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />}</>;
  if (!onOpen) return <div className="cs-intel-evidence-card">{content}</div>;
  return <button type="button" onClick={() => onOpen(ad)} className="cs-intel-evidence-card is-button" aria-label={`Open details for ${ad.adName || "ad"}`}>{content}</button>;
}
AdEvidenceCard.propTypes = { ad: PropTypes.object.isRequired, onOpen: PropTypes.func };

function Block({ title, children, actions, noDivider = false }) {
  return (
    <section className={`cs-intel-panel ${noDivider ? "is-no-divider" : ""}`}>
      <header className="cs-intel-panel__header">
        <h2>{title}</h2>
        {actions}
      </header>
      <div className="cs-intel-panel__body">{children}</div>
    </section>
  );
}
Block.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node, actions: PropTypes.node, noDivider: PropTypes.bool };

function InsightSection({ title, description, children, actions, tone }) {
  return (
    <section className={`cs-intel-insight ${tone ? `is-persona-style is-${tone}` : ""}`}>
      <header>
        <div className="min-w-0">
          <h2>{title}</h2>
          {description && <p className="cs-intel-insight__subheader">{description}</p>}
        </div>
        {actions}
      </header>
      <div className="cs-intel-insight__body">{children}</div>
    </section>
  );
}
InsightSection.propTypes = { title: PropTypes.string.isRequired, description: PropTypes.string, children: PropTypes.node, actions: PropTypes.node, tone: PropTypes.oneOf(["dark", "orange"]) };

function Pill({ children }) {
  return <span className="cs-intel-pill">{children}</span>;
}
Pill.propTypes = { children: PropTypes.node };

function MetricPills({ items, className = "", compact = false }) {
  const visible = items.filter(Boolean);
  if (!visible.length) return null;
  return <div className={`cs-intel-metric-pills ${compact ? "is-compact" : ""} ${className}`}>{visible.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>;
}
MetricPills.propTypes = { items: PropTypes.array.isRequired, className: PropTypes.string, compact: PropTypes.bool };

// How each Ad angles bucket is decided (weekly/angle-inventory.ts).
const ANGLE_STATUS_HELP = {
  proven: "The main angle of at least one analyzed ad.",
  in_research: "Listed as an angle for one of your Research personas, but no analyzed ad leads with it yet. Research suggests it should land.",
  untapped: "Flagged as a gap by the ad analysis (an angle a persona responds to, or an awareness stage, that no current ad covers), and not in your Research persona lists. Open an angle to see the reasoning and ideas to test it.",
};

function AngleGroups({ groups, ads, onOpenAd }) {
  const [selectedAngle, setSelectedAngle] = useState(null);
  const [detailAngle, setDetailAngle] = useState(null);
  const matchingAds = selectedAngle ? ads.filter((ad) => selectedAngle.adIds?.includes(ad.adId)).sort((x, y) => (y.spend || 0) - (x.spend || 0)) : [];
  const avgCpa = (() => {
    const spend = ads.reduce((sum, ad) => sum + (ad.spend || 0), 0);
    const purchases = ads.reduce((sum, ad) => sum + (ad.purchases || 0), 0);
    return purchases > 0 ? spend / purchases : null;
  })();
  const order = ["proven", "in_research", "untapped", "uncategorized"];
  const entries = Object.entries(groups).sort(([first], [second]) => {
    const firstIndex = order.indexOf(first);
    const secondIndex = order.indexOf(second);
    return (firstIndex === -1 ? 99 : firstIndex) - (secondIndex === -1 ? 99 : secondIndex);
  });

  return (
    <InsightSection title="Ad angles">
      <div className="cs-intel-angle-groups">
        {entries.map(([status, items]) => {
          const pills = <div className="cs-intel-angle-group__pills">
            {items.map((angle, index) => (
              status === "proven" ? <button key={index} type="button" onClick={() => setSelectedAngle(angle)} className="cs-intel-angle-pill is-proven" aria-label={`View ads for ${angle.name}`}>
                <span className="min-w-0">{angle.name}</span>
                {angle.ad_count ? <span className="cs-intel-angle-pill__count">{angle.ad_count} ad{angle.ad_count === 1 ? "" : "s"}</span> : null}
                <span className="cs-intel-angle-pill__open"><ChevronRight className="h-3 w-3" /></span>
              </button> : angle.evidence ? <button key={index} type="button" onClick={() => setDetailAngle(angle)} className="cs-intel-angle-pill is-openable" aria-label={`Why ${angle.name} is ${humanize(status)}`}>
                {angle.name}<ChevronRight className="h-3 w-3 shrink-0" />
              </button> : <span key={index} className="cs-intel-angle-pill">{angle.name}</span>
            ))}
          </div>;
          // Untapped is usually the longest list: it takes the height of the
          // tallest other card and scrolls instead of stretching the row.
          const scrolls = status === "untapped";
          return <section key={status} className={`cs-intel-angle-group ${scrolls ? "is-scrolling" : ""}`}>
            <div className="cs-intel-angle-group__header">
              <h3>{humanize(status)}</h3>
              <span>{items.length}</span>
            </div>
            {ANGLE_STATUS_HELP[status] && <p className="mb-2 text-xs leading-relaxed text-neutral-500">{ANGLE_STATUS_HELP[status]}</p>}
            {scrolls
              // Radix sets an inline position: relative on the scroll root, so the
              // absolute positioning lives on a wrapper div.
              ? <div className="cs-intel-angle-group__scroll"><div className="cs-intel-angle-group__scroll-fill"><CsScrollArea className="h-full" viewportClassName="h-full"><div className="pr-3">{pills}</div></CsScrollArea></div></div>
              : pills}
          </section>;
        })}
      </div>
      <Dialog open={Boolean(selectedAngle)} onOpenChange={(open) => { if (!open) setSelectedAngle(null); }}>
        <DialogContent disableSlide className="max-w-5xl rounded-[28px] sm:rounded-[28px] bg-[#fffaf5]" overlayClassName="bg-black/40">
          <DialogHeader><DialogTitle>{selectedAngle?.name}</DialogTitle><DialogDescription>Ads using this proven angle, highest spend first. Open an ad for its full analysis.</DialogDescription></DialogHeader>
          <CsScrollArea viewportClassName="max-h-[70vh]"><div className="cs-angle-ads pr-3">
            {matchingAds.length ? matchingAds.map((ad, index) => {
              const hookLine = ad.firstSpokenSentence || ad.firstOverlayHeadline || ad.headlineText;
              // Spend and CPA, then the hook and why it works, all in one card.
              return <article key={ad.adId} className="cs-angle-ad">
                <PerformerCard ad={ad} rank={index + 1} avgCpa={avgCpa} onOpen={(item) => onOpenAd(item)} openDetails compact>
                  {(ad.whyItWorks || hookLine) && <div className="cs-angle-ad__why">
                    {hookLine && <p className="mb-1.5 text-stone-700">“{hookLine}”</p>}
                    {ad.whyItWorks && <><strong>Why it works</strong>{ad.whyItWorks}</>}
                  </div>}
                </PerformerCard>
              </article>;
            }) : <p className="text-sm text-stone-500">No saved ads available for this angle. Run Analysis to refresh.</p>}
          </div></CsScrollArea>
        </DialogContent>
      </Dialog>
      <AngleDetailDialog angle={detailAngle} onClose={() => setDetailAngle(null)} />
    </InsightSection>
  );
}
AngleGroups.propTypes = { groups: PropTypes.object.isRequired, ads: PropTypes.array.isRequired, onOpenAd: PropTypes.func.isRequired };

/**
 * Why an angle is In research / Untapped, from saved research and the ad
 * analysis (insights /angles `evidence`), plus ideas for using it.
 * "Turn into a concept" is a placeholder until it's wired to Weekly Strategy.
 */
function AngleDetailDialog({ angle, onClose }) {
  const [conceptNote, setConceptNote] = useState(false);
  const evidence = angle?.evidence || { research: [], gaps: [], ideas: [] };
  const empty = !evidence.research.length && !evidence.gaps.length && !evidence.ideas.length;
  return (
    <Dialog open={Boolean(angle)} onOpenChange={(open) => { if (!open) { setConceptNote(false); onClose(); } }}>
      <DialogContent disableSlide className="max-w-xl rounded-[28px] sm:rounded-[28px] bg-[#fffaf5]" overlayClassName="bg-black/40">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2"><DialogTitle>{angle?.name}</DialogTitle>{angle && <span className="cs-intel-angle-pill">{humanize(angle.status)}</span>}</div>
          <DialogDescription>{angle && ANGLE_STATUS_HELP[angle.status]?.split(". ")[0]}.</DialogDescription>
        </DialogHeader>
        <CsScrollArea viewportClassName="max-h-[62vh]"><div className="cs-angle-detail pr-3">
          {evidence.research.length > 0 && <section>
            <h3 className="cs-intel-subsection-title">Why research suggests it</h3>
            {evidence.research.map((item) => <div key={item.persona} className="cs-angle-detail__card">
              <p className="cs-angle-detail__persona">{item.persona}</p>
              {item.persona_description && <p className="text-xs text-neutral-500">{item.persona_description}</p>}
              {item.what_it_looks_like && <><p className="cs-intel-field-label mt-2">What it looks like for them</p><p className="text-[13px] leading-relaxed text-neutral-700">{item.what_it_looks_like}</p></>}
              {item.angles_in_use?.length > 0 && <p className="mt-2 text-xs text-neutral-500"><strong className="text-neutral-600">Their ads lead with instead:</strong> {item.angles_in_use.join(", ")}</p>}
            </div>)}
          </section>}
          {evidence.gaps.length > 0 && <section>
            <h3 className="cs-intel-subsection-title">Gap found in your ads</h3>
            {evidence.gaps.map((item, index) => <div key={`${item.persona}-${index}`} className="cs-angle-detail__card">
              <p className="cs-angle-detail__persona">{item.persona}{item.ad_count ? <span className="ml-2 text-xs font-normal text-neutral-500">{item.ad_count} ads reach this persona</span> : null}</p>
              <p className="text-[13px] leading-relaxed text-neutral-700">{item.reason || "The analysis lists this as an angle this persona responds to that none of their current ads use."}</p>
              {item.angles_in_use?.length > 0 && <p className="mt-2 text-xs text-neutral-500"><strong className="text-neutral-600">Angles their ads use today:</strong> {item.angles_in_use.join(", ")}</p>}
            </div>)}
          </section>}
          {evidence.ideas.length > 0 && <section>
            <h3 className="cs-intel-subsection-title">How to test it</h3>
            {evidence.ideas.map((idea) => <div key={idea.concept_name} className="cs-angle-detail__card">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="cs-angle-detail__persona mr-1">{idea.concept_name}</p>
                {idea.test_first && <span className="cs-intel-attribute-pill is-priority">Test first</span>}
                {idea.format && <span className="cs-intel-attribute-pill is-tone-1">{idea.format}</span>}
                {idea.awareness_stage && <span className="cs-intel-attribute-pill is-tone-2">{humanize(idea.awareness_stage)}</span>}
                {idea.persona && <span className="cs-intel-attribute-pill is-tone-0">{idea.persona}</span>}
              </div>
              {idea.hook && <p className="mt-2 text-[13px] italic text-neutral-800">“{idea.hook}”</p>}
              {idea.why_this_now && <p className="mt-2 text-xs text-neutral-600"><strong>Why now:</strong> {idea.why_this_now}</p>}
              {idea.hypothesis && <p className="mt-1 text-xs text-neutral-600"><strong>Hypothesis:</strong> {idea.hypothesis}</p>}
              {idea.proof && <p className="mt-1 text-xs text-neutral-600"><strong>Proof to use:</strong> {idea.proof}</p>}
              {idea.success_read && <p className="mt-1 text-xs text-neutral-600"><strong>Call it a winner if:</strong> {idea.success_read}</p>}
            </div>)}
          </section>}
          {empty && <p className="text-sm text-stone-500">No saved research or analysis notes mention this angle by name. Run Analysis to refresh.</p>}
        </div></CsScrollArea>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setConceptNote(true)} className="cs-weekly-brief-button w-full">Turn into a concept</button>
          {conceptNote && <span className="text-center text-xs text-neutral-500">Not wired up yet — this will add a card to Weekly Strategy.</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
AngleDetailDialog.propTypes = { angle: PropTypes.object, onClose: PropTypes.func.isRequired };

function isActiveJob(job) {
  return Boolean(job && (job.status == null || job.status === "queued" || job.status === "running"));
}

IntelligenceView.propTypes = { ctx: PropTypes.object.isRequired };

/**
 * Per-product "ad name contains" scope for accounts that run several products
 * (as in the source app). Insights, the audit, trending, Monthly Review and
 * brand examples then cover only this product's ads. Takes effect on the next
 * Run Analysis.
 */
function AdNameScopeControl({ current, busy, onSave }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const trimmed = draft.trim();
  const save = async (value) => {
    setSaving(true); setError(null);
    try { await onSave(value); setOpen(false); } catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { setDraft(current ?? ""); setError(null); } }}>
        <PopoverTrigger asChild>
          <button type="button" disabled={busy} className="cs-monthly-filter-button">
            <Filter className="h-3.5 w-3.5" />
            {current ? <>Ads named &ldquo;<strong>{current}</strong>&rdquo;</> : "All ads in account"}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-3 bg-white">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-neutral-800">This product&apos;s ads</p>
            <p className="text-xs leading-relaxed text-neutral-500">
              If this ad account runs more than one product, enter text every ad for this product has in its name. Insights, the audit, trending, Monthly Review and brand examples will then only use those ads. Run Analysis afterwards to rebuild.
            </p>
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (trimmed && trimmed !== current) save(trimmed); }}>
            <input autoFocus value={draft} maxLength={100} placeholder="e.g. FC2" onChange={(e) => setDraft(e.target.value)} className="cs-generate-control h-9 min-w-0 flex-1 px-3 text-sm" />
            <button type="submit" disabled={!trimmed || trimmed === current || saving} className="cs-primary-button !h-9 !px-4">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </button>
          </form>
          {current && (
            <button type="button" disabled={saving} onClick={() => save(null)} className="flex w-full items-center justify-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900">
              <X className="h-3.5 w-3.5" />Use all ads in the account
            </button>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </PopoverContent>
      </Popover>
      {current && <span className="text-[11px] text-neutral-500">Run Analysis to rebuild with this scope.</span>}
    </div>
  );
}
AdNameScopeControl.propTypes = { current: PropTypes.string, busy: PropTypes.bool, onSave: PropTypes.func.isRequired };
