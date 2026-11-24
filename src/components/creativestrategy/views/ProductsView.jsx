// Products under the selected brand: a card grid + a create-product dialog,
// plus a single product editor containing context and brand guidelines. Meta
// ad account is inherited from the brand.
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { creativeApi } from "@/lib/creativeApi";
import RunModelControls from "../RunModelControls";
import { useRunModels } from "../useRunModels";
import { RUN_OPERATIONS } from "../run-model-operations";
import { ArrowLeft, Box, Brain, Check, ChevronDown, ExternalLink, History, Image as ImageIcon, Loader2, Pencil, Plus, Route, Star, Trash2 } from "lucide-react";
import PropTypes from "prop-types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useJobRunner, useJobs } from "../JobsContext";
import ProductUrlField, { isValidProductUrl, normalizeProductUrl } from "../ProductUrlField";
import { EmptyState, ErrorBanner, ViewLoading } from "../ui";
import BrandingEditor from "./BrandingEditor";
import RunBy from "../run-by";

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
    selectedBrandId,
    selectedProduct,
    products,
    productsLoading,
    selectedProductId,
    setSelectedProductId,
    reloadBrands,
    reloadProducts,
    goTo,
    renderHeaderActions,
  } = ctx;
  const [formBrandId, setFormBrandId] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountQuery, setAccountQuery] = useState("");
  const createBrandId = selectedBrandId || formBrandId;
  const createBrand = ctx.brands.find((brand) => brand.id === createBrandId);
  const models = useRunModels(createBrandId);
  const [tab, setTab] = useState("products");
  // Job tracker → "View results" for website reading opens the product editor
  // (once its product is selected, which can lag an account switch).
  const openEditor = useRef(ctx.viewIntent === "edit-product");
  useEffect(() => {
    if (openEditor.current && selectedProductId) { openEditor.current = false; setTab("context"); }
  }, [selectedProductId]);
  const [form, setForm] = useState({ name: "", url: "", productType: "physical" });
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  // Set once a product is created: the dialog then explains where setup runs.
  const [created, setCreated] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { track, refreshHistory } = useJobs();
  const urlValid = isValidProductUrl(form.url);

  const add = async (e) => {
    e.preventDefault();
    if (!createBrand || !form.name.trim() || !urlValid) return;
    setErr(null);
    setCreating(true);
    // The setup popup is a one-time explainer for the user's very first product
    // (flag in global settings, see useGlobalSettings).
    const firstProduct = ctx.showSetupPopup && !ctx.brands.some((brand) => Number(brand.productCount) > 0);
    try {
      const response = await creativeApi.createProduct({
        ...form, name: form.name.trim(), url: normalizeProductUrl(form.url),
        clientId: createBrandId, aiSelections: models.forRun(RUN_OPERATIONS.setup),
      });
      models.reset(RUN_OPERATIONS.setup);
      if (response.product?.id) {
        setSelectedProductId(response.product.id);
        if (response.cascade?.jobId) {
          track(response.cascade.jobId, {
            kind: response.cascade.root || "ingest_context",
            brandId: createBrandId,
            productId: response.product.id,
          });
        }
      }
      const started = Boolean(response.cascade?.jobId);
      // Explain where setup runs the first time; always say so if it couldn't start.
      if ((firstProduct && started) || !started) {
        setCreated({ name: response.product?.name || form.name.trim(), started });
        if (started) ctx.markSetupPopupSeen?.();
      } else {
        setAdding(false);
      }
      // Point at the job tracker in the top bar, where setup now runs.
      window.dispatchEvent(new CustomEvent("cs-jobs-attention"));
      setForm({ name: "", url: "", productType: "physical" });
      await reloadBrands();
      if (selectedBrandId === createBrandId) await reloadProducts();
      else ctx.setSelectedBrandId(createBrandId);
    } catch (e) {
      setErr(e.message);
    } finally {
      setCreating(false);
    }
  };
  const removeProduct = async () => {
    if (!selectedProductId) return;
    setErr(null);
    setDeleting(true);
    try {
      await creativeApi.deleteProduct(selectedProductId);
      setConfirmDelete(false);
      ctx.setUnsavedChanges?.("product-context", null);
      ctx.setUnsavedChanges?.("brand-guidelines", null);
      setSelectedProductId(null);
      setTab("products");
      refreshHistory();
      await reloadBrands();
      await reloadProducts();
    } catch (e) {
      setErr(e.message);
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
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
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US");
  };

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-7">
      {tab === "products" && (
        renderHeaderActions(
          <Dialog open={adding} onOpenChange={(open) => { setAdding(open); setFormBrandId(null); setAccountQuery(""); setAccountOpen(false); setErr(null); if (!open) setCreated(null); }}>
            <DialogTrigger asChild>
              <button className="cs-primary-button">
                <Plus className="h-5 w-5" /> Add New Product
              </button>
            </DialogTrigger>
            <DialogContent
              disableSlide
              overlayClassName="bg-black/45 backdrop-blur-[1px]"
              className="cs-modal data-[state=open]:duration-150 data-[state=closed]:duration-100 sm:rounded-[32px]"
            >
              {created ? (
                <>
                  <DialogHeader className="items-center text-center">
                    <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-6 w-6" /></span>
                    <DialogTitle className="text-2xl font-bold tracking-tight">{created.name} is set up</DialogTitle>
                    <DialogDescription className="max-w-sm text-center text-sm text-neutral-500">
                      {created.started
                        ? "We're now reading the product page, analyzing your ads, running research, and writing your copy library and first weekly strategy. It all runs on its own and takes about 10–15 minutes, so you can leave this page."
                        : "The product was created, but its automatic setup couldn't start. Run each step from its tab when you're ready."}
                    </DialogDescription>
                  </DialogHeader>
                  {created.started && (
                    <div className="cs-setup-tracker-note">
                      <History className="h-5 w-5 shrink-0 text-[#854413]" />
                      <p>
                        <strong>Follow along in the job tracker at the top right.</strong> Every step shows up there as it runs. When a step finishes, click <strong>View results</strong> on it to jump straight to what it made.
                      </p>
                    </div>
                  )}
                  <DialogFooter>
                    <button type="button" onClick={() => setAdding(false)} className="cs-primary-button cs-modal-submit w-full">Got it</button>
                  </DialogFooter>
                </>
              ) : <>
              <DialogHeader className="items-center text-center">
                <DialogTitle className="text-2xl font-bold tracking-tight">Add a new product</DialogTitle>
                <DialogDescription className="max-w-sm text-center text-sm text-neutral-500">
                  Add the product details and we’ll use them to build its research, insights, and creative strategy.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={add} className="mt-3 space-y-4">
                {!selectedBrandId && <div className="space-y-2">
                  <p className="text-sm font-medium text-neutral-700">Select an account first</p>
                  <Popover open={accountOpen} onOpenChange={setAccountOpen}>
                    <PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={accountOpen} disabled={creating || ctx.brandsLoading} className="w-full justify-between rounded-2xl border-gray-300 bg-white shadow hover:bg-white">
                      <span className="truncate font-normal">{createBrand?.name || (ctx.brandsLoading ? "Loading accounts…" : "Select account")}</span><ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button></PopoverTrigger>
                    <PopoverContent align="start" className="z-[60] w-[var(--radix-popover-trigger-width)] rounded-2xl bg-white p-0 shadow-lg">
                      <Command shouldFilter={false} className="rounded-2xl">
                        <CommandInput wrapperClassName="border-gray-200 bg-gray-50" placeholder="Search accounts…" value={accountQuery} onValueChange={setAccountQuery} />
                        <CommandList className="p-1"><CommandEmpty>No accounts found.</CommandEmpty>
                          {ctx.brands.filter((brand) => `${brand.name} ${brand.metaAdAccountId}`.toLowerCase().includes(accountQuery.trim().toLowerCase())).map((brand) => <CommandItem key={brand.id} value={brand.id} onSelect={() => { setFormBrandId(brand.id); setAccountOpen(false); setAccountQuery(""); }} className="m-1 cursor-pointer rounded-xl px-3 py-2 data-[selected=true]:bg-gray-100">
                            <span className="min-w-0 flex-1 truncate">{brand.name}</span>{createBrandId === brand.id && <Check className="h-4 w-4 text-blue-500" />}
                          </CommandItem>)}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>}
                {createBrand && <>
                <Input
                  aria-label="Product name"
                  placeholder="Product name"
                  value={form.name}
                  onChange={set("name")}
                  className="cs-modal-input"
                  autoFocus
                />
                <ProductUrlField
                  value={form.url}
                  onChange={(url) => setForm((f) => ({ ...f, url }))}
                  adAccountId={createBrand.metaAdAccountId}
                  disabled={creating}
                />
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
                <RunModelControls models={models} operations={RUN_OPERATIONS.setup} title="Models for this product setup" disabled={creating} />
                <ErrorBanner message={err} />
                <DialogFooter>
                  <button type="submit" disabled={!form.name.trim() || !urlValid || creating} className="cs-primary-button cs-modal-submit w-full">
                    {creating ? "Creating & starting setup…" : "Create Product & Start Setup"}
                  </button>
                </DialogFooter>
                </>}
              </form>
              </>}
            </DialogContent>
          </Dialog>
        )
      )}

      <TabsList className="sr-only">
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="context">Context</TabsTrigger>
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
                      <Brain className="h-5 w-5" /> View Insights
                    </button>
                    <button type="button" onClick={() => selectAndGo(p.id, "weekly")} className="cs-product-action">
                      <Route className="h-5 w-5" /> Weekly Strategy
                    </button>
                    <button type="button" onClick={() => selectAndGo(p.id, "generate")} className="cs-product-action">
                      <ImageIcon className="h-5 w-5" /> Generate Static Ads
                    </button>
                    <p className="px-2 pt-1 text-xs font-medium text-neutral-600">Created at: {formatDate(p.createdAt || p.created_at)}{" "}<RunBy uid={p.createdBy || p.created_by || null} /></p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="context" className="mt-0">
        <ProductEditorNav onBack={() => { if (!ctx.confirmLeave || ctx.confirmLeave()) setTab("products"); }} />
        {!adding && <div className="mb-4 empty:hidden"><ErrorBanner message={err} /></div>}
        <ContextEditor
          productId={selectedProductId}
          productName={selectedProduct?.name}
          productUrl={selectedProduct?.url}
          renderHeaderActions={renderHeaderActions}
          setUnsavedChanges={ctx.setUnsavedChanges}
          onDelete={() => setConfirmDelete(true)}
        />
        <Dialog open={confirmDelete} onOpenChange={(open) => { if (!deleting) setConfirmDelete(open); }}>
          <DialogContent disableSlide overlayClassName="bg-black/45 backdrop-blur-[1px]" className="cs-modal sm:rounded-[32px]">
            <DialogHeader className="items-center text-center">
              <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><Trash2 className="h-5 w-5" /></span>
              <DialogTitle className="text-2xl font-bold tracking-tight">Delete {selectedProduct?.name || "this product"}?</DialogTitle>
              <DialogDescription className="max-w-sm text-center text-sm text-neutral-500">
                It disappears from every tab and stops getting weekly updates. Any of its jobs that are still running or waiting are cancelled. Your account&apos;s analyzed ads stay, since other products share them.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-2 gap-2 sm:flex-col sm:space-x-0">
              <button type="button" onClick={removeProduct} disabled={deleting} className="cs-primary-button cs-modal-submit cs-danger-solid w-full">
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}{deleting ? "Deleting…" : "Delete product"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="cs-onboarding__back w-full">Keep it</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="mt-7">
          <BrandingEditor clientId={selectedBrandId} productId={selectedProductId} productName={selectedProduct?.name} setUnsavedChanges={ctx.setUnsavedChanges} />
        </div>
      </TabsContent>
    </Tabs>
  );
}

