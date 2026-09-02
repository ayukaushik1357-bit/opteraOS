import { useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Layers,
  PieChart as PieIcon,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/components/app/AppShell";
import {
  getAnalyticsData,
  exportAnalyticsCsv,
  type DateRangePreset,
} from "@/lib/analytics.functions";
import { money, shortDate } from "@/lib/format";

const title = "Analytics & Intelligence — opteraOS";
const description =
  "Real-time revenue metrics, sales pipeline velocity, customer growth, operational task efficiency, and AI-grounded business intelligence.";

export type AnalyticsSearch = {
  section?: string;
  range?: DateRangePreset;
};

export const Route = createFileRoute("/_authenticated/analytics")({
  validateSearch: (search: Record<string, unknown>): AnalyticsSearch => ({
    ...(search["section"] ? { section: String(search["section"]) } : {}),
    ...(search["range"] ? { range: search["range"] as DateRangePreset } : {}),
  }),
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
  component: AnalyticsPage,
});

const PIE_COLORS = ["#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

function AnalyticsPage() {
  const { current, isLoading: loadingWorkspaces } = useWorkspace();
  const search = useSearch({ from: "/_authenticated/analytics" });
  const fetchAnalytics = useServerFn(getAnalyticsData);
  const triggerCsvExport = useServerFn(exportAnalyticsCsv);

  const [dateRange, setDateRange] = useState<DateRangePreset>(search.range ?? "30d");
  const [activeTab, setActiveTab] = useState<string>(search.section ?? "overview");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics", current?.id, dateRange],
    queryFn: () => fetchAnalytics({ data: { orgId: current!.id, dateRange } }),
    enabled: !!current,
  });

  const exportMutation = useMutation({
    mutationFn: () => triggerCsvExport({ data: { orgId: current!.id, dateRange } }),
    onSuccess: (res) => {
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", res.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Analytics report exported successfully");
    },
    onError: (err: Error) => toast.error(`Export failed: ${err.message}`),
  });

  const currency = current?.currency || "INR";

  if (loadingWorkspaces || (!current && isLoading)) {
    return (
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
        <h3 className="mt-3 text-lg font-semibold text-foreground">Failed to load analytics</h3>
        <p className="mt-1 text-sm text-muted-foreground">{(error as Error).message}</p>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
          Retry Query
        </Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const k = data.kpis;
  const isPositiveGrowth = k.revenueGrowthRate >= 0;

  return (
    <div className="grid gap-6">
      {/* ── Executive Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Business Analytics</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" /> Live DB Data
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-dimensional business telemetry for <span className="font-medium text-foreground">{current?.name}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select
              value={dateRange}
              onValueChange={(val) => setDateRange(val as DateRangePreset)}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
                <SelectItem value="ytd">Year to date</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={exportMutation.isPending}
            onClick={() => exportMutation.mutate()}
          >
            <Download className="h-3.5 w-3.5" />
            {exportMutation.isPending ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* ── Top Executive KPI Ribbon ────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Period Revenue
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {money(k.currentRevenue, currency)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {isPositiveGrowth ? (
              <span className="inline-flex items-center text-emerald-600 font-medium dark:text-emerald-400">
                <ArrowUpRight className="h-3.5 w-3.5" /> +{k.revenueGrowthRate}%
              </span>
            ) : (
              <span className="inline-flex items-center text-rose-600 font-medium dark:text-rose-400">
                <ArrowDownRight className="h-3.5 w-3.5" /> {k.revenueGrowthRate}%
              </span>
            )}
            <span className="text-muted-foreground">vs previous {dateRange}</span>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Open Pipeline
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {money(k.openPipelineValue, currency)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {k.openDealsCount} active deals · <span className="font-medium text-foreground">{k.winRate}% win rate</span>
          </p>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Unpaid / Overdue
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {money(k.outstandingRevenue, currency)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium text-amber-600 dark:text-amber-400">{k.overdueInvoicesCount} overdue</span> · {k.collectionRate}% collection rate
          </p>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Task Velocity
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {k.taskCompletionRate}%
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {k.completedTasks} of {k.totalTasks} completed · <span className="font-medium text-foreground">{k.overdueTasks} overdue</span>
          </p>
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-secondary/50 rounded-xl">
          <TabsTrigger value="overview" className="gap-1.5 py-2 text-xs">
            <Activity className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-1.5 py-2 text-xs">
            <IndianRupee className="h-3.5 w-3.5" /> Revenue
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-1.5 py-2 text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Sales
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1.5 py-2 text-xs">
            <Users className="h-3.5 w-3.5" /> Customers
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 py-2 text-xs">
            <CheckSquare className="h-3.5 w-3.5" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5 py-2 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-brand-purple" /> AI Insights
          </TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Revenue Trend Chart */}
            <div className="glass rounded-2xl p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold">Revenue Velocity</h2>
                  <p className="text-xs text-muted-foreground">Settled cash flow over monthly intervals</p>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  All time: {money(k.allTimeRevenue, currency)}
                </span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.revenueTrend}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      formatter={(val: number) => [money(val, currency), "Revenue"]}
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        borderColor: "var(--border)",
                        borderRadius: "0.75rem",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#4F46E5"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorRev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sales Pipeline Distribution */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-base font-semibold">Pipeline By Stage</h2>
              <p className="text-xs text-muted-foreground mb-4">Distribution across sales stages</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.salesByStage} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <YAxis dataKey="stage" type="category" stroke="var(--muted-foreground)" fontSize={11} width={80} />
                    <Tooltip
                      formatter={(val: number) => [money(val, currency), "Value"]}
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        borderColor: "var(--border)",
                        borderRadius: "0.75rem",
                      }}
                    />
                    <Bar dataKey="value" fill="#06B6D4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI Insights Highlight Bar */}
          <div className="glass rounded-2xl p-6 border-l-4 border-l-brand-purple">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-brand-purple" />
              <h2 className="text-base font-semibold">AI Business Insights & Actions</h2>
              <span className="text-xs text-muted-foreground ml-auto">Grounded in live telemetry</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.insights.slice(0, 3).map((ins) => (
                <div key={ins.id} className="rounded-xl bg-secondary/40 p-4 space-y-1.5 border border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {ins.category}
                    </span>
                    <span className="text-xs font-mono font-medium text-foreground">{ins.metric}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{ins.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{ins.description}</p>
                  {ins.actionRecommended && (
                    <p className="text-xs text-brand-blue pt-1 font-medium">
                      💡 {ins.actionRecommended}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── REVENUE TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="revenue" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass rounded-2xl p-5">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Average Invoice Value</span>
              <p className="mt-2 text-2xl font-semibold">{money(k.avgInvoiceValue, currency)}</p>
              <p className="text-xs text-muted-foreground mt-1">Across {k.paidInvoicesCount} paid invoices</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Overdue Balance</span>
              <p className="mt-2 text-2xl font-semibold text-rose-600 dark:text-rose-400">
                {money(k.overdueRevenue, currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{k.overdueInvoicesCount} invoices overdue</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Collection Efficiency</span>
              <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{k.collectionRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Billed vs collected ratio</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Trend Area Chart */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-base font-semibold mb-4">Monthly Revenue Flow</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip formatter={(val: number) => [money(val, currency), "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Overdue Aging Breakdown */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-base font-semibold mb-4">Overdue Aging Buckets</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.agingBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="bucket" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip formatter={(val: number) => [money(val, currency), "Overdue Amount"]} />
                    <Bar dataKey="amount" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── SALES TAB ───────────────────────────────────────────────────── */}
        <TabsContent value="sales" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass rounded-2xl p-5">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Win Rate</span>
              <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{k.winRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Closed won vs lost ratio</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Total Won Value</span>
              <p className="mt-2 text-2xl font-semibold">{money(k.totalWonValue, currency)}</p>
              <p className="text-xs text-muted-foreground mt-1">Closed deals value</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Average Deal Size</span>
              <p className="mt-2 text-2xl font-semibold">{money(k.avgDealValue, currency)}</p>
              <p className="text-xs text-muted-foreground mt-1">Across all pipeline deals</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="text-base font-semibold mb-4">Deal Volume & Value by Stage</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.salesByStage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="stage" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip formatter={(val: number) => [money(val, currency), "Total Value"]} />
                  <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* ── CUSTOMERS TAB ───────────────────────────────────────────────── */}
        <TabsContent value="customers" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass rounded-2xl p-5">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Total Accounts</span>
              <p className="mt-2 text-2xl font-semibold">{k.totalCustomers}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.activeCustomers} active clients</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <span className="text-xs font-semibold uppercase text-muted-foreground">New in Period</span>
              <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                +{k.newCustomersInPeriod}
              </p>
              <p className="text-xs text-muted-foreground mt-1">+{k.customerGrowthRate}% acquisition pace</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Prospects</span>
              <p className="mt-2 text-2xl font-semibold text-blue-600 dark:text-blue-400">{k.prospectCustomers}</p>
              <p className="text-xs text-muted-foreground mt-1">Nurturing in pipeline</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Revenue Accounts */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-base font-semibold mb-4">Top Accounts by Revenue</h2>
              {data.topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No customer revenue recorded in this period.</p>
              ) : (
                <div className="space-y-3">
                  {data.topCustomers.map((cust, idx) => (
                    <div key={cust.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{cust.name}</p>
                        <p className="text-xs text-muted-foreground">{cust.company} · {cust.invoiceCount} invoices</p>
                      </div>
                      <p className="text-sm font-mono font-semibold text-foreground">
                        {money(cust.spend, currency)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Status Distribution */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-base font-semibold mb-4">Account Status Ratio</h2>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.customerBreakdown}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.charts.customerBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── TASKS TAB ───────────────────────────────────────────────────── */}
        <TabsContent value="tasks" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass rounded-2xl p-5">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Completion Rate</span>
              <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {k.taskCompletionRate}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">{k.completedTasks} completed</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Pending Items</span>
              <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">{k.pendingTasks}</p>
              <p className="text-xs text-muted-foreground mt-1">Open in active workflow</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Overdue Backlog</span>
              <p className="mt-2 text-2xl font-semibold text-rose-600 dark:text-rose-400">{k.overdueTasks}</p>
              <p className="text-xs text-muted-foreground mt-1">Passed due date</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-base font-semibold mb-4">Task Priority Breakdown</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.tasksByPriority}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="priority" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#8B5CF6" name="Total" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" fill="#10B981" name="Completed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h2 className="text-base font-semibold mb-4">Workflow Execution Status</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.tasksByStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="status" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── AI INSIGHTS TAB ─────────────────────────────────────────────── */}
        <TabsContent value="insights" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">AI Business Intelligence Engine</h2>
              <p className="text-xs text-muted-foreground">
                Grounded analysis generated directly from active workspace telemetry.
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {data.insights.length} active observation{data.insights.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {data.insights.map((ins) => (
              <div
                key={ins.id}
                className="glass rounded-2xl p-6 space-y-3 border-l-4 transition-all hover:shadow-md"
                style={{
                  borderLeftColor:
                    ins.type === "positive"
                      ? "#10B981"
                      : ins.type === "warning"
                        ? "#F59E0B"
                        : "#4F46E5",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-brand-purple" /> {ins.category}
                  </span>
                  <span className="rounded-full bg-secondary/70 px-2.5 py-0.5 text-xs font-mono font-medium text-foreground">
                    {ins.metric}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground">{ins.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{ins.description}</p>
                {ins.actionRecommended && (
                  <div className="rounded-xl bg-secondary/50 p-3 text-xs text-brand-blue font-medium">
                    🎯 <strong>Recommendation:</strong> {ins.actionRecommended}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
