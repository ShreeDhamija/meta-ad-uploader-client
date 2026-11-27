// Strategy map — pure grouping and verdict logic for StrategyMapView.
// Takes the map payload from GET /monthly-review/map and turns it into the
// three layouts (grid, a persona's angle lane, action board). No React here.

export const STAGE_LABELS = {
  problem_unaware: "Unaware",
  problem_aware: "Problem aware",
  solution_aware: "Solution aware",
  product_aware: "Product aware",
  most_aware: "Most aware",
};

export const COLUMN_AXES = [
  { key: "hook", label: "Hook style" },
  { key: "angle", label: "Angle" },
  { key: "format", label: "Format" },
  { key: "stage", label: "Awareness stage" },
];
export const DEFAULT_AXIS = "hook";
export const MAP_LAYOUTS = [{ key: "grid", label: "Coverage grid" }, { key: "board", label: "Action board" }];

export const VERDICTS = {
  work: { label: "Working", hint: "CPA at or below the map's average" },
  mixed: { label: "Mixed", hint: "CPA up to 25% above the average" },
  bad: { label: "Not working", hint: "CPA more than 25% above the average, or spend with no conversions" },
  thin: { label: "Barely tested", hint: "Not enough spend to call" },
  running: { label: "Running", hint: "No conversions tracked on this map, so no verdict" },
  idea: { label: "Idea queued", hint: "No ads yet, but Weekly Strategy has a concept for it" },
  none: { label: "Never touched", hint: "No ads and no ideas" },
};

/** Up to this far above the average CPA still counts as "mixed". */
export const MIXED_CEILING = 1.25;
/** A cell needs spend worth about this many average conversions before it gets a verdict. */
export const FLOOR_CONVERSIONS = 3;
export const FLOOR_MIN_SPEND = 300;

const NO_PERSONA = "__none";
const NO_VALUE = "__none";
/** The Angle axis ends with one column of what Research suggests for each persona. */
export const SUGGESTED = "__suggested";

