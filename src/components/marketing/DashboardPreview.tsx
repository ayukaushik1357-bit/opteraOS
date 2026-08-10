import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowUpRight, Bot, Boxes, FileText, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useCountUp } from "@/components/shared/ui-kit";

const revenue = [
  { m: "Apr", v: 640 },
  { m: "May", v: 720 },
  { m: "Jun", v: 690 },
  { m: "Jul", v: 880 },
  { m: "Aug", v: 960 },
  { m: "Sep", v: 1284 },
];

const stats = [
  { label: "Revenue", target: 1284500, prefix: "₹", delta: "+18.2%" },
  { label: "Orders", target: 1248, prefix: "", delta: "+6.4%" },
  { label: "New customers", target: 312, prefix: "", delta: "+11.9%" },
  { label: "Pending invoices", target: 248000, prefix: "₹", delta: "12 overdue" },
];

function Metric({ label, target, prefix, delta }: { label: string; target: number; prefix: string; delta: string }) {
  const value = useCountUp(target);
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums sm:text-base">
        {prefix}
        {value.toLocaleString("en-IN")}
      </p>
      <p className="mt-1 text-[11px] text-brand-cyan">{delta}</p>
    </div>
  );
}

const insights = [
  "37 high-value customers haven't purchased in 60+ days.",
  "2 SKUs will stock out this week at current velocity.",
  "₹2.48L of invoices are more than 7 days past due.",
];

const activity = [
  { icon: Boxes, text: "8 low-stock alerts routed" },
  { icon: FileText, text: "12 invoice reminders sent" },
  { icon: Bot, text: "46 leads scored today" },
  { icon: Zap, text: "3 orders auto-invoiced" },
];

export function DashboardPreview() {
  const [insight, setInsight] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const a = setInterval(() => setInsight((v) => (v + 1) % insights.length), 4200);
    const b = setInterval(() => setTick((v) => v + 1), 5200);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, []);

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
          <Metric key={s.label} {...s} />
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
            <p className="mt-1.5 min-h-8 text-[11px] leading-relaxed text-muted-foreground" aria-live="polite">
              {insights[insight]}
            </p>
            <button className="mt-2 w-full rounded-lg bg-gradient-brand px-2 py-1.5 text-[11px] font-medium text-primary-foreground">
              Create re-engagement campaign
            </button>
          </div>
          <div className="rounded-xl border border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Zap className="h-3.5 w-3.5 text-brand-cyan" aria-hidden /> Automation activity
            </p>
            <ul className="mt-1.5 space-y-1" aria-live="polite">
              {[0, 1, 2].map((offset) => {
                const item = activity[(tick + offset) % activity.length]!;
                const Icon = item.icon;
                return (
                  <li key={item.text} className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3 shrink-0" aria-hidden /> {item.text}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}