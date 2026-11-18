// New folder dialog: just a name (C12). Opens at the top level of the
// workspace or inside a parent folder.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLibrary } from "../LibraryContext";

export default function NewFolderDialog() {
  const { newFolder, setNewFolder, createFolder, tree } = useLibrary();
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const parent = newFolder?.parentId ? tree.byId.get(newFolder.parentId) : null;

  useEffect(() => {
    if (newFolder) {
      setName("");
      setError(null);
    }
  }, [newFolder]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await createFolder({ workspaceId: newFolder.workspaceId, name: name.trim(), parentId: newFolder.parentId });
      toast.success(`Created "${name.trim()}"`);
      setNewFolder(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!newFolder} onOpenChange={(open) => !open && setNewFolder(null)}>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>{parent ? `Inside "${parent.name}"` : "At the top level of this workspace"}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Input
              autoFocus
              value={name}
              maxLength={200}
              placeholder="Folder name"
              aria-label="Folder name"
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewFolder(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving ? "Creating…" : "Create folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
