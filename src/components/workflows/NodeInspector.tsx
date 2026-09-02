import React, { useState } from "react";
import {
  X,
  Trash2,
  Copy,
  Sparkles,
  Info,
  ChevronDown,
  ChevronRight,
  Sliders,
  Play,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  NODE_REGISTRY,
  CATEGORY_INFO,
  NodeDefinition,
} from "./workflow-nodes-registry";
import { VariablePicker, AvailableUpstreamSource } from "./VariablePicker";

interface NodeInspectorProps {
  selectedNode: {
    id: string;
    data: {
      nodeType: string;
      label: string;
      config: Record<string, any>;
      executionOutput?: any;
    };
  } | null;
  upstreamSources: AvailableUpstreamSource[];
  onUpdateNode: (nodeId: string, updates: { label?: string; config?: Record<string, any> }) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeInspector({
  selectedNode,
  upstreamSources,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  onClose,
}: NodeInspectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!selectedNode) {
    return (
      <aside className="w-80 border-l border-border/60 bg-card/40 backdrop-blur-xl p-6 text-center flex flex-col items-center justify-center text-muted-foreground select-none">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 mb-3">
          <Sliders className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <h4 className="text-sm font-medium text-foreground">No node selected</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Click any step or trigger on the canvas to configure its settings and variable mappings.
        </p>
      </aside>
    );
  }

  const { id, data } = selectedNode;
  const def = NODE_REGISTRY[data.nodeType] || {
    type: data.nodeType,
    label: data.label || "Action",
    category: "crm",
    description: "Custom workflow step",
    icon: "Zap",
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: {},
    fields: [],
    outputVariables: [],
  };

  const catInfo = CATEGORY_INFO[def.category] || CATEGORY_INFO.crm;
  const config = data.config || {};

  const handleConfigChange = (key: string, value: any) => {
    onUpdateNode(id, {
      config: {
        ...config,
        [key]: value,
      },
    });
  };

  const handleInsertVariable = (fieldKey: string, variableTag: string) => {
    const currentVal = config[fieldKey] || "";
    handleConfigChange(fieldKey, `${currentVal} ${variableTag}`.trim());
  };

  return (
    <aside className="w-84 border-l border-border/60 bg-card/95 backdrop-blur-xl flex flex-col h-full shadow-2xl z-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] uppercase font-semibold ${catInfo.color}`}>
            {catInfo.label}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">#{id.slice(0, 7)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onDuplicateNode(id)}
            title="Duplicate node"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDeleteNode(id)}
            title="Delete node"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-5">
          {/* Node Title */}
          <div className="space-y-1.5">
            <Label htmlFor="node-title" className="text-xs font-semibold text-foreground">
              Step Name
            </Label>
            <Input
              id="node-title"
              value={data.label || def.label}
              onChange={(e) => onUpdateNode(id, { label: e.target.value })}
              className="h-8 text-xs bg-background/80"
            />
            <p className="text-[11px] text-muted-foreground">{def.description}</p>
          </div>

          {/* Configuration Form Fields */}
          {def.fields.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-border/40">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Configuration
              </h5>

              {def.fields.map((field) => {
                const val = config[field.name] !== undefined ? config[field.name] : field.defaultValue ?? "";

                return (
                  <div key={field.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground">{field.label}</Label>
                      {field.supportsVariables && (
                        <VariablePicker
                          upstreamSources={upstreamSources}
                          onSelectVariable={(v) => handleInsertVariable(field.name, v)}
                        />
                      )}
                    </div>

                    {field.type === "text" && (
                      <Input
                        value={val}
                        onChange={(e) => handleConfigChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className="h-8 text-xs font-mono bg-background/80"
                      />
                    )}

                    {field.type === "textarea" && (
                      <Textarea
                        value={val}
                        onChange={(e) => handleConfigChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="text-xs font-mono bg-background/80 resize-y"
                      />
                    )}

                    {field.type === "number" && (
                      <Input
                        type="number"
                        value={val}
                        onChange={(e) => handleConfigChange(field.name, Number(e.target.value))}
                        className="h-8 text-xs bg-background/80"
                      />
                    )}

                    {field.type === "select" && (
                      <Select
                        value={String(val)}
                        onValueChange={(v) => handleConfigChange(field.name, v)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background/80">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(field.options || []).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {field.type === "switch" && (
                      <div className="flex items-center justify-between rounded-lg border border-border/50 p-2">
                        <span className="text-xs text-muted-foreground">{field.description || "Enable"}</span>
                        <Switch
                          checked={Boolean(val)}
                          onCheckedChange={(checked) => handleConfigChange(field.name, checked)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Last Execution Output / Debugger */}
          {data.executionOutput && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Last Execution Output</span>
              </div>
              <pre className="max-h-48 overflow-auto rounded-lg border border-border/60 bg-muted/40 p-2.5 text-[11px] font-mono text-muted-foreground">
                {JSON.stringify(data.executionOutput, null, 2)}
              </pre>
            </div>
          )}

          {/* Output Variables Reference */}
          {def.outputVariables.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Produces Outputs
              </h5>
              <div className="space-y-1 rounded-lg border border-border/50 bg-muted/20 p-2">
                {def.outputVariables.map((v) => (
                  <div key={v.key} className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-primary">{`{{${v.key}}}`}</span>
                    <span className="text-muted-foreground text-[10px]">{v.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advanced collapsible */}
          <div className="pt-2 border-t border-border/40">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <span>Advanced Settings</span>
              {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3 rounded-lg border border-border/40 bg-background/50 p-2.5 text-xs">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Node ID</Label>
                  <div className="font-mono text-[11px] select-all text-foreground">{id}</div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Retry on Failure</Label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px]">Auto Retry (3 attempts)</span>
                    <Switch
                      checked={Boolean((config as any)["autoRetry"])}
                      onCheckedChange={(c) => handleConfigChange("autoRetry", c)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
