import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, GripVertical } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const labelMap = {
  adType: "Ad Type",
  dateType: "Date",
  fileName: "File Name",
};

const valueOptions = {
  adType: ["Image", "Video", "Dynamic"],
  dateType: ["MonthYYYY", "MonthDDYYYY"],
  fileName: [true],
};

const handleClick = (e) => {
  e.preventDefault(); // 🛑 prevent default input behavior
  if (checked) {
    onChange("");
  } else {
    onChange(value);
  }
};


function CustomRadioButton({ value, checked, onClick, label, id, variant }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-center space-x-2 rounded-lg px-1 py-1.5 cursor-pointer transition-all hover:py-1.5",
        checked ? "bg-gray-100" : "hover:bg-gray-100"
      )}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      <div className="relative flex items-center justify-center">
        <div className={`w-4 h-4 rounded-full border ${checked ? "border-black" : "border-gray-400"} bg-white`}>
          {checked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-black"></div>
            </div>
          )}
        </div>
        <input
          type="radio"
          id={id}
          value={value}
          checked={checked}
          onChange={() => { }}
          className="sr-only"
        />
      </div>
      <span className={cn("text-sm", variant === "home" && "text-xs")}>{label}</span>

    </label>
  );
}


function SortableItem({ id, value, onChange, variant }) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)` // ← position only
      : undefined,
    transition,
  };


  const options = valueOptions[id];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center px-2 py-1 rounded-xl border bg-white shadow-sm gap-2",
        isDragging ? "opacity-50 border-gray-400" : "hover:bg-gray-50 border-gray-300", id === "fileName" && "pr-4"
      )}
    >

      <GripVertical ref={setActivatorNodeRef} className="w-3 h-3 text-gray-400 cursor-move" {...listeners} {...attributes} />
      {id === "fileName" ? (
        <label className="flex items-center space-x-2 text-sm">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>{labelMap[id]}</span>
        </label>
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-sm px-1 py-0 h-auto"
            >
              {value || labelMap[id]}
              <ChevronsUpDown className="ml-1 w-3 h-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-2 rounded-xl bg-white border z-50 w-[160px]"
            align="start"
            sideOffset={8}
            alignOffset={-4}
            avoidCollisions={false}
          >
            <div className="flex flex-col space-y-1">
              {options.map((option) => (
                <CustomRadioButton
                  key={option}
                  id={`${id}-${option}`}
                  value={option}
                  label={option === true ? "File Name" : option}
                  checked={value === option}
                  onClick={() => {
                    if (value === option) {
                      onChange(""); // deselect
                    } else {
                      onChange(option);
                    }
                  }}
                  variant={variant} // ✅ pass it here
                />

              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export default function ReorderAdNameParts({ order, setOrder, values, setValues, variant = "default" }) {
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = order.indexOf(active.id);
      const newIndex = order.indexOf(over.id);
      setOrder(arrayMove(order, oldIndex, newIndex));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={horizontalListSortingStrategy}>
        <div
          className={cn(
            "flex flex-wrap border border-gray-300 rounded-2xl px-1 py-1",
            variant === "home" ? "bg-gray-100 gap-1" : "bg-stone-200 gap-2"
          )}
        >
          {order.map((id) => (
            <SortableItem
              key={id}
              id={id}
              value={id === "fileName" ? values.useFileName : values[id]}
              onChange={(val) => {
                if (id === "fileName") {
                  setValues((prev) => ({ ...prev, useFileName: val }));
                } else {
                  setValues((prev) => ({ ...prev, [id]: val }));
                }
              }}
              variant={variant} // ✅ pass from top-level
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
