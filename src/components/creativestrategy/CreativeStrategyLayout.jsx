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
import { Button } from "@/components/ui/button";
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
  const reconciledAccountsRef = useRef("");

  const [activeTab, setActiveTab] = useState("brands");
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [error, setError] = useState(null);

  // AppContext is the only source of truth for which Meta accounts exist and
  // are available on the user's plan. Creative clients are internal mappings
  // for downstream product APIs; they never contribute accounts to this list.
  const reconcileCreativeClients = useCallback(async (accounts) => {
    const sourceAccounts = Array.isArray(accounts) ? accounts : [];
    const normaliseId = (value) => String(value || "").replace(/^act_/, "");
    const accountMetaId = (account) => account.id || (account.account_id ? `act_${account.account_id}` : "");
    const accountKey = sourceAccounts
      .map((account) => `${normaliseId(accountMetaId(account))}:${account.name || account.account_name || ""}`)
      .sort()
      .join(",");

    reconciledAccountsRef.current = accountKey || "__empty__";
    setBrandsLoading(true);
    if (sourceAccounts.length === 0) {
      setBrands([]);
      setError(null);
      setBrandsLoading(false);
      return [];
    }

    try {
      const existingResponse = await creativeApi.listClients();
      let creativeClients = existingResponse.clients || [];
      let clientsByMetaId = new Map(
        creativeClients.map((client) => [normaliseId(client.metaAdAccountId), client]),
      );
      const missingAccounts = sourceAccounts.filter((account) => !clientsByMetaId.has(normaliseId(accountMetaId(account))));

      if (missingAccounts.length > 0) {
        await Promise.allSettled(missingAccounts.map((account) => creativeApi.createClient({
          name: account.name || account.account_name || `Meta Account ${accountMetaId(account)}`,
          metaAdAccountId: accountMetaId(account),
        })));
        const refreshedResponse = await creativeApi.listClients();
        creativeClients = refreshedResponse.clients || [];
        clientsByMetaId = new Map(
          creativeClients.map((client) => [normaliseId(client.metaAdAccountId), client]),
        );
      }

      const mappedBrands = sourceAccounts.map((account) => {
        const metaAdAccountId = accountMetaId(account);
        const client = clientsByMetaId.get(normaliseId(metaAdAccountId));
        if (!client) {
          return {
            id: `meta:${normaliseId(metaAdAccountId)}`,
            name: account.name || account.account_name || `Meta Account ${metaAdAccountId}`,
            metaAdAccountId,
            mappingPending: true,
          };
        }
        return {
          ...client,
          name: account.name || account.account_name || client.name,
          metaAdAccountId,
        };
      });

      setBrands(mappedBrands);
      setError(mappedBrands.every((brand) => !brand.mappingPending)
        ? null
        : "Some Meta accounts could not be prepared for Creative Strategy. Refresh Accounts to retry.");
      return mappedBrands;
    } catch (mappingError) {
      setBrands([]);
      setError(`Creative Strategy could not prepare your Meta accounts: ${mappingError.message}`);
      return [];
    } finally {
      setBrandsLoading(false);
    }
  }, []);

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true);
    try {
      const freshAccounts = await refetchAdAccounts();
      return reconcileCreativeClients(freshAccounts || adAccounts);
    } catch (accountError) {
      if (adAccounts.length > 0) return reconcileCreativeClients(adAccounts);
      setBrands([]);
      setBrandsLoading(false);
      setError(`Could not refresh Meta accounts: ${accountError.message}`);
      return [];
    }
  }, [adAccounts, reconcileCreativeClients, refetchAdAccounts]);
  const loadProducts = (brandId) => {
    setProductsLoading(true);
    return creativeApi.listProducts(brandId)
      .then((r) => setProducts(r.products))
      .catch((e) => setError(e.message))
      .finally(() => setProductsLoading(false));
  };

  // Consume the same AppContext account list as Home and Preferences. No Meta
  // account fetch or sync is performed through the Creative API.
  useEffect(() => {
    if (adAccountsLoading) {
      setBrandsLoading(true);
      return;
    }
    const accountKey = adAccounts
      .map((account) => `${String(account.id || account.account_id || "").replace(/^act_/, "")}:${account.name || account.account_name || ""}`)
      .sort()
      .join(",");
    if (adAccounts.length === 0) {
      reconciledAccountsRef.current = "__empty__";
      setBrands([]);
      setBrandsLoading(false);
      setError(null);
      return;
    }
    if (reconciledAccountsRef.current === accountKey) return;
    reconcileCreativeClients(adAccounts);
  }, [adAccounts, adAccountsLoading, reconcileCreativeClients]);
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
                      {brands.map((b) => <SelectItem key={b.id} value={b.id} disabled={b.mappingPending}>{b.name}</SelectItem>)}
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
