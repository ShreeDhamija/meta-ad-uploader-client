// Generic readable renderer for arbitrary captured JSON (product_intel content,
// ad records, audit). Recurses objects/arrays into labeled rows + lists rather
// than dumping raw JSON. Used by the Research + Intelligence detail views.
import { useState } from "react";
import PropTypes from "prop-types";

const humanize = (k) =>
  String(k).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function JsonView({ data }) {
  if (data === null || data === undefined || data === "") {
    return <span className="text-neutral-400">—</span>;
  }
  if (typeof data !== "object") {
    return <span className="whitespace-pre-wrap break-words">{String(data)}</span>;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-neutral-400">none</span>;
    return (
      <ul className="space-y-1 list-disc pl-5">
        {data.map((v, i) => <li key={i}><JsonView data={v} /></li>)}
      </ul>
    );
  }
  return (
    <div className="space-y-2">
      {Object.entries(data).map(([k, v]) => (
        <div key={k}>
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{humanize(k)}</div>
          <div className="text-sm text-neutral-800 pl-1"><JsonView data={v} /></div>
        </div>
      ))}
    </div>
  );
}
JsonView.propTypes = { data: PropTypes.any };

export function Section({ title, data, defaultOpen = false, subtitle }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-neutral-200">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-medium">{title}{subtitle && <span className="text-neutral-400 font-normal"> · {subtitle}</span>}</span>
        <span className="text-neutral-400 text-lg leading-none">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-neutral-100 pt-3">
          <JsonView data={data} />
        </div>
      )}
    </div>
  );
}
Section.propTypes = {
  title: PropTypes.string.isRequired,
  data: PropTypes.any,
  defaultOpen: PropTypes.bool,
  subtitle: PropTypes.string,
};

export { humanize };
