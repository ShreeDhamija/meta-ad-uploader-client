"use client"

/* eslint-disable react/prop-types */

import { useEffect, useMemo, useState } from "react"
import { subDays } from "date-fns"
import { CalendarRange, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
    ANALYTICS_DATE_PRESETS,
    createAnalyticsDateRangeFromPreset,
    createCustomAnalyticsDateRange,
    getAnalyticsDateRangeSelection,
    getAnalyticsDateRangeSummary,
} from "./dateRangeUtils"

export default function AnalyticsDateRangePicker({ value, onChange }) {
    const [open, setOpen] = useState(false)
    const [draftRange, setDraftRange] = useState(() => getAnalyticsDateRangeSelection(value))

    useEffect(() => {
        setDraftRange(getAnalyticsDateRangeSelection(value))
    }, [value])

    const activePreset = value?.preset || "custom"
    const rangeSummary = useMemo(() => getAnalyticsDateRangeSummary(value), [value])
    const maxSelectableDate = useMemo(() => subDays(new Date(), 1), [])

    const handlePresetSelect = (presetKey) => {
        onChange(createAnalyticsDateRangeFromPreset(presetKey))
        setOpen(false)
    }

    const handleRangeSelect = (range) => {
        setDraftRange(range)

        if (range?.from && range?.to) {
            const nextRange = createCustomAnalyticsDateRange(range)
            if (nextRange) {
                onChange(nextRange)
                setOpen(false)
            }
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="h-auto min-w-[280px] justify-between rounded-2xl border-gray-200 bg-white px-4 py-3 text-left shadow-xs hover:bg-white"
                >
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-xl bg-blue-50 p-2 text-blue-600">
                            <CalendarRange className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium text-gray-900">
                                {value?.label || "Last 30 Days"}
                            </p>
                            <p className="text-xs text-gray-500">{rangeSummary}</p>
                        </div>
                    </div>
                    <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-gray-400" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                sideOffset={10}
                className="w-[760px] max-w-[calc(100vw-2rem)] rounded-3xl border border-gray-200 bg-white p-4 shadow-xl"
            >
                <div className="flex flex-col gap-4 lg:flex-row">
                    <div className="flex w-full flex-col gap-2 lg:w-[190px]">
                        <div className="px-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                                Presets
                            </p>
                        </div>

                        {ANALYTICS_DATE_PRESETS.map((preset) => {
                            const isActive = activePreset === preset.key

                            return (
                                <button
                                    key={preset.key}
                                    type="button"
                                    onClick={() => handlePresetSelect(preset.key)}
                                    className={cn(
                                        "flex items-center justify-between rounded-2xl border px-3 py-2.5 text-sm transition-colors",
                                        isActive
                                            ? "border-blue-200 bg-blue-50 text-blue-700"
                                            : "border-transparent bg-gray-50 text-gray-700 hover:border-gray-200 hover:bg-gray-100"
                                    )}
                                >
                                    <span>{preset.label}</span>
                                    {isActive ? <Check className="h-4 w-4" /> : null}
                                </button>
                            )
                        })}

                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-3 py-3">
                            <p className="text-xs font-medium text-gray-600">Custom Range</p>
                            <p className="mt-1 text-xs leading-5 text-gray-400">
                                Pick a start and end date to compare both charts across the same window.
                            </p>
                        </div>
                    </div>

                    <div className="min-w-0 flex-1 rounded-3xl border border-gray-200 bg-gray-50 p-3">
                        <Calendar
                            mode="range"
                            selected={draftRange}
                            onSelect={handleRangeSelect}
                            defaultMonth={draftRange?.from || maxSelectableDate}
                            numberOfMonths={2}
                            disabled={(date) => date > maxSelectableDate}
                            className="w-full rounded-2xl bg-white p-4"
                            initialFocus
                        />

                        <div className="mt-3 rounded-2xl bg-white px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-400">
                                Selected Range
                            </p>
                            <p className="mt-1 text-sm font-medium text-gray-900">{rangeSummary}</p>
                            <p className="mt-1 text-xs text-gray-500">
                                Custom ranges apply as soon as both dates are selected.
                            </p>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
