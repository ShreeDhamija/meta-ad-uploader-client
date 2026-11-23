// Cross-tab job tracking. The worker jobs (research, generate, analyze, weekly,
// …) run on the backend and never stop when the user switches tabs — but the
// per-view pollers used to unmount and lose their progress display. This
// provider lifts polling above the view switch: it tracks job ids centrally,
// polls them every 2s, restores history from the database, and exposes milestone
// labels per job type. No SSE — just resilient polling.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Loader2 } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { isCurrentSessionResult } from "./job-notifications";
import { timeProgress } from "./job-estimates";

const POLL_MS = 2000;
const JobsContext = createContext(null);
const ACTIVE = (status) => status === "queued" || status === "running" || status == null;
const millis = (value) => value ? new Date(value).getTime() : 0;
// Steps the backend runs on its own between user-visible jobs (e.g. refreshing
// brand learnings between ad analysis and weekly strategy). They're still
// polled, so the jobs chained after them are picked up, but never shown or
// counted as unread.
const BACKGROUND_KINDS = new Set(["learning_truths"]);
const isVisible = (job) => !BACKGROUND_KINDS.has(job.type || job.meta?.kind);

export function jobOutcome(job) {
  if (job.status === "cancelled") return "cancelled";
  if (job.status === "failed") return "failed";
  if (job.status !== "completed") return null;
  return (Array.isArray(job.result?.errors) && job.result.errors.length) || job.result?.failed > 0 || partialErrors(job).length ? "failed" : "completed";
}

// Parts of a finished job that failed while the rest succeeded (research phases
// and the Reddit pass). Reported in the tracker, never in the view.
function partialErrors(job) {
  const result = job.result || {};
  const errors = (Array.isArray(result.phases) ? result.phases : [])
    .filter((phase) => phase && phase.ok === false).map((phase) => `Phase ${phase.phase}: ${phase.error || "failed"}`);
  if (result.reddit?.ok === false) errors.push(`Reddit research: ${result.reddit.error || "failed"}`);
  return errors;
}

function normalizeJob(job) {
  return { ...job, executionStartedAt: job.startedAt, startedAt: millis(job.createdAt), finishedAt: millis(job.completedAt),
    meta: { kind: job.type, brandId: job.clientId, productId: job.productId,
      accountName: job.accountName, productName: job.productName } };
}

