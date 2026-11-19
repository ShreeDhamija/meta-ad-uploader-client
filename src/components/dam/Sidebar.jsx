// Library sidebar (C13): back to launcher, workspace switcher, search, then
// Home, All assets, Folders, Assigned to me, Trash; then the folder tree.
// Pinned joins in Step 7.
import { Folder, FolderPlus, Home, Layers, Search, Trash2, UserCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import rocket from "@/assets/rocket2.webp";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import FolderTree from "./FolderTree";
import { useLibrary } from "./LibraryContext";
import SidebarRow from "./SidebarRow";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import { useFolderDrop } from "./folderDnd";

function formatBytes(n) {
  if (!n) return "0 GB";
  const gb = n / 1e9;
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  return `${Math.max(1, Math.round(n / 1e6))} MB`;
}

export default function Sidebar({ workspaceId, view, currentFolderId }) {
  const navigate = useNavigate();
  const { userName, profilePicUrl } = useAuth();
  const { org, setNewFolder } = useLibrary();
  const [query, setQuery] = useState("");
  // Dropping a folder on the "Folders" label moves it to the top level.
  const { isOver, dropProps } = useFolderDrop(null);
  const base = `/library/w/${workspaceId}`;
  const usedPct = org ? Math.min(100, (org.usedBytes / org.limitBytes) * 100) : 0;

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col gap-3 overflow-hidden p-3">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="flex w-full items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 shadow-xs hover:shadow-sm"
      >
        <img src={rocket} alt="" className="size-7 object-contain" />
        <span className="h-5 w-px bg-neutral-300" />
        Back to launcher
      </button>

      <WorkspaceSwitcher workspaceId={workspaceId} />

      {/* Search runs on Enter (min. 2 characters) and opens a results page. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          if (q.length >= 2) navigate(`${base}/search?q=${encodeURIComponent(q)}`);
        }}
        className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-2.5 focus-within:border-neutral-300"
      >
        <Search className="size-4 shrink-0 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search, then press Enter"
          aria-label="Search this workspace"
          className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
        />
      </form>

      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pb-2 [scrollbar-width:thin]">
        <nav className="flex flex-col gap-0.5">
          <SidebarRow icon={Home} label="Home" selected={view === "home"} onClick={() => navigate(base)} />
          <SidebarRow icon={Layers} label="All assets" selected={view === "assets"} onClick={() => navigate(`${base}/assets`)} />
          <SidebarRow icon={Folder} label="Folders" selected={view === "folders"} onClick={() => navigate(`${base}/folders`)} />
          <SidebarRow icon={UserCheck} label="Assigned to me" selected={view === "assigned"} onClick={() => navigate("/library/assigned")} />
          <SidebarRow icon={Trash2} label="Trash" selected={view === "trash"} onClick={() => navigate(`${base}/trash`)} />
        </nav>

        <div className="flex flex-col gap-1">
          <div
            {...dropProps}
            className={cn(
              "flex items-center justify-between rounded-lg px-2.5 py-1",
              isOver && "bg-blue-50 ring-1 ring-blue-300",
            )}
            title="Drop a folder here to move it to the top level"
          >
            <span className="text-xs font-medium text-neutral-500">Folders</span>
            <button
              type="button"
              aria-label="New folder"
              onClick={() => setNewFolder({ workspaceId, parentId: null })}
              className="flex size-6 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200"
            >
              <FolderPlus className="size-4" />
            </button>
          </div>
          <FolderTree workspaceId={workspaceId} currentFolderId={currentFolderId} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-neutral-600">Storage</span>
            <span className="text-neutral-500">
              {org ? `${formatBytes(org.usedBytes)} of ${formatBytes(org.limitBytes)}` : "…"}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-neutral-800" style={{ width: `${usedPct}%` }} />
          </div>
          <span className="text-[11px] text-neutral-500">Shared by all workspaces</span>
        </div>
        <div className="flex items-center gap-2 px-1 pb-1">
          <img src={profilePicUrl || "/placeholder.svg"} alt="" className="size-8 rounded-full object-cover" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-neutral-900">{userName}</span>
            {org && (
              <span className="truncate text-xs text-neutral-500">
                {org.members.length > 1 ? `Team · ${org.members.length} members` : "Personal library"}
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
