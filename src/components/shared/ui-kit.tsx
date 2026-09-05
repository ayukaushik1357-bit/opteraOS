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
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#008080]">{breadcrumb}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-[#0F2423] sm:text-2xl">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-[#617D7B] leading-relaxed">{subtitle}</p>
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
    blue: "bg-[rgba(0,128,128,0.08)] text-[#008080] border border-[rgba(0,128,128,0.2)]",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    red: "bg-rose-50 text-rose-700 border border-rose-200",
    purple: "bg-[rgba(0,128,128,0.08)] text-[#008080] border border-[rgba(0,128,128,0.2)]",
    cyan: "bg-teal-50 text-[#008080] border border-teal-200",
  };

  return (
    <div className="rounded-xl border border-[rgba(0,128,128,0.14)] bg-white p-5 shadow-teal-xs hover:border-[#008080] hover:shadow-teal-sm transition-all">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#617D7B]">{label}</p>
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
          <p className="mt-2.5 text-2xl font-bold tracking-tight text-[#0F2423]">{value}</p>
          {trend && (
            <p className={cn("mt-1 text-xs font-semibold", trend.positive ? "text-emerald-700" : "text-rose-600")}>
              {trend.value}
            </p>
          )}
          {hint && <p className="mt-1 text-xs text-[#617D7B]">{hint}</p>}
        </>
      )}
    </div>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  // Positive / success
  paid: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  won: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  qualified: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  converted: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  instock: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  in_stock: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  // Teal Brand / Active states
  sent: "bg-[rgba(0,128,128,0.08)] text-[#008080] border border-[rgba(0,128,128,0.2)]",
  contacted: "bg-[rgba(0,128,128,0.08)] text-[#008080] border border-[rgba(0,128,128,0.2)]",
  new: "bg-[rgba(0,128,128,0.08)] text-[#008080] border border-[rgba(0,128,128,0.2)]",
  running: "bg-[rgba(0,128,128,0.08)] text-[#008080] border border-[rgba(0,128,128,0.2)]",
  prospect: "bg-[rgba(0,128,128,0.08)] text-[#008080] border border-[rgba(0,128,128,0.2)]",
  brand: "bg-[rgba(0,128,128,0.08)] text-[#008080] border border-[rgba(0,128,128,0.2)]",
  // Warning
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  lowstock: "bg-amber-50 text-amber-700 border border-amber-200",
  low_stock: "bg-amber-50 text-amber-700 border border-amber-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  // Danger
  overdue: "bg-rose-50 text-rose-700 border border-rose-200",
  lost: "bg-rose-50 text-rose-700 border border-rose-200",
  failed: "bg-rose-50 text-rose-700 border border-rose-200",
  cancelled: "bg-rose-50 text-rose-700 border border-rose-200",
  unqualified: "bg-rose-50 text-rose-700 border border-rose-200",
  urgent: "bg-rose-50 text-rose-700 border border-rose-200",
  churned: "bg-rose-50 text-rose-700 border border-rose-200",
  danger: "bg-rose-50 text-rose-700 border border-rose-200",
  // Neutral / default
  draft: "bg-[#EDF4F3] text-[#3D5A58] border border-[rgba(0,128,128,0.15)]",
  paused: "bg-[#EDF4F3] text-[#3D5A58] border border-[rgba(0,128,128,0.15)]",
  inactive: "bg-[#EDF4F3] text-[#617D7B] border border-[rgba(0,128,128,0.12)]",
  void: "bg-[#EDF4F3] text-[#617D7B] border border-[rgba(0,128,128,0.12)]",
  neutral: "bg-[#EDF4F3] text-[#3D5A58] border border-[rgba(0,128,128,0.15)]",
  positive: "bg-emerald-50 text-emerald-700 border border-emerald-200",
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
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#008080]"
        aria-hidden
      />
      <Input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9 text-sm text-[#0F2423] border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] bg-white placeholder:text-[#617D7B]/60"
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[rgba(0,128,128,0.25)] bg-[#EDF4F3]/30 px-6 py-14 text-center shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(0,128,128,0.1)] text-[#008080]">
        <Inbox className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-3 text-sm font-bold text-[#0F2423]">{title}</h3>
      <p className="mt-1 text-sm text-[#617D7B] max-w-sm">{description}</p>
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
    <div className="overflow-hidden rounded-xl border border-[rgba(0,128,128,0.14)] bg-white shadow-teal-xs" aria-hidden>
      {/* Header skeleton */}
      <div className="flex gap-4 border-b border-[rgba(0,128,128,0.1)] bg-[rgba(0,128,128,0.03)] px-4 py-3.5">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded bg-[rgba(0,128,128,0.08)]" />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-[rgba(0,128,128,0.06)] px-4 py-4 last:border-b-0">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1 rounded bg-[rgba(0,128,128,0.04)]" style={{ opacity: 1 - j * 0.1 }} />
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
    <nav className="flex items-center justify-between border-t border-[rgba(0,128,128,0.1)] bg-white px-4 py-3" aria-label="Pagination">
      <p className="text-xs text-[#617D7B] font-medium">
        {total !== undefined ? `${total} total` : `Page ${page} of ${pages}`}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="h-8 px-2.5 text-xs border-[rgba(0,128,128,0.2)] text-[#0F2423] hover:border-[#008080] hover:bg-[rgba(0,128,128,0.04)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <span className="min-w-[2.5rem] text-center text-xs font-semibold text-[#0F2423]">
          {page} / {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(Math.min(pages, page + 1))}
          disabled={page === pages}
          className="h-8 px-2.5 text-xs border-[rgba(0,128,128,0.2)] text-[#0F2423] hover:border-[#008080] hover:bg-[rgba(0,128,128,0.04)]"
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
      "rounded-xl border border-[rgba(0,128,128,0.14)] bg-white shadow-teal-xs",
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
        <h2 className="text-sm font-bold text-[#0F2423]">{title}</h2>
        {subtitle && <p className="text-xs text-[#617D7B] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
