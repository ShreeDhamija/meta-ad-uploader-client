// Creative-strategy module shell. The page header and sidebar are shared;
// brand/product context controls move into each workflow so the first screen
// of every tab can follow its own hierarchy without losing shared state.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AudioLines,
  Layers,
  Box,
  Zap,
  BookOpen,
  Flame,
  Heart,
  MousePointerClick,
  SearchCheck,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useAppData } from "@/lib/AppContext";
import { creativeApi } from "@/lib/creativeApi";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import CostTracker from "./CostTracker";
import { JobsProvider } from "./JobsContext";
import JobsIndicator from "./JobsIndicator";
import OverviewView from "./views/OverviewView";
import BrandsView from "./views/BrandsView";
import ProductsView from "./views/ProductsView";
import IntelligenceView from "./views/IntelligenceView";
import ResearchView from "./views/ResearchView";
import LibraryView from "./views/LibraryView";
import GenerateView from "./views/GenerateView";
import InspirationView from "./views/InspirationView";
import WeeklyView from "./views/WeeklyView";
import ComingSoon from "./views/ComingSoon";
import doodle from "@/assets/doodle.webp";
import rocket from "@/assets/rocket2.webp";
import "./creative-strategy.css";

const NAV = [
  { key: "overview", label: "Overview", icon: AudioLines, phase: "later" },
  { key: "brands", label: "Brands", icon: Layers },
  { key: "products", label: "Products", icon: Box },
  { key: "intelligence", label: "Intelligence", icon: Zap },
  { key: "library", label: "Library", icon: BookOpen },
  { key: "generate", label: "Generate", icon: Flame },
  { key: "inspiration", label: "Inspiration", icon: Heart },
  { key: "weekly", label: "Weekly Strategy", icon: MousePointerClick },
  { key: "research", label: "Research", icon: SearchCheck },
];

const DESCRIPTIONS = {
  overview: "Snapshot of the selected brand and product.",
  brands: "Create and manage Brands (Each brand maps to 1 Meta Ad Account)",
  products: "Create and manage Products for the selected Brand",
  intelligence: "Run Meta ad analysis and review analyzed creatives + the strategy audit.",
  research: "Run the 7-phase research agent → personas, brand deep dive, language bank.",
  library: "Generate draft hooks, headlines, and primary text per persona.",
  generate: "Generate static image ads from a creative format + brand/product context.",
  inspiration: "Upload reference ads (image/video) and mine their structure for on-brand adaptation.",
  weekly: "Run the weekly creative strategist → tiered concept cards. Approve ideas to brief.",
};

