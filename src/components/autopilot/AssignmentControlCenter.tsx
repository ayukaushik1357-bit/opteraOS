import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sliders,
  Plus,
  Trash2,
  Play,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Briefcase,
  Sparkles,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
  listAssignmentRules,
  saveAssignmentRule,
  deleteAssignmentRule,
  resolveWorkAssignment,
  type AssignmentRuleRecord,
} from "@/lib/assignment.functions";
import { listWorkGroups } from "@/lib/workgroups.functions";
import { listCustomerGroups } from "@/lib/customergroups.functions";

interface AssignmentProps {
  orgId: string;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  new_lead: "Inbound Lead Created",
  new_customer: "Customer Account Created",
  overdue_invoice: "Invoice Becomes Overdue",
  at_risk_customer: "Customer Inactive >14 Days",
  task_escalation: "Task Blocked / Overdue",
  deal_stage_change: "Opportunity Stage Advanced",
  custom_event: "Custom Automation Trigger",
};

export function AssignmentControlCenter({ orgId }: AssignmentProps) {
  const queryClient = useQueryClient();
  const fetchRules = useServerFn(listAssignmentRules);
  const saveRule = useServerFn(saveAssignmentRule);
  const deleteRule = useServerFn(deleteAssignmentRule);
  const testResolver = useServerFn(resolveWorkAssignment);
  const fetchWorkGroups = useServerFn(listWorkGroups);
  const fetchCustomerGroups = useServerFn(listCustomerGroups);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [simulatorResult, setSimulatorResult] = useState<any>(null);

  // Form states
  const [ruleName, setRuleName] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<any>("new_lead");
  const [customerGroupId, setCustomerGroupId] = useState<string>("");
  const [targetWorkGroupId, setTargetWorkGroupId] = useState<string>("");
  const [strategy, setStrategy] = useState<any>("round_robin");
  const [priority, setPriority] = useState(10);

  // Simulator state
  const [simEventType, setSimEventType] = useState<any>("new_lead");
  const [simWorkGroupId, setSimWorkGroupId] = useState<string>("");

  const { data: rules = [], isLoading: loadingRules } = useQuery({
    queryKey: ["assignment_rules", orgId],
    queryFn: () => fetchRules({ data: { orgId } }),
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

  const saveMutation = useMutation({
    mutationFn: () =>
      saveRule({
        data: {
          orgId,
          name: ruleName.trim(),
          description: description.trim(),
          eventType,
          customerGroupId: customerGroupId || undefined,
          targetWorkGroupId: targetWorkGroupId || undefined,
          strategy,
          priority: Number(priority) || 10,
        },
      }),
    onSuccess: () => {
      toast.success("Assignment rule saved!");
      setCreateModalOpen(false);
      setRuleName("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["assignment_rules", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to save rule"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (rule: AssignmentRuleRecord) =>
      saveRule({
        data: {
          id: rule.id,
          orgId,
          name: rule.name,
          description: rule.description || "",
          eventType: rule.event_type,
          customerGroupId: rule.customer_group_id || undefined,
          targetWorkGroupId: rule.target_work_group_id || undefined,
          strategy: rule.strategy,
          active: !rule.active,
          priority: rule.priority,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment_rules", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update rule"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRule({ data: { orgId, id } }),
    onSuccess: () => {
      toast.success("Assignment rule deleted");
      queryClient.invalidateQueries({ queryKey: ["assignment_rules", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete rule"),
  });

  const simulateMutation = useMutation({
    mutationFn: () =>
      testResolver({
        data: {
          orgId,
          eventType: simEventType,
          workGroupId: simWorkGroupId || undefined,
        },
      }),
    onSuccess: (res) => {
      setSimulatorResult(res);
      toast.success("Simulation resolved successfully");
    },
    onError: (err: any) => toast.error(err.message || "Simulation error"),
  });

  return (
    <div className="space-y-8">
      {/* ── Top Header ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-400" />
            <span>Assignment Rules & Routing Control Center</span>
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Configure intelligent routing logic connecting Customer Groups & Events to Employee Work Groups.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>New Routing Rule</span>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left 2 cols: Active Routing Rules List ───────────────────── */}
        <div className="space-y-4 lg:col-span-2">
          {loadingRules ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <Sliders className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">No Routing Rules Configured</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                Create routing rules to automatically distribute incoming leads and tasks across your work groups.
              </p>
              <Button
                size="sm"
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Routing Rule</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 text-xs transition-all ${
                    rule.active
                      ? "border-[#E2E8F0] bg-card hover:border-indigo-500/40"
                      : "border-[#E2E8F0] bg-secondary/10 opacity-60"
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground text-sm">{rule.name}</h4>
                      <Badge variant="outline" className="text-[10px] font-mono border-[#E2E8F0]">
                        {rule.strategy.replace("_", " ")}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        Priority: {rule.priority}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      {rule.description || `Routes ${EVENT_TYPE_LABELS[rule.event_type] || rule.event_type}`}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px] text-muted-foreground">
                      <span className="rounded bg-secondary/40 px-2 py-0.5 border border-[#E2E8F0]">
                        ⚡ {EVENT_TYPE_LABELS[rule.event_type] || rule.event_type}
                      </span>
                      <span>→</span>
                      {rule.target_work_group ? (
                        <span className="flex items-center gap-1 rounded bg-indigo-500/10 px-2 py-0.5 text-indigo-300 border border-indigo-500/20 font-medium">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: rule.target_work_group.color }}
                          />
                          {rule.target_work_group.name}
                        </span>
                      ) : (
                        <span className="text-[#6B7280]">All Organization Members</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {rule.active ? "Active" : "Paused"}
                      </span>
                      <Switch
                        checked={rule.active}
                        onCheckedChange={() => toggleActiveMutation.mutate(rule)}
                        disabled={toggleActiveMutation.isPending}
                      />
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(rule.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right col: Live Routing Simulator ────────────────────────── */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <h3 className="font-semibold text-foreground text-sm">Live Routing Simulator</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Test how opteraOS will assign work items based on your configured strategies and live member workloads.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Simulate Event</label>
              <Select value={simEventType} onValueChange={setSimEventType}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  {Object.entries(EVENT_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Target Work Group (optional)</label>
              <Select value={simWorkGroupId} onValueChange={setSimWorkGroupId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Auto-detect from rules..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  <SelectItem value="all">Auto-resolve rule</SelectItem>
                  {workGroups.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              onClick={() => simulateMutation.mutate()}
              disabled={simulateMutation.isPending}
              className="w-full gap-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:opacity-95 text-white text-xs shadow-md"
            >
              {simulateMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              <span>Run Assignment Simulation</span>
            </Button>

            {simulatorResult && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-3.5 space-y-2 mt-4 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Assignee Selected:</span>
                </div>
                <p className="text-sm font-bold text-white">{simulatorResult.assignedUserName}</p>
                <p className="text-[11px] text-[#374151]">{simulatorResult.reason}</p>
                <div className="text-[10px] font-mono text-[#6B7280] pt-1 border-t border-[#E2E8F0]">
                  Strategy: {simulatorResult.strategy} · Rule: {simulatorResult.matchedRuleName || "Default"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal: Create Assignment Rule ────────────────────────────── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md border-[#E2E8F0] bg-white text-[#111827] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">Create Assignment Rule</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Direct events to appropriate employee work groups with custom assignment algorithms.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Rule Name</label>
              <Input
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g. Inbound Enterprise Lead Distributor"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Event Trigger</label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  {Object.entries(EVENT_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Customer Group (optional)</label>
              <Select value={customerGroupId} onValueChange={setCustomerGroupId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  <SelectItem value="none">Any Customer</SelectItem>
                  {customerGroups.map((cg) => (
                    <SelectItem key={cg.id} value={cg.id}>
                      {cg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Target Employee Work Group</label>
              <Select value={targetWorkGroupId} onValueChange={setTargetWorkGroupId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Select Work Group..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  {workGroups.map((wg) => (
                    <SelectItem key={wg.id} value={wg.id}>
                      {wg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Assignment Strategy</label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  <SelectItem value="round_robin">Round Robin (Equal Rotation)</SelectItem>
                  <SelectItem value="lowest_workload">Lowest Workload (Capacity Balancer)</SelectItem>
                  <SelectItem value="skill_based">Skill Based Match</SelectItem>
                  <SelectItem value="ai_assignment">AI Dispatcher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
              className="text-xs border-white/20 bg-[#F8FAFC] text-[#1F2937] hover:bg-white/[0.1] hover:text-white font-medium shadow-sm"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!ruleName.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
