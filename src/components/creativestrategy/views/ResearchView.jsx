// Research — run the 7-phase research agent for the selected product and view
// ALL captured intel: personas grid up top, then every product_intel section
// (brand deep dive, review mining, language bank, sentiment, consumer report,
// cross-map, + fan-out features/benefits/pricing/branding/etc.) as collapsible
// sections. Needs a product URL. Long-running (~5-10 min); JobStatus polls.
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { SearchCheck, Box, Plus } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Button } from "@/components/ui/button";
import { Section, humanize } from "../JsonView";
import { ViewLoading, EmptyState, ErrorBanner, SectionTitle } from "../ui";
import { useJobRunner, JobBadge } from "../JobsContext";

// Preferred display order; any other types render after these.
const ORDER = [
  "brand_deep_dive", "consumer_research_report", "review_mining", "language_bank",
  "sentiment_alignment", "competitor_scan", "persona_cross_map", "persona_summary_table",
  "market_analysis", "features", "benefits", "pricing", "branding",
  "pain_points", "objections", "testimonials",
];

export default function ResearchView({ ctx }) {
  const { selectedProduct, selectedProductId } = ctx;
  const [intel, setIntel] = useState({});
  const [types, setTypes] = useState([]);
  const [err, setErr] = useState(null);
  // expand-persona (sync): busy === persona index being refined, or "add".
  const [personaBusy, setPersonaBusy] = useState(null);
  const [addForm, setAddForm] = useState(null); // { name, description } when the add form is open
  const [loading, setLoading] = useState(false);

  const load = async (pid) => {
    setLoading(true);
    try {
      const r = await creativeApi.getResearch(pid);
      setIntel(r.intel); setTypes(r.intelTypes);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedProductId) load(selectedProductId);
    else { setIntel({}); setTypes([]); }
  }, [selectedProductId]);

  // Tracked jobs persist across tab switches + reload data on completion.
  const { job: researchJob, start: startResearch } = useJobRunner({
    kind: "research", productId: selectedProductId, onComplete: () => load(selectedProductId),
  });
  const { job: redditJob, start: startReddit } = useJobRunner({
    kind: "reddit_sentiment", productId: selectedProductId, onComplete: () => load(selectedProductId),
  });

  if (!selectedProductId) {
    return <EmptyState icon={Box} title="No product selected" hint="Select a product in the top bar to run the research agent." />;
  }

  const run = async () => {
    setErr(null);
    try { const { jobId } = await creativeApi.runResearch(selectedProductId); startResearch(jobId); }
    catch (e) { setErr(e.message); }
  };

  const runReddit = async () => {
    setErr(null);
    try { const { jobId } = await creativeApi.runReddit(selectedProductId); startReddit(jobId); }
    catch (e) { setErr(e.message); }
  };

  // Refine one existing persona in place (one LLM call, no full re-research).
  const refinePersona = async (index, instructions) => {
    setErr(null); setPersonaBusy(index);
    try {
      await creativeApi.expandPersona({ productId: selectedProductId, personaIndex: index, instructions: instructions || undefined });
      await load(selectedProductId);
    } catch (e) { setErr(e.message); } finally { setPersonaBusy(null); }
  };

  // Add a brand-new persona from a name + short description skeleton.
  const addPersona = async () => {
    if (!addForm?.name?.trim() || (addForm?.description || "").trim().length < 20) {
      setErr("Add persona: name and a description of at least 20 characters are required.");
      return;
    }
    setErr(null); setPersonaBusy("add");
    try {
      await creativeApi.expandPersona({ productId: selectedProductId, name: addForm.name.trim(), description: addForm.description.trim() });
      setAddForm(null);
      await load(selectedProductId);
    } catch (e) { setErr(e.message); } finally { setPersonaBusy(null); }
  };

  const personas = intel.personas?.personas || (Array.isArray(intel.personas) ? intel.personas : []);
  const reddit = intel.reddit_sentiment || null;
  // Sort produced types by preferred order, excluding personas + reddit (own section).
  const sectionTypes = types
    .filter((t) => t !== "personas" && t !== "reddit_sentiment")
    .sort((a, b) => {
      const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={run} size="sm" className="rounded-xl">Run Research</Button>
        <JobBadge job={researchJob} />
        <Button onClick={runReddit} variant="outline" size="sm" className="rounded-xl">Run Reddit sentiment</Button>
        <JobBadge job={redditJob} />
        <span className="text-sm text-neutral-400">{selectedProduct?.name} · research ~5–10 min</span>
      </div>
      <ErrorBanner message={err} />

      {loading && types.length === 0 ? (
        <ViewLoading label="Loading research…" />
      ) : types.length === 0 ? (
        <EmptyState icon={SearchCheck} title="No research yet"
          hint="Run the 7-phase research agent (the product needs a URL) to build personas, brand deep dive, language bank, and more." />
      ) : (
      <div className="space-y-5">
      {reddit && <RedditSentiment data={reddit} />}

      {Array.isArray(personas) && personas.length > 0 && (
        <div>
          <SectionTitle count={personas.length}
            actions={
              <Button onClick={() => setAddForm(addForm ? null : { name: "", description: "" })} size="sm" variant="outline" className="rounded-lg h-7 text-xs gap-1">
                {addForm ? "Cancel" : <><Plus className="w-3.5 h-3.5" /> Add persona</>}
              </Button>
            }>
            Personas
          </SectionTitle>

          {addForm && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 mb-4 space-y-2">
              <input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Persona name (e.g. Budget-conscious new parent)"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
              />
              <textarea
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                placeholder="1–3 sentence description — who they are, what they want (min 20 chars). The agent fleshes this into the full 11-field profile grounded in the brand's research."
                rows={3}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                onClick={addPersona}
                disabled={personaBusy === "add"}
                className="rounded-xl bg-neutral-900 text-white px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {personaBusy === "add" ? "Building…" : "Build persona"}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
            {personas.map((p, i) => (
              <PersonaCard
                key={i}
                persona={p}
                index={i}
                busy={personaBusy === i}
                onRefine={(instructions) => refinePersona(i, instructions)}
              />
            ))}
          </div>
        </div>
      )}

      {sectionTypes.length > 0 && (
        <div className="space-y-3">
          <SectionTitle count={`${sectionTypes.length} sections`}>Research intel</SectionTitle>
          {sectionTypes.map((t) => (
            <Section key={t} title={humanize(t)} data={intel[t]} />
          ))}
        </div>
      )}
      </div>
      )}
    </div>
  );
}

// One persona card + an inline "Refine" control. Refine re-fleshes this
// persona in place via expand-persona (one LLM call), optionally steered by a
// free-text instruction ("make her more price-sensitive").
function PersonaCard({ persona, index, busy, onRefine }) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  return (
    <div className="space-y-1">
      <Section title={persona.label || persona.name || persona.title || `Persona ${index + 1}`} data={persona} />
      <div className="flex items-center gap-2 pl-1">
        <button onClick={() => setOpen((v) => !v)} className="text-xs text-neutral-500 hover:text-neutral-800">
          {open ? "Cancel" : "Refine"}
        </button>
        {persona.source === "custom" && <span className="text-[10px] uppercase tracking-wide text-neutral-400">custom</span>}
      </div>
      {open && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-2">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Optional: how to refine (e.g. make her more price-sensitive, emphasize speed). Leave blank to just regenerate from current research."
            rows={2}
            className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs"
          />
          <button
            onClick={() => onRefine(instructions)}
            disabled={busy}
            className="rounded-lg bg-neutral-900 text-white px-2.5 py-1 text-xs disabled:opacity-50"
          >
            {busy ? "Refining…" : "Refine persona"}
          </button>
        </div>
      )}
    </div>
  );
}
PersonaCard.propTypes = { persona: PropTypes.object.isRequired, index: PropTypes.number.isRequired, busy: PropTypes.bool, onRefine: PropTypes.func.isRequired };

