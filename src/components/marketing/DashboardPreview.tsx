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
    iconColor: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    label: "Settled Revenue MTD",
    target: 1284500,
    prefix: "₹",
    delta: "+18.2%",
    subtext: "98.4% on-time",
    icon: Activity,
    iconColor: "text-green-600 bg-green-50 border-green-200",
  },
  {
    label: "Autonomous Actions",
    target: 142,
    prefix: "",
    delta: "100% success",
    subtext: "Zero bottlenecks",
    icon: Bot,
    iconColor: "text-purple-600 bg-purple-50 border-purple-200",
  },
  {
    label: "Active Accounts",
    target: 48,
    prefix: "",
    delta: "99.2% retention",
    subtext: "Enterprise tier",
    icon: Layers,
    iconColor: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
];

const liveEvents = [
  { icon: Zap, title: "Inbound Lead Qualified", desc: "Automated scoring (88/100) → Assigned to Sales Pod", time: "Just now", color: "text-amber-600 bg-amber-50" },
  { icon: FileText, title: "Invoice INV-2026-092 Paid", desc: "Invoice Settlement Verified", time: "2m ago", color: "text-green-600 bg-green-50" },
  { icon: Bot, title: "AI Workflow Executed", desc: "Re-engagement sequence triggered for 14 accounts", time: "5m ago", color: "text-blue-600 bg-blue-50" },
  { icon: Boxes, title: "Stock Balanced", desc: "Auto-synced inventory across 3 fulfillment hubs", time: "8m ago", color: "text-indigo-600 bg-indigo-50" },
];

function MetricCard({
  label,
  target,
  prefix,
  delta,
  subtext,
  icon: Icon,
  iconColor,
}: (typeof illustrativeMetrics)[0]) {
  const value = useCountUp(target);
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${iconColor}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-2.5 text-xl font-bold tracking-tight text-[#111827] tabular-nums">
        {prefix}
        {value.toLocaleString("en-IN")}
      </p>
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold text-green-700">{delta}</span>
        <span className="text-[#6B7280]">{subtext}</span>
      </div>
    </div>
  );
}

export function DashboardPreview() {
  const [activeTab, setActiveTab] = useState<"overview" | "crm" | "finance">("overview");

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      {/* ── Main Product Preview Shell ── */}
      <div className="overflow-hidden rounded-2xl border border-[#D1D5DB] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        
        {/* ── Console Header Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#EF4444]" />
              <span className="h-3 w-3 rounded-full bg-[#F59E0B]" />
              <span className="h-3 w-3 rounded-full bg-[#10B981]" />
            </div>
            <div className="ml-2 flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-medium text-[#374151] shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="font-semibold text-[#111827]">opteraOS Core Console</span>
              <span className="text-gray-300">·</span>
              <span className="text-[#6B7280]">Enterprise Workspace #ORG-9412</span>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white p-1 text-xs font-medium shadow-2xs">
            <button
              onClick={() => setActiveTab("overview")}
              className={`rounded-md px-3 py-1 transition-colors cursor-pointer ${
                activeTab === "overview" ? "bg-[#EEF4FF] text-blue-700 font-semibold" : "text-[#4B5563] hover:text-[#111827]"
              }`}
            >
              Unified Overview
            </button>
            <button
              onClick={() => setActiveTab("crm")}
              className={`rounded-md px-3 py-1 transition-colors cursor-pointer ${
                activeTab === "crm" ? "bg-[#EEF4FF] text-blue-700 font-semibold" : "text-[#4B5563] hover:text-[#111827]"
              }`}
            >
              CRM &amp; Sales
            </button>
            <button
              onClick={() => setActiveTab("finance")}
              className={`rounded-md px-3 py-1 transition-colors cursor-pointer ${
                activeTab === "finance" ? "bg-[#EEF4FF] text-blue-700 font-semibold" : "text-[#4B5563] hover:text-[#111827]"
              }`}
            >
              Finance &amp; Invoices
            </button>
          </div>
        </div>

        {/* ── Dashboard Canvas Body ── */}
        <div className="bg-[#F8FAFC] p-4 sm:p-6">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {illustrativeMetrics.map((m) => (
              <MetricCard key={m.label} {...m} />
            ))}
          </div>

          {/* Operational Deck: Chart + Live Event Stream & Action Card */}
          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            
            {/* Left Chart Panel (7 cols) */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#111827]">Revenue &amp; Pipeline Realization</h2>
                    <p className="text-xs text-[#6B7280] mt-0.5">Continuous CRM to Cashflow conversion</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-blue-700">
                      <span className="h-2 w-2 rounded-full bg-blue-600" /> Settled
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-indigo-700">
                      <span className="h-2 w-2 rounded-full bg-indigo-600" /> Target
                    </span>
                  </div>
                </div>

                {/* Area Chart */}
                <div className="mt-4 h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="settledGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.10} />
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="m" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                      <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          borderColor: "#E5E7EB",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.06)",
                          fontSize: "12px",
                          color: "#111827",
                        }}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#2563EB" strokeWidth={2.5} fill="url(#settledGrad)" name="Settled (₹k)" />
                      <Area type="monotone" dataKey="target" stroke="#4F46E5" strokeWidth={2} strokeDasharray="3 3" fill="url(#targetGrad)" name="Target (₹k)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bottom Chart Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-[#E5E7EB] pt-3 text-xs text-[#6B7280]">
                <span>Automated reconciliation active</span>
                <span className="font-semibold text-green-700">99.8% match rate</span>
              </div>
            </div>

            {/* Right Operational Stream & AI Action Card (5 cols) */}
            <div className="flex flex-col gap-3.5 lg:col-span-5">
              
              {/* Subtle Autonomous Action Card (Integrated Product Component) */}
              <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#111827]">AI Autonomous Action</span>
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 border border-green-200">
                        Ready to execute
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#4B5563] leading-relaxed">
                      3 Overdue invoices totaling ₹1.45L queued for automated reminder sequence.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer shadow-2xs">
                        Approve &amp; Send
                      </button>
                      <button className="rounded-md border border-[#D1D5DB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#374151] hover:bg-gray-50 cursor-pointer">
                        Inspect
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Business Event Log */}
              <div className="flex-1 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
                  <span className="text-xs font-bold text-[#111827]">Live Business Events</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" /> Live Feed
                  </span>
                </div>

                <div className="mt-3 space-y-2.5">
                  {liveEvents.map((evt, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-lg border border-[#F3F4F6] bg-[#F8FAFC] p-2.5 transition-colors hover:bg-gray-100/70">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${evt.color}`}>
                        <evt.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-xs font-semibold text-[#111827]">{evt.title}</p>
                          <span className="text-[10px] text-[#6B7280] font-medium shrink-0 ml-1">{evt.time}</span>
                        </div>
                        <p className="truncate text-[11px] text-[#4B5563] mt-0.5">{evt.desc}</p>
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
