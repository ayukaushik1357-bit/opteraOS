import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  TrendingUp,
  HeartHandshake,
  DollarSign,
  Briefcase,
  Megaphone,
  Sliders,
  Sparkles,
  Zap,
  Check,
  Plus,
  Play,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listAutopilots,
  saveAutopilot,
  type AutopilotRecord,
} from "@/lib/autopilot.functions";
import { listWorkGroups } from "@/lib/workgroups.functions";
import { listCustomerGroups } from "@/lib/customergroups.functions";

interface DiscoveryProps {
  orgId: string;
  onNavigateCommandCenter: () => void;
}

interface CapabilityItem {
  id: string;
  category: "sales" | "customer_success" | "finance" | "management" | "marketing" | "operations";
  title: string;
  outcome: string;
  description: string;
  triggerType: string;
  schedule: string;
  assignmentStrategy: "round_robin" | "lowest_workload" | "skill_based" | "ai_assignment" | "direct";
  actions: Array<{ step: number; title: string; description: string }>;
  suggestedWorkGroup?: string;
  suggestedCustomerGroup?: string;
}

const CAPABILITIES: CapabilityItem[] = [
  // ── SALES ──────────────────────────────────────────────────────────────
  {
    id: "cap_sales_lead_routing",
    category: "sales",
    title: "AI Lead Routing & Scoring",
    outcome: "Instantly qualify and route new leads to sales reps based on workload and deal size.",
    description: "Evaluates company fit, scores intent, and assigns follow-up work via Round Robin.",
    triggerType: "new_lead",
    schedule: "Triggered instantly on lead creation",
    assignmentStrategy: "round_robin",
    actions: [
      { step: 1, title: "Qualify Inbound Lead", description: "AI checks company data, email domain, and deal estimate" },
      { step: 2, title: "Route to Sales Work Group", description: "Select available sales representative with optimal capacity" },
      { step: 3, title: "Create Call Task", description: "Generate scheduled follow-up work item with talking points" },
    ],
  },
  {
    id: "cap_sales_pipeline_velocity",
    category: "sales",
    title: "Pipeline Follow-up Autopilot",
    outcome: "Prevent stalled deals by flagging opportunities inactive for >5 business days.",
    description: "Monitors deal stages and automatically creates gentle re-engagement tasks for account owners.",
    triggerType: "deal_stage_change",
    schedule: "Daily scan at 9:00 AM",
    assignmentStrategy: "lowest_workload",
    actions: [
      { step: 1, title: "Scan Active Pipeline", description: "Filter deals in proposal/negotiation with no activity in 5 days" },
      { step: 2, title: "Create Re-engagement Work", description: "Assign outreach task with context notes" },
    ],
  },
  {
    id: "cap_sales_high_value_alert",
    category: "sales",
    title: "High-Value Opportunity Guardian",
    outcome: "Notify leadership and assign senior executive sponsor on enterprise deals.",
    description: "Automatically tags enterprise tier customers and assigns dedicated senior closing support.",
    triggerType: "new_lead",
    schedule: "Triggered on high-value lead detection",
    assignmentStrategy: "skill_based",
    actions: [
      { step: 1, title: "Detect Enterprise Tier", description: "Check if deal value exceeds threshold" },
      { step: 2, title: "Assign Senior Specialist", description: "Route directly to Enterprise Sales Work Group" },
      { step: 3, title: "Escalate to Leadership", description: "Deliver VIP summary to sales leadership" },
    ],
  },

  // ── CUSTOMER SUCCESS ───────────────────────────────────────────────────
  {
    id: "cap_cs_at_risk_retention",
    category: "customer_success",
    title: "At-Risk Account Retention",
    outcome: "Identify disengaged customers before they churn and trigger proactive outreach.",
    description: "Monitors customer activity, adds to At-Risk Customer Group, and assigns CS specialist.",
    triggerType: "at_risk_customer",
    schedule: "Weekly on Monday at 8:00 AM",
    assignmentStrategy: "skill_based",
    actions: [
      { step: 1, title: "Audit Customer Activity", description: "Identify accounts with zero touchpoints in 14 days" },
      { step: 2, title: "Segment to At-Risk Group", description: "Auto-tag customer profile in CRM" },
      { step: 3, title: "Assign CS Account Manager", description: "Create retention strategy work item" },
    ],
  },
  {
    id: "cap_cs_vip_onboarding",
    category: "customer_success",
    title: "VIP Customer White-Glove Onboarding",
    outcome: "Deliver tailored onboarding sequences for newly closed enterprise accounts.",
    description: "Creates welcome milestones, checks progress, and assigns onboarding manager.",
    triggerType: "new_customer",
    schedule: "Triggered when customer marked Active",
    assignmentStrategy: "round_robin",
    actions: [
      { step: 1, title: "Generate Onboarding Roadmap", description: "AI synthesizes account goals from closed deal notes" },
      { step: 2, title: "Assign Onboarding Lead", description: "Route to Customer Success team" },
    ],
  },

  // ── FINANCE ────────────────────────────────────────────────────────────
  {
    id: "cap_fin_invoice_guardian",
    category: "finance",
    title: "Invoice Guardian & Payment Chaser",
    outcome: "Automate courteous overdue reminders and assign collection tasks to finance.",
    description: "Detects invoices past due_date, creates email follow-ups, and auto-settles on payment.",
    triggerType: "overdue_invoice",
    schedule: "Daily audit at 8:30 AM",
    assignmentStrategy: "lowest_workload",
    actions: [
      { step: 1, title: "Filter Overdue Invoices", description: "Find unpaid invoices past due date" },
      { step: 2, title: "Draft Payment Notice", description: "AI generates personalized payment link notice" },
      { step: 3, title: "Assign Collection Follow-up", description: "Route escalation task to Finance Work Group" },
    ],
  },
  {
    id: "cap_fin_weekly_cashflow",
    category: "finance",
    title: "Weekly Cash Flow & Revenue Brief",
    outcome: "Summarize settled vs outstanding revenue every Friday afternoon.",
    description: "Calculates weekly collections, outstanding receivables, and payout forecasts.",
    triggerType: "schedule_cron",
    schedule: "Every Friday at 4:00 PM",
    assignmentStrategy: "direct",
    actions: [
      { step: 1, title: "Calculate Weekly Settlements", description: "Aggregate received invoice payments" },
      { step: 2, title: "Forecast Outstanding Receivables", description: "Highlight overdue vs coming due balances" },
      { step: 3, title: "Deliver Summary Brief", description: "Send briefing to organization owners" },
    ],
  },

  // ── MANAGEMENT ─────────────────────────────────────────────────────────
  {
    id: "cap_mgmt_daily_briefing",
    category: "management",
    title: "Daily Executive Intelligence Briefing",
    outcome: "A comprehensive business overview delivered every morning with zero manual work.",
    description: "Synthesizes sales, collections, new signups, and bottlenecks from real database records.",
    triggerType: "schedule_cron",
    schedule: "Every weekday at 9:00 AM",
    assignmentStrategy: "direct",
    actions: [
      { step: 1, title: "Compile Cross-Company Metrics", description: "Query revenue, leads, deals, and tasks" },
      { step: 2, title: "Detect Bottlenecks & Surges", description: "AI analyzes 7-day velocity vs historical trends" },
      { step: 3, title: "Publish Executive Briefing", description: "Deliver directly to leadership team" },
    ],
  },
  {
    id: "cap_mgmt_bottleneck_escalation",
    category: "management",
    title: "Operational Bottleneck Escalation",
    outcome: "Automatically escalate tasks blocked or overdue for >48 hours to team leads.",
    description: "Audits team workloads and notifies leaders before deadlines are missed.",
    triggerType: "task_escalation",
    schedule: "Every 6 hours",
    assignmentStrategy: "direct",
    actions: [
      { step: 1, title: "Scan Overdue Tasks", description: "Filter incomplete tasks past due date" },
      { step: 2, title: "Trigger Manager Escalation", description: "Notify team lead and reallocate work if overloaded" },
    ],
  },

  // ── OPERATIONS & MARKETING ─────────────────────────────────────────────
  {
    id: "cap_ops_task_auto_distribute",
    category: "operations",
    title: "Smart Workload Load Balancer",
    outcome: "Evenly distribute incoming work items across available employees.",
    description: "Uses real-time active task counts to assign work to the member with lowest workload.",
    triggerType: "custom_event",
    schedule: "Triggered on any incoming unassigned task",
    assignmentStrategy: "lowest_workload",
    actions: [
      { step: 1, title: "Query Active Member Capacities", description: "Calculate real-time workload percentage" },
      { step: 2, title: "Assign to Lowest Workload Member", description: "Route work without overloading employees" },
    ],
  },
];

