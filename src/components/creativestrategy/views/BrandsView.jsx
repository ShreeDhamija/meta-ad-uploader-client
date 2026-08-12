// Brands = the user's linked Meta ad accounts (auto-synced via /me/adaccounts;
// one brand per account). Select a brand to work with, or resync.
import { useState } from "react";
import PropTypes from "prop-types";
import { Layers, RefreshCw } from "lucide-react";
import { ViewLoading, EmptyState } from "../ui";

export default function BrandsView({ ctx }) {
  const { brands, brandsLoading, selectedBrandId, setSelectedBrandId, reloadBrands, goTo } = ctx;
  const [syncing, setSyncing] = useState(false);

  const resync = async () => {
    setSyncing(true);
    try { await reloadBrands(); } finally { setSyncing(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-base font-semibold text-neutral-900">
          {brands.length} Connected Account{brands.length === 1 ? "" : "s"}
        </p>
        <button onClick={resync} disabled={syncing} className="cs-primary-button">
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync Brands"}
        </button>
      </div>

      {brandsLoading && brands.length === 0 ? (
        <ViewLoading label="Loading brands from Meta…" />
      ) : brands.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No connected accounts"
          hint="Sync Brands to pull your linked Meta ad accounts."
          action={<button onClick={resync} disabled={syncing} className="cs-primary-button mt-2">Sync Brands</button>}
          className="min-h-[360px] rounded-[28px]"
        />
      ) : (
        <div className="cs-brand-grid">
          {brands.map((b) => {
            const active = selectedBrandId === b.id;
            const productCount = b.productCount ?? b.productsCount ?? b.products?.length;
            return (
              <button key={b.id} onClick={() => { setSelectedBrandId(b.id); goTo("products"); }}
                className={`cs-brand-card text-left ${active ? "ring-2 ring-black/20 ring-offset-2" : ""}`}>
                <div className="cs-brand-card__top flex items-center justify-between gap-3 px-4">
                  <span className="truncate text-sm font-semibold text-neutral-950">{b.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-neutral-900">
                    {productCount == null ? "View Products" : `${productCount} Product${productCount === 1 ? "" : "s"}`}
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 items-center px-4 text-xs font-medium text-[var(--cs-orange-ink)]">
                  {b.metaAdAccountId || "No ad account ID"}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

BrandsView.propTypes = { ctx: PropTypes.object.isRequired };
