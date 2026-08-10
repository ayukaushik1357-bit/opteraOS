import { createFileRoute, Link } from "@tanstack/react-router";
import { Contact, TrendingUp, UserPlus, Activity } from "lucide-react";
import { appHead } from "@/lib/app-head";
import { PageHeader, StatCard, useMockData, TableSkeleton } from "@/components/shared/ui-kit";
import { mockCustomers, mockDeals, mockLeads } from "@/lib/mock/data";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/crm")({
  head: appHead("CRM", "Leads, customers, contacts and deals in one connected workspace."),
  component: CrmPage,
});

const links = [
  { to: "/leads", label: "Leads", icon: UserPlus, desc: "Score and route inbound interest." },
  { to: "/customers", label: "Customers", icon: Contact, desc: "Accounts, contacts and lifetime value." },
  { to: "/deals", label: "Pipeline", icon: TrendingUp, desc: "Move opportunities through six stages." },
];

function CrmPage() {
  const { loading } = useMockData(true);
  const pipeline = mockDeals.filter((d) => !["won", "lost"].includes(d.stage)).reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="CRM" subtitle="One relationship record shared by sales, invoicing and support." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open leads" value={mockLeads.filter((l) => l.stage !== "unqualified").length} loading={loading} />
        <StatCard label="Customers" value={mockCustomers.length} loading={loading} />
        <StatCard label="Open pipeline" value={money(pipeline, "INR")} loading={loading} />
        <StatCard label="Active this week" value={6} hint="+2 vs last week" loading={loading} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {links.map(({ to, label, icon: Icon, desc }) => (
          <Link key={to} to={to} className="rounded-2xl border border-border bg-card/40 p-6 transition-colors hover:border-brand-indigo/50">
            <Icon className="h-5 w-5 text-brand-cyan" aria-hidden />
            <p className="mt-3 font-medium">{label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card/40 p-6">
        <h2 className="inline-flex items-center gap-2 font-medium">
          <Activity className="h-4 w-4 text-brand-violet" aria-hidden /> Activity timeline
        </h2>
        {loading ? (
          <div className="mt-4"><TableSkeleton rows={4} /></div>
        ) : (
          <ol className="mt-4 space-y-3">
            {[
              { t: "Ananya Rao replied on WhatsApp", w: "12 min ago" },
              { t: "Deal “Annual platform rollout” moved to Negotiation", w: "1 hr ago" },
              { t: "Invoice INV-2026-0141 marked overdue", w: "3 hrs ago" },
              { t: "6 new website leads scored by optera AI", w: "Today" },
            ].map((a) => (
              <li key={a.t} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm">
                <span className="min-w-0">{a.t}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{a.w}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
