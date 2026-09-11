import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { ImagePlus, Upload, Loader2 } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorBanner } from "../ui";

const TABS = [
  { key: "examples", label: "Brand examples", limit: 6 },
  { key: "products", label: "Product images", limit: 4 },
  { key: "concepts", label: "Concept reference", limit: 8 },
];
const HELP = {
  examples: "Past Meta image ads, ranked by spend. Select up to 6 to guide typography, colors, and photography. Only your selections will be used.",
  products: "Select up to 4 images of your actual product. These guide product appearance, packaging, or UI fidelity.",
  concepts: "Choose saved inspiration or upload a reference ad. References guide layout and style, never product identity. Multiple references rotate across variations; choose at least as many variations to use each one.",
};
const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("Unable to read image"));
  reader.readAsDataURL(file);
});

export default function VisualInspiration({ productId, clientId, onChange }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("examples");
  const [sources, setSources] = useState({ examples: [], products: [], concepts: [] });
  const [selected, setSelected] = useState({ examples: [], products: [], concepts: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const fileInput = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapedImages, setScrapedImages] = useState([]);
  const [scrapedSelected, setScrapedSelected] = useState([]);
  const [scrapeBusy, setScrapeBusy] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState("");
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    let active = true;
    if (!productId || !clientId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    setLoadError(false);
    Promise.all([creativeApi.getVisualSources(productId), creativeApi.getAssets(productId), creativeApi.getInspo(clientId)])
      .then(([brand, assets, inspo]) => {
        if (!active) return;
        const next = {
          examples: brand.examples || [],
          products: (assets.assets || []).filter((item) => item.assetType !== "reference_ad" && item.imageUrl),
          concepts: (inspo.items || []).filter((item) => item.fileType === "image" && item.imageUrl && (!item.productId || item.productId === productId)),
        };
        setSources(next);
        setSelected({ examples: next.examples.slice(0, 3).map((item) => item.id), products: next.products.slice(0, 4).map((item) => item.id), concepts: [] });
      })
      .catch((err) => { if (active) { setError(err.message); setLoadError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId, clientId, retry]);

  useEffect(() => {
    const hasImages = selected.examples.length + selected.products.length + selected.concepts.length > 0;
    onChange({ productId, ready: !loading && !busy && !loadError && hasImages, brandExampleAdIds: selected.examples, productAssetIds: selected.products, conceptReferenceIds: selected.concepts });
  }, [productId, selected, loading, busy, loadError, onChange]);

  const toggle = (id) => {
    const limit = TABS.find((item) => item.key === tab).limit;
    setSelected((current) => ({ ...current, [tab]: current[tab].includes(id) ? current[tab].filter((value) => value !== id) : current[tab].length < limit ? [...current[tab], id] : current[tab] }));
  };

  const upload = async (files) => {
    if (!files.length || busy) return;
    const uploadTab = tab;
    setBusy(true); setError(null);
    try {
      for (const file of files) {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 6 * 1024 * 1024) throw new Error("Use PNG, JPG, or WebP images up to 6 MB each.");
        const dataBase64 = await readFile(file);
        let added;
        if (uploadTab === "products") {
          const response = await creativeApi.uploadAsset(productId, { dataBase64, assetType: "hero_product", description: file.name });
          added = { ...response.asset, imageUrl: response.asset.imageUrl || dataBase64 };
        } else {
          const response = await creativeApi.uploadInspo({ clientId, productId, dataBase64, fileName: file.name, fileType: "image", source: "static_generator" });
          added = { id: response.fileId, productId, fileName: file.name, fileType: "image", imageUrl: dataBase64 };
        }
        if (!mounted.current) return;
        setLoadError(false);
        setSources((current) => ({ ...current, [uploadTab]: [...current[uploadTab], added] }));
        const limit = TABS.find((item) => item.key === uploadTab).limit;
        setSelected((current) => ({ ...current, [uploadTab]: [added.id, ...current[uploadTab]].slice(0, limit) }));
      }
    } catch (err) { if (mounted.current) setError(err.message); }
    finally { if (mounted.current) setBusy(false); }
  };

  const scrape = async () => {
    if (scrapeBusy || busy) return;
    try {
      const url = new URL(scrapeUrl.trim());
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch { setScrapeMessage("Enter a valid product-page URL."); return; }
    setScrapeBusy(true); setScrapeMessage(""); setScrapedImages([]); setScrapedSelected([]);
    try {
      const response = await creativeApi.scrapeAssets(productId, scrapeUrl.trim());
      if (!mounted.current) return;
      const images = [...new Map((response.images || []).map((image) => [image.url, image])).values()];
      setScrapedImages(images);
      if (!images.length) setScrapeMessage("No images found on this page. Try another URL or upload a file.");
    } catch (err) { if (mounted.current) setScrapeMessage(err.message); }
    finally { if (mounted.current) setScrapeBusy(false); }
  };

  const saveScraped = async () => {
    if (!scrapedSelected.length || scrapeBusy || busy) return;
    setScrapeBusy(true); setBusy(true); setScrapeMessage("");
    try {
      const response = await creativeApi.saveScrapedAssets(productId, scrapedSelected, "hero_product");
      const assets = await creativeApi.getAssets(productId);
      if (!mounted.current) return;
      const next = (assets.assets || []).filter((item) => item.assetType !== "reference_ad" && item.imageUrl);
      const oldIds = new Set(sources.products.map((item) => item.id));
      const added = next.filter((item) => !oldIds.has(item.id));
      setLoadError(false);
      setError(null);
      setSources((current) => ({ ...current, products: next }));
      setSelected((current) => ({ ...current, products: [...added.map((item) => item.id), ...current.products].slice(0, 4) }));
      const failed = response.failed || [];
      setScrapedImages((current) => current.filter((image) => !scrapedSelected.includes(image.url) || failed.includes(image.url)));
      setScrapedSelected(failed);
      setScrapeMessage(`${response.saved || 0} image(s) saved.${failed.length ? ` ${failed.length} could not be saved. You can retry them.` : ""}`);
    } catch (err) { if (mounted.current) setScrapeMessage(err.message); }
    finally { if (mounted.current) { setScrapeBusy(false); setBusy(false); } }
  };

  return <>
    <button type="button" className="cs-visual-trigger" onClick={() => setOpen(true)} disabled={!productId}>
      <ImagePlus size={16} /> Visual inspiration
    </button>
    {!loading && !loadError && <p className="text-xs text-stone-500" role="status">{selected.examples.length + selected.products.length + selected.concepts.length > 0
      ? `${selected.products.length} product images · ${selected.examples.length} brand examples · ${selected.concepts.length} concept references selected`
      : "Select or upload at least one image to generate ads."}</p>}
    {error && !open && <p className="text-xs text-red-700">{error} Open Visual inspiration to retry.</p>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent disableSlide className="cs-visual-dialog" overlayClassName="bg-black/40">
        <DialogHeader><DialogTitle>Visual inspiration</DialogTitle><DialogDescription>Choose the images your static generator will use.</DialogDescription></DialogHeader>
        <div className="cs-visual-tabs" role="tablist" aria-label="Visual sources">
          {TABS.map(({ key, label }) => <button key={key} type="button" role="tab" id={`visual-tab-${key}`} aria-controls={`visual-panel-${key}`} aria-selected={tab === key} onClick={() => setTab(key)} className={tab === key ? "is-active" : ""}>{label} <span>{selected[key].length}</span></button>)}
        </div>
        <div role="tabpanel" id={`visual-panel-${tab}`} aria-labelledby={`visual-tab-${tab}`} className="cs-visual-panel">
          <p className="text-sm text-stone-600">{HELP[tab]}</p>
          <ErrorBanner message={error} />
          {error && <button type="button" className="cs-library-action" disabled={busy} onClick={() => setRetry((value) => value + 1)}>Reload sources</button>}
          {tab !== "examples" && <>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden disabled={busy || loading} onChange={(event) => { upload(Array.from(event.target.files || [])); event.target.value = ""; }} />
            <button type="button" className={`cs-visual-upload ${dragging ? "is-dragging" : ""}`} disabled={busy || loading}
              onClick={() => fileInput.current?.click()}
              onDragOver={(event) => { event.preventDefault(); if (!busy && !loading) setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy && !loading) upload(Array.from(event.dataTransfer.files)); }}>
              {busy ? <Loader2 size={28} className="animate-spin" /> : <Upload size={28} />}
              <span>{busy ? "Uploading…" : "Drag & drop files here, or click to select files"}</span>
            </button>
          </>}
          {tab === "products" && <div className="cs-visual-scraper">
            <label htmlFor="visual-product-url">Import from a product page</label>
            <div className="cs-visual-scraper-row">
              <input id="visual-product-url" type="url" placeholder="Paste a product-page URL" value={scrapeUrl} disabled={scrapeBusy || busy} onChange={(event) => setScrapeUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); scrape(); } }} />
              <button type="button" className="cs-library-action" disabled={scrapeBusy || busy || !scrapeUrl.trim()} onClick={scrape}>{scrapeBusy ? "Working…" : "Fetch images"}</button>
            </div>
            {scrapeMessage && <p role="status" className="text-xs text-stone-600">{scrapeMessage}</p>}
            {scrapedImages.length > 0 && <>
              <div className="cs-visual-grid">{scrapedImages.map((image) => <label key={image.url} className={`cs-visual-card ${scrapedSelected.includes(image.url) ? "is-selected" : ""}`}>
                <img src={image.url} alt={image.alt || "Product page image"} loading="lazy" referrerPolicy="no-referrer" />
                <input type="checkbox" className="cs-visual-checkbox" aria-label={`Select ${image.alt || "product page image"}`} checked={scrapedSelected.includes(image.url)} disabled={scrapeBusy || busy} onChange={() => setScrapedSelected((current) => current.includes(image.url) ? current.filter((url) => url !== image.url) : [...current, image.url])} />
              </label>)}</div>
              <button type="button" className="cs-library-action self-start" disabled={scrapeBusy || busy || !scrapedSelected.length} onClick={saveScraped}>Save selected images ({scrapedSelected.length})</button>
            </>}
          </div>}
          {loading ? <p className="py-8 text-center text-sm">Loading visual sources…</p> : sources[tab].length === 0 ? (tab === "examples" ? <p className="py-8 text-center text-sm text-stone-500">No analyzed image ads yet. Run Insights analysis for this brand to add examples.</p> : null) : <div className="cs-visual-grid">
            {sources[tab].map((item) => {
              const checked = selected[tab].includes(item.id);
              const name = item.name || item.description || item.fileName || "Untitled image";
              const disabled = busy || loading || (!checked && selected[tab].length >= TABS.find((entry) => entry.key === tab).limit);
              return <label key={item.id} className={`cs-visual-card ${checked ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`}>
                <img src={item.imageUrl} alt={name} loading="lazy" />
                <input type="checkbox" className="cs-visual-checkbox" aria-label={`Select ${name}`} checked={checked} disabled={disabled} onChange={() => toggle(item.id)} />
                <span className="cs-visual-name" title={name}>{name}</span>
              </label>;
            })}
          </div>}
        </div>
        <div className="cs-visual-footer"><span>{selected[tab].length} / {TABS.find((item) => item.key === tab).limit} selected</span><button type="button" className="cs-primary-button cs-visual-done" onClick={() => setOpen(false)}>Done</button></div>
      </DialogContent>
    </Dialog>
  </>;
}
VisualInspiration.propTypes = { productId: PropTypes.string, clientId: PropTypes.string, onChange: PropTypes.func.isRequired };
