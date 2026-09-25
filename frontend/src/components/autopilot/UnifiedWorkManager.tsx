import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Trash2,
  UserCheck,
  Building2,
  Sparkles,
  AlertCircle,
  CheckSquare,
  MessageSquare,
  FileCheck,
  Loader2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  listTasks,
  saveTask,
  setTaskStatus,
  deleteTask,
  assignAndExecuteCustomerTask,
  type UnifiedWorkItem,
} from "@/lib/tasks.functions";
import { listCustomersPaginated } from "@/lib/crm.functions";
import { listWorkGroups } from "@/lib/workgroups.functions";
import { getTeam } from "@/lib/workspace.functions";

interface WorkManagerProps {
  orgId: string;
}

const WORK_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  task: { label: "Standard Task", color: "bg-slate-500/20 text-[#374151]" },
  lead_follow_up: { label: "Lead Follow-up", color: "bg-cyan-500/20 text-cyan-300" },
  customer_follow_up: { label: "Customer Outreach", color: "bg-emerald-500/20 text-emerald-300" },
  invoice_follow_up: { label: "Invoice Recovery", color: "bg-amber-500/20 text-amber-300" },
  approval: { label: "Leadership Approval", color: "bg-purple-500/20 text-purple-300" },
  escalation: { label: "Priority Escalation", color: "bg-rose-500/20 text-rose-300" },
  ai_action: { label: "AI Action Item", color: "bg-indigo-500/20 text-indigo-300" },
};

