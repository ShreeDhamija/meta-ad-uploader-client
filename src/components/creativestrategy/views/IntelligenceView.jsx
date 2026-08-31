// Intelligence (= the colleague's "Insights" / Creative Insights tab). Mirrors
// his InsightsTab section hierarchy: Executive KPIs → Winners → Top hooks →
// Messaging themes → Persona performance → Visual openers → Messaging trends →
// Strategic patterns → Untapped angles → Recent launches → Fatigue → full audit
// details. Data comes from creative_strategy_audit
// (sub-fields) + ad_creative_insights. Structure/headings/data map 1:1 to his;
// visual polish is a later pass.
import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Loader2, Plus, RefreshCw, Zap } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { humanize } from "../JsonView";
import { ViewLoading, EmptyState, ErrorBanner } from "../ui";
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
  const {
    brands, brandsLoading, selectedBrandId, setSelectedBrandId,
    products, productsLoading, selectedProduct, selectedProductId, setSelectedProductId,
  } = ctx;
  const [ads, setAds] = useState([]);
  const [audit, setAudit] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
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
  }, [selectedProductId]);

  // Tracked jobs (persist across tab switches + reload on completion).
  const { job: analyzeJob, start: startAnalyze } = useJobRunner({ kind: "analyze_ads", productId: selectedProductId, onComplete: () => load(selectedProductId) });
  const { job: trendJob, start: startTrend } = useJobRunner({ kind: "trending_creative", productId: selectedProductId, onComplete: () => load(selectedProductId) });

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

  const winners = [...ads].sort((x, y) => (gradeRank(y.grade) - gradeRank(x.grade)) || (y.spend - x.spend)).slice(0, 5);
  const topHooks = [...ads].sort((x, y) => y.spend - x.spend)
    .map((x) => ({ text: x.firstSpokenSentence || x.firstOverlayHeadline || x.headlineText, style: x.hookStyle, spend: x.spend, ad: x.adName }))
    .filter((h) => h.text).slice(0, 6);
  const recent = [...ads].filter((x) => x.createdTime).sort((x, y) => new Date(y.createdTime) - new Date(x.createdTime)).slice(0, 5);
  const fatigued = ads.filter((x) => (x.frequency || 0) >= 3 && (x.spend || 0) > 100).sort((x, y) => (y.frequency || 0) - (x.frequency || 0)).slice(0, 5);

  const otherAuditEntries = Object.entries(a).filter(([k, v]) => v != null && !NAMED_AUDIT_KEYS.has(k));
  const analyzeActive = isActiveJob(analyzeJob);
  const angleGroups = angles.reduce((groups, angle) => {
    const key = angle.status || "uncategorized";
    if (!groups[key]) groups[key] = [];
    groups[key].push(angle);
    return groups;
  }, {});

  return (
    <div className="space-y-5">
      <div className="cs-intel-toolbar">
        <Select value={selectedBrandId || ""} onValueChange={(value) => setSelectedBrandId(value || null)}>
          <SelectTrigger className="cs-pill-control w-[220px] px-4">
            <SelectValue placeholder={brandsLoading ? "Loading Accounts…" : "Select Account"} />
          </SelectTrigger>
          <SelectContent className="cs-select-content bg-white">
            {brands.map((brand) => <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={selectedProductId || ""}
          onValueChange={(value) => setSelectedProductId(value || null)}
          disabled={!selectedBrandId || productsLoading}
        >
          <SelectTrigger className="cs-pill-control w-[220px] px-4">
            <SelectValue placeholder={productsLoading ? "Loading Products…" : "Select Product"} />
          </SelectTrigger>
          <SelectContent className="cs-select-content bg-white">
            {products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="cs-intel-toolbar__spacer" />
        <JobBadge job={analyzeJob} />
        <button type="button" onClick={run} disabled={!selectedProductId || analyzeActive} className="cs-primary-button">
          {analyzeActive && <Loader2 className="h-4 w-4 animate-spin" />}
          {analyzeActive ? "Running Analysis…" : "Run Analysis"}
        </button>
      </div>
      {selectedProduct && <p className="cs-intel-toolbar__hint">{selectedProduct.name}{selectedProduct.metaAdAccountId ? ` · ${selectedProduct.metaAdAccountId}` : ""}</p>}
      <ErrorBanner message={err} />

      {!selectedProductId ? (
        <EmptyState icon={Zap} title="No product selected" hint="Select a product above to run and view ad analysis." />
      ) : loading && ads.length === 0 && !audit ? (
        <ViewLoading label="Loading intelligence…" />
      ) : ads.length === 0 && !audit ? (
        <EmptyState icon={Zap} title="No analysis yet"
          hint="Run analysis to pull this brand's Meta ads and build the creative-strategy audit: KPIs, winners, hooks, themes, persona performance, and more." />
      ) : (
      <div className="space-y-5">
      {ads.length > 0 && (
        <div className="cs-intel-kpis">
          {kpis.map(([label, val]) => <div key={label} className="cs-intel-kpi"><span>{label}</span><strong>{val}</strong></div>)}
        </div>
      )}

      {winners.length > 0 && (
        <Block title="Winners spotlight" noDivider>
          <div className="cs-intel-creative-grid">
            {winners.map((w) => (
              <div key={w.adId} className="cs-intel-creative-card">
                <CreativeThumbnail src={w.imageUrl || w.thumbnailUrl} />
                <div className="cs-intel-creative-card__body">
                  <div className="truncate">{w.adName || "(unnamed)"}</div>
                  <p>{w.grade ? `${w.grade} · ` : ""}{money(w.spend)}</p>
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}

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
                <CreativeThumbnail src={t.thumbnailUrl} />
                <div className="cs-intel-creative-card__body">
                  <div className="truncate" title={t.adName}>{t.adName}</div>
                  <p>{money(t.currentSpend)}{t.spendDelta != null ? ` · +${Math.round(t.spendDelta * 100)}% WoW` : " · new"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-neutral-400">No trending creatives{trending ? "" : " yet — click Refresh (needs Meta)"}.</p>}
      </Block>

      {topHooks.length > 0 && (
        <InsightSection title="Top hooks" tone="dark">
          <div className="cs-intel-ranked-list">{topHooks.map((h, i) => (
            <div key={i}><span>{i + 1}</span><p>“{h.text}” <small>{h.style ? `· ${h.style}` : ""} · {money(h.spend)}</small></p></div>
          ))}</div>
        </InsightSection>
      )}

      <div className="cs-intel-two-column">
        <AuditList title="Messaging themes" tone="orange" items={a.messaging_themes} render={(t) => (
          <div><span className="font-medium text-neutral-800">{str(t)}</span>{t?.spend_pct ? <span className="text-xs text-neutral-400"> · {Math.round(t.spend_pct)}% spend</span> : null}{t?.description ? <div className="text-xs text-neutral-500">{t.description}</div> : null}</div>
        )} />
        <AuditList title="Visual openers" tone="dark" items={a.visual_openers} render={(o) => <div className="text-neutral-700">{str(o)}</div>} />
      </div>

      <AuditList title="Messaging trends" tone="orange" items={a.messaging_trends} render={(t) => (
        <div><span className="font-medium text-neutral-800">{t.trend || str(t)}</span>{t?.spend_pct ? <span className="text-xs text-neutral-400"> · {Math.round(t.spend_pct)}%</span> : null}{t?.description ? <div className="text-xs text-neutral-500">{t.description}</div> : null}</div>
      )} />

      <AuditList title="Persona performance" tone="dark" items={a.persona_ad_mapping} render={(p) => (
        <div><span className="font-medium text-neutral-800">{p.matched_research_persona || p.persona_short_title || p.persona || str(p)}</span>
          <span className="text-xs text-neutral-400"> · {p.ad_count ?? 0} ads · {money(p.total_spend)}</span>
          {p.top_unmet_angle ? <div className="text-xs text-neutral-500">unmet: {p.top_unmet_angle}</div> : null}</div>
      )} />

      <AuditList title="Strategic patterns" tone="orange" items={a.patterns} render={(p) => (
        <div><span className="font-medium text-neutral-800">{p.pattern_name || str(p)}</span>{p?.insight ? <div className="text-xs text-neutral-500">{p.insight}</div> : null}</div>
      )} />

      <AuditList title="Untapped angles & gaps" items={a.angles_not_yet_tested || a.untapped_angles || a.prioritized_gaps}
        render={(g) => <Pill>{str(g)}</Pill>} wrap />

      {angles.length > 0 && <AngleGroups groups={angleGroups} />}

      <LearningTruths clientId={ctx.selectedBrandId} items={learnings} onChange={loadLearnings} setErr={setErr} />

      {recent.length > 0 && (
        <Block title="Recent launches">
          <ol className="cs-intel-recent-list">
            {recent.map((r, index) => (
              <li key={r.adId}>
                <span className="cs-intel-recent-list__number">{index + 1}</span>
                <strong>{r.adName || "(unnamed)"}</strong>
                <span className="cs-intel-recent-list__meta">
                  <span>{new Date(r.createdTime).toLocaleDateString()}</span>
                  <span>{money(r.spend)} spent</span>
                </span>
              </li>
            ))}
          </ol>
        </Block>
      )}

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

function gradeRank(g) { return { A: 4, B: 3, C: 2, D: 1 }[g] || 0; }

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

function AuditList({ title, items, render, wrap, tone }) {
  const arr = Array.isArray(items) ? items : items && typeof items === "object" ? Object.values(items) : [];
  if (!arr.length) return null;
  return (
    <InsightSection title={title} tone={tone}>
      <div className={wrap ? "flex flex-wrap gap-2" : "cs-intel-insight-list"}>
        {arr.slice(0, 12).map((it, i) => <div key={i}>{render(it)}</div>)}
      </div>
    </InsightSection>
  );
}
AuditList.propTypes = { title: PropTypes.string.isRequired, items: PropTypes.any, render: PropTypes.func.isRequired, wrap: PropTypes.bool, tone: PropTypes.oneOf(["dark", "orange"]) };

function Pill({ children }) {
  return <span className="cs-intel-pill">{children}</span>;
}
Pill.propTypes = { children: PropTypes.node };

function CreativeThumbnail({ src }) {
  return src
    ? <img src={src} alt="" className="cs-intel-thumbnail" />
    : <div className="cs-intel-thumbnail is-empty"><Zap className="h-5 w-5" /></div>;
}
CreativeThumbnail.propTypes = { src: PropTypes.string };

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
