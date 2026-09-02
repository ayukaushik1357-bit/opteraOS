import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orgInput = z.object({ orgId: z.string().uuid() });

export const listWorkflows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("workflows")
      .select("id, org_id, name, description, trigger_type, active, webhook_url, created_at, updated_at")
      .eq("org_id", data.orgId)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("42P01")) {
        return [];
      }
      throw new Error(error.message);
    }
    return rows ?? [];
  });

export const saveWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        orgId: z.string().uuid(),
        name: z.string().trim().min(2).max(100),
        description: z.string().trim().optional().or(z.literal("")),
        triggerType: z.string().trim().min(2),
        webhookUrl: z.string().trim().url().optional().or(z.literal("")),
        active: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      org_id: data.orgId,
      name: data.name,
      description: data.description || null,
      trigger_type: data.triggerType,
      webhook_url: data.webhookUrl || null,
      active: data.active,
    };

    if (data.id) {
      const { error } = await context.supabase.from("workflows").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: row, error } = await context.supabase
      .from("workflows")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const toggleWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workflows")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("workflows").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listWorkflowExecutions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("workflow_executions")
      .select("id, workflow_id, trigger_event, status, started_at, completed_at, error_message, workflows(name)")
      .eq("org_id", data.orgId)
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("42P01")) {
        return [];
      }
      throw new Error(error.message);
    }
    return rows ?? [];
  });

export const triggerWorkflowEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        triggerEvent: z.string(),
        payload: z.record(z.any()),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: activeWorkflows, error } = await context.supabase
      .from("workflows")
      .select("*")
      .eq("org_id", data.orgId)
      .eq("trigger_type", data.triggerEvent)
      .eq("active", true);

    if (error || !activeWorkflows || activeWorkflows.length === 0) {
      return { triggeredCount: 0 };
    }

    const results = [];
    for (const wf of activeWorkflows) {
      const { data: exec } = await context.supabase
        .from("workflow_executions")
        .insert({
          org_id: data.orgId,
          workflow_id: wf.id,
          trigger_event: data.triggerEvent,
          status: "running",
          input_payload: data.payload,
        })
        .select("id")
        .single();

      let execStatus: "successful" | "failed" = "successful";
      let errorMsg: string | null = null;
      let outputData: any = { message: "Workflow executed" };

      if (wf.webhook_url) {
        try {
          const res = await fetch(wf.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: data.triggerEvent,
              orgId: data.orgId,
              timestamp: new Date().toISOString(),
              data: data.payload,
            }),
          });
          if (!res.ok) {
            execStatus = "failed";
            errorMsg = `Webhook HTTP error ${res.status}`;
          } else {
            outputData = { status: res.status, statusText: res.statusText };
          }
        } catch (err: any) {
          execStatus = "failed";
          errorMsg = err?.message || "Webhook network dispatch failed";
        }
      }

      if (exec?.id) {
        await context.supabase
          .from("workflow_executions")
          .update({
            status: execStatus,
            error_message: errorMsg,
            output_payload: outputData,
            completed_at: new Date().toISOString(),
          })
          .eq("id", exec.id);
      }

      results.push({ workflowId: wf.id, status: execStatus, error: errorMsg });
    }

    return { triggeredCount: results.length, results };
  });
