"use client"

import { useState, useEffect } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { Button } from "@/components/ui/button"
import { FileBarChart2 } from "lucide-react"
import {
    ComposedChart, LineChart, Bar, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts"
import { cn } from "@/lib/utils"
import Audit from "@/assets/icons/analytics/Audit.svg"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

// ── Palette (orange + pink — zero blue/green/yellow) ─────────────────────────
const ORANGE = "#FF4800"
const ORANGE_DEEP = "#D93B00"
const ORANGE_LIGHT = "#FFC7A8"
const ORANGE_MID = "#FF9C73"
const ORANGE_SOFT = "#FFE6DA"
const PINK = "#F00D55"
const PINK_DEEP = "#C70845"
const PINK_SOFT = "#FCD9E3"
const BLUE = "#2563EB"

const INK = "#0F1115"
const INK_2 = "#2A2E35"
const MUTED = "#6B7280"
const MUTED_2 = "#9CA3AF"
const LINE = "#E7E9EE"
const LINE_2 = "#D8DCE3"
const PAPER = "#FFFFFF"
const PAPER_2 = "#F8F9FB"

// Chart roles
const CPC_COLOR = ORANGE
const CTR_COLOR = PINK
const CPM_COLOR = ORANGE
const FREQ_COLOR = ORANGE
const FTIR_COLOR = PINK
const PROSPECTING_COLOR = ORANGE
const RETARGETING_COLOR = PINK

const FONT = "'Inter Tight', system-ui, sans-serif"

const GRID_STROKE = "#EEF0F4"
const AXIS_TICK = { fontSize: 10, fill: MUTED_2, fontFamily: FONT }
const AXIS_LINE = { stroke: LINE }
const TOOLTIP_STYLE = {
    borderRadius: "12px",
    border: `1px solid ${LINE}`,
    boxShadow: "none",
    fontSize: "12px",
    padding: "8px 12px",
    fontFamily: FONT,
}

// ── Formatters ───────────────────────────────────────────────────────────────
function fmt$(v, decimals = 0) {
    if (v === null || v === undefined) return "\u2014"
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(decimals)}`
}
function fmtNum(v, decimals = 2) {
    if (v === null || v === undefined) return "\u2014"
    return v.toFixed(decimals)
}
function formatEventName(actionType) {
    if (!actionType) return "Auto-detected event"
    if (actionType.startsWith("offsite_conversion.fb_pixel_custom.")) {
        return actionType.slice("offsite_conversion.fb_pixel_custom.".length)
            .replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase())
    }
    if (actionType === "offsite_conversion.fb_pixel_custom") return "Custom Event"
    if (actionType.startsWith("offsite_conversion.custom.")) return "Custom Conversion"
    if (actionType.startsWith("offsite_conversion.fb_pixel_")) {
        return actionType.slice("offsite_conversion.fb_pixel_".length)
            .replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase())
    }
    return actionType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

// ═════════════════════════════════════════════════════════════════════════════
// REUSABLE PRIMITIVES
// ═════════════════════════════════════════════════════════════════════════════

// Small supporting label.
function UpperLabel({ children, className, style }) {
    return (
        <p
            className={cn("font-medium", className)}
            style={{
                fontSize: 10.5,
                color: MUTED,
                margin: 0,
                ...style,
            }}
        >
            {children}
        </p>
    )
}

// White metric card with oversized single-color number
function MetricCard({ label, value, unit, sub, dark }) {
    return (
        <div
            className="flex flex-col gap-3 p-4 min-w-0"
            style={{
                background: dark ? INK : PAPER,
                color: dark ? "#fff" : INK,
            }}
        >
            <UpperLabel style={{ color: dark ? "rgba(255,255,255,0.55)" : MUTED }}>
                {label}
            </UpperLabel>
            <p
                className="tabular-nums"
                style={{
                    fontSize: 40,
                    fontWeight: 800,
                    letterSpacing: "-0.015em",
                    lineHeight: 1,
                    margin: 0,
                    color: dark ? "#fff" : INK,
                }}
            >
                {value}
                {unit && (
                    <span style={{ fontSize: 40, fontWeight: 600, color: dark ? "#fff" : INK, marginLeft: 2 }}>
                        {unit}
                    </span>
                )}
            </p>
            {sub && (
                <p
                    style={{
                        fontSize: 11.5,
                        color: dark ? "rgba(255,255,255,0.6)" : MUTED,
                        margin: 0,
                    }}
                >
                    {sub}
                </p>
            )}
        </div>
    )
}

function MetricGrid({ children, columns = 3, className, style }) {
    const items = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean)
    return (
        <div
            className={className}
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                ...style,
            }}
        >
            {items.map((child, idx) => (
                <div
                    key={child.key || idx}
                    style={{
                        borderLeft: idx % columns === 0 ? 0 : `1px dotted ${LINE_2}`,
                        borderTop: idx < columns ? 0 : `1px dotted ${LINE_2}`,
                    }}
                >
                    {child}
                </div>
            ))}
        </div>
    )
}

function SectionHeader({ title, sub }) {
    return (
        <div className="flex items-start justify-between mb-5">
            <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.015em", margin: 0, color: INK }}>
                    {title}
                </h3>
                {sub && (
                    <p style={{ fontSize: 11.5, color: MUTED, margin: "4px 0 0", maxWidth: 520 }}>
                        {sub}
                    </p>
                )}
            </div>
        </div>
    )
}

function SectionCard({ children, id, dark }) {
    return (
        <div
            id={`audit-${id}`}
            className="rounded-3xl"
            style={{
                background: dark ? INK : PAPER,
                border: `1px solid ${dark ? INK : LINE}`,
                padding: "22px 24px 24px",
                color: dark ? "#fff" : INK,
                fontFamily: FONT,
            }}
        >
            {children}
        </div>
    )
}

function ChartTooltipContent({ active, payload, label, formatters }) {
    if (!active || !payload?.length) return null
    return (
        <div
            style={{
                background: PAPER,
                borderRadius: 12,
                border: `1px solid ${LINE}`,
                padding: "8px 12px",
                fontSize: 12,
                minWidth: 140,
                fontFamily: FONT,
            }}
        >
            <p style={{ fontWeight: 700, color: INK_2, margin: "0 0 6px", fontSize: 11 }}>{label}</p>
            {payload.map((entry) => (
                <div key={entry.name} className="flex justify-between gap-4">
                    <span style={{ color: entry.color, fontWeight: 500 }}>{entry.name}</span>
                    <span className="tabular-nums" style={{ color: INK, fontWeight: 700 }}>
                        {formatters?.[entry.name] ? formatters[entry.name](entry.value) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    )
}

// Donut ring (learning + copy)
function DonutRing({ value, total, color = ORANGE, size = 110, centerText, centerSub }) {
    const pct = total > 0 ? value / total : 0
    const r = (size - size * 0.10) / 2
    const sw = size * 0.10
    const circ = 2 * Math.PI * r
    const dash = circ * pct
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(15,17,21,0.08)" strokeWidth={sw} />
            <circle
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={color} strokeWidth={sw}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={circ * 0.25}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: "stroke-dasharray 1s cubic-bezier(0.34,1.56,0.64,1)" }}
            />
            <text
                x={size / 2} y={size / 2 + size * 0.06}
                textAnchor="middle"
                fontFamily={FONT} fontWeight={900}
                fontSize={size * 0.24} fill={INK}
                letterSpacing="-0.01em"
            >
                {centerText ?? `${(pct * 100).toFixed(0)}%`}
            </text>
            {centerSub && (
                <text
                    x={size / 2} y={size / 2 + size * 0.20}
                    textAnchor="middle"
                    fontFamily={FONT} fontWeight={600}
                    fontSize={size * 0.07} fill={MUTED}
                >
                    {centerSub}
                </text>
            )}
        </svg>
    )
}

// Signal-dot insight tile (white bg, ink text)
function InsightTile({ label, value, valueUnit, valuePrefix, desc, status = "neutral" }) {
    const colors = {
        good: { dot: "#22c55e", ring: "rgba(34,197,94,0.18)" },
        warn: { dot: "#f59e0b", ring: "rgba(245,158,11,0.20)" },
        bad: { dot: "#ef4444", ring: "rgba(239,68,68,0.18)" },
        neutral: { dot: "#9ca3af", ring: "rgba(156,163,175,0.20)" },
    }[status]
    return (
        <div
            className="relative"
            style={{
                background: PAPER,
                padding: "14px 16px 15px",
            }}
        >
            <span
                className="absolute"
                style={{
                    top: 14, right: 14,
                    width: 9, height: 9, borderRadius: 999,
                    background: colors.dot,
                    boxShadow: `0 0 0 4px ${colors.ring}`,
                }}
            />
            <UpperLabel style={{ fontSize: 9.5, color: MUTED, marginBottom: 14, paddingRight: 20 }}>
                {label}
            </UpperLabel>
            <div
                className="tabular-nums"
                style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1, color: INK }}
            >
                {valuePrefix && (
                    <span style={{ fontSize: 30, fontWeight: 600, color: INK }}>{valuePrefix}</span>
                )}
                {value}
                {valueUnit && (
                    <span style={{ fontSize: 30, fontWeight: 800, color: INK, marginLeft: 1 }}>
                        {valueUnit}
                    </span>
                )}
            </div>
            {desc && (
                <p style={{ fontSize: 11.5, color: MUTED, margin: "6px 0 0", lineHeight: 1.4 }}>
                    {desc}
                </p>
            )}
        </div>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 0: EXECUTIVE SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

function SummarySection({ report, kpiType, kpiTarget }) {
    if (!report) return null
    const { monthlySpend, audience, learning, copyUtilization, cpaTrend } = report
    const kpiLabel = kpiType === "roas" ? "ROAS" : "CPA"

    // Build top-line statement
    let headlineParts = []
    if (monthlySpend?.length >= 2) {
        const cur = monthlySpend[monthlySpend.length - 1]
        const prev = monthlySpend[monthlySpend.length - 2]
        const delta = prev.spend > 0 ? ((cur.spend - prev.spend) / prev.spend * 100).toFixed(0) : "0"
        headlineParts.push(`You spent <b>${fmt$(cur.spend)}</b> this month <b>(${delta > 0 ? "+" : ""}${delta}% MoM)</b>`)
        if (cur.kpi != null) {
            headlineParts.push(`with a blended ${kpiLabel} of <b>${kpiType === "roas" ? `${cur.kpi.toFixed(2)}×` : `$${cur.kpi.toFixed(1)}`}</b>.`)
        } else {
            headlineParts.push(".")
        }
        if (kpiTarget && cur.kpi != null) {
            const above = kpiType === "roas" ? cur.kpi < kpiTarget : cur.kpi > kpiTarget
            const gap = Math.abs(cur.kpi - kpiTarget)
            const fmtGap = kpiType === "roas" ? `${gap.toFixed(2)}×` : `$${gap.toFixed(1)}`
            headlineParts.push(above
                ? `That's <b>${fmtGap} above target</b> — focus on consolidating learning-stuck ad sets and scaling top prospecting cohorts.`
                : `That's <b>${fmtGap} better than target</b> — consider scaling top audiences.`)
        }
    }
    const headline = headlineParts.join(" ")

    // Build insight tiles (only from data clearly present)
    const tiles = []

    if (monthlySpend?.length >= 2) {
        const cur = monthlySpend[monthlySpend.length - 1]
        const prev = monthlySpend[monthlySpend.length - 2]
        const deltaNum = prev.spend > 0 ? ((cur.spend - prev.spend) / prev.spend * 100) : null
        if (deltaNum !== null) {
            const roundedDelta = deltaNum.toFixed(0)
            tiles.push({
                label: "Spend Trend",
                value: Math.abs(roundedDelta),
                valuePrefix: deltaNum > 0 ? "+" : "−",
                valueUnit: "%",
                desc: `Spend is ${deltaNum > 0 ? "up" : "down"} ${Math.abs(roundedDelta)}% month-over-month at ${fmt$(cur.spend)}.`,
                status: Math.abs(deltaNum) < 25 ? "good" : "warn",
            })
        }
    }
    if (monthlySpend?.length >= 1 && kpiTarget) {
        const cur = monthlySpend[monthlySpend.length - 1]
        if (cur.kpi != null) {
            const above = kpiType === "roas" ? cur.kpi < kpiTarget : cur.kpi > kpiTarget
            const gap = Math.abs(cur.kpi - kpiTarget)
            const fmtGap = kpiType === "roas" ? `${gap.toFixed(2)}×` : `$${gap.toFixed(1)}`
            tiles.push({
                label: `${kpiLabel} vs Target`,
                value: cur.kpi.toFixed(kpiType === "roas" ? 2 : 1),
                valuePrefix: kpiType === "cpa" ? "$" : undefined,
                valueUnit: kpiType === "roas" ? "×" : undefined,
                desc: `This is ${fmtGap} ${above ? "worse than" : "better than"} your ${kpiType === "roas" ? `${kpiTarget}×` : `$${kpiTarget}`} target.`,
                status: above ? "warn" : "good",
            })
        }
    }
    if (cpaTrend && cpaTrend.recentCpa != null && cpaTrend.priorCpa != null) {
        const delta = cpaTrend.deltaPct
        tiles.push({
            label: "CPA Trend",
            value: Math.abs(delta).toFixed(0),
            valuePrefix: delta > 0 ? "+" : "−",
            valueUnit: "%",
            desc: `Last 7d vs prior 7d · $${cpaTrend.priorCpa.toFixed(0)} → $${cpaTrend.recentCpa.toFixed(0)}`,
            status: Math.abs(delta) < 5 ? "good" : delta > 0 ? "warn" : "good",
        })
    }
    if (learning && learning.learningSpendPct != null) {
        const pct = learning.learningSpendPct
        tiles.push({
            label: "Learning Phase",
            value: (pct * 100).toFixed(0),
            valueUnit: "%",
            desc: "of 7d budget in learning",
            status: pct < 0.2 ? "good" : pct < 0.5 ? "warn" : "bad",
        })
    }
    if (audience && audience.totalSpend30d > 0) {
        const prospPct = Math.round((audience.prospectingSpend / audience.totalSpend30d) * 100)
        tiles.push({
            label: "Audience Split",
            value: prospPct,
            valueUnit: `/${100 - prospPct}`,
            desc: "Prospecting / Retargeting",
            status: prospPct >= 55 && prospPct <= 85 ? "good" : "neutral",
        })
    }
    if (copyUtilization) {
        tiles.push({
            label: "Copy Utilization",
            value: copyUtilization.maximizingCount,
            valueUnit: `/${copyUtilization.totalCount}`,
            desc: "top ads maximizing variants",
            status: copyUtilization.maximizingCount >= copyUtilization.totalCount * 0.8 ? "good" : "warn",
        })
    }

    return (
        <SectionCard id="summary">
            <SectionHeader
                title="Account Summary"
                sub="Key signals for your Meta ad account this period."
            />

            {/* Orange Top-Line */}
            {headline && (
                <div
                    className="rounded-3xl"
                    style={{
                        background: PAPER,
                        border: `1px solid ${ORANGE}`,
                        color: INK,
                        padding: "16px 20px",
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 400, color: INK, maxWidth: 760 }}
                        dangerouslySetInnerHTML={{ __html: headline }}
                    />
                </div>
            )}

            <MetricGrid columns={3}>
                {tiles.map((t) => (
                    <InsightTile key={t.label} {...t} />
                ))}
            </MetricGrid>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: TRAFFIC
// ═════════════════════════════════════════════════════════════════════════════

function TrafficSection({ traffic }) {
    const dateLabel = (d) => d.slice(5).replace("-", "/")
    const lineDefs = [
        { key: "costPerClick", label: "Cost Per Click (CPC)", color: CPC_COLOR, tooltipFmt: (v) => `$${(v ?? 0).toFixed(2)}`, yFmt: (v) => `$${v.toFixed(0)}` },
        { key: "ctr", label: "Link CTR", color: CTR_COLOR, tooltipFmt: (v) => `${(v ?? 0).toFixed(2)}%`, yFmt: (v) => `${v.toFixed(1)}%` },
        { key: "cpm", label: "Cost Per 1,000 Impressions (CPM)", color: CPM_COLOR, tooltipFmt: (v) => `$${(v ?? 0).toFixed(2)}`, yFmt: (v) => `$${v.toFixed(0)}` },
    ]

    return (
        <SectionCard id="traffic">
            <SectionHeader
                title="Traffic Overview"
                sub="Trailing 30 days · Cost Per Link Click, Link CTR, and CPM."
            />

            <MetricGrid columns={3} className="mb-4">
                <MetricCard label="Avg Cost / Link Click" value={fmt$(traffic.avgCostPerClick, 2)} />
                <MetricCard label="Avg Link CTR" value={traffic.avgCtr !== null ? `${traffic.avgCtr.toFixed(2)}` : "\u2014"} unit="%" />
                <MetricCard label="Avg CPM" value={fmt$(traffic.avgCpm, 0)} />
            </MetricGrid>

            <div className="grid grid-cols-3 gap-3">
                {lineDefs.map(({ key, label, color, tooltipFmt, yFmt }) => (
                    <div
                        key={key}
                        className="rounded-3xl"
                        style={{
                            background: PAPER,
                            border: `1px solid ${ORANGE}`,
                            padding: "14px 12px 8px",
                        }}
                    >
                        <UpperLabel style={{ marginBottom: 8, paddingLeft: 4 }}>{label}</UpperLabel>
                        <div style={{ height: 150 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={traffic.daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="2 4" stroke={GRID_STROKE} vertical={false} />
                                    <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={dateLabel} interval="preserveStartEnd" axisLine={AXIS_LINE} tickLine={false} />
                                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={yFmt} width={36} />
                                    <Tooltip
                                        contentStyle={TOOLTIP_STYLE}
                                        formatter={(v) => [tooltipFmt(v), label.split(" (")[0]]}
                                        labelStyle={{ fontWeight: 700, fontSize: 11, marginBottom: 4 }}
                                    />
                                    <Line type="monotone" dataKey={key} stroke={color} dot={{ r: 3, strokeWidth: 0, fill: color }} strokeWidth={2.25} connectNulls />
                                    <Line type="monotone" dataKey={key} stroke="none" fill={`url(#grad-${key})`} legendType="none" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: FUNNEL
// ═════════════════════════════════════════════════════════════════════════════

function FunnelSection({ funnel }) {
    const chartData = funnel.weekly.map((w) => ({
        week: `${w.weekStart.slice(5).replace("-", "/")}–${w.weekEnd.slice(5).replace("-", "/")}`,
        Frequency: w.frequency,
        "FTIR %": w.ftir !== null ? w.ftir * 100 : null,
    }))

    return (
        <SectionCard id="funnel">
            <SectionHeader
                title="Funnel Health"
                sub="Trailing 3 months · weekly averages · Frequency and First-Time Impression Rate."
            />
            <MetricGrid columns={2} className="mb-4">
                <MetricCard label="Avg Weekly Frequency" value={fmtNum(funnel.avgFrequency)} sub="impressions per unique user" />
                <MetricCard label="Avg First-Time Impression Rate" value={funnel.avgFtir !== null ? (funnel.avgFtir * 100).toFixed(0) : "\u2014"} unit="%" sub="reach ÷ impressions · higher is healthier" />
            </MetricGrid>
            <div className="rounded-2xl" style={{ background: PAPER, border: `1px solid ${LINE}`, padding: "14px 12px 8px", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 12, right: 24, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="grad-freq" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={FREQ_COLOR} stopOpacity={0.22} />
                                <stop offset="100%" stopColor={FREQ_COLOR} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="grad-ftir" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={FTIR_COLOR} stopOpacity={0.22} />
                                <stop offset="100%" stopColor={FTIR_COLOR} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="week" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
                        <YAxis yAxisId="freq" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(1)} width={36} />
                        <YAxis yAxisId="ftir" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} width={44} />
                        <Tooltip content={<ChartTooltipContent formatters={{ Frequency: (v) => v.toFixed(2), "FTIR %": (v) => `${v.toFixed(1)}%` }} />} />
                        <Legend
                            wrapperStyle={{ fontSize: 11, fontFamily: FONT, paddingTop: 4 }}
                            iconType="circle"
                        />
                        <Line yAxisId="freq" type="monotone" dataKey="Frequency" stroke={FREQ_COLOR} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: FREQ_COLOR }} fill="url(#grad-freq)" />
                        <Line yAxisId="ftir" type="monotone" dataKey="FTIR %" stroke={FTIR_COLOR} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: FTIR_COLOR }} fill="url(#grad-ftir)" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: MONTHLY SPEND
// ═════════════════════════════════════════════════════════════════════════════

function MonthlySpendSection({ monthlySpend, kpiType, kpiTarget }) {
    const kpiLabel = kpiType === "roas" ? "ROAS" : "CPA"
    const kpiFmt = (v) => kpiType === "roas" ? `${v.toFixed(2)}×` : `$${v.toFixed(0)}`

    const cur = monthlySpend?.[monthlySpend.length - 1]
    const prev = monthlySpend?.[monthlySpend.length - 2]
    const deltaPct = (cur && prev && prev.spend > 0) ? Math.round((cur.spend - prev.spend) / prev.spend * 100) : null
    const overTarget = (kpiTarget != null && cur?.kpi != null)
        ? (kpiType === "roas" ? cur.kpi < kpiTarget : cur.kpi > kpiTarget)
        : null
    const gap = (kpiTarget != null && cur?.kpi != null) ? Math.abs(cur.kpi - kpiTarget) : null

    return (
        <SectionCard id="spend">
            <SectionHeader
                title="Monthly Ad Spend"
                sub={`Last 6 months · total account spend and blended ${kpiLabel} by calendar month.`}
            />

            <div className="grid gap-5" style={{ gridTemplateColumns: "300px 1fr", alignItems: "start" }}>
                {/* Left: stacked KPI display */}
                <div className="flex flex-col gap-3">
                    <div>
                        <UpperLabel style={{ color: MUTED }}>Spend This Month</UpperLabel>
                        <div
                            className="tabular-nums"
                            style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.015em", lineHeight: 1, color: INK, marginTop: 14 }}
                        >
                            <span style={{ fontSize: 48, color: INK }}>$</span>
                            {cur ? (cur.spend / 1000).toFixed(1) : "—"}
                            <span style={{ fontSize: 48, color: INK }}>k</span>
                        </div>
                        {deltaPct !== null && (
                            <p style={{ marginTop: 8, fontSize: 12, color: INK_2 }}>
                                <b style={{ color: INK }}>{deltaPct > 0 ? "+" : ""}{deltaPct}%</b> MoM
                            </p>
                        )}
                    </div>

                    <div style={{ borderTop: `1px dotted ${LINE_2}`, margin: "4px 0" }} />

                    <div>
                        <UpperLabel style={{ color: MUTED }}>Blended {kpiLabel}</UpperLabel>
                        <div
                            className="tabular-nums"
                            style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1, color: INK, marginTop: 14 }}
                        >
                            {cur?.kpi != null
                                ? (kpiType === "roas"
                                    ? <>{cur.kpi.toFixed(2)}<span style={{ fontSize: 48, color: INK }}>×</span></>
                                    : <><span style={{ fontSize: 48, color: INK }}>$</span>{cur.kpi.toFixed(2)}</>)
                                : "—"}
                        </div>
                        {kpiTarget != null && gap !== null && (
                            <p style={{ marginTop: 8, fontSize: 12, color: INK_2 }}>
                                Target {kpiType === "roas" ? `${kpiTarget}×` : `$${kpiTarget}`} ·{" "}
                                <b style={{ color: overTarget ? PINK : BLUE }}>
                                    {overTarget ? "+" : "−"}{kpiType === "roas" ? `${gap.toFixed(2)}×` : `$${gap.toFixed(2)}`} {overTarget ? "over" : "under"}
                                </b>
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: chart */}
                <div className="rounded-2xl" style={{ background: PAPER, border: `1px solid ${LINE}`, padding: "14px 12px 8px", height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlySpend} margin={{ top: 18, right: 36, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="grad-bar" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={ORANGE} stopOpacity={1} />
                                    <stop offset="100%" stopColor={ORANGE_LIGHT} stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="grad-bar-current" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={ORANGE} stopOpacity={1} />
                                    <stop offset="100%" stopColor={ORANGE_MID} stopOpacity={1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 4" stroke={GRID_STROKE} vertical={false} />
                            <XAxis dataKey="month" tick={{ ...AXIS_TICK, fontSize: 11 }} axisLine={AXIS_LINE} tickLine={false} />
                            <YAxis yAxisId="spend" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} width={48} />
                            <YAxis yAxisId="kpi" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={kpiFmt} width={44} />
                            <Tooltip
                                content={<ChartTooltipContent formatters={{
                                    Spend: (v) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
                                    [kpiLabel]: kpiFmt
                                }} />}
                            />
                            <Legend wrapperStyle={{ fontSize: 11, color: INK_2, fontFamily: FONT }} iconType="circle" />
                            <Bar yAxisId="spend" dataKey="spend" name="Spend" radius={[8, 8, 0, 0]}>
                                {monthlySpend.map((_, i) => (
                                    <Cell key={i} fill={i === monthlySpend.length - 1 ? "url(#grad-bar-current)" : "url(#grad-bar)"} />
                                ))}
                            </Bar>
                            <Line yAxisId="kpi" type="monotone" dataKey="kpi" name={kpiLabel} stroke={PINK} dot={{ r: 3, strokeWidth: 2, fill: PAPER, stroke: PINK }} strokeWidth={2.5} connectNulls />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: AUDIENCE
// ═════════════════════════════════════════════════════════════════════════════

function AudienceSection({ audience }) {
    const [filter, setFilter] = useState("all")
    const [showAll, setShowAll] = useState(false)

    const filtered = audience.adsets.filter((a) => filter === "all" || a.type === filter)
    const visible = showAll ? filtered : filtered.slice(0, 8)
    const total = audience.totalSpend30d

    const prospPct = total > 0 ? Math.round((audience.prospectingSpend / total) * 100) : 0
    const retasPct = 100 - prospPct

    return (
        <SectionCard id="audience">
            <SectionHeader
                title="Audience Strategy"
                sub="Adsets with delivery in last 30 days (including paused) · prospecting vs retargeting classification."
            />

            <MetricGrid columns={3} className="mb-4">
                <MetricCard
                    label="Prospecting Spend · 30d"
                    value={fmt$(audience.prospectingSpend)}
                    sub={`${prospPct}% of total`}
                />
                <MetricCard
                    label="Retargeting Spend · 30d"
                    value={fmt$(audience.retargetingSpend)}
                    sub={`${retasPct}% of total`}
                />
                <MetricCard
                    label="Total Account Spend · 30d"
                    value={fmt$(audience.totalSpend30d)}
                    sub={`${audience.adsets.length} active adsets`}
                />
            </MetricGrid>

            {/* Split bar — flat colors */}
            <div
                className="rounded-2xl mb-4"
                style={{ height: 56, background: PAPER, border: `1px solid ${LINE}`, overflow: "hidden", display: "flex" }}
            >
                <div
                    style={{ flex: prospPct, background: PROSPECTING_COLOR, color: "#fff", display: "flex", alignItems: "center", padding: "0 16px", fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap" }}
                >
                    Prospecting <span style={{ fontSize: 11, opacity: 0.85, marginLeft: 8, fontWeight: 500 }}>{fmt$(audience.prospectingSpend)} · {prospPct}%</span>
                </div>
                <div
                    style={{ flex: retasPct, background: RETARGETING_COLOR, color: "#fff", display: "flex", alignItems: "center", padding: "0 16px", fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap" }}
                >
                    Retargeting <span style={{ fontSize: 11, opacity: 0.85, marginLeft: 8, fontWeight: 500 }}>{fmt$(audience.retargetingSpend)} · {retasPct}%</span>
                </div>
            </div>

            {audience.topExclusions?.length > 0 && (
                <div className="mb-4">
                    <UpperLabel style={{ marginBottom: 8 }}>Most-Used Exclusion Audiences</UpperLabel>
                    <div className="flex flex-wrap gap-1.5">
                        {audience.topExclusions.map((exc) => (
                            <span
                                key={exc.name}
                                className="inline-flex items-baseline gap-1.5"
                                style={{ padding: "5px 10px 6px", borderRadius: 999, background: PAPER, border: `1px solid ${LINE}`, fontSize: 11.5, color: INK_2 }}
                            >
                                {exc.name}
                                <span style={{ fontSize: 10.5, fontWeight: 700, color: ORANGE }}>×{exc.count}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex" style={{ padding: 3, background: PAPER_2, border: `1px solid ${LINE}`, borderRadius: 12 }}>
                    {["all", "prospecting", "retargeting"].map((t) => {
                        const isActive = filter === t
                        return (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                style={{
                                    padding: "6px 14px",
                                    borderRadius: 9,
                                    fontSize: 11.5,
                                    fontWeight: isActive ? 600 : 500,
                                    color: isActive ? "#fff" : MUTED,
                                    background: isActive ? INK : "transparent",
                                    border: 0,
                                    cursor: "pointer",
                                    fontFamily: FONT,
                                }}
                            >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                                {t !== "all" && (
                                    <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 4, fontWeight: 500 }}>
                                        ({audience.adsets.filter(a => a.type === t).length})
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
                <UpperLabel style={{ marginLeft: "auto" }}>{filtered.length} adsets</UpperLabel>
            </div>

            <div className="overflow-x-auto rounded-2xl" style={{ border: `1px solid ${LINE}` }}>
                <table className="min-w-full text-sm">
                    <thead style={{ background: PAPER_2 }}>
                        <tr>
                            {["Adset", "Type", "Targeting", "Exclusions"].map((h) => (
                                <th key={h} className="text-left" style={{ padding: "11px 14px", fontSize: 10, fontWeight: 600, color: MUTED, borderBottom: `1px solid ${LINE}` }}>{h}</th>
                            ))}
                            <th className="text-right" style={{ padding: "11px 14px", fontSize: 10, fontWeight: 600, color: MUTED, borderBottom: `1px solid ${LINE}` }}>30d Spend</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((adset, idx) => (
                            <tr key={adset.id} style={{ borderTop: idx === 0 ? 0 : `1px solid ${LINE}` }}>
                                <td className="font-medium" style={{ padding: "12px 14px", color: INK, fontSize: 12.5, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={adset.name}>
                                    {adset.name}
                                </td>
                                <td style={{ padding: "12px 14px" }}>
                                    <span
                                        style={{
                                            display: "inline-block",
                                            padding: "2px 8px 3px",
                                            fontSize: 10,
                                            fontWeight: 700,
                                            borderRadius: 6,
                                            background: adset.type === "prospecting" ? ORANGE_SOFT : PINK_SOFT,
                                            color: adset.type === "prospecting" ? ORANGE_DEEP : PINK_DEEP,
                                        }}
                                    >
                                        {adset.type === "prospecting" ? "Pros" : "Retas"}
                                    </span>
                                </td>
                                <td style={{ padding: "12px 14px", color: INK_2, fontSize: 12.5, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={adset.targetingSummary}>
                                    {adset.targetingSummary}
                                </td>
                                <td style={{ padding: "12px 14px", color: INK_2, fontSize: 12.5, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={adset.exclusions.join(", ")}>
                                    {adset.exclusions.length
                                        ? adset.exclusions.slice(0, 2).join(", ") + (adset.exclusions.length > 2 ? "…" : "")
                                        : <span style={{ color: MUTED_2 }}>—</span>}
                                </td>
                                <td className="tabular-nums" style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: INK, fontSize: 12.5 }}>
                                    {fmt$(adset.spend30d)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filtered.length > 8 && (
                <button
                    onClick={() => setShowAll(v => !v)}
                    style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: ORANGE, background: "transparent", border: 0, cursor: "pointer", padding: 0 }}
                >
                    {showAll ? "Show less" : `Show all ${filtered.length} adsets`}
                </button>
            )}
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5: LEARNING PHASE
// ═════════════════════════════════════════════════════════════════════════════

function LearningSection({ learning }) {
    const pct = learning.learningSpendPct
    let status = "good"
    if (pct !== null) {
        if (pct >= 0.5) status = "bad"
        else if (pct >= 0.2) status = "warn"
    }
    const cfg = {
        good: { label: "Healthy", color: ORANGE, ring: "rgba(255,72,0,0.06)", border: "rgba(255,72,0,0.30)", textC: ORANGE_DEEP, dotC: ORANGE },
        warn: { label: "Monitor", color: PINK, ring: "rgba(240,13,85,0.06)", border: "rgba(240,13,85,0.30)", textC: PINK_DEEP, dotC: PINK },
        bad: { label: "Action needed", color: PINK, ring: "rgba(240,13,85,0.08)", border: "rgba(240,13,85,0.40)", textC: PINK_DEEP, dotC: PINK },
    }[status]

    return (
        <SectionCard id="learning">
            <SectionHeader
                title="% of Budget in Learning Phase"
                sub="Last 7 days · ad sets in Learning or Learning Limited (including paused)."
            />

            <div className="flex items-start gap-6">
                <div className="flex-shrink-0 flex flex-col items-center gap-2.5">
                    <DonutRing
                        value={learning.learningSpend}
                        total={learning.totalSpend}
                        color={cfg.color}
                        size={130}
                        centerText={pct !== null ? `${(pct * 100).toFixed(0)}%` : "—"}
                        centerSub="In learning"
                    />
                    <span
                        className="inline-flex items-center gap-1.5"
                        style={{
                            padding: "5px 11px 6px",
                            borderRadius: 999,
                            fontSize: 11.5,
                            fontWeight: 600,
                            background: cfg.ring,
                            border: `1px solid ${cfg.border}`,
                            color: cfg.textC,
                        }}
                    >
                        <span style={{ width: 7, height: 7, borderRadius: 999, background: cfg.dotC }} />
                        {cfg.label}
                    </span>
                </div>

                <div className="flex-1 space-y-3 pt-1">
                    <MetricGrid columns={2}>
                        <MetricCard label="Learning Spend · 7d" value={fmt$(learning.learningSpend)} sub="from Learning / Learning Limited ad sets" />
                        <MetricCard label="Total Spend · 7d" value={fmt$(learning.totalSpend)} sub="all ad sets" />
                    </MetricGrid>
                    <div
                        className="rounded-2xl"
                        style={{ padding: "14px 16px", background: PAPER_2, border: `1px solid ${LINE}`, display: "flex", gap: 10, fontSize: 12, color: INK_2, lineHeight: 1.55 }}
                    >
                        <div style={{ flex: 1 }}>
                            <b style={{ display: "block", fontSize: 10, fontWeight: 700, color: ORANGE_DEEP, marginBottom: 3 }}>
                                &lt; 20% · Healthy
                            </b>
                            Most budget is running in stable, optimized ad sets.
                        </div>
                        <div style={{ flex: 1 }}>
                            <b style={{ display: "block", fontSize: 10, fontWeight: 700, color: PINK_DEEP, marginBottom: 3 }}>
                                20–50% · Monitor
                            </b>
                            Avoid additional structural changes while learning resolves.
                        </div>
                        <div style={{ flex: 1 }}>
                            <b style={{ display: "block", fontSize: 10, fontWeight: 700, color: INK, marginBottom: 3 }}>
                                &gt; 50% · Action
                            </b>
                            Consolidate ad sets or pause new launches.
                        </div>
                    </div>
                </div>
            </div>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 6: COPY UTILIZATION
// ═════════════════════════════════════════════════════════════════════════════

function CopyUtilizationSection({ copyUtilization }) {
    return (
        <SectionCard id="copy">
            <SectionHeader
                title="Copy Utilization"
                sub="Top 10 ads by 30-day spend · primary text and headline field usage."
            />
            <div className="flex items-center gap-6">
                <DonutRing
                    value={copyUtilization.maximizingCount}
                    total={copyUtilization.totalCount}
                    color={PINK}
                    size={110}
                    centerText={`${copyUtilization.maximizingCount}/${copyUtilization.totalCount}`}
                    centerSub="Maximizing"
                />
                <div className="flex-1">
                    <p style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6, color: INK }}>
                        {copyUtilization.maximizingCount} of {copyUtilization.totalCount} ads are maximizing copy variants
                    </p>
                    <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: MUTED }}>
                        Ads using all 5 primary text variants and 5 headline variants allow Meta&apos;s algorithm to test
                        more combinations, improving delivery efficiency and reducing cost over time.
                        {copyUtilization.totalCount - copyUtilization.maximizingCount > 0 && (
                            <> {copyUtilization.totalCount - copyUtilization.maximizingCount} ads have unused fields — consider duplicating top performers with fresh copy.</>
                        )}
                    </p>
                </div>
            </div>
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 7: OPPORTUNITIES
// ═════════════════════════════════════════════════════════════════════════════

function StyledOpportunitiesContent({ text }) {
    if (!text) return <p style={{ fontSize: 13, color: MUTED_2, fontStyle: "italic" }}>No opportunities generated yet.</p>

    const lines = text.split("\n")
    const blocks = []
    let currentHeading = null
    let currentBullets = []

    const flush = () => {
        if (currentHeading || currentBullets.length > 0) {
            blocks.push({ heading: currentHeading, bullets: [...currentBullets] })
            currentHeading = null
            currentBullets = []
        }
    }

    for (const raw of lines) {
        const line = raw.trim()
        if (!line) continue
        const headingMatch = line.match(/^\*\*(.+?)\*\*$/)
        if (headingMatch) { flush(); currentHeading = headingMatch[1]; continue }
        const bulletMatch = line.match(/^[•*-]\s*(.+)/)
        if (bulletMatch) { currentBullets.push(bulletMatch[1]); continue }
        if (currentHeading) currentBullets.push(line)
        else { flush(); currentHeading = line }
    }
    flush()

    return (
        <div>
            {blocks.map((block, bi) => (
                <div key={bi} style={{ marginTop: bi === 0 ? 0 : 16 }}>
                    {block.heading && (
                        <h4 style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "0 0 8px", fontSize: 13.5, fontWeight: 700, letterSpacing: "-0.01em", color: INK }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: ORANGE }}>
                                {String(bi + 1).padStart(2, "0")}
                            </span>
                            {block.heading}
                        </h4>
                    )}
                    {block.bullets.length > 0 && (
                        <ul style={{ margin: 0, padding: "0 0 0 14px", listStyle: "none", borderLeft: `1px solid ${LINE}`, marginLeft: 5 }}>
                            {block.bullets.map((b, i) => (
                                <li key={i} style={{ fontSize: 12.5, lineHeight: 1.55, color: INK_2, marginBottom: 6, position: "relative" }}>
                                    <span
                                        style={{ position: "absolute", left: -19, top: 8, width: 7, height: 1, background: LINE_2 }}
                                    />
                                    {b}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}
        </div>
    )
}

function OpportunitiesSection({ text, isLoading, error }) {
    return (
        <SectionCard id="opportunities">
            <SectionHeader
                title="Areas of Opportunity"
                sub="AI-generated analysis based on account performance data."
            />
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                    <div style={{ marginBottom: 12 }}><Helix size="40" speed="2.5" color={BLUE} /></div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: INK_2, margin: 0 }}>Generating suggestions…</p>
                    <p style={{ fontSize: 11.5, color: MUTED, marginTop: 4 }}>Analyzing your account data with AI</p>
                </div>
            )}
            {error && (
                <p style={{ fontSize: 13, color: PINK_DEEP, background: PINK_SOFT, padding: "8px 12px", borderRadius: 10, border: `1px solid ${PINK_SOFT}`, marginBottom: 12 }}>
                    {error}
                </p>
            )}
            {!isLoading && text && (
                <div style={{ background: PAPER_2, border: `1px solid ${LINE}`, borderRadius: 18, padding: "20px 22px" }}>
                    <StyledOpportunitiesContent text={text} />
                </div>
            )}
            {!isLoading && !text && !error && (
                <p style={{ fontSize: 13, color: MUTED_2, fontStyle: "italic", textAlign: "center", padding: "32px 0" }}>
                    Opportunities will appear here after the report loads…
                </p>
            )}
        </SectionCard>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export default function AdAccountAudit({
    open, onOpenChange, adAccountId, adAccountName,
    kpiType = "cpa", conversionEvent = null, targetCPA = null, targetROAS = null,
}) {
    const [report, setReport] = useState(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState(null)
    const [opportunitiesText, setOpportunitiesText] = useState("")
    const [isLoadingOpps, setIsLoadingOpps] = useState(false)
    const [oppsError, setOppsError] = useState(null)

    const kpiTarget = kpiType === "cpa" ? targetCPA : targetROAS

    useEffect(() => {
        if (open && adAccountId && !report && !isGenerating) generateReport()
        if (!open) {
            setReport(null); setError(null); setOpportunitiesText("")
            setOppsError(null)
        }
    }, [open, adAccountId])

    const generateReport = async () => {
        setIsGenerating(true); setError(null); setReport(null); setOpportunitiesText("")
        const params = new URLSearchParams({ adAccountId, kpiType })
        if (kpiType === "cpa" && conversionEvent) params.set("conversionEvent", conversionEvent)
        try {
            const res = await fetch(`${API_BASE_URL}/api/analytics/audit/report?${params}`, { credentials: "include" })
            if (!res.ok) { const err = await res.json(); setError(err.error || "Failed to generate report"); return }
            const data = await res.json()
            setReport(data); fetchOpportunities(data)
        } catch { setError("Network error — please try again.") }
        finally { setIsGenerating(false) }
    }

    const fetchOpportunities = async (reportData) => {
        setIsLoadingOpps(true); setOppsError(null)
        try {
            const res = await fetch(`${API_BASE_URL}/api/analytics/audit/opportunities`, {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({
                    accountName: adAccountName, kpiType, kpiTarget: kpiTarget || "",
                    conversionEvent: kpiType === "cpa" ? conversionEvent : "",
                    traffic: reportData.traffic, funnel: reportData.funnel, monthlySpend: reportData.monthlySpend,
                    audience: reportData.audience, learning: reportData.learning, copyUtilization: reportData.copyUtilization,
                }),
            })
            if (!res.ok) { const err = await res.json(); setOppsError(err.error || "Failed to generate opportunities") }
            else { const data = await res.json(); setOpportunitiesText(data.opportunities || "") }
        } catch { setOppsError("Network error — could not generate opportunities.") }
        finally { setIsLoadingOpps(false) }
    }

    const reportDate = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })

    if (!open) return null

    return (
        <>
            <div
                onClick={() => onOpenChange(false)}
                style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh", background: "rgba(15,17,21,0.55)", zIndex: 50 }}
            />
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ fontFamily: FONT }}
                onClick={() => onOpenChange(false)}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-[1080px] max-h-[92vh] overflow-hidden flex flex-col"
                    style={{
                        background: PAPER,
                        borderRadius: 24,
                        border: `1px solid ${LINE}`,
                        animation: "auditSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                >
                    {/* Sticky header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
                        <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                            <div
                                className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-white border border-gray-200 shadow-xs"
                            >
                                <img src={Audit} alt="" className="w-[18px] h-[18px]" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-[16px] font-bold text-gray-900 truncate leading-tight">
                                    {adAccountName || "Ad Account Audit"}
                                </h2>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    Ad Account Audit · {reportDate}
                                    {kpiTarget && (
                                        <span
                                            className="ml-2 px-2.5 py-0.5 text-[10px] font-semibold rounded-full"
                                            style={{ background: "#eff6ff", color: "#1d4ed8" }}
                                        >
                                            Target {kpiType.toUpperCase()}: {kpiType === "cpa" ? `$${kpiTarget}` : `${kpiTarget}×`}
                                            {kpiType === "cpa" && conversionEvent ? ` · ${formatEventName(conversionEvent)}` : ""}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {report && !isGenerating && (
                                <Button variant="outline" size="sm" onClick={generateReport} className="rounded-2xl text-xs gap-1.5 h-9">
                                    <FileBarChart2 className="w-3.5 h-3.5" />
                                    Re-run Audit
                                </Button>
                            )}
                            <button
                                onClick={() => onOpenChange(false)}
                                className="w-9 h-9 rounded-[10px] bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 flex overflow-hidden min-h-0">
                        <div
                            className="flex-1 overflow-y-auto custom-scrollbar"
                            style={{ padding: 28, background: PAPER_2, fontFamily: FONT }}
                        >
                            {isGenerating && (
                                <div className="flex flex-col items-center justify-center py-24">
                                    <div style={{ marginBottom: 12 }}><Helix size="44" speed="2.5" color={BLUE} /></div>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: INK_2, margin: 0 }}>Fetching account data from Meta…</p>
                                    <p style={{ fontSize: 11.5, color: MUTED, marginTop: 4 }}>This usually takes 5–15 seconds</p>
                                </div>
                            )}
                            {error && !isGenerating && (
                                <div style={{ background: PINK_SOFT, border: `1px solid ${PINK_SOFT}`, color: PINK_DEEP, fontSize: 13, borderRadius: 16, padding: "12px 16px" }}>
                                    {error}
                                    <button
                                        onClick={generateReport}
                                        style={{ marginLeft: 12, textDecoration: "underline", color: PINK_DEEP, fontWeight: 600, background: "transparent", border: 0, cursor: "pointer" }}
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                            {report && !isGenerating && (
                                <div className="flex flex-col gap-5" style={{ animation: "auditFadeIn 0.4s ease" }}>
                                    <SummarySection report={report} kpiType={report.kpiType || kpiType} kpiTarget={kpiTarget} />
                                    <TrafficSection traffic={report.traffic} />
                                    <FunnelSection funnel={report.funnel} />
                                    <MonthlySpendSection monthlySpend={report.monthlySpend} kpiType={report.kpiType || kpiType} kpiTarget={kpiTarget} />
                                    <AudienceSection audience={report.audience} />
                                    <LearningSection learning={report.learning} />
                                    {report.copyUtilization && <CopyUtilizationSection copyUtilization={report.copyUtilization} />}
                                    <OpportunitiesSection text={opportunitiesText} isLoading={isLoadingOpps} error={oppsError} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes auditSlideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes auditFadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    )
}
