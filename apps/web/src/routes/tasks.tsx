import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { listTasks, saveTask, setTaskStatus, deleteTask } from "@/lib/tasks.functions";
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

function priorityBadgeVariant(p: Priority) {
  switch (p) {
    case "Urgent":
      return "destructive";
    case "High":
      return "default";
    case "Medium":
      return "secondary";
    default:
      return "outline";
  }
}

function TasksPage() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();
  const fetchTasks = useServerFn(listTasks);
  const save = useServerFn(saveTask);
  const updateStatus = useServerFn(setTaskStatus);
  const remove = useServerFn(deleteTask);

  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks", current?.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", current?.id] });
  };

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { ...editing, orgId: current!.id } }),
    onSuccess: () => {
      toast.success(editing.id ? "Task updated" : "Task created");
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
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
            Manage team activities, follow-ups, and operational action items.
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
              <Button className="bg-gradient-brand text-primary-foreground" onClick={openNew}>
                <Plus className="mr-1 h-4 w-4" /> New task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing.id ? "Edit Task" : "New Task"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="t-title">Title</Label>
                  <Input
                    id="t-title"
                    placeholder="e.g. Follow up on proposal"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="t-desc">Description</Label>
                  <Input
                    id="t-desc"
                    placeholder="Optional details or context"
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
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
                  <div className="grid gap-2">
                    <Label>Status</Label>
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
                <div className="grid gap-2">
                  <Label htmlFor="t-due">Due Date</Label>
                  <Input
                    id="t-due"
                    type="date"
                    value={editing.dueDate}
                    onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  className="bg-gradient-brand text-primary-foreground"
                  disabled={editing.title.trim().length < 2 || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  Save task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
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
              Add your first task or use optera AI to generate follow-up tasks automatically.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Task Title</TableHead>
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
                    <span className={t.status === "Completed" ? "line-through text-muted-foreground" : ""}>
                      {t.title}
                    </span>
                    {t.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-md">{t.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityBadgeVariant(t.priority as Priority)}>
                      {t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
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
