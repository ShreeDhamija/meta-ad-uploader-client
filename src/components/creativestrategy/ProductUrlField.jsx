// Product URL input for "Add a new product": type any link (no https:// needed),
// or pick one of the landing-page links saved in this ad account's settings.
// Arrow keys move through the saved links and Enter picks one; with the list
// closed, Enter submits the form as usual.
/* eslint-disable react-refresh/only-export-components */
import { useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Check, Link2, Star } from "lucide-react";
import useAdAccountSettings from "@/lib/useAdAccountSettings";
import { cn } from "@/lib/utils";

/** "shop.com/item" → "https://shop.com/item"; the backend needs a scheme. */
export function normalizeProductUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, "")}`;
}

/** A host with a dot (or localhost) and no spaces, once the scheme is added. */
export function isValidProductUrl(value) {
  const normalized = normalizeProductUrl(value);
  if (!normalized || /\s/.test(normalized)) return false;
  try {
    const { hostname } = new URL(normalized);
    return hostname === "localhost" || /^[^.]+(\.[^.]+)+$/.test(hostname);
  } catch {
    return false;
  }
}

const bare = (url) => String(url || "").replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

export default function ProductUrlField({ value, onChange, adAccountId, disabled }) {
  const { settings, loading } = useAdAccountSettings(adAccountId);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listRef = useRef(null);

  const savedLinks = useMemo(() => {
    const seen = new Set();
    return (Array.isArray(settings?.links) ? settings.links : [])
      .filter((link) => link?.url && !seen.has(link.url) && seen.add(link.url))
      .sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)));
  }, [settings?.links]);

  const query = bare(value).toLowerCase();
  const options = savedLinks.filter((link) => !query || bare(link.url).toLowerCase().includes(query)
    || String(link.title || link.label || "").toLowerCase().includes(query));
  const showList = open && options.length > 0;
  const invalid = value.trim() !== "" && !isValidProductUrl(value);

  const pick = (url) => {
    onChange(url);
    setOpen(false);
    setActive(-1);
  };
  const onKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!options.length) return;
      event.preventDefault();
      setOpen(true);
      setActive((index) => {
        const next = event.key === "ArrowDown" ? index + 1 : index - 1;
        return (next + options.length) % options.length;
      });
    } else if (event.key === "Enter" && showList) {
      // Enter picks the highlighted link, or keeps what was typed, then closes.
      event.preventDefault();
      if (active >= 0 && options[active]) pick(options[active].url);
      else setOpen(false);
    } else if (event.key === "Escape" && showList) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        aria-label="Product URL"
        type="text"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showList}
        aria-controls="cs-product-url-options"
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        placeholder={savedLinks.length ? "Paste a link or pick a saved one" : "your-store.com/product"}
        value={value}
        disabled={disabled}
        onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={(event) => { if (!listRef.current?.contains(event.relatedTarget)) setOpen(false); }}
        onKeyDown={onKeyDown}
        className={cn("cs-modal-input w-full", invalid && "!border-red-400")}
      />
      {showList && (
        <ul ref={listRef} id="cs-product-url-options" role="listbox" aria-label="Saved links from this ad account" className="cs-url-options">
          <li className="cs-url-options__label" aria-hidden="true">Saved links from this ad account</li>
          {options.map((link, index) => (
            <li key={link.url} role="option" aria-selected={index === active}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(link.url)}
                onMouseEnter={() => setActive(index)}
                className={cn("cs-url-options__item", index === active && "is-active")}
              >
                <Link2 className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span className="min-w-0 flex-1">
                  {(link.title || link.label) && <strong className="block truncate">{link.title || link.label}</strong>}
                  <span className="block truncate">{bare(link.url)}</span>
                </span>
                {link.isDefault && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" aria-label="Default link" />}
                {value.trim() === link.url && <Check className="h-3.5 w-3.5 shrink-0 text-blue-500" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {invalid ? (
        <p className="mt-1.5 px-1 text-xs text-red-600">Enter a valid link, like your-store.com/product</p>
      ) : (
        <p className="mt-1.5 px-1 text-xs leading-5 text-neutral-500">
          {adAccountId && !loading && savedLinks.length > 0 ? "Pick a link saved in this ad account's settings, or paste any product page. " : ""}
          Used to automatically build product context, brand guidelines, research, insights, copy, and the first strategy.
        </p>
      )}
    </div>
  );
}
ProductUrlField.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  adAccountId: PropTypes.string,
  disabled: PropTypes.bool,
};
