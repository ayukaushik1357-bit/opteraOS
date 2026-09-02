import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { useWorkspace } from "@/components/app/AppShell";
import { WorkflowCanvas } from "@/components/workflows/WorkflowCanvas";
import { Button } from "@/components/ui/button";
import {
  getWorkflow,
  saveWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  testWorkflowExecution,
} from "@/lib/workflows.functions";

export const Route = createFileRoute("/_authenticated/workflows/$workflowId")({
  component: EditWorkflowPage,
});

function EditWorkflowPage() {
  const { workflowId } = useParams({ from: "/_authenticated/workflows/$workflowId" });
  const { current } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchWorkflow = useServerFn(getWorkflow);
  const save = useServerFn(saveWorkflow);
  const remove = useServerFn(deleteWorkflow);
  const duplicate = useServerFn(duplicateWorkflow);
  const testExecution = useServerFn(testWorkflowExecution);

  const {
    data: workflow,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["workflow", workflowId, current?.id],
    queryFn: () => fetchWorkflow({ data: { id: workflowId, orgId: current!.id } }),
    enabled: !!current && !!workflowId && workflowId !== "new",
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!current) throw new Error("No active organization found");
      return save({
        data: {
          ...payload,
          id: workflowId,
          orgId: current.id,
        },
      });
    },
    onSuccess: () => {
      toast.success("Workflow saved successfully");
      queryClient.invalidateQueries({ queryKey: ["workflows", current?.id] });
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId, current?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save workflow");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!current) throw new Error("No active organization found");
      return duplicate({ data: { id: workflowId, orgId: current.id } });
    },
    onSuccess: (res: any) => {
      toast.success("Workflow duplicated");
      queryClient.invalidateQueries({ queryKey: ["workflows", current?.id] });
      if (res?.id) {
        navigate({ to: "/workflows/$workflowId", params: { workflowId: res.id } });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to duplicate workflow");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return remove({ data: { id: workflowId } });
    },
    onSuccess: () => {
      toast.success("Workflow deleted");
      queryClient.invalidateQueries({ queryKey: ["workflows", current?.id] });
      navigate({ to: "/workflows" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete workflow");
    },
  });

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">Loading visual workflow graph...</p>
      </div>
    );
  }

  if (isError || !workflow) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Unable to Load Workflow</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {(error as any)?.message || "The requested workflow does not exist or has been removed."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            Try Again
          </Button>
          <Button size="sm" onClick={() => navigate({ to: "/workflows" })} className="text-xs">
            Return to Workflows
          </Button>
        </div>
      </div>
    );
  }

  return (
    <WorkflowCanvas
      initialWorkflow={workflow}
      isSaving={saveMutation.isPending}
      onSave={async (wf) => {
        await saveMutation.mutateAsync(wf);
      }}
      onDuplicate={() => duplicateMutation.mutate()}
      onDelete={() => deleteMutation.mutate()}
      onTestExecution={async (data) => {
        if (!current) throw new Error("No organization selected");
        return testExecution({
          data: {
            orgId: current.id,
            workflowId,
            workflowName: workflow.name,
            nodes: data.nodes,
            edges: data.edges,
            triggerEvent: data.triggerEvent,
            payload: data.payload,
          },
        });
      }}
    />
  );
}
