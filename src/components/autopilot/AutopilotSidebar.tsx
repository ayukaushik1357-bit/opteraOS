import React from "react";
import {
  Briefcase,
  Play,
  Clock,
  PauseCircle,
  AlertOctagon,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Zap,
  TrendingUp,
  Users,
  UserCheck,
  Mail,
  Receipt,
  Brain,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CAPABILITIES_CATALOG,
  type CapabilityDefinition,
  type CapabilityCategory,
  type CapabilityStatus,
} from "@/lib/capabilities.config";

export type WorkFilterType =
  | "all_work"
  | "running"
  | "scheduled"
  | "paused"
  | "failed"
  | "completed";

interface AutopilotSidebarProps {
  activeFilter: WorkFilterType;
  onSelectFilter: (filter: WorkFilterType) => void;
  onSelectCapability: (capability: CapabilityDefinition) => void;
  selectedCapabilityId?: string | null | undefined;
  counts?: {
    allWork?: number | undefined;
    running?: number | undefined;
    scheduled?: number | undefined;
    paused?: number | undefined;
    failed?: number | undefined;
    completed?: number | undefined;
  };
}

export function AutopilotSidebar({
  activeFilter,
  onSelectFilter,
  onSelectCapability,
  selectedCapabilityId,
  counts,
}: AutopilotSidebarProps) {
  const workFilterItems: Array<{
    id: WorkFilterType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    count?: number | undefined;
  }> = [
    { id: "all_work", label: "All Work", icon: Briefcase, color: "text-blue-600", count: counts?.allWork },
    { id: "running", label: "Running", icon: Play, color: "text-emerald-600", count: counts?.running },
    { id: "scheduled", label: "Scheduled", icon: Clock, color: "text-cyan-600", count: counts?.scheduled },
    { id: "paused", label: "Paused", icon: PauseCircle, color: "text-amber-600", count: counts?.paused },
    { id: "failed", label: "Failed", icon: AlertOctagon, color: "text-rose-600", count: counts?.failed },
    { id: "completed", label: "Completed", icon: CheckCircle2, color: "text-blue-600", count: counts?.completed },
  ];

  const categories: Array<{
    id: CapabilityCategory;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
  }> = [
    { id: "sales", title: "SALES", icon: TrendingUp, accent: "text-emerald-600" },
    { id: "customers", title: "CUSTOMERS", icon: Users, accent: "text-blue-600" },
    { id: "team", title: "TEAM", icon: UserCheck, accent: "text-purple-600" },
    { id: "communication", title: "COMMUNICATION", icon: Mail, accent: "text-cyan-600" },
    { id: "finance", title: "FINANCE", icon: Receipt, accent: "text-amber-600" },
    { id: "ai", title: "AI", icon: Brain, accent: "text-rose-600" },
  ];

  function renderStatusDot(status: CapabilityStatus) {
    if (status === "LIVE") {
      return (
        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]" title="LIVE (Fully Connected)" />
      );
    }
    if (status === "PARTIALLY_CONNECTED") {
      return (
        <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.6)]" title="Config Required" />
      );
    }
    return (
      <span className="flex h-1.5 w-1.5 rounded-full bg-rose-400" title="Not Connected" />
    );
  }

  return (
    <aside className="w-full lg:w-64 shrink-0 rounded-2xl border border-[#E2E8F0] bg-white/90 p-3.5 shadow-sm space-y-6 select-none">
      {/* ── SECTION 1: AUTOPILOT (WORK VIEWS) ───────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-2.5 py-1">
          <span className="text-[11px] font-bold tracking-wider text-[#6B7280] uppercase flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-blue-600" />
            <span>Autopilot</span>
          </span>
          <Badge variant="outline" className="text-[9px] font-mono border-[#E2E8F0] text-[#6B7280] bg-slate-50">
            Work
          </Badge>
        </div>

        <div className="space-y-0.5">
          {workFilterItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeFilter === item.id && !selectedCapabilityId;
            return (
              <button
                key={item.id}
                onClick={() => onSelectFilter(item.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-xs"
                    : "text-[#4B5563] hover:bg-slate-50 hover:text-[#111827]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count !== null && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
                      isActive
                        ? "bg-blue-100/80 text-blue-800"
                        : "bg-slate-100 text-[#6B7280] group-hover:text-[#111827]"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 2: WHAT OPTERAOS CAN DO ─────────────────────────── */}
      <div className="space-y-4 pt-3 border-t border-[#E2E8F0]">
        <div className="flex items-center justify-between px-2.5">
          <span className="text-[11px] font-bold tracking-wider text-[#6B7280] uppercase flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>What opteraOS Can Do</span>
          </span>
        </div>

        <div className="space-y-4">
          {categories.map((cat) => {
            const CatIcon = cat.icon;
            const caps = CAPABILITIES_CATALOG.filter((c) => c.category === cat.id);

            return (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold tracking-widest text-[#9CA3AF] uppercase">
                  <CatIcon className={`h-3 w-3 ${cat.accent}`} />
                  <span>{cat.title}</span>
                </div>

                <div className="space-y-0.5">
                  {caps.map((cap) => {
                    const isSelected = selectedCapabilityId === cap.id;
                    return (
                      <button
                        key={cap.id}
                        onClick={() => onSelectCapability(cap)}
                        className={`group flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-all text-left ${
                          isSelected
                            ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200"
                            : "text-[#374151] hover:bg-slate-50 hover:text-[#111827]"
                        }`}
                      >
                        <span className="truncate pr-1 leading-snug">{cap.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {renderStatusDot(cap.status)}
                          <ChevronRight className="h-3 w-3 text-[#9CA3AF] group-hover:text-[#4B5563] group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
