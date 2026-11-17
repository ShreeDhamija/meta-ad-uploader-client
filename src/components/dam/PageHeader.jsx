// Page title row. Titles are bold (C13).
export default function PageHeader({ title, subtitle, breadcrumb, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {breadcrumb}
        <h1 className="truncate text-2xl font-bold text-neutral-900">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-200 px-6 py-12 text-center">
      {Icon && <Icon className="size-6 text-neutral-400" />}
      <p className="text-sm font-medium text-neutral-700">{title}</p>
      {children && <p className="max-w-md text-sm text-neutral-500">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
