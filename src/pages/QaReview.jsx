/* eslint-disable react/prop-types */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bookmark,
  ChevronRight,
  ExternalLink,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Play,
  Send,
  Share2,
  ThumbsUp,
  Users,
  X,
} from "lucide-react";
import { useParams } from "react-router-dom";
import AdSetIcon from "@/assets/icons/grid.svg?react";
import CampaignIcon from "@/assets/icons/folder.svg?react";
import CTAIcon from "@/assets/icons/cta.svg?react";
import FacebookIcon from "@/assets/icons/fb.svg?react";
import InstagramIcon from "@/assets/icons/ig.svg?react";
import InstagramColorIcon from "@/assets/icons/IGColor.webp";
import LinkIcon from "@/assets/icons/link.svg?react";
import TemplateIcon from "@/assets/icons/file.svg?react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createQaComment, getQaComments, getQaDraft } from "@/lib/draftApi";
import { getCreativeUnitsForForm } from "@/lib/draftCreativeLayout";

const MEDIA_FALLBACK_URL = "https://api.withblip.com/thumbnail.jpg";
const COPY_PREVIEW_LIMIT = 200;
const REVIEWER_NAME_KEY = "blip-qa-reviewer-name";
const CommentsContext = createContext({ comments: [], openInlineComment: () => {} });
const PreviewMediaRatiosContext = createContext({});

function CommentPins({ anchorId, media = false }) {
  const { comments, openInlineComment } = useContext(CommentsContext);
  const anchoredComments = comments.filter((comment) => comment.anchorId === anchorId);
  if (anchoredComments.length === 0) return null;

  if (!media) {
    return (
      <button
        type="button"
        data-comment-ui
        data-comment-pin
        onClick={(event) => {
          event.stopPropagation();
          openInlineComment(anchorId);
        }}
        className="absolute -right-2 -top-2 z-20 flex h-6 min-w-6 items-center justify-center rounded-full bg-pink-500 px-1.5 text-[11px] font-bold text-white shadow-md ring-2 ring-white hover:bg-pink-600"
        aria-label={`View ${anchoredComments.length} comment${anchoredComments.length === 1 ? "" : "s"}`}
      >
        {anchoredComments.length}
      </button>
    );
  }

  return anchoredComments.map((comment) => {
    const commentNumber = comments.findIndex((item) => item.id === comment.id) + 1;
    return (
      <button
        key={comment.id}
        type="button"
        data-comment-ui
        data-comment-pin
        data-comment-id={comment.id}
        onClick={(event) => {
          event.stopPropagation();
          openInlineComment(anchorId, comment.id);
        }}
        className="absolute z-20 flex h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-pink-500 px-1.5 text-[11px] font-bold text-white shadow-lg ring-2 ring-white hover:bg-pink-600"
        style={{
          left: `${Math.max(0.04, Math.min(0.96, comment.x ?? 0.5)) * 100}%`,
          top: `${Math.max(0.04, Math.min(0.96, comment.y ?? 0.5)) * 100}%`,
        }}
        aria-label={`View comment ${commentNumber}`}
      >
        {commentNumber}
      </button>
    );
  });
}

function CommentAnchor({ id, label, type = "field", className = "", children }) {
  return (
    <div
      data-comment-anchor={id}
      data-comment-label={label}
      data-comment-type={type}
      className={`relative min-w-0 ${className}`}
    >
      {children}
      <CommentPins anchorId={id} />
    </div>
  );
}

function formatCommentTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function findCommentAnchor(anchorId) {
  return Array.from(document.querySelectorAll("[data-comment-anchor]")).find(
    (element) => element.dataset.commentAnchor === anchorId,
  );
}

