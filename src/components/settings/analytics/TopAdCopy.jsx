"use client"

/* eslint-disable react/prop-types */

import { useEffect, useMemo, useRef, useState } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { Check, ChevronDown, CirclePlus, Copy, Loader, Type } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { saveCopyTemplate } from "@/lib/saveCopyTemplate"
import { cn } from "@/lib/utils"

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com"

const WINDOWS = [30, 90]
const MAX_PER_TYPE = 5 // copy templates hold up to 5 of each type

const COPY_TYPES = [
    { key: "primary", label: "Primary text", plural: "primary text", templateKey: "primaryTexts" },
    { key: "headline", label: "Headline", plural: "headlines", templateKey: "headlines" },
    { key: "description", label: "Description", plural: "descriptions", templateKey: "descriptions" },
]

const emptySelection = () => ({ primary: [], headline: [], description: [] })

const CONFIDENCE_STYLES = {
    high: "bg-emerald-50 text-emerald-600",
    medium: "bg-amber-50 text-amber-600",
    low: "bg-gray-100 text-gray-500",
}

function formatSpend(v) {
    if (v == null) return "—"
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
    return `$${v.toFixed(0)}`
}

function formatCpa(v) {
    if (v == null) return "—"
    return v >= 100 ? `$${Math.round(v)}` : `$${v.toFixed(2)}`
}

function formatRoas(v) {
    if (v == null) return "—"
    return `${v.toFixed(2)}x`
}

// The route streams NDJSON: a `partial` payload as each copy type is ranked,
// then `complete`. Same event shape as /recommendations.
async function readCopyStream(res, onPayload) {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let finalPayload = null

    const handle = (line) => {
        if (!line.trim()) return
        const event = JSON.parse(line)
        if (event.type === "error") throw new Error(event.error || "Failed to load")
        if (event.payload) onPayload(event.payload)
        if (event.type === "complete") finalPayload = event.payload
    }

    while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""
        lines.forEach(handle)
    }
    handle(buffer)
    return finalPayload
}

function HeaderHint({ label, hint }) {
    return (
        <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
                <span className="cursor-default underline decoration-gray-300 decoration-dotted underline-offset-4">{label}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">{hint}</TooltipContent>
        </Tooltip>
    )
}

function VsAccountBadge({ pct, title }) {
    if (pct == null) return null
    const positive = pct >= 0
    return (
        <span
            title={title}
            className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500",
            )}
        >
            {positive ? "+" : ""}{Math.round(pct)}%
        </span>
    )
}

function CopyText({ text }) {
    const [expanded, setExpanded] = useState(false)
    const [copied, setCopied] = useState(false)
    const long = text.length > 180 || text.split("\n").length > 3

    const handleCopy = () => {
        navigator.clipboard.writeText(text)
            .then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
            })
            .catch(() => toast.error("Couldn't copy the text"))
    }

    return (
        <div className="flex items-start gap-2">
            <p
                className={cn(
                    "whitespace-pre-line text-sm leading-snug text-gray-800",
                    !expanded && "line-clamp-3",
                    long && "cursor-pointer",
                )}
                onClick={() => long && setExpanded(e => !e)}
            >
                {text}
            </p>
            <button
                type="button"
                onClick={handleCopy}
                className="mt-0.5 flex-shrink-0 text-gray-300 transition-colors hover:text-blue-600"
                title="Copy text"
            >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
        </div>
    )
}

