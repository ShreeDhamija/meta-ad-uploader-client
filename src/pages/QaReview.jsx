/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { getQaDraft } from "@/lib/draftApi";

const MEDIA_FALLBACK_URL = "https://api.withblip.com/thumbnail.jpg";

function getGroupFileIds(group) {
  return Array.isArray(group) ? group : group?.fileIds || [];
}

function mediaForForm(state, form, mediaById) {
  const items = state.mediaLayout?.items || [];
  if (items.length <= 1) return items.map((item) => mediaById.get(item.mediaId)).filter(Boolean);

  const fileGroups = state.mediaLayout?.fileGroups || [];
  const groupedKeys = new Set(fileGroups.flatMap(getGroupFileIds));
  const groupVariantMap = state.mediaLayout?.groupVariantMap || {};
  const fileVariantMap = state.mediaLayout?.fileVariantMap || {};
  const postVariantMap = state.mediaLayout?.postVariantMap || {};
  const formId = form.id || "default";
  const assignedKeys = new Set();

  fileGroups.forEach((group) => {
    const groupId = Array.isArray(group) ? null : group.id;
    const assigned = groupId ? groupVariantMap[groupId] || "default" : "default";
    if (assigned === formId) getGroupFileIds(group).forEach((key) => assignedKeys.add(key));
  });
  items.forEach((item) => {
    if (groupedKeys.has(item.originalKey)) return;
    const assignmentMap = item.originalKey.startsWith("post:") || item.originalKey.startsWith("igpost:")
      ? postVariantMap
      : fileVariantMap;
    if ((assignmentMap[item.originalKey] || "default") === formId) {
      assignedKeys.add(item.originalKey);
    }
  });
  return items
    .filter((item) => assignedKeys.has(item.originalKey))
    .map((item) => mediaById.get(item.mediaId))
    .filter(Boolean);
}

function ReviewMedia({ media, priority = false }) {
  const isVideo = (media.mimeType || "").startsWith("video/");
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
      {isVideo ? (
        <video
          controls={!media.deletedAt}
          preload="metadata"
          poster={media.deletedAt ? MEDIA_FALLBACK_URL : media.previewUrl}
          className="aspect-[4/5] w-full bg-black object-contain"
          onError={(event) => {
            event.currentTarget.poster = MEDIA_FALLBACK_URL;
            event.currentTarget.removeAttribute("src");
            event.currentTarget.querySelectorAll("source").forEach((source) => source.remove());
            event.currentTarget.load();
          }}
        >
          {!media.deletedAt && <source src={media.url} type={media.mimeType} />}
        </video>
      ) : (
        <img
          src={media.deletedAt ? MEDIA_FALLBACK_URL : media.url}
          alt={media.name}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="aspect-[4/5] w-full object-cover"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = MEDIA_FALLBACK_URL;
          }}
        />
      )}
      <p className="truncate px-2 py-1.5 text-xs text-gray-600">{media.name}</p>
    </div>
  );
}

function ReviewForm({ form, index, state, mediaById }) {
  const values = form.values || {};
  const labels = values.selectionLabels || {};
  const media = mediaForForm(state, form, mediaById);
  const links = (values.link || []).filter((value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  });

  return (
    <article className="scroll-mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
      <header className="mb-5 flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Launch form {index + 1}</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-950">
            {values.adName || `Ad ${index + 1}`}
          </h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
          values.launchPaused ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
        }`}>
          {values.launchPaused ? "Paused" : "Active"}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="space-y-5">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-gray-500">Campaign</dt>
              <dd className="mt-1 font-medium">{labels.campaigns?.map((item) => item.name).join(", ") || labels.duplicateCampaignName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Ad set</dt>
              <dd className="mt-1 font-medium">{labels.adSets?.map((item) => item.name).join(", ") || labels.duplicateAdSetName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">CTA</dt>
              <dd className="mt-1 font-medium">{(values.cta || "—").replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Facebook page</dt>
              <dd className="mt-1 font-medium">{labels.page?.name || values.pageId || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Instagram account</dt>
              <dd className="mt-1 font-medium">{labels.instagramAccount?.name || values.instagramAccountId || "—"}</dd>
            </div>
            {values.isPartnershipAd && (
              <div>
                <dt className="text-xs text-gray-500">Partner</dt>
                <dd className="mt-1 font-medium">{labels.partnerName || values.partnerIgAccountId || "—"}</dd>
              </div>
            )}
          </dl>

          <div>
            <p className="text-xs text-gray-500">Primary text</p>
            <div className="mt-1 space-y-2">
              {(values.messages || []).filter(Boolean).map((message, messageIndex) => (
                <p key={messageIndex} className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{message}</p>
              ))}
              {!(values.messages || []).some(Boolean) && <p>—</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Headlines</p>
              <p className="mt-1 text-sm">{(values.headlines || []).filter(Boolean).join(" · ") || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Descriptions</p>
              <p className="mt-1 text-sm">{(values.descriptions || []).filter(Boolean).join(" · ") || "—"}</p>
            </div>
          </div>

          {links.length > 0 && (
            <div>
              <p className="text-xs text-gray-500">Destination</p>
              {links.map((link) => (
                <a key={link} href={link} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 break-all text-sm text-blue-600 hover:underline">
                  {link}<ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs text-gray-500">Media</p>
          {media.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {media.map((item, mediaIndex) => (
                <ReviewMedia key={item.id} media={item} priority={index === 0 && mediaIndex < 2} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              This form uses an existing post or platform media reference.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function QaReview() {
  const { token } = useParams();
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getQaDraft(token).then(setDraft).catch((requestError) => setError(requestError.message));
  }, [token]);

  const mediaById = useMemo(
    () => new Map((draft?.media || []).map((media) => [media.id, media])),
    [draft?.media]
  );

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Review unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
        </div>
      </main>
    );
  }

  if (!draft) {
    return <main className="flex min-h-screen items-center justify-center bg-gray-50"><Loader2 className="h-7 w-7 animate-spin text-gray-500" /></main>;
  }

  const forms = draft.state?.forms || [];
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7">
          <p className="text-sm font-medium text-blue-600">Ad review</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">{draft.name}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {forms.length} launch form{forms.length === 1 ? "" : "s"} prepared for review
          </p>
        </header>
        <div className="space-y-6">
          {forms.map((form, index) => (
            <ReviewForm key={form.id || index} form={form} index={index} state={draft.state} mediaById={mediaById} />
          ))}
        </div>
      </div>
    </main>
  );
}
