import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sparkles,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Users,
  ShieldAlert,
  Send,
  Loader2,
  FileText,
  UserCheck,
  Building2,
  Briefcase,
  Play,
  RotateCcw,
  BarChart3,
  User,
  Sliders,
  Check,
  Layers,
  ChevronRight,
  Info,
  Plus,
  Link2,
  Search,
  Copy,
  Mail,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAutopilotDashboard,
  planAutopilotFromPrompt,
  saveAutopilot,
  triggerAutopilotExecution,
  listAutopilots,
  toggleAutopilot,
  deleteAutopilot,
  listFilteredWork,
  type AutopilotPlanResult,
  type AutopilotRecord,
} from "@/lib/autopilot.functions";
import { listWorkGroups, saveWorkGroup } from "@/lib/workgroups.functions";
import { listCustomerGroups, saveCustomerGroup } from "@/lib/customergroups.functions";
import { getTeam, inviteTeammate, generateInviteLink } from "@/lib/workspace.functions";
import { formatDistanceToNow } from "date-fns";
import {
  AutopilotMetricDetailModal,
  type MetricType,
} from "./AutopilotMetricDetailModal";
import { type WorkFilterType } from "./AutopilotSidebar";
import { type CapabilityDefinition } from "@/lib/capabilities.config";

interface CommandCenterProps {
  orgId: string;
  currency: string;
  onNavigateTab: (tab: string) => void;
  onOpenDailyReport: () => void;
  activeWorkFilter?: WorkFilterType;
  onSelectWorkFilter?: (filter: WorkFilterType) => void;
  onOpenCapabilityModal?: (capability: CapabilityDefinition) => void;
}

const SUGGESTED_PROMPTS = [
  "Send me a sales report every morning at 9 AM.",
  "Follow up with leads who haven't been contacted in 2 days.",
  "Assign all new Enterprise leads to the Sales Team via Round Robin.",
  "Detect overdue invoices and create follow-up tasks for the Finance group.",
  "Find at-risk customers with zero activity and assign retention outreach.",
];

type AssignmentType = "individual" | "work_group" | "multiple_members" | "ai_assignment";
type AssignmentStrategy = "round_robin" | "lowest_workload" | "skill_based" | "performance_based" | "ai_assignment" | "direct";

const STRATEGY_DESCRIPTIONS: Record<AssignmentStrategy, string> = {
  round_robin: "New work will be distributed evenly across eligible members in rotation.",
  lowest_workload: "Assigns new work to the eligible member with the lowest active workload.",
  skill_based: "Matches work requirements against member roles and specialist skills.",
  performance_based: "Prioritizes team members with the highest conversion and completion rate.",
  ai_assignment: "opteraOS evaluates real-time team availability, roles, and load balance.",
  direct: "Assigns work directly to the selected individual team member.",
};

