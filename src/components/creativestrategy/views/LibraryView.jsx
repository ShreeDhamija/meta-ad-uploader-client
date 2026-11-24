// Library — all generated hooks, headlines, and primary text shown together.
// Existing generation and status APIs are preserved behind a three-column board,
// with persona / status / date filters and a "create copy template" mode that
// saves picked headlines + primary texts as a Copy Template for the brand's
// Meta ad account (the same store Settings → Copy Templates reads).
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Archive, BookOpen, Box, Check, Copy, FilePlus2, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { creativeApi } from "@/lib/creativeApi";
import { saveCopyTemplate } from "@/lib/saveCopyTemplate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import RunModelControls from "../RunModelControls";
import { useRunModels } from "../useRunModels";
import { RUN_OPERATIONS } from "../run-model-operations";
import { ViewLoading, EmptyState, ErrorBanner } from "../ui";
import { useJobRunner } from "../JobsContext";
import "./library.css";
import { RunByNote } from "../run-by";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";

const TYPES = [
  { key: "hook", label: "Hooks", description: "Opening lines and scroll-stopping ideas" },
  { key: "headline", label: "Headlines", description: "Short, focused conversion messages" },
  { key: "primary_text", label: "Primary Text", description: "Longer-form ad copy and narratives" },
];

// What a Generate run writes. `types: null` = the full library. Headlines +
// primary text is the static-ad pair; hooks + headlines is never needed.
const GENERATE_OPTIONS = [
  { key: "all", label: "All", types: null, button: "Generate Library" },
  { key: "hook", label: "Hooks", types: ["hook"], button: "Generate Hooks" },
  { key: "headline", label: "Headlines", types: ["headline"], button: "Generate Headlines" },
  { key: "primary_text", label: "Primary Text", types: ["primary_text"], button: "Generate Primary Text" },
  { key: "headline+primary_text", label: "Headlines + Primary Text", types: ["headline", "primary_text"], button: "Generate Headlines + Primary Text" },
];

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "approved", label: "Approved" },
  { key: "archived", label: "Archived" },
];

const STATUS_LABELS = { approved: "Approved", archived: "Archived" };

// Copy Templates hold up to 5 of each (same cap as Top Ad Copy → template).
const MAX_PER_TYPE = 5;
const TEMPLATE_TYPES = ["headline", "primary_text"];

// Persona tags are slugs; primary-text tags are cut at 40 chars, hook and
// headline tags are not, so the first 40 chars identify a persona.
const personaKey = (slug) => slug.slice(0, 40);
const slugify = (name) => String(name).toLowerCase().replace(/\s+/g, "-");
const prettySlug = (slug) => slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const itemPersonaKeys = (item) => (item.tags || [])
  .filter((tag) => tag.startsWith("persona:"))
  .map((tag) => personaKey(tag.slice("persona:".length)));

