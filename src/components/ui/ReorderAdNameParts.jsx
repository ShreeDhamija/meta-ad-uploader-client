
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
  { id: 'adType', label: 'File Type' },
  { id: 'dateMonthYYYY', label: 'Date (MonthYYYY)' },
  { id: 'dateMonthDDYYYY', label: 'Date (MonthDDYYYY)' },
  { id: 'iteration', label: 'Iteration' }
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

  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value
    const cursorPosition = e.target.selectionStart

    setInputValue(newValue)

    // Check if user just typed '/'
    if (newValue[cursorPosition - 1] === '/') {
      const position = getCursorPosition(e.target, cursorPosition)
      setDropdownPosition(position)
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
    }
  }, [getCursorPosition])

  const handleKeyDown = useCallback((e) => {
    // Handle smart delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const cursorPosition = e.target.selectionStart
      const textBeforeCursor = inputValue.substring(0, cursorPosition)

      // Check if cursor is right after }}
      if (textBeforeCursor.endsWith('}}')) {
        // Find the matching {{ before it
        const match = textBeforeCursor.match(/\{\{[^}]+\}\}$/);
        if (match) {
          e.preventDefault()
          const beforeVariable = inputValue.substring(0, cursorPosition - match[0].length)
          const afterCursor = inputValue.substring(cursorPosition)
          const newValue = beforeVariable + afterCursor

          setInputValue(newValue)

          // Position cursor where variable was deleted
          setTimeout(() => {
            const newCursorPos = cursorPosition - match[0].length
            inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
          }, 0)
        }
      }
    }
  }, [inputValue])

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

      // Position cursor after the inserted variable
      setTimeout(() => {
        const newCursorPos = lastSlashIndex + variableText.length
        input.setSelectionRange(newCursorPos, newCursorPos)
        input.focus()
      }, 0)
    }

    setShowDropdown(false)
  }, [inputValue])

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
      top: inputRect.bottom + window.scrollY + 4, // 4px gap
      left: inputRect.left + window.scrollX + paddingLeft + textWidth
    }
  }, [inputValue])


  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}  // This was missing!
          placeholder="Enter ad name formula... Type / to add variables"
          className="w-full bg-white rounded-xl"
        />

        {showDropdown && (
          <div
            className="fixed z-50 w-64"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            <Command className="rounded-lg border shadow-md bg-white">
              <CommandList>
                <CommandGroup heading="Insert Variable">
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <CommandItem
                      key={variable.id}
                      onSelect={() => handleVariableSelect(variable)}
                      className="cursor-pointer"
                    >
                      {variable.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>
    </div>
  )
}

// const labelMap = {
//   adType: "File Type",
//   dateType: "Date",
//   fileName: "File Name",
//   iteration: "Iteration",

// }

// const getLabel = (id) => {
//   if (id.startsWith("customText_")) {
//     return "Custom Text";
//   }
//   return labelMap[id];
// }

// const valueOptions = {
//   dateType: ["MonthYYYY", "MonthDDYYYY"],
// }

// function CustomRadioButton({ checked, onClick, disabled = false }) {
//   return (
//     <div
//       className={cn(
//         "relative flex items-center justify-center cursor-pointer",
//         disabled && "cursor-not-allowed opacity-50",
//       )}
//       onClick={disabled ? undefined : onClick}
//     >
//       <div
//         className={cn(
//           "w-4 h-4 rounded-full border-2 bg-white transition-colors",
//           checked ? "border-black" : "border-gray-400",
//         )}
//       >
//         {checked && (
//           <div className="absolute inset-0 flex items-center justify-center">
//             <div className="w-2 h-2 rounded-full bg-black"></div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

// function SortableItem({ id, isSelected, onToggle, setValues, values, variant, setOrder }) {
//   const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
//     id,
//   })

//   const style = {
//     transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
//     transition,
//   }

//   const [dateDropdownOpen, setDateDropdownOpen] = useState(false)
//   const [selectedDateOption, setSelectedDateOption] = useState(values.dateType || "MonthYYYY");

//   useEffect(() => {
//     if (values?.dateType) {
//       setSelectedDateOption(values.dateType);
//     }
//   }, [values.dateType]);

//   // Auto-open date dropdown when date is selected
//   const handleDateToggle = () => {
//     if (!isSelected) {
//       onToggle()
//       setDateDropdownOpen(true)
//     } else {
//       onToggle()
//       setDateDropdownOpen(false)
//     }
//   }

//   const handleDateOptionSelect = (option) => {
//     setSelectedDateOption(option);
//     setValues((prev) => ({
//       ...prev,
//       dateType: option,
//     }));
//     setDateDropdownOpen(false);
//   };


//   // In ReorderAdNameParts.jsx, update the renderContent function:

//   const renderContent = () => {
//     // Handle multiple custom text fields
//     if (id.startsWith("customText_")) {
//       const customTextId = id;
//       const customTextData = values.customTexts?.[customTextId] || {};

//       return (
//         <div className="flex items-center gap-2 flex-1">
//           <CustomRadioButton
//             checked={isSelected}
//             onClick={onToggle}
//           />
//           <Input
//             value={customTextData.text || ""}
//             onChange={(e) => {
//               const newText = e.target.value;
//               setValues((prev) => ({
//                 ...prev,
//                 customTexts: {
//                   ...prev.customTexts,
//                   [customTextId]: {
//                     ...prev.customTexts?.[customTextId],
//                     text: newText
//                   }
//                 }
//               }));

//               if (newText.trim() !== "" && !isSelected) {
//                 onToggle();
//               } else if (newText.trim() === "" && isSelected) {
//                 onToggle();
//               }
//             }}
//             placeholder="Enter Custom Text"
//             className="flex-1 h-6 rounded-lg bg-gray-100 focus:ring-0 focus:outline-none shadow-none ring-0 focus:shadow-none"
//           />
//           {variant === "default" && (
//             <button
//               onClick={() => {
//                 // Remove this custom text field
//                 setOrder((prev) => prev.filter(item => item !== customTextId));
//                 setValues((prev) => {
//                   const newCustomTexts = { ...prev.customTexts };
//                   delete newCustomTexts[customTextId];
//                   return { ...prev, customTexts: newCustomTexts };
//                 });
//               }}
//               className="w-6 h-6 !text-xs flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
//             >
//               <Trash2 className="w-3 h-3" />
//             </button>
//           )}
//         </div>
//       )
//     }

//     if (id === "dateType") {
//       return (
//         <div className="flex items-center gap-2">
//           <CustomRadioButton checked={isSelected} onClick={handleDateToggle} />
//           <span className="text-xs">
//             {getLabel(id)}
//           </span>
//           {isSelected && (
//             <Popover open={dateDropdownOpen} onOpenChange={setDateDropdownOpen}>
//               <PopoverTrigger asChild>
//                 <Button variant="ghost" size="sm" className="text-xs px-1 py-0 h-auto ml-1">
//                   {selectedDateOption}
//                   <ChevronsUpDown className="ml-1 w-3 h-3 opacity-50" />
//                 </Button>
//               </PopoverTrigger>
//               <PopoverContent
//                 className="p-2 rounded-xl bg-white border z-50 w-[160px]"
//                 align="start"
//                 sideOffset={8}
//                 alignOffset={-4}
//                 avoidCollisions={false}
//               >
//                 <div className="flex flex-col space-y-1">
//                   {valueOptions.dateType.map((option) => (
//                     <button
//                       key={option}
//                       onClick={() => handleDateOptionSelect(option)}
//                       className={cn(
//                         "text-left px-2 py-1 rounded-lg text-xs hover:bg-gray-100",
//                         selectedDateOption === option && "bg-gray-100",
//                       )}
//                     >
//                       {option}
//                     </button>
//                   ))}
//                 </div>
//               </PopoverContent>
//             </Popover>
//           )}
//         </div>
//       )
//     }

//     // Default case for adType, fileName, iteration

//     return (
//       <div className="flex items-center gap-2">
//         <CustomRadioButton checked={isSelected} onClick={onToggle} />
//         <span className="text-xs">
//           {getLabel(id)}
//         </span>
//         {variant === "home" && id === "adType" && (
//           <span className="text-gray-500 text-[10px] font-medium">
//             (Static/Video)
//           </span>
//         )}
//         {variant === "home" && id === "iteration" && (
//           <span className="text-gray-500 text-[10px] font-medium">
//             (1/2/3...)
//           </span>
//         )}
//       </div>
//     )

//   }

//   return (
//     <div
//       ref={setNodeRef}
//       style={style}
//       className={cn(
//         "flex items-center px-2 py-1 rounded-xl border bg-white shadow-sm gap-2 min-h-[36px]",
//         isDragging ? "opacity-50 border-gray-400" : "hover:bg-gray-50 border-gray-300",
//         id === "customText" && "flex-1 min-w-[200px]",
//       )}
//     >
//       <GripVertical
//         ref={setActivatorNodeRef}
//         className="w-3 h-3 text-gray-400 cursor-move flex-shrink-0"
//         {...listeners}
//         {...attributes}
//       />
//       {renderContent()}
//     </div>
//   )
// }

// export default function ReorderAdNameParts({
//   order,
//   setOrder,
//   values,
//   setValues,
//   variant = "default",
//   selectedItems = [],
//   onItemToggle,

// }) {
//   const sensors = useSensors(useSensor(PointerSensor))

//   const handleDragEnd = (event) => {
//     const { active, over } = event;
//     if (active.id !== over?.id) {
//       setOrder((prevOrder) => {
//         const oldIndex = prevOrder.indexOf(active.id);
//         const newIndex = prevOrder.indexOf(over.id);
//         return arrayMove(prevOrder, oldIndex, newIndex);
//       });
//     }
//   };




//   // Add this after your state declarations
//   const formulaParts = useMemo(() =>
//     order.map((key) => {
//       if (!selectedItems.includes(key)) return null;
//       if (key === "adType") return "[File_Type]";
//       if (key === "dateType") return values.dateType;
//       if (key === "fileName") return "File Name";
//       if (key === "iteration") return "itr";

//       if (key.startsWith("customText_")) {
//         const customText = values.customTexts?.[key]?.text;
//         return customText || "Custom Text";
//       }

//       return null;
//     }).filter(Boolean),
//     [order, selectedItems, values]
//   );


//   return (
//     <div className="space-y-3">
//       <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
//         <SortableContext items={order} strategy={verticalListSortingStrategy}>
//           <div className="bg-gray-200 p-1 rounded-xl">
//             <div className="flex flex-col gap-2">
//               {order.map((id) => (
//                 <SortableItem
//                   key={id}
//                   id={id}
//                   isSelected={selectedItems.includes(id)}
//                   onToggle={() => onItemToggle(id)}
//                   setValues={setValues}
//                   values={values}
//                   variant={variant}
//                   setOrder={setOrder}
//                 />
//               ))}
//             </div>
//           </div>
//         </SortableContext>
//       </DndContext>
//       <Button
//         type="button"
//         onClick={() => {
//           const newId = `customText_${Date.now()}`;
//           setOrder((prev) => [...prev, newId]);
//           setValues((prev) => ({
//             ...prev,
//             customTexts: {
//               ...prev.customTexts,
//               [newId]: { text: "" }
//             }
//           }));
//         }}
//         className={cn(
//           "mt-2 w-full rounded-xl", // Base classes for all variants
//           {
//             "bg-zinc-700 hover:bg-zinc-900 text-white": variant === "default",
//             "bg-zinc-600 hover:bg-black text-white text-xs h-8": variant === "home"
//           }
//         )}
//       >
//         + Add Custom Text Field
//       </Button>
//       <div className="space-y-1">
//         <label className="text-xs text-gray-500">Ad Name Preview</label>
//         <div className="flex items-center w-full border border-gray-400 rounded-xl bg-white px-1 py-2 shadow h-[35px]">
//           {formulaParts.length > 0 ? (
//             <div className="flex items-center">
//               {formulaParts.map((part, index) => (
//                 <div key={index} className="flex items-center">
//                   {/* Note: You might want to map `part` to a more user-friendly label here later */}
//                   <span className="bg-gray-200 text-xs px-2 py-1 rounded-[8px]">{part}</span>
//                   {index < formulaParts.length - 1 && <span className="text-sm text-gray-500 mx-1">_</span>}
//                 </div>
//               ))}
//             </div>
//           ) : (
//             // --- HERE IS THE FIX ---
//             <span className="text-gray-400 text-sm px-2">
//               Select items above to build ad name...
//             </span>
//           )}
//         </div>
//       </div>

//     </div>
//   )
// }