export function JobsProvider({ children, userId }) {
  // The database is the source of truth, including after a browser refresh.
  const [jobs, setJobs] = useState({});
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [nextOffset, setNextOffset] = useState(null);
  const jobsRef = useRef(jobs);
  const olderLoaded = useRef(false);
  const loadingOlder = useRef(false);
  const sessionStartedAt = useRef(Date.now());
  const sessionJobs = useRef(new Set());
  // Finished jobs up to this moment are hidden from the tracker (per browser).
  const clearedKey = `cs-jobs-cleared:${userId}`;
  const [clearedAt, setClearedAt] = useState(() => {
    try { return Number(localStorage.getItem(clearedKey)) || 0; } catch { return 0; }
  });
  const clearHistory = useCallback(() => {
    const now = Date.now();
    setClearedAt(now);
    try { localStorage.setItem(clearedKey, String(now)); } catch { /* Keep session state. */ }
  }, [clearedKey]);
  const [readResults, setReadResults] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`cs-read-jobs:${userId}`) || "[]")); } catch { return new Set(); }
  });
  jobsRef.current = jobs;

  const resultKey = (job) => `${job.id}:${jobOutcome(job)}`;
  // A job the user cancelled is not news: it never lights up the tracker.
  const unreadResults = Object.values(jobs).filter((job) =>
    isVisible(job) && jobOutcome(job) && jobOutcome(job) !== "cancelled" && Math.max(job.finishedAt || 0, job.startedAt || 0) > clearedAt && isCurrentSessionResult(job, sessionStartedAt.current, sessionJobs.current) && !readResults.has(resultKey(job)));
  const unreadStatus = unreadResults.some((job) => jobOutcome(job) === "failed") ? "failed" : unreadResults.length ? "completed" : null;
  const markResultsRead = useCallback(() => {
    setReadResults((current) => {
      const next = new Set(current);
      for (const job of Object.values(jobs)) {
        if (jobOutcome(job)) next.add(`${job.id}:${jobOutcome(job)}`);
      }
      if (next.size === current.size) return current;
      try { localStorage.setItem(`cs-read-jobs:${userId}`, JSON.stringify([...next])); } catch { /* Keep session state. */ }
      return next;
    });
  }, [jobs, userId]);

  const mergeJobs = useCallback((rows) => {
    for (const row of rows) if (ACTIVE(row.status)) sessionJobs.current.add(row.id);
    setJobs((previous) => {
      const next = { ...previous };
      for (const row of rows) {
        const current = next[row.id];
        if (current?.updatedAt && millis(current.updatedAt) > millis(row.updatedAt)) continue;
        next[row.id] = { ...current, ...normalizeJob(row) };
      }
      return next;
    });
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const response = await creativeApi.getJobHistory();
      mergeJobs([...(response.jobs || []), ...(response.active || [])]);
      if (!olderLoaded.current) setNextOffset(response.nextOffset ?? null);
      setHistoryError(null);
    } catch (error) { setHistoryError(error.message); }
    finally { setHistoryLoading(false); }
  }, [mergeJobs]);

  const loadMore = useCallback(async () => {
    if (nextOffset == null || loadingOlder.current) return;
    loadingOlder.current = true; setHistoryLoading(true);
    try {
      const response = await creativeApi.getJobHistory(nextOffset);
      mergeJobs(response.jobs || []);
      olderLoaded.current = true;
      setNextOffset(response.nextOffset ?? null); setHistoryError(null);
    } catch (error) { setHistoryError(error.message); }
    finally { loadingOlder.current = false; setHistoryLoading(false); }
  }, [nextOffset, mergeJobs]);

  const track = useCallback((id, meta = {}) => {
    if (!id) return;
    sessionJobs.current.add(id);
    setJobs((previous) => ({ ...previous, [id]: previous[id]
      ? { ...previous[id], meta: { ...previous[id].meta, ...Object.fromEntries(Object.entries(meta).filter(([, value]) => value != null)) } }
      : { id, status: "queued", progress: {}, meta, startedAt: Date.now() } }));
  }, []);

  useEffect(() => {
    refreshHistory();
    const interval = setInterval(refreshHistory, 10000);
    return () => clearInterval(interval);
  }, [refreshHistory]);

  // Cancel a queued or running job. The steps chained after it never start,
  // so their "waiting" placeholders disappear with it.
  const cancel = useCallback(async (id) => {
    await creativeApi.cancelJob(id);
    setJobs((previous) => previous[id]
      ? { ...previous, [id]: { ...previous[id], status: "cancelled", upcoming: [], error: "Cancelled by user", finishedAt: Date.now() } }
      : previous);
    await refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    let cancelled = false;
    let polling = false;
    const tick = async () => {
      if (polling) return;
      polling = true;
      try {
        await Promise.all(Object.values(jobsRef.current).filter((job) => ACTIVE(job.status)).map(async (current) => {
          try {
            const { job } = await creativeApi.getJob(current.id);
            if (cancelled || !job) return;
            mergeJobs([job]);
            for (const next of Array.isArray(job.progress?.nextJobs) ? job.progress.nextJobs : []) {
              track(next.jobId, { kind: next.type, brandId: next.clientId || current.meta?.brandId, productId: next.productId || current.meta?.productId });
            }
          } catch { /* Retry transient polling failures. */ }
        }));
      } finally { polling = false; }
    };
    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [mergeJobs, track]);

  const visibleJobs = useMemo(() => Object.fromEntries(Object.entries(jobs).filter(([, job]) => isVisible(job))), [jobs]);
  // Steps a running job will start next (e.g. product setup: research → ad
  // analysis → library → weekly strategy), shown as "waiting" so the whole
  // plan is visible from the start. They are replaced by the real jobs as the
  // chain advances, and vanish if a step fails (the chain stops there).
  const waitingJobs = useMemo(() => {
    const out = {};
    const all = Object.values(jobs);
    const realActive = all.filter((job) => ACTIVE(job.status));
    for (const parent of realActive) {
      (Array.isArray(parent.upcoming) ? parent.upcoming : []).forEach((step, index) => {
        if (BACKGROUND_KINDS.has(step.type)) return;
        const sameRunning = realActive.some((job) => job.type === step.type && (job.only || null) === (step.only || null)
          && job.meta?.brandId === parent.meta?.brandId && (step.type === "weekly_strategy" || job.meta?.productId === parent.meta?.productId));
        if (sameRunning) return;
        const id = `waiting:${parent.id}:${index}`;
        out[id] = { id, type: step.type, only: step.only, status: "waiting", progress: {}, waitingOrder: index,
          startedAt: parent.startedAt, meta: { ...parent.meta, kind: step.type } };
      });
    }
    return out;
  }, [jobs]);
  // Same list minus finished jobs the user cleared; active jobs always show.
  const trackerJobs = useMemo(() => ({ ...Object.fromEntries(Object.entries(visibleJobs).filter(([, job]) =>
    ACTIVE(job.status) || Math.max(job.finishedAt || 0, job.startedAt || 0) > clearedAt)), ...waitingJobs }), [visibleJobs, waitingJobs, clearedAt]);
  const unreadErrors = unreadResults.filter((job) => jobOutcome(job) === "failed").length;
  const value = useMemo(() => ({ jobs: visibleJobs, trackerJobs, clearHistory, track, cancel, historyLoading, historyError, nextOffset, loadMore, refreshHistory, unreadStatus, unreadErrors, markResultsRead }), [visibleJobs, trackerJobs, clearHistory, track, cancel, historyLoading, historyError, nextOffset, loadMore, refreshHistory, unreadStatus, unreadErrors, markResultsRead]);
  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}
