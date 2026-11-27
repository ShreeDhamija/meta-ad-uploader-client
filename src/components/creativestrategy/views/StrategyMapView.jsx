// Strategy map (Monthly Review). One surface for what Insights, Research and
// Weekly Strategy each know about a product: every analyzed ad laid out by
// persona (coverage grid, with a choice of columns) or by what to do next
// (action board). Ads keep their Monthly Review batch, so a winner opens into
// the variants it beat, and any ad opens the Insights drawer.
// Data: GET /monthly-review/map. Grouping and verdict rules: ../strategy-map.js.
// Styles: the "Monthly Review: Strategy map" block in creative-strategy.css.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { AlertCircle, ChevronDown, Info, Loader2, Play, Plus, Trophy, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { creativeApi } from "@/lib/creativeApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CsScrollArea, EmptyState, ErrorBanner, ProgressiveSection } from "../ui";
import { useJobs } from "../JobsContext";
import { AdMediaProvider, AdThumbImg } from "../meta-media";
import AdDetailDrawer from "./AdDetailDrawer";
import { COLUMN_AXES, DEFAULT_AXIS, STAGE_LABELS, SUGGESTED, VERDICTS, briefNotes, buildBoard, buildGrid, cpaDelta, money, monthOptions } from "../strategy-map";

const LEGEND = ["work", "mixed", "bad", "thin", "idea", "none"];
const ADS_SHOWN = 4;
const SOURCE_LABEL = { research: "Research", ad_derived: "From ads", custom: "Added by you", client: "From the client", none: "Needs grouping" };
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const tierLabel = (idea) => [idea.tier?.replace(/_/g, " "), idea.format].filter(Boolean).join(" · ");
const isVideo = (mediaType) => String(mediaType || "").toLowerCase().includes("video");

function statLine(stats, baseline) {
  const delta = cpaDelta(stats.cpa, baseline);
  return [plural(stats.count, "ad"), stats.cpa != null ? `CPA ${money(stats.cpa)}` : stats.count ? "no conversions" : null, delta].filter(Boolean).join(" · ");
}

