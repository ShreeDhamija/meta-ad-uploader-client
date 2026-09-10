// Generate workspace — statics, video scripts, and briefs share one shell while
// retaining their existing API flows.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Box, ChevronLeft, ChevronRight, ClipboardList, Download, FileText, Flame, Loader2, Sparkles, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import pLimit from "p-limit";
import VisualInspiration from "./VisualInspiration";
import { creativeApi } from "@/lib/creativeApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorBanner } from "../ui";
import { useJobRunner } from "../JobsContext";
import { toast } from "sonner";

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
  { key: "1:1+9:16", label: "1:1 + 9:16" },
  { key: "4:5+9:16", label: "4:5 + 9:16" },
];
const MODES = [
  { key: "statics", label: "Statics" },
  { key: "scripts", label: "Scripts" },
  { key: "briefs", label: "Briefs" },
];

function useGenerationHistory(productId, kind) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(Boolean(productId));
  const [error, setError] = useState(null);
  const [nextOffset, setNextOffset] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setBatches([]);
    setError(null);
    setNextOffset(null);
    setLoading(Boolean(productId));
    if (productId) {
      creativeApi.getGenerationHistory(productId, kind)
        .then((response) => {
          if (!active) return;
          setBatches(response.batches || []);
          setNextOffset(response.nextOffset);
        })
        .catch((err) => { if (active) setError(err.message); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [productId, kind, reload]);

  const loadMore = async () => {
    if (loading || nextOffset == null) return;
    setLoading(true);
    setError(null);
    try {
      const response = await creativeApi.getGenerationHistory(productId, kind, nextOffset);
      setBatches((current) => {
        const ids = new Set(current.map((batch) => batch.id));
        return [...current, ...(response.batches || []).filter((batch) => !ids.has(batch.id))];
      });
      setNextOffset(response.nextOffset);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addBatch = (batch) => {
    if (!batch?.id || !batch?.createdAt) throw new Error("The server did not return a saved generation.");
    setBatches((current) => [batch, ...current.filter((item) => item.id !== batch.id)]);
    setNextOffset((offset) => offset == null ? null : offset + 1);
  };

  return { batches, loading, error, nextOffset, loadMore, addBatch, retry: () => setReload((value) => value + 1) };
}

export default function GenerateView({ ctx }) {
  const { selectedProductId } = ctx;
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(`cs-generate-mode:${ctx.userId}`);
      return MODES.some((item) => item.key === saved) ? saved : "statics";
    } catch { return "statics"; }
  });
  useEffect(() => {
    if (!ctx.userId) return;
    try { localStorage.setItem(`cs-generate-mode:${ctx.userId}`, mode); } catch { /* Keep session state. */ }
  }, [ctx.userId, mode]);
  const [formats, setFormats] = useState([]);
  const [formatsLoading, setFormatsLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  useEffect(() => { if (err) toast.error(err); }, [err]);
  const [generatedLoading, setGeneratedLoading] = useState(false);
  const [nextStaticOffset, setNextStaticOffset] = useState(null);
  const staticRequest = useRef(0);
  const bulkSession = useRef(0);
  const [bulkAction, setBulkAction] = useState(null);
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkMessage, setBulkMessage] = useState("");

  useEffect(() => {
    setBulkAction(null);
    setSelectedImages(new Set());
    setBulkBusy(false);
    setBulkMessage("");
    return () => { bulkSession.current += 1; };
  }, [selectedProductId, mode]);

  const [generationMode, setGenerationMode] = useState("manual");
  const [visualSelection, setVisualSelection] = useState(null);

  const [formatSlug, setFormatSlug] = useState("");
  const [creativityMode, setCreativityMode] = useState("inspired");
  const [productionStyle, setProductionStyle] = useState("auto");
  const [aspectRatio, setAspectRatio] = useState("");
  const [variationCount, setVariationCount] = useState(2);
  const [userInputs, setUserInputs] = useState({});
  const [filling, setFilling] = useState(false);

  const load = async (productId, offset = 0) => {
    const requestId = ++staticRequest.current;
    if (!productId) { setItems([]); setNextStaticOffset(null); setGeneratedLoading(false); return; }
    setGeneratedLoading(true);
    setErr(null);
    try {
      const response = await creativeApi.getGenerated(productId, offset);
      if (requestId !== staticRequest.current) return;
      setItems((current) => {
        if (offset === 0) return response.items || [];
        const ids = new Set(current.map((item) => item.id));
        return [...current, ...(response.items || []).filter((item) => !ids.has(item.id))];
      });
      setNextStaticOffset(response.nextOffset ?? null);
    } catch (error) {
      if (requestId === staticRequest.current) setErr(error.message);
    } finally {
      if (requestId === staticRequest.current) setGeneratedLoading(false);
    }
  };

  useEffect(() => {
    setFormatsLoading(true);
    creativeApi.getFormats()
      .then((response) => setFormats(response.formats || []))
      .catch((error) => setErr(error.message))
      .finally(() => setFormatsLoading(false));
  }, []);

  useEffect(() => {
    setItems([]);
    setNextStaticOffset(null);
    load(selectedProductId);
    return () => { staticRequest.current += 1; };
  }, [selectedProductId]);

  const selectedFormat = useMemo(
    () => formats.find((format) => format.slug === formatSlug) || null,
    [formats, formatSlug],
  );

  const { job, start } = useJobRunner({
    kind: "generate_ad",
    productId: selectedProductId,
    enabled: Boolean(selectedProductId),
    restoreFinished: false,
    onComplete: () => load(selectedProductId),
  });

  const handleVisualChange = useCallback((selection) => {
    setVisualSelection(selection);
    setVariationCount((count) => Math.max(count, selection.conceptReferenceIds.length));
    setErr(null);
  }, []);

  const runStatics = async () => {
    if (!selectedProductId) return;
    setBulkAction(null);
    setSelectedImages(new Set());
    setBulkMessage("");
    setErr(null);
    try {
      const cleanedInputs = {};
      for (const field of selectedFormat?.requiresUserInput || []) {
        if (userInputs[field.key] != null && userInputs[field.key] !== "") cleanedInputs[field.key] = userInputs[field.key];
      }
      const { jobId } = await creativeApi.runGenerate({
        productId: selectedProductId,
        generationMode,
        brandExampleAdIds: visualSelection?.brandExampleAdIds,
        productAssetIds: visualSelection?.productAssetIds,
        conceptReferenceIds: visualSelection?.conceptReferenceIds,
        formatSlug: generationMode === "manual" ? formatSlug || undefined : undefined,
        creativityMode,
        productionStyle,
        aspectRatio: aspectRatio.split("+")[0] || undefined,
        includePortrait: aspectRatio.includes("+"),
        variationCount,
        userInputs: generationMode === "manual" && Object.keys(cleanedInputs).length ? cleanedInputs : undefined,
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
    try {
      await creativeApi.rateGenerated(id, rating);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, myRating: rating } : item)));
    } catch (error) { setErr(error.message); }
  };

  const toggleImage = (id) => setSelectedImages((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const selectAllImages = async (checked) => {
    if (!checked) { setSelectedImages(new Set()); return; }
    const session = bulkSession.current;
    setBulkBusy(true);
    setBulkMessage("Selecting all images…");
    setErr(null);
    try {
      // Fetch every page so Select All includes older generations too.
      const all = new Map(items.map((item) => [item.id, item]));
      let offset = nextStaticOffset;
      while (offset != null) {
        const response = await creativeApi.getGenerated(selectedProductId, offset);
        if (session !== bulkSession.current) return;
        for (const item of response.items || []) all.set(item.id, item);
        offset = response.nextOffset ?? null;
      }
      if (session !== bulkSession.current) return;
      setItems(Array.from(all.values()));
      setNextStaticOffset(null);
      setSelectedImages(new Set(all.keys()));
      setBulkMessage("");
    } catch (error) {
      if (session === bulkSession.current) { setErr(error.message); setBulkMessage(""); }
    } finally {
      if (session === bulkSession.current) setBulkBusy(false);
    }
  };

  const runBulkAction = async () => {
    const chosen = items.filter((item) => selectedImages.has(item.id));
    if (!chosen.length || bulkBusy) return;
    const session = bulkSession.current;
    const isCurrent = () => session === bulkSession.current;
    setBulkBusy(true);
    setBulkProgress(0);
    setBulkMessage("");
    setErr(null);
    try {
      let failures;
      if (bulkAction === "download") {
        const { downloadGeneratedImages } = await import("../downloadGeneratedImages");
        failures = await downloadGeneratedImages(chosen, (count) => { if (isCurrent()) setBulkProgress(count); }, isCurrent);
      } else {
        const limit = pLimit(4);
        const results = await Promise.all(chosen.map((item) => limit(async () => {
          try { await creativeApi.deleteGenerated(item.id); return { id: item.id }; }
          catch (error) { return { id: item.id, error: error.message }; }
          finally { if (isCurrent()) setBulkProgress((count) => count + 1); }
        })));
        failures = results.filter((result) => result.error);
        if (isCurrent()) {
          const deleted = new Set(results.filter((result) => !result.error).map((result) => result.id));
          setItems((current) => current.filter((item) => !deleted.has(item.id)));
          setNextStaticOffset((offset) => offset == null ? null : Math.max(0, offset - deleted.size));
        }
      }
      if (!isCurrent()) return;
      setSelectedImages(new Set(failures.map((failure) => failure.id)));
      const completed = chosen.length - failures.length;
      setBulkMessage(`${completed} image${completed === 1 ? "" : "s"} ${bulkAction === "delete" ? "deleted" : "downloaded"}.`);
      if (failures.length) setErr(`${failures.length} image(s) failed and remain selected for retry. ${failures[0].error}`);
      else setBulkAction(null);
    } catch (error) {
      if (isCurrent()) setErr(error.message);
    } finally {
      if (isCurrent()) setBulkBusy(false);
    }
  };

  const inputFields = selectedFormat?.requiresUserInput || [];
  const imageItems = items;
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
          isStatics
          footer={!generationActive && (imageItems.length > 0 || bulkMessage) && <div className="cs-generate-bulk-actions">
            {bulkAction && <label className="mr-auto flex items-center gap-2 text-xs">
              <Checkbox className="cs-generate-checkbox" checked={nextStaticOffset == null && items.length > 0 && items.every((item) => selectedImages.has(item.id)) ? true : selectedImages.size > 0 ? "indeterminate" : false} onCheckedChange={(checked) => selectAllImages(checked === true)} disabled={bulkBusy || generatedLoading} />
              Select all <span className="text-stone-500">({selectedImages.size} selected)</span>
            </label>}
            <span role="status" className="text-xs text-stone-500">{bulkBusy && !bulkMessage ? `${bulkAction === "delete" ? "Deleting" : "Downloading"} ${bulkProgress}/${selectedImages.size}…` : bulkMessage}</span>
            {bulkAction ? <>
              <button type="button" className="cs-library-action" disabled={bulkBusy} onClick={() => { setBulkAction(null); setSelectedImages(new Set()); setBulkMessage(""); }}>Cancel</button>
              <button type="button" className={`cs-library-action ${bulkAction === "delete" ? "is-archive" : ""}`} disabled={bulkBusy || generatedLoading || selectedImages.size === 0} onClick={runBulkAction}>
                {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : bulkAction === "delete" ? <Trash2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {bulkAction === "delete" ? "Delete" : "Download"} selected ({selectedImages.size})
              </button>
            </> : imageItems.length > 0 && <>
              <button type="button" className="cs-library-action" disabled={generatedLoading} onClick={() => { setBulkAction("download"); setBulkMessage(""); }}><Download className="h-4 w-4" /> Download</button>
              <button type="button" className="cs-library-action is-archive" disabled={generatedLoading} onClick={() => { setBulkAction("delete"); setBulkMessage(""); }}><Trash2 className="h-4 w-4" /> Delete</button>
            </>}
          </div>}
          sidebar={(
            <>
              <div className="space-y-4">
                <div className="cs-strategy-toggle" aria-label="Static generation mode">
                  {[['manual', 'Manual tune'], ['strategist', 'AI Strategist']].map(([value, label]) => <button key={value} type="button" aria-pressed={generationMode === value} className={generationMode === value ? "is-active" : ""} onClick={() => setGenerationMode(value)}>{label}</button>)}
                </div>
                <p className="cs-generate-sidebar-description">{generationMode === "strategist" ? "AI uses your research and account insights to choose concepts, personas, formats, and copy." : "Choose your format and fine-tune the creative inputs."}</p>
                {generationMode === "manual" && (formatsLoading ? (
                  <SidebarLoading label="Loading formats…" />
                ) : (
                  <SidebarSelect
                    label="Format"
                    value={formatSlug || "auto"}
                    onChange={(value) => { setFormatSlug(value === "auto" ? "" : value); setUserInputs({}); }}
                    options={[{ key: "auto", label: "Auto format" }, ...formats.map((format) => ({ key: format.slug, label: format.category }))]}
                  />
                ))}
                <SidebarNumber label="Variations" value={variationCount} min={1} max={8} onChange={setVariationCount} />
                <SidebarSelect label="Creativity" value={creativityMode} onChange={setCreativityMode} options={CREATIVITY} />
                <SidebarSelect label="Aspect Ratio" value={aspectRatio || "reference"} onChange={(value) => setAspectRatio(value === "reference" ? "" : value)} options={ASPECT} />
                {aspectRatio.includes("+") && <p className="text-xs text-stone-500">Each variation produces a matching pair ({variationCount * 2} images total).</p>}
                <SidebarSelect label="Production" value={productionStyle} onChange={setProductionStyle} options={PRODUCTION} />

                {generationMode === "manual" && inputFields.length > 0 && (
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
                <VisualInspiration key={selectedProductId || "none"} productId={selectedProductId} clientId={ctx.selectedBrandId} onChange={handleVisualChange} />
              </div>
              <div className="mt-auto space-y-3 pt-5">
                {visualSelection?.conceptReferenceIds.length > variationCount && <p className="text-xs text-amber-800">Increase variations to use all selected concept references.</p>}
                <button type="button" onClick={runStatics} disabled={bulkBusy || !selectedProductId || !visualSelection?.ready || visualSelection.productId !== selectedProductId || generationActive || visualSelection.conceptReferenceIds.length > variationCount} className="cs-primary-button w-full">
                  {generationMode === "strategist" ? "Plan & Generate Ads" : "Generate Ads"}
                </button>
              </div>
            </>
          )}
        >
          {!selectedProductId ? (
            <WorkspaceEmpty icon={Box} title="Select a product" hint="Choose a brand and product above to configure and generate static ads." />
          ) : formatsLoading || (generatedLoading && imageItems.length === 0) ? (
            <GenerateLoading label={formatsLoading ? "Loading generation options…" : "Loading previous images…"} />
          ) : generationActive ? (
            <GenerateLoading label="Generating static variations…" />
          ) : imageItems.length === 0 ? (
            <WorkspaceEmpty icon={Flame} title="No generated ads yet" hint="Choose your settings in the sidebar and generate the first variations." />
          ) : (
            <GenerationGrid items={imageItems} rate={rate} selecting={Boolean(bulkAction)} selected={selectedImages} toggle={toggleImage} disabled={bulkBusy} />
          )}
          {nextStaticOffset != null && !generationActive && (
            <button type="button" onClick={() => load(selectedProductId, nextStaticOffset)} disabled={generatedLoading || bulkBusy} className="cs-library-action mt-4 self-start">
              {generatedLoading ? "Loading…" : "Load more statics"}
            </button>
          )}

        </GenerateWorkspace>
      )}

      {mode === "scripts" && <ScriptsPanel key={selectedProductId} productId={selectedProductId} />}
      {mode === "briefs" && <BriefPanel key={selectedProductId} productId={selectedProductId} />}
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
  const history = useGenerationHistory(productId, "scripts");
  const { batches } = history;
  const [err, setErr] = useState(null);

  useEffect(() => {
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
      history.addBatch(response.batch);
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
          <button type="button" onClick={run} disabled={!productId || busy || personasLoading || history.loading || Boolean(history.error)} className="cs-primary-button mt-auto w-full">
            {busy ? `Writing ${count} Script${count === 1 ? "" : "s"}…` : `Generate ${count} Video Script${count === 1 ? "" : "s"}`}
          </button>
        </>
      )}
    >
      <ErrorBanner message={err} />
      <HistoryControls history={history} disabled={busy} />
      {!productId ? (
        <WorkspaceEmpty icon={Box} title="Select a product" hint="Choose a product above before generating a video script." />
      ) : history.loading && batches.length === 0 ? (
        <GenerateLoading label="Loading saved scripts…" />
      ) : busy ? (
        <GenerateLoading label={`Writing ${count} video script${count === 1 ? "" : "s"}…`} />
      ) : batches.length === 0 ? (
        <WorkspaceEmpty icon={FileText} title="Video script generation" hint="Generate a concept-led video ad script with three opening hooks." />
      ) : (
        <div className="space-y-5">
          {batches.map((batch, batchIndex) => (
            <GenerationBatch key={batch.id} createdAt={batch.createdAt} isLatest={batchIndex === 0} legacyWeekly={batch.legacyWeekly} productUnspecified={batch.productUnspecified}>
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
  const history = useGenerationHistory(productId, "briefs");
  const { batches } = history;
  const [err, setErr] = useState(null);

  const run = async () => {
    if (!productId) return;
    setErr(null); setBusy(true);
    try {
      const data = await creativeApi.generateConceptBrief({ productId, format: format || undefined, notes: notes || undefined });
      history.addBatch(data.batch);
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
          <button type="button" onClick={run} disabled={!productId || busy || history.loading || Boolean(history.error)} className="cs-primary-button mt-auto w-full">
            {busy ? "Writing Brief…" : "Generate Brief"}
          </button>
        </>
      )}
    >
      <ErrorBanner message={err} />
      <HistoryControls history={history} disabled={busy} />
      {!productId ? (
        <WorkspaceEmpty icon={Box} title="Select a product" hint="Choose a product above before generating a brief." />
      ) : history.loading && batches.length === 0 ? (
        <GenerateLoading label="Loading saved briefs…" />
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
              <GenerationBatch key={batch.id} createdAt={batch.createdAt} isLatest={batchIndex === 0} legacyWeekly={batch.legacyWeekly} productUnspecified={batch.productUnspecified}>
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

function GenerateWorkspace({ sidebar, children, isStatics = false, footer }) {
  return (
    <div className="cs-generate-layout">
      <aside className="cs-generate-sidebar">
        <ScrollArea className="cs-generate-scroll" viewportClassName="cs-generate-viewport">
          <div className="cs-generate-sidebar-content">{sidebar}</div>
        </ScrollArea>
      </aside>
      <section className={`cs-generate-canvas ${isStatics ? "is-statics" : ""}`}>
        <ScrollArea className="cs-generate-scroll" viewportClassName="cs-generate-viewport">
          <div className="cs-generate-canvas-content">{children}</div>
        </ScrollArea>
        {footer}
      </section>
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

function GenerationGrid({ items, rate, selecting, selected, toggle, disabled }) {
  const [preview, setPreview] = useState(null);
  const groups = new Map();
  for (const item of items) {
    const key = item.briefMeta?.pair_id || item.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  // Match the visual group order, including square/portrait pairs.
  const previewItems = Array.from(groups.values()).flatMap((group) => [...group].sort((a, b) => Number(a.briefMeta?.aspect_ratio === "9:16") - Number(b.briefMeta?.aspect_ratio === "9:16"))).filter((item) => item.imageUrl);
  const navigatePreview = (direction) => {
    setPreview((current) => {
      const index = previewItems.findIndex((item) => item.id === current?.id);
      return previewItems[(index + direction + previewItems.length) % previewItems.length] || current;
    });
  };
  return (
    <><div className={`cs-generate-gallery ${items.some((item) => item.briefMeta?.pair_id) ? "has-pairs" : ""}`}>
      {Array.from(groups, ([key, group]) => <div key={key} className={group.length > 1 ? "cs-generate-pair" : undefined}>
        {group.sort((a, b) => Number(a.briefMeta?.aspect_ratio === "9:16") - Number(b.briefMeta?.aspect_ratio === "9:16")).map((item) => <div key={item.id}>
          <GeneratedImage item={item} rate={rate} selecting={selecting} selected={selected.has(item.id)} toggle={toggle} disabled={disabled} onPreview={setPreview} />
          {item.briefMeta?.strategy && <div className="px-1 py-3 text-xs text-stone-600">
            <p className="font-semibold text-stone-800">{item.briefMeta.strategy.concept_name}</p>
            <p className="mt-1">{[item.briefMeta.strategy.persona_label, item.briefMeta.strategy.angle].filter(Boolean).join(" · ")}</p>
            <p className="mt-1">{item.briefMeta.strategy.hypothesis}</p>
          </div>}
        </div>)}
      </div>)}
    </div>
    <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}>
      <DialogContent hideClose disableSlide aria-describedby={undefined} onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); navigatePreview(event.key === "ArrowLeft" ? -1 : 1); }
      }} overlayClassName="bg-black/80" className="w-auto max-w-[95vw] gap-0 border-0 bg-transparent p-0 shadow-none outline-none">
        <DialogTitle className="sr-only">Generated image preview</DialogTitle>
        {preview && <img src={preview.imageUrl} alt={preview.formatSlug || "Generated ad"} className="block max-h-[90dvh] max-w-[95vw] object-contain" />}
        {previewItems.length > 1 && <>
          <button type="button" aria-label="Previous image" className="cs-image-preview-nav is-previous" onClick={() => navigatePreview(-1)}><ChevronLeft size={24} /></button>
          <button type="button" aria-label="Next image" className="cs-image-preview-nav is-next" onClick={() => navigatePreview(1)}><ChevronRight size={24} /></button>
        </>}
      </DialogContent>
    </Dialog></>
  );
}

function GeneratedImage({ item, rate, selecting, selected, toggle, disabled, onPreview }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <article className="cs-generate-image-card group relative aspect-square" style={item.briefMeta?.aspect_ratio ? { aspectRatio: item.briefMeta.aspect_ratio.replace(":", " / ") } : undefined}>
      {!loaded && item.imageUrl && <div className="absolute inset-0 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#6c3403]" /></div>}
      {!item.imageUrl && <div className="absolute inset-0 grid place-items-center text-xs text-stone-500">Preview unavailable</div>}
      {item.imageUrl && <button type="button" className="absolute inset-0 h-full w-full cursor-zoom-in" aria-label="View full image" onClick={() => onPreview(item)} disabled={selecting}><img
        src={item.imageUrl}
        loading="lazy"
        alt={item.formatSlug || "Generated ad"}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`h-full w-full object-contain transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
      /></button>}
      {selecting && <label className={`cs-generate-image-select ${selected ? "is-selected" : ""}`}>
        <Checkbox className="cs-generate-checkbox" aria-label={`Select ${item.formatSlug || "image"} ${item.briefMeta?.aspect_ratio || ""} ${item.id}`} checked={selected} onCheckedChange={() => toggle(item.id)} disabled={disabled} />
      </label>}
      {!selecting && <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-90 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={() => rate(item.id, "up")} className={`cs-generate-rating is-up ${item.myRating === "up" ? "is-active" : ""}`} aria-label="Thumbs up" aria-pressed={item.myRating === "up"}>
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => rate(item.id, "down")} className={`cs-generate-rating is-down ${item.myRating === "down" ? "is-active" : ""}`} aria-label="Thumbs down" aria-pressed={item.myRating === "down"}>
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>}
    </article>
  );
}

function ResultSection({ title, children }) {
  return <div className="cs-generate-result"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6c3403]">{title}</p>{children}</div>;
}

function HistoryControls({ history, disabled }) {
  return (
    <>
      <ErrorBanner message={history.error} />
      {history.error ? (
        <button type="button" onClick={history.retry} disabled={disabled || history.loading} className="cs-library-action mb-4">Retry loading history</button>
      ) : history.nextOffset != null && (
        <button type="button" onClick={history.loadMore} disabled={disabled || history.loading} className="cs-library-action mb-4">
          {history.loading ? "Loading…" : "Load older generations"}
        </button>
      )}
    </>
  );
}

function GenerationBatch({ createdAt, isLatest, legacyWeekly, productUnspecified, children }) {
  const date = new Date(createdAt);
  const timestamp = Number.isNaN(date.getTime())
    ? "Time unavailable"
    : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return (
    <section className={`cs-generate-history-batch ${isLatest ? "is-latest" : "is-past"}`}>
      <header className="cs-generate-history-batch__header">
        <span>{legacyWeekly ? "Saved weekly strategy" : isLatest ? "Latest generation" : "Past generation"}</span>
        <time dateTime={createdAt}>{legacyWeekly ? "Concept created: " : ""}{timestamp}</time>
      </header>
      <div className="cs-generate-history-batch__content">{legacyWeekly && <p className="mb-4 text-xs text-stone-500">{productUnspecified ? "Brand-level weekly history — the original product and generation date were not recorded." : "The original generation date was not recorded."}</p>}{children}</div>
    </section>
  );
}

function Tag({ children }) {
  return <span className="rounded-full border border-[#6c3403]/20 bg-[#ffe9d6] px-2 py-0.5 text-[10px] font-medium text-[#6c3403]">{children}</span>;
}

GenerateView.propTypes = { ctx: PropTypes.object.isRequired };
GenerateWorkspace.propTypes = { sidebar: PropTypes.node.isRequired, children: PropTypes.node.isRequired, isStatics: PropTypes.bool, footer: PropTypes.node };
WorkspaceEmpty.propTypes = { icon: PropTypes.elementType.isRequired, title: PropTypes.string.isRequired, hint: PropTypes.string.isRequired };
GenerateLoading.propTypes = { label: PropTypes.string.isRequired };
SidebarSelect.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired, options: PropTypes.array.isRequired };
SidebarNumber.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.number.isRequired, min: PropTypes.number.isRequired, max: PropTypes.number.isRequired, onChange: PropTypes.func.isRequired };
SidebarLoading.propTypes = { label: PropTypes.string.isRequired };
SidebarInput.propTypes = { label: PropTypes.string.isRequired, type: PropTypes.string, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, onChange: PropTypes.func.isRequired, placeholder: PropTypes.string };
Field.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
GenerationGrid.propTypes = { items: PropTypes.array.isRequired, rate: PropTypes.func.isRequired, selecting: PropTypes.bool, selected: PropTypes.instanceOf(Set).isRequired, toggle: PropTypes.func.isRequired, disabled: PropTypes.bool };
GeneratedImage.propTypes = { item: PropTypes.object.isRequired, rate: PropTypes.func.isRequired, selecting: PropTypes.bool, selected: PropTypes.bool, toggle: PropTypes.func.isRequired, disabled: PropTypes.bool, onPreview: PropTypes.func.isRequired };
ResultSection.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
GenerationBatch.propTypes = { legacyWeekly: PropTypes.bool, productUnspecified: PropTypes.bool, createdAt: PropTypes.string.isRequired, isLatest: PropTypes.bool.isRequired, children: PropTypes.node.isRequired };
HistoryControls.propTypes = { history: PropTypes.object.isRequired, disabled: PropTypes.bool };
Tag.propTypes = { children: PropTypes.node };
ScriptsPanel.propTypes = { productId: PropTypes.string };
BriefPanel.propTypes = { productId: PropTypes.string };
