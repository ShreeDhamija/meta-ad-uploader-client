/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, RotateCcw, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  createDraftShareUrl,
  deleteDraft,
  getDraft,
  listDrafts,
} from "@/lib/draftApi";

const MEDIA_FALLBACK_URL = "https://api.withblip.com/thumbnail.jpg";

function getGroupFileIds(group) {
  return Array.isArray(group) ? group : group?.fileIds || [];
}

function FormPreview({ form, index, mediaById, state }) {
  const values = form?.values || {};
  const labels = values.selectionLabels || {};
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
  const visibleMedia = mediaItems
    .filter((item) => assignedKeys.has(item.originalKey))
    .map((item) => mediaById.get(item.mediaId))
    .filter(Boolean);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-950">Launch form {index + 1}</h3>
        <span className="text-xs text-gray-500">{visibleMedia.length} media</span>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-xs text-gray-500">Ad name</dt>
          <dd>{values.adName || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Campaign</dt>
          <dd>{labels.campaigns?.map((item) => item.name).join(", ") || labels.duplicateCampaignName || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Ad set</dt>
          <dd>{labels.adSets?.map((item) => item.name).join(", ") || labels.duplicateAdSetName || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-gray-500">Primary text</dt>
          <dd className="whitespace-pre-wrap">{values.messages?.filter(Boolean).join(" · ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Headline</dt>
          <dd>{values.headlines?.filter(Boolean).join(" · ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">CTA</dt>
          <dd>{values.cta || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Facebook page</dt>
          <dd>{labels.page?.name || values.pageId || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Instagram account</dt>
          <dd>{labels.instagramAccount?.name || values.instagramAccountId || "—"}</dd>
        </div>
        {values.isPartnershipAd && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500">Partner</dt>
            <dd>{labels.partnerName || values.partnerIgAccountId || "—"}</dd>
          </div>
        )}
      </dl>
      {visibleMedia.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {visibleMedia.slice(0, 8).map((media) => (
            <div key={media.id} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              {(media.mimeType || "").startsWith("video/") ? (
                <video
                  src={media.deletedAt ? undefined : media.url}
                  poster={media.deletedAt ? MEDIA_FALLBACK_URL : media.previewUrl}
                  preload="metadata"
                  className="aspect-square h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.poster = MEDIA_FALLBACK_URL;
                    event.currentTarget.removeAttribute("src");
                    event.currentTarget.load();
                  }}
                />
              ) : (
                <img
                  src={media.deletedAt ? MEDIA_FALLBACK_URL : media.previewUrl}
                  alt={media.name}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = MEDIA_FALLBACK_URL;
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DraftsModal({ open, onOpenChange, adAccountId, onRestore }) {
  const [drafts, setDrafts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDraft, setSelectedDraft] = useState(null);
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
  const mediaById = new Map((selectedDraft?.media || []).map((media) => [media.id, media]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-5xl overflow-hidden rounded-3xl bg-white p-0">
        <DialogHeader className="border-b border-gray-200 px-6 py-4">
          <DialogTitle>Drafts</DialogTitle>
        </DialogHeader>
        <div className="grid min-h-[560px] grid-cols-[220px_1fr] overflow-hidden">
          <aside className="overflow-y-auto border-r border-gray-200 bg-gray-50 p-3">
            {loadingList ? (
              <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-gray-500" />
            ) : drafts.length === 0 ? (
              <p className="p-3 text-sm text-gray-500">No drafts saved for this ad account.</p>
            ) : drafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => setSelectedId(draft.id)}
                className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left text-sm ${
                  selectedId === draft.id ? "bg-white font-semibold shadow-sm" : "hover:bg-white/70"
                }`}
              >
                <span className="block truncate">{draft.name}</span>
                <span className="mt-0.5 block text-xs font-normal text-gray-500">
                  {draft.formCount} launch form{draft.formCount === 1 ? "" : "s"}
                </span>
              </button>
            ))}
          </aside>
          <main className="flex min-w-0 flex-col overflow-hidden">
            {loadingDraft ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : !selectedDraft ? (
              <div className="flex flex-1 flex-col items-center justify-center text-gray-500">
                <FileText className="mb-2 h-8 w-8" />
                <p>Select a draft to preview it.</p>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  <h2 className="text-lg font-semibold">{selectedDraft.name}</h2>
                  {forms.map((form, index) => (
                    <FormPreview
                      key={form.id || index}
                      form={form}
                      index={index}
                      mediaById={mediaById}
                      state={selectedDraft.state}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 border-t border-gray-200 p-4">
                  <Button type="button" onClick={handleRestore} disabled={working} className="rounded-xl bg-black text-white">
                    <RotateCcw className="mr-2 h-4 w-4" /> Restore to form
                  </Button>
                  <Button type="button" onClick={handleShare} disabled={working} variant="outline" className="rounded-xl">
                    <Share2 className="mr-2 h-4 w-4" /> {qaUrl ? "Copy QA URL" : "Create QA URL"}
                  </Button>
                  <Button type="button" onClick={handleDelete} disabled={working} variant="ghost" className="ml-auto rounded-xl text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </>
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
