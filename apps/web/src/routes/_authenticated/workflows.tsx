import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Zap, Play, CheckCircle2, XCircle, Clock } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/components/app/AppShell";
import {
  listWorkflows,
  saveWorkflow,
  toggleWorkflow,
  deleteWorkflow,
  listWorkflowExecutions,
} from "@/lib/workflows.functions";
import { shortDate } from "@/lib/format";

const title = "Automation & Workflows — opteraOS";
const description = "Automate repetitive operational tasks with triggers, n8n integrations, and execution logs.";

export const Route = createFileRoute("/_authenticated/workflows")({
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
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();
  const fetchWorkflows = useServerFn(listWorkflows);
  const fetchExecutions = useServerFn(listWorkflowExecutions);
  const save = useServerFn(saveWorkflow);
  const toggle = useServerFn(toggleWorkflow);
  const remove = useServerFn(deleteWorkflow);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{
    id?: string;
    name: string;
    description: string;
    triggerType: string;
    webhookUrl: string;
    active: boolean;
  }>({
    name: "",
    description: "",
    triggerType: "customer.created",
    webhookUrl: "",
    active: true,
  });

  const { data: workflows, isLoading: loadingWf } = useQuery({
    queryKey: ["workflows", current?.id],
    queryFn: () => fetchWorkflows({ data: { orgId: current!.id } }),
    enabled: !!current,
  });

  const { data: executions, isLoading: loadingExec } = useQuery({
    queryKey: ["workflow_executions", current?.id],
    queryFn: () => fetchExecutions({ data: { orgId: current!.id } }),
    enabled: !!current,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["workflows", current?.id] });
    queryClient.invalidateQueries({ queryKey: ["workflow_executions", current?.id] });
  };

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { ...editing, orgId: current!.id } }),
    onSuccess: () => {
      toast.success(editing.id ? "Workflow updated" : "Workflow created");
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      toggle({ data: { id, active } }),
    onSuccess: () => {
      toast.success("Workflow status updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Workflow deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEditing({
      name: "",
      description: "",
      triggerType: "customer.created",
      webhookUrl: "",
      active: true,
    });
    setOpen(true);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Automation & Workflows</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect business events to automated triggers, external webhooks, and n8n orchestration.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-brand text-primary-foreground" onClick={openNew}>
              <Plus className="mr-1 h-4 w-4" /> Create workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit Workflow" : "Create Workflow"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="w-name">Workflow Name</Label>
                <Input
                  id="w-name"
                  placeholder="e.g. New Lead Onboarding Sync"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="w-desc">Description</Label>
                <Input
                  id="w-desc"
                  placeholder="What does this workflow automate?"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Event Trigger</Label>
                <Select
                  value={editing.triggerType}
                  onValueChange={(v) => setEditing({ ...editing, triggerType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer.created">Customer Created</SelectItem>
                    <SelectItem value="lead.created">Lead Created</SelectItem>
                    <SelectItem value="deal.won">Deal Stage: Won</SelectItem>
                    <SelectItem value="invoice.overdue">Invoice Overdue</SelectItem>
                    <SelectItem value="task.completed">Task Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="w-webhook">n8n / Webhook URL (Optional)</Label>
                <Input
                  id="w-webhook"
                  placeholder="https://n8n.yourdomain.com/webhook/..."
                  value={editing.webhookUrl}
                  onChange={(e) => setEditing({ ...editing, webhookUrl: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="w-active">Enable Workflow</Label>
                <Switch
                  id="w-active"
                  checked={editing.active}
                  onCheckedChange={(c) => setEditing({ ...editing, active: c })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                className="bg-gradient-brand text-primary-foreground"
                disabled={editing.name.trim().length < 2 || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                Save workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="workflows" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="executions">Execution Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows">
          <div className="glass overflow-hidden rounded-2xl">
            {loadingWf ? (
              <div className="grid gap-2 p-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : (workflows ?? []).length === 0 ? (
              <div className="p-12 text-center">
                <Zap className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <h3 className="mt-4 text-base font-medium">No workflows active</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Automate notifications, customer onboarding, and n8n webhooks automatically.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>n8n / Webhook</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(workflows ?? []).map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">
                        {w.name}
                        {w.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{w.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{w.trigger_type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono max-w-xs truncate">
                        {w.webhook_url ?? "Internal Action"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={w.active}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: w.id, active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{shortDate(w.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing({
                              id: w.id,
                              name: w.name,
                              description: w.description ?? "",
                              triggerType: w.trigger_type,
                              webhookUrl: w.webhook_url ?? "",
                              active: w.active,
                            });
                            setOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(w.id)}
                          aria-label={`Delete ${w.name}`}
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
        </TabsContent>

        <TabsContent value="executions">
          <div className="glass overflow-hidden rounded-2xl">
            {loadingExec ? (
              <div className="grid gap-2 p-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : (executions ?? []).length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <h3 className="mt-4 text-base font-medium">No execution history</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Executed workflows and n8n webhook responses will appear here in real time.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Trigger Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(executions ?? []).map((ex) => (
                    <TableRow key={ex.id}>
                      <TableCell className="font-medium">
                        {(ex.workflows as { name?: string })?.name ?? "Automation"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ex.trigger_event}</Badge>
                      </TableCell>
                      <TableCell>
                        {ex.status === "successful" ? (
                          <span className="inline-flex items-center text-xs font-medium text-emerald-500 gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Successful
                          </span>
                        ) : ex.status === "failed" ? (
                          <span className="inline-flex items-center text-xs font-medium text-destructive gap-1">
                            <XCircle className="h-3.5 w-3.5" /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium text-blue-500 gap-1">
                            <Play className="h-3.5 w-3.5" /> Running
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{shortDate(ex.started_at)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-xs">
                        {ex.error_message ?? "Executed without errors"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
