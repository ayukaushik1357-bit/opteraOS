import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Zap,
  Sparkles,
  Users,
  CheckSquare,
  Mail,
  GitBranch,
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Copy,
  Trash2,
  UserPlus,
  UserCheck,
  Target,
  Briefcase,
  Receipt,
  BadgeCheck,
  Webhook,
  PlayCircle,
  Bot,
  Gauge,
  DollarSign,
  Activity,
  Bell,
  Search,
  Send,
  Octagon,
} from "lucide-react";
import { NODE_REGISTRY, CATEGORY_INFO, NodeCategory } from "./workflow-nodes-registry";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Sparkles,
  Users,
  CheckSquare,
  Mail,
  GitBranch,
  Database,
  UserPlus,
  UserCheck,
  Target,
  Briefcase,
  Receipt,
  BadgeCheck,
  Webhook,
  PlayCircle,
  Bot,
  Gauge,
  DollarSign,
  Activity,
  Bell,
  Search,
  Send,
  Octagon,
  Clock,
};

export interface CustomNodeData {
  nodeType: string;
  label: string;
  config: Record<string, any>;
  executionStatus?: "pending" | "running" | "successful" | "failed" | "skipped";
  executionDuration?: number;
  executionOutput?: any;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function CustomWorkflowNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as CustomNodeData;
  const def = NODE_REGISTRY[nodeData.nodeType] || {
    label: nodeData.label || "Custom Action",
    category: "crm" as NodeCategory,
    description: "Workflow node",
    icon: "Zap",
    isTrigger: false,
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: {},
    fields: [],
    outputVariables: [],
  };

  const catInfo = CATEGORY_INFO[def.category] || CATEGORY_INFO.crm;
  const IconComponent = ICON_MAP[def.icon] || Zap;
  const isIfElse = nodeData.nodeType === "logic_if_else";
  const isTrigger = def.isTrigger;
  const status = nodeData.executionStatus;

  // Subtitle / summary preview
  let subtitle = def.description;
  const cfg: any = nodeData.config || {};
  if (nodeData.nodeType === "action_create_task" && cfg["title"]) {
    subtitle = `Task: ${cfg["title"]}`;
  } else if (nodeData.nodeType === "action_send_email" && cfg["to"]) {
    subtitle = `To: ${cfg["to"]}`;
  } else if (nodeData.nodeType === "logic_if_else" && cfg["field"]) {
    subtitle = `If ${cfg["field"]} ${cfg["operator"] || ">"} ${cfg["value"] || ""}`;
  } else if (nodeData.nodeType === "action_ai_analyze" && cfg["model"]) {
    subtitle = `Model: ${cfg["model"]}`;
  }

  return (
    <div
      className={`group relative min-w-[280px] max-w-[320px] rounded-xl border bg-card/95 p-3.5 shadow-lg backdrop-blur-md transition-all duration-200 ${
        selected
          ? "border-primary ring-2 ring-primary/40 shadow-primary/20 shadow-xl"
          : "border-border/60 hover:border-border hover:shadow-md"
      } ${
        status === "running"
          ? "ring-2 ring-blue-500 shadow-blue-500/30"
          : status === "successful"
            ? "border-emerald-500/60 shadow-emerald-500/20"
            : status === "failed"
              ? "border-destructive/80 shadow-destructive/20"
              : status === "skipped"
                ? "opacity-50 grayscale"
                : ""
      }`}
    >
      {/* Input Handle (if not a trigger) */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3.5 !w-3.5 !-left-2 !bg-primary !border-2 !border-background transition-transform hover:scale-125"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${catInfo.color}`}>
            <IconComponent className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {catInfo.label}
            </div>
            <h4 className="text-sm font-medium leading-tight text-foreground truncate max-w-[170px]">
              {nodeData.label || def.label}
            </h4>
          </div>
        </div>

        {/* Execution Status Badge */}
        {status && (
          <div className="flex items-center">
            {status === "running" && (
              <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400 border border-blue-500/20 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" /> Running
              </span>
            )}
            {status === "successful" && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Done
                {nodeData.executionDuration ? ` (${nodeData.executionDuration}ms)` : ""}
              </span>
            )}
            {status === "failed" && (
              <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive border border-destructive/20">
                <XCircle className="h-3 w-3" /> Error
              </span>
            )}
            {status === "skipped" && (
              <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Skipped
              </span>
            )}
          </div>
        )}
      </div>

      {/* Description / Config preview */}
      <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {subtitle}
      </p>

      {/* Quick Action Overlay on hover */}
      <div className="absolute -top-3 right-2 hidden items-center gap-1 rounded-md border bg-background/95 p-0.5 shadow-sm group-hover:flex">
        {nodeData.onDuplicate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onDuplicate?.(id);
            }}
            title="Duplicate node"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
        {nodeData.onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onDelete?.(id);
            }}
            title="Delete node"
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Output Handles */}
      {isIfElse ? (
        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] font-medium">
          <div className="relative flex items-center gap-1 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> YES / True
            <Handle
              type="source"
              id="true"
              position={Position.Right}
              style={{ top: "auto", bottom: "14px" }}
              className="!h-3.5 !w-3.5 !-right-2 !bg-emerald-500 !border-2 !border-background transition-transform hover:scale-125"
            />
          </div>
          <div className="relative flex items-center gap-1 text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> NO / False
            <Handle
              type="source"
              id="false"
              position={Position.Right}
              style={{ top: "auto", bottom: "34px" }}
              className="!h-3.5 !w-3.5 !-right-2 !bg-rose-500 !border-2 !border-background transition-transform hover:scale-125"
            />
          </div>
        </div>
      ) : def.outputs.length > 0 ? (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3.5 !w-3.5 !-right-2 !bg-primary !border-2 !border-background transition-transform hover:scale-125"
        />
      ) : null}
    </div>
  );
}
