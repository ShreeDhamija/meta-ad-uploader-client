// Inline name editor: Enter or blur saves, Escape cancels. Selects the text on open.
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function InlineRename({ value, onSave, onCancel, className }) {
  const [text, setText] = useState(value);
  const ref = useRef(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const finish = async (save) => {
    if (done.current) return;
    done.current = true;
    const next = text.trim();
    if (!save || !next || next === value) return onCancel();
    const ok = await onSave(next);
    if (!ok) done.current = false; // keep editing after an error (e.g. name taken)
  };

  return (
    <input
      ref={ref}
      value={text}
      maxLength={200}
      aria-label="Folder name"
      onChange={(e) => setText(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish(true);
        if (e.key === "Escape") finish(false);
      }}
      onBlur={() => finish(true)}
      className={cn(
        "w-full min-w-0 rounded-md border border-blue-400 bg-white px-1.5 py-0.5 text-sm text-neutral-900 outline-none ring-2 ring-blue-100",
        className,
      )}
    />
  );
}
