import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { creativeApi } from "@/lib/creativeApi";
import { ViewLoading, ErrorBanner, EmptyState } from "../ui";
import {
  Box, Check, Image as ImageIcon, Link, MessageSquareText, Palette,
  Plus, Quote, ScanSearch, ShieldCheck, Sparkles, Trash2, Type, Upload,
} from "lucide-react";

const EMPTY = {
  primaryColors: [], secondaryColors: [], accentColors: [], fonts: [],
  logoUrl: "", logoUsageRules: "", toneOfVoice: "", writingStyle: "",
  bannedWords: [], preferredVocabulary: [], reviewLanguageSnippets: [], copyDocText: "",
};
const ASSET_TYPES = ["hero_product", "ui_screenshot", "phone_mockup", "illustration", "brand_mark", "lifestyle"];
const INPUT = "w-full rounded-xl border border-[#6c3403]/15 bg-white px-3 py-2.5 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-[#6c3403]/45 focus:ring-2 focus:ring-[#6c3403]/10";

const colorRows = (value) => (Array.isArray(value) ? value : []).map((row) => {
  if (typeof row === "string") return { hex: row, name: "", usage: "" };
  return { hex: row?.hex || row?.hex_code || row?.color || "", name: row?.name || "", usage: row?.usage || "" };
});
const fontRows = (value) => (Array.isArray(value) ? value : []).map((row) => {
  if (typeof row === "string") return { family: row, weight: "", usage: "" };
  return { family: row?.family || row?.font_family || row?.name || "", weight: row?.weight || "", usage: row?.usage || "" };
});
const snippetRows = (value) => (Array.isArray(value) ? value : []).map((row) => {
  if (typeof row === "string") return { quote: row, source: "" };
  return { quote: row?.quote || row?.text || row?.snippet || "", source: row?.source || row?.context || "" };
});

