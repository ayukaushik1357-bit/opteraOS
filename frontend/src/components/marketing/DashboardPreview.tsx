import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  TrendingUp,
  Activity,
  Bot,
  Layers,
  Sparkles,
  Zap,
  FileText,
  Boxes,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useCountUp } from "@/components/shared/ui-kit";

const revenueTrend = [
  { m: "Apr", sales: 480, target: 400 },
  { m: "May", sales: 620, target: 500 },
  { m: "Jun", sales: 590, target: 550 },
  { m: "Jul", sales: 840, target: 700 },
  { m: "Aug", sales: 980, target: 850 },
  { m: "Sep", sales: 1284, target: 1100 },
];

const illustrativeMetrics = [
  {
    label: "Active Pipeline",
    target: 1845000,
    prefix: "₹",
    delta: "+24.8%",
    subtext: "6 qualified deals",
    icon: TrendingUp,
    iconColor: "text-[#008080]",
    iconBg: "bg-[rgba(0,128,128,0.15)] border-[rgba(0,128,128,0.25)]",
    deltaColor: "text-[#008080] dark:text-teal-400",
  },
  {
    label: "Settled Revenue MTD",
    target: 1284500,
    prefix: "₹",
    delta: "+18.2%",
    subtext: "98.4% on-time",
    icon: Activity,
    iconColor: "text-[#10B981]",
    iconBg: "bg-[rgba(16,185,129,0.15)] border-[rgba(16,185,129,0.25)]",
    deltaColor: "text-[#10B981] dark:text-emerald-400",
  },
  {
    label: "Autonomous Actions",
    target: 142,
    prefix: "",
    delta: "100% success",
    subtext: "Zero bottlenecks",
    icon: Bot,
    iconColor: "text-[#8B5CF6]",
    iconBg: "bg-[rgba(139,92,246,0.15)] border-[rgba(139,92,246,0.25)]",
    deltaColor: "text-[#8B5CF6] dark:text-violet-400",
  },
  {
    label: "Active Accounts",
    target: 48,
    prefix: "",
    delta: "99.2% retention",
    subtext: "Enterprise tier",
    icon: Layers,
    iconColor: "text-[#22D3EE]",
    iconBg: "bg-[rgba(34,211,238,0.15)] border-[rgba(34,211,238,0.25)]",
    deltaColor: "text-[#22D3EE] dark:text-cyan-400",
  },
];

const liveEvents = [
  { icon: Zap, title: "Inbound Lead Qualified", desc: "Automated scoring (88/100) → Assigned to Sales Pod", time: "Just now", iconColor: "text-[#F59E0B]", iconBg: "bg-[rgba(245,158,11,0.15)]" },
  { icon: FileText, title: "Invoice INV-2026-092 Paid", desc: "Invoice Settlement Verified", time: "2m ago", iconColor: "text-[#10B981]", iconBg: "bg-[rgba(16,185,129,0.15)]" },
  { icon: Bot, title: "AI Workflow Executed", desc: "Re-engagement sequence triggered for 14 accounts", time: "5m ago", iconColor: "text-[#008080]", iconBg: "bg-[rgba(0,128,128,0.15)]" },
  { icon: Boxes, title: "Stock Balanced", desc: "Auto-synced inventory across 3 fulfillment hubs", time: "8m ago", iconColor: "text-[#8B5CF6]", iconBg: "bg-[rgba(139,92,246,0.15)]" },
];

