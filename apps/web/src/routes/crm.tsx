import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Contact, TrendingUp, UserPlus, Activity, Clock } from "lucide-react";
import { appHead } from "@/lib/app-head";
import { PageHeader, StatCard, TableSkeleton } from "@/components/shared/ui-kit";
import { getCrmSummary } from "@/lib/crm.functions";
import { useWorkspace } from "@/components/app/AppShell";
import { money } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/crm")({
  head: appHead("CRM", "Leads, customers, contacts and deals in one connected workspace."),
  component: CrmPage,
});

const links = [
  { to: "/leads", label: "Leads", icon: UserPlus, desc: "Score and route inbound interest." },
  {
    to: "/customers",
    label: "Customers",
    icon: Contact,
    desc: "Accounts, contacts and lifetime value.",
  },
  {
    to: "/deals",
    label: "Pipeline",
    icon: TrendingUp,
    desc: "Move opportunities through six stages.",
  },
];

const activityTypeLabel: Record<string, string> = {
  call: "Call logged",
  meeting: "Meeting held",
  email: "Email sent",
  note: "Note added",
  follow_up: "Follow-up set",
  status_change: "Status changed",
};

function CrmPage() {
  const { current } = useWorkspace();
  const fetchSummary = useServerFn(getCrmSummary);

  const { data, isLoading } = useQuery({
    queryKey: ["crm_summary", current?.id],
    queryFn: () => fetchSummary({ data: { orgId: current!.id } }),
    enabled: !!current,
  });

  const currency = current?.currency ?? "INR";

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM"
        subtitle="One relationship record shared by sales, invoicing and support."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open leads"
          value={isLoading ? "—" : (data?.openLeads ?? 0)}
          loading={isLoading}
        />
        <StatCard
          label="Customers"
          value={isLoading ? "—" : (data?.customerCount ?? 0)}
          loading={isLoading}
        />
        <StatCard
          label="Open pipeline"
          value={isLoading ? "—" : money(data?.openPipeline ?? 0, currency)}
          loading={isLoading}
        />
        <StatCard
          label="Active this week"
          value={isLoading ? "—" : (data?.activeThisWeek ?? 0)}
          hint="activities in last 7 days"
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {links.map(({ to, label, icon: Icon, desc }) => (
          <Link
            key={to}
            to={to}
            className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-brand-indigo/40 hover:shadow-md"
          >
            <Icon className="h-5 w-5 text-brand-indigo" aria-hidden />
            <p className="mt-3 font-medium text-foreground">{label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="inline-flex items-center gap-2 font-medium text-foreground">
          <Activity className="h-4 w-4 text-brand-violet" aria-hidden /> Activity timeline
        </h2>
        {isLoading ? (
          <div className="mt-4">
            <TableSkeleton rows={4} />
          </div>
        ) : !data?.recentActivities?.length ? (
          <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden />
            <p className="mt-3 font-medium text-foreground">No activity recorded yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Customer calls, meetings, emails and notes will appear here as your team logs them.
            </p>
          </div>
        ) : (
          <ol className="mt-4 space-y-2">
            {data.recentActivities.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <span className="text-xs font-medium uppercase tracking-wide text-brand-indigo">
                    {activityTypeLabel[a.type] ?? a.type}
                  </span>
                  <p className="mt-0.5 truncate font-medium text-foreground">{a.title}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
