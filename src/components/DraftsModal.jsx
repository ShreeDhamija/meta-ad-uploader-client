/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Play, RotateCcw, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  createDraftShareUrl,
  deleteDraft,
  getDraft,
  listDrafts,
} from "@/lib/draftApi";

const MEDIA_FALLBACK_URL = "https://api.withblip.com/thumbnail.jpg";
const COPY_PREVIEW_LIMIT = 200;

function getGroupFileIds(group) {
  return Array.isArray(group) ? group : group?.fileIds || [];
}

function ExpandableText({ text }) {
  const [expanded, setExpanded] = useState(false);
  const value = String(text || "");
  const isLong = value.length > COPY_PREVIEW_LIMIT;
  const displayed = !expanded && isLong ? `${value.slice(0, COPY_PREVIEW_LIMIT).trimEnd()}…` : value;

  return (
    <p className="whitespace-pre-wrap break-words text-sm font-medium leading-5 text-gray-950">
      {displayed || "—"}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="ml-1 whitespace-nowrap text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          {expanded ? "View less" : "View more"}
        </button>
      )}
    </p>
  );
}

function DetailField({ label, children, className = "" }) {
  return (
    <div className={className}>
      <dt className="mb-0.5 text-sm text-gray-500">{label}</dt>
      <dd className="break-words text-sm font-semibold leading-5 text-gray-950">{children || "—"}</dd>
    </div>
  );
}

function getVisibleMedia(form, mediaById, state) {
  const mediaItems = state.mediaLayout?.items || [];
  const fileGroups = state.mediaLayout?.fileGroups || [];
  const groupedKeys = new Set(fileGroups.flatMap(getGroupFileIds));
  const assignedKeys = new Set();
  const formId = form.id || "default";
  const groupVariantMap = state.mediaLayout?.groupVariantMap || {};
  const fileVariantMap = state.mediaLayout?.fileVariantMap || {};
  const postVariantMap = state.mediaLayout?.postVariantMap || {};

  if (mediaItems.length <= 1) {
    mediaItems.forEach((item) => assignedKeys.add(item.originalKey));
  } else {
    fileGroups.forEach((group) => {
      const groupId = Array.isArray(group) ? null : group.id;
      if ((groupId ? groupVariantMap[groupId] || "default" : "default") === formId) {
        getGroupFileIds(group).forEach((key) => assignedKeys.add(key));
      }
    });
    mediaItems.forEach((item) => {
      if (groupedKeys.has(item.originalKey)) return;
      const map = item.originalKey.startsWith("post:") || item.originalKey.startsWith("igpost:")
        ? postVariantMap
        : fileVariantMap;
      if ((map[item.originalKey] || "default") === formId) assignedKeys.add(item.originalKey);
    });
  }

  return mediaItems
    .filter((item) => assignedKeys.has(item.originalKey))
    .map((item) => mediaById.get(item.mediaId))
    .filter(Boolean);
}

function MediaThumbnail({ media }) {
  const isVideo = (media.mimeType || "").startsWith("video/");
  const previewUrl = media.deletedAt ? MEDIA_FALLBACK_URL : media.previewUrl;

  return (
    <figure className="min-w-0">
      <div className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
        {isVideo && !previewUrl ? (
          <video
            src={media.url}
            poster={MEDIA_FALLBACK_URL}
            preload="metadata"
            muted
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.poster = MEDIA_FALLBACK_URL;
              event.currentTarget.removeAttribute("src");
              event.currentTarget.load();
            }}
          />
        ) : (
          <img
            src={previewUrl || media.url || MEDIA_FALLBACK_URL}
            alt={media.name || "Draft media"}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = MEDIA_FALLBACK_URL;
            }}
          />
        )}
        {isVideo && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/5">
            <span className="rounded-full bg-black/55 p-2 text-white shadow-sm">
              <Play className="h-4 w-4 fill-current" />
            </span>
          </span>
        )}
      </div>
      <figcaption className="mt-1.5 truncate text-sm text-gray-500" title={media.name || "Untitled media"}>
        {media.name || "Untitled media"}
      </figcaption>
    </figure>
  );
}

