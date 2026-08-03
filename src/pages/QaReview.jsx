/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Play, Users } from "lucide-react";
import { useParams } from "react-router-dom";
import AdSetIcon from "@/assets/icons/grid.svg?react";
import CampaignIcon from "@/assets/icons/folder.svg?react";
import CTAIcon from "@/assets/icons/cta.svg?react";
import FacebookIcon from "@/assets/icons/fb.svg?react";
import InstagramIcon from "@/assets/icons/ig.svg?react";
import LinkIcon from "@/assets/icons/link.svg?react";
import TemplateIcon from "@/assets/icons/file.svg?react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getQaDraft } from "@/lib/draftApi";
import { getCreativeUnitsForForm } from "@/lib/draftCreativeLayout";

const MEDIA_FALLBACK_URL = "https://api.withblip.com/thumbnail.jpg";
const COPY_PREVIEW_LIMIT = 200;

function FieldLabel({ icon, children }) {
  return (
    <span className="mb-0.5 flex items-center gap-1.5 text-sm text-gray-500">
      {icon}
      {children}
    </span>
  );
}

function DetailField({ label, icon, children }) {
  return (
    <div>
      <dt><FieldLabel icon={icon}>{label}</FieldLabel></dt>
      <dd className="break-words text-sm font-semibold leading-5 text-gray-950">{children || "—"}</dd>
    </div>
  );
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

function ReviewMedia({ media, priority = false, grouped = false }) {
  const isVideo = (media.mimeType || "").startsWith("video/");
  const savedAspectRatio = getMediaAspectRatio(media);
  const [detectedAspectRatio, setDetectedAspectRatio] = useState(null);
  const aspectRatio = savedAspectRatio || detectedAspectRatio || "1 / 1";

  const detectAspectRatio = (width, height) => {
    if (!savedAspectRatio && width > 0 && height > 0) {
      setDetectedAspectRatio(`${width} / ${height}`);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gray-100 ${grouped ? "border border-gray-200" : ""}`}
      style={{ aspectRatio }}
    >
      {isVideo ? (
        <>
          <video
            controls={!media.deletedAt}
            preload="metadata"
            poster={media.deletedAt ? MEDIA_FALLBACK_URL : media.previewUrl}
            className="h-full w-full bg-black object-contain"
            onLoadedMetadata={(event) => {
              detectAspectRatio(event.currentTarget.videoWidth, event.currentTarget.videoHeight);
            }}
            onError={(event) => {
              event.currentTarget.poster = MEDIA_FALLBACK_URL;
              event.currentTarget.removeAttribute("src");
              event.currentTarget.querySelectorAll("source").forEach((source) => source.remove());
              event.currentTarget.load();
            }}
          >
            {!media.deletedAt && <source src={media.url} type={media.mimeType} />}
          </video>
          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 p-1.5 text-white">
            <Play className="h-3 w-3 fill-current" />
          </span>
        </>
      ) : (
        <img
          src={media.deletedAt ? MEDIA_FALLBACK_URL : media.url || media.previewUrl || MEDIA_FALLBACK_URL}
          alt={media.name || "Ad creative"}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
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
    </div>
  );
}

function CreativeReviewCard({ unit, groupIndex, priority = false }) {
  const grouped = unit.type === "group";
  const groupColor = groupIndex % 2 === 0
    ? "border-blue-300 bg-blue-100"
    : "border-orange-300 bg-orange-100";

  return (
    <div className={`min-w-0 ${
      grouped ? `col-span-2 rounded-2xl border p-2 ${groupColor}` : ""
    }`}>
      <div className={`grid gap-2 ${unit.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {unit.media.map((media, index) => (
          <ReviewMedia
            key={media.id}
            media={media}
            priority={priority && index < 2}
            grouped={grouped}
          />
        ))}
      </div>
      <div className="mt-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-xs text-gray-500">Ad Name</span>
        <TooltipProvider delayDuration={250}>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-950">{unit.adName}</p>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm break-words text-xs">
              {unit.adName}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

function ReviewForm({ form, index, state, mediaById, showLaunchHeading }) {
  const values = form.values || {};
  const labels = values.selectionLabels || {};
  const creativeUnits = getCreativeUnitsForForm(state, form, mediaById);
  const groupIndexByKey = new Map(
    (state?.mediaLayout?.fileGroups || []).map((group, groupIndex) => [
      Array.isArray(group) || !group?.id ? `group-${groupIndex}` : String(group.id),
      groupIndex,
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
  const messages = (values.messages || []).filter(Boolean);
  const headlines = (values.headlines || []).filter(Boolean);
  const descriptions = (values.descriptions || []).filter(Boolean);
  const links = (values.link || []).filter(Boolean);

  return (
    <article className="flex h-[min(78vh,760px)] min-h-[620px] flex-col overflow-hidden !rounded-[48px] border border-gray-200 bg-white shadow-sm">
      {showLaunchHeading && (
        <header className="shrink-0 px-8 py-5">
          <h2 className="text-lg font-semibold text-gray-950">Launch {index + 1}</h2>
        </header>
      )}

      <div className={`grid min-h-0 flex-1 grid-cols-[minmax(0,1.05fr)_minmax(320px,0.85fr)] gap-8 overflow-hidden px-8 pb-8 ${
        showLaunchHeading ? "" : "pt-8"
      }`}>
        <ScrollArea className="h-full min-h-0 min-w-0">
          <dl className="space-y-5 pr-4">
            <div className="grid grid-cols-2 gap-6">
              <DetailField label="Campaign" icon={<CampaignIcon className="h-4 w-4" />}>
                {labels.campaigns?.map((item) => item.name).join(", ") || labels.duplicateCampaignName || "—"}
              </DetailField>
              <DetailField label="Ad Set" icon={<AdSetIcon className="h-4 w-4" />}>
                {labels.adSets?.map((item) => item.name).join(", ") || labels.duplicateAdSetName || "—"}
              </DetailField>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <DetailField label="Facebook Page" icon={<FacebookIcon className="h-4 w-4" />}>
                {labels.page?.name || values.pageId || "—"}
              </DetailField>
              <DetailField label="Instagram Account" icon={<InstagramIcon className="h-4 w-4" />}>
                {labels.instagramAccount?.name || values.instagramAccountId || "—"}
              </DetailField>
            </div>
            {messages.length > 0 ? messages.map((message, messageIndex) => (
              <div key={`message-${messageIndex}`}>
                <dt>
                  <FieldLabel icon={<TemplateIcon className="h-4 w-4" />}>
                    Primary Text {messages.length > 1 ? messageIndex + 1 : ""}
                  </FieldLabel>
                </dt>
                <dd><ExpandableText text={message} /></dd>
              </div>
            )) : <DetailField label="Primary Text" icon={<TemplateIcon className="h-4 w-4" />}>—</DetailField>}
            {headlines.length > 0 ? headlines.map((headline, headlineIndex) => (
              <div key={`headline-${headlineIndex}`}>
                <dt>
                  <FieldLabel icon={<TemplateIcon className="h-4 w-4" />}>
                    Headline {headlines.length > 1 ? headlineIndex + 1 : ""}
                  </FieldLabel>
                </dt>
                <dd><ExpandableText text={headline} /></dd>
              </div>
            )) : <DetailField label="Headline" icon={<TemplateIcon className="h-4 w-4" />}>—</DetailField>}
            {descriptions.map((description, descriptionIndex) => (
              <div key={`description-${descriptionIndex}`}>
                <dt>
                  <FieldLabel icon={<TemplateIcon className="h-4 w-4" />}>
                    Description {descriptions.length > 1 ? descriptionIndex + 1 : ""}
                  </FieldLabel>
                </dt>
                <dd><ExpandableText text={description} /></dd>
              </div>
            ))}
            <DetailField label="Link" icon={<LinkIcon className="h-4 w-4" />}>
              {links.length > 0 ? links.map((link, linkIndex) => (
                <a
                  key={`${link}-${linkIndex}`}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 break-all text-blue-600 hover:underline"
                >
                  {link}<ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )) : "—"}
            </DetailField>
            <DetailField label="CTA" icon={<CTAIcon className="h-4 w-4" />}>
              {(values.cta || "—").replaceAll("_", " ")}
            </DetailField>
            {values.isPartnershipAd && (
              <DetailField label="Partner" icon={<Users className="h-4 w-4" />}>
                {labels.partnerName || values.partnerIgAccountId || "—"}
              </DetailField>
            )}
          </dl>
        </ScrollArea>

        <ScrollArea className="h-full min-h-0 pr-2">
          {creativeUnits.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {indexedCreativeUnits.map(({ unit, groupIndex }, unitIndex) => (
                <CreativeReviewCard
                  key={unit.id}
                  unit={unit}
                  groupIndex={groupIndex}
                  priority={index === 0 && unitIndex < 2}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
              This launch uses an existing post or platform media reference.
            </div>
          )}
        </ScrollArea>
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

  const forms = useMemo(() => draft?.state?.forms || [], [draft?.state?.forms]);
  const accountName = draft?.state?.configuration?.adAccount?.name || draft?.name || "";
  const creativeCount = useMemo(
    () => forms.reduce(
      (total, form) => total + getCreativeUnitsForForm(draft?.state, form, mediaById).length,
      0
    ),
    [draft?.state, forms, mediaById]
  );

  useEffect(() => {
    if (!accountName) return undefined;
    const previousTitle = document.title;
    document.title = `Ad Review for ${accountName}`;
    return () => {
      document.title = previousTitle;
    };
  }, [accountName]);

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

  return (
    <ScrollArea className="h-screen bg-gray-50">
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 px-3">
            <h1 className="text-3xl font-semibold tracking-tight text-blue-600">Ad review for {accountName}</h1>
            <p className="mt-2 text-sm text-gray-600">
              {creativeCount} Ad{creativeCount === 1 ? "" : "s"}
              {forms.length > 1 ? ` across ${forms.length} Launches` : ""}
            </p>
          </header>
          <div className="space-y-8">
            {forms.map((form, index) => (
              <ReviewForm
                key={form.id || index}
                form={form}
                index={index}
                state={draft.state}
                mediaById={mediaById}
                showLaunchHeading={forms.length > 1}
              />
            ))}
          </div>
        </div>
      </main>
    </ScrollArea>
  );
}
