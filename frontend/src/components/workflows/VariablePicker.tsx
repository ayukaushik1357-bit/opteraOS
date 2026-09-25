import { useState } from "react";
import { Variable, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NODE_REGISTRY } from "./workflow-nodes-registry";

export interface AvailableUpstreamSource {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  variables: Array<{ key: string; label: string; type: string }>;
}

interface VariablePickerProps {
  upstreamSources: AvailableUpstreamSource[];
  onSelectVariable: (variableTag: string) => void;
}

export function VariablePicker({
  upstreamSources,
  onSelectVariable,
}: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(
    upstreamSources[0]?.nodeId || null,
  );

  const activeSource =
    upstreamSources.find((s) => s.nodeId === selectedSourceId) ||
    upstreamSources[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs font-mono bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Insert dynamic variable from previous steps"
        >
          <Variable className="h-3 w-3 text-primary" />
          <span>Insert Variable</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 shadow-2xl border-border bg-popover/95 backdrop-blur-md"
      >
        <div className="border-b border-border px-3 py-2">
          <h4 className="text-xs font-semibold text-foreground">
            Dynamic Output Variables
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Select a field to insert dynamic value from previous steps.
          </p>
        </div>

        {upstreamSources.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No connected upstream steps found. Connect a previous step or trigger to access its data.
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-border max-h-64">
            {/* Left: Sources / Steps */}
            <div className="p-1 overflow-y-auto space-y-0.5">
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
                Steps
              </div>
              {upstreamSources.map((source) => (
                <button
                  key={source.nodeId}
                  onClick={() => setSelectedSourceId(source.nodeId)}
                  className={`w-full flex items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors ${
                    activeSource?.nodeId === source.nodeId
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="truncate">{source.nodeLabel}</span>
                  <ChevronRight className="h-3 w-3 shrink-0" />
                </button>
              ))}
            </div>

            {/* Right: Available fields for active source */}
            <div className="p-1 overflow-y-auto space-y-0.5">
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
                Fields
              </div>
              {(activeSource?.variables || []).map((v) => (
                <button
                  key={v.key}
                  onClick={() => {
                    onSelectVariable(`{{${v.key}}}`);
                    setOpen(false);
                  }}
                  className="w-full rounded px-2 py-1.5 text-left transition-colors hover:bg-muted text-foreground group flex flex-col"
                >
                  <span className="text-xs font-medium group-hover:text-primary">
                    {v.label}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {`{{${v.key}}}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
