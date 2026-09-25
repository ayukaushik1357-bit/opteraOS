import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orgInput = z.object({ orgId: z.string().uuid() });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("notifications")
      .select("id, org_id, user_id, title, message, type, read, link, created_at")
      .eq("org_id", data.orgId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("42P01")) {
        return [];
      }
      throw new Error(error.message);
    }
    return rows ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        userId: z.string().uuid(),
        title: z.string().trim().min(2).max(120),
        message: z.string().trim().min(2).max(300),
        type: z
          .enum([
            "task_assigned",
            "task_overdue",
            "lead_new",
            "deal_update",
            "invoice_overdue",
            "automation_failure",
            "ai_action_required",
            "system_alert",
            "info",
          ])
          .default("info"),
        link: z.string().optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("notifications")
      .insert({
        org_id: data.orgId,
        user_id: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link || null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });
