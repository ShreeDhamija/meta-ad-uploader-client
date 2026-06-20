// Research — run the 7-phase research agent for the selected product and view
// ALL captured intel: personas grid up top, then every product_intel section
// (brand deep dive, review mining, language bank, sentiment, consumer report,
// cross-map, + fan-out features/benefits/pricing/branding/etc.) as collapsible
// sections. Needs a product URL. Long-running (~5-10 min); JobStatus polls.
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { creativeApi } from "@/lib/creativeApi";
import JobStatus from "../JobStatus";
import { Section, humanize } from "../JsonView";

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
  const [jobId, setJobId] = useState(null);
  const [err, setErr] = useState(null);

  const load = async (pid) => {
    try {
      const r = await creativeApi.getResearch(pid);
      setIntel(r.intel); setTypes(r.intelTypes);
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => {
    if (selectedProductId) load(selectedProductId);
    else { setIntel({}); setTypes([]); }
  }, [selectedProductId]);

  if (!selectedProductId) {
    return <p className="text-sm text-neutral-400">Select a product (top bar) to run research.</p>;
  }

  const run = async () => {
    setErr(null);
    try {
      const { jobId } = await creativeApi.runResearch(selectedProductId);
      setJobId(jobId);
    } catch (e) { setErr(e.message); }
  };

  const personas = intel.personas?.personas || (Array.isArray(intel.personas) ? intel.personas : []);
  // Sort produced types by preferred order, excluding personas (shown as grid).
  const sectionTypes = types
    .filter((t) => t !== "personas")
    .sort((a, b) => {
      const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={run} className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm">Run Research</button>
        {jobId && <JobStatus jobId={jobId} onDone={(job) => { if (job.status === "completed") setJobId(null); load(selectedProductId); }} />}
        <span className="text-sm text-neutral-400">{selectedProduct?.name} · ~5–10 min</span>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}

      {Array.isArray(personas) && personas.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Personas ({personas.length})</p>
          <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
            {personas.map((p, i) => (
              <Section key={i} title={p.label || p.name || p.title || `Persona ${i + 1}`} data={p} />
            ))}
          </div>
        </div>
      )}

      {sectionTypes.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Research intel ({sectionTypes.length} sections)</p>
          {sectionTypes.map((t) => (
            <Section key={t} title={humanize(t)} data={intel[t]} />
          ))}
        </div>
      )}

      {types.length === 0 && <p className="text-sm text-neutral-400">No research yet — click Run Research (the product needs a URL).</p>}
    </div>
  );
}

ResearchView.propTypes = { ctx: PropTypes.object.isRequired };