const CATEGORIES = [
  { key: "all", label: "All Capabilities", icon: Sparkles },
  { key: "sales", label: "Sales & Pipeline", icon: TrendingUp },
  { key: "customer_success", label: "Customer Success", icon: HeartHandshake },
  { key: "finance", label: "Finance & Invoices", icon: DollarSign },
  { key: "management", label: "Executive & Mgmt", icon: Briefcase },
  { key: "operations", label: "Operations & Work", icon: Sliders },
];

export function AutopilotDiscovery({ orgId, onNavigateCommandCenter }: DiscoveryProps) {
  const queryClient = useQueryClient();
  const save = useServerFn(saveAutopilot);
  const fetchAutopilots = useServerFn(listAutopilots);
  const fetchWorkGroups = useServerFn(listWorkGroups);
  const fetchCustomerGroups = useServerFn(listCustomerGroups);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCapability, setSelectedCapability] = useState<CapabilityItem | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  const { data: existingAutopilots = [] } = useQuery({
    queryKey: ["autopilots", orgId],
    queryFn: () => fetchAutopilots({ data: { orgId } }),
    enabled: !!orgId,
  });

  const { data: workGroups = [] } = useQuery({
    queryKey: ["work_groups", orgId],
    queryFn: () => fetchWorkGroups({ data: { orgId } }),
    enabled: !!orgId,
  });

  const { data: customerGroups = [] } = useQuery({
    queryKey: ["customer_groups", orgId],
    queryFn: () => fetchCustomerGroups({ data: { orgId } }),
    enabled: !!orgId,
  });

  const activeTitles = new Set(existingAutopilots.map((a) => a.name));

  const activateMutation = useMutation({
    mutationFn: async (cap: CapabilityItem) => {
      // Find matching work group if available
      const matchingWg = workGroups.find(
        (w) => w.name.toLowerCase().includes(cap.category) || (cap.category === "sales" && w.name.toLowerCase().includes("sales")),
      );
      const matchingCg = customerGroups[0] ?? null;

      return save({
        data: {
          orgId,
          name: cap.title,
          description: cap.outcome,
          category: cap.category,
          active: true,
          triggerType: cap.triggerType,
          schedule: cap.schedule,
          humanSummary: cap.description,
          goalPrompt: cap.outcome,
          targetWorkGroupId: matchingWg?.id,
          customerGroupId: matchingCg?.id,
          assignmentStrategy: cap.assignmentStrategy,
          actions: cap.actions,
        },
      });
    },
    onSuccess: () => {
      toast.success("Autopilot activated successfully!");
      setConfigModalOpen(false);
      setSelectedCapability(null);
      queryClient.invalidateQueries({ queryKey: ["autopilots", orgId] });
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to activate capability"),
  });

  const filteredCapabilities =
    selectedCategory === "all"
      ? CAPABILITIES
      : CAPABILITIES.filter((c) => c.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* ── Category Filter Tabs ────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/40 shadow-sm shadow-indigo-500/10"
                  : "border border-[#E2E8F0] bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-indigo-400" : ""}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Capability Cards Grid ───────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCapabilities.map((cap) => {
          const isAlreadyActive = activeTitles.has(cap.title);

          return (
            <div
              key={cap.id}
              className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-card p-5 shadow-sm transition-all hover:border-indigo-500/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="border-[#E2E8F0] font-mono uppercase text-[10px]">
                    {cap.category.replace("_", " ")}
                  </Badge>
                  {isAlreadyActive && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <Check className="h-3 w-3" /> Active
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-base font-semibold text-foreground">{cap.title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{cap.outcome}</p>

                <div className="mt-4 space-y-1.5 rounded-xl border border-[#E2E8F0] bg-secondary/30 p-3 text-[11px]">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    What opteraOS Does:
                  </div>
                  <ul className="space-y-1 text-[#374151]">
                    {cap.actions.map((act) => (
                      <li key={act.step} className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                        <span>{act.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#E2E8F0] pt-4">
                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">
                  {cap.schedule}
                </span>

                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedCapability(cap);
                    setConfigModalOpen(true);
                  }}
                  className={`text-xs gap-1.5 ${
                    isAlreadyActive
                      ? "bg-secondary text-foreground hover:bg-secondary/80 border border-[#E2E8F0]"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                  }`}
                >
                  {isAlreadyActive ? (
                    <span>Configure</span>
                  ) : (
                    <>
                      <Zap className="h-3 w-3" />
                      <span>Enable</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Capability Review & Enable Modal ────────────────────────────── */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="max-w-md border-[#E2E8F0] bg-white text-[#111827] shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-400">
              <Zap className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-white">
                Enable {selectedCapability?.title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B7280]">
              Review and connect this autonomous capability to your organization.
            </DialogDescription>
          </DialogHeader>

          {selectedCapability && (
            <div className="space-y-3 py-2 text-xs">
              <p className="text-[#374151]">{selectedCapability.outcome}</p>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#6B7280]">Trigger Mode:</span>
                  <span className="font-medium text-indigo-300">{selectedCapability.triggerType}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#6B7280]">Schedule:</span>
                  <span className="font-medium text-[#1F2937]">{selectedCapability.schedule}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#6B7280]">Routing Strategy:</span>
                  <span className="font-medium text-emerald-400">{selectedCapability.assignmentStrategy}</span>
                </div>
              </div>

              <div>
                <h5 className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
                  Execution Actions:
                </h5>
                <div className="space-y-1.5">
                  {selectedCapability.actions.map((a) => (
                    <div key={a.step} className="rounded-lg bg-[#F8FAFC] p-2 text-xs border border-[#E2E8F0]">
                      <span className="font-medium text-white">{a.step}. {a.title}</span>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">{a.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigModalOpen(false)}
              className="text-xs border-white/20 bg-[#F8FAFC] text-[#1F2937] hover:bg-white/[0.1] hover:text-white font-medium shadow-sm"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={activateMutation.isPending}
              onClick={() => selectedCapability && activateMutation.mutate(selectedCapability)}
              className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-xs font-semibold text-white shadow-md hover:opacity-95"
            >
              {activateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              <span>Activate Capability</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
