// Generate workspace — statics, video scripts, and briefs share one shell while
// retaining their existing API flows.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Box, ChevronLeft, ChevronRight, ClipboardList, Download, Flame, Loader2, Sparkles, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import pLimit from "p-limit";
import VisualInspiration from "./VisualInspiration";
import { creativeApi } from "@/lib/creativeApi";
import RunModelControls from "../RunModelControls";
import { useRunModels } from "../useRunModels";
import { RUN_OPERATIONS } from "../run-model-operations";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorBanner } from "../ui";
import { useJobRunner } from "../JobsContext";
import { toast } from "sonner";
import RunBy from "../run-by";

const CREATIVITY = [
  { key: "inspired", label: "Inspired (new ad, same look)" },
  { key: "remix", label: "Remix (same layout, new copy)" },
];
const CREATIVITY_HELP = {
  inspired: "Keeps the reference's look but changes the headline, layout and main visual, so each image is a different ad.",
  remix: "Keeps the reference's layout and positions exactly and rewrites only the text for your product.",
};
const PRODUCTION = [
  { key: "auto", label: "Auto" },
  { key: "native", label: "Native (UGC)" },
  { key: "studio", label: "Studio" },
];
const PRODUCTION_HELP = {
  auto: "UGC look when the format or copy reads native (POV, selfie, “I tried…”), otherwise studio.",
  native: "Shot-on-phone look: handheld, natural light, unpolished.",
  studio: "Polished product photography with controlled lighting.",
};
const STATIC_MODE_HELP = {
  manual: "You choose the format and its on-image copy (or Auto-fill it). With Auto format, every variation rebuilds your layout reference below with new copy.",
  strategist: "The strategist plans the batch for you: a different format, persona, angle and on-image copy for each variation, from your research, top ads and past 👍/👎.",
};

