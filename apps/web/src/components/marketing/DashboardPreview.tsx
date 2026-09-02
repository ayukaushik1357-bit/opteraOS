import { useState, useEffect, useRef } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  ArrowUpRight,
  Bot,
  Boxes,
  FileText,
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
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
    delta: "+24.8% velocity",
    subtext: "6 qualified deals",
    icon: TrendingUp,
    badgeColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  {
    label: "Settled Revenue MTD",
    target: 1284500,
    prefix: "₹",
    delta: "+18.2% vs last mo",
    subtext: "98.4% on-time",
    icon: Activity,
    badgeColor: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  },
  {
    label: "Autonomous Actions",
    target: 142,
    prefix: "",
    delta: "100% success",
    subtext: "Zero bottlenecks",
    icon: Bot,
    badgeColor: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  },
  {
    label: "Active Accounts",
    target: 48,
    prefix: "",
    delta: "99.2% retention",
    subtext: "Enterprise tier",
    icon: Layers,
    badgeColor: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  },
];

const aiInsights = [
  {
    type: "Sales Velocity",
    text: "Apex Logistics deal has reached 80% close probability. Recommend sending payment terms.",
    action: "Send Agreement Draft",
  },
  {
    type: "Cashflow Alert",
    text: "3 invoices totaling ₹1.45L are due in 48h. WhatsApp automated payment reminders scheduled.",
    action: "Review Schedule",
  },
  {
    type: "Lead Routing",
    text: "5 enterprise inbound leads scored above 85. Auto-assigned to Enterprise Sales Pod.",
    action: "View Assignments",
  },
];

const liveEvents = [
  { icon: Zap, title: "Inbound Lead Qualified", desc: "Automated scoring (88/100) → Assigned to Sales Pod", time: "Just now" },
  { icon: FileText, title: "Invoice INV-2026-092 Paid", desc: "Razorpay Webhook Verified · Idempotency OK", time: "2m ago" },
  { icon: Bot, title: "AI Action Approved", desc: "Re-engagement email sequence triggered for 14 accounts", time: "5m ago" },
  { icon: Boxes, title: "Inventory Threshold Balanced", desc: "Auto-synced stock across 3 fulfillment hubs", time: "8m ago" },
];

function MetricCard({
  label,
  target,
  prefix,
  delta,
  subtext,
  icon: Icon,
  badgeColor,
}: (typeof illustrativeMetrics)[0]) {
  const value = useCountUp(target);
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-3.5 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:from-white/[0.10]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-wide text-slate-300">{label}</span>
        <div className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
          <Icon className="h-3 w-3" />
        </div>
      </div>
      <p className="mt-2 text-lg font-bold tracking-tight text-white tabular-nums sm:text-xl">
        {prefix}
        {value.toLocaleString("en-IN")}
      </p>
      <div className="mt-1 flex items-center justify-between text-[11px]">
        <span className="font-medium text-emerald-400">{delta}</span>
        <span className="text-slate-300">{subtext}</span>
      </div>
    </div>
  );
}

