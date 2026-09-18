import { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ShieldCheck,
  Zap,
  DollarSign,
  HeartHandshake,
  Briefcase,
  Megaphone,
  Sliders,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type AutopilotRecord, type LiveActivityItem } from "@/lib/autopilot.functions";

interface RadarDimension {
  subject: string;
  score: number;
  fullMark: 100;
}

type SignalSeverity = "critical" | "warning" | "healthy" | "opportunity";

interface PredictiveSignal {
  id: string;
  dimension: string;
  title: string;
  description: string;
  severity: SignalSeverity;
  trend: "up" | "down" | "stable";
  value?: string;
}

interface PredictiveRadarProps {
  orgId: string;
  autopilots: AutopilotRecord[];
  liveActivity: LiveActivityItem[];
  attentionItems?: {
    urgentTasks?: any[];
    overdueInvoices?: any[];
    unassignedLeads?: any[];
  };
  kpis?: {
    activeAutopilots: number;
    totalAutopilots: number;
    workCreatedToday: number;
    workCompletedToday: number;
    totalPendingWork: number;
    totalAutomatedActions: number;
    attentionCount: number;
  };
  businessStats?: {
    customers: number;
    leads: number;
    teamMembers: number;
    workGroups: number;
    customerGroups: number;
    invoices: number;
  };
  className?: string;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

const SEVERITY_CONFIG: Record<
  SignalSeverity,
  { label: string; color: string; bg: string; border: string; icon: React.ComponentType<any> }
> = {
  critical: { label: "Critical", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: AlertTriangle },
  warning: { label: "Warning", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: AlertTriangle },
  healthy: { label: "Healthy", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: ShieldCheck },
  opportunity: { label: "Opportunity", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", icon: Zap },
};

const DIMENSION_ICONS: Record<string, React.ComponentType<any>> = {
  Sales: TrendingUp,
  Finance: DollarSign,
  "Customer Success": HeartHandshake,
  Operations: Briefcase,
  Management: Sliders,
  Marketing: Megaphone,
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { subject, score } = payload[0]?.payload ?? {};
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f0f1a]/90 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-xs font-semibold text-white/90">{subject}</p>
      <p className="text-lg font-bold" style={{ color: `hsl(${score * 1.2}, 70%, 60%)` }}>
        {score}<span className="ml-0.5 text-xs font-normal text-white/40">/100</span>
      </p>
    </div>
  );
}

