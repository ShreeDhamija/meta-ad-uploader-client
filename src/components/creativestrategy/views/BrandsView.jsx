// Brands = the user's linked Meta ad accounts (auto-synced via /me/adaccounts;
// one brand per account). Select a brand to work with, or resync.
import { useState } from "react";
import PropTypes from "prop-types";
import { Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ViewLoading, EmptyState } from "../ui";

export default function BrandsView({ ctx }) {
  const { brands, brandsLoading, selectedBrandId, setSelectedBrandId, reloadBrands, goTo } = ctx;
  const [syncing, setSyncing] = useState(false);

  const resync = async () => {
    setSyncing(true);
    try { await reloadBrands(); } finally { setSyncing(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{brands.length} linked Meta ad account{brands.length === 1 ? "" : "s"}</p>
        <Button onClick={resync} disabled={syncing} variant="outline" size="sm" className="rounded-xl gap-1.5">
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Resync from Meta"}
        </Button>
      </div>

      {brandsLoading && brands.length === 0 ? (
        <ViewLoading label="Loading brands from Meta…" />
      ) : brands.length === 0 ? (
        <EmptyState icon={Layers} title="No linked ad accounts" hint="Click “Resync from Meta” to pull your linked ad accounts." />
      ) : (
        <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2">
          {brands.map((b) => {
            const active = selectedBrandId === b.id;
            return (
              <button key={b.id} onClick={() => { setSelectedBrandId(b.id); goTo("products"); }}
                className={`text-left rounded-2xl border bg-white p-5 transition-all ${active ? "border-neutral-900 shadow" : "border-neutral-200 shadow-xs hover:shadow-sm"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-neutral-900 truncate">{b.name}</span>
                  {active && <Badge variant="secondary" className="rounded-full text-[10px]">selected</Badge>}
                </div>
                <div className="text-xs text-neutral-400 mt-1">{b.metaAdAccountId || "no ad account"}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

BrandsView.propTypes = { ctx: PropTypes.object.isRequired };
