// "use client"

// import { useState, useEffect, useMemo, useCallback, useRef } from "react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
// import { Info } from "lucide-react"
// import { cn } from "@/lib/utils"

// const AVAILABLE_VARIABLES = [
//   { id: 'fileName', label: 'File Name' },
//   { id: 'fileType', label: 'File Type', note: '(Static/Video)' },
//   { id: 'dateDefault', label: 'Date', note: '(DD/MM/YYYY)' },
//   { id: 'dateMonthName', label: 'Date', note: '(DD-MMM-YYYY)' },
//   { id: 'dateCustom', label: 'Date (custom)', note: 'Enter your own format' },
//   { id: 'iteration', label: 'Iteration', note: '(1/2/3..)' },
//   { id: 'slug', label: 'URL Slug', note: '(Text after last / )' },
//   { id: 'adType', label: 'Ad Type', note: 'CAR/FLEX' },
// ]

// export default function ReorderAdNameParts({
//   formulaInput = "",
//   onFormulaChange,
//   variant = "default"
// }) {
//   const [inputValue, setInputValue] = useState(formulaInput)
//   const [showDropdown, setShowDropdown] = useState(false)
//   const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
//   const [dateFormatError, setDateFormatError] = useState("")
//   const inputRef = useRef(null)
//   const dropdownRef = useRef(null)
//   const commandInputRef = useRef(null)

//   // Sync with parent's formulaInput prop
//   useEffect(() => {
//     setInputValue(formulaInput)
//   }, [formulaInput])

//   const getCursorPosition = useCallback((input, cursorIndex) => {
//     const span = document.createElement('span')
//     span.style.font = window.getComputedStyle(input).font
//     span.style.visibility = 'hidden'
//     span.style.position = 'absolute'
//     span.style.whiteSpace = 'pre'

//     const textBeforeCursor = inputValue.substring(0, cursorIndex)
//     span.textContent = textBeforeCursor

//     document.body.appendChild(span)
//     const textWidth = span.offsetWidth
//     document.body.removeChild(span)

//     const inputRect = input.getBoundingClientRect()
//     const inputStyles = window.getComputedStyle(input)
//     const paddingLeft = parseInt(inputStyles.paddingLeft)

//     return {
//       top: input.offsetHeight + 4,
//       left: paddingLeft + textWidth,
//     }
//   }, [inputValue])

//   const validateDateFormats = useCallback((value) => {
//     const dateMatches = [...value.matchAll(/\{\{Date\(([^)]+)\)\}\}/g)]

//     if (dateMatches.length === 0) {
//       setDateFormatError("")
//       return
//     }

//     for (const match of dateMatches) {
//       const fmt = match[1].toUpperCase()

//       // Skip the "custom" placeholder — handled by fallback at compute time
//       if (fmt === "CUSTOM" || "CUSTOM".startsWith(fmt)) continue

//       // Strip valid tokens (longest first to avoid partial matches)
//       const stripped = fmt
//         .replace(/YYYY/g, '')
//         .replace(/YY/g, '')
//         .replace(/MMM/g, '')
//         .replace(/MM/g, '')
//         .replace(/DD/g, '')
//         .replace(/D/g, '')
//         .replace(/M/g, '')

//       // After removing tokens, only separators and spaces should remain
//       const remaining = stripped.replace(/[\s/\-._]/g, '')

//       if (remaining.length > 0) {
//         setDateFormatError(`Invalid date token "${remaining}"`)
//         return
//       }

//       // Must have at least one valid date token
//       const hasToken = /YYYY|YY|MMM|MM|M|DD|D/.test(fmt)
//       if (!hasToken) {
//         setDateFormatError(`Date format "${fmt}" has no date tokens`)
//         return
//       }
//     }

//     setDateFormatError("")
//   }, [])

//   const handleInputChange = useCallback((e) => {
//     const newValue = e.target.value
//     const cursorPosition = e.target.selectionStart

//     setInputValue(newValue)
//     validateDateFormats(newValue)

//     if (onFormulaChange) {
//       onFormulaChange(newValue)
//     }

//     // Check if cursor is inside a {{ }} block
//     const textBefore = newValue.substring(0, cursorPosition)
//     const lastOpen = textBefore.lastIndexOf('{{')
//     const lastClose = textBefore.lastIndexOf('}}')
//     const insideVariable = lastOpen > lastClose

