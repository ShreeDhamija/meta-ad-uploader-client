// Folder card (C13): up to 9 square, centre-cropped thumbnails in three rows
// of three on a white panel; the rest of the card is very light grey. Covers
// stay empty until Step 5. `compact` is the one-line version used for
// subfolders. Cards can be dragged onto other cards or tree rows.
import { Folder } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import FolderContextMenu from "./FolderContextMenu";
import InlineRename from "./InlineRename";
import { useLibrary } from "./LibraryContext";
import { folderDragProps, useFolderDrop } from "./folderDnd";

export default function FolderCard({ folder, workspaceId, compact = false }) {
  const navigate = useNavigate();
  const { tree, renamingId, setRenamingId, renameFolder } = useLibrary();
  const { isOver, dropProps } = useFolderDrop(folder.id);
  const renaming = renamingId === folder.id;
  const subfolders = tree.childrenOf(folder.id).length;
  const open = () => !renaming && navigate(`/library/w/${workspaceId}/folder/${folder.id}`);

  const name = renaming ? (
    <InlineRename
      value={folder.name}
      onSave={async (n) => {
        const ok = await renameFolder(folder.id, n);
        if (ok) setRenamingId(null);
        return ok;
      }}
      onCancel={() => setRenamingId(null)}
    />
  ) : (
    <span className="truncate text-sm font-medium text-neutral-900" title={folder.name}>
      {folder.name}
    </span>
  );

  return (
    <FolderContextMenu folder={folder} workspaceId={workspaceId}>
      <div
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && open()}
        {...(renaming ? {} : folderDragProps(folder.id))}
        {...dropProps}
        className={cn(
          "group flex cursor-pointer gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-2.5 outline-none transition-[border-color,box-shadow]",
          "hover:border-neutral-300 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-blue-200",
          compact ? "items-center" : "flex-col",
          isOver && "border-blue-400 bg-blue-50 ring-2 ring-blue-200",
        )}
      >
        {compact ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white">
            <Folder className="size-5 text-neutral-500" />
          </span>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-white p-1.5">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="aspect-square rounded-md bg-neutral-100" />
            ))}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2">
            {!compact && <Folder className="size-4 shrink-0 fill-neutral-200 text-neutral-500" />}
            {name}
          </div>
          <span className="text-xs text-neutral-500">
            {subfolders ? `${subfolders} subfolder${subfolders === 1 ? "" : "s"}` : "No subfolders"}
          </span>
        </div>
      </div>
    </FolderContextMenu>
  );
}
