import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orgInput = z.object({ orgId: z.string().uuid() });

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("tasks")
      .select("id, org_id, title, description, priority, status, due_date, assignee_id, customer_id, deal_id, created_at")
      .eq("org_id", data.orgId)
      .order("created_at", { ascending: false });

    if (error) {
      // Return empty array gracefully if table is not yet migrated in Supabase
      if (error.message.includes("does not exist") || error.message.includes("42P01")) {
        return [];
      }
      throw new Error(error.message);
    }
    return rows ?? [];
  });

export const saveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        orgId: z.string().uuid(),
        title: z.string().trim().min(2).max(160),
        description: z.string().trim().optional().or(z.literal("")),
        priority: z.enum(["Low", "Medium", "High", "Urgent"]),
        status: z.enum(["Todo", "In Progress", "Completed", "Cancelled"]),
        dueDate: z.string().optional().or(z.literal("")),
        assigneeId: z.string().uuid().optional().or(z.literal("")),
        customerId: z.string().uuid().optional().or(z.literal("")),
        dealId: z.string().uuid().optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      org_id: data.orgId,
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      status: data.status,
      due_date: data.dueDate || null,
      assignee_id: data.assigneeId || null,
      customer_id: data.customerId || null,
      deal_id: data.dealId || null,
    };

    if (data.id) {
      const { error } = await context.supabase.from("tasks").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: row, error } = await context.supabase
      .from("tasks")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const setTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["Todo", "In Progress", "Completed", "Cancelled"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tasks")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