function FormPreview({ form, mediaById, state }) {
  const values = form?.values || {};
  const labels = values.selectionLabels || {};
  const visibleMedia = getVisibleMedia(form, mediaById, state);
  const messages = values.messages?.filter(Boolean) || [];
  const headlines = values.headlines?.filter(Boolean) || [];
  const links = values.link?.filter(Boolean) || [];

  return (
    <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.05fr)_minmax(300px,0.85fr)] gap-8 overflow-hidden px-8 pb-8">
      <dl className="min-w-0 space-y-5 overflow-y-auto pr-2">
        <DetailField label="Ad Name">{values.adName}</DetailField>
        <div className="grid grid-cols-2 gap-6">
          <DetailField label="Campaign">
            {labels.campaigns?.map((item) => item.name).join(", ") || labels.duplicateCampaignName || "—"}
          </DetailField>
          <DetailField label="Ad Set">
            {labels.adSets?.map((item) => item.name).join(", ") || labels.duplicateAdSetName || "—"}
          </DetailField>
        </div>
        {messages.length > 0 ? messages.map((message, index) => (
          <div key={`message-${index}`}>
            <dt className="mb-0.5 text-sm text-gray-500">Primary Text {messages.length > 1 ? index + 1 : ""}</dt>
            <dd><ExpandableText text={message} /></dd>
          </div>
        )) : <DetailField label="Primary Text">—</DetailField>}
        {headlines.length > 0 ? headlines.map((headline, index) => (
          <div key={`headline-${index}`}>
            <dt className="mb-0.5 text-sm text-gray-500">Headline {headlines.length > 1 ? index + 1 : ""}</dt>
            <dd><ExpandableText text={headline} /></dd>
          </div>
        )) : <DetailField label="Headline">—</DetailField>}
        <DetailField label="Link">
          {links.length > 0 ? links.map((item, index) => (
            <span key={`${item}-${index}`} className="block break-all">{item}</span>
          )) : "—"}
        </DetailField>
        <DetailField label="CTA">{values.cta}</DetailField>
        <div className="grid grid-cols-2 gap-6">
          <DetailField label="Facebook Page">{labels.page?.name || values.pageId || "—"}</DetailField>
          <DetailField label="Instagram Account">
            {labels.instagramAccount?.name || values.instagramAccountId || "—"}
          </DetailField>
        </div>
        {values.isPartnershipAd && (
          <DetailField label="Partner">{labels.partnerName || values.partnerIgAccountId || "—"}</DetailField>
        )}
      </dl>

      <div className="min-h-0 overflow-y-auto pr-2">
        {visibleMedia.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            {visibleMedia.map((media) => <MediaThumbnail key={media.id} media={media} />)}
          </div>
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
            No media saved for this variant.
          </div>
        )}
      </div>
    </section>
  );
}

