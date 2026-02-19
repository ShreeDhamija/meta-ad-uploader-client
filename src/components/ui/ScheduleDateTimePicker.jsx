"use client"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Clock, Calendar as CalendarIcon } from "lucide-react";

function ScheduleDateTimePicker({ label, value, onChange, onClear }) {
    // Parse existing value back into date + time
    const existingDate = value ? new Date(value) : null;
    const existingTime = existingDate
        ? `${String(existingDate.getUTCHours()).padStart(2, "0")}:${String(existingDate.getUTCMinutes()).padStart(2, "0")}`
        : "00:00";

    const [selectedDate, setSelectedDate] = useState(existingDate);
    const [time, setTime] = useState(existingTime);
    const [showCal, setShowCal] = useState(false);

    // Sync from parent when value changes externally (e.g. clear)
    useEffect(() => {
        if (!value) {
            setSelectedDate(null);
            setTime("00:00");
        }
    }, [value]);

    const handleDateSelect = (date) => {
        setSelectedDate(date);
        setShowCal(false);
        if (date) {
            const [h, m] = time.split(":").map(Number);
            const d = new Date(date);
            d.setUTCHours(h, m, 0, 0);
            onChange(d.toISOString().replace(/\.\d{3}Z$/, "Z"));
        }
    };

    const handleTimeChange = (newTime) => {
        setTime(newTime);
        if (selectedDate) {
            const [h, m] = newTime.split(":").map(Number);
            const d = new Date(selectedDate);
            d.setUTCHours(h, m, 0, 0);
            onChange(d.toISOString().replace(/\.\d{3}Z$/, "Z"));
        }
    };

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-500">{label}</label>
                {value && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2">
                {/* Date Picker */}
                <Popover open={showCal} onOpenChange={setShowCal}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className={cn(
                                "inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border transition-colors w-[160px] justify-start",
                                selectedDate
                                    ? "border-gray-300 text-gray-900"
                                    : "border-dashed border-gray-300 text-gray-400"
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
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                {/* Time Input */}
                <div className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm w-[100px]",
                    selectedDate ? "border-gray-300" : "border-gray-200 opacity-50 pointer-events-none"
                )}>
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        className="bg-transparent outline-none w-full text-sm [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                </div>
            </div>
        </div>
    );
}