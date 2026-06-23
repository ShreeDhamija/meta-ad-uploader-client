// Library — generate (per persona) and view draft copy: hooks, headlines,
// primary text. Requires personas (Research) + analyzed ads (Insights).
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { BookOpen, Box } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ViewLoading, EmptyState, ErrorBanner } from "../ui";
import { useJobRunner, JobBadge } from "../JobsContext";

const TYPES = [
  { key: "hook", label: "Hooks" },
  { key: "headline", label: "Headlines" },
  { key: "primary_text", label: "Primary text" },
];

const STATUS_STYLES = {
  approved: "bg-emerald-100 text-emerald-700",
  archived: "bg-neutral-200 text-neutral-500",
  draft: "bg-neutral-100 text-neutral-500",
};

export default function LibraryView({ ctx }) {
  const { selectedProduct, selectedProductId } = ctx;
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState("hook");
  const [loading, setLoading] = useState(false);

  const load = async (pid) => {
    setLoading(true);
    try { const r = await creativeApi.getLibrary(pid); setItems(r.items); }
    catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedProductId) load(selectedProductId); else setItems([]);
  }, [selectedProductId]);

  const { job, start } = useJobRunner({
    kind: "generate_library", productId: selectedProductId, onComplete: () => load(selectedProductId),
  });

  if (!selectedProductId) {
    return <EmptyState icon={Box} title="No product selected" hint="Select a product in the top bar to generate copy." />;
  }

  const run = async () => {
    setErr(null);
    try { const { jobId } = await creativeApi.runLibrary(selectedProductId); start(jobId); }
    catch (e) { setErr(e.message); }
  };
  const setStatus = async (id, status) => {
    try { await creativeApi.setLibraryStatus(id, status); load(selectedProductId); }
    catch (e) { setErr(e.message); }
  };

  const counts = TYPES.reduce((acc, t) => { acc[t.key] = items.filter((i) => i.itemType === t.key).length; return acc; }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button onClick={run} size="sm" className="rounded-xl">Generate library</Button>
        <JobBadge job={job} />
        <span className="text-sm text-neutral-400">{selectedProduct?.name} · needs personas + analyzed ads</span>
      </div>
      <ErrorBanner message={err} />

      {loading ? (
        <ViewLoading label="Loading library…" />
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            {TYPES.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>{t.label} ({counts[t.key] || 0})</TabsTrigger>
            ))}
          </TabsList>

          {TYPES.map((t) => (
            <TabsContent key={t.key} value={t.key} className="space-y-2">
              {items.filter((i) => i.itemType === t.key).length === 0 ? (
                <EmptyState icon={BookOpen} title={`No ${t.label.toLowerCase()} yet`} hint="Click Generate library, or use the Copy tab in Generate." />
              ) : (
                items.filter((i) => i.itemType === t.key).map((it) => (
                  <div key={it.id} className="rounded-2xl border border-neutral-200 bg-white shadow-xs p-4">
                    <div className="text-sm text-neutral-800 whitespace-pre-wrap">{it.content}</div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Badge className={`rounded-full border-0 ${STATUS_STYLES[it.status] || STATUS_STYLES.draft}`}>{it.status}</Badge>
                      {(it.tags || []).filter((tg) => tg.startsWith("grade:") || tg.startsWith("stage:") || tg.startsWith("persona:")).map((tg) => (
                        <Badge key={tg} variant="outline" className="rounded-full font-normal text-neutral-500">{tg}</Badge>
                      ))}
                      <span className="flex-1" />
                      {it.status !== "approved" && <Button onClick={() => setStatus(it.id, "approved")} size="sm" variant="outline" className="rounded-xl h-7 text-xs">Approve</Button>}
                      {it.status !== "archived" && <Button onClick={() => setStatus(it.id, "archived")} size="sm" variant="ghost" className="rounded-xl h-7 text-xs text-neutral-500">Archive</Button>}
                      {it.status !== "draft" && <button onClick={() => setStatus(it.id, "draft")} className="text-xs text-neutral-400 underline">reset</button>}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

LibraryView.propTypes = { ctx: PropTypes.object.isRequired };
