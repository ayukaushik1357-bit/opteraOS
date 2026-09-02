import React, { useState } from "react";
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Sparkles,
  Info,
  Terminal,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const SAMPLE_PAYLOADS: Record<string, { label: string; payload: Record<string, any> }> = {
  customer_created: {
    label: "Sample Customer Created (Enterprise)",
    payload: {
      customer: {
        id: "cust-908123",
        name: "Elena Rostova",
        email: "elena.rostova@apexglobal.io",
        company: "Apex Global Technologies",
        phone: "+1 (555) 234-8890",
        status: "active",
      },
    },
  },
  lead_qualified: {
    label: "Sample High-Value Lead (Score: 92)",
    payload: {
      lead: {
        id: "lead-44120",
        name: "Marcus Vance",
        email: "mvance@cybernetix.com",
        company: "Cybernetix AI Systems",
        score: 92,
        stage: "qualified",
      },
    },
  },
  invoice_overdue: {
    label: "Sample Overdue Invoice ($12,500)",
    payload: {
      invoice: {
        id: "inv-2026-081",
        invoice_number: "INV-2026-081",
        customer_name: "Starlight Media Group",
        total_amount: 12500,
        due_date: "2026-08-01",
        status: "overdue",
      },
    },
  },
  deal_won: {
    label: "Sample Deal Won ($28,000)",
    payload: {
      deal: {
        id: "deal-5532",
        title: "Enterprise Annual Contract - Starlight",
        amount: 28000,
        stage: "won",
      },
    },
  },
};

interface TestWorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowName: string;
  triggerType: string;
  isRunning: boolean;
  testResult: any | null;
  onRunTest: (payload: Record<string, any>) => void;
}

export function TestWorkflowModal({
  open,
  onOpenChange,
  workflowName,
  triggerType,
  isRunning,
  testResult,
  onRunTest,
}: TestWorkflowModalProps) {
  const [selectedPreset, setSelectedPreset] = useState("customer_created");
  const [customJson, setCustomJson] = useState(
    JSON.stringify((SAMPLE_PAYLOADS as any)["customer_created"]?.payload || {}, null, 2),
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handlePresetSelect = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const preset = (SAMPLE_PAYLOADS as any)[presetKey];
    if (preset) {
      setCustomJson(JSON.stringify(preset.payload, null, 2));
      setJsonError(null);
    }
  };

  const handleExecute = () => {
    try {
      const parsed = JSON.parse(customJson);
      setJsonError(null);
      onRunTest(parsed);
    } catch (e: any) {
      setJsonError("Invalid JSON syntax: " + e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card/95 backdrop-blur-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Play className="h-4 w-4 fill-primary/30" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Test Workflow Execution</DialogTitle>
              <DialogDescription className="text-xs">
                Simulate a test run of <span className="font-semibold text-foreground">{workflowName}</span> without affecting production data.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Preset Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">Trigger Test Preset</Label>
              <Badge variant="outline" className="text-[10px] font-mono">
                Trigger: {triggerType}
              </Badge>
            </div>
            <Select value={selectedPreset} onValueChange={handlePresetSelect}>
              <SelectTrigger className="h-9 text-xs bg-background/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SAMPLE_PAYLOADS).map(([key, item]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Test Payload JSON Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">Simulated Input Data (JSON)</Label>
              <span className="text-[11px] text-muted-foreground">Variables injected into `trigger.*`</span>
            </div>
            <Textarea
              value={customJson}
              onChange={(e) => {
                setCustomJson(e.target.value);
                setJsonError(null);
              }}
              rows={6}
              className="font-mono text-xs bg-background/90 resize-y"
            />
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
          </div>

          {/* Test Results Output */}
          {testResult && (
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {testResult.status === "successful" ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Execution Successful
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-destructive">
                      <XCircle className="h-4 w-4" /> Execution Failed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{testResult.durationMs}ms</span>
                </div>
              </div>

              {/* Step Traces List */}
              <ScrollArea className="max-h-48 rounded-lg border border-border/40 bg-background/60 p-2 text-xs">
                <div className="space-y-1.5">
                  {(testResult.traces || []).map((step: any, index: number) => (
                    <div
                      key={step.nodeId || index}
                      className="flex items-center justify-between rounded p-1.5 bg-muted/40 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {step.status === "successful" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        )}
                        {step.status === "failed" && (
                          <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                        {step.status === "skipped" && (
                          <span className="h-2 w-2 rounded-full bg-muted-foreground shrink-0" />
                        )}
                        <span className="font-medium text-foreground truncate">{step.nodeLabel}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                        {step.status === "skipped" ? "Skipped" : `${step.durationMs}ms`}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Close
          </Button>
          <Button
            size="sm"
            onClick={handleExecute}
            disabled={isRunning}
            className="gap-1.5 text-xs bg-gradient-brand text-primary-foreground"
          >
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isRunning ? "Executing Test..." : "Run Test"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
