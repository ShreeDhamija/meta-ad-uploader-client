"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, RefreshCw, FileText } from "lucide-react"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.withblip.com'

// ── Markdown-lite renderer (ported from AccountChangeSummary.tsx) ──

function renderInlineBold(text) {
    const parts = text.split(/\*\*(.*?)\*\*/g)
    return parts.map((part, i) =>
        i % 2 === 1
            ? <strong key={i} className="font-semibold text-gray-900">{part}</strong>
            : <span key={i}>{part}</span>
    )
}

function renderSummary(text) {
    const lines = text.split("\n")
    const output = []
    let bulletBuffer = []
    let bufferStart = 0

    function flushBullets() {
        if (bulletBuffer.length === 0) return
        output.push(
            <ul key={`ul-${bufferStart}`} className="mt-2 space-y-1.5">
                {bulletBuffer.map((content, j) => (
                    <li key={j} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                        <span className="text-gray-400 flex-shrink-0">•</span>
                        <span>{renderInlineBold(content)}</span>
                    </li>
                ))}
            </ul>
        )
        bulletBuffer = []
    }

    lines.forEach((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) { flushBullets(); return }

        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
            flushBullets()
            const content = trimmed.slice(2, -2)
            output.push(
                <p key={i} className="font-semibold text-gray-900 mt-5 first:mt-0 text-sm">
                    {content}
                </p>
            )
            return
        }

        if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
            if (bulletBuffer.length === 0) bufferStart = i
            bulletBuffer.push(trimmed.replace(/^[•\-]\s*/, ""))
            return
        }

        flushBullets()
        output.push(
            <p key={i} className="text-sm text-gray-600 mt-1">
                {renderInlineBold(trimmed)}
            </p>
        )
    })

    flushBullets()
    return output
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

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50"
                style={{ top: -25, left: 0, right: 0, bottom: 0, position: 'fixed' }}
                onClick={onClose}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-[28px] shadow-2xl w-full max-w-[560px] max-h-[85vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-8 pb-0 flex items-start justify-between">
                        <div className="space-y-1">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-500" />
                                Account Summary
                            </h2>
                            <p className="text-sm text-gray-500">
                                AI-generated recap of changes over the last 7 days
                            </p>
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
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto min-h-0 px-8 py-6">
                        {loading && !summary && (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                <p className="text-sm text-gray-500">Generating summary...</p>
                                <p className="text-xs text-gray-400">This may take a few seconds</p>
                            </div>
                        )}

                        {loading && summary && (
                            <div className="mb-3 flex items-center gap-2 text-xs text-blue-600">
                                <Loader2 className="w-3 h-3 animate-spin" />
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

                        {summary && (
                            <div>
                                {renderSummary(summary)}
                                {generatedAt && (
                                    <p className="mt-5 text-xs text-gray-400">
                                        Generated {generatedAt}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom bar */}
                    <div className="flex-shrink-0 bg-blue-600 px-8 py-1.5 flex items-center justify-center gap-6 rounded-b-[28px]">
                        <button
                            onClick={onClose}
                            className="text-white text-sm font-medium hover:underline"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}