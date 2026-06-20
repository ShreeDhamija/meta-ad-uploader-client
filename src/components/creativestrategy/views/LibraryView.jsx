// Library — generate (per persona) and view draft copy: hooks, headlines,
// primary text. Requires personas (Research) + analyzed ads (Insights).
// Generation runs as a background job; JobStatus polls it.
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { creativeApi } from "@/lib/creativeApi";
import JobStatus from "../JobStatus";

const TYPES = [
  { key: "hook", label: "Hooks" },
  { key: "headline", label: "Headlines" },
  { key: "primary_text", label: "Primary text" },
];

export default function LibraryView({ ctx }) {
  const { selectedProduct, selectedProductId } = ctx;
  const [items, setItems] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState("hook");

  const load = async (pid) => {
    try { const r = await creativeApi.getLibrary(pid); setItems(r.items); }
    catch (e) { setErr(e.message); }
  };

  useEffect(() => {
    if (selectedProductId) load(selectedProductId); else setItems([]);
  }, [selectedProductId]);

  if (!selectedProductId) {
    return <p className="text-sm text-neutral-400">Select a product (top bar) to generate copy.</p>;
  }

  const run = async () => {
    setErr(null);
    try { const { jobId } = await creativeApi.runLibrary(selectedProductId); setJobId(jobId); }
    catch (e) { setErr(e.message); }
  };

  const counts = TYPES.reduce((acc, t) => { acc[t.key] = items.filter((i) => i.itemType === t.key).length; return acc; }, {});
  const shown = items.filter((i) => i.itemType === tab);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={run} className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm">Generate library</button>
        {jobId && <JobStatus jobId={jobId} onDone={(job) => { if (job.status === "completed") setJobId(null); load(selectedProductId); }} />}
        <span className="text-sm text-neutral-400">{selectedProduct?.name} · needs personas + analyzed ads</span>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex gap-2">
        {TYPES.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-xl px-3 py-1.5 text-sm border ${tab === t.key ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600"}`}>
            {t.label} ({counts[t.key] || 0})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {shown.map((it) => (
          <div key={it.id} className="rounded-2xl border border-neutral-200 p-4">
            <div className="text-sm text-neutral-800 whitespace-pre-wrap">{it.content}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-xs rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-500">{it.status}</span>
              {(it.tags || []).filter((t) => t.startsWith("grade:") || t.startsWith("stage:") || t.startsWith("persona:")).map((t) => (
                <span key={t} className="text-xs rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-500">{t}</span>
              ))}
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="text-sm text-neutral-400">No {TYPES.find((t) => t.key === tab)?.label.toLowerCase()} yet — click Generate library.</p>}
      </div>
    </div>
  );
}

LibraryView.propTypes = { ctx: PropTypes.object.isRequired };
