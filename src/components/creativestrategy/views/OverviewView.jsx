// Overview — dashboard pulling the most useful signals from across the module:
// performance KPIs + winners (Intelligence), this week's concepts (Weekly),
// pipeline counts (trending / research / library), recent generated statics,
// and quick shortcuts into the heavy actions. Brand-level cards render with
// just a brand; product-level cards (KPIs, winners, statics) need a product.
// Visual language (per Figma): gray borderless cards on the white page, white
// borderless tiles inside them, solid colored icon circles with a soft ring,
// mono numerals. LLM spend lives in the top-bar CostTracker, not repeated here.
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Layers, Box, Flame, Zap, MousePointerClick, SearchCheck, BookOpen,
  TrendingUp, DollarSign, ArrowRight, ArrowUpRight, Percent, Radio, Sun, Plus,
} from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EmptyState } from "../ui";

const money = (n) => `$${Math.round(n || 0).toLocaleString()}`;
const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);
const gradeRank = (g) => ({ A: 4, B: 3, C: 2, D: 1 }[g] || 0);

// Solid icon circles with a soft same-hue ring (Figma's icon treatment).
const CIRCLES = {
  blue: "bg-blue-500 text-white ring-4 ring-blue-500/15",
  emerald: "bg-emerald-500 text-white ring-4 ring-emerald-500/15",
  orange: "bg-orange-500 text-white ring-4 ring-orange-500/15",
  amber: "bg-amber-400 text-white ring-4 ring-amber-400/20",
  purple: "bg-purple-500 text-white ring-4 ring-purple-500/15",
  red: "bg-red-500 text-white ring-4 ring-red-500/15",
  neutral: "bg-neutral-400 text-white ring-4 ring-neutral-400/15",
};

