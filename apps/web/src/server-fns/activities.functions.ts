import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orgInput = z.object({ orgId: z.string().uuid() });

export const listActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        customerId: z.string().uuid().optional(),
        dealId: z.string().uuid().optional(),
        leadId: z.string().uuid().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("activities")
      .select("id, org_id, type, title, description, customer_id, deal_id, lead_id, created_by, created_at")
      .eq("org_id", data.orgId);

    if (data.customerId) query = query.eq("customer_id", data.customerId);
    if (data.dealId) query = query.eq("deal_id", data.dealId);
    if (data.leadId) query = query.eq("lead_id", data.leadId);

    const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(30);

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("42P01")) {
        return [];
      }
      throw new Error(error.message);
    }
    return rows ?? [];
  });

export const logActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        type: z.enum(["call", "meeting", "email", "note", "follow_up", "status_change"]),
        title: z.string().trim().min(2).max(160),
        description: z.string().trim().optional().or(z.literal("")),
        customerId: z.string().uuid().optional().or(z.literal("")),
        dealId: z.string().uuid().optional().or(z.literal("")),
        leadId: z.string().uuid().optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      org_id: data.orgId,
      type: data.type,
      title: data.title,
      description: data.description || null,
      customer_id: data.customerId || null,
      deal_id: data.dealId || null,
      lead_id: data.leadId || null,
      created_by: context.userId,
    };

    const { data: row, error } = await context.supabase
      .from("activities")
      .insert(payload)
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });
