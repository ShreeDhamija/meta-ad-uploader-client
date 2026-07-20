// Persistent spend widget for the top context bar. Reads GET /api/usage over
// the usage_events ledger: total spend for a time window (1d / 7d / 30d) with a
// breakdown by provider (anthropic / gemini / …) or operation. Scoped to the
// selected Brand when one is chosen, else across all the owner's brands.
import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { DollarSign, ChevronDown } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";

const WINDOWS = [
  { key: "1d", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
];

const fmtUsd = (n) =>
  n >= 1 ? `$${n.toFixed(2)}` : n > 0 ? `$${n.toFixed(3)}` : "$0.00";

export default function CostTracker({ clientId }) {
  const [window, setWindow] = useState("7d");
  const [groupBy, setGroupBy] = useState("provider");
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    creativeApi
      .getUsage({ window, groupBy, clientId })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [window, groupBy, clientId]);

  useEffect(() => { load(); }, [load]);

  // Close the detail panel on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const total = data?.totals?.costUsd ?? 0;

  return (
    <div className="relative ml-auto" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-2xl border border-neutral-200 bg-white shadow-xs px-3 py-2 text-sm hover:bg-neutral-50"
        title="LLM spend — click for breakdown"
      >
        <DollarSign className="w-4 h-4 text-emerald-600" />
        <span className="font-semibold tabular-nums">{loading && !data ? "…" : fmtUsd(total)}</span>
        <span className="text-neutral-400 text-xs">/ {WINDOWS.find((w) => w.key === window)?.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-neutral-200 bg-white shadow-lg p-4 z-20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Spend {clientId ? "· this brand" : "· all brands"}
            </span>
            <div className="flex gap-1">
              {WINDOWS.map((w) => (
                <button
                  key={w.key}
                  onClick={() => setWindow(w.key)}
                  className={`px-2 py-0.5 rounded-lg text-xs ${window === w.key ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold tabular-nums">{fmtUsd(total)}</span>
            <span className="text-xs text-neutral-400">{data?.totals?.calls ?? 0} calls</span>
          </div>
          <div className="text-xs text-neutral-400 mb-3 tabular-nums">
            {(data?.totals?.inputTokens ?? 0).toLocaleString()} in · {(data?.totals?.outputTokens ?? 0).toLocaleString()} out tokens
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-neutral-500">Breakdown by</span>
            {["provider", "operation", "model"].map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-2 py-0.5 rounded-lg text-xs ${groupBy === g ? "bg-neutral-200 font-medium" : "text-neutral-500 hover:bg-neutral-100"}`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-56 overflow-auto">
            {(data?.breakdown ?? []).length === 0 && (
              <p className="text-xs text-neutral-400 py-2">No tracked spend in this window.</p>
            )}
            {(data?.breakdown ?? []).map((row) => {
              const pct = total > 0 ? Math.round((row.costUsd / total) * 100) : 0;
              return (
                <div key={row.key} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs">
                      <span className="truncate text-neutral-700">{row.key}</span>
                      <span className="tabular-nums text-neutral-500 ml-2">{fmtUsd(row.costUsd)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 mt-1 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

CostTracker.propTypes = { clientId: PropTypes.string };
