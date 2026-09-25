import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Zap,
  Sparkles,
  CheckCircle2,
  Clock,
  Activity,
  AlertTriangle,
  Users,
  Briefcase,
  Play,
  Pause,
  ArrowRight,
  Filter,
  UserCheck,
  ShieldAlert,
  Loader2,
  Search,
  Sliders,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Edit,
  ExternalLink,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  listAutopilots,
  toggleAutopilot,
  deleteAutopilot,
  triggerAutopilotExecution,
  type AutopilotRecord,
  type LiveActivityItem,
} from "@/lib/autopilot.functions";
import {
  listTasks,
  setTaskStatus,
  reassignWorkItem,
  redistributeGroupWork,
  quickAssignLead,
  type UnifiedWorkItem,
} from "@/lib/tasks.functions";
import { listWorkGroups } from "@/lib/workgroups.functions";
import { listCustomerGroups } from "@/lib/customergroups.functions";
import { getTeam } from "@/lib/workspace.functions";
import { formatDistanceToNow } from "date-fns";

export type MetricType =
  | "active_autopilots"
  | "work_created_today"
  | "completed_today"
  | "automated_actions"
  | "pending_work"
  | "attention_items";

interface MetricDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricType: MetricType;
  orgId: string;
  currency: string;
  onNavigateTab: (tab: string) => void;
}

const METRIC_TITLES: Record<MetricType, { title: string; subtitle: string; icon: any; color: string }> = {
  active_autopilots: {
    title: "Active Autopilots Operational Control",
    subtitle: "Inspect running autonomous systems, responsible teams, execution stats, and live controls.",
    icon: Zap,
    color: "text-brand-cyan",
  },
  work_created_today: {
    title: "Work Created Today — Activity Ledger",
    subtitle: "Inspect actionable work items created today across your business, teams, and customers.",
    icon: Sparkles,
    color: "text-brand-violet",
  },
  completed_today: {
    title: "Completed Work Today — Verified Outcomes",
    subtitle: "Audit completed tasks, resolved outcomes, involved specialists, and completion velocity.",
    icon: CheckCircle2,
    color: "text-emerald-400",
  },
  automated_actions: {
    title: "Autonomous Action Trace Log",
    subtitle: "Real-time audit log of automated actions executed by opteraOS AI and background triggers.",
    icon: Activity,
    color: "text-indigo-400",
  },
  pending_work: {
    title: "Pending Workload & Capacity Balancer",
    subtitle: "Manage in-progress work by department, monitor active loads, and rebalance team capacity.",
    icon: Clock,
    color: "text-amber-400",
  },
  attention_items: {
    title: "Executive Attention & Escalation Center",
    subtitle: "Items requiring immediate human leadership intervention, approvals, or reassignment.",
    icon: AlertTriangle,
    color: "text-amber-400",
  },
};

