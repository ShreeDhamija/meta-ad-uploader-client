// Overview — dashboard pulling the most useful signals from across the module:
// performance KPIs + winners (Intelligence), this week's concepts (Weekly),
// pipeline counts (trending / research / library), recent generated statics,
// and quick shortcuts into the heavy actions. Brand-level cards render with
// just a brand; product-level cards (KPIs, winners, statics) need a product.
// LLM spend lives in the top-bar CostTracker, so it isn't repeated here.
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Layers, Box, Flame, Zap, MousePointerClick, SearchCheck, BookOpen,
  TrendingUp, DollarSign, ArrowRight, ArrowUpRight, Percent, Target, Trophy, Plus,
} from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EmptyState } from "../ui";

const money = (n) => `$${Math.round(n || 0).toLocaleString()}`;
const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);
const gradeRank = (g) => ({ A: 4, B: 3, C: 2, D: 1 }[g] || 0);

// Icon-chip tints for KPI cards / quick actions (soft bg + saturated icon).
const TINTS = {
  blue: "bg-blue-100 text-blue-600",
  emerald: "bg-emerald-100 text-emerald-600",
  orange: "bg-orange-100 text-orange-600",
  amber: "bg-amber-100 text-amber-600",
  purple: "bg-purple-100 text-purple-600",
  pink: "bg-pink-100 text-pink-600",
  neutral: "bg-neutral-100 text-neutral-600",
};

// Weekly concept tiers → pill colors (keys match the weekly strategist output).
const TIER_PILLS = {
  iteration: "bg-blue-100 text-blue-700",
  format_transformation: "bg-orange-100 text-orange-700",
  inspired: "bg-purple-100 text-purple-700",
  big_swing: "bg-pink-100 text-pink-700",
  net_new: "bg-emerald-100 text-emerald-700",
};
const TIER_LABELS = {
  iteration: "Iteration",
  format_transformation: "Format",
  inspired: "Inspired",
  big_swing: "Big swing",
  net_new: "Net-new",
};

