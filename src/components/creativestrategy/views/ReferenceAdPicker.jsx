/**
 * Reference ad for a video brief (Generate → Briefs → Video brief).
 *
 * The popup lists this product's analyzed video ads (highest spend first) and
 * the brand's earlier uploaded videos in a scrolling area, with a fixed upload
 * area below for a new video. An upload is analyzed on the spot (transcript +
 * visual breakdown) and selected; the video itself is not stored.
 */
import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Check, Film, Loader2, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { creativeApi } from "@/lib/creativeApi";

// The upload route takes base64 JSON up to 60 MB, so the file must stay under ~44 MB.
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

const money = (value) => (value == null ? null : `$${Math.round(value).toLocaleString()}`);

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.readAsDataURL(file);
  });
}

/** The chosen reference in the sidebar, or the button that opens the picker. */
export function ReferenceAdField({ value, onChange, productId, clientId, disabled = false }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-[#4f3329]">Reference ad (optional)</span>
      {value ? (
        <div className="cs-reference-chip">
          {value.imageUrl ? <img src={value.imageUrl} alt="" /> : <span className="cs-reference-chip__icon"><Film className="h-4 w-4" /></span>}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-stone-800" title={value.name}>{value.name}</span>
            <span className="block text-[11px] text-stone-500">{value.kind === "upload" ? "Uploaded video, remade for this brand" : [money(value.spend) && `${money(value.spend)} spend`, "new version of this ad"].filter(Boolean).join(" · ")}</span>
          </span>
          <button type="button" onClick={() => setOpen(true)} disabled={disabled} className="text-[12px] font-medium text-[#6c3403] underline-offset-2 hover:underline">Change</button>
          <button type="button" onClick={() => onChange(null)} disabled={disabled} aria-label="Remove reference" className="text-stone-400 hover:text-stone-700"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} disabled={disabled || !productId} className="cs-reference-button">
          <Film className="h-4 w-4" /> Choose a reference ad
        </button>
      )}
      <p className="cs-generate-sidebar-description">Without one, the brief is built from a new concept. With one, it’s built on that ad: your own ad gets a new version, an uploaded ad is remade for this brand.</p>
      <ReferenceAdDialog open={open} onClose={() => setOpen(false)} productId={productId} clientId={clientId} selectedId={value?.id} onSelect={(ref) => { onChange(ref); setOpen(false); }} />
    </div>
  );
}

