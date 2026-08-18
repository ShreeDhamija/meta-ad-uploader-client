/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from "react";
import { FileText, Link2, Loader2, Play, RotateCcw, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import AdSetIcon from "@/assets/icons/grid.svg?react";
import CampaignIcon from "@/assets/icons/folder.svg?react";
import CTAIcon from "@/assets/icons/cta.svg?react";
import FacebookIcon from "@/assets/icons/fb.svg?react";
import InstagramIcon from "@/assets/icons/ig.svg?react";
import LabelIcon from "@/assets/icons/label.svg?react";
import LinkIcon from "@/assets/icons/link.svg?react";
import TemplateIcon from "@/assets/icons/file.svg?react";
import {
  createDraftShareUrl,
  deleteDraft,
  getDraft,
  listDrafts,
} from "@/lib/draftApi";
import { getCreativeUnitsForForm } from "@/lib/draftCreativeLayout";

const MEDIA_FALLBACK_URL = "https://api.withblip.com/thumbnail.jpg";
const COPY_PREVIEW_LIMIT = 200;

function ExpandableText({ text }) {
  const [expanded, setExpanded] = useState(false);
  const value = String(text || "");
  const isLong = value.length > COPY_PREVIEW_LIMIT;
  const displayed = !expanded && isLong ? `${value.slice(0, COPY_PREVIEW_LIMIT).trimEnd()}…` : value;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
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
    </div>
  );
}

function FieldLabel({ icon, children }) {
  return (
    <span className="mb-0.5 flex items-center gap-1.5 text-sm text-gray-500">
      {icon}
      {children}
    </span>
  );
}

function DetailField({ label, icon, children, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt><FieldLabel icon={icon}>{label}</FieldLabel></dt>
      <dd className="min-w-0 break-words text-sm font-semibold leading-5 text-gray-950 [overflow-wrap:anywhere]">{children || "—"}</dd>
    </div>
  );
}

function FormSection({ children, divided = false, className = "" }) {
  return (
    <div className={`${divided ? "border-t border-gray-200 pt-5" : ""} ${className}`}>
      {children}
    </div>
  );
}

function getMediaAspectRatio(media) {
  const width = Number(media?.width ?? media?.metadata?.width ?? media?.dimensions?.width);
  const height = Number(media?.height ?? media?.metadata?.height ?? media?.dimensions?.height);

  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    return `${width} / ${height}`;
  }

  const rawRatio = media?.aspectRatio ?? media?.metadata?.aspectRatio;
  if (Number.isFinite(Number(rawRatio)) && Number(rawRatio) > 0) return String(rawRatio);
  if (typeof rawRatio === "string") {
    const match = rawRatio.match(/^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/);
    if (match && Number(match[1]) > 0 && Number(match[2]) > 0) {
      return `${match[1]} / ${match[2]}`;
    }
  }

  return null;
}