export default function OverviewView({ ctx }) {
  const { selectedBrand, selectedBrandId, selectedProduct, selectedProductId, goTo } = ctx;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ ads: [], trending: null, weekly: null, ideas: [], personas: 0, library: 0, generated: [] });

  useEffect(() => {
    if (!selectedBrandId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [weekly, insights, research, library, generated] = await Promise.allSettled([
        creativeApi.getWeekly(selectedBrandId),
        selectedProductId ? creativeApi.getInsights(selectedProductId) : Promise.resolve(null),
        selectedProductId ? creativeApi.getResearch(selectedProductId) : Promise.resolve(null),
        selectedProductId ? creativeApi.getLibrary(selectedProductId) : Promise.resolve(null),
        selectedProductId ? creativeApi.getGenerated(selectedProductId) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      const val = (r) => (r.status === "fulfilled" ? r.value : null);
      const w = val(weekly); const ins = val(insights); const res = val(research);
      const personas = res?.intel?.personas?.personas?.length ?? (Array.isArray(res?.intel?.personas) ? res.intel.personas.length : 0);
      setData({
        ads: ins?.ads || [],
        trending: ins?.trending || null,
        weekly: w?.latestRun || null,
        ideas: w?.ideas || [],
        personas,
        library: val(library)?.items?.length ?? 0,
        generated: val(generated)?.items ?? [],
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedBrandId, selectedProductId]);

  if (!selectedBrandId) {
    return <EmptyState icon={Layers} title="No brand selected" hint="Pick a brand in the top bar to see its overview." />;
  }
  if (loading) return <OverviewSkeleton />;

  const { ads, trending, weekly, ideas, personas, library, generated } = data;

  // KPIs
  const totalSpend = ads.reduce((s, x) => s + (x.spend || 0), 0);
  const avgRoas = mean(ads.map((x) => x.roas).filter((x) => x > 0));
  const avgCpa = mean(ads.map((x) => x.costPerPurchase).filter((x) => x > 0));
  const winners = [...ads].sort((x, y) => (gradeRank(y.grade) - gradeRank(x.grade)) || (y.spend - x.spend)).slice(0, 3);
  const abWinners = ads.filter((x) => x.grade === "A" || x.grade === "B").length;
  const pending = ideas.filter((i) => (i.status ?? "pending") === "pending");
  const topConcepts = pending.slice(0, 4);
  const trendingAds = trending?.trending_ads || [];
  const recentStatics = generated.filter((g) => g.imageUrl).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      {selectedProductId ? (
        <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2">
          <KpiCard tint="blue" icon={DollarSign} label="Ad spend analyzed" value={money(totalSpend)} sub={`${ads.length} ads`} />
          <KpiCard tint="emerald" icon={Percent} label="Avg ROAS" value={avgRoas ? `${avgRoas.toFixed(2)}x` : "—"} />
          <KpiCard tint="orange" icon={Target} label="Avg CPA" value={avgCpa ? money(avgCpa) : "—"} />
          <KpiCard tint="amber" icon={Trophy} label="Winners" value={abWinners} sub={`A/B of ${ads.length}`} />
        </div>
      ) : (
        <EmptyState icon={Box} title="Pick a product for performance"
          hint="Select a product in the top bar to surface KPIs, winners, trending creative, and research here."
          action={<Button size="sm" variant="outline" className="rounded-xl" onClick={() => goTo("products")}>Go to Products</Button>} />
      )}

      {/* Main row: winners (left) · concepts + quick actions (right) */}
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <OverviewCard title="Top winners" icon={Flame} onOpen={() => goTo("intelligence")}>
          {winners.length === 0 ? (
            <Hint>No analyzed ads yet. Run analysis in Intelligence to surface winners here.</Hint>
          ) : (
            <div className="space-y-2">
              {winners.map((w, i) => (
                <div key={w.adId} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-2">
                  <span className="text-xs text-neutral-300 tabular-nums w-4 text-center shrink-0">{i + 1}</span>
                  {(w.imageUrl || w.thumbnailUrl)
                    ? <img src={w.imageUrl || w.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-neutral-100 shrink-0" />
                    : <div className="w-12 h-12 rounded-lg bg-neutral-100 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{w.adName || "(unnamed)"}</div>
                    <div className="text-xs text-neutral-400 tabular-nums">{money(w.spend)}{w.roas ? ` · ROAS ${w.roas.toFixed(2)}` : ""}</div>
                  </div>
                  {w.grade && (
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      gradeRank(w.grade) >= 3 ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600",
                    )}>{w.grade}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </OverviewCard>

        <div className="space-y-4">
          <OverviewCard title="This week's concepts" icon={MousePointerClick}
            hint={pending.length ? `${pending.length} pending` : null} onOpen={() => goTo("weekly")}>
            {topConcepts.length === 0 ? (
              <Hint>No pending concepts. Run the weekly strategist to generate new ones.</Hint>
            ) : (
              <ul className="space-y-1.5">
                {topConcepts.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm text-neutral-700 min-w-0">
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      TIER_PILLS[c.tier] || "bg-neutral-100 text-neutral-600",
                    )}>{TIER_LABELS[c.tier] || c.tier}</span>
                    <span className="truncate">{c.title}</span>
                  </li>
                ))}
              </ul>
            )}
            {weekly?.costCents != null && (
              <p className="text-xs text-neutral-400 mt-2">Last run cost {money(weekly.costCents / 100)}</p>
            )}
          </OverviewCard>

          <OverviewCard title="Quick actions" icon={Zap}>
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn tint="pink" icon={Flame} label="Generate static" onClick={() => goTo("generate")} />
              <ActionBtn tint="blue" icon={Zap} label="Run analysis" onClick={() => goTo("intelligence")} />
              <ActionBtn tint="purple" icon={MousePointerClick} label="Weekly strategy" onClick={() => goTo("weekly")} />
              <ActionBtn tint="emerald" icon={SearchCheck} label="Research" onClick={() => goTo("research")} />
            </div>
          </OverviewCard>
        </div>
      </div>

      {/* Pipeline counts — compact links into the deeper tabs */}
      {selectedProductId && (
        <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
          <PipelineTile icon={TrendingUp} label="Trending ads" value={trendingAds.length}
            sub={trendingAds[0]?.adName || "None in last 7d"} onClick={() => goTo("intelligence")} />
          <PipelineTile icon={SearchCheck} label="Research personas" value={personas}
            sub={personas ? "From the research agent" : "Run research to build personas"} onClick={() => goTo("research")} />
          <PipelineTile icon={BookOpen} label="Library drafts" value={library}
            sub="Hooks, headlines & primary text" onClick={() => goTo("library")} />
        </div>
      )}

      {/* Recent statics strip */}
      {selectedProductId && (
        <OverviewCard title="Recent statics" icon={BookOpen}
          hint={generated.length ? `${generated.length} generated` : null}
          onOpen={generated.length ? () => goTo("generate") : undefined}>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentStatics.map((g) => (
              <button key={g.id || g.imageUrl} onClick={() => goTo("generate")}
                className="shrink-0 w-32 h-32 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 hover:shadow-sm transition-shadow"
                title={g.formatSlug || "Generated static"}>
                <img src={g.imageUrl} alt={g.formatSlug || "Generated static"} className="w-full h-full object-cover" />
              </button>
            ))}
            <button onClick={() => goTo("generate")}
              className="shrink-0 w-32 h-32 rounded-xl border border-dashed border-neutral-300 bg-white hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center gap-1.5 text-neutral-500">
              <span className="w-7 h-7 rounded-full bg-neutral-100 grid place-items-center"><Plus className="w-4 h-4" /></span>
              <span className="text-xs font-medium">Create new static</span>
            </button>
          </div>
        </OverviewCard>
      )}

      <p className="text-xs text-neutral-400">{selectedBrand?.name}{selectedProduct ? ` · ${selectedProduct.name}` : ""}</p>
    </div>
  );
}
OverviewView.propTypes = { ctx: PropTypes.object.isRequired };

// ── Building blocks ───────────────────────────────────────────────────────────

function KpiCard({ tint, icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("w-7 h-7 rounded-full grid place-items-center shrink-0", TINTS[tint])}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className="text-xs font-medium text-neutral-500">{label}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="text-xs text-neutral-400 mt-0.5">{sub}</div>}
    </div>
  );
}
KpiCard.propTypes = {
  tint: PropTypes.string, icon: PropTypes.elementType,
  label: PropTypes.node, value: PropTypes.node, sub: PropTypes.node,
};

function OverviewCard({ title, icon: Icon, hint, onOpen, children }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-neutral-400 shrink-0" />}
          <span className="text-sm font-semibold text-neutral-800 truncate">{title}</span>
          {hint && <span className="text-xs text-neutral-400 truncate">· {hint}</span>}
        </div>
        {onOpen && (
          <button onClick={onOpen} className="text-neutral-300 hover:text-neutral-700 transition-colors" title={`Open ${title}`}>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
OverviewCard.propTypes = {
  title: PropTypes.string.isRequired, icon: PropTypes.elementType,
  hint: PropTypes.node, onOpen: PropTypes.func, children: PropTypes.node,
};

function ActionBtn({ tint, icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:shadow-xs transition-all text-left">
      <span className={cn("w-7 h-7 rounded-full grid place-items-center shrink-0", TINTS[tint])}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
ActionBtn.propTypes = { tint: PropTypes.string, icon: PropTypes.elementType, label: PropTypes.string, onClick: PropTypes.func };

function PipelineTile({ icon: Icon, label, value, sub, onClick }) {
  return (
    <button onClick={onClick}
      className="group rounded-2xl border border-neutral-200 bg-white shadow-xs px-4 py-3 text-left hover:shadow-sm transition-shadow flex items-center gap-3">
      <span className="w-8 h-8 rounded-full bg-neutral-100 grid place-items-center shrink-0">
        <Icon className="w-4 h-4 text-neutral-500" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold tabular-nums">{value}</span>
          <span className="text-xs font-medium text-neutral-500 truncate">{label}</span>
        </div>
        <div className="text-xs text-neutral-400 truncate">{sub}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-neutral-200 group-hover:text-neutral-500 transition-colors shrink-0" />
    </button>
  );
}
PipelineTile.propTypes = {
  icon: PropTypes.elementType, label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), sub: PropTypes.node, onClick: PropTypes.func,
};

// Layout-mirroring skeleton so the page doesn't jump when data lands.
function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 bg-white shadow-xs p-4 space-y-3">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 bg-white shadow-xs p-4 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Hint({ children }) {
  return <p className="text-xs text-neutral-400">{children}</p>;
}
Hint.propTypes = { children: PropTypes.node };
