// The asset library (/library/*). Routes (C13):
//   /library                                → the last-used workspace
//   /library/w/:workspaceId                 → Home
//   /library/w/:workspaceId/assets          → All assets
//   /library/w/:workspaceId/folders         → Folders
//   /library/w/:workspaceId/folder/:folderId
//   /library/w/:workspaceId/search?q=
//   /library/w/:workspaceId/trash
//   /library/assigned
// Only mounted when VITE_ENABLE_DAM === "true" (see main.jsx).
import { FolderPlus, Folder, Image, Layers, Search, Trash2, UserCheck } from "lucide-react";
import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/dam/Breadcrumbs";
import FolderCard from "@/components/dam/FolderCard";
import HomeView from "@/components/dam/HomeView";
import { LibraryProvider, useLibrary } from "@/components/dam/LibraryContext";
import PageHeader, { EmptyState } from "@/components/dam/PageHeader";
import Sidebar from "@/components/dam/Sidebar";
import NewFolderDialog from "@/components/dam/dialogs/NewFolderDialog";
import NewWorkspaceDialog from "@/components/dam/dialogs/NewWorkspaceDialog";
import { useAuth } from "@/lib/AuthContext";

function NewFolderButton({ workspaceId, parentId = null, label = "New folder" }) {
  const { setNewFolder } = useLibrary();
  return (
    <Button variant="outline" size="sm" onClick={() => setNewFolder({ workspaceId, parentId })}>
      <FolderPlus /> {label}
    </Button>
  );
}

function FoldersPage({ workspace }) {
  const { tree, foldersWs } = useLibrary();
  const roots = tree.childrenOf(null);
  return (
    <>
      <PageHeader
        title="Folders"
        subtitle="Right-click a folder to rename it or add a subfolder. Drag a folder onto another to move it."
        actions={<NewFolderButton workspaceId={workspace.id} />}
      />
      {foldersWs === workspace.id && roots.length === 0 ? (
        <EmptyState icon={Folder} title="No folders yet" action={<NewFolderButton workspaceId={workspace.id} />}>
          Folders keep a workspace's creatives organised. You can nest them as deep as you like.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
          {roots.map((f) => (
            <FolderCard key={f.id} folder={f} workspaceId={workspace.id} />
          ))}
        </div>
      )}
    </>
  );
}

function FolderPage({ workspace, folderId }) {
  const { tree, foldersWs } = useLibrary();
  const folder = tree.byId.get(folderId);
  if (!folder) {
    if (foldersWs !== workspace.id) return <p className="text-sm text-neutral-500">Loading…</p>;
    return (
      <EmptyState
        icon={Folder}
        title="This folder doesn't exist"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to={`/library/w/${workspace.id}`}>Go to {workspace.name}</Link>
          </Button>
        }
      >
        It may have been moved to the trash or belong to another workspace.
      </EmptyState>
    );
  }
  const subs = tree.childrenOf(folder.id);
  return (
    <>
      <PageHeader
        title={folder.name}
        breadcrumb={<Breadcrumbs workspace={workspace} path={tree.pathTo(folder.id)} />}
        actions={<NewFolderButton workspaceId={workspace.id} parentId={folder.id} label="New subfolder" />}
      />
      {subs.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {subs.map((f) => (
            <FolderCard key={f.id} folder={f} workspaceId={workspace.id} compact />
          ))}
        </div>
      )}
      <EmptyState icon={Image} title="No assets in this folder yet">
        Uploading images and videos is coming soon.
      </EmptyState>
    </>
  );
}

function ComingSoon({ icon, title, subtitle, note }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <EmptyState icon={icon} title="Coming soon">
        {note}
      </EmptyState>
    </>
  );
}

function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  return <ComingSoon icon={Search} title={`Results for "${q}"`} note="Search across folders, assets and tags arrives with tags and filters." />;
}

