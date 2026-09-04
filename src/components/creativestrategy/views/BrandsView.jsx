// Accounts come from the app-wide AppContext Meta account list and are reconciled
// to Creative Service client UUIDs before this view renders them.
import FacebookReauthDialog from "@/components/FacebookReauthDialog";
import { CirclePlus, Layers } from "lucide-react";
import PropTypes from "prop-types";
import { useState } from "react";
import { EmptyState, ViewLoading } from "../ui";

export default function BrandsView({ ctx }) {
  const { brands, brandsLoading, selectedBrandId, setSelectedBrandId, goTo, renderHeaderActions } = ctx;
  const [linkAccountsOpen, setLinkAccountsOpen] = useState(false);
  const linkAccountsButton = (
    <button type="button" onClick={() => setLinkAccountsOpen(true)} className="cs-primary-button cs-link-accounts-button">
      <CirclePlus className="h-4 w-4" /> Link More Accounts
    </button>
  );

  return (
    <div className="space-y-5">
      {renderHeaderActions(linkAccountsButton)}
      <FacebookReauthDialog
        open={linkAccountsOpen}
        onOpenChange={setLinkAccountsOpen}
        redirectState="settings"
      />

      <p className="text-base font-semibold text-neutral-900">
        {brands.length} Connected Account{brands.length === 1 ? "" : "s"}
      </p>

      {brandsLoading && brands.length === 0 ? (
        <ViewLoading label="Loading accounts from Meta…" />
      ) : brands.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No connected accounts"
          hint="Link a Meta ad account to start building your creative strategy."
          action={linkAccountsButton}
          className="min-h-[360px] rounded-[28px]"
        />
      ) : (
        <div className="cs-brand-grid">
          {brands.map((b) => {
            const active = selectedBrandId === b.id;
            const productCount = b.productCount ?? b.productsCount ?? b.products?.length;
            return (
              <button
                key={b.id}
                onClick={() => {
                  setSelectedBrandId(b.id);
                  goTo("products");
                }}
                className={`cs-brand-card cs-brand-card--compact text-left ${active ? "ring-2 ring-black/20 ring-offset-2" : ""}`}
              >
                <div className="cs-brand-card__top flex items-center justify-between gap-3 px-4">
                  <span className="truncate text-sm font-semibold text-neutral-950">{b.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-neutral-900">
                    {productCount == null ? "View Products" : `${productCount} Product${productCount === 1 ? "" : "s"}`}
                  </span>
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
