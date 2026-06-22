// Inspiration — upload reference ads (image or video) and mine them for
// ad-grade structure. Images analyze in a background job (JobStatus polls);
// videos analyze inline (never stored) so the upload request runs longer.
// Each analyzed file shows its concept bucket + visual/hook/angle breakdown.
import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { creativeApi } from "@/lib/creativeApi";
import JobStatus from "../JobStatus";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function InspirationView({ ctx }) {
  const { selectedBrand, selectedBrandId, selectedProductId } = ctx;
  const [items, setItems] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const fileRef = useRef(null);

  const load = async (cid) => {
    try { const r = await creativeApi.getInspo(cid, selectedProductId || undefined); setItems(r.items); }
    catch (e) { setErr(e.message); }
  };

  useEffect(() => {
    if (selectedBrandId) load(selectedBrandId); else setItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrandId, selectedProductId]);

  if (!selectedBrandId) {
    return <p className="text-sm text-neutral-400">Select a brand (top bar) to upload reference ads.</p>;
  }

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (file) e.target.value = "";
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const fileType = file.type.startsWith("video") ? "video" : "image";
      const r = await creativeApi.uploadInspo({
        clientId: selectedBrandId,
        productId: selectedProductId || undefined,
        fileName: file.name,
        fileType,
        dataBase64: dataUrl,
      });
      if (r.jobId) setJobId(r.jobId); // image → background job
      await load(selectedBrandId);    // video → already analyzed
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={onPick} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={busy}
          className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm disabled:opacity-50">
          {busy ? "Uploading…" : "Upload reference"}
        </button>
        {jobId && <JobStatus jobId={jobId} onDone={(job) => { if (job.status === "completed") setJobId(null); load(selectedBrandId); }} />}
        <span className="text-sm text-neutral-400">{selectedBrand?.name} · image analyzes in background, video inline (not stored)</span>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((it) => (
          <div key={it.id} className="rounded-2xl border border-neutral-200 overflow-hidden">
            {it.imageUrl
              ? <img src={it.imageUrl} alt={it.fileName} className="w-full object-cover bg-neutral-50" />
              : <div className="aspect-square grid place-items-center text-xs text-neutral-400 bg-neutral-50">{it.fileType === "video" ? "🎬 video (not stored)" : "no preview"}</div>}
            <div className="p-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1">
                <StatusTag status={it.analysisStatus} />
                {it.conceptClassification && <Tag>{it.conceptClassification}</Tag>}
              </div>
              <div className="text-xs text-neutral-500 truncate" title={it.fileName}>{it.fileName}</div>
              {it.analysisStatus === "analyzed" && (
                <button onClick={() => setExpanded(expanded === it.id ? null : it.id)}
                  className="text-xs text-neutral-600 underline">
                  {expanded === it.id ? "Hide" : "Details"}
                </button>
              )}
              {expanded === it.id && (
                <div className="text-xs text-neutral-600 space-y-1 pt-1">
                  <Row k="Format" v={it.formatDescription} />
                  <Row k="Visual" v={it.visualStyle} />
                  <Row k="Hook" v={it.hookStyle} />
                  <Row k="Angle" v={it.primaryAngle} />
                  <Row k="Awareness" v={it.awarenessStage} />
                  <Row k="Blocks" v={(it.buildingBlocks || []).join(" → ")} />
                  {it.mediaDescription && <p className="text-neutral-500">{it.mediaDescription}</p>}
                  {it.transcript && <p className="text-neutral-400 line-clamp-4 whitespace-pre-wrap">{it.transcript}</p>}
                </div>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-neutral-400 col-span-full">No references yet — upload an image or video ad to analyze.</p>}
      </div>
    </div>
  );
}

function Row({ k, v }) {
  if (!v) return null;
  return <div><span className="text-neutral-400">{k}:</span> {v}</div>;
}
Row.propTypes = { k: PropTypes.string.isRequired, v: PropTypes.string };

function StatusTag({ status }) {
  const tone = status === "analyzed" ? "bg-green-100 text-green-700"
    : status === "failed" ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700";
  return <span className={`text-xs rounded-full px-2 py-0.5 ${tone}`}>{status}</span>;
}
StatusTag.propTypes = { status: PropTypes.string };

function Tag({ children }) {
  return <span className="text-xs rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-500">{children}</span>;
}
Tag.propTypes = { children: PropTypes.node };

InspirationView.propTypes = { ctx: PropTypes.object.isRequired };