JobsProvider.propTypes = { children: PropTypes.node, userId: PropTypes.string };

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be used within JobsProvider");
  return ctx;
}

// Hook a view uses for ONE job kind+scope. Returns the matched tracked job
// (most recent for this kind/scope) + a `start(jobId)` to track a new run.
// Fires onComplete exactly once when a tracked job finishes successfully — even
// if the job completed while the view was unmounted (the view re-adopts it on
// remount and reloads its data).
export function useJobRunner({ kind, brandId, productId, enabled = true, restoreFinished = true, onComplete, onFail }) {
  const { jobs, track } = useJobs();
  const firedRef = useRef(null);
  const observedJobs = useRef(new Set());
  const cbRef = useRef({ onComplete, onFail });
  cbRef.current = { onComplete, onFail };

  const job = useMemo(() => {
    if (!enabled) return null;
    const matches = Object.values(jobs).filter((j) =>
      j.meta?.kind === kind &&
      (brandId == null || j.meta?.brandId === brandId) &&
      (productId == null || j.meta?.productId === productId));
    for (const match of matches) if (ACTIVE(match.status)) observedJobs.current.add(match.id);
    matches.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    return matches.find((match) => restoreFinished || observedJobs.current.has(match.id)) || null;
  }, [jobs, kind, brandId, productId, enabled, restoreFinished]);

  useEffect(() => {
    if (!job) return;
    const key = `${job.id}:${job.status}`;
    if ((job.status === "completed" || job.status === "failed" || job.status === "cancelled") && firedRef.current !== key) {
      firedRef.current = key;
      if (job.status === "completed") cbRef.current.onComplete?.(job);
      else cbRef.current.onFail?.(job);
    }
  }, [job]);

  const start = useCallback((jobId) => {
    observedJobs.current.add(jobId);
    track(jobId, { kind, brandId, productId });
  }, [track, kind, brandId, productId]);
  return { job, start };
}

// ── Milestones ────────────────────────────────────────────────────────────────
const RESEARCH_PHASES = [
  "Studying your brand", "Reading customer reviews", "Researching competitors",
  "Checking customer sentiment", "Writing the research report", "Building personas", "Mapping personas to your ads",
];
// Plain-English step names for the tracker. Unknown steps show "Working on it",
// never the internal phase key.
const PHASE_LABELS = {
  // analyze_ads
  ingest: "Fetching your ads from Meta", fetching_meta: "Fetching your ads from Meta", metrics: "Updating ad results",
  analyze: "Analyzing ads", audit: "Writing the strategy audit", audit_wave_1: "Writing the strategy audit",
  audit_wave_2: "Finishing the strategy audit", trending: "Finding trending creatives", curating_hooks: "Saving your best hooks",
  // generate_ad / scripts / briefs
  gathering_context: "Gathering brand context", planning_concepts: "Planning ad concepts", generating: "Creating images",
  picking_concept: "Picking a concept", writing_brief: "Writing the brief", writing_hooks: "Writing hooks",
  writing_script: "Writing the script", saving: "Saving",
  // weekly strategy
  refreshing_knowledge: "Updating cross-account patterns", building_briefing: "Reviewing your account", running_strategist: "Writing this week's concepts", saving_concepts: "Saving concepts",
  // research / ingestion / inspiration
  mining_reddit: "Reading Reddit discussions", scraping_and_extracting: "Reading your website",
  analyzing: "Analyzing the reference", analyzing_batch: "Analyzing references",
  // monthly review / cross-account
  reading_analysis: "Reading saved analysis", learning_naming: "Learning your ad naming", writing_summaries: "Writing monthly summaries",
  synthesizing_knowledge: "Finding patterns across accounts",
};
const KIND_LABEL = {
  research: "Product research", analyze_ads: "Ad analysis",
  generate_ad: "Static ad generation", generate_library: "Copy library generation", weekly_strategy: "Weekly strategy",
  ingest_context: "Reading your website", inspo_analyze: "Reference analysis", trending_creative: "Trending creatives",
  monthly_review: "Monthly review", cross_account_knowledge: "Cross-account learnings",
  generate_scripts: "Video scripts", generate_brief: "Creative brief", weekly_brief: "Concept brief",
};

