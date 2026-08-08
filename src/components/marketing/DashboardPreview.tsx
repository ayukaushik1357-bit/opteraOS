import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowUpRight, Bot, Boxes, FileText, Sparkles, Zap } from "lucide-react";

const revenue = [
  { m: "Apr", v: 640 },
  { m: "May", v: 720 },
  { m: "Jun", v: 690 },
  { m: "Jul", v: 880 },
  { m: "Aug", v: 960 },
  { m: "Sep", v: 1284 },
];

const stats = [
  { label: "Revenue", value: "₹12,84,500", delta: "+18.2%" },
  { label: "Orders", value: "1,248", delta: "+6.4%" },
  { label: "New customers", value: "312", delta: "+11.9%" },
  { label: "Pending invoices", value: "₹2,48,000", delta: "12 overdue" },
];

export function DashboardPreview() {
  return (
    <div className="glass glow-ring relative rounded-2xl p-3 sm:p-4">
      <div className="flex items-center gap-2 pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-violet/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-cyan/70" />
        <span className="ml-2 text-xs text-muted-foreground">opteraOS · Overview</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-sm font-semibold sm:text-base">{s.value}</p>
            <p className="mt-1 text-[11px] text-brand-cyan">{s.delta}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-secondary/30 p-3 lg:col-span-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">Revenue trend</p>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <ArrowUpRight className="h-3 w-3" /> Last 6 months
            </span>
          </div>
          <div className="mt-2 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--brand-blue)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--brand-magenta)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={10} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip
                  cursor={{ stroke: "var(--brand-violet)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Area type="monotone" dataKey="v" stroke="var(--brand-violet)" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-2 lg:col-span-2">
          <div className="rounded-xl border border-border bg-secondary/30 p-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-brand-magenta" /> optera AI
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              37 high-value customers haven&apos;t purchased in 60+ days.
            </p>
            <button className="mt-2 w-full rounded-lg bg-gradient-brand px-2 py-1.5 text-[11px] font-medium text-primary-foreground">
              Create re-engagement campaign
            </button>
          </div>
          <div className="rounded-xl border border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Zap className="h-3.5 w-3.5 text-brand-cyan" /> Automation activity
            </p>
            <p className="mt-1.5 flex items-center gap-1.5"><Boxes className="h-3 w-3 shrink-0" /> 8 low-stock alerts routed</p>
            <p className="mt-1 flex items-center gap-1.5"><FileText className="h-3 w-3 shrink-0" /> 12 invoice reminders sent</p>
            <p className="mt-1 flex items-center gap-1.5"><Bot className="h-3 w-3 shrink-0" /> 46 leads scored today</p>
          </div>
        </div>
      </div>
    </div>
  );
}