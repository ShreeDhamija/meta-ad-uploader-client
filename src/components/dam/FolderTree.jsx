// Sidebar folder tree. Nested folders hang off one continuous line under the
// parent's icon, which curves into each child with a rounded corner (C13).
// Rows can be dragged onto other rows to move a folder.
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import FolderContextMenu from "./FolderContextMenu";
import InlineRename from "./InlineRename";
import { useLibrary } from "./LibraryContext";
import SidebarRow from "./SidebarRow";
import { folderDragProps, useFolderDrop } from "./folderDnd";

function TreeNode({ folder, depth, workspaceId, currentFolderId }) {
  const navigate = useNavigate();
  const { tree, expanded, toggleExpanded, renamingId, setRenamingId, renameFolder } = useLibrary();
  const { isOver, dropProps } = useFolderDrop(folder.id);
  const kids = tree.childrenOf(folder.id);
  const open = expanded.has(folder.id);
  const selected = currentFolderId === folder.id;
  const renaming = renamingId === folder.id;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-0.5",
        // A rounded elbow into each child, plus a straight run past it to the next sibling.
        depth > 0 &&
          "before:absolute before:-left-3 before:-top-0.5 before:h-[20px] before:w-3 before:rounded-bl-lg before:border-b before:border-l before:border-neutral-300 after:absolute after:-left-3 after:-top-0.5 after:bottom-0 after:border-l after:border-neutral-300 last:after:hidden",
      )}
    >
      <FolderContextMenu folder={folder} workspaceId={workspaceId}>
        <SidebarRow
          icon={open && kids.length ? FolderOpen : Folder}
          selected={selected}
          onClick={() => !renaming && navigate(`/library/w/${workspaceId}/folder/${folder.id}`)}
          onDoubleClick={() => setRenamingId(folder.id)}
          className={cn(isOver && "border-blue-300 bg-blue-50")}
          {...(renaming ? {} : folderDragProps(folder.id))}
          {...dropProps}
          trailing={
            kids.length > 0 && (
              <button
                type="button"
                aria-label={open ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(folder.id);
                }}
                className="flex size-5 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-300/60"
              >
                {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
            )
          }
        >
          {renaming ? (
            <InlineRename
              value={folder.name}
              onSave={async (name) => {
                const ok = await renameFolder(folder.id, name);
                if (ok) setRenamingId(null);
                return ok;
              }}
              onCancel={() => setRenamingId(null)}
            />
          ) : (
            <span className="truncate text-sm" title={folder.name}>
              {folder.name}
            </span>
          )}
        </SidebarRow>
      </FolderContextMenu>
      {open && kids.length > 0 && (
        <div className="ml-[19px] flex flex-col gap-0.5 pl-3">
          {kids.map((k) => (
            <TreeNode key={k.id} folder={k} depth={depth + 1} workspaceId={workspaceId} currentFolderId={currentFolderId} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FolderTree({ workspaceId, currentFolderId }) {
  const { tree, foldersLoading, foldersWs } = useLibrary();
  const roots = tree.childrenOf(null);
  if (foldersWs !== workspaceId && foldersLoading) {
    return <p className="px-2.5 py-1 text-xs text-neutral-500">Loading folders…</p>;
  }
  if (!roots.length) return <p className="px-2.5 py-1 text-xs text-neutral-500">No folders yet.</p>;
  return (
    <div className="flex flex-col gap-0.5">
      {roots.map((f) => (
        <TreeNode key={f.id} folder={f} depth={0} workspaceId={workspaceId} currentFolderId={currentFolderId} />
      ))}
    </div>
  );
}