export function DashboardPreview() {
  const [insightIdx, setInsightIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "crm" | "finance">("overview");
  
  // 3D Parallax State
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 9, y: -4 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setInsightIdx((prev) => (prev + 1) % aiInsights.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    // Smooth subtle tilt range (-6deg to +14deg on X, -8deg to +8deg on Y)
    setTilt({
      x: 10 - y * 12,
      y: -3 + x * 14,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 9, y: -4 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="perspective-1600 relative mx-auto w-full max-w-6xl py-6 select-none"
    >
      {/* ── Ambient Radial Backglow ── */}
      <div
        className="glow-pulse pointer-events-none absolute -inset-4 z-0 rounded-3xl opacity-60 blur-3xl transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.18), rgba(6, 182, 212, 0.12), transparent 75%)",
        }}
        aria-hidden
      />

      {/* ── Floating Satellite Card: AI Action (Top-Right) ── */}
      <div
        className="float-card-1 backface-hidden absolute -top-8 -right-2 z-30 hidden sm:block md:-right-6 lg:-right-8"
        style={{
          transform: `translate3d(${tilt.y * 1.5}px, ${-tilt.x * 1.5}px, 60px)`,
          transition: isHovered ? "transform 0.1s ease-out" : "transform 0.8s ease-out",
        }}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-400/30 bg-slate-900/90 p-3.5 shadow-2xl backdrop-blur-xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">AI Autonomous Action</span>
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-medium text-emerald-300">
                Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-300">3 Overdue invoices queued for auto-followup</p>
          </div>
          <button className="ml-2 rounded-lg bg-indigo-600/80 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow transition-colors hover:bg-indigo-500">
            Execute
          </button>
        </div>
      </div>

      {/* ── Floating Satellite Card: Real-time Webhook (Bottom-Left) ── */}
      <div
        className="float-card-2 backface-hidden absolute -bottom-6 -left-2 z-30 hidden sm:block md:-left-6 lg:-left-8"
        style={{
          transform: `translate3d(${-tilt.y * 1.8}px, ${tilt.x * 1.5}px, 70px)`,
          transition: isHovered ? "transform 0.1s ease-out" : "transform 0.8s ease-out",
        }}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/30 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Workflow Event #891</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
            </div>
            <p className="text-[11px] text-slate-300">Lead qualified → Deal created & Team assigned</p>
          </div>
        </div>
      </div>

      {/* ── Main 3D Floating Canvas ── */}
      <div
        className="preserve-3d relative z-10 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/85 p-4 shadow-[0_35px_80px_-20px_rgba(0,0,0,0.85),0_0_45px_-10px_rgba(99,102,241,0.25)] backdrop-blur-2xl transition-transform sm:p-6"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0px)`,
          transition: isHovered ? "transform 0.12s ease-out" : "transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {/* Subtle grid texture inside board */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] opacity-10" aria-hidden />

        {/* ── Console Header Bar ── */}
        <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500/80 shadow-sm" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80 shadow-sm" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80 shadow-sm" />
            </div>
            <div className="ml-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>opteraOS Core Console</span>
              <span className="text-slate-400">·</span>
              <span className="text-[11px] text-indigo-300">Enterprise Tenant #ORG-9412</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab("overview")}
              className={`rounded-md px-3 py-1 transition-all ${
                activeTab === "overview" ? "bg-white/15 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Unified Overview
            </button>
            <button
              onClick={() => setActiveTab("crm")}
              className={`rounded-md px-3 py-1 transition-all ${
                activeTab === "crm" ? "bg-white/15 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              CRM & Sales
            </button>
            <button
              onClick={() => setActiveTab("finance")}
              className={`rounded-md px-3 py-1 transition-all ${
                activeTab === "finance" ? "bg-white/15 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              AI & Invoices
            </button>
          </div>
        </div>

        {/* ── Key Metrics Grid (Illustrative Product Preview) ── */}
        <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-4">
          {illustrativeMetrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>

        {/* ── Main Operational Deck ── */}
        <div className="relative mt-4 grid gap-4 lg:grid-cols-12">
          {/* Left Chart Panel (7 cols) */}
          <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-4 lg:col-span-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Revenue & Pipeline Realization</p>
                <p className="text-[11px] text-slate-400">Continuous CRM to Cashflow conversion</p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 text-indigo-300">
                  <span className="h-2 w-2 rounded-full bg-indigo-400" /> Settled
                </span>
                <span className="flex items-center gap-1.5 text-purple-300">
                  <span className="h-2 w-2 rounded-full bg-purple-400" /> Target
                </span>
              </div>
            </div>

            <div className="mt-3 h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="m"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    stroke="#94a3b8"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      fontSize: "12px",
                      color: "#fff",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Settled (k)"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#salesGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="target"
                    name="Pipeline (k)"
                    stroke="#a855f7"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="url(#targetGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2.5 text-[11px] text-slate-300">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> 100% Reconciliation Accuracy
              </span>
              <span>Updated in real-time via Supabase Database CDC</span>
            </div>
          </div>

          {/* Right AI & Automation Panel (5 cols) */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            {/* optera AI Executive Assistant Card */}
            <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-950/60 p-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  optera AI Assistant
                </span>
                <span className="rounded-md border border-indigo-400/30 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
                  {aiInsights[insightIdx]?.type}
                </span>
              </div>
              <p className="mt-2 min-h-11 text-xs leading-relaxed text-slate-200">
                {aiInsights[insightIdx]?.text}
              </p>
              <button className="mt-2.5 flex w-full items-center justify-between rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:opacity-95">
                <span>{aiInsights[insightIdx]?.action}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Real-time Automation Engine Feed */}
            <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-xs">
              <div className="flex items-center justify-between pb-2">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <Zap className="h-3.5 w-3.5 text-cyan-400" />
                  Live Automation Stream
                </span>
                <span className="text-[10px] text-slate-400">n8n Engine active</span>
              </div>
              <div className="space-y-2 pt-1">
                {liveEvents.slice(0, 3).map((ev) => {
                  const Icon = ev.icon;
                  return (
                    <div
                      key={ev.title}
                      className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition-colors hover:bg-white/[0.05]"
                    >
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-cyan-300">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate font-medium text-white text-[11px]">{ev.title}</p>
                          <span className="text-[9px] text-slate-400">{ev.time}</span>
                        </div>
                        <p className="truncate text-[10px] text-slate-300">{ev.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Console Footer Shield ── */}
        <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-[11px] text-slate-300">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Row-Level Security Enforced
            </span>
            <span className="hidden sm:inline-block text-slate-400">·</span>
            <span className="hidden sm:inline-block text-slate-300">Deterministic + Gemini 1.5 Multi-Provider AI</span>
          </div>
          <span className="font-mono text-[10px] text-indigo-300">opteraOS v2.4 Enterprise Architecture</span>
        </div>
      </div>
    </div>
  );
}
