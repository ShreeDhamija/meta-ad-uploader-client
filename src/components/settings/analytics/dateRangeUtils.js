import {
    endOfMonth,
    format,
    isSameDay,
    isSameMonth,
    isSameYear,
    startOfMonth,
    startOfWeek,
    subDays,
    subMonths,
} from "date-fns"

export const ANALYTICS_DATE_PRESETS = [
    { key: "last_day", label: "Last Day" },
    { key: "last_7d", label: "Last 7 Days" },
    { key: "last_14d", label: "Last 14 Days" },
    { key: "last_30d", label: "Last 30 Days" },
    { key: "last_week", label: "Last Week" },
    { key: "last_month", label: "Last Month" },
]

const DATE_FORMAT = "yyyy-MM-dd"
const CUSTOM_PRESET_KEY = "custom"

function toApiDateString(date) {
    return format(date, DATE_FORMAT)
}

function getPresetLabel(presetKey) {
    return ANALYTICS_DATE_PRESETS.find((preset) => preset.key === presetKey)?.label || "Custom Range"
}

function getYesterday(baseDate = new Date()) {
    const yesterday = new Date(baseDate)
    yesterday.setHours(0, 0, 0, 0)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday
}

export function parseAnalyticsDate(dateString) {
    return dateString ? new Date(`${dateString}T00:00:00`) : null
}

export function getAnalyticsDateRangeSelection(value) {
    return {
        from: parseAnalyticsDate(value?.since),
        to: parseAnalyticsDate(value?.until),
    }
}

export function createAnalyticsDateRangeFromPreset(presetKey, baseDate = new Date()) {
    const yesterday = getYesterday(baseDate)
    let since = yesterday
    let until = yesterday

    switch (presetKey) {
        case "last_day":
            break
        case "last_7d":
            since = subDays(yesterday, 6)
            break
        case "last_14d":
            since = subDays(yesterday, 13)
            break
        case "last_30d":
            since = subDays(yesterday, 29)
            break
        case "last_week": {
            const currentWeekStart = startOfWeek(yesterday, { weekStartsOn: 1 })
            since = subDays(currentWeekStart, 7)
            until = subDays(currentWeekStart, 1)
            break
        }
        case "last_month": {
            const lastMonth = subMonths(yesterday, 1)
            since = startOfMonth(lastMonth)
            until = endOfMonth(lastMonth)
            break
        }
        default:
            return createAnalyticsDateRangeFromPreset("last_30d", baseDate)
    }

    return {
        preset: presetKey,
        label: getPresetLabel(presetKey),
        since: toApiDateString(since),
        until: toApiDateString(until),
    }
}

export function createCustomAnalyticsDateRange(range) {
    if (!range?.from || !range?.to) return null

    const from = range.from <= range.to ? range.from : range.to
    const to = range.to >= range.from ? range.to : range.from

    return {
        preset: CUSTOM_PRESET_KEY,
        label: "Custom Range",
        since: toApiDateString(from),
        until: toApiDateString(to),
    }
}

export function buildAnalyticsDateQueryParams(value) {
    const params = new URLSearchParams()

    if (!value) {
        params.set("datePreset", "last_30d")
        return params
    }

    if (value.since && value.until) {
        if (value.preset && value.preset !== CUSTOM_PRESET_KEY) {
            params.set("datePreset", value.preset)
        }
        params.set("since", value.since)
        params.set("until", value.until)
        return params
    }

    if (value.preset && value.preset !== CUSTOM_PRESET_KEY) {
        params.set("datePreset", value.preset)
        return params
    }

    params.set("datePreset", "last_30d")
    return params
}

export function getAnalyticsDateRangeCacheKey(value) {
    const normalized = value || createAnalyticsDateRangeFromPreset("last_30d")
    return `${normalized.preset || CUSTOM_PRESET_KEY}:${normalized.since}:${normalized.until}`
}

export function getAnalyticsDateRangeSummary(value) {
    const normalized = value || createAnalyticsDateRangeFromPreset("last_30d")
    const since = parseAnalyticsDate(normalized.since)
    const until = parseAnalyticsDate(normalized.until)

    if (!since || !until) return normalized.label || "Last 30 Days"
    if (isSameDay(since, until)) return format(since, "MMM d, yyyy")
    if (isSameMonth(since, until)) return `${format(since, "MMM d")} - ${format(until, "d, yyyy")}`
    if (isSameYear(since, until)) return `${format(since, "MMM d")} - ${format(until, "MMM d, yyyy")}`
    return `${format(since, "MMM d, yyyy")} - ${format(until, "MMM d, yyyy")}`
}