/** One line saying where each image's layout comes from. */
function layoutSummary(path, layout, format) {
  if (path === "concept") return `your concept reference “${layout?.concept || "selected image"}”${layout?.conceptCount > 1 ? ` (${layout.conceptCount} rotate across variations)` : ""}.`;
  if (path === "template") return format ? `the ${format.category} format template, with your copy.` : "each planned format's own template. Brand examples only guide the look.";
  if (layout?.example) return `rebuilt from ${layout.example.uploaded ? "your uploaded example" : "your top-spending selected ad"} “${layout.example.name}”.`;
  if (layout?.product) return `rebuilt from your product image “${layout.product}”.`;
  return "pick images in Visual inspiration.";
}
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

  // After a run: fetch the newest page and put batches not shown yet on top,
  // keeping everything already loaded (older pages included) in place.
  const refreshLatest = async () => {
    if (!productId) return;
    try {
      const response = await creativeApi.getGenerationHistory(productId, kind);
      if (batches.length === 0) {
        setBatches(response.batches || []);
        setNextOffset(response.nextOffset);
        setError(null);
        return;
      }
      const ids = new Set(batches.map((batch) => batch.id));
      const fresh = (response.batches || []).filter((batch) => !ids.has(batch.id));
      if (fresh.length) {
        setBatches((current) => {
          const shown = new Set(current.map((batch) => batch.id));
          return [...fresh.filter((batch) => !shown.has(batch.id)), ...current];
        });
        // New rows shift the server's paging; move the cursor past them.
        setNextOffset((offset) => (offset == null ? null : offset + fresh.length));
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return { batches, loading, error, nextOffset, loadMore, refreshLatest, retry: () => setReload((value) => value + 1) };
}

const isJobActive = (job) => Boolean(job) && (job.status == null || job.status === "queued" || job.status === "running");

export default function GenerateView({ ctx }) {
  const { selectedProductId } = ctx;
  const models = useRunModels(selectedProductId);
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(`cs-generate-mode:${ctx.userId}`);
      // "scripts" was its own tab before it merged into Briefs.
      if (saved === "scripts") return "briefs";
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

  // After a run: put the new images on top of what is already loaded (older
  // pages included) instead of reloading the grid from page one.
  const loadLatest = async (productId) => {
    if (!productId) return;
    if (items.length === 0) { await load(productId); return; }
    const requestId = staticRequest.current;
    try {
      const response = await creativeApi.getGenerated(productId, 0);
      if (requestId !== staticRequest.current) return;
      const ids = new Set(items.map((item) => item.id));
      const fresh = (response.items || []).filter((item) => !ids.has(item.id));
      if (!fresh.length) return;
      setItems((current) => {
        const shown = new Set(current.map((item) => item.id));
        return [...fresh.filter((item) => !shown.has(item.id)), ...current];
      });
      // New rows shift the server's paging; move the cursor past them.
      setNextStaticOffset((offset) => (offset == null ? null : offset + fresh.length));
    } catch (error) {
      if (requestId === staticRequest.current) setErr(error.message);
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
    onComplete: () => loadLatest(selectedProductId),
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
        aiSelections: models.forRun(RUN_OPERATIONS.statics),
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
      models.reset(RUN_OPERATIONS.statics);
    } catch (error) {
      setErr(error.message);
    }
  };

  const autofill = async () => {
    if (!selectedProductId || !formatSlug) return;
    setErr(null);
    setFilling(true);
    try {
      const response = await creativeApi.fillCopy({ productId: selectedProductId, formatSlug, aiSelections: models.forRun(RUN_OPERATIONS.fillCopy) });
      models.reset(RUN_OPERATIONS.fillCopy);
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
  const hasFilledInputs = inputFields.some((field) => userInputs[field.key] != null && userInputs[field.key] !== "");
  // How the backend will build each image (see generate-ad.ts): a concept
  // reference always wins; Strategist and a manual format with filled copy use
  // the format's template; otherwise the layout reference is rebuilt.
  const staticPath = visualSelection?.conceptReferenceIds?.length ? "concept"
    : generationMode === "strategist" || (formatSlug && hasFilledInputs) ? "template" : "reference";
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
          sidebarFooter={(              <div className="space-y-3">
                {visualSelection?.conceptReferenceIds.length > variationCount && <p className="text-xs text-amber-800">Increase variations to use all selected concept references.</p>}
                <button type="button" onClick={runStatics} disabled={bulkBusy || !selectedProductId || !visualSelection?.ready || visualSelection.productId !== selectedProductId || generationActive || visualSelection.conceptReferenceIds.length > variationCount} className="cs-primary-button w-full">
                  Generate Ads
                </button>
              </div>
          )}
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
                <p className="cs-generate-sidebar-description">{STATIC_MODE_HELP[generationMode]}</p>
                <div className="cs-generate-sidebar__group space-y-2">
                  <span className="text-xs font-semibold text-[#6c3403]">What each image is built from</span>
                  <ul className="cs-generate-sources">
                    <li><strong>Layout:</strong> {layoutSummary(staticPath, visualSelection?.layout, generationMode === "manual" ? selectedFormat : null)}</li>
                    <li><strong>Look:</strong> {visualSelection?.layout?.exampleCount ? `${visualSelection.layout.exampleCount} brand example${visualSelection.layout.exampleCount === 1 ? "" : "s"} (type, colors, photo style)` : "no brand examples selected"}</li>
                    <li><strong>Product:</strong> {visualSelection?.layout?.productCount ? `${visualSelection.layout.productCount} product image${visualSelection.layout.productCount === 1 ? "" : "s"}` : "no product images selected"}</li>
                  </ul>
                  <VisualInspiration key={selectedProductId || "none"} productId={selectedProductId} clientId={ctx.selectedBrandId} onChange={handleVisualChange} />
                  <p className="text-xs text-stone-500">Change any of these in Visual inspiration.</p>
                </div>
                {generationMode === "manual" && (formatsLoading ? (
                  <SidebarLoading label="Loading formats…" />
                ) : (
                  <SidebarSelect
                    label="Format"
                    value={formatSlug || "auto"}
                    onChange={(value) => { setFormatSlug(value === "auto" ? "" : value); setUserInputs({}); }}
                    options={[{ key: "auto", label: "Auto format" }, ...formats.map((format) => ({ key: format.slug, label: format.category, group: format.groupLabel }))]}
                  />
                ))}
                <SidebarNumber label="Variations" value={variationCount} min={1} max={8} onChange={setVariationCount} />
                {staticPath !== "template" && <>
                  <SidebarSelect label="Creativity" value={creativityMode} onChange={setCreativityMode} options={CREATIVITY} />
                  <p className="-mt-2 text-xs text-stone-500">{CREATIVITY_HELP[creativityMode]}</p>
                </>}
                <SidebarSelect label="Aspect ratio" value={aspectRatio || "reference"} onChange={(value) => setAspectRatio(value === "reference" ? "" : value)}
                  options={ASPECT.map((option) => option.key === "reference" ? { ...option, label: staticPath !== "template" ? "Match layout reference" : "Square (1:1)" } : option)} />
                {aspectRatio.includes("+") && <p className="-mt-2 text-xs text-stone-500">Each variation makes a matching pair ({variationCount * 2} images). The portrait copy uses the original's model and quality.</p>}
                {generationMode === "strategist" ? (
                  <p className="text-xs text-stone-500"><strong className="font-medium text-[#4f3329]">Production:</strong> the strategist picks UGC or studio per image and mixes them across the batch.</p>
                ) : <>
                  <SidebarSelect label="Production" value={productionStyle} onChange={setProductionStyle} options={PRODUCTION} />
                  <p className="-mt-2 text-xs text-stone-500">{PRODUCTION_HELP[productionStyle]}</p>
                </>}
                <RunModelControls models={models} operations={RUN_OPERATIONS.statics} disabled={Boolean(generationActive || filling)} />

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
              </div>

            </>
          )}
        >
          {!selectedProductId ? (
            <WorkspaceEmpty icon={Box} title="Select a product" hint="Choose a brand and product above to configure and generate static ads." />
          ) : formatsLoading || (generatedLoading && imageItems.length === 0) ? (
            <GenerateLoading label={formatsLoading ? "Loading generation options…" : "Loading previous images…"} />
          ) : generationActive && imageItems.length === 0 ? (
            <GenerateLoading label="Generating static variations…" />
          ) : imageItems.length === 0 ? (
            <WorkspaceEmpty icon={Flame} title="No generated ads yet" hint="Choose your settings in the sidebar and generate the first variations." />
          ) : (
            <>
              {generationActive && <GeneratingNotice label="Generating static variations… new images will appear at the top." />}
              <GenerationGrid items={imageItems} rate={rate} selecting={Boolean(bulkAction)} selected={selectedImages} toggle={toggleImage} disabled={bulkBusy} />
            </>
          )}
          {nextStaticOffset != null && !generationActive && (
            <button type="button" onClick={() => load(selectedProductId, nextStaticOffset)} disabled={generatedLoading || bulkBusy} className="cs-library-action mt-4 self-start">
              {generatedLoading ? "Loading…" : "Load more statics"}
            </button>
          )}

        </GenerateWorkspace>
      )}

      {mode === "briefs" && <BriefPanel key={selectedProductId} productId={selectedProductId} />}
    </div>
  );
}

