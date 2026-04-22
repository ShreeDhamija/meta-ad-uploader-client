"use client"
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Clock, Calendar as CalendarIcon } from "lucide-react";

const formatTimeValue = (date) =>
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const isSameLocalDay = (firstDate, secondDate) =>
    firstDate &&
    secondDate &&
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate();

export default function ScheduleDateTimePicker({ label, value, onChange, onClear, minDateTime = null }) {
    // Parse existing value back into date + time
    const existingDate = value ? new Date(value) : null;
    const existingTime = existingDate
        ? `${String(existingDate.getHours()).padStart(2, "0")}:${String(existingDate.getMinutes()).padStart(2, "0")}`
        : "00:00";

    const [selectedDate, setSelectedDate] = useState(existingDate);
    const [time, setTime] = useState(existingTime);
    const [showCal, setShowCal] = useState(false);
    const minDate = minDateTime ? new Date(minDateTime) : null;

    const getMinimumTimeForDate = (date) => {
        if (!date || !minDate || !isSameLocalDay(date, minDate)) {
            return null;
        }

        return formatTimeValue(minDate);
    };

    const clampTimeForDate = (date, nextTime) => {
        const minimumTime = getMinimumTimeForDate(date);
        if (!minimumTime || !nextTime) {
            return nextTime;
        }

        return nextTime < minimumTime ? minimumTime : nextTime;
    };

    // Sync from parent when value changes externally (e.g. clear)
    useEffect(() => {
        if (!value) {
            setSelectedDate(null);
            setTime("00:00");
            return;
        }

        const nextDate = new Date(value);
        setSelectedDate(nextDate);
        setTime(formatTimeValue(nextDate));
    }, [value]);

    const handleDateSelect = (date) => {
        setSelectedDate(date);
        setShowCal(false);
        if (date) {
            const nextTime = clampTimeForDate(date, time);
            const [h, m] = nextTime.split(":").map(Number);
            const d = new Date(date);
            d.setHours(h, m, 0, 0);
            setTime(nextTime);
            onChange(d.toISOString().replace(/\.\d{3}Z$/, "Z"));
        }
    };

    const handleTimeChange = (newTime) => {
        const nextTime = clampTimeForDate(selectedDate, newTime);
        setTime(nextTime);
        if (selectedDate) {
            const [h, m] = nextTime.split(":").map(Number);
            const d = new Date(selectedDate);
            d.setHours(h, m, 0, 0);
            onChange(d.toISOString().replace(/\.\d{3}Z$/, "Z"));
        }
    };

    const minimumSelectableDate = minDate ?? new Date();
    const minimumSelectableDayStart = new Date(minimumSelectableDate);
    minimumSelectableDayStart.setHours(0, 0, 0, 0);
    const minimumTime = getMinimumTimeForDate(selectedDate);

    return (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                {value && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-xs font-medium text-gray-400 transition-colors hover:text-red-500"
                    >
                        Clear
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
                {/* Date Picker */}
                <Popover open={showCal} onOpenChange={setShowCal}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className={cn(
                                "inline-flex h-11 w-full items-center justify-start gap-2 rounded-xl border bg-white px-4 text-sm shadow-sm transition-colors sm:flex-1",
                                selectedDate
                                    ? "border-gray-300 text-gray-900"
                                    : "border-dashed border-gray-300 text-gray-400 hover:border-gray-400"
                            )}
                        >
                            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                            {selectedDate
                                ? selectedDate.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                })
                                : "Pick date"}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-auto overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-xl"
                        align="start"
                        sideOffset={10}
                    >
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            disabled={(date) => date < minimumSelectableDayStart}
                            className="p-4 [--cell-size:2.65rem]"
                            classNames={{
                                month: "flex w-full flex-col gap-3",
                                month_caption: "flex h-[--cell-size] w-full items-center justify-center px-[--cell-size] mb-1",
                                weekdays: "mb-1 flex w-full gap-2",
                                weekday: "flex-1 select-none text-center text-[0.8rem] font-medium text-gray-500",
                                table: "w-full border-separate border-spacing-y-2",
                                week: "mt-1.5 flex w-full gap-2",
                                day: "relative flex-1 aspect-square select-none p-0.5 text-center",
                                day_button: "h-[2.35rem] w-[2.35rem] rounded-full text-sm font-medium transition-colors hover:bg-blue-100 hover:text-blue-800",
                                today: "bg-transparent text-blue-600 font-semibold data-[selected=true]:bg-blue-600 data-[selected=true]:text-white",
                                selected: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white",
                            }}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                {/* Time Input */}
                <div className={cn(
                    "inline-flex h-11 w-full items-center gap-2 rounded-xl border bg-white px-4 text-sm shadow-sm sm:w-[140px]",
                    selectedDate ? "border-gray-300" : "border-gray-200 opacity-50 pointer-events-none"
                )}>
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        min={minimumTime || undefined}
                        className="w-full bg-transparent text-sm text-gray-700 outline-none [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                </div>
            </div>
        </div>
    );
}
