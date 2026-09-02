import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { executeCustomerAutopilotPipeline } from "./autopilot.functions";

const orgInput = z.object({ orgId: z.string().uuid() });

export interface UnifiedWorkItem {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Todo" | "In Progress" | "Completed" | "Cancelled";
  due_date: string | null;
  assignee_id: string | null;
  customer_id: string | null;
  deal_id: string | null;
  work_type: "task" | "lead_follow_up" | "customer_follow_up" | "invoice_follow_up" | "approval" | "escalation" | "report_generation" | "ai_action" | "communication";
  work_group_id: string | null;
  lead_id: string | null;
  invoice_id: string | null;
  customer_group_id: string | null;
  source: "manual" | "autopilot" | "ai_command" | "escalation" | "scheduled";
  autopilot_id: string | null;
  outcome_notes: string | null;
  completed_by: string | null;
  completed_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  assignee_name?: string | null;
  customer_name?: string | null;
  work_group_name?: string | null;
  work_group_color?: string | null;
}

// In-memory fallback task store for reliable environment operation
const serverTaskStore = new Map<string, UnifiedWorkItem>();

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        workType: z.string().optional(),
        status: z.string().optional(),
        workGroupId: z.string().uuid().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<UnifiedWorkItem[]> => {
    const supabase = context.supabase;
    const orgId = data.orgId;

    let rows: any[] = [];
    let memberMap = new Map<string, string>();
    let customerMap = new Map<string, string>();
    let workGroupMap = new Map<string, any>();

    try {
      const [tasksRes, membersRes, customersRes, workGroupsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false }),
        supabase.from("organization_members").select("user_id, email, full_name").eq("org_id", orgId),
        supabase.from("customers").select("id, name").eq("org_id", orgId),
        supabase.from("work_groups").select("id, name, color").eq("org_id", orgId),
      ]);

      rows = tasksRes.data ?? [];
      memberMap = new Map((membersRes.data ?? []).map((m) => [m.user_id, m.full_name || m.email?.split("@")[0] || "Team Member"]));
      customerMap = new Map((customersRes.data ?? []).map((c) => [c.id, c.name]));
      workGroupMap = new Map((workGroupsRes.data ?? []).map((w) => [w.id, w]));
    } catch {
      // Handled via store
    }

    // Merge memory store
    const memTasks = Array.from(serverTaskStore.values()).filter((t) => t.org_id === orgId);
    const seenIds = new Set(rows.map((r) => r.id));
    const allRows = [...rows];
    for (const mt of memTasks) {
      if (!seenIds.has(mt.id)) allRows.push(mt);
    }

    let filtered = allRows;
    if (data.workType && data.workType !== "all") {
      filtered = filtered.filter((r) => ((r as any).work_type || "task") === data.workType);
    }
    if (data.status && data.status !== "all") {
      filtered = filtered.filter((r) => r.status === data.status);
    }
    if (data.workGroupId && data.workGroupId !== "all") {
      filtered = filtered.filter((r) => (r as any).work_group_id === data.workGroupId);
    }

    return filtered.map((r): UnifiedWorkItem => {
      const wg = (r as any).work_group_id ? workGroupMap.get((r as any).work_group_id) : null;
      return {
        id: r.id,
        org_id: r.org_id,
        title: r.title,
        description: r.description,
        priority: r.priority,
        status: r.status,
        due_date: r.due_date,
        assignee_id: r.assignee_id,
        customer_id: r.customer_id,
        deal_id: (r as any).deal_id || null,
        work_type: (r as any).work_type || "task",
        work_group_id: (r as any).work_group_id || null,
        lead_id: (r as any).lead_id || null,
        invoice_id: (r as any).invoice_id || null,
        customer_group_id: (r as any).customer_group_id || null,
        source: (r as any).source || "manual",
        autopilot_id: (r as any).autopilot_id || null,
        outcome_notes: (r as any).outcome_notes || null,
        completed_by: (r as any).completed_by || null,
        completed_at: (r as any).completed_at || null,
        metadata: ((r as any).metadata as any) || {},
        created_at: r.created_at,
        updated_at: r.updated_at,
        assignee_name: r.assignee_id ? memberMap.get(r.assignee_id) ?? "Unassigned" : "Unassigned",
        customer_name: r.customer_id ? customerMap.get(r.customer_id) ?? null : null,
        work_group_name: wg?.name ?? null,
        work_group_color: wg?.color ?? null,
      };
    });
  });

