import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { creativeApi } from "@/lib/creativeApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RunModelControls from "../RunModelControls";
import { useRunModels } from "../useRunModels";
import { RUN_OPERATIONS } from "../run-model-operations";
import { useJobRunner } from "../JobsContext";
import { ViewLoading, ErrorBanner, EmptyState } from "../ui";
import {
  Box, Check, Globe, Image as ImageIcon, Link, Loader2, Lock, MessageSquareText, Palette,
  Plus, Quote, ScanSearch, ShieldCheck, Sparkles, Trash2, Type, Upload,
} from "lucide-react";

const EMPTY = {
  primaryColors: [], secondaryColors: [], accentColors: [], fonts: [],
  logoUrl: "", logoUsageRules: "", toneOfVoice: "", writingStyle: "",
  bannedWords: [], preferredVocabulary: [], reviewLanguageSnippets: [], copyDocText: "",
  complianceNotes: "", complianceProhibitedPhrases: [],
};
const ASSET_TYPES = ["hero_product", "ui_screenshot", "phone_mockup", "illustration", "brand_mark", "lifestyle"];
const ASSET_LABELS = {
  hero_product: "Hero product", ui_screenshot: "UI screenshot", phone_mockup: "Phone mockup",
  illustration: "Illustration", brand_mark: "Logo", lifestyle: "Lifestyle", reference_ad: "Reference ad",
};
// The ad generator must reproduce these exactly; the rest are style references.
const LOCKED_TYPES = new Set(["hero_product", "ui_screenshot", "phone_mockup", "brand_mark"]);
const assetLabel = (type) => ASSET_LABELS[type] || String(type || "Image").replaceAll("_", " ");
const UNSAVED_MESSAGE = "You have unsaved brand guideline changes. Leave without saving?";

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

