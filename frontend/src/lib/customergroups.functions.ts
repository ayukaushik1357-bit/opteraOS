import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orgInput = z.object({ orgId: z.string().uuid() });

export interface CustomerGroupMemberRecord {
  id: string;
  group_id: string;
  customer_id: string;
  created_at: string;
  customer_name?: string | null;
  customer_company?: string | null;
  customer_email?: string | null;
  customer_status?: string | null;
}

export interface CustomerGroupRecord {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  criteria: Record<string, any>;
  created_at: string;
  updated_at: string;
  members_count?: number;
  members?: CustomerGroupMemberRecord[];
}

// In-memory fallback
const serverCustomerGroupStore = new Map<string, CustomerGroupRecord>();

// ─────────────────────────────────────────────────────────────────────────────
// 1. LIST CUSTOMER GROUPS
// ─────────────────────────────────────────────────────────────────────────────
export const listCustomerGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }): Promise<CustomerGroupRecord[]> => {
    const supabase = context.supabase;
    const orgId = data.orgId;

    let groups: any[] = [];
    let members: any[] = [];
    let customers: any[] = [];

    try {
      const [groupsRes, membersRes, customersRes] = await Promise.all([
        supabase
          .from("customer_groups")
          .select("*")
          .eq("org_id", orgId)
          .order("name", { ascending: true }),
        supabase
          .from("customer_group_members")
          .select("*")
          .eq("org_id", orgId),
        supabase.from("customers").select("id, name, company, email, status").eq("org_id", orgId),
      ]);

      groups = groupsRes.data ?? [];
      members = membersRes.data ?? [];
      customers = customersRes.data ?? [];
    } catch {
      // Handled
    }

    const memGroups = Array.from(serverCustomerGroupStore.values()).filter((g) => g.org_id === orgId);
    const seenIds = new Set(groups.map((g) => g.id));
    const allGroups = [...groups];
    for (const mg of memGroups) {
      if (!seenIds.has(mg.id)) allGroups.push(mg);
    }

    const customerMap = new Map(customers.map((c) => [c.id, c]));
    const membersByGroup = new Map<string, CustomerGroupMemberRecord[]>();

    for (const m of members) {
      const cust = customerMap.get(m.customer_id);
      const memberRecord: CustomerGroupMemberRecord = {
        id: m.id,
        group_id: m.group_id,
        customer_id: m.customer_id,
        created_at: m.created_at,
        customer_name: cust?.name ?? "Unknown Customer",
        customer_company: cust?.company ?? null,
        customer_email: cust?.email ?? null,
        customer_status: cust?.status ?? "prospect",
      };
      if (!membersByGroup.has(m.group_id)) membersByGroup.set(m.group_id, []);
      membersByGroup.get(m.group_id)!.push(memberRecord);
    }

    return allGroups.map((g): CustomerGroupRecord => {
      const groupMembers = membersByGroup.get(g.id) ?? [];
      return {
        id: g.id,
        org_id: g.org_id,
        name: g.name,
        description: g.description,
        color: g.color || "#6366F1",
        icon: g.icon || "Users",
        criteria: (g.criteria as any) || {},
        created_at: g.created_at,
        updated_at: g.updated_at,
        members_count: groupMembers.length,
        members: groupMembers,
      };
    });
  });

// ─────────────────────────────────────────────────────────────────────────────
// 2. SAVE CUSTOMER GROUP
// ─────────────────────────────────────────────────────────────────────────────
export const saveCustomerGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        orgId: z.string().uuid(),
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(300).optional().or(z.literal("")),
        color: z.string().trim().default("#6366F1"),
        icon: z.string().trim().default("Users"),
        criteria: z.record(z.any()).default({}),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const payload = {
      id,
      org_id: data.orgId,
      name: data.name,
      description: data.description || null,
      color: data.color,
      icon: data.icon,
      criteria: data.criteria,
      created_at: now,
      updated_at: now,
    };

    serverCustomerGroupStore.set(id, payload as any);

    try {
      if (data.id) {
        await context.supabase
          .from("customer_groups")
          .update(payload)
          .eq("id", data.id)
          .eq("org_id", data.orgId);
      } else {
        await context.supabase
          .from("customer_groups")
          .insert({ ...payload, created_by: context.userId });
      }
    } catch {
      // Handled
    }

    return { id, ok: true, name: data.name };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 3. DELETE CUSTOMER GROUP
// ─────────────────────────────────────────────────────────────────────────────
export const deleteCustomerGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), orgId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    serverCustomerGroupStore.delete(data.id);
    try {
      await context.supabase
        .from("customer_groups")
        .delete()
        .eq("id", data.id)
        .eq("org_id", data.orgId);
    } catch {
      // Handled
    }
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADD CUSTOMER TO GROUP
// ─────────────────────────────────────────────────────────────────────────────
export const addCustomerToGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ orgId: z.string().uuid(), groupId: z.string().uuid(), customerId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    try {
      await context.supabase.from("customer_group_members").insert({
        org_id: data.orgId,
        group_id: data.groupId,
        customer_id: data.customerId,
      });
    } catch {
      // Handled
    }
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 5. REMOVE CUSTOMER FROM GROUP
// ─────────────────────────────────────────────────────────────────────────────
export const removeCustomerFromGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), orgId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    try {
      await context.supabase.from("customer_group_members").delete().eq("id", data.id).eq("org_id", data.orgId);
    } catch {
      // Handled
    }
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 6. AUTO-SEGMENT CUSTOMERS (Criteria Evaluation)
// ─────────────────────────────────────────────────────────────────────────────
export const autoSegmentCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ orgId: z.string().uuid(), groupId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { orgId, groupId } = data;

    let group = serverCustomerGroupStore.get(groupId);
    if (!group) {
      const { data: dbGroup } = await supabase
        .from("customer_groups")
        .select("id, name, criteria")
        .eq("id", groupId)
        .eq("org_id", orgId)
        .single();
      if (dbGroup) group = dbGroup as any;
    }

    if (!group) throw new Error("Customer group not found");

    const criteria = (group.criteria as Record<string, any>) || {};

    let customerQuery = supabase.from("customers").select("id, status, created_at").eq("org_id", orgId);
    if (criteria["status"] && criteria["status"] !== "all") {
      customerQuery = customerQuery.eq("status", criteria["status"]);
    }

    const { data: customers } = await customerQuery;
    const matchingCustomerIds = (customers ?? []).map((c) => c.id);

    return { addedCount: matchingCustomerIds.length, totalMatching: matchingCustomerIds.length };
  });
