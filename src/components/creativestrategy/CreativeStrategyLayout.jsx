// Creative-strategy module shell. Navigation, global account/product context,
// page headings, and cross-workflow status controls are shared here.
import doodle from "@/assets/doodle.webp";
import rocket from "@/assets/rocket2.webp";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppData } from "@/lib/AppContext";
import { useAuth } from "@/lib/AuthContext";
import { creativeApi } from "@/lib/creativeApi";
import { saveSettings } from "@/lib/saveSettings";
import useGlobalSettings from "@/lib/useGlobalSettings";
import { cn } from "@/lib/utils";
import { BookOpen, Box, CalendarRange, Flame, FlaskConical, Heart, Layers, LogOut, MousePointerClick, PanelLeftClose, PanelLeftOpen, SearchCheck, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Toaster } from "sonner";
import { createPortal } from "react-dom";
import { useBlocker, useNavigate } from "react-router-dom";
import CostTracker from "./CostTracker";
import CreativeStrategyOnboarding from "./CreativeStrategyOnboarding";
import "./creative-strategy.css";
import { JobsProvider } from "./JobsContext";
import JobsIndicator from "./JobsIndicator";
import BrandsView from "./views/BrandsView";
import ComingSoon from "./views/ComingSoon";
import GenerateView from "./views/GenerateView";
import InspirationView from "./views/InspirationView";
import IntelligenceView from "./views/IntelligenceView";
import LibraryView from "./views/LibraryView";
import ProductsView from "./views/ProductsView";
import ResearchView from "./views/ResearchView";
import WeeklyView from "./views/WeeklyView";
import ModelsView from "./views/ModelsView";
import MonthlyReviewView from "./views/MonthlyReviewView";

// Internal cost tracker: shown only to these Facebook user ids (the API enforces the same list).
const COST_TRACKER_UIDS = new Set(["10236978990363167", "10237991305022107"]);

const NAV = [
  { key: "brands", label: "Accounts", icon: Layers },
  { key: "products", label: "Products", icon: Box },
  { key: "intelligence", label: "Insights", icon: Zap },
  { key: "monthly", label: "Monthly Review", icon: CalendarRange },
  { key: "research", label: "Research", icon: SearchCheck },
  { key: "library", label: "Library", icon: BookOpen },
  { key: "generate", label: "Generate", icon: Flame },
  { key: "inspiration", label: "Inspiration", icon: Heart },
  { key: "weekly", label: "Weekly Strategy", icon: MousePointerClick },
  { key: "models", label: "AI Models", icon: FlaskConical },
];

// Where each finished job's results live (job tracker → "View results").
const RESULT_TABS = {
  ingest_context: "products", analyze_ads: "intelligence", trending_creative: "intelligence",
  research: "research", monthly_review: "monthly", generate_library: "library",
  generate_ad: "generate", generate_scripts: "generate", generate_brief: "generate",
  inspo_analyze: "inspiration", weekly_strategy: "weekly", weekly_brief: "weekly",
};
// The Generate sub-tab a generation job's results open in.
const GENERATE_MODES = { generate_ad: "statics", generate_scripts: "scripts", generate_brief: "briefs" };
const resultTabFor = (job) => (job?.only === "winners" ? "monthly" : RESULT_TABS[job?.type || job?.meta?.kind] || null);

const DESCRIPTIONS = {
  models: "Choose your preferred models and compare results on the same input.",
  brands: "View and manage connected Meta ad accounts.",
  products: "Create and manage products for the selected account.",
  intelligence: "What's working in your Meta ads: each top-spending ad is broken down (hook, angle, persona), then reviewed together for patterns. Refreshes every Monday, or click Run Analysis.",
  monthly: "Each month's launched concepts, their winning variants, and what the winners had in common.",
  research: "Run the 7-phase research agent → personas, brand deep dive, language bank.",
  library: "Generate draft hooks, headlines, and primary text from personas and analyzed ads.",
  generate: "Generate static image ads, video scripts, and creative briefs from brand/product context.",
  inspiration: "Upload reference ads (image/video) and mine their structure for on-brand adaptation.",
  weekly: "New ad concepts for this account, built from your latest ad results and research. A fresh set lands every Monday. Approve the ones you like to turn them into briefs.",
};

/** shadcn tooltip to the right of an icon-only sidebar control; plain child otherwise. */
function SidebarTip({ label, show, children }) {
  if (!show) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 shadow-md">{label}</TooltipContent>
    </Tooltip>
  );
}
SidebarTip.propTypes = { label: PropTypes.string.isRequired, show: PropTypes.bool, children: PropTypes.element.isRequired };

