// Brands = the user's linked Meta ad accounts (auto-synced via /me/adaccounts;
// one brand per account). Read-mostly: select a brand to work with, or resync
// to pull newly-linked accounts.
import { useState } from "react";
import PropTypes from "prop-types";

export default function BrandsView({ ctx }) {
  const { brands, selectedBrandId, setSelectedBrandId, reloadBrands, goTo } = ctx;
  const [syncing, setSyncing] = useState(false);

  const resync = async () => {
    setSyncing(true);
    try { await reloadBrands(); } finally { setSyncing(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{brands.length} linked Meta ad account{brands.length === 1 ? "" : "s"}</p>
        <button onClick={resync} disabled={syncing} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm disabled:opacity-50">
          {syncing ? "Syncing…" : "Resync from Meta"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2">
        {brands.map((b) => (
          <button
            key={b.id}
            onClick={() => { setSelectedBrandId(b.id); goTo("products"); }}
            className={`text-left rounded-2xl border p-5 transition-all ${selectedBrandId === b.id ? "border-neutral-900 shadow" : "border-neutral-200 hover:shadow-sm"}`}
          >
            <div className="font-medium text-neutral-900 truncate">{b.name}</div>
            <div className="text-xs text-neutral-400 mt-1">{b.metaAdAccountId || "no ad account"}</div>
          </button>
        ))}
        {brands.length === 0 && <p className="text-sm text-neutral-400">No linked ad accounts found. Click “Resync from Meta”.</p>}
      </div>
    </div>
  );
}

BrandsView.propTypes = { ctx: PropTypes.object.isRequired };
