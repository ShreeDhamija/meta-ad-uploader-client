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
  const unreadResults = Object.values(jobs).filter((job) =>
    isVisible(job) && jobOutcome(job) && Math.max(job.finishedAt || 0, job.startedAt || 0) > clearedAt && isCurrentSessionResult(job, sessionStartedAt.current, sessionJobs.current) && !readResults.has(resultKey(job)));
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
  // Same list minus finished jobs the user cleared; active jobs always show.
  const trackerJobs = useMemo(() => Object.fromEntries(Object.entries(visibleJobs).filter(([, job]) =>
    ACTIVE(job.status) || Math.max(job.finishedAt || 0, job.startedAt || 0) > clearedAt)), [visibleJobs, clearedAt]);
  const value = useMemo(() => ({ jobs: visibleJobs, trackerJobs, clearHistory, track, historyLoading, historyError, nextOffset, loadMore, refreshHistory, unreadStatus, markResultsRead }), [visibleJobs, trackerJobs, clearHistory, track, historyLoading, historyError, nextOffset, loadMore, refreshHistory, unreadStatus, markResultsRead]);
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
    if ((job.status === "completed" || job.status === "failed") && firedRef.current !== key) {
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
  "Brand deep dive", "Review mining", "Competitor & market",
  "Sentiment alignment", "Consumer research report", "Persona building", "Persona cross-map",
];
const PHASE_LABELS = {
  // analyze_ads
  fetching_meta: "Fetching Meta ads", metrics: "Pulling metrics", analyze: "Analyzing creatives",
  audit: "Building strategy audit", ingest: "Indexing for search",
  // generate_ad
  gathering_context: "Gathering brand context", planning_concepts: "Planning static concepts", generating: "Generating",
  trending: "Refreshing trending creatives",
  // others
  running_strategist: "Running the strategist", mining_reddit: "Mining Reddit threads",
  building_briefing: "Building the strategy briefing", saving_concepts: "Saving concept cards",
  scraping_and_extracting: "Scraping + extracting", analyzing: "Analyzing reference",
  analyzing_batch: "Analyzing",
  // generate_scripts / generate_brief / weekly_brief
  picking_concept: "Picking a concept", writing_brief: "Writing the brief", writing_hooks: "Writing hooks",
  writing_script: "Writing the script", saving: "Saving",
  // monthly_review
  reading_analysis: "Reading stored analysis", learning_naming: "Learning ad naming", writing_summaries: "Writing month summaries",
  synthesizing_knowledge: "Finding patterns across accounts", curating_hooks: "Saving proven hooks",
};
const KIND_LABEL = {
  research: "Product research", analyze_ads: "Ad analysis + trending",
  generate_ad: "Static ad generation", generate_library: "Copy library generation", weekly_strategy: "Weekly strategy",
  ingest_context: "Ingestion", inspo_analyze: "Reference analysis", trending_creative: "Trending creative",
  monthly_review: "Monthly review", cross_account_knowledge: "Cross-account learnings",
  generate_scripts: "Video scripts", generate_brief: "Creative brief", weekly_brief: "Concept brief",
};

// Returns { title, detail, pct } for a job record. pct is best-effort (null when unknown).
export function describeJob(job) {
  if (!job) return null;
  const type = job.type || job.meta?.kind;
  const title = KIND_LABEL[type] || job.meta?.label || type || "Job";
  const p = job.progress || {};
  const timing = timeProgress(job);
  if (job.status === "queued" || job.status == null) return { title, detail: "Queued", pct: 0, eta: timing.label };
  if (job.status === "completed") {
    const result = job.result || {};
    const detail = type === "analyze_ads" ? `Completed · ${result.analyzed ?? 0} analyzed · ${result.metricsUpdated ?? 0} refreshed${result.failed ? ` · ${result.failed} failed` : ""}`
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

  // running
  if (type === "research" && typeof p.phase === "number") {
    const total = p.total || 7;
    const done = p.status === "done" ? p.phase : p.phase - 1;
    const name = RESEARCH_PHASES[p.phase - 1] || `Phase ${p.phase}`;
    return { title, detail: `Phase ${p.phase}/${total} · ${name}`, pct: Math.round((done / total) * 100), eta: timing.label };
  }
  // Jobs that report their own percentage (scripts and briefs) win over the
  // time-based estimate; everything else shows elapsed share of its estimate.
  const pct = typeof p.pct === "number" ? p.pct : timing.pct;
  if (type === "generate_ad" && (p.generated != null || p.saved != null)) {
    const of = p.total ? ` · ${p.done ?? 0}/${p.total} variations` : "";
    return { title, detail: `${PHASE_LABELS[p.phase] || "Generating"}${of} · ${p.saved ?? 0} saved`, pct, eta: timing.label };
  }
  const phaseLabel = PHASE_LABELS[p.phase] || (typeof p.phase === "string" ? p.phase : "Working");
  const count = type === "generate_scripts" && p.total > 1 ? ` · ${p.done ?? 0}/${p.total} done` : "";
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
