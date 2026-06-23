// Shared building blocks for the Creative Strategy module. They encode the
// app's design vocabulary (white cards, rounded-2xl, shadow-xs, neutral
// borders, text-xl/sm/xs hierarchy) so every view is consistent: loading
// states, empty states, section cards, KPI tiles, pills.
import PropTypes from "prop-types";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ── Loading ──────────────────────────────────────────────────────────────────
// Centered spinner + label for tab initiation / async actions.
export function ViewLoading({ label = "Loading…", className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-neutral-400", className)}>
      <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
ViewLoading.propTypes = { label: PropTypes.string, className: PropTypes.string };

// Inline spinner for buttons / small areas.
export function Spinner({ className }) {
  return <Loader2 className={cn("w-4 h-4 animate-spin", className)} />;
}
Spinner.propTypes = { className: PropTypes.string };

// Skeleton card grid for richer tab-load placeholders.
export function LoadingCards({ count = 4, className }) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 max-lg:grid-cols-1", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="rounded-2xl border-neutral-200 shadow-xs">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
LoadingCards.propTypes = { count: PropTypes.number, className: PropTypes.string };

// ── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, hint, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center gap-2 rounded-2xl border border-dashed border-neutral-200 bg-white/50 py-14 px-6", className)}>
      {Icon && <Icon className="w-7 h-7 text-neutral-300" strokeWidth={1.5} />}
      <p className="text-sm font-medium text-neutral-700">{title}</p>
      {hint && <p className="text-xs text-neutral-400 max-w-sm">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
EmptyState.propTypes = {
  icon: PropTypes.elementType, title: PropTypes.string.isRequired,
  hint: PropTypes.string, action: PropTypes.node, className: PropTypes.string,
};

// ── Section heading (small uppercase eyebrow) ─────────────────────────────────
export function SectionTitle({ children, count, hint, actions, className }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 mb-2", className)}>
      <div className="flex items-baseline gap-2 min-w-0">
        <h3 className="text-sm font-semibold text-neutral-800 truncate">{children}</h3>
        {count != null && <span className="text-xs text-neutral-400 tabular-nums">{count}</span>}
        {hint && <span className="text-xs text-neutral-400 truncate">{hint}</span>}
      </div>
      {actions}
    </div>
  );
}
SectionTitle.propTypes = {
  children: PropTypes.node, count: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  hint: PropTypes.string, actions: PropTypes.node, className: PropTypes.string,
};

// ── Section card (white card with optional header) ────────────────────────────
export function SectionCard({ title, description, icon: Icon, actions, children, className, bodyClassName }) {
  return (
    <Card className={cn("rounded-2xl border-neutral-200 shadow-xs bg-white", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="flex items-start gap-2 min-w-0">
            {Icon && <Icon className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />}
            <div className="min-w-0">
              {title && <p className="text-sm font-semibold text-neutral-800">{title}</p>}
              {description && <p className="text-xs text-neutral-400 mt-0.5">{description}</p>}
            </div>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      <CardContent className={cn("p-4", bodyClassName)}>{children}</CardContent>
    </Card>
  );
}
SectionCard.propTypes = {
  title: PropTypes.node, description: PropTypes.node, icon: PropTypes.elementType,
  actions: PropTypes.node, children: PropTypes.node, className: PropTypes.string, bodyClassName: PropTypes.string,
};

// ── KPI tile ──────────────────────────────────────────────────────────────────
export function StatTile({ label, value, sub, tone = "default", className }) {
  const tones = {
    default: "text-neutral-900",
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-red-600",
  };
  return (
    <div className={cn("rounded-2xl border border-neutral-200 bg-white shadow-xs px-4 py-3", className)}>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums mt-0.5", tones[tone])}>{value}</p>
      {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  );
}
StatTile.propTypes = {
  label: PropTypes.node, value: PropTypes.node, sub: PropTypes.node,
  tone: PropTypes.oneOf(["default", "good", "warn", "bad"]), className: PropTypes.string,
};

// ── Inline error banner ───────────────────────────────────────────────────────
export function ErrorBanner({ message, className }) {
  if (!message) return null;
  return (
    <div className={cn("rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600", className)}>
      {message}
    </div>
  );
}
ErrorBanner.propTypes = { message: PropTypes.string, className: PropTypes.string };