export function UnifiedWorkManager({ orgId }: WorkManagerProps) {
  const queryClient = useQueryClient();
  const fetchWork = useServerFn(listTasks);
  const save = useServerFn(saveTask);
  const assignAndExecute = useServerFn(assignAndExecuteCustomerTask);
  const updateStatus = useServerFn(setTaskStatus);
  const remove = useServerFn(deleteTask);
  const fetchWorkGroups = useServerFn(listWorkGroups);
  const fetchTeam = useServerFn(getTeam);
  const fetchCustomers = useServerFn(listCustomersPaginated);

  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [activeWorkItem, setActiveWorkItem] = useState<UnifiedWorkItem | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");

  // Create Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workType, setWorkType] = useState<any>("customer_follow_up");
  const [priority, setPriority] = useState<any>("Medium");
  const [customerId, setCustomerId] = useState("");
  const [workGroupId, setWorkGroupId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [autoExecute, setAutoExecute] = useState(true);

  const { data: workItems = [], isLoading } = useQuery({
    queryKey: ["tasks", orgId, filterType, filterStatus],
    queryFn: () => fetchWork({ data: { orgId, workType: filterType, status: filterStatus } }),
    enabled: !!orgId,
  });

  const { data: workGroups = [] } = useQuery({
    queryKey: ["work_groups", orgId],
    queryFn: () => fetchWorkGroups({ data: { orgId } }),
    enabled: !!orgId,
  });

  const { data: teamData } = useQuery({
    queryKey: ["team", orgId],
    queryFn: () => fetchTeam({ data: { orgId } }),
    enabled: !!orgId,
  });

  const { data: customerData } = useQuery({
    queryKey: ["customers_compact", orgId],
    queryFn: () => fetchCustomers({ data: { orgId, page: 1, pageSize: 100 } }),
    enabled: !!orgId && createModalOpen,
  });

  const customers = customerData?.rows ?? [];
  const allMembers = teamData?.members ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      if (customerId && autoExecute) {
        return assignAndExecute({
          data: {
            orgId,
            customerId,
            title: title.trim(),
            description: description.trim(),
            workType,
            priority,
            workGroupId: workGroupId && workGroupId !== "none" ? workGroupId : undefined,
            assigneeId: assigneeId && assigneeId !== "none" ? assigneeId : undefined,
            dueDate: dueDate || undefined,
            autoExecute: true,
          },
        });
      } else {
        return save({
          data: {
            orgId,
            title: title.trim(),
            description: description.trim(),
            workType,
            priority,
            customerId: customerId || undefined,
            workGroupId: workGroupId && workGroupId !== "none" ? workGroupId : undefined,
            assigneeId: assigneeId && assigneeId !== "none" ? assigneeId : undefined,
            dueDate: dueDate || undefined,
            source: "manual",
          },
        });
      }
    },
    onSuccess: (res: any) => {
      if (res?.execution?.outcomeSummary) {
        toast.success(`Autopilot executed customer task for ${res.customerName}!`);
      } else {
        toast.success("Work item created!");
      }
      setCreateModalOpen(false);
      setTitle("");
      setDescription("");
      setCustomerId("");
      queryClient.invalidateQueries({ queryKey: ["tasks", orgId] });
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create work item"),
  });

  const completeMutation = useMutation({
    mutationFn: () => {
      if (!activeWorkItem) throw new Error("No work item selected");
      return updateStatus({
        data: {
          id: activeWorkItem.id,
          status: "Completed",
          outcomeNotes: outcomeNotes.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Work item marked as completed!");
      setCompleteModalOpen(false);
      setActiveWorkItem(null);
      setOutcomeNotes("");
      queryClient.invalidateQueries({ queryKey: ["tasks", orgId] });
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to complete item"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Work item deleted");
      queryClient.invalidateQueries({ queryKey: ["tasks", orgId] });
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete item"),
  });

  return (
    <div className="space-y-6">
      {/* ── Header Bar & Controls ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-indigo-400" />
            <span>Unified Business Work & Execution Items</span>
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            All work generated by Autopilot, human employees, and AI across CRM, finance, and customer success in a single actionable view.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>New Work Item</span>
        </Button>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-card p-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span className="font-semibold text-[11px] uppercase tracking-wider">Filters:</span>
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Work Type" />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
            <SelectItem value="all">All Work Types</SelectItem>
            <SelectItem value="lead_follow_up">Lead Follow-up</SelectItem>
            <SelectItem value="customer_follow_up">Customer Outreach</SelectItem>
            <SelectItem value="invoice_follow_up">Invoice Recovery</SelectItem>
            <SelectItem value="ai_action">AI Action</SelectItem>
            <SelectItem value="approval">Approval</SelectItem>
            <SelectItem value="task">Standard Task</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Todo">Todo</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Work Items Table ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : workItems.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted-foreground">
            No work items match current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2E8F0] bg-secondary/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Work Item</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Assigned Group & Person</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status & Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {workItems.map((item) => {
                  const badge = WORK_TYPE_BADGES[item.work_type] || WORK_TYPE_BADGES["task"] || { label: "Task", color: "bg-slate-500/20 text-[#374151]" };
                  const isDone = item.status === "Completed";

                  return (
                    <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-4 min-w-[220px]">
                        <div className="flex items-start gap-2">
                          <div>
                            <p className={`font-semibold ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {item.title}
                            </p>
                            {item.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                {item.description}
                              </p>
                            )}
                            {item.outcome_notes && (
                              <p className="text-[10px] text-emerald-400 font-mono mt-1">
                                ✓ Outcome: {item.outcome_notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className={`text-[10px] border-0 ${badge.color}`}>
                          {badge.label}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">{item.assignee_name}</p>
                          {item.work_group_name && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: item.work_group_color || "#8B5CF6" }}
                              />
                              {item.work_group_name}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant={
                            item.priority === "Urgent"
                              ? "destructive"
                              : item.priority === "High"
                              ? "default"
                              : "outline"
                          }
                          className="text-[10px] py-0"
                        >
                          {item.priority}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground text-[11px]">
                        <span className={`font-medium ${isDone ? "text-emerald-400" : "text-amber-400"}`}>
                          {item.status}
                        </span>
                        {item.due_date && <span className="block text-[10px]">Due {item.due_date}</span>}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isDone && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActiveWorkItem(item);
                                setCompleteModalOpen(true);
                              }}
                              className="h-7 text-[11px] gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Complete</span>
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(item.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
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

      {/* ── Modal: Complete Work with Outcome Notes ──────────────────── */}
      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent className="max-w-md border-[#E2E8F0] bg-white text-[#111827] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">Complete Work Item</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Record verified outcome notes and business results before closing this item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="font-semibold text-[#1F2937]">{activeWorkItem?.title}</p>
            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Outcome Notes / Resolution</label>
              <Input
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="e.g. Spoke with client, deal committed for Q3, contract sent"
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompleteModalOpen(false)}
              className="text-xs border-white/20 bg-[#F8FAFC] text-[#1F2937] hover:bg-white/[0.1] hover:text-white font-medium shadow-sm"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={completeMutation.isPending}
              onClick={() => completeMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
            >
              {completeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verify & Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Create Work Item ──────────────────────────────────── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md border-[#E2E8F0] bg-white text-[#111827] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">Create Work Item</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Add a first-class actionable work item assigned to an employee or work group.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Follow up on Enterprise Demo Proposal"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Assign to Customer (Optional)</label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Select Customer..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827] max-h-52">
                  <SelectItem value="">-- No Customer (Internal) --</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Work Type</label>
              <Select value={workType} onValueChange={setWorkType}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  <SelectItem value="customer_follow_up">Customer Outreach</SelectItem>
                  <SelectItem value="task">Standard Task</SelectItem>
                  <SelectItem value="lead_follow_up">Lead Follow-up</SelectItem>
                  <SelectItem value="invoice_follow_up">Invoice Recovery</SelectItem>
                  <SelectItem value="approval">Leadership Approval</SelectItem>
                  <SelectItem value="ai_action">AI Action</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Target Work Group</label>
              <Select value={workGroupId} onValueChange={setWorkGroupId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Optional Work Group" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
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
              <label className="text-[11px] font-semibold text-[#374151]">Assignee</label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Select Assignee..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  {allMembers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.full_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-[#374151]">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#374151]">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {customerId && (
              <div className="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-2.5 mt-1">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-indigo-200 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-cyan-400" />
                    <span>Execute with Autopilot Now</span>
                  </div>
                  <p className="text-[10px] text-[#6B7280]">
                    Reason with Gemini & execute immediately
                  </p>
                </div>
                <Switch checked={autoExecute} onCheckedChange={setAutoExecute} />
              </div>
            )}
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
              disabled={!title.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Executing Autopilot…
                </>
              ) : customerId && autoExecute ? (
                <>
                  <Zap className="mr-1.5 h-3.5 w-3.5 text-cyan-300" />
                  Execute & Save
                </>
              ) : (
                "Create Work Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
