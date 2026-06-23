// Global running-jobs chip for the top context bar. Shows how many worker jobs
// are in flight (from anywhere in the module) and a popover with each job's
// live milestone — so progress is visible no matter which tab you're on.
import { useState, useRef, useEffect } from "react";
import { Loader2, CheckCircle2, AlertTriangle, ChevronDown } from "lucide-react";
import { useJobs, describeJob } from "./JobsContext";

const ACTIVE = (s) => s === "queued" || s === "running" || s == null;

export default function JobsIndicator() {
  const { jobs } = useJobs();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const list = Object.values(jobs).sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
  const active = list.filter((j) => ACTIVE(j.status));
  if (list.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-2xl border border-neutral-200 bg-white shadow-xs px-3 py-2 text-sm hover:bg-neutral-50">
        {active.length > 0
          ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        <span className="font-medium">{active.length > 0 ? `${active.length} running` : "idle"}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-neutral-200 bg-white shadow-lg p-3 z-20 space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Jobs</p>
          {list.map((j) => {
            const d = describeJob(j);
            const failed = j.status === "failed";
            const done = j.status === "completed";
            return (
              <div key={j.id} className="flex items-start gap-2">
                {done ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  : failed ? <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    : <Loader2 className="w-4 h-4 animate-spin text-blue-600 mt-0.5 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-neutral-800 truncate">{d.title}</span>
                    {d.pct != null && !done && !failed && <span className="text-xs text-neutral-400 tabular-nums">{d.pct}%</span>}
                  </div>
                  <div className={`text-xs truncate ${failed ? "text-red-600" : "text-neutral-500"}`}>{d.detail}</div>
                  {d.pct != null && !done && !failed && (
                    <div className="h-1 rounded-full bg-neutral-100 mt-1 overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all" style={{ width: `${d.pct}%` }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
