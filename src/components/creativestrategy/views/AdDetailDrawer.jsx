// One ad's full analysis in a right-hand drawer: used by Insights (Top hooks,
// Top performers) and Weekly Strategy ("Built on" ads). Everything it shows
// comes from the ad_creative_insights row; the media player and thumbnails
// need an <AdMediaProvider> above it for the product.
import { useState } from "react";
import PropTypes from "prop-types";
import { ExternalLink, Loader2, Sparkles, X, Zap } from "lucide-react";
import { toast } from "sonner";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { creativeApi } from "@/lib/creativeApi";
import { humanize } from "../JsonView";
import { CsScrollArea } from "../ui";
import { useJobs } from "../JobsContext";
import { AdMediaPlayer, AdThumbImg } from "../meta-media";

const money = (n) => `$${Math.round(n || 0).toLocaleString()}`;

/** The ad in Meta Ads Manager (same link shape as the job queue's "View in Ads Manager"). */
export function adsManagerAdUrl(adAccountId, adId) {
  if (!adAccountId || !adId) return null;
  const account = String(adAccountId).startsWith("act_") ? String(adAccountId) : `act_${adAccountId}`;
  return `https://adsmanager.facebook.com/adsmanager/manage/ads/edit/standalone?${account.replace("_", "=")}&selected_ad_ids=${adId}`;
}


/** True once an ad has the full creative read (angle + description). */
const isAnalyzedAd = (ad) => Boolean(ad?.primaryAngle && ad?.mediaDescription);

/**
 * Everything the analysis knows about one ad: overview, hook formula, why it
 * works, building blocks, copy and transcript. `variant="drawer"` leads with a
 * large preview and a stat grid; "inline" is the original Top hooks layout.
 */
