// Breadcrumbs start with the workspace name (which goes to Home), then the
// folder path. There is no "Folders" crumb (C13).
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";
import { Link } from "react-router-dom";

export default function Breadcrumbs({ workspace, path }) {
  const base = `/library/w/${workspace?.id}`;
  const crumbs = [{ id: "home", name: workspace?.name || "Workspace", to: base }, ...path.map((f) => ({ id: f.id, name: f.name, to: `${base}/folder/${f.id}` }))];
  return (
    <nav aria-label="Folder path" className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-neutral-500">
      {crumbs.map((c, i) => (
        <Fragment key={c.id}>
          {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-neutral-400" />}
          {i === crumbs.length - 1 ? (
            <span aria-current="page" className="max-w-[240px] truncate font-medium text-neutral-700">
              {c.name}
            </span>
          ) : (
            <Link to={c.to} className="max-w-[240px] truncate hover:text-neutral-900 hover:underline">
              {c.name}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
