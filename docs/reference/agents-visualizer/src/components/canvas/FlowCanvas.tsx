"use client";

import { useCallback, useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useArchitectureStore } from "@/lib/store/useArchitectureStore";
import { runDeterministicLint } from "@/lib/lint/engine";
import { layoutGraph } from "@/lib/layout/autoLayout";
import { NODE_META } from "@/lib/ui/roles";
import { NODE_KINDS, type NodeKind } from "@/lib/schema/architecture";
import { AgentNode, type AgentFlowNode } from "./AgentNode";
import { Button } from "@/components/ui/button";

const nodeTypes = { agent: AgentNode };

const EDGE_STYLE: Record<string, { stroke: string; dash?: string }> = {
  sequence: { stroke: "#94a3b8" },
  conditional: { stroke: "#f59e0b", dash: "6 3" },
  loop: { stroke: "#8b5cf6", dash: "2 3" },
  error: { stroke: "#ef4444", dash: "6 3" },
};

function CanvasInner() {
  const doc = useArchitectureStore((s) => s.doc);
  const select = useArchitectureStore((s) => s.select);
  const moveNode = useArchitectureStore((s) => s.moveNode);
  const removeNode = useArchitectureStore((s) => s.removeNode);
  const removeEdge = useArchitectureStore((s) => s.removeEdge);
  const addEdge = useArchitectureStore((s) => s.addEdge);
  const addNode = useArchitectureStore((s) => s.addNode);
  const setAllPositions = useArchitectureStore((s) => s.setAllPositions);
  const selection = useArchitectureStore((s) => s.selection);
  const undo = useArchitectureStore.temporal.getState().undo;
  const redo = useArchitectureStore.temporal.getState().redo;

  const findings = useMemo(() => (doc ? runDeterministicLint(doc) : []), [doc]);

  const { nodes, edges } = useMemo(() => {
    if (!doc) return { nodes: [] as AgentFlowNode[], edges: [] as Edge[] };
    const needsLayout = doc.workflow.nodes.some((n) => !n.position);
    const auto = needsLayout ? layoutGraph(doc.workflow.nodes, doc.workflow.edges) : {};
    const toolName = (id: string) => doc.tools.find((t) => t.id === id)?.name ?? id;
    const nodes: AgentFlowNode[] = doc.workflow.nodes.map((n) => ({
      id: n.id,
      type: "agent",
      position: n.position ?? auto[n.id] ?? { x: 0, y: 0 },
      selected: selection?.type === "node" && selection.id === n.id,
      data: {
        kind: n.kind,
        label: n.label,
        toolNames: (n.toolIds ?? []).map(toolName),
        subagentName: n.subagentId
          ? doc.subagents.find((s) => s.id === n.subagentId)?.name
          : undefined,
        routerLogic: n.routerLogic,
        lint: {
          error: findings.filter((f) => f.targetId === n.id && f.severity === "error").length,
          warn: findings.filter((f) => f.targetId === n.id && f.severity === "warn").length,
          info: findings.filter((f) => f.targetId === n.id && f.severity === "info").length,
        },
      },
    }));
    const edges: Edge[] = doc.workflow.edges.map((e) => {
      const style = EDGE_STYLE[e.kind ?? "sequence"];
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: e.kind === "loop",
        style: { stroke: style.stroke, strokeDasharray: style.dash },
        labelStyle: { fontSize: 10, fill: "var(--foreground)" },
        labelBgStyle: { fill: "var(--background)", fillOpacity: 0.85 },
      };
    });
    return { nodes, edges };
  }, [doc, findings, selection]);

  const onNodesChange = useCallback(
    (changes: NodeChange<AgentFlowNode>[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position && !change.dragging) {
          moveNode(change.id, change.position);
        }
        if (change.type === "remove") removeNode(change.id);
      }
    },
    [moveNode, removeNode]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      for (const change of changes) {
        if (change.type === "remove") removeEdge(change.id);
      }
    },
    [removeEdge]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addEdge({ source: connection.source, target: connection.target, kind: "sequence" });
      }
    },
    [addEdge]
  );

  if (!doc) return null;

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => select({ type: "node", id: node.id })}
        onEdgeClick={(_, edge) => select({ type: "edge", id: edge.id })}
        onPaneClick={() => select(null)}
        fitView
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background gap={20} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!bg-background" />
      </ReactFlow>

      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-lg border bg-background/95 p-2 shadow-sm">
        <span className="text-muted-foreground px-1 text-[10px] font-medium uppercase">Add node</span>
        {NODE_KINDS.filter((k) => k !== "entry").map((kind) => (
          <button
            key={kind}
            className="hover:bg-muted flex items-center gap-2 rounded px-2 py-1 text-left text-xs"
            onClick={() => {
              const id = addNode({ kind: kind as NodeKind, label: NODE_META[kind].label, position: { x: 80 + Math.round(nodes.length * 10), y: 80 + Math.round(nodes.length * 10) } });
              select({ type: "node", id });
            }}
          >
            <span style={{ color: NODE_META[kind].color }}>{NODE_META[kind].icon}</span>
            {NODE_META[kind].label}
          </button>
        ))}
      </div>

      <div className="absolute right-3 top-3 z-10 flex gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAllPositions(layoutGraph(doc.workflow.nodes, doc.workflow.edges))}
        >
          Auto-layout
        </Button>
        <Button size="sm" variant="outline" onClick={() => undo()}>
          Undo
        </Button>
        <Button size="sm" variant="outline" onClick={() => redo()}>
          Redo
        </Button>
      </div>
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