//     // Only show dropdown for '/' if NOT inside a variable block
//     if (newValue[cursorPosition - 1] === '/' && !insideVariable) {
//       const position = getCursorPosition(e.target, cursorPosition)
//       setDropdownPosition(position)
//       setShowDropdown(true)
//       setTimeout(() => {
//         commandInputRef.current?.focus()
//       }, 0)
//     } else {
//       setShowDropdown(false)
//     }
//   }, [getCursorPosition, onFormulaChange, validateDateFormats])


//   const handleKeyDown = useCallback((e) => {
//     if (showDropdown) {
//       if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
//         e.preventDefault()
//         return
//       }
//       if (e.key === 'Escape') {
//         e.preventDefault()
//         setShowDropdown(false)
//         setTimeout(() => {
//           inputRef.current?.focus()
//         }, 0)
//         return
//       }
//     }

//     if (e.key === 'Delete' || e.key === 'Backspace') {
//       const cursorPosition = e.target.selectionStart
//       const textBeforeCursor = inputValue.substring(0, cursorPosition)

//       if (textBeforeCursor.endsWith('}}')) {
//         const match = textBeforeCursor.match(/\{\{[^}]+\}\}$/);
//         if (match) {
//           e.preventDefault()
//           const beforeVariable = inputValue.substring(0, cursorPosition - match[0].length)
//           const afterCursor = inputValue.substring(cursorPosition)
//           const newValue = beforeVariable + afterCursor

//           setInputValue(newValue)
//           validateDateFormats(newValue)

//           if (onFormulaChange) {
//             onFormulaChange(newValue)
//           }

//           setTimeout(() => {
//             const newCursorPos = cursorPosition - match[0].length
//             inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
//           }, 0)
//         }
//       }
//     }
//   }, [inputValue, showDropdown, onFormulaChange, validateDateFormats])

//   const handleVariableSelect = useCallback((variable) => {
//     const input = inputRef.current
//     if (!input) return

//     const cursorPosition = input.selectionStart

//     const textBeforeCursor = inputValue.substring(0, cursorPosition)
//     const lastSlashIndex = textBeforeCursor.lastIndexOf('/')

//     if (lastSlashIndex !== -1) {
//       const beforeSlash = inputValue.substring(0, lastSlashIndex)
//       const afterCursor = inputValue.substring(cursorPosition)

//       const variableText = (() => {
//         switch (variable.id) {
//           case 'dateDefault': return '{{Date(DD/MM/YYYY)}}'
//           case 'dateMonthName': return '{{Date(DD-MMM-YYYY)}}'
//           case 'dateCustom': return '{{Date(custom)}}'
//           default: return `{{${variable.label}}}`
//         }
//       })()

//       const newValue = beforeSlash + variableText + afterCursor
//       setInputValue(newValue)
//       validateDateFormats(newValue)

//       if (onFormulaChange) {
//         onFormulaChange(newValue)
//       }

//       setTimeout(() => {
//         const newCursorPos = lastSlashIndex + variableText.length
//         input.setSelectionRange(newCursorPos, newCursorPos)
//         input.focus()
//       }, 0)
//     }

//     setShowDropdown(false)
//   }, [inputValue, onFormulaChange, validateDateFormats])


//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (showDropdown &&
//         inputRef.current &&
//         !inputRef.current.contains(event.target) &&
//         dropdownRef.current &&
//         !dropdownRef.current.contains(event.target)) {
//         setShowDropdown(false)
//       }
//     }

//     document.addEventListener('mousedown', handleClickOutside)
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside)
//     }
//   }, [showDropdown])


//   return (
//     <div className="space-y-3">
//       <div className="flex items-center justify-between">
//         <Label className="text-gray-500 text-[12px] leading-5 font-normal block">
//           Type
//           <span className="inline-block mx-1 px-1.5 py-0.5 bg-white border border-gray-300 rounded-md shadow-sm text-black">
//             /
//           </span>
//           to see list of variables you can use. You can also save custom text.
//         </Label>
//         <TooltipProvider delayDuration={200}>
//           <Tooltip>
//             <TooltipTrigger asChild>
//               <button
//                 type="button"
//                 className="text-gray-400 hover:text-gray-600 transition-colors"
//               >
//                 <Info className="w-3.5 h-3.5" />
//               </button>
//             </TooltipTrigger>
//             <TooltipContent
//               side="top"
//               align="end"
//               className="max-w-xs p-3 text-xs leading-relaxed rounded-2xl bg-zinc-800 text-white border-black"
//             >
//               <p className="font-medium mb-1.5">Select the Custom Date option & replace 'custom' with any combination of the tokens below.</p>