function MediaThumbnail({ media }) {
  const isVideo = (media.mimeType || "").startsWith("video/");
  const previewUrl = media.deletedAt ? MEDIA_FALLBACK_URL : media.previewUrl;
  const savedAspectRatio = getMediaAspectRatio(media);
  const [detectedAspectRatio, setDetectedAspectRatio] = useState(null);
  const aspectRatio = savedAspectRatio || detectedAspectRatio || "1 / 1";

  const detectAspectRatio = (width, height) => {
    if (!savedAspectRatio && width > 0 && height > 0) {
      setDetectedAspectRatio(`${width} / ${height}`);
    }
  };

  return (
    <figure className="min-w-0">
      <div
        className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
        style={{ aspectRatio }}
      >
        {isVideo && !previewUrl ? (
          <video
            src={media.url}
            poster={MEDIA_FALLBACK_URL}
            preload="metadata"
            muted
            className="h-full w-full object-cover"
            onLoadedMetadata={(event) => {
              detectAspectRatio(event.currentTarget.videoWidth, event.currentTarget.videoHeight);
            }}
            onError={(event) => {
              event.currentTarget.poster = MEDIA_FALLBACK_URL;
              event.currentTarget.removeAttribute("src");
              event.currentTarget.load();
            }}
          />
        ) : (
          <img
            src={isVideo
              ? previewUrl || media.url || MEDIA_FALLBACK_URL
              : media.url || previewUrl || MEDIA_FALLBACK_URL}
            alt={media.name || "Draft media"}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onLoad={(event) => {
              detectAspectRatio(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
            }}
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

function getDraftTimestamp(draft) {
  const value = draft?.updatedAt || draft?.createdAt;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  if (typeof value?._seconds === "number") return value._seconds * 1000;
  if (typeof value === "number") return value;
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function CreativeUnit({ unit, groupIndex }) {
  const grouped = unit.type === "group";
  const groupColor = groupIndex % 2 === 0
    ? "border-blue-300 bg-blue-100"
    : "border-orange-300 bg-orange-100";

  return (
    <div className={`min-w-0 ${
      grouped ? `col-span-2 rounded-2xl border p-2 ${groupColor}` : ""
    }`}>
      <div className={`grid gap-2 ${unit.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {unit.media.map((media) => (
          <MediaThumbnail key={media.id} media={media} />
        ))}
      </div>
    </div>
  );
}

function FormPreview({
  draftName,
  form,
  forms,
  activeFormIndex,
  onActiveFormChange,
  mediaById,
  state,
  actions,
}) {
  const values = form?.values || {};
  const labels = values.selectionLabels || {};
  const creativeUnits = getCreativeUnitsForForm(state, form, mediaById);
  const groupIndexByKey = new Map(
    (state?.mediaLayout?.fileGroups || []).map((group, index) => [
      Array.isArray(group) || !group?.id ? `group-${index}` : String(group.id),
      index,
    ])
  );
  let nextVisibleGroupIndex = 0;
  const indexedCreativeUnits = creativeUnits.map((unit) => {
    if (unit.type !== "group") return { unit, groupIndex: -1 };
    const fallbackIndex = nextVisibleGroupIndex;
    nextVisibleGroupIndex += 1;
    return {
      unit,
      groupIndex: groupIndexByKey.get(unit.groupKey) ?? fallbackIndex,
    };
  });
  const messages = values.messages?.filter(Boolean) || [];
  const headlines = values.headlines?.filter(Boolean) || [];
  const descriptions = values.descriptions?.filter(Boolean) || [];
  const links = values.link?.filter(Boolean) || [];
  const adNameFormula = values.adNameFormulaV2?.rawInput?.trim();

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden px-8 pt-5">
      <div className="mb-4 flex min-h-9 shrink-0 items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <h2 className="min-w-0 truncate text-lg font-semibold leading-9 text-gray-950" title={draftName}>
            {draftName || "Untitled draft"}
          </h2>
          {forms.length > 1 && (
            <ScrollArea className="h-9 min-w-0 max-w-sm flex-1">
              <div className="flex w-max gap-1 pb-2 pr-2">
                {forms.map((variantForm, index) => (
                  <button
                    key={variantForm.id || index}
                    type="button"
                    onClick={() => onActiveFormChange(index)}
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
            </ScrollArea>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center justify-end gap-3">
          {actions}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] gap-6 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-col">
          <ScrollArea className="min-h-0 min-w-0 flex-1">
            <dl className="min-w-0 pr-8">
            <DetailField
              label={adNameFormula ? "Ad Name Formula" : "Ad Name"}
              icon={<LabelIcon className="h-4 w-4" />}
              className="pb-5"
            >
              {adNameFormula || values.adName}
            </DetailField>
            <FormSection divided>
              <div className="grid grid-cols-2 gap-6">
                <DetailField label="Campaign" icon={<CampaignIcon className="h-4 w-4" />}>
                  {labels.campaigns?.map((item) => item.name).join(", ") || labels.duplicateCampaignName || "—"}
                </DetailField>
                <DetailField label="Ad Set" icon={<AdSetIcon className="h-4 w-4" />}>
                  {labels.adSets?.map((item) => item.name).join(", ") || labels.duplicateAdSetName || "—"}
                </DetailField>
              </div>
            </FormSection>
            <FormSection divided className="mt-5">
              <div className="grid grid-cols-2 gap-6">
                <DetailField label="Facebook Page" icon={<FacebookIcon className="h-4 w-4" />}>
                  {labels.page?.name || values.pageId || "—"}
                </DetailField>
                <DetailField label="Instagram Account" icon={<InstagramIcon className="h-4 w-4" />}>
                  {labels.instagramAccount?.name || values.instagramAccountId || "—"}
                </DetailField>
              </div>
              {values.isPartnershipAd && (
                <DetailField className="mt-5" label="Partner" icon={<Users className="h-4 w-4" />}>
                  {labels.partnerName || values.partnerIgAccountId || "—"}
                </DetailField>
              )}
            </FormSection>
            <FormSection divided className="mt-5 space-y-4">
              {messages.length > 0 ? messages.map((message, index) => (
                <div key={`message-${index}`}>
                  <dt>
                    <FieldLabel icon={<TemplateIcon className="h-4 w-4" />}>
                      Primary Text {messages.length > 1 ? index + 1 : ""}
                    </FieldLabel>
                  </dt>
                  <dd><ExpandableText text={message} /></dd>
                </div>
              )) : (
                <div>
                  <dt><FieldLabel icon={<TemplateIcon className="h-4 w-4" />}>Primary Text</FieldLabel></dt>
                  <dd><ExpandableText text="" /></dd>
                </div>
              )}
              {headlines.length > 0 ? headlines.map((headline, index) => (
                <div key={`headline-${index}`}>
                  <dt>
                    <FieldLabel icon={<TemplateIcon className="h-4 w-4" />}>
                      Headline {headlines.length > 1 ? index + 1 : ""}
                    </FieldLabel>
                  </dt>
                  <dd><ExpandableText text={headline} /></dd>
                </div>
              )) : (
                <div>
                  <dt><FieldLabel icon={<TemplateIcon className="h-4 w-4" />}>Headline</FieldLabel></dt>
                  <dd><ExpandableText text="" /></dd>
                </div>
              )}
              {descriptions.map((description, index) => (
                <div key={`description-${index}`}>
                  <dt>
                    <FieldLabel icon={<TemplateIcon className="h-4 w-4" />}>
                      Description {descriptions.length > 1 ? index + 1 : ""}
                    </FieldLabel>
                  </dt>
                  <dd><ExpandableText text={description} /></dd>
                </div>
              ))}
            </FormSection>
            <FormSection divided className="mt-5 grid grid-cols-2 gap-6 pb-6">
              <DetailField label="Link" icon={<LinkIcon className="h-4 w-4" />}>
                {links.length > 0 ? links.map((item, index) => (
                  <span key={`${item}-${index}`} className="block break-all">{item}</span>
                )) : "—"}
              </DetailField>
              <DetailField label="CTA" icon={<CTAIcon className="h-4 w-4" />}>{values.cta}</DetailField>
            </FormSection>
            </dl>
          </ScrollArea>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col border-l border-gray-200 pl-6">
          <ScrollArea className="min-h-0 min-w-0 flex-1 pr-2">
            {creativeUnits.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                {indexedCreativeUnits.map(({ unit, groupIndex }) => (
                  <CreativeUnit key={unit.id} unit={unit} groupIndex={groupIndex} />
                ))}
              </div>
            ) : (
              <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 text-center text-sm text-gray-500">
                No media saved for this variant.
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </section>
  );
}

export default function DraftsModal({ open, onOpenChange, adAccountId, adAccountName, onRestore }) {
  const [drafts, setDrafts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [activeFormIndex, setActiveFormIndex] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [working, setWorking] = useState(false);
  const [qaUrl, setQaUrl] = useState("");
  const [selectedDraftIds, setSelectedDraftIds] = useState(() => new Set());

  const refresh = useCallback(async () => {
    if (!open || !adAccountId) return;
    setLoadingList(true);
    try {
      const next = [...await listDrafts(adAccountId)]
        .sort((left, right) => getDraftTimestamp(right) - getDraftTimestamp(left));
      setDrafts(next);
      setSelectedId(next[0]?.id || null);
      setSelectedDraftIds((current) => {
        const availableIds = new Set(next.map((draft) => draft.id));
        return new Set([...current].filter((id) => availableIds.has(id)));
      });
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
    if (open) return;
    setSelectedDraftIds(new Set());
  }, [open]);

  useEffect(() => {
    if (!open || !adAccountId || !selectedId) {
      setSelectedDraft(null);
      if (!open) setSelectedId(null);
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

  const toggleDraftSelection = (draftId) => {
    setSelectedDraftIds((current) => {
      const next = new Set(current);
      if (next.has(draftId)) next.delete(draftId);
      else next.add(draftId);
      return next;
    });
  };

  const handleSelectAllDrafts = (checked) => {
    setSelectedDraftIds(checked ? new Set(drafts.map((draft) => draft.id)) : new Set());
  };

  const handleBulkDelete = async () => {
    const selectedDrafts = drafts.filter((draft) => selectedDraftIds.has(draft.id));
    if (selectedDrafts.length === 0 || working) return;

    const label = selectedDrafts.length === 1 ? "draft" : "drafts";
    const linkWarning = selectedDrafts.length === 1
      ? "Its QA link will stop working."
      : "Their QA links will stop working.";
    if (!window.confirm(`Delete ${selectedDrafts.length} ${label}? ${linkWarning}`)) return;

    setWorking(true);
    const deletedIds = new Set();
    const failedIds = new Set();
    try {
      for (const draft of selectedDrafts) {
        try {
          await deleteDraft({ draftId: draft.id, adAccountId });
          deletedIds.add(draft.id);
        } catch {
          failedIds.add(draft.id);
        }
      }

      if (deletedIds.has(selectedId)) setSelectedDraft(null);

      if (failedIds.size === 0) {
        toast.success(`${deletedIds.size} ${deletedIds.size === 1 ? "draft" : "drafts"} deleted`);
        setSelectedDraftIds(new Set());
      } else {
        setSelectedDraftIds(failedIds);
        if (deletedIds.size > 0) {
          toast.error(`${deletedIds.size} deleted, but ${failedIds.size} could not be deleted`);
        } else {
          toast.error(`Could not delete ${failedIds.size === 1 ? "the selected draft" : "the selected drafts"}`);
        }
      }

      await refresh();
    } finally {
      setWorking(false);
    }
  };

  const forms = selectedDraft?.state?.forms || [];
  const activeForm = forms[activeFormIndex] || forms[0];
  const mediaById = new Map((selectedDraft?.media || []).map((media) => [media.id, media]));
  const allDraftsSelected = drafts.length > 0 && selectedDraftIds.size === drafts.length;
  const someDraftsSelected = selectedDraftIds.size > 0 && !allDraftsSelected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        disableSlide
        overlayClassName="bg-gray-950/20"
        className="h-[86vh] max-h-[860px] max-w-[96vw] grid-cols-[220px_minmax(0,1fr)] gap-0 overflow-hidden !rounded-[48px] border-gray-200 bg-white p-0 sm:!rounded-[48px] xl:max-w-7xl"
      >
        <aside className="min-h-0 overflow-hidden border-r border-gray-200 bg-[#f4f4f4]">
          <div className="h-full overflow-y-auto overflow-x-hidden">
            <div className="min-w-0 px-4 py-7">
              <div className="min-w-0 px-3">
                <DialogTitle className="text-2xl font-bold tracking-tight text-gray-950">Drafts</DialogTitle>
                <p className="mt-1 min-w-0 text-[11px] leading-4 text-gray-500">
                  <span className="block truncate" title={adAccountName || "Ad account"}>
                    {adAccountName || "Ad account"}
                  </span>
                  <span className="block break-all" title={String(adAccountId || "")}>
                    {adAccountId || "No account selected"}
                  </span>
                </p>
              </div>
              <div className="mt-3.5">
            {loadingList ? (
              <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-gray-500" />
            ) : drafts.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500">No drafts saved for this ad account.</p>
            ) : (
              <>
                <div className="mb-2 flex min-w-0 items-center justify-between gap-2 px-3 pb-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <Checkbox
                      id="select-all-drafts"
                      checked={allDraftsSelected ? true : someDraftsSelected ? "indeterminate" : false}
                      onCheckedChange={handleSelectAllDrafts}
                      disabled={working}
                      className="border-gray-400 bg-white data-[state=checked]:border-gray-900 data-[state=checked]:bg-gray-900 data-[state=indeterminate]:border-gray-900 data-[state=indeterminate]:bg-gray-900"
                    />
                    <label htmlFor="select-all-drafts" className="cursor-pointer text-xs font-medium text-gray-600">
                      {allDraftsSelected ? "Unselect all" : "Select all"}
                    </label>
                  </div>
                  {selectedDraftIds.size > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={working}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white transition hover:bg-red-700 disabled:opacity-50"
                      aria-label={`Delete ${selectedDraftIds.size} selected ${selectedDraftIds.size === 1 ? "draft" : "drafts"}`}
                      title="Delete selected drafts"
                    >
                      {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                {drafts.map((draft) => {
                  const isBulkSelected = selectedDraftIds.has(draft.id);
                  return (
                    <div
                      key={draft.id}
                      className={`mb-1.5 flex min-w-0 max-w-full items-center overflow-hidden rounded-2xl border transition ${
                        isBulkSelected
                          ? "border-red-200 bg-red-50"
                          : selectedId === draft.id
                            ? "border-gray-200 bg-white shadow-sm"
                            : "border-transparent hover:bg-white/70"
                      }`}
                    >
                      <Checkbox
                        checked={isBulkSelected}
                        onCheckedChange={() => toggleDraftSelection(draft.id)}
                        disabled={working}
                        aria-label={`Select ${draft.name}`}
                        className="ml-3 border-gray-400 bg-white data-[state=checked]:border-gray-900 data-[state=checked]:bg-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedId(draft.id)}
                        className="min-w-0 flex-1 px-3 py-3 text-left"
                      >
                        <span className="block truncate text-sm font-semibold text-gray-950">{draft.name}</span>
                        {draft.formCount > 1 && (
                          <span className="mt-0.5 block text-sm font-normal text-gray-500">
                            {draft.formCount} variants
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </>
            )}
              </div>
            </div>
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
            <FormPreview
              draftName={selectedDraft.name}
              form={activeForm}
              forms={forms}
              activeFormIndex={activeFormIndex}
              onActiveFormChange={setActiveFormIndex}
              mediaById={mediaById}
              state={selectedDraft.state}
              actions={(
                <>
                  <Button
                    type="button"
                    onClick={handleRestore}
                    disabled={working}
                    className="h-9 min-w-36 rounded-xl bg-gray-800 px-4 text-sm text-white hover:bg-blue-700"
                  >
                    <RotateCcw className="mr-1 h-4 w-4" /> Restore Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={handleShare}
                    disabled={working}
                    className="h-9 min-w-36 rounded-xl bg-blue-600 px-4 text-sm text-white hover:bg-blue-700"
                  >
                    <Link2 className="mr-1 h-3.5 w-3.5" /> Copy Preview Link
                  </Button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={working}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    aria-label={`Delete ${selectedDraft.name}`}
                    title="Delete draft"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </>
              )}
            />
          )}
        </main>
      </DialogContent>
    </Dialog>
  );
}
