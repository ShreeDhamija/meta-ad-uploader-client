// Workspace switcher (top of the sidebar). One workspace per connected ad
// account by default; more can be added by hand. No counts (C13).
import { Check, ChevronsUpDown, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLibrary } from "./LibraryContext";

const Initial = ({ name, className }) => (
  <span className={className}>{(name || "?").trim().slice(0, 1).toUpperCase()}</span>
);

export default function WorkspaceSwitcher({ workspaceId }) {
  const navigate = useNavigate();
  const { workspaces, refreshWorkspaces, setNewWorkspaceOpen } = useLibrary();
  const current = workspaces.find((w) => w.id === workspaceId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-2 text-left shadow-xs outline-none hover:border-neutral-300 focus-visible:ring-2 focus-visible:ring-blue-200"
        >
          <Initial
            name={current?.name}
            className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-sm font-semibold text-white"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[11px] font-medium text-neutral-500">Workspace</span>
            <span className="truncate text-sm font-medium text-neutral-900">{current?.name || "Choose a workspace"}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-neutral-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px]">
        <DropdownMenuLabel className="text-xs font-medium text-neutral-500">Workspaces</DropdownMenuLabel>
        <div className="max-h-[320px] overflow-y-auto">
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} onSelect={() => navigate(`/library/w/${w.id}`)} className="rounded-lg">
              <Initial
                name={w.name}
                className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-semibold text-neutral-600"
              />
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === workspaceId && <Check className="text-blue-600" />}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setNewWorkspaceOpen(true)} className="rounded-lg">
          <Plus /> New workspace
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => refreshWorkspaces()} className="rounded-lg">
          <RefreshCw /> Refresh from ad accounts
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