function AdsUsing({ copy }) {
    return (
        <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
                <span className="mt-1 inline-block cursor-default text-xs text-gray-400 underline decoration-dotted underline-offset-2">
                    {copy.adCount} {copy.adCount === 1 ? "ad" : "ads"}
                </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm">
                <div className="space-y-1.5">
                    {copy.ads.map(ad => (
                        <div key={ad.adId} className="flex items-center gap-2">
                            {ad.thumbnailUrl ? (
                                <img src={ad.thumbnailUrl} alt="" className="h-7 w-7 flex-shrink-0 rounded object-cover" />
                            ) : (
                                <div className="h-7 w-7 flex-shrink-0 rounded bg-gray-100" />
                            )}
                            <div className="min-w-0">
                                <p className="truncate text-xs font-medium">{ad.adName}</p>
                                <p className="truncate text-[10px] opacity-70">{ad.campaignName} · {formatSpend(ad.spend)}</p>
                            </div>
                        </div>
                    ))}
                    {copy.adCount > copy.ads.length && (
                        <p className="text-[10px] opacity-70">+{copy.adCount - copy.ads.length} more</p>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    )
}

function SegmentedToggle({ options, value, onChange }) {
    return (
        <div className="inline-flex rounded-xl bg-gray-100 p-0.5">
            {options.map(option => (
                <button
                    key={option.key}
                    type="button"
                    onClick={() => onChange(option.key)}
                    className={cn(
                        "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                        value === option.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}

// Copy-column header that doubles as the copy-type switcher.
function TypeTabs({ value, onChange, selection }) {
    return (
        <div className="flex items-center gap-1">
            {COPY_TYPES.map(type => {
                const active = type.key === value
                const count = selection?.[type.key]?.length
                return (
                    <button
                        key={type.key}
                        type="button"
                        onClick={() => onChange(type.key)}
                        className={cn(
                            "rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                            active ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600",
                        )}
                    >
                        {type.label}
                        {selection && (
                            <span className={cn("ml-1", count ? "text-blue-600" : "text-gray-300")}>
                                {count}/{MAX_PER_TYPE}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}

function CopyTable({ copies, isRoasMode, copyHeader, columnHints, body, leading, maxHeight = "max-h-[60vh]" }) {
    const th = "whitespace-nowrap border-b border-gray-200 bg-white px-4 py-2.5 text-left text-xs font-medium text-gray-500"
    const td = "whitespace-nowrap border-b border-gray-100 px-4 py-3 text-left align-top text-sm text-gray-800"
    const columnCount = isRoasMode ? 7 : 6
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200">
            <ScrollArea viewportClassName={maxHeight}>
                <table className="w-full border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th className={cn(th, "w-[48%] min-w-[300px] border-r")}>{copyHeader}</th>
                            <th className={th}>Spend</th>
                            <th className={th}><HeaderHint label="Results" hint={columnHints.results} /></th>
                            <th className={th}>CPA</th>
                            {isRoasMode && <th className={th}>ROAS</th>}
                            <th className={th}>CTR</th>
                            <th className={th}><HeaderHint label="Evidence" hint={columnHints.evidence} /></th>
                        </tr>
                    </thead>
                    <tbody>
                        {body ? (
                            <tr><td colSpan={columnCount} className="px-4 py-10">{body}</td></tr>
                        ) : copies.map((copy, i) => (
                            <tr key={copy.key} className="transition-colors hover:bg-gray-50/70">
                                <td className="border-b border-r border-gray-100 border-r-gray-200 px-4 py-3 align-top">
                                    <div className="flex items-start gap-3">
                                        {leading && <div className="flex w-5 flex-shrink-0 justify-center pt-0.5">{leading(copy, i)}</div>}
                                        <div className="min-w-0 flex-1">
                                            <CopyText text={copy.text} />
                                            <AdsUsing copy={copy} />
                                        </div>
                                    </div>
                                </td>
                                <td className={td}>{formatSpend(copy.spend)}</td>
                                <td className={td}>{copy.results}</td>
                                <td className={td}>
                                    {formatCpa(copy.cpa)}
                                    {!isRoasMode && <VsAccountBadge pct={copy.vsAccountPct} title="vs account CPA" />}
                                </td>
                                {isRoasMode && (
                                    <td className={td}>
                                        {formatRoas(copy.roas)}
                                        <VsAccountBadge pct={copy.vsAccountPct} title="vs account ROAS" />
                                    </td>
                                )}
                                <td className={td}>{copy.ctr != null ? `${copy.ctr.toFixed(2)}%` : "—"}</td>
                                <td className={td}>
                                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize", CONFIDENCE_STYLES[copy.confidence])}>
                                        {copy.confidence}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ScrollArea>
        </div>
    )
}

export default function TopAdCopy({
    adAccountId,
    conversionEvent,
    mode = "cpr",
    refreshKey,
    waiting = false,
    copyTemplates,
    onTemplateSaved,
    className,
}) {
    const [days, setDays] = useState(30)
    const [sortBy, setSortBy] = useState("kpi")
    const [copyType, setCopyType] = useState("primary")
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [showUnderperforming, setShowUnderperforming] = useState(false)
    const [selecting, setSelecting] = useState(false)
    const [selection, setSelection] = useState(emptySelection)
    const [templateName, setTemplateName] = useState("")
    const [saving, setSaving] = useState(false)
    const isRoasMode = mode === "roas"
    const kpiLabel = isRoasMode ? "ROAS" : "CPA"
    const type = COPY_TYPES.find(t => t.key === copyType)

    // Session-scoped cache of complete payloads, keyed like TrendingCreative
    // (refreshKey included so a manual dashboard refresh skips stale entries).
    const cacheRef = useRef({})

    useEffect(() => {
        setSelecting(false)
        setSelection(emptySelection())
        setTemplateName("")
    }, [adAccountId])

    useEffect(() => {
        if (!adAccountId) { setData(null); return }
        // Render the shell immediately; fetch once the conversion event is known.
        if (waiting) { setData(null); setLoading(true); setError(null); return }

        const cacheKey = `${adAccountId}::${mode}::${conversionEvent || "__auto__"}::${days}::${refreshKey || 0}`
        if (cacheRef.current[cacheKey]) {
            setData(cacheRef.current[cacheKey])
            setLoading(false)
            setError(null)
            return
        }

        const controller = new AbortController()
        setData(null)
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({ adAccountId, mode, days: String(days) })
        if (conversionEvent) params.set("conversionEvent", conversionEvent)
        if (refreshKey) params.set("rk", String(refreshKey))

        fetch(`${API_BASE_URL}/api/analytics/top-copy?${params}`, {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
        })
            .then(async res => {
                if (!(res.headers.get("content-type") || "").includes("ndjson")) {
                    const body = await res.json()
                    if (!res.ok) throw new Error(body.error || "Failed to load")
                    return body
                }
                return readCopyStream(res, payload => { if (!controller.signal.aborted) setData(payload) })
            })
            .then(payload => {
                if (controller.signal.aborted) return
                if (!payload) throw new Error("Failed to load")
                cacheRef.current[cacheKey] = payload
                setData(payload)
            })
            .catch(err => {
                if (controller.signal.aborted) return
                setError(err.message || "Error loading data")
            })
            .finally(() => { if (!controller.signal.aborted) setLoading(false) })

        return () => controller.abort()
    }, [adAccountId, conversionEvent, mode, days, refreshKey, waiting])

    const view = data?.types?.[copyType]
    const copies = useMemo(() => {
        if (!view) return []
        if (sortBy !== "used") return view.copies
        return [...view.copies].sort((a, b) => b.adCount - a.adCount || b.spend - a.spend)
    }, [view, sortBy])

    const columnHints = useMemo(() => ({
        results: data?.conversionEvent
            ? "Conversions of your selected event (7-day click, 1-day view), summed across every ad that ran this text."
            : "Purchases (7-day click, 1-day view), summed across every ad that ran this text.",
        evidence: `How many results back this text up: High is 20+, Medium 10–19, Low ${data?.thresholds?.minResults ?? 5}–9. Copy needs ${data?.thresholds?.minResults ?? 5}+ results and ${(data?.thresholds?.minImpressions ?? 1000).toLocaleString()}+ impressions to be ranked.`,
    }), [data?.conversionEvent, data?.thresholds])

    // ── Template selection ──
    const isSelected = (copy) => selection[copyType].some(item => item.key === copy.key)
    const toggleSelected = (copy) => {
        setSelection(prev => {
            const current = prev[copyType]
            const next = current.some(item => item.key === copy.key)
                ? current.filter(item => item.key !== copy.key)
                : current.length >= MAX_PER_TYPE ? current : [...current, { key: copy.key, text: copy.text }]
            return { ...prev, [copyType]: next }
        })
    }

    const trimmedName = templateName.trim()
    const nameExists = Boolean(trimmedName) && Object.prototype.hasOwnProperty.call(copyTemplates || {}, trimmedName)
    const canSave = Boolean(trimmedName) && !nameExists && selection.primary.length > 0 && !saving

    const cancelSelecting = () => {
        setSelecting(false)
        setSelection(emptySelection())
        setTemplateName("")
    }

    const handleSaveTemplate = async () => {
        if (!canSave) return
        const template = { name: trimmedName }
        for (const t of COPY_TYPES) template[t.templateKey] = selection[t.key].map(item => item.text)
        template.addDescriptions = template.descriptions.length > 0

        setSaving(true)
        try {
            await saveCopyTemplate(adAccountId, trimmedName, template)
            onTemplateSaved?.(trimmedName, template)
            toast.success("Template saved")
            cancelSelecting()
        } catch (err) {
            console.error(err)
            toast.error("Failed to save template")
        } finally {
            setSaving(false)
        }
    }

    const leading = selecting
        ? (copy) => {
            const checked = isSelected(copy)
            return (
                <Checkbox
                    checked={checked}
                    disabled={!checked && selection[copyType].length >= MAX_PER_TYPE}
                    onCheckedChange={() => toggleSelected(copy)}
                    aria-label="Select for template"
                />
            )
        }
        : (copy, i) => <span className="text-sm font-semibold text-gray-400">{i + 1}</span>

    const spinner = (
        <div className="flex justify-center">
            <Helix size="32" speed="2.5" color="#a855f7" />
        </div>
    )
    const tableBody = !view
        ? (loading ? spinner : <p className="text-center text-sm text-gray-400">No data</p>)
        : copies.length === 0
            ? <p className="text-center text-sm text-gray-400">No {type.plural} with {data?.thresholds?.minResults ?? 5}+ results in the last {days} days</p>
            : null

    const hasAnyCopies = Object.values(data?.types || {}).some(t => t.copies?.length > 0)

    return (
        <TooltipProvider delayDuration={150}>
            <Card className={cn("rounded-3xl border-gray-200", className)}>
                <CardContent className="p-6">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
                        <div>
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                <Type className="h-5 w-5 text-purple-500" />
                                Top Ad Copy
                                {view?.rankedCount > 0 && (
                                    <span className="text-base font-normal text-gray-400">({view.rankedCount})</span>
                                )}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Copy ranked by {kpiLabel} across every ad that ran it, last {days} days.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <SegmentedToggle
                                options={[{ key: "kpi", label: `Best ${kpiLabel}` }, { key: "used", label: "Most used" }]}
                                value={sortBy}
                                onChange={setSortBy}
                            />
                            <SegmentedToggle
                                options={WINDOWS.map(w => ({ key: w, label: `${w}d` }))}
                                value={days}
                                onChange={setDays}
                            />
                        </div>
                    </div>

                    {error ? (
                        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                    ) : data?.needsConversionEvent ? (
                        <div className="flex h-[160px] items-center justify-center text-center text-sm text-gray-400">
                            Choose a conversion event in Analytics settings to rank copy by CPA.
                        </div>
                    ) : (
                        <>
                            <CopyTable
                                copies={copies}
                                isRoasMode={isRoasMode}
                                columnHints={columnHints}
                                body={tableBody}
                                leading={leading}
                                copyHeader={
                                    <TypeTabs value={copyType} onChange={setCopyType} selection={selecting ? selection : null} />
                                }
                            />

                            {view?.underperformingCount > 0 && (
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowUnderperforming(s => !s)}
                                        className="flex items-center gap-1.5 px-1 text-sm font-medium text-gray-600 hover:text-gray-900"
                                    >
                                        <ChevronDown className={cn("h-4 w-4 transition-transform", showUnderperforming && "rotate-180")} />
                                        Underperforming {type.plural} ({view.underperformingCount})
                                    </button>
                                    {showUnderperforming && (
                                        <>
                                            <p className="mb-2 mt-1 px-1 text-xs text-gray-400">
                                                Spent {formatSpend(data.thresholds.underperformingSpend)}+ (2× the account&apos;s cost per result) with
                                                fewer than {data.thresholds.minResults} results, and doing worse than the account on {kpiLabel}.
                                            </p>
                                            <CopyTable
                                                copies={view.underperforming}
                                                isRoasMode={isRoasMode}
                                                columnHints={columnHints}
                                                copyHeader={type.label}
                                                maxHeight="max-h-[40vh]"
                                            />
                                        </>
                                    )}
                                </div>
                            )}

                            {!loading && hasAnyCopies && (
                                <div className="mt-5 border-t border-gray-100 pt-4">
                                    {selecting ? (
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Input
                                                    value={templateName}
                                                    onChange={(e) => setTemplateName(e.target.value)}
                                                    placeholder="Template name (required)"
                                                    className="h-9 min-w-[220px] flex-1 rounded-xl border border-gray-300 bg-white py-2 shadow"
                                                    disabled={saving}
                                                />
                                                <Button
                                                    variant="outline"
                                                    className="h-9 rounded-xl"
                                                    onClick={cancelSelecting}
                                                    disabled={saving}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    className="h-9 rounded-xl bg-blue-500 text-white hover:bg-blue-600"
                                                    onClick={handleSaveTemplate}
                                                    disabled={!canSave}
                                                >
                                                    {saving ? (
                                                        <>
                                                            <Loader className="h-4 w-4 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : "Save"}
                                                </Button>
                                            </div>
                                            <p className={cn("px-1 text-xs", nameExists ? "text-rose-500" : "text-gray-400")}>
                                                {nameExists
                                                    ? "This template name already exists"
                                                    : selection.primary.length === 0
                                                        ? `Select at least one primary text. Up to ${MAX_PER_TYPE} of each type.`
                                                        : `Up to ${MAX_PER_TYPE} of each type. Switch tabs in the table header to pick headlines and descriptions.`}
                                            </p>
                                        </div>
                                    ) : (
                                        <Button
                                            className="h-10 rounded-[14px] bg-zinc-800 text-white hover:bg-black"
                                            onClick={() => setSelecting(true)}
                                        >
                                            <CirclePlus className="h-4 w-4" />
                                            Create template from top copy
                                        </Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