// One tab for everything text-based. Video and static briefs share the
// concept-led pipeline (pick a concept, then write it); UGC is a different
// document: a brief for an outside creator who will film new footage.
const BRIEF_FORMATS = [
  { key: "auto", label: "Auto (strategist picks video or static)" },
  { key: "video", label: "Video script" },
  { key: "static", label: "Static brief" },
  { key: "ugc", label: "UGC creator brief" },
];
const BRIEF_FORMAT_HELP = {
  auto: "Picks a concept from your research and winning ads, then writes it as a video script or a static brief, whichever fits.",
  video: "A concept, three opening hooks and a full spoken script, for an editor working from footage you have.",
  static: "A concept, headlines and on-image copy with visual direction, ready for a designer or Generate → Statics.",
  ugc: "A brief to hand an outside creator who will film new footage: who they're talking to, hook ideas, talking points with shots, your top videos and shoot requirements. Written for one persona.",
};

function BriefPanel({ productId }) {
  const models = useRunModels(productId);
  const [format, setFormat] = useState("auto");
  const [count, setCount] = useState(1);
  const [persona, setPersona] = useState("");
  const [personas, setPersonas] = useState([]);
  const [personasLoading, setPersonasLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [starting, setStarting] = useState(false);
  const history = useGenerationHistory(productId, "all");
  const { batches } = history;
  const [err, setErr] = useState(null);
  // Background job: progress shows in the job tracker; results load into the grid when it finishes.
  const { job, start } = useJobRunner({
    kind: "generate_brief", productId, enabled: Boolean(productId), restoreFinished: false,
    onComplete: () => history.refreshLatest(),
  });
  // Script jobs started before the tabs merged still refresh the grid.
  const { job: scriptsJob } = useJobRunner({
    kind: "generate_scripts", productId, enabled: Boolean(productId), restoreFinished: false,
    onComplete: () => history.refreshLatest(),
  });
  const busy = starting || isJobActive(job) || isJobActive(scriptsJob);
  const isUgc = format === "ugc";
  const runningCount = job?.progress?.total || (isUgc ? 1 : count);

  useEffect(() => {
    if (!productId) { setPersonas([]); setPersonasLoading(false); return; }
    setPersonasLoading(true);
    creativeApi.getResearch(productId)
      .then((response) => {
        const found = response.intel?.personas?.personas || (Array.isArray(response.intel?.personas) ? response.intel.personas : []);
        setPersonas(found.map((item) => item.name || item.label).filter(Boolean));
      })
      .catch(() => setPersonas([]))
      .finally(() => setPersonasLoading(false));
  }, [productId]);

  const run = async () => {
    if (!productId || (isUgc && !persona)) return;
    setErr(null); setStarting(true);
    try {
      const { jobId } = await creativeApi.generateConceptBrief({
        productId,
        format: format === "auto" ? undefined : format,
        count: isUgc ? 1 : count,
        persona: persona || undefined,
        notes: notes || undefined,
        aiSelections: models.forRun(RUN_OPERATIONS.brief),
      });
      start(jobId);
      models.reset(RUN_OPERATIONS.brief);
    } catch (error) {
      setErr(error.message);
    } finally {
      setStarting(false);
    }
  };

  const buttonLabel = isUgc ? "Generate UGC Brief"
    : `Generate ${count} ${format === "video" ? "Video Script" : format === "static" ? "Static Brief" : "Brief"}${count === 1 ? "" : "s"}`;

  return (
    <GenerateWorkspace
      sidebar={(
        <>
          <div className="space-y-4">
            <SidebarSelect label="Format" value={format} onChange={setFormat} options={BRIEF_FORMATS} />
            <p className="cs-generate-sidebar-description">{BRIEF_FORMAT_HELP[format]}</p>
            {!isUgc && <SidebarNumber label="Count" value={count} min={1} max={8} onChange={setCount} />}
            {personasLoading ? (
              <SidebarLoading label="Persona" />
            ) : (
              <SidebarSelect
                label={isUgc ? "Persona (required)" : "Persona"}
                value={persona || "auto"}
                onChange={(value) => setPersona(value === "auto" ? "" : value)}
                options={[{ key: "auto", label: isUgc ? "Choose a persona" : "Auto persona" }, ...personas.map((item) => ({ key: item, label: item }))]}
              />
            )}
            {isUgc && !persona && !personasLoading && <p className="text-xs text-amber-800">{personas.length ? "A UGC brief is written for one person. Pick a persona." : "No personas yet. Run Research for this product first."}</p>}
            {!isUgc && count > 1 && <p className="text-xs text-stone-500">Each one gets a different concept, and none repeat what this product already has.</p>}
            <SidebarInput label={isUgc ? "Notes for the creator brief (optional)" : "Direction (optional)"} type="textarea" value={notes} onChange={setNotes}
              placeholder={isUgc ? "e.g. lean into the travel use case; no gym footage" : "e.g. lean into the new bundle offer"} />
            <RunModelControls models={models} operations={RUN_OPERATIONS.brief} disabled={busy} />
          </div>
          <button type="button" onClick={run} disabled={!productId || busy || personasLoading || history.loading || Boolean(history.error) || (isUgc && !persona)} className="cs-primary-button mt-auto w-full">
            {busy ? (isUgc ? "Writing UGC Brief…" : `Writing ${runningCount}…`) : buttonLabel}
          </button>
        </>
      )}
    >
      <ErrorBanner message={err} />
      <HistoryControls history={history} disabled={busy} />
      {!productId ? (
        <WorkspaceEmpty icon={Box} title="Select a product" hint="Choose a product above before generating briefs." />
      ) : history.loading && batches.length === 0 ? (
        <GenerateLoading label="Loading saved briefs…" />
      ) : busy && batches.length === 0 ? (
        <GenerateLoading label="Writing… it will appear here when it's done." />
      ) : batches.length === 0 ? (
        <WorkspaceEmpty icon={ClipboardList} title="No briefs yet" hint="Pick a format in the sidebar: video script, static brief or a UGC creator brief." />
      ) : (
        <>
          {busy && <GeneratingNotice label="Writing… new briefs will appear at the top." />}
          <TextResultsGrid entries={toTextEntries(batches)} />
        </>
      )}
    </GenerateWorkspace>
  );
}

function GenerateWorkspace({ sidebar, sidebarFooter, children, isStatics = false, footer }) {
  return (
    <div className="cs-generate-layout">
      <aside className="cs-generate-sidebar">
        <ScrollArea className="cs-generate-scroll" viewportClassName="cs-generate-viewport">
          <div className="cs-generate-sidebar-content">{sidebar}</div>
        </ScrollArea>
        {sidebarFooter && <div className="cs-generate-sidebar-footer">{sidebarFooter}</div>}
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

// Shown above existing results while a run is in progress, so they stay visible.
function GeneratingNotice({ label }) {
  return (
    <div role="status" className="mb-4 flex items-center gap-2 rounded-2xl border border-[#6c3403]/25 bg-[#ffe9d6] px-4 py-3 text-xs font-medium text-[#6c3403]">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

function SidebarSelect({ label, value, onChange, options }) {
  // Options carrying a `group` render under headed groups, in first-seen order.
  const groups = [];
  for (const option of options) {
    const last = groups[groups.length - 1];
    if (last && last.label === (option.group || null)) last.options.push(option);
    else groups.push({ label: option.group || null, options: [option] });
  }
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="cs-generate-control w-full px-4">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="cs-select-content bg-white">
          {groups.map((group, index) => group.label ? (
            <SelectGroup key={`${group.label}-${index}`}>
              <SelectLabel className="cs-select-group-label">{group.label}</SelectLabel>
              {group.options.map((option) => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>)}
            </SelectGroup>
          ) : group.options.map((option) => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>))}
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
    <article className="cs-generate-image-card group relative aspect-square" style={item.briefMeta?.aspect_ratio ? { aspectRatio: item.briefMeta.aspect_ratio.replace(":", " / ") }
      : /^\d+x\d+$/.test(item.briefMeta?.actual_size || "") ? { aspectRatio: item.briefMeta.actual_size.replace("x", " / ") } : undefined}>
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
  return <div className="cs-generate-result"><p className="mb-2 text-xs font-semibold text-[#6c3403]">{title}</p>{children}</div>;
}

/** "problem_aware" → "Problem aware". */
const sentenceLabel = (value) => {
  const text = String(value ?? "").replace(/_/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "";
};

/**
 * One entry per script or brief across every saved batch (newest first):
 * Scripts batches hold `items[]`, Briefs batches hold one `data`.
 */
function toTextEntries(batches) {
  return batches.flatMap((batch) => {
    const pieces = Array.isArray(batch.items) ? batch.items : batch.data ? [batch.data] : [];
    return pieces.map((piece, index) => ({
      key: `${batch.id}:${index}`,
      concept: piece?.concept || {},
      brief: piece?.brief || {},
      createdAt: batch.createdAt,
      createdBy: batch.createdBy || null,
      legacyWeekly: Boolean(batch.legacyWeekly),
      productUnspecified: Boolean(batch.productUnspecified),
      fromWeekly: batch.source === "weekly_strategy",
    }));
  });
}

const formatOf = (entry) => entry.brief.format || entry.concept.format_type || (entry.brief.script ? "video" : entry.brief.static_brief ? "static" : null);
const FORMAT_LABELS = { video: "Video script", static: "Static brief", ugc: "UGC creator brief" };

/** Unescape the UGC document's markdown escapes ("\*" → "*"). */
const unescapeMd = (text) => text.replace(/\\([\\`*_[\]<>#|])/g, "$1");

/** The UGC brief's overview paragraph, for its card. */
function ugcOverview(markdown) {
  const section = String(markdown).split(/^## /m).find((part) => /^1\./.test(part));
  const paragraph = section?.split("\n").slice(1).map((line) => line.trim()).find((line) => line && !line.startsWith("*"));
  return paragraph ? unescapeMd(paragraph) : null;
}

/** Inline markdown of the UGC document: **bold**, *italic*, [title](<url>). */
function renderInline(text, keyPrefix) {
  const parts = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(<?([^)>]+)>?\)/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(unescapeMd(text.slice(last, match.index)));
    const key = `${keyPrefix}-${match.index}`;
    if (match[1]) parts.push(<strong key={key}>{unescapeMd(match[1])}</strong>);
    else if (match[2]) parts.push(<em key={key}>{unescapeMd(match[2])}</em>);
    else parts.push(<a key={key} href={match[4]} target="_blank" rel="noreferrer" className="text-[#6c3403] underline underline-offset-2">{unescapeMd(match[3])}</a>);
    last = pattern.lastIndex;
  }
  if (last < text.length) parts.push(unescapeMd(text.slice(last)));
  return parts;
}

/** Renders the UGC creator brief (fixed-skeleton markdown from the backend). */
function UgcDocument({ markdown }) {
  const blocks = [];
  let list = null;
  const flush = () => { if (list) { blocks.push(list); list = null; } };
  String(markdown).split("\n").forEach((raw, index) => {
    const line = raw.trimEnd();
    if (!line.trim()) { flush(); return; }
    const bullet = /^- (.*)$/.exec(line);
    const numbered = /^(\d+)\. (.*)$/.exec(line);
    if (bullet || numbered) {
      const type = bullet ? "ul" : "ol";
      if (!list || list.type !== type) { flush(); list = { type, items: [], key: index }; }
      list.items.push(renderInline((bullet || numbered)[bullet ? 1 : 2], `li-${index}`));
      return;
    }
    flush();
    if (line.startsWith("## ")) blocks.push({ type: "h3", key: index, content: unescapeMd(line.slice(3)) });
    else if (line.startsWith("# ")) return; // The title is the popup heading.
    else blocks.push({ type: "p", key: index, content: renderInline(line, `p-${index}`) });
  });
  flush();
  return <div className="cs-ugc-doc">{blocks.map((block) => block.type === "ul" || block.type === "ol"
    ? (block.type === "ul" ? <ul key={block.key}>{block.items.map((item, i) => <li key={i}>{item}</li>)}</ul> : <ol key={block.key}>{block.items.map((item, i) => <li key={i}>{item}</li>)}</ol>)
    : block.type === "h3" ? <h3 key={block.key}>{block.content}</h3> : <p key={block.key}>{block.content}</p>)}</div>;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
    catch { toast.error("Couldn't copy — select the text instead."); }
  };
  return <button type="button" onClick={copy} className="cs-library-action">{copied ? "Copied" : "Copy brief"}</button>;
}

/** Two-column masonry of script/brief cards; a card opens the full piece. */
function TextResultsGrid({ entries }) {
  const [open, setOpen] = useState(null);
  // Alternate cards between two columns so the newest read left → right.
  const columns = [entries.filter((_, index) => index % 2 === 0), entries.filter((_, index) => index % 2 === 1)];
  return <>
    <div className="cs-generate-text-grid">
      {columns.map((column, columnIndex) => <div key={columnIndex} className="cs-generate-text-grid__column">
        {column.map((entry) => <TextResultCard key={entry.key} entry={entry} onOpen={() => setOpen(entry)} />)}
      </div>)}
    </div>
    <TextResultDialog entry={open} onClose={() => setOpen(null)} />
  </>;
}

function TextResultCard({ entry, onOpen }) {
  const { concept, brief } = entry;
  const format = formatOf(entry);
  const preview = brief.hooks?.[0] || brief.headlines?.[0];
  const ugcSummary = brief.ugc_markdown ? ugcOverview(brief.ugc_markdown) : null;
  const date = new Date(entry.createdAt);
  return (
    <button type="button" onClick={onOpen} className="cs-generate-text-card">
      <span className="cs-generate-text-card__title">{concept.concept_name || "Untitled concept"}</span>
      <span className="flex flex-wrap gap-1.5">
        {format && <Tag>{FORMAT_LABELS[format] || sentenceLabel(format)}</Tag>}
        {concept.persona_label && <Tag>{concept.persona_label}</Tag>}
        {concept.awareness_stage && <Tag>{sentenceLabel(concept.awareness_stage)}</Tag>}
        {entry.fromWeekly && <Tag>From Weekly Strategy</Tag>}
      </span>
      {concept.angle && <span className="text-xs text-stone-600"><strong className="font-semibold text-stone-700">Angle:</strong> {concept.angle}</span>}
      {preview && <span className="cs-generate-text-card__hook">“{preview}”</span>}
      {(ugcSummary || concept.concept_direction || concept.hypothesis) && <span className="cs-generate-text-card__summary">{ugcSummary || concept.concept_direction || concept.hypothesis}</span>}
      <span className="cs-generate-text-card__meta">
        {Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
        {entry.createdBy && <>{" "}<RunBy uid={entry.createdBy} /></>}
        <span className="ml-auto inline-flex items-center gap-0.5 font-medium text-[#6c3403]">View full <ChevronRight className="h-3 w-3" /></span>
      </span>
    </button>
  );
}

function TextResultDialog({ entry, onClose }) {
  const concept = entry?.concept || {};
  const brief = entry?.brief || {};
  const format = entry ? formatOf(entry) : null;
  return (
    <Dialog open={Boolean(entry)} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent disableSlide aria-describedby={undefined} className="max-w-2xl rounded-[28px] bg-white p-0 sm:rounded-[28px]" overlayClassName="bg-black/40">
        {entry && <ScrollArea className="max-h-[85dvh]" viewportClassName="max-h-[85dvh]">
          <div className="space-y-4 p-6">
            <div className="space-y-2 pr-8">
              <DialogTitle className="text-lg font-semibold text-[#30150a]">{concept.concept_name || "Untitled concept"}</DialogTitle>
              <div className="flex flex-wrap gap-1.5">
                {format && <Tag>{FORMAT_LABELS[format] || sentenceLabel(format)}</Tag>}
                {concept.persona_label && <Tag>{concept.persona_label}</Tag>}
                {concept.awareness_stage && <Tag>{sentenceLabel(concept.awareness_stage)}</Tag>}
              </div>
              {entry.legacyWeekly && <p className="text-xs text-stone-500">{entry.productUnspecified ? "Saved from Weekly Strategy at brand level; the original product and date weren't recorded." : "Saved from Weekly Strategy; the original generation date wasn't recorded."}</p>}
            </div>
            {(concept.hypothesis || concept.angle || concept.concept_direction) && <div className="cs-generate-result space-y-2">
              {concept.angle && <p><strong>Angle:</strong> {concept.angle}</p>}
              {concept.hypothesis && <p><strong>Hypothesis:</strong> {concept.hypothesis}</p>}
              {concept.concept_direction && <p><strong>Direction:</strong> {concept.concept_direction}</p>}
            </div>}
            {brief.hooks?.length > 0 && <ResultSection title="Hooks"><ul className="list-disc space-y-1 pl-5">{brief.hooks.map((hook, index) => <li key={index}>{hook}</li>)}</ul></ResultSection>}
            {brief.headlines?.length > 0 && <ResultSection title="Headlines"><ul className="list-disc space-y-1 pl-5">{brief.headlines.map((headline, index) => <li key={index}>{headline}</li>)}</ul></ResultSection>}
            {brief.script && <ResultSection title="Script"><pre className="whitespace-pre-wrap font-sans">{brief.script}</pre></ResultSection>}
            {brief.static_brief && <ResultSection title="Static brief"><pre className="whitespace-pre-wrap font-sans">{brief.static_brief}</pre></ResultSection>}
            {brief.ugc_markdown && <>
              <div className="flex flex-wrap items-center gap-3">
                <CopyButton text={brief.ugc_plain || brief.ugc_markdown} />
                <span className="text-xs text-stone-500">
                  {brief.ugc_meta?.videos_included ? `Video links work until ${new Date(brief.ugc_meta.video_links_expire_at).toLocaleDateString("en-US", { dateStyle: "medium" })}.` : `Top videos left out: fewer than ${brief.ugc_meta?.min_videos ?? 4} saved video ads for this product.`}
                  {brief.ugc_meta?.generated_hooks > 0 ? " This persona had no hooks yet, so new ones were written." : ""}
                </span>
              </div>
              <UgcDocument markdown={brief.ugc_markdown} />
            </>}
          </div>
        </ScrollArea>}
      </DialogContent>
    </Dialog>
  );
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

function Tag({ children }) {
  return <span className="rounded-full border border-[#6c3403]/20 bg-[#ffe9d6] px-2 py-0.5 text-[10px] font-medium text-[#6c3403]">{children}</span>;
}

GenerateView.propTypes = { ctx: PropTypes.object.isRequired };
GenerateWorkspace.propTypes = { sidebarFooter: PropTypes.node, sidebar: PropTypes.node.isRequired, children: PropTypes.node.isRequired, isStatics: PropTypes.bool, footer: PropTypes.node };
WorkspaceEmpty.propTypes = { icon: PropTypes.elementType.isRequired, title: PropTypes.string.isRequired, hint: PropTypes.string.isRequired };
GenerateLoading.propTypes = { label: PropTypes.string.isRequired };
GeneratingNotice.propTypes = { label: PropTypes.string.isRequired };
SidebarSelect.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired, options: PropTypes.array.isRequired };
SidebarNumber.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.number.isRequired, min: PropTypes.number.isRequired, max: PropTypes.number.isRequired, onChange: PropTypes.func.isRequired };
SidebarLoading.propTypes = { label: PropTypes.string.isRequired };
SidebarInput.propTypes = { label: PropTypes.string.isRequired, type: PropTypes.string, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, onChange: PropTypes.func.isRequired, placeholder: PropTypes.string };
Field.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
GenerationGrid.propTypes = { items: PropTypes.array.isRequired, rate: PropTypes.func.isRequired, selecting: PropTypes.bool, selected: PropTypes.instanceOf(Set).isRequired, toggle: PropTypes.func.isRequired, disabled: PropTypes.bool };
GeneratedImage.propTypes = { item: PropTypes.object.isRequired, rate: PropTypes.func.isRequired, selecting: PropTypes.bool, selected: PropTypes.bool, toggle: PropTypes.func.isRequired, disabled: PropTypes.bool, onPreview: PropTypes.func.isRequired };
ResultSection.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
TextResultsGrid.propTypes = { entries: PropTypes.array.isRequired };
TextResultCard.propTypes = { entry: PropTypes.object.isRequired, onOpen: PropTypes.func.isRequired };
TextResultDialog.propTypes = { entry: PropTypes.object, onClose: PropTypes.func.isRequired };
UgcDocument.propTypes = { markdown: PropTypes.string.isRequired };
CopyButton.propTypes = { text: PropTypes.string.isRequired };
HistoryControls.propTypes = { history: PropTypes.object.isRequired, disabled: PropTypes.bool };
Tag.propTypes = { children: PropTypes.node };
BriefPanel.propTypes = { productId: PropTypes.string };
