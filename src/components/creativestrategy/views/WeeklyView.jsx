// Weekly Strategy — generate, filter, review, and brief strategist concepts.
// The existing weekly APIs are retained behind the shared Creative Strategy UI.
import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  CircleCheck, CircleX, ClipboardList, Loader2, MousePointerClick,
} from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { EmptyState, ErrorBanner, PartialResultsNotice, ProgressiveSection } from "../ui";
import { useJobRunner, JobBadge } from "../JobsContext";

const TIERS = [
  { key: "all", label: "All" },
  { key: "iteration", label: "Iterations" },
  { key: "format_transformation", label: "Format Flips" },
  { key: "inspired", label: "Inspired" },
  { key: "big_swing", label: "Big Swings" },
  { key: "net_new", label: "Net-new" },
];

const STATUSES = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Dismissed" },
];

export default function WeeklyView({ ctx }) {
  const {
    selectedBrandId, selectedProductId, renderHeaderActions,
  } = ctx;
  const [ideas, setIdeas] = useState([]);
  const [run, setRun] = useState(null);
  const [err, setErr] = useState(null);
  const [tier, setTier] = useState("all");
  const [status, setStatusFilter] = useState("pending");
  const [filters, setFilters] = useState({ persona: "all", angle: "all", format: "all", awareness: "all" });
  const [briefs, setBriefs] = useState({});
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null);

  const load = useCallback(async (brandId, { silent = false } = {}) => {
    if (!brandId) { setIdeas([]); setRun(null); return; }
    if (!silent) setLoading(true);
    try {
      const response = await creativeApi.getWeekly(brandId);
      setIdeas(response.ideas || []);
      setRun(response.latestRun || null);
    } catch (error) {
      setErr(error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setBriefs({});
    if (selectedBrandId) load(selectedBrandId);
    else { setIdeas([]); setRun(null); }
  }, [load, selectedBrandId]);

  const { job: weeklyJob, start: startWeekly } = useJobRunner({
    kind: "weekly_strategy",
    brandId: selectedBrandId,
    onComplete: () => load(selectedBrandId),
  });
  const jobActive = weeklyJob && (weeklyJob.status == null || weeklyJob.status === "queued" || weeklyJob.status === "running");

  useEffect(() => {
    if (!jobActive || !selectedBrandId) return undefined;
    const interval = window.setInterval(() => load(selectedBrandId, { silent: true }), 2500);
    return () => window.clearInterval(interval);
  }, [jobActive, load, selectedBrandId]);

  const runStrategy = async () => {
    if (!selectedBrandId) return;
    setErr(null);
    try {
      const { jobId } = await creativeApi.runWeekly(selectedBrandId);
      startWeekly(jobId);
    } catch (error) {
      setErr(error.message);
    }
  };

  const approve = async (id) => {
    setUpdating(`${id}:approved`);
    try {
      await creativeApi.approveIdea(id);
      await load(selectedBrandId);
    } catch (error) {
      setErr(error.message);
    } finally {
      setUpdating(null);
    }
  };

  const updateStatus = async (id, nextStatus) => {
    setUpdating(`${id}:${nextStatus}`);
    try {
      await creativeApi.setIdeaStatus(id, nextStatus);
      await load(selectedBrandId);
    } catch (error) {
      setErr(error.message);
    } finally {
      setUpdating(null);
    }
  };

  const makeBrief = async (id) => {
    setErr(null);
    setBriefing(id);
    try {
      const { brief } = await creativeApi.generateBrief(id, selectedProductId || undefined);
      setBriefs((current) => ({ ...current, [id]: brief }));
    } catch (error) {
      setErr(error.message);
    } finally {
      setBriefing(null);
    }
  };

  const byStatus = ideas.filter((idea) => (
    status === "pending" ? (idea.status ?? "pending") === "pending"
      : status === "approved" ? idea.status === "approved" || idea.status === "sent_to_inspo"
        : idea.status === "rejected"
  ));
  const tierCounts = TIERS.reduce((result, item) => {
    result[item.key] = item.key === "all" ? byStatus.length : byStatus.filter((idea) => idea.tier === item.key).length;
    return result;
  }, {});
  const statusCounts = {
    pending: ideas.filter((idea) => (idea.status ?? "pending") === "pending").length,
    approved: ideas.filter((idea) => idea.status === "approved" || idea.status === "sent_to_inspo").length,
    rejected: ideas.filter((idea) => idea.status === "rejected").length,
  };
  const unique = (key) => [...new Set(ideas.map((idea) => idea[key]).filter(Boolean))];
  const options = {
    persona: unique("targetPersona"),
    angle: unique("suggestedAngle"),
    format: unique("format"),
    awareness: unique("awarenessStage"),
  };
  const shown = byStatus.filter((idea) =>
    (tier === "all" || idea.tier === tier) &&
    (filters.persona === "all" || idea.targetPersona === filters.persona) &&
    (filters.angle === "all" || idea.suggestedAngle === filters.angle) &&
    (filters.format === "all" || idea.format === filters.format) &&
    (filters.awareness === "all" || idea.awarenessStage === filters.awareness));
  const conceptColumns = [
    shown.filter((_, index) => index % 2 === 0),
    shown.filter((_, index) => index % 2 === 1),
  ];
  const summary = run?.summary;
  const filtersActive = Object.values(filters).some((value) => value !== "all");
  const weeklyPhase = weeklyJob?.progress?.phase;
  const readySections = (summary ? 1 : 0) + (ideas.length > 0 ? 1 : 0);

  return (
    <div className="space-y-5">
      {renderHeaderActions(
        <div className="flex flex-wrap items-center gap-3">
          <JobBadge job={weeklyJob} />
          <button type="button" onClick={runStrategy} disabled={!selectedBrandId || jobActive} className="cs-primary-button">
            {jobActive && <Loader2 className="h-4 w-4 animate-spin" />}
            {jobActive ? "Running Strategy…" : "Run Strategy"}
          </button>
        </div>
      )}
      <p className="text-xs font-normal text-neutral-400">Needs analyzed ads and completed research</p>

      <ErrorBanner message={err} />
      <PartialResultsNotice active={Boolean(jobActive)} completed={readySections} total={2} label="strategy sections" />

      {!selectedBrandId ? (
        <EmptyState icon={MousePointerClick} title="No account selected" hint="Select an account above to run the weekly strategist." className="min-h-[420px]" />
      ) : (
        <>
          {summary ? (
            <section className="cs-weekly-summary">
              <div className="cs-weekly-summary__pills">
                <span>{ideas.length} New Concepts Generated</span>
                <span>{summary.signals?.top_ads_analyzed ?? "—"} Top Ads Analyzed</span>
              </div>
              <h2>Why These Ideas</h2>
              <p>{summary.signals?.concept_distribution_hint || "Concepts are balanced across current performance signals, audience awareness, and creative opportunity."}</p>
            </section>
          ) : <ProgressiveSection title="Strategy rationale" description="Why these concepts, based on performance signals and coverage gaps." active={loading || weeklyPhase === "building_briefing" || weeklyPhase === "running_strategist"} />}

          {ideas.length === 0 ? (
            <ProgressiveSection
              title="Concept board"
              description={jobActive ? "Concepts will appear here as soon as the strategist finishes computing them." : "Run Strategy to generate concepts from analyzed ads and research."}
              active={weeklyPhase === "running_strategist" || weeklyPhase === "saving_concepts"}
              cards={6}
            />
          ) : (
            <div className="space-y-4">
              <div className="cs-weekly-filters">
                <div className="cs-weekly-switchers-row">
                  <SegmentedFilter items={STATUSES} value={status} onChange={setStatusFilter} counts={statusCounts} />
                  <SegmentedFilter items={TIERS} value={tier} onChange={setTier} counts={tierCounts} compact />
                </div>
                <div className="cs-weekly-dropdown-row">
                  {[
                    ["persona", "Persona", options.persona],
                    ["angle", "Angle", options.angle],
                    ["format", "Format", options.format],
                    ["awareness", "Awareness", options.awareness],
                  ].map(([key, label, values]) => (
                    <Select key={key} value={filters[key]} onValueChange={(value) => setFilters((current) => ({ ...current, [key]: value }))}>
                      <SelectTrigger className="cs-weekly-filter-select w-full px-3">
                        <SelectValue placeholder={label} />
                      </SelectTrigger>
                      <SelectContent className="cs-select-content bg-white">
                        <SelectItem value="all">{label}: All</SelectItem>
                        {values.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ))}
                  {filtersActive && (
                    <button type="button" onClick={() => setFilters({ persona: "all", angle: "all", format: "all", awareness: "all" })} className="cs-weekly-clear">Clear filters</button>
                  )}
                </div>
              </div>

              {shown.length === 0 ? (
                <EmptyState icon={MousePointerClick} title="Nothing here" hint={filtersActive ? "No concepts match these filters." : `No ${status} concepts in this tier.`} />
              ) : (
                <div className="cs-weekly-grid">
                  {conceptColumns.map((column, columnIndex) => (
                    <div key={columnIndex} className="cs-weekly-grid__column">
                      {column.map((idea, cardIndex) => (
                        <ConceptCard
                          key={idea.id}
                          idea={idea}
                          brief={briefs[idea.id]}
                          briefing={briefing}
                          updating={updating}
                          approve={approve}
                          updateStatus={updateStatus}
                          makeBrief={makeBrief}
                          orange={(cardIndex + columnIndex) % 2 === 1}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SegmentedFilter({ items, value, onChange, counts, compact = false }) {
  return (
    <div className={`cs-weekly-switcher ${compact ? "is-compact" : ""}`}>
      {items.map((item) => (
        <button key={item.key} type="button" onClick={() => onChange(item.key)} className={`cs-weekly-switcher__item ${value === item.key ? "is-active" : ""}`}>
          {item.label} <span>{counts[item.key] || 0}</span>
        </button>
      ))}
    </div>
  );
}

function ConceptCard({ idea, brief, briefing, updating, approve, updateStatus, makeBrief, orange }) {
  const approved = idea.status === "approved" || idea.status === "sent_to_inspo";
  const rejected = idea.status === "rejected";
  const approving = updating === `${idea.id}:approved`;
  const rejecting = updating === `${idea.id}:rejected`;
  const resetting = updating === `${idea.id}:pending`;

  return (
    <article className={`cs-weekly-card ${orange ? "is-orange" : ""}`}>
      <header className="cs-weekly-card__header">
        <h3>{idea.title}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="cs-weekly-pill is-tier">{formatTier(idea.tier)}</span>
          {approved && <span className="cs-weekly-pill is-status">Approved</span>}
          {rejected && <span className="cs-weekly-pill is-status">Dismissed</span>}
        </div>
      </header>

      <div className="cs-weekly-card__body">
        <p className="text-sm font-normal leading-6 text-[#5f524c]">{idea.conceptDescription}</p>
        {idea.suggestedAngle && <p className="mt-4 text-sm text-[#3b2c26]"><strong>Angle:</strong> <span className="underline decoration-[#6c3403]/35 underline-offset-4">{idea.suggestedAngle}</span></p>}
        {idea.hypothesis && <p className="mt-3 text-xs font-normal leading-5 text-[#6d605a]"><strong className="text-[#4f4039]">Hypothesis:</strong> {idea.hypothesis}</p>}
        {idea.whyNow && <p className="mt-2 text-xs font-normal leading-5 text-[#6d605a]"><strong className="text-[#4f4039]">Why now:</strong> {idea.whyNow}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {idea.format && <span className="cs-weekly-pill">{idea.format}</span>}
          {idea.awarenessStage && <span className="cs-weekly-pill">{idea.awarenessStage}</span>}
          {idea.targetPersona && <span className="cs-weekly-pill">{idea.targetPersona}</span>}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => makeBrief(idea.id)} disabled={briefing === idea.id} className="cs-weekly-brief-button">
            {briefing === idea.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
            {briefing === idea.id ? "Writing…" : idea.format === "static" ? "Generate Brief" : "Generate Script"}
          </button>
          <span className="flex-1" />
          {!approved && (
            <button type="button" onClick={() => approve(idea.id)} disabled={Boolean(updating)} className="cs-weekly-decision is-approve">
              {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />} Approve
            </button>
          )}
          {!rejected && (
            <button type="button" onClick={() => updateStatus(idea.id, "rejected")} disabled={Boolean(updating)} className="cs-weekly-decision is-dismiss">
              {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleX className="h-4 w-4" />} Dismiss
            </button>
          )}
          {(approved || rejected) && (
            <button type="button" onClick={() => updateStatus(idea.id, "pending")} disabled={Boolean(updating)} className="cs-weekly-reset">
              {resetting ? "Resetting…" : "Reset"}
            </button>
          )}
        </div>

        {brief && <Brief brief={brief} />}
      </div>
    </article>
  );
}

function Brief({ brief }) {
  return (
    <div className="cs-weekly-brief-result">
      {brief.hooks?.length > 0 && <BriefSection title="Hooks"><ol className="ml-4 list-decimal">{brief.hooks.map((hook, index) => <li key={index}>{hook}</li>)}</ol></BriefSection>}
      {brief.script && <BriefSection title="Script"><pre className="whitespace-pre-wrap font-sans">{brief.script}</pre></BriefSection>}
      {brief.headlines?.length > 0 && <BriefSection title="Headlines"><ol className="ml-4 list-decimal">{brief.headlines.map((headline, index) => <li key={index}>{headline}</li>)}</ol></BriefSection>}
      {brief.static_brief && <BriefSection title="Static Brief"><pre className="whitespace-pre-wrap font-sans">{brief.static_brief}</pre></BriefSection>}
    </div>
  );
}

function BriefSection({ title, children }) {
  return <div><p className="font-semibold text-[#3b170b]">{title}</p>{children}</div>;
}

function formatTier(value) {
  return TIERS.find((tier) => tier.key === value)?.label || value || "Concept";
}

WeeklyView.propTypes = { ctx: PropTypes.object.isRequired };
SegmentedFilter.propTypes = { items: PropTypes.array.isRequired, value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired, counts: PropTypes.object.isRequired, compact: PropTypes.bool };
ConceptCard.propTypes = {
  idea: PropTypes.object.isRequired,
  brief: PropTypes.object,
  briefing: PropTypes.string,
  updating: PropTypes.string,
  approve: PropTypes.func.isRequired,
  updateStatus: PropTypes.func.isRequired,
  makeBrief: PropTypes.func.isRequired,
  orange: PropTypes.bool,
};
Brief.propTypes = { brief: PropTypes.object.isRequired };
BriefSection.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };
