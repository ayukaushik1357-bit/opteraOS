import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orgInput = z.object({ orgId: z.string().uuid() });

export interface WorkGroupMemberRecord {
  id: string;
  group_id: string;
  user_id: string;
  member_id: string | null;
  role: "lead" | "senior" | "member" | "specialist";
  skills: string[];
  max_workload: number;
  status: "available" | "busy" | "offline" | "on_leave";
  created_at: string;
  user_email?: string | null;
  full_name?: string | null;
  current_workload?: number;
}

export interface WorkGroupRecord {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  department_id: string | null;
  assignment_strategy: "round_robin" | "lowest_workload" | "skill_based" | "ai_assignment" | "direct" | "all_members";
  skills: string[];
  created_at: string;
  updated_at: string;
  members_count?: number;
  active_tasks_count?: number;
  members?: WorkGroupMemberRecord[];
}

// In-memory fallback stores
const serverWorkGroupStore = new Map<string, WorkGroupRecord>();
const serverWorkGroupMembersStore = new Map<string, WorkGroupMemberRecord[]>();

// ─────────────────────────────────────────────────────────────────────────────
// 1. LIST WORK GROUPS (with member counts and active workload)
// ─────────────────────────────────────────────────────────────────────────────
export const listWorkGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }): Promise<WorkGroupRecord[]> => {
    const supabase = context.supabase;
    const orgId = data.orgId;

    let groups: any[] = [];
    let members: any[] = [];
    let orgMembers: any[] = [];
    let tasks: any[] = [];

    try {
      const [groupsRes, membersRes, orgMembersRes, tasksRes] = await Promise.all([
        supabase
          .from("work_groups")
          .select("*")
          .eq("org_id", orgId)
          .order("name", { ascending: true }),
        supabase
          .from("work_group_members")
          .select("*")
          .eq("org_id", orgId),
        supabase.from("organization_members").select("id, user_id, email, full_name").eq("org_id", orgId),
        supabase
          .from("tasks")
          .select("id, work_group_id, assignee_id, status")
          .eq("org_id", orgId)
          .not("status", "in", "(Completed,Cancelled)"),
      ]);

      groups = groupsRes.data ?? [];
      members = membersRes.data ?? [];
      orgMembers = orgMembersRes.data ?? [];
      tasks = tasksRes.data ?? [];
    } catch {
      // Handled
    }

    // Merge memory groups
    const memGroups = Array.from(serverWorkGroupStore.values()).filter((g) => g.org_id === orgId);
    const seenIds = new Set(groups.map((g) => g.id));
    const allGroups = [...groups];
    for (const mg of memGroups) {
      if (!seenIds.has(mg.id)) allGroups.push(mg);
    }

    const orgMemberMap = new Map(orgMembers.map((m) => [m.user_id, m]));

    const taskCountByGroup = new Map<string, number>();
    const taskCountByMember = new Map<string, number>();
    for (const t of tasks) {
      if (t.work_group_id) taskCountByGroup.set(t.work_group_id, (taskCountByGroup.get(t.work_group_id) ?? 0) + 1);
      if (t.assignee_id) taskCountByMember.set(t.assignee_id, (taskCountByMember.get(t.assignee_id) ?? 0) + 1);
    }

    const membersByGroup = new Map<string, WorkGroupMemberRecord[]>();
    for (const m of members) {
      const orgM = orgMemberMap.get(m.user_id);
      const memberRecord: WorkGroupMemberRecord = {
        id: m.id,
        group_id: m.group_id,
        user_id: m.user_id,
        member_id: m.member_id,
        role: m.role as any,
        skills: m.skills ?? [],
        max_workload: m.max_workload ?? 15,
        status: m.status as any,
        created_at: m.created_at,
        user_email: orgM?.email ?? null,
        full_name: orgM?.full_name ?? orgM?.email?.split("@")[0] ?? "Team Member",
        current_workload: taskCountByMember.get(m.user_id) ?? 0,
      };
      if (!membersByGroup.has(m.group_id)) membersByGroup.set(m.group_id, []);
      membersByGroup.get(m.group_id)!.push(memberRecord);
    }

    // Merge memory members
    for (const [groupId, memList] of serverWorkGroupMembersStore.entries()) {
      if (!membersByGroup.has(groupId)) {
        membersByGroup.set(groupId, memList);
      }
    }

    return allGroups.map((g): WorkGroupRecord => {
      const groupMembers = membersByGroup.get(g.id) ?? [];
      return {
        id: g.id,
        org_id: g.org_id,
        name: g.name,
        description: g.description,
        color: g.color || "#8B5CF6",
        icon: g.icon || "Briefcase",
        department_id: g.department_id,
        assignment_strategy: (g.assignment_strategy as any) || "round_robin",
        skills: g.skills ?? [],
        created_at: g.created_at,
        updated_at: g.updated_at,
        members_count: groupMembers.length,
        active_tasks_count: taskCountByGroup.get(g.id) ?? 0,
        members: groupMembers,
      };
    });
  });