export function PredictiveRadar({ autopilots, liveActivity, attentionItems, kpis, businessStats, className }: PredictiveRadarProps) {
  const { urgentTasks = [], overdueInvoices = [], unassignedLeads = [] } = attentionItems ?? {};
  const activeAps = kpis?.activeAutopilots ?? 0;
  const totalAps = kpis?.totalAutopilots ?? 0;
  const automatedActions = kpis?.totalAutomatedActions ?? 0;
  const pendingWork = kpis?.totalPendingWork ?? 0;
  const completedToday = kpis?.workCompletedToday ?? 0;
  const createdToday = kpis?.workCreatedToday ?? 0;
  const totalCustomers = businessStats?.customers ?? 0;
  const totalLeads = businessStats?.leads ?? 0;

  const recentExecutions = liveActivity.slice(0, 20);
  const execSuccessRate = recentExecutions.length > 0
    ? recentExecutions.filter((e) => e.status === "success").length / recentExecutions.length
    : 0.75;

  const apByCategory = useMemo(() => {
    const map: Record<string, { total: number; active: number }> = {};
    for (const ap of autopilots) {
      const cat = ap.category ?? "custom";
      if (!map[cat]) map[cat] = { total: 0, active: 0 };
      map[cat].total++;
      if (ap.active) map[cat].active++;
    }
    return map;
  }, [autopilots]);

  const salesAps = apByCategory["sales"] ?? { total: 0, active: 0 };
  const salesScore = clamp(Math.round(70 - Math.min(unassignedLeads.length * 8, 40) + salesAps.active * 6 + (totalLeads > 0 ? 10 : 0)));

  const financeAps = apByCategory["finance"] ?? { total: 0, active: 0 };
  const financeScore = clamp(Math.round(80 - Math.min(overdueInvoices.length * 10, 50) + financeAps.active * 5));

  const csAps = apByCategory["customer_success"] ?? { total: 0, active: 0 };
  const csScore = clamp(Math.round(65 + csAps.active * 8 + (totalCustomers > 5 ? 15 : 0)));

  const opsAps = apByCategory["operations"] ?? { total: 0, active: 0 };
  const completionRate = createdToday > 0 ? Math.min(completedToday / createdToday, 1) : 0.6;
  const opsScore = clamp(Math.round(50 + completionRate * 30 + opsAps.active * 5 - Math.min(urgentTasks.length * 4, 20) - Math.min(pendingWork * 0.1, 10)));

  const mgmtAps = apByCategory["management"] ?? { total: 0, active: 0 };
  const automationCoverage = totalAps > 0 ? activeAps / totalAps : 0;
  const mgmtScore = clamp(Math.round(40 + automationCoverage * 30 + execSuccessRate * 20 + mgmtAps.active * 5 + Math.min(automatedActions * 0.5, 10)));

  const mktAps = apByCategory["marketing"] ?? { total: 0, active: 0 };
  const mktScore = clamp(Math.round(60 + mktAps.active * 10 + (totalLeads > 10 ? 10 : 0)));

  const radarData: RadarDimension[] = [
    { subject: "Sales", score: salesScore, fullMark: 100 },
    { subject: "Finance", score: financeScore, fullMark: 100 },
    { subject: "Customer Success", score: csScore, fullMark: 100 },
    { subject: "Operations", score: opsScore, fullMark: 100 },
    { subject: "Management", score: mgmtScore, fullMark: 100 },
    { subject: "Marketing", score: mktScore, fullMark: 100 },
  ];

  const overallScore = Math.round(radarData.reduce((s, d) => s + d.score, 0) / radarData.length);

  const signals: PredictiveSignal[] = useMemo(() => {
    const list: PredictiveSignal[] = [];

    if (unassignedLeads.length > 0) {
      list.push({ id: "sig_leads", dimension: "Sales", title: `${unassignedLeads.length} unassigned lead${unassignedLeads.length > 1 ? "s" : ""} detected`, description: "Leads without owners lose conversion probability by ~40% after 2 hours.", severity: unassignedLeads.length > 3 ? "critical" : "warning", trend: "down", value: `${unassignedLeads.length} leads` });
    }
    if (overdueInvoices.length > 0) {
      list.push({ id: "sig_invoices", dimension: "Finance", title: `${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? "s" : ""}`, description: "Outstanding receivables risk increasing — automated follow-up recommended.", severity: overdueInvoices.length > 2 ? "critical" : "warning", trend: "down", value: `${overdueInvoices.length} invoices` });
    }
    if (urgentTasks.length > 0) {
      list.push({ id: "sig_urgent", dimension: "Operations", title: `${urgentTasks.length} urgent task${urgentTasks.length > 1 ? "s" : ""} pending`, description: "High-priority work items are awaiting team action.", severity: "warning", trend: "stable", value: `${urgentTasks.length} tasks` });
    }
    if (execSuccessRate < 0.7 && recentExecutions.length > 3) {
      list.push({ id: "sig_exec_rate", dimension: "Management", title: "Autopilot execution success rate below threshold", description: `${Math.round(execSuccessRate * 100)}% success rate detected. Review autopilot configurations.`, severity: "warning", trend: "down" });
    }
    if (activeAps === 0 && totalAps === 0) {
      list.push({ id: "sig_no_ap", dimension: "Management", title: "No autopilots configured yet", description: "Activate your first autopilot to start automating business operations.", severity: "opportunity", trend: "stable" });
    } else if (activeAps > 0 && execSuccessRate >= 0.9) {
      list.push({ id: "sig_ap_healthy", dimension: "Management", title: `${activeAps} autopilot${activeAps > 1 ? "s" : ""} running at peak performance`, description: `${Math.round(execSuccessRate * 100)}% execution success · ${automatedActions} total automated actions`, severity: "healthy", trend: "up", value: `${Math.round(execSuccessRate * 100)}%` });
    }
    if (salesScore >= 80) {
      list.push({ id: "sig_sales_strong", dimension: "Sales", title: "Sales pipeline operating efficiently", description: "Lead routing and assignment automation is healthy.", severity: "healthy", trend: "up" });
    }
    if (csScore >= 80) {
      list.push({ id: "sig_cs_strong", dimension: "Customer Success", title: "Customer retention signals are positive", description: "Customer success automation is covering key accounts.", severity: "healthy", trend: "up" });
    }
    if (list.length < 2) {
      list.push({ id: "sig_growth", dimension: "Marketing", title: "Untapped growth automation potential", description: "Configure marketing autopilots to proactively nurture your lead pipeline.", severity: "opportunity", trend: "up" });
    }
    return list.slice(0, 5);
  }, [unassignedLeads, overdueInvoices, urgentTasks, execSuccessRate, recentExecutions.length, activeAps, totalAps, automatedActions, salesScore, csScore]);

  const radarFill = overallScore >= 75 ? "#6366f1" : overallScore >= 50 ? "#f59e0b" : "#ef4444";
  const radarStroke = overallScore >= 75 ? "#818cf8" : overallScore >= 50 ? "#fbbf24" : "#f87171";
  const scoreLabel = overallScore >= 80 ? "Excellent" : overallScore >= 65 ? "Good" : overallScore >= 45 ? "Needs Attention" : "At Risk";
  const scoreLabelColor = overallScore >= 80 ? "text-emerald-400" : overallScore >= 65 ? "text-violet-400" : overallScore >= 45 ? "text-amber-400" : "text-red-400";

  return (
    <div className={`flex flex-col gap-4 ${className ?? ""}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
          <Activity className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Predictive Business Radar</h3>
          <p className="text-xs text-white/40">AI-computed health scores across all departments</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs font-semibold ${scoreLabelColor}`}>{scoreLabel}</span>
          <Badge variant="outline" className="border-white/10 bg-white/5 text-xs text-white/60">
            Score: {overallScore}/100
          </Badge>
        </div>
      </div>

      {/* Chart + Signals */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Radar Chart */}
        <div className="relative flex flex-col items-center rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <span className="text-3xl font-black tabular-nums" style={{ color: radarStroke, textShadow: `0 0 20px ${radarFill}66` }}>
              {overallScore}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-white/30">Overall</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" gridType="polygon" />
              <PolarAngleAxis
                dataKey="subject"
                tick={({ x, y, payload }: any) => (
                  <text x={x} y={y} dy={4} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize={10} fontWeight={500}>
                    {payload.value}
                  </text>
                )}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }} tickCount={4} stroke="transparent" />
              <Tooltip content={<CustomTooltip />} />
              <Radar name="Business Health" dataKey="score" stroke={radarStroke} fill={radarFill} fillOpacity={0.18} strokeWidth={2} dot={{ r: 3, fill: radarStroke, strokeWidth: 0 }} activeDot={{ r: 5, fill: radarStroke, strokeWidth: 0 }} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-1 grid w-full grid-cols-3 gap-x-4 gap-y-1 px-2">
            {radarData.map((d) => {
              const barColor = d.score >= 75 ? "#6366f1" : d.score >= 50 ? "#f59e0b" : "#ef4444";
              return (
                <div key={d.subject} className="flex items-center gap-1.5">
                  <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{ width: `${d.score}%`, background: barColor }} />
                  </div>
                  <span className="w-6 text-right text-[10px] text-white/40">{d.score}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Signals */}
        <div className="flex flex-col gap-2">
          <p className="px-1 text-xs font-medium uppercase tracking-wider text-white/40">Predictive Signals</p>
          <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1">
            {signals.map((signal) => {
              const cfg = SEVERITY_CONFIG[signal.severity];
              const Icon = cfg.icon;
              const TrendIcon = signal.trend === "up" ? TrendingUp : signal.trend === "down" ? TrendingDown : Minus;
              const trendColor = signal.trend === "up" ? "text-emerald-400" : signal.trend === "down" ? "text-red-400" : "text-white/30";
              const DimIcon = DIMENSION_ICONS[signal.dimension] ?? Activity;
              return (
                <div key={signal.id} className={`flex gap-3 rounded-xl border p-3 transition-all ${cfg.bg} ${cfg.border}`}>
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${cfg.bg} ${cfg.border}`}>
                    <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${cfg.color}`}>{signal.dimension}</span>
                      <DimIcon className="h-2.5 w-2.5 text-white/20" />
                      <Badge variant="outline" className={`ml-auto h-4 border px-1.5 text-[9px] ${cfg.border} ${cfg.color} bg-transparent`}>{cfg.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold leading-snug text-white/85">{signal.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-white/40">{signal.description}</p>
                    {signal.value && (
                      <div className={`mt-1 flex items-center gap-1 text-[10px] ${trendColor}`}>
                        <TrendIcon className="h-3 w-3" />
                        <span>{signal.value}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Score pills */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {radarData.map((d) => {
          const IconComp = DIMENSION_ICONS[d.subject] ?? Activity;
          const color = d.score >= 75
            ? { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
            : d.score >= 50
              ? { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" }
              : { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" };
          return (
            <div key={d.subject} className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 ${color.bg} ${color.border}`}>
              <IconComp className={`h-4 w-4 ${color.text}`} />
              <span className={`text-base font-black tabular-nums ${color.text}`}>{d.score}</span>
              <span className="text-center text-[9px] leading-tight text-white/35">{d.subject}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