export default function BrandingEditor({ clientId, productId, productName, setUnsavedChanges }) {
  const models = useRunModels(productId);
  const [g, setG] = useState(EMPTY);
  const [loadedGuidelines, setLoadedGuidelines] = useState(EMPTY);
  const [refreshPending, setRefreshPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isHumanEdited, setIsHumanEdited] = useState(false);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clientId) { setG(EMPTY); setLoadedGuidelines(EMPTY); setLoading(false); return; }
    setLoading(true);
    setErr(null);
    try {
      const r = await creativeApi.getBranding(clientId);
      const gd = r.guidelines || {};
      const next = {
        primaryColors: colorRows(gd.primaryColors), secondaryColors: colorRows(gd.secondaryColors), accentColors: colorRows(gd.accentColors),
        fonts: fontRows(gd.fonts), logoUrl: gd.logoUrl || "", logoUsageRules: gd.logoUsageRules || "",
        toneOfVoice: gd.toneOfVoice || "", writingStyle: gd.writingStyle || "",
        bannedWords: gd.bannedWords || [], preferredVocabulary: gd.preferredVocabulary || [],
        reviewLanguageSnippets: snippetRows(gd.reviewLanguageSnippets), copyDocText: gd.copyDocText || "",
        complianceNotes: gd.complianceNotes || "", complianceProhibitedPhrases: gd.complianceProhibitedPhrases || [],
      };
      setG(next);
      setLoadedGuidelines(next);
      setRefreshPending(false);
      setIsHumanEdited(Boolean(gd.isHumanEdited));
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const dirty = JSON.stringify(g) !== JSON.stringify(loadedGuidelines);
  useJobRunner({
    kind: "ingest_context", productId, enabled: Boolean(clientId && productId),
    onComplete: () => setRefreshPending(true),
  });
  useEffect(() => {
    // Both automatic setup and Run Ingestion save account-level guidelines.
    // Refresh on completion, but never replace the user's unsaved draft.
    if (refreshPending && !dirty && !saving) load();
  }, [refreshPending, dirty, saving, load]);

  // Leaving the tab, switching account/product or closing the page asks first.
  useEffect(() => {
    setUnsavedChanges?.("brand-guidelines", dirty ? UNSAVED_MESSAGE : null);
  }, [dirty, setUnsavedChanges]);
  useEffect(() => () => setUnsavedChanges?.("brand-guidelines", null), [setUnsavedChanges]);
  useEffect(() => {
    if (!justSaved) return undefined;
    const t = setTimeout(() => setJustSaved(false), 2400);
    return () => clearTimeout(t);
  }, [justSaved]);

  if (!clientId) return <EmptyState icon={Box} title="No account selected" hint="Select an account first." />;
  if (loading) return <ViewLoading label="Loading brand guidelines…" />;

  const save = async () => {
    setErr(null); setSaving(true);
    try {
      await creativeApi.saveBranding({ clientId, ...g });
      setIsHumanEdited(true);
      setLoadedGuidelines(g);
      setJustSaved(true);
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };
  const set = (key) => (value) => setG((current) => ({ ...current, [key]: value }));
  const text = (key) => (e) => set(key)(e.target.value);

  return (
    <div className="space-y-7">
      <section className="space-y-4">
        <div>
          <h2 className="cs-brand-section-title"><Sparkles className="h-[18px] w-[18px] text-orange-500" />Brand guidelines</h2>
          <p className="cs-brand-section-hint">
            {isHumanEdited ? "Manually reviewed. Future ingestion keeps your edits." : "Auto-detected from the product page. Review and refine anything the site didn't show clearly."}
          </p>
          {refreshPending && dirty && <p className="mt-2 text-xs text-amber-700">Ingestion finished. Save your edits to keep them, or <button type="button" onClick={load} disabled={saving} className="underline">load the latest guidelines</button>.</p>}
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <GuidelineCard icon={Palette} title="Color system" description="Detected palette, each color's role and where to use it." className="xl:col-span-2">
            <div className="grid gap-3 xl:grid-cols-3">
              <ColorRows label="Primary" hint="Core brand and high-recognition areas" rows={g.primaryColors} onChange={set("primaryColors")} />
              <ColorRows label="Secondary" hint="Supporting surfaces and variation" rows={g.secondaryColors} onChange={set("secondaryColors")} />
              <ColorRows label="Accent" hint="CTAs, highlights and emphasis" rows={g.accentColors} onChange={set("accentColors")} />
            </div>
          </GuidelineCard>

          <GuidelineCard icon={Type} title="Typography" description="Font families, weights and where each should appear.">
            <FontRows rows={g.fonts} onChange={set("fonts")} />
          </GuidelineCard>

          <GuidelineCard icon={MessageSquareText} title="Tone of voice" description="How the brand sounds and how its copy is built.">
            <Field label="Voice characteristics"><textarea rows={4} value={g.toneOfVoice} onChange={text("toneOfVoice")} placeholder="Confident, candid, expert without being clinical…" className="cs-brand-input" /></Field>
            <Field label="Writing style"><textarea rows={4} value={g.writingStyle} onChange={text("writingStyle")} placeholder="Short sentences, concrete claims, conversational second person…" className="cs-brand-input" /></Field>
          </GuidelineCard>

          <GuidelineCard icon={ShieldCheck} title="Copy guardrails" description="Vocabulary the generators should prefer or avoid.">
            <TagsField label="Preferred vocabulary" placeholder="clinically tested, everyday confidence, built to last" values={g.preferredVocabulary} onChange={set("preferredVocabulary")} />
            <TagsField label="Banned words and phrases" placeholder="miracle, guaranteed, cheap" values={g.bannedWords} onChange={set("bannedWords")} />
          </GuidelineCard>

          <GuidelineCard icon={ShieldCheck} title="Compliance (regulated brands)" description="Optional. Claim limits every copy and image generator must follow.">
            <Field label="What the brand may and may not claim"><textarea rows={4} value={g.complianceNotes} onChange={text("complianceNotes")} placeholder="Can say clinically studied. Cannot claim it cures, treats or is FDA approved…" className="cs-brand-input" /></Field>
            <TagsField label="Hard-blocked phrases" placeholder="cure, guaranteed results, FDA approved" values={g.complianceProhibitedPhrases} onChange={set("complianceProhibitedPhrases")} />
          </GuidelineCard>

          <GuidelineCard icon={Quote} title="Customer language" description="Phrases and patterns found in reviews or on-site copy.">
            <SnippetRows rows={g.reviewLanguageSnippets} onChange={set("reviewLanguageSnippets")} />
          </GuidelineCard>

          <GuidelineCard icon={ImageIcon} title="Logo rules" description="The canonical mark and its constraints in generated creative.">
            <Field label="Logo URL"><div className="relative"><Link className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input value={g.logoUrl} onChange={text("logoUrl")} placeholder="https://…" className="cs-brand-input" style={{ paddingLeft: 38 }} /></div></Field>
            <Field label="Usage rules"><textarea rows={6} value={g.logoUsageRules} onChange={text("logoUsageRules")} placeholder="Minimum clear space, approved backgrounds, placement…" className="cs-brand-input min-h-[150px]" /></Field>
          </GuidelineCard>

          <GuidelineCard icon={ScanSearch} title="Source notes" description="A long-form brand bible or reference copy used as extra context." className="xl:col-span-2">
            <textarea rows={6} value={g.copyDocText} onChange={text("copyDocText")} placeholder="Paste supporting brand guidance or reference copy here…" className="cs-brand-input" />
          </GuidelineCard>
        </div>
        <ErrorBanner message={err} />
      </section>

      <ProductImageLibrary productId={productId} productName={productName} models={models} />

      {(dirty || saving || justSaved) && (
        <div className="cs-floating-save" role="status" aria-live="polite">
          {justSaved && !dirty ? (
            <span className="cs-floating-save__text is-saved"><Check className="h-4 w-4" />Brand guidelines saved</span>
          ) : (
            <>
              <span className="cs-floating-save__text"><i aria-hidden="true" />Unsaved brand guideline changes</span>
              <button type="button" onClick={() => setG(loadedGuidelines)} disabled={saving} className="cs-brand-secondary is-small">Discard</button>
              <button type="button" onClick={save} disabled={saving} className="cs-primary-button !h-10 !min-h-10 !rounded-[14px] !px-4 !text-[13px]">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Saving…" : "Save guidelines"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
BrandingEditor.propTypes = { clientId: PropTypes.string, productId: PropTypes.string, productName: PropTypes.string, setUnsavedChanges: PropTypes.func };

// ── Product image library ────────────────────────────────────────────────────

const ADD_MODES = [
  { key: "page", label: "From a webpage", icon: Globe },
  { key: "upload", label: "Upload", icon: Upload },
  { key: "url", label: "Image URL", icon: Link },
];

function ProductImageLibrary({ productId, productName, models }) {
  const [assets, setAssets] = useState([]);
  const [filter, setFilter] = useState("all");
  const [mode, setMode] = useState("page");
  const [assetType, setAssetType] = useState("hero_product");
  const [imageUrl, setImageUrl] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(null); // upload | url | scan | import | save
  const [notice, setNotice] = useState(null);
  const [err, setErr] = useState(null);

  const loadAssets = useCallback(async () => {
    if (!productId) { setAssets([]); return; }
    try { const r = await creativeApi.getAssets(productId); setAssets(r.assets || []); } catch { /* non-fatal */ }
  }, [productId]);
  useEffect(() => { loadAssets(); }, [loadAssets]);

  const counts = useMemo(() => {
    const map = new Map();
    for (const a of assets) map.set(a.assetType, (map.get(a.assetType) || 0) + 1);
    return map;
  }, [assets]);
  const visible = filter === "all" ? assets : assets.filter((a) => a.assetType === filter);
  useEffect(() => { if (filter !== "all" && !counts.has(filter)) setFilter("all"); }, [counts, filter]);

  const run = async (kind, fn) => {
    setErr(null); setNotice(null); setBusy(kind);
    try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(null); }
  };
  const onUploadFile = (e) => {
    const file = e.target.files?.[0];
    if (file) e.target.value = "";
    if (!file || !productId) return;
    run("upload", async () => {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await creativeApi.uploadAsset(productId, { dataBase64: dataUrl, assetType });
      await loadAssets();
      setNotice(`Added as ${assetLabel(assetType).toLowerCase()}.`);
    });
  };
  const addUrl = () => imageUrl.trim() && run("url", async () => {
    await creativeApi.addAsset(productId, { assetUrl: imageUrl.trim(), assetType });
    setImageUrl("");
    await loadAssets();
    setNotice(`Added as ${assetLabel(assetType).toLowerCase()}.`);
  });
  const scan = () => pageUrl.trim() && run("scan", async () => {
    setCandidates([]); setPicked(new Set());
    const r = await creativeApi.scrapeAssets(productId, pageUrl.trim());
    setCandidates(r.images || []);
    if (!(r.images || []).length) setNotice("No usable images found on that page.");
  });
  const autoImport = () => run("import", async () => {
    const r = await creativeApi.importBrandAssets(productId, pageUrl.trim() || undefined, models.forRun(RUN_OPERATIONS.assets));
    models.reset(RUN_OPERATIONS.assets);
    setNotice(r.message || `Imported ${r.imported} · skipped ${r.skipped} of ${r.total_candidates} images found.`);
    await loadAssets();
  });
  const saveScraped = () => picked.size && run("save", async () => {
    await creativeApi.saveScrapedAssets(productId, [...picked], assetType);
    setNotice(`Saved ${picked.size} image${picked.size === 1 ? "" : "s"} as ${assetLabel(assetType).toLowerCase()}.`);
    setCandidates([]); setPicked(new Set());
    await loadAssets();
  });
  const removeAsset = (id) => run("remove", async () => { await creativeApi.deleteAsset(productId, id); await loadAssets(); });
  const togglePick = (url) => setPicked((current) => {
    const next = new Set(current);
    if (next.has(url)) next.delete(url); else next.add(url);
    return next;
  });

  const typeSelect = (
    <Select value={assetType} onValueChange={setAssetType}>
      <SelectTrigger className="cs-weekly-filter-select cs-brand-type-select px-3" aria-label="Tag new images as"><SelectValue /></SelectTrigger>
      <SelectContent className="cs-select-content bg-white">
        {ASSET_TYPES.map((type) => <SelectItem key={type} value={type}>Tag as: {assetLabel(type)}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="cs-brand-section-title"><ImageIcon className="h-[18px] w-[18px] text-orange-500" />Product image library{productName ? <span className="font-normal text-neutral-400">· {productName}</span> : null}</h2>
        <p className="cs-brand-section-hint">
          Reference images the static ad generator works from. <Lock className="inline h-3 w-3 -translate-y-px" /> Locked types (hero product, UI screenshot, phone mockup, logo) are reproduced exactly; lifestyle and illustration images guide the style.
        </p>
      </div>

      {!productId ? <p className="text-sm text-neutral-400">Select a product above to manage its images.</p> : (
        <div className="grid gap-5">
          <div className="cs-guide-card">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="cs-weekly-switcher is-compact" role="tablist" aria-label="Add images">
                {ADD_MODES.map(({ key, label, icon: Icon }) => (
                  <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => setMode(key)}
                    className={`cs-weekly-switcher__item ${mode === key ? "is-active" : ""}`}>
                    <Icon className="h-3.5 w-3.5" />{label}
                  </button>
                ))}
              </div>
              {mode !== "page" && typeSelect}
            </header>

            {mode === "upload" && (
              <label className={`cs-brand-dropzone ${busy === "upload" ? "is-busy" : ""}`}>
                {busy === "upload" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                <strong>{busy === "upload" ? "Uploading…" : "Choose an image to upload"}</strong>
                <span>PNG, JPG or WebP. It&apos;s saved as {assetLabel(assetType).toLowerCase()}.</span>
                <input type="file" accept="image/*" onChange={onUploadFile} className="hidden" disabled={Boolean(busy)} />
              </label>
            )}

            {mode === "url" && (
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); addUrl(); }}>
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…/product.jpg" className="cs-brand-input flex-1" />
                <button type="submit" disabled={!imageUrl.trim() || Boolean(busy)} className="cs-brand-secondary">
                  {busy === "url" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add image
                </button>
              </form>
            )}

            {mode === "page" && (
              <div className="grid gap-3">
                <input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="Page URL (leave blank to use the product URL for auto-import)" className="cs-brand-input" />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="cs-brand-option">
                    <div><strong>Review images</strong><p>Scan the page and pick which images to keep, then tag them yourself.</p></div>
                    <button type="button" onClick={scan} disabled={!pageUrl.trim() || Boolean(busy)} className="cs-brand-secondary">
                      {busy === "scan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}{busy === "scan" ? "Scanning…" : "Review images"}
                    </button>
                  </div>
                  <div className="cs-brand-option">
                    <div><strong>Auto-import</strong><p>AI picks up to 8 useful images and tags each one. Review the result below.</p></div>
                    <button type="button" onClick={autoImport} disabled={Boolean(busy)} className="cs-primary-button !h-10 !min-h-10 !rounded-[14px] !px-4 !text-[13px]">
                      {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{busy === "import" ? "Importing…" : "Auto-import"}
                    </button>
                  </div>
                </div>
                <RunModelControls models={models} operations={RUN_OPERATIONS.assets} title="Model for the next auto-import" disabled={busy === "import"} />
              </div>
            )}

            {notice && <p className="text-xs font-medium text-emerald-700">{notice}</p>}
            <ErrorBanner message={err} />

            {candidates.length > 0 && (
              <div className="cs-brand-panel space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-neutral-500">{candidates.length} found · {picked.size} selected</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {typeSelect}
                    <button type="button" onClick={() => { setCandidates([]); setPicked(new Set()); }} className="cs-brand-secondary is-small">Cancel</button>
                    <button type="button" onClick={saveScraped} disabled={picked.size === 0 || Boolean(busy)} className="cs-primary-button !h-9 !min-h-9 !rounded-[13px] !px-4 !text-[12.5px]">
                      {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}Save {picked.size || ""} selected
                    </button>
                  </div>
                </div>
                <div className="cs-brand-masonry is-dense">
                  {candidates.map((candidate) => {
                    const on = picked.has(candidate.url);
                    return (
                      <button type="button" key={candidate.url} onClick={() => togglePick(candidate.url)} aria-pressed={on} className={`cs-brand-tile is-pickable ${on ? "is-picked" : ""}`}>
                        <img src={candidate.url} alt={candidate.alt || "Image found on the page"} loading="lazy" />
                        <span className="cs-brand-check">{on && <Check className="h-3 w-3" />}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {assets.length === 0 ? (
            <div className="cs-brand-empty"><ImageIcon className="h-5 w-5" />No product images yet. Import them from the product page or upload your own.</div>
          ) : (
            <div className="space-y-3">
              <div className="cs-weekly-switcher is-compact" role="tablist" aria-label="Filter images by tag">
                <button type="button" role="tab" aria-selected={filter === "all"} onClick={() => setFilter("all")} className={`cs-weekly-switcher__item ${filter === "all" ? "is-active" : ""}`}>All <span>{assets.length}</span></button>
                {[...counts.entries()].map(([type, n]) => (
                  <button key={type} type="button" role="tab" aria-selected={filter === type} onClick={() => setFilter(type)} className={`cs-weekly-switcher__item ${filter === type ? "is-active" : ""}`}>
                    {assetLabel(type)} <span>{n}</span>
                  </button>
                ))}
              </div>
              <div className="cs-brand-masonry">
                {visible.map((asset) => {
                  const locked = LOCKED_TYPES.has(asset.assetType);
                  return (
                    <article key={asset.id} className="cs-brand-tile">
                      <img src={asset.imageUrl || asset.assetUrl} alt={asset.description || assetLabel(asset.assetType)} loading="lazy" />
                      <span className={`cs-brand-badge ${locked ? "is-locked" : ""}`} title={locked ? "Locked: the generator reproduces this exactly" : "Style reference"}>
                        {locked && <Lock className="h-2.5 w-2.5" />}{assetLabel(asset.assetType)}
                      </span>
                      <button type="button" onClick={() => removeAsset(asset.id)} disabled={busy === "remove"} aria-label="Remove image" className="cs-brand-remove"><Trash2 className="h-3.5 w-3.5" /></button>
                      {asset.description && <p className="cs-brand-caption" title={asset.description}>{asset.description}</p>}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
ProductImageLibrary.propTypes = { productId: PropTypes.string, productName: PropTypes.string, models: PropTypes.object.isRequired };

// ── Guideline building blocks ────────────────────────────────────────────────

function GuidelineCard({ icon: Icon, title, description, children, className = "" }) {
  return (
    <section className={`cs-guide-card ${className}`}>
      <header className="flex items-start gap-3">
        <span className="cs-guide-card__icon"><Icon className="h-4 w-4" /></span>
        <div><h3 className="cs-guide-card__title">{title}</h3>{description && <p className="cs-guide-card__hint">{description}</p>}</div>
      </header>
      {children}
    </section>
  );
}
GuidelineCard.propTypes = { icon: PropTypes.elementType.isRequired, title: PropTypes.string.isRequired, description: PropTypes.string, children: PropTypes.node, className: PropTypes.string };

function Field({ label, children }) {
  return <label className="block"><span className="cs-brand-label">{label}</span>{children}</label>;
}
Field.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node };

function ColorRows({ label, hint, rows, onChange }) {
  const update = (index, key, value) => onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  return (
    <div className="cs-brand-panel">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div><h4 className="text-[13px] font-semibold text-neutral-800">{label}</h4><p className="mt-0.5 text-[11px] leading-4 text-neutral-500">{hint}</p></div>
        <button type="button" onClick={() => onChange([...rows, { hex: "#000000", name: "", usage: "" }])} className="cs-brand-add is-inline"><Plus className="h-3.5 w-3.5" /> Add</button>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <p className="cs-brand-placeholder">No colors detected</p>}
        {rows.map((row, index) => (
          <div key={`${label}-${index}`} className="cs-brand-row grid grid-cols-[38px_86px_1fr_auto] items-center gap-2">
            <input aria-label={`${label} color ${index + 1}`} type="color" value={/^#[0-9a-fA-F]{6}$/.test(row.hex) ? row.hex : "#000000"} onChange={(e) => update(index, "hex", e.target.value)} className="cs-brand-swatch" />
            <input value={row.hex || ""} onChange={(e) => update(index, "hex", e.target.value)} placeholder="#HEX" className="cs-brand-input is-compact font-mono text-xs" />
            <div className="grid min-w-0 gap-1">
              <input value={row.name || ""} onChange={(e) => update(index, "name", e.target.value)} placeholder="Color name" className="min-w-0 border-0 bg-transparent p-0 text-xs font-semibold text-neutral-800 outline-none placeholder:text-neutral-400" />
              <input value={row.usage || ""} onChange={(e) => update(index, "usage", e.target.value)} placeholder="Usage" className="min-w-0 border-0 bg-transparent p-0 text-[11px] text-neutral-500 outline-none placeholder:text-neutral-400" />
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
      {rows.length === 0 && <p className="cs-brand-placeholder">No fonts detected</p>}
      {rows.map((row, index) => (
        <div key={`font-${index}`} className="cs-brand-row grid gap-2 sm:grid-cols-[1.2fr_.6fr_1.3fr_auto] sm:items-center">
          <input value={row.family || ""} onChange={(e) => update(index, "family", e.target.value)} placeholder="Font family" className="cs-brand-input is-compact" />
          <input value={row.weight || ""} onChange={(e) => update(index, "weight", e.target.value)} placeholder="Weight" className="cs-brand-input is-compact" />
          <input value={row.usage || ""} onChange={(e) => update(index, "usage", e.target.value)} placeholder="Headlines, body, CTA…" className="cs-brand-input is-compact" />
          <button type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove font" className="justify-self-center p-2 text-neutral-300 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { family: "", weight: "", usage: "" }])} className="cs-brand-add"><Plus className="h-3.5 w-3.5" /> Add font</button>
    </div>
  );
}
FontRows.propTypes = { rows: PropTypes.array.isRequired, onChange: PropTypes.func.isRequired };

function TagsField({ label, placeholder, values, onChange }) {
  return (
    <Field label={label}>
      <textarea rows={3} value={(values || []).join(", ")} placeholder={placeholder} onChange={(e) => onChange(e.target.value.split(/[,\n]/).map((value) => value.trim()).filter(Boolean))} className="cs-brand-input" />
      <span className="mt-1 block text-[11px] text-neutral-400">Separate with commas or new lines</span>
    </Field>
  );
}
TagsField.propTypes = { label: PropTypes.string.isRequired, placeholder: PropTypes.string, values: PropTypes.array.isRequired, onChange: PropTypes.func.isRequired };

function SnippetRows({ rows, onChange }) {
  const update = (index, key, value) => onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={`snippet-${index}`} className="cs-brand-row">
          <div className="flex gap-1">
            {/* Real quotation marks around the phrase, instead of a quote icon. */}
            <span className="cs-brand-quote-mark" aria-hidden="true">“</span>
            <textarea rows={2} value={row.quote || ""} onChange={(e) => update(index, "quote", e.target.value)} placeholder="Exact customer phrase or characteristic brand language" className="min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-sm text-neutral-800 outline-none placeholder:text-neutral-400" />
            <span className="cs-brand-quote-mark self-end" aria-hidden="true">”</span>
            <button type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove language snippet" className="self-start p-1 text-neutral-300 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <input value={row.source || ""} onChange={(e) => update(index, "source", e.target.value)} placeholder="Source or context" className="mt-2 w-full border-0 border-t border-neutral-200 bg-transparent px-0 pt-2 text-xs text-neutral-500 outline-none placeholder:text-neutral-400" />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { quote: "", source: "" }])} className="cs-brand-add"><Plus className="h-3.5 w-3.5" /> Add language example</button>
    </div>
  );
}
SnippetRows.propTypes = { rows: PropTypes.array.isRequired, onChange: PropTypes.func.isRequired };
