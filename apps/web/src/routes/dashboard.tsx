import { useEffect } from "react";
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
import { AlertTriangle, CheckSquare, IndianRupee, TrendingUp, Users, Wallet, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/components/app/AppShell";
import { getDashboard } from "@/lib/workspace.functions";

const title = "Overview — opteraOS";
const description =
  "Live revenue, pipeline, invoice and customer KPIs for your business, unified in the opteraOS overview.";

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

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function Dashboard() {
  const { current, isLoading: loadingWorkspaces } = useWorkspace();
  const navigate = useNavigate();
  const fetchDashboard = useServerFn(getDashboard);

  useEffect(() => {
    if (!loadingWorkspaces && !current) navigate({ to: "/onboarding", replace: true });
  }, [loadingWorkspaces, current, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", current?.id],
    queryFn: () => fetchDashboard({ data: { orgId: current!.id } }),
    enabled: !!current,
  });

  if (!current || isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const currency = current.currency || "INR";
  const k = data.kpis;
  const empty = k.customers === 0 && k.openDeals === 0 && k.revenue === 0;

  const cards = [
    {
      label: "Revenue collected",
      value: money(k.revenue, currency),
      sub: `${k.overdueInvoices} overdue invoices`,
      icon: IndianRupee,
      section: "revenue",
    },
    {
      label: "Outstanding",
      value: money(k.outstanding, currency),
      sub: "Sent + overdue invoices",
      icon: Wallet,
      section: "revenue",
    },
    {
      label: "Open pipeline",
      value: money(k.pipeline, currency),
      sub: `${k.openDeals} open deals · ${k.winRate}% win rate`,
      icon: TrendingUp,
      section: "sales",
    },
    {
      label: "Pending Tasks",
      value: String(k.pendingTasks ?? 0),
      sub: "Open action items",
      icon: CheckSquare,
      section: "tasks",
    },
    {
      label: "Customers",
      value: String(k.customers),
      sub: `${k.activeCustomers} active`,
      icon: Users,
      section: "customers",
    },
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{current.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live overview across sales, invoices, tasks and customers.
          </p>
        </div>
        <Link
          to="/analytics"
          search={{ section: "overview" }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/60 transition-colors"
        >
          View Full Analytics <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {empty && (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-magenta" />
          <p>
            Your workspace is empty, so every KPI reads zero. As customers, deals and invoices are
            added, this overview updates live.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            to="/analytics"
            search={{ section: card.section }}
            className="glass rounded-2xl p-5 transition-all hover:bg-secondary/40 hover:scale-[1.01] cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {card.label}
              </span>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="glass rounded-2xl p-5 lg:col-span-3">
          <h2 className="text-sm font-medium">Revenue — last 6 months</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueSeries}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-indigo)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--brand-indigo)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                  formatter={(v: number) => money(v, currency)}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--brand-blue)"
                  strokeWidth={2}
                  fill="url(#revFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h2 className="text-sm font-medium">Pipeline by stage</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.pipelineByStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="stage"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                  formatter={(v: number) => money(v, currency)}
                />
                <Bar dataKey="value" fill="var(--brand-violet)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-medium">Recent invoices</h2>
          {data.recentInvoices.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {data.recentInvoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{inv.number}</span>
                  <span className="text-muted-foreground">{inv.status}</span>
                  <span>{money(Number(inv.amount), currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-medium">Recent deals</h2>
          {data.recentDeals.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No deals yet.</p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {data.recentDeals.map((deal) => (
                <li
                  key={deal.id}
                  className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium">{deal.title}</span>
                  <span className="text-muted-foreground">{deal.stage}</span>
                  <span>{money(Number(deal.value), currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-medium">Pending Tasks</h2>
          {(data.recentTasks ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No pending tasks.</p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {(data.recentTasks ?? []).map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium">{task.title}</span>
                  <span className="text-xs text-muted-foreground">{task.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
