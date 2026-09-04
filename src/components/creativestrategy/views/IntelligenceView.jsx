// Intelligence (= the source app's "Insights" tab). The detailed sections use
// creative_strategy_audit aggregates plus per-ad ad_creative_insights evidence.
import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, Plus, RefreshCw, Zap } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { humanize } from "../JsonView";
import { EmptyState, ErrorBanner, PartialResultsNotice, ProgressiveSection } from "../ui";
import { useJobRunner, JobBadge } from "../JobsContext";

// audit keys rendered in named sections below → excluded from the generic dump.
const NAMED_AUDIT_KEYS = new Set([
  "messaging_themes", "persona_ad_mapping", "visual_openers", "visual_hook_trends", "messaging_trends",
  "patterns", "top_hooks", "top_ad_grades", "angles_not_yet_tested", "untapped_angles",
  "untapped_angles_by_persona", "prioritized_gaps", "concept_seed_list", "concept_seeds",
  "first_test_recommendations", "creative_strategy_summary",
]);

const money = (n) => `$${Math.round(n || 0).toLocaleString()}`;
const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);
const str = (v) => (typeof v === "string" ? v : v?.theme || v?.name || v?.title || v?.trend || v?.pattern_name || v?.angle || v?.opening_description || v?.description || JSON.stringify(v));

