// Generate — static image ads from a creative format + brand/product context.
// Pick a format, options (creativity / production style / aspect ratio /
// variations), Run → a background generate_ad job renders images to R2.
// JobStatus polls; results render as a signed-URL image grid.
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Flame, Box } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBanner } from "../ui";
import { useJobRunner, JobBadge } from "../JobsContext";

const CREATIVITY = [
  { key: "inspired", label: "Inspired (fresh concept)" },
  { key: "remix", label: "Remix (faithful copy)" },
];
const PRODUCTION = [
  { key: "auto", label: "Auto" },
  { key: "native", label: "Native (UGC)" },
  { key: "studio", label: "Studio" },
];
const ASPECT = [
  { key: "", label: "Reference ratio" },
  { key: "1:1", label: "1:1" },
  { key: "4:5", label: "4:5" },
  { key: "9:16", label: "9:16" },
];

const TABS = [
  { key: "ads", label: "Ads (images)" },
  { key: "copy", label: "Copy" },
  { key: "brief", label: "Brief / Script" },
];

export default function GenerateView({ ctx }) {
  const { selectedProduct, selectedProductId } = ctx;
  const [mode, setMode] = useState("ads");
  const [formats, setFormats] = useState([]);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);

  const [formatSlug, setFormatSlug] = useState("");
  const [creativityMode, setCreativityMode] = useState("inspired");
  const [productionStyle, setProductionStyle] = useState("auto");
  const [aspectRatio, setAspectRatio] = useState("");
  const [variationCount, setVariationCount] = useState(2);
  const [userInputs, setUserInputs] = useState({});
  const [filling, setFilling] = useState(false);

  const load = async (pid) => {
    try { const r = await creativeApi.getGenerated(pid); setItems(r.items); }
    catch (e) { setErr(e.message); }
  };

  const rate = async (id, rating) => {
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, myRating: x.myRating === rating ? x.myRating : rating } : x))); // optimistic
    try { await creativeApi.rateGenerated(id, rating); } catch (e) { setErr(e.message); }
  };

  useEffect(() => {
    creativeApi.getFormats().then((r) => setFormats(r.formats)).catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (selectedProductId) load(selectedProductId); else setItems([]);
  }, [selectedProductId]);

  const selectedFormat = useMemo(
    () => formats.find((f) => f.slug === formatSlug) || null,
    [formats, formatSlug],
  );

  const { job, start } = useJobRunner({
    kind: "generate_ad", productId: selectedProductId, onComplete: () => load(selectedProductId),
  });

  if (!selectedProductId) {
    return <EmptyState icon={Box} title="No product selected" hint="Select a product in the top bar to generate ads, copy, or briefs." />;
  }

  const run = async () => {
    setErr(null);
    try {
      const fields = selectedFormat?.requiresUserInput || [];
      const cleanedInputs = {};
      for (const f of fields) {
        if (userInputs[f.key] != null && userInputs[f.key] !== "") cleanedInputs[f.key] = userInputs[f.key];
      }
      const { jobId } = await creativeApi.runGenerate({
        productId: selectedProductId,
        formatSlug: formatSlug || undefined,
        creativityMode,
        productionStyle,
        aspectRatio: aspectRatio || undefined,
        variationCount,
        userInputs: Object.keys(cleanedInputs).length ? cleanedInputs : undefined,
      });
      start(jobId);
    } catch (e) { setErr(e.message); }
  };

  const autofill = async () => {
    setErr(null);
    setFilling(true);
    try {
      const { user_inputs } = await creativeApi.fillCopy({ productId: selectedProductId, formatSlug });
      setUserInputs((u) => ({ ...u, ...(user_inputs || {}) }));
    } catch (e) { setErr(e.message); }
    finally { setFilling(false); }
  };

  const hasInputFields = (selectedFormat?.requiresUserInput || []).length > 0;

  return (
    <Tabs value={mode} onValueChange={setMode} className="space-y-5">
      <TabsList>
        {TABS.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
      </TabsList>

      <TabsContent value="copy"><CopyPanel productId={selectedProductId} productName={selectedProduct?.name} /></TabsContent>
      <TabsContent value="brief"><BriefPanel productId={selectedProductId} productName={selectedProduct?.name} /></TabsContent>

      <TabsContent value="ads" className="space-y-5">
      <div className="grid grid-cols-2 gap-3 max-w-2xl">
        <Field label="Format">
          <select value={formatSlug} onChange={(e) => { setFormatSlug(e.target.value); setUserInputs({}); }}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm">
            <option value="">Auto (no specific format)</option>
            {formats.map((f) => <option key={f.slug} value={f.slug}>{f.category}</option>)}
          </select>
        </Field>
        <Field label="Variations">
          <input type="number" min={1} max={8} value={variationCount}
            onChange={(e) => setVariationCount(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Creativity">
          <Pills options={CREATIVITY} value={creativityMode} onChange={setCreativityMode} />
        </Field>
        <Field label="Production">
          <Pills options={PRODUCTION} value={productionStyle} onChange={setProductionStyle} />
        </Field>
        <Field label="Aspect ratio">
          <Pills options={ASPECT} value={aspectRatio} onChange={setAspectRatio} />
        </Field>
      </div>

      {hasInputFields && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Concept inputs</span>
          <button type="button" onClick={autofill} disabled={filling}
            className="rounded-xl border border-neutral-200 px-3 py-1 text-xs text-neutral-700 disabled:opacity-50">
            {filling ? "Filling…" : "Auto-fill copy ✨"}
          </button>
        </div>
      )}

      {hasInputFields && (
        <div className="grid grid-cols-2 gap-3 max-w-2xl">
          {selectedFormat.requiresUserInput.map((f) => (
            <Field key={f.key} label={f.label || f.key}>
              {f.type === "textarea" ? (
                <textarea rows={3} placeholder={f.placeholder || ""} value={userInputs[f.key] ?? ""}
                  onChange={(e) => setUserInputs((u) => ({ ...u, [f.key]: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" />
              ) : (
                <input type={f.type === "number" ? "number" : "text"} placeholder={f.placeholder || ""} value={userInputs[f.key] ?? ""}
                  onChange={(e) => setUserInputs((u) => ({ ...u, [f.key]: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" />
              )}
            </Field>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={run} size="sm" className="rounded-xl">Generate ads</Button>
        <JobBadge job={job} />
        <span className="text-sm text-neutral-400">{selectedProduct?.name} · needs product assets or analyzed image ads</span>
      </div>
      <ErrorBanner message={err} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((it) => (
          <div key={it.id} className="rounded-2xl border border-neutral-200 overflow-hidden">
            {it.imageUrl
              ? <img src={it.imageUrl} alt={it.formatSlug || "generated ad"} className="w-full object-cover bg-neutral-50" />
              : <div className="aspect-square grid place-items-center text-xs text-neutral-400">image unavailable</div>}
            <div className="p-2 flex flex-wrap items-center gap-1">
              <Tag>{it.model}</Tag>
              {it.formatSlug && <Tag>{it.formatSlug}</Tag>}
              <span className="flex-1" />
              <button onClick={() => rate(it.id, "up")} className={`text-xs px-1 ${it.myRating === "up" ? "text-green-600" : "text-neutral-300 hover:text-neutral-500"}`}>▲</button>
              <button onClick={() => rate(it.id, "down")} className={`text-xs px-1 ${it.myRating === "down" ? "text-red-600" : "text-neutral-300 hover:text-neutral-500"}`}>▼</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full">
            <EmptyState icon={Flame} title="No generated ads yet" hint="Pick a format and click Generate ads. Needs product assets or analyzed image ads." />
          </div>
        )}
      </div>
      </TabsContent>
    </Tabs>
  );
}

// ── Copy panel — N hooks / headlines / primary texts for one persona ─────────
const COPY_TYPES = [
  { key: "hook", label: "Hooks" },
  { key: "headline", label: "Headlines" },
  { key: "primary_text", label: "Primary text" },
];

function CopyPanel({ productId, productName }) {
  const [personas, setPersonas] = useState([]);
  const [copyType, setCopyType] = useState("hook");
  const [avatar, setAvatar] = useState("");
  const [count, setCount] = useState(8);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [saved, setSaved] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!productId) { setPersonas([]); return; }
    creativeApi.getResearch(productId)
      .then((r) => {
        const p = r.intel?.personas?.personas || (Array.isArray(r.intel?.personas) ? r.intel.personas : []);
        setPersonas(p.map((x) => x.name || x.label).filter(Boolean));
      })
      .catch(() => setPersonas([]));
  }, [productId]);

  const run = async () => {
    setErr(null); setBusy(true); setResults([]); setSaved(null);
    try {
      const r = await creativeApi.generateCopy({ productId, copyType, count, selectedAvatar: avatar || undefined });
      setResults(r.results || []);
      setSaved(r.saved ?? 0);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-2xl">
        <Field label="Type"><Pills options={COPY_TYPES} value={copyType} onChange={setCopyType} /></Field>
        <Field label="Count">
          <input type="number" min={1} max={20} value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" />
        </Field>
        <Field label="Persona">
          <select value={avatar} onChange={(e) => setAvatar(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm">
            <option value="">Auto (first persona)</option>
            {personas.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={run} disabled={busy} className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm disabled:opacity-50">
          {busy ? "Generating…" : "Generate copy"}
        </button>
        <span className="text-sm text-neutral-400">{productName} · saved to Library as drafts</span>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {saved != null && <p className="text-xs text-green-600">{results.length} generated · {saved} saved to Library</p>}
      <div className="space-y-2 max-w-2xl">
        {results.map((r, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 p-3 text-sm whitespace-pre-wrap">{r}</div>
        ))}
      </div>
    </div>
  );
}
CopyPanel.propTypes = { productId: PropTypes.string, productName: PropTypes.string };

// ── Brief panel — strategist picks a concept, then writes a script/static brief ─
const BRIEF_FORMAT = [
  { key: "", label: "Auto (picker decides)" },
  { key: "video", label: "Video script" },
  { key: "static", label: "Static brief" },
];

function BriefPanel({ productId, productName }) {
  const [format, setFormat] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  const run = async () => {
    setErr(null); setBusy(true); setData(null);
    try {
      const r = await creativeApi.generateConceptBrief({ productId, format: format || undefined, notes: notes || undefined });
      setData(r);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const c = data?.concept;
  const b = data?.brief;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-2xl">
        <Field label="Format"><Pills options={BRIEF_FORMAT} value={format} onChange={setFormat} /></Field>
        <Field label="Notes (optional steer)">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. lean into the new bundle offer"
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={run} disabled={busy} className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm disabled:opacity-50">
          {busy ? "Working… (picks a concept, then writes)" : "Generate brief"}
        </button>
        <span className="text-sm text-neutral-400">{productName}</span>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}

      {c && (
        <div className="rounded-2xl border border-neutral-200 p-4 space-y-1 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{c.concept_name}</span>
            <Tag>{b?.format}</Tag>
            {c.persona_label && <Tag>{c.persona_label}</Tag>}
            {c.awareness_stage && <Tag>{c.awareness_stage}</Tag>}
            {c.gap_or_extension && <Tag>{c.gap_or_extension}</Tag>}
          </div>
          {c.hypothesis && <p className="text-xs text-neutral-600"><b>Hypothesis:</b> {c.hypothesis}</p>}
          {c.angle && <p className="text-xs text-neutral-600"><b>Angle:</b> {c.angle}</p>}
          {c.concept_direction && <p className="text-xs text-neutral-600"><b>Direction:</b> {c.concept_direction}</p>}
        </div>
      )}

      {b && (b.format === "video" ? (
        <div className="space-y-3 max-w-3xl">
          {b.hooks?.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Hooks</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">{b.hooks.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </div>
          )}
          {b.script && (
            <div className="rounded-2xl border border-neutral-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Script</p>
              <pre className="text-sm whitespace-pre-wrap font-sans">{b.script}</pre>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {b.headlines?.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Headlines</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">{b.headlines.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </div>
          )}
          {b.static_brief && (
            <div className="rounded-2xl border border-neutral-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Static brief</p>
              <pre className="text-sm whitespace-pre-wrap font-sans">{b.static_brief}</pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
BriefPanel.propTypes = { productId: PropTypes.string, productName: PropTypes.string };

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
Field.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node };

function Pills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.key} type="button" onClick={() => onChange(o.key)}
          className={`rounded-xl px-2.5 py-1 text-xs border ${value === o.key ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
Pills.propTypes = { options: PropTypes.array.isRequired, value: PropTypes.string, onChange: PropTypes.func.isRequired };

function Tag({ children }) {
  return <span className="text-xs rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-500">{children}</span>;
}
Tag.propTypes = { children: PropTypes.node };

GenerateView.propTypes = { ctx: PropTypes.object.isRequired };
