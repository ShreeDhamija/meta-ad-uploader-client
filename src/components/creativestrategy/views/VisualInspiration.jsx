import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { ImagePlus } from "lucide-react";
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
  const [retry, setRetry] = useState(0);
  const [assetType, setAssetType] = useState("hero_product");
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    let active = true;
    if (!productId || !clientId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
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
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId, clientId, retry]);

  useEffect(() => {
    onChange({ productId, ready: !loading && !busy && !error, brandExampleAdIds: selected.examples, productAssetIds: selected.products, conceptReferenceIds: selected.concepts });
  }, [productId, selected, loading, busy, error, onChange]);

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
          const response = await creativeApi.uploadAsset(productId, { dataBase64, assetType, description: file.name });
          added = response.asset;
        } else {
          const response = await creativeApi.uploadInspo({ clientId, productId, dataBase64, fileName: file.name, fileType: "image", source: "static_generator" });
          const list = await creativeApi.getInspo(clientId, productId);
          added = list.items.find((item) => item.id === response.fileId);
          if (!added) throw new Error("Image uploaded, but could not reload it. Retry loading sources.");
        }
        if (!mounted.current) return;
        setSources((current) => ({ ...current, [uploadTab]: [...current[uploadTab], added] }));
        const limit = TABS.find((item) => item.key === uploadTab).limit;
        setSelected((current) => ({ ...current, [uploadTab]: [...current[uploadTab], added.id].slice(0, limit) }));
      }
    } catch (err) { if (mounted.current) setError(err.message); }
    finally { if (mounted.current) setBusy(false); }
  };

  const count = Object.values(selected).reduce((total, ids) => total + ids.length, 0);
  return <>
    <button type="button" className="cs-visual-trigger" onClick={() => setOpen(true)} disabled={!productId}>
      <ImagePlus size={16} /> Visual inspiration <span>{loading ? "…" : count}</span>
    </button>
    {!loading && count > 0 && <div className="cs-visual-preview" aria-label="Selected visual inspiration">
      {TABS.flatMap(({ key }) => sources[key].filter((item) => selected[key].includes(item.id))).slice(0, 6).map((item) => <img key={item.id} src={item.imageUrl} alt={item.name || item.description || item.fileName || "Selected image"} />)}
    </div>}
    {error && !open && <p className="text-xs text-red-700">Unable to load visual sources. Open Visual inspiration to retry.</p>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="cs-visual-dialog" overlayClassName="bg-black/40">
        <DialogHeader><DialogTitle>Visual inspiration</DialogTitle><DialogDescription>Choose the images your static generator will use.</DialogDescription></DialogHeader>
        <div className="cs-visual-tabs" role="tablist" aria-label="Visual sources">
          {TABS.map(({ key, label }) => <button key={key} type="button" role="tab" id={`visual-tab-${key}`} aria-controls={`visual-panel-${key}`} aria-selected={tab === key} onClick={() => setTab(key)} className={tab === key ? "is-active" : ""}>{label} <span>{selected[key].length}</span></button>)}
        </div>
        <div role="tabpanel" id={`visual-panel-${tab}`} aria-labelledby={`visual-tab-${tab}`} className="cs-visual-panel">
          <p className="text-sm text-stone-600">{HELP[tab]}</p>
          <ErrorBanner message={error} />
          {error && <button type="button" className="cs-library-action" disabled={busy} onClick={() => setRetry((value) => value + 1)}>Reload sources</button>}
          {tab !== "examples" && <div className="cs-visual-upload">
            {tab === "products" && <label className="text-xs">Image type <select value={assetType} onChange={(event) => setAssetType(event.target.value)} className="ml-2 rounded border p-2">
              {[['hero_product', 'Product photo'], ['ui_screenshot', 'UI screenshot'], ['phone_mockup', 'Device mockup'], ['illustration', 'Illustration'], ['brand_mark', 'Brand mark'], ['lifestyle', 'Lifestyle']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>}
            <label className="text-sm font-medium">{busy ? "Uploading…" : tab === "products" ? "Upload product images" : "Upload concept references"}
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy || loading} onChange={(event) => { upload(Array.from(event.target.files || [])); event.target.value = ""; }} className="mt-2 block w-full text-xs" />
            </label><p className="text-xs text-stone-500">PNG, JPG, WebP · up to 6 MB each · saved for future generations</p>
          </div>}
          {loading ? <p className="py-8 text-center text-sm">Loading visual sources…</p> : sources[tab].length === 0 ? <p className="py-8 text-center text-sm text-stone-500">{tab === "examples" ? "No analyzed image ads yet. Run Insights analysis for this brand to add examples." : "No images yet. Upload images to get started."}</p> : <div className="cs-visual-grid">
            {sources[tab].map((item) => {
              const checked = selected[tab].includes(item.id);
              const name = item.name || item.description || item.fileName || "Untitled image";
              return <button key={item.id} type="button" aria-pressed={checked} disabled={!checked && selected[tab].length >= TABS.find((entry) => entry.key === tab).limit} onClick={() => toggle(item.id)} className={`cs-visual-card ${checked ? "is-selected" : ""}`}>
                <img src={item.imageUrl} alt={name} loading="lazy" /><span className="cs-visual-check">{checked ? "✓" : "+"}</span><span className="cs-visual-name" title={name}>{name}</span>
              </button>;
            })}
          </div>}
        </div>
        <div className="flex items-center justify-between border-t pt-4 text-xs text-stone-500"><span>{selected[tab].length} / {TABS.find((item) => item.key === tab).limit} selected</span><button type="button" className="cs-primary-button" onClick={() => setOpen(false)}>Done</button></div>
      </DialogContent>
    </Dialog>
  </>;
}
VisualInspiration.propTypes = { productId: PropTypes.string, clientId: PropTypes.string, onChange: PropTypes.func.isRequired };
