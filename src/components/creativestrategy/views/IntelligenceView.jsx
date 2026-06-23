// Intelligence (= the colleague's "Insights" / Creative Insights tab). Mirrors
// his InsightsTab section hierarchy: Executive KPIs → Winners → Top hooks →
// Messaging themes → Persona performance → Visual openers → Messaging trends →
// Strategic patterns → Untapped angles → Recent launches → Fatigue → full audit
// details → analyzed-ads grid. Data comes from creative_strategy_audit
// (sub-fields) + ad_creative_insights. Structure/headings/data map 1:1 to his;
// visual polish is a later pass.
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Zap, RefreshCw } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Section, JsonView, humanize } from "../JsonView";
import { ViewLoading, EmptyState, ErrorBanner, StatTile, SectionCard } from "../ui";
import { useJobRunner, JobBadge } from "../JobsContext";

// audit keys rendered in named sections below → excluded from the generic dump.
const NAMED_AUDIT_KEYS = new Set([
  "messaging_themes", "persona_ad_mapping", "visual_openers", "messaging_trends",
  "patterns", "angles_not_yet_tested", "untapped_angles", "prioritized_gaps",
]);

const money = (n) => `$${Math.round(n || 0).toLocaleString()}`;
const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);
const str = (v) => (typeof v === "string" ? v : v?.theme || v?.name || v?.title || v?.trend || v?.pattern_name || v?.angle || v?.opening_description || v?.description || JSON.stringify(v));

