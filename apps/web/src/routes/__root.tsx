import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/error-reporting";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  const hasAuthTokens =
    typeof window !== "undefined" &&
    (window.location.hash.includes("access_token") ||
      window.location.search.includes("code=") ||
      window.location.hash.includes("type=recovery"));

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes("access_token") || search.includes("code=")) {
        try {
          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("opteraos-auth-sync");
            bc.postMessage({ type: "AUTH_SUCCESS" });
            bc.close();
          }
          localStorage.setItem("opteraos_auth_sync_timestamp", Date.now().toString());
        } catch {}

        if (hash.includes("type=recovery") || search.includes("mode=recovery")) {
          window.location.replace("/auth?mode=recovery");
          return;
        }

        setTimeout(() => {
          window.location.replace("/dashboard");
        }, 100);
      }
    }
  }, []);

  if (hasAuthTokens) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070913] text-foreground px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-medium text-white">Signing in to opteraOS...</p>
          <p className="text-xs text-slate-400">Syncing authentication across your open tabs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Root route error:", error);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070913] text-foreground px-4">
      <div className="max-w-md text-center rounded-2xl border border-white/10 bg-[#0d111d]/90 p-8 backdrop-blur-2xl space-y-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          ⚠️
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-white">
          Temporary View Error
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          {error?.message || "An unexpected error occurred while loading this view."}
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-2.5">
          <Button
            size="sm"
            onClick={() => reset ? reset() : window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white px-4 rounded-xl"
          >
            Retry View
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.replace("/workflows");
            }}
            className="border-white/10 bg-white/[0.04] text-xs text-white hover:bg-white/[0.08]"
          >
            Open Autopilot
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              window.location.replace("/dashboard");
            }}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "opteraOS — AI Business Operating System" },
      {
        name: "description",
        content:
          "One system. Smarter business. opteraOS unifies CRM, sales, invoices, inventory, analytics and AI automation.",
      },
      { name: "author", content: "opteraOS" },
      { property: "og:title", content: "opteraOS — AI Business Operating System" },
      {
        property: "og:description",
        content:
          "One system. Smarter business. opteraOS unifies CRM, sales, invoices, inventory, analytics and AI automation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function broadcastRealtime(session: { user?: { email?: string }; access_token?: string; refresh_token?: string }) {
  if (!session?.user?.email || !session.access_token) return;
  try {
    const cleanEmail = session.user.email.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
    const channelName = `auth_sync_${cleanEmail}`;
    const ch = supabase.channel(channelName, {
      config: { broadcast: { self: true } },
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.send({
          type: "broadcast",
          event: "MAGIC_LINK_VERIFIED",
          payload: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          },
        });
      }
    });
  } catch {}
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const search = typeof window !== "undefined" ? window.location.search : "";

    // Broadcast token arrival to all open tabs
    if (hash.includes("access_token") || search.includes("code=")) {
      try {
        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("opteraos-auth-sync");
          bc.postMessage({ type: "AUTH_SUCCESS" });
          bc.close();
        }
        localStorage.setItem("opteraos_auth_sync_timestamp", Date.now().toString());
      } catch {}

      // If user landed on landing page with magiclink or signup token, navigate to dashboard
      if (
        (window.location.pathname === "/" || window.location.pathname === "/auth") &&
        !hash.includes("type=recovery")
      ) {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            broadcastRealtime(data.session);
            window.location.replace("/dashboard");
          }
        });
      }
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        try {
          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("opteraos-auth-sync");
            bc.postMessage({ type: "AUTH_SUCCESS" });
            bc.close();
          }
          localStorage.setItem("opteraos_auth_sync_timestamp", Date.now().toString());
        } catch {}
        broadcastRealtime(session);
      }

      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
