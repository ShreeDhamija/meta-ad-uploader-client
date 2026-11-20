// Expected run time per job kind, in minutes, shown in the job tracker.
//
// `first` is a brand/product's first successful run of that kind (the backend
// sends job.firstRun), which does the most work: every ad analyzed, full
// research, a full copy library. `repeat` is every later run.
//
// These are starting values, not measurements — adjust them here once real
// runs show how long each kind takes.
export const JOB_ESTIMATE_MINUTES = {
  ingest_context: { first: 2, repeat: 2 },
  research: { first: 10, repeat: 8 },
  // Measured 2026-11-20 (FC2, 641 spending ads): first run 10.3 min — ingest
  // ~1, 67 ads analyzed at 8 at a time ~6.7, audit ~2.5. Later runs analyze
  // only ads new to the top set but still ingest and re-audit.
  analyze_ads: { first: 11, repeat: 5 },
  generate_library: { first: 10, repeat: 5 },
  weekly_strategy: { first: 10, repeat: 6 },
  monthly_review: { first: 10, repeat: 5 },
  generate_ad: { first: 4, repeat: 4 },
  inspo_analyze: { first: 2, repeat: 2 },
  trending_creative: { first: 2, repeat: 2 },
  cross_account_knowledge: { first: 3, repeat: 3 },
  generate_brief: { first: 2, repeat: 2 },
  weekly_brief: { first: 2, repeat: 2 },
  // Per pair of scripts: two are written at a time.
  generate_scripts: { first: 2, repeat: 2, perPair: true },
};

/** Expected total minutes for a job, or null when the kind has no estimate. */
export function estimateMinutes(job) {
  const entry = JOB_ESTIMATE_MINUTES[job.type || job.meta?.kind];
  if (!entry) return null;
  const base = job.firstRun ? entry.first : entry.repeat;
  if (!entry.perPair) return base;
  const total = Number(job.progress?.total) || 1;
  return base * Math.ceil(total / 2);
}

const minutesLabel = (minutes) => minutes < 1 ? "under a minute" : `${Math.round(minutes)} min`;

/**
 * Time-based progress for a running job: elapsed share of the estimate (held
 * below 95% so it never looks finished early) and a short time-left label.
 */
export function timeProgress(job, now = Date.now()) {
  const minutes = estimateMinutes(job);
  if (!minutes) return { pct: null, label: null };
  if (job.status === "queued" || job.status == null || !job.executionStartedAt) {
    return { pct: null, label: `Usually takes about ${minutesLabel(minutes)}` };
  }
  const elapsed = (now - new Date(job.executionStartedAt).getTime()) / 60000;
  const left = minutes - elapsed;
  return {
    pct: Math.max(1, Math.min(95, Math.round((elapsed / minutes) * 100))),
    label: left > 0.5 ? `About ${minutesLabel(left)} left` : "Taking a little longer than usual",
  };
}