export function HookDetails({ hook, variant = "inline", averages = null }) {
  const formula = hook.hookFormula || {};
  const primaryCopy = hook.adsManagerCopy || {};
  const transcript = parseTranscript(hook.transcript, hook.firstSpokenSentence);
  const drawer = variant === "drawer";
  // Opened from Top hooks: the copy and why the hook works lead; ad-level data follows.
  const copyFirst = drawer && hook.openedFrom === "hook";
  const isVideo = String(hook.mediaType || "").toLowerCase() === "video";
  const tags = [
    hook.primaryAngle && `Angle: ${hook.primaryAngle}`, hook.hookStyle && `Style: ${hook.hookStyle}`,
    hook.emotionalTrigger && `Emotion: ${hook.emotionalTrigger}`, hook.awarenessStage && `Awareness: ${plainLabel(hook.awarenessStage)}`,
    hook.benefitType && `Benefit: ${plainLabel(hook.benefitType)}`, hook.conceptClassification && `Bucket: ${plainLabel(hook.conceptClassification)}`,
  ].filter(Boolean);
  const stats = [
    hook.purchases > 0 && `${hook.purchases} conversions`,
    hook.ctr != null && `${Number(hook.ctr).toFixed(2)}% CTR`,
    hook.cpm != null && `${money(hook.cpm)} CPM`,
    hook.hookRate > 0 && `${(hook.hookRate * 100).toFixed(1)}% hook rate`,
    hook.avgWatchTime > 0 && `${Number(hook.avgWatchTime).toFixed(1)}s avg watch`,
    hook.frequency > 0 && `${Number(hook.frequency).toFixed(1)}x frequency`,
    hook.funnelPosition && humanize(hook.funnelPosition),
  ].filter(Boolean);
  // The grade's "CPA 23.41 vs 30.12; …" comparison goes into the scorecards
  // (same baseline the grade used); account averages fill in for ungraded ads.
  const graded = parseGradeComparisons(hook.gradeRationale);
  const averageFor = (key) => graded[key]?.average ?? averages?.[key] ?? null;
  const drawerStats = [
    ["Spend", money(hook.spend)],
    ["CPA", hook.costPerPurchase ? money(hook.costPerPurchase) : "—", compareToAverage("cpa", hook.costPerPurchase, averageFor("cpa"))],
    ["Conversions", hook.purchases > 0 ? String(hook.purchases) : "—"],
    ["CTR", hook.ctr != null ? `${Number(hook.ctr).toFixed(2)}%` : "—", compareToAverage("ctr", hook.ctr, averageFor("ctr"))],
    ["CPM", hook.cpm != null ? money(hook.cpm) : "—", compareToAverage("cpm", hook.cpm, averageFor("cpm"))],
    ["Frequency", hook.frequency > 0 ? `${Number(hook.frequency).toFixed(1)}x` : "—"],
    ...(isVideo ? [
      ["Hook rate", hook.hookRate > 0 ? `${(hook.hookRate * 100).toFixed(1)}%` : "—", compareToAverage("hook", hook.hookRate, averageFor("hook"))],
      ...(hook.holdRate > 0 ? [["Hold rate", `${(hook.holdRate * 100).toFixed(1)}%`, compareToAverage("hold", hook.holdRate, averageFor("hold"))]] : []),
      ["Avg watch", hook.avgWatchTime > 0 ? `${Number(hook.avgWatchTime).toFixed(1)}s` : "—"],
    ] : []),
  ];
  const tagRow = tags.length > 0 && <div className="cs-intel-tag-row">{tags.map((tag, tagIndex) => <span key={tag} className={`cs-intel-attribute-pill is-tone-${tagIndex % 4}`}>{tag}</span>)}</div>;
  const scorecards = <dl className="cs-ad-drawer__stats">{drawerStats.map(([label, value, comparison]) => <div key={label}>
    <dt>{label}</dt>
    <dd>{value}{comparison && <small className={comparison.tone}>{comparison.label}</small>}</dd>
  </div>)}</dl>;
  const hookQuote = hook.hookText && <div><p className="cs-intel-field-label">Hook</p><p className="cs-ad-drawer__hook">“{hook.hookText}”</p></div>;

  const notAnalyzed = drawer && !isAnalyzedAd(hook) && <section className="cs-intel-detail-section">
    <p className="cs-ad-drawer__note">This ad hasn&apos;t had a full creative analysis yet, so there&apos;s no hook breakdown, angle or transcript. Each Run Analysis reads your top-spending ads.</p>
  </section>;
  const formulaSection = (formula.pattern_interrupt || formula.qualifier || formula.gap) && <section className="cs-intel-detail-section">
    <h3 className="cs-intel-subsection-title">Hook formula</h3>
    <div className="cs-intel-formula-grid">{[["Pattern interrupt", formula.pattern_interrupt], ["Qualifier", formula.qualifier], ["Gap", formula.gap]].filter(([, value]) => value).map(([label, value]) =>
      <div key={label} className="cs-intel-formula-card"><small>{label}</small><p>{value}</p></div>)}</div>
  </section>;
  const whySection = hook.whyItWorks && <section className="cs-intel-detail-section">
    <h3 className="cs-intel-subsection-title">Why it works</h3>
    <p className="cs-hook-why">{hook.whyItWorks}</p>
  </section>;
  const blocksSection = (hook.buildingBlocks?.length > 0 || hook.lifeForce8?.length > 0) && <section className="cs-intel-detail-section">
    {hook.buildingBlocks?.length > 0 && <DetailList label="Building blocks" items={hook.buildingBlocks.map(plainLabel)} />}
    {hook.lifeForce8?.length > 0 && <DetailList label="Core desires" items={hook.lifeForce8.map(plainLabel)} />}
  </section>;
  const copySection = (primaryCopy.primary_text || primaryCopy.headline || hook.headlineText || primaryCopy.cta || hook.ctaType) && <section className="cs-intel-detail-section">
    <h3 className="cs-intel-subsection-title">Ad copy</h3>
    <div className="cs-intel-copy-grid">
      {primaryCopy.primary_text && <LabeledCopy label="Primary text">{primaryCopy.primary_text}</LabeledCopy>}
      {(primaryCopy.headline || hook.headlineText) && <LabeledCopy label="Headline">{primaryCopy.headline || hook.headlineText}</LabeledCopy>}
      {(primaryCopy.cta || hook.ctaType) && <LabeledCopy label="Call to action">{plainLabel(primaryCopy.cta || hook.ctaType)}</LabeledCopy>}
    </div>
  </section>;
  const transcriptSection = transcript.full && hook.mediaType === "video" && <section className="cs-intel-detail-section">
    <div className="cs-hook-transcript-head">
      <h3 className="cs-intel-subsection-title">Transcript</h3>
      {transcript.speechQuality && <span className="cs-hook-chip">Speech: {transcript.speechQuality}</span>}
      {transcript.wordCount && <span className="cs-hook-chip">First sentence: {transcript.wordCount} words</span>}
    </div>
    <CsScrollArea className="cs-intel-transcript" viewportClassName={drawer ? "max-h-[360px]" : "max-h-[190px]"}>
      <p>{transcript.highlight
        ? <>{transcript.full.slice(0, transcript.highlight[0])}<mark className="cs-hook-mark" title="Opening hook (0–8s)">{transcript.full.slice(transcript.highlight[0], transcript.highlight[1])}</mark>{transcript.full.slice(transcript.highlight[1])}</>
        : <>{transcript.firstSentence && <><mark className="cs-hook-mark" title="Opening hook (0–8s)">{transcript.firstSentence}</mark>{"\n\n"}</>}{transcript.full}</>}</p>
    </CsScrollArea>
  </section>;
  const media = <div className="cs-ad-drawer__media">
    <AdMediaPlayer ad={hook} fallback={<div className="cs-ad-drawer__media-empty"><Zap className="h-6 w-6" /></div>} />
  </div>;

  if (copyFirst) {
    return <div className="cs-intel-hook-details is-drawer">
      {hookQuote && <section className="cs-intel-detail-section is-first cs-ad-drawer__lead">{hookQuote}</section>}
      {whySection}
      {formulaSection}
      {copySection}
      {transcriptSection}
      {notAnalyzed}
      <section className="cs-intel-detail-section">
        <p className="cs-ad-drawer__section-label">Ad performance</p>
        <div className="cs-ad-drawer__overview">
          {media}
          <div className="min-w-0 space-y-3">
            {scorecards}
            {hook.funnelPosition && <p className="text-xs text-neutral-500">Funnel: {humanize(hook.funnelPosition)}</p>}
            {tagRow}
          </div>
        </div>
      </section>
      {blocksSection}
    </div>;
  }

  return <div className={`cs-intel-hook-details ${drawer ? "is-drawer" : ""}`}>
    {drawer ? <section className="cs-intel-detail-section is-first cs-ad-drawer__overview">
      {media}
      <div className="min-w-0 space-y-3">
        {hookQuote}
        {scorecards}
        {hook.funnelPosition && <p className="text-xs text-neutral-500">Funnel: {humanize(hook.funnelPosition)}</p>}
        {tagRow}
      </div>
    </section> : <section className="cs-intel-detail-section is-first cs-hook-overview">
      <div className="cs-hook-overview__thumb">
        <CreativeThumbnail ad={hook} variant="card" />
      </div>
      <div className="cs-hook-overview__body">
        <p className="cs-intel-field-label">Ad name</p>
        <strong className="cs-intel-ad-name">{hook.adName || "Unnamed"}</strong>
        <div className="cs-intel-stat-line">{stats.map((stat) => <span key={stat}>{stat}</span>)}</div>
        {hook.gradeRationale && <p className="cs-hook-overview__read">{hook.gradeRationale}</p>}
        <div className="cs-intel-tag-row">{tags.map((tag, tagIndex) => <span key={tag} className={`cs-intel-attribute-pill is-tone-${tagIndex % 4}`}>{tag}</span>)}</div>
      </div>
    </section>}
    {notAnalyzed}
    {formulaSection}
    {whySection}
    {blocksSection}
    {copySection}
    {transcriptSection}
  </div>;
}
HookDetails.propTypes = { hook: PropTypes.object.isRequired, variant: PropTypes.oneOf(["inline", "drawer"]), averages: PropTypes.object };