export default function StrategyMapView({ ctx, view = "grid", onViewChange = () => {}, refreshKey = null, onOpenMonth = null }) {
  const { selectedProductId, selectedBrandId, selectedBrand, goTo } = ctx;
  const { track } = useJobs();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [axis, setAxis] = useState(DEFAULT_AXIS);
  const [month, setMonth] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(null);
  const [drawerAd, setDrawerAd] = useState(null);
  const [openingAd, setOpeningAd] = useState(null);
  const currentProduct = useRef(selectedProductId);
  currentProduct.current = selectedProductId;

  const load = useCallback(async (pid) => {
    if (!pid) return;
    setLoading(true);
    setErr(null);
    try {
      const response = await creativeApi.getStrategyMap(pid);
      if (currentProduct.current === pid) setData(response);
    } catch (e) {
      if (currentProduct.current === pid) setErr(e.message);
    } finally {
      if (currentProduct.current === pid) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setData(null); setMonth(null); setSelectedId(null); setErr(null); setDrawerAd(null);
    if (selectedProductId) load(selectedProductId);
  }, [load, selectedProductId]);
  // The review was rebuilt (or its winners analyzed): read the map again.
  useEffect(() => { if (refreshKey && selectedProductId) load(selectedProductId); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const map = data?.map || null;
  const media = data?.media || {};
  const months = useMemo(() => (map ? monthOptions(map) : []), [map]);
  const grid = useMemo(() => (map ? buildGrid(map, { axis, month }) : null), [map, axis, month]);
  const board = useMemo(() => (map ? buildBoard(map, { month }) : null), [map, month]);
  const baseline = grid?.rules.baseline ?? null;

  // Everything clickable on the map, by id → what the detail panel shows for it.
  const details = useMemo(() => {
    const out = new Map();
    if (!map || !grid || !board) return out;
    const axisLabel = COLUMN_AXES.find((a) => a.key === axis)?.label.toLowerCase();
    for (const row of grid.rows) for (const cell of row.cells) {
      if (cell.isSuggested) {
        out.set(cell.id, {
          eyebrow: "Suggested by Research", title: `${row.persona.name} · angles to build on`, verdict: cell.verdict,
          creatives: [], ideas: cell.ideas, suggested: cell.suggested, persona: row.persona.name,
          note: "Research proposed these angles for this persona. They are not matched to the ad angles in the other columns, so one of them may already be running under a different name. Check the columns to the left before treating it as untested.",
        });
        continue;
      }
      const stage = axis === "stage" && STAGE_LABELS[cell.colKey] ? cell.colKey : null;
      const angle = axis === "angle" && cell.colKey !== "__none" ? cell.colKey : null;
      const format = axis === "format" && cell.colKey !== "__none" ? cell.colKey : null;
      const hookStyle = axis === "hook" && cell.colKey !== "__none" ? cell.colKey : null;
      out.set(cell.id, {
        eyebrow: `Persona × ${axisLabel}`, title: `${row.persona.name} × ${cell.colLabel}`, verdict: cell.verdict, stats: cell.stats,
        creatives: cell.creatives, ideas: cell.ideas, gap: cell.gap,
        create: row.persona.isPersona ? { persona: row.persona.name, stage, angle, format, hookStyle, direction: cell.gap?.direction, why: cell.gap?.why } : null,
      });
    }
    for (const card of [...board.scale, ...board.fix, ...board.stop, ...board.early]) out.set(`card|${card.id}`, {
      eyebrow: "Persona × ad angle", title: `${card.personaName} · ${card.angle}`, verdict: card.verdict, stats: card.stats,
      creatives: card.creatives, ideas: card.ideas, create: card.personaKey === "__none" ? null : { persona: card.personaName, angle: card.angle },
    });
    for (const item of board.open.filter((o) => o.kind === "gap")) out.set(item.id, {
      eyebrow: "Priority gap from the audit", title: `${item.personaName} × ${STAGE_LABELS[item.stage] || item.stage}`, verdict: item.ideas.length ? "idea" : "none",
      creatives: [], ideas: item.ideas, gap: { direction: item.title, why: item.note },
      create: { persona: item.personaName, stage: item.stage, direction: item.title, why: item.note },
    });
    return out;
  }, [map, grid, board, axis]);

  // Nothing is open until something is picked, and a pick that a filter removed closes.
  const activeId = selectedId && details.has(selectedId) ? selectedId : null;
  const detail = activeId ? details.get(activeId) : null;
  const select = (id) => setSelectedId((current) => (current === id ? null : id));

  const openAd = async (adId) => {
    if (!selectedProductId || !adId || openingAd) return;
    setOpeningAd(adId);
    try {
      const { ad } = await creativeApi.getInsightAd(selectedProductId, adId);
      setDrawerAd(ad);
    } catch (error) {
      toast.error(error.message || "Couldn't load that ad");
    } finally {
      setOpeningAd(null);
    }
  };

  const run = async (key, work) => {
    if (busy) return;
    setBusy(key);
    try { await work(); } catch (error) { toast.error(error.message || "That didn't start"); } finally { setBusy(null); }
  };
  const newBrief = (create, format, key) => run(key, async () => {
    const { jobId } = await creativeApi.generateConceptBrief({ productId: selectedProductId, format, count: 1, persona: create.persona, notes: briefNotes(create) || undefined });
    track(jobId, { kind: "generate_brief", brandId: selectedBrandId, productId: selectedProductId, label: `${format === "video" ? "Video" : "Static"} brief · ${create.persona}` });
  });
  const ideaBrief = (idea) => run(`brief|${idea.id}`, async () => {
    const { jobId } = await creativeApi.generateBrief(idea.id, selectedProductId);
    track(jobId, { kind: "weekly_brief", brandId: selectedBrandId, ideaId: idea.id });
    toast.success("Brief started", { description: "It will be on this concept in Weekly Strategy when it finishes.", action: { label: "Open Weekly", onClick: () => goTo("weekly") } });
  });
  const ideaStatic = (idea) => run(`static|${idea.id}`, async () => {
    const { jobId, productId } = await creativeApi.generateIdeaStatic(idea.id, selectedProductId);
    track(jobId, { kind: "generate_ad", brandId: selectedBrandId, productId, ideaId: idea.id });
    toast.success("Static started", { description: "It will be on this concept in Weekly Strategy when it finishes.", action: { label: "Open Weekly", onClick: () => goTo("weekly") } });
  });
  const buildPersona = (signal) => run(`persona|${signal.label}`, async () => {
    await creativeApi.expandPersona({
      productId: selectedProductId, name: signal.label,
      description: [`Audience signal found in research${signal.source ? ` (${signal.source} evidence)` : ""}.`, signal.direction && `Suggested creative direction: ${signal.direction}`].filter(Boolean).join(" "),
    });
    toast.success(`${signal.label} added as a persona`, { description: "It now has its own row on the map and appears in Research." });
    await load(selectedProductId);
  });
  const actions = { busy, newBrief, ideaBrief, ideaStatic, buildPersona };

  if (!selectedProductId) return <EmptyState icon={Zap} title="No product selected" hint="Select a product above to see its strategy map." className="min-h-[420px]" />;
  if (loading && !data) return <ProgressiveSection title="Strategy map" description="Reading saved analysis, research and concepts…" active cards={4} />;
  if (err && !map) return <ErrorBanner message={err} />;
  if (!map) return null;
  if (map.creatives.length === 0) {
    return (
      <EmptyState
        icon={Zap}
        title="No analyzed ads to map yet"
        hint={data.adNameFilter ? `No analyzed ad has "${data.adNameFilter}" in its name. Run Insights for this product, or change its ad-name filter.` : "The map is built from ads Insights has analyzed. Run Insights for this product first."}
        action={<button type="button" className="cs-primary-button mt-2" onClick={() => goTo("intelligence")}>Go to Insights</button>}
        className="min-h-[420px]"
      />
    );
  }

  const topColumn = grid.kpis.topColumn;
  const activeMonth = month ? map.months.find((m) => m.month === month) : null;
  const recentOnly = map.creatives.filter((c) => c.window !== "6mo").length;
  // What the map covers and leaves out: behind the alert icon, not on the page.
  const notes = [
    `${plural(map.totals.creatives, "creative")} from ${plural(map.totals.ads, "analyzed ad")}${data.adNameFilter ? ` with "${data.adNameFilter}" in the name` : ""}. Spend and CPA are for the last six months${recentOnly > 0 ? `; ${plural(recentOnly, "ad")} the review doesn't hold ${recentOnly === 1 ? "uses its" : "use their"} last 30 days instead` : ""}.`,
    baseline ? `Verdicts compare CPA with the map's ${money(baseline)} average and need at least ${money(grid.rules.floor)} of spend.` : "No conversions are tracked here, so nothing gets a verdict.",
    map.untaggedWinners > 0 && `${plural(map.untaggedWinners, "winning variant")} from the last six months ${map.untaggedWinners === 1 ? "hasn't" : "haven't"} been analyzed, so ${map.untaggedWinners === 1 ? "it isn't" : "they aren't"} on the map. Refresh Review analyzes them.`,
    map.stalePersonas.length > 0 && `Left out: ${map.stalePersonas.join(", ")}. ${map.stalePersonas.length === 1 ? "This persona was" : "These personas were"} found in ads that are no longer in this product's scope${map.ideasOutsideProduct > 0 ? `, and ${plural(map.ideasOutsideProduct, "queued idea")} written for them ${map.ideasOutsideProduct === 1 ? "is" : "are"} hidden too` : ""}.`,
  ].filter(Boolean);

  return (
    <AdMediaProvider productId={selectedProductId} key={selectedProductId}>
      <div className="cs-sm">
        <ErrorBanner message={err} />

        <div className="cs-sm-toolbar">
          {view === "grid" && (
            <div className="cs-weekly-switcher" role="tablist" aria-label="Columns">
              {COLUMN_AXES.map((a) => (
                <button key={a.key} type="button" role="tab" aria-selected={axis === a.key} onClick={() => setAxis(a.key)} className={`cs-weekly-switcher__item ${axis === a.key ? "is-active" : ""}`}>{a.label}</button>
              ))}
            </div>
          )}
          {months.length > 0 && (
            <Select value={month || "all"} onValueChange={(value) => setMonth(value === "all" ? null : value)}>
              <SelectTrigger className="cs-weekly-filter-select cs-panel-select" aria-label="Launch month"><SelectValue /></SelectTrigger>
              <SelectContent className="cs-select-content bg-white">
                <SelectItem value="all">Launched: all months ({map.creatives.length})</SelectItem>
                {months.map((m) => <SelectItem key={m.month} value={m.month}>Launched: {m.label} ({m.mapped})</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="cs-sm-summary">
            {view === "grid" && topColumn && <span>Most spend: <strong>{Math.round(topColumn.share * 100)}% {topColumn.label}</strong></span>}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="cs-sm-alert" aria-label="What this map covers and leaves out"><AlertCircle className="h-4 w-4" /></button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" className="cs-sm-alert__content">
                  {notes.map((note) => <p key={note}>{note}</p>)}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {activeMonth && (
          <div className="cs-sm-month">
            <div className="min-w-0 flex-1">
              <h3>Launched in {activeMonth.label}</h3>
              {activeMonth.headline && <p>{activeMonth.headline}</p>}
              <dl>
                <div><dt>Concepts launched</dt><dd>{activeMonth.concepts}</dd></div>
                <div><dt>Variants tested</dt><dd>{activeMonth.variants}</dd></div>
                <div><dt>Spend</dt><dd>{money(activeMonth.spend)}</dd></div>
                <div><dt>CPA</dt><dd>{activeMonth.cpa != null ? money(activeMonth.cpa) : "—"}</dd></div>
                <div><dt>Winners on the map</dt><dd>{activeMonth.mapped} of {activeMonth.winners}</dd></div>
              </dl>
            </div>
            {onOpenMonth && <button type="button" className="cs-weekly-static-button" onClick={() => onOpenMonth(activeMonth.month)}>See every concept from {activeMonth.label.split(" ")[0]}</button>}
          </div>
        )}

        <div className="cs-sm-legend" aria-label="Legend">
          {LEGEND.map((v) => <span key={v} data-verdict={v} title={VERDICTS[v].hint}><i />{VERDICTS[v].label}</span>)}
        </div>

        <div className={`cs-sm-layout ${detail ? "has-detail" : ""}`}>
          <div className="min-w-0">
            {view === "grid"
              ? <Grid key={axis} grid={grid} axis={axis} media={media} activeId={activeId} onSelect={select} />
              : <Board board={board} activeId={activeId} onSelect={select} actions={actions} onSeeAngles={(key) => { onViewChange("grid"); setAxis("angle"); setSelectedId(`${key}|${SUGGESTED}`); }} />}
          </div>
          {detail && <DetailPanel detail={detail} baseline={baseline} media={media} actions={actions} onOpenAd={openAd} openingAd={openingAd} onClose={() => setSelectedId(null)} key={activeId} />}
        </div>

        {view === "grid" && map.potentialPersonas.length > 0 && (
          <section className="cs-intel-panel">
            <header className="cs-intel-panel__header">
              <div className="min-w-0">
                <h2>Potential personas</h2>
                <p className="cs-intel-panel__subheader">Audiences Research saw signs of but didn&apos;t have enough evidence to call a persona. No ad speaks to them yet.</p>
              </div>
            </header>
            <div className="cs-intel-panel__body">
              <div className="cs-sm-potential">
                {map.potentialPersonas.map((p) => <PotentialPersona key={p.label} signal={p} actions={actions} />)}
              </div>
            </div>
          </section>
        )}
      </div>
      <AdDetailDrawer ad={drawerAd} onClose={() => setDrawerAd(null)} productId={selectedProductId} adAccountId={selectedBrand?.metaAdAccountId || null} sourceAd={drawerAd} />
    </AdMediaProvider>
  );
}
StrategyMapView.propTypes = { ctx: PropTypes.object.isRequired, view: PropTypes.oneOf(["grid", "board"]), onViewChange: PropTypes.func, refreshKey: PropTypes.string, onOpenMonth: PropTypes.func };

const actionsShape = PropTypes.shape({ busy: PropTypes.string, newBrief: PropTypes.func, ideaBrief: PropTypes.func, ideaStatic: PropTypes.func, buildPersona: PropTypes.func });

function Thumb({ creative, media, className }) {
  return (
    <AdThumbImg
      ad={{ adId: creative.adId, imageUrl: (creative.storagePath && media[creative.storagePath]) || creative.thumbnailUrl || null }}
      className={className} loading="lazy" fallback={<Zap className="h-3 w-3" />}
    />
  );
}
Thumb.propTypes = { creative: PropTypes.object.isRequired, media: PropTypes.object.isRequired, className: PropTypes.string };

function Thumbs({ creatives, media, max = 3 }) {
  if (!creatives.length) return null;
  return (
    <span className="cs-sm-thumbs">
      {creatives.slice(0, max).map((c) => <span key={c.id}><Thumb creative={c} media={media} /></span>)}
      {creatives.length > max && <small>+{creatives.length - max}</small>}
    </span>
  );
}
Thumbs.propTypes = { creatives: PropTypes.array.isRequired, media: PropTypes.object.isRequired, max: PropTypes.number };

const IdeaChip = ({ count }) => (count > 0 ? <span className="cs-sm-chip">{plural(count, "idea")} queued</span> : null);
IdeaChip.propTypes = { count: PropTypes.number.isRequired };

function Grid({ grid, axis, media, activeId, onSelect }) {
  const style = { "--sm-cols": grid.columns.length };
  return (
    <CsScrollArea axis="x" className="cs-sm-scroll">
      <div className="cs-sm-grid" style={style}>
        <div className="cs-sm-row" aria-hidden="true">
          <div className="cs-sm-colhead"><span>Persona</span></div>
          {grid.columns.map((col) => (
            <div key={col.key} className={`cs-sm-colhead ${col.startsUnused ? "is-unused-start" : ""}`} title={col.label}>
              <strong>{col.label}</strong>
              {col.isSuggested ? <span>Not matched to the ad angles</span> : col.isUnused ? <span>Not used yet</span> : (
                <>
                  <div className="cs-sm-bar"><i style={{ width: `${Math.round(col.share * 100)}%` }} /></div>
                  <span>{money(col.spend)} · {Math.round(col.share * 100)}%</span>
                </>
              )}
            </div>
          ))}
        </div>
        {grid.rows.map((row) => {
          // Ideas sit in cells on the stage and angle columns; elsewhere the row carries the count.
          const rowIdeas = axis === "stage" || axis === "angle" ? 0 : row.ideas.length;
          return (
            <div key={row.persona.key} className="cs-sm-row">
              <div className="cs-sm-rowhead" title={row.persona.description || undefined}>
                <span className={`cs-sm-source is-${row.persona.source}`}>{SOURCE_LABEL[row.persona.source] || "Research"}</span>
                <h3>{row.persona.name}</h3>
                <div className="cs-sm-rowhead__stats">
                  {row.stats.count ? <>{money(row.stats.spend)} · {statLine(row.stats, grid.rules.baseline)}</> : "No ads yet"}
                  {rowIdeas > 0 && <><br />{plural(rowIdeas, "idea")} queued</>}
                </div>
              </div>
              {row.cells.map((cell) => (
                <button
                  key={cell.id} type="button" data-verdict={cell.verdict} onClick={() => onSelect(cell.id)}
                  className={`cs-sm-cell ${activeId === cell.id ? "is-selected" : ""} ${cell.startsUnused ? "is-unused-start" : ""}`}
                  aria-label={`${row.persona.name}, ${cell.colLabel}: ${VERDICTS[cell.verdict].label}`} aria-pressed={activeId === cell.id}
                >
                  {cell.isSuggested ? (
                    <>
                      <span className="cs-sm-cell__label">{plural(cell.suggested.length, "angle")}</span>
                      <span className="cs-sm-cell__hint">{cell.suggested.slice(0, 3).map((s) => s.angle).join(", ")}{cell.suggested.length > 3 ? ` +${cell.suggested.length - 3}` : ""}</span>
                    </>
                  ) : (
                    <>
                      <span className="cs-sm-cell__label">
                        {VERDICTS[cell.verdict].label}
                        {cell.gap && <span className="cs-sm-suggested">Suggested</span>}
                      </span>
                      {cell.stats.count > 0 ? (
                        <>
                          <span className="cs-sm-cell__spend">{money(cell.stats.spend)}</span>
                          <span className="cs-sm-cell__stat">{plural(cell.stats.count, "ad")}{cell.stats.cpa != null ? ` · CPA ${money(cell.stats.cpa)}` : ""}</span>
                        </>
                      ) : (
                        <span className="cs-sm-cell__hint">{cell.gap ? "The audit flags this as a priority gap" : cell.ideas.length ? "No ads yet" : ""}</span>
                      )}
                    </>
                  )}
                  <span className="cs-sm-cell__foot">
                    {cell.stats.count > 0 ? <Thumbs creatives={cell.creatives} media={media} /> : row.persona.isPersona && <span className="cs-sm-cell__add"><Plus className="h-3 w-3" />{cell.isSuggested ? "Build on one" : "Add here"}</span>}
                    <IdeaChip count={cell.ideas.length} />
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </CsScrollArea>
  );
}
Grid.propTypes = { grid: PropTypes.object.isRequired, axis: PropTypes.string.isRequired, media: PropTypes.object.isRequired, activeId: PropTypes.string, onSelect: PropTypes.func.isRequired };

const BOARD_COLUMNS = [
  { key: "scale", verdict: "work", title: "Scale", rule: "CPA at or below the map's average" },
  { key: "fix", verdict: "mixed", title: "Fix", rule: "Up to 25% above the average" },
  { key: "stop", verdict: "bad", title: "Stop or rethink", rule: "More than 25% above, or spend with no conversions" },
];
const SPLIT_LABEL = { work: "Working", mixed: "Mixed", bad: "Not working", thin: "Too early to call" };

function Board({ board, activeId, onSelect, actions, onSeeAngles }) {
  return (
    <div className="grid gap-3">
      <div className="cs-sm-split">
        <h3>Where the {money(board.total)} went</h3>
        <div className="cs-sm-split__bar" role="img" aria-label={board.split.map((s) => `${SPLIT_LABEL[s.verdict]} ${Math.round(s.share * 100)}%`).join(", ")}>
          {board.split.filter((s) => s.share > 0).map((s) => <i key={s.verdict} data-verdict={s.verdict} style={{ width: `${s.share * 100}%` }} />)}
        </div>
        <dl>
          {board.split.map((s) => <div key={s.verdict} data-verdict={s.verdict}><i /><dt>{SPLIT_LABEL[s.verdict]}</dt><dd>{Math.round(s.share * 100)}% · {money(s.spend)}</dd></div>)}
        </dl>
      </div>

      <CsScrollArea axis="x" className="cs-sm-scroll">
        <div className="cs-sm-board">
          {BOARD_COLUMNS.map((col) => (
            <div key={col.key} className="cs-sm-board__col">
              <header data-verdict={col.verdict}>
                <h3><i />{col.title}<span>{plural(board[col.key].length, "card")} · {money(board[col.key].reduce((s, c) => s + c.stats.spend, 0))}</span></h3>
                <p>{col.rule}</p>
              </header>
              {board[col.key].length === 0 && <p className="cs-sm-board__empty">Nothing here.</p>}
              {board[col.key].map((card) => {
                const id = `card|${card.id}`;
                const videos = card.creatives.filter((c) => isVideo(c.mediaType)).length;
                return (
                  <button key={id} type="button" data-verdict={card.verdict} onClick={() => onSelect(id)} className={`cs-sm-card ${activeId === id ? "is-selected" : ""}`} aria-pressed={activeId === id}>
                    <span className="cs-sm-card__eyebrow">{card.personaName}</span>
                    <h4>{card.angle}</h4>
                    <span className="cs-sm-card__stats"><strong>{money(card.stats.spend)}</strong>{statLine(card.stats, board.rules.baseline)}</span>
                    <span className="cs-sm-card__stats">{videos} video · {card.creatives.length - videos} static</span>
                    <IdeaChip count={card.ideas.length} />
                  </button>
                );
              })}
            </div>
          ))}
          <div className="cs-sm-board__col">
            <header data-verdict="none">
              <h3><i />Open space<span>{plural(board.open.length, "card")}</span></h3>
              <p>No ads yet. Audit gaps first, then Research.</p>
            </header>
            {board.open.length === 0 && <p className="cs-sm-board__empty">Nothing here.</p>}
            {board.open.map((item) => <OpenCard key={item.id} item={item} activeId={activeId} onSelect={onSelect} actions={actions} onSeeAngles={onSeeAngles} />)}
          </div>
        </div>
      </CsScrollArea>

      {board.early.length > 0 && (
        <section className="cs-sm-split">
          <h3>Too early to call · under {money(board.rules.floor)} of spend each</h3>
          <div className="cs-sm-early">
            {board.early.map((card) => (
              <button key={card.id} type="button" onClick={() => onSelect(`card|${card.id}`)}>
                <small>{card.personaName}</small><strong>{card.angle}</strong><span>{money(card.stats.spend)} · {statLine(card.stats, null)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
Board.propTypes = { board: PropTypes.object.isRequired, activeId: PropTypes.string, onSelect: PropTypes.func.isRequired, actions: actionsShape.isRequired, onSeeAngles: PropTypes.func.isRequired };

function OpenCard({ item, activeId, onSelect, actions, onSeeAngles }) {
  if (item.kind === "persona") {
    return (
      <div className="cs-sm-card" data-verdict="none">
        <span className="cs-sm-card__eyebrow">Potential persona</span>
        <h4>{item.title}</h4>
        {item.note && <p>{item.note}</p>}
        <BusyButton className="cs-weekly-static-button" busy={actions.busy === `persona|${item.title}`} disabled={Boolean(actions.busy)} onClick={() => actions.buildPersona(item.signal)}>Build persona</BusyButton>
      </div>
    );
  }
  if (item.kind === "angles") {
    return (
      <div className="cs-sm-card" data-verdict="none">
        <span className="cs-sm-card__eyebrow">{item.personaName}</span>
        <h4>{item.title}</h4>
        <p>{item.note}</p>
        <IdeaChip count={item.ideas.length} />
        <button type="button" className="cs-weekly-static-button" onClick={() => onSeeAngles(item.personaKey)}>See the angles</button>
      </div>
    );
  }
  const create = { persona: item.personaName, stage: item.stage, direction: item.title, why: item.note };
  return (
    <div className={`cs-sm-card ${activeId === item.id ? "is-selected" : ""}`} data-verdict="idea">
      <button type="button" className="grid gap-1.5 text-left" onClick={() => onSelect(item.id)}>
        <span className="cs-sm-card__eyebrow">Priority gap {item.priority} from the audit</span>
        <h4>{item.personaName} × {STAGE_LABELS[item.stage] || item.stage}</h4>
        <p>{item.title}</p>
      </button>
      <IdeaChip count={item.ideas.length} />
      <CreateButtons create={create} actions={actions} idPrefix={item.id} />
    </div>
  );
}
OpenCard.propTypes = { item: PropTypes.object.isRequired, activeId: PropTypes.string, onSelect: PropTypes.func.isRequired, actions: actionsShape.isRequired, onSeeAngles: PropTypes.func.isRequired };

function BusyButton({ busy, children, ...props }) {
  return <button type="button" {...props}>{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{children}</button>;
}
BusyButton.propTypes = { busy: PropTypes.bool, children: PropTypes.node };

function CreateButtons({ create, actions, idPrefix, compact = false }) {
  return (
    <div className="cs-sm-actions">
      {["video", "static"].map((format) => {
        const key = `new|${idPrefix}|${format}`;
        return (
          <BusyButton key={format} className={format === "video" ? "cs-weekly-brief-button" : "cs-weekly-static-button"} busy={actions.busy === key} disabled={Boolean(actions.busy)} onClick={() => actions.newBrief(create, format, key)}>
            {compact ? (format === "video" ? "Video brief" : "Static brief") : format === "video" ? "New video brief" : "New static brief"}
          </BusyButton>
        );
      })}
    </div>
  );
}
CreateButtons.propTypes = { create: PropTypes.object.isRequired, actions: actionsShape.isRequired, idPrefix: PropTypes.string.isRequired, compact: PropTypes.bool };

function IdeaCard({ idea, actions }) {
  return (
    <div className="cs-sm-idea">
      <h4>{idea.title}</h4>
      <p>{[tierLabel(idea), idea.angle].filter(Boolean).join(" · ")}</p>
      <div className="cs-sm-actions">
        <BusyButton className="cs-weekly-brief-button" busy={actions.busy === `brief|${idea.id}`} disabled={Boolean(actions.busy)} onClick={() => actions.ideaBrief(idea)}>Write brief</BusyButton>
        {idea.format === "static" && <BusyButton className="cs-weekly-static-button" busy={actions.busy === `static|${idea.id}`} disabled={Boolean(actions.busy)} onClick={() => actions.ideaStatic(idea)}>Make static</BusyButton>}
      </div>
    </div>
  );
}
IdeaCard.propTypes = { idea: PropTypes.object.isRequired, actions: actionsShape.isRequired };

function DetailPanel({ detail, baseline, media, actions, onOpenAd, openingAd, onClose }) {
  const [showAll, setShowAll] = useState(false);
  const creatives = showAll ? detail.creatives : detail.creatives.slice(0, ADS_SHOWN);
  const filled = [detail.create?.persona && "persona", detail.create?.stage && "awareness stage", detail.create?.angle && "angle", detail.create?.format && "format", detail.create?.hookStyle && "hook style", detail.create?.direction && "the audit's direction"].filter(Boolean);
  // On the Research column the ideas are listed under their angle; the rest follow below.
  const listed = new Set((detail.suggested || []).flatMap((s) => s.ideas.map((i) => i.id)));
  const ideas = detail.ideas.filter((i) => !listed.has(i.id));
  return (
    <aside className="cs-intel-panel cs-sm-detail" aria-live="polite">
      <CsScrollArea viewportClassName="cs-sm-detail__viewport">
        <div className="cs-sm-detail__body">
          <header className="cs-sm-detail__head">
            <div className="min-w-0">
              <p className="cs-sm-detail__eyebrow">{detail.eyebrow}</p>
              <h2 className="cs-sm-detail__title">{detail.title}</h2>
              <div className="cs-sm-detail__meta">
                <span className="cs-sm-pill" data-verdict={detail.verdict} title={VERDICTS[detail.verdict].hint}>{VERDICTS[detail.verdict].label}</span>
                {detail.stats?.count > 0 && <span>{money(detail.stats.spend)} · {statLine(detail.stats, baseline)}</span>}
              </div>
            </div>
            <button type="button" className="cs-sm-detail__close" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
          </header>

          {detail.gap?.direction && (
            <div className="cs-sm-suggestion">
              <strong>Suggested by the audit</strong>
              <span>{detail.gap.direction}</span>
              {detail.gap.why && <span className="text-[11.5px] text-neutral-500">{detail.gap.why}</span>}
            </div>
          )}
          {detail.note && <p className="cs-sm-note"><Info className="h-3.5 w-3.5" /><span>{detail.note}</span></p>}

          {detail.suggested?.length > 0 && (
            <section className="cs-sm-section">
              <h3 className="cs-intel-subsection-title">Angles to build on</h3>
              {detail.suggested.map((s) => (
                <div key={s.angle} className="cs-sm-angle">
                  <h4>{s.angle}</h4>
                  {s.ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} actions={actions} />)}
                  <CreateButtons create={{ persona: detail.persona, angle: s.angle }} actions={actions} idPrefix={`angle|${s.angle}`} compact />
                </div>
              ))}
            </section>
          )}

          {detail.creatives.length > 0 && (
            <section className="cs-sm-section">
              <h3 className="cs-intel-subsection-title">Ads here</h3>
              {creatives.map((c) => <CreativeCard key={c.id} creative={c} baseline={baseline} media={media} onOpenAd={onOpenAd} opening={openingAd === c.adId} />)}
              {detail.creatives.length > ADS_SHOWN && (
                <button type="button" className="cs-sm-more" onClick={() => setShowAll((s) => !s)}>{showAll ? "Show fewer" : `Show ${detail.creatives.length - ADS_SHOWN} more`}</button>
              )}
            </section>
          )}

          {ideas.length > 0 && (
            <section className="cs-sm-section">
              <h3 className="cs-intel-subsection-title">{detail.suggested ? "Queued on other angles" : "Queued from Weekly Strategy"}</h3>
              {ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} actions={actions} />)}
            </section>
          )}

          {detail.create && (
            <section className="cs-sm-section">
              <h3 className="cs-intel-subsection-title">Add something new here</h3>
              <CreateButtons create={detail.create} actions={actions} idPrefix="detail" />
              <p className="!text-[10.5px] !text-neutral-500">One click starts a brief with the {filled.join(", ")} filled in. It lands in Generate, under Briefs.</p>
            </section>
          )}
        </div>
      </CsScrollArea>
    </aside>
  );
}
DetailPanel.propTypes = { detail: PropTypes.object.isRequired, baseline: PropTypes.number, media: PropTypes.object.isRequired, actions: actionsShape.isRequired, onOpenAd: PropTypes.func.isRequired, openingAd: PropTypes.string, onClose: PropTypes.func.isRequired };

/** One creative: thumbnail and name open the Insights drawer; a winner opens into the batch it beat. */
function CreativeCard({ creative, baseline, media, onOpenAd, opening }) {
  const [open, setOpen] = useState(false);
  const batch = creative.batch;
  const own = batch?.variants.find((v) => v.isSelf);
  const name = batch ? [batch.concept, own?.label].filter(Boolean).join(" · ") : creative.adName;
  const others = batch ? batch.variantCount - 1 : 0;
  const tone = creative.cpa == null || !baseline ? "" : creative.cpa <= baseline * 0.9 ? "is-good" : creative.cpa >= baseline * 1.1 ? "is-bad" : "";
  return (
    <article className="cs-sm-ad">
      <div className="cs-sm-ad__main">
        <button type="button" className={`cs-sm-ad__thumb ${batch?.isWinner && others > 0 ? "is-winner" : ""}`} onClick={() => onOpenAd(creative.adId)} title="Open this ad's full analysis" aria-label={`Open the analysis of ${name}`}>
          {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Thumb creative={creative} media={media} />}
          {!opening && isVideo(creative.mediaType) && <span className="cs-mc__play"><Play className="h-2.5 w-2.5 fill-white" /></span>}
        </button>
        <div className="cs-sm-ad__body">
          <button type="button" className="cs-sm-ad__name" title={creative.adName} onClick={() => onOpenAd(creative.adId)}>{name}</button>
          {creative.opener && <p className="cs-sm-ad__opener">“{creative.opener}”</p>}
          <div className="cs-sm-ad__stats">
            <span>{money(creative.spend)}</span>
            <span>{creative.conversions || "No"} conv.</span>
            <span className={tone}>{creative.cpa != null ? `CPA ${money(creative.cpa)}` : "CPA —"}</span>
            {creative.window === "30d" && <span title="This ad isn't in the six-month review, so these are its last 30 days">last 30 days</span>}
          </div>
          <div className="cs-sm-ad__tags">
            {batch && <span>Launched {batch.monthLabel}</span>}
            {creative.angle && <span title="Angle, as Insights tagged this ad">{creative.angle}</span>}
            {creative.hookStyle && <span title="Hook style">{creative.hookStyle}</span>}
            {creative.adIds.length > 1 && <span title="The same creative relaunched under other ad names, counted once">{creative.adIds.length} ads merged</span>}
          </div>
        </div>
      </div>
      {batch && others > 0 && (
        <button type="button" className="cs-mc__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span>
            {batch.isWinner ? <Trophy className="h-3.5 w-3.5" /> : null}
            {batch.isWinner ? `Winner · beat ${plural(others, "other variant")}` : `1 of ${batch.variantCount} variants · not the winner`}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
      {open && batch && (
        <ol className="cs-sm-variants">
          {batch.variants.map((v, i) => {
            const url = v.storagePath ? media[v.storagePath] : null;
            return (
              <li key={v.key} className={v.isSelf ? "is-self" : ""}>
                <span className="cs-sm-variants__thumb">{url ? <img src={url} alt="" loading="lazy" /> : v.isWinner ? <Trophy className="h-3 w-3" /> : i + 1}</span>
                <div className="cs-sm-variants__name">
                  <p title={v.adName}>{v.label || v.adName}</p>
                  <small>{v.isWinner ? "Winner · " : ""}{Math.round((v.spendShare || 0) * 100)}% of the batch&apos;s spend{v.adIds.length > 1 ? ` · ${v.adIds.length} ads merged` : ""}</small>
                </div>
                <span className="cs-sm-variants__num">{money(v.spend)}<small>{v.cpa != null ? `CPA ${money(v.cpa)}` : `${v.conversions || 0} conv.`}</small></span>
              </li>
            );
          })}
          {batch.variantCount > batch.variants.length && <li><span /><div className="cs-sm-variants__name"><small>and {batch.variantCount - batch.variants.length} smaller variants</small></div><span /></li>}
        </ol>
      )}
    </article>
  );
}
CreativeCard.propTypes = { creative: PropTypes.object.isRequired, baseline: PropTypes.number, media: PropTypes.object.isRequired, onOpenAd: PropTypes.func.isRequired, opening: PropTypes.bool };

function PotentialPersona({ signal, actions }) {
  return (
    <article>
      <h4>{signal.label}</h4>
      {signal.source && <small>Signal from the {signal.source}</small>}
      {signal.direction && <p>{signal.direction}</p>}
      <BusyButton className="cs-weekly-static-button" busy={actions.busy === `persona|${signal.label}`} disabled={Boolean(actions.busy)} onClick={() => actions.buildPersona(signal)}>Build persona</BusyButton>
    </article>
  );
}
PotentialPersona.propTypes = { signal: PropTypes.object.isRequired, actions: actionsShape.isRequired };