ProductsView.propTypes = { ctx: PropTypes.object.isRequired };

function ProductEditorNav({ onBack }) {
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-transparent px-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-200"
      >
        <ArrowLeft className="h-4 w-4" /> Back to all products
      </button>
    </div>
  );
}
ProductEditorNav.propTypes = { onBack: PropTypes.func.isRequired };

// Context editor — per-category manual intel + "Run ingestion" (scrape the
// product URL to auto-fill).
function ContextEditor({ productId, productName, productUrl, renderHeaderActions, setUnsavedChanges, onDelete }) {
  const models = useRunModels(productId);
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
  const anyDirty = CONTEXT_ORDER.some((t) => (drafts[t] ?? "") !== (intel[t]?.contentText || ""));
  useEffect(() => {
    setUnsavedChanges?.("product-context", anyDirty ? "You have unsaved product context edits. Leave without saving?" : null);
  }, [anyDirty, setUnsavedChanges]);
  useEffect(() => () => setUnsavedChanges?.("product-context", null), [setUnsavedChanges]);

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
      const { jobId } = await creativeApi.runIngest(productId, models.forRun(RUN_OPERATIONS.ingestion));
      startIngest(jobId);
      models.reset(RUN_OPERATIONS.ingestion);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {renderHeaderActions(
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={ingest}
            disabled={!productId || !productUrl}
            className="cs-primary-button"
            title={productUrl ? "" : "Add a product URL first"}
          >
            Run Ingestion
          </button>
          {productId && (
            <button type="button" onClick={onDelete} className="cs-danger-button" title="Delete this product">
              <Trash2 className="h-4 w-4" /> Delete Product
            </button>
          )}
        </div>
      )}

      {productId && <RunModelControls models={models} operations={RUN_OPERATIONS.ingestion} disabled={["queued", "running"].includes(ingestJob?.status)} />}
      {!productId ? (
        <EmptyState icon={Box} title="No product selected" hint="Select a product above to edit its context." />
      ) : loading ? (
        <ViewLoading label="Loading context…" />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-normal text-neutral-500">{productName} · scrape the URL to auto-fill, or edit each section by hand</p>
              {productUrl && (
                <a href={productUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-xs font-medium text-[#6c3403] underline decoration-[#6c3403]/25 underline-offset-4 hover:decoration-[#6c3403]">
                  <span className="truncate">{productUrl}</span><ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
            </div>
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
  productUrl: PropTypes.string,
  renderHeaderActions: PropTypes.func.isRequired,
  setUnsavedChanges: PropTypes.func,
  onDelete: PropTypes.func,
};