export default function BrandingEditor({ clientId, productId, productName }) {
  const [g, setG] = useState(EMPTY);
  const [assets, setAssets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [isHumanEdited, setIsHumanEdited] = useState(false);
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

  const load = useCallback(async () => {
    if (!clientId) { setG(EMPTY); setLoading(false); return; }
    setLoading(true);
    setErr(null);
    try {
      const r = await creativeApi.getBranding(clientId);
      const gd = r.guidelines || {};
      setG({
        primaryColors: colorRows(gd.primaryColors), secondaryColors: colorRows(gd.secondaryColors), accentColors: colorRows(gd.accentColors),
        fonts: fontRows(gd.fonts), logoUrl: gd.logoUrl || "", logoUsageRules: gd.logoUsageRules || "",
        toneOfVoice: gd.toneOfVoice || "", writingStyle: gd.writingStyle || "",
        bannedWords: gd.bannedWords || [], preferredVocabulary: gd.preferredVocabulary || [],
        reviewLanguageSnippets: snippetRows(gd.reviewLanguageSnippets), copyDocText: gd.copyDocText || "",
      });
      setIsHumanEdited(Boolean(gd.isHumanEdited));
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, [clientId]);
  const loadAssets = useCallback(async () => {
    if (!productId) { setAssets([]); return; }
    try { const r = await creativeApi.getAssets(productId); setAssets(r.assets || []); } catch { /* non-fatal */ }
  }, [productId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAssets(); }, [loadAssets]);

  if (!clientId) return <EmptyState icon={Box} title="No account selected" hint="Select an account first." />;
  if (loading) return <ViewLoading label="Loading brand guidelines…" />;

  const save = async () => {
    setErr(null); setSaving(true);
    try {
      await creativeApi.saveBranding({ clientId, ...g });
      setSavedAt(Date.now());
      setIsHumanEdited(true);
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };
  const addAsset = async () => {
    if (!productId || !newAsset.assetUrl.trim()) return;
    try {
      await creativeApi.addAsset(productId, { ...newAsset, assetType });
      setNewAsset({ assetUrl: "", assetType: "hero_product" });
      loadAssets();
    } catch (e) { setErr(e.message); }
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
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
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
  const togglePick = (url) => setPicked((current) => {
    const next = new Set(current);
    if (next.has(url)) next.delete(url); else next.add(url);
    return next;
  });
  const saveScraped = async () => {
    if (picked.size === 0) return;
    setErr(null);
    try {
      await creativeApi.saveScrapedAssets(productId, [...picked], assetType);
      setCandidates([]); setPicked(new Set()); setScrapeUrl(""); loadAssets();
    } catch (e) { setErr(e.message); }
  };
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
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-[#6c3403]/15 bg-gradient-to-br from-white to-[#fff7ed] shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#6c3403]/10 px-6 py-5">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-bold tracking-tight text-[#3b170b]">Brand guidelines</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-neutral-500">
              {isHumanEdited ? "Manually reviewed guidelines. Future ingestion will preserve your edits." : "Auto-detected from the product page. Review and refine anything the site did not expose clearly."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><Check className="h-3.5 w-3.5" /> Saved</span>}
            <button type="button" onClick={save} disabled={saving} className="cs-primary-button">
              {saving ? "Saving…" : "Save guidelines"}
            </button>
          </div>
        </div>
        <div className="grid gap-4 p-5 xl:grid-cols-2">
          <GuidelineCard icon={Palette} title="Color system" description="Detected palette, role, and recommended usage." className="xl:col-span-2">
            <div className="grid gap-4 xl:grid-cols-3">
              <ColorRows label="Primary" hint="Core brand and high-recognition areas" rows={g.primaryColors} onChange={(v) => setG({ ...g, primaryColors: v })} />
              <ColorRows label="Secondary" hint="Supporting surfaces and variation" rows={g.secondaryColors} onChange={(v) => setG({ ...g, secondaryColors: v })} />
              <ColorRows label="Accent" hint="CTAs, highlights, and emphasis" rows={g.accentColors} onChange={(v) => setG({ ...g, accentColors: v })} />
            </div>
          </GuidelineCard>

          <GuidelineCard icon={Type} title="Typography" description="Font families, weights, and where each should appear.">
            <FontRows rows={g.fonts} onChange={(v) => setG({ ...g, fonts: v })} />
          </GuidelineCard>

          <GuidelineCard icon={MessageSquareText} title="Tone of voice" description="How the brand sounds and how the copy is constructed.">
            <div className="grid gap-4">
              <Field label="Voice characteristics"><textarea rows={4} value={g.toneOfVoice} onChange={(e) => setG({ ...g, toneOfVoice: e.target.value })} placeholder="Confident, candid, expert without being clinical…" className={INPUT} /></Field>
              <Field label="Writing style"><textarea rows={4} value={g.writingStyle} onChange={(e) => setG({ ...g, writingStyle: e.target.value })} placeholder="Short sentences, concrete claims, conversational second person…" className={INPUT} /></Field>
            </div>
          </GuidelineCard>

          <GuidelineCard icon={ShieldCheck} title="Copy guardrails" description="Vocabulary the generators should prefer or avoid.">
            <div className="grid gap-4">
              <TagsField label="Preferred vocabulary" placeholder="clinically tested, everyday confidence, built to last" values={g.preferredVocabulary} onChange={(v) => setG({ ...g, preferredVocabulary: v })} />
              <TagsField label="Banned words and phrases" placeholder="miracle, guaranteed, cheap" values={g.bannedWords} onChange={(v) => setG({ ...g, bannedWords: v })} />
            </div>
          </GuidelineCard>

          <GuidelineCard icon={Quote} title="Customer language" description="Useful phrases and patterns found in reviews or on-site copy.">
            <SnippetRows rows={g.reviewLanguageSnippets} onChange={(v) => setG({ ...g, reviewLanguageSnippets: v })} />
          </GuidelineCard>

          <GuidelineCard icon={ImageIcon} title="Logo rules" description="The canonical mark and constraints for generated creative.">
            <div className="grid gap-4">
              <Field label="Logo URL"><div className="relative"><Link className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-400" /><input value={g.logoUrl} onChange={(e) => setG({ ...g, logoUrl: e.target.value })} placeholder="https://…" className={`${INPUT} pl-9`} /></div></Field>
              <Field label="Usage rules"><textarea rows={3} value={g.logoUsageRules} onChange={(e) => setG({ ...g, logoUsageRules: e.target.value })} placeholder="Minimum clear space, approved backgrounds, placement…" className={INPUT} /></Field>
            </div>
          </GuidelineCard>

          <GuidelineCard icon={ScanSearch} title="Source notes" description="Long-form brand bible or reference copy used as additional context." className="xl:col-span-2">
            <textarea rows={6} value={g.copyDocText} onChange={(e) => setG({ ...g, copyDocText: e.target.value })} placeholder="Paste supporting brand guidance or reference copy here…" className={INPUT} />
          </GuidelineCard>
        </div>
      </section>

      <ErrorBanner message={err} />

      <section className="rounded-[28px] border border-[#6c3403]/15 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#3b170b]">Product image library {productName ? `· ${productName}` : ""}</h2>
            <p className="mt-1 text-sm text-neutral-500">Locked visual references used when generating ads for this product.</p>
          </div>
          {productId && (
            <select value={assetType} onChange={(e) => setAssetType(e.target.value)} className={`${INPUT} w-auto capitalize`}>
              {ASSET_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
            </select>
          )}
        </div>

        {!productId ? <p className="text-sm text-neutral-400">Select a product above to manage its images.</p> : (
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto]">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#6c3403]/20 px-4 py-2.5 text-sm font-semibold text-[#3b170b] transition hover:bg-[#fff7ed]">
                <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload image"}
                <input type="file" accept="image/*" onChange={onUploadFile} className="hidden" disabled={uploading} />
              </label>
              <input value={newAsset.assetUrl} onChange={(e) => setNewAsset({ ...newAsset, assetUrl: e.target.value })} placeholder="Or paste an image URL" className={INPUT} />
              <button type="button" onClick={addAsset} disabled={!newAsset.assetUrl.trim()} className="rounded-xl border border-[#6c3403]/20 px-4 py-2 text-sm font-semibold text-[#3b170b] disabled:opacity-40">Add URL</button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <input value={scrapeUrl} onChange={(e) => setScrapeUrl(e.target.value)} placeholder="Page URL (blank for auto-import = product URL)" className={INPUT} />
              <button type="button" onClick={doScrape} disabled={scraping || !scrapeUrl.trim()} className="rounded-xl border border-[#6c3403]/20 px-4 py-2 text-sm font-semibold text-[#3b170b] disabled:opacity-40">{scraping ? "Scanning…" : "Review images"}</button>
              <button type="button" onClick={doImport} disabled={importing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3b170b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Sparkles className="h-4 w-4" /> {importing ? "Importing…" : "Auto-import"}</button>
            </div>
            {importMsg && <p className="text-xs font-medium text-emerald-700">{importMsg}</p>}

            {candidates.length > 0 && (
              <div className="rounded-2xl border border-[#6c3403]/10 bg-[#fffaf4] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-neutral-500">{candidates.length} found · {picked.size} selected</span>
                  <button type="button" onClick={saveScraped} disabled={picked.size === 0} className="rounded-xl bg-[#3b170b] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Save selected</button>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
                  {candidates.map((candidate) => (
                    <button type="button" key={candidate.url} onClick={() => togglePick(candidate.url)} className={`relative overflow-hidden rounded-xl border bg-white ${picked.has(candidate.url) ? "border-[#3b170b] ring-2 ring-[#3b170b]/25" : "border-neutral-200"}`}>
                      <img src={candidate.url} alt={candidate.alt || "Candidate brand asset"} className="h-20 w-full object-cover" />
                      {picked.has(candidate.url) && <span className="absolute right-1.5 top-1.5 rounded-full bg-[#3b170b] p-1 text-white"><Check className="h-3 w-3" /></span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {assets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#6c3403]/20 px-5 py-10 text-center text-sm text-neutral-400">No product images saved yet.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
                {assets.map((asset) => (
                  <article key={asset.id} className="group relative overflow-hidden rounded-2xl border border-[#6c3403]/12 bg-[#fffaf4]">
                    <img src={asset.imageUrl || asset.assetUrl} alt="" className="h-28 w-full object-cover bg-neutral-100" />
                    <div className="truncate px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#6c3403]/60">{asset.assetType?.replaceAll("_", " ")}</div>
                    <button type="button" onClick={() => removeAsset(asset.id)} aria-label="Remove image" className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-neutral-500 opacity-0 shadow-sm transition hover:text-red-600 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
BrandingEditor.propTypes = { clientId: PropTypes.string, productId: PropTypes.string, productName: PropTypes.string };

function GuidelineCard({ icon: Icon, title, description, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-[#6c3403]/10 bg-white p-4 shadow-[0_1px_0_rgba(108,52,3,0.03)] ${className}`}>
      <header className="mb-4 flex items-start gap-3">
        <span className="rounded-xl bg-orange-50 p-2 text-orange-600"><Icon className="h-4 w-4" /></span>
        <div><h3 className="text-sm font-bold text-[#3b170b]">{title}</h3><p className="mt-0.5 text-xs leading-5 text-neutral-500">{description}</p></div>
      </header>
      {children}
    </section>
  );
}
GuidelineCard.propTypes = { icon: PropTypes.elementType.isRequired, title: PropTypes.string.isRequired, description: PropTypes.string, children: PropTypes.node, className: PropTypes.string };

function Field({ label, children }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#3b170b]/65">{label}</span>{children}</label>;
}
Field.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node };

function ColorRows({ label, hint, rows, onChange }) {
  const update = (index, key, value) => onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  return (
    <div className="rounded-2xl bg-[#fffaf4] p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div><h4 className="text-xs font-bold uppercase tracking-wide text-[#3b170b]">{label}</h4><p className="mt-0.5 text-[11px] leading-4 text-neutral-400">{hint}</p></div>
        <button type="button" onClick={() => onChange([...rows, { hex: "#000000", name: "", usage: "" }])} className="inline-flex items-center gap-1 text-xs font-semibold text-[#6c3403]"><Plus className="h-3.5 w-3.5" /> Add</button>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <p className="rounded-xl border border-dashed border-[#6c3403]/15 px-3 py-5 text-center text-xs text-neutral-400">No colors detected</p>}
        {rows.map((row, index) => (
          <div key={`${label}-${index}`} className="grid grid-cols-[40px_88px_1fr_auto] items-center gap-2 rounded-xl border border-[#6c3403]/10 bg-white p-2">
            <input aria-label={`${label} color ${index + 1}`} type="color" value={/^#[0-9a-fA-F]{6}$/.test(row.hex) ? row.hex : "#000000"} onChange={(e) => update(index, "hex", e.target.value)} className="h-9 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
            <input value={row.hex || ""} onChange={(e) => update(index, "hex", e.target.value)} placeholder="#HEX" className="min-w-0 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-mono" />
            <div className="grid min-w-0 gap-1.5">
              <input value={row.name || ""} onChange={(e) => update(index, "name", e.target.value)} placeholder="Color name" className="min-w-0 border-0 p-0 text-xs font-semibold outline-none" />
              <input value={row.usage || ""} onChange={(e) => update(index, "usage", e.target.value)} placeholder="Usage" className="min-w-0 border-0 p-0 text-[11px] text-neutral-500 outline-none" />
            </div>
            <button type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} aria-label={`Remove ${label} color`} className="p-1 text-neutral-300 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
ColorRows.propTypes = { label: PropTypes.string.isRequired, hint: PropTypes.string, rows: PropTypes.array.isRequired, onChange: PropTypes.func.isRequired };

function FontRows({ rows, onChange }) {
  const update = (index, key, value) => onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="rounded-xl border border-dashed border-[#6c3403]/15 px-3 py-7 text-center text-xs text-neutral-400">No fonts detected</p>}
      {rows.map((row, index) => (
        <div key={`font-${index}`} className="grid gap-2 rounded-xl border border-[#6c3403]/10 bg-[#fffaf4] p-3 sm:grid-cols-[1.2fr_.6fr_1.3fr_auto]">
          <input value={row.family || ""} onChange={(e) => update(index, "family", e.target.value)} placeholder="Font family" className={INPUT} />
          <input value={row.weight || ""} onChange={(e) => update(index, "weight", e.target.value)} placeholder="Weight" className={INPUT} />
          <input value={row.usage || ""} onChange={(e) => update(index, "usage", e.target.value)} placeholder="Headlines, body, CTA…" className={INPUT} />
          <button type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove font" className="justify-self-center p-2 text-neutral-300 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { family: "", weight: "", usage: "" }])} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#6c3403]/20 px-3 py-2 text-xs font-semibold text-[#6c3403]"><Plus className="h-3.5 w-3.5" /> Add font</button>
    </div>
  );
}
FontRows.propTypes = { rows: PropTypes.array.isRequired, onChange: PropTypes.func.isRequired };

function TagsField({ label, placeholder, values, onChange }) {
  return (
    <Field label={`${label} · comma or new line separated`}>
      <textarea rows={3} value={(values || []).join(", ")} placeholder={placeholder} onChange={(e) => onChange(e.target.value.split(/[,\n]/).map((value) => value.trim()).filter(Boolean))} className={INPUT} />
    </Field>
  );
}
TagsField.propTypes = { label: PropTypes.string.isRequired, placeholder: PropTypes.string, values: PropTypes.array.isRequired, onChange: PropTypes.func.isRequired };

function SnippetRows({ rows, onChange }) {
  const update = (index, key, value) => onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={`snippet-${index}`} className="rounded-xl border border-[#6c3403]/10 bg-[#fffaf4] p-3">
          <div className="flex gap-2">
            <Quote className="mt-1 h-4 w-4 shrink-0 text-orange-400" />
            <textarea rows={2} value={row.quote || ""} onChange={(e) => update(index, "quote", e.target.value)} placeholder="Exact customer phrase or characteristic brand language" className="min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-sm outline-none" />
            <button type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove language snippet" className="self-start p-1 text-neutral-300 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <input value={row.source || ""} onChange={(e) => update(index, "source", e.target.value)} placeholder="Source or context" className="mt-2 w-full border-0 border-t border-[#6c3403]/10 bg-transparent px-0 pt-2 text-xs text-neutral-500 outline-none" />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { quote: "", source: "" }])} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#6c3403]/20 px-3 py-2 text-xs font-semibold text-[#6c3403]"><Plus className="h-3.5 w-3.5" /> Add language example</button>
    </div>
  );
}
SnippetRows.propTypes = { rows: PropTypes.array.isRequired, onChange: PropTypes.func.isRequired };
