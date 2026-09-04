// Creative-strategy module shell. Navigation, global account/product context,
// page headings, and cross-workflow status controls are shared here.
import doodle from "@/assets/doodle.webp";
import rocket from "@/assets/rocket2.webp";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppData } from "@/lib/AppContext";
import { useAuth } from "@/lib/AuthContext";
import { creativeApi } from "@/lib/creativeApi";
import { cn } from "@/lib/utils";
import { BookOpen, Box, Flame, Heart, Layers, LogOut, MousePointerClick, SearchCheck, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import CostTracker from "./CostTracker";
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

const NAV = [
  { key: "brands", label: "Accounts", icon: Layers },
  { key: "products", label: "Products", icon: Box },
  { key: "intelligence", label: "Insights", icon: Zap },
  { key: "library", label: "Library", icon: BookOpen },
  { key: "generate", label: "Generate", icon: Flame },
  { key: "inspiration", label: "Inspiration", icon: Heart },
  { key: "weekly", label: "Weekly Strategy", icon: MousePointerClick },
  { key: "research", label: "Research", icon: SearchCheck },
];

const DESCRIPTIONS = {
  brands: "View and manage connected Meta ad accounts.",
  products: "Create and manage products for the selected account.",
  intelligence: "Run Meta ad analysis and review analyzed creatives + the strategy audit.",
  research: "Run the 7-phase research agent → personas, brand deep dive, language bank.",
  library: "Generate draft hooks, headlines, and primary text per persona.",
  generate: "Generate static image ads from a creative format + brand/product context.",
  inspiration: "Upload reference ads (image/video) and mine their structure for on-brand adaptation.",
  weekly: "Run the weekly creative strategist → tiered concept cards. Approve ideas to brief.",
};

export default function CreativeStrategyLayout() {
  const navigate = useNavigate();
  const { isLoggedIn, userName, profilePicUrl, handleLogout } = useAuth();
  const { adAccounts, adAccountsLoading, refetchAdAccounts } = useAppData();

  const [activeTab, setActiveTab] = useState("brands");
  const [creativeClients, setCreativeClients] = useState([]);
  const [creativeClientsLoading, setCreativeClientsLoading] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [error, setError] = useState(null);
  const [headerActionsTarget, setHeaderActionsTarget] = useState(null);

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
          return [];
        }
        const payload = accounts.map(({ id, name }) => ({ id, name }));
        const response = await creativeApi.syncBrands(payload);
        setCreativeClients(response.clients || []);
        return response.clients || [];
      } catch (syncError) {
        setError(`Could not reconcile Meta accounts (${syncError.message}) — showing existing Creative Strategy records`);
        try {
          const response = await creativeApi.listClients();
          setCreativeClients(response.clients || []);
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
    setProductsLoading(true);
    return creativeApi
      .listProducts(brandId)
      .then((r) => setProducts(r.products))
      .catch((e) => setError(e.message))
      .finally(() => setProductsLoading(false));
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
    if (selectedBrandId && !brands.some((brand) => brand.id === selectedBrandId)) {
      setSelectedBrandId(null);
    }
  }, [brands, selectedBrandId]);
  useEffect(() => {
    const allowsEmptyAccount = activeTab === "brands" || activeTab === "products";
    if (!allowsEmptyAccount && selectedBrandId && !accountsWithProducts.some((account) => account.id === selectedBrandId)) {
      setSelectedBrandId(null);
    }
  }, [accountsWithProducts, activeTab, selectedBrandId]);
  useEffect(() => {
    if (selectedBrandId) loadProducts(selectedBrandId);
    else setProducts([]);
    setSelectedProductId(null);
  }, [selectedBrandId]);

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) || null;
  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;
  const selectorBrands = activeTab === "brands" || activeTab === "products" ? brands : accountsWithProducts;
  const renderHeaderActions = useCallback(
    (actions) => (headerActionsTarget ? createPortal(actions, headerActionsTarget) : null),
    [headerActionsTarget],
  );

  const ctx = {
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
    goTo: setActiveTab,
    renderHeaderActions,
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
      case "research":
        return <ResearchView ctx={ctx} />;
      case "library":
        return <LibraryView ctx={ctx} />;
      case "generate":
        return <GenerateView ctx={ctx} />;
      case "inspiration":
        return <InspirationView ctx={ctx} />;
      case "weekly":
        return <WeeklyView ctx={ctx} />;
      default: {
        const item = NAV.find((n) => n.key === activeTab);
        return <ComingSoon label={item?.label} phase={item?.phase} />;
      }
    }
  };

  const active = NAV.find((n) => n.key === activeTab);

  return (
    <JobsProvider>
      <div className="creative-strategy flex min-h-screen">
        {/* Sidebar */}
        <aside className="relative z-10 flex h-screen w-[290px] flex-col overflow-hidden px-4 py-6 max-lg:w-[80px] max-lg:min-w-[80px] max-lg:px-2">
          <img
            src={doodle}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -left-[205px] -bottom-[38px] z-0 w-[720px] max-w-none origin-bottom-left rotate-[8deg] opacity-95 max-lg:hidden"
          />
          <div className="relative z-10 flex h-full flex-col rounded-3xl p-4">
            <div className="flex flex-1 flex-col">
              <Button
                onClick={() => navigate("/")}
                className="flex items-center pl-3 justify-start gap-1 bg-white hover:bg-white border border-neutral-200 shadow-xs hover:shadow-sm rounded-[20px] py-7 font-medium w-full mb-4 text-neutral-700"
                variant="ghost"
              >
                <img src={rocket} alt="Home" className="w-8 h-8 object-contain" />
                <div className="h-6 w-px bg-neutral-300 mr-2 max-lg:hidden" />
                <span className="text-neutral-700 font-semibold max-lg:hidden">Back To Launcher</span>
              </Button>

              <nav className="space-y-2">
                {NAV.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      "relative flex h-10 w-full items-center justify-start gap-2 rounded-2xl px-4 py-2 transition-all max-lg:justify-center max-lg:px-2",
                      activeTab === key
                        ? "border border-gray-300 bg-white font-semibold text-neutral-900 shadow"
                        : "border border-transparent text-neutral-700 hover:bg-neutral-200",
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0 text-neutral-700 transition-all max-lg:h-6 max-lg:w-6" />
                    <span className="text-sm font-medium max-lg:hidden">{label}</span>
                    {activeTab === key && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neutral-500 max-lg:hidden" aria-hidden="true" />}
                  </button>
                ))}
              </nav>
            </div>

            {/* Footer profile */}
            <div className="relative z-10 mt-auto pt-4">
              <div className="flex w-full items-center rounded-[20px] border border-neutral-200 bg-neutral-50 py-2 pl-3 pr-3 shadow-xs max-lg:justify-center max-lg:p-2">
                <div className="flex items-center gap-2 flex-grow max-lg:hidden">
                  <img src={profilePicUrl || "/placeholder.svg"} alt="Profile" className="h-8 w-8 rounded-full object-cover" />
                  <span className="max-w-[120px] truncate text-sm font-medium text-neutral-800">{userName}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-6 w-px bg-neutral-300 max-lg:hidden" />
                  <button onClick={handleLogout} className="ml-3 rounded-full transition max-lg:ml-0" title="Logout">
                    <LogOut className="h-4 w-4 text-neutral-700 max-lg:h-5 max-lg:w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 py-6 pr-6">
          <div className="flex h-[calc(100vh-3rem)] min-h-0 flex-col gap-4">
            <div className="cs-global-selector-card">
              <div className="cs-global-selector-card__selectors">
                <Select value={selectedBrandId || ""} onValueChange={(value) => setSelectedBrandId(value || null)}>
                  <SelectTrigger className="cs-pill-control w-[230px] px-4">
                    <SelectValue placeholder={brandsLoading ? "Loading Accounts…" : "Select Account"} />
                  </SelectTrigger>
                  <SelectContent className="cs-select-content bg-white">
                    {selectorBrands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedProductId || ""}
                  onValueChange={(value) => setSelectedProductId(value || null)}
                  disabled={!selectedBrandId || productsLoading}
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
              </div>
              <div className="cs-global-selector-card__status">
                <JobsIndicator />
                <CostTracker clientId={selectedBrandId} />
              </div>
            </div>

            <div className="cs-main-surface flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="cs-page-header flex items-center justify-between gap-6 px-12 pb-5 pt-6 max-lg:px-7 max-md:flex-wrap max-md:px-5 max-md:py-5">
              <div className="min-w-0">
                <h1 className="text-[28px] font-bold leading-none tracking-[-0.035em] max-md:text-2xl">{active?.label}</h1>
                {DESCRIPTIONS[activeTab] && (
                  <p className="mt-1.5 truncate text-[14px] font-normal text-[var(--cs-muted)]">{DESCRIPTIONS[activeTab]}</p>
                )}
              </div>
              <div ref={setHeaderActionsTarget} className="flex shrink-0 flex-wrap items-center justify-end gap-3" />
            </header>

            <div className="flex-1 overflow-auto">
              <div
                className={cn(
                  "w-full px-12 pb-12 pt-6 max-lg:px-7 max-lg:pb-7 max-lg:pt-5 max-md:p-5",
                  activeTab === "generate" && "flex min-h-full flex-col pb-6 max-lg:pb-5",
                )}
              >
                {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
                {renderView()}
              </div>
            </div>
            </div>
          </div>
        </main>
      </div>
    </JobsProvider>
  );
}
