// Weekly Strategy — run the agentic strategist for the selected brand, then
// review tiered concept cards (iteration / format-flip / inspired / big-swing /
// net-new) and approve the ones worth briefing. Approving seeds a
// reference_file_metadata row (source=weekly_strategy). Run is a background job.
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { MousePointerClick, Activity } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ViewLoading, EmptyState, ErrorBanner, SectionCard, StatTile } from "../ui";
import { useJobRunner, JobBadge } from "../JobsContext";

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
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState("all");
  const [statusTab, setStatusTab] = useState("pending");
  const [filters, setFilters] = useState({ persona: "all", angle: "all", format: "all", awareness: "all" });
  const [briefs, setBriefs] = useState({}); // ideaId -> brief
  const [briefing, setBriefing] = useState(null); // ideaId being generated
  const [heartbeat, setHeartbeat] = useState(null);
  const [hbLoading, setHbLoading] = useState(false);

  const [loading, setLoading] = useState(false);

  const load = async (cid) => {
    setLoading(true);
    try { const r = await creativeApi.getWeekly(cid); setIdeas(r.ideas); setRun(r.latestRun); }
    catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedBrandId) load(selectedBrandId); else { setIdeas([]); setRun(null); }
  }, [selectedBrandId]);

  const { job: weeklyJob, start: startWeekly } = useJobRunner({
    kind: "weekly_strategy", brandId: selectedBrandId, onComplete: () => load(selectedBrandId),
  });

  if (!selectedBrandId) {
    return <EmptyState icon={MousePointerClick} title="No brand selected" hint="Select a brand in the top bar to run the weekly strategist." />;
  }

  const run_ = async () => {
    setErr(null);
    try { const { jobId } = await creativeApi.runWeekly(selectedBrandId); startWeekly(jobId); }
    catch (e) { setErr(e.message); }
  };

  const approve = async (id) => {
    try { await creativeApi.approveIdea(id); load(selectedBrandId); }
    catch (e) { setErr(e.message); }
  };
  const setStatus = async (id, status) => {
    try { await creativeApi.setIdeaStatus(id, status); load(selectedBrandId); }
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

  // Status tab first (his pending/approved/rejected), then tier tab, then the
  // orthogonal persona/angle/format/awareness dropdowns.
  const byStatus = ideas.filter((i) => (statusTab === "pending" ? (i.status ?? "pending") === "pending"
    : statusTab === "approved" ? i.status === "approved" || i.status === "sent_to_inspo"
    : i.status === "rejected"));
  const counts = TIERS.reduce((acc, t) => {
    acc[t.key] = t.key === "all" ? byStatus.length : byStatus.filter((i) => i.tier === t.key).length;
    return acc;
  }, {});
  const statusCounts = {
    pending: ideas.filter((i) => (i.status ?? "pending") === "pending").length,
    approved: ideas.filter((i) => i.status === "approved" || i.status === "sent_to_inspo").length,
    rejected: ideas.filter((i) => i.status === "rejected").length,
  };
  const uniq = (key) => [...new Set(ideas.map((i) => i[key]).filter(Boolean))];
  const opts = { persona: uniq("targetPersona"), angle: uniq("suggestedAngle"), format: uniq("format"), awareness: uniq("awarenessStage") };
  const shown = byStatus.filter((i) =>
    (tab === "all" || i.tier === tab) &&
    (filters.persona === "all" || i.targetPersona === filters.persona) &&
    (filters.angle === "all" || i.suggestedAngle === filters.angle) &&
    (filters.format === "all" || i.format === filters.format) &&
    (filters.awareness === "all" || i.awarenessStage === filters.awareness),
  );
  const summary = run?.summary;

  const filtersActive = filters.persona !== "all" || filters.angle !== "all" || filters.format !== "all" || filters.awareness !== "all";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button onClick={run_} size="sm" className="rounded-xl">Run strategy</Button>
        <JobBadge job={weeklyJob} />
        <span className="text-sm text-neutral-400">{selectedBrand?.name} · needs analyzed ads + research</span>
      </div>
      <ErrorBanner message={err} />

      {summary && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Concepts" value={ideas.length} />
            <StatTile label="Top ads analyzed" value={summary.signals?.top_ads_analyzed ?? "—"} />
            <StatTile label="Run cost" value={run?.costCents != null ? `$${(run.costCents / 100).toFixed(2)}` : "—"} sub={`${summary.signals?.learnings_count ?? 0} learnings`} />
          </div>
          {summary.signals?.concept_distribution_hint && (
            <SectionCard title="Why these ideas"><p className="text-sm text-neutral-600">{summary.signals.concept_distribution_hint}</p></SectionCard>
          )}
        </div>
      )}

      <SectionCard title="Heartbeat" description="14-day performance digest" icon={Activity}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => loadHeartbeat(false)} disabled={hbLoading} variant="outline" size="sm" className="rounded-lg h-7 text-xs">{hbLoading ? "Loading…" : "View"}</Button>
            <Button onClick={() => loadHeartbeat(true)} disabled={hbLoading} variant="outline" size="sm" className="rounded-lg h-7 text-xs">Refresh</Button>
          </div>
        }>
        {(heartbeat || summary?.heartbeat_markdown)
          ? <pre className="whitespace-pre-wrap font-sans text-xs text-neutral-600">{heartbeat || summary.heartbeat_markdown}</pre>
          : <p className="text-xs text-neutral-400">Click View to load the digest.</p>}
      </SectionCard>

      {loading && ideas.length === 0 ? (
        <ViewLoading label="Loading concepts…" />
      ) : ideas.length === 0 ? (
        <EmptyState icon={MousePointerClick} title="No concepts yet"
          hint="Click Run strategy to generate tiered concept cards (worker must be running; needs analyzed ads + research)." />
      ) : (
      <div className="space-y-4">
        {/* Status filter (shadcn tabs) */}
        <Tabs value={statusTab} onValueChange={setStatusTab}>
          <TabsList>
            {["pending", "approved", "rejected"].map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize">{s} ({statusCounts[s] || 0})</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Tier filter (shadcn tabs) */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            {TIERS.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label} ({counts[t.key] || 0})</TabsTrigger>)}
          </TabsList>
        </Tabs>

        {/* Orthogonal dropdown filters */}
        <div className="flex flex-wrap items-center gap-2">
          {[["persona", "Persona", opts.persona], ["angle", "Angle", opts.angle], ["format", "Format", opts.format], ["awareness", "Awareness", opts.awareness]].map(([key, label, options]) => (
            <Select key={key} value={filters[key]} onValueChange={(v) => setFilters((f) => ({ ...f, [key]: v }))}>
              <SelectTrigger className="w-auto min-w-[120px] rounded-xl h-8 text-xs"><SelectValue placeholder={label} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{label}: all</SelectItem>
                {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          ))}
          {filtersActive && (
            <Button onClick={() => setFilters({ persona: "all", angle: "all", format: "all", awareness: "all" })} variant="ghost" size="sm" className="h-8 text-xs text-neutral-500">clear</Button>
          )}
        </div>

        <div className="space-y-3">
          {shown.map((it) => {
            const approved = it.status === "approved" || it.status === "sent_to_inspo";
            return (
              <div key={it.id} className="rounded-2xl border border-neutral-200 bg-white shadow-xs p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-neutral-900">{it.title}</div>
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      <Badge variant="secondary" className="rounded-full text-[10px]">{it.tier}</Badge>
                      {it.targetPersona && <Badge variant="outline" className="rounded-full text-[10px] font-normal text-neutral-500">{it.targetPersona}</Badge>}
                      {it.awarenessStage && <Badge variant="outline" className="rounded-full text-[10px] font-normal text-neutral-500">{it.awarenessStage}</Badge>}
                      {it.format && <Badge variant="outline" className="rounded-full text-[10px] font-normal text-neutral-500">{it.format}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    {it.status === "rejected" && <Badge className="rounded-full border-0 bg-red-100 text-red-700">rejected</Badge>}
                    {approved && <Badge className="rounded-full border-0 bg-emerald-100 text-emerald-700">approved</Badge>}
                    {!approved && <Button onClick={() => approve(it.id)} variant="outline" size="sm" className="rounded-xl h-7 text-xs">Approve</Button>}
                    {it.status !== "rejected" && <Button onClick={() => setStatus(it.id, "rejected")} variant="ghost" size="sm" className="rounded-xl h-7 text-xs text-neutral-500">Reject</Button>}
                    {(approved || it.status === "rejected") && <button onClick={() => setStatus(it.id, "pending")} className="text-xs text-neutral-400 underline">reset</button>}
                  </div>
                </div>
                <div className="text-sm text-neutral-700">{it.conceptDescription}</div>
                {it.suggestedAngle && <div className="text-xs text-neutral-500"><span className="text-neutral-400">Angle:</span> {it.suggestedAngle}</div>}
                {it.hypothesis && <div className="text-xs text-neutral-500"><span className="text-neutral-400">Hypothesis:</span> {it.hypothesis}</div>}
                {it.whyNow && <div className="text-xs text-neutral-500"><span className="text-neutral-400">Why now:</span> {it.whyNow}</div>}
                <div className="pt-1">
                  <Button onClick={() => makeBrief(it.id)} disabled={briefing === it.id} variant="outline" size="sm" className="rounded-xl h-7 text-xs">
                    {briefing === it.id ? "Writing brief…" : (it.format === "static" ? "Generate brief" : "Generate script")}
                  </Button>
                </div>
                {briefs[it.id] && <Brief brief={briefs[it.id]} />}
              </div>
            );
          })}
          {shown.length === 0 && (
            <EmptyState icon={MousePointerClick} title="Nothing here"
              hint={filtersActive ? "No concepts match these filters." : `No ${statusTab} concepts in this tier.`} />
          )}
        </div>
      </div>
      )}
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