export function AutopilotMetricDetailModal({
  open,
  onOpenChange,
  metricType,
  orgId,
  currency,
  onNavigateTab,
}: MetricDetailModalProps) {
  const queryClient = useQueryClient();

  const fetchAutopilots = useServerFn(listAutopilots);
  const fetchTasks = useServerFn(listTasks);
  const fetchWorkGroups = useServerFn(listWorkGroups);
  const fetchCustomerGroups = useServerFn(listCustomerGroups);
  const fetchTeam = useServerFn(getTeam);
  const toggle = useServerFn(toggleAutopilot);
  const deleteAp = useServerFn(deleteAutopilot);
  const triggerExec = useServerFn(triggerAutopilotExecution);
  const setStatus = useServerFn(setTaskStatus);
  const reassign = useServerFn(reassignWorkItem);
  const redistribute = useServerFn(redistributeGroupWork);
  const assignLead = useServerFn(quickAssignLead);

  // Filter states
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterWorkGroupId, setFilterWorkGroupId] = useState<string>("all");
  const [filterAssigneeId, setFilterAssigneeId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autopilotStatusFilter, setAutopilotStatusFilter] = useState<"all" | "active" | "paused">("all");

  // Deletion modal state
  const [deletingAutopilot, setDeletingAutopilot] = useState<AutopilotRecord | null>(null);

  // Running autopilot state for inline loading
  const [runningAutopilotId, setRunningAutopilotId] = useState<string | null>(null);

  // Reassignment sub-modal state
  const [reassignItem, setReassignItem] = useState<UnifiedWorkItem | null>(null);
  const [newAssigneeId, setNewAssigneeId] = useState<string>("");
  const [newWorkGroupId, setNewWorkGroupId] = useState<string>("");
  const [newPriority, setNewPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");

  // Lead quick assign sub-modal
  const [assigningLead, setAssigningLead] = useState<{ id: string; name: string } | null>(null);
  const [leadTargetUserId, setLeadTargetUserId] = useState<string>("");

  // Data queries
  const { data: autopilots = [], isLoading: loadingAutopilots } = useQuery({
    queryKey: ["autopilots", orgId],
    queryFn: () => fetchAutopilots({ data: { orgId } }),
    enabled: open,
  });

  const { data: allWorkItems = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks", orgId],
    queryFn: () => fetchTasks({ data: { orgId } }),
    enabled: open,
  });

  const { data: workGroups = [] } = useQuery({
    queryKey: ["work_groups", orgId],
    queryFn: () => fetchWorkGroups({ data: { orgId } }),
    enabled: open,
  });

  const { data: customerGroups = [] } = useQuery({
    queryKey: ["customer_groups", orgId],
    queryFn: () => fetchCustomerGroups({ data: { orgId } }),
    enabled: open,
  });

  const { data: teamData } = useQuery({
    queryKey: ["team", orgId],
    queryFn: () => fetchTeam({ data: { orgId } }),
    enabled: open,
  });

  const allMembers = teamData?.members ?? [];

  // Mutations
  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      toggle({ data: { id, orgId, active } }),
    onSuccess: (res) => {
      toast.success(`Autopilot '${res.name}' is now ${res.active ? "🟢 ACTIVE" : "🟡 PAUSED"}`);
      queryClient.invalidateQueries({ queryKey: ["autopilots", orgId] });
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAp({ data: { id, orgId } }),
    onSuccess: (res) => {
      toast.success(`Autopilot '${res.name}' deleted successfully.`);
      setDeletingAutopilot(null);
      queryClient.invalidateQueries({ queryKey: ["autopilots", orgId] });
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
    },
    onError: (e: any) => toast.error(e.message || "Could not delete this Autopilot."),
  });

  const runMutation = useMutation({
    mutationFn: async (autopilotId: string) => {
      setRunningAutopilotId(autopilotId);
      return triggerExec({ data: { orgId, autopilotId, triggerEvent: "manual_inspection_run" } });
    },
    onSuccess: (res) => {
      toast.success(`Autonomous sequence executed in ${res.durationMs}ms · Work assigned to ${res.assignedTo}`);
      setRunningAutopilotId(null);
      queryClient.invalidateQueries({ queryKey: ["autopilots", orgId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", orgId] });
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
    },
    onError: (e: any) => {
      setRunningAutopilotId(null);
      toast.error(e.message);
    },
  });

  const reassignMutation = useMutation({
    mutationFn: () => {
      if (!reassignItem) throw new Error("No item selected");
      return reassign({
        data: {
          id: reassignItem.id,
          assigneeId: newAssigneeId || undefined,
          workGroupId: newWorkGroupId || undefined,
          priority: newPriority,
        },
      });
    },
    onSuccess: () => {
      toast.success("Work item reassigned successfully");
      setReassignItem(null);
      queryClient.invalidateQueries({ queryKey: ["tasks", orgId] });
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const redistributeMutation = useMutation({
    mutationFn: (workGroupId: string) => redistribute({ data: { orgId, workGroupId } }),
    onSuccess: (res) => {
      toast.success(`Redistributed ${res.reassignedCount} tasks across ${res.memberCount} work group members`);
      queryClient.invalidateQueries({ queryKey: ["tasks", orgId] });
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignLeadMutation = useMutation({
    mutationFn: () => {
      if (!assigningLead || !leadTargetUserId) throw new Error("Select a member");
      return assignLead({ data: { orgId, leadId: assigningLead.id, ownerId: leadTargetUserId } });
    },
    onSuccess: () => {
      toast.success("Lead assigned successfully");
      setAssigningLead(null);
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Derived datasets
  const activeAutopilotsList = autopilots.filter((a) => a.active);

  const workCreatedTodayList = allWorkItems.filter(
    (t) => new Date(t.created_at).getTime() >= todayStart.getTime(),
  );

  const completedTodayList = allWorkItems.filter(
    (t) => t.status === "Completed" && t.completed_at && new Date(t.completed_at).getTime() >= todayStart.getTime(),
  );

  const pendingWorkList = allWorkItems.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");

  const overduePendingList = pendingWorkList.filter((t) => t.due_date && new Date(t.due_date).getTime() < Date.now());
  const unassignedPendingList = pendingWorkList.filter((t) => !t.assignee_id);

  // Check workload imbalance across members
  const memberPendingCount = new Map<string, number>();
  for (const t of pendingWorkList) {
    if (t.assignee_id) {
      memberPendingCount.set(t.assignee_id, (memberPendingCount.get(t.assignee_id) ?? 0) + 1);
    }
  }

  let overloadedMember: { id: string; name: string; count: number } | null = null;
  const counts = Array.from(memberPendingCount.values());
  if (counts.length >= 2) {
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    for (const [userId, cnt] of memberPendingCount.entries()) {
      if (cnt >= 5 && cnt > avg * 1.8) {
        const mem = allMembers.find((m) => m.user_id === userId);
        overloadedMember = { id: userId, name: mem?.full_name || mem?.email || "Team Member", count: cnt };
        break;
      }
    }
  }

  const meta = METRIC_TITLES[metricType] || METRIC_TITLES.active_autopilots;
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col border-[rgba(0,128,128,0.2)] bg-white text-[#0F2423] shadow-2xl">
        {/* ── Dialog Header ────────────────────────────────────────────── */}
        <DialogHeader className="border-b border-[rgba(0,128,128,0.14)] pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[rgba(0,128,128,0.08)] border border-[rgba(0,128,128,0.2)] text-[#008080]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0F2423] flex items-center gap-2">
                  <span>{meta.title}</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-[rgba(0,128,128,0.25)] text-[#008080] bg-[rgba(0,128,128,0.06)] font-semibold">
                    Live Real DB
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-[#617D7B] mt-0.5">
                  {meta.subtitle}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* ── Dynamic Operational Content Body ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs pr-1">
          {/* ─────────────────────────────────────────────────────────────
              VIEW 1: ACTIVE & CONFIGURED AUTOPILOTS
          ───────────────────────────────────────────────────────────── */}
          {metricType === "active_autopilots" && (
            <div className="space-y-4">
              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F8FAFC] p-2.5 rounded-xl border border-[rgba(0,128,128,0.14)]">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[#617D7B] mr-1 text-[11px] uppercase font-semibold">Status:</span>
                  <button
                    type="button"
                    onClick={() => setAutopilotStatusFilter("all")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      autopilotStatusFilter === "all"
                        ? "bg-[#008080] text-white font-semibold shadow-teal-sm"
                        : "bg-white text-[#617D7B] hover:text-[#0F2423] border border-[rgba(0,128,128,0.12)]"
                    }`}
                  >
                    All ({autopilots.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutopilotStatusFilter("active")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      autopilotStatusFilter === "active"
                        ? "bg-emerald-600 text-white font-semibold shadow-sm"
                        : "bg-white text-[#617D7B] hover:text-[#0F2423] border border-[rgba(0,128,128,0.12)]"
                    }`}
                  >
                    🟢 Active ({autopilots.filter((a) => a.active).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutopilotStatusFilter("paused")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      autopilotStatusFilter === "paused"
                        ? "bg-amber-600 text-white font-semibold shadow-sm"
                        : "bg-white text-[#617D7B] hover:text-[#0F2423] border border-[rgba(0,128,128,0.12)]"
                    }`}
                  >
                    🟡 Paused ({autopilots.filter((a) => !a.active).length})
                  </button>
                </div>
              </div>

              {(() => {
                const displayedAutopilots = autopilots.filter((a) =>
                  autopilotStatusFilter === "all" ? true : autopilotStatusFilter === "active" ? a.active : !a.active,
                );

                if (displayedAutopilots.length === 0) {
                  return (
                    <div className="rounded-2xl border border-dashed border-[rgba(0,128,128,0.25)] p-8 text-center space-y-3">
                      <Zap className="h-8 w-8 text-[#008080] mx-auto" />
                      <p className="text-[#0F2423] font-bold text-sm">
                        {autopilotStatusFilter === "active"
                          ? "No Autopilots are currently active."
                          : autopilotStatusFilter === "paused"
                          ? "No Autopilots are currently paused."
                          : "No Autopilots configured yet."}
                      </p>
                      <p className="text-[#617D7B] text-xs max-w-md mx-auto">
                        Tell opteraOS what work needs to happen using the command bar, or enable pre-built capabilities from the Discovery catalog.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          onOpenChange(false);
                          onNavigateTab("discovery");
                        }}
                        className="bg-[#008080] hover:bg-[#006666] text-white font-bold text-xs shadow-teal-sm"
                      >
                        Browse Capabilities →
                      </Button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {displayedAutopilots.map((ap) => {
                      const stats = (ap.execution_stats as any) || {};
                      const isRunningThis = runningAutopilotId === ap.id;
                      const isTogglingThis = toggleMutation.isPending && (toggleMutation.variables as any)?.id === ap.id;

                      return (
                        <div
                          key={ap.id}
                          className={`rounded-2xl border p-4 transition-all space-y-3 ${
                            ap.active
                              ? "border-[rgba(0,128,128,0.14)] bg-white shadow-card hover:border-[#008080]"
                              : "border-amber-200 bg-amber-50/30 opacity-90 hover:opacity-100 hover:border-amber-300"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-[#0F2423]">{ap.name}</span>
                                {ap.active ? (
                                  <Badge variant="outline" className="text-[10px] uppercase font-mono border-emerald-500/30 text-emerald-700 bg-emerald-50 font-bold">
                                    🟢 ACTIVE
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] uppercase font-mono border-amber-500/30 text-amber-700 bg-amber-50 font-bold">
                                    🟡 PAUSED
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-[10px] uppercase font-mono border-[rgba(0,128,128,0.25)] text-[#008080] bg-[rgba(0,128,128,0.06)] font-semibold">
                                  {ap.category}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-[#3D5A58] leading-relaxed">{ap.description}</p>
                            </div>

                            {/* Operational Controls: Run Now, Pause/Resume, Delete */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {ap.active ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => runMutation.mutate(ap.id)}
                                    disabled={isRunningThis || isTogglingThis || deleteMutation.isPending}
                                    className="h-8 text-xs border-[rgba(0,128,128,0.25)] bg-white text-[#008080] hover:bg-[rgba(0,128,128,0.08)] gap-1.5 font-semibold"
                                  >
                                    {isRunningThis ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin text-[#008080]" />
                                        <span>Running...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-3 w-3 text-[#008080] fill-[#008080]" />
                                        <span>Run Now</span>
                                      </>
                                    )}
                                  </Button>

                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleMutation.mutate({ id: ap.id, active: false })}
                                    disabled={isRunningThis || isTogglingThis || deleteMutation.isPending}
                                    className="h-8 text-xs border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 gap-1.5 font-semibold"
                                  >
                                    {isTogglingThis ? (
                                      <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                                    ) : (
                                      <Pause className="h-3 w-3 text-amber-600" />
                                    )}
                                    <span>Pause</span>
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleMutation.mutate({ id: ap.id, active: true })}
                                  disabled={isTogglingThis || deleteMutation.isPending}
                                  className="h-8 text-xs border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 gap-1.5 font-bold shadow-xs"
                                >
                                  {isTogglingThis ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                                  ) : (
                                    <Play className="h-3 w-3 text-emerald-600 fill-emerald-600" />
                                  )}
                                  <span>Continue</span>
                                </Button>
                              )}

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setDeletingAutopilot(ap)}
                                disabled={isRunningThis || isTogglingThis || deleteMutation.isPending}
                                className="h-8 text-xs border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 gap-1.5 font-medium"
                                title="Delete Autopilot"
                              >
                                <Trash2 className="h-3 w-3 text-rose-600" />
                                <span>Delete</span>
                              </Button>
                            </div>
                          </div>

                          {/* Responsibility & Routing Pipeline */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-[rgba(0,128,128,0.14)] pt-2.5 text-[11px]">
                            <div className="bg-[#F8FAFC] rounded-lg p-2 border border-[rgba(0,128,128,0.14)]">
                              <span className="text-[#617D7B] font-semibold block text-[10px] uppercase">Work Group</span>
                              <span className="text-[#0F2423] font-bold">{ap.target_work_group?.name || "All Workspace Members"}</span>
                            </div>
                            <div className="bg-[#F8FAFC] rounded-lg p-2 border border-[rgba(0,128,128,0.14)]">
                              <span className="text-[#617D7B] font-semibold block text-[10px] uppercase">Routing Strategy</span>
                              <span className="text-[#008080] font-mono font-bold">{ap.assignment_strategy?.replace("_", " ") || "Round Robin"}</span>
                            </div>
                            <div className="bg-[#F8FAFC] rounded-lg p-2 border border-[rgba(0,128,128,0.14)]">
                              <span className="text-[#617D7B] font-semibold block text-[10px] uppercase">Trigger</span>
                              <span className="text-[#3D5A58] font-medium">{ap.trigger_type}</span>
                            </div>
                            <div className="bg-[#F8FAFC] rounded-lg p-2 border border-[rgba(0,128,128,0.14)]">
                              <span className="text-[#617D7B] font-semibold block text-[10px] uppercase">Total Executions</span>
                              <span className="text-[#008080] font-bold font-mono">{stats.total ?? 0} runs</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW 2: WORK CREATED TODAY
          ───────────────────────────────────────────────────────────── */}
          {metricType === "work_created_today" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F8FAFC] p-2.5 rounded-xl border border-[rgba(0,128,128,0.14)]">
                <div className="flex items-center gap-2 text-xs text-[#0F2423] font-bold">
                  <span>Filtered: {workCreatedTodayList.length} items created today</span>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={filterWorkGroupId} onValueChange={setFilterWorkGroupId}>
                    <SelectTrigger className="h-8 text-xs bg-white border-[rgba(0,128,128,0.2)] text-[#0F2423] w-40">
                      <SelectValue placeholder="All Work Groups" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[rgba(0,128,128,0.2)] text-[#0F2423]">
                      <SelectItem value="all">All Work Groups</SelectItem>
                      {workGroups.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {workCreatedTodayList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[rgba(0,128,128,0.25)] p-8 text-center space-y-2">
                  <Sparkles className="h-8 w-8 text-[#008080] mx-auto" />
                  <p className="text-[#0F2423] font-bold text-sm">No work items have been created today yet.</p>
                  <p className="text-[#617D7B] text-xs">Run an Autopilot or create a work item to begin tracking.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {workCreatedTodayList.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-[rgba(0,128,128,0.14)] bg-white p-3 text-xs shadow-xs hover:border-[#008080] transition-all"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0F2423] truncate max-w-sm">{item.title}</span>
                          <Badge variant="outline" className="text-[10px] font-mono border-[rgba(0,128,128,0.2)] text-[#3D5A58]">
                            {item.work_type}
                          </Badge>
                          <Badge variant={item.priority === "Urgent" || item.priority === "High" ? "destructive" : "secondary"} className="text-[10px] py-0 font-bold">
                            {item.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[#617D7B]">
                          <span>👤 Assigned: <strong className="text-[#0F2423]">{item.assignee_name}</strong></span>
                          {item.work_group_name && <span>👥 Group: <strong className="text-[#0F2423]">{item.work_group_name}</strong></span>}
                          <span>⏱ {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReassignItem(item);
                            setNewAssigneeId(item.assignee_id || "");
                            setNewWorkGroupId(item.work_group_id || "");
                            setNewPriority(item.priority);
                          }}
                          className="h-7 text-[11px] border-[rgba(0,128,128,0.2)] bg-white text-[#3D5A58] hover:bg-[#F4F9F8] font-medium"
                        >
                          Reassign
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW 3: COMPLETED TODAY
          ───────────────────────────────────────────────────────────── */}
          {metricType === "completed_today" && (
            <div className="space-y-4">
              {completedTodayList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[rgba(0,128,128,0.25)] p-8 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p className="text-[#0F2423] font-bold text-sm">No work items have been marked complete today yet.</p>
                  <p className="text-[#617D7B] text-xs">As specialists complete work and record outcome notes, verified results will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {completedTodayList.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-emerald-500/20 bg-emerald-50/40 p-3 text-xs space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0F2423] text-sm">{item.title}</span>
                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 bg-emerald-50 font-mono font-bold">
                          ✓ Completed
                        </Badge>
                      </div>
                      {item.outcome_notes && (
                        <p className="text-[11px] text-emerald-900 font-mono bg-emerald-100/70 p-2 rounded-lg border border-emerald-300">
                          Outcome: {item.outcome_notes}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-[#617D7B] pt-1 border-t border-emerald-200">
                        <span>Resolved by: <strong className="text-[#0F2423]">{item.assignee_name}</strong></span>
                        {item.work_group_name && <span>Department: <strong className="text-[#0F2423]">{item.work_group_name}</strong></span>}
                        <span>Finished: {item.completed_at ? new Date(item.completed_at).toLocaleTimeString() : "Today"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW 4: AUTOMATED ACTIONS
          ───────────────────────────────────────────────────────────── */}
          {metricType === "automated_actions" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[rgba(0,128,128,0.2)] bg-[rgba(0,128,128,0.06)] p-3 text-xs text-[#0F2423] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#008080]" />
                  <span className="font-semibold">Showing live automated action traces executed across all configured Autopilots.</span>
                </div>
              </div>

              <div className="space-y-2">
                {activeAutopilotsList.length === 0 ? (
                  <p className="text-[#617D7B] text-center py-6">No active autopilots to generate automated actions.</p>
                ) : (
                  activeAutopilotsList.flatMap((ap) => ap.actions || []).map((act: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-[rgba(0,128,128,0.14)] bg-white p-3 text-xs shadow-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0F2423]">{act.title}</span>
                          <Badge variant="outline" className="text-[10px] font-mono border-[rgba(0,128,128,0.2)] text-[#008080] bg-[rgba(0,128,128,0.06)] font-semibold">
                            {act.tool || "ai_action"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[#617D7B]">{act.description}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono uppercase border-emerald-500/30 text-emerald-700 bg-emerald-50 font-bold">
                        AI Autonomous
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW 5: PENDING WORKLOAD & CAPACITY BALANCER
          ───────────────────────────────────────────────────────────── */}
          {metricType === "pending_work" && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-xl border border-[rgba(0,128,128,0.14)] bg-[#F8FAFC] p-2.5">
                  <span className="text-[#617D7B] text-[10px] uppercase font-semibold block">Total Pending</span>
                  <span className="text-lg font-bold text-[#0F2423] font-mono">{pendingWorkList.length}</span>
                </div>
                <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-2.5">
                  <span className="text-amber-700 text-[10px] uppercase font-semibold block">Overdue</span>
                  <span className="text-lg font-bold text-amber-800 font-mono">{overduePendingList.length}</span>
                </div>
                <div className="rounded-xl border border-[rgba(0,128,128,0.2)] bg-[rgba(0,128,128,0.06)] p-2.5">
                  <span className="text-[#008080] text-[10px] uppercase font-semibold block">Unassigned</span>
                  <span className="text-lg font-bold text-[#008080] font-mono">{unassignedPendingList.length}</span>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-2.5">
                  <span className="text-purple-700 text-[10px] uppercase font-semibold block">Active Groups</span>
                  <span className="text-lg font-bold text-purple-800 font-mono">{workGroups.length}</span>
                </div>
              </div>

              {/* Workload Imbalance Alert Banner */}
              {overloadedMember && (
                <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      <strong className="font-bold">Workload Imbalance Detected:</strong> {overloadedMember.name} has {overloadedMember.count} active pending tasks (significantly higher than team average).
                    </span>
                  </div>
                  {workGroups.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => redistributeMutation.mutate(workGroups[0]!.id)}
                      disabled={redistributeMutation.isPending}
                      className="shrink-0 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5 shadow-sm"
                    >
                      {redistributeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sliders className="h-3.5 w-3.5" />}
                      <span>Redistribute Work</span>
                    </Button>
                  )}
                </div>
              )}

              {/* Work Breakdown by Group */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#617D7B]">
                  Active Department Workloads:
                </h4>

                {workGroups.length === 0 ? (
                  <p className="text-[#617D7B] text-center py-4">No work groups configured.</p>
                ) : (
                  workGroups.map((wg) => {
                    const groupTasks = pendingWorkList.filter((t) => t.work_group_id === wg.id);
                    return (
                      <div key={wg.id} className="rounded-xl border border-[rgba(0,128,128,0.14)] bg-white p-3 space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: wg.color || "#008080" }} />
                            <span className="font-bold text-[#0F2423] text-sm">{wg.name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono border-[rgba(0,128,128,0.2)] text-[#3D5A58]">
                              {groupTasks.length} pending items
                            </Badge>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => redistributeMutation.mutate(wg.id)}
                            disabled={redistributeMutation.isPending || groupTasks.length === 0}
                            className="h-7 text-[11px] border-[rgba(0,128,128,0.2)] bg-white text-[#3D5A58] hover:bg-[#F4F9F8] font-medium"
                          >
                            Rebalance Group
                          </Button>
                        </div>

                        {/* Group Member Sub-Loads */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {(wg.members ?? []).map((m) => {
                            const memberTasks = groupTasks.filter((t) => t.assignee_id === m.user_id);
                            return (
                              <div key={m.id} className="bg-[#F8FAFC] rounded-lg p-2 border border-[rgba(0,128,128,0.14)] flex items-center justify-between text-[11px]">
                                <span className="text-[#0F2423] font-medium truncate">{m.full_name || m.user_email}</span>
                                <span className={`font-mono font-bold ${memberTasks.length >= 5 ? "text-amber-700" : "text-[#008080]"}`}>
                                  {memberTasks.length}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              VIEW 6: ATTENTION CENTER
          ───────────────────────────────────────────────────────────── */}
          {metricType === "attention_items" && (
            <div className="space-y-4">
              {overduePendingList.length === 0 && unassignedPendingList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-50/50 p-8 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p className="text-[#0F2423] font-bold text-sm">Everything looks optimal!</p>
                  <p className="text-[#617D7B] text-xs">Zero overdue tasks or unassigned escalations require your attention right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Overdue items */}
                  {overduePendingList.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50/70 p-3 text-xs shadow-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-950 truncate max-w-md">🚨 Overdue: {item.title}</span>
                          <Badge variant="destructive" className="text-[10px] py-0 font-mono font-bold">
                            Due {item.due_date}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[#3D5A58]">
                          Assigned to <strong className="text-[#0F2423]">{item.assignee_name}</strong> · Work Group: {item.work_group_name || "Workspace"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <Button
                          size="sm"
                          onClick={() => {
                            setReassignItem(item);
                            setNewAssigneeId(item.assignee_id || "");
                            setNewWorkGroupId(item.work_group_id || "");
                            setNewPriority("Urgent");
                          }}
                          className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                        >
                          Escalate & Reassign
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Unassigned items */}
                  {unassignedPendingList.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-[rgba(0,128,128,0.2)] bg-[rgba(0,128,128,0.04)] p-3 text-xs shadow-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0F2423] truncate max-w-md">⚠️ Unassigned Work: {item.title}</span>
                          <Badge variant="outline" className="text-[10px] border-[rgba(0,128,128,0.3)] text-[#008080] bg-white font-mono font-bold">
                            Needs Owner
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[#3D5A58]">Priority: {item.priority} · Created {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <Button
                          size="sm"
                          onClick={() => {
                            setReassignItem(item);
                            setNewAssigneeId("");
                            setNewWorkGroupId(item.work_group_id || "");
                            setNewPriority(item.priority);
                          }}
                          className="h-7 text-xs bg-[#008080] hover:bg-[#006666] text-white font-semibold shadow-teal-sm"
                        >
                          Assign Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Dialog Footer with Accessible High-Contrast Buttons ────── */}
        <DialogFooter className="flex items-center justify-between border-t border-[rgba(0,128,128,0.14)] pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="border-[rgba(0,128,128,0.2)] bg-white text-[#3D5A58] hover:bg-[#F4F9F8] font-medium text-xs"
          >
            Close
          </Button>

          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onNavigateTab("work");
            }}
            className="bg-[#008080] hover:bg-[#006666] text-white text-xs font-semibold shadow-teal-sm"
          >
            Open Unified Work Manager →
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* ── Sub-Dialog: Reassign Work Item ─────────────────────────────── */}
      <Dialog open={!!reassignItem} onOpenChange={(open) => !open && setReassignItem(null)}>
        <DialogContent className="max-w-md border-[rgba(0,128,128,0.2)] bg-white text-[#0F2423] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#0F2423]">Reassign Work Item</DialogTitle>
            <DialogDescription className="text-xs text-[#617D7B]">
              Update assignee, department work group, or priority.
            </DialogDescription>
          </DialogHeader>

          {reassignItem && (
            <div className="space-y-3 py-2 text-xs">
              <p className="font-bold text-[#0F2423] bg-[#F8FAFC] p-2.5 rounded-lg border border-[rgba(0,128,128,0.14)]">{reassignItem.title}</p>

              <div>
                <label className="text-[11px] font-semibold text-[#0F2423] block mb-1">Assignee</label>
                <Select value={newAssigneeId} onValueChange={setNewAssigneeId}>
                  <SelectTrigger className="h-9 text-xs bg-white border-[rgba(0,128,128,0.2)] text-[#0F2423]">
                    <SelectValue placeholder="Select team member..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[rgba(0,128,128,0.2)] text-[#0F2423]">
                    {allMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.full_name || m.email} ({m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#0F2423] block mb-1">Target Work Group</label>
                <Select value={newWorkGroupId} onValueChange={setNewWorkGroupId}>
                  <SelectTrigger className="h-9 text-xs bg-white border-[rgba(0,128,128,0.2)] text-[#0F2423]">
                    <SelectValue placeholder="Optional Work Group" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[rgba(0,128,128,0.2)] text-[#0F2423]">
                    <SelectItem value="none">None</SelectItem>
                    {workGroups.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#0F2423] block mb-1">Priority</label>
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as any)}>
                  <SelectTrigger className="h-9 text-xs bg-white border-[rgba(0,128,128,0.2)] text-[#0F2423]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[rgba(0,128,128,0.2)] text-[#0F2423]">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 border-t border-[rgba(0,128,128,0.14)] pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReassignItem(null)}
              className="text-xs border-[rgba(0,128,128,0.2)] bg-white text-[#3D5A58] hover:bg-[#F4F9F8] font-medium"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={reassignMutation.isPending}
              onClick={() => reassignMutation.mutate()}
              className="bg-[#008080] hover:bg-[#006666] text-white text-xs font-semibold shadow-teal-sm"
            >
              {reassignMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Centered Delete Autopilot Confirmation Modal ──────────────── */}
      <Dialog
        open={!!deletingAutopilot}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeletingAutopilot(null);
        }}
      >
        <DialogContent className="max-w-md border-rose-300 bg-white text-[#0F2423] shadow-2xl z-[100]">
          <DialogHeader className="text-center items-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-base font-bold text-[#0F2423]">
              Delete Autopilot?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#617D7B]">
              You are about to permanently delete:
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-[rgba(0,128,128,0.14)] bg-[#F8FAFC] p-3 text-center my-1">
            <p className="font-bold text-[#0F2423] text-xs">{deletingAutopilot?.name}</p>
            <p className="text-[11px] text-[#617D7B] mt-1">
              Category: <span className="uppercase font-mono text-[#008080] font-semibold">{deletingAutopilot?.category}</span>
            </p>
          </div>

          <div className="text-[11px] text-[#617D7B] space-y-1.5 leading-relaxed bg-[#F8FAFC] p-3 rounded-xl border border-[rgba(0,128,128,0.14)]">
            <p className="text-[#0F2423] font-semibold">This will:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[#3D5A58] text-[11px]">
              <li>Stop future automatic executions</li>
              <li>Remove this Autopilot configuration</li>
              <li>Preserve historical work items, tasks, and audit logs</li>
            </ul>
            <p className="text-rose-600 font-bold pt-1">This action cannot be undone.</p>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 border-t border-[rgba(0,128,128,0.14)] pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => setDeletingAutopilot(null)}
              className="border-[rgba(0,128,128,0.2)] bg-white text-[#3D5A58] hover:bg-[#F4F9F8] text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deletingAutopilot && deleteMutation.mutate(deletingAutopilot.id)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Autopilot</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