export default function IntelligenceView({ ctx }) {
  const {
    selectedProduct, selectedProductId, renderHeaderActions,
  } = ctx;
  const [ads, setAds] = useState([]);
  const [audit, setAudit] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [angles, setAngles] = useState([]);
  const [learnings, setLearnings] = useState([]);
  const [trending, setTrending] = useState(null);

  const loadLearnings = useCallback(async () => {
    if (!ctx.selectedBrandId) { setLearnings([]); return; }
    try { const r = await creativeApi.getLearnings(ctx.selectedBrandId); setLearnings(r.items); } catch { /* non-fatal */ }
  }, [ctx.selectedBrandId]);

  const load = useCallback(async (pid, { silent = false } = {}) => {
    if (!silent) { setLoading(true); setErr(null); }
    try {
      const [r, ang] = await Promise.all([creativeApi.getInsights(pid), creativeApi.getAngles(pid).catch(() => ({ angles: [] }))]);
      setAds(r.ads || []); setAudit(r.audit || null); setAngles(ang.angles || []); setTrending(r.trending || null);
    } catch (e) { if (!silent) setErr(e.message); } finally { if (!silent) setLoading(false); }
    if (!silent) loadLearnings();
  }, [loadLearnings]);

  useEffect(() => {
    if (selectedProductId) load(selectedProductId); else { setAds([]); setAudit(null); }
  }, [load, selectedProductId]);

  // Tracked jobs (persist across tab switches + reload on completion).
  const { job: analyzeJob, start: startAnalyze } = useJobRunner({ kind: "analyze_ads", productId: selectedProductId, onComplete: () => load(selectedProductId) });
  const { job: trendJob, start: startTrend } = useJobRunner({ kind: "trending_creative", productId: selectedProductId, onComplete: () => load(selectedProductId) });
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
    try { const { jobId } = await creativeApi.runInsights(selectedProductId); startAnalyze(jobId); }
    catch (e) { setErr(e.message); }
  };
  const a = audit || {};
  // ── Executive KPIs (computed from ads) ──
  const totalSpend = ads.reduce((s, x) => s + (x.spend || 0), 0);
  const kpis = [
    ["Ads analyzed", ads.length],
    ["Total spend", money(totalSpend)],
    ["Avg CPA", (() => { const v = mean(ads.map((x) => x.costPerPurchase).filter((x) => x > 0)); return v ? money(v) : "—"; })()],
    ["Avg ROAS", (() => { const v = mean(ads.map((x) => x.roas).filter((x) => x > 0)); return v ? `${v.toFixed(2)}x` : "—"; })()],
    ["Avg hook rate", (() => { const v = mean(ads.map((x) => x.hookRate).filter((x) => x > 0)); return v ? `${(v * 100).toFixed(0)}%` : "—"; })()],
    ["A/B winners", ads.filter((x) => x.grade === "A" || x.grade === "B").length],
  ];

  const runTrending = async () => {
    setErr(null);
    try { const { jobId } = await creativeApi.runTrending(selectedProductId); startTrend(jobId); }
    catch (e) { setErr(e.message); }
  };
  const trendingAds = trending?.trending_ads || [];

  const winners = [...ads].sort((x, y) => (y.spend || 0) - (x.spend || 0)).slice(0, 3);
  const topHooks = deriveHooksFromAds(ads, a.top_hooks);
  const recentCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recent = [...ads].filter((x) => x.createdTime && new Date(x.createdTime).getTime() >= recentCutoff)
    .sort((x, y) => new Date(y.createdTime) - new Date(x.createdTime));
  const fatigued = ads.filter((x) => (x.frequency || 0) >= 3 && (x.spend || 0) > 100).sort((x, y) => (y.frequency || 0) - (x.frequency || 0)).slice(0, 5);
  const failedDownloads = ads.filter((x) => !x.storagePath);
  const patterns = Array.isArray(a.patterns) ? [...a.patterns].sort((x, y) =>
    ((y.spend_pct || 0) * 0.6 + (y.ad_count || 0) * 4) - ((x.spend_pct || 0) * 0.6 + (x.ad_count || 0) * 4)) : [];

  const otherAuditEntries = Object.entries(a).filter(([k, v]) => v != null && !NAMED_AUDIT_KEYS.has(k));
  const analyzePhase = analyzeJob?.progress?.phase;
  const adWorkActive = analyzeActive && !String(analyzePhase || "").startsWith("audit");
  const auditWorkActive = analyzeActive && String(analyzePhase || "").startsWith("audit");
  const messagingTrendItems = normalizeTrends(a.messaging_trends);
  const conceptSeeds = a.concept_seed_list || a.concept_seeds || [];
  const hasUntapped = (Array.isArray(a.untapped_angles_by_persona) && a.untapped_angles_by_persona.length > 0)
    || (Array.isArray(a.angles_not_yet_tested || a.untapped_angles || a.prioritized_gaps) && (a.angles_not_yet_tested || a.untapped_angles || a.prioritized_gaps).length > 0);
  const insightReadyCount = [
    ads.length > 0, patterns.length > 0, topHooks.length > 0, Array.isArray(a.messaging_themes) && a.messaging_themes.length > 0,
    Array.isArray(a.persona_ad_mapping) && a.persona_ad_mapping.length > 0, Array.isArray(a.visual_openers) && a.visual_openers.length > 0,
    messagingTrendItems.length > 0, Array.isArray(conceptSeeds) && conceptSeeds.length > 0,
  ].filter(Boolean).length;
  const angleGroups = angles.reduce((groups, angle) => {
    const key = angle.status || "uncategorized";
    if (!groups[key]) groups[key] = [];
    groups[key].push(angle);
    return groups;
  }, {});

  return (
    <div className="space-y-5">
      {renderHeaderActions(
        <div className="flex items-center gap-3">
        <JobBadge job={analyzeJob} />
        <button type="button" onClick={run} disabled={!selectedProductId || analyzeActive} className="cs-primary-button">
          {analyzeActive && <Loader2 className="h-4 w-4 animate-spin" />}
          {analyzeActive ? "Running Analysis…" : "Run Analysis"}
        </button>
        </div>
      )}
      {selectedProduct && <p className="text-xs font-normal text-neutral-400">{selectedProduct.name}</p>}
      <ErrorBanner message={err} />
      <PartialResultsNotice active={analyzeActive} completed={insightReadyCount} total={8} label="insight sections" />

      {!selectedProductId ? (
        <EmptyState icon={Zap} title="No product selected" hint="Select a product above to run and view ad analysis." />
      ) : (
        <div className="space-y-5">
      {ads.length > 0 ? (
          <div className="cs-intel-kpis">
            {kpis.map(([label, val]) => <div key={label} className="cs-intel-kpi"><span>{label}</span><strong>{val}</strong></div>)}
          </div>
        ) : <ProgressiveSection title="Performance overview" description="Meta spend, efficiency, hook rate, and winners." active={adWorkActive || loading} cards={4} />}

      <FailedDownloadsBanner ads={failedDownloads} total={ads.length} />
      {patterns.length > 0 ? <StrategicPatterns patterns={patterns} /> : <ProgressiveSection title="Strategic patterns by spend" active={auditWorkActive} />}
      {topHooks.length > 0 ? <TopHooksSection hooks={topHooks} /> : <ProgressiveSection title="Top hooks" active={adWorkActive} cards={2} />}
      {Array.isArray(a.messaging_themes) && a.messaging_themes.length > 0
        ? <MessagingThemesSection themes={a.messaging_themes} ads={ads} />
        : <ProgressiveSection title="Messaging themes" active={auditWorkActive} cards={2} />}
      {ads.length > 0 ? <FunnelBalanceSection ads={ads} /> : <ProgressiveSection title="Funnel balance" active={adWorkActive} />}
      {winners.length > 0 ? <TopPerformers ads={winners} /> : <ProgressiveSection title="Top performers" active={adWorkActive} cards={3} />}
      {Array.isArray(a.persona_ad_mapping) && a.persona_ad_mapping.length > 0
        ? <PersonaPerformanceSection mappings={a.persona_ad_mapping} ads={ads} />
        : <ProgressiveSection title="Customer persona performance" active={auditWorkActive} cards={2} />}

      <Block title="Trending creative · rising spend / new, last 7d" noDivider
        actions={
          <div className="flex items-center gap-2">
            <JobBadge job={trendJob} />
            <button type="button" onClick={runTrending} className="cs-intel-small-button"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
          </div>
        }>
        {trendingAds.length > 0 ? (
          <div className="cs-intel-creative-grid">
            {trendingAds.slice(0, 8).map((t) => (
              <div key={t.adId} className="cs-intel-creative-card">
                <CreativeThumbnail src={t.thumbnailUrl} variant="card" />
                <div className="cs-intel-creative-card__body">
                  <div className="truncate" title={t.adName}>{t.adName}</div>
                  <p>{money(t.currentSpend)}{t.spendDelta != null ? ` · +${Math.round(t.spendDelta * 100)}% WoW` : " · new"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-neutral-400">No trending creatives{trending ? "" : " yet — click Refresh (needs Meta)"}.</p>}
      </Block>

      {recent.length > 0 ? <RecentLaunches ads={recent} /> : <ProgressiveSection title="Recent launches" active={adWorkActive} cards={2} />}
      {Array.isArray(a.visual_openers) && a.visual_openers.length > 0
        ? <VisualOpenersSection openers={a.visual_openers} ads={ads} />
        : <ProgressiveSection title="Visual openers" active={auditWorkActive} cards={2} />}
      {messagingTrendItems.length > 0
        ? <MessagingTrendsSection trends={a.messaging_trends} ads={ads} />
        : <ProgressiveSection title="Messaging trends" active={auditWorkActive} />}
      {Array.isArray(conceptSeeds) && conceptSeeds.length > 0
        ? <WhatToTestNext audit={a} />
        : <ProgressiveSection title="What to test next" active={auditWorkActive} cards={2} />}
      {hasUntapped ? <UntappedAnglesSection audit={a} /> : <ProgressiveSection title="Untapped angles and gaps" active={auditWorkActive} />}

      {angles.length > 0 && <AngleGroups groups={angleGroups} />}

      <LearningTruths clientId={ctx.selectedBrandId} items={learnings} onChange={loadLearnings} setErr={setErr} />

      {fatigued.length > 0 && (
        <Block title="Fatigue alerts (frequency ≥ 3)">
          {fatigued.map((f) => <div key={f.adId} className="text-sm text-neutral-700">{f.adName || "(unnamed)"} <span className="text-xs text-amber-600">· freq {Number(f.frequency).toFixed(1)} · {money(f.spend)}</span></div>)}
        </Block>
      )}

      {otherAuditEntries.length > 0 && (
        <section>
          <div className="cs-intel-section-title"><h2>Full Creative Strategy Audit</h2><span>{otherAuditEntries.length}</span></div>
          <div className="cs-research-intel-list">
            {otherAuditEntries.map(([key, value]) => <AuditAccordion key={key} title={humanize(key)} data={value} />)}
          </div>
        </section>
      )}

        </div>
      )}
    </div>
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

function StrategicPatterns({ patterns }) {
  if (!patterns.length) return null;
  return <InsightSection title="Strategic patterns by spend">
    <div className="cs-intel-patterns">{patterns.map((pattern, index) => {
      const pct = Number(pattern.spend_pct || 0);
      return <div key={index} className="cs-intel-pattern">
        <div className="flex gap-3 text-sm"><span className="cs-intel-list-index">{index + 1}</span><div className="min-w-0 flex-1">
          <p className="text-neutral-700"><strong>{pattern.pattern_name ? `${pattern.pattern_name}: ` : ""}</strong>{pattern.pattern || pattern.insight || ""}</p>
          <MetricPills className="mt-2" items={[
            `${pct.toFixed(0)}% of spend`,
            `${pattern.ad_count || 0} ads`,
            pattern.learning_sheet_level && humanize(pattern.learning_sheet_level),
          ]} />
        </div></div>
        <div className="cs-intel-spend-bar"><div style={{ width: `${Math.max(Math.min(pct, 100), 2)}%` }} /></div>
      </div>;
    })}</div>
  </InsightSection>;
}
StrategicPatterns.propTypes = { patterns: PropTypes.array.isRequired };

function TopHooksSection({ hooks }) {
  const [expanded, setExpanded] = useState(null);
  if (!hooks.length) return null;
  return <InsightSection title="Top hooks" tone="dark">
    <div className="cs-intel-accordion-list max-h-[720px] overflow-y-auto pr-1">{hooks.map((hook, index) => {
      const open = expanded === index;
      const formula = hook.hookFormula || {};
      const primaryCopy = hook.adsManagerCopy || {};
      const transcriptSections = parseTranscriptSections(hook.transcript);
      return <div key={`${hook.adId}-${index}`} className="cs-intel-accordion-card">
        <button type="button" onClick={() => setExpanded(open ? null : index)} className="cs-intel-hook-trigger">
          <span className="cs-intel-list-index">{index + 1}</span>
          <p className="cs-intel-hook-title">“{hook.hookText}”</p>
          <MediaTag mediaType={hook.mediaType} />
          <MetricPills compact items={[`${money(hook.spend)} spend`, hook.costPerPurchase ? `${money(hook.costPerPurchase)} CPA` : null]} />
          {open ? <ChevronDown className="h-3.5 w-3.5 text-neutral-400" /> : <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />}
        </button>
        {open && <div className="cs-intel-hook-details">
          <section className="cs-intel-detail-section is-first">
            <p className="cs-intel-field-label">Ad name</p>
            <strong className="cs-intel-ad-name">{hook.adName || "Unnamed"}</strong>
            <div className="cs-intel-stat-line">
              {[
                hook.purchases > 0 && `${hook.purchases} purchases`,
                hook.ctr != null && `${Number(hook.ctr).toFixed(2)}% CTR`,
                hook.cpm != null && `${money(hook.cpm)} CPM`,
                hook.hookRate > 0 && `${(hook.hookRate * 100).toFixed(1)}% hook rate`,
                hook.avgWatchTime > 0 && `${Number(hook.avgWatchTime).toFixed(1)}s avg watch`,
                hook.frequency > 0 && `${Number(hook.frequency).toFixed(1)}x frequency`,
                hook.funnelPosition && humanize(hook.funnelPosition),
              ].filter(Boolean).map((stat) => <span key={stat}>{stat}</span>)}
            </div>
          </section>
          {(formula.pattern_interrupt || formula.qualifier || formula.gap) && <section className="cs-intel-detail-section">
            <h3 className="cs-intel-subsection-title">Hook formula</h3>
            <div className="cs-intel-formula-grid">{[["Pattern interrupt", formula.pattern_interrupt], ["Qualifier", formula.qualifier], ["Gap", formula.gap]].filter(([, value]) => value).map(([label, value]) =>
              <div key={label} className="cs-intel-formula-card"><small>{label}</small><p>{value}</p></div>)}</div>
          </section>}
          <section className="cs-intel-detail-section">
            <div className="cs-intel-tag-row">{[
              hook.primaryAngle && `Angle: ${hook.primaryAngle}`, hook.hookStyle && `Style: ${hook.hookStyle}`,
              hook.emotionalTrigger && `Emotion: ${hook.emotionalTrigger}`, hook.awarenessStage && `Awareness: ${hook.awarenessStage}`,
              hook.benefitType && `Benefit: ${hook.benefitType}`, hook.conceptClassification && `Bucket: ${hook.conceptClassification}`,
            ].filter(Boolean).map((tag, tagIndex) => <span key={tag} className={`cs-intel-attribute-pill is-tone-${tagIndex % 4}`}>{tag}</span>)}</div>
            {hook.buildingBlocks?.length > 0 && <DetailList label="Building blocks" items={hook.buildingBlocks} />}
            {hook.lifeForce8?.length > 0 && <DetailList label="Core desires" items={hook.lifeForce8} />}
          </section>
          {(primaryCopy.primary_text || primaryCopy.headline || hook.headlineText || primaryCopy.cta || hook.ctaType) && <section className="cs-intel-detail-section">
            <h3 className="cs-intel-subsection-title">Ad copy</h3>
            <div className="cs-intel-copy-grid">
              {primaryCopy.primary_text && <LabeledCopy label="Primary text">{primaryCopy.primary_text}</LabeledCopy>}
              {(primaryCopy.headline || hook.headlineText) && <LabeledCopy label="Headline">{primaryCopy.headline || hook.headlineText}</LabeledCopy>}
              {(primaryCopy.cta || hook.ctaType) && <LabeledCopy label="Call to action">{primaryCopy.cta || hook.ctaType}</LabeledCopy>}
            </div>
          </section>}
          {hook.transcript && hook.mediaType === "video" && <section className="cs-intel-detail-section">
            <h3 className="cs-intel-subsection-title">Transcript</h3>
            {transcriptSections.length > 1 ? <div className="cs-intel-transcript-grid">{transcriptSections.map((section) => <LabeledCopy key={section.label} label={section.label}>{section.value}</LabeledCopy>)}</div>
              : <p className="cs-intel-transcript">{hook.transcript}</p>}
          </section>}
          {(hook.whyItWorks || hook.gradeRationale) && <section className="cs-intel-detail-section cs-intel-copy-grid">
            {hook.whyItWorks && <LabeledCopy label="Why it works">{hook.whyItWorks}</LabeledCopy>}
            {hook.gradeRationale && <LabeledCopy label="Performance read">{hook.gradeRationale}</LabeledCopy>}
          </section>}
        </div>}
      </div>;
    })}</div>
  </InsightSection>;
}
TopHooksSection.propTypes = { hooks: PropTypes.array.isRequired };

function MessagingThemesSection({ themes, ads }) {
  const [expanded, setExpanded] = useState(null);
  if (!Array.isArray(themes) || !themes.length) return null;
  const byName = new Map(ads.map((ad) => [ad.adName, ad]));
  const enriched = themes.map((theme) => {
    const matchedAds = (theme.ad_names || []).map((name) => byName.get(name)).filter(Boolean);
    const spend = matchedAds.reduce((sum, ad) => sum + (ad.spend || 0), 0);
    const purchases = matchedAds.reduce((sum, ad) => sum + (ad.purchases || 0), 0);
    const repAd = byName.get(theme.representative_ad_name) || [...matchedAds].sort((x, y) => (y.spend || 0) - (x.spend || 0))[0];
    return { ...theme, matchedAds, spend, purchases, cpa: purchases > 0 ? spend / purchases : null, repAd };
  }).sort((x, y) => y.spend - x.spend);
  return <InsightSection title="Messaging themes" tone="orange">
    <div className="space-y-2">{enriched.map((theme, index) => {
      const open = expanded === index;
      return <div key={`${theme.theme}-${index}`} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <button type="button" onClick={() => setExpanded(open ? null : index)} className="flex w-full items-start gap-3 p-3 text-left">
          <CreativeThumbnail src={theme.repAd?.imageUrl || theme.repAd?.thumbnailUrl} />
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-neutral-800">{theme.theme}</strong>{theme.proven && <Badge variant="secondary" className="text-[9px] text-emerald-700">Proven</Badge>}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">{theme.description}</p>
            <MetricPills className="mt-2" items={[`${money(theme.spend)} spend`, `${theme.matchedAds.length} ads`, theme.cpa ? `${money(theme.cpa)} CPA` : null, theme.awareness_level && humanize(theme.awareness_level)]} />
          </div>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {open && <div className="grid gap-2 border-t border-neutral-100 p-3 sm:grid-cols-2">{theme.matchedAds.map((ad) => <AdEvidenceCard key={ad.adId} ad={ad} />)}</div>}
      </div>;
    })}</div>
  </InsightSection>;
}
MessagingThemesSection.propTypes = { themes: PropTypes.any, ads: PropTypes.array.isRequired };

function FunnelBalanceSection({ ads }) {
  const stages = ["TOF", "MOF", "BOF"];
  const buckets = Object.fromEntries(stages.map((stage) => [stage, { spend: 0, count: 0, purchases: 0 }]));
  ads.forEach((ad) => {
    const stage = String(ad.funnelPosition || "").toUpperCase();
    if (!buckets[stage]) return;
    buckets[stage].spend += ad.spend || 0; buckets[stage].count += 1; buckets[stage].purchases += ad.purchases || 0;
  });
  const total = stages.reduce((sum, stage) => sum + buckets[stage].spend, 0);
  if (!total) return null;
  const activeStages = stages.filter((stage) => buckets[stage].spend > 0);
  const colors = { TOF: "is-tof", MOF: "is-mof", BOF: "is-bof" };
  return <InsightSection title="Funnel balance">
    <p className="mb-3 text-xs text-neutral-400">Share of current spend across prospecting, consideration, and conversion ads.</p>
    <div className="cs-intel-funnel-bar">{activeStages.map((stage) => <div key={stage} className={colors[stage]} style={{ width: `${(buckets[stage].spend / total) * 100}%` }} />)}</div>
    <div className="cs-intel-funnel-breakdown">{activeStages.map((stage) => {
      const bucket = buckets[stage]; const cpa = bucket.purchases > 0 ? bucket.spend / bucket.purchases : null;
      return <div key={stage} className={`cs-intel-funnel-segment ${colors[stage]}`} style={{ width: `${(bucket.spend / total) * 100}%` }}><div><strong>{Math.round((bucket.spend / total) * 100)}%</strong><p>{stage}</p><small>{bucket.count} ads{cpa ? ` / ${money(cpa)} CPA` : ""}</small></div></div>;
    })}</div>
  </InsightSection>;
}
FunnelBalanceSection.propTypes = { ads: PropTypes.array.isRequired };

function TopPerformers({ ads }) {
  if (!ads.length) return null;
  return <Block title="Top performers by spend"><TooltipProvider delayDuration={150}><div className="cs-intel-performer-grid">{ads.map((ad) =>
    <article key={ad.adId} className="cs-intel-performer-card">
      <CreativeThumbnail src={ad.imageUrl || ad.thumbnailUrl} variant="performer" />
      <div className="cs-intel-performer-card__body">
        <Tooltip><TooltipTrigger asChild><strong className="cs-intel-performer-name" tabIndex={0}>{ad.adName || "Unnamed"}</strong></TooltipTrigger><TooltipContent side="top" className="max-w-[320px] break-words text-xs">{ad.adName || "Unnamed"}</TooltipContent></Tooltip>
        <p className="cs-intel-performer-hook">{ad.firstSpokenSentence || ad.firstOverlayHeadline || ad.headlineText || "No hook captured"}</p>
        <MetricPills className="is-performer-metrics" items={[`${money(ad.spend)} spend`, ad.costPerPurchase ? `${money(ad.costPerPurchase)} CPA` : null, ad.purchases > 0 ? `${ad.purchases} purchases` : null]} />
      </div>
    </article>)}</div></TooltipProvider></Block>;
}
TopPerformers.propTypes = { ads: PropTypes.array.isRequired };

function PersonaPerformanceSection({ mappings, ads }) {
  const [expanded, setExpanded] = useState(null);
  if (!Array.isArray(mappings) || !mappings.length) return null;
  const byName = new Map(ads.map((ad) => [ad.adName, ad]));
  const enriched = mappings.map((mapping) => {
    const matchedAds = (mapping.ad_names || []).map((name) => byName.get(name)).filter(Boolean);
    const spend = matchedAds.reduce((sum, ad) => sum + (ad.spend || 0), 0);
    const purchases = matchedAds.reduce((sum, ad) => sum + (ad.purchases || 0), 0);
    return { ...mapping, matchedAds, spend, cpa: purchases > 0 ? spend / purchases : null };
  }).sort((x, y) => y.spend - x.spend);
  const total = enriched.reduce((sum, item) => sum + item.spend, 0);
  return <InsightSection title="Customer personas" tone="dark"><div className="space-y-2">{enriched.map((persona, index) => {
    const open = expanded === index; const share = total > 0 ? (persona.spend / total) * 100 : 0;
    const title = persona.persona_short_title || persona.matched_research_persona || persona.persona || `Persona ${index + 1}`;
    return <div key={`${title}-${index}`} className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><button type="button" onClick={() => setExpanded(open ? null : index)} className="flex w-full gap-3 p-3 text-left">
      <div className="min-w-0 flex-1"><strong className="text-[15px] text-neutral-800">{title}</strong>{persona.persona && persona.persona !== title && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-neutral-600">{persona.persona}</p>}
        <MetricPills className="mt-2" items={[`${persona.matchedAds.length} ads`, `${money(persona.spend)} spend`, `${Math.round(share)}% share`, persona.cpa ? `${money(persona.cpa)} CPA` : null]} /><div className="cs-intel-spend-bar mt-3"><div style={{ width: `${Math.max(share, 2)}%` }} /></div>
      </div>{open ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}</button>
      {open && <div className="cs-intel-expanded-stack">
        {persona.top_angles_used?.length > 0 && <section><h3 className="cs-intel-subsection-title">Angles currently in use</h3><div className="cs-intel-tag-row mt-2">{persona.top_angles_used.map((angle, angleIndex) => <span key={angle} className={`cs-intel-attribute-pill is-tone-${angleIndex % 4}`}>{angle}</span>)}</div></section>}
        {(persona.angles_not_yet_tested?.length > 0 || persona.top_unmet_angle) && <section><h3 className="cs-intel-subsection-title">Still untested</h3><p className="mt-1 text-[13px] text-neutral-600">{(persona.angles_not_yet_tested || [persona.top_unmet_angle]).join(", ")}</p></section>}
        <section><h3 className="cs-intel-subsection-title">Supporting ads</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{persona.matchedAds.map((ad) => <AdEvidenceCard key={ad.adId} ad={ad} />)}</div></section>
      </div>}
    </div>;
  })}</div></InsightSection>;
}
PersonaPerformanceSection.propTypes = { mappings: PropTypes.any, ads: PropTypes.array.isRequired };

function RecentLaunches({ ads }) {
  if (!ads.length) return null;
  return <Block title="Recent launches · last 14 days"><div className="flex gap-3 overflow-x-auto pb-2">{ads.map((ad) => {
    const days = Math.max(0, Math.floor((Date.now() - new Date(ad.createdTime).getTime()) / 86400000));
    const src = ad.imageUrl || ad.thumbnailUrl;
    return <div key={ad.adId} className="w-[170px] shrink-0 overflow-hidden rounded-xl border border-neutral-200"><div className="relative aspect-[9/16] bg-neutral-100">{src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-neutral-400"><Zap className="h-5 w-5" /></div>}<Badge className="absolute left-2 top-2 text-[9px]">{days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days}d ago`}</Badge><Badge variant="outline" className="absolute right-2 top-2 border-white/30 bg-black/50 text-[9px] text-white">{ad.mediaType === "video" ? "Video" : "Static"}</Badge></div><div className="p-2"><strong className="block truncate text-xs">{ad.adName || "Unnamed"}</strong><p className="mt-1 text-[10px] text-neutral-400">{money(ad.spend)} spend{ad.costPerPurchase ? ` · ${money(ad.costPerPurchase)} CPA` : ""}{ad.purchases > 0 ? ` · ${ad.purchases} purchases` : ""}{ad.hookRate > 0 ? ` · ${(ad.hookRate * 100).toFixed(1)}% HR` : ""}</p></div></div>;
  })}</div></Block>;
}
RecentLaunches.propTypes = { ads: PropTypes.array.isRequired };

function VisualOpenersSection({ openers, ads }) {
  if (!Array.isArray(openers) || !openers.length) return null;
  const byName = new Map(ads.map((ad) => [ad.adName, ad]));
  return <InsightSection title="Visual openers"><p className="mb-3 text-[13px] text-neutral-500">Video ads — what appears in the first 2–5 seconds</p><div className="cs-intel-opener-grid">{openers.map((opener, index) => {
    const examples = (opener.example_ad_names || []).map((name) => byName.get(name)).filter(Boolean);
    return <div key={index} className="cs-intel-content-card"><strong className="text-[15px] text-neutral-800">{opener.pattern_name || opener.trend_name}</strong><p className="mt-1 text-[13px] leading-relaxed text-neutral-600">{opener.visual_description || opener.opening_description}</p><MetricPills className="mt-2" items={[`${opener.ad_count || examples.length} ads`, `${Math.round(opener.spend_pct || 0)}% spend`]} /><div className="cs-intel-tag-row mt-2">{[opener.talent_type, opener.camera_style, opener.environment].filter(Boolean).map((tag, tagIndex) => <span key={tag} className={`cs-intel-attribute-pill is-tone-${tagIndex % 4}`}>{tag}</span>)}</div>{examples.length > 0 && <div className="cs-intel-opener-thumbnails">{examples.slice(0, 5).map((ad) => <CreativeThumbnail key={ad.adId} src={ad.imageUrl || ad.thumbnailUrl} variant="opener" />)}</div>}</div>;
  })}</div></InsightSection>;
}
VisualOpenersSection.propTypes = { openers: PropTypes.any, ads: PropTypes.array.isRequired };

function normalizeTrends(trends) {
  if (Array.isArray(trends)) return trends.map((trend) => ({ ...trend, trend: trend.trend || trend.trend_name || "", examples: trend.examples || trend.ad_names || [] }));
  if (!trends || typeof trends !== "object") return [];
  return ["hooks", "claims", "callouts", "ctas"].flatMap((surface) => Array.isArray(trends[surface]) ? trends[surface].map((trend) => ({ ...trend, trend: trend.trend || trend.trend_name || "", examples: trend.examples || trend.verbatim_examples || [] })) : []);
}

function MessagingTrendsSection({ trends, ads }) {
  const normalized = normalizeTrends(trends);
  if (!normalized.length) return null;
  const byName = new Map(ads.map((ad) => [ad.adName, ad]));
  const max = Math.max(...normalized.map((trend) => Number(trend.spend_pct || 0)), 1);
  return <InsightSection title="Messaging trends" tone="orange"><div className="space-y-3">{normalized.map((trend, index) => {
    const examples = (trend.examples || []).map((name) => byName.get(name)).filter(Boolean);
    return <div key={index} className="cs-intel-content-card"><strong className="text-[15px] text-neutral-800">{trend.trend}</strong>{trend.description && <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">{trend.description}</p>}<div className="cs-intel-spend-bar mt-3"><div style={{ width: `${Math.max((Number(trend.spend_pct || 0) / max) * 100, 3)}%` }} /></div><MetricPills className="mt-2" items={[`${trend.ad_count || examples.length} ads`, `${Number(trend.spend_pct || 0).toFixed(1)}% spend`]} />{examples.length > 0 && <div className="cs-intel-opener-thumbnails">{examples.slice(0, 4).map((ad) => <CreativeThumbnail key={ad.adId} src={ad.imageUrl || ad.thumbnailUrl} variant="opener" />)}</div>}</div>;
  })}</div></InsightSection>;
}
MessagingTrendsSection.propTypes = { trends: PropTypes.any, ads: PropTypes.array.isRequired };

function WhatToTestNext({ audit }) {
  const all = audit.concept_seed_list || audit.concept_seeds || [];
  if (!Array.isArray(all) || !all.length) return null;
  const priorityNames = new Set((audit.first_test_recommendations || []).map((item) => item.concept_name));
  const seeds = [...all.filter((seed) => priorityNames.has(seed.concept_name)), ...all.filter((seed) => !priorityNames.has(seed.concept_name))].slice(0, 10);
  return <InsightSection title="What to test next"><div className="space-y-2">{seeds.map((seed, index) => {
    const priority = priorityNames.has(seed.concept_name);
    return <div key={index} className={`cs-intel-test-card ${priority ? "is-priority" : ""}`}><div className="cs-intel-tag-row">{priority && <span className="cs-intel-attribute-pill is-priority">Test first</span>}{(seed.persona_description || seed.persona) && <span className="cs-intel-attribute-pill is-tone-0">{seed.persona_description || seed.persona}</span>}{seed.format && <span className="cs-intel-attribute-pill is-tone-1">{seed.format}</span>}{seed.awareness_stage && <span className="cs-intel-attribute-pill is-tone-2">{humanize(seed.awareness_stage)}</span>}</div><strong className="mt-3 block text-[15px] text-neutral-800">{seed.concept_name || seed.name || `Concept ${index + 1}`}</strong>{seed.hook_verbatim && <p className="mt-1 text-[13px] text-neutral-700">“{seed.hook_verbatim}”</p>}{seed.why_this_now && <div className="mt-3 border-t border-orange-200/70 pt-3"><p className="cs-intel-field-label">Why test this now</p><p className="mt-1 text-[13px] leading-relaxed text-neutral-600">{seed.why_this_now}</p></div>}</div>;
  })}</div></InsightSection>;
}
WhatToTestNext.propTypes = { audit: PropTypes.object.isRequired };

function UntappedAnglesSection({ audit }) {
  const groups = Array.isArray(audit.untapped_angles_by_persona) ? audit.untapped_angles_by_persona : [];
  const flat = audit.angles_not_yet_tested || audit.untapped_angles || audit.prioritized_gaps || [];
  if (!groups.length && !Array.isArray(flat)) return null;
  if (groups.length) return <InsightSection title="Untapped angles · what current ads aren't saying"><div className="space-y-3">{groups.map((group, index) => <div key={index} className="rounded-xl border border-neutral-200 p-3"><p className="text-xs text-neutral-500"><strong className="text-neutral-700">Persona:</strong> {group.persona_description || "Unnamed persona"}</p><div className="mt-2 space-y-2">{(group.untapped_combinations || []).map((item, itemIndex) => <div key={itemIndex} className="border-l-2 border-orange-300 pl-3"><div className="flex flex-wrap gap-2"><strong className="text-sm">{item.angle}</strong>{item.awareness_stage && <Badge variant="outline" className="text-[9px]">{humanize(item.awareness_stage)}</Badge>}</div>{item.rationale && <p className="mt-1 text-xs text-neutral-500">{item.rationale}</p>}{item.suggested_hook_direction && <p className="mt-1 text-xs italic">“{item.suggested_hook_direction}”</p>}</div>)}</div></div>)}</div></InsightSection>;
  if (!flat.length) return null;
  return <InsightSection title="Untapped angles & gaps"><div className="flex flex-wrap gap-2">{flat.map((item, index) => <Pill key={index}>{str(item)}</Pill>)}</div></InsightSection>;
}
UntappedAnglesSection.propTypes = { audit: PropTypes.object.isRequired };

function AdEvidenceCard({ ad }) {
  return <div className="cs-intel-evidence-card"><CreativeThumbnail src={ad.imageUrl || ad.thumbnailUrl} /><div className="min-w-0 flex-1"><strong className="block truncate text-[13px] text-neutral-800">{ad.adName || "Unnamed"}</strong><MetricPills className="mt-1.5" compact items={[`${money(ad.spend)} spend`, ad.costPerPurchase ? `${money(ad.costPerPurchase)} CPA` : null, ad.hookRate > 0 ? `${(ad.hookRate * 100).toFixed(1)}% HR` : null]} /></div><MediaTag mediaType={ad.mediaType} /></div>;
}
AdEvidenceCard.propTypes = { ad: PropTypes.object.isRequired };

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

function InsightSection({ title, children, actions, tone }) {
  return (
    <section className={`cs-intel-insight ${tone ? `is-persona-style is-${tone}` : ""}`}>
      <header>
        <h2>{title}</h2>
        {actions}
      </header>
      <div className="cs-intel-insight__body">{children}</div>
    </section>
  );
}
InsightSection.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node, actions: PropTypes.node, tone: PropTypes.oneOf(["dark", "orange"]) };

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

function MediaTag({ mediaType }) {
  const isVideo = String(mediaType || "").toLowerCase() === "video";
  return <span className={`cs-intel-media-tag ${isVideo ? "is-video" : "is-static"}`}>{isVideo ? "Video" : "Static"}</span>;
}
MediaTag.propTypes = { mediaType: PropTypes.string };

function DetailList({ label, items }) {
  return <div className="cs-intel-detail-list"><h3 className="cs-intel-subsection-title">{label}</h3><div>{items.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div></div>;
}
DetailList.propTypes = { label: PropTypes.string.isRequired, items: PropTypes.array.isRequired };

function LabeledCopy({ label, children }) {
  return <div className="cs-intel-labeled-copy"><p className="cs-intel-field-label">{label}</p><p>{children}</p></div>;
}
LabeledCopy.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node };

const TRANSCRIPT_LABELS = ["Speech quality", "First sentence word count", "Quality", "Full transcript"];

function parseTranscriptSections(transcript) {
  const lines = String(transcript || "").split(/\r?\n/);
  const sections = [];
  let active = null;
  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    const match = line.match(/^(Speech quality|First sentence word count|Quality|Full transcript)\s*:?\s*(.*)$/i);
    if (match) {
      active = { label: TRANSCRIPT_LABELS.find((label) => label.toLowerCase() === match[1].toLowerCase()) || match[1], value: match[2] || "" };
      sections.push(active);
    } else if (active) active.value = active.value ? `${active.value}\n${line}` : line;
  });
  return sections.filter((section) => section.value);
}

function CreativeThumbnail({ src, variant = "compact" }) {
  const className = `cs-intel-thumbnail is-${variant}`;
  return src
    ? <img src={src} alt="" className={className} />
    : <div className={`${className} is-empty`}><Zap className="h-5 w-5" /></div>;
}
CreativeThumbnail.propTypes = { src: PropTypes.string, variant: PropTypes.oneOf(["compact", "card", "opener", "performer"]) };

function AngleGroups({ groups }) {
  const order = ["proven", "in_research", "untapped", "uncategorized"];
  const entries = Object.entries(groups).sort(([first], [second]) => {
    const firstIndex = order.indexOf(first);
    const secondIndex = order.indexOf(second);
    return (firstIndex === -1 ? 99 : firstIndex) - (secondIndex === -1 ? 99 : secondIndex);
  });

  return (
    <InsightSection title="Ad angles">
      <div className="cs-intel-angle-groups">
        {entries.map(([status, items]) => (
          <section key={status} className="cs-intel-angle-group">
            <div className="cs-intel-angle-group__header">
              <h3>{humanize(status)}</h3>
              <span>{items.length}</span>
            </div>
            <div className="cs-intel-angle-group__pills">
              {items.map((angle, index) => (
                <span key={index} className="cs-intel-angle-pill" title={`${status}${angle.ad_count ? ` · ${angle.ad_count} ads · $${Math.round(angle.total_spend || 0)}` : ""}`}>
                  {angle.name}{angle.ad_count ? ` (${angle.ad_count})` : ""}
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>
    </InsightSection>
  );
}
AngleGroups.propTypes = { groups: PropTypes.object.isRequired };

function AuditAccordion({ title, data }) {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);
  const [headerStuck, setHeaderStuck] = useState(false);
  const stickySentinelRef = useRef(null);
  const allEntries = auditDetailEntries(data, true);
  const previewEntries = auditDetailEntries(data, false);
  const hasMore = JSON.stringify(allEntries) !== JSON.stringify(previewEntries);

  const toggle = () => {
    if (open) setFull(false);
    setOpen((current) => !current);
  };

  useEffect(() => {
    if (!open || !stickySentinelRef.current) {
      setHeaderStuck(false);
      return undefined;
    }

    const sentinel = stickySentinelRef.current;
    const root = findScrollParent(sentinel);
    const scrollTarget = root || window;
    let frame = null;
    const update = () => {
      frame = null;
      const rootTop = root ? root.getBoundingClientRect().top : 0;
      setHeaderStuck(sentinel.getBoundingClientRect().top <= rootTop);
    };
    const scheduleUpdate = () => {
      if (frame == null) frame = window.requestAnimationFrame(update);
    };

    update();
    scrollTarget.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      scrollTarget.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame != null) window.cancelAnimationFrame(frame);
    };
  }, [open]);

  return (
    <article className={`cs-research-intel ${open ? "is-open" : ""} ${headerStuck ? "is-stuck" : ""}`}>
      <span ref={stickySentinelRef} className="cs-research-sticky-sentinel" aria-hidden="true" />
      <button type="button" onClick={toggle} className="cs-research-intel__header" aria-expanded={open}>
        <div>
          <h3>{title}</h3>
          <p><span>{describeAuditData(data)}</span></p>
        </div>
        <span className="cs-research-intel__toggle"><Plus className="h-5 w-5" /></span>
      </button>
      {open && (
        <div className="cs-research-intel__body">
          <div className="cs-research-details">
            {(full ? allEntries : previewEntries).map(([key, value]) => (
              <section key={key} className="cs-research-detail-section">
                <h4>{humanize(key)}</h4>
                <AuditValue data={value} />
              </section>
            ))}
          </div>
          {hasMore && (
            <button type="button" onClick={() => setFull((current) => !current)} className="cs-research-details-button">
              {full ? "Show Key Details" : "View Full Details"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
AuditAccordion.propTypes = { title: PropTypes.string.isRequired, data: PropTypes.any };

function describeAuditData(data) {
  if (Array.isArray(data)) return `${data.length} items`;
  if (data && typeof data === "object") return Object.keys(data).slice(0, 3).map(humanize).join(", ");
  if (typeof data === "string") {
    const parsed = parseAuditText(data);
    if (parsed.length) return `${parsed.length} concepts`;
  }
  return "Strategy detail";
}

const AUDIT_PREVIEW_KEYS = /(concept.?name|angle|format|hypothesis|why.?this.?now|hook.?verbatim|success.?read|usp|unique.?selling|claim)/i;

function auditDetailEntries(data, full) {
  if (typeof data === "string") {
    const parsed = parseAuditText(data);
    if (parsed.length) return auditDetailEntries(parsed, full);
  }
  if (Array.isArray(data)) {
    const values = full ? data : data.slice(0, 2);
    return values.map((item, index) => {
      const title = item && typeof item === "object"
        ? item.concept_name || item.conceptName || item.name || item.title || `Concept ${index + 1}`
        : `Item ${index + 1}`;
      return [title, full ? item : pickAuditFields(item)];
    });
  }
  if (data && typeof data === "object") {
    const entries = Object.entries(data);
    if (full) return entries;
    const important = entries.filter(([key]) => AUDIT_PREVIEW_KEYS.test(key));
    return (important.length ? important : entries).slice(0, 4);
  }
  return [["Details", data]];
}

const AUDIT_TEXT_LABELS = new Set([
  "Angle", "Format", "Hypothesis", "Benefit Type", "Concept Name", "Success Read",
  "Why This Now", "Hook Verbatim", "Proof Element", "Awareness Stage", "Building Blocks",
  "Sentiment Check", "Persona Description", "Sophistication Stage", "Sophistication Framing",
  "Expected Funnel Position",
]);

function parseAuditText(value) {
  const records = [];
  let record = {};
  let activeKey = null;
  String(value).split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    if (AUDIT_TEXT_LABELS.has(line)) {
      if (line === "Angle" && Object.keys(record).length) {
        records.push(record);
        record = {};
      }
      activeKey = line.toLowerCase().replace(/\s+/g, "_");
      record[activeKey] = "";
      return;
    }
    if (activeKey) record[activeKey] = record[activeKey] ? `${record[activeKey]}\n${line}` : line;
  });
  if (Object.keys(record).length) records.push(record);
  return records.filter((item) => Object.values(item).some(Boolean));
}

function pickAuditFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const entries = Object.entries(value);
  const important = entries.filter(([key]) => AUDIT_PREVIEW_KEYS.test(key));
  return Object.fromEntries((important.length ? important : entries).slice(0, 6));
}

function AuditValue({ data }) {
  if (data == null || data === "") return <p className="cs-research-muted">—</p>;
  if (typeof data !== "object") return <p className="whitespace-pre-wrap break-words">{String(data)}</p>;
  if (Array.isArray(data)) {
    if (data.length === 0) return <p className="cs-research-muted">None captured</p>;
    return (
      <ul className="cs-research-value-list">
        {data.map((item, index) => <li key={index}><AuditValue data={item} /></li>)}
      </ul>
    );
  }
  return (
    <div className="cs-research-nested">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <h5>{humanize(key)}</h5>
          <AuditValue data={value} />
        </div>
      ))}
    </div>
  );
}
AuditValue.propTypes = { data: PropTypes.any };

function findScrollParent(node) {
  let parent = node.parentElement;
  while (parent) {
    const { overflowY } = window.getComputedStyle(parent);
    if (/(auto|scroll|overlay)/.test(overflowY)) return parent;
    parent = parent.parentElement;
  }
  return null;
}

function isActiveJob(job) {
  return Boolean(job && (job.status == null || job.status === "queued" || job.status === "running"));
}

const LT_CATEGORIES = ["Hook", "Creator", "Angle", "Format", "CTA", "Script", "Visual", "Persona", "Offer"];
const LT_LEVELS = ["suspected", "tested", "gospel", "discredited"];
const LEVEL_TONE = { suspected: "bg-neutral-100 text-neutral-600", tested: "bg-blue-100 text-blue-700", gospel: "bg-emerald-100 text-emerald-700", discredited: "bg-red-100 text-red-700" };

// Manual learning-truths panel (mirrors his LearningTruthsPanel). The weekly
// strategist reads these so it never re-proposes discredited ideas.
function LearningTruths({ clientId, items, onChange, setErr }) {
  const [cat, setCat] = useState("Hook");
  const [desc, setDesc] = useState("");
  const [level, setLevel] = useState("suspected");

  if (!clientId) return null;

  const add = async () => {
    if (!desc.trim()) return;
    try { await creativeApi.createLearning({ clientId, category: cat, description: desc.trim(), truthLevel: level }); setDesc(""); onChange(); }
    catch (e) { setErr(e.message); }
  };
  const setLevelFor = async (id, truthLevel) => {
    try { await creativeApi.updateLearning(id, { truthLevel }); onChange(); } catch (e) { setErr(e.message); }
  };
  const remove = async (id) => {
    try { await creativeApi.deleteLearning(id); onChange(); } catch (e) { setErr(e.message); }
  };

  return (
    <Block title="Learning truths">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="cs-intel-field w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent className="cs-select-content bg-white">{LT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Founder-POV hooks beat UGC for TOF" className="cs-intel-field flex-1 min-w-[220px]" />
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="cs-intel-field w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent className="cs-select-content bg-white">{LT_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <button type="button" onClick={add} className="cs-intel-small-button">Add</button>
      </div>
      <div className="space-y-1.5 mt-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2 text-sm">
            <Badge variant="secondary" className="rounded-full text-[10px]">{it.category}</Badge>
            <span className="flex-1 text-neutral-700">{it.description}</span>
            <Select value={it.truthLevel} onValueChange={(v) => setLevelFor(it.id, v)}>
              <SelectTrigger className={`w-[120px] h-7 rounded-full border-0 text-xs ${LEVEL_TONE[it.truthLevel] || ""}`}><SelectValue /></SelectTrigger>
              <SelectContent className="cs-select-content bg-white">{LT_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <button onClick={() => remove(it.id)} className="text-xs text-neutral-400 hover:text-red-600">✕</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-neutral-400">No learnings yet — add what works or was disproven so the strategist respects it.</p>}
      </div>
    </Block>
  );
}
LearningTruths.propTypes = { clientId: PropTypes.string, items: PropTypes.array.isRequired, onChange: PropTypes.func.isRequired, setErr: PropTypes.func.isRequired };

IntelligenceView.propTypes = { ctx: PropTypes.object.isRequired };
