// Generate — static image ads from a creative format + brand/product context.
// Pick a format, options (creativity / production style / aspect ratio /
// variations), Run → a background generate_ad job renders images to R2.
// JobStatus polls; results render as a signed-URL image grid.
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { creativeApi } from "@/lib/creativeApi";
import JobStatus from "../JobStatus";

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

export default function GenerateView({ ctx }) {
  const { selectedProduct, selectedProductId } = ctx;
  const [formats, setFormats] = useState([]);
  const [items, setItems] = useState([]);
  const [jobId, setJobId] = useState(null);
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

  if (!selectedProductId) {
    return <p className="text-sm text-neutral-400">Select a product (top bar) to generate ads.</p>;
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
      setJobId(jobId);
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
    <div className="space-y-5">
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
        <button onClick={run} className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm">Generate ads</button>
        {jobId && <JobStatus jobId={jobId} onDone={(job) => { if (job.status === "completed") setJobId(null); load(selectedProductId); }} />}
        <span className="text-sm text-neutral-400">{selectedProduct?.name} · needs product assets or analyzed image ads</span>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((it) => (
          <div key={it.id} className="rounded-2xl border border-neutral-200 overflow-hidden">
            {it.imageUrl
              ? <img src={it.imageUrl} alt={it.formatSlug || "generated ad"} className="w-full object-cover bg-neutral-50" />
              : <div className="aspect-square grid place-items-center text-xs text-neutral-400">image unavailable</div>}
            <div className="p-2 flex flex-wrap gap-1">
              <Tag>{it.model}</Tag>
              {it.formatSlug && <Tag>{it.formatSlug}</Tag>}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-neutral-400 col-span-full">No generated ads yet — pick a format and click Generate.</p>}
      </div>
    </div>
  );
}

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