// Weekly concept tiers → solid pill colors (keys match strategist output).
const TIER_PILLS = {
  iteration: "bg-amber-400 text-white",
  format_transformation: "bg-orange-500 text-white",
  inspired: "bg-purple-500 text-white",
  big_swing: "bg-pink-500 text-white",
  net_new: "bg-emerald-500 text-white",
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
          <KpiCard circle="blue" icon={DollarSign} label="Ad spend" value={money(totalSpend)} />
          <KpiCard circle="emerald" icon={Percent} label="ROAS" value={avgRoas ? avgRoas.toFixed(1) : "—"} />
          <KpiCard circle="orange" icon={Radio} label="CPA" value={avgCpa ? money(avgCpa) : "—"} />
          <KpiCard circle="amber" icon={Sun} label="Winners" value={abWinners} />
        </div>
      ) : (
        <EmptyState icon={Box} title="Pick a product for performance"
          hint="Select a product in the top bar to surface KPIs, winners, trending creative, and research here."
          action={<Button size="sm" variant="outline" className="rounded-xl" onClick={() => goTo("products")}>Go to Products</Button>} />
      )}

      {/* Main row: winners (left) · concepts + quick actions (right) */}
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <OverviewCard title="Top Winners" circle="blue" icon={Flame} onOpen={() => goTo("intelligence")}>
          {winners.length === 0 ? (
            <Hint>No analyzed ads yet. Run analysis in Intelligence to surface winners here.</Hint>
          ) : (
            <div className="space-y-2">
              {winners.map((w) => (
                <div key={w.adId} className="flex items-center gap-3 rounded-xl bg-white p-2">
                  {(w.imageUrl || w.thumbnailUrl)
                    ? <img src={w.imageUrl || w.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-neutral-100 shrink-0" />
                    : <div className="w-12 h-12 rounded-lg bg-neutral-100 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-neutral-900 truncate">{w.adName || "(unnamed)"}</div>
                    <div className="text-xs text-neutral-400 tabular-nums">{money(w.spend)}{w.roas ? ` · ROAS ${w.roas.toFixed(2)}` : ""}</div>
                  </div>
                  {w.grade && (
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      gradeRank(w.grade) >= 3 ? "bg-emerald-500 text-white" : "bg-neutral-200 text-neutral-600",
                    )}>{w.grade}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </OverviewCard>

        <div className="space-y-4">
          <OverviewCard title="This Week's Concepts" onOpen={() => goTo("weekly")}>
            {topConcepts.length === 0 ? (
              <Hint>No pending concepts. Run the weekly strategist to generate new ones.</Hint>
            ) : (
              <ul className="space-y-2">
                {topConcepts.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm text-neutral-500 min-w-0">
                    <span className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                      TIER_PILLS[c.tier] || "bg-neutral-400 text-white",
                    )}>{TIER_LABELS[c.tier] || c.tier}</span>
                    <span className="truncate">{c.title}</span>
                  </li>
                ))}
              </ul>
            )}
            {weekly?.costCents != null && (
              <p className="text-xs text-neutral-400 mt-3">Last run cost {money(weekly.costCents / 100)}{pending.length ? ` · ${pending.length} pending` : ""}</p>
            )}
          </OverviewCard>

          <OverviewCard title="Quick Actions">
            <div className="grid grid-cols-2 gap-3">
              <ActionBtn circle="red" icon={Radio} label="Generate Statics" onClick={() => goTo("generate")} />
              <ActionBtn circle="purple" icon={Zap} label="Run Analysis" onClick={() => goTo("intelligence")} />
              <ActionBtn circle="blue" icon={MousePointerClick} label="Weekly Strategy" onClick={() => goTo("weekly")} />
              <ActionBtn circle="emerald" icon={SearchCheck} label="Research" onClick={() => goTo("research")} />
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
        <div className="rounded-2xl bg-neutral-100 p-4">
          <div className="flex gap-4 overflow-x-auto pb-1">
            {recentStatics.map((g) => (
              <button key={g.id || g.imageUrl} onClick={() => goTo("generate")}
                className="shrink-0 w-40 h-40 rounded-xl overflow-hidden bg-white hover:shadow-sm transition-shadow"
                title={g.formatSlug || "Generated static"}>
                <img src={g.imageUrl} alt={g.formatSlug || "Generated static"} className="w-full h-full object-cover" />
              </button>
            ))}
            <button onClick={() => goTo("generate")}
              className="shrink-0 w-40 h-40 rounded-xl border-2 border-dashed border-neutral-300 bg-white hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 text-neutral-700 px-4">
              <Plus className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">Create New Static</span>
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-neutral-400">{selectedBrand?.name}{selectedProduct ? ` · ${selectedProduct.name}` : ""}</p>
    </div>
  );
}
OverviewView.propTypes = { ctx: PropTypes.object.isRequired };

// ── Building blocks ───────────────────────────────────────────────────────────

function IconCircle({ circle, icon: Icon, size = "md" }) {
  return (
    <span className={cn(
      "rounded-full grid place-items-center shrink-0",
      size === "md" ? "w-7 h-7" : "w-5 h-5",
      CIRCLES[circle] || CIRCLES.neutral,
    )}>
      <Icon className={size === "md" ? "w-3.5 h-3.5" : "w-3 h-3"} />
    </span>
  );
}
IconCircle.propTypes = { circle: PropTypes.string, icon: PropTypes.elementType, size: PropTypes.string };

function KpiCard({ circle, icon, label, value }) {
  return (
    <div className="rounded-2xl bg-neutral-100 p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <IconCircle circle={circle} icon={icon} />
        <span className="text-sm font-semibold text-neutral-900">{label}</span>
      </div>
      <div className="text-3xl font-semibold font-mono tabular-nums tracking-tight text-neutral-900">{value}</div>
    </div>
  );
}
KpiCard.propTypes = {
  circle: PropTypes.string, icon: PropTypes.elementType,
  label: PropTypes.node, value: PropTypes.node,
};

function OverviewCard({ title, circle, icon, onOpen, children }) {
  return (
    <div className="rounded-2xl bg-neutral-100 p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <IconCircle circle={circle} icon={icon} size="sm" />}
          <span className="text-sm font-semibold text-neutral-900 truncate">{title}</span>
        </div>
        {onOpen && (
          <button onClick={onOpen} className="text-neutral-700 hover:text-neutral-400 transition-colors" title={`Open ${title}`}>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
OverviewCard.propTypes = {
  title: PropTypes.string.isRequired, circle: PropTypes.string, icon: PropTypes.elementType,
  onOpen: PropTypes.func, children: PropTypes.node,
};

function ActionBtn({ circle, icon, label, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-3 text-sm font-medium text-neutral-900 hover:shadow-sm transition-shadow text-left">
      <IconCircle circle={circle} icon={icon} />
      <span className="truncate">{label}</span>
    </button>
  );
}
ActionBtn.propTypes = { circle: PropTypes.string, icon: PropTypes.elementType, label: PropTypes.string, onClick: PropTypes.func };

function PipelineTile({ icon: Icon, label, value, sub, onClick }) {
  return (
    <button onClick={onClick}
      className="group rounded-2xl bg-neutral-100 px-4 py-3 text-left hover:bg-neutral-200/70 transition-colors flex items-center gap-3">
      <span className="w-8 h-8 rounded-full bg-white grid place-items-center shrink-0">
        <Icon className="w-4 h-4 text-neutral-600" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold font-mono tabular-nums">{value}</span>
          <span className="text-xs font-medium text-neutral-500 truncate">{label}</span>
        </div>
        <div className="text-xs text-neutral-400 truncate">{sub}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-600 transition-colors shrink-0" />
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
          <div key={i} className="rounded-2xl bg-neutral-100 p-5 space-y-4">
            <Skeleton className="h-7 w-7 rounded-full bg-neutral-200" />
            <Skeleton className="h-8 w-24 bg-neutral-200" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-neutral-100 p-4 space-y-3">
            <Skeleton className="h-4 w-1/3 bg-neutral-200" />
            <Skeleton className="h-14 w-full rounded-xl bg-neutral-200" />
            <Skeleton className="h-14 w-full rounded-xl bg-neutral-200" />
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
