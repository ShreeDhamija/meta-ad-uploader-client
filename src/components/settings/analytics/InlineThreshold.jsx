"use client"

/* eslint-disable react/prop-types */

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Per-account chart thresholds, saved under adAccountSettings.analyticsThresholds.
export const DEFAULT_ANALYTICS_THRESHOLDS = {
    trendingGrowthPct: 35,
    hitRateWinnerMultiple: 10,
}

export function resolveAnalyticsThreshold(thresholds, key) {
    const value = Number(thresholds?.[key])
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_ANALYTICS_THRESHOLDS[key]
}

// Draft state for an inline threshold: edits stay local until Apply / Enter.
export function useThresholdDraft(value, onApply) {
    const [draft, setDraft] = useState(String(value))
    const [applying, setApplying] = useState(false)

    useEffect(() => { setDraft(String(value)) }, [value])

    const parsed = parseFloat(draft)
    const isValid = Number.isFinite(parsed) && parsed > 0
    const isDirty = isValid && parsed !== value

    const apply = async () => {
        if (!isDirty || applying) return
        setApplying(true)
        try {
            await onApply(parsed)
        } finally {
            setApplying(false)
        }
    }

    return { draft, setDraft, isDirty, applying, apply }
}

// Small number box that sits inside a sentence, styled like the budget
// recommendation inputs.
export function InlineThresholdInput({ draft, setDraft, apply, prefix, suffix, step = "1", width = "w-14", disabled }) {
    return (
        <span className="relative inline-flex items-center align-baseline mx-0.5">
            {prefix && (
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">{prefix}</span>
            )}
            <input
                type="number"
                min="0"
                step={step}
                value={draft}
                disabled={disabled}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") apply() }}
                className={cn(
                    width,
                    "py-0.5 text-xs font-semibold text-gray-900 text-center border border-gray-300 rounded-xl bg-white shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                    "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                    prefix ? "pl-4 pr-1.5" : "px-1.5",
                    suffix ? "pr-4" : "",
                )}
            />
            {suffix && (
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">{suffix}</span>
            )}
        </span>
    )
}

export function InlineThresholdApply({ isDirty, applying, apply }) {
    if (!isDirty && !applying) return null
    return (
        <button
            type="button"
            onClick={apply}
            disabled={applying}
            className="ml-2 inline-flex h-6 items-center gap-1 rounded-xl bg-blue-600 px-2.5 align-middle text-[11px] font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
        >
            {applying && <Loader2 className="h-3 w-3 animate-spin" />}
            Apply
        </button>
    )
}