// Reddit sentiment — pain points first (mirrors the colleague's RedditSentimentTab
// emphasis), then positive themes, questions, alternatives.
function RedditSentiment({ data }) {
  const neg = data.negative || [];
  const pos = data.positive || [];
  const questions = data.questions || [];
  const alts = data.alternatives_mentioned || [];
  return (
    <div className="rounded-2xl border border-neutral-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-900">Reddit sentiment</p>
        <span className="text-xs text-neutral-400">{data.threads_analyzed ?? 0} threads analyzed</span>
      </div>
      {data.summary && <p className="text-sm text-neutral-600">{data.summary}</p>}

      {neg.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Pain points &amp; complaints</p>
          {neg.map((p, i) => (
            <div key={i} className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-neutral-800">{p.theme}</span>
                {p.severity && <Tag tone={p.severity === "high" ? "red" : p.severity === "medium" ? "amber" : "neutral"}>{p.severity}</Tag>}
                {p.frequency && <Tag>{p.frequency}</Tag>}
              </div>
              {(p.quotes || []).slice(0, 5).map((q, j) => (
                <p key={j} className="text-xs text-neutral-500 italic border-l-2 border-neutral-300 pl-2">“{q}”</p>
              ))}
              {p.marketing_angle && <p className="text-xs text-neutral-700">→ Angle: {p.marketing_angle}</p>}
            </div>
          ))}
        </div>
      )}

      {pos.length > 0 && (
        <Group title="What people love">
          {pos.map((p, i) => (
            <div key={i} className="text-xs text-neutral-600"><span className="font-medium text-neutral-800">{p.theme}</span>{(p.quotes || []).slice(0, 2).map((q, j) => <span key={j} className="italic"> · “{q}”</span>)}</div>
          ))}
        </Group>
      )}
      {questions.length > 0 && (
        <Group title="Common questions">
          {questions.map((q, i) => <div key={i} className="text-xs text-neutral-600">{q.question || q}</div>)}
        </Group>
      )}
      {alts.length > 0 && (
        <Group title="Alternatives mentioned">
          <div className="flex flex-wrap gap-1.5">{alts.map((a, i) => <Tag key={i} tone={a.sentiment === "positive" ? "green" : a.sentiment === "negative" ? "red" : "neutral"}>{a.name} ({a.sentiment})</Tag>)}</div>
        </Group>
      )}
    </div>
  );
}
RedditSentiment.propTypes = { data: PropTypes.object.isRequired };

function Group({ title, children }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
      {children}
    </div>
  );
}
Group.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node };

function Tag({ children, tone = "neutral" }) {
  const tones = { neutral: "bg-neutral-100 text-neutral-500", red: "bg-red-100 text-red-700", amber: "bg-amber-100 text-amber-700", green: "bg-green-100 text-green-700" };
  return <span className={`text-xs rounded-full px-2 py-0.5 ${tones[tone]}`}>{children}</span>;
}
Tag.propTypes = { children: PropTypes.node, tone: PropTypes.string };

ResearchView.propTypes = { ctx: PropTypes.object.isRequired };