export default function LibraryView({ ctx }) {
  const { selectedProductId, selectedBrand, renderHeaderActions } = ctx;
  const adAccountId = selectedBrand?.metaAdAccountId || null;
  const models = useRunModels(selectedProductId);
  const [items, setItems] = useState([]);
  const [lastRun, setLastRun] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [generateKey, setGenerateKey] = useState("all");
  const [researchPersonas, setResearchPersonas] = useState([]);

  const [personaFilter, setPersonaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  const [templateMode, setTemplateMode] = useState(false);
  const [picked, setPicked] = useState({ headline: [], primary_text: [] });
  const [nameDialogOpen, setNameDialogOpen] = useState(false);

  // `quiet` refreshes in place (after a run) instead of swapping the board for a spinner.
  const load = async (productId, { quiet = false } = {}) => {
    if (!productId) { setItems([]); setLastRun(null); return; }
    if (!quiet) setLoading(true);
    try {
      const response = await creativeApi.getLibrary(productId);
      setItems(response.items || []);
      setLastRun(response.lastRun || null);
    } catch (error) {
      setErr(error.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    setPersonaFilter("all");
    setTemplateMode(false);
    setPicked({ headline: [], primary_text: [] });
    if (selectedProductId) load(selectedProductId);
    else setItems([]);
  }, [selectedProductId]);

  // Research persona names give the persona filter proper labels (tags are slugs).
  useEffect(() => {
    let active = true;
    setResearchPersonas([]);
    if (!selectedProductId) return undefined;
    creativeApi.getResearch(selectedProductId)
      .then((response) => {
        if (!active) return;
        const found = response.intel?.personas?.personas || (Array.isArray(response.intel?.personas) ? response.intel.personas : []);
        setResearchPersonas(found.map((persona) => persona.name || persona.label).filter(Boolean));
      })
      .catch(() => { /* Labels fall back to the tag text. */ });
    return () => { active = false; };
  }, [selectedProductId]);

  const { job, start } = useJobRunner({
    kind: "generate_library",
    productId: selectedProductId,
    onComplete: () => load(selectedProductId, { quiet: true }),
  });

  const generateOption = GENERATE_OPTIONS.find((option) => option.key === generateKey) || GENERATE_OPTIONS[0];

  const run = async () => {
    if (!selectedProductId) return;
    setErr(null);
    try {
      const { jobId } = await creativeApi.runLibrary(selectedProductId, models.forRun(RUN_OPERATIONS.library), generateOption.types || undefined);
      start(jobId); models.reset(RUN_OPERATIONS.library);
    } catch (error) {
      setErr(error.message);
    }
  };

  const setStatus = async (id, status) => {
    setUpdating(`${id}:${status}`);
    setErr(null);
    try {
      await creativeApi.setLibraryStatus(id, status);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
    } catch (error) {
      setErr(error.message);
    } finally {
      setUpdating(null);
    }
  };

  const personaOptions = useMemo(() => {
    const names = new Map(researchPersonas.map((name) => [personaKey(slugify(name)), name]));
    const keys = new Set(items.flatMap(itemPersonaKeys));
    return [...keys]
      .map((key) => ({ key, label: names.get(key) || prettySlug(key) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items, researchPersonas]);
  const personaLabels = useMemo(() => new Map(personaOptions.map((option) => [option.key, option.label])), [personaOptions]);

  // Keep a chosen persona only while it still exists for this product.
  useEffect(() => {
    if (personaFilter !== "all" && !personaOptions.some((option) => option.key === personaFilter)) setPersonaFilter("all");
  }, [personaOptions, personaFilter]);

  const personaScoped = useMemo(
    () => (personaFilter === "all" ? items : items.filter((item) => itemPersonaKeys(item).includes(personaFilter))),
    [items, personaFilter],
  );

  const statusCounts = useMemo(() => ({
    all: personaScoped.length,
    approved: personaScoped.filter((item) => item.status === "approved").length,
    archived: personaScoped.filter((item) => item.status === "archived").length,
  }), [personaScoped]);

  const grouped = useMemo(() => {
    const visible = statusFilter === "all" ? personaScoped : personaScoped.filter((item) => item.status === statusFilter);
    const time = (item) => new Date(item.createdAt).getTime() || 0;
    const sorted = [...visible].sort((a, b) => (sortOrder === "oldest" ? time(a) - time(b) : time(b) - time(a)));
    return TYPES.reduce((result, type) => {
      result[type.key] = sorted.filter((item) => item.itemType === type.key);
      return result;
    }, {});
  }, [personaScoped, statusFilter, sortOrder]);

  const filtersActive = personaFilter !== "all" || statusFilter !== "all" || sortOrder !== "newest";
  const jobActive = job && (job.status == null || job.status === "queued" || job.status === "running");

  // ── Template selection ──
  const isPicked = (item) => picked[item.itemType]?.some((entry) => entry.id === item.id);
  const togglePicked = (item) => {
    if (!TEMPLATE_TYPES.includes(item.itemType)) return;
    setPicked((current) => {
      const list = current[item.itemType];
      const next = list.some((entry) => entry.id === item.id)
        ? list.filter((entry) => entry.id !== item.id)
        : list.length >= MAX_PER_TYPE ? list : [...list, { id: item.id, text: item.content }];
      return { ...current, [item.itemType]: next };
    });
  };
  const startTemplate = () => { setTemplateMode(true); setPicked({ headline: [], primary_text: [] }); };
  const cancelTemplate = () => { setTemplateMode(false); setPicked({ headline: [], primary_text: [] }); setNameDialogOpen(false); };
  const pickedTotal = picked.headline.length + picked.primary_text.length;

  return (
    <div className="space-y-5">
      {renderHeaderActions(
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={templateMode ? cancelTemplate : startTemplate}
            disabled={!selectedProductId || !adAccountId || loading || items.length === 0}
            title={!adAccountId ? "This brand has no Meta ad account to save templates to" : undefined}
            className="cs-library-template-button"
          >
            {templateMode ? <X className="h-4 w-4" /> : <FilePlus2 className="h-4 w-4" />}
            {templateMode ? "Cancel template" : "Create new template"}
          </button>
          <div className="cs-weekly-switcher cs-library-generate-types" role="group" aria-label="What to generate">
            {GENERATE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setGenerateKey(option.key)}
                disabled={!selectedProductId || Boolean(jobActive)}
                aria-pressed={generateKey === option.key}
                className={`cs-weekly-switcher__item ${generateKey === option.key ? "is-active" : ""}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={run} disabled={!selectedProductId || jobActive} className="cs-primary-button">
            {jobActive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {jobActive ? "Generating…" : generateOption.button}
          </button>
          {lastRun && <RunByNote label="Last generated" at={lastRun.at} uid={lastRun.uid} auto={lastRun.auto} className="w-full text-right text-[11px] text-neutral-500" />}
        </div>
      )}
      {selectedProductId && <RunModelControls models={models} operations={RUN_OPERATIONS.library} disabled={Boolean(jobActive)} />}
      <ErrorBanner message={err} />

      {selectedProductId && !loading && items.length > 0 && (
        templateMode ? (
          <div className="cs-library-template-bar" role="region" aria-label="Create copy template">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#3b170b]">Pick up to {MAX_PER_TYPE} headlines and {MAX_PER_TYPE} primary texts</p>
              <p className="mt-0.5 text-xs text-[#6c3403]/75">
                Headlines {picked.headline.length}/{MAX_PER_TYPE} · Primary text {picked.primary_text.length}/{MAX_PER_TYPE} — saved to Copy Templates for {selectedBrand?.metaAdAccountName || selectedBrand?.name || "this ad account"}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={cancelTemplate} className="cs-library-action is-archive">Cancel</button>
              <button type="button" onClick={() => setNameDialogOpen(true)} disabled={pickedTotal === 0} className="cs-library-action is-approve">
                <Check className="h-3.5 w-3.5" /> Save template
              </button>
            </div>
          </div>
        ) : (
          <div className="cs-library-filters">
            <div className="cs-weekly-switcher" role="group" aria-label="Status">
              {STATUS_FILTERS.map((option) => (
                <button key={option.key} type="button" onClick={() => setStatusFilter(option.key)} aria-pressed={statusFilter === option.key} className={`cs-weekly-switcher__item ${statusFilter === option.key ? "is-active" : ""}`}>
                  {option.label} <span>{statusCounts[option.key] || 0}</span>
                </button>
              ))}
            </div>
            <Select value={personaFilter} onValueChange={setPersonaFilter}>
              <SelectTrigger className="cs-weekly-filter-select cs-library-filter-select px-3" aria-label="Persona">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="cs-select-content bg-white">
                <SelectItem value="all">All personas</SelectItem>
                {personaOptions.map((option) => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="cs-weekly-filter-select cs-library-filter-select px-3" aria-label="Sort by date generated">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="cs-select-content bg-white">
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
            {filtersActive && (
              <button type="button" onClick={() => { setPersonaFilter("all"); setStatusFilter("all"); setSortOrder("newest"); }} className="cs-weekly-clear">Clear filters</button>
            )}
          </div>
        )
      )}

      {!selectedProductId ? (
        <EmptyState icon={Box} title="No product selected" hint="Select a product above to generate and manage copy." className="min-h-[420px]" />
      ) : loading ? (
        <ViewLoading label="Loading library…" className="min-h-[420px]" />
      ) : (
        <div className="cs-library-board">
          {TYPES.map((type) => {
            const list = grouped[type.key] || [];
            const selectable = templateMode && TEMPLATE_TYPES.includes(type.key);
            const hasAny = items.some((item) => item.itemType === type.key);
            return (
              <section key={type.key} className={`cs-library-column ${templateMode && !selectable ? "is-dimmed" : ""}`}>
                <div className="cs-library-column__header">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-[#3b170b]">{type.label}</h2>
                      <span className="cs-library-count">{list.length}</span>
                      {selectable && <span className="cs-library-count is-picked">{picked[type.key].length}/{MAX_PER_TYPE} picked</span>}
                    </div>
                    <p className="mt-1 text-xs font-normal text-[#6c3403]/70">{templateMode && !selectable ? "Not part of copy templates" : type.description}</p>
                  </div>
                </div>

                <div className="cs-library-column__body">
                  {list.length === 0 ? (
                    <div className="cs-library-empty">
                      <BookOpen className="h-5 w-5 text-[#6c3403]/45" />
                      <p className="text-sm font-medium text-[#4f3329]">No {type.label.toLowerCase()} {hasAny ? "match these filters" : "yet"}</p>
                      <p className="text-xs leading-5 text-[#6c3403]/60">
                        {hasAny ? "Change or clear the filters above." : "Generate the library to populate this column."}
                      </p>
                    </div>
                  ) : (
                    list.map((item) => (
                      <LibraryCard
                        key={item.id}
                        item={item}
                        updating={updating}
                        setStatus={setStatus}
                        personaLabels={personaLabels}
                        selectable={selectable}
                        picked={selectable && isPicked(item)}
                        pickDisabled={selectable && !isPicked(item) && picked[type.key].length >= MAX_PER_TYPE}
                        onTogglePick={() => togglePicked(item)}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <TemplateNameDialog
        open={nameDialogOpen}
        onOpenChange={setNameDialogOpen}
        adAccountId={adAccountId}
        picked={picked}
        onSaved={(name) => {
          toast.success(`Template "${name}" saved to Copy Templates for this ad account`);
          cancelTemplate();
        }}
      />
    </div>
  );
}

function LibraryCard({ item, updating, setStatus, personaLabels, selectable, picked, pickDisabled, onTogglePick }) {
  const personas = [...new Set(itemPersonaKeys(item))];
  const approving = updating === `${item.id}:approved`;
  const archiving = updating === `${item.id}:archived`;
  const resetting = updating === `${item.id}:draft`;
  const statusLabel = STATUS_LABELS[item.status];
  const copyContent = () => {
    navigator.clipboard?.writeText(item.content).catch(() => {});
  };

  return (
    <article
      className={`cs-library-card ${item.status === "archived" ? "is-archived" : ""} ${selectable ? "is-selectable" : ""} ${picked ? "is-picked" : ""} ${pickDisabled ? "is-pick-disabled" : ""}`}
      onClick={selectable && !pickDisabled ? onTogglePick : undefined}
    >
      <div className="flex items-start gap-3">
        {selectable && (
          <Checkbox
            checked={picked}
            disabled={pickDisabled}
            onCheckedChange={onTogglePick}
            onClick={(event) => event.stopPropagation()}
            className="cs-library-checkbox mt-1"
            aria-label="Add to template"
          />
        )}
        <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm font-normal leading-6 text-[#342923]">{item.content}</p>
      </div>

      {(statusLabel || personas.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {statusLabel && <span className={`cs-library-pill is-${item.status}`}>{statusLabel}</span>}
          {personas.map((key) => <span key={key} className="cs-library-pill">{personaLabels.get(key) || prettySlug(key)}</span>)}
        </div>
      )}

      {!selectable && (
        <div className="mt-4 flex items-center gap-2 border-t border-[#6c3403]/15 pt-3">
          {item.status !== "approved" && (
            <button type="button" onClick={() => setStatus(item.id, "approved")} disabled={Boolean(updating)} className="cs-library-action is-approve">
              {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
            </button>
          )}
          {item.status !== "archived" && (
            <button type="button" onClick={() => setStatus(item.id, "archived")} disabled={Boolean(updating)} className="cs-library-action is-archive">
              {archiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />} Archive
            </button>
          )}
          <button type="button" onClick={copyContent} className="cs-library-copy" aria-label="Copy text" title="Copy text">
            <Copy className="h-4 w-4" />
          </button>
          {item.status && item.status !== "draft" && (
            <button type="button" onClick={() => setStatus(item.id, "draft")} disabled={Boolean(updating)} className="cs-library-reset">
              {resetting ? "Resetting…" : "Reset to draft"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// Names the picked copy and saves it as a Copy Template, in the same shape
// Settings → Copy Templates writes ({ name, primaryTexts, headlines,
// descriptions, addDescriptions }). Refuses a name the account already uses,
// since saving would overwrite that template.
function TemplateNameDialog({ open, onOpenChange, adAccountId, picked, onSaved }) {
  const [name, setName] = useState("");
  const [existing, setExisting] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !adAccountId) return undefined;
    let active = true;
    setName("");
    setError(null);
    setExisting(null);
    setChecking(true);
    fetch(`${API_BASE_URL}/settings/ad-account?adAccountId=${encodeURIComponent(adAccountId)}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => { if (active) setExisting(Object.keys(data?.settings?.copyTemplates || {})); })
      .catch(() => { if (active) setExisting([]); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [open, adAccountId]);

  const trimmed = name.trim();
  const nameTaken = Boolean(trimmed) && (existing || []).includes(trimmed);
  const canSave = Boolean(trimmed) && !nameTaken && !checking && !saving && Boolean(adAccountId);

  const save = async (event) => {
    event?.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const template = {
      name: trimmed,
      primaryTexts: picked.primary_text.map((entry) => entry.text),
      headlines: picked.headline.map((entry) => entry.text),
      descriptions: [],
      addDescriptions: false,
    };
    try {
      await saveCopyTemplate(adAccountId, trimmed, template);
      onSaved(trimmed, template);
    } catch (saveError) {
      console.error(saveError);
      setError("Couldn't save the template. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="cs-library-template-dialog bg-white sm:max-w-md">
        <DialogTitle className="text-lg font-semibold text-[#3b170b]">Name your template</DialogTitle>
        <DialogDescription className="text-sm text-neutral-500">
          {picked.headline.length} headline{picked.headline.length === 1 ? "" : "s"} and {picked.primary_text.length} primary text{picked.primary_text.length === 1 ? "" : "s"} will be saved to Copy Templates.
        </DialogDescription>
        <form onSubmit={save} className="mt-2 space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Spring launch — headline set"
            maxLength={120}
            className="cs-library-template-input"
            aria-label="Template name"
          />
          {nameTaken && <p className="text-xs text-red-600">A template with this name already exists for this ad account.</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => onOpenChange(false)} disabled={saving} className="cs-library-action is-archive">Cancel</button>
            <button type="submit" disabled={!canSave} className="cs-library-action is-approve">
              {saving || checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save template
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

LibraryView.propTypes = { ctx: PropTypes.object.isRequired };
LibraryCard.propTypes = {
  item: PropTypes.object.isRequired,
  updating: PropTypes.string,
  setStatus: PropTypes.func.isRequired,
  personaLabels: PropTypes.instanceOf(Map).isRequired,
  selectable: PropTypes.bool,
  picked: PropTypes.bool,
  pickDisabled: PropTypes.bool,
  onTogglePick: PropTypes.func.isRequired,
};
TemplateNameDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  adAccountId: PropTypes.string,
  picked: PropTypes.shape({ headline: PropTypes.array, primary_text: PropTypes.array }).isRequired,
  onSaved: PropTypes.func.isRequired,
};
