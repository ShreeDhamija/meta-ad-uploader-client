// Structured brand guidelines editor (mirrors his BrandGuidelinesEditor) +
// product images. brand_guidelines is BRAND-level and feeds image generation
// (colors/fonts/logo), all copy generation (banned words / vocabulary / tone /
// writing style), the strategist briefing, and briefs. Product images are
// product-level locked references used by Generate.
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { creativeApi } from "@/lib/creativeApi";
import { Button } from "@/components/ui/button";
import { ViewLoading, ErrorBanner, EmptyState } from "../ui";
import { Box } from "lucide-react";

const EMPTY = {
  primaryColors: [], secondaryColors: [], accentColors: [], fonts: [],
  logoUrl: "", logoUsageRules: "", toneOfVoice: "", writingStyle: "",
  bannedWords: [], preferredVocabulary: [], copyDocText: "",
};
const ASSET_TYPES = ["hero_product", "ui_screenshot", "phone_mockup", "illustration", "brand_mark", "lifestyle"];

export default function BrandingEditor({ clientId, productId, productName }) {
  const [g, setG] = useState(EMPTY);
  const [assets, setAssets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [err, setErr] = useState(null);
  const [newAsset, setNewAsset] = useState({ assetUrl: "", assetType: "hero_product" });
  const [uploading, setUploading] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [picked, setPicked] = useState(() => new Set());
  const [scraping, setScraping] = useState(false);
  const [assetType, setAssetType] = useState("hero_product");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const r = await creativeApi.getBranding(clientId);
      const gd = r.guidelines || {};
      setG({
        primaryColors: gd.primaryColors || [], secondaryColors: gd.secondaryColors || [], accentColors: gd.accentColors || [],
        fonts: gd.fonts || [], logoUrl: gd.logoUrl || "", logoUsageRules: gd.logoUsageRules || "",
        toneOfVoice: gd.toneOfVoice || "", writingStyle: gd.writingStyle || "",
        bannedWords: gd.bannedWords || [], preferredVocabulary: gd.preferredVocabulary || [], copyDocText: gd.copyDocText || "",
      });
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };
  const loadAssets = async () => {
    if (!productId) { setAssets([]); return; }
    try { const r = await creativeApi.getAssets(productId); setAssets(r.assets); } catch { /* non-fatal */ }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clientId]);
  useEffect(() => { loadAssets(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [productId]);

  if (!clientId) return <EmptyState icon={Box} title="No brand selected" hint="Select a brand first." />;
  if (loading) return <ViewLoading label="Loading brand guidelines…" />;

  const save = async () => {
    setErr(null); setSaving(true);
    try { await creativeApi.saveBranding({ clientId, ...g }); setSavedAt(Date.now()); }
    catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  const addAsset = async () => {
    if (!productId || !newAsset.assetUrl.trim()) return;
    try { await creativeApi.addAsset(productId, newAsset); setNewAsset({ assetUrl: "", assetType: "hero_product" }); loadAssets(); }
    catch (e) { setErr(e.message); }
  };
  const removeAsset = async (id) => {
    try { await creativeApi.deleteAsset(productId, id); loadAssets(); } catch (e) { setErr(e.message); }
  };
  const onUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (file) e.target.value = "";
    if (!file || !productId) return;
    setErr(null); setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file);
      });
      await creativeApi.uploadAsset(productId, { dataBase64: dataUrl, assetType });
      loadAssets();
    } catch (e2) { setErr(e2.message); } finally { setUploading(false); }
  };
  const doScrape = async () => {
    if (!scrapeUrl.trim() || !productId) return;
    setErr(null); setScraping(true); setCandidates([]); setPicked(new Set());
    try { const r = await creativeApi.scrapeAssets(productId, scrapeUrl.trim()); setCandidates(r.images || []); }
    catch (e) { setErr(e.message); } finally { setScraping(false); }
  };
  const togglePick = (url) => setPicked((s) => { const n = new Set(s); if (n.has(url)) n.delete(url); else n.add(url); return n; });
  const saveScraped = async () => {
    if (picked.size === 0) return;
    setErr(null);
    try { await creativeApi.saveScrapedAssets(productId, [...picked], assetType); setCandidates([]); setPicked(new Set()); setScrapeUrl(""); loadAssets(); }
    catch (e) { setErr(e.message); }
  };
  // One-click: scrape + Gemini auto-classify + keep the useful images. Uses the
  // typed URL, else the product's own URL.
  const doImport = async () => {
    if (!productId) return;
    setErr(null); setImportMsg(null); setImporting(true);
    try {
      const r = await creativeApi.importBrandAssets(productId, scrapeUrl.trim() || undefined);
      setImportMsg(r.message || `Imported ${r.imported} · skipped ${r.skipped} of ${r.total_candidates} candidates`);
      loadAssets();
    } catch (e) { setErr(e.message); } finally { setImporting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving} size="sm" className="rounded-xl">{saving ? "Saving…" : "Save brand guidelines"}</Button>
        {savedAt && <span className="text-xs text-emerald-600">saved</span>}
        <span className="text-sm text-neutral-400">Applies to the whole brand · feeds copy + image generation</span>
      </div>
      <ErrorBanner message={err} />

      <ColorRows label="Primary colors" rows={g.primaryColors} onChange={(v) => setG({ ...g, primaryColors: v })} />
      <ColorRows label="Secondary colors" rows={g.secondaryColors} onChange={(v) => setG({ ...g, secondaryColors: v })} />
      <ColorRows label="Accent colors" rows={g.accentColors} onChange={(v) => setG({ ...g, accentColors: v })} />
      <FontRows rows={g.fonts} onChange={(v) => setG({ ...g, fonts: v })} />

      <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
        <Field label="Tone of voice"><textarea rows={3} value={g.toneOfVoice} onChange={(e) => setG({ ...g, toneOfVoice: e.target.value })} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" /></Field>
        <Field label="Writing style"><textarea rows={3} value={g.writingStyle} onChange={(e) => setG({ ...g, writingStyle: e.target.value })} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" /></Field>
      </div>
      <TagsField label="Banned words (never use)" values={g.bannedWords} onChange={(v) => setG({ ...g, bannedWords: v })} />
      <TagsField label="Preferred vocabulary" values={g.preferredVocabulary} onChange={(v) => setG({ ...g, preferredVocabulary: v })} />
      <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
        <Field label="Logo URL"><input value={g.logoUrl} onChange={(e) => setG({ ...g, logoUrl: e.target.value })} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" /></Field>
        <Field label="Logo usage rules"><input value={g.logoUsageRules} onChange={(e) => setG({ ...g, logoUsageRules: e.target.value })} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" /></Field>
      </div>
      <Field label="Copy doc (reference copy / brand bible)"><textarea rows={5} value={g.copyDocText} onChange={(e) => setG({ ...g, copyDocText: e.target.value })} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-mono" /></Field>

      <div className="rounded-2xl border border-neutral-200 p-4 space-y-2">
        <div className="text-sm font-medium text-neutral-800">Product images {productName ? `· ${productName}` : ""} <span className="text-xs text-neutral-400">(locked references for Generate)</span></div>
        {!productId && <p className="text-xs text-neutral-400">Select a product (top bar) to manage its images.</p>}
        {productId && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-neutral-500">Type:</span>
              <select value={assetType} onChange={(e) => setAssetType(e.target.value)} className="rounded-xl border border-neutral-200 px-2 py-1 text-xs">
                {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <label className="rounded-xl border border-neutral-300 px-3 py-1 text-xs cursor-pointer">
                {uploading ? "Uploading…" : "Upload file"}
                <input type="file" accept="image/*" onChange={onUploadFile} className="hidden" disabled={uploading} />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <input value={newAsset.assetUrl} onChange={(e) => setNewAsset({ ...newAsset, assetUrl: e.target.value })} placeholder="…or paste an image URL" className="flex-1 min-w-[200px] rounded-xl border border-neutral-200 px-3 py-1 text-xs" />
              <button onClick={addAsset} className="rounded-xl border border-neutral-300 px-3 py-1 text-xs">Add URL</button>
            </div>

            <div className="flex flex-wrap gap-2">
              <input value={scrapeUrl} onChange={(e) => setScrapeUrl(e.target.value)} placeholder="…or import from a page URL (blank = product URL)" className="flex-1 min-w-[200px] rounded-xl border border-neutral-200 px-3 py-1 text-xs" />
              <button onClick={doScrape} disabled={scraping} className="rounded-xl border border-neutral-300 px-3 py-1 text-xs disabled:opacity-50">{scraping ? "Scraping…" : "Scrape page"}</button>
              <button onClick={doImport} disabled={importing} title="Scrape + AI-classify + auto-keep useful brand images" className="rounded-xl bg-neutral-900 text-white px-3 py-1 text-xs disabled:opacity-50">{importing ? "Importing…" : "Auto-import"}</button>
            </div>
            {importMsg && <p className="text-xs text-green-600">{importMsg}</p>}

            {candidates.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">{candidates.length} found · {picked.size} selected</span>
                  <button onClick={saveScraped} disabled={picked.size === 0} className="rounded-xl bg-neutral-900 text-white px-3 py-1 text-xs disabled:opacity-40">Save selected</button>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {candidates.map((c) => (
                    <button key={c.url} onClick={() => togglePick(c.url)} className={`rounded-xl border overflow-hidden ${picked.has(c.url) ? "border-neutral-900 ring-2 ring-neutral-900" : "border-neutral-200"}`}>
                      <img src={c.url} alt={c.alt || ""} className="w-full h-16 object-cover bg-neutral-100" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {assets.map((as) => (
                <div key={as.id} className="rounded-xl border border-neutral-200 overflow-hidden relative">
                  <img src={as.imageUrl || as.assetUrl} alt="" className="w-full h-20 object-cover bg-neutral-100" />
                  <div className="px-1 py-0.5 text-[10px] text-neutral-400 truncate">{as.assetType}</div>
                  <button onClick={() => removeAsset(as.id)} className="absolute top-1 right-1 bg-white/80 rounded-full w-5 h-5 text-xs">✕</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
BrandingEditor.propTypes = { clientId: PropTypes.string, productId: PropTypes.string, productName: PropTypes.string };

function Field({ label, children }) {
  return <label className="block"><span className="block text-xs text-neutral-500 mb-1">{label}</span>{children}</label>;
}
Field.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node };

function ColorRows({ label, rows, onChange }) {
  const upd = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</span>
        <button onClick={() => onChange([...rows, { hex: "#000000", name: "", usage: "" }])} className="text-xs text-neutral-500">+ add</button>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(r.hex) ? r.hex : "#000000"} onChange={(e) => upd(i, "hex", e.target.value)} className="h-7 w-9 rounded border border-neutral-200" />
          <input value={r.hex || ""} onChange={(e) => upd(i, "hex", e.target.value)} placeholder="#hex" className="w-24 rounded-xl border border-neutral-200 px-2 py-1 text-xs" />
          <input value={r.name || ""} onChange={(e) => upd(i, "name", e.target.value)} placeholder="name" className="w-32 rounded-xl border border-neutral-200 px-2 py-1 text-xs" />
          <input value={r.usage || ""} onChange={(e) => upd(i, "usage", e.target.value)} placeholder="usage (e.g. CTA, headlines)" className="flex-1 rounded-xl border border-neutral-200 px-2 py-1 text-xs" />
          <button onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-xs text-neutral-400 hover:text-red-600">✕</button>
        </div>
      ))}
    </div>
  );
}
ColorRows.propTypes = { label: PropTypes.string.isRequired, rows: PropTypes.array.isRequired, onChange: PropTypes.func.isRequired };

function FontRows({ rows, onChange }) {
  const upd = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Fonts</span>
        <button onClick={() => onChange([...rows, { family: "", weight: "", usage: "" }])} className="text-xs text-neutral-500">+ add</button>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={r.family || ""} onChange={(e) => upd(i, "family", e.target.value)} placeholder="family" className="w-40 rounded-xl border border-neutral-200 px-2 py-1 text-xs" />
          <input value={r.weight || ""} onChange={(e) => upd(i, "weight", e.target.value)} placeholder="weight" className="w-28 rounded-xl border border-neutral-200 px-2 py-1 text-xs" />
          <input value={r.usage || ""} onChange={(e) => upd(i, "usage", e.target.value)} placeholder="usage (e.g. headlines)" className="flex-1 rounded-xl border border-neutral-200 px-2 py-1 text-xs" />
          <button onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-xs text-neutral-400 hover:text-red-600">✕</button>
        </div>
      ))}
    </div>
  );
}
FontRows.propTypes = { rows: PropTypes.array.isRequired, onChange: PropTypes.func.isRequired };

// Comma/newline-separated list ↔ array.
function TagsField({ label, values, onChange }) {
  return (
    <Field label={`${label} (comma-separated)`}>
      <input value={(values || []).join(", ")} onChange={(e) => onChange(e.target.value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))}
        className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
    </Field>
  );
}
TagsField.propTypes = { label: PropTypes.string.isRequired, values: PropTypes.array.isRequired, onChange: PropTypes.func.isRequired };
