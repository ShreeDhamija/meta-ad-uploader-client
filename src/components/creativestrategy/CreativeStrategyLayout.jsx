// Creative-strategy module shell. Left vertical sidebar (mirrors the Settings
// page design system) + a shared top context bar (Select Brand / Select
// Product) + the active view. Brands + Products are functional (Phase 3); the
// other nav items are placeholders their phases fill in.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Rocket,
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
  brands: "Create and manage brands (each maps to one Meta ad account).",
  products: "Products under the selected brand. Meta ad account is required.",
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
  const loadBrands = () => {
    setBrandsLoading(true);
    return creativeApi.syncBrands()
      .then((r) => setBrands(r.clients))
      .catch((e) => {
        setError(`Meta sync failed (${e.message}) — showing existing brands`);
        return creativeApi.listClients().then((r) => setBrands(r.clients)).catch(() => {});
      })
      .finally(() => setBrandsLoading(false));
  };
  const loadProducts = (brandId) => {
    setProductsLoading(true);
    return creativeApi.listProducts(brandId)
      .then((r) => setProducts(r.products))
      .catch((e) => setError(e.message))
      .finally(() => setProductsLoading(false));
  };

  useEffect(() => { loadBrands(); }, []);
  useEffect(() => {
    if (selectedBrandId) loadProducts(selectedBrandId);
    else setProducts([]);
    setSelectedProductId(null);
  }, [selectedBrandId]);

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) || null;
  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;

  const ctx = {
    brands, brandsLoading, selectedBrand, selectedBrandId, setSelectedBrandId, reloadBrands: loadBrands,
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

  return (
    <JobsProvider>
    <div className="flex min-h-screen bg-neutral-100">
      {/* Sidebar */}
      <div className="w-[290px] flex flex-col h-screen sticky top-0 px-4 py-6 max-lg:w-[80px] max-lg:min-w-[80px] max-lg:px-2">
        <div className="rounded-3xl bg-neutral-100 p-4 flex flex-col h-full">
          <div className="flex-1 flex flex-col">
            <button
              onClick={() => navigate("/")}
              className="flex items-center pl-3 justify-start gap-2 bg-white hover:shadow-sm border border-neutral-200 shadow-xs rounded-[20px] py-6 font-medium w-full mb-4 text-neutral-700"
            >
              <Rocket className="w-7 h-7 text-orange-500" />
              <div className="h-6 w-px bg-neutral-300 mr-1 max-lg:hidden" />
              <span className="text-neutral-700 font-semibold max-lg:hidden">Back To Launcher</span>
            </button>

            <div className="space-y-2">
              {NAV.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-2 rounded-2xl transition-all h-10 justify-start max-lg:justify-center max-lg:px-2 relative",
                    activeTab === key
                      ? "bg-white border border-gray-300 shadow font-semibold text-neutral-900"
                      : "border border-transparent text-neutral-700 hover:bg-neutral-200",
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0 text-neutral-700" />
                  <span className="text-sm font-medium max-lg:hidden">{label}</span>
                  {activeTab === key && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neutral-500 max-lg:hidden" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer profile */}
          <div className="pt-4 mt-auto">
            <div className="w-full flex items-center bg-neutral-50 border border-neutral-200 shadow-xs rounded-[20px] pl-3 pr-3 py-2 max-lg:justify-center max-lg:p-2">
              <div className="flex items-center gap-2 flex-grow max-lg:hidden">
                <img src={profilePicUrl || "/placeholder.svg"} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                <span className="text-sm font-medium text-neutral-800 truncate max-w-[120px]">{userName}</span>
              </div>
              <div className="flex items-center">
                <div className="h-6 w-px bg-neutral-300 max-lg:hidden" />
                <button onClick={handleLogout} className="ml-3 rounded-full transition max-lg:ml-0" title="Logout">
                  <LogOut className="w-4 h-4 text-neutral-700" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 py-6 pr-6">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs h-[calc(100vh-3rem)] flex flex-col overflow-hidden">
          {/* Top context bar */}
          <div className="border-b border-neutral-100 px-8 py-4 flex items-center gap-3">
            <Select value={selectedBrandId || ""} onValueChange={(v) => setSelectedBrandId(v || null)}>
              <SelectTrigger className="w-[200px] rounded-2xl border-neutral-200 bg-white shadow-xs">
                <SelectValue placeholder="Select Brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedProductId || ""} onValueChange={(v) => setSelectedProductId(v || null)} disabled={!selectedBrandId}>
              <SelectTrigger className="w-[200px] rounded-2xl border-neutral-200 bg-white shadow-xs">
                <SelectValue placeholder="Select Product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <CostTracker clientId={selectedBrandId} />
            <JobsIndicator />
          </div>

          <div className="flex-1 overflow-auto">
            <div className="w-full max-w-5xl mx-auto p-10">
              <h1 className="text-2xl font-semibold tracking-tight mb-1">{active?.label}</h1>
              {DESCRIPTIONS[activeTab] && <p className="text-neutral-400 text-sm mb-6">{DESCRIPTIONS[activeTab]}</p>}
              {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
              {renderView()}
            </div>
          </div>
        </div>
      </main>
    </div>
    </JobsProvider>
  );
}