export function AutopilotCommandCenter({
  orgId,
  currency,
  onNavigateTab,
  onOpenDailyReport,
  activeWorkFilter = "all_work",
  onSelectWorkFilter,
  onOpenCapabilityModal,
}: CommandCenterProps) {
  const queryClient = useQueryClient();
  const fetchDashboard = useServerFn(getAutopilotDashboard);
  const planPrompt = useServerFn(planAutopilotFromPrompt);
  const save = useServerFn(saveAutopilot);
  const triggerExec = useServerFn(triggerAutopilotExecution);
  const fetchAutopilots = useServerFn(listAutopilots);
  const toggleAp = useServerFn(toggleAutopilot);
  const removeAp = useServerFn(deleteAutopilot);
  const fetchFilteredWork = useServerFn(listFilteredWork);
  const fetchWorkGroups = useServerFn(listWorkGroups);
  const createWorkGroupFn = useServerFn(saveWorkGroup);
  const fetchCustomerGroups = useServerFn(listCustomerGroups);
  const createCustGroupFn = useServerFn(saveCustomerGroup);
  const fetchTeam = useServerFn(getTeam);
  const sendInviteFn = useServerFn(inviteTeammate);
  const createInviteLinkFn = useServerFn(generateInviteLink);

  const [promptText, setPromptText] = useState("");
  const [activePlan, setActivePlan] = useState<AutopilotPlanResult | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<"blueprint" | "assignment" | "review">("blueprint");
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);

  // Assignment configuration state
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("work_group");
  const [selectedIndividualId, setSelectedIndividualId] = useState<string>("");
  const [selectedWorkGroupId, setSelectedWorkGroupId] = useState<string>("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedCustomerGroupId, setSelectedCustomerGroupId] = useState<string>("");
  const [selectedStrategy, setSelectedStrategy] = useState<AssignmentStrategy>("round_robin");

  // Inline Work Group Creation Modal State
  const [createWorkGroupModalOpen, setCreateWorkGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#8B5CF6");
  const [newGroupMemberSearch, setNewGroupMemberSearch] = useState("");
  const [newGroupSelectedMembers, setNewGroupSelectedMembers] = useState<string[]>([]);

  // Inline Customer Group Creation Modal State
  const [createCustGroupModalOpen, setCreateCustGroupModalOpen] = useState(false);
  const [newCustGroupName, setNewCustGroupName] = useState("");
  const [newCustGroupDescription, setNewCustGroupDescription] = useState("");
  const [newCustGroupStatusCriteria, setNewCustGroupStatusCriteria] = useState("all");

  // Inline Invite Members Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["autopilot_dashboard", orgId],
    queryFn: () => fetchDashboard({ data: { orgId } }),
    enabled: !!orgId,
    refetchInterval: 30000,
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

  const { data: teamData } = useQuery({
    queryKey: ["team", orgId],
    queryFn: () => fetchTeam({ data: { orgId } }),
    enabled: !!orgId,
  });

  const allMembers = teamData?.members ?? [];

  const planMutation = useMutation({
    mutationFn: (text: string) => planPrompt({ data: { orgId, prompt: text } }),
    onSuccess: (plan) => {
      setActivePlan(plan);
      setModalStep("blueprint");
      if (plan.category === "management") {
        setAssignmentType("individual");
        setSelectedIndividualId(allMembers[0]?.user_id || "");
        setSelectedStrategy("direct");
      } else {
        setAssignmentType("work_group");
        const matchingWg = workGroups.find(
          (w) => w.name.toLowerCase().includes(plan.category) || (plan.category === "sales" && w.name.toLowerCase().includes("sales")),
        );
        setSelectedWorkGroupId(matchingWg?.id || workGroups[0]?.id || "");
        setSelectedStrategy((plan.assignmentStrategy as AssignmentStrategy) || "round_robin");
      }
      setPlanModalOpen(true);
      setPromptText("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate automation plan");
    },
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!activePlan) throw new Error("No active plan");

      return save({
        data: {
          orgId,
          name: activePlan.title,
          description: activePlan.description,
          category: activePlan.category,
          active: true,
          triggerType: activePlan.triggerType,
          schedule: activePlan.schedule,
          humanSummary: activePlan.humanSummary,
          goalPrompt: activePlan.description,
          assignmentType,
          assignmentStrategy: assignmentType === "individual" ? "direct" : selectedStrategy,
          targetUserId: assignmentType === "individual" ? selectedIndividualId : undefined,
          targetWorkGroupId: assignmentType === "work_group" ? selectedWorkGroupId : undefined,
          targetMemberIds: assignmentType === "multiple_members" ? selectedMemberIds : [],
          customerGroupId: selectedCustomerGroupId && selectedCustomerGroupId !== "none" ? selectedCustomerGroupId : undefined,
          actions: activePlan.actions,
        },
      });
    },
    onSuccess: () => {
      toast.success("Autopilot activated successfully! 🟢");
      setPlanModalOpen(false);
      setActivePlan(null);
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
      queryClient.invalidateQueries({ queryKey: ["autopilots", orgId] });
      queryClient.invalidateQueries({ queryKey: ["workflows", orgId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Autopilot could not be activated");
    },
  });

  const { data: autopilotsList = [], refetch: refetchAutopilots } = useQuery({
    queryKey: ["autopilots", orgId],
    queryFn: () => fetchAutopilots({ data: { orgId } }),
    enabled: !!orgId,
  });

  const { data: filteredWorkData, isLoading: loadingFilteredWork } = useQuery({
    queryKey: ["filtered_work", orgId, activeWorkFilter],
    queryFn: () => fetchFilteredWork({ data: { orgId, filter: activeWorkFilter } }),
    enabled: !!orgId && activeWorkFilter !== "all_work",
  });

  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [autopilotToDelete, setAutopilotToDelete] = useState<AutopilotRecord | null>(null);
  const [executingApId, setExecutingApId] = useState<string | null>(null);

  const toggleApMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      toggleAp({ data: { id, orgId, active } }),
    onSuccess: (res) => {
      toast.success(`${res.name || "Autopilot"} is now ${res.active ? "ACTIVE 🟢" : "PAUSED 🟡"}`);
      queryClient.invalidateQueries({ queryKey: ["autopilots", orgId] });
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
      queryClient.invalidateQueries({ queryKey: ["filtered_work", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runApMutation = useMutation({
    mutationFn: async (ap: AutopilotRecord) => {
      setExecutingApId(ap.id);
      return await triggerExec({
        data: {
          orgId,
          autopilotId: ap.id,
          triggerEvent: "manual_command_run",
          payload: {},
        },
      });
    },
    onSuccess: (res: any) => {
      toast.success(`Autopilot ran successfully in ${res.durationMs}ms · Dispatched to ${res.assignedTo}`);
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
      queryClient.invalidateQueries({ queryKey: ["autopilots", orgId] });
      queryClient.invalidateQueries({ queryKey: ["workflow_executions", orgId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", orgId] });
      setExecutingApId(null);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setExecutingApId(null);
    },
  });

  const deleteApMutation = useMutation({
    mutationFn: (id: string) => removeAp({ data: { id, orgId } }),
    onSuccess: (res) => {
      toast.success(`Autopilot '${res.name}' deleted safely. Business history preserved.`);
      setDeleteConfirmModalOpen(false);
      setAutopilotToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["autopilots", orgId] });
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
      queryClient.invalidateQueries({ queryKey: ["filtered_work", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Create Work Group Mutation
  const createWorkGroupMutation = useMutation({
    mutationFn: () =>
      createWorkGroupFn({
        data: {
          orgId,
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || undefined,
          color: newGroupColor,
          memberUserIds: newGroupSelectedMembers,
          assignmentStrategy: "round_robin",
        },
      }),
    onSuccess: (created) => {
      toast.success(`Work Group '${created.name}' created!`);
      queryClient.invalidateQueries({ queryKey: ["work_groups", orgId] });
      setSelectedWorkGroupId(created.id);
      setAssignmentType("work_group");
      setCreateWorkGroupModalOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupSelectedMembers([]);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Create Customer Group Mutation
  const createCustGroupMutation = useMutation({
    mutationFn: () =>
      createCustGroupFn({
        data: {
          orgId,
          name: newCustGroupName.trim(),
          description: newCustGroupDescription.trim() || undefined,
          criteria: { status: newCustGroupStatusCriteria },
        },
      }),
    onSuccess: (created) => {
      toast.success(`Customer Group '${created.name}' created!`);
      queryClient.invalidateQueries({ queryKey: ["customer_groups", orgId] });
      setSelectedCustomerGroupId(created.id);
      setCreateCustGroupModalOpen(false);
      setNewCustGroupName("");
      setNewCustGroupDescription("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Send Email Invite Mutation
  const sendInviteMutation = useMutation({
    mutationFn: () =>
      sendInviteFn({
        data: {
          orgId,
          email: inviteEmail.trim(),
          role: inviteRole,
        },
      }),
    onSuccess: () => {
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["team", orgId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Generate Invite Link Mutation
  const generateLinkMutation = useMutation({
    mutationFn: () =>
      createInviteLinkFn({
        data: {
          orgId,
          role: inviteRole,
          expiresInDays: 14,
        },
      }),
    onSuccess: (link: any) => {
      const fullUrl = `${window.location.origin}/join?token=${link.token}`;
      setGeneratedLink(fullUrl);
      navigator.clipboard.writeText(fullUrl);
      toast.success("Invite link copied to clipboard!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  function handleSubmitPrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!promptText.trim() || planMutation.isPending) return;
    planMutation.mutate(promptText.trim());
  }

  function handleToggleMember(userId: string) {
    if (selectedMemberIds.includes(userId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== userId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, userId]);
    }
  }

  const kpis = data?.kpis;
  const stats = data?.businessStats;
  const attention = data?.attentionItems;
  const liveActivity = data?.liveActivity ?? [];
  const recommendations = data?.recommendations ?? [];

  const activeWorkGroup = workGroups.find((w) => w.id === selectedWorkGroupId);
  const activeIndividual = allMembers.find((m) => m.user_id === selectedIndividualId);
  const activeCustomerGroup = customerGroups.find((c) => c.id === selectedCustomerGroupId);

  // Filtered members for group creation modal
  const filteredCreationMembers = allMembers.filter(
    (m) =>
      (m.full_name || "").toLowerCase().includes(newGroupMemberSearch.toLowerCase()) ||
      (m.email || "").toLowerCase().includes(newGroupMemberSearch.toLowerCase()),
  );

  const isAssignmentValid =
    (assignmentType === "individual" && !!selectedIndividualId) ||
    (assignmentType === "work_group" && (!!selectedWorkGroupId || workGroups.length > 0)) ||
    (assignmentType === "multiple_members" && selectedMemberIds.length > 0) ||
    assignmentType === "ai_assignment";

  return (
    <div className="space-y-8">
      {/* ── 1. Hero AI Command Interface ────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 via-slate-950/80 to-[#070913] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span>Autonomous AI Command Center</span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-4xl">
            What should optera<span className="text-gradient">OS</span> do for you?
          </h1>
          <p className="mt-2 text-xs text-[#6B7280] sm:text-sm">
            Describe your business goal in plain language. opteraOS discovers required work, assigns it to the right teams, and autonomously executes.
          </p>

          <form onSubmit={handleSubmitPrompt} className="mt-6 flex items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-1.5 shadow-xl backdrop-blur-md focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20">
            <Input
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. Automatically qualify new leads and assign them to my sales team..."
              className="h-11 border-0 bg-transparent text-xs text-white placeholder:text-[#6B7280] focus-visible:ring-0 sm:text-sm"
              disabled={planMutation.isPending}
            />
            <Button
              type="submit"
              size="sm"
              className="h-10 shrink-0 gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 text-xs font-semibold text-white shadow-md hover:opacity-95"
              disabled={!promptText.trim() || planMutation.isPending}
            >
              {planMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Planning...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Run Autopilot</span>
                </>
              )}
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
            <span className="text-[#6B7280]">Quick suggestions:</span>
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPromptText(p);
                  planMutation.mutate(p);
                }}
                disabled={planMutation.isPending}
                className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[#374151] transition-colors hover:border-indigo-500/40 hover:bg-white/[0.07] hover:text-white"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. Real Business Connectivity Banner ────────────────────────── */}
      {stats && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-xs">
          <div className="flex items-center gap-2 text-[#374151] font-medium">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Business Capabilities Connected to Supabase DB:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#6B7280]">
            <span className="rounded-md bg-[#F8FAFC] px-2 py-1 border border-[#E2E8F0]">
              <strong className="text-white">{stats.customers}</strong> customers
            </span>
            <span className="rounded-md bg-[#F8FAFC] px-2 py-1 border border-[#E2E8F0]">
              <strong className="text-white">{stats.leads}</strong> leads
            </span>
            <span className="rounded-md bg-[#F8FAFC] px-2 py-1 border border-[#E2E8F0]">
              <strong className="text-white">{stats.teamMembers}</strong> team members
            </span>
            <span className="rounded-md bg-[#F8FAFC] px-2 py-1 border border-[#E2E8F0]">
              <strong className="text-white">{stats.workGroups}</strong> work groups
            </span>
            <span className="rounded-md bg-[#F8FAFC] px-2 py-1 border border-[#E2E8F0]">
              <strong className="text-white">{stats.customerGroups}</strong> customer groups
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDailyReport}
            className="h-7 text-[11px] gap-1.5 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 font-medium"
          >
            <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
            <span>Generate Executive Report</span>
          </Button>
        </div>
      )}

      {/* ── 3. Live Business Health & Interactive KPI Grid ────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <button
          type="button"
          onClick={() => setSelectedMetric("active_autopilots")}
          className="group glass rounded-2xl p-5 border border-[#E2E8F0] text-left transition-all duration-200 hover:border-cyan-500/50 hover:bg-[#F8FAFC] hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase tracking-wider font-semibold group-hover:text-cyan-300 transition-colors">Active Autopilots</span>
            <Zap className="h-4 w-4 text-brand-cyan group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground group-hover:text-white">
            {isLoading ? <Skeleton className="h-7 w-12" /> : (kpis?.activeAutopilots ?? 0)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{kpis?.totalAutopilots ?? 0} configured systems</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400 font-medium">Inspect →</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMetric("work_created_today")}
          className="group glass rounded-2xl p-5 border border-[#E2E8F0] text-left transition-all duration-200 hover:border-purple-500/50 hover:bg-[#F8FAFC] hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase tracking-wider font-semibold group-hover:text-purple-300 transition-colors">Work Created Today</span>
            <Sparkles className="h-4 w-4 text-brand-violet group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground group-hover:text-white">
            {isLoading ? <Skeleton className="h-7 w-12" /> : (kpis?.workCreatedToday ?? 0)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Routed to work groups</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-400 font-medium">Inspect →</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMetric("completed_today")}
          className="group glass rounded-2xl p-5 border border-[#E2E8F0] text-left transition-all duration-200 hover:border-emerald-500/50 hover:bg-[#F8FAFC] hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase tracking-wider font-semibold group-hover:text-emerald-300 transition-colors">Completed Today</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground group-hover:text-white">
            {isLoading ? <Skeleton className="h-7 w-12" /> : (kpis?.workCompletedToday ?? 0)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Verified results</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400 font-medium">Inspect →</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMetric("automated_actions")}
          className="group glass rounded-2xl p-5 border border-[#E2E8F0] text-left transition-all duration-200 hover:border-indigo-500/50 hover:bg-[#F8FAFC] hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase tracking-wider font-semibold group-hover:text-indigo-300 transition-colors">Automated Actions</span>
            <Activity className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground group-hover:text-white">
            {isLoading ? <Skeleton className="h-7 w-12" /> : (kpis?.totalAutomatedActions ?? 0)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Zero manual labor</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 font-medium">Inspect →</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMetric("pending_work")}
          className="group glass rounded-2xl p-5 border border-[#E2E8F0] text-left transition-all duration-200 hover:border-amber-500/50 hover:bg-[#F8FAFC] hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase tracking-wider font-semibold group-hover:text-amber-300 transition-colors">Pending Work</span>
            <Clock className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground group-hover:text-white">
            {isLoading ? <Skeleton className="h-7 w-12" /> : (kpis?.totalPendingWork ?? 0)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>In progress across teams</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-400 font-medium">Inspect →</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMetric("attention_items")}
          className="group glass rounded-2xl p-5 border border-[#E2E8F0] bg-amber-500/[0.03] text-left transition-all duration-200 hover:border-red-500/50 hover:bg-amber-500/[0.08] hover:shadow-lg hover:shadow-red-500/10 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs uppercase tracking-wider font-semibold group-hover:text-red-300 transition-colors">Attention Items</span>
            <AlertTriangle className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-400 group-hover:text-red-400">
            {isLoading ? <Skeleton className="h-7 w-12" /> : (kpis?.attentionCount ?? 0)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-amber-500/80">
            <span>Requires escalation</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 font-medium">Inspect →</span>
          </div>
        </button>
      </div>

      {/* ── 4. Filtered Work View (When sidebar filter selected) ──────────── */}
      {activeWorkFilter !== "all_work" && (
        <div className="rounded-2xl border border-blue-200 bg-white p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Briefcase className="h-4 w-4 text-cyan-400" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white capitalize">
                  Filtered Work View: {activeWorkFilter.replace("_", " ")}
                </h3>
                <p className="text-[11px] text-[#6B7280]">
                  Showing {activeWorkFilter} autopilots and unified work items.
                </p>
              </div>
            </div>

            {onSelectWorkFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectWorkFilter("all_work")}
                className="text-xs text-indigo-300 hover:text-white"
              >
                Back to All Work →
              </Button>
            )}
          </div>

          {loadingFilteredWork ? (
            <div className="py-8 text-center text-xs text-[#6B7280]">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-400 mb-2" />
              Loading {activeWorkFilter} items...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Autopilots Matching Filter */}
              {filteredWorkData?.autopilots && filteredWorkData.autopilots.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    Autopilots ({filteredWorkData.autopilots.length})
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredWorkData.autopilots.map((ap: any) => (
                      <div
                        key={ap.id}
                        className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-white truncate max-w-[200px]">{ap.name}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono ${
                              ap.active
                                ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                                : "border-amber-500/40 text-amber-300 bg-amber-500/10"
                            }`}
                          >
                            {ap.active ? "ACTIVE 🟢" : "PAUSED 🟡"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[#6B7280] line-clamp-1">{ap.description || ap.human_summary}</p>
                        <div className="flex items-center justify-between pt-1 text-[10px] text-[#6B7280] font-mono">
                          <span>{ap.target_work_group_name ? `Group: ${ap.target_work_group_name}` : "Team Routing"}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => runApMutation.mutate(ap)}
                              disabled={!ap.active || executingApId === ap.id}
                              className="h-6 px-2 text-[10px] text-cyan-400 hover:text-cyan-300"
                            >
                              Run Now
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleApMutation.mutate({ id: ap.id, active: !ap.active })}
                              className="h-6 px-2 text-[10px] text-amber-400 hover:text-amber-300"
                            >
                              {ap.active ? "Pause" : "Continue"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks Matching Filter */}
              {filteredWorkData?.tasks && filteredWorkData.tasks.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    Work Items / Tasks ({filteredWorkData.tasks.length})
                  </span>
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {filteredWorkData.tasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/50 p-3 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <p className="font-medium text-[#1F2937] truncate">{task.title}</p>
                          <p className="text-[11px] text-[#6B7280] truncate">
                            Assignee: {task.assignee_name || "Unassigned"} · {task.work_group_name ? `Group: ${task.work_group_name}` : "General"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px] border-[#E2E8F0] font-mono">
                            {task.status}
                          </Badge>
                          <Badge
                            className={`text-[10px] ${
                              task.priority === "Urgent" || task.priority === "High"
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                : "bg-white/5 text-[#374151] border-[#E2E8F0]"
                            }`}
                          >
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!filteredWorkData?.autopilots || filteredWorkData.autopilots.length === 0) &&
                (!filteredWorkData?.tasks || filteredWorkData.tasks.length === 0) && (
                  <div className="py-6 text-center text-xs text-[#6B7280] border border-dashed border-[#E2E8F0] rounded-xl">
                    No {activeWorkFilter} items currently found in workspace.
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* ── 5. Active Autopilots Management Table ───────────────────────── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              <h3 className="font-semibold text-foreground text-sm">Active Autopilots Operational Registry</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Autonomous business processes running for your organization with persistent lifecycle controls.
            </p>
          </div>

          <Badge variant="outline" className="text-[11px] font-mono border-cyan-500/30 text-cyan-300">
            {autopilotsList.filter((a) => a.active).length} Active / {autopilotsList.length} Total
          </Badge>
        </div>

        {autopilotsList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground space-y-2">
            <p>No active Autopilots configured yet.</p>
            <p className="text-[11px] text-muted-foreground/80">Use the natural language command bar above or choose a capability from the left sidebar to activate one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#6B7280] uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Autopilot Name</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Schedule / Trigger</th>
                  <th className="pb-3 font-semibold">Responsible Group / Member</th>
                  <th className="pb-3 font-semibold">Executions</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Lifecycle Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {autopilotsList.map((ap) => {
                  const isRunningThis = executingApId === ap.id;
                  return (
                    <tr key={ap.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 font-medium text-[#1F2937]">
                        <div className="flex flex-col">
                          <span className="text-white font-semibold">{ap.name}</span>
                          {ap.human_summary && (
                            <span className="text-[11px] text-[#6B7280] line-clamp-1">{ap.human_summary}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono border-[#E2E8F0] text-[#374151]">
                          {ap.category}
                        </Badge>
                      </td>
                      <td className="py-3 text-[#6B7280] font-mono text-[11px]">
                        {ap.schedule || ap.trigger_type || "Event Trigger"}
                      </td>
                      <td className="py-3 text-[#374151]">
                        {ap.target_work_group?.name ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ap.target_work_group.color || "#8B5CF6" }} />
                            <span>{ap.target_work_group.name}</span>
                          </span>
                        ) : (
                          <span className="text-[#6B7280]">Team Routing</span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-[#374151]">
                        {ap.execution_stats?.total ?? 0} runs
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            ap.active
                              ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                              : "border-amber-500/40 text-amber-300 bg-amber-500/10"
                          }`}
                        >
                          {ap.active ? "ACTIVE 🟢" : "PAUSED 🟡"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runApMutation.mutate(ap)}
                            disabled={!ap.active || isRunningThis || runApMutation.isPending}
                            className="h-7 text-[11px] border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 gap-1 px-2.5 font-medium"
                          >
                            {isRunningThis ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-cyan-400 text-cyan-400" />}
                            <span>Run Now</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleApMutation.mutate({ id: ap.id, active: !ap.active })}
                            disabled={toggleApMutation.isPending}
                            className={`h-7 text-[11px] px-2.5 font-medium ${
                              ap.active
                                ? "border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                                : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                            }`}
                          >
                            {ap.active ? "Pause" : "Continue"}
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAutopilotToDelete(ap);
                              setDeleteConfirmModalOpen(true);
                            }}
                            className="h-7 w-7 p-0 text-[#6B7280] hover:text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 6. Main Grid ────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {attention && ((attention.urgentTasks?.length ?? 0) > 0 || (attention.overdueInvoices?.length ?? 0) > 0 || (attention.unassignedLeads?.length ?? 0) > 0) && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">Items Requiring Attention</h3>
                </div>
                <span className="text-[11px] text-amber-400 font-mono">Live Escalations</span>
              </div>

              <div className="mt-3 space-y-2">
                {attention.overdueInvoices?.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 text-xs border border-[#E2E8F0]">
                    <span className="text-[#374151] font-medium">Overdue Invoice {inv.number}</span>
                    <span className="font-mono text-amber-400">{currency} {Number(inv.amount).toLocaleString()}</span>
                  </div>
                ))}
                {attention.unassignedLeads?.map((lead: any) => (
                  <div key={lead.id} className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 text-xs border border-[#E2E8F0]">
                    <span className="text-[#374151] font-medium">Unassigned Lead: {lead.name} {lead.company ? `(${lead.company})` : ""}</span>
                    <span className="text-[10px] text-indigo-400 font-mono">Score: {lead.score ?? 0}</span>
                  </div>
                ))}
                {attention.urgentTasks?.map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 text-xs border border-[#E2E8F0]">
                    <span className="text-[#374151] font-medium truncate max-w-[240px]">{task.title}</span>
                    <Badge variant="destructive" className="text-[10px] py-0">{task.priority}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[#E2E8F0] bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <h3 className="font-semibold text-foreground">Recommended for Your Business</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab("discovery")}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Browse all capabilities →
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="group rounded-xl border border-[#E2E8F0] bg-secondary/30 p-4 transition-all hover:border-indigo-500/40 hover:bg-secondary/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{rec.title}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono border-indigo-500/30 text-indigo-300">
                          {rec.category}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{rec.description}</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                        ⚡ {rec.impact}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setPromptText(rec.prompt);
                        planMutation.mutate(rec.prompt);
                      }}
                      className="shrink-0 text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                    >
                      {rec.action}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-[#E2E8F0] bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold text-foreground">Live Activity Stream</h3>
              </div>
              <button onClick={() => refetch()} title="Refresh stream" className="text-muted-foreground hover:text-foreground">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {liveActivity.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No automated activity recorded yet. Activate an Autopilot above to begin autonomous execution.
                </div>
              ) : (
                liveActivity.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-secondary/20 p-3 text-xs"
                  >
                    <div className="mt-0.5">
                      {act.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : act.status === "error" ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{act.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{act.description}</p>
                      <span className="text-[10px] text-muted-foreground/60 block mt-1">
                        {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Centered Delete Autopilot Modal ─────────────────────────────── */}
      <Dialog open={deleteConfirmModalOpen} onOpenChange={setDeleteConfirmModalOpen}>
        <DialogContent className="max-w-md border-rose-300 bg-white text-[#111827] shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <DialogTitle className="text-base font-bold text-white">Delete Autopilot System</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B7280]">
              Are you sure you want to delete <strong className="text-white font-semibold">{autopilotToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-[#374151] space-y-2">
            <p>
              • <strong>Safe Deletion:</strong> Future automated runs will be stopped immediately.
            </p>
            <p>
              • <strong>Data Protected:</strong> Completed work items, customer records, invoices, tasks, and audit logs will <strong className="text-emerald-400">NOT</strong> be deleted.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-[#E2E8F0] pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmModalOpen(false)}
              className="text-xs border-white/20 bg-[#F8FAFC] text-[#1F2937] hover:bg-white/[0.1]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={deleteApMutation.isPending}
              onClick={() => autopilotToDelete && deleteApMutation.mutate(autopilotToDelete.id)}
              className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold gap-1.5"
            >
              {deleteApMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Delete Autopilot</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 5. Master Autopilot Blueprint & Assignment Dialog ─────────────── */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-[#E2E8F0] bg-[#0b0f19] text-white shadow-2xl backdrop-blur-2xl">
          <DialogHeader className="border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles className="h-5 w-5 text-cyan-400" />
                <DialogTitle className="text-base font-bold text-white">
                  {modalStep === "blueprint"
                    ? "Autopilot Blueprint Generated"
                    : modalStep === "assignment"
                    ? "Configure Work Responsibility"
                    : "Review & Activate Autopilot"}
                </DialogTitle>
              </div>

              {/* Progress Steps Header */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className={`px-2 py-0.5 rounded-full ${modalStep === "blueprint" ? "bg-indigo-600 text-white font-bold" : "bg-white/10 text-[#6B7280]"}`}>
                  1. Blueprint
                </span>
                <span className="text-slate-600">→</span>
                <span className={`px-2 py-0.5 rounded-full ${modalStep === "assignment" ? "bg-indigo-600 text-white font-bold" : "bg-white/10 text-[#6B7280]"}`}>
                  2. Assignment
                </span>
                <span className="text-slate-600">→</span>
                <span className={`px-2 py-0.5 rounded-full ${modalStep === "review" ? "bg-indigo-600 text-white font-bold" : "bg-white/10 text-[#6B7280]"}`}>
                  3. Review
                </span>
              </div>
            </div>
            <DialogDescription className="text-xs text-[#6B7280] pt-1">
              {modalStep === "blueprint"
                ? "Review the autonomous actions opteraOS discovered for your business goal."
                : modalStep === "assignment"
                ? "Configure which employee, work group, or algorithm receives and performs the resulting work."
                : "Confirm the complete blueprint, routing strategy, and customer connection before activating."}
            </DialogDescription>
          </DialogHeader>

          {activePlan && (
            <div className="space-y-4 py-3 text-xs">
              {/* ─────────────────────────────────────────────────────────────
                  STEP 1: BLUEPRINT OVERVIEW
              ───────────────────────────────────────────────────────────── */}
              {modalStep === "blueprint" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">{activePlan.title}</h4>
                      <Badge variant="outline" className="border-indigo-400 text-indigo-300 uppercase text-[10px]">
                        {activePlan.category}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-[#374151] leading-relaxed">{activePlan.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-mono text-[#6B7280] border-t border-[#E2E8F0] pt-2.5">
                      <span className="rounded bg-white/5 px-2 py-0.5">⏱ Schedule: {activePlan.schedule}</span>
                      <span className="rounded bg-white/5 px-2 py-0.5">⚡ Trigger: {activePlan.triggerType}</span>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-2">
                      Autonomous Actions Pipeline ({activePlan.actions.length} Steps):
                    </h5>
                    <ol className="space-y-2">
                      {activePlan.actions.map((act) => (
                        <li
                          key={act.step}
                          className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs transition-all hover:bg-[#F8FAFC]"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300 border border-indigo-500/30">
                            {act.step}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-100">{act.title}</p>
                            <p className="text-[11px] text-[#6B7280] mt-0.5 leading-relaxed">{act.description}</p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] font-mono uppercase shrink-0 py-0">
                            Automated
                          </Badge>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 2: ASSIGNMENT & RESPONSIBILITY CONFIGURATION
              ───────────────────────────────────────────────────────────── */}
              {modalStep === "assignment" && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#1F2937] block mb-2">
                      Who should handle the resulting work?
                    </label>

                    {/* 4 Selectable Responsibility Cards */}
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {/* Option A: Individual */}
                      <button
                        type="button"
                        onClick={() => {
                          setAssignmentType("individual");
                          if (!selectedIndividualId && allMembers.length > 0) {
                            setSelectedIndividualId(allMembers[0]!.user_id);
                          }
                        }}
                        className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                          assignmentType === "individual"
                            ? "border-indigo-500 bg-indigo-950/50 shadow-md shadow-indigo-500/10 text-white"
                            : "border-[#E2E8F0] bg-[#F8FAFC] text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#1F2937]"
                        }`}
                      >
                        <User className="h-4 w-4 mb-2 text-indigo-400" />
                        <span className="font-semibold text-xs text-white">Individual</span>
                        <span className="text-[10px] text-[#6B7280] mt-0.5">One team member</span>
                      </button>

                      {/* Option B: Work Group */}
                      <button
                        type="button"
                        onClick={() => {
                          setAssignmentType("work_group");
                          if (!selectedWorkGroupId && workGroups.length > 0) {
                            setSelectedWorkGroupId(workGroups[0]!.id);
                          }
                        }}
                        className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                          assignmentType === "work_group"
                            ? "border-indigo-500 bg-indigo-950/50 shadow-md shadow-indigo-500/10 text-white"
                            : "border-[#E2E8F0] bg-[#F8FAFC] text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#1F2937]"
                        }`}
                      >
                        <Briefcase className="h-4 w-4 mb-2 text-purple-400" />
                        <span className="font-semibold text-xs text-white">Work Group</span>
                        <span className="text-[10px] text-[#6B7280] mt-0.5">Team department</span>
                      </button>

                      {/* Option C: Multiple Members */}
                      <button
                        type="button"
                        onClick={() => {
                          setAssignmentType("multiple_members");
                          if (selectedMemberIds.length === 0 && allMembers.length > 0) {
                            setSelectedMemberIds(allMembers.slice(0, 2).map((m) => m.user_id));
                          }
                        }}
                        className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                          assignmentType === "multiple_members"
                            ? "border-indigo-500 bg-indigo-950/50 shadow-md shadow-indigo-500/10 text-white"
                            : "border-[#E2E8F0] bg-[#F8FAFC] text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#1F2937]"
                        }`}
                      >
                        <Users className="h-4 w-4 mb-2 text-cyan-400" />
                        <span className="font-semibold text-xs text-white">Multiple Members</span>
                        <span className="text-[10px] text-[#6B7280] mt-0.5">Select specific people</span>
                      </button>

                      {/* Option D: AI Assignment */}
                      <button
                        type="button"
                        onClick={() => setAssignmentType("ai_assignment")}
                        className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                          assignmentType === "ai_assignment"
                            ? "border-indigo-500 bg-indigo-950/50 shadow-md shadow-indigo-500/10 text-white"
                            : "border-[#E2E8F0] bg-[#F8FAFC] text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#1F2937]"
                        }`}
                      >
                        <Sparkles className="h-4 w-4 mb-2 text-amber-400" />
                        <span className="font-semibold text-xs text-white">AI Assignment</span>
                        <span className="text-[10px] text-[#6B7280] mt-0.5">Dynamic load match</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Target Selection UI based on Assignment Type */}
                  <div className="rounded-xl border border-[#E2E8F0] bg-black/40 p-4 space-y-3">
                    {/* CASE A: Individual Member Dropdown */}
                    {assignmentType === "individual" && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-semibold text-[#374151]">
                            Select Responsible Organization Member:
                          </label>
                          <button
                            type="button"
                            onClick={() => setInviteModalOpen(true)}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                          >
                            <Link2 className="h-3 w-3" />
                            <span>+ Invite Member</span>
                          </button>
                        </div>

                        {allMembers.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-[#E2E8F0] p-4 text-center space-y-2">
                            <p className="text-[#6B7280] text-xs">No eligible team members found in workspace.</p>
                            <Button
                              size="sm"
                              onClick={() => setInviteModalOpen(true)}
                              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                              <span>Invite Team Members</span>
                            </Button>
                          </div>
                        ) : (
                          <Select value={selectedIndividualId} onValueChange={setSelectedIndividualId}>
                            <SelectTrigger className="h-10 text-xs bg-white border-[#CBD5E1] text-[#111827]">
                              <SelectValue placeholder="Choose a team member..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                              {allMembers.map((m) => (
                                <SelectItem key={m.user_id} value={m.user_id}>
                                  {m.full_name || m.email} ({m.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}

                    {/* CASE B: Work Group Dropdown & Member Preview + Quick Creation */}
                    {assignmentType === "work_group" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-[#374151]">
                            Select Employee Work Group:
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCreateWorkGroupModalOpen(true)}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Create Group</span>
                            </button>
                            <span className="text-slate-600">·</span>
                            <button
                              type="button"
                              onClick={() => setInviteModalOpen(true)}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                            >
                              <Link2 className="h-3 w-3" />
                              <span>Invite</span>
                            </button>
                          </div>
                        </div>

                        {/* EMPTY WORK GROUP STATE */}
                        {workGroups.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-indigo-500/30 bg-indigo-950/20 p-4 text-center space-y-3">
                            <Users className="h-6 w-6 text-indigo-400 mx-auto" />
                            <div>
                              <p className="font-bold text-white text-xs">No work groups created yet.</p>
                              <p className="text-[#6B7280] text-[11px] mt-0.5">Create a team for this Autopilot, or invite people to join one.</p>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setCreateWorkGroupModalOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 font-semibold"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Create Work Group</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setInviteModalOpen(true)}
                                className="border-white/20 bg-[#F8FAFC] text-[#1F2937] hover:bg-white/[0.1] hover:text-white text-xs gap-1.5 font-medium"
                              >
                                <Link2 className="h-3.5 w-3.5" />
                                <span>Invite Members</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setAssignmentType("individual")}
                                className="text-xs text-[#6B7280] hover:text-white"
                              >
                                Continue Without Group →
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Select value={selectedWorkGroupId} onValueChange={setSelectedWorkGroupId}>
                            <SelectTrigger className="h-10 text-xs bg-white border-[#CBD5E1] text-[#111827]">
                              <SelectValue placeholder="Choose a work group..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                              {workGroups.map((wg) => (
                                <SelectItem key={wg.id} value={wg.id}>
                                  {wg.name} ({wg.members_count ?? 0} members)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {activeWorkGroup && (activeWorkGroup.members ?? []).length > 0 && (
                          <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-2.5">
                            <span className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider block mb-1.5">
                              Enrolled {activeWorkGroup.name} Members:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {activeWorkGroup.members?.map((m) => (
                                <span key={m.id} className="rounded-md bg-white/5 border border-[#E2E8F0] px-2 py-0.5 text-[11px] text-[#374151]">
                                  ● {m.full_name || m.user_email} ({m.role})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CASE C: Multiple Members Checkboxes + Search */}
                    {assignmentType === "multiple_members" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-[#374151]">
                            Select Team Members for Rotation:
                          </label>
                          <button
                            type="button"
                            onClick={() => setInviteModalOpen(true)}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                          >
                            <Link2 className="h-3 w-3" />
                            <span>+ Invite Member</span>
                          </button>
                        </div>

                        {allMembers.length === 0 ? (
                          <p className="text-[#6B7280] text-[11px]">No members found.</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                            {allMembers.map((m) => {
                              const checked = selectedMemberIds.includes(m.user_id);
                              return (
                                <label
                                  key={m.user_id}
                                  onClick={() => handleToggleMember(m.user_id)}
                                  className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors ${
                                    checked ? "border-indigo-500/50 bg-indigo-950/30 text-white" : "border-[#E2E8F0] bg-[#F8FAFC] text-[#374151]"
                                  }`}
                                >
                                  <Checkbox checked={checked} />
                                  <span className="text-xs truncate">{m.full_name || m.email}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CASE D: AI Assignment Explanation */}
                    {assignmentType === "ai_assignment" && (
                      <div className="rounded-lg bg-indigo-950/30 border border-indigo-500/30 p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-xs">
                          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                          <span>opteraOS Autonomous AI Dispatcher</span>
                        </div>
                        <p className="text-[11px] text-[#374151] leading-relaxed">
                          Work will be analyzed in real-time. opteraOS evaluates active workloads, department roles, and urgency to assign each item to the optimal available team member without overloading anyone.
                        </p>
                      </div>
                    )}

                    {/* Strategy Selector (when not a single direct individual) */}
                    {assignmentType !== "individual" && (
                      <div className="border-t border-[#E2E8F0] pt-3 space-y-2">
                        <label className="text-[11px] font-semibold text-[#374151] block">
                          Assignment Algorithm / Strategy:
                        </label>
                        <Select value={selectedStrategy} onValueChange={(val) => setSelectedStrategy(val as AssignmentStrategy)}>
                          <SelectTrigger className="h-10 text-xs bg-white border-[#CBD5E1] text-[#111827]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                            <SelectItem value="round_robin">Round Robin (Equal Rotation)</SelectItem>
                            <SelectItem value="lowest_workload">Lowest Workload (Capacity Balancer)</SelectItem>
                            <SelectItem value="skill_based">Skill Based Match</SelectItem>
                            <SelectItem value="ai_assignment">AI Decide (Real Data Evaluation)</SelectItem>
                          </SelectContent>
                        </Select>

                        <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5 pt-0.5">
                          <Info className="h-3.5 w-3.5 shrink-0" />
                          <span>{STRATEGY_DESCRIPTIONS[selectedStrategy]}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Customer Group Connector (Optional Customer Segment Linking) */}
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#1F2937] font-semibold">
                        <Users className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Connect to Customer Segment (Optional):</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCreateCustGroupModalOpen(true)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Create Segment</span>
                      </button>
                    </div>

                    <Select value={selectedCustomerGroupId} onValueChange={setSelectedCustomerGroupId}>
                      <SelectTrigger className="h-9 text-xs bg-white border-[#CBD5E1] text-[#111827]">
                        <SelectValue placeholder="All Customers (No segment restriction)" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                        <SelectItem value="none">All Customers (Universal)</SelectItem>
                        {customerGroups.map((cg) => (
                          <SelectItem key={cg.id} value={cg.id}>
                            {cg.name} ({cg.members_count ?? 0} customers)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 3: REVIEW & CONFIRMATION
              ───────────────────────────────────────────────────────────── */}
              {modalStep === "review" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">{activePlan.title}</h4>
                      <Badge variant="outline" className="border-indigo-400 text-indigo-300 uppercase text-[10px]">
                        🟢 Ready to Activate
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs border-t border-[#E2E8F0] pt-3">
                      <div>
                        <span className="text-[#6B7280] text-[10px] uppercase font-semibold block">Assigned Responsibility</span>
                        <p className="font-bold text-white mt-0.5">
                          {assignmentType === "individual"
                            ? `Individual: ${activeIndividual?.full_name || activeIndividual?.email || "Team Member"}`
                            : assignmentType === "work_group"
                            ? `Work Group: ${activeWorkGroup?.name || "All Organization Members"}`
                            : assignmentType === "multiple_members"
                            ? `${selectedMemberIds.length} Selected Team Members`
                            : "Autonomous AI Dispatcher"}
                        </p>
                      </div>

                      <div>
                        <span className="text-[#6B7280] text-[10px] uppercase font-semibold block">Routing Strategy</span>
                        <p className="font-bold text-emerald-400 mt-0.5 font-mono">
                          {assignmentType === "individual" ? "Direct Assignment" : selectedStrategy.replace("_", " ")}
                        </p>
                      </div>

                      <div>
                        <span className="text-[#6B7280] text-[10px] uppercase font-semibold block">Trigger & Schedule</span>
                        <p className="text-[#1F2937] mt-0.5">{activePlan.schedule}</p>
                      </div>

                      <div>
                        <span className="text-[#6B7280] text-[10px] uppercase font-semibold block">Customer Segment</span>
                        <p className="text-[#1F2937] mt-0.5">{activeCustomerGroup?.name || "All Customers"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-emerald-500/[0.08] border border-emerald-500/30 p-3 flex items-start gap-2.5 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[#1F2937] leading-relaxed">
                      Upon activation, opteraOS will autonomously monitor triggers, dispatch work to <strong>{assignmentType === "individual" ? activeIndividual?.full_name || "the assigned member" : activeWorkGroup?.name || "the team"}</strong>, and report verified results to your live business dashboard.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Dialog Footer with High Contrast Accessible Buttons ── */}
          <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPlanModalOpen(false);
                setModalStep("blueprint");
              }}
              className="border-white/20 bg-[#F8FAFC] text-[#1F2937] hover:bg-white/[0.1] hover:text-white font-medium text-xs shadow-sm"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              {modalStep === "blueprint" && (
                <Button
                  size="sm"
                  onClick={() => setModalStep("assignment")}
                  className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md"
                >
                  <span>Configure Assignment</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}

              {modalStep === "assignment" && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalStep("blueprint")}
                    className="text-xs text-[#374151] hover:text-white"
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    disabled={!isAssignmentValid}
                    onClick={() => setModalStep("review")}
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md"
                  >
                    <span>Review Plan</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}

              {modalStep === "review" && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalStep("assignment")}
                    className="text-xs text-[#374151] hover:text-white"
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    disabled={activateMutation.isPending || !isAssignmentValid}
                    onClick={() => activateMutation.mutate()}
                    className="gap-1.5 bg-gradient-to-r from-emerald-500 via-indigo-600 to-purple-600 font-bold text-xs text-white shadow-lg shadow-indigo-500/20 hover:opacity-95"
                  >
                    {activateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    <span>Activate Autopilot</span>
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Create Work Group on the Fly ───────────────────────── */}
      <Dialog open={createWorkGroupModalOpen} onOpenChange={setCreateWorkGroupModalOpen}>
        <DialogContent className="max-w-lg border-[#E2E8F0] bg-white text-[#111827] shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-400">
              <Briefcase className="h-5 w-5 text-purple-400" />
              <DialogTitle className="text-base font-bold text-white">Create Work Group</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B7280]">
              Create a team to handle Autopilot actions. Select members from your organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#374151] block mb-1">Group Name *</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Sales Team, Customer Success, Finance"
                className="h-9 text-xs bg-white border-[#CBD5E1] text-[#111827]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151] block mb-1">Description</label>
              <Input
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="e.g. Handles inbound leads and pipeline velocity"
                className="h-9 text-xs bg-white border-[#CBD5E1] text-[#111827]"
              />
            </div>

            {/* Member Selection with Search & Bulk Actions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[#374151]">
                  Select Team Members ({newGroupSelectedMembers.length} selected):
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setNewGroupSelectedMembers(filteredCreationMembers.map((m) => m.user_id))}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Select All Filtered
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => setNewGroupSelectedMembers([])}
                    className="text-[#6B7280] hover:text-[#374151]"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#6B7280]" />
                <Input
                  value={newGroupMemberSearch}
                  onChange={(e) => setNewGroupMemberSearch(e.target.value)}
                  placeholder="Search members by name or email..."
                  className="pl-8 h-8 text-xs bg-white border-[#CBD5E1] text-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto border border-[#E2E8F0] rounded-xl p-2 bg-black/40">
                {filteredCreationMembers.length === 0 ? (
                  <p className="text-[#6B7280] text-[11px] col-span-2 text-center py-4">
                    No members match search query.
                  </p>
                ) : (
                  filteredCreationMembers.map((m) => {
                    const checked = newGroupSelectedMembers.includes(m.user_id);
                    return (
                      <label
                        key={m.user_id}
                        onClick={() => {
                          if (checked) {
                            setNewGroupSelectedMembers(newGroupSelectedMembers.filter((id) => id !== m.user_id));
                          } else {
                            setNewGroupSelectedMembers([...newGroupSelectedMembers, m.user_id]);
                          }
                        }}
                        className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors ${
                          checked
                            ? "border-indigo-500/60 bg-indigo-950/40 text-white"
                            : "border-[#E2E8F0] bg-[#F8FAFC] text-[#374151] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <Checkbox checked={checked} />
                        <div className="min-w-0 flex-1 truncate">
                          <p className="text-xs font-medium truncate">{m.full_name || m.email}</p>
                          <span className="text-[10px] text-[#6B7280]">{m.role}</span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-[#E2E8F0] pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateWorkGroupModalOpen(false)}
              className="border-white/20 bg-[#F8FAFC] text-[#1F2937] hover:bg-white/[0.1] hover:text-white text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newGroupName.trim() || createWorkGroupMutation.isPending}
              onClick={() => createWorkGroupMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              {createWorkGroupMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create & Select Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Invite Members to Organization / Group ─────────────── */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-md border-[#E2E8F0] bg-white text-[#111827] shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-400">
              <Mail className="h-5 w-5 text-cyan-400" />
              <DialogTitle className="text-base font-bold text-white">Invite Team Members</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B7280]">
              Invite employees or specialists to join your workspace and handle work.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#374151] block mb-1">Email Address</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@yourcompany.com"
                className="h-9 text-xs bg-white border-[#CBD5E1] text-[#111827]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151] block mb-1">Workspace Role</label>
              <Select value={inviteRole} onValueChange={(val) => setInviteRole(val as any)}>
                <SelectTrigger className="h-9 text-xs bg-white border-[#CBD5E1] text-[#111827]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  <SelectItem value="member">Standard Member</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-[#E2E8F0] pt-3 space-y-2">
              <span className="text-[11px] text-[#6B7280] block font-semibold">Or share a single-click invite link:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => generateLinkMutation.mutate()}
                disabled={generateLinkMutation.isPending}
                className="w-full text-xs border-white/20 bg-[#F8FAFC] text-[#1F2937] hover:bg-white/[0.1] hover:text-white gap-1.5 font-medium"
              >
                {generateLinkMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5 text-cyan-400" />}
                <span>{generatedLink ? "Link Copied!" : "Generate & Copy Shareable Invite Link"}</span>
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-[#E2E8F0] pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInviteModalOpen(false)}
              className="border-white/20 bg-[#F8FAFC] text-[#1F2937] hover:bg-white/[0.1] hover:text-white text-xs font-medium"
            >
              Close
            </Button>
            <Button
              size="sm"
              disabled={!inviteEmail.trim() || sendInviteMutation.isPending}
              onClick={() => sendInviteMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              {sendInviteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send Email Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Create Customer Group on the Fly ───────────────────── */}
      <Dialog open={createCustGroupModalOpen} onOpenChange={setCreateCustGroupModalOpen}>
        <DialogContent className="max-w-md border-[#E2E8F0] bg-white text-[#111827] shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-400">
              <Users className="h-5 w-5 text-indigo-400" />
              <DialogTitle className="text-base font-bold text-white">Create Customer Segment</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B7280]">
              Group customers by stage or status for automated Autopilot targeting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#374151] block mb-1">Segment Name *</label>
              <Input
                value={newCustGroupName}
                onChange={(e) => setNewCustGroupName(e.target.value)}
                placeholder="e.g. VIP Customers, Enterprise Accounts, At-Risk"
                className="h-9 text-xs bg-white border-[#CBD5E1] text-[#111827]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151] block mb-1">Description</label>
              <Input
                value={newCustGroupDescription}
                onChange={(e) => setNewCustGroupDescription(e.target.value)}
                placeholder="e.g. High-value enterprise customers"
                className="h-9 text-xs bg-white border-[#CBD5E1] text-[#111827]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151] block mb-1">Status Filter</label>
              <Select value={newCustGroupStatusCriteria} onValueChange={setNewCustGroupStatusCriteria}>
                <SelectTrigger className="h-9 text-xs bg-white border-[#CBD5E1] text-[#111827]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  <SelectItem value="all">All Customer Statuses</SelectItem>
                  <SelectItem value="active">Active Customers Only</SelectItem>
                  <SelectItem value="prospect">Prospects Only</SelectItem>
                  <SelectItem value="churned">Churned Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-[#E2E8F0] pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateCustGroupModalOpen(false)}
              className="border-white/20 bg-[#F8FAFC] text-[#1F2937] hover:bg-white/[0.1] hover:text-white text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newCustGroupName.trim() || createCustGroupMutation.isPending}
              onClick={() => createCustGroupMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              {createCustGroupMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create & Select Segment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 6. Operational Metric Detail Modal (All 6 KPI controls) ───── */}
      {selectedMetric && (
        <AutopilotMetricDetailModal
          open={!!selectedMetric}
          onOpenChange={(open) => !open && setSelectedMetric(null)}
          metricType={selectedMetric}
          orgId={orgId}
          currency={currency}
          onNavigateTab={onNavigateTab}
        />
      )}
    </div>
  );
}
