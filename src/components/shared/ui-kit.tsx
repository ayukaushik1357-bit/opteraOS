import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search, Inbox, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── PageHeader ────────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: string;
}) {
  return (
    <div className="mb-6">
      {breadcrumb && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{breadcrumb}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-gray-600 leading-relaxed">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

// ── StatCard / KPI Card ───────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  hint,
  loading,
  icon,
  iconColor = "blue",
  trend,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  loading?: boolean;
  icon?: ReactNode;
  iconColor?: "blue" | "green" | "amber" | "red" | "purple" | "cyan";
  trend?: { value: string; positive?: boolean };
}) {
  const iconBg: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border border-blue-200",
    green: "bg-green-50 text-green-700 border border-green-200",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    red: "bg-red-50 text-red-700 border border-red-200",
    purple: "bg-purple-50 text-purple-700 border border-purple-200",
    cyan: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  };

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        {icon && (
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconBg[iconColor])}>
            {icon}
          </div>
        )}
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-7 w-24" />
          <Skeleton className="mt-2 h-4 w-16" />
        </>
      ) : (
        <>
          <p className="mt-2.5 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {trend && (
            <p className={cn("mt-1 text-xs font-semibold", trend.positive ? "text-green-700" : "text-red-600")}>
              {trend.value}
            </p>
          )}
          {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </>
      )}
    </div>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  // Positive / success
  paid: "bg-green-50 text-green-700 border border-green-200",
  active: "bg-green-50 text-green-700 border border-green-200",
  won: "bg-green-50 text-green-700 border border-green-200",
  qualified: "bg-green-50 text-green-700 border border-green-200",
  converted: "bg-green-50 text-green-700 border border-green-200",
  completed: "bg-green-50 text-green-700 border border-green-200",
  instock: "bg-green-50 text-green-700 border border-green-200",
  in_stock: "bg-green-50 text-green-700 border border-green-200",
  // Warning
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  sent: "bg-blue-50 text-blue-700 border border-blue-200",
  contacted: "bg-blue-50 text-blue-700 border border-blue-200",
  new: "bg-blue-50 text-blue-700 border border-blue-200",
  running: "bg-blue-50 text-blue-700 border border-blue-200",
  prospect: "bg-blue-50 text-blue-700 border border-blue-200",
  lowstock: "bg-amber-50 text-amber-700 border border-amber-200",
  low_stock: "bg-amber-50 text-amber-700 border border-amber-200",
  // Danger
  overdue: "bg-red-50 text-red-700 border border-red-200",
  lost: "bg-red-50 text-red-700 border border-red-200",
  failed: "bg-red-50 text-red-700 border border-red-200",
  cancelled: "bg-red-50 text-red-700 border border-red-200",
  unqualified: "bg-red-50 text-red-700 border border-red-200",
  urgent: "bg-red-50 text-red-700 border border-red-200",
  churned: "bg-red-50 text-red-700 border border-red-200",
  // Neutral / default
  draft: "bg-gray-100 text-gray-700 border border-gray-200",
  paused: "bg-gray-100 text-gray-700 border border-gray-200",
  inactive: "bg-gray-100 text-gray-700 border border-gray-200",
  void: "bg-gray-100 text-gray-700 border border-gray-200",
  // Legacy tone keys
  positive: "bg-green-50 text-green-700 border border-green-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  neutral: "bg-gray-100 text-gray-700 border border-gray-200",
  brand: "bg-blue-50 text-blue-700 border border-blue-200",
};

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone?: string;
}) {
  const key = (tone || label).toLowerCase().replace(/\s+/g, "_");
  const style = statusStyles[key] || statusStyles["neutral"];
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
      style,
    )}>
      {label}
    </span>
  );
}

// ── SearchInput ───────────────────────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
}) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
      <Input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9 text-sm text-gray-900 border-[#D1D5DB]"
      />
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <Inbox className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-3 text-sm font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600 max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── ErrorState ────────────────────────────────────────────────────────────────

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center" role="alert">
      <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden />
      <p className="mt-3 text-sm font-bold text-red-900">Something went wrong</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400 bg-white"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}

// ── TableSkeleton ─────────────────────────────────────────────────────────────

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xs" aria-hidden>
      {/* Header skeleton */}
      <div className="flex gap-4 border-b border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3.5">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded bg-gray-200" />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-[#E5E7EB] px-4 py-4 last:border-b-0">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1 rounded bg-gray-100" style={{ opacity: 1 - j * 0.1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Pager ─────────────────────────────────────────────────────────────────────

export function Pager({
  page,
  pages,
  onPage,
  total,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
  total?: number;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-between border-t border-[#E5E7EB] bg-white px-4 py-3" aria-label="Pagination">
      <p className="text-xs text-gray-600 font-medium">
        {total !== undefined ? `${total} total` : `Page ${page} of ${pages}`}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="h-8 px-2.5 text-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <span className="min-w-[2.5rem] text-center text-xs font-semibold text-gray-700">
          {page} / {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(Math.min(pages, page + 1))}
          disabled={page === pages}
          className="h-8 px-2.5 text-xs"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </nav>
  );
}

// ── useCountUp (retained, used in analytics) ──────────────────────────────────

export function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setValue(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// ── SectionCard — consistent white card wrapper ───────────────────────────────

export function SectionCard({
  children,
  className,
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
      padding && "p-5",
      className,
    )}>
      {children}
    </div>
  );
}

// ── SectionHeader — card section header with optional action ──────────────────

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
