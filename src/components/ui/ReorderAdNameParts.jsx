
"use client"

import { useState } from "react"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove, SortableContext, useSortable, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronsUpDown, GripVertical } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const labelMap = {
  adType: "File Type",
  dateType: "Date",
  fileName: "File Name",
  iteration: "Iteration",
  customText: "Custom Text",
}

const valueOptions = {
  dateType: ["MonthYYYY", "MonthDDYYYY"],
}

function CustomRadioButton({ checked, onClick, disabled = false }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center cursor-pointer",
        disabled && "cursor-not-allowed opacity-50",
      )}
      onClick={disabled ? undefined : onClick}
    >
      <div
        className={cn(
          "w-4 h-4 rounded-full border-2 bg-white transition-colors",
          checked ? "border-black" : "border-gray-400",
        )}
      >
        {checked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-black"></div>
          </div>
        )}
      </div>
    </div>
  )
}

function SortableItem({ id, isSelected, onToggle, variant, customTextValue, onCustomTextChange }) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  }

  const [dateDropdownOpen, setDateDropdownOpen] = useState(false)
  const [selectedDateOption, setSelectedDateOption] = useState(values.dateType || "MonthYYYY");


  // Auto-open date dropdown when date is selected
  const handleDateToggle = () => {
    if (!isSelected) {
      onToggle()
      setDateDropdownOpen(true)
    } else {
      onToggle()
      setDateDropdownOpen(false)
    }
  }

  const handleDateOptionSelect = (option) => {
    setSelectedDateOption(option);
    setValues((prev) => ({
      ...prev,
      dateType: option,   // <-- set in the global adValues!
    }));
    setDateDropdownOpen(false);
  };


  const renderContent = () => {
    if (id === "customText") {
      return (
        <div className="flex items-center gap-2 flex-1">
          <CustomRadioButton checked={isSelected} onClick={onToggle} />
          <Input
            value={customTextValue || ""}
            onChange={(e) => onCustomTextChange(e.target.value)}
            placeholder="Enter Custom Text"
            className="flex-1 h-6 text-xs border-0 bg-transparent focus:ring-0 focus:outline-none"
          //disabled={!isSelected}
          />
        </div>
      )
    }

    if (id === "dateType") {
      return (
        <div className="flex items-center gap-2">
          <CustomRadioButton checked={isSelected} onClick={handleDateToggle} />
          <span className={cn(variant === "home" ? "text-xs" : "text-sm")}>
            {labelMap[id]}
          </span>
          {isSelected && (
            <Popover open={dateDropdownOpen} onOpenChange={setDateDropdownOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs px-1 py-0 h-auto ml-1">
                  {selectedDateOption}
                  <ChevronsUpDown className="ml-1 w-3 h-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-2 rounded-xl bg-white border z-50 w-[160px]"
                align="start"
                sideOffset={8}
                alignOffset={-4}
                avoidCollisions={false}
              >
                <div className="flex flex-col space-y-1">
                  {valueOptions.dateType.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleDateOptionSelect(option)}
                      className={cn(
                        "text-left px-2 py-1 rounded text-sm hover:bg-gray-100",
                        selectedDateOption === option && "bg-gray-100",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )
    }

    // Default case for adType, fileName, iteration
    return (
      <div className="flex items-center gap-2">
        <CustomRadioButton checked={isSelected} onClick={onToggle} />
        <span className={cn(variant === "home" ? "text-xs" : "text-sm")}>
          {labelMap[id]}
        </span>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center px-2 py-1 rounded-xl border bg-white shadow-sm gap-2 min-h-[36px]",
        isDragging ? "opacity-50 border-gray-400" : "hover:bg-gray-50 border-gray-300",
        id === "customText" && "flex-1 min-w-[200px]",
      )}
    >
      <GripVertical
        ref={setActivatorNodeRef}
        className="w-3 h-3 text-gray-400 cursor-move flex-shrink-0"
        {...listeners}
        {...attributes}
      />
      {renderContent()}
    </div>
  )
}

export default function ReorderAdNameParts({
  order,
  setOrder,
  values,
  setValues,
  variant = "default",
  selectedItems = [],
  onItemToggle,
  customTextValue,
  onCustomTextChange,
}) {
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setOrder((prevOrder) => {
        const oldIndex = prevOrder.indexOf(active.id);
        const newIndex = prevOrder.indexOf(over.id);
        return arrayMove(prevOrder, oldIndex, newIndex);
      });
    }
  };


  // Determine which items to show based on variant
  const availableItems =
    variant === "home"
      ? ["adType", "dateType", "fileName", "iteration", "customText"]
      : ["adType", "dateType", "fileName", "iteration"]

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={horizontalListSortingStrategy}>
          <div className="bg-gray-200 p-1 rounded-xl">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {order.map((id) => (
                <SortableItem
                  key={id}
                  id={id}
                  isSelected={selectedItems.includes(id)}
                  onToggle={() => onItemToggle(id)}
                  setValues={setValues}
                  values={values}
                  variant={variant}
                  customTextValue={customTextValue}
                  onCustomTextChange={onCustomTextChange}
                />
              ))}
            </div>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