export default function CreativeStrategyLayout() {
  const navigate = useNavigate();
  const { userName, profilePicUrl, handleLogout } = useAuth();
  const { adAccounts, adAccountsLoading, refetchAdAccounts } = useAppData();
  const mirroredAccountsRef = useRef("");

  const [activeTab, setActiveTab] = useState("brands");
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [error, setError] = useState(null);

  // Auto-create/refresh brands from the user's linked Meta ad accounts on load.
  // Falls back to listing existing brands if the Meta sync fails (e.g. no token).
  const loadBrands = useCallback(() => {
    setBrandsLoading(true);
    refetchAdAccounts().catch(() => {});
    return creativeApi.syncBrands()
      .then((r) => setBrands(r.clients))
      .catch((e) => {
        setError(`Meta sync failed (${e.message}) — showing existing brands`);
        return creativeApi.listClients().then((r) => setBrands(r.clients)).catch(() => {});
      })
      .finally(() => setBrandsLoading(false));
  }, [refetchAdAccounts]);
  const loadProducts = (brandId) => {
    setProductsLoading(true);
    return creativeApi.listProducts(brandId)
      .then((r) => setProducts(r.products))
      .catch((e) => setError(e.message))
      .finally(() => setProductsLoading(false));
  };

  useEffect(() => { loadBrands(); }, [loadBrands]);

  // Preferences and the launchers get Meta accounts from AppContext. The
  // creative service normally mirrors the same accounts through /clients/sync,
  // but use the already-loaded app list as a repair path when that sync lags or
  // returns an incomplete set.
  useEffect(() => {
    if (brandsLoading || adAccountsLoading || adAccounts.length === 0) return;

    const normaliseId = (value) => String(value || "").replace(/^act_/, "");
    const knownIds = new Set(brands.map((brand) => normaliseId(brand.metaAdAccountId)));
    const missing = adAccounts.filter((account) => {
      const metaId = account.id || account.account_id;
      return metaId && !knownIds.has(normaliseId(metaId));
    });
    if (missing.length === 0) return;

    const attemptKey = missing
      .map((account) => normaliseId(account.id || account.account_id))
      .sort()
      .join(",");
    if (!attemptKey || mirroredAccountsRef.current === attemptKey) return;
    mirroredAccountsRef.current = attemptKey;

    setBrandsLoading(true);
    Promise.allSettled(missing.map((account) => creativeApi.createClient({
      name: account.name || account.account_name || `Meta Account ${account.id || account.account_id}`,
      metaAdAccountId: account.id || `act_${account.account_id}`,
    })))
      .then(() => creativeApi.listClients())
      .then((response) => {
        const nextBrands = response.clients || [];
        setBrands(nextBrands);
        if (nextBrands.length === 0) {
          setError("Meta accounts are connected, but Creative Strategy could not mirror them yet. Try Sync Brands.");
        } else {
          setError(null);
        }
      })
      .catch((syncError) => setError(`Creative Strategy account sync failed: ${syncError.message}`))
      .finally(() => setBrandsLoading(false));
  }, [adAccounts, adAccountsLoading, brands, brandsLoading]);
  useEffect(() => {
    if (selectedBrandId) loadProducts(selectedBrandId);
    else setProducts([]);
    setSelectedProductId(null);
  }, [selectedBrandId]);

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) || null;
  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;

  const ctx = {
    brands, brandsLoading: brandsLoading || adAccountsLoading, selectedBrand, selectedBrandId, setSelectedBrandId, reloadBrands: loadBrands,
    products, productsLoading, selectedProduct, selectedProductId, setSelectedProductId, reloadProducts: () => loadProducts(selectedBrandId),
    goTo: setActiveTab,
  };

  const renderView = () => {
    switch (activeTab) {
      case "overview": return <OverviewView ctx={ctx} />;
      case "brands": return <BrandsView ctx={ctx} />;
      case "products": return <ProductsView ctx={ctx} />;
      case "intelligence": return <IntelligenceView ctx={ctx} />;
      case "research": return <ResearchView ctx={ctx} />;
      case "library": return <LibraryView ctx={ctx} />;
      case "generate": return <GenerateView ctx={ctx} />;
      case "inspiration": return <InspirationView ctx={ctx} />;
      case "weekly": return <WeeklyView ctx={ctx} />;
      default: {
        const item = NAV.find((n) => n.key === activeTab);
        return <ComingSoon label={item?.label} phase={item?.phase} />;
      }
    }
  };

  const active = NAV.find((n) => n.key === activeTab);
  const showContextSelectors = activeTab !== "brands" && activeTab !== "products";

  return (
    <JobsProvider>
    <div className="creative-strategy flex min-h-screen">
      {/* Sidebar */}
      <aside className="relative z-10 flex h-screen w-[290px] flex-col overflow-hidden px-4 py-6 max-lg:w-[80px] max-lg:min-w-[80px] max-lg:px-2">
        <img
          src={doodle}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-[205px] bottom-0 z-0 w-[720px] max-w-none opacity-95 max-lg:hidden"
        />
        <div className="relative z-10 flex h-full flex-col rounded-3xl bg-neutral-100 p-4">
          <div className="flex flex-1 flex-col">
            <button
              onClick={() => navigate("/")}
              className="mb-4 flex w-full items-center justify-start gap-1 rounded-[20px] border border-neutral-200 bg-white py-7 pl-3 font-medium text-neutral-700 shadow-xs transition hover:bg-white hover:shadow-sm max-lg:justify-center max-lg:px-2"
            >
              <img src={rocket} alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
              <div className="mr-2 h-6 w-px bg-neutral-300 max-lg:hidden" />
              <span className="max-lg:hidden">Back To Launcher</span>
            </button>

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
                  {activeTab === key && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neutral-500 max-lg:hidden" aria-hidden="true" />
                  )}
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
        <div className="cs-main-surface flex h-[calc(100vh-3rem)] flex-col overflow-hidden">
          <header className="cs-page-header flex items-center justify-between gap-6 px-12 py-7 max-lg:px-7 max-md:px-5 max-md:py-5">
            <div className="min-w-0">
              <h1 className="text-[32px] font-bold leading-none tracking-[-0.035em] max-md:text-2xl">{active?.label}</h1>
              {DESCRIPTIONS[activeTab] && <p className="mt-2 truncate text-[15px] font-medium text-[var(--cs-muted)] max-md:text-xs">{DESCRIPTIONS[activeTab]}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <CostTracker clientId={selectedBrandId} />
              <JobsIndicator />
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            <div className="w-full p-12 pt-9 max-lg:p-7 max-md:p-5">
              {showContextSelectors && (
                <div className="mb-7 flex flex-wrap items-center gap-4">
                  <Select value={selectedBrandId || ""} onValueChange={(v) => setSelectedBrandId(v || null)}>
                    <SelectTrigger className="cs-pill-control w-[240px] px-5">
                      <SelectValue placeholder="Select Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={selectedProductId || ""} onValueChange={(v) => setSelectedProductId(v || null)} disabled={!selectedBrandId}>
                    <SelectTrigger className="cs-pill-control w-[240px] px-5">
                      <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
              {renderView()}
            </div>
          </div>
        </div>
      </main>
    </div>
    </JobsProvider>
  );
}
