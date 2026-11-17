// Right-click menu for a folder (tree row or card). Step 3 actions only;
// Move to…, Pin, Share and Move to trash join in Steps 7 and 10.
import { FolderOpen, FolderPlus, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useLibrary } from "./LibraryContext";

export default function FolderContextMenu({ folder, workspaceId, children }) {
  const navigate = useNavigate();
  const { setRenamingId, setNewFolder } = useLibrary();
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      {/* No focus return on close, so it can't steal focus from the rename field. */}
      <ContextMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
        <ContextMenuItem onSelect={() => navigate(`/library/w/${workspaceId}/folder/${folder.id}`)}>
          <FolderOpen /> Open
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => setNewFolder({ workspaceId, parentId: folder.id })}>
          <FolderPlus /> New subfolder
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => setRenamingId(folder.id)}>
          <Pencil /> Rename
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
