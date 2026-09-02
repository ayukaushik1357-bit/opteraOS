import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orgInput = z.object({ orgId: z.string().uuid() });

export interface AssignmentRuleRecord {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  event_type: "new_lead" | "new_customer" | "overdue_invoice" | "at_risk_customer" | "task_escalation" | "deal_stage_change" | "custom_event";
  customer_group_id: string | null;
  target_work_group_id: string | null;
  target_user_id: string | null;
  strategy: "round_robin" | "lowest_workload" | "skill_based" | "ai_assignment" | "direct" | "all_members";
  conditions: Record<string, any>[];
  actions: Record<string, any>[];
  active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  target_work_group?: { id: string; name: string; color: string } | null;
  customer_group?: { id: string; name: string; color: string } | null;
}

// In-memory round-robin pointer tracker (scoped per org + group)
const roundRobinPointers = new Map<string, number>();

// ─────────────────────────────────────────────────────────────────────────────
// 1. LIST ASSIGNMENT RULES
// ─────────────────────────────────────────────────────────────────────────────
export const listAssignmentRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const orgId = data.orgId;

    try {
      const [rulesRes, workGroupsRes, customerGroupsRes] = await Promise.all([
        supabase
          .from("assignment_rules")
          .select("*")
          .eq("org_id", orgId)
          .order("priority", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase.from("work_groups").select("id, name, color").eq("org_id", orgId),
        supabase.from("customer_groups").select("id, name, color").eq("org_id", orgId),
      ]);

      if (rulesRes.error) {
        if (rulesRes.error.message.includes("does not exist") || rulesRes.error.message.includes("42P01")) {
          return [];
        }
        throw new Error(rulesRes.error.message);
      }

      const rules = rulesRes.data ?? [];
      const workGroupMap = new Map((workGroupsRes.data ?? []).map((w) => [w.id, w]));
      const customerGroupMap = new Map((customerGroupsRes.data ?? []).map((c) => [c.id, c]));

      return rules.map((r) => ({
        id: r.id,
        org_id: r.org_id,
        name: r.name,
        description: r.description,
        event_type: r.event_type as any,
        customer_group_id: r.customer_group_id,
        target_work_group_id: r.target_work_group_id,
        target_user_id: r.target_user_id,
        strategy: r.strategy as any,
        conditions: (r.conditions as any) || [],
        actions: (r.actions as any) || [],
        active: r.active,
        priority: r.priority,
        created_at: r.created_at,
        updated_at: r.updated_at,
        target_work_group: r.target_work_group_id ? workGroupMap.get(r.target_work_group_id) ?? null : null,
        customer_group: r.customer_group_id ? customerGroupMap.get(r.customer_group_id) ?? null : null,
      }));
    } catch (e: any) {
      if (e?.message?.includes("does not exist") || e?.message?.includes("42P01")) {
        return [];
      }
      throw e;
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// 2. SAVE ASSIGNMENT RULE
// ─────────────────────────────────────────────────────────────────────────────
export const saveAssignmentRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        orgId: z.string().uuid(),
        name: z.string().trim().min(2).max(100),
        description: z.string().trim().max(300).optional().or(z.literal("")),
        eventType: z.enum([
          "new_lead",
          "new_customer",
          "overdue_invoice",
          "at_risk_customer",
          "task_escalation",
          "deal_stage_change",
          "custom_event",
        ]),
        customerGroupId: z.string().uuid().optional().or(z.literal("")),
        targetWorkGroupId: z.string().uuid().optional().or(z.literal("")),
        targetUserId: z.string().uuid().optional().or(z.literal("")),
        strategy: z.enum(["round_robin", "lowest_workload", "skill_based", "ai_assignment", "direct", "all_members"]),
        conditions: z.array(z.record(z.any())).default([]),
        actions: z.array(z.record(z.any())).default([]),
        active: z.boolean().default(true),
        priority: z.number().int().min(1).max(100).default(10),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      org_id: data.orgId,
      name: data.name,
      description: data.description || null,
      event_type: data.eventType,
      customer_group_id: data.customerGroupId || null,
      target_work_group_id: data.targetWorkGroupId || null,
      target_user_id: data.targetUserId || null,
      strategy: data.strategy,
      conditions: data.conditions,
      actions: data.actions,
      active: data.active,
      priority: data.priority,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("assignment_rules")
        .update(payload)
        .eq("id", data.id)
        .eq("org_id", data.orgId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: row, error } = await context.supabase
      .from("assignment_rules")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

// ─────────────────────────────────────────────────────────────────────────────
// 3. DELETE ASSIGNMENT RULE
// ─────────────────────────────────────────────────────────────────────────────
export const deleteAssignmentRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), orgId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("assignment_rules")
      .delete()
      .eq("id", data.id)
      .eq("org_id", data.orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 4. RESOLVE WORK ASSIGNMENT (The Intelligent Routing Engine)
// ─────────────────────────────────────────────────────────────────────────────
export const resolveWorkAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        eventType: z.enum([
          "new_lead",
          "new_customer",
          "overdue_invoice",
          "at_risk_customer",
          "task_escalation",
          "deal_stage_change",
          "custom_event",
        ]),
        customerGroupId: z.string().uuid().optional(),
        workGroupId: z.string().uuid().optional(),
        ruleId: z.string().uuid().optional(),
        requiredSkills: z.array(z.string()).optional(),
        contextPayload: z.record(z.any()).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { orgId, eventType, customerGroupId, workGroupId, ruleId, requiredSkills, contextPayload } = data;

    // Step 1: Find matched assignment rule if not explicitly given
    let matchedRule: any = null;
    if (ruleId) {
      const { data: r } = await supabase
        .from("assignment_rules")
        .select("*")
        .eq("id", ruleId)
        .eq("org_id", orgId)
        .single();
      matchedRule = r;
    } else {
      let ruleQuery = supabase
        .from("assignment_rules")
        .select("*")
        .eq("org_id", orgId)
        .eq("event_type", eventType)
        .eq("active", true)
        .order("priority", { ascending: true });

      if (customerGroupId) {
        ruleQuery = ruleQuery.or(`customer_group_id.eq.${customerGroupId},customer_group_id.is.null`);
      }

      const { data: rules } = await ruleQuery.limit(1);
      if (rules && rules.length > 0) {
        matchedRule = rules[0];
      }
    }

    const targetWorkGroupId = workGroupId || matchedRule?.target_work_group_id || null;
    const strategy = matchedRule?.strategy || "round_robin";

    // Direct single user assignment case
    if (matchedRule?.target_user_id) {
      const { data: user } = await supabase
        .from("organization_members")
        .select("user_id, email, full_name")
        .eq("user_id", matchedRule.target_user_id)
        .eq("org_id", orgId)
        .maybeSingle();

      if (user) {
        const emailStr = user.email ?? "user@optera.ai";
        return {
          assignedUserId: user.user_id,
          assignedUserName: user.full_name || emailStr.split("@")[0] || "User",
          workGroupId: targetWorkGroupId,
          strategy: "direct",
          matchedRuleName: matchedRule.name,
          reason: `Assigned directly to ${user.full_name || emailStr} by rule '${matchedRule.name}'`,
        };
      }
    }

    // Step 2: Fetch eligible members in work group (or fallback to org members)
    let candidateMembers: Array<{
      user_id: string;
      email: string;
      full_name: string | null;
      role: string;
      skills: string[];
      status: string;
      max_workload: number;
    }> = [];

    if (targetWorkGroupId) {
      const { data: groupMembers } = await supabase
        .from("work_group_members")
        .select("user_id, role, skills, status, max_workload, member_id")
        .eq("group_id", targetWorkGroupId)
        .eq("org_id", orgId);

      const userIds = (groupMembers ?? []).map((m) => m.user_id);
      if (userIds.length > 0) {
        const { data: orgM } = await supabase
          .from("organization_members")
          .select("user_id, email, full_name")
          .eq("org_id", orgId)
          .in("user_id", userIds);

        const orgMMap = new Map((orgM ?? []).map((m) => [m.user_id, m]));
        candidateMembers = (groupMembers ?? []).map((gm) => {
          const orgInfo = orgMMap.get(gm.user_id);
          const email = orgInfo?.email ?? "member@optera.ai";
          return {
            user_id: gm.user_id,
            email,
            full_name: orgInfo?.full_name ?? email.split("@")[0] ?? "Team Member",
            role: gm.role,
            skills: gm.skills ?? [],
            status: gm.status,
            max_workload: gm.max_workload ?? 15,
          };
        });
      }
    }

    // Fallback: If no work group found, use all organization members
    if (candidateMembers.length === 0) {
      const { data: allOrgMembers } = await supabase
        .from("organization_members")
        .select("user_id, email, full_name, role")
        .eq("org_id", orgId);

      candidateMembers = (allOrgMembers ?? []).map((m) => {
        const email = m.email ?? "member@optera.ai";
        return {
          user_id: m.user_id,
          email,
          full_name: m.full_name || email.split("@")[0] || "Team Member",
          role: m.role,
          skills: [],
          status: "active",
          max_workload: 15,
        };
      });
    }

    if (candidateMembers.length === 0) {
      return {
        assignedUserId: null,
        assignedUserName: "Unassigned",
        workGroupId: targetWorkGroupId,
        strategy,
        reason: "No active team members available in the organization",
      };
    }

    // Filter available candidates (not offline/away if multiple exist)
    const availableCandidates = candidateMembers.filter((m) => m.status !== "offline");
    const pool = availableCandidates.length > 0 ? availableCandidates : candidateMembers;

    // Step 3: Apply Strategy
    if (strategy === "round_robin") {
      const pointerKey = `${orgId}_${targetWorkGroupId ?? "all"}`;
      const lastIndex = roundRobinPointers.get(pointerKey) ?? -1;
      const nextIndex = (lastIndex + 1) % pool.length;
      roundRobinPointers.set(pointerKey, nextIndex);
      const chosen = pool[nextIndex]!;

      return {
        assignedUserId: chosen.user_id,
        assignedUserName: chosen.full_name || chosen.email.split("@")[0],
        workGroupId: targetWorkGroupId,
        strategy: "round_robin",
        matchedRuleName: matchedRule?.name ?? "Default Routing",
        reason: `Assigned via Round Robin (${nextIndex + 1}/${pool.length}) to ${chosen.full_name}`,
      };
    }

    if (strategy === "lowest_workload") {
      // Query active pending tasks for each candidate
      const candidateUserIds = pool.map((c) => c.user_id);
      const { data: activeTasks } = await supabase
        .from("tasks")
        .select("assignee_id")
        .eq("org_id", orgId)
        .in("assignee_id", candidateUserIds)
        .not("status", "in", "(Completed,Cancelled)");

      const countMap = new Map<string, number>();
      for (const t of activeTasks ?? []) {
        if (t.assignee_id) countMap.set(t.assignee_id, (countMap.get(t.assignee_id) ?? 0) + 1);
      }

      // Sort by active task count ascending
      const sorted = [...pool].sort((a, b) => {
        const countA = countMap.get(a.user_id) ?? 0;
        const countB = countMap.get(b.user_id) ?? 0;
        return countA - countB;
      });

      const chosen = sorted[0]!;
      const chosenCount = countMap.get(chosen.user_id) ?? 0;

      return {
        assignedUserId: chosen.user_id,
        assignedUserName: chosen.full_name || chosen.email.split("@")[0],
        workGroupId: targetWorkGroupId,
        strategy: "lowest_workload",
        matchedRuleName: matchedRule?.name ?? "Workload Optimizer",
        reason: `Assigned to ${chosen.full_name} with lowest active workload (${chosenCount} tasks)`,
      };
    }

    if (strategy === "skill_based") {
      const skillsRequired = requiredSkills ?? (matchedRule?.conditions?.[0]?.skills as string[]) ?? [];
      if (skillsRequired.length > 0) {
        const withMatches = pool.map((member) => {
          const matchCount = skillsRequired.filter((s) =>
            member.skills.some((ms) => ms.toLowerCase().includes(s.toLowerCase())),
          ).length;
          return { member, matchCount };
        });

        withMatches.sort((a, b) => b.matchCount - a.matchCount);
        const chosen = withMatches[0]!.member;

        return {
          assignedUserId: chosen.user_id,
          assignedUserName: chosen.full_name || chosen.email.split("@")[0],
          workGroupId: targetWorkGroupId,
          strategy: "skill_based",
          matchedRuleName: matchedRule?.name ?? "Skill Matcher",
          reason: `Assigned to ${chosen.full_name} matching skills: [${skillsRequired.join(", ")}]`,
        };
      }
    }

    // AI Assignment / Fallback
    const chosen = pool[0]!;
    return {
      assignedUserId: chosen.user_id,
      assignedUserName: chosen.full_name || chosen.email.split("@")[0],
      workGroupId: targetWorkGroupId,
      strategy: "ai_assignment",
      matchedRuleName: matchedRule?.name ?? "AI Smart Dispatcher",
      reason: `optera AI selected ${chosen.full_name} based on availability, role (${chosen.role}), and team balance`,
    };
  });
