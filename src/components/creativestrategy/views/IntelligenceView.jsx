// Intelligence (Insights) — run Meta ad analysis, then view the full audit
// (every section) and the analyzed ads. Clicking an ad expands its complete
// stored record (all ~30 captured fields). Analysis runs as a background job.
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { creativeApi } from "@/lib/creativeApi";
import JobStatus from "../JobStatus";
import { Section, JsonView, humanize } from "../JsonView";

export default function IntelligenceView({ ctx }) {
  const { selectedProduct, selectedProductId } = ctx;
  const [ads, setAds] = useState([]);
  const [audit, setAudit] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openAd, setOpenAd] = useState(null); // { adId, ad }
  const [bfJobId, setBfJobId] = useState(null);

  const load = async (pid) => {
    setLoading(true); setErr(null);
    try {
      const r = await creativeApi.getInsights(pid);
      setAds(r.ads); setAudit(r.audit);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedProductId) load(selectedProductId);
    else { setAds([]); setAudit(null); }
    setOpenAd(null);
  }, [selectedProductId]);

  if (!selectedProductId) {
    return <p className="text-sm text-neutral-400">Select a product (top bar) to run and view ad analysis.</p>;
  }

  const run = async () => {
    setErr(null);
    try {
      const { jobId } = await creativeApi.runInsights(selectedProductId);
      setJobId(jobId);
    } catch (e) { setErr(e.message); }
  };

  const runBackfill = async (kind) => {
    setErr(null);
    if (!ctx.selectedBrandId) { setErr("Select a brand first"); return; }
    try { const { jobId } = await creativeApi.runBackfill(ctx.selectedBrandId, kind); setBfJobId(jobId); }
    catch (e) { setErr(e.message); }
  };

  const expandAd = async (adId) => {
    if (openAd?.adId === adId) { setOpenAd(null); return; }
    setOpenAd({ adId, ad: null });
    try {
      const { ad } = await creativeApi.getInsightAd(selectedProductId, adId);
      setOpenAd({ adId, ad });
    } catch (e) { setErr(e.message); setOpenAd(null); }
  };

  const auditEntries = audit ? Object.entries(audit).filter(([, v]) => v != null) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={run} className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm">Run Analysis</button>
        {jobId && <JobStatus jobId={jobId} onDone={(job) => { if (job.status === "completed") setJobId(null); load(selectedProductId); }} />}
        <span className="text-sm text-neutral-400">{selectedProduct?.name} · {selectedProduct?.metaAdAccountId}</span>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-neutral-500">Maintenance (brand-wide):</span>
        <button onClick={() => runBackfill("classify")} className="text-xs rounded-xl border border-neutral-300 px-3 py-1">Classify ads</button>
        <button onClick={() => runBackfill("curate_hooks")} className="text-xs rounded-xl border border-neutral-300 px-3 py-1">Curate hooks → proven-hooks</button>
        <button onClick={() => runBackfill("normalize_angles")} className="text-xs rounded-xl border border-neutral-300 px-3 py-1">Normalize angles</button>
        {bfJobId && <JobStatus jobId={bfJobId} onDone={(job) => { if (job.status === "completed") setBfJobId(null); }} />}
      </div>

      {auditEntries.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Creative strategy audit ({auditEntries.length} sections)</p>
          {auditEntries.map(([k, v]) => <Section key={k} title={humanize(k)} data={v} />)}
        </div>
      )}

      <div>
        <p className="text-sm text-neutral-500 mb-2">{loading ? "Loading…" : `${ads.length} analyzed ad${ads.length === 1 ? "" : "s"} (click a card for full detail)`}</p>
        <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2">
          {ads.map((a) => (
            <button key={a.adId} onClick={() => expandAd(a.adId)}
              className={`text-left rounded-2xl border overflow-hidden transition-all ${openAd?.adId === a.adId ? "border-neutral-900 shadow" : "border-neutral-200 hover:shadow-sm"}`}>
              {(a.imageUrl || a.thumbnailUrl || a.mediaUrl) && <img src={a.imageUrl || a.thumbnailUrl || a.mediaUrl} alt="" className="w-full h-32 object-cover bg-neutral-100" />}
              <div className="p-3 space-y-1">
                <div className="text-sm font-medium truncate">{a.adName || "(unnamed)"}</div>
                <div className="text-xs text-neutral-400">${Math.round(a.spend || 0)} · {a.mediaType} {a.grade ? `· ${a.grade}` : ""}</div>
                {a.primaryAngle && <div className="text-xs text-neutral-500">angle: {a.primaryAngle}</div>}
                <div className="text-xs text-neutral-400">
                  {a.roas ? `ROAS ${a.roas.toFixed(2)}` : ""}{a.costPerPurchase ? ` · CPA $${Math.round(a.costPerPurchase)}` : ""}{a.hookRate ? ` · hook ${(a.hookRate * 100).toFixed(0)}%` : ""}
                </div>
              </div>
            </button>
          ))}
          {!loading && ads.length === 0 && <p className="text-sm text-neutral-400">No analyzed ads yet — click Run Analysis.</p>}
        </div>
      </div>

      {openAd && (
        <div className="rounded-2xl border border-neutral-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Ad detail</p>
            <button onClick={() => setOpenAd(null)} className="text-sm text-neutral-400">close ✕</button>
          </div>
          {openAd.ad ? <JsonView data={openAd.ad} /> : <p className="text-sm text-neutral-400">Loading…</p>}
        </div>
      )}
    </div>
  );
}

IntelligenceView.propTypes = { ctx: PropTypes.object.isRequired };
