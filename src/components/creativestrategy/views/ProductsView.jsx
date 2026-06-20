// Products under the selected brand. Card grid (mirrors the wireframe) + create
// form. Meta ad account id is required (it's only stored here; Meta isn't
// called until Phase 4).
import { useState } from "react";
import PropTypes from "prop-types";
import { creativeApi } from "@/lib/creativeApi";

const TYPES = ["physical", "saas", "info", "service"];

export default function ProductsView({ ctx }) {
  const { selectedBrand, selectedBrandId, products, selectedProductId, setSelectedProductId, reloadProducts } = ctx;
  const [form, setForm] = useState({ name: "", url: "", productType: "physical" });
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);

  if (!selectedBrandId) {
    return <p className="text-sm text-neutral-400">Select a brand first (top-left dropdown or the Brands tab).</p>;
  }

  const add = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      await creativeApi.createProduct({ ...form, clientId: selectedBrandId });
      setForm({ name: "", url: "", productType: "physical" });
      setAdding(false);
      await reloadProducts();
    } catch (e) { setErr(e.message); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{selectedBrand?.name}</p>
        <button onClick={() => setAdding((v) => !v)} className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm">
          {adding ? "Cancel" : "+ New product"}
        </button>
      </div>

      {adding && (
        <form onSubmit={add} className="rounded-2xl border border-neutral-200 p-5 space-y-2 max-w-md">
          <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" placeholder="Product name" value={form.name} onChange={set("name")} />
          <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" placeholder="Product URL" value={form.url} onChange={set("url")} />
          <select className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.productType} onChange={set("productType")}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <p className="text-xs text-neutral-400">Ad account is inherited from the brand{selectedBrand?.metaAdAccountId ? ` (${selectedBrand.metaAdAccountId})` : ""}.</p>
          <button className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm disabled:opacity-40" disabled={!form.name}>Create</button>
        </form>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProductId(p.id)}
            className={`text-left rounded-2xl border p-5 min-h-[120px] transition-all ${selectedProductId === p.id ? "border-neutral-900 shadow" : "border-neutral-200 hover:shadow-sm"}`}
          >
            <div className="font-medium text-neutral-900">{p.name}</div>
            <div className="text-xs text-neutral-400 mt-1">{p.metaAdAccountId}</div>
            {p.url && <div className="text-xs text-neutral-400 mt-1 truncate">{p.url}</div>}
          </button>
        ))}
        {products.length === 0 && <p className="text-sm text-neutral-400">No products yet.</p>}
      </div>
    </div>
  );
}

ProductsView.propTypes = { ctx: PropTypes.object.isRequired };