export default function CreativeStrategyLayout() {
  const navigate = useNavigate();
  const { isLoggedIn, userId, userName, profilePicUrl, handleLogout } = useAuth();
  const { adAccounts, adAccountsLoading, refetchAdAccounts } = useAppData();
  const {
    loading: globalSettingsLoading,
    hasSeenCreativeStrategyOnboarding,
    setHasSeenCreativeStrategyOnboarding,
    hasSeenCreativeStrategySetupPopup,
    setHasSeenCreativeStrategySetupPopup,
  } = useGlobalSettings();
  // One-time "setup is running in the job tracker" popup after the first product.
  const showSetupPopup = !globalSettingsLoading && !hasSeenCreativeStrategySetupPopup;
  const markSetupPopupSeen = useCallback(() => {
    setHasSeenCreativeStrategySetupPopup(true);
    void saveSettings({ globalSettings: { hasSeenCreativeStrategySetupPopup: true } })
      .then(() => window.dispatchEvent(new Event("globalSettingsUpdated")))
      .catch((err) => console.error("Failed to save Creative Strategy setup popup flag:", err));
  }, [setHasSeenCreativeStrategySetupPopup]);
  // One-time, unskippable walkthrough the first time a user opens Creative Strategy.
  const showOnboarding = !globalSettingsLoading && !hasSeenCreativeStrategyOnboarding;
  const finishOnboarding = useCallback(() => {
    setHasSeenCreativeStrategyOnboarding(true);
    void saveSettings({ globalSettings: { hasSeenCreativeStrategyOnboarding: true } })
      .then(() => window.dispatchEvent(new Event("globalSettingsUpdated")))
      .catch((err) => console.error("Failed to save Creative Strategy onboarding flag:", err));
  }, [setHasSeenCreativeStrategyOnboarding]);

  const [activeTab, setActiveTab] = useState("brands");
  // Icon-only sidebar on wide screens (below lg it's always icon-only).
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("cs-sidebar-collapsed") === "1"; } catch { return false; }
  });
  const toggleCollapsed = () => setCollapsed((current) => {
    try { localStorage.setItem("cs-sidebar-collapsed", current ? "0" : "1"); } catch { /* Keep session state. */ }
    return !current;
  });
  // Below Tailwind's lg breakpoint the sidebar is always icon-only.
  const [narrowScreen, setNarrowScreen] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const update = () => setNarrowScreen(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const compactSidebar = collapsed || narrowScreen;
  // Unsaved edits, by source (e.g. brand guidelines). Leaving the tab, switching
  // account/product, navigating away or closing the page asks first.
  const unsavedRef = useRef(new Map());
  const unsavedMessage = () => [...unsavedRef.current.values()][0] || null;
  const setUnsavedChanges = useCallback((key, message) => {
    if (message) unsavedRef.current.set(key, message); else unsavedRef.current.delete(key);
  }, []);
  const confirmLeave = useCallback(() => {
    const message = [...unsavedRef.current.values()][0];
    return !message || window.confirm(message);
  }, []);
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!unsavedRef.current.size) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);
  const blocker = useBlocker(useCallback(({ currentLocation, nextLocation }) =>
    unsavedRef.current.size > 0 && currentLocation.pathname !== nextLocation.pathname, []));
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm(unsavedMessage() || "Leave without saving your changes?")) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  const switchTab = useCallback((key) => {
    if (key !== activeTab && !confirmLeave()) return;
    setViewIntent(null);
    setActiveTab(key);
  }, [activeTab, confirmLeave]);
  const [creativeClients, setCreativeClients] = useState([]);
  const [creativeClientsLoading, setCreativeClientsLoading] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [error, setError] = useState(null);
  const [productError, setProductError] = useState(null);
  const [headerActionsTarget, setHeaderActionsTarget] = useState(null);
  const [headerStatusTarget, setHeaderStatusTarget] = useState(null);
  const [restoredUser, setRestoredUser] = useState(null);
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const previousBrand = useRef(null);
  const productRequest = useRef(0);
  // A product to select once the newly selected account's products load.
  const pendingProductId = useRef(null);
  // Bumped to remount the active view (e.g. opening a job's results there).
  const [viewNonce, setViewNonce] = useState(0);
  // What the remounted view should open to, e.g. a product's editor.
  const [viewIntent, setViewIntent] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(`cs-navigation:${userId}`) || "{}"); } catch { /* Use defaults. */ }
    setActiveTab(NAV.some((item) => item.key === saved?.tab) ? saved.tab : "brands");
    const brandId = typeof saved?.brandId === "string" ? saved.brandId : null;
    previousBrand.current = brandId;
    setSelectedBrandId(brandId);
    setSelectedProductId(brandId && typeof saved?.productId === "string" ? saved.productId : null);
    setRestoredUser(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId || restoredUser !== userId) return;
    try { localStorage.setItem(`cs-navigation:${userId}`, JSON.stringify({ tab: activeTab, brandId: selectedBrandId, productId: selectedProductId })); } catch { /* Storage may be unavailable. */ }
  }, [userId, restoredUser, activeTab, selectedBrandId, selectedProductId]);

  const normalizeMetaAccountId = (value) => String(value || "").replace(/^act_/, "");
  const accountFingerprint = useMemo(
    () =>
      adAccounts
        .map((account) => normalizeMetaAccountId(account.id))
        .sort()
        .join(","),
    [adAccounts],
  );

  // AppContext is authoritative for which accounts the user may see. Creative
  // Service clients remain the persistence layer and provide the UUID used by
  // products, analysis, research, and generation APIs.
  const brands = useMemo(() => {
    const clientsByMetaAccount = new Map(creativeClients.map((client) => [normalizeMetaAccountId(client.metaAdAccountId), client]));
    return adAccounts
      .map((account) => {
        const client = clientsByMetaAccount.get(normalizeMetaAccountId(account.id));
        if (!client) return null;
        return {
          ...client,
          name: account.name || client.name,
          metaAdAccountId: account.id,
          metaAdAccountName: account.name || client.metaAdAccountName,
        };
      })
      .filter(Boolean);
  }, [adAccounts, creativeClients]);
  const accountsWithProducts = useMemo(
    () => brands.filter((account) => Number(account.productCount) > 0),
    [brands],
  );
  const brandsLoading = adAccountsLoading || creativeClientsLoading;

  const loadBrands = useCallback(
    async (accounts = adAccounts) => {
      setCreativeClientsLoading(true);
      setError(null);
      try {
        if (!accounts.length) {
          setCreativeClients([]);
          setBrandsLoaded(true);
          return [];
        }
        const payload = accounts.map(({ id, name }) => ({ id, name }));
        const response = await creativeApi.syncBrands(payload);
        setCreativeClients(response.clients || []);
        setBrandsLoaded(true);
        return response.clients || [];
      } catch (syncError) {
        setError(`Could not reconcile Meta accounts (${syncError.message}) — showing existing Creative Strategy records`);
        try {
          const response = await creativeApi.listClients();
          setCreativeClients(response.clients || []);
          setBrandsLoaded(true);
          return response.clients || [];
        } catch {
          setCreativeClients([]);
          return [];
        }
      } finally {
        setCreativeClientsLoading(false);
      }
    },
    [adAccounts],
  );

  const refreshBrands = useCallback(async () => {
    const refreshedAccounts = await refetchAdAccounts();
    return loadBrands(refreshedAccounts || []);
  }, [loadBrands, refetchAdAccounts]);
  const loadProducts = (brandId) => {
    const request = ++productRequest.current;
    setProductsLoading(true);
    setProductError(null);
    return creativeApi
      .listProducts(brandId)
      .then((r) => {
        if (request !== productRequest.current) return;
        const next = r.products || [];
        setProducts(next);
        const pending = pendingProductId.current;
        pendingProductId.current = null;
        setSelectedProductId((id) => {
          const wanted = pending ?? id;
          return next.some((product) => product.id === wanted) ? wanted : null;
        });
      })
      .catch((e) => { if (request === productRequest.current) setProductError(e.message); })
      .finally(() => { if (request === productRequest.current) setProductsLoading(false); });
  };

  useEffect(() => {
    if (!isLoggedIn || adAccountsLoading) return;
    loadBrands(adAccounts);
    // accountFingerprint intentionally represents the account list so account
    // object identity changes do not trigger duplicate syncs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, adAccountsLoading, accountFingerprint]);
  useEffect(() => {
    if (!isLoggedIn) navigate("/login", { replace: true });
  }, [isLoggedIn, navigate]);
  useEffect(() => {
    if (brandsLoaded && !brandsLoading && restoredUser === userId && selectedBrandId && !brands.some((brand) => brand.id === selectedBrandId)) {
      setSelectedBrandId(null);
    }
  }, [brands, brandsLoaded, brandsLoading, restoredUser, userId, selectedBrandId]);
  useEffect(() => {
    const allowsEmptyAccount = activeTab === "brands" || activeTab === "products";
    if (brandsLoaded && !brandsLoading && restoredUser === userId && !allowsEmptyAccount && selectedBrandId && !accountsWithProducts.some((account) => account.id === selectedBrandId)) {
      setSelectedBrandId(null);
    }
  }, [accountsWithProducts, brandsLoaded, brandsLoading, restoredUser, userId, activeTab, selectedBrandId]);
  useEffect(() => {
    if (!userId || restoredUser !== userId || !brandsLoaded || brandsLoading) return;
    setProductError(null);
    if (previousBrand.current !== selectedBrandId) setSelectedProductId(null);
    previousBrand.current = selectedBrandId;
    setProducts([]);
    if (selectedBrandId && brands.some((brand) => brand.id === selectedBrandId)) loadProducts(selectedBrandId);
    else { productRequest.current += 1; setProductsLoading(false); setSelectedProductId(null); }
  }, [selectedBrandId, restoredUser, userId, brandsLoaded, brandsLoading, brands]);

  // Job tracker → "View results": open the job's account, product and tab.
  const openJobResult = useCallback((job, tab) => {
    if (!tab || !confirmLeave()) return;
    const brandId = job.meta?.brandId || null;
    const productId = job.meta?.productId || null;
    const mode = GENERATE_MODES[job.type || job.meta?.kind];
    if (mode && userId) {
      try { localStorage.setItem(`cs-generate-mode:${userId}`, mode); } catch { /* Generate keeps its last mode. */ }
    }
    if (brandId && brandId !== selectedBrandId) {
      pendingProductId.current = productId;
      setSelectedBrandId(brandId);
    } else if (productId) {
      setSelectedProductId(productId);
    }
    setActiveTab(tab);
    setViewIntent(tab === "products" && productId ? "edit-product" : null);
    setViewNonce((n) => n + 1);
  }, [confirmLeave, selectedBrandId, userId]);

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) || null;
  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;
  const selectorsDisabled = activeTab === "brands";
  // Products lists every connected account (that's where an account gets its
  // first product); other tabs only list accounts with products.
  const showAllAccounts = activeTab === "products";
  const showProductSelector = activeTab !== "products" && activeTab !== "weekly";
  const selectorBrands = showAllAccounts ? brands : accountsWithProducts;
  const renderHeaderActions = useCallback(
    (actions) => (headerActionsTarget ? createPortal(actions, headerActionsTarget) : null),
    [headerActionsTarget],
  );
  const renderHeaderStatus = useCallback(
    (status) => (headerStatusTarget ? createPortal(status, headerStatusTarget) : null),
    [headerStatusTarget],
  );

  const ctx = {
    userId,
    brands: activeTab === "brands" || activeTab === "products" ? brands : accountsWithProducts,
    brandsLoading,
    selectedBrand,
    selectedBrandId,
    setSelectedBrandId,
    reloadBrands: refreshBrands,
    products,
    productsLoading,
    selectedProduct,
    selectedProductId,
    setSelectedProductId,
    reloadProducts: () => loadProducts(selectedBrandId),
    goTo: switchTab,
    viewIntent,
    showSetupPopup,
    markSetupPopupSeen,
    confirmLeave,
    setUnsavedChanges,
    renderHeaderActions,
    renderHeaderStatus,
  };

  if (!isLoggedIn) return null;

  const renderView = () => {
    switch (activeTab) {
      case "brands":
        return <BrandsView ctx={ctx} />;
      case "products":
        return <ProductsView ctx={ctx} />;
      case "intelligence":
        return <IntelligenceView ctx={ctx} />;
      case "monthly":
        return <MonthlyReviewView ctx={ctx} />;
      case "research":
        return <ResearchView ctx={ctx} />;
      case "library":
        return <LibraryView ctx={ctx} />;
      case "generate":
        return <GenerateView ctx={ctx} />;
      case "inspiration":
        return <InspirationView ctx={ctx} />;
      case "weekly":
        return <WeeklyView key={selectedBrandId || "no-account"} ctx={ctx} />;
      case "models":
        return <ModelsView ctx={ctx} />;
      default: {
        const item = NAV.find((n) => n.key === activeTab);
        return <ComingSoon label={item?.label} phase={item?.phase} />;
      }
    }
  };

  const active = NAV.find((n) => n.key === activeTab);

  return (
    <JobsProvider key={userId} userId={userId}>
      <Toaster richColors position="bottom-left" closeButton />
      <div className="creative-strategy flex min-h-screen">
        {showOnboarding && <CreativeStrategyOnboarding onFinish={finishOnboarding} />}
        {/* Sidebar. Its top padding matches <main>'s py-6 so the launcher button's
            top lines up with the account/product row. Icon-only ("compact") when
            collapsed or below lg; then every control is the same square. */}
        <aside className={cn("relative z-10 flex h-screen w-[290px] flex-col overflow-hidden px-4 py-6 transition-[width] duration-200 max-lg:w-[80px] max-lg:min-w-[80px] max-lg:px-2", collapsed && "w-[80px] min-w-[80px] px-2")}>
          <img
            src={doodle}
            alt=""
            aria-hidden="true"
            className={cn("pointer-events-none absolute -left-[205px] -bottom-[38px] z-0 w-[720px] max-w-none origin-bottom-left rotate-[8deg] opacity-95 max-lg:hidden", collapsed && "hidden")}
          />
          <TooltipProvider delayDuration={100}>
          <div className={cn("relative z-10 flex h-full flex-col rounded-3xl", compactSidebar ? "items-center px-0 pb-4" : "px-4 pb-4")}>
            <div className={cn("flex flex-1 flex-col", compactSidebar && "items-center")}>
              <SidebarTip label="Back to launcher" show={compactSidebar}>
                <Button
                  onClick={() => navigate("/")}
                  aria-label="Back to launcher"
                  className={cn(
                    "mb-4 flex items-center gap-1 border border-neutral-200 bg-white font-medium text-neutral-700 shadow-xs hover:bg-white hover:shadow-sm",
                    compactSidebar ? "cs-sidebar-square h-11 w-11 justify-center rounded-[14px] p-0" : "w-full justify-start rounded-[20px] py-7 pl-3",
                  )}
                  variant="ghost"
                >
                  <img src={rocket} alt="" className={cn("object-contain", compactSidebar ? "h-6 w-6" : "h-8 w-8")} />
                  {!compactSidebar && <>
                    <div className="mr-2 h-6 w-px bg-neutral-300" />
                    <span className="font-semibold text-neutral-700">Back To Launcher</span>
                  </>}
                </Button>
              </SidebarTip>

              <nav className={cn("space-y-2", compactSidebar && "flex flex-col items-center")}>
                {NAV.map(({ key, label, icon: Icon }) => {
                  // The selected product's research is past its refresh age.
                  const stale = key === "research" && Boolean(selectedProduct?.researchStale);
                  return (
                  <SidebarTip key={key} label={stale ? `${label} (out of date, re-run it)` : label} show={compactSidebar}>
                  <button
                    data-cs-nav={key}
                    onClick={() => switchTab(key)}
                    aria-label={compactSidebar ? label : undefined}
                    title={!compactSidebar && stale ? "Research is out of date. Open Research to re-run it." : undefined}
                    className={cn(
                      "relative flex items-center gap-2 transition-all",
                      compactSidebar ? "cs-sidebar-square justify-center" : "h-10 w-full justify-start rounded-2xl px-4 py-2",
                      activeTab === key
                        ? "border border-gray-300 bg-white font-semibold text-neutral-900 shadow"
                        : "border border-transparent text-neutral-700 hover:bg-neutral-200",
                    )}
                  >
                    <span className="relative flex-shrink-0">
                      <Icon className="h-5 w-5 text-neutral-700 transition-all" />
                      {stale && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" aria-hidden="true" />}
                    </span>
                    {!compactSidebar && <span className="text-sm font-medium">
                      {label}
                      {stale && <span className="text-red-600"> (stale)</span>}
                    </span>}
                    {!compactSidebar && activeTab === key && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neutral-500" aria-hidden="true" />}
                  </button>
                  </SidebarTip>
                  );
                })}
              </nav>
            </div>

            {/* Footer: collapse toggle (wide screens only), then profile / logout. */}
            <div className={cn("relative z-10 mt-auto space-y-3 pt-4", compactSidebar && "flex flex-col items-center")}>
              {!narrowScreen && (
                <SidebarTip label={collapsed ? "Expand sidebar" : "Collapse sidebar"} show>
                  <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="cs-sidebar-square cs-sidebar-collapse">
                    {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                  </button>
                </SidebarTip>
              )}
              {compactSidebar ? (
                <SidebarTip label="Log out" show>
                  <button type="button" onClick={handleLogout} aria-label="Log out" className="cs-sidebar-square cs-sidebar-profile justify-center border bg-neutral-50">
                    <LogOut className="h-5 w-5 text-neutral-700" />
                  </button>
                </SidebarTip>
              ) : (
                <div className="cs-sidebar-profile flex w-full items-center rounded-[20px] border bg-neutral-50 py-2 pl-3 pr-3">
                  <div className="flex flex-grow items-center gap-2">
                    <img src={profilePicUrl || "/placeholder.svg"} alt="Profile" className="h-8 w-8 rounded-full object-cover" />
                    <span className="max-w-[120px] truncate text-sm font-medium text-neutral-800">{userName}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-6 w-px bg-neutral-300" />
                    <button onClick={handleLogout} className="ml-3 rounded-full transition" title="Logout">
                      <LogOut className="h-4 w-4 text-neutral-700" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </TooltipProvider>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 py-6 pr-6">
          <div className="flex h-[calc(100vh-3rem)] min-h-0 flex-col gap-4">
            <div className="cs-global-selector-card">
              <div className="cs-global-selector-card__selectors">
                <Select
                  value={selectedBrandId || ""}
                  onValueChange={(value) => { if (confirmLeave()) setSelectedBrandId(value || null); }}
                  disabled={selectorsDisabled}
                >
                  <SelectTrigger className="cs-pill-control w-[230px] px-4">
                    <SelectValue placeholder={brandsLoading ? "Loading Accounts…" : "Select Account"} />
                  </SelectTrigger>
                  <SelectContent className="cs-select-content bg-white">
                    {!showAllAccounts && <p className="px-3 py-2 text-xs text-neutral-500">Only accounts with active products show up here.</p>}
                    {selectorBrands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showProductSelector && (
                  <Select
                    value={selectedProductId || ""}
                    onValueChange={(value) => { if (confirmLeave()) setSelectedProductId(value || null); }}
                    disabled={selectorsDisabled || !selectedBrandId || productsLoading}
                  >
                    <SelectTrigger className="cs-pill-control w-[230px] px-4">
                      <SelectValue placeholder={productsLoading ? "Loading Products…" : "Select Product"} />
                    </SelectTrigger>
                    <SelectContent className="cs-select-content bg-white">
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="cs-global-selector-card__status">
                <JobsIndicator resultTabFor={resultTabFor} onOpenResult={openJobResult} />
                {COST_TRACKER_UIDS.has(String(userId)) && <CostTracker clientId={selectedBrandId} />}
              </div>
            </div>

            <div className="cs-main-surface flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="cs-page-header flex items-center justify-between gap-6 px-12 pb-3 pt-6 max-lg:px-7 max-md:flex-wrap max-md:px-5 max-md:pb-3 max-md:pt-5">
              <div className="min-w-0">
                <h1 className="text-[28px] font-bold leading-none tracking-[-0.035em] max-md:text-2xl">{active?.label}</h1>
                {DESCRIPTIONS[activeTab] && (
                  <p className="mt-1.5 max-w-[820px] text-[14px] font-normal leading-snug text-[var(--cs-muted)]">{DESCRIPTIONS[activeTab]}</p>
                )}
                <div ref={setHeaderStatusTarget} />
              </div>
              <div ref={setHeaderActionsTarget} className="flex shrink-0 flex-wrap items-center justify-end gap-3" />
            </header>

            <ScrollArea key={`${activeTab}:${viewNonce}`} className="min-h-0 flex-1" viewportClassName={activeTab === "generate" ? "cs-main-viewport h-full" : "h-full [&>div]:!block"}>
              <div
                className={cn(
                  "w-full px-12 pb-12 pt-3 max-lg:px-7 max-lg:pb-7 max-lg:pt-3 max-md:px-5 max-md:pb-5 max-md:pt-3",
                  activeTab === "generate" && "flex h-full min-h-0 flex-col pb-6 max-lg:pb-5",
                )}
              >
                {(error || productError) && <div className="mb-4 text-sm text-red-600">{error || productError}</div>}
                {renderView()}
              </div>
            </ScrollArea>
            </div>
          </div>
        </main>
      </div>
    </JobsProvider>
  );
}
