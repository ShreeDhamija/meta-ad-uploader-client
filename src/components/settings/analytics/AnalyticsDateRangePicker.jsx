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

function areRangesEqual(left, right) {
    return left?.preset === right?.preset
        && left?.label === right?.label
        && left?.since === right?.since
        && left?.until === right?.until
}

export default function AnalyticsDateRangePicker({ value, onChange }) {
    const [open, setOpen] = useState(false)
    const [draftRange, setDraftRange] = useState(() => getAnalyticsDateRangeSelection(value))
    const [draftValue, setDraftValue] = useState(value)

    useEffect(() => {
        setDraftRange(getAnalyticsDateRangeSelection(value))
        setDraftValue(value)
    }, [value])

    const activePreset = value?.preset || "custom"
    const rangeSummary = useMemo(() => getAnalyticsDateRangeSummary(value), [value])
    const draftSummary = useMemo(() => getAnalyticsDateRangeSummary(draftValue), [draftValue])
    const maxSelectableDate = useMemo(() => subDays(new Date(), 1), [])
    const triggerLabel = activePreset === "custom"
        ? rangeSummary
        : (value?.label || "Last 30 Days")

    const handlePresetSelect = (presetKey) => {
        const nextValue = createAnalyticsDateRangeFromPreset(presetKey)
        setDraftValue(nextValue)
        setDraftRange(getAnalyticsDateRangeSelection(nextValue))
    }

    const handleRangeSelect = (range) => {
        setDraftRange(range)

        if (range?.from && range?.to) {
            const nextRange = createCustomAnalyticsDateRange(range)
            if (nextRange) {
                setDraftValue(nextRange)
            }
        }
    }

    const handleOpenChange = (nextOpen) => {
        if (nextOpen) {
            setDraftRange(getAnalyticsDateRangeSelection(value))
            setDraftValue(value)
            setOpen(true)
            return
        }

        if (draftValue && !areRangesEqual(draftValue, value)) {
            onChange(draftValue)
        }

        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="min-w-[280px] justify-between rounded-2xl border-gray-200 bg-white px-4 py-2.5 text-left shadow-xs hover:bg-white"
                >
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                            <CalendarRange className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">{triggerLabel}</p>
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
                            <p className="text-sm font-medium text-gray-500">Presets</p>
                        </div>

                        {ANALYTICS_DATE_PRESETS.map((preset) => {
                            const isActive = (draftValue?.preset || "custom") === preset.key

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
                            <p className="text-sm font-medium text-gray-900">{draftSummary}</p>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