/** The grade rationale "CPA 23.41 vs 30.12; CTR 1.20 vs 0.95" → { cpa: { actual, average }, ctr: … }. */
function parseGradeComparisons(text) {
  const out = {};
  for (const match of String(text || "").matchAll(/\b(CPA|CTR|CPM|HOOK|HOLD)\s+(-?\d+(?:\.\d+)?)\s+vs\s+(-?\d+(?:\.\d+)?)/g)) {
    const average = Number(match[3]);
    if (Number.isFinite(average) && average > 0) out[match[1].toLowerCase()] = { actual: Number(match[2]), average };
  }
  return out;
}

const LOWER_IS_BETTER = new Set(["cpa", "cpm"]);
const formatAverage = (key, value) => (key === "cpa" || key === "cpm" ? money(value)
  : key === "ctr" ? `${Number(value).toFixed(2)}%` : `${(value * 100).toFixed(1)}%`);

/** "22% below $30 avg" with a good/bad tone, or null when there's nothing to compare. */
function compareToAverage(key, actual, average) {
  const value = Number(actual);
  if (!Number.isFinite(value) || value <= 0 || !(average > 0)) return null;
  const ratio = value / average;
  const pctOff = Math.round(Math.abs(ratio - 1) * 100);
  if (pctOff < 5) return { tone: "is-flat", label: `≈ ${formatAverage(key, average)} avg` };
  const better = LOWER_IS_BETTER.has(key) ? ratio < 1 : ratio > 1;
  return { tone: better ? "is-good" : "is-bad", label: `${pctOff}% ${ratio < 1 ? "below" : "above"} ${formatAverage(key, average)} avg` };
}