//               <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
//                 <span className="font-semibold">D</span><span className="text-gray-400">Day (1–31)</span>
//                 <span className="font-semibold">DD</span><span className="text-gray-400">Day, zero-padded (01–31)</span>
//                 <span className="font-semibold">M</span><span className="text-gray-400">Month (1–12)</span>
//                 <span className="font-semibold">MM</span><span className="text-gray-400">Month, zero-padded (01–12)</span>
//                 <span className="font-semibold">MMM</span><span className="text-gray-400">Month name (Jan, Feb…)</span>
//                 <span className="font-semibold">YY</span><span className="text-gray-400">Year, 2-digit (25)</span>
//                 <span className="font-semibold">YYYY</span><span className="text-gray-400">Year, 4-digit (2025)</span>
//               </div>
//               <p className="text-gray-400 mt-2">
//                 Use any separator: <span className="font-mono">/ - . _</span> or space
//               </p>
//               <p className="mt-1.5 text-gray-400 italic">
//                 {"Example: {{Date(DD-MMM-YYYY)}} → 05-Mar-2025"}
//               </p>
//             </TooltipContent>
//           </Tooltip>
//         </TooltipProvider>
//       </div>

//       <div className="relative">
//         <Input
//           ref={inputRef}
//           value={inputValue}
//           onChange={handleInputChange}
//           onKeyDown={handleKeyDown}
//           placeholder="Enter custom text or variables."
//           className={cn(
//             "w-full bg-white rounded-xl",
//             variant === "home" && "border border-gray-300 shadow",
//             dateFormatError && "border-red-400 focus-visible:ring-red-400"
//           )}
//         />

//         {showDropdown && (
//           <div
//             ref={dropdownRef}
//             className="absolute z-50 w-64"
//             style={{
//               top: `${dropdownPosition.top}px`,
//               left: `${dropdownPosition.left}px`
//             }}
//           >
//             <Command ref={commandInputRef} className="rounded-xl border shadow-md bg-white focus-visible:outline-none focus-visible:ring-0">
//               <CommandList>
//                 <CommandGroup heading="Pick Variable">
//                   {AVAILABLE_VARIABLES.map((variable) => (
//                     <CommandItem
//                       key={variable.id}
//                       onSelect={() => handleVariableSelect(variable)}
//                       className="cursor-pointer rounded-lg mx-1 aria-selected:bg-gray-100 focus:outline-none focus:ring-0"
//                       onMouseDown={(e) => e.preventDefault()}
//                     >
//                       <span className="flex items-center">
//                         <span>{variable.label}</span>
//                         {variable.note && (
//                           <span className="text-gray-400 text-xs ml-1">{variable.note}</span>
//                         )}
//                       </span>
//                     </CommandItem>
//                   ))}
//                 </CommandGroup>
//               </CommandList>
//             </Command>
//           </div>
//         )}
//       </div>

//       {dateFormatError && (
//         <p className="text-red-500 text-xs mt-1">
//           {dateFormatError} — hover on <Info className="w-3 h-3 inline-block align-text-top mx-0.5" /> to see valid formats
//         </p>
//       )}
//     </div>
//   )
// }


"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Command, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, Plus, X, ChevronRight, Settings2, AlertTriangle } from "lucide-react"
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

let _cvId = 0
const generateCvId = () => `cv_${Date.now()}_${++_cvId}`

// ─── Custom Variables Setup Dialog ───────────────────────────────────────────

