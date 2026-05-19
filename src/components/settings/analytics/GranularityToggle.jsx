"use client"

/* eslint-disable react/prop-types */

import { cn } from "@/lib/utils"
import { ANALYTICS_GRANULARITIES, isGranularityAllowed } from "./dateRangeUtils"

export default function GranularityToggle({ value, onChange, dateRange, className }) {
    return (
        <div
            className={cn(
                "flex items-center gap-0.5 bg-gray-100 rounded-2xl p-0.5 h-9 border border-gray-200",
                className
            )}
        >
            {ANALYTICS_GRANULARITIES.map((opt) => {
                const allowed = isGranularityAllowed(opt.key, dateRange)
                const isActive = value === opt.key && allowed
                return (
                    <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                            if (!allowed) return
                            onChange(opt.key)
                        }}
                        disabled={!allowed}
                        title={
                            allowed
                                ? opt.label
                                : opt.key === "daily"
                                    ? "Daily is only available for date ranges up to 90 days"
                                    : "Monthly needs a date range of at least 60 days"
                        }
                        className={cn(
                            "px-3 py-1.5 text-[11px] font-medium rounded-xl transition-all min-w-[58px]",
                            isActive
                                ? "bg-white text-gray-900 shadow-xs ring-1 ring-black/5"
                                : allowed
                                    ? "text-gray-500 hover:text-gray-700"
                                    : "text-gray-300 cursor-not-allowed",
                        )}
                    >
                        {opt.label}
                    </button>
                )
            })}
        </div>
    )
}
