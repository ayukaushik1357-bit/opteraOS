import React, { useState } from "react";
import {
  Search,
  Zap,
  Sparkles,
  Users,
  CheckSquare,
  Mail,
  GitBranch,
  Database,
  Plus,
  Info,
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
  Send,
  Octagon,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  NODE_REGISTRY,
  CATEGORY_INFO,
  NodeCategory,
  NodeDefinition,
} from "./workflow-nodes-registry";

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

interface NodeLibraryProps {
  onAddNode: (nodeType: string) => void;
}

export function NodeLibrary({ onAddNode }: NodeLibraryProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory | "all">("all");

  const categories: Array<{ id: NodeCategory | "all"; label: string }> = [
    { id: "all", label: "All Nodes" },
    { id: "triggers", label: "Triggers" },
    { id: "ai", label: "AI & ML" },
    { id: "crm", label: "CRM" },
    { id: "business", label: "Tasks" },
    { id: "communication", label: "Messages" },
    { id: "logic", label: "Logic" },
    { id: "data", label: "Webhooks" },
  ];

  const allDefinitions = Object.values(NODE_REGISTRY);

  const filteredNodes = allDefinitions.filter((node) => {
    if (selectedCategory !== "all" && node.category !== selectedCategory) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        node.label.toLowerCase().includes(q) ||
        node.description.toLowerCase().includes(q) ||
        node.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData("application/reactflow/type", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-76 border-r border-border/60 bg-card/95 backdrop-blur-xl flex flex-col h-full z-10 select-none">
      {/* Search Header */}
      <div className="p-3.5 border-b border-border/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Node Library
          </h3>
          <span className="text-[11px] font-medium text-muted-foreground">
            {allDefinitions.length} actions
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search triggers & actions..."
            className="pl-8 h-8 text-xs bg-background/80"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] whitespace-nowrap transition-colors ${
                selectedCategory === c.id
                  ? "bg-primary text-primary-foreground font-medium shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nodes list */}
      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-2">
          {filteredNodes.map((node) => {
            const catInfo = CATEGORY_INFO[node.category] || CATEGORY_INFO.crm;
            const IconComponent = ICON_MAP[node.icon] || Zap;

            return (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => handleDragStart(e, node.type)}
                onClick={() => onAddNode(node.type)}
                className="group relative flex cursor-grab items-start gap-2.5 rounded-xl border border-border/50 bg-background/50 p-2.5 transition-all duration-150 hover:border-primary/60 hover:bg-muted/40 hover:shadow-md active:cursor-grabbing"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${catInfo.color}`}
                >
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold text-foreground group-hover:text-primary truncate">
                      {node.label}
                    </h5>
                    {node.isTrigger && (
                      <span className="text-[9px] uppercase font-bold tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                        Trigger
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                    {node.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddNode(node.type);
                  }}
                  className="opacity-0 group-hover:opacity-100 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm transition-opacity"
                  title="Add to canvas"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t border-border/60 p-3 bg-muted/20 text-center">
        <p className="text-[11px] text-muted-foreground">
          Drag & drop onto canvas, or click <Plus className="inline h-3 w-3" /> to add
        </p>
      </div>
    </aside>
  );
}
