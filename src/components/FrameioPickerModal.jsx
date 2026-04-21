import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronRight, Film, Image as ImageIcon, Loader2, ArrowLeft, X } from "lucide-react";
import FrameHeaderImage from "@/assets/icons/Frame.webp";
import BlueFolderIcon from "@/assets/icons/BlueFolder.svg?react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";
const PAGE_SIZE = 50;
const ROOT_STACK = [{ kind: "accounts", name: "Accounts" }];

/**
 * Frame.io media picker.
 * Props:
 *  - open: boolean
 *  - onOpenChange: (boolean) => void
 *  - accessToken: string (unused — backend uses session cookie, but kept for symmetry)
 *  - onConfirm: (Array<{frameioId, frameioAccountId, name, mimeType, size, thumbnailUrl, width, height}>) => void
 */
export default function FrameioPickerModal({ open, onOpenChange, onConfirm }) {
  // Navigation stack: each entry = { kind: 'accounts'|'workspaces'|'projects'|'folder', accountId?, workspaceId?, projectId?, folderId?, name }
  const [stack, setStack] = useState(ROOT_STACK);
  const current = stack[stack.length - 1];
  const latestRequestRef = useRef(0);
  const lastViewedStackRef = useRef(ROOT_STACK);

  const [items, setItems] = useState([]);
  const [nextAfter, setNextAfter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // selected[frameioId] = { frameioId, frameioAccountId, name, mimeType, size, thumbnailUrl, width, height }
  const [selected, setSelected] = useState({});

  // Restore the last viewed location within the current app session.
  useEffect(() => {
    if (open) {
      setStack(lastViewedStackRef.current);
      setSelected({});
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (stack.length > 0) {
      lastViewedStackRef.current = stack;
    }
  }, [stack]);

  // Invalidate in-flight responses when the popup closes so stale data can't overwrite the next open.
  useEffect(() => {
    if (!open) {
      latestRequestRef.current += 1;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [open]);

  const fetchView = useCallback(async (view, opts = {}) => {
    const { append = false, after = null } = opts;
    const requestId = ++latestRequestRef.current;
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);

    try {
      let url, listKey;
      if (view.kind === "accounts") {
        url = `${API_BASE_URL}/api/frameio/accounts`;
        listKey = "accounts";
      } else if (view.kind === "workspaces") {
        url = `${API_BASE_URL}/api/frameio/workspaces?accountId=${encodeURIComponent(view.accountId)}`;
        listKey = "workspaces";
      } else if (view.kind === "projects") {
        url = `${API_BASE_URL}/api/frameio/projects?accountId=${encodeURIComponent(view.accountId)}&workspaceId=${encodeURIComponent(view.workspaceId)}&pageSize=${PAGE_SIZE}`;
        if (after) url += `&after=${encodeURIComponent(after)}`;
        listKey = "projects";
      } else if (view.kind === "project-root") {
        // Fetch project to discover its root folder, then list folder-children
        const projRes = await fetch(`${API_BASE_URL}/api/frameio/project?accountId=${encodeURIComponent(view.accountId)}&projectId=${encodeURIComponent(view.projectId)}`, { credentials: "include" });
        if (requestId !== latestRequestRef.current) return;
        if (!projRes.ok) throw new Error(`Failed to load project (${projRes.status})`);
        const projData = await projRes.json();
        if (requestId !== latestRequestRef.current) return;
        const rootFolderId = projData?.project?.root_folder_id || projData?.root_folder_id || projData?.data?.root_folder_id;
        if (!rootFolderId) throw new Error("Project has no root folder");
        // Replace current stack entry with a 'folder' entry pointing to root
        setStack(prev => {
          if (requestId !== latestRequestRef.current || prev.length === 0) return prev;
          const copy = [...prev];
          copy[copy.length - 1] = { kind: "folder", accountId: view.accountId, projectId: view.projectId, folderId: rootFolderId, name: view.name };
          return copy;
        });
        return; // useEffect will re-fetch
      } else if (view.kind === "folder") {
        url = `${API_BASE_URL}/api/frameio/folder-children?accountId=${encodeURIComponent(view.accountId)}&folderId=${encodeURIComponent(view.folderId)}&pageSize=${PAGE_SIZE}`;
        if (after) url += `&after=${encodeURIComponent(after)}`;
        listKey = "items";
      } else {
        throw new Error(`Unknown view kind: ${view.kind}`);
      }

      const res = await fetch(url, { credentials: "include" });
      if (requestId !== latestRequestRef.current) return;
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      if (requestId !== latestRequestRef.current) return;

      const list = data[listKey] || data.data || [];
      const pagination = data.pagination || {};
      const next = pagination.after || null;

      setItems(prev => append ? [...prev, ...list] : list);
      setNextAfter(next);
    } catch (e) {
      if (requestId !== latestRequestRef.current) return;
      console.error("Frame.io picker error:", e);
      setError(e.message || "Failed to load");
    } finally {
      if (requestId === latestRequestRef.current) {
        if (append) setLoadingMore(false); else setLoading(false);
      }
    }
  }, []);

  // Re-fetch on stack change
  useEffect(() => {
    if (!open) return;
    setItems([]);
    setNextAfter(null);
    fetchView(current);
  }, [open, current, fetchView]);

  const handleNavigate = useCallback((nextEntry) => {
    setStack(prev => [...prev, nextEntry]);
  }, []);

  const handleBack = useCallback(() => {
    setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  }, []);

  const handleBreadcrumbClick = useCallback((index) => {
    setStack(prev => prev.slice(0, index + 1));
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!nextAfter) return;
    fetchView(current, { append: true, after: nextAfter });
  }, [current, nextAfter, fetchView]);

  const isImageOrVideo = useCallback((item) => {
    if (item.type === "folder" || item.kind === "folder") return false;
    const mt = item.media_type || item.mediaType || item.mimeType || "";
    if (typeof mt === "string") {
      if (mt.startsWith("image") || mt.startsWith("video")) return true;
    }
    // Frame.io v4 may use type field
    if (item.type === "file" || item.type === "asset") {
      const name = (item.name || "").toLowerCase();
      if (/\.(jpg|jpeg|png|gif|webp|heic|mp4|mov|webm|avi|mkv|m4v)$/.test(name)) return true;
    }
    return false;
  }, []);

  const isFolder = useCallback((item) => {
    return item.type === "folder" || item.kind === "folder" || item._type === "folder";
  }, []);

  const isNavigable = useCallback((item, viewKind) => {
    if (viewKind === "accounts" || viewKind === "workspaces" || viewKind === "projects") {
      return true;
    }
    return isFolder(item);
  }, [isFolder]);

  const toggleSelect = useCallback((item, accountId) => {
    const id = item.id;
    setSelected(prev => {
      const copy = { ...prev };
      if (copy[id]) {
        delete copy[id];
      } else {
        const mt = item.media_type || item.mediaType || item.mimeType || "";
        const mimeType = typeof mt === "string" && (mt.startsWith("image") || mt.startsWith("video")) ? mt : guessMime(item.name);
        const meta = item.media_metadata || item.metadata || {};
        copy[id] = {
          frameioId: id,
          frameioAccountId: accountId,
          name: item.name,
          mimeType,
          size: item.file_size || item.filesize || item.size || 0,
          thumbnailUrl: buildFrameioThumbnailProxyUrl(accountId, id),
          width: meta.width || item.width || null,
          height: meta.height || item.height || null,
        };
      }
      return copy;
    });
  }, []);

  const selectedCount = Object.keys(selected).length;
  const handleConfirm = useCallback(() => {
    const arr = Object.values(selected);
    if (arr.length === 0) {
      toast.error("Select at least one file");
      return;
    }
    onConfirm(arr);
  }, [selected, onConfirm]);

  // Determine current accountId for selection metadata
  const currentAccountId = useMemo(() => {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].accountId) return stack[i].accountId;
    }
    return null;
  }, [stack]);

  const handleOpenChange = useCallback((nextOpen) => {
    if (!nextOpen) {
      lastViewedStackRef.current = stack;
    }
    onOpenChange(nextOpen);
  }, [onOpenChange, stack]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#111111]/42 backdrop-blur-[2px] transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => event.preventDefault()}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 border-0 bg-[#FFFFFF] px-5 py-5 shadow-xl transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100 focus:outline-none sm:rounded-[28px]"
          )}
        >
          <DialogPrimitive.Close className="absolute right-5 top-5 rounded-full p-2 text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <DialogHeader className="space-y-0">
            <div className="flex items-center gap-4 pr-10">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] bg-white">
                <img src={FrameHeaderImage} alt="Frame.io" className="h-full w-full object-cover" />
              </div>
              <DialogTitle className="text-[28px] font-semibold tracking-[-0.02em] text-[#111111]">
                Select Media
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Breadcrumb */}
          <div className="flex items-center gap-3 text-sm text-[#5F5F5F]">
            {stack.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-9 rounded-full px-3 text-[#4D4D4D] hover:bg-[#F0F0F0] hover:text-[#111111]"
              >
                <ArrowLeft className="h-3 w-3 mr-1" /> Back
              </Button>
            )}
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="flex min-w-max items-center gap-1 whitespace-nowrap pr-1">
                {stack.map((entry, idx) => {
                  const isLast = idx === stack.length - 1;

                  return (
                    <div key={idx} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleBreadcrumbClick(idx)}
                        title={entry.name}
                        className={`max-w-[140px] truncate rounded-full px-2 py-1 transition-colors sm:max-w-[180px] ${isLast ? "bg-[#F0F0F0] font-medium text-[#111111]" : "text-[#5F5F5F] hover:bg-[#F0F0F0] hover:text-[#111111]"}`}
                      >
                        {entry.name}
                      </button>
                      {!isLast && <ChevronRight className="h-3 w-3 text-[#A3A3A3]" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* List */}
          <ScrollArea className="flex-1 overflow-hidden rounded-[20px] border border-[#E2E2E2] bg-[#F0F0F0]">
            <div className="divide-y divide-[#E1E1E1]">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[#6B7280]" />
                </div>
              )}

              {error && !loading && (
                <div className="p-4 text-sm text-red-600">{error}</div>
              )}

              {!loading && !error && items.length === 0 && (
                <div className="p-4 text-sm text-[#6B7280]">No items.</div>
              )}

              {!loading && !error && items.map((item) => {
                const folder = isFolder(item);
                const navigable = isNavigable(item, current.kind);
                const mediaOk = !navigable && isImageOrVideo(item);
                const disabled = !navigable && !mediaOk;
                const isSelected = !!selected[item.id];
                const itemThumbnail = mediaOk
                  ? getFrameioItemThumbnailUrl(item) || buildFrameioThumbnailProxyUrl(currentAccountId, item.id)
                  : null;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 px-4 py-2 transition-colors ${disabled ? "opacity-50" : "cursor-pointer hover:bg-[#E3E3E3]"} ${isSelected ? "bg-[#DCEBFF] hover:bg-[#D2E7FF]" : ""}`}
                    onClick={() => {
                      if (navigable) {
                        if (current.kind === "accounts") {
                          handleNavigate({ kind: "workspaces", accountId: item.id, name: item.display_name || item.name });
                        } else if (current.kind === "workspaces") {
                          handleNavigate({ kind: "projects", accountId: current.accountId, workspaceId: item.id, name: item.name });
                        } else if (current.kind === "projects") {
                          handleNavigate({ kind: "project-root", accountId: current.accountId, projectId: item.id, name: item.name });
                        } else if (current.kind === "folder") {
                          handleNavigate({ kind: "folder", accountId: current.accountId, projectId: current.projectId, folderId: item.id, name: item.name });
                        }
                      } else if (mediaOk) {
                        toggleSelect(item, currentAccountId);
                      }
                    }}
                  >
                    {/* Thumb / icon */}
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(17,17,17,0.06)]">
                      {(current.kind === "accounts" || current.kind === "workspaces" || current.kind === "projects") ? (
                        <BlueFolderIcon className="h-5 w-5" />
                      ) : folder ? (
                        <BlueFolderIcon className="h-5 w-5" />
                      ) : itemThumbnail ? (
                        <img src={itemThumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (item.media_type || "").startsWith("video") ? (
                        <Film className="h-5 w-5 text-[#6B7280]" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-[#6B7280]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium text-[#111111]">{item.display_name || item.name}</div>
                      {!navigable && current.kind === "folder" && (
                        <div className="text-xs text-[#6B7280]">
                          {(item.media_type || guessMime(item.name) || "").split("/")[0] || "file"}
                          {(item.file_size || item.filesize) ? ` • ${formatBytes(item.file_size || item.filesize)}` : ""}
                        </div>
                      )}
                    </div>

                    {!navigable && mediaOk && (
                      <div
                        className="flex items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(item, currentAccountId)}
                          className="h-5 w-5 rounded-md border-[#C7C7C7] data-[state=checked]:border-[#2563EB] data-[state=checked]:bg-[#2563EB]"
                        />
                      </div>
                    )}

                    {navigable && <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />}
                  </div>
                );
              })}

              {nextAfter && !loading && (
                <div className="flex justify-center py-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="rounded-full border-[#D7D7D7] bg-white px-4 hover:bg-[#E3E3E3]"
                  >
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex items-center justify-between pt-2">
            <div className="text-sm text-[#5F5F5F]">{selectedCount} selected</div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 rounded-full border-[#D7D7D7] bg-white px-6 text-[#111111] hover:bg-[#F3F3F3]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={selectedCount === 0}
                className="h-11 rounded-full bg-[#111111] px-6 text-white hover:bg-[#2563EB]"
              >
                Add Files
              </Button>
            </div>
          </DialogFooter>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}

function guessMime(name = "") {
  const lower = name.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".m4v")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".avi")) return "video/x-msvideo";
  if (lower.endsWith(".mkv")) return "video/x-matroska";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  return "";
}

function formatBytes(bytes) {
  if (!bytes || bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFrameioItemThumbnailUrl(item) {
  return item?.thumbnail_download_url
    || item?.thumbnail_url
    || item?.thumb
    || item?.thumbnail
    || item?.media_links?.thumbnail?.download_url
    || item?.media_links?.thumbnail?.url
    || item?.cover_asset?.thumbnail_download_url
    || item?.cover_asset?.thumbnail_url
    || null;
}

function buildFrameioThumbnailProxyUrl(accountId, fileId) {
  if (!accountId || !fileId) return null;
  return `${API_BASE_URL}/api/frameio/thumbnail?accountId=${encodeURIComponent(accountId)}&fileId=${encodeURIComponent(fileId)}`;
}
