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
  ChevronLeft,
  ChevronRight,
  Contact,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
  Sparkles,
  Package,
  ShoppingCart,
  Megaphone,
  Layers,
  Settings,
  Truck,
  Factory,
  FolderKanban,
  LifeBuoy,
  MessageSquare,
  DollarSign,
  Activity,
  ShieldCheck,
  Menu,
  X,
  Bell,
  Search,
  HelpCircle,
  User,
  Workflow,
  Receipt,
  IndianRupee,
  Tags,
  PieChart,
  ClipboardList,
  Brain,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/Logo";
import { AiAssistantDrawer } from "@/components/app/AiAssistantDrawer";
import { NotificationsPopover } from "@/components/app/NotificationsPopover";
import { GlobalSearchModal } from "@/components/app/GlobalSearchModal";
import { UserProfileModal } from "@/components/app/UserProfileModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { authApi } from "@/lib/api";
import { authStorage } from "@/lib/api/client";

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
    staleTime: 120_000,
  });
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setCurrentId(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const defaultOrg: Workspace = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "opteraOS Enterprise",
    slug: "optera-enterprise",
    role: "owner",
    plan: "enterprise",
    currency: "INR",
  };

  const organizations: Workspace[] = (data?.organizations && data.organizations.length > 0)
    ? data.organizations
    : [defaultOrg];
  const current = organizations.find((o: Workspace) => o.id === currentId) ?? organizations[0] ?? defaultOrg;

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      organizations,
      current,
      email: data?.email ?? null,
      invites: data?.invites ?? [],
      isLoading,
      setCurrent: (id: string) => {
        window.localStorage.setItem(STORAGE_KEY, id);
        authStorage.setOrgId(id);
        setCurrentId(id);
      },
    }),
    [organizations, current, data?.email, data?.invites, isLoading],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

// ── Navigation structure (Autopilot elevated to top-level Core) ───────────────

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/workflows", label: "Autopilot", icon: Zap },
    ],
  },
  {
    label: "CRM",
    items: [
      { to: "/leads", label: "Leads", icon: UserPlus },
      { to: "/deals", label: "Opportunities", icon: TrendingUp },
      { to: "/customers", label: "Customers", icon: Building2 },
      { to: "/contacts", label: "Contacts", icon: Contact },
      { to: "/activities", label: "Activities", icon: Activity },
    ],
  },
  {
    label: "Sales & Invoicing",
    items: [
      { to: "/quotations", label: "Quotations", icon: FileText },
      { to: "/orders", label: "Sales Orders", icon: ShoppingCart },
      { to: "/invoices", label: "Invoices", icon: Receipt },
      { to: "/payments", label: "Payments", icon: IndianRupee },
      { to: "/products", label: "Products", icon: Package },
      { to: "/pricelists", label: "Price Lists", icon: Tags },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/accounting", label: "Accounting & GL", icon: DollarSign },
      { to: "/expenses", label: "Expenses", icon: ClipboardList },
      { to: "/reports", label: "Financial Reports", icon: PieChart },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/inventory", label: "Inventory", icon: Package },
      { to: "/purchase", label: "Purchase", icon: Truck },
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/manufacturing", label: "Manufacturing", icon: Factory },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/hr", label: "HR & People", icon: Users },
      { to: "/tasks", label: "Tasks", icon: CheckSquare },
    ],
  },
  {
    label: "Engagement",
    items: [
      { to: "/marketing", label: "Marketing", icon: Megaphone },
      { to: "/helpdesk", label: "Helpdesk", icon: LifeBuoy },
      { to: "/discuss", label: "Discuss", icon: MessageSquare },
      { to: "/knowledge", label: "Knowledge", icon: BookOpen },
    ],
  },
  {
    label: "AI",
    items: [
      { to: "/ai", label: "optera AI Copilot", icon: Brain },
    ],
  },
  {
    label: "Analytics",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/audit-logs", label: "Audit Logs", icon: ShieldCheck },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/team", label: "Team", icon: Users },
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/integrations", label: "Integrations", icon: Layers },
    ],
  },
];

// ── Sidebar component ─────────────────────────────────────────────────────────

