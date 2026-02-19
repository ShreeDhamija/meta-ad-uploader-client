"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

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

export default function ReorderAdNameParts({
  formulaInput = "",
  onFormulaChange,
  variant = "default"
}) {
  const [inputValue, setInputValue] = useState(formulaInput)
  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [dateFormatError, setDateFormatError] = useState("")
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const commandInputRef = useRef(null)

  // Sync with parent's formulaInput prop
  useEffect(() => {
    setInputValue(formulaInput)
  }, [formulaInput])

  const getCursorPosition = useCallback((input, cursorIndex) => {
    const span = document.createElement('span')
    span.style.font = window.getComputedStyle(input).font
    span.style.visibility = 'hidden'
    span.style.position = 'absolute'
    span.style.whiteSpace = 'pre'

    const textBeforeCursor = inputValue.substring(0, cursorIndex)
    span.textContent = textBeforeCursor

    document.body.appendChild(span)
    const textWidth = span.offsetWidth
    document.body.removeChild(span)

    const inputRect = input.getBoundingClientRect()
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

      // Skip the "custom" placeholder — handled by fallback at compute time
      if (fmt === "custom") continue

      // Strip valid tokens (longest first to avoid partial matches)
      const stripped = fmt
        .replace(/YYYY/g, '')
        .replace(/YY/g, '')
        .replace(/MMM/g, '')
        .replace(/MM/g, '')
        .replace(/DD/g, '')
        .replace(/D/g, '')
        .replace(/M/g, '')

      // After removing tokens, only separators and spaces should remain
      const remaining = stripped.replace(/[\s/\-._]/g, '')

      if (remaining.length > 0) {
        setDateFormatError(`Invalid date token "${remaining}"`)
        return
      }

      // Must have at least one valid date token
      const hasToken = /YYYY|YY|MMM|MM|M|DD|D/.test(fmt)
      if (!hasToken) {
        setDateFormatError(`Date format "${fmt}" has no date tokens`)
        return
      }
    }

    setDateFormatError("")
  }, [])

  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value
    const cursorPosition = e.target.selectionStart

    setInputValue(newValue)
    validateDateFormats(newValue)

    if (onFormulaChange) {
      onFormulaChange(newValue)
    }

    // Check if cursor is inside a {{ }} block
    const textBefore = newValue.substring(0, cursorPosition)
    const lastOpen = textBefore.lastIndexOf('{{')
    const lastClose = textBefore.lastIndexOf('}}')
    const insideVariable = lastOpen > lastClose

    // Only show dropdown for '/' if NOT inside a variable block
    if (newValue[cursorPosition - 1] === '/' && !insideVariable) {
      const position = getCursorPosition(e.target, cursorPosition)
      setDropdownPosition(position)
      setShowDropdown(true)
      setTimeout(() => {
        commandInputRef.current?.focus()
      }, 0)
    } else {
      setShowDropdown(false)
    }
  }, [getCursorPosition, onFormulaChange, validateDateFormats])


  const handleKeyDown = useCallback((e) => {
    if (showDropdown) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowDropdown(false)
        setTimeout(() => {
          inputRef.current?.focus()
        }, 0)
        return
      }
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const cursorPosition = e.target.selectionStart
      const textBeforeCursor = inputValue.substring(0, cursorPosition)

      if (textBeforeCursor.endsWith('}}')) {
        const match = textBeforeCursor.match(/\{\{[^}]+\}\}$/);
        if (match) {
          e.preventDefault()
          const beforeVariable = inputValue.substring(0, cursorPosition - match[0].length)
          const afterCursor = inputValue.substring(cursorPosition)
          const newValue = beforeVariable + afterCursor

          setInputValue(newValue)
          validateDateFormats(newValue)

          if (onFormulaChange) {
            onFormulaChange(newValue)
          }

          setTimeout(() => {
            const newCursorPos = cursorPosition - match[0].length
            inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
          }, 0)
        }
      }
    }
  }, [inputValue, showDropdown, onFormulaChange, validateDateFormats])

  const handleVariableSelect = useCallback((variable) => {
    const input = inputRef.current
    if (!input) return

    const cursorPosition = input.selectionStart

    const textBeforeCursor = inputValue.substring(0, cursorPosition)
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/')

    if (lastSlashIndex !== -1) {
      const beforeSlash = inputValue.substring(0, lastSlashIndex)
      const afterCursor = inputValue.substring(cursorPosition)

      const variableText = (() => {
        switch (variable.id) {
          case 'dateDefault': return '{{Date(DD/MM/YYYY)}}'
          case 'dateMonthName': return '{{Date(DD-MMM-YYYY)}}'
          case 'dateCustom': return '{{Date(custom)}}'
          default: return `{{${variable.label}}}`
        }
      })()

      const newValue = beforeSlash + variableText + afterCursor
      setInputValue(newValue)
      validateDateFormats(newValue)

      if (onFormulaChange) {
        onFormulaChange(newValue)
      }

      setTimeout(() => {
        const newCursorPos = lastSlashIndex + variableText.length
        input.setSelectionRange(newCursorPos, newCursorPos)
        input.focus()
      }, 0)
    }

    setShowDropdown(false)
  }, [inputValue, onFormulaChange, validateDateFormats])


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown &&
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])


  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-gray-500 text-[12px] leading-5 font-normal block">
          Type
          <span className="inline-block mx-1 px-1.5 py-0.5 bg-white border border-gray-300 rounded-md shadow-sm text-black">
            /
          </span>
          to see list of variables you can use. You can also save custom text.
        </Label>
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
              <p className="font-medium mb-1.5">Type / to insert variables</p>
              <p className="text-gray-400 mb-2">
                Date formats are fully customizable. Tokens:
              </p>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                <span className="font-semibold">D</span><span className="text-gray-400">Day (1–31)</span>
                <span className="font-semibold">DD</span><span className="text-gray-400">Day, zero-padded (01–31)</span>
                <span className="font-semibold">M</span><span className="text-gray-400">Month (1–12)</span>
                <span className="font-semibold">MM</span><span className="text-gray-400">Month, zero-padded (01–12)</span>
                <span className="font-semibold">MMM</span><span className="text-gray-400">Month name (Jan, Feb…)</span>
                <span className="font-semibold">YY</span><span className="text-gray-400">Year, 2-digit (25)</span>
                <span className="font-semibold">YYYY</span><span className="text-gray-400">Year, 4-digit (2025)</span>
              </div>
              <p className="text-gray-400 mt-2">
                Use any separator: <span className="font-mono">/ - . _</span> or space
              </p>
              <p className="mt-1.5 text-gray-400 italic">
                {"Example: {{Date(DD-MMM-YYYY)}} → 05-Mar-2025"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter custom text or variables."
          className={cn(
            "w-full bg-white rounded-xl",
            variant === "home" && "border border-gray-300 shadow",
            dateFormatError && "border-red-400 focus-visible:ring-red-400"
          )}
        />

        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-64"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            <Command ref={commandInputRef} className="rounded-xl border shadow-md bg-white focus-visible:outline-none focus-visible:ring-0">
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
                          <span className="text-gray-400 text-xs ml-1">{variable.note}</span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>

      {dateFormatError && (
        <p className="text-red-500 text-xs mt-1">
          {dateFormatError} — hover on <Info className="w-3 h-3 inline-block align-text-top mx-0.5" /> to see valid formats
        </p>
      )}
    </div>
  )
}