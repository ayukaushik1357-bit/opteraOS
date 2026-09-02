import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CheckSquare,
  IndianRupee,
  TrendingUp,
  Users,
  Wallet,
  ArrowUpRight,
  User,
  Shield,
  FileText,
  CreditCard,
  Download,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShoppingCart,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/app/AppShell";
import { getDashboard } from "@/lib/workspace.functions";
import { invoicesApi } from "@/lib/api";
import { UserProfileModal } from "@/components/app/UserProfileModal";
import { money, shortDate } from "@/lib/format";

const title = "Dashboard Overview — opteraOS";
const description =
  "Simple, unified business overview with user profile, live financial tracking, invoices, payments, and sales pipeline.";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function KpiSkeleton() {
  return (
    <div className="rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-2 h-3.5 w-20" />
    </div>
  );
}

export function Dashboard() {
  const { current, email, isLoading: loadingWorkspaces } = useWorkspace();
  const navigate = useNavigate();
  const fetchDashboard = useServerFn(getDashboard);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const orgId = current?.id || "";
  const currency = current?.currency || "INR";

  useEffect(() => {
    if (!loadingWorkspaces && !current) navigate({ to: "/onboarding", replace: true });
  }, [loadingWorkspaces, current, navigate]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard", orgId],
    queryFn: () => fetchDashboard({ data: { orgId } }),
    enabled: !!orgId,
    placeholderData: (prev) => prev,
  });

  if (loadingWorkspaces || !current) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-6">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="font-semibold text-gray-900">Failed to load dashboard overview</p>
          <p className="text-sm text-gray-500">{(error as Error).message}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const k = data?.kpis;
  const userName = email
    ? (email.split("@")[0] || "User").replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Business Leader";

  const userInitials = userName
    .split(" ")
    .map((n) => n[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "OP";

  const getInvoiceStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "PAID":
        return <Badge className="bg-green-50 text-green-700 border border-green-200 text-[11px]"><CheckCircle2 className="h-3 w-3 mr-1" /> Paid</Badge>;
      case "SENT":
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px]"><Clock className="h-3 w-3 mr-1" /> Sent</Badge>;
      case "OVERDUE":
        return <Badge className="bg-red-50 text-red-700 border border-red-200 text-[11px]"><AlertTriangle className="h-3 w-3 mr-1" /> Overdue</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-600 border border-gray-200 text-[11px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Welcome Header Card ───────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-[#E5EAF1] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        {/* Subtle gradient accent top-left */}
        <div className="pointer-events-none absolute top-0 left-0 h-0.5 w-full rounded-t-xl bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED]" aria-hidden />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] via-[#4F46E5] to-[#7C3AED] text-white font-bold text-base shadow-md shrink-0">
              {userInitials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                  Welcome back, {userName}
                </h1>
                <Badge className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  <Shield className="h-3 w-3 mr-1" /> {current.role || "Owner"}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {current.name} &bull; {email} &bull; <span className="text-green-600 font-medium">Active Workspace</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProfileModalOpen(true)}
              className="h-9 text-xs gap-1.5"
            >
              <User className="h-3.5 w-3.5 text-blue-600" />
              <span>Edit Profile</span>
            </Button>
            <Button
              size="sm"
              asChild
              className="h-9 text-xs gap-1.5"
            >
              <Link to="/invoices">
                <Plus className="h-3.5 w-3.5" />
                <span>Create Invoice</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. Primary Financial & Operational KPI Cards ──────────────────── */}
      {isLoading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      ) : k ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Link
            to="/invoices"
            className="group rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all hover:border-blue-300 hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Collected Revenue
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
              {money(k.revenue, currency)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Paid customer invoices
            </p>
          </Link>

          <Link
            to="/invoices"
            className="group rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all hover:border-blue-300 hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Outstanding Balance
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-amber-600">
              {money(k.outstanding, currency)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {k.overdueInvoices > 0 ? `${k.overdueInvoices} overdue invoices` : "All invoices current"}
            </p>
          </Link>

          <Link
            to="/deals"
            className="group rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all hover:border-blue-300 hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Active Pipeline
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
              {money(k.pipeline, currency)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {k.openDeals} open deals &bull; {k.winRate}% win rate
            </p>
          </Link>

          <Link
            to="/orders"
            className="group rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all hover:border-blue-300 hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Sales Orders
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
              {String(data.recentInvoices?.length || 0)} Orders
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Ready for fulfillment
            </p>
          </Link>

          <Link
            to="/customers"
            className="group rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all hover:border-blue-300 hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Customer Accounts
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
              {String(k.customers)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {k.activeCustomers} active clients
            </p>
          </Link>
        </div>
      ) : null}

      {/* ── 3. Invoices & Payments Hub ───────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Recent Invoices Table (2 Cols) */}
        <div className="lg:col-span-2 rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#E5EAF1]">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <FileText className="h-4 w-4" />
              </div>
              <h2 className="font-bold text-sm text-gray-900">Recent Invoices &amp; Billing</h2>
            </div>
            <Link
              to="/invoices"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {!data || data.recentInvoices.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="font-medium text-gray-600">No invoices generated yet.</p>
              <Button asChild variant="outline" size="sm" className="mt-3 h-8 text-xs">
                <Link to="/invoices">Create First Invoice</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left bg-[#F8FAFC]">
                  <tr className="border-b border-[#E5EAF1]">
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Invoice #</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Amount</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF1]">
                  {data.recentInvoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-3 font-semibold text-gray-900 font-mono">
                        {inv.number}
                      </td>
                      <td className="px-5 py-3">
                        {getInvoiceStatusBadge(inv.status)}
                      </td>
                      <td className="px-5 py-3 font-bold text-gray-900 tabular-nums">
                        {money(Number(inv.amount), currency)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-blue-600 hover:bg-blue-50 text-xs"
                          asChild
                        >
                          <a href={invoicesApi.getPdfUrl(orgId, inv.id)} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5 mr-1" /> PDF
                          </a>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Quick Actions & Tasks */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <div className="rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <h2 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-blue-600" />
              <span>Quick Workflows</span>
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Button asChild variant="outline" size="sm" className="h-10 justify-start px-3">
                <Link to="/invoices">
                  <FileText className="h-3.5 w-3.5 mr-2 text-blue-500" />
                  <span>New Invoice</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-10 justify-start px-3">
                <Link to="/quotations">
                  <FileText className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                  <span>New Quote</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-10 justify-start px-3">
                <Link to="/leads">
                  <Users className="h-3.5 w-3.5 mr-2 text-green-500" />
                  <span>Add Lead</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-10 justify-start px-3">
                <Link to="/deals">
                  <TrendingUp className="h-3.5 w-3.5 mr-2 text-purple-500" />
                  <span>Add Deal</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Action Items */}
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#E5EAF1]">
              <h2 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                <span>Action Items</span>
              </h2>
              <Link to="/tasks" className="text-xs font-semibold text-blue-600 hover:underline">
                View All
              </Link>
            </div>
            {!data || (data.recentTasks ?? []).length === 0 ? (
              <div className="px-4 py-6 text-center">
                <CheckSquare className="h-6 w-6 mx-auto mb-2 text-green-400" />
                <p className="text-xs text-gray-500">All tasks completed.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5EAF1]">
                {(data.recentTasks ?? []).slice(0, 3).map((t: any) => (
                  <div key={t.id} className="p-3 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors">
                    <span className="text-xs font-medium text-gray-700 truncate">{t.title}</span>
                    <Badge className={[
                      "text-[10px] uppercase font-bold shrink-0 ml-2",
                      t.priority === "HIGH" ? "bg-red-50 text-red-600 border border-red-200" :
                      t.priority === "MEDIUM" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                      "bg-gray-100 text-gray-600 border border-gray-200"
                    ].join(" ")}>
                      {t.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Charts & Analytics ─────────────────────────────────── */}
      {data && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] lg:col-span-3">
            <h2 className="text-sm font-bold text-gray-900">Revenue Trend &amp; Collections</h2>
            <p className="text-xs text-gray-400 mt-0.5">Historical 6-month performance</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenueSeries}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF1" vertical={false} />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} width={48} />
                  <Tooltip
                    contentStyle={{ background: "#FFFFFF", border: "1px solid #E5EAF1", borderRadius: 8 }}
                    formatter={(v: number) => money(v, currency)}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} fill="url(#revFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] lg:col-span-2">
            <h2 className="text-sm font-bold text-gray-900">Sales Pipeline by Stage</h2>
            <p className="text-xs text-gray-400 mt-0.5">Weighted opportunity value</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.pipelineByStage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF1" vertical={false} />
                  <XAxis dataKey="stage" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} width={48} />
                  <Tooltip
                    contentStyle={{ background: "#FFFFFF", border: "1px solid #E5EAF1", borderRadius: 8 }}
                    formatter={(v: number) => money(v, currency)}
                  />
                  <Bar dataKey="value" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
    </div>
  );
}