function Sidebar({
  collapsed,
  onClose,
  isOverlay,
}: {
  collapsed: boolean;
  onClose?: () => void;
  isOverlay?: boolean;
}) {
  const { organizations, current, setCurrent, isLoading: loadingWorkspace } = useWorkspace();
  const navigate = useNavigate();

  return (
    <aside
      className={[
        "flex h-full flex-col bg-white border-r border-[#E2E8F0] overflow-y-auto overflow-x-hidden transition-all duration-200 shadow-2xs",
        collapsed ? "w-[60px]" : "w-[240px]",
        isOverlay ? "shadow-xl" : "",
      ].join(" ")}
      aria-label="Sidebar Navigation"
    >
      {/* Logo + Collapse */}
      <div className={[
        "flex h-16 shrink-0 items-center border-b border-[#E2E8F0] px-4",
        collapsed ? "justify-center" : "justify-between",
      ].join(" ")}>
        {collapsed ? (
          <Link to="/dashboard" aria-label="opteraOS Home">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold shadow-xs">
              O
            </div>
          </Link>
        ) : (
          <Link to="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold shadow-xs shrink-0">
              O
            </div>
            <span className="text-base font-bold tracking-tight text-[#111827]">
              optera<span className="text-blue-600">OS</span>
            </span>
          </Link>
        )}
        {isOverlay && !collapsed && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Workspace Switcher */}
      {!collapsed && (
        <div className="shrink-0 border-b border-[#E2E8F0] px-3 py-2.5">
          {loadingWorkspace ? (
            <Skeleton className="h-9 w-full rounded-lg" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-gray-50 transition-colors cursor-pointer border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700 text-xs font-bold">
                    {current?.name?.slice(0, 2).toUpperCase() || "WS"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#111827]">{current?.name || "Workspace"}</p>
                    <p className="text-[11px] text-[#6B7280] font-medium capitalize">{current?.role || "owner"}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 border border-[#E2E8F0] bg-white shadow-lg">
                <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Workspaces
                </DropdownMenuLabel>
                {organizations.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => setCurrent(org.id)}
                    className={[
                      "cursor-pointer rounded-md text-sm",
                      current?.id === org.id ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700",
                    ].join(" ")}
                  >
                    <span className="truncate">{org.name}</span>
                    <span className="ml-auto text-[11px] text-gray-500 capitalize">{org.role}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/onboarding" })}
                  className="cursor-pointer text-sm text-blue-600 font-medium hover:bg-blue-50"
                >
                  + Create workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 space-y-0.5 px-2 py-3 overflow-y-auto no-scrollbar" aria-label="Main navigation">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-[#374151] transition-colors duration-100 hover:bg-[#F1F5F9] hover:text-[#111827]",
                  collapsed ? "justify-center px-0" : "",
                ].join(" ")}
                activeProps={{
                  className: [
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-semibold bg-[#E8F0FF] text-[#2563EB] relative",
                    "before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-0.5 before:rounded-r before:bg-[#2563EB]",
                    collapsed ? "justify-center px-0" : "",
                  ].join(" "),
                }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

// ── Main AppShell ─────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: ReactNode }) {
  const { current, email } = useWorkspace();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    try { await authApi.logout(); } catch { /* ignore */ }
    authStorage.clear();
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  const userInitials = email
    ? (email.split("@")[0] || "U").slice(0, 2).toUpperCase()
    : "OP";

  return (
    <div className="min-h-screen text-[#111827] flex flex-col">

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center border-b border-[#E2E8F0] bg-white/95 backdrop-blur-xs px-4 sm:px-6 shadow-xs">

        {/* Mobile hamburger */}
        <button
          className="mr-3 rounded-md p-1.5 text-gray-600 hover:bg-gray-100 lg:hidden cursor-pointer"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop sidebar collapse toggle */}
        <button
          className="mr-4 hidden rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 lg:flex cursor-pointer"
          onClick={() => setSidebarCollapsed((v) => !v)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Mobile logo (visible only when sidebar closed) */}
        <Link to="/dashboard" className="mr-4 flex items-center gap-2 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white text-xs font-bold shadow-xs">
            O
          </div>
          <span className="text-sm font-bold tracking-tight text-[#111827]">
            optera<span className="text-blue-600">OS</span>
          </span>
        </Link>

        {/* Center: Search */}
        <div className="flex-1 max-w-md mx-auto px-2 hidden sm:block">
          <GlobalSearchModal />
        </div>

        {/* Mobile search */}
        <div className="sm:hidden mr-2">
          <GlobalSearchModal />
        </div>

        {/* Right: actions */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          <NotificationsPopover />

          {/* User avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="User menu"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  {userInitials}
                </div>
                <span className="hidden max-w-[8rem] truncate text-sm font-semibold text-[#111827] lg:inline">
                  {email?.split("@")[0] || "Account"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-500 hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 border border-[#E2E8F0] bg-white shadow-lg">
              <DropdownMenuLabel className="text-xs text-gray-500">
                <div className="font-bold text-[#111827] text-sm">{email?.split("@")[0] || "User"}</div>
                <div className="text-[11px] text-gray-500 truncate">{email || ""}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProfileOpen(true)} className="cursor-pointer text-sm text-gray-700">
                <User className="mr-2 h-4 w-4" /> Profile & Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/settings" })} className="cursor-pointer text-sm text-gray-700">
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-sm text-red-600 focus:text-red-600 focus:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Body: Sidebar + Content ──────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:shrink-0">
          <Sidebar collapsed={sidebarCollapsed} />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
              <Sidebar collapsed={false} onClose={() => setMobileOpen(false)} isOverlay />
            </div>
          </>
        )}

        {/* Main Content Area — floating over global light gradient canvas */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 box-border">
            {children}
          </div>
        </main>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal open={profileOpen} onOpenChange={setProfileOpen} />

      {/* optera AI Copilot Drawer */}
      <div className="fixed bottom-6 right-6 z-50">
        <AiAssistantDrawer />
      </div>
    </div>
  );
}