export const money = (v) => (v >= 10000 ? `$${Math.round(v / 1000)}K` : v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${Math.round(v || 0)}`);

/** Lowercase, drop a leading article and punctuation: how two angle names are compared. */
export const angleKey = (s) => String(s ?? "").toLowerCase().replace(/^(the|a|an)\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();

export function summarize(creatives) {
  const spend = creatives.reduce((s, c) => s + (c.spend || 0), 0);
  const conversions = creatives.reduce((s, c) => s + (c.conversions || 0), 0);
  return { count: creatives.length, spend, conversions, cpa: conversions > 0 ? spend / conversions : null };
}

/**
 * The yardstick for one map: the average CPA across everything on it, and the
 * spend a group needs before it gets a verdict. Both scale with the account,
 * so a $200-CPA brand and a $600-CPA brand are judged the same way.
 */
export function verdictRules(totals) {
  const baseline = totals?.cpa > 0 ? totals.cpa : null;
  return { baseline, floor: baseline ? Math.max(FLOOR_MIN_SPEND, baseline * FLOOR_CONVERSIONS) : FLOOR_MIN_SPEND };
}

export function verdictOf(stats, rules) {
  if (!stats.count) return "none";
  if (!rules.baseline) return "running";
  if (stats.spend < rules.floor) return "thin";
  if (stats.cpa == null) return "bad";
  if (stats.cpa <= rules.baseline) return "work";
  return stats.cpa <= rules.baseline * MIXED_CEILING ? "mixed" : "bad";
}

/** "12% above" / "at average" / "8% below", against the map's average CPA. */
export function cpaDelta(cpa, baseline) {
  if (cpa == null || !baseline) return null;
  const pct = Math.round((cpa / baseline - 1) * 100);
  return pct === 0 ? "at average" : pct > 0 ? `${pct}% above` : `${-pct}% below`;
}

const inMonth = (map, month) => (month ? map.creatives.filter((c) => c.month === month) : map.creatives);

function columnValue(creative, axis) {
  if (axis === "stage") return creative.stage || NO_VALUE;
  if (axis === "hook") return creative.hookStyle || NO_VALUE;
  if (axis === "angle") return creative.angle || NO_VALUE;
  return creative.format || NO_VALUE;
}

function columnsFor(map, creatives, axis) {
  const total = creatives.reduce((s, c) => s + c.spend, 0);
  const column = (key, label) => {
    const spend = creatives.filter((c) => columnValue(c, axis) === key).reduce((s, c) => s + c.spend, 0);
    return { key, label, spend, share: total > 0 ? spend / total : 0 };
  };
  const untagged = axis === "hook" ? "No spoken hook" : axis === "format" ? "No format" : axis === "angle" ? "No angle" : "No stage";
  if (axis === "stage") {
    const cols = map.stages.map((s) => column(s, STAGE_LABELS[s] || s));
    return creatives.some((c) => !c.stage) ? [...cols, column(NO_VALUE, untagged)] : cols;
  }
  // Hook style, angle and format have no fixed list: the values in use, biggest first.
  const keys = [...new Set(creatives.map((c) => columnValue(c, axis)))];
  const cols = keys.map((k) => column(k, k === NO_VALUE ? untagged : k.charAt(0).toUpperCase() + k.slice(1))).sort((a, b) => (a.key === NO_VALUE) - (b.key === NO_VALUE) || b.spend - a.spend);
  // Format comes from a preset list, so the ones this account has never run
  // close the row as open columns.
  if (axis === "format") {
    const used = new Set(keys.map((k) => k.toLowerCase()));
    return [...cols, ...(map.formats || []).filter((f) => !used.has(f.toLowerCase())).map((f) => ({ key: f, label: f, spend: 0, share: 0, isUnused: true }))];
  }
  // Ad angles and Research angles are named independently, so Research gets
  // its own closing column instead of being matched into the running ones.
  return axis === "angle" && map.personas.some((p) => p.angles.length > 0) ? [...cols, { key: SUGGESTED, label: "Suggested by Research", spend: 0, share: 0, isSuggested: true }] : cols;
}

/**
 * The coverage grid: one row per persona, one column per value of `axis`.
 * The audit's gaps carry a persona and an awareness stage, so they sit in
 * cells only on the stage axis. Queued ideas sit in cells on the stage axis
 * (by stage) and the angle axis (by angle name); elsewhere they stay on the row.
 */
export function buildGrid(map, { axis = DEFAULT_AXIS, month = null } = {}) {
  const creatives = inMonth(map, month);
  const rules = verdictRules(map.totals);
  const columns = columnsFor(map, creatives, axis);
  const onStage = axis === "stage";
  const rowDefs = map.personas.map((p) => ({ ...p, isPersona: true }));
  if (creatives.some((c) => !c.personaKey)) rowDefs.push({ key: NO_PERSONA, name: "No persona yet", source: "none", description: "Analyzed ads the latest audit didn't group.", angles: [], isPersona: false });

  const rows = rowDefs.map((persona) => {
    const mine = creatives.filter((c) => (c.personaKey || NO_PERSONA) === persona.key);
    const ideas = persona.isPersona ? map.ideas.filter((i) => i.personaKey === persona.key) : [];
    const lane = axis === "angle" && persona.isPersona ? buildLane(map, persona.key, { month }) : null;
    const cells = columns.map((col) => {
      if (col.isSuggested) {
        const suggested = lane?.suggested || [];
        const waiting = lane ? [...suggested.flatMap((s) => s.ideas), ...lane.otherIdeas] : [];
        return { id: `${persona.key}|${col.key}`, personaKey: persona.key, colKey: col.key, colLabel: col.label, isSuggested: true, suggested, creatives: [], ideas: waiting, gap: null, stats: summarize([]), verdict: waiting.length ? "idea" : "none" };
      }
      const list = mine.filter((c) => columnValue(c, axis) === col.key);
      const cellIdeas = onStage ? ideas.filter((i) => i.stage === col.key) : lane ? lane.running.find((r) => r.angle === col.key)?.ideas || [] : [];
      const gap = onStage && persona.isPersona ? map.gaps.find((g) => g.personaKey === persona.key && g.stage === col.key) || null : null;
      const stats = summarize(list);
      const verdict = stats.count ? verdictOf(stats, rules) : cellIdeas.length ? "idea" : "none";
      return { id: `${persona.key}|${col.key}`, personaKey: persona.key, colKey: col.key, colLabel: col.label, creatives: list, ideas: cellIdeas, gap, stats, verdict };
    });
    const stats = summarize(mine);
    return { persona, cells, stats, verdict: verdictOf(stats, rules), ideas };
  });

  const personaCells = rows.filter((r) => r.persona.isPersona).flatMap((r) => r.cells).filter((c) => c.colKey !== NO_VALUE && !c.isSuggested);
  const top = [...columns].sort((a, b) => b.spend - a.spend)[0] || null;
  return {
    rules, columns, rows,
    kpis: {
      cells: personaCells.length,
      inUse: personaCells.filter((c) => c.stats.count > 0).length,
      untouched: personaCells.filter((c) => c.verdict === "none").length,
      ideaOnly: personaCells.filter((c) => c.verdict === "idea").length,
      topColumn: top && top.spend > 0 ? top : null,
      ideas: map.ideas.length,
    },
  };
}

/**
 * One persona's angles, as two separate lists. Ads name their angle on their
 * own and Research names its suggestions on its own, so nothing here claims a
 * suggested angle is untested: it is only "suggested", next to what is running.
 */
export function buildLane(map, personaKey, { month = null } = {}) {
  const persona = map.personas.find((p) => p.key === personaKey);
  const rules = verdictRules(map.totals);
  const mine = inMonth(map, month).filter((c) => c.personaKey === personaKey);
  const ideas = map.ideas.filter((i) => i.personaKey === personaKey);
  const used = new Set();
  // Each idea sits on one tile: the first angle (running, then suggested) whose name it uses.
  const claim = (key) => (key ? ideas.filter((i) => angleKey(i.angle) === key && !used.has(i.id) && used.add(i.id)) : []);

  const byAngle = new Map();
  for (const c of mine) {
    const name = c.angle || "No angle";
    byAngle.set(name, [...(byAngle.get(name) || []), c]);
  }
  const running = [...byAngle].map(([angle, list]) => {
    const stats = summarize(list);
    return { angle, creatives: list, stats, verdict: verdictOf(stats, rules), ideas: claim(angleKey(angle)) };
  }).sort((a, b) => b.stats.spend - a.stats.spend);

  const suggested = (persona?.angles || []).map((angle) => ({ angle, ideas: claim(angleKey(angle)) }))
    // Research angles with an idea waiting come first.
    .sort((a, b) => b.ideas.length - a.ideas.length);

  return { persona, running, suggested, otherIdeas: ideas.filter((i) => !used.has(i.id)) };
}

/**
 * The action board: every persona × ad-angle pair that has ads, sorted by
 * verdict, plus the open space (audit gaps, Research's suggested angles and
 * potential personas).
 */
export function buildBoard(map, { month = null } = {}) {
  const rules = verdictRules(map.totals);
  const creatives = inMonth(map, month);
  const groups = new Map();
  for (const c of creatives) {
    const key = `${c.personaKey || NO_PERSONA}|${c.angle || "No angle"}`;
    groups.set(key, [...(groups.get(key) || []), c]);
  }
  const cards = [...groups].map(([id, list]) => {
    const persona = map.personas.find((p) => p.key === list[0].personaKey) || null;
    const stats = summarize(list);
    const angle = list[0].angle || "No angle";
    return {
      id, personaKey: persona?.key || NO_PERSONA, personaName: persona?.name || "No persona yet", angle, creatives: list, stats,
      verdict: verdictOf(stats, rules),
      ideas: persona ? map.ideas.filter((i) => i.personaKey === persona.key && angleKey(i.angle) === angleKey(angle)) : [],
    };
  }).sort((a, b) => b.stats.spend - a.stats.spend);

  const of = (...verdicts) => cards.filter((c) => verdicts.includes(c.verdict));
  const total = cards.reduce((s, c) => s + c.stats.spend, 0);
  const split = [["work", of("work")], ["mixed", of("mixed")], ["bad", of("bad")], ["thin", of("thin", "running")]].map(([verdict, list]) => {
    const spend = list.reduce((s, c) => s + c.stats.spend, 0);
    return { verdict, spend, share: total > 0 ? spend / total : 0, count: list.length };
  });

  const open = [
    ...map.gaps.filter((g) => g.personaKey && g.stage).map((g) => ({
      kind: "gap", id: `gap|${g.personaKey}|${g.stage}|${g.priority}`, personaKey: g.personaKey, personaName: g.personaName, stage: g.stage,
      title: g.direction || "Open cell", note: g.why, priority: g.priority,
      ideas: map.ideas.filter((i) => i.personaKey === g.personaKey && i.stage === g.stage),
    })),
    ...map.personas.filter((p) => p.angles.length > 0).map((p) => ({
      kind: "angles", id: `angles|${p.key}`, personaKey: p.key, personaName: p.name,
      title: `${p.angles.length} angle${p.angles.length === 1 ? "" : "s"} suggested by Research`, note: p.angles.slice(0, 4).join(", ") + (p.angles.length > 4 ? ` and ${p.angles.length - 4} more` : ""),
      ideas: map.ideas.filter((i) => i.personaKey === p.key),
    })),
    ...map.potentialPersonas.map((p) => ({ kind: "persona", id: `persona|${p.label}`, title: p.label, note: p.direction || p.why, source: p.source, signal: p, ideas: [] })),
  ];

  return { rules, split, total, scale: of("work"), fix: of("mixed"), stop: of("bad"), early: of("thin", "running"), open };
}

/** Month chips: "All months" plus each review month that has something on the map or launched concepts. */
export function monthOptions(map) {
  return map.months.filter((m) => m.concepts > 0 || m.mapped > 0);
}

/** Everything a one-click brief needs to know about where it was started from. */
export function briefNotes({ stage, angle, format, direction, why }) {
  return [
    stage && `Awareness stage: ${STAGE_LABELS[stage] || stage}.`,
    angle && `Angle: ${angle}.`,
    format && `Creative format: ${format}.`,
    direction && `Direction from the creative strategy audit: ${direction}`,
    why && `Why this matters: ${why}`,
  ].filter(Boolean).join("\n");
}
