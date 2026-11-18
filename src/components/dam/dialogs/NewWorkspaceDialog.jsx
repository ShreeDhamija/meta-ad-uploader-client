// New workspace dialog: a name and an optional ad account (C12).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppData } from "@/lib/AppContext";
import { useLibrary } from "../LibraryContext";

const NONE = "__none__";

export default function NewWorkspaceDialog() {
  const navigate = useNavigate();
  const { adAccounts } = useAppData();
  const { newWorkspaceOpen, setNewWorkspaceOpen, createWorkspace } = useLibrary();
  const [name, setName] = useState("");
  const [account, setAccount] = useState(NONE);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (newWorkspaceOpen) {
      setName("");
      setAccount(NONE);
      setError(null);
    }
  }, [newWorkspaceOpen]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const ws = await createWorkspace({ name: name.trim(), metaAdAccountId: account === NONE ? null : account });
      toast.success(`Created workspace "${ws.name}"`);
      setNewWorkspaceOpen(false);
      navigate(`/library/w/${ws.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={newWorkspaceOpen} onOpenChange={setNewWorkspaceOpen}>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>Each workspace has its own folders and assets. Storage is shared by all of them.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dam-ws-name">Name</Label>
            <Input id="dam-ws-name" autoFocus value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer campaign" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Ad account (optional)</Label>
            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue placeholder="No ad account" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={NONE}>No ad account</SelectItem>
                {(adAccounts || []).map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-neutral-500">The account this workspace's assets launch into.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewWorkspaceOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving ? "Creating…" : "Create workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
