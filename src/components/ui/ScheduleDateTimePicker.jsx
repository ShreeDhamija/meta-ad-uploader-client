"use client"
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatTimePart = (value) => String(value).padStart(2, "0");
const formatTimeValue = (date) =>
    `${formatTimePart(date.getHours())}:${formatTimePart(date.getMinutes())}`;

const ceilToNextMinute = (date) => {
    const nextDate = new Date(date);
    if (nextDate.getSeconds() > 0 || nextDate.getMilliseconds() > 0) {
        nextDate.setMinutes(nextDate.getMinutes() + 1);
    }
    nextDate.setSeconds(0, 0);
    return nextDate;
};

const isSameLocalDay = (firstDate, secondDate) =>
    firstDate &&
    secondDate &&
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate();

const parseTimeValue = (timeValue) => {
    const [hours = 0, minutes = 0] = (timeValue || "00:00").split(":").map(Number);
    return { hours, minutes };
};

export default function ScheduleDateTimePicker({ label, value, onChange, onClear, minDateTime = null }) {
    // Parse existing value back into date + time
    const existingDate = value ? new Date(value) : null;
    const existingTime = existingDate
        ? `${String(existingDate.getHours()).padStart(2, "0")}:${String(existingDate.getMinutes()).padStart(2, "0")}`
        : "00:00";

    const [selectedDate, setSelectedDate] = useState(existingDate);
    const [time, setTime] = useState(existingTime);
    const [showCal, setShowCal] = useState(false);
    const minDate = minDateTime ? ceilToNextMinute(new Date(minDateTime)) : null;

    const getMinimumTimeForDate = (date) => {
        if (!date || !minDate || !isSameLocalDay(date, minDate)) {
            return null;
        }

        if (isSameLocalDay(date, new Date())) {
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
            setSelectedDate((prev) => (prev === null ? prev : null));
            setTime((prev) => (prev === "00:00" ? prev : "00:00"));
            return;
        }

        const nextDate = new Date(value);
        const nextTime = formatTimeValue(nextDate);
        setSelectedDate((prev) =>
            prev && prev.getTime() === nextDate.getTime() ? prev : nextDate
        );
        setTime((prev) => (prev === nextTime ? prev : nextTime));
    }, [value]);

    const handleDateSelect = (date) => {
        setShowCal(false);
        if (!date) {
            setSelectedDate(null);
            return;
        }
        const defaultTime = !selectedDate && minDate && isSameLocalDay(date, minDate)
            ? formatTimeValue(minDate)
            : time;
        const nextTime = clampTimeForDate(date, defaultTime);
        const [h, m] = nextTime.split(":").map(Number);
        const d = new Date(date);
        d.setHours(h, m, 0, 0);
        setSelectedDate(d);
        setTime(nextTime);
        onChange(d.toISOString().replace(/\.\d{3}Z$/, "Z"));
    };

    const commitTimeChange = (newTime) => {
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
    const { hours: selectedHour, minutes: selectedMinute } = parseTimeValue(time);
    const { hours: minimumHour = 0, minutes: minimumMinute = 0 } = parseTimeValue(minimumTime);
    const hourOptions = Array.from({ length: 24 }, (_, index) => index);
    const minuteOptions = Array.from({ length: 60 }, (_, index) => index);

    const isHourUnavailable = (hour) =>
        Boolean(minimumTime) && hour < minimumHour;

    const isMinuteUnavailable = (minute) =>
        Boolean(minimumTime) &&
        selectedHour === minimumHour &&
        minute < minimumMinute;

    const handleHourChange = (nextHourValue) => {
        const nextHour = Number(nextHourValue);
        const nextMinuteFloor = minimumTime && nextHour === minimumHour ? minimumMinute : 0;
        const nextMinute = Math.max(selectedMinute, nextMinuteFloor);
        commitTimeChange(`${formatTimePart(nextHour)}:${formatTimePart(nextMinute)}`);
    };

    const handleMinuteChange = (nextMinuteValue) => {
        commitTimeChange(`${formatTimePart(selectedHour)}:${formatTimePart(Number(nextMinuteValue))}`);
    };

    return (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
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
                                "inline-flex h-11 w-full min-w-0 items-center justify-start gap-2 rounded-xl border bg-gray-50/80 px-4 text-sm shadow-sm transition-colors sm:flex-1",
                                selectedDate
                                    ? "border-gray-300 text-gray-900"
                                    : "border-dashed border-gray-300 text-gray-400 hover:border-gray-400"
                            )}
                        >
                            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate whitespace-nowrap">
                                {selectedDate
                                    ? selectedDate.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })
                                    : "Pick date"}
                            </span>
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
                                day_button: "h-[2.35rem] w-[2.35rem] rounded-full text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 data-[selected-single=true]:bg-black data-[selected-single=true]:text-white data-[selected-single=true]:hover:bg-black data-[selected-single=true]:hover:text-white",
                                today: "bg-transparent text-gray-900 font-semibold",
                                selected: "bg-transparent text-inherit",
                            }}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                {/* Time Picker */}
                <div className={cn(
                    "flex h-11 w-full items-center gap-1.5 rounded-xl border bg-gray-50/80 px-2.5 text-sm shadow-sm sm:w-[140px]",
                    selectedDate ? "border-gray-300" : "border-gray-200 opacity-50 pointer-events-none"
                )}>
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-0.5">
                        <Select
                            value={formatTimePart(selectedHour)}
                            onValueChange={handleHourChange}
                            disabled={!selectedDate}
                        >
                            <SelectTrigger className="h-8 w-[44px] shrink-0 rounded-lg border-0 bg-transparent px-1.5 py-0 text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                                <SelectValue placeholder="HH" />
                            </SelectTrigger>
                            <SelectContent
                                className="rounded-2xl border border-gray-200 bg-white shadow-xl"
                                position="popper"
                            >
                                {hourOptions.map((hour) => (
                                    <SelectItem
                                        key={hour}
                                        value={formatTimePart(hour)}
                                        disabled={isHourUnavailable(hour)}
                                        className="rounded-xl px-3 py-2 text-sm text-gray-700 focus:bg-gray-100 focus:text-gray-900"
                                    >
                                        {formatTimePart(hour)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <span className="px-0.5 text-sm font-semibold text-gray-400">:</span>

                        <Select
                            value={formatTimePart(selectedMinute)}
                            onValueChange={handleMinuteChange}
                            disabled={!selectedDate}
                        >
                            <SelectTrigger className="h-8 w-[44px] shrink-0 rounded-lg border-0 bg-transparent px-1.5 py-0 text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                                <SelectValue placeholder="MM" />
                            </SelectTrigger>
                            <SelectContent
                                className="rounded-2xl border border-gray-200 bg-white shadow-xl"
                                position="popper"
                            >
                                {minuteOptions.map((minute) => (
                                    <SelectItem
                                        key={minute}
                                        value={formatTimePart(minute)}
                                        disabled={isMinuteUnavailable(minute)}
                                        className="rounded-xl px-3 py-2 text-sm text-gray-700 focus:bg-gray-100 focus:text-gray-900"
                                    >
                                        {formatTimePart(minute)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    );
}
