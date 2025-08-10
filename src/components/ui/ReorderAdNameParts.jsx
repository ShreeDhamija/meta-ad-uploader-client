
"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
// import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
// import { arrayMove, SortableContext, useSortable, horizontalListSortingStrategy, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// import { ChevronsUpDown, GripVertical, Trash2 } from "lucide-react"
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command"
import { cn } from "@/lib/utils"

const AVAILABLE_VARIABLES = [
  { id: 'fileName', label: 'File Name' },
  { id: 'adType', main: 'File Type', note: '(Static/Video)' },
  { id: 'dateMonthYYYY', label: 'Date (MonthYYYY)' },
  { id: 'dateMonthDDYYYY', label: 'Date (MonthDDYYYY)' },
  { id: 'iteration', label: 'Iteration (1/2/3)', note: '(1/2/3..)' },
]

export default function ReorderAdNameParts({
  formulaInput = "",
  onFormulaChange,
  variant = "default"
}) {
  const [inputValue, setInputValue] = useState(formulaInput)
  const [showDropdown, setShowDropdown] = useState(false) // Add this
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 }) // Add this
  const inputRef = useRef(null)
  const commandInputRef = useRef(null)

  // Sync with parent's formulaInput prop
  useEffect(() => {
    setInputValue(formulaInput)
  }, [formulaInput])

  const getCursorPosition = useCallback((input, cursorIndex) => {
    // Create a temporary span to measure text width
    const span = document.createElement('span')
    span.style.font = window.getComputedStyle(input).font
    span.style.visibility = 'hidden'
    span.style.position = 'absolute'
    span.style.whiteSpace = 'pre'

    // Get text up to cursor position
    const textBeforeCursor = inputValue.substring(0, cursorIndex)
    span.textContent = textBeforeCursor

    document.body.appendChild(span)
    const textWidth = span.offsetWidth
    document.body.removeChild(span)

    // Get input's position and padding
    const inputRect = input.getBoundingClientRect()
    const inputStyles = window.getComputedStyle(input)
    const paddingLeft = parseInt(inputStyles.paddingLeft)

    return {
      top: input.offsetHeight + 4, // Position below the input, plus 4px gap
      left: paddingLeft + textWidth, // Position relative to the input's left edge
    }
  }, [inputValue])



  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value
    const cursorPosition = e.target.selectionStart

    setInputValue(newValue)

    if (onFormulaChange) {
      onFormulaChange(newValue)
    }

    // Check if user just typed '/'
    if (newValue[cursorPosition - 1] === '/') {
      const position = getCursorPosition(e.target, cursorPosition)
      setDropdownPosition(position)
      setShowDropdown(true)
      setTimeout(() => {
        commandInputRef.current?.focus()
      }, 0)
    } else {
      setShowDropdown(false)
    }
  }, [getCursorPosition, onFormulaChange]) // Add onFormulaChange to dependencies


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

          // Update parent state
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
  }, [inputValue, showDropdown, onFormulaChange])

  const handleVariableSelect = useCallback((variable) => {
    const input = inputRef.current
    if (!input) return

    const cursorPosition = input.selectionStart

    // Find the last "/" before cursor position
    const textBeforeCursor = inputValue.substring(0, cursorPosition)
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/')

    if (lastSlashIndex !== -1) {
      const beforeSlash = inputValue.substring(0, lastSlashIndex)
      const afterCursor = inputValue.substring(cursorPosition)
      const variableText = `{{${variable.label}}}`

      const newValue = beforeSlash + variableText + afterCursor
      setInputValue(newValue)


      // Update parent state
      if (onFormulaChange) {
        onFormulaChange(newValue)
      }


      // Position cursor after the inserted variable
      setTimeout(() => {
        const newCursorPos = lastSlashIndex + variableText.length
        input.setSelectionRange(newCursorPos, newCursorPos)
        input.focus()
      }, 0)
    }

    setShowDropdown(false)
  }, [inputValue, onFormulaChange]) // Add onFormulaChange to dependencies





  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}  // This was missing!
          placeholder="Enter custom text or variables."
          className={cn(
            "w-full bg-white rounded-xl",
            variant === "home" && "border border-gray-500"
          )}
        />

        {showDropdown && (
          <div
            className="absolute z-50 w-64"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            <Command ref={commandInputRef} className="rounded-xl border shadow-md bg-white focus-visible:outline-none focus-visible:ring-0">
              <CommandList>
                <CommandGroup heading="Insert Variable">
                  {AVAILABLE_VARIABLES.map((variable) => {
                    const mainText = variable.main || variable.label || '';
                    const noteText = variable.note || '';

                    return (
                      <CommandItem
                        key={variable.id}
                        onSelect={() => handleVariableSelect(variable)}
                        className="cursor-pointer rounded-lg mx-1 aria-selected:bg-gray-100 focus:outline-none focus:ring-0"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <span className="flex items-center">
                          <span>{mainText}</span>
                          {noteText && (
                            <span className="text-gray-400 ml-2">{noteText}</span>
                          )}
                        </span>
                      </CommandItem>
                    );
                  })}

                  {/* {AVAILABLE_VARIABLES.map((variable) => (

                    <CommandItem
                      key={variable.id}
                      onSelect={() => handleVariableSelect(variable)}
                      className="cursor-pointer rounded-lg mx-1 aria-selected:bg-gray-100 focus:outline-none focus:ring-0"
                      onMouseDown={(e) => e.preventDefault()} // Prevent focus on click
                    >
                      {variable.label}
                    </CommandItem>
                  ))} */}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>
    </div>
  )
}

