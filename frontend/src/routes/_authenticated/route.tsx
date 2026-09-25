import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, WorkspaceProvider } from "@/components/app/AppShell";
import { authStorage } from "@/lib/api/client";

function AuthenticatedLayout() {
  return (
    <WorkspaceProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </WorkspaceProvider>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // 1. Check REST API Token
    const restToken = authStorage.getToken();
    if (restToken) {
      return { user: { id: "authenticated_user" } };
    }

    // 2. Check Supabase session fallback
    try {
      let { data } = await supabase.auth.getSession();
      if (!data.session?.user && typeof window !== "undefined") {
        if (window.location.hash.includes("access_token") || window.location.search.includes("code=")) {
          await new Promise((r) => setTimeout(r, 200));
          const retry = await supabase.auth.getSession();
          data = retry.data;
        }
      }
      if (data.session?.user) {
        return { user: data.session.user };
      }
    } catch {
      // Supabase not configured
    }

    // Unauthenticated: redirect to login
    throw redirect({ to: "/auth" });
  },
  component: AuthenticatedLayout,
});