// ─────────────────────────────────────────────────────────────────────────────
// 2. SAVE WORK GROUP (Create / Update with initial members)
// ─────────────────────────────────────────────────────────────────────────────
export const saveWorkGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        orgId: z.string().uuid(),
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(300).optional().or(z.literal("")),
        color: z.string().trim().default("#8B5CF6"),
        icon: z.string().trim().default("Briefcase"),
        departmentId: z.string().uuid().optional().or(z.literal("")),
        assignmentStrategy: z
          .enum(["round_robin", "lowest_workload", "skill_based", "ai_assignment", "direct", "all_members"])
          .default("round_robin"),
        skills: z.array(z.string().trim()).default([]),
        memberUserIds: z.array(z.string().uuid()).default([]),
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
      department_id: data.departmentId || null,
      assignment_strategy: data.assignmentStrategy,
      skills: data.skills,
      created_at: now,
      updated_at: now,
    };

    serverWorkGroupStore.set(id, payload as any);

    // If initial members provided, seed memory members store
    if (data.memberUserIds.length > 0) {
      const initialMemList: WorkGroupMemberRecord[] = data.memberUserIds.map((userId) => ({
        id: crypto.randomUUID(),
        group_id: id,
        user_id: userId,
        member_id: null,
        role: "member",
        skills: [],
        max_workload: 15,
        status: "available",
        created_at: now,
      }));
      serverWorkGroupMembersStore.set(id, initialMemList);
    }

    try {
      if (data.id) {
        await context.supabase
          .from("work_groups")
          .update(payload)
          .eq("id", data.id)
          .eq("org_id", data.orgId);
      } else {
        await context.supabase
          .from("work_groups")
          .insert({ ...payload, created_by: context.userId });
      }

      // Add initial members in Supabase if table exists
      if (data.memberUserIds.length > 0) {
        for (const userId of data.memberUserIds) {
          try {
            await context.supabase.from("work_group_members").insert({
              org_id: data.orgId,
              group_id: id,
              user_id: userId,
              role: "member",
              skills: [],
              max_workload: 15,
              status: "active",
            });
          } catch {
            // Non-blocking
          }
        }
      }
    } catch {
      // Handled
    }

    return { id, ok: true, name: data.name };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 3. DELETE WORK GROUP
