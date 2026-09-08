// Persistent database-backed history, shared by every creative-strategy view.
import { useState, useRef, useEffect } from "react";
import { Loader2, CheckCircle2, AlertTriangle, ChevronDown, History } from "lucide-react";
import { useJobs, describeJob } from "./JobsContext";

const ACTIVE = (status) => status === "queued" || status === "running" || status == null;
const dateLabel = (value) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Time unavailable";

export default function JobsIndicator() {
  const { jobs, historyLoading, historyError, nextOffset, loadMore, refreshHistory } = useJobs();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const trigger = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", onClick); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const list = Object.values(jobs).sort((a, b) => Number(ACTIVE(b.status)) - Number(ACTIVE(a.status)) || (b.startedAt || 0) - (a.startedAt || 0));
  const active = list.filter((job) => ACTIVE(job.status));
  return <div className="relative" ref={ref}>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls="cs-job-history" onClick={() => { setOpen((value) => !value); if (!open) refreshHistory(); }}
      className="flex items-center gap-1.5 rounded-2xl border border-neutral-200 bg-white shadow-xs px-3 py-2 text-sm hover:bg-neutral-50">
      {active.length ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : <History className="h-4 w-4 text-[#854413]" />}
      <span className="font-medium">{active.length ? `${active.length} running` : "Job history"}</span>
      <ChevronDown className={`h-3.5 w-3.5 text-neutral-400 ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <section id="cs-job-history" aria-label="Job history" className="absolute right-0 mt-2 w-[420px] max-w-[85vw] rounded-2xl border border-neutral-200 bg-white shadow-lg p-4 z-50">
      <h2 className="mb-3 text-sm font-semibold text-stone-800">Job history</h2>
      {historyError && <div className="mb-3 text-xs text-red-700">{historyError} <button type="button" onClick={refreshHistory} className="underline">Retry</button></div>}
      <div className="max-h-[60vh] overflow-y-auto space-y-3">
        {list.map((job) => {
          const description = describeJob(job);
          const failed = job.status === "failed";
          const done = job.status === "completed";
          return <article key={job.id} className="rounded-xl bg-stone-50 p-3">
            <div className="flex items-start gap-2">
              {done ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" /> : failed ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" /> : <Loader2 className="h-4 w-4 mt-0.5 shrink-0 animate-spin text-blue-600" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-800">{description.title}</p>
                <p className="mt-1 text-xs text-stone-600">{job.meta?.accountName || (job.meta?.brandId ? `Account ${job.meta.brandId.slice(0, 8)}` : "Account unavailable")}</p>
                {job.meta?.productId && <p className="text-xs text-stone-500">{job.meta.productName || `Product ${job.meta.productId.slice(0, 8)}`}</p>}
                <p className={`mt-1 text-xs break-words ${failed ? "text-red-700" : "text-stone-600"}`}>{description.detail}</p>
                <p className="mt-2 text-[11px] text-stone-400">{job.executionStartedAt ? "Started" : "Queued"} {dateLabel(job.executionStartedAt || job.createdAt || job.startedAt)}</p>
                {job.completedAt && <p className="text-[11px] text-stone-400">Finished {dateLabel(job.completedAt)}</p>}
                {description.pct != null && !done && !failed && <div className="mt-2 h-1 rounded-full bg-stone-200 overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${description.pct}%` }} /></div>}
              </div>
            </div>
          </article>;
        })}
        {!list.length && <p className="py-6 text-center text-xs text-stone-500">{historyLoading ? "Loading history…" : "No jobs run yet."}</p>}
        {nextOffset != null && <button type="button" onClick={loadMore} disabled={historyLoading} className="cs-library-action w-full">{historyLoading ? "Loading…" : "Load older jobs"}</button>}
      </div>
    </section>}
  </div>;
}
