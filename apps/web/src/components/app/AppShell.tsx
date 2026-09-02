import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  BookOpen,
  Building2,
  CheckSquare,
  ChevronDown,
  Contact,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/Logo";
import { AiAssistantDrawer } from "@/components/app/AiAssistantDrawer";
import { NotificationsPopover } from "@/components/app/NotificationsPopover";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { getMyWorkspaces } from "@/lib/workspace.functions";

const STORAGE_KEY = "opteraos.currentOrg";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
  plan: string;
  currency: string;
};

type WorkspaceContextValue = {
  organizations: Workspace[];
  current: Workspace | null;
  setCurrent: (id: string) => void;
  email: string | null;
  invites: { id: string; org_id: string; role: string; org_name: string }[];
  isLoading: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const fetchWorkspaces = useServerFn(getMyWorkspaces);
  const { data, isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => fetchWorkspaces(),
  });
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setCurrentId(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const organizations: Workspace[] = data?.organizations ?? [];
  const current = organizations.find((o: Workspace) => o.id === currentId) ?? organizations[0] ?? null;

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      organizations,
      current,
      email: data?.email ?? null,
      invites: data?.invites ?? [],
      isLoading,
      setCurrent: (id: string) => {
        window.localStorage.setItem(STORAGE_KEY, id);
        setCurrentId(id);
      },
    }),
    [organizations, current, data?.email, data?.invites, isLoading],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/analytics", label: "Analytics", icon: LineChart },
  { to: "/crm", label: "CRM", icon: BarChart3 },
  { to: "/leads", label: "Leads", icon: UserPlus },
  { to: "/customers", label: "Customers", icon: Contact },
  { to: "/deals", label: "Pipeline", icon: TrendingUp },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/workflows", label: "Automation", icon: Zap },
  { to: "/knowledge", label: "Knowledge", icon: BookOpen },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/team", label: "Team", icon: Users },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { organizations, current, setCurrent, email } = useWorkspace();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground selection:bg-indigo-500/30 selection:text-white flex flex-col">
      {/* ── Top Header Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-[#070913]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* Left: Brand & Workspace */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link to="/dashboard" className="shrink-0 transition-opacity hover:opacity-90">
              <BrandLockup />
            </Link>

            {current && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-white/10 bg-white/[0.04] text-xs font-medium text-slate-200 hover:bg-white/[0.08] hover:text-white max-w-[140px] sm:max-w-[200px]"
                  >
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                    <span className="truncate">{current.name}</span>
                    <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 border-white/10 bg-slate-950/95 text-slate-200 backdrop-blur-xl">
                  <DropdownMenuLabel className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Workspaces
                  </DropdownMenuLabel>
                  {organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => setCurrent(org.id)}
                      className="cursor-pointer hover:bg-white/10 hover:text-white focus:bg-white/10"
                    >
                      <span className="truncate font-medium">{org.name}</span>
                      <span className="ml-auto text-[11px] font-mono text-indigo-400">{org.role}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/onboarding" })}
                    className="cursor-pointer text-cyan-400 hover:bg-white/10 hover:text-cyan-300 focus:bg-white/10"
                  >
                    + Create workspace
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Right: Notifications, Email, Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationsPopover />
            {email && (
              <span className="hidden max-w-[10rem] truncate text-xs text-slate-400 lg:block font-mono">
                {email}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="h-8 gap-1 px-2.5 text-xs text-slate-400 hover:bg-white/[0.08] hover:text-rose-400"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>

        {/* ── Sub Navigation Module Bar ─────────────────────────────────── */}
        <div className="border-t border-white/[0.06] bg-[#070913]/60">
          <nav
            className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6 no-scrollbar"
            aria-label="Workspace Modules"
          >
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 transition-all hover:bg-white/[0.06] hover:text-slate-200"
                activeProps={{
                  className:
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 text-white border border-indigo-500/40 shadow-sm shadow-indigo-500/10",
                }}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Main Application Content ──────────────────────────────────── */}
      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-6 sm:px-6 box-border overflow-x-hidden">
        {children}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="mx-auto w-full max-w-7xl px-4 py-6 text-xs text-slate-500 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
          <span className="inline-flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-indigo-400" /> optera<span className="text-gradient">OS</span> — one system. smarter business.
          </span>
          <span className="text-[11px] text-slate-600 font-mono">Enterprise AI Business OS</span>
        </div>
      </footer>

      {/* ── Floating optera AI Copilot Drawer ────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50">
        <AiAssistantDrawer />
      </div>
    </div>
  );
}