/** Account averages for scorecards when an ad has no saved grade (impression-weighted). */
export function computeAccountAverages(ads) {
  let spend = 0, purchases = 0, impressions = 0, ctrWeighted = 0, videoImpressions = 0, hookWeighted = 0, holdImpressions = 0, holdWeighted = 0;
  for (const ad of ads) {
    const imps = Number(ad.impressions) || 0;
    spend += Number(ad.spend) || 0;
    purchases += Number(ad.purchases) || 0;
    impressions += imps;
    if (ad.ctr != null) ctrWeighted += Number(ad.ctr) * imps;
    if (ad.hookRate > 0) { videoImpressions += imps; hookWeighted += ad.hookRate * imps; }
    if (ad.holdRate > 0) { holdImpressions += imps; holdWeighted += ad.holdRate * imps; }
  }
  return {
    cpa: purchases > 0 ? spend / purchases : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    ctr: impressions > 0 ? ctrWeighted / impressions : null,
    hook: videoImpressions > 0 ? hookWeighted / videoImpressions : null,
    hold: holdImpressions > 0 ? holdWeighted / holdImpressions : null,
  };
}

/**
 * Right-hand drawer, detached from the screen edge, with one ad's full
 * analysis (opened from Insights, or a Weekly card's "Built on" ad).
 * `adAccountId` adds an "Ads Manager" link to the live ad.
 */
