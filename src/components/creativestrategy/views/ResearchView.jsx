// Research — run the research agents and present the captured intel through
// persona previews, detailed persona dialogs, and expandable research rows.
import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  AlertTriangle, BadgeCheck, Box, Compass, FileSearch, Flame, Heart, Loader2, Plus, Smile, Sparkles,
  Star, Target, TrendingUp, Trophy, Zap,
} from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import RunModelControls from "../RunModelControls";
import { useRunModels } from "../useRunModels";
import { RUN_OPERATIONS } from "../run-model-operations";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { humanize } from "../JsonView";
import { EmptyState, ErrorBanner, PartialResultsNotice, ProgressiveSection } from "../ui";
import { useJobRunner } from "../JobsContext";
import redditIcon from "@/assets/icons/signup/reddit.svg";

const ORDER = [
  "reddit_sentiment", "brand_deep_dive", "consumer_research_report", "review_mining", "language_bank",
  "sentiment_alignment", "competitor_scan", "persona_cross_map",
  "persona_summary_table", "market_analysis", "features", "benefits", "pricing",
  "branding", "pain_points", "objections", "testimonials",
];

const PROGRESSIVE_RESEARCH_SECTIONS = [
  { type: "reddit_sentiment", title: "Reddit sentiment", phase: "mining_reddit", icon: redditIcon },
  { type: "brand_deep_dive", title: "Brand deep dive", phase: 1 },
  { type: "review_mining", title: "Review mining", phase: 2 },
  { type: "language_bank", title: "Language bank", phase: 2 },
  { type: "competitor_scan", title: "Competitor and market scan", phase: 3 },
  { type: "sentiment_alignment", title: "Sentiment alignment", phase: 4 },
  { type: "consumer_research_report", title: "Consumer research report", phase: 5 },
  { type: "persona_summary_table", title: "Persona summary table", phase: 6 },
];

// Full-persona dialog: the source app's PersonaCards layout. List sections in
// a two-column grid, then the full-width paired/long-form sections.
const PERSONA_GRID_SECTIONS = [
  { key: "core_beliefs", label: "Core beliefs", icon: Heart },
  { key: "dreams", label: "Dreams", icon: Sparkles },
  { key: "desires", label: "Desires", icon: Target },
  { key: "key_usps", label: "Key USPs for this persona", icon: Star },
  { key: "life_force_8", label: "Life Force 8 emotions", icon: Flame },
  { key: "learned_desires", label: "9 learned desires", icon: TrendingUp },
  { key: "emotions", label: "Emotions the product creates", icon: Smile },
  { key: "common_objections", label: "Common objections", icon: AlertTriangle },
];
// Shown in the header, the dedicated sections, or not at all (bookkeeping).
const PERSONA_HANDLED_KEYS = new Set([
  "label", "name", "title", "source", "description", "human_edited", "ad_evidence", "client_named",
  "created_at", "updated_at", "created_by", "problems_solutions", "angles", "angle_outcomes", "evidence_for_persona",
  ...PERSONA_GRID_SECTIONS.map((section) => section.key),
]);
const PERSONA_SUMMARY_FIELDS = [
  ["description", "Description"], ["core_beliefs", "Core beliefs"], ["dreams", "Dreams"],
  ["desires", "Desires"], ["common_objections", "Common objections"], ["key_usps", "Key USPs"],
  ["life_force_8", "Life Force 8 emotions"], ["learned_desires", "Learned desires"],
  ["emotions", "Emotions"], ["problems_solutions", "Problems / solutions"], ["angle_outcomes", "Angle → outcomes"],
];

