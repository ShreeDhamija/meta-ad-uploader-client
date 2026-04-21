import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Folder, Film, Image as ImageIcon, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.withblip.com";
const PAGE_SIZE = 50;

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
  const [stack, setStack] = useState([{ kind: "accounts", name: "Accounts" }]);
  const current = stack[stack.length - 1];

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // selected[frameioId] = { frameioId, frameioAccountId, name, mimeType, size, thumbnailUrl, width, height }
  const [selected, setSelected] = useState({});

  // Reset on open
  useEffect(() => {
    if (open) {
      setStack([{ kind: "accounts", name: "Accounts" }]);
      setSelected({});
      setError(null);
    }
  }, [open]);

  const fetchView = useCallback(async (view, opts = {}) => {
    const { append = false, pageNum = 1 } = opts;
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
        url = `${API_BASE_URL}/api/frameio/projects?accountId=${encodeURIComponent(view.accountId)}&workspaceId=${encodeURIComponent(view.workspaceId)}&page=${pageNum}&pageSize=${PAGE_SIZE}`;
        listKey = "projects";
      } else if (view.kind === "project-root") {
        // Fetch project to discover its root folder, then list folder-children
        const projRes = await fetch(`${API_BASE_URL}/api/frameio/project?accountId=${encodeURIComponent(view.accountId)}&projectId=${encodeURIComponent(view.projectId)}`, { credentials: "include" });
        if (!projRes.ok) throw new Error(`Failed to load project (${projRes.status})`);
        const projData = await projRes.json();
        const rootFolderId = projData?.project?.root_folder_id || projData?.root_folder_id || projData?.data?.root_folder_id;
        if (!rootFolderId) throw new Error("Project has no root folder");
        // Replace current stack entry with a 'folder' entry pointing to root
        setStack(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { kind: "folder", accountId: view.accountId, projectId: view.projectId, folderId: rootFolderId, name: view.name };
          return copy;
        });
        return; // useEffect will re-fetch
      } else if (view.kind === "folder") {
        url = `${API_BASE_URL}/api/frameio/folder-children?accountId=${encodeURIComponent(view.accountId)}&folderId=${encodeURIComponent(view.folderId)}&page=${pageNum}&pageSize=${PAGE_SIZE}`;
        listKey = "items";
      } else {
        throw new Error(`Unknown view kind: ${view.kind}`);
      }

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();

      const list = data[listKey] || data.data || [];
      const pagination = data.pagination || {};
      const totalPages = pagination.total_pages || pagination.totalPages || 1;
      const more = pageNum < totalPages;

      setItems(prev => append ? [...prev, ...list] : list);
      setHasMore(more);
      setPage(pageNum);
    } catch (e) {
      console.error("Frame.io picker error:", e);
      setError(e.message || "Failed to load");
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, []);

  // Re-fetch on stack change
  useEffect(() => {
    if (!open) return;
    setItems([]);
    setPage(1);
    setHasMore(false);
    fetchView(current, { pageNum: 1 });
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
    fetchView(current, { append: true, pageNum: page + 1 });
  }, [current, page, fetchView]);

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
          size: item.filesize || item.size || 0,
          thumbnailUrl: item.thumb || item.thumbnail || item.cover_asset_id || null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Frame.io — Select Media</DialogTitle>
        </DialogHeader>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-gray-600 flex-wrap">
          {stack.length > 1 && (
            <Button type="button" variant="ghost" size="sm" onClick={handleBack} className="h-7 px-2">
              <ArrowLeft className="h-3 w-3 mr-1" /> Back
            </Button>
          )}
          {stack.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(idx)}
                className="hover:underline truncate max-w-[160px]"
              >
                {entry.name}
              </button>
              {idx < stack.length - 1 && <ChevronRight className="h-3 w-3 text-gray-400" />}
            </div>
          ))}
        </div>

        {/* List */}
        <ScrollArea className="flex-1 border rounded-md">
          <div className="p-2">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              </div>
            )}

            {error && !loading && (
              <div className="text-red-600 text-sm p-3">{error}</div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="text-gray-500 text-sm p-3">No items.</div>
            )}

            {!loading && !error && items.map((item) => {
              const folder = isFolder(item);
              const navigable = isNavigable(item, current.kind);
              const mediaOk = !navigable && isImageOrVideo(item);
              const disabled = !navigable && !mediaOk;
              const isSelected = !!selected[item.id];

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-2 py-2 rounded-md ${disabled ? "opacity-50" : "hover:bg-gray-100 cursor-pointer"} ${isSelected ? "bg-blue-50" : ""}`}
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
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                    {(current.kind === "accounts" || current.kind === "workspaces" || current.kind === "projects") ? (
                      <Folder className="h-5 w-5 text-gray-500" />
                    ) : folder ? (
                      <Folder className="h-5 w-5 text-gray-500" />
                    ) : item.thumb ? (
                      <img src={item.thumb} alt="" className="w-full h-full object-cover" />
                    ) : (item.media_type || "").startsWith("video") ? (
                      <Film className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-gray-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.display_name || item.name}</div>
                    {!navigable && current.kind === "folder" && (
                      <div className="text-xs text-gray-500">
                        {(item.media_type || guessMime(item.name) || "").split("/")[0] || "file"}
                        {item.filesize ? ` • ${formatBytes(item.filesize)}` : ""}
                      </div>
                    )}
                  </div>

                  {!navigable && mediaOk && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => { e.stopPropagation(); toggleSelect(item, currentAccountId); }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4"
                    />
                  )}

                  {navigable && <ChevronRight className="h-4 w-4 text-gray-400" />}
                </div>
              );
            })}

            {hasMore && !loading && (
              <div className="flex justify-center py-3">
                <Button type="button" variant="outline" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-gray-600">{selectedCount} selected</div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" onClick={handleConfirm} disabled={selectedCount === 0}>Add Files</Button>
          </div>
        </DialogFooter>
      </DialogContent>
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