export default function IntelligenceView({ ctx }) {
  const { selectedProduct, selectedProductId } = ctx;
  const [ads, setAds] = useState([]);
  const [audit, setAudit] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openAd, setOpenAd] = useState(null);
  const [angles, setAngles] = useState([]);
  const [learnings, setLearnings] = useState([]);
  const [trending, setTrending] = useState(null);

  const loadLearnings = async () => {
    if (!ctx.selectedBrandId) { setLearnings([]); return; }
    try { const r = await creativeApi.getLearnings(ctx.selectedBrandId); setLearnings(r.items); } catch { /* non-fatal */ }
  };

  const load = async (pid) => {
    setLoading(true); setErr(null);
    try {
      const [r, ang] = await Promise.all([creativeApi.getInsights(pid), creativeApi.getAngles(pid).catch(() => ({ angles: [] }))]);
      setAds(r.ads); setAudit(r.audit); setAngles(ang.angles || []); setTrending(r.trending || null);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
    loadLearnings();
  };

  useEffect(() => {
    if (selectedProductId) load(selectedProductId); else { setAds([]); setAudit(null); }
    setOpenAd(null);
  }, [selectedProductId]);

  // Tracked jobs (persist across tab switches + reload on completion).
  const { job: analyzeJob, start: startAnalyze } = useJobRunner({ kind: "analyze_ads", productId: selectedProductId, onComplete: () => load(selectedProductId) });
  const { job: trendJob, start: startTrend } = useJobRunner({ kind: "trending_creative", productId: selectedProductId, onComplete: () => load(selectedProductId) });
  const { job: backfillJob, start: startBackfill } = useJobRunner({ kind: "backfill", brandId: ctx.selectedBrandId, onComplete: () => load(selectedProductId) });

  if (!selectedProductId) {
    return <EmptyState icon={Zap} title="No product selected" hint="Select a product in the top bar to run and view ad analysis." />;
  }

  const run = async () => {
    setErr(null);
    try { const { jobId } = await creativeApi.runInsights(selectedProductId); startAnalyze(jobId); }
    catch (e) { setErr(e.message); }
  };
  const runBackfill = async (kind) => {
    setErr(null);
    if (!ctx.selectedBrandId) { setErr("Select a brand first"); return; }
    try { const { jobId } = await creativeApi.runBackfill(ctx.selectedBrandId, kind); startBackfill(jobId); }
    catch (e) { setErr(e.message); }
  };
  const expandAd = async (adId) => {
    if (openAd?.adId === adId) { setOpenAd(null); return; }
    setOpenAd({ adId, ad: null });
    try { const { ad } = await creativeApi.getInsightAd(selectedProductId, adId); setOpenAd({ adId, ad }); }
    catch (e) { setErr(e.message); setOpenAd(null); }
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

  const winners = [...ads].sort((x, y) => (gradeRank(y.grade) - gradeRank(x.grade)) || (y.spend - x.spend)).slice(0, 5);
  const topHooks = [...ads].sort((x, y) => y.spend - x.spend)
    .map((x) => ({ text: x.firstSpokenSentence || x.firstOverlayHeadline || x.headlineText, style: x.hookStyle, spend: x.spend, ad: x.adName }))
    .filter((h) => h.text).slice(0, 6);
  const recent = [...ads].filter((x) => x.createdTime).sort((x, y) => new Date(y.createdTime) - new Date(x.createdTime)).slice(0, 5);
  const fatigued = ads.filter((x) => (x.frequency || 0) >= 3 && (x.spend || 0) > 100).sort((x, y) => (y.frequency || 0) - (x.frequency || 0)).slice(0, 5);

  const otherAuditEntries = Object.entries(a).filter(([k, v]) => v != null && !NAMED_AUDIT_KEYS.has(k));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={run} size="sm" className="rounded-xl">Run Analysis</Button>
        <JobBadge job={analyzeJob} />
        <span className="text-sm text-neutral-400">{selectedProduct?.name} · {selectedProduct?.metaAdAccountId}</span>
      </div>
      <ErrorBanner message={err} />

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-neutral-500">Maintenance (brand-wide):</span>
        <Button onClick={() => runBackfill("classify")} variant="outline" size="sm" className="rounded-xl h-7 text-xs">Classify ads</Button>
        <Button onClick={() => runBackfill("curate_hooks")} variant="outline" size="sm" className="rounded-xl h-7 text-xs">Curate hooks → proven-hooks</Button>
        <Button onClick={() => runBackfill("normalize_angles")} variant="outline" size="sm" className="rounded-xl h-7 text-xs">Normalize angles</Button>
        <JobBadge job={backfillJob} />
      </div>

      {loading && ads.length === 0 && !audit ? (
        <ViewLoading label="Loading intelligence…" />
      ) : ads.length === 0 && !audit ? (
        <EmptyState icon={Zap} title="No analysis yet"
          hint="Run analysis to pull this brand's Meta ads and build the creative-strategy audit: KPIs, winners, hooks, themes, persona performance, and more." />
      ) : (
      <div className="space-y-5">
      {ads.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {kpis.map(([label, val]) => <StatTile key={label} label={label} value={val} />)}
        </div>
      )}

      {winners.length > 0 && (
        <Block title="Winners spotlight">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {winners.map((w) => (
              <div key={w.adId} className="rounded-2xl border border-neutral-200 overflow-hidden">
                {(w.imageUrl || w.thumbnailUrl) && <img src={w.imageUrl || w.thumbnailUrl} alt="" className="w-full h-24 object-cover bg-neutral-100" />}
                <div className="p-2">
                  <div className="text-xs font-medium truncate">{w.adName || "(unnamed)"}</div>
                  <div className="text-xs text-neutral-400">{w.grade ? `${w.grade} · ` : ""}{money(w.spend)}</div>
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

      <Block title="Trending creative · rising spend / new, last 7d"
        actions={
          <div className="flex items-center gap-2">
            <JobBadge job={trendJob} />
            <Button onClick={runTrending} variant="outline" size="sm" className="rounded-lg h-7 text-xs gap-1"><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
          </div>
        }>
        {trendingAds.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {trendingAds.slice(0, 8).map((t) => (
              <div key={t.adId} className="rounded-xl border border-neutral-200 overflow-hidden">
                {t.thumbnailUrl && <img src={t.thumbnailUrl} alt="" className="w-full h-24 object-cover bg-neutral-100" />}
                <div className="p-2">
                  <div className="text-xs font-medium truncate" title={t.adName}>{t.adName}</div>
                  <div className="text-xs text-neutral-400">{money(t.currentSpend)}{t.spendDelta != null ? ` · +${Math.round(t.spendDelta * 100)}% WoW` : " · new"}</div>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-neutral-400">No trending creatives{trending ? "" : " yet — click Refresh (needs Meta)"}.</p>}
      </Block>

      {topHooks.length > 0 && (
        <Block title="Top hooks">
          {topHooks.map((h, i) => (
            <div key={i} className="text-sm text-neutral-700">
              “{h.text}” <span className="text-xs text-neutral-400">{h.style ? `· ${h.style}` : ""} · {money(h.spend)}</span>
            </div>
          ))}
        </Block>
      )}

      <AuditList title="Messaging themes" items={a.messaging_themes} render={(t) => (
        <div><span className="font-medium text-neutral-800">{str(t)}</span>{t?.spend_pct ? <span className="text-xs text-neutral-400"> · {Math.round(t.spend_pct)}% spend</span> : null}{t?.description ? <div className="text-xs text-neutral-500">{t.description}</div> : null}</div>
      )} />

      <AuditList title="Persona performance" items={a.persona_ad_mapping} render={(p) => (
        <div><span className="font-medium text-neutral-800">{p.matched_research_persona || p.persona_short_title || p.persona || str(p)}</span>
          <span className="text-xs text-neutral-400"> · {p.ad_count ?? 0} ads · {money(p.total_spend)}</span>
          {p.top_unmet_angle ? <div className="text-xs text-neutral-500">unmet: {p.top_unmet_angle}</div> : null}</div>
      )} />

      <AuditList title="Visual openers" items={a.visual_openers} render={(o) => <div className="text-neutral-700">{str(o)}</div>} />

      <AuditList title="Messaging trends" items={a.messaging_trends} render={(t) => (
        <div><span className="font-medium text-neutral-800">{t.trend || str(t)}</span>{t?.spend_pct ? <span className="text-xs text-neutral-400"> · {Math.round(t.spend_pct)}%</span> : null}{t?.description ? <div className="text-xs text-neutral-500">{t.description}</div> : null}</div>
      )} />

      <AuditList title="Strategic patterns" items={a.patterns} render={(p) => (
        <div><span className="font-medium text-neutral-800">{p.pattern_name || str(p)}</span>{p?.insight ? <div className="text-xs text-neutral-500">{p.insight}</div> : null}</div>
      )} />

      <AuditList title="Untapped angles & gaps" items={a.angles_not_yet_tested || a.untapped_angles || a.prioritized_gaps}
        render={(g) => <Pill>{str(g)}</Pill>} wrap />

      {angles.length > 0 && (
        <Block title="Ad angles (proven · in-research · untapped)">
          <div className="flex flex-wrap gap-1.5">
            {angles.map((ang, i) => (
              <span key={i} className={`text-xs rounded-full px-2 py-0.5 ${ang.status === "proven" ? "bg-emerald-100 text-emerald-700" : ang.status === "in_research" ? "bg-blue-100 text-blue-700" : "bg-neutral-100 text-neutral-500"}`}
                title={`${ang.status}${ang.ad_count ? ` · ${ang.ad_count} ads · $${Math.round(ang.total_spend || 0)}` : ""}`}>
                {ang.name}{ang.ad_count ? ` (${ang.ad_count})` : ""}
              </span>
            ))}
          </div>
        </Block>
      )}

      <LearningTruths clientId={ctx.selectedBrandId} items={learnings} onChange={loadLearnings} setErr={setErr} />

      {recent.length > 0 && (
        <Block title="Recent launches">
          {recent.map((r) => <div key={r.adId} className="text-sm text-neutral-700">{r.adName || "(unnamed)"} <span className="text-xs text-neutral-400">· {new Date(r.createdTime).toLocaleDateString()} · {money(r.spend)}</span></div>)}
        </Block>
      )}

      {fatigued.length > 0 && (
        <Block title="Fatigue alerts (frequency ≥ 3)">
          {fatigued.map((f) => <div key={f.adId} className="text-sm text-neutral-700">{f.adName || "(unnamed)"} <span className="text-xs text-amber-600">· freq {Number(f.frequency).toFixed(1)} · {money(f.spend)}</span></div>)}
        </Block>
      )}

      {otherAuditEntries.length > 0 && (
        <details className="rounded-2xl border border-neutral-200 p-4">
          <summary className="text-sm font-medium cursor-pointer">Full creative-strategy audit ({otherAuditEntries.length} more sections)</summary>
          <div className="space-y-3 mt-3">
            {otherAuditEntries.map(([k, v]) => <Section key={k} title={humanize(k)} data={v} />)}
          </div>
        </details>
      )}

      <div>
        <p className="text-sm font-semibold text-neutral-800 mb-2">
          Analyzed ads <span className="text-xs font-normal text-neutral-400">{ads.length ? `· ${ads.length} · click a card for full detail` : ""}</span>
        </p>
        {ads.length === 0 ? (
          <EmptyState icon={Zap} title="No analyzed ads yet" hint="Click Run Analysis to pull and analyze this brand's Meta ads." />
        ) : (
          <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2">
            {ads.map((ad) => (
              <button key={ad.adId} onClick={() => expandAd(ad.adId)}
                className={`text-left rounded-2xl border bg-white overflow-hidden transition-all ${openAd?.adId === ad.adId ? "border-neutral-900 shadow" : "border-neutral-200 shadow-xs hover:shadow-sm"}`}>
                {(ad.imageUrl || ad.thumbnailUrl || ad.mediaUrl) && <img src={ad.imageUrl || ad.thumbnailUrl || ad.mediaUrl} alt="" className="w-full h-32 object-cover bg-neutral-100" />}
                <div className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate">{ad.adName || "(unnamed)"}</div>
                    {ad.grade && <Badge variant="secondary" className="rounded-full text-[10px]">{ad.grade}</Badge>}
                  </div>
                  <div className="text-xs text-neutral-400">{money(ad.spend)} · {ad.mediaType}</div>
                  {ad.primaryAngle && <div className="text-xs text-neutral-500 truncate">angle: {ad.primaryAngle}</div>}
                  <div className="text-xs text-neutral-400">
                    {ad.roas ? `ROAS ${ad.roas.toFixed(2)}` : ""}{ad.costPerPurchase ? ` · CPA ${money(ad.costPerPurchase)}` : ""}{ad.hookRate ? ` · hook ${(ad.hookRate * 100).toFixed(0)}%` : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {openAd && (
        <SectionCard title="Ad detail" actions={<Button onClick={() => setOpenAd(null)} variant="ghost" size="sm" className="h-7 text-xs">close ✕</Button>} className="border-neutral-900">
          {openAd.ad ? <JsonView data={openAd.ad} /> : <ViewLoading label="Loading ad…" className="py-8" />}
        </SectionCard>
      )}
      </div>
      )}
    </div>
  );
}

function gradeRank(g) { return { A: 4, B: 3, C: 2, D: 1 }[g] || 0; }

function Block({ title, children, actions }) {
  return (
    <SectionCard title={title} actions={actions} bodyClassName="p-4 space-y-1.5">
      {children}
    </SectionCard>
  );
}
Block.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node, actions: PropTypes.node };

function AuditList({ title, items, render, wrap }) {
  const arr = Array.isArray(items) ? items : items && typeof items === "object" ? Object.values(items) : [];
  if (!arr.length) return null;
  return (
    <Block title={title}>
      <div className={wrap ? "flex flex-wrap gap-1.5" : "space-y-1.5"}>
        {arr.slice(0, 12).map((it, i) => <div key={i} className="text-sm">{render(it)}</div>)}
      </div>
    </Block>
  );
}
AuditList.propTypes = { title: PropTypes.string.isRequired, items: PropTypes.any, render: PropTypes.func.isRequired, wrap: PropTypes.bool };

function Pill({ children }) {
  return <span className="text-xs rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">{children}</span>;
}
Pill.propTypes = { children: PropTypes.node };

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
          <SelectTrigger className="w-[120px] rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{LT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Founder-POV hooks beat UGC for TOF" className="flex-1 min-w-[220px] rounded-xl h-8 text-xs" />
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-[130px] rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{LT_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={add} size="sm" className="rounded-xl h-8 text-xs">Add</Button>
      </div>
      <div className="space-y-1.5 mt-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2 text-sm">
            <Badge variant="secondary" className="rounded-full text-[10px]">{it.category}</Badge>
            <span className="flex-1 text-neutral-700">{it.description}</span>
            <Select value={it.truthLevel} onValueChange={(v) => setLevelFor(it.id, v)}>
              <SelectTrigger className={`w-[120px] h-7 rounded-full border-0 text-xs ${LEVEL_TONE[it.truthLevel] || ""}`}><SelectValue /></SelectTrigger>
              <SelectContent>{LT_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
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