function CustomVariablesSetupDialog({ open, onOpenChange, variables, onSave }) {
  const [editing, setEditing] = useState([])
  const [newValueInputs, setNewValueInputs] = useState({})
  const nameInputRefs = useRef({})

  // Reset working copy when dialog opens
  useEffect(() => {
    if (open) {
      const copy = variables.length > 0
        ? variables.map(v => ({ ...v, values: [...v.values] }))
        : [{ id: generateCvId(), name: "", values: [] }]
      setEditing(copy)
      setNewValueInputs({})
    }
  }, [open, variables])

  const addCategory = useCallback(() => {
    const newId = generateCvId()
    setEditing(prev => [...prev, { id: newId, name: "", values: [] }])
    // Focus the new name input after render
    setTimeout(() => {
      nameInputRefs.current[newId]?.focus()
    }, 50)
  }, [])

  const removeCategory = useCallback((id) => {
    setEditing(prev => prev.filter(c => c.id !== id))
  }, [])

  const updateCategoryName = useCallback((id, name) => {
    setEditing(prev => prev.map(c => c.id === id ? { ...c, name } : c))
  }, [])

  const addValue = useCallback((categoryId) => {
    const val = (newValueInputs[categoryId] || "").trim()
    if (!val) return

    setEditing(prev => prev.map(c => {
      if (c.id !== categoryId) return c
      if (c.values.includes(val)) return c // no duplicates
      return { ...c, values: [...c.values, val] }
    }))
    setNewValueInputs(prev => ({ ...prev, [categoryId]: "" }))
  }, [newValueInputs])

  const removeValue = useCallback((categoryId, valueIndex) => {
    setEditing(prev => prev.map(c => {
      if (c.id !== categoryId) return c
      return { ...c, values: c.values.filter((_, i) => i !== valueIndex) }
    }))
  }, [])

  const handleValueKeyDown = useCallback((e, categoryId) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addValue(categoryId)
    }
  }, [addValue])

  const handleSave = useCallback(() => {
    // Filter out categories with empty names
    const cleaned = editing
      .filter(c => c.name.trim().length > 0)
      .map(c => ({ ...c, name: c.name.trim() }))
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
            Create variable categories with values you can use in your ad naming formula.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 custom-scrollbar">
          {editing.map((category, catIndex) => (
            <div
              key={category.id}
              className="bg-gray-50 rounded-xl p-4 space-y-3 relative group"
            >
              {/* Remove category button */}
              {editing.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCategory(category.id)}
                  className="absolute top-3 right-3 text-gray-300 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Category name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  Variable Name
                </Label>
                <Input
                  ref={(el) => { nameInputRefs.current[category.id] = el }}
                  value={category.name}
                  onChange={(e) => updateCategoryName(category.id, e.target.value)}
                  placeholder="e.g. Category, URL Type, Region..."
                  className="bg-white rounded-lg h-9 text-sm"
                />
              </div>

              {/* Values */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">
                  Values
                </Label>

                {/* Existing value tags */}
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
                          onClick={() => removeValue(category.id, vi)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add value input */}
                <div className="flex items-center gap-2">
                  <Input
                    value={newValueInputs[category.id] || ""}
                    onChange={(e) =>
                      setNewValueInputs(prev => ({
                        ...prev,
                        [category.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => handleValueKeyDown(e, category.id)}
                    placeholder="Type a value and press Enter"
                    className="bg-white rounded-lg h-9 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addValue(category.id)}
                    className="h-9 w-9 p-0 rounded-lg shrink-0"
                    disabled={!(newValueInputs[category.id] || "").trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Add category button */}
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

        <DialogFooter className="pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white"
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
}) {
  const [inputValue, setInputValue] = useState(formulaInput)

  // Slash (/) dropdown state — existing built-in variables
  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

  // At (@) dropdown state — custom variables nested picker
  const [showAtDropdown, setShowAtDropdown] = useState(false)
  const [atDropdownPosition, setAtDropdownPosition] = useState({ top: 0, left: 0 })
  const [hoveredCategory, setHoveredCategory] = useState(null)

  // Inline category value dropdown (when cursor is inside {{CategoryName}})
  const [inlineDropdown, setInlineDropdown] = useState(null)
  // Shape: { category: {id, name, values}, startIndex, endIndex, position: {top, left} }

  // Setup dialog
  const [showSetupDialog, setShowSetupDialog] = useState(false)

  // Date format validation
  const [dateFormatError, setDateFormatError] = useState("")

  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const atDropdownRef = useRef(null)
  const inlineDropdownRef = useRef(null)
  const commandInputRef = useRef(null)

  // Sync with parent prop
  useEffect(() => {
    setInputValue(formulaInput)
  }, [formulaInput])

  // ── Derived: warnings for home variant ──

  const categoryWarnings = useMemo(() => {
    if (variant !== "home" || !customVariables.length) return []

    const warnings = []
    // Match {{SomeText}} that does NOT contain a colon (category-only references)
    const regex = /\{\{([^:}]+)\}\}/g
    let match
    while ((match = regex.exec(inputValue)) !== null) {
      const content = match[1].trim()
      // Only warn if it matches a known custom variable category name
      // and is NOT a built-in variable
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
        .replace(/YYYY/g, "")
        .replace(/YY/g, "")
        .replace(/MMM/g, "")
        .replace(/MM/g, "")
        .replace(/DD/g, "")
        .replace(/D/g, "")
        .replace(/M/g, "")
      const remaining = stripped.replace(/[\s/\-._]/g, "")
      if (remaining.length > 0) {
        setDateFormatError(`Invalid date token "${remaining}"`)
        return
      }
      const hasToken = /YYYY|YY|MMM|MM|M|DD|D/.test(fmt)
      if (!hasToken) {
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

    // Must be a category-only reference (no colon) matching a known category
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
    // Don't show inline dropdown if @ dropdown or / dropdown is open
    if (showDropdown || showAtDropdown) {
      setInlineDropdown(null)
      return
    }
    const input = inputRef.current
    if (!input) return
    const cursorPos = input.selectionStart
    const result = detectInlineCategory(cursorPos)
    setInlineDropdown(result)
  }, [detectInlineCategory, showDropdown, showAtDropdown])

  // ── Input change handler ──

  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value
    const cursorPosition = e.target.selectionStart

    emitChange(newValue)

    // Close inline dropdown on typing
    setInlineDropdown(null)

    // Check if cursor is inside a {{ }} block
    const textBefore = newValue.substring(0, cursorPosition)
    const lastOpen = textBefore.lastIndexOf("{{")
    const lastClose = textBefore.lastIndexOf("}}")
    const insideVariable = lastOpen > lastClose

    const charTyped = newValue[cursorPosition - 1]

    // "/" trigger for built-in variables (only outside variable blocks)
    if (charTyped === "/" && !insideVariable) {
      const position = getCursorPosition(e.target, cursorPosition)
      setDropdownPosition(position)
      setShowDropdown(true)
      setShowAtDropdown(false)
      setTimeout(() => commandInputRef.current?.focus(), 0)
      return
    }

    // "@" trigger for custom variables (only outside variable blocks)
    if (charTyped === "@" && !insideVariable && customVariables.length > 0) {
      const position = getCursorPosition(e.target, cursorPosition)
      setAtDropdownPosition(position)
      setShowAtDropdown(true)
      setShowDropdown(false)
      setHoveredCategory(customVariables[0]?.id || null)
      return
    }

    // Close dropdowns otherwise
    setShowDropdown(false)
    setShowAtDropdown(false)
  }, [getCursorPosition, emitChange, customVariables])

  // ── Keyboard handler ──

  const handleKeyDown = useCallback((e) => {
    if (showDropdown) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setShowDropdown(false)
        setTimeout(() => inputRef.current?.focus(), 0)
        return
      }
    }

    if (showAtDropdown) {
      if (e.key === "Escape") {
        e.preventDefault()
        setShowAtDropdown(false)
        setTimeout(() => inputRef.current?.focus(), 0)
        return
      }
    }

    if (inlineDropdown) {
      if (e.key === "Escape") {
        e.preventDefault()
        setInlineDropdown(null)
        return
      }
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
  }, [inputValue, showDropdown, showAtDropdown, inlineDropdown, emitChange])

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
          case "dateDefault":
            return "{{Date(DD/MM/YYYY)}}"
          case "dateMonthName":
            return "{{Date(DD-MMM-YYYY)}}"
          case "dateCustom":
            return "{{Date(custom)}}"
          default:
            return `{{${variable.label}}}`
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

    setShowDropdown(false)
  }, [inputValue, emitChange])

  // ── Custom variable select (@ dropdown) ──

  const handleCustomCategorySelect = useCallback((category) => {
    const input = inputRef.current
    if (!input) return

    const cursorPosition = input.selectionStart
    const textBeforeCursor = inputValue.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    if (lastAtIndex !== -1) {
      const beforeAt = inputValue.substring(0, lastAtIndex)
      const afterCursor = inputValue.substring(cursorPosition)
      const variableText = `{{${category.name}}}`
      const newValue = beforeAt + variableText + afterCursor
      emitChange(newValue)

      setTimeout(() => {
        const newCursorPos = lastAtIndex + variableText.length
        input.setSelectionRange(newCursorPos, newCursorPos)
        input.focus()
      }, 0)
    }

    setShowAtDropdown(false)
    setHoveredCategory(null)
  }, [inputValue, emitChange])

  const handleCustomValueSelect = useCallback((categoryId, value) => {
    const input = inputRef.current
    if (!input) return

    const category = customVariables.find(c => c.id === categoryId)
    if (!category) return

    const cursorPosition = input.selectionStart
    const textBeforeCursor = inputValue.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    if (lastAtIndex !== -1) {
      const beforeAt = inputValue.substring(0, lastAtIndex)
      const afterCursor = inputValue.substring(cursorPosition)
      const variableText = `{{${category.name}:${value}}}`
      const newValue = beforeAt + variableText + afterCursor
      emitChange(newValue)

      setTimeout(() => {
        const newCursorPos = lastAtIndex + variableText.length
        input.setSelectionRange(newCursorPos, newCursorPos)
        input.focus()
      }, 0)
    }

    setShowAtDropdown(false)
    setHoveredCategory(null)
  }, [inputValue, customVariables, emitChange])

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
      // / dropdown
      if (
        showDropdown &&
        inputRef.current && !inputRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setShowDropdown(false)
      }
      // @ dropdown
      if (
        showAtDropdown &&
        inputRef.current && !inputRef.current.contains(event.target) &&
        atDropdownRef.current && !atDropdownRef.current.contains(event.target)
      ) {
        setShowAtDropdown(false)
        setHoveredCategory(null)
      }
      // inline dropdown
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
  }, [showDropdown, showAtDropdown, inlineDropdown])

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
          to see list of variables you can use.
          {customVariables.length > 0 && (
            <>
              {" "}Type
              <span className="inline-block mx-1 px-1.5 py-0.5 bg-white border border-gray-300 rounded-md shadow-sm text-black">
                @
              </span>
              for custom variables.
            </>
          )}
          {" "}You can also save custom text.
        </Label>

        <div className="flex items-center gap-1.5">
          {/* Setup custom variables button — settings variant only */}
          {variant === "default" && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setShowSetupDialog(true)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs rounded-lg">
                  Set up custom variables
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Info tooltip */}
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
            // Re-check on arrow keys for cursor movement
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
              handleCursorCheck()
            }
          }}
          placeholder="Enter custom text or variables."
          className={cn(
            "w-full bg-white rounded-xl",
            variant === "home" && "border border-gray-300 shadow",
            dateFormatError && "border-red-400 focus-visible:ring-red-400"
          )}
        />

        {/* ── Slash (/) Dropdown — built-in variables ── */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-64"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            <Command
              ref={commandInputRef}
              className="rounded-xl border shadow-md bg-white focus-visible:outline-none focus-visible:ring-0"
            >
              <CommandList>
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

        {/* ── At (@) Dropdown — custom variables nested picker ── */}
        {showAtDropdown && customVariables.length > 0 && (
          <div
            ref={atDropdownRef}
            className="absolute z-50"
            style={{
              top: `${atDropdownPosition.top}px`,
              left: `${atDropdownPosition.left}px`,
            }}
          >
            <div className="flex rounded-xl border shadow-md bg-white overflow-hidden">
              {/* Left panel: categories */}
              <div className="border-r min-w-[150px] py-1">
                <div className="px-3 py-1.5 text-xs font-medium text-gray-400 select-none">
                  Pick Variable
                </div>
                {customVariables.map((cat) => (
                  <div
                    key={cat.id}
                    onMouseEnter={() => setHoveredCategory(cat.id)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleCustomCategorySelect(cat)}
                    className={cn(
                      "px-3 py-2 cursor-pointer flex items-center justify-between text-sm transition-colors",
                      hoveredCategory === cat.id
                        ? "bg-gray-100"
                        : "hover:bg-gray-50"
                    )}
                  >
                    <span>{cat.name}</span>
                    {cat.values.length > 0 && (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 ml-2 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Right panel: values for hovered category */}
              {hoveredCategory && (() => {
                const cat = customVariables.find(c => c.id === hoveredCategory)
                if (!cat || cat.values.length === 0) return null
                return (
                  <div className="min-w-[150px] py-1">
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-400 select-none">
                      {cat.name}
                    </div>
                    {cat.values.map((val) => (
                      <div
                        key={val}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleCustomValueSelect(cat.id, val)}
                        className="px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 transition-colors"
                      >
                        {val}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* ── Inline category value dropdown ── */}
        {inlineDropdown && (
          <div
            ref={inlineDropdownRef}
            className="absolute z-50"
            style={{
              top: `${inlineDropdown.position.top}px`,
              left: `${inlineDropdown.position.left}px`,
            }}
          >
            <div className="rounded-xl border shadow-md bg-white overflow-hidden min-w-[150px] py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-gray-400 select-none">
                Select a value for {inlineDropdown.category.name}
              </div>
              {inlineDropdown.category.values.map((val) => (
                <div
                  key={val}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInlineValueSelect(val)}
                  className="px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 transition-colors"
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
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            {categoryWarnings.length === 1
              ? `"${categoryWarnings[0]}" is a category — click on it in the input to pick a specific value. If left unselected, it will be empty in the ad name.`
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