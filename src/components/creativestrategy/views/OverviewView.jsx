// Overview — a bento dashboard that pulls the most useful signals from across
// the module: performance KPIs + winners (Intelligence), this week's concepts
// (Weekly), trending creative, LLM spend (usage), research personas, and quick
// shortcuts into the heavy actions. Brand-level tiles render with just a brand;
// product-level tiles (KPIs, winners, research) need a product selected.
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Layers, Box, Flame, Zap, MousePointerClick, SearchCheck, BookOpen,
  TrendingUp, DollarSign, ArrowRight,
} from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ViewLoading, EmptyState, StatTile } from "../ui";

const money = (n) => `$${Math.round(n || 0).toLocaleString()}`;
const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);
const gradeRank = (g) => ({ A: 4, B: 3, C: 2, D: 1 }[g] || 0);

export default function OverviewView({ ctx }) {
  const { selectedBrand, selectedBrandId, selectedProduct, selectedProductId, goTo } = ctx;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ ads: [], trending: null, weekly: null, ideas: [], usage: null, personas: 0, library: 0, generated: 0 });

  useEffect(() => {
    if (!selectedBrandId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [weekly, usage, insights, research, library, generated] = await Promise.allSettled([
        creativeApi.getWeekly(selectedBrandId),
        creativeApi.getUsage({ window: "7d", clientId: selectedBrandId }),
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
        usage: val(usage),
        personas,
        library: val(library)?.items?.length ?? 0,
        generated: val(generated)?.items?.length ?? 0,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedBrandId, selectedProductId]);

  if (!selectedBrandId) {
    return <EmptyState icon={Layers} title="No brand selected" hint="Pick a brand in the top bar to see its overview." />;
  }
  if (loading) return <ViewLoading label="Loading overview…" />;

  const { ads, trending, weekly, ideas, usage, personas, library, generated } = data;

  // KPIs
  const totalSpend = ads.reduce((s, x) => s + (x.spend || 0), 0);
  const avgRoas = mean(ads.map((x) => x.roas).filter((x) => x > 0));
  const avgCpa = mean(ads.map((x) => x.costPerPurchase).filter((x) => x > 0));
  const winners = [...ads].sort((x, y) => (gradeRank(y.grade) - gradeRank(x.grade)) || (y.spend - x.spend)).slice(0, 3);
  const abWinners = ads.filter((x) => x.grade === "A" || x.grade === "B").length;
  const pending = ideas.filter((i) => (i.status ?? "pending") === "pending");
  const topConcepts = pending.slice(0, 3);
  const trendingAds = trending?.trending_ads || [];
  const spend7d = usage?.totals?.costUsd ?? 0;
  const topProvider = usage?.breakdown?.[0];

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      {selectedProductId ? (
        <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2">
          <StatTile label="Ad spend analyzed" value={money(totalSpend)} sub={`${ads.length} ads`} />
          <StatTile label="Avg ROAS" value={avgRoas ? `${avgRoas.toFixed(2)}x` : "—"} tone={avgRoas >= 1 ? "good" : "default"} />
          <StatTile label="Avg CPA" value={avgCpa ? money(avgCpa) : "—"} />
          <StatTile label="A/B winners" value={abWinners} sub={`of ${ads.length}`} tone={abWinners ? "good" : "default"} />
        </div>
      ) : (
        <EmptyState icon={Box} title="Pick a product for performance"
          hint="Select a product in the top bar to surface KPIs, winners, trending creative, and research here."
          action={<Button size="sm" variant="outline" className="rounded-xl" onClick={() => goTo("products")}>Go to Products</Button>} />
      )}

      {/* Bento grid */}
      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 auto-rows-[minmax(0,auto)]">
        {/* Winners — tall */}
        <BentoCard className="col-span-2 row-span-2 max-lg:col-span-2" title="Top winners" icon={Flame}
          action={<LinkBtn onClick={() => goTo("intelligence")} />}>
          {winners.length === 0 ? (
            <Hint>No analyzed ads yet. Run analysis in Intelligence.</Hint>
          ) : (
            <div className="space-y-2">
              {winners.map((w) => (
                <div key={w.adId} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-2">
                  {(w.imageUrl || w.thumbnailUrl)
                    ? <img src={w.imageUrl || w.thumbnailUrl} alt="" className="w-14 h-14 rounded-lg object-cover bg-neutral-100 shrink-0" />
                    : <div className="w-14 h-14 rounded-lg bg-neutral-100 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{w.adName || "(unnamed)"}</div>
                    <div className="text-xs text-neutral-400">{money(w.spend)}{w.roas ? ` · ROAS ${w.roas.toFixed(2)}` : ""}</div>
                  </div>
                  {w.grade && <Badge variant="secondary" className="rounded-full text-[10px]">{w.grade}</Badge>}
                </div>
              ))}
            </div>
          )}
        </BentoCard>

        {/* Weekly */}
        <BentoCard className="col-span-2" title="This week's concepts" icon={MousePointerClick}
          action={<LinkBtn onClick={() => goTo("weekly")} />}>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-semibold tabular-nums">{pending.length}</span>
            <span className="text-xs text-neutral-400">pending{weekly?.costCents != null ? ` · last run ${money(weekly.costCents / 100)}` : ""}</span>
          </div>
          {topConcepts.length === 0 ? <Hint>No concepts yet. Run the weekly strategist.</Hint> : (
            <ul className="space-y-1">
              {topConcepts.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm text-neutral-700 truncate">
                  <Badge variant="outline" className="rounded-full text-[10px] font-normal text-neutral-500 shrink-0">{c.tier}</Badge>
                  <span className="truncate">{c.title}</span>
                </li>
              ))}
            </ul>
          )}
        </BentoCard>

        {/* Spend */}
        <BentoCard title="LLM spend" icon={DollarSign} sub="last 7 days">
          <div className="text-2xl font-semibold tabular-nums text-emerald-600">${spend7d >= 1 ? spend7d.toFixed(2) : spend7d.toFixed(3)}</div>
          {topProvider && <div className="text-xs text-neutral-400 mt-1">top: {topProvider.key} · ${topProvider.costUsd.toFixed(2)}</div>}
        </BentoCard>

        {/* Trending */}
        <BentoCard title="Trending" icon={TrendingUp} action={selectedProductId ? <LinkBtn onClick={() => goTo("intelligence")} /> : null}>
          {trendingAds.length === 0 ? <Hint>{selectedProductId ? "None in last 7d." : "Pick a product."}</Hint> : (
            <>
              <div className="text-2xl font-semibold tabular-nums">{trendingAds.length}</div>
              <div className="text-xs text-neutral-400 truncate mt-1">{trendingAds[0]?.adName}</div>
            </>
          )}
        </BentoCard>

        {/* Research */}
        <BentoCard title="Research" icon={SearchCheck} action={selectedProductId ? <LinkBtn onClick={() => goTo("research")} /> : null}>
          <div className="text-2xl font-semibold tabular-nums">{personas}</div>
          <div className="text-xs text-neutral-400 mt-1">personas</div>
        </BentoCard>

        {/* Library */}
        <BentoCard title="Library" icon={BookOpen} action={selectedProductId ? <LinkBtn onClick={() => goTo("library")} /> : null}>
          <div className="text-2xl font-semibold tabular-nums">{library}</div>
          <div className="text-xs text-neutral-400 mt-1">{generated} generated ads</div>
        </BentoCard>

        {/* Quick actions */}
        <BentoCard className="col-span-2 max-lg:col-span-2" title="Quick actions" icon={Zap}>
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn icon={Flame} label="Generate ad" onClick={() => goTo("generate")} primary />
            <ActionBtn icon={Zap} label="Run analysis" onClick={() => goTo("intelligence")} />
            <ActionBtn icon={MousePointerClick} label="Weekly strategy" onClick={() => goTo("weekly")} />
            <ActionBtn icon={Box} label="Products" onClick={() => goTo("products")} />
          </div>
        </BentoCard>
      </div>

      <p className="text-xs text-neutral-400">{selectedBrand?.name}{selectedProduct ? ` · ${selectedProduct.name}` : ""}</p>
    </div>
  );
}
OverviewView.propTypes = { ctx: PropTypes.object.isRequired };