export default function DraftsModal({ open, onOpenChange, adAccountId, onRestore }) {
  const [drafts, setDrafts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [activeFormIndex, setActiveFormIndex] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [working, setWorking] = useState(false);
  const [qaUrl, setQaUrl] = useState("");

  const refresh = useCallback(async () => {
    if (!open || !adAccountId) return;
    setLoadingList(true);
    try {
      const next = await listDrafts(adAccountId);
      setDrafts(next);
      setSelectedId((current) => current && next.some((draft) => draft.id === current)
        ? current
        : next[0]?.id || null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingList(false);
    }
  }, [adAccountId, open]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open || !adAccountId || !selectedId) {
      setSelectedDraft(null);
      return;
    }
    let cancelled = false;
    setQaUrl("");
    setActiveFormIndex(0);
    setLoadingDraft(true);
    getDraft({ draftId: selectedId, adAccountId })
      .then((draft) => {
        if (!cancelled) {
          setSelectedDraft(draft);
          setQaUrl(draft.qaUrl || "");
        }
      })
      .catch((error) => {
        if (!cancelled) toast.error(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingDraft(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adAccountId, open, selectedId]);

  const handleRestore = async () => {
    if (!selectedDraft) return;
    setWorking(true);
    try {
      await onRestore(selectedDraft);
      toast.success("Draft restored");
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setWorking(false);
    }
  };

  const handleShare = async () => {
    if (!selectedDraft) return;
    setWorking(true);
    try {
      const url = qaUrl || await createDraftShareUrl({ draftId: selectedDraft.id, adAccountId });
      if (!qaUrl) setQaUrl(url);
      await navigator.clipboard.writeText(url);
      toast.success("QA link copied");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDraft || !window.confirm(`Delete "${selectedDraft.name}"? Its QA link will stop working.`)) return;
    setWorking(true);
    try {
      await deleteDraft({ draftId: selectedDraft.id, adAccountId });
      toast.success("Draft deleted");
      setSelectedDraft(null);
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setWorking(false);
    }
  };

  const forms = selectedDraft?.state?.forms || [];
  const activeForm = forms[activeFormIndex] || forms[0];
  const mediaById = new Map((selectedDraft?.media || []).map((media) => [media.id, media]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        disableSlide
        className="h-[86vh] max-h-[860px] max-w-[96vw] grid-cols-[260px_minmax(0,1fr)] gap-0 overflow-hidden rounded-[32px] border-gray-200 bg-white p-0 xl:max-w-7xl"
      >
        <aside className="min-h-0 overflow-y-auto border-r border-gray-200 bg-[#f4f4f4] px-4 py-7">
          <DialogTitle className="px-3 text-2xl font-bold tracking-tight text-gray-950">Drafts</DialogTitle>
          <div className="mt-7">
            {loadingList ? (
              <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-gray-500" />
            ) : drafts.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500">No drafts saved for this ad account.</p>
            ) : drafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => setSelectedId(draft.id)}
                className={`mb-2 w-full rounded-2xl px-4 py-3 text-left transition ${
                  selectedId === draft.id
                    ? "border border-gray-200 bg-white shadow-sm"
                    : "border border-transparent hover:bg-white/70"
                }`}
              >
                <span className="block truncate text-sm font-semibold text-gray-950">{draft.name}</span>
                <span className="mt-0.5 block text-sm font-normal text-gray-500">
                  {draft.formCount} variant{draft.formCount === 1 ? "" : "s"}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          {loadingDraft ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : !selectedDraft || !activeForm ? (
            <div className="flex flex-1 flex-col items-center justify-center text-gray-500">
              <FileText className="mb-2 h-8 w-8" />
              <p>Select a draft to preview it.</p>
            </div>
          ) : (
            <>
              <header className="flex shrink-0 items-center gap-3 px-8 py-5">
                <div className="mr-auto min-w-0">
                  <h2 className="truncate text-lg font-semibold text-gray-950">{selectedDraft.name}</h2>
                  {forms.length > 1 && (
                    <div className="mt-2 flex max-w-lg gap-1 overflow-x-auto pb-1">
                      {forms.map((form, index) => (
                        <button
                          key={form.id || index}
                          type="button"
                          onClick={() => setActiveFormIndex(index)}
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                            activeFormIndex === index
                              ? "bg-gray-950 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          Variant {index + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={handleRestore}
                  disabled={working}
                  className="h-11 min-w-40 rounded-xl bg-gray-800 px-5 text-white hover:bg-blue-700"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Restore Draft
                </Button>
                <Button
                  type="button"
                  onClick={handleShare}
                  disabled={working}
                  className="h-11 min-w-40 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700"
                >
                  <Share2 className="mr-2 h-4 w-4" /> {qaUrl ? "Copy QA Link" : "Share QA Link"}
                </Button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={working}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  aria-label={`Delete ${selectedDraft.name}`}
                  title="Delete draft"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </header>
              <FormPreview form={activeForm} mediaById={mediaById} state={selectedDraft.state} />
            </>
          )}
        </main>
      </DialogContent>
    </Dialog>
  );
}
