"use client"

/* eslint-disable react/prop-types */

import { useEffect, useMemo, useRef, useState } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { ArrowDown, ArrowUp, Check, ChevronDown, CirclePlus, Copy, Loader, Type } from "lucide-react"
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
const TEXT_PREVIEW_CHARS = 750

const COPY_TYPES = [
    { key: "primary", label: "Primary text", plural: "primary text", templateKey: "primaryTexts" },
    { key: "headline", label: "Headline", plural: "headlines", templateKey: "headlines" },
    { key: "description", label: "Description", plural: "descriptions", templateKey: "descriptions" },
]

// `best` is the direction a column sorts in on first click (best first).
const SORT_COLUMNS = {
    spend: { value: c => c.spend, best: "desc" },
    results: { value: c => c.results, best: "desc" },
    cpa: { value: c => c.cpa, best: "asc" },
    roas: { value: c => c.roas, best: "desc" },
    ctr: { value: c => c.ctr, best: "desc" },
    ads: { value: c => c.adCount, best: "desc" },
}

const defaultSort = isRoasMode => (isRoasMode ? { key: "roas", dir: "desc" } : { key: "cpa", dir: "asc" })

// Missing values (e.g. no CPA without results) always sort last; ties go to spend.
function sortCopies(copies, sort) {
    const { value } = SORT_COLUMNS[sort.key]
    const sign = sort.dir === "asc" ? 1 : -1
    return [...copies].sort((a, b) => {
        const av = value(a)
        const bv = value(b)
        if (av == null && bv == null) return b.spend - a.spend
        if (av == null) return 1
        if (bv == null) return -1
        return (av - bv) * sign || b.spend - a.spend
    })
}

const emptySelection = () => ({ primary: [], headline: [], description: [] })

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
                <span className="underline decoration-gray-300 decoration-dotted underline-offset-4">{label}</span>
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

// Cut at the last word break before the limit, unless that loses too much.
function previewText(text) {
    if (text.length <= TEXT_PREVIEW_CHARS) return null
    const cut = text.slice(0, TEXT_PREVIEW_CHARS)
    const lastBreak = cut.search(/\s\S*$/)
    return (lastBreak > TEXT_PREVIEW_CHARS * 0.8 ? cut.slice(0, lastBreak) : cut).trimEnd()
}