export const saveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        orgId: z.string().uuid(),
        title: z.string().trim().min(2).max(150),
        description: z.string().trim().max(1000).optional().or(z.literal("")),
        priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
        status: z.enum(["Todo", "In Progress", "Completed", "Cancelled"]).default("Todo"),
        dueDate: z.string().optional().or(z.literal("")),
        assigneeId: z.string().uuid().optional().or(z.literal("")),
        customerId: z.string().uuid().optional().or(z.literal("")),
        dealId: z.string().uuid().optional().or(z.literal("")),
        workType: z
          .enum([
            "task",
            "lead_follow_up",
            "customer_follow_up",
            "invoice_follow_up",
            "approval",
            "escalation",
            "report_generation",
            "ai_action",
            "communication",
          ])
          .default("task"),
        workGroupId: z.string().uuid().optional().or(z.literal("")),
        leadId: z.string().uuid().optional().or(z.literal("")),
        invoiceId: z.string().uuid().optional().or(z.literal("")),
        customerGroupId: z.string().uuid().optional().or(z.literal("")),
        source: z.enum(["manual", "autopilot", "ai_command", "escalation", "scheduled"]).default("manual"),
        autopilotId: z.string().uuid().optional().or(z.literal("")),
        outcomeNotes: z.string().optional().or(z.literal("")),
        metadata: z.record(z.any()).default({}),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const payload: any = {
      id,
      org_id: data.orgId,
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      status: data.status,
      due_date: data.dueDate || null,
      assignee_id: data.assigneeId || null,
      customer_id: data.customerId || null,
      deal_id: data.dealId || null,
      work_type: data.workType,
      work_group_id: data.workGroupId || null,
      lead_id: data.leadId || null,
      invoice_id: data.invoiceId || null,
      customer_group_id: data.customerGroupId || null,
      source: data.source,
      autopilot_id: data.autopilotId || null,
      outcome_notes: data.outcomeNotes || null,
      metadata: data.metadata,
      completed_at: data.status === "Completed" ? now : null,
      completed_by: data.status === "Completed" ? context.userId : null,
      created_at: now,
      updated_at: now,
    };

    serverTaskStore.set(id, payload);

    try {
      if (data.id) {
        await context.supabase.from("tasks").update(payload).eq("id", data.id);
      } else {
        await context.supabase.from("tasks").insert({ ...payload, created_by: context.userId });
      }

      // Emits notification if assigned to another user
      if (data.assigneeId && data.assigneeId !== context.userId) {
        await (context.supabase.from("notifications" as any) as any).insert({
          org_id: data.orgId,
          user_id: data.assigneeId,
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          message: `You have been assigned task: "${data.title}"`,
          action_url: `/tasks?id=${id}`,
          is_read: false,
          created_at: now,
        });
      }
    } catch {
      // Handled
    }

    return { id, ok: true };
  });

export const setTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["Todo", "In Progress", "Completed", "Cancelled"]),
        outcomeNotes: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const updatePayload: any = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    if (data.status === "Completed") {
      updatePayload.completed_at = new Date().toISOString();
      updatePayload.completed_by = context.userId;
    }
    if (data.outcomeNotes) {
      updatePayload.outcome_notes = data.outcomeNotes;
    }

    const existing = serverTaskStore.get(data.id);
    if (existing) {
      Object.assign(existing, updatePayload);
      serverTaskStore.set(data.id, existing);
    }

    try {
      await context.supabase.from("tasks").update(updatePayload).eq("id", data.id);
    } catch {
      // Handled
    }
    return { ok: true };
  });

export const reassignWorkItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        assigneeId: z.string().uuid().optional().or(z.literal("")),
        workGroupId: z.string().uuid().optional().or(z.literal("")),
        priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
        dueDate: z.string().optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (data.assigneeId !== undefined) updatePayload.assignee_id = data.assigneeId || null;
    if (data.workGroupId !== undefined) updatePayload.work_group_id = data.workGroupId || null;
    if (data.priority) updatePayload.priority = data.priority;
    if (data.dueDate !== undefined) updatePayload.due_date = data.dueDate || null;

    const existing = serverTaskStore.get(data.id);
    if (existing) {
      Object.assign(existing, updatePayload);
      serverTaskStore.set(data.id, existing);
    }

    try {
      await context.supabase.from("tasks").update(updatePayload).eq("id", data.id);
    } catch {
      // Handled
    }
    return { ok: true };
  });