/** Plain-English name of a job kind, e.g. "Ad analysis". */
export function jobTitle(job) {
  const type = job?.type || job?.meta?.kind;
  return type === "research" && job?.only === "cross_map" ? "Persona mapping" : KIND_LABEL[type] || job?.meta?.label || "Background task";
}

/** The visible steps that start after this job (its chain), in order. */
export function dependentSteps(job) {
  return (Array.isArray(job?.upcoming) ? job.upcoming : []).filter((step) => !BACKGROUND_KINDS.has(step.type)).map((step) => jobTitle(step));
}

// Returns { title, detail, pct } for a job record. pct is best-effort (null when unknown).
export function describeJob(job) {
  if (!job) return null;
  const type = job.type || job.meta?.kind;
  const title = jobTitle(job);
  const p = job.progress || {};
  const timing = timeProgress(job);
  if (job.status === "waiting") return { title, detail: "Waiting · starts after the step above", pct: null, eta: timeProgress({ ...job, status: "queued" }).label };
  if (job.status === "queued" || job.status == null) return { title, detail: "Queued · starting soon", pct: 0, eta: timing.label };
  if (job.status === "completed") {
    const result = job.result || {};
    const detail = type === "analyze_ads" ? `Completed · ${result.analyzed ?? 0} ads analyzed${result.reused ? ` · ${result.reused} matched an analyzed ad` : ""}${result.failed ? ` · ${result.failed} couldn't be analyzed` : ""}${result.deferred ? ` · ${result.deferred} left for the next run` : ""}`
      : type === "generate_ad" ? `Completed · ${result.saved ?? 0} ads saved`
      : type === "weekly_strategy" ? `Completed · ${result.ideas_generated ?? 0} concepts`
      : type === "monthly_review" && result.status === "ok" ? `Completed · ${result.concepts ?? 0} concepts`
      : type === "generate_scripts" ? `Completed · ${result.count ?? 0} script${result.count === 1 ? "" : "s"} saved to Scripts`
      : type === "generate_brief" ? "Completed · saved to Briefs"
      : type === "weekly_brief" ? "Completed · brief added to the concept card"
      : "Completed";
    const errors = [...(Array.isArray(result.errors) ? result.errors : []), ...partialErrors(job)].join("; ");
    return { title, detail: errors ? `${detail} · ${errors}` : detail, pct: 100 };
  }
  if (job.status === "failed") return { title, detail: job.error || "failed", pct: null };
  if (job.status === "cancelled") return { title, detail: job.error && job.error !== "Cancelled by user" ? job.error : "Cancelled · the steps after it were cancelled too", pct: null };

  // running
  if (type === "research" && typeof p.phase === "number") {
    const total = p.total || 7;
    const done = p.status === "done" ? p.phase : p.phase - 1;
    const name = RESEARCH_PHASES[p.phase - 1] || `Phase ${p.phase}`;
    return { title, detail: `Step ${p.phase} of ${total} · ${name}`, pct: Math.round((done / total) * 100), eta: timing.label };
  }
  // Jobs that report their own percentage (scripts and briefs) win over the
  // time-based estimate; everything else shows elapsed share of its estimate.
  const pct = typeof p.pct === "number" ? p.pct : timing.pct;
  if (type === "generate_ad" && (p.generated != null || p.saved != null)) {
    const of = p.total ? ` · ${p.done ?? 0}/${p.total} variations` : "";
    return { title, detail: `${PHASE_LABELS[p.phase] || "Generating"}${of} · ${p.saved ?? 0} saved`, pct, eta: timing.label };
  }
  const phaseLabel = PHASE_LABELS[p.phase] || "Working on it";
  const count = (type === "generate_scripts" && p.total > 1) || (type === "analyze_ads" && p.phase === "analyze" && p.total)
    ? ` · ${p.done ?? 0} of ${p.total}` : "";
  return { title, detail: `${phaseLabel}${count}`, pct, eta: timing.label };
}

// ── Inline badge (used next to a view's Run button) ───────────────────────────
// Only while the job runs: success and error results live in the job tracker,
// so a view never keeps showing an old outcome after it reopens.
export function JobBadge({ job, className = "" }) {
  if (!job || !ACTIVE(job.status)) return null;
  const d = describeJob(job);
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      <span className="text-neutral-600">{d.detail}{d.pct != null ? ` · ${d.pct}%` : ""}</span>
    </span>
  );
}
JobBadge.propTypes = { job: PropTypes.object, className: PropTypes.string };
