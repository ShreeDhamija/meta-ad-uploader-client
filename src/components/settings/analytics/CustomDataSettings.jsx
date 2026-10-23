"use client"

/* eslint-disable react/prop-types */

// ════════════════════════════════════════════════════════════════════════════
// FEATURE START: CUSTOM DATA + CUSTOM METRICS (added 2026-10-23)
// ----------------------------------------------------------------------------
// The "Custom Data" section of the Optimization Focus popup: link a Google
// Sheet, pick which of its columns to show, and create / delete custom
// metrics. Edits stay in the popup's temp state and are written by its
// "Save Settings" button (adAccountSettings.customDataSource / customMetrics).
// Selected columns and custom metrics appear as scorecards above the charts
// and as lines on the Custom Data chart under them.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react"
import { Database, ExternalLink, Loader2, Plus, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { buildVariables, formulaToDisplay } from "./customMetrics"
import CustomMetricBuilder from "./CustomMetricBuilder"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com';

const inputClasses = "w-full px-3 py-2.5 border border-gray-300 rounded-2xl bg-white text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

const FORMAT_LABELS = { currency: "$", number: "#", percent: "%" }

function isGoogleSheetUrl(url) {
    try {
        const u = new URL(url)
        return u.hostname.toLowerCase() === "docs.google.com" && u.pathname.startsWith("/spreadsheets")
    } catch {
        return false
    }
}

async function fetchSheetColumns(sheetUrl) {
    const res = await fetch(
        `${API_BASE_URL}/api/analytics/custom-data?sheetUrl=${encodeURIComponent(sheetUrl)}`,
        { credentials: 'include' }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Could not read the sheet')
    return data
}

export default function CustomDataSettings({ source, onSourceChange, customMetrics, onCustomMetricsChange, previewCtx }) {
    const [urlInput, setUrlInput] = useState("")
    const [nameInput, setNameInput] = useState("")
    const [connecting, setConnecting] = useState(false)
    const [connectError, setConnectError] = useState(null)
    const [sheetColumns, setSheetColumns] = useState(null) // every column the sheet has now
    const [sheetWarning, setSheetWarning] = useState(null)
    const [builderOpen, setBuilderOpen] = useState(false)
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)

    // Re-read the linked sheet's columns so newly added ones can be picked.
    const sheetUrl = source?.sheetUrl || null
    useEffect(() => {
        if (!sheetUrl) { setSheetColumns(null); setSheetWarning(null); return }
        let cancelled = false
        fetchSheetColumns(sheetUrl)
            .then((data) => {
                if (cancelled) return
                setSheetColumns(data.columns || [])
                setSheetWarning(data.error || null)
            })
            .catch((err) => { if (!cancelled) setSheetWarning(err.message) })
        return () => { cancelled = true }
    }, [sheetUrl])

    const handleConnect = async () => {
        const url = urlInput.trim()
        if (!isGoogleSheetUrl(url)) {
            setConnectError("Paste a Google Sheets link (https://docs.google.com/spreadsheets/d/…)")
            return
        }
        setConnecting(true)
        setConnectError(null)
        try {
            const data = await fetchSheetColumns(url)
            if (!data.columns?.length) {
                setConnectError(data.error || "No metric columns found in the sheet.")
                return
            }
            setSheetColumns(data.columns)
            setSheetWarning(data.error || null)
            onSourceChange({ sheetUrl: url, sheetName: nameInput.trim() || null, columns: data.columns })
            setUrlInput("")
            setNameInput("")
        } catch (err) {
            setConnectError(err.message)
        } finally {
            setConnecting(false)
        }
    }

    const selected = source?.columns || []
    // Columns picked earlier but no longer in the sheet stay listed so they can be unticked.
    const listedColumns = useMemo(() => {
        const all = [...(sheetColumns || [])]
        for (const c of selected) if (!all.includes(c)) all.push(c)
        return all
    }, [sheetColumns, selected])

    const toggleColumn = (col, checked) => {
        const next = checked
            ? listedColumns.filter((c) => c === col || selected.includes(c))
            : selected.filter((c) => c !== col)
        onSourceChange({ ...source, columns: next })
    }

    const variables = useMemo(
        () => buildVariables({ sheetColumns: sheetColumns || selected, customMetrics }),
        [sheetColumns, selected, customMetrics]
    )

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    Custom Data
                </h3>
                <p className="text-xs text-gray-500 pl-6">
                    Selected sheet columns and custom metrics show as scorecards and on the Custom Data chart.
                </p>
            </div>

            <div className="space-y-4 pl-6">
                {/* ── Google Sheet ── */}
                <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Google Sheet</p>
                    {source?.sheetUrl ? (
                        <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100">
                            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                                <a
                                    href={source.sheetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 min-w-0 text-sm font-medium text-blue-600 hover:underline"
                                >
                                    <span className="truncate">{source.sheetName || "Google Sheet"}</span>
                                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => onSourceChange(null)}
                                    className="flex-shrink-0 text-xs text-red-500 hover:text-red-600 font-medium"
                                >
                                    Disconnect
                                </button>
                            </div>
                            <div className="px-3.5 py-2.5 space-y-2">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Columns to show</p>
                                {sheetColumns === null && !sheetWarning ? (
                                    <div className="flex items-center gap-2 py-1">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                                        <span className="text-xs text-gray-400">Reading sheet...</span>
                                    </div>
                                ) : listedColumns.length === 0 ? (
                                    <p className="text-xs text-gray-400">No metric columns found.</p>
                                ) : (
                                    <div className="max-h-[150px] overflow-y-auto space-y-1.5 custom-scrollbar">
                                        {listedColumns.map((col) => {
                                            const missing = sheetColumns && !sheetColumns.includes(col)
                                            return (
                                                <label key={col} className="flex items-center gap-2.5 cursor-pointer">
                                                    <Checkbox
                                                        checked={selected.includes(col)}
                                                        onCheckedChange={(checked) => toggleColumn(col, checked === true)}
                                                    />
                                                    <span className={missing ? "text-sm text-gray-400 line-through" : "text-sm text-gray-700"}>{col}</span>
                                                    {missing && <span className="text-[10px] text-gray-400">not in sheet</span>}
                                                </label>
                                            )
                                        })}
                                    </div>
                                )}
                                {sheetWarning && (
                                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">{sheetWarning}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <input
                                type="url"
                                value={urlInput}
                                onChange={(e) => { setUrlInput(e.target.value); setConnectError(null) }}
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                className={inputClasses}
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    placeholder="Sheet name (optional)"
                                    className={inputClasses}
                                />
                                <button
                                    type="button"
                                    onClick={handleConnect}
                                    disabled={!urlInput.trim() || connecting}
                                    className="flex h-[42px] flex-shrink-0 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                                >
                                    {connecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Connect
                                </button>
                            </div>
                            {connectError && <p className="text-xs text-red-500">{connectError}</p>}
                            <p className="text-[11px] text-gray-400 leading-snug">
                                Share the sheet as &ldquo;Anyone with the link can view&rdquo;. First column = date (e.g. YYYY-MM-DD), other columns = numbers.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Custom metrics ── */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-gray-600">Custom Metrics</p>
                        <button
                            type="button"
                            onClick={() => setBuilderOpen(true)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-50"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Create Custom Metric
                        </button>
                    </div>
                    {customMetrics.length === 0 ? (
                        <p className="text-xs text-gray-400">
                            No custom metrics yet — e.g. {"{{Spend}} / {{Sales}}"} for a blended CPA. Type @ in the formula to insert a variable.
                        </p>
                    ) : (
                        <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100">
                            {customMetrics.map((m) => (
                                confirmDeleteId === m.id ? (
                                    <div key={m.id} className="flex items-center justify-between gap-2 px-3.5 py-2 bg-red-50">
                                        <span className="text-xs text-red-700 truncate">Delete &ldquo;{m.name}&rdquo;?</span>
                                        <div className="flex gap-1.5 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onCustomMetricsChange(customMetrics.filter((x) => x.id !== m.id))
                                                    setConfirmDeleteId(null)
                                                }}
                                                className="px-2.5 py-0.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600"
                                            >Delete</button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="px-2.5 py-0.5 text-xs bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                                            >Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={m.id} className="flex items-center justify-between gap-3 px-3.5 py-2">
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-700 truncate">
                                                {m.name}
                                                <span className="ml-1.5 text-[10px] text-gray-400">{FORMAT_LABELS[m.format] || "#"} · {m.lowerIsBetter ? "lower is better" : "higher is better"}</span>
                                            </p>
                                            <p className="text-[11px] font-mono text-gray-400 truncate" title={formulaToDisplay(m.formula, variables)}>
                                                {formulaToDisplay(m.formula, variables)}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDeleteId(m.id)}
                                            className="flex-shrink-0 p-1 text-gray-300 hover:text-red-400 transition-colors"
                                            title="Delete custom metric"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {builderOpen && (
                <CustomMetricBuilder
                    variables={variables}
                    customMetrics={customMetrics}
                    previewCtx={previewCtx}
                    onSave={(field) => {
                        onCustomMetricsChange([...customMetrics, field])
                        setBuilderOpen(false)
                    }}
                    onCancel={() => setBuilderOpen(false)}
                />
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// FEATURE END: CUSTOM DATA + CUSTOM METRICS
// ════════════════════════════════════════════════════════════════════════════
