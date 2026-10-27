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

// Number box that sits inside a sentence, styled like the budget recommendation
// inputs but blue-tinted and larger so it reads as something you can change.
export function InlineThresholdInput({ draft, setDraft, apply, prefix, suffix, step = "1", width = "w-[4.75rem]", disabled }) {
    return (
        <span className="relative inline-flex items-center align-middle mx-1">
            {prefix && (
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-400">{prefix}</span>
            )}
            <input
                type="number"
                min="0"
                step={step}
                value={draft}
                disabled={disabled}
                title="Edit to change the threshold"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") apply() }}
                className={cn(
                    width,
                    "h-8 text-base font-bold text-blue-700 text-center border-[1.5px] border-blue-200 rounded-xl bg-white shadow-sm transition-colors",
                    "hover:border-blue-300 focus:outline-none focus:border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
                    "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                    prefix ? "pl-5 pr-2" : "px-2",
                    suffix ? "pr-6" : "",
                )}
            />
            {suffix && (
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-400">{suffix}</span>
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
            className="ml-2 inline-flex h-8 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 align-middle text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-70"
        >
            {applying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Apply
        </button>
    )
}
