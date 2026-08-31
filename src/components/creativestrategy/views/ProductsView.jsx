// Products under the selected brand: a card grid + a create-product dialog,
// plus Context and Branding sub-tabs (shadcn Tabs). Meta ad account is
// inherited from the brand.
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { creativeApi } from "@/lib/creativeApi";
import { ArrowLeft, Box, BrainCircuit, Image as ImageIcon, Pencil, Plus, Route, Star } from "lucide-react";
import PropTypes from "prop-types";
import { useCallback, useEffect, useState } from "react";
import { JobBadge, useJobRunner } from "../JobsContext";
import { EmptyState, ErrorBanner, ViewLoading } from "../ui";
import BrandingEditor from "./BrandingEditor";

const TYPES = ["physical", "saas", "info", "service"];
const CONTEXT_LABELS = {
  features: "Features",
  benefits: "Benefits",
  pain_points: "Pain points",
  testimonials: "Testimonials",
  pricing: "Pricing",
  customer_avatars: "Customer avatars",
};
const CONTEXT_ORDER = ["features", "benefits", "pain_points", "testimonials", "pricing", "customer_avatars"];

export default function ProductsView({ ctx }) {
  const {
    brands,
    selectedBrandId,
    setSelectedBrandId,
    selectedProduct,
    products,
    productsLoading,
    selectedProductId,
    setSelectedProductId,
    reloadBrands,
    reloadProducts,
    goTo,
  } = ctx;
  const [tab, setTab] = useState("products");
  const [form, setForm] = useState({ name: "", url: "", productType: "physical" });
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    setErr(null);
    setCreating(true);
    try {
      const response = await creativeApi.createProduct({ ...form, clientId: selectedBrandId });
      if (response.product?.id) setSelectedProductId(response.product.id);
      setForm({ name: "", url: "", productType: "physical" });
      setAdding(false);
      await reloadProducts();
      await reloadBrands();
    } catch (e) {
      setErr(e.message);
    } finally {
      setCreating(false);
    }
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
      {tab === "products" && (
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Select value={selectedBrandId || ""} onValueChange={(v) => setSelectedBrandId(v || null)}>
            <SelectTrigger className="cs-pill-control w-[230px] px-4">
              <SelectValue placeholder="Select Account" />
            </SelectTrigger>
            <SelectContent className="cs-select-content bg-white">
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={adding} onOpenChange={setAdding}>
            <DialogTrigger asChild>
              <button disabled={!selectedBrandId} className="cs-primary-button">
                <Plus className="h-5 w-5" /> Add New Product
              </button>
            </DialogTrigger>
            <DialogContent
              disableSlide
              overlayClassName="bg-black/45 backdrop-blur-[1px]"
              className="cs-modal data-[state=open]:duration-150 data-[state=closed]:duration-100 sm:rounded-[32px]"
            >
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
                <div className="space-y-1.5">
                  <Input aria-label="Product URL" type="url" placeholder="https://your-product-page.com" value={form.url} onChange={set("url")} className="cs-modal-input" />
                  <p className="px-1 text-xs leading-5 text-neutral-500">
                    Used to automatically build product context, brand guidelines, research, insights, copy, and the first strategy.
                  </p>
                </div>
                <Select value={form.productType} onValueChange={(v) => setForm((f) => ({ ...f, productType: v }))}>
                  <SelectTrigger className="cs-modal-input w-full capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="cs-select-content bg-white">
                    {TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="capitalize">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ErrorBanner message={err} />
                <DialogFooter>
                  <button type="submit" disabled={!form.name.trim() || !form.url.trim() || creating} className="cs-primary-button cs-modal-submit w-full">
                    {creating ? "Creating & starting setup…" : "Create Product & Start Setup"}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

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
            title="Select an account to view its products"
            hint="Choose an account above, or connect one from the Accounts tab."
            className="min-h-[390px] rounded-[28px]"
          />
        ) : productsLoading ? (
          <ViewLoading label="Loading products…" />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Box}
            title={
              <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 font-semibold text-neutral-900">
                <Plus className="h-5 w-5 text-orange-500" /> Create Your First Product
              </button>
            }
            className="min-h-[390px] rounded-[28px]"
          />
        ) : (
          <div className="cs-product-grid">
            {products.map((p) => {
              const active = selectedProductId === p.id;
              return (
                <article key={p.id} className={`cs-product-card min-w-0 ${active ? "ring-2 ring-black/20 ring-offset-2" : ""}`}>
                  <button
                    type="button"
                    aria-label={`Edit ${p.name}`}
                    onClick={() => {
                      setSelectedProductId(p.id);
                      setTab("context");
                    }}
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
                    <p className="px-2 pt-1 text-xs font-medium text-neutral-600">Created at: {formatDate(p.createdAt || p.created_at)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="context" className="mt-0">
        <ProductEditorNav active="context" onBack={() => setTab("products")} onChange={setTab} />
        <ContextEditor
          productId={selectedProductId}
          productName={selectedProduct?.name}
          hasUrl={!!selectedProduct?.url}
          toolbar={
            <div className="flex flex-wrap items-center gap-5">
              <Select value={selectedBrandId || ""} onValueChange={(v) => setSelectedBrandId(v || null)}>
                <SelectTrigger className="cs-pill-control w-[230px] px-4">
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent className="cs-select-content bg-white">
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedProductId || ""} onValueChange={(v) => setSelectedProductId(v || null)} disabled={!selectedBrandId}>
                <SelectTrigger className="cs-pill-control w-[230px] px-4">
                  <SelectValue placeholder="Select Product" />
                </SelectTrigger>
                <SelectContent className="cs-select-content bg-white">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </TabsContent>

      <TabsContent value="branding" className="mt-0">
        <ProductEditorNav active="branding" onBack={() => setTab("products")} onChange={setTab} />
        <div className="mb-6 flex flex-wrap items-center gap-5">
          <Select value={selectedBrandId || ""} onValueChange={(v) => setSelectedBrandId(v || null)}>
            <SelectTrigger className="cs-pill-control w-[230px] px-4">
              <SelectValue placeholder="Select Account" />
            </SelectTrigger>
            <SelectContent className="cs-select-content bg-white">
              {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedProductId || ""} onValueChange={(v) => setSelectedProductId(v || null)} disabled={!selectedBrandId}>
            <SelectTrigger className="cs-pill-control w-[230px] px-4">
              <SelectValue placeholder="Select Product" />
            </SelectTrigger>
            <SelectContent className="cs-select-content bg-white">
              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <BrandingEditor clientId={selectedBrandId} productId={selectedProductId} productName={selectedProduct?.name} />
      </TabsContent>
    </Tabs>
  );
}

ProductsView.propTypes = { ctx: PropTypes.object.isRequired };

function ProductEditorNav({ active, onBack, onChange }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-transparent px-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-200"
      >
        <ArrowLeft className="h-4 w-4" /> Back to all products
      </button>
      <div className="inline-flex rounded-2xl border border-[#6c3403]/15 bg-white/70 p-1 shadow-sm">
        <button type="button" onClick={() => onChange("context")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${active === "context" ? "bg-[#3b170b] text-white shadow-sm" : "text-[#6c3403]/70 hover:text-[#3b170b]"}`}>
          Product context
        </button>
        <button type="button" onClick={() => onChange("branding")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${active === "branding" ? "bg-[#3b170b] text-white shadow-sm" : "text-[#6c3403]/70 hover:text-[#3b170b]"}`}>
          Brand guidelines
        </button>
      </div>
    </div>
  );
}
ProductEditorNav.propTypes = { active: PropTypes.string.isRequired, onBack: PropTypes.func.isRequired, onChange: PropTypes.func.isRequired };

// Context editor — per-category manual intel + "Run ingestion" (scrape the
// product URL to auto-fill).
function ContextEditor({ productId, productName, hasUrl, toolbar }) {
  const [intel, setIntel] = useState({});
  const [drafts, setDrafts] = useState({});
  const [savingType, setSavingType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const r = await creativeApi.getContext(productId);
      setIntel(r.intel || {});
      const d = {};
      for (const t of CONTEXT_ORDER) d[t] = r.intel?.[t]?.contentText || "";
      setDrafts(d);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const { job: ingestJob, start: startIngest } = useJobRunner({ kind: "ingest_context", productId, onComplete: load });

  const save = async (type) => {
    setErr(null);
    setSavingType(type);
    try {
      await creativeApi.saveContext(productId, type, drafts[type]);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSavingType(null);
    }
  };
  const ingest = async () => {
    setErr(null);
    try {
      const { jobId } = await creativeApi.runIngest(productId);
      startIngest(jobId);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-5">
        {toolbar}
        <div className="flex items-center gap-3">
          <JobBadge job={ingestJob} />
          <button
            type="button"
            onClick={ingest}
            disabled={!productId || !hasUrl}
            className="cs-primary-button"
            title={hasUrl ? "" : "Add a product URL first"}
          >
            Run Ingestion
          </button>
        </div>
      </div>

      {!productId ? (
        <EmptyState icon={Box} title="No product selected" hint="Select a product above to edit its context." />
      ) : loading ? (
        <ViewLoading label="Loading context…" />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-normal text-neutral-500">{productName} · scrape the URL to auto-fill, or edit each section by hand</p>
            <ErrorBanner message={err} />
          </div>

          <div className="space-y-5">
            {CONTEXT_ORDER.map((type) => {
              const dirty = drafts[type] !== (intel[type]?.contentText || "");
              const isLarge = type === "customer_avatars" || type === "pain_points";
              return (
                <section key={type} className={`cs-context-card ${isLarge ? "cs-context-card--large" : ""}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <h3 className="cs-context-title">{CONTEXT_LABELS[type]}</h3>
                      {intel[type]?.isHumanEdited && (
                        <Badge variant="secondary" className="rounded-full text-[10px]">
                          edited
                        </Badge>
                      )}
                    </div>
                    <button type="button" onClick={() => save(type)} disabled={savingType === type || !dirty} className="cs-context-save">
                      {savingType === type ? "Saving…" : "Save"}
                    </button>
                  </div>
                  <textarea
                    value={drafts[type] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [type]: e.target.value }))}
                    placeholder={`${CONTEXT_LABELS[type]} — bullet points, or Run ingestion to auto-fill`}
                    className={`cs-context-textarea ${isLarge ? "cs-context-textarea--large" : ""}`}
                  />
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
ContextEditor.propTypes = {
  productId: PropTypes.string,
  productName: PropTypes.string,
  hasUrl: PropTypes.bool,
  toolbar: PropTypes.node,
};
