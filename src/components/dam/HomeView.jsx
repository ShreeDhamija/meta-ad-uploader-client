// Workspace Home (C13): scorecards, recent folders, recent assets and recent
// activity, from GET /workspaces/:id/overview. Recent assets and activity
// fill in once uploads (Step 5) and comments (Step 10) exist.
import { Activity, CheckCircle2, Eye, Folder, FolderPlus, Image, Layers, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { damApi } from "@/lib/damApi";
import FolderCard from "./FolderCard";
import { useLibrary } from "./LibraryContext";
import PageHeader, { EmptyState } from "./PageHeader";

function Scorecard({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-600">{label}</span>
        <Icon className="size-5 text-neutral-400" />
      </div>
      <span className="text-3xl font-semibold text-neutral-900">{value ?? "–"}</span>
      <span className="text-xs text-neutral-500">{hint}</span>
    </div>
  );
}

function SectionHeading({ icon: Icon, children, action }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
        <Icon className="size-5 text-neutral-500" />
        {children}
      </h2>
      {action}
    </div>
  );
}

export default function HomeView({ workspace }) {
  const navigate = useNavigate();
  const { setNewFolder, folders } = useLibrary();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Re-fetch when the workspace changes or its folders change (new/renamed).
  const folderKey = folders.map((f) => `${f.id}:${f.name}:${f.parentId}`).join("|");
  useEffect(() => {
    let cancelled = false;
    damApi
      .overview(workspace.id)
      .then((r) => !cancelled && (setData(r), setError(null)))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [workspace.id, folderKey]);

  const c = data?.counts;
  const base = `/library/w/${workspace.id}`;
  return (
    <>
      <PageHeader
        title={workspace.name}
        subtitle="What's happening in this workspace."
        actions={
          <Button variant="outline" size="sm" onClick={() => setNewFolder({ workspaceId: workspace.id, parentId: null })}>
            <FolderPlus /> New folder
          </Button>
        }
      />
      {error && <p className="text-sm text-red-600">Couldn't load the overview: {error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Scorecard icon={Layers} label="Assets" value={c?.assets} hint="In this workspace" />
        <Scorecard icon={Eye} label="In review" value={c?.inReview} hint="Waiting on the client" />
        <Scorecard icon={TriangleAlert} label="Changes requested" value={c?.changesRequested} hint="Need a new version" />
        <Scorecard
          icon={CheckCircle2}
          label="Ready to launch"
          value={c?.approvedNotLaunched}
          hint={c ? `${c.launchedThisWeek} launched this week` : " "}
        />
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeading
          icon={Folder}
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate(`${base}/folders`)}>
              All folders
            </Button>
          }
        >
          Recent folders
        </SectionHeading>
        {data && data.recentFolders.length === 0 ? (
          <EmptyState icon={Folder} title="No folders yet">
            Create a folder to start organising this workspace.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {(data?.recentFolders || []).map((f) => (
              <FolderCard key={f.id} folder={f} workspaceId={workspace.id} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading icon={Image}>Recent assets</SectionHeading>
        <EmptyState icon={Image} title="No assets yet">
          Uploading images and videos is coming soon.
        </EmptyState>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading icon={Activity}>Recent activity</SectionHeading>
        <EmptyState icon={Activity} title="Nothing yet">
          Uploads, comments and approvals will show here.
        </EmptyState>
      </section>
    </>
  );
}
