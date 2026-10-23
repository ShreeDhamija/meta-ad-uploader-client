// ════════════════════════════════════════════════════════════════════════════
// FEATURE START: CUSTOM DATA + CUSTOM METRICS (added 2026-10-23)
// ----------------------------------------------------------------------------
// Shared logic for the Google Sheet data source and "Create Custom Metric"
// (configured in the Optimization Focus popup). Ported from the meta-dashboard
// app's ExternalDashboard.tsx: same formula grammar and evaluation rules.
//
// Stored formula: metric refs in single braces, e.g. "{spend} / {sheet:Sales}".
//   {<meta key>}     — a Meta metric (see META_METRICS)
//   {sheet:<column>} — a Google Sheet column
//   {calc:<id>}      — another custom metric
// The builder shows the same formula with readable names: "{{Spend}} / {{Sales}}".
// ════════════════════════════════════════════════════════════════════════════

// ─── Formatting ──────────────────────────────────────────────────────────────

export function formatCurrencyShort(v) {
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
    if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
    return `$${v.toFixed(2)}`
}

/** Custom metric formats — same rules as the colleague's calculated fields. */
export function formatMetricValue(v, format) {
    if (v === null || v === undefined || !Number.isFinite(v)) return "—"
    switch (format) {
        case "currency": return formatCurrencyShort(v)
        case "percent": return `${v.toFixed(2)}%`
        case "roas": return `${v.toFixed(2)}x`
        case "integer": return Math.round(v).toLocaleString()
        default: return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
    }
}

// ─── Meta metrics available to formulas ──────────────────────────────────────
// `raw` reads a /period-summary period object; `bucket` reads a
// /weekly-insights row (one chart bucket). Ratios are rebuilt from summed
// parts so a bucket's CPA is its own spend ÷ its own conversions.

const ratio = (a, b, k = 1) => (b > 0 ? (a / b) * k : null)

export const META_METRICS = [
    { key: "spend", label: "Spend", format: "currency", lowerIsBetter: false, raw: (p) => p.spend, bucket: (b) => b.spend },
    { key: "conversions", label: "Conversions", format: "integer", lowerIsBetter: false, raw: (p) => p.conversions, bucket: (b) => b.conversions },
    { key: "revenue", label: "Revenue", format: "currency", lowerIsBetter: false, raw: (p) => p.revenue, bucket: (b) => b.revenue },
    { key: "cpa", label: "CPA", format: "currency", lowerIsBetter: true, raw: (p) => p.cpa, bucket: (b) => ratio(b.spend, b.conversions) },
    { key: "roas", label: "ROAS", format: "roas", lowerIsBetter: false, raw: (p) => p.roas, bucket: (b) => ratio(b.revenue, b.spend) },
    { key: "cpm", label: "CPM", format: "currency", lowerIsBetter: true, raw: (p) => p.cpm, bucket: (b) => ratio(b.spend, b.impressions, 1000) },
    { key: "linkCtr", label: "Link CTR", format: "percent", lowerIsBetter: false, raw: (p) => p.linkCtr, bucket: (b) => ratio(b.linkClicks, b.impressions, 100) },
    { key: "costPerLinkClick", label: "Cost / Link Click", format: "currency", lowerIsBetter: true, raw: (p) => p.costPerLinkClick, bucket: (b) => ratio(b.spend, b.linkClicks) },
    { key: "impressions", label: "Impressions", format: "integer", lowerIsBetter: false, raw: (p) => p.impressions, bucket: (b) => b.impressions },
    { key: "linkClicks", label: "Link Clicks", format: "integer", lowerIsBetter: false, raw: (p) => p.linkClicks, bucket: (b) => b.linkClicks },
    { key: "reach", label: "Reach", format: "integer", lowerIsBetter: false, raw: (p) => p.reach, bucket: (b) => b.reach },
]

const META_BY_KEY = new Map(META_METRICS.map((m) => [m.key, m]))

// ─── Formula parser & evaluator ──────────────────────────────────────────────
// Supports: metric refs {key}, numbers, +, -, *, /, parentheses.
// Precedence: () > * / > + -. Division by zero, or any unknown metric, → null.

function tokenizeFormula(formula) {
    const tokens = []
    let i = 0
    while (i < formula.length) {
        const ch = formula[i]
        if (/\s/.test(ch)) { i++; continue }
        if (ch === "{") {
            const end = formula.indexOf("}", i)
            if (end === -1) break
            tokens.push({ type: "metric", key: formula.slice(i + 1, end) })
            i = end + 1
            continue
        }
        if (ch === "(" || ch === ")") {
            tokens.push({ type: "paren", value: ch })
            i++
            continue
        }
        if ("+-*/".includes(ch)) {
            tokens.push({ type: "op", value: ch })
            i++
            continue
        }
        const numMatch = formula.slice(i).match(/^(\d+\.?\d*)/)
        if (numMatch) {
            tokens.push({ type: "number", value: parseFloat(numMatch[1]) })
            i += numMatch[1].length
            continue
        }
        i++ // skip unknown
    }
    return tokens
}

