// One row in the library sidebar (navigation, pinned, folder tree).
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const SidebarRow = forwardRef(function SidebarRow(
  { icon: Icon, label, selected = false, trailing, onClick, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-current={selected ? "page" : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) onClick?.();
      }}
      className={cn(
        "flex h-9 w-full cursor-pointer select-none items-center justify-between gap-2 rounded-xl border px-2.5 text-left outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-blue-200",
        selected
          ? "border-gray-300 bg-white font-semibold text-neutral-900 shadow-sm"
          : "border-transparent text-neutral-700 hover:bg-neutral-200/70",
        className,
      )}
      {...rest}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {Icon && <Icon className="size-[18px] shrink-0 text-neutral-600" aria-hidden />}
        {children ?? <span className="truncate text-sm">{label}</span>}
      </span>
      {trailing}
    </div>
  );
});

export default SidebarRow;
