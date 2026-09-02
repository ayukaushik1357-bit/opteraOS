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

  const organizations = data?.organizations ?? [];
  const current = organizations.find((o) => o.id === currentId) ?? organizations[0] ?? null;

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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <BrandLockup />
            </Link>
            {current && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden gap-2 sm:flex">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="max-w-[10rem] truncate">{current.name}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60">
                  <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                  {organizations.map((org) => (
                    <DropdownMenuItem key={org.id} onClick={() => setCurrent(org.id)}>
                      <span className="truncate">{org.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{org.role}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/onboarding" })}>
                    Create workspace
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Workspace">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{
                  className: "rounded-lg px-3 py-2 text-sm bg-secondary text-foreground",
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <NotificationsPopover />
            <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground lg:block">
              {email}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
        <nav
          className="flex items-center gap-1 overflow-x-auto border-t border-border/60 px-4 py-2 md:hidden"
          aria-label="Workspace mobile"
        >
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-muted-foreground"
              activeProps={{
                className: "rounded-lg px-3 py-1.5 text-sm bg-secondary text-foreground",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 pb-10 text-xs text-muted-foreground sm:px-6">
        <span className="inline-flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5" /> opteraOS — one system. smarter business.
        </span>
      </footer>
      <div className="fixed bottom-6 right-6 z-50">
        <AiAssistantDrawer />
      </div>
    </div>
  );
}
