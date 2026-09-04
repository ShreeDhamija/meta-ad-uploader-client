// Library — all generated hooks, headlines, and primary text shown together.
// Existing generation and status APIs are preserved behind a three-column board.
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Archive, BookOpen, Box, Check, Copy, Loader2, Sparkles } from "lucide-react";
import { creativeApi } from "@/lib/creativeApi";
import { ViewLoading, EmptyState, ErrorBanner } from "../ui";
import { useJobRunner, JobBadge } from "../JobsContext";

const TYPES = [
  { key: "hook", label: "Hooks", description: "Opening lines and scroll-stopping ideas" },
  { key: "headline", label: "Headlines", description: "Short, focused conversion messages" },
  { key: "primary_text", label: "Primary Text", description: "Longer-form ad copy and narratives" },
];

const STATUS_LABELS = {
  approved: "Approved",
  archived: "Archived",
  draft: "Draft",
};

export default function LibraryView({ ctx }) {
  const {
    selectedProductId, renderHeaderActions,
  } = ctx;
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null);

  const load = async (productId) => {
    if (!productId) { setItems([]); return; }
    setLoading(true);
    try {
      const response = await creativeApi.getLibrary(productId);
      setItems(response.items || []);
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProductId) load(selectedProductId);
    else setItems([]);
  }, [selectedProductId]);

  const { job, start } = useJobRunner({
    kind: "generate_library",
    productId: selectedProductId,
    onComplete: () => load(selectedProductId),
  });

  const run = async () => {
    if (!selectedProductId) return;
    setErr(null);
    try {
      const { jobId } = await creativeApi.runLibrary(selectedProductId);
      start(jobId);
    } catch (error) {
      setErr(error.message);
    }
  };

  const setStatus = async (id, status) => {
    setUpdating(`${id}:${status}`);
    setErr(null);
    try {
      await creativeApi.setLibraryStatus(id, status);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
    } catch (error) {
      setErr(error.message);
    } finally {
      setUpdating(null);
    }
  };

  const grouped = useMemo(() => TYPES.reduce((result, type) => {
    result[type.key] = items.filter((item) => item.itemType === type.key);
    return result;
  }, {}), [items]);

  const jobActive = job && (job.status == null || job.status === "queued" || job.status === "running");

  return (
    <div className="space-y-5">
      {renderHeaderActions(
        <div className="flex flex-wrap items-center gap-3">
          <JobBadge job={job} />
          <button type="button" onClick={run} disabled={!selectedProductId || jobActive} className="cs-primary-button">
            {jobActive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {jobActive ? "Generating…" : "Generate Library"}
          </button>
        </div>
      )}
      <p className="text-xs font-normal text-neutral-400">Copy generated from personas and analyzed ads</p>

      <ErrorBanner message={err} />

      {!selectedProductId ? (
        <EmptyState icon={Box} title="No product selected" hint="Select a product above to generate and manage copy." className="min-h-[420px]" />
      ) : loading ? (
        <ViewLoading label="Loading library…" className="min-h-[420px]" />
      ) : (
        <div className="cs-library-board">
          {TYPES.map((type) => (
            <section key={type.key} className="cs-library-column">
              <div className="cs-library-column__header">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-[#3b170b]">{type.label}</h2>
                    <span className="cs-library-count">{grouped[type.key]?.length || 0}</span>
                  </div>
                  <p className="mt-1 text-xs font-normal text-[#6c3403]/70">{type.description}</p>
                </div>
              </div>

              <div className="cs-library-column__body">
                {(grouped[type.key] || []).length === 0 ? (
                  <div className="cs-library-empty">
                    <BookOpen className="h-5 w-5 text-[#6c3403]/45" />
                    <p className="text-sm font-medium text-[#4f3329]">No {type.label.toLowerCase()} yet</p>
                    <p className="text-xs leading-5 text-[#6c3403]/60">Generate the library to populate this column.</p>
                  </div>
                ) : (
                  grouped[type.key].map((item) => (
                    <LibraryCard key={item.id} item={item} updating={updating} setStatus={setStatus} />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryCard({ item, updating, setStatus }) {
  const metadata = (item.tags || []).filter((tag) =>
    tag.startsWith("grade:") || tag.startsWith("stage:") || tag.startsWith("persona:"));
  const approving = updating === `${item.id}:approved`;
  const archiving = updating === `${item.id}:archived`;
  const resetting = updating === `${item.id}:draft`;
  const copyContent = () => {
    navigator.clipboard?.writeText(item.content).catch(() => {});
  };

  return (
    <article className={`cs-library-card ${item.status === "archived" ? "is-archived" : ""}`}>
      <p className="whitespace-pre-wrap text-sm font-normal leading-6 text-[#342923]">{item.content}</p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className={`cs-library-pill is-${item.status || "draft"}`}>{STATUS_LABELS[item.status] || "Draft"}</span>
        {metadata.map((tag) => {
          const separator = tag.indexOf(":");
          const label = separator >= 0 ? tag.slice(separator + 1) : tag;
          return <span key={tag} className="cs-library-pill">{label}</span>;
        })}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-[#6c3403]/15 pt-3">
        {item.status !== "approved" && (
          <button type="button" onClick={() => setStatus(item.id, "approved")} disabled={Boolean(updating)} className="cs-library-action is-approve">
            {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
          </button>
        )}
        {item.status !== "archived" && (
          <button type="button" onClick={() => setStatus(item.id, "archived")} disabled={Boolean(updating)} className="cs-library-action is-archive">
            {archiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />} Archive
          </button>
        )}
        <button type="button" onClick={copyContent} className="cs-library-copy" aria-label="Copy text" title="Copy text">
          <Copy className="h-4 w-4" />
        </button>
        {item.status !== "draft" && (
          <button type="button" onClick={() => setStatus(item.id, "draft")} disabled={Boolean(updating)} className="cs-library-reset">
            {resetting ? "Resetting…" : "Reset to draft"}
          </button>
        )}
      </div>
    </article>
  );
}

LibraryView.propTypes = { ctx: PropTypes.object.isRequired };
LibraryCard.propTypes = {
  item: PropTypes.object.isRequired,
  updating: PropTypes.string,
  setStatus: PropTypes.func.isRequired,
};