/** Sidebar + main area for one workspace. */
function Shell({ view }) {
  const params = useParams();
  const lib = useLibrary();
  const workspaceId = params.workspaceId ?? lib.lastWorkspaceId();
  const workspace = lib.workspaces.find((w) => w.id === workspaceId);
  const folderId = view === "folder" ? params.folderId : null;
  const { loadFolders, foldersWs, rememberWorkspace, expand, tree } = lib;

  useEffect(() => {
    if (workspace && foldersWs !== workspace.id) loadFolders(workspace.id);
  }, [workspace, foldersWs, loadFolders]);

  useEffect(() => {
    if (workspace) rememberWorkspace(workspace.id);
  }, [workspace, rememberWorkspace]);

  // Open the tree down to the current folder.
  useEffect(() => {
    if (folderId && foldersWs === workspaceId) expand(tree.pathTo(folderId).slice(0, -1).map((f) => f.id));
  }, [folderId, foldersWs, workspaceId, tree, expand]);

  if (!lib.workspacesLoaded) return <FullPageMessage>Loading your library…</FullPageMessage>;
  if (!workspace) return <Navigate to="/library" replace />;

  let content;
  if (view === "home") content = <HomeView workspace={workspace} />;
  else if (view === "folders") content = <FoldersPage workspace={workspace} />;
  else if (view === "folder") content = <FolderPage key={folderId} workspace={workspace} folderId={folderId} />;
  else if (view === "assets")
    content = <ComingSoon icon={Layers} title="All assets" subtitle={`Everything uploaded to ${workspace.name}, across every folder.`} note="Uploading and browsing assets arrives in the next steps." />;
  else if (view === "trash")
    content = <ComingSoon icon={Trash2} title="Trash" subtitle="Items are permanently deleted 30 days after they were trashed." note="The trash page arrives in a later step." />;
  else if (view === "assigned")
    content = <ComingSoon icon={UserCheck} title="Assigned to me" subtitle="Folders and creatives assigned to you, across all workspaces." note="Assignments arrive in a later step." />;
  else if (view === "search") content = <SearchPage />;

  return (
    <div className="flex h-screen bg-neutral-100">
      <Sidebar workspaceId={workspace.id} view={view} currentFolderId={folderId} />
      <main className="my-3 mr-3 min-w-0 flex-1 overflow-y-auto rounded-3xl border border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 p-6 pb-24">{content}</div>
      </main>
    </div>
  );
}

function FullPageMessage({ children }) {
  return <div className="flex h-screen items-center justify-center bg-neutral-100 text-sm text-neutral-500">{children}</div>;
}

/** /library → the last-used workspace, or a prompt to create one. */
function LibraryIndex() {
  const { workspacesLoaded, workspaces, loadError, lastWorkspaceId, setNewWorkspaceOpen } = useLibrary();
  if (!workspacesLoaded) return <FullPageMessage>Loading your library…</FullPageMessage>;
  if (loadError && !workspaces.length) return <FullPageMessage>Couldn't load your library: {loadError}</FullPageMessage>;
  if (!workspaces.length) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-100 p-6">
        <div className="w-full max-w-md">
          <EmptyState
            icon={Folder}
            title="No workspaces yet"
            action={<Button onClick={() => setNewWorkspaceOpen(true)}>New workspace</Button>}
          >
            A workspace is created for each ad account you connect. You can also make one by hand.
          </EmptyState>
        </div>
      </div>
    );
  }
  return <Navigate to={`/library/w/${lastWorkspaceId()}`} replace />;
}

export default function Library() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) navigate("/login", { replace: true, state: { from: location.pathname } });
  }, [isLoggedIn, navigate, location.pathname]);
  if (!isLoggedIn) return null;

  return (
    <LibraryProvider>
      <Toaster richColors position="bottom-left" closeButton />
      <Routes>
        <Route index element={<LibraryIndex />} />
        <Route path="assigned" element={<Shell view="assigned" />} />
        <Route path="w/:workspaceId" element={<Shell view="home" />} />
        <Route path="w/:workspaceId/assets" element={<Shell view="assets" />} />
        <Route path="w/:workspaceId/folders" element={<Shell view="folders" />} />
        <Route path="w/:workspaceId/folder/:folderId" element={<Shell view="folder" />} />
        <Route path="w/:workspaceId/search" element={<Shell view="search" />} />
        <Route path="w/:workspaceId/trash" element={<Shell view="trash" />} />
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Routes>
      <NewFolderDialog />
      <NewWorkspaceDialog />
    </LibraryProvider>
  );
}
