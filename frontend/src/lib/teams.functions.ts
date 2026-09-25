/**
 * teams.functions.ts
 *
 * Server-side functions for enterprise organization hierarchy:
 * Departments → Teams → Members
 *
 * Security: All functions require authenticated Supabase sessions.
 * All data is strictly filtered by org_id with RLS enforcement.
 *
 * Note: departments and teams are new tables added in migration
 * 20260815100000_add_departments_teams.sql. Return types are
 * explicitly defined here since the auto-generated types.ts may not
 * yet include these tables.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Local types for new tables (not yet in auto-generated types) ───────────

export type Department = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Team = {
  id: string;
  org_id: string;
  department_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  departments: { name: string } | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────────────────────────────────────

const orgInput = z.object({ orgId: z.string().uuid() });

export const listDepartments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }): Promise<Department[]> => {
    const { data: rows, error } = await (context.supabase as any)
      .from("departments")
      .select("id, org_id, name, description, created_at")
      .eq("org_id", data.orgId)
      .order("name");

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("42P01")) return [];
      throw new Error(error.message);
    }
    return (rows ?? []) as Department[];
  });

export const saveDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        orgId: z.string().uuid(),
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(300).optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const payload = {
      org_id: data.orgId,
      name: data.name,
      description: data.description || null,
    };
    if (data.id) {
      const { error } = await (context.supabase as any)
        .from("departments")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await (context.supabase as any)
      .from("departments")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row as { id: string };
  });

export const deleteDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { error } = await (context.supabase as any).from("departments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// TEAMS
// ─────────────────────────────────────────────────────────────────────────────

export const listTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        departmentId: z.string().uuid().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<Team[]> => {
    let query = (context.supabase as any)
      .from("teams")
      .select("id, org_id, department_id, name, description, created_at, departments(name)")
      .eq("org_id", data.orgId);

    if (data.departmentId) {
      query = query.eq("department_id", data.departmentId);
    }

    const { data: rows, error } = await query.order("name");
    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("42P01")) return [];
      throw new Error(error.message);
    }
    return (rows ?? []) as Team[];
  });

export const saveTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        orgId: z.string().uuid(),
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(300).optional().or(z.literal("")),
        departmentId: z.string().uuid().optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const payload = {
      org_id: data.orgId,
      name: data.name,
      description: data.description || null,
      department_id: data.departmentId || null,
    };
    if (data.id) {
      const { error } = await (context.supabase as any).from("teams").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await (context.supabase as any)
      .from("teams")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row as { id: string };
  });

export const deleteTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { error } = await (context.supabase as any).from("teams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * assignMemberToTeam — assigns a team member to a specific team and/or department.
 * Also supports setting job title.
 */
export const assignMemberToTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        memberId: z.string().uuid(),
        teamId: z.string().uuid().optional().or(z.literal("")),
        departmentId: z.string().uuid().optional().or(z.literal("")),
        jobTitle: z.string().trim().max(100).optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const update: Record<string, string | null> = {
      team_id: data.teamId || null,
      department_id: data.departmentId || null,
    };
    if (data.jobTitle !== undefined) {
      update["job_title"] = data.jobTitle || null;
    }
    const { error } = await (context.supabase as any)
      .from("organization_members")
      .update(update)
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
