import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronRight, Film, Image as ImageIcon, Loader2, ArrowLeft, Search, X } from "lucide-react";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  // Keep browsing data and the navigation stack intact while showing search results.
  const [search, setSearch] = useState(null);
  const searchInputRef = useRef(null);
  const searchRequestRef = useRef(null);
  const searchButtonRef = useRef(null);
  const [breadcrumbRoot, setBreadcrumbRoot] = useState(null);
  const [breadcrumbsOverflow, setBreadcrumbsOverflow] = useState(false);

  useEffect(() => {
    const viewport = breadcrumbRoot?.querySelector('[data-radix-scroll-area-viewport]');
    const content = viewport?.firstElementChild;
    if (!viewport || !content) return;
    const measure = () => setBreadcrumbsOverflow(viewport.scrollWidth > viewport.clientWidth + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(content);
    measure();
    viewport.scrollLeft = viewport.scrollWidth;
    return () => observer.disconnect();
  }, [breadcrumbRoot, stack]);

  const clearSearch = useCallback(() => {
    searchRequestRef.current?.abort();
    searchRequestRef.current = null;
    setSearchInput("");
    setSearch(null);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!open) {
      clearSearch();
      setSearchOpen(false);
    }
    return () => {
      searchRequestRef.current?.abort();
      searchRequestRef.current = null;
    };
  }, [open, clearSearch]);

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
        url = `${API_BASE_URL}/api/frameio/accounts?pageSize=${PAGE_SIZE}`;
        if (after) url += `&after=${encodeURIComponent(after)}`;
        listKey = "accounts";
      } else if (view.kind === "workspaces") {
        url = `${API_BASE_URL}/api/frameio/workspaces?accountId=${encodeURIComponent(view.accountId)}&pageSize=${PAGE_SIZE}`;
        if (after) url += `&after=${encodeURIComponent(after)}`;
        listKey = "workspaces";
      } else if (view.kind === "projects") {
        url = `${API_BASE_URL}/api/frameio/projects?accountId=${encodeURIComponent(view.accountId)}&pageSize=${PAGE_SIZE}`;
        if (view.workspaceId) url += `&workspaceId=${encodeURIComponent(view.workspaceId)}`;
        if (after) url += `&after=${encodeURIComponent(after)}`;
        listKey = "projects";
      } else if (view.kind === "project-root") {
        // Fetch project to discover its root folder, then list folder-children
        const projRes = await fetch(`${API_BASE_URL}/api/frameio/project?accountId=${encodeURIComponent(view.accountId)}&projectId=${encodeURIComponent(view.projectId)}`, { credentials: "include" });
        if (requestId !== latestRequestRef.current) return;
        if (!projRes.ok) {
          const failure = await projRes.json().catch(() => ({}));
          throw new Error(`Failed to load project (${projRes.status})${failure.debugId ? ` — reference ${failure.debugId}` : ""}`);
        }
        const projData = await projRes.json();
        if (requestId !== latestRequestRef.current) return;
        const rootFolderId = projData?.project?.root_folder_id || projData?.root_folder_id || projData?.data?.root_folder_id;
        if (!rootFolderId) throw new Error(`Project has no root folder${projData.debugId ? ` — reference ${projData.debugId}` : ""}`);
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
      if (!res.ok) {
        const failure = await res.json().catch(() => ({}));
        throw new Error(`Request failed (${res.status})${failure.debugId ? ` — reference ${failure.debugId}` : ""}`);
      }
      const data = await res.json();
      if (requestId !== latestRequestRef.current) return;

      const list = data[listKey] || data.data || [];
      const pagination = data.pagination || {};
      const next = pagination.after || null;

      setItems(prev => append ? [...prev, ...list] : list);
      setNextAfter(next);
    } catch (e) {
      if (requestId !== latestRequestRef.current) return;
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
    clearSearch();
    setSearchOpen(false);
    setStack(prev => [...prev, nextEntry]);
  }, [clearSearch]);

  const handleBack = useCallback(() => {
    clearSearch();
    setSearchOpen(false);
    setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  }, [clearSearch]);

  const handleBreadcrumbClick = useCallback((index) => {
    clearSearch();
    setSearchOpen(false);
    setStack(prev => prev.slice(0, index + 1));
  }, [clearSearch]);

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
          thumbnailUrl: getFrameioItemThumbnailUrl(item) || buildFrameioThumbnailProxyUrl(accountId, id),
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

  const fetchSearch = useCallback(async (query, after = null) => {
    const submittedQuery = query.trim();
    if (!currentAccountId || !submittedQuery) return;
    searchRequestRef.current?.abort();
    const controller = new AbortController();
    searchRequestRef.current = controller;
    setSearch(prev => ({
      query: submittedQuery,
      items: after ? prev?.items || [] : [],
      nextAfter: after,
      loading: true,
      loadingMore: Boolean(after),
      error: null,
    }));
    try {
      const params = new URLSearchParams({ accountId: currentAccountId, query: submittedQuery, pageSize: String(PAGE_SIZE) });
      if (after) params.set("after", after);
      const res = await fetch(`${API_BASE_URL}/api/frameio/search?${params}`, { credentials: "include", signal: controller.signal });
      const data = await res.json();
      if (searchRequestRef.current !== controller) return;
      if (!res.ok) throw new Error(`${data.error || "Search failed"}${data.debugId ? ` — reference ${data.debugId}` : ""}`);
      setSearch(prev => ({
        query: submittedQuery,
        items: Array.from(new Map([...(after ? prev.items : []), ...(data.items || [])].map(item => [item.id, item])).values()),
        nextAfter: data.pagination?.after || null,
        loading: false,
        loadingMore: false,
        error: null,
      }));
    } catch (err) {
      if (searchRequestRef.current !== controller || controller.signal.aborted) return;
      setSearch(prev => ({ ...prev, loading: false, loadingMore: false, error: err.message || "Search failed" }));
    } finally {
      if (searchRequestRef.current === controller) searchRequestRef.current = null;
    }
  }, [currentAccountId]);

  const handleLoadMore = () => {
    if (search) {
      if (search.nextAfter && !search.loading && !searchRequestRef.current) fetchSearch(search.query, search.nextAfter);
    } else if (nextAfter && !loading && !loadingMore) {
      fetchView(current, { append: true, after: nextAfter });
    }
  };

  const visibleItems = search ? search.items : items;
  const visibleLoading = search ? search.loading && !search.loadingMore : loading;
  const visibleLoadingMore = search ? search.loadingMore : loadingMore;
  const visibleError = search ? search.error : error;
  const visibleNextAfter = search ? search.nextAfter : nextAfter;

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
          onEscapeKeyDown={(event) => {
            if (!searchOpen) return;
            event.preventDefault();
            clearSearch();
            setSearchOpen(false);
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex h-[min(625px,calc(100dvh-2rem))] min-h-0 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden border-0 bg-[#FFFFFF] px-5 py-5 shadow-xl transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100 focus:outline-none sm:rounded-[28px]"
          )}
        >
          <DialogPrimitive.Close className="absolute right-5 top-5 rounded-full p-2 text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <DialogHeader className="shrink-0 space-y-0">
            <div className="flex min-h-10 items-center gap-2 pr-10">
              <div className={cn("h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white", searchOpen ? "hidden sm:flex" : "flex")}>
                <img src={FrameHeaderImage} alt="Frame.io" className="h-full w-full object-cover" />
              </div>
              <DialogTitle className={cn("shrink-0 whitespace-nowrap text-lg font-semibold tracking-[-0.02em] text-[#111111] sm:text-xl", searchOpen && "sr-only sm:not-sr-only")}>
                Select Media
              </DialogTitle>
              <div
                role="search"
                className={cn(
                  "ml-auto flex h-10 min-w-0 items-center overflow-hidden rounded-full transition-[width,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
                  searchOpen ? "w-[min(20rem,calc(100vw-7rem))] bg-[#F3F4F6] ring-1 ring-[#E2E2E2]" : "w-10",
                )}
              >
                <button
                  ref={searchButtonRef}
                  type="button"
                  aria-label={searchOpen ? "Search account" : "Open account search"}
                  aria-expanded={searchOpen}
                  title={currentAccountId ? "Search this account" : "Choose an account to search"}
                  disabled={!currentAccountId}
                  onClick={() => searchOpen ? fetchSearch(searchInput) : setSearchOpen(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#6B7280] hover:bg-[#E5E7EB] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Search className="h-4 w-4" />
                </button>
                <div className={cn("flex min-w-0 flex-1 items-center gap-1 pr-1 transition-opacity duration-200 motion-reduce:transition-none", searchOpen ? "opacity-100" : "invisible opacity-0")}>
                  <input
                    ref={searchInputRef}
                    aria-label="Search files across this account"
                    placeholder="Search account…"
                    value={searchInput}
                    maxLength={1000}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value.trim()) clearSearch();
                      else setSearchInput(value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        event.stopPropagation();
                        fetchSearch(searchInput);
                      }
                    }}
                    className="w-full min-w-0 bg-transparent text-sm text-[#111111] outline-none placeholder:text-[#9CA3AF]"
                  />
                  <button
                    type="button"
                    aria-label={searchInput ? "Clear search and return to browsing" : "Collapse search"}
                    onClick={() => {
                      if (!searchInput.trim()) {
                        clearSearch();
                        setSearchOpen(false);
                        searchButtonRef.current?.focus();
                      } else {
                        clearSearch();
                        searchInputRef.current?.focus();
                      }
                    }}
                    className="shrink-0 rounded-full p-1.5 text-[#6B7280] hover:bg-[#E5E7EB]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!searchInput.trim() || !currentAccountId}
                    onClick={() => fetchSearch(searchInput)}
                    className="h-8 shrink-0 rounded-full bg-[#111111] px-3 text-xs font-medium text-white hover:bg-[#2563EB] disabled:opacity-40"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Breadcrumb */}
          {search ? (
            <div role="status" className="truncate text-sm text-[#5F5F5F]" title={search.query}>
              Account results for “{search.query}”
            </div>
          ) : <div className="flex shrink-0 items-center gap-3 text-sm text-[#5F5F5F]">
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
            <ScrollArea
              ref={setBreadcrumbRoot}
              className={cn("min-w-0 flex-1 rounded-full border border-transparent [&_[data-orientation=horizontal]]:h-1.5 [&_[data-orientation=horizontal]]:border-0 [&_[data-orientation=horizontal]]:px-3", breadcrumbsOverflow && "border-[#E2E2E2]")}
            >
              <div className="flex w-max items-center gap-1 whitespace-nowrap px-1 py-1">
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
            </ScrollArea>
          </div>}

          {/* List */}
          {!search && current.kind === "workspaces" && (
            <Button
              type="button"
              variant="outline"
              className="self-start rounded-full"
              onClick={() => handleNavigate({ kind: "projects", accountId: current.accountId, name: "All projects" })}
            >
              All projects, including invited projects
            </Button>
          )}
          <ScrollArea
            key={search ? `search:${search.query}` : [current.kind, current.accountId, current.workspaceId, current.projectId, current.folderId].filter(Boolean).join(":")}
            className="h-0 min-h-0 flex-1 overflow-hidden rounded-[20px] border border-[#E2E2E2] bg-[#F0F0F0]"
            viewportClassName="h-full overscroll-contain"
          >
            <div className="divide-y divide-[#E1E1E1]">
              {visibleLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[#6B7280]" />
                </div>
              )}

              {visibleError && !visibleLoading && (
                <div role="alert" className="p-4 text-sm text-red-600">{visibleError}</div>
              )}

              {!visibleLoading && !visibleError && visibleItems.length === 0 && (
                <div className="p-4 text-sm text-[#6B7280]">{search ? (visibleNextAfter ? "No image or video matches on this page. Load more to continue." : "No matching images or videos.") : "No items."}</div>
              )}

              {!visibleLoading && visibleItems.map((item) => {
                const folder = isFolder(item);
                const navigable = !search && isNavigable(item, current.kind);
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
                      {!search && (current.kind === "accounts" || current.kind === "workspaces" || current.kind === "projects") ? (
                        <BlueFolderIcon className="h-5 w-5" />
                      ) : folder ? (
                        <BlueFolderIcon className="h-5 w-5" />
                      ) : itemThumbnail ? (
                        <img src={itemThumbnail} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      ) : (item.media_type || "").startsWith("video") ? (
                        <Film className="h-5 w-5 text-[#6B7280]" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-[#6B7280]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium text-[#111111]">{item.display_name || item.name}</div>
                      {!navigable && (search || current.kind === "folder") && (
                        <div className="truncate text-xs text-[#6B7280]" title={search ? item.breadcrumbPath : undefined}>
                          {(item.media_type || guessMime(item.name) || "").split("/")[0] || "file"}
                          {(item.file_size || item.filesize) ? ` • ${formatBytes(item.file_size || item.filesize)}` : ""}
                          {search && ` • ${item.breadcrumbPath || "Path unavailable"}`}
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

              {visibleNextAfter && !visibleLoading && (
                <div className="flex justify-center py-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={visibleLoadingMore}
                    className="rounded-full border-[#D7D7D7] bg-white px-4 hover:bg-[#E3E3E3]"
                  >
                    {visibleLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex shrink-0 items-center justify-between pt-2">
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