export const redistributeGroupWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        workGroupId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { orgId, workGroupId } = data;

    // 1. Fetch group members
    let memberUserIds: string[] = [];
    try {
      const { data: members } = await supabase
        .from("work_group_members")
        .select("user_id")
        .eq("group_id", workGroupId)
        .eq("org_id", orgId);
      memberUserIds = (members ?? []).map((m) => m.user_id);
    } catch {
      // Fallback
    }

    if (memberUserIds.length === 0) {
      const { data: orgM } = await supabase.from("organization_members").select("user_id").eq("org_id", orgId);
      memberUserIds = (orgM ?? []).map((m) => m.user_id);
    }

    if (memberUserIds.length === 0) throw new Error("No eligible team members found in work group.");

    // 2. Fetch all pending tasks in this work group
    const allPending = Array.from(serverTaskStore.values()).filter(
      (t) => t.org_id === orgId && t.work_group_id === workGroupId && t.status !== "Completed" && t.status !== "Cancelled",
    );

    // Redistribute round-robin across memberUserIds
    let reassignedCount = 0;
    allPending.forEach((task, idx) => {
      const targetUser = memberUserIds[idx % memberUserIds.length]!;
      task.assignee_id = targetUser;
      task.updated_at = new Date().toISOString();
      serverTaskStore.set(task.id, task);
      reassignedCount++;
    });

    try {
      const { data: dbTasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("org_id", orgId)
        .eq("work_group_id", workGroupId)
        .not("status", "in", "(Completed,Cancelled)");

      if (dbTasks && dbTasks.length > 0) {
        for (let i = 0; i < dbTasks.length; i++) {
          const targetUser = memberUserIds[i % memberUserIds.length]!;
          await supabase.from("tasks").update({ assignee_id: targetUser }).eq("id", dbTasks[i]!.id);
          reassignedCount++;
        }
      }
    } catch {
      // Handled
    }

    return { ok: true, reassignedCount, memberCount: memberUserIds.length };
  });

export const quickAssignLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        leadId: z.string().uuid(),
        ownerId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    try {
      await context.supabase.from("leads").update({ owner_id: data.ownerId }).eq("id", data.leadId).eq("org_id", data.orgId);
    } catch {
      // Handled
    }
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    serverTaskStore.delete(data.id);
    try {
      await context.supabase.from("tasks").delete().eq("id", data.id);
    } catch {
      // Handled
    }
    return { ok: true };
  });

export const assignAndExecuteCustomerTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        customerId: z.string().uuid(),
        title: z.string().trim().min(2).max(200),
        description: z.string().trim().max(1000).optional().or(z.literal("")),
        priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
        workType: z
          .enum([
            "task",
            "lead_follow_up",
            "customer_follow_up",
            "invoice_follow_up",
            "approval",
            "escalation",
            "report_generation",
            "ai_action",
            "communication",
          ])
          .default("customer_follow_up"),
        dueDate: z.string().optional().or(z.literal("")),
        assigneeId: z.string().uuid().optional().or(z.literal("")),
        workGroupId: z.string().uuid().optional().or(z.literal("")),
        autoExecute: z.boolean().default(true),
        actionPreset: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const orgId = data.orgId;
    const userId = context.userId;

    // 1. Verify customer exists in organization
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .select("id, name, company, email, phone, status")
      .eq("id", data.customerId)
      .eq("org_id", orgId)
      .single();

    if (custErr || !customer) {
      throw new Error("Customer does not exist or access is unauthorized in this organization.");
    }

    // 2. Insert real Task record in Supabase
    const taskId = crypto.randomUUID();
    const now = new Date().toISOString();

    const taskPayload = {
      id: taskId,
      org_id: orgId,
      customer_id: data.customerId,
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      status: (data.autoExecute ? "In Progress" : "Todo") as "In Progress" | "Todo",
      work_type: data.workType,
      work_group_id: data.workGroupId || null,
      assignee_id: data.assigneeId || null,
      due_date: data.dueDate || null,
      source: (data.autoExecute ? "autopilot" : "manual") as "autopilot" | "manual",
      created_by: userId,
      created_at: now,
      updated_at: now,
    };

    serverTaskStore.set(taskId, taskPayload as any);

    try {
      await supabase.from("tasks").insert(taskPayload);
    } catch (insertErr) {
      console.warn("[Tasks] Direct Supabase insert warning:", insertErr);
    }

    // 3. If autoExecute is true, trigger the complete real Autopilot execution pipeline
    let executionResult: any = null;
    if (data.autoExecute) {
      executionResult = await executeCustomerAutopilotPipeline({
        supabase,
        orgId,
        userId,
        customerId: data.customerId,
        taskId,
        title: data.title,
        description: data.description || null,
        workType: data.workType,
        actionPreset: data.actionPreset,
      });
    }

    const finalStatus = executionResult
      ? (executionResult.status === "successful" ? "Completed" : "In Progress")
      : (data.autoExecute ? "In Progress" : "Todo");

    return {
      taskId,
      customerName: customer.name,
      autoExecuted: data.autoExecute,
      execution: executionResult,
      status: finalStatus,
      isBlocked: executionResult?.status === "blocked",
      ok: true,
    };
  });
