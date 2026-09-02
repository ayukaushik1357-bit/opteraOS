import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, WorkspaceProvider } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    let { data } = await supabase.auth.getSession();
    if (!data.session?.user && typeof window !== "undefined") {
      if (window.location.hash.includes("access_token") || window.location.search.includes("code=")) {
        await new Promise((r) => setTimeout(r, 200));
        const retry = await supabase.auth.getSession();
        data = retry.data;
      }
    }
    if (!data.session?.user) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: () => (
    <WorkspaceProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </WorkspaceProvider>
  ),
});