function BentoCard({ title, icon: Icon, sub, action, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white shadow-xs p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-neutral-400 shrink-0" />}
          <span className="text-sm font-semibold text-neutral-800 truncate">{title}</span>
          {sub && <span className="text-xs text-neutral-400 truncate">· {sub}</span>}
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
BentoCard.propTypes = {
  title: PropTypes.string.isRequired, icon: PropTypes.elementType, sub: PropTypes.string,
  action: PropTypes.node, children: PropTypes.node, className: PropTypes.string,
};

function LinkBtn({ onClick }) {
  return <button onClick={onClick} className="text-neutral-300 hover:text-neutral-700 transition-colors"><ArrowRight className="w-4 h-4" /></button>;
}
LinkBtn.propTypes = { onClick: PropTypes.func.isRequired };

function ActionBtn({ icon: Icon, label, onClick, primary }) {
  return (
    <Button onClick={onClick} variant={primary ? "default" : "outline"} className="rounded-xl justify-start gap-2 h-10">
      <Icon className="w-4 h-4" />{label}
    </Button>
  );
}
ActionBtn.propTypes = { icon: PropTypes.elementType, label: PropTypes.string, onClick: PropTypes.func, primary: PropTypes.bool };

function Hint({ children }) {
  return <p className="text-xs text-neutral-400">{children}</p>;
}
Hint.propTypes = { children: PropTypes.node };
