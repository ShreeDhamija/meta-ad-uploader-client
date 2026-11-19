// Shared state for the /library pages: workspaces (synced from the ad accounts
// AppContext already holds), the current workspace's folders, and the folder
// and workspace actions. Lives above the routes so it survives navigation.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppData } from "@/lib/AppContext";
import { useAuth } from "@/lib/AuthContext";
import { damApi } from "@/lib/damApi";

const LibraryContext = createContext(null);

const lastWsKey = (userId) => `dam:lastWorkspace:${userId}`;
const accountsPayload = (accounts) =>
  (accounts || []).filter((a) => a?.id && a?.name).map(({ id, name }) => ({ id: String(id), name: String(name) }));

export function LibraryProvider({ children }) {
  const { userId } = useAuth();
  const { adAccounts, adAccountsLoading, refetchAdAccounts } = useAppData();

  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [org, setOrg] = useState(null);

  // Folders of one workspace at a time.
  const [folders, setFolders] = useState([]);
  const [foldersWs, setFoldersWs] = useState(null);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const foldersRequest = useRef(0);

  // Sidebar tree and dialogs.
  const [expanded, setExpanded] = useState(() => new Set());
  const [renamingId, setRenamingId] = useState(null);
  const [newFolder, setNewFolder] = useState(null); // { workspaceId, parentId } | null
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false);

  /* ---------------------------------------------------------- workspaces */

  // Sync whenever the set of ad accounts changes (as creative-strategy does).
  const accountFingerprint = useMemo(
    () => accountsPayload(adAccounts).map((a) => a.id).sort().join(","),
    [adAccounts],
  );
  useEffect(() => {
    if (!userId || adAccountsLoading) return;
    let cancelled = false;
    damApi
      .syncWorkspaces(accountsPayload(adAccounts))
      .then((r) => {
        if (cancelled) return;
        setWorkspaces(r.workspaces || []);
        setLoadError(null);
      })
      .catch((err) => !cancelled && setLoadError(err.message))
      .finally(() => !cancelled && setWorkspacesLoaded(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, adAccountsLoading, accountFingerprint]);

  useEffect(() => {
    if (!userId) return;
    damApi.org().then(setOrg).catch(() => {});
  }, [userId]);

  const refreshWorkspaces = useCallback(async () => {
    try {
      const accounts = (await refetchAdAccounts()) || adAccounts;
      const r = await damApi.syncWorkspaces(accountsPayload(accounts));
      setWorkspaces(r.workspaces || []);
      toast.success(r.created ? `Added ${r.created} new workspace${r.created === 1 ? "" : "s"}` : "No new ad accounts found");
    } catch (err) {
      toast.error(`Couldn't refresh workspaces: ${err.message}`);
    }
  }, [refetchAdAccounts, adAccounts]);

  const createWorkspace = useCallback(async ({ name, metaAdAccountId }) => {
    const r = await damApi.createWorkspace({ name, metaAdAccountId: metaAdAccountId || null });
    setWorkspaces((prev) => [...prev, r.workspace]);
    return r.workspace;
  }, []);

  const rememberWorkspace = useCallback(
    (id) => {
      try {
        if (userId && id) localStorage.setItem(lastWsKey(userId), id);
      } catch {
        /* storage unavailable */
      }
    },
    [userId],
  );
  const lastWorkspaceId = useCallback(() => {
    let saved = null;
    try {
      saved = userId ? localStorage.getItem(lastWsKey(userId)) : null;
    } catch {
      /* storage unavailable */
    }
    return workspaces.some((w) => w.id === saved) ? saved : workspaces[0]?.id ?? null;
  }, [userId, workspaces]);

  /* ------------------------------------------------------------- folders */

  const loadFolders = useCallback(async (workspaceId) => {
    const req = ++foldersRequest.current;
    setFoldersLoading(true);
    try {
      const r = await damApi.listFolders(workspaceId);
      if (req !== foldersRequest.current) return;
      setFolders(r.folders || []);
      setFoldersWs(workspaceId);
    } catch (err) {
      if (req === foldersRequest.current) toast.error(`Couldn't load folders: ${err.message}`);
    } finally {
      if (req === foldersRequest.current) setFoldersLoading(false);
    }
  }, []);

  const tree = useMemo(() => {
    const byId = new Map(folders.map((f) => [f.id, f]));
    const children = new Map();
    for (const f of folders) {
      const key = f.parentId && byId.has(f.parentId) ? f.parentId : null;
      if (!children.has(key)) children.set(key, []);
      children.get(key).push(f);
    }
    for (const list of children.values()) list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    const childrenOf = (id) => children.get(id ?? null) || [];
    const pathTo = (id) => {
      const out = [];
      for (let f = byId.get(id); f && out.length < 100; f = f.parentId ? byId.get(f.parentId) : null) out.unshift(f);
      return out;
    };
    const isInside = (id, ancestorId) => pathTo(id).some((f) => f.id === ancestorId);
    return { byId, childrenOf, pathTo, isInside };
  }, [folders]);

  const expand = useCallback((ids) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);
  const toggleExpanded = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const createFolder = useCallback(
    async ({ workspaceId, name, parentId }) => {
      const r = await damApi.createFolder({ workspaceId, name, parentId: parentId || null });
      setFolders((prev) => [...prev, { id: r.folder.id, parentId: r.folder.parentId, name: r.folder.name }]);
      if (parentId) expand([parentId]);
      return r.folder;
    },
    [expand],
  );

  const renameFolder = useCallback(async (id, name) => {
    try {
      const r = await damApi.updateFolder(id, { name });
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: r.folder.name } : f)));
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  }, []);

  /** Move a folder under `parentId` (null = top level). Checked here first, then by the service. */
  const moveFolder = useCallback(
    async (id, parentId) => {
      const folder = tree.byId.get(id);
      if (!folder || (folder.parentId ?? null) === (parentId ?? null)) return;
      if (parentId && (parentId === id || tree.isInside(parentId, id))) {
        toast.error("A folder can't be moved into itself or one of its subfolders");
        return;
      }
      try {
        const r = await damApi.updateFolder(id, { parentId: parentId || null });
        setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, parentId: r.folder.parentId } : f)));
        if (parentId) expand([parentId]);
        const target = parentId ? tree.byId.get(parentId)?.name : "the top level";
        toast.success(`Moved "${folder.name}" to ${target}`);
      } catch (err) {
        toast.error(err.message);
      }
    },
    [tree, expand],
  );

  const value = {
    workspaces,
    workspacesLoaded,
    loadError,
    org,
    refreshWorkspaces,
    createWorkspace,
    rememberWorkspace,
    lastWorkspaceId,
    folders,
    foldersWs,
    foldersLoading,
    loadFolders,
    tree,
    expanded,
    expand,
    toggleExpanded,
    createFolder,
    renameFolder,
    moveFolder,
    renamingId,
    setRenamingId,
    newFolder,
    setNewFolder,
    newWorkspaceOpen,
    setNewWorkspaceOpen,
  };
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside LibraryProvider");
  return ctx;
}

/** Drag-and-drop payload type for folders. */
export const FOLDER_DRAG_TYPE = "application/x-dam-folder";