function InlineCommentPopover({ selection, comments, onClose, onOutsideClick }) {
  const popoverRef = useRef(null);
  const [position, setPosition] = useState(null);
  const visibleComments = selection
    ? comments.filter((comment) => (
      comment.anchorId === selection.anchorId && (!selection.commentId || comment.id === selection.commentId)
    ))
    : [];

  useEffect(() => {
    if (!selection) {
      setPosition(null);
      return undefined;
    }

    const updatePosition = () => {
      const anchor = findCommentAnchor(selection.anchorId);
      if (!anchor) return;
      const pin = selection.commentId
        ? Array.from(anchor.querySelectorAll("[data-comment-id]")).find((element) => element.dataset.commentId === selection.commentId)
        : anchor.querySelector("[data-comment-pin]");
      const rect = (pin || anchor).getBoundingClientRect();
      const width = Math.min(320, window.innerWidth - 24);
      const height = 192;
      const preferredLeft = rect.right + 12;
      const left = preferredLeft + width <= window.innerWidth - 12
        ? preferredLeft
        : Math.max(12, Math.min(window.innerWidth - width - 12, rect.left - width - 12));
      const top = Math.max(12, Math.min(window.innerHeight - height - 12, rect.top - 12));
      setPosition({ left, top, width });
    };

    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [selection, comments]);

  useEffect(() => {
    if (!selection) return undefined;
    const closeOnOutsideClick = (event) => {
      if (popoverRef.current?.contains(event.target) || event.target.closest?.("[data-comment-pin]")) return;
      onOutsideClick();
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [selection, onOutsideClick]);

  if (!selection || !position || visibleComments.length === 0 || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={popoverRef}
      data-comment-ui
      className="fixed z-[105] flex h-48 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
      style={{ left: position.left, top: position.top, width: position.width }}
      role="dialog"
      aria-label="Comment"
    >
      <header className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <p className="min-w-0 truncate text-xs font-semibold text-gray-500">{visibleComments[0].anchorLabel}</p>
        <button type="button" onClick={onClose} className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100" aria-label="Close comment">
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {visibleComments.map((comment) => (
          <article key={comment.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-950">{comment.authorName}</span>
              <span className="text-[10px] text-gray-400">{formatCommentTime(comment.createdAt)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-gray-700">{comment.body}</p>
          </article>
        ))}
      </div>
    </div>,
    document.body,
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

function DetailField({ label, icon, children }) {
  return (
    <div className="min-w-0">
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

function CommentsPanel({ open, comments, error, onClose, onJumpToComment }) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div data-comment-ui className="fixed inset-0 z-[100] flex justify-end bg-black/20 p-3 sm:p-5" onMouseDown={onClose}>
      <style>{`@keyframes qaCommentDrawerIn { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      <aside
        className="flex h-full w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        style={{ animation: "qaCommentDrawerIn 180ms ease-out" }}
        onMouseDown={(event) => event.stopPropagation()}
        aria-label="Review comments"
      >
        <header className="flex items-center justify-between gap-4 px-5 pb-2 pt-4">
          <h2 className="text-lg font-semibold text-gray-950">Comments <span className="font-normal text-gray-400">({comments.length})</span></h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Close comments">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-5 pt-1">
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {comments.length === 0 ? (
            <div className="flex h-full min-h-48 items-center justify-center text-center text-sm text-gray-500">
              No comments yet.
            </div>
          ) : comments.map((comment) => (
            <button
              key={comment.id}
              type="button"
              onClick={() => onJumpToComment(comment)}
              className="block w-full rounded-2xl border border-gray-300 bg-gray-50/70 p-4 text-left shadow-sm transition hover:bg-gray-50 hover:shadow-md"
            >
              <span className="inline-flex max-w-full rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">
                <span className="truncate">{comment.anchorLabel}</span>
              </span>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-5 text-black">{comment.body}</p>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-400">
                <span className="truncate">{comment.authorName}</span>
                <span className="shrink-0 text-[10px]">{formatCommentTime(comment.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function CommentComposer({ target, authorName, body, error, saving, onAuthorNameChange, onBodyChange, onCancel, onSubmit }) {
  if (!target || typeof document === "undefined") return null;
  return createPortal(
    <div data-comment-ui className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 p-4" onMouseDown={onCancel}>
      <form
        onSubmit={onSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-950">Leave a comment</h2>
            <p className="mt-1 truncate text-sm text-gray-500">On {target.label}</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Cancel comment">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-5 block text-sm font-semibold text-gray-800">
          Your name
          <input
            value={authorName}
            onChange={(event) => onAuthorNameChange(event.target.value)}
            maxLength={80}
            autoComplete="name"
            className="mt-2 h-11 w-full rounded-xl border border-gray-300 px-3 font-normal outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
            placeholder="Enter your name"
            autoFocus={!authorName}
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-gray-800">
          Comment
          <textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            maxLength={2000}
            rows={5}
            className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
            placeholder="What should be changed or reviewed?"
            autoFocus={Boolean(authorName)}
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-full px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !authorName.trim() || !body.trim()}
            className="inline-flex items-center rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Post comment
          </button>
        </div>
      </form>
    </div>,
    document.body,
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

const ADVANCED_PLACEMENTS = [
  { id: "facebook-feed", label: "Facebook Feed", network: "facebook", kind: "facebook-feed", targetRatio: 1 },
  { id: "instagram-feed", label: "Instagram Feed", network: "instagram", kind: "instagram-feed", targetRatio: 1 },
  { id: "facebook-profile-feed", label: "Facebook Profile Feed", network: "facebook", kind: "facebook-feed", targetRatio: 1 },
  { id: "instagram-profile-feed", label: "Instagram Profile Feed", network: "instagram", kind: "instagram-feed", targetRatio: 1 },
  { id: "marketplace", label: "Facebook Marketplace", network: "facebook", kind: "marketplace", targetRatio: 1 },
  { id: "business-explore", label: "Facebook Business Explore", network: "facebook", kind: "facebook-feed", targetRatio: 1 },
  { id: "in-stream-reels", label: "Facebook In-stream Reels", network: "facebook", kind: "facebook-feed", targetRatio: 1 },
  { id: "right-column", label: "Facebook Right Column", network: "facebook", kind: "right-column", targetRatio: 1 },
  { id: "instagram-stories", label: "Instagram Stories", network: "instagram", kind: "story", targetRatio: 9 / 16 },
  { id: "facebook-stories", label: "Facebook Stories", network: "facebook", kind: "story", targetRatio: 9 / 16 },
  { id: "instagram-reels", label: "Instagram Reels", network: "instagram", kind: "reel", targetRatio: 9 / 16 },
  { id: "facebook-reels", label: "Facebook Reels", network: "facebook", kind: "reel", targetRatio: 9 / 16 },
];

function mediaRatioKey(media) {
  return String(media?.id || media?.url || media?.previewUrl || media?.name || "unknown");
}

function getMediaRatioNumber(media, detectedRatios = {}) {
  const detected = Number(detectedRatios[mediaRatioKey(media)]);
  if (detected > 0) return detected;
  const width = Number(media?.width ?? media?.metadata?.width ?? media?.dimensions?.width);
  const height = Number(media?.height ?? media?.metadata?.height ?? media?.dimensions?.height);
  if (width > 0 && height > 0) return width / height;
  const rawRatio = media?.aspectRatio ?? media?.metadata?.aspectRatio;
  if (typeof rawRatio === "number" && rawRatio > 0) return rawRatio;
  if (typeof rawRatio === "string") {
    const match = rawRatio.match(/^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/);
    if (match && Number(match[2]) > 0) return Number(match[1]) / Number(match[2]);
    const numeric = Number(rawRatio);
    if (numeric > 0) return numeric;
  }
  return 1;
}

function pickPlacementMedia(mediaItems, targetRatio, detectedRatios) {
  if (!mediaItems?.length) return null;
  return mediaItems.reduce((best, media) => {
    const difference = Math.abs(Math.log(getMediaRatioNumber(media, detectedRatios) / targetRatio));
    return !best || difference < best.difference ? { media, difference } : best;
  }, null)?.media || mediaItems[0];
}

function formatCta(value) {
  const normalized = String(value || "Learn more").replaceAll("_", " ").trim().toLowerCase();
  const compact = normalized.replaceAll(" ", "");
  const commonLabels = {
    signup: "Sign Up",
    learnmore: "Learn More",
    shopnow: "Shop Now",
    applynow: "Apply Now",
    download: "Download",
    contactus: "Contact Us",
    getoffer: "Get Offer",
  };
  if (commonLabels[compact]) return commonLabels[compact];
  return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
}

function destinationHost(value) {
  if (!value) return "example.com";
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.replace(/^www\./, "");
  } catch {
    return String(value).replace(/^https?:\/\//i, "").split("/")[0] || "example.com";
  }
}

function previewExcerpt(value, maxCharacters) {
  const text = String(value || "").trim();
  return text.length > maxCharacters ? `${text.slice(0, maxCharacters).trimEnd()}…` : text;
}

function PlacementNetworkIcon({ network }) {
  if (network === "instagram") {
    return <img src={InstagramColorIcon} alt="Instagram" className="h-5 w-5 shrink-0 object-contain" />;
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877f2] text-[11px] font-bold text-white">
      f
    </span>
  );
}

function AdvertiserAvatar({ name, small = false }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-orange-50 font-bold text-orange-600 ring-1 ring-orange-100 ${small ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"}`}>
      {String(name || "Ad").slice(0, 2).toUpperCase()}
    </span>
  );
}

function PreviewMedia({ mediaItems, targetRatio, alt }) {
  const detectedRatios = useContext(PreviewMediaRatiosContext);
  const media = pickPlacementMedia(mediaItems, targetRatio, detectedRatios);
  const sourceRatio = media ? getMediaRatioNumber(media, detectedRatios) : 1;
  const isVideo = (media?.mimeType || "").startsWith("video/");
  const verticalPlacement = targetRatio < 0.7;
  const squareInVertical = verticalPlacement && sourceRatio >= 0.78;
  const fit = squareInVertical ? "object-contain" : "object-cover";
  const source = media?.deletedAt ? MEDIA_FALLBACK_URL : media?.url || media?.previewUrl || MEDIA_FALLBACK_URL;

  return (
    <div className={`relative w-full overflow-hidden ${verticalPlacement ? "bg-black" : "bg-gray-100"}`} style={{ aspectRatio: targetRatio }}>
      {isVideo ? (
        <video
          src={media?.deletedAt ? undefined : media?.url}
          poster={media?.previewUrl || MEDIA_FALLBACK_URL}
          muted
          playsInline
          preload="metadata"
          className={`absolute inset-0 h-full w-full ${fit}`}
        />
      ) : (
        <img
          src={source}
          alt={alt}
          loading="eager"
          className={`absolute inset-0 h-full w-full ${fit}`}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = MEDIA_FALLBACK_URL;
          }}
        />
      )}
      {isVideo && (
        <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/60">
          <Play className="h-4 w-4 fill-current" />
        </span>
      )}
    </div>
  );
}

function PlacementCard({ placement, children, narrow = false }) {
  return (
    <section className={`min-w-0 ${narrow ? "mx-auto w-full max-w-[300px]" : ""}`}>
      <div className="mb-2 flex items-center gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <PlacementNetworkIcon network={placement.network} />
          <h3 className="truncate text-sm font-semibold text-gray-800">{placement.label}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function FeedIdentity({ ad, network }) {
  const name = network === "instagram" ? ad.instagramName : ad.advertiserName;
  return (
    <div className="flex items-center gap-2.5 px-3 py-3">
      <AdvertiserAvatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-950">{name}</p>
        <p className="text-[11px] text-gray-500">Sponsored · Public</p>
      </div>
      <MoreHorizontal className="h-5 w-5 text-gray-700" />
    </div>
  );
}

function FacebookFeedPlacement({ ad, placement }) {
  return (
    <PlacementCard placement={placement}>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <FeedIdentity ad={ad} network="facebook" />
        <p className="px-3 pb-3 text-sm leading-[1.35] text-gray-950 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">
          {previewExcerpt(ad.primaryText, 220) || "Your primary text will appear here."}
        </p>
        <PreviewMedia mediaItems={ad.media} targetRatio={1} alt={ad.adName} />
        <div className="flex items-center gap-3 bg-gray-50 px-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] uppercase tracking-wide text-gray-500">{destinationHost(ad.destinationUrl)}</p>
            <p className="truncate text-sm font-semibold text-gray-950">{ad.headline || ad.adName}</p>
            {ad.description && <p className="truncate text-xs text-gray-500">{ad.description}</p>}
          </div>
          <span className="shrink-0 rounded-md bg-gray-200 px-3 py-2 text-xs font-semibold text-gray-900">{ad.cta}</span>
        </div>
        <div className="grid grid-cols-3 border-t border-gray-200 py-2 text-xs font-medium text-gray-600">
          <span className="flex items-center justify-center gap-1"><ThumbsUp className="h-4 w-4" /> Like</span>
          <span className="flex items-center justify-center gap-1"><MessageCircle className="h-4 w-4" /> Comment</span>
          <span className="flex items-center justify-center gap-1"><Share2 className="h-4 w-4" /> Share</span>
        </div>
      </div>
    </PlacementCard>
  );
}

function InstagramFeedPlacement({ ad, placement }) {
  return (
    <PlacementCard placement={placement}>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <FeedIdentity ad={ad} network="instagram" />
        <PreviewMedia mediaItems={ad.media} targetRatio={1} alt={ad.adName} />
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-900">
          <span>{ad.cta}</span><ChevronRight className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-3 px-3 pt-3 text-gray-950">
          <Heart className="h-5 w-5" /><MessageCircle className="h-5 w-5" /><Share2 className="h-5 w-5" />
          <Bookmark className="ml-auto h-5 w-5" />
        </div>
        <p className="px-3 py-3 text-sm leading-[1.35] text-gray-800 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
          <span className="mr-1 font-semibold text-gray-950">{ad.instagramName}</span>
          {previewExcerpt(ad.primaryText, 140) || ad.headline}
        </p>
      </div>
    </PlacementCard>
  );
}

function MarketplacePlacement({ ad, placement }) {
  return (
    <PlacementCard placement={placement}>
      <div className="flex min-h-[430px] items-center justify-center rounded-xl border border-gray-200 bg-gray-100 p-6 shadow-sm">
        <div className="w-full max-w-[270px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <FeedIdentity ad={ad} network="facebook" />
          <PreviewMedia mediaItems={ad.media} targetRatio={1} alt={ad.adName} />
          <div className="px-3 py-3">
            <p className="truncate text-sm font-semibold text-gray-950">{ad.headline || ad.adName}</p>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
              <span className="truncate">{destinationHost(ad.destinationUrl)}</span>
              <span className="font-semibold text-gray-900">{ad.cta}</span>
            </div>
          </div>
        </div>
      </div>
    </PlacementCard>
  );
}

function RightColumnPlacement({ ad, placement }) {
  return (
    <PlacementCard placement={placement}>
      <div className="flex min-h-[250px] items-center justify-center rounded-xl border border-gray-200 bg-gray-100 p-5 shadow-sm">
        <div className="flex w-full max-w-sm gap-3 rounded-lg border border-gray-300 bg-white p-3 shadow-sm">
          <div className="w-28 shrink-0 overflow-hidden rounded-md">
            <PreviewMedia mediaItems={ad.media} targetRatio={1} alt={ad.adName} />
          </div>
          <div className="min-w-0 py-1">
            <p className="truncate text-[10px] text-gray-500">Sponsored · {destinationHost(ad.destinationUrl)}</p>
            <p className="mt-1 text-sm font-semibold leading-4 text-gray-950 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">
              {ad.headline || ad.adName}
            </p>
            <p className="mt-2 text-xs font-semibold text-blue-600">{ad.cta}</p>
          </div>
        </div>
      </div>
    </PlacementCard>
  );
}

function VerticalPlacement({ ad, placement }) {
  const isReel = placement.kind === "reel";
  return (
    <PlacementCard placement={placement} narrow>
      <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-xl border border-gray-300 bg-black shadow-md">
        <div className="relative">
          <PreviewMedia mediaItems={ad.media} targetRatio={9 / 16} alt={ad.adName} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />
          <div className="absolute left-3 right-3 top-3 flex items-center gap-2 text-white">
            <AdvertiserAvatar name={placement.network === "instagram" ? ad.instagramName : ad.advertiserName} small />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{placement.network === "instagram" ? ad.instagramName : ad.advertiserName}</p>
              <p className="text-[9px] text-white/80">Sponsored</p>
            </div>
            <MoreHorizontal className="h-4 w-4" />
          </div>

          {isReel ? (
            <>
              <div className="absolute bottom-20 right-3 flex flex-col items-center gap-4 text-white">
                <Heart className="h-6 w-6" /><MessageCircle className="h-6 w-6" /><Share2 className="h-6 w-6" />
              </div>
              <div className="absolute bottom-3 left-3 right-12 text-white">
                <p className="text-xs font-semibold">{placement.network === "instagram" ? ad.instagramName : ad.advertiserName}</p>
                <p className="mt-1 text-xs leading-4 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                  {previewExcerpt(ad.primaryText, 44) || ad.headline}
                </p>
                <div className="mt-2 flex items-center justify-between rounded-md bg-white/95 px-3 py-2 text-xs font-semibold text-gray-950">
                  <span>{ad.cta}</span><ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </>
          ) : (
            <div className="absolute bottom-4 left-3 right-3 text-center text-white">
              <p className="mb-3 text-xs leading-4 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                {previewExcerpt(ad.primaryText, 100)}
              </p>
              <span className="inline-flex items-center rounded-full bg-white px-5 py-2 text-xs font-semibold text-gray-950 shadow-lg">
                {ad.cta}<ChevronRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </div>
          )}
        </div>
      </div>
    </PlacementCard>
  );
}

function PlacementPreview({ ad, placement }) {
  if (placement.kind === "facebook-feed") return <FacebookFeedPlacement ad={ad} placement={placement} />;
  if (placement.kind === "instagram-feed") return <InstagramFeedPlacement ad={ad} placement={placement} />;
  if (placement.kind === "marketplace") return <MarketplacePlacement ad={ad} placement={placement} />;
  if (placement.kind === "right-column") return <RightColumnPlacement ad={ad} placement={placement} />;
  return <VerticalPlacement ad={ad} placement={placement} />;
}

function buildAdvancedPreviewAds(state, forms, mediaById, accountName) {
  return forms.flatMap((form, formIndex) => {
    const values = form.values || {};
    const labels = values.selectionLabels || {};
    const units = getCreativeUnitsForForm(state, form, mediaById);
    const advertiserName = labels.page?.name || accountName || "Advertiser";
    const instagramName = String(labels.instagramAccount?.name || advertiserName || "advertiser").replace(/^@/, "");
    return units.map((unit, unitIndex) => ({
      id: `${form.id || formIndex}:${unit.id || unitIndex}`,
      adName: unit.adName || values.adName || `Ad ${unitIndex + 1}`,
      media: unit.media || [],
      advertiserName,
      instagramName,
      primaryText: (values.messages || []).filter(Boolean)[0] || "",
      headline: (values.headlines || []).filter(Boolean)[0] || unit.adName || values.adName || "",
      description: (values.descriptions || []).filter(Boolean)[0] || "",
      destinationUrl: (values.link || []).filter(Boolean)[0] || "",
      cta: formatCta(values.cta),
    }));
  });
}

function AdvancedPreviewModal({ open, ads, onClose }) {
  const [activeAdId, setActiveAdId] = useState("");
  const [detectedRatios, setDetectedRatios] = useState({});
  const activeAd = ads.find((ad) => ad.id === activeAdId) || ads[0];

  useEffect(() => {
    if (!open) return undefined;
    setActiveAdId((current) => ads.some((ad) => ad.id === current) ? current : ads[0]?.id || "");
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, ads, onClose]);

  useEffect(() => {
    if (!open || !activeAd) return undefined;
    let cancelled = false;
    const mediaElements = [];

    activeAd.media.forEach((media) => {
      const source = media?.url || media?.previewUrl;
      if (!source || media?.deletedAt) return;
      const key = mediaRatioKey(media);
      const saveRatio = (width, height) => {
        if (cancelled || !(width > 0) || !(height > 0)) return;
        const ratio = width / height;
        setDetectedRatios((current) => current[key] === ratio ? current : { ...current, [key]: ratio });
      };

      if ((media.mimeType || "").startsWith("video/")) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => saveRatio(video.videoWidth, video.videoHeight);
        video.src = source;
        mediaElements.push(video);
      } else {
        const image = new Image();
        image.onload = () => saveRatio(image.naturalWidth, image.naturalHeight);
        image.src = source;
        mediaElements.push(image);
      }
    });

    return () => {
      cancelled = true;
      mediaElements.forEach((element) => {
        element.onload = null;
        element.onloadedmetadata = null;
        if (element.tagName === "VIDEO") element.removeAttribute("src");
      });
    };
  }, [activeAd, open]);

  if (!open || typeof document === "undefined") return null;
  const standardPlacements = ADVANCED_PLACEMENTS.filter((placement) => placement.targetRatio >= 0.7);
  const verticalPlacements = ADVANCED_PLACEMENTS.filter((placement) => placement.targetRatio < 0.7);

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-black/35 p-2 sm:p-5" onMouseDown={onClose}>
      <div
        className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-[#f7f8fa] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-gray-950">Advanced preview</h2>
            <p className="mt-1 text-sm text-gray-500">Placement mockups are approximate and may vary by device and objective.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Close advanced preview">
            <X className="h-5 w-5" />
          </button>
        </header>

        {ads.length > 1 && (
          <div className="shrink-0 border-b border-gray-200 bg-white px-5 pb-2 pt-3 sm:px-7">
            <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-medium text-gray-400">
              <span>Choose an ad</span>
              {ads.length > 4 && <span>Scroll horizontally →</span>}
            </div>
            <div className="overflow-x-auto pb-2 [scrollbar-color:#9ca3af_transparent] [scrollbar-width:thin]">
              <div className="flex w-max min-w-full gap-2">
                {ads.map((ad, index) => (
                  <button
                    key={ad.id}
                    type="button"
                    onClick={() => setActiveAdId(ad.id)}
                    className={`max-w-72 shrink-0 truncate rounded-full px-4 py-2 text-xs font-semibold transition ${
                      activeAd?.id === ad.id ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title={ad.adName}
                  >
                    Ad {index + 1}: {ad.adName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-7">
          {activeAd ? (
            <PreviewMediaRatiosContext.Provider value={detectedRatios}>
              <div className="grid grid-cols-1 items-start gap-x-5 gap-y-7 md:grid-cols-2 xl:grid-cols-3">
                {standardPlacements.map((placement) => (
                  <PlacementPreview key={placement.id} ad={activeAd} placement={placement} />
                ))}
              </div>
              <div className="mt-10 grid grid-cols-1 items-start gap-x-5 gap-y-7 border-t border-gray-200 pt-7 md:grid-cols-2 xl:grid-cols-3">
                {verticalPlacements.map((placement) => (
                  <PlacementPreview key={placement.id} ad={activeAd} placement={placement} />
                ))}
              </div>
            </PreviewMediaRatiosContext.Provider>
          ) : (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-sm text-gray-500">
              No creative media is available to preview.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ReviewMedia({ media, anchorId }) {
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
      data-comment-anchor={anchorId}
      data-comment-label={media.name || (isVideo ? "Video creative" : "Image creative")}
      data-comment-type="media"
      className="relative w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
      style={{ aspectRatio }}
    >
      {isVideo ? (
        <>
          <video
            controls={!media.deletedAt}
            preload="metadata"
            poster={media.deletedAt ? MEDIA_FALLBACK_URL : media.previewUrl}
            className="block h-full w-full max-w-full bg-black object-contain"
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
          loading="eager"
          className="absolute inset-0 block h-full w-full max-w-full object-contain"
          onLoad={(event) => {
            detectAspectRatio(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
          }}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = MEDIA_FALLBACK_URL;
          }}
        />
      )}
      <CommentPins anchorId={anchorId} media />
    </div>
  );
}

function CreativeReviewCard({ unit, groupIndex, formId }) {
  const grouped = unit.type === "group";
  const groupAnchorId = `launch:${formId}:group:${unit.groupKey || unit.id}`;
  const adNameAnchorId = `launch:${formId}:${unit.id}:ad-name`;
  const groupColor = groupIndex % 2 === 0
    ? "border-blue-300 bg-blue-100"
    : "border-orange-300 bg-orange-100";

  return (
    <div
      {...(grouped ? {
        "data-comment-anchor": groupAnchorId,
        "data-comment-label": `Creative group ${groupIndex + 1}`,
        "data-comment-type": "group",
      } : {})}
      className={`relative min-w-0 ${
      grouped ? `rounded-2xl border p-2 sm:col-span-2 ${groupColor}` : ""
    }`}
    >
      {grouped && <CommentPins anchorId={groupAnchorId} />}
      <div className={`grid min-w-0 gap-2 ${unit.media.length > 1 ? "grid-cols-1 min-[420px]:grid-cols-2" : "grid-cols-1"}`}>
        {unit.media.map((media, mediaIndex) => (
          <ReviewMedia
            key={media.id}
            media={media}
            anchorId={`launch:${formId}:${unit.id}:media:${media.id || mediaIndex}`}
          />
        ))}
      </div>
      <CommentAnchor id={adNameAnchorId} label={`Ad name: ${unit.adName}`} className="mt-2">
        <div className="flex min-w-0 items-center gap-2">
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
      </CommentAnchor>
    </div>
  );
}

function ReviewForm({ form, index, state, mediaById, showLaunchHeading }) {
  const values = form.values || {};
  const formId = form.id || `launch-${index + 1}`;
  const anchorLabel = (label) => `${showLaunchHeading ? `Launch ${index + 1} · ` : ""}${label}`;
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
    <section className={index > 0 ? "border-t border-gray-200" : ""}>
      {showLaunchHeading && (
        <header className="px-4 pt-6 sm:px-8 sm:pt-8">
          <h2 className="text-lg font-semibold text-gray-950">Launch {index + 1}</h2>
        </header>
      )}

      <div className={`grid min-w-0 grid-cols-1 items-start gap-6 px-4 pb-8 sm:px-8 sm:pb-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] ${
        showLaunchHeading ? "pt-5" : "pt-10"
      }`}>
        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <dl className="sm:pr-4">
            <FormSection>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                <CommentAnchor id={`launch:${formId}:campaign`} label={anchorLabel("Campaign")}>
                  <DetailField label="Campaign" icon={<CampaignIcon className="h-4 w-4" />}>
                    {labels.campaigns?.map((item) => item.name).join(", ") || labels.duplicateCampaignName || "—"}
                  </DetailField>
                </CommentAnchor>
                <CommentAnchor id={`launch:${formId}:ad-set`} label={anchorLabel("Ad Set")}>
                  <DetailField label="Ad Set" icon={<AdSetIcon className="h-4 w-4" />}>
                    {labels.adSets?.map((item) => item.name).join(", ") || labels.duplicateAdSetName || "—"}
                  </DetailField>
                </CommentAnchor>
              </div>
            </FormSection>
            <FormSection divided className="mt-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                <CommentAnchor id={`launch:${formId}:facebook-page`} label={anchorLabel("Facebook Page")}>
                  <DetailField label="Facebook Page" icon={<FacebookIcon className="h-4 w-4" />}>
                    {labels.page?.name || values.pageId || "—"}
                  </DetailField>
                </CommentAnchor>
                <CommentAnchor id={`launch:${formId}:instagram-account`} label={anchorLabel("Instagram Account")}>
                  <DetailField label="Instagram Account" icon={<InstagramIcon className="h-4 w-4" />}>
                    {labels.instagramAccount?.name || values.instagramAccountId || "—"}
                  </DetailField>
                </CommentAnchor>
              </div>
              {values.isPartnershipAd && (
                <CommentAnchor id={`launch:${formId}:partner`} label={anchorLabel("Partner")} className="mt-5">
                  <DetailField label="Partner" icon={<Users className="h-4 w-4" />}>
                    {labels.partnerName || values.partnerIgAccountId || "—"}
                  </DetailField>
                </CommentAnchor>
              )}
            </FormSection>
            <FormSection divided className="mt-5 space-y-4">
              {messages.length > 0 ? messages.map((message, messageIndex) => (
                <CommentAnchor
                  key={`message-${messageIndex}`}
                  id={`launch:${formId}:primary-text:${messageIndex}`}
                  label={anchorLabel(`Primary Text ${messages.length > 1 ? messageIndex + 1 : ""}`.trim())}
                >
                  <dt>
                    <FieldLabel icon={<TemplateIcon className="h-4 w-4" />}>
                      Primary Text {messages.length > 1 ? messageIndex + 1 : ""}
                    </FieldLabel>
                  </dt>
                  <dd><ExpandableText text={message} /></dd>
                </CommentAnchor>
              )) : (
                <CommentAnchor id={`launch:${formId}:primary-text:0`} label={anchorLabel("Primary Text")}>
                  <dt><FieldLabel icon={<TemplateIcon className="h-4 w-4" />}>Primary Text</FieldLabel></dt>
                  <dd><ExpandableText text="" /></dd>
                </CommentAnchor>
              )}
              {headlines.length > 0 ? headlines.map((headline, headlineIndex) => (
                <CommentAnchor
                  key={`headline-${headlineIndex}`}
                  id={`launch:${formId}:headline:${headlineIndex}`}
                  label={anchorLabel(`Headline ${headlines.length > 1 ? headlineIndex + 1 : ""}`.trim())}
                >
                  <dt>
                    <FieldLabel icon={<TemplateIcon className="h-4 w-4" />}>
                      Headline {headlines.length > 1 ? headlineIndex + 1 : ""}
                    </FieldLabel>
                  </dt>
                  <dd><ExpandableText text={headline} /></dd>
                </CommentAnchor>
              )) : (
                <CommentAnchor id={`launch:${formId}:headline:0`} label={anchorLabel("Headline")}>
                  <dt><FieldLabel icon={<TemplateIcon className="h-4 w-4" />}>Headline</FieldLabel></dt>
                  <dd><ExpandableText text="" /></dd>
                </CommentAnchor>
              )}
              {descriptions.map((description, descriptionIndex) => (
                <CommentAnchor
                  key={`description-${descriptionIndex}`}
                  id={`launch:${formId}:description:${descriptionIndex}`}
                  label={anchorLabel(`Description ${descriptions.length > 1 ? descriptionIndex + 1 : ""}`.trim())}
                >
                  <dt>
                    <FieldLabel icon={<TemplateIcon className="h-4 w-4" />}>
                      Description {descriptions.length > 1 ? descriptionIndex + 1 : ""}
                    </FieldLabel>
                  </dt>
                  <dd><ExpandableText text={description} /></dd>
                </CommentAnchor>
              ))}
            </FormSection>
            <FormSection divided className="mt-5 grid grid-cols-1 gap-4 pb-2 sm:grid-cols-2 sm:gap-6">
              <CommentAnchor id={`launch:${formId}:link`} label={anchorLabel("Link")}>
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
              </CommentAnchor>
              <CommentAnchor id={`launch:${formId}:cta`} label={anchorLabel("CTA")}>
                <DetailField label="CTA" icon={<CTAIcon className="h-4 w-4" />}>
                  {(values.cta || "—").replaceAll("_", " ")}
                </DetailField>
              </CommentAnchor>
            </FormSection>
          </dl>
        </div>

        <div className="min-w-0 sm:pr-2 lg:border-l lg:border-gray-200 lg:pl-6">
          {creativeUnits.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {indexedCreativeUnits.map(({ unit, groupIndex }) => (
                <CreativeReviewCard
                  key={unit.id}
                  unit={unit}
                  groupIndex={groupIndex}
                  formId={formId}
                />
              ))}
            </div>
          ) : (
            <CommentAnchor id={`launch:${formId}:platform-media`} label={anchorLabel("Platform media")}>
              <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
                This launch uses an existing post or platform media reference.
              </div>
            </CommentAnchor>
          )}
        </div>
      </div>
    </section>
  );
}

export default function QaReview() {
  const { token } = useParams();
  const reviewRootRef = useRef(null);
  const suppressCommentClickRef = useRef(false);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [comments, setComments] = useState([]);
  const [commentsError, setCommentsError] = useState("");
  const [commentMode, setCommentMode] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [advancedPreviewOpen, setAdvancedPreviewOpen] = useState(false);
  const [inlineCommentSelection, setInlineCommentSelection] = useState(null);
  const [commentTarget, setCommentTarget] = useState(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitError, setCommentSubmitError] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [reviewerName, setReviewerName] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(REVIEWER_NAME_KEY) || "";
  });

  useEffect(() => {
    getQaDraft(token).then(setDraft).catch((requestError) => setError(requestError.message));
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    getQaComments(token)
      .then((nextComments) => {
        if (!cancelled) setComments(nextComments);
      })
      .catch((requestError) => {
        if (!cancelled) setCommentsError(requestError.message || "Comments could not be loaded");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const mediaById = useMemo(
    () => new Map((draft?.media || []).map((media) => [media.id, media])),
    [draft?.media]
  );

  const forms = useMemo(() => draft?.state?.forms || [], [draft?.state?.forms]);
  const accountName = draft?.state?.configuration?.adAccount?.name || draft?.name || "";
  const previewAds = useMemo(
    () => buildAdvancedPreviewAds(draft?.state, forms, mediaById, accountName),
    [accountName, draft?.state, forms, mediaById],
  );
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

  const openInlineComment = (anchorId, commentId = null) => {
    setInlineCommentSelection({ anchorId, commentId });
  };

  const handleReviewClick = (event) => {
    if (suppressCommentClickRef.current) return;
    if (!commentMode || event.target.closest("[data-comment-ui]")) return;
    const root = reviewRootRef.current;
    if (!root) return;

    let anchor = event.target.closest("[data-comment-anchor]");
    if (!anchor || !root.contains(anchor)) {
      let closestDistance = Number.POSITIVE_INFINITY;
      root.querySelectorAll("[data-comment-anchor]").forEach((candidate) => {
        const rect = candidate.getBoundingClientRect();
        const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
        const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
        const distance = Math.hypot(dx, dy);
        if (distance < closestDistance) {
          closestDistance = distance;
          anchor = candidate;
        }
      });
    }
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const anchorType = anchor.dataset.commentType || "field";
    event.preventDefault();
    event.stopPropagation();
    setCommentTarget({
      id: anchor.dataset.commentAnchor,
      label: anchor.dataset.commentLabel || "Page",
      type: anchorType,
      x: anchorType === "media" && rect.width > 0 ? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) : null,
      y: anchorType === "media" && rect.height > 0 ? Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) : null,
    });
    setCommentBody("");
    setCommentSubmitError("");
  };

  const handleSubmitComment = async (event) => {
    event.preventDefault();
    if (!commentTarget || !reviewerName.trim() || !commentBody.trim() || savingComment) return;
    setSavingComment(true);
    setCommentSubmitError("");
    try {
      const comment = await createQaComment({
        token,
        authorName: reviewerName.trim(),
        body: commentBody.trim(),
        anchorId: commentTarget.id,
        anchorLabel: commentTarget.label,
        anchorType: commentTarget.type,
        x: commentTarget.x,
        y: commentTarget.y,
      });
      window.localStorage.setItem(REVIEWER_NAME_KEY, reviewerName.trim());
      setComments((current) => [...current, comment]);
      setInlineCommentSelection({ anchorId: commentTarget.id, commentId: comment.id });
      setCommentTarget(null);
      setCommentBody("");
    } catch (requestError) {
      setCommentSubmitError(requestError.message || "Comment could not be posted");
    } finally {
      setSavingComment(false);
    }
  };

  const handleJumpToComment = (comment) => {
    const anchor = findCommentAnchor(comment.anchorId);
    setCommentsOpen(false);
    setInlineCommentSelection({ anchorId: comment.anchorId, commentId: comment.id });
    if (anchor) {
      window.setTimeout(() => anchor.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  };

  const commentsContextValue = { comments, openInlineComment };

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
    <CommentsContext.Provider value={commentsContextValue}>
      <ScrollArea className="h-screen bg-gray-50">
      <main
        ref={reviewRootRef}
        onClickCapture={handleReviewClick}
        className="min-h-screen px-4 py-10 sm:px-6"
      >
        {commentMode && (
          <style>{`
            [data-comment-anchor] {
              cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='%23111827' stroke='white' stroke-width='1.5'%3E%3Cpath d='M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z'/%3E%3C/svg%3E") 6 6, pointer;
            }
            [data-comment-anchor]:hover { outline: 2px solid #93c5fd; outline-offset: 4px; border-radius: 12px; }
            [data-comment-anchor]:has([data-comment-anchor]:hover) { outline: none; }
          `}</style>
        )}
        <div className="mx-auto max-w-7xl">
          <header className="mb-4 flex flex-col gap-4 px-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-blue-600">Ad review for {accountName}</h1>
              <p className="mt-2 text-base font-semibold text-gray-700">{draft.name}</p>
              <p className="mt-1 text-sm text-gray-600">
                {creativeCount} Ad{creativeCount === 1 ? "" : "s"}
                {forms.length > 1 ? ` across ${forms.length} Launches` : ""}
              </p>
            </div>
            <div data-comment-ui className="flex shrink-0 flex-wrap items-center justify-end gap-2 self-end">
              <button
                type="button"
                onClick={() => setAdvancedPreviewOpen(true)}
                disabled={previewAds.length === 0}
                className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-xs hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Eye className="mr-2 h-4 w-4" />
                Advanced preview
              </button>
              {comments.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCommentsOpen(true)}
                  className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  View {comments.length} comment{comments.length === 1 ? "" : "s"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCommentMode((current) => !current);
                  setCommentTarget(null);
                  setInlineCommentSelection(null);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border-2 border-[#3f3e3e] px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ background: "linear-gradient(0deg, #414141 0%, #000 77.88%)" }}
              >
                {commentMode ? "Exit commenting mode" : "Leave a comment"}
              </button>
            </div>
          </header>
          {commentMode && (
            <div data-comment-ui className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
              Click any field, creative, or creative group to attach your comment.
            </div>
          )}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm sm:!rounded-[48px]">
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
      <AdvancedPreviewModal
        open={advancedPreviewOpen}
        ads={previewAds}
        onClose={() => setAdvancedPreviewOpen(false)}
      />
      <CommentsPanel
        open={commentsOpen}
        comments={comments}
        error={commentsError}
        onClose={() => setCommentsOpen(false)}
        onJumpToComment={handleJumpToComment}
      />
      <InlineCommentPopover
        selection={inlineCommentSelection}
        comments={comments}
        onClose={() => setInlineCommentSelection(null)}
        onOutsideClick={() => {
          suppressCommentClickRef.current = true;
          window.setTimeout(() => {
            suppressCommentClickRef.current = false;
          }, 0);
          setInlineCommentSelection(null);
        }}
      />
      <CommentComposer
        target={commentTarget}
        authorName={reviewerName}
        body={commentBody}
        error={commentSubmitError}
        saving={savingComment}
        onAuthorNameChange={setReviewerName}
        onBodyChange={setCommentBody}
        onCancel={() => setCommentTarget(null)}
        onSubmit={handleSubmitComment}
      />
    </CommentsContext.Provider>
  );
}
