// Cross-tab job tracking. The worker jobs (research, generate, analyze, weekly,
// …) run on the backend and never stop when the user switches tabs — but the
// per-view pollers used to unmount and lose their progress display. This
// provider lifts polling above the view switch: it tracks job ids centrally,
// polls them every 2s, persists active ones to localStorage (so progress
// survives a tab switch AND a full refresh), and exposes friendly milestone
// labels per job type. No SSE — just resilient polling.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";

const POLL_MS = 2000;
const JobsContext = createContext(null);
const ACTIVE = (status) => status === "queued" || status === "running" || status == null;
const millis = (value) => value ? new Date(value).getTime() : 0;

function normalizeJob(job) {
  return { ...job, executionStartedAt: job.startedAt, startedAt: millis(job.createdAt), finishedAt: millis(job.completedAt),
    meta: { kind: job.type, brandId: job.clientId, productId: job.productId,
      accountName: job.accountName, productName: job.productName } };
}

export function JobsProvider({ children }) {
  // The database is the source of truth, including after a browser refresh.
  const [jobs, setJobs] = useState({});
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [nextOffset, setNextOffset] = useState(null);
  const jobsRef = useRef(jobs);
  const olderLoaded = useRef(false);
  const loadingOlder = useRef(false);
  jobsRef.current = jobs;

  const mergeJobs = useCallback((rows) => {
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

  const value = useMemo(() => ({ jobs, track, historyLoading, historyError, nextOffset, loadMore, refreshHistory }), [jobs, track, historyLoading, historyError, nextOffset, loadMore, refreshHistory]);
  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}
JobsProvider.propTypes = { children: PropTypes.node };

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
};
const KIND_LABEL = {
  research: "Product research", analyze_ads: "Ad analysis + trending",
  generate_ad: "Static ad generation", generate_library: "Copy library generation", weekly_strategy: "Weekly strategy",
  ingest_context: "Ingestion", inspo_analyze: "Reference analysis", trending_creative: "Trending creative",
};

// Returns { title, detail, pct } for a job record. pct is best-effort (null when unknown).
export function describeJob(job) {
  if (!job) return null;
  const type = job.type || job.meta?.kind;
  const title = KIND_LABEL[type] || job.meta?.label || type || "Job";
  const p = job.progress || {};
  if (job.status === "queued" || job.status == null) return { title, detail: "queued", pct: 0 };
  if (job.status === "completed") {
    const result = job.result || {};
    const detail = type === "analyze_ads" ? `Completed · ${result.analyzed ?? 0} analyzed · ${result.metricsUpdated ?? 0} refreshed${result.failed ? ` · ${result.failed} failed` : ""}`
      : type === "generate_ad" ? `Completed · ${result.saved ?? 0} ads saved`
      : type === "weekly_strategy" ? `Completed · ${result.ideas_generated ?? 0} concepts`
      : "Completed";
    return { title, detail, pct: 100 };
  }
  if (job.status === "failed") return { title, detail: job.error || "failed", pct: null };

  // running
  if (type === "research" && typeof p.phase === "number") {
    const total = p.total || 7;
    const done = p.status === "done" ? p.phase : p.phase - 1;
    const name = RESEARCH_PHASES[p.phase - 1] || `Phase ${p.phase}`;
    return { title, detail: `Phase ${p.phase}/${total} · ${name}`, pct: Math.round((done / total) * 100) };
  }
  if (type === "generate_ad" && (p.generated != null || p.saved != null)) {
    return { title, detail: `${PHASE_LABELS[p.phase] || "Generating"} · ${p.saved ?? 0} saved`, pct: null };
  }
  const phaseLabel = PHASE_LABELS[p.phase] || (typeof p.phase === "string" ? p.phase : "Working");
  return { title, detail: phaseLabel, pct: null };
}

// ── Inline badge (used next to a view's Run button) ───────────────────────────
export function JobBadge({ job, className = "" }) {
  const d = describeJob(job);
  if (!d) return null;
  const failed = job.status === "failed";
  const done = job.status === "completed";
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      {done ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        : failed ? <AlertTriangle className="w-4 h-4 text-red-600" />
          : <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
      <span className={done ? "text-emerald-600" : failed ? "text-red-600" : "text-neutral-600"}>
        {d.detail}
      </span>
    </span>
  );
}
JobBadge.propTypes = { job: PropTypes.object, className: PropTypes.string };