export default function AdDetailDrawer({ ad, onClose, averages = null, productId = null, sourceAd = null, adAccountId = null }) {
  const managerUrl = adsManagerAdUrl(adAccountId, ad?.adId);
  return (
    <DialogPrimitive.Root open={Boolean(ad)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="cs-ad-drawer-overlay" />
        <DialogPrimitive.Content className="cs-ad-drawer" aria-describedby={undefined}>
          {ad && <>
            <header className="cs-ad-drawer__header">
              <div className="min-w-0">
                <DialogPrimitive.Title className="cs-ad-drawer__title" title={ad.adName}>{ad.adName || "Unnamed ad"}</DialogPrimitive.Title>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <MediaTag mediaType={ad.mediaType} />
                  {ad.trend && <span className="cs-top-card__trend">{ad.trend.spendDelta != null ? `+${Math.round(ad.trend.spendDelta * 100)}% this week` : "New this week"}</span>}
                  {managerUrl && <a href={managerUrl} target="_blank" rel="noopener noreferrer" className="cs-ad-drawer__manager-link">
                    Ads Manager <ExternalLink className="h-3 w-3" />
                  </a>}
                </div>
              </div>
              <DialogPrimitive.Close className="cs-ad-drawer__close" aria-label="Close"><X className="h-4 w-4" /></DialogPrimitive.Close>
            </header>
            <CsScrollArea className="min-h-0 flex-1" viewportClassName="h-full">
              <div className="cs-ad-drawer__body"><HookDetails hook={ad} variant="drawer" averages={averages} /></div>
            </CsScrollArea>
            <AdDrawerActions ad={sourceAd || ad} productId={productId} />
          </>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
AdDetailDrawer.propTypes = { ad: PropTypes.object, onClose: PropTypes.func.isRequired, averages: PropTypes.object, productId: PropTypes.string, sourceAd: PropTypes.object, adAccountId: PropTypes.string };

/**
 * "Make something from this ad" at the foot of the drawer. Each button starts a
 * background job (shown in the job tracker) whose result lands in Generate:
 *   video ad → a video brief built on it (Generate → Briefs)
 *   image ad → two statics that use it as the layout reference (Generate → Statics)
 */
function AdDrawerActions({ ad, productId }) {
  const { track } = useJobs();
  const [busy, setBusy] = useState(null);
  if (!ad || !productId || !ad.id) return null;
  const isVideo = ad.mediaType === "video";
  const isImage = ad.mediaType === "image";
  // A brief needs the ad's analysis; a static needs the saved image.
  const canBrief = isVideo && Boolean(ad.transcript || ad.primaryAngle);
  const canStatic = isImage && Boolean(ad.storagePath);
  if (!isVideo && !isImage) return null;

  const run = async (kind) => {
    setBusy(kind);
    try {
      if (kind === "brief") {
        const { jobId } = await creativeApi.generateConceptBrief({ productId, format: "video", count: 1, referenceAdId: ad.id, source: "insights" });
        track(jobId, { kind: "generate_brief", productId, label: "Video brief from an ad" });
        toast.success("Writing a video brief from this ad. It'll be in Generate → Briefs.");
      } else {
        const { jobId } = await creativeApi.runGenerate({ productId, generationMode: "manual", brandExampleAdIds: [ad.id], variationCount: 2 });
        track(jobId, { kind: "generate_ad", productId });
        toast.success("Making 2 statics with this ad as the layout reference. They'll be in Generate → Statics.");
      }
    } catch (error) {
      toast.error(error.message || "Couldn't start that");
    } finally {
      setBusy(null);
    }
  };

  return (
    <footer className="cs-ad-drawer__actions">
      {isVideo && <button type="button" className="cs-primary-button" disabled={!canBrief || busy != null} onClick={() => run("brief")}>
        {busy === "brief" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Video brief from this ad
      </button>}
      {isImage && <button type="button" className="cs-primary-button" disabled={!canStatic || busy != null} onClick={() => run("static")}>
        {busy === "static" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Statics from this ad
      </button>}
      <p className="text-xs text-stone-500">
        {isVideo
          ? (canBrief ? "A new concept, 3 hooks and a full script that keep what works here and change the execution." : "Analyze this ad first (Run Insights) to build a brief on it.")
          : (canStatic ? "Rebuilds this ad's layout with new copy for this product, 2 variations." : "This ad's image wasn't saved, so it can't be used as a layout reference.")}
      </p>
    </footer>
  );
}
AdDrawerActions.propTypes = { ad: PropTypes.object, productId: PropTypes.string };

export function MediaTag({ mediaType }) {
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

/** "most_aware" / "pattern_interrupt" → "most aware" / "pattern interrupt". */
export const plainLabel = (value) => String(value ?? "").replace(/_/g, " ").replace(/\s+/g, " ").trim();

const TRANSCRIPT_LABEL = /^(full transcript|first (?:hook )?sentence(?:\s*\([^)]*\))?|speech quality|quality|first sentence word count|word count)\s*:?\s*(.*)$/i;

/**
 * Split the stored transcript (FULL TRANSCRIPT / FIRST HOOK SENTENCE (0-8s) /
 * SPEECH QUALITY / word-count sections) into the spoken text plus the opening
 * hook, which is highlighted inside the text rather than shown as its own row.
 */
function parseTranscript(transcript, fallbackFirstSentence) {
  const out = { full: "", firstSentence: "", speechQuality: "", wordCount: "", highlight: null };
  const raw = String(transcript || "").trim();
  if (!raw) return out;
  const sections = {};
  let active = null;
  let sawLabel = false;
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.replace(/^[#*\s-]+|\*+$/g, "").trim();
    if (!line) continue;
    const match = line.match(TRANSCRIPT_LABEL);
    if (match) {
      sawLabel = true;
      const label = match[1].toLowerCase();
      active = label.includes("word count") ? "wordCount" : label.includes("quality") ? "speechQuality" : label.startsWith("first") ? "firstSentence" : "full";
      sections[active] = match[2] ? [match[2].replace(/\*+/g, "").trim()] : [];
    } else if (active) sections[active].push(line);
    else (sections.full ??= []).push(line);
  }
  out.full = (sawLabel ? sections.full ?? [] : raw.split(/\r?\n/)).join("\n").trim();
  out.firstSentence = (sections.firstSentence ?? []).join(" ").replace(/^["“]|["”]$/g, "").trim() || String(fallbackFirstSentence || "").trim();
  if (/^none\b/i.test(out.firstSentence)) out.firstSentence = "";
  out.speechQuality = (sections.speechQuality ?? []).join(" ").split(/[.;—-]/)[0].trim().slice(0, 40);
  out.wordCount = ((sections.wordCount ?? []).join(" ").match(/\d+/) || [""])[0];
  if (out.firstSentence && out.full) {
    const at = out.full.toLowerCase().indexOf(out.firstSentence.toLowerCase());
    if (at >= 0) out.highlight = [at, at + out.firstSentence.length];
  }
  return out;
}

export function CreativeThumbnail({ ad, variant = "compact" }) {
  const className = `cs-intel-thumbnail is-${variant}`;
  return <AdThumbImg ad={ad} className={className} fallback={<div className={`${className} is-empty`}><Zap className="h-5 w-5" /></div>} />;
}
CreativeThumbnail.propTypes = { ad: PropTypes.object, variant: PropTypes.oneOf(["compact", "card", "opener", "performer"]) };
