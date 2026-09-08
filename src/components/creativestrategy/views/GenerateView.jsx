// Generate workspace — statics, video scripts, and briefs share one shell while
// retaining their existing API flows.
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Box, ClipboardList, FileText, Flame, Loader2, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorBanner } from "../ui";
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
  { key: "reference", label: "Reference ratio" },
  { key: "1:1", label: "1:1" },
  { key: "4:5", label: "4:5" },
  { key: "9:16", label: "9:16" },
];
const MODES = [
  { key: "statics", label: "Statics" },
  { key: "scripts", label: "Scripts" },
  { key: "briefs", label: "Briefs" },
];

const HISTORY_LIMIT = 20;
const historyKey = (productId, type) => `creative-strategy:generate-history:${productId}:${type}`;

function readHistory(productId, type) {
  if (!productId || typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(historyKey(productId, type)) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveHistory(productId, type, batches) {
  const next = batches.slice(0, HISTORY_LIMIT);
  if (!productId || typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(historyKey(productId, type), JSON.stringify(next));
  } catch {
    // A full or unavailable local store should not block generation results.
  }
  return next;
}

function createHistoryBatch(payload) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...payload,
  };
}

export default function GenerateView({ ctx }) {
  const { selectedProductId } = ctx;
  const [mode, setMode] = useState("statics");
  const [formats, setFormats] = useState([]);
  const [formatsLoading, setFormatsLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [generatedLoading, setGeneratedLoading] = useState(false);

  const [formatSlug, setFormatSlug] = useState("");
  const [creativityMode, setCreativityMode] = useState("inspired");
  const [productionStyle, setProductionStyle] = useState("auto");
  const [aspectRatio, setAspectRatio] = useState("");
  const [variationCount, setVariationCount] = useState(2);
  const [userInputs, setUserInputs] = useState({});
  const [filling, setFilling] = useState(false);

  const load = async (productId) => {
    if (!productId) { setItems([]); return; }
    setGeneratedLoading(true);
    try {
      const response = await creativeApi.getGenerated(productId);
      setItems(response.items || []);
    } catch (error) {
      setErr(error.message);
    } finally {
      setGeneratedLoading(false);
    }
  };

  useEffect(() => {
    setFormatsLoading(true);
    creativeApi.getFormats()
      .then((response) => setFormats(response.formats || []))
      .catch((error) => setErr(error.message))
      .finally(() => setFormatsLoading(false));
  }, []);

  useEffect(() => { load(selectedProductId); }, [selectedProductId]);

  const selectedFormat = useMemo(
    () => formats.find((format) => format.slug === formatSlug) || null,
    [formats, formatSlug],
  );

  const { job, start } = useJobRunner({
    kind: "generate_ad",
    productId: selectedProductId,
    onComplete: () => load(selectedProductId),
  });

  const runStatics = async () => {
    if (!selectedProductId) return;
    setErr(null);
    try {
      const cleanedInputs = {};
      for (const field of selectedFormat?.requiresUserInput || []) {
        if (userInputs[field.key] != null && userInputs[field.key] !== "") cleanedInputs[field.key] = userInputs[field.key];
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
    } catch (error) {
      setErr(error.message);
    }
  };

  const autofill = async () => {
    if (!selectedProductId || !formatSlug) return;
    setErr(null);
    setFilling(true);
    try {
      const response = await creativeApi.fillCopy({ productId: selectedProductId, formatSlug });
      setUserInputs((current) => ({ ...current, ...(response.user_inputs || {}) }));
    } catch (error) {
      setErr(error.message);
    } finally {
      setFilling(false);
    }
  };

  const rate = async (id, rating) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, myRating: rating } : item)));
    try { await creativeApi.rateGenerated(id, rating); } catch (error) { setErr(error.message); }
  };

  const inputFields = selectedFormat?.requiresUserInput || [];
  const imageItems = items.filter((item) => item.imageUrl);
  const generationActive = job && (job.status == null || job.status === "queued" || job.status === "running");

  return (
    <div className="cs-generate-view">
      <div className="cs-generate-tabs-row">
        <div className="cs-generate-switcher" aria-label="Generate mode">
          {MODES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMode(item.key)}
              className={`cs-generate-switcher__item ${mode === item.key ? "is-active" : ""}`}
              aria-pressed={mode === item.key}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "statics" && (
        <GenerateWorkspace
          sidebar={(
            <>
              <div className="space-y-4">
                {formatsLoading ? (
                  <SidebarLoading label="Loading formats…" />
                ) : (
                  <SidebarSelect
                    label="Format"
                    value={formatSlug || "auto"}
                    onChange={(value) => { setFormatSlug(value === "auto" ? "" : value); setUserInputs({}); }}
                    options={[{ key: "auto", label: "Auto format" }, ...formats.map((format) => ({ key: format.slug, label: format.category }))]}
                  />
                )}
                <SidebarNumber label="Variations" value={variationCount} min={1} max={8} onChange={setVariationCount} />
                <SidebarSelect label="Creativity" value={creativityMode} onChange={setCreativityMode} options={CREATIVITY} />
                <SidebarSelect label="Aspect Ratio" value={aspectRatio || "reference"} onChange={(value) => setAspectRatio(value === "reference" ? "" : value)} options={ASPECT} />
                <SidebarSelect label="Production" value={productionStyle} onChange={setProductionStyle} options={PRODUCTION} />

                {inputFields.length > 0 && (
                  <div className="cs-generate-sidebar__group space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#6c3403]">Concept inputs</span>
                      <button type="button" onClick={autofill} disabled={filling || !formatSlug} className="cs-generate-autofill">
                        <Sparkles className="h-3.5 w-3.5" /> {filling ? "Filling…" : "Auto-fill"}
                      </button>
                    </div>
                    {inputFields.map((field) => (
                      <SidebarInput
                        key={field.key}
                        label={field.label || field.key}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={userInputs[field.key] ?? ""}
                        onChange={(value) => setUserInputs((current) => ({ ...current, [field.key]: value }))}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-auto space-y-3 pt-5">
                <JobBadge job={job} />
                <button type="button" onClick={runStatics} disabled={!selectedProductId} className="cs-primary-button w-full">
                  Generate Ads
                </button>
              </div>
            </>
          )}
        >
          <ErrorBanner message={err} />
          {!selectedProductId ? (
            <WorkspaceEmpty icon={Box} title="Select a product" hint="Choose a brand and product above to configure and generate static ads." />
          ) : formatsLoading || (generatedLoading && imageItems.length === 0) ? (
            <GenerateLoading label={formatsLoading ? "Loading generation options…" : "Loading previous images…"} />
          ) : generationActive ? (
            <GenerateLoading label="Generating static variations…" />
          ) : imageItems.length === 0 ? (
            <WorkspaceEmpty icon={Flame} title="No generated ads yet" hint="Choose your settings in the sidebar and generate the first variations." />
          ) : (
            <GenerationGrid items={imageItems} rate={rate} />
          )}
        </GenerateWorkspace>
      )}

      {mode === "scripts" && <ScriptsPanel productId={selectedProductId} />}
      {mode === "briefs" && <BriefPanel productId={selectedProductId} />}
    </div>
  );
}

function ScriptsPanel({ productId }) {
  const [personas, setPersonas] = useState([]);
  const [personasLoading, setPersonasLoading] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [count, setCount] = useState(3);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [batches, setBatches] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setBatches(readHistory(productId, "scripts"));
    if (!productId) { setPersonas([]); setPersonasLoading(false); return; }
    setPersonasLoading(true);
    creativeApi.getResearch(productId)
      .then((response) => {
        const found = response.intel?.personas?.personas || (Array.isArray(response.intel?.personas) ? response.intel.personas : []);
        setPersonas(found.map((persona) => persona.name || persona.label).filter(Boolean));
      })
      .catch(() => setPersonas([]))
      .finally(() => setPersonasLoading(false));
  }, [productId]);

  const run = async () => {
    if (!productId) return;
    setErr(null); setBusy(true);
    try {
      const response = await creativeApi.generateVideoScripts({
        productId,
        count,
        selectedAvatar: avatar || undefined,
        notes: notes || undefined,
      });
      const batch = createHistoryBatch({ items: response.items || [] });
      setBatches((current) => saveHistory(productId, "scripts", [batch, ...current]));
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GenerateWorkspace
      sidebar={(
        <>
          <div className="space-y-4">
            <p className="cs-generate-sidebar-description">Generates the requested number of concept-led Meta video scripts, each with three hook options.</p>
            <SidebarNumber label="Count" value={count} min={1} max={8} onChange={setCount} />
            {personasLoading ? (
              <SidebarLoading label="Loading personas…" />
            ) : (
              <SidebarSelect
                label="Persona"
                value={avatar || "auto"}
                onChange={(value) => setAvatar(value === "auto" ? "" : value)}
                options={[{ key: "auto", label: "Auto persona" }, ...personas.map((persona) => ({ key: persona, label: persona }))]}
              />
            )}
            <SidebarInput
              label="Direction (optional)"
              type="textarea"
              value={notes}
              onChange={setNotes}
              placeholder="e.g. focus on the bundle offer or a specific persona"
            />
          </div>
          <button type="button" onClick={run} disabled={!productId || busy || personasLoading} className="cs-primary-button mt-auto w-full">
            {busy ? `Writing ${count} Script${count === 1 ? "" : "s"}…` : `Generate ${count} Video Script${count === 1 ? "" : "s"}`}
          </button>
        </>
      )}
    >
      <ErrorBanner message={err} />
      {!productId ? (
        <WorkspaceEmpty icon={Box} title="Select a product" hint="Choose a product above before generating a video script." />
      ) : busy ? (
        <GenerateLoading label={`Writing ${count} video script${count === 1 ? "" : "s"}…`} />
      ) : batches.length === 0 ? (
        <WorkspaceEmpty icon={FileText} title="Video script generation" hint="Generate a concept-led video ad script with three opening hooks." />
      ) : (
        <div className="space-y-5">
          {batches.map((batch, batchIndex) => (
            <GenerationBatch key={batch.id} createdAt={batch.createdAt} isLatest={batchIndex === 0}>
              <div className="space-y-7">
                {(batch.items || []).map((item, itemIndex) => {
                  const concept = item.concept;
                  const brief = item.brief;
                  return (
                    <section key={`${concept?.concept_name || "script"}-${itemIndex}`} className="space-y-4">
                      {(batch.items || []).length > 1 && <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8a746c]">Video Script {itemIndex + 1}</p>}
                      {concept && (
                        <div className="cs-generate-result space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{concept.concept_name}</span>
                            <Tag>video</Tag>
                            {concept.persona_label && <Tag>{concept.persona_label}</Tag>}
                            {concept.awareness_stage && <Tag>{concept.awareness_stage}</Tag>}
                          </div>
                          {concept.hypothesis && <p><strong>Hypothesis:</strong> {concept.hypothesis}</p>}
                          {concept.angle && <p><strong>Angle:</strong> {concept.angle}</p>}
                          {concept.concept_direction && <p><strong>Direction:</strong> {concept.concept_direction}</p>}
                        </div>
                      )}
                      {brief?.hooks?.length > 0 && <ResultSection title="Hooks"><ul className="list-disc space-y-1 pl-5">{brief.hooks.map((hook, index) => <li key={index}>{hook}</li>)}</ul></ResultSection>}
                      {brief?.script && <ResultSection title="Video Script"><pre className="whitespace-pre-wrap font-sans">{brief.script}</pre></ResultSection>}
                    </section>
                  );
                })}
              </div>
            </GenerationBatch>
          ))}
        </div>
      )}
    </GenerateWorkspace>
  );
}

const BRIEF_FORMATS = [
  { key: "auto", label: "Auto (picker decides)" },
  { key: "video", label: "Video script" },
  { key: "static", label: "Static brief" },
];

function BriefPanel({ productId }) {
  const [format, setFormat] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [batches, setBatches] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setBatches(readHistory(productId, "briefs"));
  }, [productId]);

  const run = async () => {
    if (!productId) return;
    setErr(null); setBusy(true);
    try {
      const data = await creativeApi.generateConceptBrief({ productId, format: format || undefined, notes: notes || undefined });
      const batch = createHistoryBatch({ data });
      setBatches((current) => saveHistory(productId, "briefs", [batch, ...current]));
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GenerateWorkspace
      sidebar={(
        <>
          <div className="space-y-4">
            <p className="cs-generate-sidebar-description">Builds a concept-led video script or static creative brief with hooks, headlines, and production direction.</p>
            <SidebarSelect label="Format" value={format || "auto"} onChange={(value) => setFormat(value === "auto" ? "" : value)} options={BRIEF_FORMATS} />
            <SidebarInput label="Notes (optional)" type="textarea" value={notes} onChange={setNotes} placeholder="e.g. lean into the new bundle offer" />
          </div>
          <button type="button" onClick={run} disabled={!productId || busy} className="cs-primary-button mt-auto w-full">
            {busy ? "Writing Brief…" : "Generate Brief"}
          </button>
        </>
      )}
    >
      <ErrorBanner message={err} />
      {!productId ? (
        <WorkspaceEmpty icon={Box} title="Select a product" hint="Choose a product above before generating a brief." />
      ) : busy ? (
        <GenerateLoading label="Building the creative brief…" />
      ) : batches.length === 0 ? (
        <WorkspaceEmpty icon={ClipboardList} title="No brief generated yet" hint="Choose a format and add optional direction in the sidebar." />
      ) : (
        <div className="space-y-5">
          {batches.map((batch, batchIndex) => {
            const concept = batch.data?.concept;
            const brief = batch.data?.brief;
            return (
              <GenerationBatch key={batch.id} createdAt={batch.createdAt} isLatest={batchIndex === 0}>
                <div className="space-y-4">
                  {concept && (
                    <div className="cs-generate-result space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{concept.concept_name}</span>
                        {brief?.format && <Tag>{brief.format}</Tag>}
                        {concept.persona_label && <Tag>{concept.persona_label}</Tag>}
                        {concept.awareness_stage && <Tag>{concept.awareness_stage}</Tag>}
                      </div>
                      {concept.hypothesis && <p><strong>Hypothesis:</strong> {concept.hypothesis}</p>}
                      {concept.angle && <p><strong>Angle:</strong> {concept.angle}</p>}
                      {concept.concept_direction && <p><strong>Direction:</strong> {concept.concept_direction}</p>}
                    </div>
                  )}
                  {brief?.hooks?.length > 0 && <ResultSection title="Hooks"><ul className="list-disc space-y-1 pl-5">{brief.hooks.map((hook, index) => <li key={index}>{hook}</li>)}</ul></ResultSection>}
                  {brief?.headlines?.length > 0 && <ResultSection title="Headlines"><ul className="list-disc space-y-1 pl-5">{brief.headlines.map((headline, index) => <li key={index}>{headline}</li>)}</ul></ResultSection>}
                  {brief?.script && <ResultSection title="Script"><pre className="whitespace-pre-wrap font-sans">{brief.script}</pre></ResultSection>}
                  {brief?.static_brief && <ResultSection title="Static Brief"><pre className="whitespace-pre-wrap font-sans">{brief.static_brief}</pre></ResultSection>}
                </div>
              </GenerationBatch>
            );
          })}
        </div>
      )}
    </GenerateWorkspace>
  );
}

function GenerateWorkspace({ sidebar, children }) {
  return (
    <div className="cs-generate-layout">
      <aside className="cs-generate-sidebar">{sidebar}</aside>
      <section className="cs-generate-canvas">{children}</section>
    </div>
  );
}

function WorkspaceEmpty({ icon: Icon, title, hint }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
      <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-[#ffe9d6] text-[#6c3403]">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-neutral-800">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-neutral-500">{hint}</p>
    </div>
  );
}

function GenerateLoading({ label }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-sm text-neutral-500">
      <Loader2 className="h-6 w-6 animate-spin text-[#6c3403]" />
      <span>{label}</span>
    </div>
  );
}

