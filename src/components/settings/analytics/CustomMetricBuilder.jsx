"use client"

/* eslint-disable react/prop-types */

// ════════════════════════════════════════════════════════════════════════════
// FEATURE START: CUSTOM DATA + CUSTOM METRICS (added 2026-10-23)
// ----------------------------------------------------------------------------
// "Create Custom Metric" — opened from the Optimization Focus popup. Same
// inputs and rules as the meta-dashboard app's CalcFieldBuilder (Name,
// Formula, Format, Direction); the formula input works like
// ReorderAdNameParts: type @ to pick a variable, which replaces the @ as
// {{Name}}, and Backspace removes a whole {{…}} block. @ rather than / so the
// picker never collides with "/" as the divide sign.
// Letters typed straight after "@" filter the list; a space, digit or
// operator closes it.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { displayToFormula, formatMetricValue, resolveMetricKey } from "./customMetrics"

const fieldClasses = "w-full px-3 py-2.5 border border-gray-300 rounded-2xl bg-white text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const DROPDOWN_WIDTH = 276


export default function CustomMetricBuilder({ variables, customMetrics, previewCtx, onSave, onCancel }) {
    const [name, setName] = useState("")
    const [formulaText, setFormulaText] = useState("")
    const [format, setFormat] = useState("currency")
    const [lowerIsBetter, setLowerIsBetter] = useState(true)

    // "@" dropdown: index = position of the "@" that opened it
    const [picker, setPicker] = useState(null) // { index, position: {top,left} }
    const [highlight, setHighlight] = useState(0)

    const inputRef = useRef(null)
    const dropdownRef = useRef(null)

    // Letters typed after the "@" filter the list.
    const query = useMemo(() => {
        if (!picker) return ""
        const cursor = inputRef.current?.selectionStart ?? formulaText.length
        return formulaText.slice(picker.index + 1, cursor)
    }, [picker, formulaText])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        return q ? variables.filter((v) => v.label.toLowerCase().includes(q)) : variables
    }, [variables, query])

    const groups = useMemo(() => {
        const out = []
        filtered.forEach((v, i) => {
            let g = out.find((x) => x.label === v.group)
            if (!g) { g = { label: v.group, items: [] }; out.push(g) }
            g.items.push({ ...v, index: i })
        })
        return out
    }, [filtered])

    useEffect(() => { setHighlight(0) }, [query])

    useEffect(() => {
        dropdownRef.current?.querySelector(`[data-index="${highlight}"]`)?.scrollIntoView({ block: "nearest" })
    }, [highlight])

    const { formula, unknown } = useMemo(() => displayToFormula(formulaText, variables), [formulaText, variables])
    const hasMetricRefs = /\{[^}?]+\}/.test(formula)

    const trimmedName = name.trim()
    const nameTaken = trimmedName !== "" && variables.some((v) => v.label.toLowerCase() === trimmedName.toLowerCase())
    const canSave = trimmedName && !nameTaken && formulaText.trim() && hasMetricRefs && unknown.length === 0

    const preview = useMemo(() => {
        if (!previewCtx || !hasMetricRefs || unknown.length > 0) return null
        const draft = { id: "__draft__", formula }
        const v = resolveMetricKey("calc:__draft__", previewCtx, [...customMetrics, draft])
        return formatMetricValue(v, format)
    }, [previewCtx, hasMetricRefs, unknown.length, formula, customMetrics, format])

    // Same caret measuring as ReorderAdNameParts.getCursorPosition
    const getCursorPosition = useCallback((input, cursorIndex, value) => {
        const span = document.createElement("span")
        span.style.font = window.getComputedStyle(input).font
        span.style.visibility = "hidden"
        span.style.position = "absolute"
        span.style.whiteSpace = "pre"
        span.textContent = value.substring(0, cursorIndex)
        document.body.appendChild(span)
        const textWidth = span.offsetWidth
        document.body.removeChild(span)
        const paddingLeft = parseInt(window.getComputedStyle(input).paddingLeft)
        const left = paddingLeft + textWidth - input.scrollLeft
        return { top: input.offsetHeight + 4, left: Math.min(Math.max(left, 0), input.offsetWidth) }
    }, [])

    const handleChange = (e) => {
        const value = e.target.value
        const cursor = e.target.selectionStart
        setFormulaText(value)

        const textBefore = value.substring(0, cursor)
        const insideVariable = textBefore.lastIndexOf("{{") > textBefore.lastIndexOf("}}")

        if (value[cursor - 1] === "@" && !insideVariable) {
            setPicker({ index: cursor - 1, position: getCursorPosition(e.target, cursor, value) })
            return
        }

        if (picker) {
            // Keep it open only while typing a name straight after the "@".
            const typed = value.slice(picker.index + 1, cursor)
            const stillOpen = value[picker.index] === "@" && cursor > picker.index
            if (!stillOpen || !/^[A-Za-z][\w %&#'-]*$/.test(typed) && typed !== "") setPicker(null)
        }
    }

    const insertVariable = (variable) => {
        const input = inputRef.current
        if (!picker || !input) return
        const cursor = input.selectionStart
        const before = formulaText.slice(0, picker.index)
        const after = formulaText.slice(cursor)
        const token = `{{${variable.label}}}`
        const head = before
        const next = head + token + after
        setFormulaText(next)
        setPicker(null)
        setTimeout(() => {
            const pos = head.length + token.length
            input.focus()
            input.setSelectionRange(pos, pos)
        }, 0)
    }

    const handleKeyDown = (e) => {
        if (picker && filtered.length > 0) {
            if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => (h + 1) % filtered.length); return }
            if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => (h - 1 + filtered.length) % filtered.length); return }
            if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertVariable(filtered[highlight]); return }
        }
        if (picker && e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setPicker(null); return }

        // Backspace/Delete: remove the whole {{…}} block before the cursor
        if (e.key === "Backspace" || e.key === "Delete") {
            const input = e.target
            if (input.selectionStart !== input.selectionEnd) return
            const cursor = input.selectionStart
            const textBefore = formulaText.substring(0, cursor)
            const match = textBefore.match(/\{\{[^}]+\}\}$/)
            if (match) {
                e.preventDefault()
                const next = formulaText.substring(0, cursor - match[0].length) + formulaText.substring(cursor)
                setFormulaText(next)
                setTimeout(() => {
                    const pos = cursor - match[0].length
                    inputRef.current?.setSelectionRange(pos, pos)
                }, 0)
            }
        }
    }

    // Close the dropdown on a click outside the input and the list
    useEffect(() => {
        if (!picker) return
        const handler = (event) => {
            if (inputRef.current?.contains(event.target) || dropdownRef.current?.contains(event.target)) return
            setPicker(null)
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [picker])

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-[28px] shadow-2xl w-full max-w-[480px] overflow-visible"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-7 space-y-5">
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-gray-900">Create Custom Metric</h3>
                        <p className="text-xs text-gray-500">Combine Meta, Google Sheet and other custom metrics into one number.</p>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600">Name</p>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Blended CPA"
                            className={fieldClasses}
                            autoFocus
                        />
                        {nameTaken && (
                            <p className="text-amber-600 text-xs">A metric or column named &ldquo;{trimmedName}&rdquo; already exists</p>
                        )}
                    </div>

                    {/* Formula */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600">Formula</p>
                        <p className="text-gray-500 text-[12px] leading-5">
                            Type
                            <span className="inline-block mx-1 px-1.5 py-0.5 bg-white border border-gray-300 rounded-md shadow-xs text-black">@</span>
                            to see a list of variables. Use + − * / and parentheses for math.
                        </p>
                        <p className="text-[11px] leading-snug text-gray-400">
                            Picking a variable replaces the @ with its name, e.g. {"{{Spend}}"}. Keep typing after @ to filter the list; a space or number closes it. Backspace removes a whole variable.
                        </p>
                        <div className="relative">
                            <Input
                                ref={inputRef}
                                value={formulaText}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                placeholder="e.g. {{Spend}} / {{Sales}}"
                                className={cn(
                                    "w-full rounded-2xl font-mono text-[13px]",
                                    unknown.length > 0 && "border-amber-400 focus-visible:ring-amber-400"
                                )}
                            />

                            {picker && (
                                <div
                                    ref={dropdownRef}
                                    className="absolute z-50"
                                    style={{
                                        top: `${picker.position.top}px`,
                                        width: `${DROPDOWN_WIDTH}px`,
                                        left: `max(0px, min(${picker.position.left}px, 100% - ${DROPDOWN_WIDTH}px))`,
                                    }}
                                >
                                    <div className="rounded-xl border shadow-md bg-white overflow-hidden">
                                        <div className="max-h-64 overflow-y-auto py-1">
                                            {groups.length === 0 ? (
                                                <div className="px-3 py-2 text-sm text-gray-400">No matching variables</div>
                                            ) : groups.map((g) => (
                                                <div key={g.label}>
                                                    <div className="px-3 pt-2 pb-1 text-xs font-medium text-gray-400 select-none">{g.label}</div>
                                                    {g.items.map((v) => (
                                                        <div
                                                            key={v.key}
                                                            data-index={v.index}
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onMouseEnter={() => setHighlight(v.index)}
                                                            onClick={() => insertVariable(v)}
                                                            className={cn(
                                                                "px-2 py-1.5 mx-1 cursor-pointer text-sm rounded-lg truncate",
                                                                highlight === v.index && "bg-gray-100"
                                                            )}
                                                        >
                                                            {v.label}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {unknown.length > 0 ? (
                            <p className="text-amber-600 text-xs">
                                {unknown.length === 1
                                    ? `"${unknown[0]}" is not a recognized variable`
                                    : `${unknown.map((u) => `"${u}"`).join(", ")} are not recognized variables`}
                            </p>
                        ) : preview !== null ? (
                            <p className="text-xs text-gray-500">
                                Selected date range: <span className="font-medium text-gray-800">{preview}</span>
                            </p>
                        ) : null}
                    </div>

                    {/* Format + Direction */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-600">Format</p>
                            <select value={format} onChange={(e) => setFormat(e.target.value)} className={fieldClasses}>
                                <option value="currency">Currency ($)</option>
                                <option value="number">Number</option>
                                <option value="percent">Percent (%)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-600">Direction</p>
                            <select
                                value={lowerIsBetter ? "lower" : "higher"}
                                onChange={(e) => setLowerIsBetter(e.target.value === "lower")}
                                className={fieldClasses}
                            >
                                <option value="lower">Lower is better</option>
                                <option value="higher">Higher is better</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-600 px-8 py-1.5 flex items-center justify-center gap-6 rounded-b-[28px]">
                    <button
                        onClick={() => {
                            if (!canSave) return
                            onSave({ id: `cf_${Date.now()}`, name: trimmedName, formula, format, lowerIsBetter })
                        }}
                        disabled={!canSave}
                        className="rounded-xl bg-white text-blue-600 hover:bg-gray-100 px-6 h-9 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        Create
                    </button>
                    <button onClick={onCancel} className="text-white text-sm font-medium hover:underline">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// FEATURE END: CUSTOM DATA + CUSTOM METRICS
// ════════════════════════════════════════════════════════════════════════════
