import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Save,
  Play,
  CheckCircle2,
  Sparkles,
  MoreHorizontal,
  Copy,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  Loader2,
  Check,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WorkflowToolbarProps {
  workflowName: string;
  isActive: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onTest: () => void;
  onToggleActive: (active: boolean) => void;
  onDuplicate?: (() => void) | undefined;
  onExportJson?: (() => void) | undefined;
  onAutoLayout?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
}

export function WorkflowToolbar({
  workflowName,
  isActive,
  isSaving,
  hasUnsavedChanges,
  onNameChange,
  onSave,
  onTest,
  onToggleActive,
  onDuplicate,
  onExportJson,
  onAutoLayout,
  onDelete,
}: WorkflowToolbarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(workflowName);

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (nameValue.trim()) {
      onNameChange(nameValue.trim());
    } else {
      setNameValue(workflowName);
    }
  };

  return (
    <header className="h-14 border-b border-border/60 bg-card/95 backdrop-blur-xl px-4 flex items-center justify-between gap-4 z-30 select-none">
      {/* Left: Back & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to="/workflows"
          className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Workflows</span>
        </Link>

        <div className="h-4 w-px bg-border/60" />

        {/* Workflow Title */}
        <div className="flex items-center gap-2 min-w-0">
          {isEditingName ? (
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameBlur();
                if (e.key === "Escape") {
                  setNameValue(workflowName);
                  setIsEditingName(false);
                }
              }}
              autoFocus
              className="h-8 max-w-xs text-sm font-semibold bg-background"
            />
          ) : (
            <button
              onClick={() => {
                setNameValue(workflowName);
                setIsEditingName(true);
              }}
              className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors truncate max-w-xs sm:max-w-md"
              title="Click to rename workflow"
            >
              <span className="truncate">{workflowName || "Untitled Automation"}</span>
              <span className="opacity-0 group-hover:opacity-100 text-[10px] font-normal text-muted-foreground">
                (edit)
              </span>
            </button>
          )}

          {/* Status Badge */}
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              isActive
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-muted/60 text-muted-foreground border-border/50"
            }`}
          >
            {isActive ? "Active" : "Draft"}
          </Badge>

          {hasUnsavedChanges && (
            <span
              className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse"
              title="Unsaved changes on canvas"
            />
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Test Workflow Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onTest}
          className="h-8 gap-1.5 text-xs font-medium border-border/70 hover:bg-muted text-foreground"
        >
          <Play className="h-3.5 w-3.5 text-primary fill-primary/20" />
          <span>Test Workflow</span>
        </Button>

        {/* Save Button */}
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="h-8 gap-1.5 text-xs font-medium bg-gradient-brand text-primary-foreground shadow-sm hover:opacity-95"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          <span>{isSaving ? "Saving..." : "Save"}</span>
        </Button>

        <div className="h-4 w-px bg-border/60" />

        {/* Active Switch */}
        <div className="flex items-center gap-2 pl-1">
          <span className="hidden text-xs text-muted-foreground md:inline">
            {isActive ? "Enabled" : "Paused"}
          </span>
          <Switch
            checked={isActive}
            onCheckedChange={onToggleActive}
            aria-label="Toggle workflow active state"
          />
        </div>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onDuplicate && (
              <DropdownMenuItem onClick={onDuplicate} className="text-xs">
                <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate Workflow
              </DropdownMenuItem>
            )}
            {onExportJson && (
              <DropdownMenuItem onClick={onExportJson} className="text-xs">
                <Download className="mr-2 h-3.5 w-3.5" /> Export Definition (JSON)
              </DropdownMenuItem>
            )}
            {onAutoLayout && (
              <DropdownMenuItem onClick={onAutoLayout} className="text-xs">
                <Sparkles className="mr-2 h-3.5 w-3.5" /> Auto-Arrange Canvas
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-xs text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Workflow
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