function SidebarSelect({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="cs-generate-control w-full px-4">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="cs-select-content bg-white">
          {options.map((option) => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

function SidebarNumber({ label, value, min, max, onChange }) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))}
        className="cs-generate-control w-full px-4"
      />
    </Field>
  );
}

function SidebarLoading({ label }) {
  return (
    <Field label={label}>
      <div className="cs-generate-control flex w-full items-center gap-2 px-4 text-xs font-normal text-neutral-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
      </div>
    </Field>
  );
}

function SidebarInput({ label, type, value, onChange, placeholder }) {
  return (
    <Field label={label}>
      {type === "textarea" ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder || ""} className="cs-generate-textarea w-full" />
      ) : (
        <input type={type === "number" ? "number" : "text"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder || ""} className="cs-generate-control w-full px-4" />
      )}
    </Field>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[#4f3329]">{label}</span>
      {children}
    </label>
  );
}

function GenerationGrid({ items, rate }) {
  return (
    <div className="cs-generate-gallery">
      {items.map((item) => <GeneratedImage key={item.id || item.imageUrl} item={item} rate={rate} />)}
    </div>
  );
}

function GeneratedImage({ item, rate }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <article className="cs-generate-image-card group relative aspect-square">
      {!loaded && <div className="absolute inset-0 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#6c3403]" /></div>}
      <img
        src={item.imageUrl}
        alt={item.formatSlug || "Generated ad"}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
      <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-90 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={() => rate(item.id, "up")} className={`cs-generate-rating ${item.myRating === "up" ? "is-active" : ""}`} aria-label="Thumbs up">
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => rate(item.id, "down")} className={`cs-generate-rating ${item.myRating === "down" ? "is-active" : ""}`} aria-label="Thumbs down">
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function ResultSection({ title, children }) {
  return <div className="cs-generate-result"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6c3403]">{title}</p>{children}</div>;
}