// ─────────────────────────────────────────────────────────────────────────────
export const deleteWorkGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), orgId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    serverWorkGroupStore.delete(data.id);
    serverWorkGroupMembersStore.delete(data.id);
    try {
      await context.supabase
        .from("work_groups")
        .delete()
        .eq("id", data.id)
        .eq("org_id", data.orgId);
    } catch {
      // Handled
    }
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADD WORK GROUP MEMBER
// ─────────────────────────────────────────────────────────────────────────────
export const addWorkGroupMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        groupId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(["lead", "senior", "member", "specialist"]).default("member"),
        skills: z.array(z.string().trim()).default([]),
        maxWorkload: z.number().int().min(1).max(100).default(15),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const newMember: WorkGroupMemberRecord = {
      id: crypto.randomUUID(),
      group_id: data.groupId,
      user_id: data.userId,
      member_id: null,
      role: data.role,
      skills: data.skills,
      max_workload: data.maxWorkload,
      status: "available",
      created_at: new Date().toISOString(),
    };

    if (!serverWorkGroupMembersStore.has(data.groupId)) {
      serverWorkGroupMembersStore.set(data.groupId, []);
    }
    serverWorkGroupMembersStore.get(data.groupId)!.push(newMember);

    try {
      const { data: orgMember } = await context.supabase
        .from("organization_members")
        .select("id")
        .eq("org_id", data.orgId)
        .eq("user_id", data.userId)
        .single();

      await context.supabase.from("work_group_members").insert({
        org_id: data.orgId,
        group_id: data.groupId,
        user_id: data.userId,
        member_id: orgMember?.id || null,
        role: data.role,
        skills: data.skills,
        max_workload: data.maxWorkload,
        status: "active",
      });
    } catch {
      // Handled
    }

    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 5. REMOVE WORK GROUP MEMBER
// ─────────────────────────────────────────────────────────────────────────────
export const removeWorkGroupMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), orgId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    try {
      await context.supabase.from("work_group_members").delete().eq("id", data.id).eq("org_id", data.orgId);
    } catch {
      // Handled
    }
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET WORKLOAD DISTRIBUTION
// ─────────────────────────────────────────────────────────────────────────────
export const getWorkloadDistribution = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const orgId = data.orgId;

    let members: any[] = [];
    let tasks: any[] = [];
    let groupMemberships: any[] = [];

    try {
      const [membersRes, tasksRes, groupsRes] = await Promise.all([
        supabase
          .from("organization_members")
          .select("id, user_id, email, full_name, role")
          .eq("org_id", orgId),
        supabase
          .from("tasks")
          .select("id, assignee_id, priority, status, due_date, work_type")
          .eq("org_id", orgId)
          .not("status", "in", "(Completed,Cancelled)"),
        supabase
          .from("work_group_members")
          .select("user_id, group_id, role, skills, max_workload, work_groups(id, name, color)")
          .eq("org_id", orgId),
      ]);

      members = membersRes.data ?? [];
      tasks = tasksRes.data ?? [];
      groupMemberships = groupsRes.data ?? [];
    } catch {
      // Handled
    }

    const tasksByUser = new Map<string, typeof tasks>();
    for (const t of tasks) {
      if (t.assignee_id) {
        if (!tasksByUser.has(t.assignee_id)) tasksByUser.set(t.assignee_id, []);
        tasksByUser.get(t.assignee_id)!.push(t);
      }
    }

    const groupsByUser = new Map<string, Array<{ id: string; name: string; color: string }>>();
    const maxWorkloadByUser = new Map<string, number>();

    for (const gm of groupMemberships) {
      const g = (gm.work_groups as any) || null;
      if (g) {
        if (!groupsByUser.has(gm.user_id)) groupsByUser.set(gm.user_id, []);
        groupsByUser.get(gm.user_id)!.push({ id: g.id, name: g.name, color: g.color });
      }
      if (gm.max_workload) {
        maxWorkloadByUser.set(gm.user_id, Math.max(maxWorkloadByUser.get(gm.user_id) ?? 0, gm.max_workload));
      }
    }

    return members.map((m) => {
      const userTasks = tasksByUser.get(m.user_id) ?? [];
      const urgentCount = userTasks.filter((t) => t.priority === "Urgent" || t.priority === "High").length;
      const maxCap = maxWorkloadByUser.get(m.user_id) ?? 15;
      const loadPercent = Math.min(100, Math.round((userTasks.length / maxCap) * 100));

      return {
        userId: m.user_id,
        email: m.email,
        fullName: m.full_name || m.email?.split("@")[0] || "Employee",
        role: m.role,
        activeTasks: userTasks.length,
        urgentTasks: urgentCount,
        capacity: maxCap,
        loadPercent,
        groups: groupsByUser.get(m.user_id) ?? [],
        status: loadPercent >= 90 ? "Overloaded" : loadPercent >= 60 ? "Busy" : "Optimal",
      };
    });
  });