function ReferenceAdDialog({ open, onClose, productId, clientId, selectedId, onSelect }) {
  const [state, setState] = useState({ loading: false, error: null, ads: [], uploads: [] });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    if (!open || !productId) return;
    let live = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    creativeApi.getReferenceAds(productId)
      .then((response) => { if (live) setState({ loading: false, error: null, ads: response.ads || [], uploads: response.uploads || [] }); })
      .catch((error) => { if (live) setState({ loading: false, error: error.message, ads: [], uploads: [] }); });
    return () => { live = false; };
  }, [open, productId]);

  const upload = async (file) => {
    if (!file || uploading) return;
    setUploadError(null);
    if (!file.type.startsWith("video/")) { setUploadError("Upload a video file (MP4 or MOV)."); return; }
    if (file.size > MAX_VIDEO_BYTES) { setUploadError("Keep the video under 40 MB."); return; }
    if (!clientId) { setUploadError("Select an account first."); return; }
    setUploading(true);
    try {
      const dataBase64 = await readFile(file);
      const response = await creativeApi.uploadInspo({ clientId, productId, dataBase64, fileName: file.name, fileType: "video", source: "generate_brief" });
      if (!mounted.current) return;
      onSelect({ kind: "upload", id: response.fileId, name: file.name, imageUrl: null, spend: null });
    } catch (error) {
      if (mounted.current) setUploadError(error.message);
    } finally {
      if (mounted.current) setUploading(false);
    }
  };

  const empty = !state.loading && !state.error && state.ads.length === 0 && state.uploads.length === 0;
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value && !uploading) onClose(); }}>
      <DialogContent hideClose disableSlide aria-describedby={undefined} className="flex max-h-[88dvh] max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white p-0 sm:rounded-[28px]" overlayClassName="bg-black/40">
        <div className="flex items-start gap-3 px-6 pb-3 pt-6">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-lg font-semibold text-[#30150a]">Choose a reference ad</DialogTitle>
            <p className="mt-1 text-[13px] text-stone-500">Your analyzed video ads, highest spend first. The brief keeps what works in the ad you pick and changes the execution.</p>
          </div>
          <button type="button" onClick={onClose} disabled={uploading} aria-label="Close" className="cs-generate-dialog-close"><X className="h-4 w-4" /></button>
        </div>
        <ScrollArea className="min-h-0 flex-1" viewportClassName="max-h-[52dvh]">
          <div className="space-y-5 px-6 pb-4">
            {state.loading && <p className="flex items-center gap-2 py-8 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading your video ads…</p>}
            {state.error && <p className="py-6 text-sm text-red-700">{state.error}</p>}
            {empty && <p className="py-6 text-sm text-stone-500">No analyzed video ads for this product yet. Run Insights, or upload a video below.</p>}
            {state.ads.length > 0 && <div className="cs-reference-grid">
              {state.ads.map((ad) => <ReferenceCard key={ad.id} item={ad} selected={selectedId === ad.id} onSelect={() => onSelect(ad)} />)}
            </div>}
            {state.uploads.length > 0 && <section>
              <h3 className="cs-intel-subsection-title">Uploaded earlier</h3>
              <div className="cs-reference-grid mt-2">
                {state.uploads.map((item) => <ReferenceCard key={item.id} item={item} selected={selectedId === item.id} onSelect={() => onSelect(item)} />)}
              </div>
            </section>}
          </div>
        </ScrollArea>
        <div className="border-t border-stone-200 px-6 py-4">
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; upload(file); }} />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); upload(event.dataTransfer.files?.[0]); }}
            className={`cs-reference-drop ${dragging ? "is-dragging" : ""}`}
          >
            {uploading ? <><Loader2 className="h-5 w-5 animate-spin" /><span><strong>Analyzing the video…</strong> This takes about a minute.</span></>
              : <><Upload className="h-5 w-5" /><span><strong>Upload a video to use for this run</strong> MP4 or MOV, up to 40 MB. It’s transcribed and analyzed, then remade for this brand. The video itself isn’t stored.</span></>}
          </button>
          {uploadError && <p className="mt-2 text-xs text-red-700">{uploadError}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReferenceCard({ item, selected, onSelect }) {
  const stats = item.kind === "ad"
    ? [money(item.spend) && `${money(item.spend)} spend`, item.costPerPurchase ? `${money(item.costPerPurchase)} CPA` : null, item.hookRate ? `${Math.round(item.hookRate)}% hook rate` : null].filter(Boolean)
    : [item.createdAt ? `Uploaded ${new Date(item.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}` : "Uploaded"];
  return (
    <button type="button" onClick={onSelect} className={`cs-reference-card ${selected ? "is-selected" : ""}`}>
      <span className="cs-reference-card__thumb">
        {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <Film className="h-5 w-5 text-stone-400" />}
        {selected && <span className="cs-reference-card__check"><Check className="h-3.5 w-3.5" /></span>}
      </span>
      <span className="min-w-0 flex-1 space-y-1 text-left">
        <span className="block truncate text-[13px] font-semibold text-stone-800" title={item.name}>{item.name}</span>
        <span className="block text-[11px] text-stone-500">{stats.join(" · ")}</span>
        {item.angle && <span className="block text-[12px] text-stone-600"><strong className="font-semibold text-stone-700">Angle:</strong> {item.angle}</span>}
        {item.hook && <span className="line-clamp-2 block text-[12px] text-stone-600"><strong className="font-semibold text-stone-700">Hook:</strong> “{item.hook}”</span>}
      </span>
    </button>
  );
}

ReferenceAdField.propTypes = { value: PropTypes.object, onChange: PropTypes.func.isRequired, productId: PropTypes.string, clientId: PropTypes.string, disabled: PropTypes.bool };
ReferenceAdDialog.propTypes = { open: PropTypes.bool.isRequired, onClose: PropTypes.func.isRequired, productId: PropTypes.string, clientId: PropTypes.string, selectedId: PropTypes.string, onSelect: PropTypes.func.isRequired };
ReferenceCard.propTypes = { item: PropTypes.object.isRequired, selected: PropTypes.bool, onSelect: PropTypes.func.isRequired };
