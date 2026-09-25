import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Circle, Zap, Sparkles, Loader2, Building2, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/components/app/AppShell";
import {
  listTasks,
  saveTask,
  setTaskStatus,
  deleteTask,
  assignAndExecuteCustomerTask,
  type UnifiedWorkItem,
} from "@/lib/tasks.functions";
import { listCustomersPaginated } from "@/lib/crm.functions";
import { shortDate } from "@/lib/format";

const title = "Tasks — opteraOS";
const description = "Track, assign, and complete operational tasks across your organization.";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TasksPage,
});

type Priority = "Low" | "Medium" | "High" | "Urgent";
type Status = "Todo" | "In Progress" | "Completed" | "Cancelled";

function priorityBadge(p: Priority) {
  switch (p) {
    case "Urgent":
      return <Badge className="bg-red-50 text-red-700 border border-red-200">Urgent</Badge>;
    case "High":
      return <Badge className="bg-amber-50 text-amber-700 border border-amber-200">High</Badge>;
    case "Medium":
      return <Badge className="bg-blue-50 text-blue-700 border border-blue-200">Medium</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-700 border border-gray-200">Low</Badge>;
  }
}

function TasksPage() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();
  const fetchTasks = useServerFn(listTasks);
  const save = useServerFn(saveTask);
  const assignAndExecute = useServerFn(assignAndExecuteCustomerTask);
  const updateStatus = useServerFn(setTaskStatus);
  const remove = useServerFn(deleteTask);
  const fetchCustomers = useServerFn(listCustomersPaginated);

  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedWorkType, setSelectedWorkType] = useState<string>("customer_follow_up");
  const [autoExecute, setAutoExecute] = useState<boolean>(true);

  const [editing, setEditing] = useState<{
    id?: string;
    title: string;
    description: string;
    priority: Priority;
    status: Status;
    dueDate: string;
  }>({
    title: "",
    description: "",
    priority: "Medium",
    status: "Todo",
    dueDate: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", current?.id],
    queryFn: () => fetchTasks({ data: { orgId: current!.id } }),
    enabled: !!current,
  });

  const { data: customerData } = useQuery({
    queryKey: ["customers_compact", current?.id],
    queryFn: () => fetchCustomers({ data: { orgId: current!.id, page: 1, pageSize: 100 } }),
    enabled: !!current && open,
  });

  const customers = customerData?.rows ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks", current?.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", current?.id] });
    queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", current?.id] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (selectedCustomerId && autoExecute) {
        return assignAndExecute({
          data: {
            orgId: current!.id,
            customerId: selectedCustomerId,
            title: editing.title.trim(),
            description: editing.description.trim(),
            priority: editing.priority,
            workType: selectedWorkType as any,
            dueDate: editing.dueDate || undefined,
            autoExecute: true,
          },
        });
      } else {
        return save({
          data: {
            ...editing,
            orgId: current!.id,
            customerId: selectedCustomerId || undefined,
            workType: selectedWorkType as any,
            source: "manual",
          },
        });
      }
    },
    onSuccess: (res: any) => {
      if (res?.isBlocked) {
        toast.warning(`Autopilot: Action blocked (${res.execution?.blockedReason || "integration unavailable"})`);
      } else if (res?.execution?.status === "successful") {
        toast.success(`Autopilot executed ${res.execution.actionExecuted} for ${res.customerName}!`);
      } else {
        toast.success(editing.id ? "Task updated" : "Task created");
      }
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save and execute task"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) =>
      updateStatus({ data: { id, status } }),
    onSuccess: () => {
      toast.success("Task status updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Task deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setSelectedCustomerId("");
    setSelectedWorkType("customer_follow_up");
    setAutoExecute(true);
    setEditing({
      title: "",
      description: "",
      priority: "Medium",
      status: "Todo",
      dueDate: new Date().toISOString().substring(0, 10),
    });
    setOpen(true);
  }

  const tasksList = (data ?? []).filter((t) => filterStatus === "all" || t.status === filterStatus);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage team activities, customer assignments, and autonomous Autopilot executions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="Todo">Todo</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#008080] hover:bg-[#006666] text-white" onClick={openNew}>
                <Plus className="mr-1 h-4 w-4" /> New task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing.id ? "Edit Task" : "New Task & Customer Assignment"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="t-title">Task Title</Label>
                  <Input
                    id="t-title"
                    placeholder="e.g. Follow up on renewal & prepare growth plan"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Assign to Customer (Optional)</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="">-- No Customer (Internal Task) --</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="t-desc">Instructions / Description</Label>
                  <Input
                    id="t-desc"
                    placeholder="Provide context or guidance for execution"
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Work Type</Label>
                    <Select
                      value={selectedWorkType}
                      onValueChange={setSelectedWorkType}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer_follow_up">Customer Outreach</SelectItem>
                        <SelectItem value="task">Standard Task</SelectItem>
                        <SelectItem value="ai_action">AI Action Item</SelectItem>
                        <SelectItem value="lead_follow_up">Lead Follow-up</SelectItem>
                        <SelectItem value="invoice_follow_up">Invoice Recovery</SelectItem>
                        <SelectItem value="communication">Email Dispatch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Priority</Label>
                    <Select
                      value={editing.priority}
                      onValueChange={(v) => setEditing({ ...editing, priority: v as Priority })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="t-due">Due Date</Label>
                    <Input
                      id="t-due"
                      type="date"
                      value={editing.dueDate}
                      onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Initial Status</Label>
                    <Select
                      value={editing.status}
                      onValueChange={(v) => setEditing({ ...editing, status: v as Status })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todo">Todo</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedCustomerId && (
                  <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-blue-600" />
                        <span>Execute with Autopilot Now</span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Autopilot will query customer CRM records, reason with Gemini, and perform the action immediately.
                      </p>
                    </div>
                    <Switch checked={autoExecute} onCheckedChange={setAutoExecute} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  className="bg-[#008080] hover:bg-[#006666] text-white"
                  disabled={editing.title.trim().length < 2 || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executing Autopilot…
                    </>
                  ) : autoExecute && selectedCustomerId ? (
                    <>
                      <Zap className="mr-1.5 h-3.5 w-3.5" />
                      Execute & Save
                    </>
                  ) : (
                    "Save Task"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {isLoading ? (
          <div className="grid gap-2 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : tasksList.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-4 text-base font-medium">No tasks found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first task or use optera AI Autopilot to generate and execute customer actions.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Task Title & Details</TableHead>
                <TableHead>Customer / Assignment</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasksList.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <button
                      className="text-muted-foreground hover:text-primary transition-colors"
                      onClick={() =>
                        statusMutation.mutate({
                          id: t.id,
                          status: t.status === "Completed" ? "Todo" : "Completed",
                        })
                      }
                      title={t.status === "Completed" ? "Mark incomplete" : "Mark completed"}
                    >
                      {t.status === "Completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={t.status === "Completed" ? "line-through text-muted-foreground" : ""}>
                          {t.title}
                        </span>
                        {t.source === "autopilot" && (
                          <Badge variant="outline" className="text-[9px] font-mono border-blue-200 text-blue-700 bg-blue-50">
                            ⚡ Autopilot
                          </Badge>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-md">{t.description}</p>
                      )}
                      {t.outcome_notes && (
                        <div className="mt-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-[11px] text-slate-300 max-w-lg">
                          <span className="font-semibold text-emerald-400 block mb-0.5">Outcome Result:</span>
                          <p className="line-clamp-2">{t.outcome_notes}</p>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {t.customer_name ? (
                      <Badge variant="outline" className="text-xs border-white/10 text-cyan-300 gap-1">
                        <Building2 className="h-3 w-3" />
                        <span>{t.customer_name}</span>
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {priorityBadge(t.priority as Priority)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.status === "Completed" ? "default" : "secondary"}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {t.due_date ? shortDate(t.due_date) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing({
                          id: t.id,
                          title: t.title,
                          description: t.description ?? "",
                          priority: t.priority as Priority,
                          status: t.status as Status,
                          dueDate: t.due_date ?? "",
                        });
                        setSelectedCustomerId(t.customer_id ?? "");
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(t.id)}
                      aria-label={`Delete ${t.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