function GenerationBatch({ createdAt, isLatest, children }) {
  const date = new Date(createdAt);
  const timestamp = Number.isNaN(date.getTime())
    ? "Time unavailable"
    : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return (
    <section className={`cs-generate-history-batch ${isLatest ? "is-latest" : "is-past"}`}>
      <header className="cs-generate-history-batch__header">
        <span>{isLatest ? "Latest generation" : "Past generation"}</span>
        <time dateTime={createdAt}>{timestamp}</time>
      </header>
      <div className="cs-generate-history-batch__content">{children}</div>
    </section>
  );
}

function Tag({ children }) {
  return <span className="rounded-full border border-[#6c3403]/20 bg-[#ffe9d6] px-2 py-0.5 text-[10px] font-medium text-[#6c3403]">{children}</span>;
}

GenerateView.propTypes = { ctx: PropTypes.object.isRequired };
GenerateWorkspace.propTypes = { sidebar: PropTypes.node.isRequired, children: PropTypes.node.isRequired };
WorkspaceEmpty.propTypes = { icon: PropTypes.elementType.isRequired, title: PropTypes.string.isRequired, hint: PropTypes.string.isRequired };
GenerateLoading.propTypes = { label: PropTypes.string.isRequired };
SidebarSelect.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired, options: PropTypes.array.isRequired };
SidebarNumber.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.number.isRequired, min: PropTypes.number.isRequired, max: PropTypes.number.isRequired, onChange: PropTypes.func.isRequired };
SidebarLoading.propTypes = { label: PropTypes.string.isRequired };
SidebarInput.propTypes = { label: PropTypes.string.isRequired, type: PropTypes.string, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, onChange: PropTypes.func.isRequired, placeholder: PropTypes.string };
Field.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
GenerationGrid.propTypes = { items: PropTypes.array.isRequired, rate: PropTypes.func.isRequired };
GeneratedImage.propTypes = { item: PropTypes.object.isRequired, rate: PropTypes.func.isRequired };
ResultSection.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
GenerationBatch.propTypes = { createdAt: PropTypes.string.isRequired, isLatest: PropTypes.bool.isRequired, children: PropTypes.node.isRequired };
Tag.propTypes = { children: PropTypes.node };
ScriptsPanel.propTypes = { productId: PropTypes.string };
BriefPanel.propTypes = { productId: PropTypes.string };
