"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Command, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, Plus, X, Settings2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Constants ───────────────────────────────────────────────────────────────

const AVAILABLE_VARIABLES = [
  { id: 'fileName', label: 'File Name' },
  { id: 'fileType', label: 'File Type', note: '(Static/Video)' },
  { id: 'dateDefault', label: 'Date', note: '(DD/MM/YYYY)' },
  { id: 'dateMonthName', label: 'Date', note: '(DD-MMM-YYYY)' },
  { id: 'dateCustom', label: 'Date (custom)', note: 'Enter your own format' },
  { id: 'iteration', label: 'Iteration', note: '(1/2/3..)' },
  { id: 'slug', label: 'URL Slug', note: '(Text after last / )' },
  { id: 'adType', label: 'Ad Type', note: 'CAR/FLEX' },
]

// ─── Custom Variables Setup Dialog ───────────────────────────────────────────

function CustomVariablesSetupDialog({ open, onOpenChange, variables, onSave }) {
  const [editing, setEditing] = useState([])
  const [newValueInputs, setNewValueInputs] = useState({})
  const nameInputRefs = useRef({})

  // Reset working copy when dialog opens
  useEffect(() => {
    if (open) {
      const copy = variables.length > 0
        ? variables.map((v, i) => ({ ...v, values: [...v.values], _editKey: i }))
        : [{ name: "", values: [], _editKey: 0 }]
      setEditing(copy)
      setNewValueInputs({})
    }
  }, [open, variables])

  const addCategory = useCallback(() => {
    const newKey = Date.now()
    setEditing(prev => [...prev, { name: "", values: [], _editKey: newKey }])
    setTimeout(() => {
      nameInputRefs.current[newKey]?.focus()
    }, 50)
  }, [])

  const removeCategory = useCallback((editKey) => {
    setEditing(prev => prev.filter(c => c._editKey !== editKey))
  }, [])

  const updateCategoryName = useCallback((editKey, name) => {
    setEditing(prev => prev.map(c => c._editKey === editKey ? { ...c, name } : c))
  }, [])

  const addValue = useCallback((editKey) => {
    const val = (newValueInputs[editKey] || "").trim()
    if (!val) return

    setEditing(prev => prev.map(c => {
      if (c._editKey !== editKey) return c
      if (c.values.includes(val)) return c
      return { ...c, values: [...c.values, val] }
    }))
    setNewValueInputs(prev => ({ ...prev, [editKey]: "" }))
  }, [newValueInputs])

  const removeValue = useCallback((editKey, valueIndex) => {
    setEditing(prev => prev.map(c => {
      if (c._editKey !== editKey) return c
      return { ...c, values: c.values.filter((_, i) => i !== valueIndex) }
    }))
  }, [])

  const handleValueKeyDown = useCallback((e, editKey) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addValue(editKey)
    }
  }, [addValue])

  const handleSave = useCallback(() => {
    const cleaned = editing
      .filter(c => c.name.trim().length > 0)
      .map(c => ({ name: c.name.trim(), values: c.values }))
    onSave(cleaned)
    onOpenChange(false)
  }, [editing, onSave, onOpenChange])

  const hasValidCategories = editing.some(c => c.name.trim().length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg !rounded-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Set Up Custom Variables
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Create variable categories with values you can use in your ad naming formula. Type{" "}
            <span className="inline-block mx-0.5 px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-black text-xs font-mono">@</span>{" "}
            in the formula input to use them.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 custom-scrollbar">
          {editing.map((category) => (
            <div
              key={category._editKey}
              className="bg-gray-50 rounded-xl p-4 space-y-3 relative group"
            >
              {editing.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCategory(category._editKey)}
                  className="absolute top-3 right-3 text-gray-300 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  Variable Name
                </Label>
                <Input
                  ref={(el) => { nameInputRefs.current[category._editKey] = el }}
                  value={category.name}
                  onChange={(e) => updateCategoryName(category._editKey, e.target.value)}
                  placeholder="e.g. Category, URL Type, Region..."
                  className="bg-white rounded-lg h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  Values
                </Label>

                {category.values.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {category.values.map((val, vi) => (
                      <span
                        key={vi}
                        className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-sm text-gray-700"
                      >
                        {val}
                        <button
                          type="button"
                          onClick={() => removeValue(category._editKey, vi)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    value={newValueInputs[category._editKey] || ""}
                    onChange={(e) =>
                      setNewValueInputs(prev => ({
                        ...prev,
                        [category._editKey]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => handleValueKeyDown(e, category._editKey)}
                    placeholder="Type a value and press Enter"
                    className="bg-white rounded-lg h-9 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addValue(category._editKey)}
                    className="h-9 w-9 p-0 rounded-lg shrink-0"
                    disabled={!(newValueInputs[category._editKey] || "").trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addCategory}
            className="text-sm text-gray-500 hover:text-gray-700 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Another Variable
          </Button>
        </div>

        <DialogFooter className="pt-2 flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-xl flex-1 bg-blue-500 hover:bg-blue-600 text-white"
            disabled={!hasValidCategories}
          >
            Save Variables
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ReorderAdNameParts({
  formulaInput = "",
  onFormulaChange,
  variant = "default",
  customVariables = [],
  onCustomVariablesChange,
  hideInfoTooltip = false,   // ← add this

}) {
  const [inputValue, setInputValue] = useState(formulaInput)

  // Slash (/) dropdown — built-in variables
  const [showSlashDropdown, setShowSlashDropdown] = useState(false)
  const [slashDropdownPos, setSlashDropdownPos] = useState({ top: 0, left: 0 })

  // At (@) dropdown — custom variables via shadcn DropdownMenu
  const [showAtDropdown, setShowAtDropdown] = useState(false)
  const [atDropdownPos, setAtDropdownPos] = useState({ top: 0, left: 0 })

  // Inline category value dropdown (cursor inside {{CategoryName}})
  const [inlineDropdown, setInlineDropdown] = useState(null)
  // Shape: { category: {name, values}, startIndex, endIndex, position }

  // Setup dialog
  const [showSetupDialog, setShowSetupDialog] = useState(false)

  // Date format validation
  const [dateFormatError, setDateFormatError] = useState("")

  const inputRef = useRef(null)
  const slashDropdownRef = useRef(null)
  const inlineDropdownRef = useRef(null)
  const commandInputRef = useRef(null)

  // Sync with parent prop
  useEffect(() => {
    setInputValue(formulaInput)
  }, [formulaInput])

  // ── Warning detection for home variant ──
  // Finds any {{CategoryName}} tokens (no colon) that match a custom variable
  // category — these need a specific value selected before ad creation.

  const categoryWarnings = useMemo(() => {
    if (variant !== "home" || !customVariables.length) return []

    const warnings = []
    const regex = /\{\{([^:}]+)\}\}/g
    let match
    while ((match = regex.exec(inputValue)) !== null) {
      const content = match[1].trim()
      const isBuiltIn = AVAILABLE_VARIABLES.some(
        v => v.label === content || content.startsWith("Date(")
      )
      const isCategory = customVariables.some(c => c.name === content)
      if (!isBuiltIn && isCategory) {
        warnings.push(content)
      }
    }
    return [...new Set(warnings)]
  }, [inputValue, customVariables, variant])

  // ── Helpers ──

  const getCursorPosition = useCallback((input, cursorIndex) => {
    const span = document.createElement("span")
    span.style.font = window.getComputedStyle(input).font
    span.style.visibility = "hidden"
    span.style.position = "absolute"
    span.style.whiteSpace = "pre"
    span.textContent = inputValue.substring(0, cursorIndex)
    document.body.appendChild(span)
    const textWidth = span.offsetWidth
    document.body.removeChild(span)

    const inputStyles = window.getComputedStyle(input)
    const paddingLeft = parseInt(inputStyles.paddingLeft)

    return {
      top: input.offsetHeight + 4,
      left: paddingLeft + textWidth,
    }
  }, [inputValue])

  const validateDateFormats = useCallback((value) => {
    const dateMatches = [...value.matchAll(/\{\{Date\(([^)]+)\)\}\}/g)]
    if (dateMatches.length === 0) {
      setDateFormatError("")
      return
    }
    for (const match of dateMatches) {
      const fmt = match[1].toUpperCase()
      if (fmt === "CUSTOM" || "CUSTOM".startsWith(fmt)) continue
      const stripped = fmt
        .replace(/YYYY/g, "").replace(/YY/g, "")
        .replace(/MMM/g, "").replace(/MM/g, "")
        .replace(/DD/g, "").replace(/D/g, "").replace(/M/g, "")
      const remaining = stripped.replace(/[\s/\-._]/g, "")
      if (remaining.length > 0) {
        setDateFormatError(`Invalid date token "${remaining}"`)
        return
      }
      if (!/YYYY|YY|MMM|MM|M|DD|D/.test(fmt)) {
        setDateFormatError(`Date format "${fmt}" has no date tokens`)
        return
      }
    }
    setDateFormatError("")
  }, [])

  const emitChange = useCallback((newValue) => {
    setInputValue(newValue)
    validateDateFormats(newValue)
    if (onFormulaChange) onFormulaChange(newValue)
  }, [onFormulaChange, validateDateFormats])

  // ── Detect cursor inside a category-only {{CategoryName}} ──
  // Returns dropdown config if cursor is inside a {{CategoryName}} block,
  // or null otherwise. This is how clicking inside a category-only variable
  // in the input triggers a value picker.

  const detectInlineCategory = useCallback((cursorPos) => {
    if (!customVariables.length) return null
    const input = inputRef.current
    if (!input) return null

    const before = inputValue.substring(0, cursorPos)
    const after = inputValue.substring(cursorPos)

    const lastOpen = before.lastIndexOf("{{")
    const lastClose = before.lastIndexOf("}}")

    // Cursor must be inside an open {{ block
    if (lastOpen === -1 || lastOpen < lastClose) return null

    const closeAfter = after.indexOf("}}")
    if (closeAfter === -1) return null

    const content = inputValue.substring(lastOpen + 2, cursorPos + closeAfter).trim()

    // Must be category-only (no colon) and match a known custom variable
    if (content.includes(":")) return null

    const matchingCat = customVariables.find(c => c.name === content)
    if (!matchingCat) return null

    const position = getCursorPosition(input, lastOpen)

    return {
      category: matchingCat,
      startIndex: lastOpen,
      endIndex: cursorPos + closeAfter + 2,
      position,
    }
  }, [inputValue, customVariables, getCursorPosition])

  const handleCursorCheck = useCallback(() => {
    if (showSlashDropdown || showAtDropdown) {
      setInlineDropdown(null)
      return
    }
    const input = inputRef.current
    if (!input) return
    const cursorPos = input.selectionStart
    const result = detectInlineCategory(cursorPos)
    setInlineDropdown(result)
  }, [detectInlineCategory, showSlashDropdown, showAtDropdown])

  // ── Input change handler ──

  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value
    const cursorPosition = e.target.selectionStart

    emitChange(newValue)
    setInlineDropdown(null)

    const textBefore = newValue.substring(0, cursorPosition)
    const lastOpen = textBefore.lastIndexOf("{{")
    const lastClose = textBefore.lastIndexOf("}}")
    const insideVariable = lastOpen > lastClose

    const charTyped = newValue[cursorPosition - 1]

    // "/" trigger for built-in variables (only outside variable blocks)
    if (charTyped === "/" && !insideVariable) {
      const position = getCursorPosition(e.target, cursorPosition)
      setSlashDropdownPos(position)
      setShowSlashDropdown(true)
      setShowAtDropdown(false)
      setTimeout(() => commandInputRef.current?.focus(), 0)
      return
    }

    // "@" trigger for custom variables (only outside variable blocks)
    if (charTyped === "@" && !insideVariable && customVariables.length > 0) {
      const position = getCursorPosition(e.target, cursorPosition)
      setAtDropdownPos(position)
      setShowAtDropdown(true)
      setShowSlashDropdown(false)
      return
    }

    setShowSlashDropdown(false)
    setShowAtDropdown(false)
  }, [getCursorPosition, emitChange, customVariables])

  // ── Keyboard handler ──

  const handleKeyDown = useCallback((e) => {
    if (showSlashDropdown) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setShowSlashDropdown(false)
        setTimeout(() => inputRef.current?.focus(), 0)
        return
      }
    }

    if (showAtDropdown && e.key === "Escape") {
      e.preventDefault()
      setShowAtDropdown(false)
      setTimeout(() => inputRef.current?.focus(), 0)
      return
    }

    if (inlineDropdown && e.key === "Escape") {
      e.preventDefault()
      setInlineDropdown(null)
      return
    }

    // Backspace/Delete: remove whole variable block
    if (e.key === "Delete" || e.key === "Backspace") {
      const cursorPosition = e.target.selectionStart
      const textBeforeCursor = inputValue.substring(0, cursorPosition)

      if (textBeforeCursor.endsWith("}}")) {
        const match = textBeforeCursor.match(/\{\{[^}]+\}\}$/)
        if (match) {
          e.preventDefault()
          const beforeVariable = inputValue.substring(0, cursorPosition - match[0].length)
          const afterCursor = inputValue.substring(cursorPosition)
          const newValue = beforeVariable + afterCursor
          emitChange(newValue)
          setTimeout(() => {
            const newCursorPos = cursorPosition - match[0].length
            inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
          }, 0)
        }
      }
    }
  }, [inputValue, showSlashDropdown, showAtDropdown, inlineDropdown, emitChange])

  // ── Built-in variable select (/ dropdown) ──

  const handleVariableSelect = useCallback((variable) => {
    const input = inputRef.current
    if (!input) return

    const cursorPosition = input.selectionStart
    const textBeforeCursor = inputValue.substring(0, cursorPosition)
    const lastSlashIndex = textBeforeCursor.lastIndexOf("/")

    if (lastSlashIndex !== -1) {
      const beforeSlash = inputValue.substring(0, lastSlashIndex)
      const afterCursor = inputValue.substring(cursorPosition)

      const variableText = (() => {
        switch (variable.id) {
          case "dateDefault": return "{{Date(DD/MM/YYYY)}}"
          case "dateMonthName": return "{{Date(DD-MMM-YYYY)}}"
          case "dateCustom": return "{{Date(custom)}}"
          default: return `{{${variable.label}}}`
        }
      })()

      const newValue = beforeSlash + variableText + afterCursor
      emitChange(newValue)

      setTimeout(() => {
        const newCursorPos = lastSlashIndex + variableText.length
        input.setSelectionRange(newCursorPos, newCursorPos)
        input.focus()
      }, 0)
    }

    setShowSlashDropdown(false)
  }, [inputValue, emitChange])

  // ── Custom variable helpers for @ dropdown ──

  const insertAtVariable = useCallback((variableText) => {
    const input = inputRef.current
    if (!input) return

    const cursorPosition = input.selectionStart
    const textBeforeCursor = inputValue.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    if (lastAtIndex === -1) return

    const beforeAt = inputValue.substring(0, lastAtIndex)
    const afterCursor = inputValue.substring(cursorPosition)
    const newValue = beforeAt + variableText + afterCursor
    emitChange(newValue)

    setTimeout(() => {
      const newCursorPos = lastAtIndex + variableText.length
      input.setSelectionRange(newCursorPos, newCursorPos)
      input.focus()
    }, 0)

    setShowAtDropdown(false)
  }, [inputValue, emitChange])

  const handleCustomCategorySelect = useCallback((categoryName) => {
    insertAtVariable(`{{${categoryName}}}`)
  }, [insertAtVariable])

  const handleCustomValueSelect = useCallback((categoryName, value) => {
    insertAtVariable(`{{${categoryName}:${value}}}`)
  }, [insertAtVariable])

  // ── Inline category value select (clicking inside {{CategoryName}}) ──

  const handleInlineValueSelect = useCallback((value) => {
    if (!inlineDropdown) return
    const input = inputRef.current
    if (!input) return

    const { category, startIndex, endIndex } = inlineDropdown
    const before = inputValue.substring(0, startIndex)
    const after = inputValue.substring(endIndex)
    const variableText = `{{${category.name}:${value}}}`
    const newValue = before + variableText + after
    emitChange(newValue)
    setInlineDropdown(null)

    setTimeout(() => {
      const newCursorPos = startIndex + variableText.length
      input.setSelectionRange(newCursorPos, newCursorPos)
      input.focus()
    }, 0)
  }, [inputValue, inlineDropdown, emitChange])

  // ── Setup dialog save ──

  const handleSaveCustomVariables = useCallback((newVariables) => {
    if (onCustomVariablesChange) {
      onCustomVariablesChange(newVariables)
    }
  }, [onCustomVariablesChange])

  // ── Click outside handlers ──

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showSlashDropdown &&
        inputRef.current && !inputRef.current.contains(event.target) &&
        slashDropdownRef.current && !slashDropdownRef.current.contains(event.target)
      ) {
        setShowSlashDropdown(false)
      }
      // @ dropdown is handled by DropdownMenu's own onOpenChange
      if (
        inlineDropdown &&
        inputRef.current && !inputRef.current.contains(event.target) &&
        inlineDropdownRef.current && !inlineDropdownRef.current.contains(event.target)
      ) {
        setInlineDropdown(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showSlashDropdown, inlineDropdown])

  // ── Render ──

  return (
    <div className="space-y-3">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <Label className="text-gray-500 text-[12px] leading-5 font-normal block">
          Type
          <span className="inline-block mx-1 px-1.5 py-0.5 bg-white border border-gray-300 rounded-md shadow-sm text-black">
            /
          </span>
          to see a list of variables
          {customVariables.length > 0 && (
            <>
              {" "}Type
              <span className="inline-block mx-1 px-1.5 py-0.5 bg-white border border-gray-300 rounded-md shadow-sm text-black">
                @
              </span>
              for custom variables.
            </>
          )}
          <br />
          You can also save custom text.
        </Label>

        <div className="flex items-center gap-1.5">
          {/* Setup custom variables button — settings variant only */}
          {variant === "default" && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl px-3 whitespace-nowrap"
              onClick={() => setShowSetupDialog(true)}
            >
              Custom Variables
            </Button>
          )}

          {/* Info tooltip */}
          {!hideInfoTooltip && (

            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="end"
                  className="max-w-xs p-3 text-xs leading-relaxed rounded-2xl bg-zinc-800 text-white border-black"
                >
                  <p className="font-medium mb-1.5">
                    Select the Custom Date option & replace &apos;custom&apos; with any
                    combination of the tokens below.
                  </p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                    <span className="font-semibold">D</span>
                    <span className="text-gray-400">Day (1–31)</span>
                    <span className="font-semibold">DD</span>
                    <span className="text-gray-400">Day, zero-padded (01–31)</span>
                    <span className="font-semibold">M</span>
                    <span className="text-gray-400">Month (1–12)</span>
                    <span className="font-semibold">MM</span>
                    <span className="text-gray-400">Month, zero-padded (01–12)</span>
                    <span className="font-semibold">MMM</span>
                    <span className="text-gray-400">Month name (Jan, Feb…)</span>
                    <span className="font-semibold">YY</span>
                    <span className="text-gray-400">Year, 2-digit (25)</span>
                    <span className="font-semibold">YYYY</span>
                    <span className="text-gray-400">Year, 4-digit (2025)</span>
                  </div>
                  <p className="text-gray-400 mt-2">
                    Use any separator:{" "}
                    <span className="font-mono">/ - . _</span> or space
                  </p>
                  <p className="mt-1.5 text-gray-400 italic">
                    {"Example: {{Date(DD-MMM-YYYY)}} → 05-Mar-2025"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Input with dropdowns */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onClick={handleCursorCheck}
          onKeyUp={(e) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
              handleCursorCheck()
            }
          }}
          placeholder="Enter custom text or variables."
          className={cn(
            "w-full bg-white rounded-xl",
            variant === "home" && "border border-gray-300 shadow focus-visible:ring-0 focus-visible:ring-offset-0",
            dateFormatError && "border-red-400 focus-visible:ring-red-400"
          )}
        />

        {/* ── Slash (/) Dropdown — built-in variables ── */}
        {showSlashDropdown && (
          <div
            ref={slashDropdownRef}
            className="absolute z-50 w-64"
            style={{
              top: `${slashDropdownPos.top}px`,
              left: `${slashDropdownPos.left}px`,
            }}
          >
            <Command
              ref={commandInputRef}
              className="rounded-xl border shadow-md bg-white outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 [&_*]:outline-none"
            >
              <CommandList className="outline-none focus:outline-none focus-visible:outline-none">
                <CommandGroup heading="Pick Variable">
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <CommandItem
                      key={variable.id}
                      onSelect={() => handleVariableSelect(variable)}
                      className="cursor-pointer rounded-lg mx-1 aria-selected:bg-gray-100 focus:outline-none focus:ring-0"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <span className="flex items-center">
                        <span>{variable.label}</span>
                        {variable.note && (
                          <span className="text-gray-400 text-xs ml-1">
                            {variable.note}
                          </span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}

        {/* ── At (@) Dropdown — custom variables via shadcn DropdownMenu ──
            Uses a controlled DropdownMenu with an invisible trigger span
            positioned at the cursor. onCloseAutoFocus returns focus to the
            input so the user can keep typing after dismissing.
        */}
        <DropdownMenu open={showAtDropdown} onOpenChange={setShowAtDropdown}>
          <DropdownMenuTrigger asChild>
            <span
              className="absolute w-px h-px opacity-0 pointer-events-none"
              style={{
                top: `${atDropdownPos.top}px`,
                left: `${atDropdownPos.left}px`,
              }}
              tabIndex={-1}
              aria-hidden
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={0}
            className="rounded-xl min-w-[160px] bg-white"
            onCloseAutoFocus={(e) => {
              e.preventDefault()
              inputRef.current?.focus()
            }}
          >
            <DropdownMenuLabel className="text-xs text-gray-400 font-medium">
              Pick Variable
            </DropdownMenuLabel>

            {customVariables.map((cat) =>
              cat.values.length > 0 ? (
                <DropdownMenuSub key={cat.name}>
                  <DropdownMenuSubTrigger className="cursor-pointer rounded-lg">
                    {cat.name}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="rounded-xl min-w-[140px] bg-white">
                    {/* Option to insert just the category name */}
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg text-gray-400 text-xs"
                      onSelect={() => handleCustomCategorySelect(cat.name)}
                    >
                      Use &ldquo;{cat.name}&rdquo; as label
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {cat.values.map((val) => (
                      <DropdownMenuItem
                        key={val}
                        className="cursor-pointer rounded-lg"
                        onSelect={() => handleCustomValueSelect(cat.name, val)}
                      >
                        {val}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : (
                <DropdownMenuItem
                  key={cat.name}
                  className="cursor-pointer rounded-lg"
                  onSelect={() => handleCustomCategorySelect(cat.name)}
                >
                  {cat.name}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ── Inline category value dropdown ──
            Shown when user clicks inside a {{CategoryName}} block in the input.
            Displays the category's values so the user can resolve it to
            {{CategoryName:Value}}.
        */}
        {inlineDropdown && (
          <div
            ref={inlineDropdownRef}
            className="absolute z-50"
            style={{
              top: `${inlineDropdown.position.top}px`,
              left: `${inlineDropdown.position.left}px`,
            }}
          >
            <div className="rounded-xl border shadow-md bg-white overflow-hidden min-w-[160px] py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-gray-400 select-none">
                Select a value for {inlineDropdown.category.name}
              </div>
              {inlineDropdown.category.values.map((val) => (
                <div
                  key={val}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInlineValueSelect(val)}
                  className="px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 transition-colors rounded-lg mx-1"
                >
                  {val}
                </div>
              ))}
              {inlineDropdown.category.values.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-400 italic">
                  No values defined
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Date format error */}
      {dateFormatError && (
        <p className="text-red-500 text-xs mt-1">
          {dateFormatError} — hover on{" "}
          <Info className="w-3 h-3 inline-block align-text-top mx-0.5" /> to
          see valid formats
        </p>
      )}

      {/* Home variant: category-only warnings */}
      {categoryWarnings.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            {categoryWarnings.length === 1
              ? `click on "${categoryWarnings[0]}" in the input to pick a specific value. If left unselected, it will be empty in the ad name.`
              : `${categoryWarnings.map(w => `"${w}"`).join(", ")} are categories — click on them in the input to pick specific values. If left unselected, they will be empty in the ad name.`
            }
          </p>
        </div>
      )}

      {/* Setup Dialog */}
      <CustomVariablesSetupDialog
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        variables={customVariables}
        onSave={handleSaveCustomVariables}
      />
    </div>
  )
}
