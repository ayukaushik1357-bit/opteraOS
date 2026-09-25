/**
 * Backend Current User Profile Handler
 * Route: GET /api/auth/me
 */
import { defineEventHandler, getRequestHeader } from "h3";
import { supabaseAdmin } from "@optera/server/db";

export default defineEventHandler(async (event) => {
  const authHeader = getRequestHeader(event, "authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, user: null };
  }

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return { authenticated: false, user: null };
  }

  const user = data.user;

  // Retrieve user's organizations
  const { data: memberships } = await supabaseAdmin
    .from("organization_members")
    .select("org_id, role, organizations(id, name, slug, plan, currency)")
    .eq("user_id", user.id);

  return {
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.["full_name"] || null,
      avatarUrl: user.user_metadata?.["avatar_url"] || null,
      provider: user.app_metadata?.["provider"] || "email",
    },
    organizations: (memberships ?? [])
      .filter((m) => m.organizations)
      .map((m) => ({
        id: m.org_id,
        role: m.role,
        ...(m.organizations as Record<string, unknown>),
      })),
  };
});
