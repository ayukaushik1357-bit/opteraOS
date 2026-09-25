import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import { CustomWorkflowNode } from "./CustomWorkflowNode";
import { NodeLibrary } from "./NodeLibrary";
import { NodeInspector } from "./NodeInspector";
import { WorkflowToolbar } from "./WorkflowToolbar";
import { TestWorkflowModal } from "./TestWorkflowModal";
import { NODE_REGISTRY } from "./workflow-nodes-registry";
import { AvailableUpstreamSource } from "./VariablePicker";

const nodeTypes = {
  customWorkflowNode: CustomWorkflowNode,
};

interface WorkflowCanvasProps {
  initialWorkflow?:
    | {
        id?: string | undefined;
        name: string;
        description?: string | null | undefined;
        trigger_type: string;
        trigger_config?: Record<string, any> | undefined;
        nodes: any[];
        edges: any[];
        active: boolean;
      }
    | undefined;
  onSave: (workflow: {
    id?: string | undefined;
    name: string;
    description?: string | undefined;
    triggerType: string;
    triggerConfig: Record<string, any>;
    nodes: any[];
    edges: any[];
    active: boolean;
  }) => Promise<void>;
  onTestExecution: (data: {
    nodes: any[];
    edges: any[];
    triggerEvent: string;
    payload: Record<string, any>;
  }) => Promise<any>;
  onDuplicate?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
  isSaving?: boolean | undefined;
}

