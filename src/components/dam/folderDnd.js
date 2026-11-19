// Native drag and drop for folders: drag a folder row or card onto another
// folder (or onto a "top level" target) to move it.
import { useState } from "react";
import { FOLDER_DRAG_TYPE, useLibrary } from "./LibraryContext";

/** Props that make an element draggable as `folderId`. */
export function folderDragProps(folderId) {
  return {
    draggable: true,
    onDragStart: (e) => {
      e.stopPropagation();
      e.dataTransfer.setData(FOLDER_DRAG_TYPE, folderId);
      e.dataTransfer.effectAllowed = "move";
    },
  };
}

/**
 * Drop-target props for moving a dragged folder under `targetId`
 * (null = top level of the workspace). `isOver` drives the highlight.
 */
export function useFolderDrop(targetId) {
  const { moveFolder } = useLibrary();
  const [isOver, setIsOver] = useState(false);
  const accepts = (e) => Array.from(e.dataTransfer.types || []).includes(FOLDER_DRAG_TYPE);
  return {
    isOver,
    dropProps: {
      onDragOver: (e) => {
        if (!accepts(e)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        if (!isOver) setIsOver(true);
      },
      onDragLeave: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsOver(false);
      },
      onDrop: (e) => {
        if (!accepts(e)) return;
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);
        const id = e.dataTransfer.getData(FOLDER_DRAG_TYPE);
        if (id && id !== targetId) moveFolder(id, targetId);
      },
    },
  };
}
