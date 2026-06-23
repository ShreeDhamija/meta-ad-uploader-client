// Products under the selected brand: a card grid + a create-product dialog,
// plus Context and Branding sub-tabs (shadcn Tabs). Meta ad account is
// inherited from the brand.
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Box, Plus } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import BrandingEditor from "./BrandingEditor";
import { ViewLoading, EmptyState, ErrorBanner, SectionCard } from "../ui";
import { useJobRunner, JobBadge } from "../JobsContext";

const TYPES = ["physical", "saas", "info", "service"];
const CONTEXT_LABELS = {
  features: "Features", benefits: "Benefits", pain_points: "Pain points", testimonials: "Testimonials",
  pricing: "Pricing", customer_avatars: "Customer avatars", branding: "Branding",
};
const CONTEXT_ORDER = ["features", "benefits", "pain_points", "testimonials", "pricing", "customer_avatars", "branding"];

export default function ProductsView({ ctx }) {
  const {
    selectedBrand, selectedBrandId, selectedProduct, products, productsLoading,
    selectedProductId, setSelectedProductId, reloadProducts,
  } = ctx;
  const [tab, setTab] = useState("products");
  const [form, setForm] = useState({ name: "", url: "", productType: "physical" });
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

  if (!selectedBrandId) {
    return <EmptyState icon={Box} title="No brand selected" hint="Pick a brand in the top bar (or the Brands tab) to manage its products." />;
  }

  const add = async (e) => {
    e.preventDefault();
    setErr(null); setCreating(true);
    try {
      await creativeApi.createProduct({ ...form, clientId: selectedBrandId });
      setForm({ name: "", url: "", productType: "physical" });
      setAdding(false);
      await reloadProducts();
    } catch (e) { setErr(e.message); } finally { setCreating(false); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-5">
      <TabsList>
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="context">Context</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
      </TabsList>

      <TabsContent value="products" className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">{selectedBrand?.name}</p>
          <Dialog open={adding} onOpenChange={setAdding}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl gap-1.5"><Plus className="w-4 h-4" /> New product</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>New product</DialogTitle>
                <DialogDescription>
                  Ad account is inherited from {selectedBrand?.name}
                  {selectedBrand?.metaAdAccountId ? ` (${selectedBrand.metaAdAccountId})` : ""}.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={add} className="space-y-3">
                <Input placeholder="Product name" value={form.name} onChange={set("name")} className="rounded-xl" autoFocus />
                <Input placeholder="Product URL (used for research + ingestion)" value={form.url} onChange={set("url")} className="rounded-xl" />
                <Select value={form.productType} onValueChange={(v) => setForm((f) => ({ ...f, productType: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <ErrorBanner message={err} />
                <DialogFooter>
                  <Button type="submit" disabled={!form.name || creating} className="rounded-xl">
                    {creating ? "Creating…" : "Create product"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {!adding && <ErrorBanner message={err} />}

        {productsLoading ? (
          <ViewLoading label="Loading products…" />
        ) : products.length === 0 ? (
          <EmptyState icon={Box} title="No products yet"
            hint="Create your first product. Adding a URL kicks off analysis → research → library automatically." />
        ) : (
          <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2">
            {products.map((p) => {
              const active = selectedProductId === p.id;
              return (
                <button key={p.id} onClick={() => setSelectedProductId(p.id)}
                  className={`text-left rounded-2xl border bg-white p-5 min-h-[120px] transition-all ${active ? "border-neutral-900 shadow" : "border-neutral-200 shadow-xs hover:shadow-sm"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-neutral-900 truncate">{p.name}</span>
                    {active && <Badge variant="secondary" className="rounded-full text-[10px]">selected</Badge>}
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">{p.metaAdAccountId}</div>
                  {p.url && <div className="text-xs text-neutral-400 mt-1 truncate">{p.url}</div>}
                  {p.productType && <Badge variant="outline" className="rounded-full mt-3 text-[10px] font-normal text-neutral-500">{p.productType}</Badge>}
                </button>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="context">
        <ContextEditor productId={selectedProductId} productName={selectedProduct?.name} hasUrl={!!selectedProduct?.url} />
      </TabsContent>

      <TabsContent value="branding">
        <BrandingEditor clientId={selectedBrandId} productId={selectedProductId} productName={selectedProduct?.name} />
      </TabsContent>
    </Tabs>
  );
}

ProductsView.propTypes = { ctx: PropTypes.object.isRequired };

// Context editor — per-category manual intel + "Run ingestion" (scrape the
// product URL to auto-fill).
function ContextEditor({ productId, productName, hasUrl }) {
  const [intel, setIntel] = useState({});
  const [drafts, setDrafts] = useState({});
  const [savingType, setSavingType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const r = await creativeApi.getContext(productId);
      setIntel(r.intel || {});
      const d = {};
      for (const t of CONTEXT_ORDER) d[t] = r.intel?.[t]?.contentText || "";
      setDrafts(d);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [productId]);

  const { job: ingestJob, start: startIngest } = useJobRunner({ kind: "ingest_context", productId, onComplete: load });

  if (!productId) return <EmptyState icon={Box} title="No product selected" hint="Select a product in the top bar to edit its context." />;
  if (loading) return <ViewLoading label="Loading context…" />;

  const save = async (type) => {
    setErr(null); setSavingType(type);
    try { await creativeApi.saveContext(productId, type, drafts[type]); await load(); }
    catch (e) { setErr(e.message); } finally { setSavingType(null); }
  };
  const ingest = async () => {
    setErr(null);
    try { const { jobId } = await creativeApi.runIngest(productId); startIngest(jobId); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={ingest} disabled={!hasUrl} size="sm" className="rounded-xl" title={hasUrl ? "" : "Add a product URL first"}>
          Run ingestion
        </Button>
        <JobBadge job={ingestJob} />
        <span className="text-sm text-neutral-400">{productName} · scrape the URL to auto-fill, or edit by hand</span>
      </div>
      <ErrorBanner message={err} />

      <div className="space-y-3">
        {CONTEXT_ORDER.map((type) => {
          const dirty = drafts[type] !== (intel[type]?.contentText || "");
          return (
            <SectionCard key={type} title={CONTEXT_LABELS[type]}
              actions={
                <div className="flex items-center gap-2">
                  {intel[type]?.isHumanEdited && <Badge variant="secondary" className="rounded-full text-[10px]">edited</Badge>}
                  <Button onClick={() => save(type)} disabled={savingType === type || !dirty}
                    size="sm" variant="outline" className="rounded-xl h-7 text-xs">
                    {savingType === type ? "Saving…" : "Save"}
                  </Button>
                </div>
              }>
              <textarea rows={type === "customer_avatars" || type === "pain_points" ? 8 : 4} value={drafts[type] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [type]: e.target.value }))}
                placeholder={`${CONTEXT_LABELS[type]} — bullet points, or Run ingestion to auto-fill`}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
ContextEditor.propTypes = { productId: PropTypes.string, productName: PropTypes.string, hasUrl: PropTypes.bool };
