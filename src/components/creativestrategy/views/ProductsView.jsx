// Products under the selected brand: a card grid + a create-product dialog,
// plus Context and Branding sub-tabs (shadcn Tabs). Meta ad account is
// inherited from the brand.
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Box, BrainCircuit, Image as ImageIcon, Pencil, Plus, Route, Star } from "lucide-react";
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
    brands, selectedBrand, selectedBrandId, setSelectedBrandId, selectedProduct, products, productsLoading,
    selectedProductId, setSelectedProductId, reloadProducts, goTo,
  } = ctx;
  const [tab, setTab] = useState("products");
  const [form, setForm] = useState({ name: "", url: "", productType: "physical" });
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

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
  const selectAndGo = (productId, destination) => {
    setSelectedProductId(productId);
    goTo(destination);
  };
  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB");
  };

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex flex-wrap items-center gap-5">
          <Select value={selectedBrandId || ""} onValueChange={(v) => setSelectedBrandId(v || null)}>
            <SelectTrigger className="cs-pill-control w-[260px] px-5 font-semibold">
              <SelectValue placeholder="Select Brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => <SelectItem key={b.id} value={b.id} disabled={b.mappingPending}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedProductId || ""} onValueChange={(v) => setSelectedProductId(v || null)} disabled={!selectedBrandId}>
            <SelectTrigger className="cs-pill-control w-[260px] px-5 font-semibold">
              <SelectValue placeholder="Select Product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogTrigger asChild>
            <button disabled={!selectedBrandId} className="cs-primary-button">
              <Plus className="h-5 w-5" /> Add New Product
            </button>
          </DialogTrigger>
          <DialogContent className="cs-modal sm:rounded-[28px]">
            <DialogHeader className="items-center text-center">
              <DialogTitle className="text-2xl font-bold tracking-tight">Add a new product</DialogTitle>
              <DialogDescription className="max-w-sm text-center text-sm text-neutral-500">
                Add the product details and we’ll use them to build its research, insights, and creative strategy.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={add} className="mt-3 space-y-4">
              <Input
                aria-label="Product name"
                placeholder="Product name"
                value={form.name}
                onChange={set("name")}
                className="cs-modal-input"
                autoFocus
              />
              <Input
                aria-label="Product URL"
                placeholder="Product URL"
                value={form.url}
                onChange={set("url")}
                className="cs-modal-input"
              />
              <Select value={form.productType} onValueChange={(v) => setForm((f) => ({ ...f, productType: v }))}>
                <SelectTrigger className="cs-modal-input w-full capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((type) => <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>)}</SelectContent>
              </Select>
              <p className="px-2 text-center text-xs text-neutral-500">
                The Meta ad account is inherited from {selectedBrand?.name}
                {selectedBrand?.metaAdAccountId ? ` (${selectedBrand.metaAdAccountId})` : ""}.
              </p>
              <ErrorBanner message={err} />
              <DialogFooter>
                <button type="submit" disabled={!form.name.trim() || creating} className="cs-primary-button w-full">
                  {creating ? "Creating…" : "Create Product"}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <TabsList className="sr-only">
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="context">Context</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
      </TabsList>

      <TabsContent value="products" className="mt-0 space-y-5">
        {!adding && <ErrorBanner message={err} />}

        {!selectedBrandId ? (
          <EmptyState
            icon={Box}
            title="Select a brand to view its products"
            hint="Choose a brand above, or create one from the Brands tab."
            className="min-h-[390px] rounded-[28px]"
          />
        ) : productsLoading ? (
          <ViewLoading label="Loading products…" />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Box}
            title="Create Your First Product"
            hint="Adding a URL starts product analysis, research, and creative context automatically."
            action={
              <button onClick={() => setAdding(true)} className="mt-2 inline-flex items-center gap-2 font-semibold text-neutral-900">
                <Plus className="h-5 w-5 text-orange-500" /> Create Your First Product
              </button>
            }
            className="min-h-[390px] rounded-[28px]"
          />
        ) : (
          <div className="grid grid-cols-3 gap-6 max-2xl:grid-cols-2 max-xl:grid-cols-1">
            {products.map((p) => {
              const active = selectedProductId === p.id;
              return (
                <article key={p.id} className={`cs-product-card min-w-0 ${active ? "ring-2 ring-black/20 ring-offset-2" : ""}`}>
                  <button
                    type="button"
                    aria-label={`Edit ${p.name}`}
                    onClick={() => { setSelectedProductId(p.id); setTab("context"); }}
                    className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#3b170b] bg-[var(--cs-cream)] shadow-sm transition hover:scale-105"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProductId(p.id)}
                    className="cs-product-card__header flex w-full items-center gap-3 px-5 py-4 text-left"
                  >
                    <Star className="h-6 w-6 shrink-0 fill-amber-400 text-amber-500" />
                    <span className="truncate text-lg font-bold">{p.name}</span>
                  </button>
                  <div className="space-y-3 p-4">
                    <button type="button" onClick={() => selectAndGo(p.id, "intelligence")} className="cs-product-action">
                      <BrainCircuit className="h-5 w-5" /> View Insights
                    </button>
                    <button type="button" onClick={() => selectAndGo(p.id, "weekly")} className="cs-product-action">
                      <Route className="h-5 w-5" /> Weekly Strategy
                    </button>
                    <button type="button" onClick={() => selectAndGo(p.id, "generate")} className="cs-product-action">
                      <ImageIcon className="h-5 w-5" /> Generate Statics
                    </button>
                    <p className="px-2 pt-1 text-xs font-medium text-neutral-600">
                      Created at: {formatDate(p.createdAt || p.created_at)}
                    </p>
                  </div>
                </article>
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
