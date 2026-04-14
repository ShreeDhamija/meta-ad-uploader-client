"use client"

import { useState, useEffect, useCallback } from "react"
import { Helix } from "ldrs/react"
import "ldrs/react/Helix.css"
import { RefreshCw, FileDiff, FileText } from "lucide-react"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'

// ── Inline bold renderer ──
function renderInlineBold(text) {
    const parts = text.split(/\*\*(.*?)\*\*/g)
    return parts.map((part, i) =>
        i % 2 === 1
            ? <strong key={i} className="font-semibold text-gray-900">{part}</strong>
            : <span key={i}>{part}</span>
    )
}

// ── Extract bullets from a text block ──
function extractBullets(text) {
    return text
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.startsWith("•") || l.startsWith("-"))
        .map(l => l.replace(/^[•\-]\s*/, ""))
}

// ── Parse the summary into two guaranteed sections ──
function parseSections(summary) {
    const splitMarker = "**Up Next (suggested)**"
    const idx = summary.indexOf(splitMarker)

    if (idx === -1) {
        return { changes: extractBullets(summary), suggestions: [] }
    }

    const changesPart = summary.slice(0, idx)
    const suggestionsPart = summary.slice(idx + splitMarker.length)

    return {
        changes: extractBullets(changesPart),
        suggestions: extractBullets(suggestionsPart),
    }
}

/**
 * AccountSummaryDialog
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - adAccountId: string
 */
export default function AccountSummaryDialog({ open, onClose, adAccountId }) {
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [generatedAt, setGeneratedAt] = useState(null)

    const fetchSummary = useCallback(async () => {
        if (!adAccountId) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/analytics/account-change-summary?adAccountId=${adAccountId}`,
                { credentials: 'include' }
            )
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to generate summary')
            setSummary(data.summary)
            setGeneratedAt(new Date().toLocaleString())
        } catch (err) {
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }, [adAccountId])

    // Auto-fetch on first open if no summary cached
    useEffect(() => {
        if (open && !summary && !loading) {
            fetchSummary()
        }
    }, [open, adAccountId])

    // Reset when account changes
    useEffect(() => {
        setSummary(null)
        setError(null)
        setGeneratedAt(null)
    }, [adAccountId])

    if (!open) return null

    const sections = summary ? parseSections(summary) : null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed bg-black/50 z-50"
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100dvh",
                }}
                onClick={onClose}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-[40px] shadow-2xl w-full max-w-[560px] max-h-[85vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-8 pb-0 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div
                                className="flex h-12 w-12 items-center justify-center rounded-full border"
                                style={{
                                    background: "linear-gradient(180deg, #5BC1FF 0%, #16A1F9 100%)",
                                    borderColor: "#5CA0FF",
                                    boxShadow: "0px 1px 4px 0px rgba(0, 0, 0, 0.2)",
                                }}
                            >
                                <FileDiff className="h-5 w-5 text-white" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-[20px] font-bold leading-tight text-gray-900">
                                    Account Summary
                                </h2>
                                <p className="text-[14px] font-semibold text-gray-500">
                                    Recap of changes over the last 7 days
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {summary && !loading && (
                                <button
                                    onClick={fetchSummary}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                                    title="Regenerate"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto min-h-0 px-8 py-6">
                        {loading && !summary && (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Helix size="36" speed="2.5" color="#3b82f6" />
                                <p className="text-sm text-gray-500">Generating summary...</p>
                                <p className="text-xs text-gray-400">This may take a few seconds</p>
                            </div>
                        )}

                        {loading && summary && (
                            <div className="mb-3 flex items-center gap-2 text-xs text-blue-600">
                                <Helix size="16" speed="2.5" color="#2563eb" />
                                Regenerating...
                            </div>
                        )}

                        {error && (
                            <div className="text-center py-8">
                                <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                                    {error}
                                </p>
                                <button
                                    onClick={fetchSummary}
                                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {!loading && !error && !summary && (
                            <div className="text-center py-12">
                                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">
                                    Click below to generate a summary of recent account changes.
                                </p>
                                <button
                                    onClick={fetchSummary}
                                    className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                                >
                                    Generate Summary
                                </button>
                            </div>
                        )}

                        {sections && (
                            <div className="space-y-4">
                                {/* Section 1: What changed */}
                                <div className="p-1">
                                    <ul className="space-y-2.5">
                                        {sections.changes.map((bullet, i) => (
                                            <li key={i} className="flex gap-2.5 text-[14px] font-medium text-gray-700 leading-[180%]">
                                                <span className="flex-shrink-0 mt-0.5 text-gray-400">•</span>
                                                <span>{renderInlineBold(bullet)}</span>
                                            </li>
                                        ))}
                                        {sections.changes.length === 0 && (
                                            <li className="text-[14px] font-medium italic text-gray-400">No changes detected.</li>
                                        )}
                                    </ul>
                                </div>

                                {/*
                                Section 2: Suggestions
                                {sections.suggestions.length > 0 && (
                                    <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-5">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                                                <Lightbulb className="w-4 h-4 text-amber-600" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-amber-900">Up Next</h3>
                                        </div>
                                        <ul className="space-y-2.5">
                                            {sections.suggestions.map((bullet, i) => (
                                                <li key={i} className="flex gap-2.5 text-sm text-amber-900/80 leading-relaxed">
                                                    <span className="text-amber-400 flex-shrink-0 mt-0.5">•</span>
                                                    <span>{renderInlineBold(bullet)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                */}

                                {generatedAt && (
                                    <p className="text-xs text-gray-400 text-center pt-1">
                                        Generated {generatedAt}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom bar — entire bar is clickable */}
                    <div
                        onClick={onClose}
                        className="flex-shrink-0 bg-blue-600 px-8 py-4 flex items-center justify-center gap-6 rounded-b-[40px] cursor-pointer"
                    >
                        <span className="text-white text-sm font-medium">Close</span>
                    </div>
                </div>
            </div>
        </>
    )
}
