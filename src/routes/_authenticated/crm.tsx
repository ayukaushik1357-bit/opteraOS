import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Contact, TrendingUp, UserPlus, FileText, ShoppingCart, Percent, ArrowRight } from "lucide-react";
import { appHead } from "@/lib/app-head";
import { PageHeader, StatCard } from "@/components/shared/ui-kit";
import { crmAnalyticsApi } from "@/lib/api";
import { useWorkspace } from "@/components/app/AppShell";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/crm")({
  head: appHead("CRM & Sales Engine", "Enterprise CRM pipelines, leads scoring, quotes, and customer 360."),
  component: CrmPage,
});

const links = [
  {
    to: "/leads",
    label: "Leads Engine",
    icon: UserPlus,
    desc: "AI scoring, duplicate analysis, and automated assignment.",
    tag: "Multi-Factor Scoring",
  },
  {
    to: "/deals",
    label: "Sales Pipelines",
    icon: TrendingUp,
    desc: "Multi-pipeline Kanban, probability sync, and weighted forecasting.",
    tag: "Forecasting",
  },
  {
    to: "/customers",
    label: "Customer 360°",
    icon: Contact,
    desc: "Unified customer account, orders, invoices, and timeline history.",
    tag: "360° View",
  },
  {
    to: "/quotations",
    label: "Sales Quotations",
    icon: FileText,
    desc: "Vector PDF generation, discount approvals, email delivery, and customer acceptance.",
    tag: "PDF & Approvals",
  },
  {
    to: "/orders",
    label: "Sales Orders",
    icon: ShoppingCart,
    desc: "Confirmed orders, sequence generation (SO-XXXXX), and fulfillment events.",
    tag: "Fulfillment",
  },
  {
    to: "/pricelists",
    label: "Price Lists",
    icon: Percent,
    desc: "Dynamic customer tiering, volume breaks, and rule-based pricing engine.",
    tag: "Pricing Engine",
  },
];

function CrmPage() {
  const { current } = useWorkspace();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["crm_summary", current?.id],
    queryFn: () => crmAnalyticsApi.getSummary(current!.id),
    enabled: !!current,
  });

  const currency = current?.currency ?? "INR";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advanced CRM & Sales Engine"
        subtitle="Enterprise sales pipeline, real-time scoring, multi-tier pricing, quotations with vector PDF, and fulfillment."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open Leads"
          value={isLoading ? "—" : (summary?.openLeads ?? 0)}
          hint={`${summary?.leadConversionRate ?? 0}% qualification rate`}
          loading={isLoading}
        />
        <StatCard
          label="Active Pipeline"
          value={isLoading ? "—" : money(summary?.openPipelineValue ?? 0, currency)}
          hint={`Weighted: ${money(summary?.weightedPipelineValue ?? 0, currency)}`}
          loading={isLoading}
        />
        <StatCard
          label="Active Sales Orders"
          value={isLoading ? "—" : money(summary?.activeOrderRevenue ?? 0, currency)}
          hint={`${summary?.activeOrdersCount ?? 0} confirmed orders`}
          loading={isLoading}
        />
        <StatCard
          label="Active Accounts"
          value={isLoading ? "—" : (summary?.customerCount ?? 0)}
          hint={`${summary?.activeActivitiesThisWeek ?? 0} activities this week`}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {links.map(({ to, label, icon: Icon, desc, tag }) => (
          <Link
            key={to}
            to={to}
            className="group relative rounded-xl border border-[#E5EAF1] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                {tag}
              </span>
            </div>
            <p className="mt-4 font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">{label}</p>
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">{desc}</p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Open module</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