function MetricCard({
  label,
  target,
  prefix,
  delta,
  subtext,
  icon: Icon,
  iconColor,
  iconBg,
  deltaColor,
}: (typeof illustrativeMetrics)[0]) {
  const value = useCountUp(target);
  return (
    <div className="rounded-xl border border-[rgba(0,128,128,0.14)] dark:border-teal-500/20 bg-white dark:bg-[#091b1f] p-4 shadow-xs hover:border-[rgba(0,128,128,0.3)] dark:hover:border-teal-500/40 transition-all duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#5A7573] dark:text-slate-400">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${iconBg} ${iconColor}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-2.5 text-xl font-bold tracking-tight text-[#0F2423] dark:text-white tabular-nums">
        {prefix}
        {value.toLocaleString("en-IN")}
      </p>
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className={`font-semibold ${deltaColor}`}>{delta}</span>
        <span className="text-[#617D7B] dark:text-slate-500">{subtext}</span>
      </div>
    </div>
  );
}

export function DashboardPreview() {
  const [activeTab, setActiveTab] = useState<"overview" | "crm" | "finance">("overview");

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      {/* Outer glow */}
      <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#008080] via-[#0D9488] to-[#6366F1] opacity-[0.1] dark:opacity-[0.18] blur-xl" aria-hidden />

      {/* ── Main Product Preview Shell ── */}
      <div className="relative overflow-hidden rounded-2xl border border-[rgba(0,128,128,0.2)] dark:border-teal-500/25 bg-[#E8F1F0] dark:bg-[#071619] shadow-[0_20px_50px_rgba(0,64,64,0.08),0_0_0_1px_rgba(0,128,128,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_0_1px_rgba(0,179,179,0.15)]">

        {/* ── Console Header Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(0,128,128,0.14)] dark:border-teal-500/20 bg-[#F3F8F7] dark:bg-[#0a1e22] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#E11D48] opacity-80" />
              <span className="h-3 w-3 rounded-full bg-[#D97706] opacity-80" />
              <span className="h-3 w-3 rounded-full bg-[#059669] opacity-80" />
            </div>
            <div className="ml-2 flex items-center gap-2 rounded-md border border-[rgba(0,128,128,0.15)] dark:border-teal-500/20 bg-white dark:bg-[#091b1f] px-2.5 py-1 text-xs font-medium text-[#3D5A58] dark:text-slate-400 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#008080] dark:bg-teal-400 animate-pulse shadow-[0_0_6px_#008080] dark:shadow-[0_0_6px_#00b3b3]" />
              <span className="font-semibold text-[#0F2423] dark:text-white">opteraOS Core Console</span>
              <span className="text-[rgba(0,128,128,0.3)] dark:text-teal-600/40">·</span>
              <span className="text-[#617D7B] dark:text-slate-500">Enterprise Workspace #ORG-9412</span>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-[rgba(0,128,128,0.15)] dark:border-teal-500/20 bg-white dark:bg-[#091b1f] p-1 text-xs font-medium shadow-xs">
            {(["overview", "crm", "finance"] as const).map((tab) => {
              const labels = { overview: "Unified Overview", crm: "CRM & Sales", finance: "Finance & Invoices" };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-3 py-1 transition-all duration-200 cursor-pointer ${
                    activeTab === tab
                      ? "bg-[rgba(0,128,128,0.12)] dark:bg-teal-500/20 text-[#008080] dark:text-teal-300 font-semibold border border-[rgba(0,128,128,0.2)] dark:border-teal-500/30"
                      : "text-[#5A7573] dark:text-slate-400 hover:text-[#0F2423] dark:hover:text-slate-200"
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Dashboard Canvas Body ── */}
        <div className="bg-[#EDF4F3] dark:bg-[#071619] p-4 sm:p-6">

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {illustrativeMetrics.map((m) => (
              <MetricCard key={m.label} {...m} />
            ))}
          </div>

          {/* Operational Deck */}
          <div className="mt-4 grid gap-4 lg:grid-cols-12">

            {/* Left Chart Panel */}
            <div className="rounded-xl border border-[rgba(0,128,128,0.14)] dark:border-teal-500/20 bg-white dark:bg-[#091b1f] p-5 shadow-xs lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#0F2423] dark:text-white">Revenue & Pipeline Realization</h2>
                    <p className="text-xs text-[#5A7573] dark:text-slate-400 mt-0.5">Continuous CRM to Cashflow conversion</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-[#008080] dark:text-teal-400">
                      <span className="h-2 w-2 rounded-full bg-[#008080] dark:bg-teal-400 shadow-[0_0_4px_#008080] dark:shadow-[0_0_4px_#00b3b3]" /> Settled
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-[#6366F1] dark:text-indigo-400">
                      <span className="h-2 w-2 rounded-full bg-[#6366F1] dark:bg-indigo-400" /> Target
                    </span>
                  </div>
                </div>

                <div className="mt-4 h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="settledGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#008080" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#008080" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="m" stroke="#CBD5E1" fontSize={11} tickLine={false} axisLine={{ stroke: "#E2ECEB" }} tick={{ fill: "#617D7B" }} />
                      <YAxis stroke="#CBD5E1" fontSize={11} tickLine={false} axisLine={{ stroke: "#E2ECEB" }} tick={{ fill: "#617D7B" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          borderColor: "rgba(0,128,128,0.25)",
                          borderRadius: "8px",
                          boxShadow: "0 4px 16px rgba(0,64,64,0.1)",
                          fontSize: "12px",
                          color: "#0F2423",
                        }}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#008080" strokeWidth={2.5} fill="url(#settledGrad)" name="Settled (₹k)" />
                      <Area type="monotone" dataKey="target" stroke="#6366F1" strokeWidth={2} strokeDasharray="3 3" fill="url(#targetGrad)" name="Target (₹k)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[rgba(0,128,128,0.1)] dark:border-teal-500/15 pt-3 text-xs text-[#5A7573] dark:text-slate-400">
                <span>Automated reconciliation active</span>
                <span className="font-semibold text-[#059669] dark:text-emerald-400">99.8% match rate</span>
              </div>
            </div>

            {/* Right Stream */}
            <div className="flex flex-col gap-3.5 lg:col-span-5">

              {/* AI Action Card */}
              <div className="rounded-xl border border-[rgba(0,128,128,0.25)] dark:border-teal-500/30 bg-white dark:bg-[#091b1f] p-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(0,128,128,0.12)] dark:bg-teal-500/15 border border-[rgba(0,128,128,0.22)] dark:border-teal-500/30 text-[#008080] dark:text-teal-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#0F2423] dark:text-white">AI Autonomous Action</span>
                      <span className="inline-flex items-center rounded-full bg-[rgba(5,150,105,0.12)] dark:bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-[#059669] dark:text-emerald-400 border border-[rgba(5,150,105,0.25)] dark:border-emerald-500/30">
                        Ready to execute
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#3D5A58] dark:text-slate-300 leading-relaxed">
                      3 Overdue invoices totaling ₹1.45L queued for automated reminder sequence.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button className="rounded-md bg-gradient-to-r from-[#008080] to-[#0D9488] px-3 py-1.5 text-xs font-semibold text-white hover:from-[#006666] hover:to-[#008080] cursor-pointer shadow-xs transition-all">
                        Approve & Send
                      </button>
                      <button className="rounded-md border border-[rgba(0,128,128,0.2)] dark:border-teal-500/25 bg-transparent px-2.5 py-1.5 text-xs font-medium text-[#3D5A58] dark:text-slate-300 hover:bg-[rgba(0,128,128,0.06)] dark:hover:bg-teal-500/10 hover:text-[#0F2423] dark:hover:text-white cursor-pointer transition-colors">
                        Inspect
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Event Log */}
              <div className="flex-1 rounded-xl border border-[rgba(0,128,128,0.14)] dark:border-teal-500/20 bg-white dark:bg-[#091b1f] p-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[rgba(0,128,128,0.1)] dark:border-teal-500/15 pb-2.5">
                  <span className="text-xs font-bold text-[#0F2423] dark:text-white">Live Business Events</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#059669] dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#059669] dark:bg-emerald-400 animate-pulse shadow-[0_0_4px_#059669] dark:shadow-[0_0_4px_#34d399]" /> Live Feed
                  </span>
                </div>

                <div className="mt-3 space-y-2.5">
                  {liveEvents.map((evt, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-lg border border-[rgba(0,128,128,0.08)] dark:border-teal-500/15 bg-[#F8FBFA] dark:bg-[#051114] p-2.5 transition-colors hover:bg-[rgba(0,128,128,0.04)] dark:hover:bg-teal-900/20">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${evt.iconBg} ${evt.iconColor}`}>
                        <evt.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-xs font-semibold text-[#0F2423] dark:text-white">{evt.title}</p>
                          <span className="text-[10px] text-[#617D7B] dark:text-slate-500 font-medium shrink-0 ml-1">{evt.time}</span>
                        </div>
                        <p className="truncate text-[11px] text-[#5A7573] dark:text-slate-400 mt-0.5">{evt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
