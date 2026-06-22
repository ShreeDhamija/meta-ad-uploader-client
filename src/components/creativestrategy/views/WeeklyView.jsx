// Weekly Strategy — run the agentic strategist for the selected brand, then
// review tiered concept cards (iteration / format-flip / inspired / big-swing /
// net-new) and approve the ones worth briefing. Approving seeds a
// reference_file_metadata row (source=weekly_strategy). Run is a background job.
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { creativeApi } from "@/lib/creativeApi";
import JobStatus from "../JobStatus";

const TIERS = [
  { key: "all", label: "All" },
  { key: "iteration", label: "Iterations" },
  { key: "format_transformation", label: "Format flips" },
  { key: "inspired", label: "Inspired" },
  { key: "big_swing", label: "Big swings" },
  { key: "net_new", label: "Net-new" },
];

export default function WeeklyView({ ctx }) {
  const { selectedBrand, selectedBrandId, selectedProductId } = ctx;
  const [ideas, setIdeas] = useState([]);
  const [run, setRun] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState("all");
  const [briefs, setBriefs] = useState({}); // ideaId -> brief
  const [briefing, setBriefing] = useState(null); // ideaId being generated
  const [heartbeat, setHeartbeat] = useState(null);
  const [hbLoading, setHbLoading] = useState(false);

  const load = async (cid) => {
    try { const r = await creativeApi.getWeekly(cid); setIdeas(r.ideas); setRun(r.latestRun); }
    catch (e) { setErr(e.message); }
  };

  useEffect(() => {
    if (selectedBrandId) load(selectedBrandId); else { setIdeas([]); setRun(null); }
  }, [selectedBrandId]);

  if (!selectedBrandId) {
    return <p className="text-sm text-neutral-400">Select a brand (top bar) to run the weekly strategist.</p>;
  }

  const run_ = async () => {
    setErr(null);
    try { const { jobId } = await creativeApi.runWeekly(selectedBrandId); setJobId(jobId); }
    catch (e) { setErr(e.message); }
  };

  const approve = async (id) => {
    try { await creativeApi.approveIdea(id); load(selectedBrandId); }
    catch (e) { setErr(e.message); }
  };

  const makeBrief = async (id) => {
    setErr(null);
    setBriefing(id);
    try {
      const { brief } = await creativeApi.generateBrief(id, selectedProductId || undefined);
      setBriefs((b) => ({ ...b, [id]: brief }));
    } catch (e) { setErr(e.message); }
    finally { setBriefing(null); }
  };

  const loadHeartbeat = async (force) => {
    setErr(null);
    setHbLoading(true);
    try { const r = await creativeApi.getHeartbeat(selectedBrandId, force); setHeartbeat(r.markdown); }
    catch (e) { setErr(e.message); }
    finally { setHbLoading(false); }
  };

  const counts = TIERS.reduce((acc, t) => {
    acc[t.key] = t.key === "all" ? ideas.length : ideas.filter((i) => i.tier === t.key).length;
    return acc;
  }, {});
  const shown = tab === "all" ? ideas : ideas.filter((i) => i.tier === tab);
  const summary = run?.summary;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={run_} className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm">Run strategy</button>
        {jobId && <JobStatus jobId={jobId} onDone={(job) => { if (job.status === "completed") setJobId(null); load(selectedBrandId); }} />}
        <span className="text-sm text-neutral-400">{selectedBrand?.name} · needs analyzed ads + research</span>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}

      {summary && (
        <div className="rounded-2xl border border-neutral-200 p-4 text-sm text-neutral-600 space-y-1">
          <div className="font-medium text-neutral-800">Why these ideas</div>
          <div>{summary.signals?.concept_distribution_hint}</div>
          <div className="text-xs text-neutral-400">
            {summary.signals?.top_ads_analyzed} top ads analyzed · {summary.signals?.learnings_count} learnings ·
            {run?.costCents != null ? ` ~$${(run.costCents / 100).toFixed(2)} run cost` : ""}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-medium text-neutral-800 text-sm">Heartbeat (14-day digest)</div>
          <div className="flex gap-2">
            <button onClick={() => loadHeartbeat(false)} disabled={hbLoading}
              className="text-xs rounded-xl border border-neutral-300 px-3 py-1 disabled:opacity-50">
              {hbLoading ? "Loading…" : "View"}
            </button>
            <button onClick={() => loadHeartbeat(true)} disabled={hbLoading}
              className="text-xs rounded-xl border border-neutral-300 px-3 py-1 disabled:opacity-50">Refresh</button>
          </div>
        </div>
        {(heartbeat || summary?.heartbeat_markdown) && (
          <pre className="whitespace-pre-wrap font-sans text-xs text-neutral-600">{heartbeat || summary.heartbeat_markdown}</pre>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {TIERS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-xl px-3 py-1.5 text-sm border ${tab === t.key ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600"}`}>
            {t.label} ({counts[t.key] || 0})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.map((it) => (
          <div key={it.id} className="rounded-2xl border border-neutral-200 p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-neutral-900">{it.title}</div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  {it.tier} · {it.targetPersona || "—"} · {it.awarenessStage || "—"} · {it.format || "—"}
                </div>
              </div>
              {it.status === "approved"
                ? <span className="text-xs rounded-full bg-green-100 text-green-700 px-2 py-0.5 whitespace-nowrap">approved</span>
                : <button onClick={() => approve(it.id)} className="text-xs rounded-xl border border-neutral-300 px-3 py-1 whitespace-nowrap">Approve</button>}
            </div>
            <div className="text-sm text-neutral-700">{it.conceptDescription}</div>
            {it.suggestedAngle && <div className="text-xs text-neutral-500">Angle: {it.suggestedAngle}</div>}
            {it.hypothesis && <div className="text-xs text-neutral-500">Hypothesis: {it.hypothesis}</div>}
            {it.whyNow && <div className="text-xs text-neutral-500">Why now: {it.whyNow}</div>}
            <div className="pt-1">
              <button onClick={() => makeBrief(it.id)} disabled={briefing === it.id}
                className="text-xs rounded-xl border border-neutral-300 px-3 py-1 disabled:opacity-50">
                {briefing === it.id ? "Writing brief…" : (it.format === "static" ? "Generate brief" : "Generate script")}
              </button>
            </div>
            {briefs[it.id] && <Brief brief={briefs[it.id]} />}
          </div>
        ))}
        {shown.length === 0 && <p className="text-sm text-neutral-400">No concepts yet — click Run strategy (worker must be running).</p>}
      </div>
    </div>
  );
}

function Brief({ brief }) {
  return (
    <div className="mt-2 rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-xs text-neutral-700 space-y-2">
      {brief.hooks?.length > 0 && (
        <div>
          <div className="font-medium text-neutral-800">Hooks</div>
          <ol className="list-decimal ml-4">{brief.hooks.map((h, i) => <li key={i}>{h}</li>)}</ol>
        </div>
      )}
      {brief.script && (
        <div>
          <div className="font-medium text-neutral-800">Script</div>
          <pre className="whitespace-pre-wrap font-sans">{brief.script}</pre>
        </div>
      )}
      {brief.headlines?.length > 0 && (
        <div>
          <div className="font-medium text-neutral-800">Headlines</div>
          <ol className="list-decimal ml-4">{brief.headlines.map((h, i) => <li key={i}>{h}</li>)}</ol>
        </div>
      )}
      {brief.static_brief && (
        <div>
          <div className="font-medium text-neutral-800">Static brief</div>
          <pre className="whitespace-pre-wrap font-sans">{brief.static_brief}</pre>
        </div>
      )}
    </div>
  );
}
Brief.propTypes = { brief: PropTypes.object.isRequired };

WeeklyView.propTypes = { ctx: PropTypes.object.isRequired };