function CopyText({ text }) {
    const [expanded, setExpanded] = useState(false)
    const [copied, setCopied] = useState(false)
    const preview = useMemo(() => previewText(text), [text])

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
            <p className="whitespace-pre-line text-sm leading-snug text-gray-800">
                {preview && !expanded ? `${preview}… ` : text}
                {preview && (
                    <button
                        type="button"
                        onClick={() => setExpanded(e => !e)}
                        className={cn("font-medium text-blue-600 hover:text-blue-700", expanded && "ml-1")}
                    >
                        {expanded ? "View less" : "View more"}
                    </button>
                )}
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

function AdCount({ copy }) {
    return (
        <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
                <span className="cursor-default underline decoration-gray-300 decoration-dotted underline-offset-4">
                    {copy.adCount}
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

// Copy-column header that doubles as the copy-type switcher. While picking
// copy for a template each tab shows how many of that type are selected.
function TypeTabs({ value, onChange, selection }) {
    const options = COPY_TYPES.map(type => {
        const count = selection?.[type.key]?.length
        return {
            key: type.key,
            label: selection ? (
                <>
                    {type.label}
                    <span className={cn("ml-1", count ? "text-blue-600" : "text-gray-400")}>{count}/{MAX_PER_TYPE}</span>
                </>
            ) : type.label,
        }
    })
    return <SegmentedToggle options={options} value={value} onChange={onChange} />
}

function SortHeader({ column, label, sort, onSort }) {
    const active = sort?.key === column
    const bestFirst = active && sort.dir === SORT_COLUMNS[column].best
    return (
        <button
            type="button"
            onClick={() => onSort(column)}
            className={cn("inline-flex items-center gap-1 transition-colors hover:text-gray-800", active && "text-gray-800")}
        >
            {label}
            {active && (bestFirst
                ? <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
                : <ArrowUp className="h-3.5 w-3.5 text-blue-600" />)}
        </button>
    )
}

function CopyTable({ copies, isRoasMode, copyHeader, resultsHint, body, leading, sort, onSort, maxHeight = "max-h-[60vh]" }) {
    const th = "whitespace-nowrap border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs font-medium text-gray-500"
    const td = "whitespace-nowrap border-b border-gray-100 px-4 py-3 text-left align-top text-sm text-gray-800"
    const columnCount = isRoasMode ? 7 : 6
    const header = (column, label) => <SortHeader column={column} label={label} sort={sort} onSort={onSort} />
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200">
            <ScrollArea viewportClassName={maxHeight}>
                <table className="w-full border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th className={cn(th, "w-[52%] min-w-[300px] border-r py-2")}>{copyHeader}</th>
                            <th className={th}>{header("spend", "Spend")}</th>
                            <th className={th}>{header("results", <HeaderHint label="Results" hint={resultsHint} />)}</th>
                            <th className={th}>{header("cpa", "CPA")}</th>
                            {isRoasMode && <th className={th}>{header("roas", "ROAS")}</th>}
                            <th className={th}>{header("ctr", "CTR")}</th>
                            <th className={th}>{header("ads", "Ads")}</th>
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
                                <td className={td}><AdCount copy={copy} /></td>
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
    const isRoasMode = mode === "roas"
    const [days, setDays] = useState(30)
    const [sort, setSort] = useState(() => defaultSort(isRoasMode))
    const [copyType, setCopyType] = useState("primary")
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [showUnderperforming, setShowUnderperforming] = useState(false)
    const [selecting, setSelecting] = useState(false)
    const [selection, setSelection] = useState(emptySelection)
    const [templateName, setTemplateName] = useState("")
    const [saving, setSaving] = useState(false)
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

    // The ROAS column only exists in ROAS mode, so reset to that mode's default.
    useEffect(() => { setSort(defaultSort(isRoasMode)) }, [isRoasMode])

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

    const handleSort = (column) => {
        setSort(prev => prev.key === column
            ? { key: column, dir: prev.dir === "asc" ? "desc" : "asc" }
            : { key: column, dir: SORT_COLUMNS[column].best })
    }

    const view = data?.types?.[copyType]
    const copies = useMemo(() => (view ? sortCopies(view.copies, sort) : []), [view, sort])
    const underperforming = useMemo(() => (view ? sortCopies(view.underperforming, sort) : []), [view, sort])

    const resultsHint = data?.conversionEvent
        ? "Conversions of your selected event (7-day click, 1-day view), summed across every ad that ran this text."
        : "Purchases (7-day click, 1-day view), summed across every ad that ran this text."

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

    const hasUnderperforming = view?.underperformingCount > 0
    const canCreateTemplate = !loading && Object.values(data?.types || {}).some(t => t.copies?.length > 0)

    return (
        <TooltipProvider delayDuration={150}>
            <Card className={cn("rounded-3xl border-gray-200", className)}>
                <CardContent className="p-6">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
                        <div>
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                <Type className="h-5 w-5 text-purple-500" />
                                Top Ad Copy
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Copy ranked by {kpiLabel} across every ad that ran it, last {days} days.
                            </p>
                        </div>
                        <SegmentedToggle
                            options={WINDOWS.map(w => ({ key: w, label: `${w}d` }))}
                            value={days}
                            onChange={setDays}
                        />
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
                                resultsHint={resultsHint}
                                body={tableBody}
                                leading={leading}
                                sort={sort}
                                onSort={handleSort}
                                copyHeader={
                                    <TypeTabs value={copyType} onChange={setCopyType} selection={selecting ? selection : null} />
                                }
                            />

                            {(hasUnderperforming || canCreateTemplate) && (
                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                    {hasUnderperforming && (
                                        <button
                                            type="button"
                                            onClick={() => setShowUnderperforming(s => !s)}
                                            className="flex items-center gap-1.5 px-1 text-sm font-medium text-gray-600 hover:text-gray-900"
                                        >
                                            <ChevronDown className={cn("h-4 w-4 transition-transform", showUnderperforming && "rotate-180")} />
                                            Underperforming {type.plural} ({view.underperformingCount})
                                        </button>
                                    )}

                                    {canCreateTemplate && (
                                        <div className="ml-auto flex flex-wrap items-center gap-2">
                                            {selecting ? (
                                                <>
                                                    <Input
                                                        value={templateName}
                                                        onChange={(e) => setTemplateName(e.target.value)}
                                                        placeholder="Template name (required)"
                                                        className="h-9 w-[240px] rounded-xl border border-gray-300 bg-white py-2 shadow"
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
                                                </>
                                            ) : (
                                                <Button
                                                    className="h-9 rounded-xl bg-zinc-800 text-white hover:bg-black"
                                                    onClick={() => setSelecting(true)}
                                                >
                                                    <CirclePlus className="h-4 w-4" />
                                                    Create template from top copy
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {selecting && canCreateTemplate && (
                                <p className={cn("mt-1.5 text-right text-xs", nameExists ? "text-rose-500" : "text-gray-400")}>
                                    {nameExists
                                        ? "This template name already exists"
                                        : selection.primary.length === 0
                                            ? `Select at least one primary text. Up to ${MAX_PER_TYPE} of each type.`
                                            : `Up to ${MAX_PER_TYPE} of each type. Switch tabs in the table header to pick headlines and descriptions.`}
                                </p>
                            )}

                            {hasUnderperforming && showUnderperforming && (
                                <div className="mt-3">
                                    <p className="mb-2 px-1 text-xs text-gray-400">
                                        Spent {formatSpend(data.thresholds.underperformingSpend)}+ (2× the account&apos;s cost per result) with
                                        fewer than {data.thresholds.minResults} results, and doing worse than the account on {kpiLabel}.
                                    </p>
                                    <CopyTable
                                        copies={underperforming}
                                        isRoasMode={isRoasMode}
                                        resultsHint={resultsHint}
                                        sort={sort}
                                        onSort={handleSort}
                                        copyHeader={type.label}
                                        maxHeight="max-h-[40vh]"
                                    />
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    )
}