export function WorkflowCanvas({
  initialWorkflow,
  onSave,
  onTestExecution,
  onDuplicate,
  onDelete,
  isSaving = false,
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Workflow state
  const [workflowName, setWorkflowName] = useState(
    initialWorkflow?.name || "New Automation Workflow",
  );
  const [isActive, setIsActive] = useState(initialWorkflow?.active ?? true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(
    (initialWorkflow?.nodes as Node[]) || [
      {
        id: "node-1",
        type: "customWorkflowNode",
        position: { x: 100, y: 150 },
        data: {
          nodeType: "trigger_customer_created",
          label: "Customer Created",
          config: { filterStatus: "all" },
        },
      },
      {
        id: "node-2",
        type: "customWorkflowNode",
        position: { x: 450, y: 150 },
        data: {
          nodeType: "action_ai_analyze",
          label: "AI Analyze Customer",
          config: {
            prompt: "Analyze customer {{customer.name}} from {{customer.company}} and summarize churn risk & persona.",
            model: "gemini-1.5-flash",
          },
        },
      },
    ],
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState(
    (initialWorkflow?.edges as Edge[]) || [
      {
        id: "e1-2",
        source: "node-1",
        target: "node-2",
        type: "smoothstep",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "var(--color-primary, #6366f1)" },
      },
    ],
  );

  // Selected node state for Inspector
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Test Modal State
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Detect trigger type
  const triggerNode = nodes.find((n) => (n.data as any)?.nodeType?.startsWith("trigger_"));
  const triggerType = (triggerNode?.data as any)?.nodeType?.replace("trigger_", "").replace("_", ".") || "customer.created";

  // Connections
  const onConnect = useCallback(
    (params: Connection) => {
      setHasUnsavedChanges(true);
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--color-primary, #6366f1)" },
            label: params.sourceHandle === "true" ? "YES (True)" : params.sourceHandle === "false" ? "NO (False)" : undefined,
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  // Drag over canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Drop node on canvas
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData("application/reactflow/type");
      if (!nodeType || !reactFlowInstance || !reactFlowWrapper.current) return;

      const def = NODE_REGISTRY[nodeType];
      if (!def) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = `node-${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type: "customWorkflowNode",
        position,
        data: {
          nodeType,
          label: def.label,
          config: { ...def.defaultConfig },
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNodeId);
      setHasUnsavedChanges(true);
      toast.success(`Added ${def.label} to canvas`);
    },
    [reactFlowInstance, setNodes],
  );

  // Add node via click
  const handleAddNodeFromLibrary = useCallback(
    (nodeType: string) => {
      const def = NODE_REGISTRY[nodeType];
      if (!def) return;

      const newNodeId = `node-${Date.now()}`;
      const lastNode = nodes[nodes.length - 1];
      const position = lastNode
        ? { x: lastNode.position.x + 320, y: lastNode.position.y }
        : { x: 250, y: 200 };

      const newNode: Node = {
        id: newNodeId,
        type: "customWorkflowNode",
        position,
        data: {
          nodeType,
          label: def.label,
          config: { ...def.defaultConfig },
        },
      };

      setNodes((nds) => nds.concat(newNode));

      // Auto-connect to last node if appropriate
      if (lastNode && !def.isTrigger) {
        setEdges((eds) =>
          eds.concat({
            id: `e-${lastNode.id}-${newNodeId}`,
            source: lastNode.id,
            target: newNodeId,
            type: "smoothstep",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--color-primary, #6366f1)" },
          }),
        );
      }

      setSelectedNodeId(newNodeId);
      setHasUnsavedChanges(true);
      toast.success(`Added ${def.label}`);
    },
    [nodes, setNodes, setEdges],
  );

  // Node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Update node config
  const handleUpdateNode = useCallback(
    (nodeId: string, updates: { label?: string; config?: Record<string, any> }) => {
      setHasUnsavedChanges(true);
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                ...(updates.label ? { label: updates.label } : {}),
                ...(updates.config ? { config: updates.config } : {}),
              },
            };
          }
          return n;
        }),
      );
    },
    [setNodes],
  );

  // Delete node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setHasUnsavedChanges(true);
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      toast.info("Node deleted");
    },
    [selectedNodeId, setNodes, setEdges],
  );

  // Duplicate node
  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const newId = `node-${Date.now()}`;
      const duplicatedNode: Node = {
        ...node,
        id: newId,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        data: {
          ...node.data,
          label: `${(node.data as any).label} (Copy)`,
        },
      };

      setNodes((nds) => nds.concat(duplicatedNode));
      setSelectedNodeId(newId);
      setHasUnsavedChanges(true);
      toast.success("Node duplicated");
    },
    [nodes, setNodes],
  );

  // Auto Layout
  const handleAutoLayout = useCallback(() => {
    let currentX = 100;
    const currentY = 180;
    setNodes((nds) =>
      nds.map((n) => {
        const updated = {
          ...n,
          position: { x: currentX, y: currentY },
        };
        currentX += 340;
        return updated;
      }),
    );
    setHasUnsavedChanges(true);
    toast.success("Canvas arranged horizontally");
  }, [setNodes]);

  // Export JSON
  const handleExportJson = useCallback(() => {
    const data = {
      name: workflowName,
      active: isActive,
      triggerType,
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName.toLowerCase().replace(/\s+/g, "-")}-workflow.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Workflow definition exported");
  }, [workflowName, isActive, triggerType, nodes, edges]);

  // Save handler
  const handleSave = useCallback(async () => {
    try {
      await onSave({
        id: initialWorkflow?.id,
        name: workflowName,
        triggerType,
        triggerConfig: (triggerNode?.data as any)?.config || {},
        nodes,
        edges,
        active: isActive,
      });
      setHasUnsavedChanges(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save workflow");
    }
  }, [onSave, initialWorkflow, workflowName, triggerType, triggerNode, nodes, edges, isActive]);

  // Run Test Handler
  const handleRunTest = useCallback(
    async (payload: Record<string, any>) => {
      setIsTesting(true);
      try {
        const res = await onTestExecution({
          nodes,
          edges,
          triggerEvent: triggerType,
          payload,
        });

        setTestResult(res);

        // Update node execution statuses on canvas
        if (res?.traces) {
          const traceMap = new Map<string, any>();
          for (const t of res.traces) {
            traceMap.set(t.nodeId, t);
          }

          setNodes((nds) =>
            nds.map((n) => {
              const trace = traceMap.get(n.id);
              if (trace) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    executionStatus: trace.status,
                    executionDuration: trace.durationMs,
                    executionOutput: trace.output,
                  },
                };
              }
              return n;
            }),
          );
        }

        if (res?.status === "successful") {
          toast.success(`Test completed in ${res.durationMs}ms`);
        } else {
          toast.error(`Test failed: ${res?.error || "Check step logs"}`);
        }
      } catch (e: any) {
        toast.error(`Test error: ${e.message}`);
      } finally {
        setIsTesting(false);
      }
    },
    [onTestExecution, nodes, edges, triggerType, setNodes],
  );

  // Compute available upstream variables for selected node
  const upstreamSources: AvailableUpstreamSource[] = useMemo(() => {
    if (!selectedNodeId) return [];

    // Find all nodes that point directly or indirectly to selected node
    const incomingSources: AvailableUpstreamSource[] = [];
    for (const node of nodes) {
      if (node.id === selectedNodeId) continue;
      const def = NODE_REGISTRY[(node.data as any)?.nodeType];
      if (def && def.outputVariables && def.outputVariables.length > 0) {
        incomingSources.push({
          nodeId: node.id,
          nodeLabel: (node.data as any)?.label || def.label,
          nodeType: def.type,
          variables: def.outputVariables,
        });
      }
    }
    return incomingSources;
  }, [selectedNodeId, nodes]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    const n = nodes.find((node) => node.id === selectedNodeId);
    if (!n) return null;
    return {
      id: n.id,
      data: n.data as any,
    };
  }, [selectedNodeId, nodes]);

  // Inject duplicate & delete handlers into custom nodes
  const decoratedNodes = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onDuplicate: handleDuplicateNode,
        onDelete: handleDeleteNode,
      },
    }));
  }, [nodes, handleDuplicateNode, handleDeleteNode]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Top Toolbar */}
      <WorkflowToolbar
        workflowName={workflowName}
        isActive={isActive}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        onNameChange={(name) => {
          setWorkflowName(name);
          setHasUnsavedChanges(true);
        }}
        onSave={handleSave}
        onTest={() => setTestModalOpen(true)}
        onToggleActive={(active) => {
          setIsActive(active);
          setHasUnsavedChanges(true);
        }}
        onDuplicate={onDuplicate}
        onExportJson={handleExportJson}
        onAutoLayout={handleAutoLayout}
        onDelete={onDelete}
      />

      {/* Main Workspace Body */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Left: Draggable Node Library */}
        <NodeLibrary onAddNode={handleAddNodeFromLibrary} />

        {/* Center: Infinite Canvas */}
        <div ref={reactFlowWrapper} className="flex-1 h-full relative bg-dot-grid">
          <ReactFlow
            nodes={decoratedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{
              type: "smoothstep",
              animated: true,
            }}
            proOptions={{ hideAttribution: true }}
            className="h-full w-full"
          >
            <Controls className="!bg-card/90 !border-border/60 !shadow-lg !rounded-xl !p-1" />
            <MiniMap
              nodeStrokeColor="#6366f1"
              nodeColor="#1e1e2d"
              maskColor="rgba(0, 0, 0, 0.7)"
              className="!bg-card/90 !border !border-border/60 !rounded-xl !shadow-xl"
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255, 255, 255, 0.08)" />
          </ReactFlow>
        </div>

        {/* Right: Selected Node Configuration Inspector */}
        <NodeInspector
          selectedNode={selectedNode}
          upstreamSources={upstreamSources}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onDuplicateNode={handleDuplicateNode}
          onClose={() => setSelectedNodeId(null)}
        />
      </div>

      {/* Test Execution Modal */}
      <TestWorkflowModal
        open={testModalOpen}
        onOpenChange={setTestModalOpen}
        workflowName={workflowName}
        triggerType={triggerType}
        isRunning={isTesting}
        testResult={testResult}
        onRunTest={handleRunTest}
      />
    </div>
  );
}
