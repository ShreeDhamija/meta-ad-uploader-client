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

const LS_KEY = "cs_tracked_jobs_v1";
const POLL_MS = 2000;
const KEEP_DONE_MS = 5 * 60 * 1000; // keep completed/failed jobs visible for 5 min

const JobsContext = createContext(null);

const ACTIVE = (s) => s === "queued" || s === "running" || s == null;

function loadPersisted() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    const now = Date.now();
    const out = {};
    for (const [id, j] of Object.entries(raw)) {
      // Drop stale finished jobs; keep anything still active or recently done.
      if (!ACTIVE(j.status) && now - (j.finishedAt || 0) > KEEP_DONE_MS) continue;
      out[id] = j;
    }
    return out;
  } catch { return {}; }
}

export function JobsProvider({ children }) {
  const [jobs, setJobs] = useState(loadPersisted);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  // Persist on every change (active + recently-finished jobs).
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(jobs)); } catch { /* quota — ignore */ }
  }, [jobs]);

  const upsert = useCallback((id, patch) => {
    setJobs((prev) => ({ ...prev, [id]: { ...prev[id], id, ...patch } }));
  }, []);

  const track = useCallback((id, meta = {}) => {
    if (!id) return;
    setJobs((prev) => {
      const existing = prev[id];
      return {
        ...prev,
        [id]: existing
          ? { ...existing, meta: { ...existing.meta, ...meta } }
          : { id, status: "queued", progress: {}, meta, startedAt: Date.now() },
      };
    });
  }, []);

  const untrack = useCallback((id) => {
    setJobs((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  // Central poll loop: every POLL_MS, refresh all active tracked jobs.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const active = Object.values(jobsRef.current).filter((j) => ACTIVE(j.status));
      await Promise.all(active.map(async (j) => {
        try {
          const { job } = await creativeApi.getJob(j.id);
          if (cancelled || !job) return;
          const finished = job.status === "completed" || job.status === "failed";
          upsert(j.id, {
            type: job.type, status: job.status, progress: job.progress || {},
            error: job.error || null, result: job.result || null, costCents: job.costCents,
            ...(finished ? { finishedAt: Date.now() } : {}),
          });
        } catch { /* transient — retry next tick */ }
      }));
    };
    tick();
    const iv = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(iv); };
  }, [upsert]);

  // Auto-prune finished jobs after KEEP_DONE_MS so badges/indicator clear.
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      setJobs((prev) => {
        let changed = false;
        const n = {};
        for (const [id, j] of Object.entries(prev)) {
          if (!ACTIVE(j.status) && now - (j.finishedAt || 0) > KEEP_DONE_MS) { changed = true; continue; }
          n[id] = j;
        }
        return changed ? n : prev;
      });
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const value = useMemo(() => ({ jobs, track, untrack }), [jobs, track, untrack]);
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
export function useJobRunner({ kind, brandId, productId, onComplete, onFail }) {
  const { jobs, track } = useJobs();
  const firedRef = useRef(null);
  const cbRef = useRef({ onComplete, onFail });
  cbRef.current = { onComplete, onFail };

  const job = useMemo(() => {
    const matches = Object.values(jobs).filter((j) =>
      j.meta?.kind === kind &&
      (brandId == null || j.meta?.brandId === brandId) &&
      (productId == null || j.meta?.productId === productId));
    matches.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    return matches[0] || null;
  }, [jobs, kind, brandId, productId]);

  useEffect(() => {
    if (!job) return;
    const key = `${job.id}:${job.status}`;
    if ((job.status === "completed" || job.status === "failed") && firedRef.current !== key) {
      firedRef.current = key;
      if (job.status === "completed") cbRef.current.onComplete?.(job);
      else cbRef.current.onFail?.(job);
    }
  }, [job]);

  const start = useCallback((jobId) => track(jobId, { kind, brandId, productId }), [track, kind, brandId, productId]);
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
  gathering_context: "Gathering brand context", generating: "Generating",
  // others
  running_strategist: "Running the strategist", mining_reddit: "Mining Reddit threads",
  scraping_and_extracting: "Scraping + extracting", analyzing: "Analyzing reference",
  analyzing_batch: "Analyzing", classifying: "Classifying ads",
  curating_hooks: "Curating proven hooks", normalizing_angles: "Normalizing angles",
};
const KIND_LABEL = {
  research: "Research", reddit_sentiment: "Reddit sentiment", analyze_ads: "Analysis",
  generate_ad: "Generating ads", generate_library: "Generating library", weekly_strategy: "Weekly strategy",
  ingest_context: "Ingestion", inspo_analyze: "Reference analysis", trending_creative: "Trending creative",
  backfill: "Maintenance",
};

// Returns { title, detail, pct } for a job record. pct is best-effort (null when unknown).
export function describeJob(job) {
  if (!job) return null;
  const type = job.type || job.meta?.kind;
  const title = KIND_LABEL[type] || job.meta?.label || type || "Job";
  const p = job.progress || {};
  if (job.status === "queued" || job.status == null) return { title, detail: "queued", pct: 0 };
  if (job.status === "completed") return { title, detail: "completed", pct: 100 };
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
