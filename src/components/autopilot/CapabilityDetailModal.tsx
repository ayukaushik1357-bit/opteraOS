import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Clock,
  Users,
  Briefcase,
  Loader2,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  type CapabilityDefinition,
  type CapabilityStatus,
} from "@/lib/capabilities.config";
import {
  executeCapabilityDirectly,
  saveAutopilot,
} from "@/lib/autopilot.functions";
import { listWorkGroups } from "@/lib/workgroups.functions";
import { getTeam } from "@/lib/workspace.functions";

interface CapabilityDetailModalProps {
  capability: CapabilityDefinition | null;
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDailyReport?: () => void;
}

export function CapabilityDetailModal({
  capability,
  orgId,
  open,
  onOpenChange,
  onOpenDailyReport,
}: CapabilityDetailModalProps) {
  const queryClient = useQueryClient();
  const executeDirect = useServerFn(executeCapabilityDirectly);
  const saveAp = useServerFn(saveAutopilot);
  const fetchWorkGroups = useServerFn(listWorkGroups);
  const fetchTeam = useServerFn(getTeam);

  const { data: workGroups = [] } = useQuery({
    queryKey: ["work_groups", orgId],
    queryFn: () => fetchWorkGroups({ data: { orgId } }),
    enabled: open && !!orgId,
  });

  const { data: teamData } = useQuery({
    queryKey: ["team", orgId],
    queryFn: () => fetchTeam({ data: { orgId } }),
    enabled: open && !!orgId,
  });

  const teamMembers = teamData?.members ?? [];

  // Configuration state
  const [recipientType, setRecipientType] = useState<"me" | "selected_member" | "work_group" | "custom">("me");
  const [selectedRecipientMemberId, setSelectedRecipientMemberId] = useState<string>("");
  const [selectedRecipientGroupId, setSelectedRecipientGroupId] = useState<string>("");
  const [customRecipient, setCustomRecipient] = useState<string>("");

  const [scheduleType, setScheduleType] = useState<"run_now" | "daily" | "weekdays" | "weekly" | "custom">("run_now");
  const [customSchedule, setCustomSchedule] = useState<string>("Every day at 9:00 AM");

  const [assignmentType, setAssignmentType] = useState<"individual" | "work_group" | "multiple_members" | "ai_assignment">(
    capability?.assignmentSupported ? "work_group" : "individual"
  );
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedWorkGroupId, setSelectedWorkGroupId] = useState<string>("");
  const [selectedStrategy, setSelectedStrategy] = useState<"round_robin" | "lowest_workload" | "skill_based" | "performance_based" | "ai_assignment" | "direct">(
    capability?.defaultAssignmentStrategy || "round_robin"
  );

  // Execution result state
  const [executionResult, setExecutionResult] = useState<any | null>(null);

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!capability) return;
      return await executeDirect({
        data: {
          orgId,
          capabilityId: capability.id,
          assignmentType,
          targetUserId: selectedUserId || undefined,
          targetWorkGroupId: selectedWorkGroupId || undefined,
          assignmentStrategy: selectedStrategy,
          schedule: scheduleType === "run_now" ? "Immediate Run" : customSchedule,
          recipientType,
          recipientCustom: customRecipient || undefined,
        },
      });
    },
    onSuccess: (res: any) => {
      setExecutionResult(res);
      if (res?.executionStatus === "blocked_by_config") {
        toast.warning(`${capability?.name} executed locally: external provider is not configured.`);
      } else {
        toast.success(`${capability?.name} executed successfully`);
      }
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", orgId] });
      queryClient.invalidateQueries({ queryKey: ["workflow_executions", orgId] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!capability) return;
      let scheduleStr = "Every weekday at 9:00 AM";
      if (scheduleType === "daily") scheduleStr = "Every day at 9:00 AM";
      if (scheduleType === "weekly") scheduleStr = "Every Monday at 9:00 AM";
      if (scheduleType === "custom") scheduleStr = customSchedule;

      return await saveAp({
        data: {
          orgId,
          name: capability.name,
          description: capability.description,
          category: capability.category === "customers" ? "customer_success" : (capability.category as any),
          active: true,
          triggerType: capability.defaultTrigger || "schedule_cron",
          schedule: scheduleStr,
          humanSummary: `Autonomous ${capability.name} operational sequence`,
          targetWorkGroupId: selectedWorkGroupId || undefined,
          targetUserId: selectedUserId || undefined,
          assignmentType,
          assignmentStrategy: selectedStrategy,
          actions: capability.steps.map((s) => ({ step: s.step, title: s.title, description: s.description, tool: s.tool })),
          conditions: [],
          config: {
            capabilityId: capability.id,
            recipientType,
            recipientCustom: customRecipient,
          },
        },
      });
    },
    onSuccess: () => {
      toast.success(`${capability?.name} configured and activated as Autopilot`);
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
      queryClient.invalidateQueries({ queryKey: ["workflows", orgId] });
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  if (!capability) return null;

  function renderStatusBadge(status: CapabilityStatus) {
    if (status === "LIVE") {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[11px] font-semibold">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <span>LIVE</span>
        </Badge>
      );
    }
    if (status === "PARTIALLY_CONNECTED") {
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[11px] font-semibold">
          <AlertTriangle className="h-3 w-3 text-amber-600" />
          <span>CONFIG REQUIRED</span>
        </Badge>
      );
    }
    if (status === "NOT_CONNECTED") {
      return (
        <Badge className="bg-rose-50 text-rose-700 border-rose-200 gap-1 text-[11px] font-semibold">
          <XCircle className="h-3 w-3 text-rose-600" />
          <span>NOT CONNECTED</span>
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-50 text-red-700 border-red-200 gap-1 text-[11px] font-semibold">
        <XCircle className="h-3 w-3 text-red-600" />
        <span>FAILED</span>
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-[#E2E8F0] bg-white text-[#111827] shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-[#E2E8F0] pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Zap className="h-5 w-5 text-blue-600" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold text-[#111827] tracking-tight">
                  {capability.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6B7280] mt-0.5">
                  Category: <span className="uppercase font-semibold text-[#374151]">{capability.category}</span> · {capability.description}
                </DialogDescription>
              </div>
            </div>
            {renderStatusBadge(capability.status)}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4 text-xs">
          {/* ── Status & Backend Truth Box ──────────────────────────────── */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2">
            <div className="flex items-center gap-2 text-[#111827] font-semibold">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>Real Backend Execution Status</span>
            </div>
            <p className="text-xs text-[#4B5563] leading-relaxed">
              {capability.statusDetails}
            </p>
            {capability.missingComponent && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span>External Dependency: {capability.missingComponent}</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  {capability.providerRecommendation}
                </p>
              </div>
            )}
          </div>

          {/* ── WHAT WILL HAPPEN Pipeline ────────────────────────────────── */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>What Will Happen (Autonomous Pipeline)</span>
            </h4>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {capability.steps.map((step) => (
                <div
                  key={step.step}
                  className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-xs"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-700">
                    {step.step}
                  </span>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-[#111827] truncate">{step.title}</p>
                    <p className="text-[11px] text-[#6B7280] leading-tight line-clamp-2">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Configuration Parameters Grid ───────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-[#E2E8F0]">
            {/* Left: Recipient & Target */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-[#374151] flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                <span>Recipient / Target</span>
              </Label>
              <Select value={recipientType} onValueChange={(v: any) => setRecipientType(v)}>
                <SelectTrigger className="bg-white border-[#CBD5E1] text-xs text-[#111827]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E2E8F0] text-[#111827]">
                  <SelectItem value="me">Assigned User / Workspace Owner</SelectItem>
                  <SelectItem value="selected_member">Selected Team Member</SelectItem>
                  <SelectItem value="work_group">Dedicated Work Group</SelectItem>
                  <SelectItem value="custom">Custom Email Address</SelectItem>
                </SelectContent>
              </Select>

              {recipientType === "selected_member" && (
                <Select value={selectedRecipientMemberId} onValueChange={setSelectedRecipientMemberId}>
                  <SelectTrigger className="bg-white border-[#CBD5E1] text-xs text-[#111827]">
                    <SelectValue placeholder="Choose Team Member" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E2E8F0] text-[#111827]">
                    {teamMembers.map((m: any) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.full_name || m.email} ({m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {recipientType === "work_group" && (
                <Select value={selectedRecipientGroupId} onValueChange={setSelectedRecipientGroupId}>
                  <SelectTrigger className="bg-white border-[#CBD5E1] text-xs text-[#111827]">
                    <SelectValue placeholder="Choose Work Group" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E2E8F0] text-[#111827]">
                    {workGroups.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {recipientType === "custom" && (
                <Input
                  placeholder="recipient@example.com"
                  value={customRecipient}
                  onChange={(e) => setCustomRecipient(e.target.value)}
                  className="bg-white border-[#CBD5E1] text-xs text-[#111827]"
                />
              )}
            </div>

            {/* Right: Schedule & Trigger */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-[#374151] flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                <span>Schedule & Trigger</span>
              </Label>
              <Select value={scheduleType} onValueChange={(v: any) => setScheduleType(v)}>
                <SelectTrigger className="bg-white border-[#CBD5E1] text-xs text-[#111827]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E2E8F0] text-[#111827]">
                  <SelectItem value="run_now">Run Now (Immediate Test Execution)</SelectItem>
                  <SelectItem value="weekdays">Every Weekday (Mon-Fri 9:00 AM)</SelectItem>
                  <SelectItem value="daily">Every Day at 9:00 AM</SelectItem>
                  <SelectItem value="weekly">Every Monday at 9:00 AM</SelectItem>
                  <SelectItem value="custom">Custom Cron Expression</SelectItem>
                </SelectContent>
              </Select>

              {scheduleType === "custom" && (
                <Input
                  placeholder="e.g. Every 2 hours or cron 0 */2 * * *"
                  value={customSchedule}
                  onChange={(e) => setCustomSchedule(e.target.value)}
                  className="bg-white border-[#CBD5E1] text-xs text-[#111827]"
                />
              )}
            </div>
          </div>

          {/* ── Assignment & Responsibility Section ─────────────────────── */}
          {capability.assignmentSupported && (
            <div className="space-y-4 pt-2 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#374151] flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Work Assignment & Routing Responsibility</span>
                </Label>
                <Badge variant="outline" className="text-[10px] font-mono border-blue-200 text-blue-700 bg-blue-50/50">
                  Real DB Entities
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-semibold text-[#6B7280]">Assignment Target</span>
                  <Select value={assignmentType} onValueChange={(v: any) => setAssignmentType(v)}>
                    <SelectTrigger className="bg-white border-[#CBD5E1] text-xs text-[#111827]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E2E8F0] text-[#111827]">
                      <SelectItem value="work_group">Work Group (Team)</SelectItem>
                      <SelectItem value="individual">Individual Member</SelectItem>
                      <SelectItem value="multiple_members">Multiple Members</SelectItem>
                      <SelectItem value="ai_assignment">AI Dispatcher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-semibold text-[#6B7280]">Target Group / Member</span>
                  {assignmentType === "work_group" || assignmentType === "multiple_members" ? (
                    <Select value={selectedWorkGroupId} onValueChange={setSelectedWorkGroupId}>
                      <SelectTrigger className="bg-white border-[#CBD5E1] text-xs text-[#111827]">
                        <SelectValue placeholder="Choose Work Group" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#E2E8F0] text-[#111827]">
                        {workGroups.map((g: any) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name} ({g.members_count || 0} members)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="bg-white border-[#CBD5E1] text-xs text-[#111827]">
                        <SelectValue placeholder="Choose Team Member" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#E2E8F0] text-[#111827]">
                        {teamMembers.map((m: any) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.full_name || m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-semibold text-[#6B7280]">Routing Strategy</span>
                  <Select value={selectedStrategy} onValueChange={(v: any) => setSelectedStrategy(v)}>
                    <SelectTrigger className="bg-white border-[#CBD5E1] text-xs text-[#111827]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E2E8F0] text-[#111827]">
                      <SelectItem value="round_robin">Round Robin</SelectItem>
                      <SelectItem value="lowest_workload">Lowest Workload</SelectItem>
                      <SelectItem value="skill_based">Skill Based</SelectItem>
                      <SelectItem value="performance_based">Performance Based</SelectItem>
                      <SelectItem value="ai_assignment">AI Dispatcher</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* ── Live Execution Trace Result ──────────────────────────────── */}
          {executionResult && (
            <div
              className={`rounded-xl border p-4 space-y-2 animate-in fade-in slide-in-from-top-2 ${
                executionResult.executionStatus === "blocked_by_config" || executionResult.executionStatus === "partial_success"
                  ? "border-amber-300 bg-amber-50 text-amber-950"
                  : executionResult.executionStatus === "successful"
                  ? "border-emerald-300 bg-emerald-50/70 text-emerald-950"
                  : "border-rose-300 bg-rose-50 text-rose-950"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-xs">
                  {executionResult.executionStatus === "blocked_by_config" || executionResult.executionStatus === "partial_success" ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Execution Completed locally · External Dispatch Blocked</span>
                    </>
                  ) : executionResult.executionStatus === "successful" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Database Task Executed in {executionResult.durationMs}ms</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>Execution Failed</span>
                    </>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] ${
                    executionResult.executionStatus === "blocked_by_config" || executionResult.executionStatus === "partial_success"
                      ? "border-amber-400 bg-amber-100 text-amber-800"
                      : executionResult.executionStatus === "successful"
                      ? "border-emerald-400 bg-emerald-100 text-emerald-800"
                      : "border-rose-400 bg-rose-100 text-rose-800"
                  }`}
                >
                  {executionResult.executionStatus === "blocked_by_config"
                    ? "BLOCKED BY CONFIGURATION"
                    : executionResult.executionStatus.toUpperCase()}
                </Badge>
              </div>

              <div className="text-xs space-y-1 text-[#374151]">
                <p>• Assigned to: <strong className="text-[#111827]">{executionResult.assignedTo}</strong></p>
                {executionResult.taskId && (
                  <p>• Unified Task Created in DB (ID: <code className="text-blue-700 font-mono bg-blue-50 px-1 py-0.5 rounded">{executionResult.taskId}</code>)</p>
                )}
                {executionResult.statusNotice && (
                  <p className="font-medium text-amber-800">• Notice: {executionResult.statusNotice}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] pt-4">
          <div className="flex items-center gap-2">
            {capability.id === "comm_daily_reports" && onOpenDailyReport && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenDailyReport();
                }}
                className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50 gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                <span>Open Executive Briefing Drawer</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs border-[#E2E8F0] hover:bg-slate-50 text-[#4B5563]"
            >
              Cancel
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending || capability.status === "NOT_CONNECTED"}
              className="text-xs border-blue-300 text-blue-700 bg-blue-50/50 hover:bg-blue-100/60 gap-1.5 font-medium"
            >
              {runMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-blue-600 text-blue-600" />
              )}
              <span>Run Now (Live Test)</span>
            </Button>

            <Button
              size="sm"
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending || capability.status === "NOT_CONNECTED"}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-sm"
            >
              {activateMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              <span>Configure & Activate</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
