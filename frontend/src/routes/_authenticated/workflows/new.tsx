import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspace } from "@/components/app/AppShell";
import { WorkflowCanvas } from "@/components/workflows/WorkflowCanvas";
import {
  saveWorkflow,
  testWorkflowExecution,
} from "@/lib/workflows.functions";
import { WORKFLOW_TEMPLATES } from "@/components/workflows/workflow-templates";

export const Route = createFileRoute("/_authenticated/workflows/new")({
  validateSearch: (search: Record<string, unknown>): { template?: string | undefined } => ({
    template: typeof search["template"] === "string" ? (search["template"] as string) : undefined,
  }),
  component: NewWorkflowPage,
});

function NewWorkflowPage() {
  const { current } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();

  const save = useServerFn(saveWorkflow);
  const testExecution = useServerFn(testWorkflowExecution);

  // Check if template requested via query param
  const templateId = searchParams?.template;
  const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);

  const initialWorkflow = template
    ? {
        name: template.name,
        description: template.description,
        trigger_type: template.triggerType,
        nodes: template.nodes,
        edges: template.edges,
        active: true,
      }
    : undefined;

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!current) throw new Error("No active organization found");
      return save({
        data: {
          ...payload,
          orgId: current.id,
        },
      });
    },
    onSuccess: (res: any) => {
      toast.success("Workflow created and saved successfully");
      queryClient.invalidateQueries({ queryKey: ["workflows", current?.id] });
      if (res?.id) {
        navigate({ to: "/workflows/$workflowId", params: { workflowId: res.id } });
      } else {
        navigate({ to: "/workflows" });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save workflow");
    },
  });

  return (
    <WorkflowCanvas
      initialWorkflow={initialWorkflow}
      isSaving={saveMutation.isPending}
      onSave={async (wf) => {
        await saveMutation.mutateAsync(wf);
      }}
      onTestExecution={async (data) => {
        if (!current) throw new Error("No organization selected");
        return testExecution({
          data: {
            orgId: current.id,
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
