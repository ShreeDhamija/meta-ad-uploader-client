import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { FlaskConical, Settings2, Check, ArrowRight, RotateCcw } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import ModelSelection from "../ModelSelection";
import { defaultSelection } from "../model-selection";
import "../models.css";

const GROUPS = { copy: "Copy", strategy: "Strategy", analysis: "Analysis", images: "Images", research: "Research", utility: "Utilities", uploader: "Uploader & analytics" };
const TEST_NAMES = { "copy.generate.hook": "Hooks", "copy.generate.headline": "Headlines", "copy.generate.primary_text": "Primary text", "image.generate": "Image prompt" };
const money = value => `$${Number(value || 0).toFixed(4)}`;
const running = exp => ["queued", "running"].includes(exp?.status);

export default function ModelsView({ ctx }) {
  const [catalog, setCatalog] = useState(null), [draft, setDraft] = useState({});
  const [advanced, setAdvanced] = useState(false), [tab, setTab] = useState("defaults");
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState("copy.generate.headline"), [a, setA] = useState(null), [b, setB] = useState(null);
  const [compare, setCompare] = useState(true), [prompt, setPrompt] = useState(""), [ratio, setRatio] = useState("1:1"), [cap, setCap] = useState(5);
  const [assets, setAssets] = useState([]), [referenceAssetId, setReferenceAssetId] = useState("");
  const [quote, setQuote] = useState(null), [experiment, setExperiment] = useState(null), [history, setHistory] = useState([]), [revisions, setRevisions] = useState([]);
  async function load() {
    setError("");
    try {
      const [data, tests, saved] = await Promise.all([creativeApi.getModels(), creativeApi.listModelTests(), creativeApi.getModelRevisions()]);
      setCatalog(data); setDraft(data.resolved.selections); setHistory(tests.experiments || []); setRevisions(saved.revisions || []);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    let active = true; setAssets([]); setReferenceAssetId(""); setExperiment(null);
    if (ctx.selectedProductId) creativeApi.getAssets(ctx.selectedProductId).then(r => { if (active) setAssets((r.assets || []).filter(a => a.assetUrl?.startsWith("product-assets/"))); }).catch(() => {});
    return () => { active = false; };
  }, [ctx.selectedProductId]);
  useEffect(() => {
    if (!catalog) return;
    const op = catalog.operations.find(o => o.id === operation);
    const available = catalog.models.filter(m => op.models.includes(m.id) && m.availability !== "missing_credentials");
    setA(draft[operation] || defaultSelection(available[0], op));
    const other = available.find(m => m.id !== draft[operation]?.model) || available[0];
    setB(other ? defaultSelection(other, op) : null); setQuote(null);
    // Selections reset on operation/catalog changes, not on unrelated draft edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, operation]);
  useEffect(() => { setQuote(null); }, [ctx.selectedProductId, a, b, compare, prompt, ratio, cap, referenceAssetId]);
  const experimentId = experiment?.id, experimentStatus = experiment?.status;
  useEffect(() => {
    if (!["queued", "running"].includes(experimentStatus)) return;
    let stopped = false;
    const id = experimentId;
    const timer = setInterval(async () => {
      try {
        const next = await creativeApi.getModelTest(id);
        if (!stopped) { setExperiment(next); if (!running(next)) creativeApi.listModelTests().then(r => setHistory(r.experiments || [])); }
      } catch (e) { if (!stopped) setError(e.message); }
    }, 2500);
    return () => { stopped = true; clearInterval(timer); };
  }, [experimentId, experimentStatus]);
  async function act(fn) {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function save() {
    await creativeApi.saveModelProfile(draft, catalog.profile.revision);
    await load(); setNotice("Saved. New manual and scheduled runs will use these models.");
  }
  async function estimate() {
    const result = await creativeApi.quoteModelTest({ productId: ctx.selectedProductId, operation, variants: compare ? [a, b] : [a], prompt, referenceAssetId: referenceAssetId || undefined, aspectRatio: ratio, spendCapUsd: Number(cap) });
    setQuote(result);
  }
  async function start() {
    await creativeApi.startModelTest(quote.id);
    setExperiment(await creativeApi.getModelTest(quote.id)); setQuote(null);
  }
  const productHistory = history.filter(item => item.productId === ctx.selectedProductId);
  if (!catalog) return <div className="cs-models"><p>{error || "Loading model settings…"}</p>{error && <button type="button" onClick={load}>Try again</button>}</div>;
  return <div className="cs-models">
    <div className="cs-model-intro"><div><span className="cs-model-eyebrow">YOUR AI WORKSPACE</span><h2>Choose how your ideas take shape.</h2><p>Set your preferred models or compare two configurations on the same input.</p></div><span className="cs-model-env">{catalog.environment}</span></div>
    <div className="cs-model-tabs" role="tablist" aria-label="Model tools">
      <button role="tab" aria-selected={tab === "defaults"} onClick={() => setTab("defaults")}><Settings2 size={16} /> My defaults</button>
      <button role="tab" aria-selected={tab === "test"} onClick={() => setTab("test")}><FlaskConical size={16} /> Test models</button>
    </div>
    {error && <div role="alert" className="cs-model-error">{error}</div>}{notice && <div role="status" className="cs-model-notice"><Check size={16} />{notice}</div>}
    {tab === "defaults" ? <>
      <div className="cs-model-toolbar"><p>Applies across your brands. Running jobs keep their original choices.</p><label className="cs-model-toggle"><input type="checkbox" checked={advanced} onChange={e => setAdvanced(e.target.checked)} /> Per-operation controls</label></div>
      <div className="cs-model-group-grid">{Object.entries(GROUPS).map(([group, label]) => {
        const ops = catalog.operations.filter(op => op.group === group && op.id !== "image.edit");
        const common = catalog.models.filter(m => ops.every(op => op.models.includes(m.id)));
        const uniform = ops.every(op => draft[op.id]?.model === draft[ops[0].id]?.model);
        return <section className="cs-model-card" key={group}><div className="cs-model-card-heading"><h3>{label}</h3><span>{ops.length} operations</span></div>
          <label className="cs-model-group-select"><span>Default model</span><select disabled={busy} value={uniform ? draft[ops[0].id]?.model : ""} onChange={e => {
            const model = catalog.models.find(m => m.id === e.target.value);
            setDraft(current => ({ ...current, ...Object.fromEntries(ops.map(op => [op.id, defaultSelection(model, op)])) }));
          }}><option value="" disabled>Mixed selections</option>{common.map(m => <option key={m.id} value={m.id} disabled={m.availability === "missing_credentials"}>{m.label}{m.availability === "missing_credentials" ? " — key required" : ""}</option>)}</select></label>
          {group === "images" && <p className="cs-model-help">Paired portrait edits keep the model, quality and resolution used for the original image.</p>}
          {group === "analysis" && <p className="cs-model-help">Group choices support video and audio. Individual text and image tasks offer more providers.</p>}
          {group === "strategy" && <p className="cs-model-help">The weekly tool loop uses Claude. Other strategy tasks also support Gemini and OpenAI.</p>}
          {(advanced || group === "images") && <div className="cs-model-operation-list">{ops.map(op => <ModelSelection key={op.id} catalog={catalog} operationId={op.id} label={op.label} value={draft[op.id]} disabled={busy} onChange={value => setDraft(current => ({ ...current, [op.id]: value }))} />)}</div>}
        </section>;
      })}</div>
      <div className="cs-model-save"><button className="cs-model-primary" disabled={busy} onClick={() => act(save)}>{busy ? "Saving…" : "Save as my default"}<ArrowRight size={16} /></button>
        <button className="cs-model-secondary" disabled={busy} onClick={() => setDraft(catalog.resolved.selections)}><RotateCcw size={15} /> Discard edits</button>
        {revisions.length > 0 && <label><span>Restore a saved version</span><select defaultValue="" onChange={e => { const r = revisions.find(r => r.revision === e.target.value); if (r) { setDraft(r.selections); setNotice("Version loaded. Save to apply it to new runs."); } }}><option value="" disabled>Choose version…</option>{revisions.map(r => <option key={r.revision} value={r.revision}>{new Date(r.updatedAt).toLocaleString()}</option>)}</select></label>}
      </div>
    </> : <>
      <section className="cs-model-card"><div className="cs-model-card-heading"><h3>A small, controlled test</h3><span>1 input · up to 2 models</span></div>
        <p className="cs-model-help">Copy tests use the selected product’s current context and existing prompts. Image tests use your exact prompt. Results remain private test outputs until you accept them.</p>
        <div className="cs-model-test-controls"><label><span>Operation</span><select value={operation} onChange={e => setOperation(e.target.value)}>{catalog.testOperations.map(op => <option key={op} value={op}>{TEST_NAMES[op]}</option>)}</select></label><label><span>Test mode</span><select value={compare ? "compare" : "single"} onChange={e => setCompare(e.target.value === "compare")}><option value="compare">Compare two configurations</option><option value="single">Test one configuration</option></select></label><label><span>Test allowance (USD)</span><input type="number" min="0.1" max="50" step="0.5" value={cap} onChange={e => setCap(e.target.value)} /></label></div>
        {operation === "image.generate" && <div className="cs-model-image-input"><label><span>Image prompt</span><textarea rows={4} value={prompt} maxLength={12000} onChange={e => setPrompt(e.target.value)} placeholder="Describe the ad, composition, exact copy, brand colors, and visual style…" /></label><label><span>Aspect ratio</span><select value={ratio} onChange={e => setRatio(e.target.value)}><option>1:1</option><option>4:5</option><option>9:16</option></select></label></div>}
        {operation === "image.generate" && <label style={{ marginTop: 16 }}><span>Product image reference (optional)</span><select value={referenceAssetId} onChange={e => setReferenceAssetId(e.target.value)}><option value="">No reference image</option>{assets.map(asset => <option key={asset.id} value={asset.id}>{asset.description || asset.assetType || "Product image"}</option>)}</select><p className="cs-model-help">Uploaded product images are frozen with the prompt so each model receives the same reference.</p></label>}
        <div className="cs-model-variants"><div><span className="cs-model-eyebrow">CONFIGURATION A</span><ModelSelection catalog={catalog} operationId={operation} value={a} onChange={setA} /></div>{compare && <div><span className="cs-model-eyebrow">CONFIGURATION B</span><ModelSelection catalog={catalog} operationId={operation} value={b} onChange={setB} /></div>}</div>
        <div className="cs-model-save"><button className="cs-model-primary" disabled={busy || !ctx.selectedProductId || !a || (compare && !b) || running(experiment)} onClick={() => act(estimate)}>Review test estimate<ArrowRight size={16} /></button>{!ctx.selectedProductId && <p className="cs-model-help">Select a product to run a test.</p>}</div>
        {quote && <div className="cs-model-quote"><div><strong>Conservative test estimate: {money(quote.estimatedUsd)}</strong><p>Same frozen input for both runs. No application cache is used. Token usage may differ. This allowance is an estimate; final provider charges can vary.</p></div><button className="cs-model-primary" disabled={busy} onClick={() => act(start)}>{compare ? "Run paid comparison" : "Run paid test"}</button></div>}
      </section>
      {experiment && <section className="cs-model-results"><div className="cs-model-card-heading"><h3>{TEST_NAMES[experiment.operation]} results</h3><span>{experiment.status}</span>{running(experiment) && <button className="cs-model-secondary" disabled={busy} onClick={() => act(async () => { await creativeApi.cancelModelTest(experiment.id); setNotice("Cancellation requested. Completed provider work remains billed."); })}>Cancel remaining work</button>}</div>
        <p className="cs-model-help">Input {experiment.snapshotHash.slice(0, 12)} · {new Date(experiment.createdAt).toLocaleString()} · Application cache bypassed{experiment.startedAt && ` · Queue ${((Date.parse(experiment.startedAt) - Date.parse(experiment.createdAt)) / 1000).toFixed(1)}s`}</p>
        <div className="cs-model-variants">{experiment.variants.map(v => <Result key={`${experiment.id}:${v.id}`} variant={v} catalog={catalog} canEdit={!running(experiment)} onAccept={() => act(async () => { await creativeApi.acceptModelTest(experiment.id, v.id); setExperiment(await creativeApi.getModelTest(experiment.id)); })} onRate={(rating, notes) => act(async () => { await creativeApi.rateModelTest(experiment.id, v.id, rating, notes); setNotice("Rating saved."); })} />)}</div>
      </section>}
      {productHistory.length > 0 && <section className="cs-model-card"><h3>Recent tests</h3><div className="cs-model-history">{productHistory.map(item => <button key={item.id} onClick={() => act(async () => setExperiment(await creativeApi.getModelTest(item.id)))}><span>{TEST_NAMES[item.operation]} <small>{item.variants.map(v => catalog.models.find(m => m.id === v.selection.model)?.label || v.selection.model).join(" / ")}</small></span><span>{item.status} · {new Date(item.createdAt).toLocaleDateString()}</span></button>)}</div></section>}
    </>}
  </div>;
}
ModelsView.propTypes = { ctx: PropTypes.object.isRequired };

function Result({ variant: v, catalog, canEdit, onAccept, onRate }) {
  const [rating, setRating] = useState(v.rating || 3), [notes, setNotes] = useState(v.notes || "");
  const events = v.events || [], tokens = events.reduce((a, e) => ({ input: a.input + (e.input_tokens || 0), output: a.output + (e.output_tokens || 0) }), { input: 0, output: 0 });
  return <article className="cs-model-result"><div className="cs-model-card-heading"><h4>{catalog.models.find(m => m.id === v.selection.model)?.label || v.selection.model}</h4><span>{v.status}</span></div>
    <p className="cs-model-help">{Object.entries(v.selection).filter(([k]) => k !== "model").map(([k, val]) => `${k}: ${val}`).join(" · ")}{v.actualSize && ` · Actual size: ${v.actualSize}`}</p>
    {v.imageUrl && <img src={v.imageUrl} alt="Model test output" />}{v.text && <pre>{v.items?.join("\n\n") || v.text}</pre>}{v.error && <p className="cs-model-error">{v.error}</p>}
    {v.events && <div className="cs-model-metrics"><span><strong>{v.accountingComplete ? money(v.costUsd) : `${money(v.costUsd)} + unknown`}</strong>estimated cost</span><span><strong>{((v.providerMs || 0) / 1000).toFixed(1)}s</strong>provider time</span><span><strong>{tokens.input.toLocaleString()} / {tokens.output.toLocaleString()}</strong>input / output tokens</span></div>}
    {events.length > 0 && <details><summary>Usage details</summary><pre>{JSON.stringify(events.map(e => ({ requestedModel: e.requested_model, actualModel: e.model, attempt: e.attempt, usage: e.usage_metadata, requestId: e.provider_request_id, finishReason: e.finish_reason, accountingComplete: e.cost_usd !== null })), null, 2)}</pre></details>}
    {v.status === "completed" && canEdit && <><button className="cs-model-secondary" disabled={v.promoted} onClick={onAccept}>{v.promoted ? "Accepted" : v.imageUrl ? "Accept to generated ads" : "Accept to draft library"}</button><div className="cs-model-rating"><label><span>Your rating</span><select value={rating} onChange={e => setRating(Number(e.target.value))}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></label><label><span>Notes</span><textarea rows={2} maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What worked? What would you change?" /></label><button className="cs-model-secondary" onClick={() => onRate(rating, notes)}>Save rating</button></div></>}
  </article>;
}
Result.propTypes = { variant: PropTypes.object.isRequired, catalog: PropTypes.object.isRequired, canEdit: PropTypes.bool, onAccept: PropTypes.func.isRequired, onRate: PropTypes.func.isRequired };
