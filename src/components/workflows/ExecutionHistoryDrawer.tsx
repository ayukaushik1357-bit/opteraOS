import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  RefreshCw,
  Terminal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shortDate } from "@/lib/format";

interface ExecutionItem {
  id: string;
  workflow_id: string;
  trigger_event: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  workflows?: { name?: string };
  logs?: any[];
}

interface ExecutionHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executions: ExecutionItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function ExecutionHistoryDrawer({
  open,
  onOpenChange,
  executions,
  isLoading,
  onRefresh,
}: ExecutionHistoryDrawerProps) {
  const [selectedExecution, setSelectedExecution] = useState<ExecutionItem | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-border bg-card/95 backdrop-blur-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Workflow Execution History</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Detailed execution traces, step statuses, and debugging outputs.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border/60 flex-1 min-h-0">
          {/* Left Column: Execution List */}
          <div className="md:col-span-5 p-3 flex flex-col min-h-0">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Recent Executions ({executions.length})
            </span>
            <ScrollArea className="flex-1">
              {executions.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No executions recorded yet.
                </div>
              ) : (
                <div className="space-y-1.5 pr-2">
                  {executions.map((ex) => {
                    const isSelected = selectedExecution?.id === ex.id;
                    return (
                      <button
                        key={ex.id}
                        onClick={() => setSelectedExecution(ex)}
                        className={`w-full flex items-start justify-between rounded-xl p-2.5 text-left text-xs transition-all border ${
                          isSelected
                            ? "border-primary/60 bg-primary/10 text-foreground"
                            : "border-border/40 bg-background/50 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {ex.status === "successful" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            ) : ex.status === "failed" ? (
                              <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                            ) : (
                              <Play className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            )}
                            <span className="font-semibold text-foreground truncate">
                              {ex.workflows?.name || "Automation Run"}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                            <span>{shortDate(ex.started_at)}</span>
                            {ex.duration_ms && <span>• {ex.duration_ms}ms</span>}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] uppercase ml-2 shrink-0">
                          {ex.trigger_event}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Column: Detailed Execution Trace */}
          <div className="md:col-span-7 p-4 flex flex-col min-h-0 bg-muted/10">
            {selectedExecution ? (
              <div className="flex flex-col h-full space-y-3 min-h-0">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Execution #{selectedExecution.id.slice(0, 8)}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Trigger: <span className="font-mono text-primary">{selectedExecution.trigger_event}</span>
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      selectedExecution.status === "successful"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-destructive/10 text-destructive border-destructive/30"
                    }
                  >
                    {selectedExecution.status}
                  </Badge>
                </div>

                <ScrollArea className="flex-1 pr-2">
                  <div className="space-y-3">
                    {/* Error message if any */}
                    {selectedExecution.error_message && (
                      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                        <span className="font-semibold">Error:</span> {selectedExecution.error_message}
                      </div>
                    )}

                    {/* Step Traces if available */}
                    {selectedExecution.logs && selectedExecution.logs.length > 0 ? (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                          Step Traces
                        </span>
                        {selectedExecution.logs.map((log: any, i: number) => (
                          <div
                            key={log.id || i}
                            className="rounded-lg border border-border/50 bg-card/60 p-2.5 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between font-medium text-foreground">
                              <span className="flex items-center gap-1.5">
                                {log.status === "successful" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                ) : log.status === "failed" ? (
                                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                                ) : (
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                                {log.node_label || log.nodeLabel || log.node_type || "Step"}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {log.duration_ms || log.durationMs || 0}ms
                              </span>
                            </div>
                            {log.output && (
                              <pre className="max-h-32 overflow-auto rounded bg-muted/40 p-1.5 text-[10px] font-mono text-muted-foreground">
                                {JSON.stringify(log.output, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        Step logs captured during run.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                <Terminal className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <h5 className="text-sm font-medium text-foreground">Select an Execution</h5>
                <p className="text-xs text-muted-foreground mt-1">
                  Click any run from the left list to view step-by-step traces, durations, and outputs.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