function evaluateTokens(tokens, resolveMetric) {
    let pos = 0
    const peek = () => tokens[pos]
    const consume = () => tokens[pos++]
    const peekIsOp = (op) => { const t = peek(); return t?.type === "op" && t.value === op }
    const peekIsAnyOp = (...ops) => { const t = peek(); return t?.type === "op" && ops.includes(t.value) }
    const peekIsParen = (p) => { const t = peek(); return t?.type === "paren" && t.value === p }

    function parseAtom() {
        const t = peek()
        if (!t) return null
        if (t.type === "number") { consume(); return t.value }
        if (t.type === "metric") { consume(); return resolveMetric(t.key) }
        if (peekIsParen("(")) {
            consume()
            const v = parseExpr()
            if (peekIsParen(")")) consume()
            return v
        }
        if (peekIsOp("-")) {
            consume()
            const v = parseAtom()
            return v !== null ? -v : null
        }
        return null
    }

    function parseMulDiv() {
        let left = parseAtom()
        while (peekIsAnyOp("*", "/")) {
            const op = consume().value
            const right = parseAtom()
            if (left === null || right === null) return null
            left = op === "*" ? left * right : (right !== 0 ? left / right : null)
        }
        return left
    }

    function parseExpr() {
        let left = parseMulDiv()
        while (peekIsAnyOp("+", "-")) {
            const op = consume().value
            const right = parseMulDiv()
            if (left === null || right === null) return null
            left = op === "+" ? left + right : left - right
        }
        return left
    }

    return parseExpr()
}

/**
 * Value of a metric key for one context — a whole period or one chart bucket.
 *   ctx.meta(metaMetricDef) → number | null
 *   ctx.sheet(column)       → number | null
 */
export function resolveMetricKey(key, ctx, customMetrics, seen = new Set()) {
    if (key.startsWith("calc:")) {
        const id = key.slice(5)
        if (seen.has(id)) return null // a metric that refers back to itself
        const field = customMetrics.find((f) => f.id === id)
        if (!field) return null
        const nextSeen = new Set(seen).add(id)
        try {
            return evaluateTokens(tokenizeFormula(field.formula), (k) => resolveMetricKey(k, ctx, customMetrics, nextSeen))
        } catch {
            return null
        }
    }
    if (key.startsWith("sheet:")) {
        const v = ctx.sheet(key.slice(6))
        return v === undefined ? null : v
    }
    const def = META_BY_KEY.get(key)
    if (!def) return null
    const v = ctx.meta(def)
    return v === undefined || (typeof v === "number" && !Number.isFinite(v)) ? null : v
}

/** Contexts for the scorecards: period-summary + sheet sums for "current" / "previous". */
export function periodContext(periodSummary, customData, which) {
    const period = periodSummary?.[which] || null
    const sheetSums = customData?.[which] || null
    return {
        meta: (def) => (period ? def.raw(period) ?? null : null),
        sheet: (col) => (sheetSums && col in sheetSums ? sheetSums[col] : null),
    }
}

// ─── Variables (for the builder's / dropdown) ────────────────────────────────

export function buildVariables({ sheetColumns = [], customMetrics = [] }) {
    return [
        ...META_METRICS.map((m) => ({ key: m.key, label: m.label, group: "Meta Ads" })),
        ...sheetColumns.map((col) => ({ key: `sheet:${col}`, label: col, group: "Google Sheet" })),
        ...customMetrics.map((f) => ({ key: `calc:${f.id}`, label: f.name, group: "Custom Metrics" })),
    ]
}

/** "{spend} / {sheet:Sales}" → "{{Spend}} / {{Sales}}" (unknown keys keep their raw key). */
export function formulaToDisplay(formula, variables) {
    return (formula || "").replace(/\{([^}]+)\}/g, (_, key) => {
        const v = variables.find((o) => o.key === key)
        return `{{${v ? v.label : key}}}`
    })
}

/**
 * "{{Spend}} / {{Sales}}" → "{spend} / {sheet:Sales}". Names are matched
 * case-insensitively; a name matching several variables (a sheet column called
 * "Spend") takes the first — Meta, then sheet, then custom metrics.
 */
export function displayToFormula(text, variables) {
    const unknown = []
    const formula = (text || "").replace(/\{\{([^}]+)\}\}/g, (_, rawName) => {
        const name = rawName.trim().toLowerCase()
        const v = variables.find((o) => o.label.toLowerCase() === name)
        if (!v) { unknown.push(rawName.trim()); return "{?}" }
        return `{${v.key}}`
    })
    return { formula, unknown: [...new Set(unknown)] }
}

/** Display config for a tile / chart line: a selected sheet column or a custom metric. */
export function describeCustomKey(key, customMetrics) {
    if (key.startsWith("sheet:")) {
        return { key, label: key.slice(6), format: "number", lowerIsBetter: false }
    }
    if (key.startsWith("calc:")) {
        const f = customMetrics.find((m) => m.id === key.slice(5))
        if (!f) return null
        return { key, label: f.name, format: f.format, lowerIsBetter: f.lowerIsBetter }
    }
    return null
}

/** Every key shown as a tile and chart line: selected sheet columns, then custom metrics. */
export function getCustomDisplayKeys(customDataSource, customMetrics) {
    return [
        ...(customDataSource?.columns || []).map((c) => `sheet:${c}`),
        ...(customMetrics || []).map((f) => `calc:${f.id}`),
    ]
}

// ════════════════════════════════════════════════════════════════════════════
// FEATURE END: CUSTOM DATA + CUSTOM METRICS
// ════════════════════════════════════════════════════════════════════════════