export default function ResearchView({ ctx }) {
  const {
    selectedProduct, selectedProductId, renderHeaderActions,
  } = ctx;
  const models = useRunModels(selectedProductId);
  const [intel, setIntel] = useState({});
  const [types, setTypes] = useState([]);
  const [err, setErr] = useState(null);
  const [personaBusy, setPersonaBusy] = useState(null);
  const [addForm, setAddForm] = useState(null);
  const [openPersona, setOpenPersona] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (productId, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await creativeApi.getResearch(productId);
      setIntel(response.intel || {});
      setTypes(response.intelTypes || []);
    } catch (error) {
      setErr(error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setOpenPersona(null);
    if (selectedProductId) load(selectedProductId);
    else { setIntel({}); setTypes([]); }
  }, [load, selectedProductId]);

  const { job: researchJob, start: startResearch } = useJobRunner({
    kind: "research", productId: selectedProductId, onComplete: () => load(selectedProductId),
  });
  const researchActive = isActiveJob(researchJob);

  useEffect(() => {
    if (!researchActive || !selectedProductId) return undefined;
    load(selectedProductId, { silent: true });
    const interval = window.setInterval(() => load(selectedProductId, { silent: true }), 2500);
    return () => window.clearInterval(interval);
  }, [load, researchActive, selectedProductId]);

  const run = async () => {
    if (!selectedProductId) return;
    setErr(null);
    try {
      const { jobId } = await creativeApi.runResearch(selectedProductId, models.forRun(RUN_OPERATIONS.research));
      startResearch(jobId); models.reset(RUN_OPERATIONS.research);
    } catch (error) { setErr(error.message); }
  };

  const refinePersona = async (index, instructions) => {
    setErr(null);
    setPersonaBusy(index);
    try {
      await creativeApi.expandPersona({
        productId: selectedProductId,
        aiSelections: models.forRun(RUN_OPERATIONS.persona),
        personaIndex: index,
        instructions: instructions || undefined,
      });
      models.reset(RUN_OPERATIONS.persona);
      await load(selectedProductId);
    } catch (error) {
      setErr(error.message);
    } finally {
      setPersonaBusy(null);
    }
  };

  const addPersona = async () => {
    if (!addForm?.name?.trim() || (addForm?.description || "").trim().length < 20) {
      setErr("Add persona: name and a description of at least 20 characters are required.");
      return;
    }
    setErr(null);
    setPersonaBusy("add");
    try {
      await creativeApi.expandPersona({
        productId: selectedProductId,
        aiSelections: models.forRun(RUN_OPERATIONS.persona),
        name: addForm.name.trim(),
        description: addForm.description.trim(),
      });
      setAddForm(null);
      models.reset(RUN_OPERATIONS.persona);
      await load(selectedProductId);
    } catch (error) {
      setErr(error.message);
    } finally {
      setPersonaBusy(null);
    }
  };

  const personas = intel.personas?.personas || (Array.isArray(intel.personas) ? intel.personas : []);
  // The summary compares research personas; cross-map requires ad-audit data.
  // Derive from the current personas so older runs and refinements also work.
  const researchIntel = {
    ...intel,
    ...(Array.isArray(personas) && personas.length ? {
      persona_summary_table: {
        columns: personas.map((persona, index) => ({ persona_label: persona.label || persona.name || persona.title || `Persona ${index + 1}` })),
        rows: PERSONA_SUMMARY_FIELDS.map(([field_key, field_label]) => ({
          field_key, field_label, values: personas.map((persona) => persona[field_key] ?? null),
        })),
      },
    } : {}),
  };
  const sectionTypes = types
    .filter((type) => type !== "personas" && type !== "trending_creative")
    .sort((a, b) => {
      const first = ORDER.indexOf(a);
      const second = ORDER.indexOf(b);
      return (first === -1 ? 999 : first) - (second === -1 ? 999 : second);
    });
  const researchPhase = researchJob?.progress?.phase;
  const progressiveTypes = new Set(PROGRESSIVE_RESEARCH_SECTIONS.map((section) => section.type));
  const extraSectionTypes = sectionTypes.filter((type) => !progressiveTypes.has(type));
  const readyCount = PROGRESSIVE_RESEARCH_SECTIONS.filter((section) => researchIntel[section.type]).length + (personas.length > 0 ? 1 : 0);
  const stageActive = (phase) => researchActive && String(researchPhase) === String(phase);

  return (
    <div className="space-y-5">
      {renderHeaderActions(
        <div className="flex items-center gap-3">
        <button type="button" onClick={run} disabled={!selectedProductId || researchActive} className="cs-primary-button">
          {researchActive && <Loader2 className="h-4 w-4 animate-spin" />}
          {researchActive ? "Running Research…" : "Run Research"}
        </button>
        </div>
      )}
      {selectedProduct && <p className="text-xs font-normal text-neutral-400">{selectedProduct.name} · complete research usually takes 5–10 minutes</p>}

      {selectedProductId && <RunModelControls models={models} operations={RUN_OPERATIONS.research} disabled={Boolean(researchActive)} />}
      <ErrorBanner message={err} />
      <PartialResultsNotice active={researchActive} completed={readyCount} total={PROGRESSIVE_RESEARCH_SECTIONS.length + 1} label="research sections" />

      {!selectedProductId ? (
        <EmptyState icon={Box} title="No product selected" hint="Select a product above to run the research agent." />
      ) : (
        <div className="space-y-7">
          <section>
            {Array.isArray(personas) && personas.length > 0 ? (
              <>
              <div className="cs-research-section-heading">
                <div className="flex items-center gap-2">
                  <h2>Personas</h2>
                  <span>{personas.length}</span>
                </div>
                <button type="button" onClick={() => setAddForm(addForm ? null : { name: "", description: "" })} className="cs-research-add-button">
                  {addForm ? "Cancel" : <><Plus className="h-3.5 w-3.5" /> Add Persona</>}
                </button>
              </div>

              {addForm && (
                <div className="cs-research-add-form">
                  <input
                    value={addForm.name}
                    onChange={(event) => setAddForm({ ...addForm, name: event.target.value })}
                    placeholder="Persona name"
                    className="cs-research-input"
                  />
                  <textarea
                    value={addForm.description}
                    onChange={(event) => setAddForm({ ...addForm, description: event.target.value })}
                    placeholder="Who they are and what they want (minimum 20 characters)"
                    rows={3}
                    className="cs-research-input"
                  />
                  <RunModelControls models={models} operations={RUN_OPERATIONS.persona} title="Model for this persona" disabled={personaBusy === "add"} />
                  <button type="button" onClick={addPersona} disabled={personaBusy === "add"} className="cs-primary-button self-start">
                    {personaBusy === "add" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {personaBusy === "add" ? "Building…" : "Build Persona"}
                  </button>
                </div>
              )}

              <div className="cs-persona-grid">
                {personas.map((persona, index) => (
                  <PersonaCard
                    key={index}
                    persona={persona}
                    index={index}
                    orange={index % 2 === 1}
                    onOpen={() => setOpenPersona(index)}
                  />
                ))}
              </div>
              </>
            ) : (
              <ProgressiveSection
                title="Personas"
                description={researchActive ? "Built after the market and consumer evidence is synthesized." : "Run research to build evidence-backed customer personas."}
                active={stageActive(6) || (loading && types.length === 0)}
                cards={4}
              />
            )}
          </section>

          <section>
              <div className="cs-research-section-heading">
                <div className="flex items-center gap-2">
                  <h2>Research Intel</h2>
                  <span>{readyCount}</span>
                </div>
              </div>
              <div className="cs-research-intel-list">
                {PROGRESSIVE_RESEARCH_SECTIONS.map((section) => researchIntel[section.type]
                  ? <ResearchIntelRow key={section.type} title={section.title} icon={section.icon} data={researchIntel[section.type]} />
                  : (
                    <div key={section.type} className="relative">
                      {section.icon && <img src={section.icon} alt="" aria-hidden="true" className="absolute left-4 top-4 z-10 h-5 w-5" />}
                      <ProgressiveSection title={section.title} active={stageActive(section.phase)} lines={2} className={`rounded-[20px] ${section.icon ? "[&_h3]:pl-7" : ""}`} />
                    </div>
                  ))}
                {extraSectionTypes.map((type) => <ResearchIntelRow key={type} title={humanize(type)} data={intel[type]} />)}
              </div>
              {!intel.persona_cross_map && <p className="mt-3 text-xs text-neutral-500">Persona cross-map compares research personas with audiences found in your ads. Run ad analysis, then Research, to build it. The persona summary table above works from research alone.</p>}
          </section>
        </div>
      )}

      <PersonaDialog
        models={models}
        persona={openPersona == null ? null : personas[openPersona]}
        index={openPersona}
        busy={openPersona != null && personaBusy === openPersona}
        onOpenChange={(open) => !open && setOpenPersona(null)}
        onRefine={(instructions) => refinePersona(openPersona, instructions)}
      />
    </div>
  );
}

function personaName(persona, index) {
  return persona?.label || persona?.name || persona?.title || (index != null ? `Persona ${index + 1}` : "Persona");
}

/** Source and validation tags, as on the source app's persona cards. */
function personaBadges(persona) {
  const badges = [];
  if (persona.source === "ad_derived") badges.push({ label: "From ads", title: "Found in this brand's live ads by the Insights audit; no research persona matched it" });
  if (persona.source === "custom") badges.push({ label: "Custom", title: "Added by your team" });
  if (persona.source === "client") badges.push({ label: "From client", title: "Described by the client" });
  if (persona.source !== "ad_derived" && persona.ad_evidence) badges.push({ label: "Validated by ads", title: "The latest Insights audit found live ads reaching this persona", check: true });
  if (persona.human_edited) badges.push({ label: "Edited", title: "Edited by a person; research re-runs keep this version" });
  return badges;
}

function adEvidenceLine(evidence) {
  if (!evidence) return null;
  const count = evidence.ad_count ?? evidence.ad_names?.length ?? 0;
  const parts = [`Seen in ${count} ad${count === 1 ? "" : "s"}`];
  if (evidence.total_spend) parts.push(`$${Math.round(evidence.total_spend).toLocaleString()} spend`);
  if (evidence.last_seen_at) parts.push(`last audit ${new Date(evidence.last_seen_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`);
  return parts.join(" · ");
}

function PersonaCard({ persona, index, orange, onOpen }) {
  const angles = toDisplayList(findValue(persona, ["angles", "angle"]));
  const name = personaName(persona, index);
  const summary = typeof persona.description === "string" ? persona.description.trim() : "";
  const evidence = adEvidenceLine(persona.ad_evidence);

  return (
    <article className={`cs-persona-card ${orange ? "is-orange" : ""}`}>
      <header className="cs-persona-card__header">
        <h3>{name}</h3>
        <div className="cs-persona-card__badges">
          {personaBadges(persona).map((badge) => <span key={badge.label} title={badge.title}>{badge.label}</span>)}
        </div>
      </header>
      <div className="cs-persona-card__body">
        {(summary || evidence) && (
          <div className="cs-persona-card__summary">
            <h4>Summary</h4>
            {summary && <p>{summary}</p>}
            {evidence && <small>{evidence}</small>}
          </div>
        )}
        <h4>Angles</h4>
        {angles.length > 0 ? (
          <ul>{angles.map((angle, angleIndex) => <li key={angleIndex}>{angle}</li>)}</ul>
        ) : (
          <p className="cs-research-muted">No angles captured for this persona yet.</p>
        )}
        <button type="button" onClick={onOpen} className="cs-persona-full-button">View Full Persona</button>
      </div>
    </article>
  );
}

function PersonaDialog({ persona, index, busy, onOpenChange, onRefine, models }) {
  const [refining, setRefining] = useState(false);
  const [instructions, setInstructions] = useState("");
  const name = personaName(persona, index);
  const description = typeof persona?.description === "string" ? persona.description.trim() : "";
  const evidence = adEvidenceLine(persona?.ad_evidence);

  useEffect(() => {
    setRefining(false);
    setInstructions("");
  }, [index]);

  return (
    <Dialog open={Boolean(persona)} onOpenChange={onOpenChange}>
      <DialogContent
        disableSlide
        overlayClassName="bg-black/35 backdrop-blur-[1px]"
        className="cs-research-modal sm:max-w-[900px]"
      >
        <DialogHeader className="cs-research-modal__header cs-persona-modal__header">
          <div className="cs-persona-modal__title">
            {index != null && <span className="cs-persona-modal__number">P{index + 1}</span>}
            <DialogTitle>{name}</DialogTitle>
          </div>
          {persona && personaBadges(persona).length > 0 && (
            <div className="cs-persona-modal__badges">
              {personaBadges(persona).map((badge) => (
                <span key={badge.label} title={badge.title}>{badge.check && <BadgeCheck className="h-3 w-3" />}{badge.label}</span>
              ))}
            </div>
          )}
          <DialogDescription className={description ? "cs-persona-modal__summary" : undefined}>
            {description || "Complete persona research profile"}
          </DialogDescription>
          {evidence && <p className="cs-persona-modal__evidence">{evidence}</p>}
        </DialogHeader>
        {persona && (
          <div className="cs-research-modal__scroll">
            <PersonaProfile persona={persona} />
            <div className="cs-persona-refine">
              <button type="button" onClick={() => setRefining((current) => !current)} className="cs-research-add-button">
                {refining ? "Cancel Refine" : "Refine Persona"}
              </button>
              {refining && (
                <div className="mt-3 space-y-3">
                  <textarea
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                    placeholder="Optional direction, such as emphasizing price sensitivity or speed"
                    rows={3}
                    className="cs-research-input"
                  />
                  <RunModelControls models={models} operations={RUN_OPERATIONS.persona} title="Model for this refinement" disabled={busy} />
                  <button type="button" onClick={() => onRefine(instructions)} disabled={busy} className="cs-primary-button">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {busy ? "Refining…" : "Refine Persona"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** The full persona, laid out like the source app's expanded PersonaCards. */
function PersonaProfile({ persona }) {
  const pairs = (Array.isArray(persona.problems_solutions) ? persona.problems_solutions : [])
    .map((item) => typeof item === "string" ? { problem: item, solution: "" } : { problem: item?.problem ?? "", solution: item?.solution ?? "" })
    .filter((item) => item.problem || item.solution);
  const angles = toDisplayList(persona.angles);
  const outcomes = toDisplayList(persona.angle_outcomes);
  const extra = Object.fromEntries(Object.entries(persona).filter(([key, value]) => !PERSONA_HANDLED_KEYS.has(key) && value != null && value !== ""));
  const hasEvidence = persona.evidence_for_persona && (typeof persona.evidence_for_persona !== "object" || Object.keys(persona.evidence_for_persona).length > 0);

  return (
    <div className="cs-persona-profile">
      <div className="cs-persona-profile__grid">
        {PERSONA_GRID_SECTIONS.map((section) => (
          <PersonaListSection key={section.key} icon={section.icon} label={section.label} items={persona[section.key]} />
        ))}
      </div>

      {pairs.length > 0 && (
        <PersonaBlock icon={Zap} label="Problems → solutions">
          <ol className="cs-persona-pairs">
            {pairs.map((pair, index) => (
              <li key={index}>
                {pair.problem && <p><span>Problem</span>{pair.problem}</p>}
                {pair.solution && <p><span>Solution</span>{pair.solution}</p>}
              </li>
            ))}
          </ol>
        </PersonaBlock>
      )}

      {angles.length > 0 && (
        <PersonaBlock icon={Compass} label="Angles">
          <div className="cs-persona-chips">{angles.map((angle, index) => <span key={index}>{angle}</span>)}</div>
        </PersonaBlock>
      )}

      {outcomes.length > 0 && (
        <PersonaBlock icon={Trophy} label="Angle → outcomes (ad angles for this persona)">
          <ul className="cs-research-value-list">{outcomes.map((outcome, index) => <li key={index}>{outcome}</li>)}</ul>
        </PersonaBlock>
      )}

      {hasEvidence && (
        <PersonaBlock icon={FileSearch} label="Research evidence">
          <ResearchValue data={persona.evidence_for_persona} />
        </PersonaBlock>
      )}

      {Object.keys(extra).length > 0 && (
        <PersonaBlock icon={FileSearch} label="More details">
          <ResearchDetails data={extra} />
        </PersonaBlock>
      )}
    </div>
  );
}

function PersonaBlock({ icon: Icon, label, children }) {
  return (
    <section className="cs-persona-block">
      <h4><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</h4>
      {children}
    </section>
  );
}

function PersonaListSection({ icon, label, items }) {
  const list = (Array.isArray(items) ? items : toDisplayList(items)).filter((item) => item != null && item !== "");
  if (list.length === 0) return null;
  return (
    <PersonaBlock icon={icon} label={label}>
      <ul className="cs-research-value-list">
        {list.map((item, index) => (
          <li key={index}>
            {item && typeof item === "object" && "emotion" in item
              ? <><strong>{item.emotion}</strong>{item.why && <span className="cs-persona-why"> {item.why}</span>}</>
              : typeof item === "object" ? <ResearchValue data={item} /> : String(item)}
          </li>
        ))}
      </ul>
    </PersonaBlock>
  );
}

function ResearchIntelRow({ title, data, icon }) {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);
  const [headerStuck, setHeaderStuck] = useState(false);
  const stickySentinelRef = useRef(null);
  const entries = objectEntries(data);
  const isPersonaTable = Array.isArray(data?.columns) && Array.isArray(data?.rows);
  const previewEntries = getPreviewEntries(data);
  const hasMore = entries.length > 0;
  const descriptors = entries.slice(0, 3).map(([key]) => humanize(key));
  const lastRun = findValue(data, ["last_run", "lastRun", "generated_at", "generatedAt", "updated_at", "updatedAt"]);

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
          <h3 className="flex items-center gap-2">{icon && <img src={icon} alt="" aria-hidden="true" className="h-5 w-5 shrink-0" />}{title}</h3>
          <p>
            {descriptors.length > 0 && <span>{descriptors.join(", ")}</span>}
            {lastRun && <span>Last Run: {formatDate(lastRun)}</span>}
          </p>
        </div>
        <span className="cs-research-intel__toggle"><Plus className="h-5 w-5" /></span>
      </button>
      {open && (
        <div className="cs-research-intel__body">
          {isPersonaTable ? <PersonaSummaryTable data={data} /> : <ResearchDetails data={Object.fromEntries(full ? entries : previewEntries)} />}
          {hasMore && !isPersonaTable && (
            <button type="button" onClick={() => setFull((current) => !current)} className="cs-research-details-button">
              {full ? "Show Key Details" : "View Full Details"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function PersonaSummaryTable({ data }) {
  if (!data.columns.length) return <p className="cs-research-muted">No research personas are available for comparison.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">Side-by-side comparison of research personas</caption>
        <thead>
          <tr>
            <th scope="col" className="min-w-[9rem] border-b p-3 align-top">Field</th>
            {data.columns.map((column, index) => <th key={index} scope="col" className="min-w-[16rem] border-b p-3 align-top">{column.persona_label || `Persona ${index + 1}`}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, index) => (
            <tr key={row.field_key || index}>
              <th scope="row" className="border-b p-3 align-top">{row.field_label || humanize(row.field_key)}</th>
              {data.columns.map((_, columnIndex) => <td key={columnIndex} className="border-b p-3 align-top"><ResearchValue data={row.values?.[columnIndex]} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResearchDetails({ data, exclude = new Set() }) {
  const entries = objectEntries(data).filter(([key]) => !exclude.has(key));
  if (entries.length === 0) return <ResearchValue data={data} />;

  return (
    <div className="cs-research-details">
      {entries.map(([key, value]) => (
        <section key={key} className="cs-research-detail-section">
          <h4>{humanize(key)}</h4>
          <ResearchValue data={value} />
        </section>
      ))}
    </div>
  );
}

function ResearchValue({ data }) {
  if (data == null || data === "") return <p className="cs-research-muted">—</p>;
  if (typeof data === "string" && /^https:\/\/(?:www\.)?reddit\.com\/r\//i.test(data)) {
    return <a href={data} target="_blank" rel="noopener noreferrer" className="break-words text-orange-600 underline">{data}</a>;
  }
  if (typeof data !== "object") return <p className="whitespace-pre-wrap break-words">{String(data)}</p>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <p className="cs-research-muted">None captured</p>;
    return (
      <ul className="cs-research-value-list">
        {data.map((item, index) => (
          <li key={index}>{typeof item === "object" && item !== null ? <ResearchValue data={item} /> : String(item)}</li>
        ))}
      </ul>
    );
  }

  return (
    <div className="cs-research-nested">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <h5>{humanize(key)}</h5>
          <ResearchValue data={value} />
        </div>
      ))}
    </div>
  );
}

function objectEntries(data) {
  if (data && typeof data === "object" && !Array.isArray(data)) return Object.entries(data);
  return [["details", data]];
}

function getPreviewEntries(data) {
  // Show research findings before transport metadata such as query lists.
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const evidenceKey = ["competitors", "negative", "matched_personas"].find((key) => Array.isArray(data[key]) && data[key].length);
    if (evidenceKey) return [["summary", data.summary || data.coverage_summary?.top_opportunity], [evidenceKey, data[evidenceKey]]].filter(([, value]) => value != null && value !== "");
    if (typeof data.summary === "string" && "threads_analyzed" in data) return [["summary", data.summary], ["threads_analyzed", data.threads_analyzed]];
  }
  const important = [];
  const visit = (value, depth = 0) => {
    if (!value || typeof value !== "object" || depth > 4 || important.length >= 2) return;
    Object.entries(value).forEach(([key, child]) => {
      if (important.length >= 2) return;
      if (/(usp|unique.?selling|claim)/i.test(key)) important.push([key, child]);
      else visit(child, depth + 1);
    });
  };
  visit(data);

  const result = [...important];
  objectEntries(data).forEach((entry) => {
    if (result.length < 2 && !result.some(([key]) => key === entry[0])) result.push(entry);
  });
  return result;
}

function findValue(data, keys) {
  if (!data || typeof data !== "object") return undefined;
  const normalized = new Set(keys.map((key) => key.toLowerCase().replace(/[^a-z0-9]/g, "")));
  const match = Object.entries(data).find(([key]) => normalized.has(key.toLowerCase().replace(/[^a-z0-9]/g, "")));
  return match?.[1];
}

function toDisplayList(value) {
  if (Array.isArray(value)) return value.map((item) => typeof item === "string" ? item : item?.name || item?.title || JSON.stringify(item));
  if (typeof value === "string") return value.split(/\n+/).map((item) => item.replace(/^[-•]\s*/, "").trim()).filter(Boolean);
  if (value && typeof value === "object") return Object.values(value).map(String);
  return [];
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).format(date);
}

function isActiveJob(job) {
  return Boolean(job && (job.status == null || job.status === "queued" || job.status === "running"));
}

function findScrollParent(node) {
  let parent = node.parentElement;
  while (parent) {
    const { overflowY } = window.getComputedStyle(parent);
    if (/(auto|scroll|overlay)/.test(overflowY)) return parent;
    parent = parent.parentElement;
  }
  return null;
}

ResearchView.propTypes = { ctx: PropTypes.object.isRequired };
PersonaCard.propTypes = {
  persona: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  orange: PropTypes.bool,
  onOpen: PropTypes.func.isRequired,
};
PersonaDialog.propTypes = {
  models: PropTypes.object.isRequired,
  persona: PropTypes.object,
  index: PropTypes.number,
  busy: PropTypes.bool,
  onOpenChange: PropTypes.func.isRequired,
  onRefine: PropTypes.func.isRequired,
};
PersonaProfile.propTypes = { persona: PropTypes.object.isRequired };
PersonaBlock.propTypes = { icon: PropTypes.elementType.isRequired, label: PropTypes.string.isRequired, children: PropTypes.node };
PersonaListSection.propTypes = { icon: PropTypes.elementType.isRequired, label: PropTypes.string.isRequired, items: PropTypes.any };
ResearchIntelRow.propTypes = { title: PropTypes.string.isRequired, data: PropTypes.any, icon: PropTypes.string };
PersonaSummaryTable.propTypes = { data: PropTypes.object.isRequired };
ResearchDetails.propTypes = { data: PropTypes.any, exclude: PropTypes.instanceOf(Set) };
ResearchValue.propTypes = { data: PropTypes.any };
