import dagre from "@dagrejs/dagre";
import type { WorkflowEdge, WorkflowNode } from "@/lib/schema/architecture";

const DEFAULT_SIZE: Record<string, { width: number; height: number }> = {
  entry: { width: 180, height: 64 },
  terminal: { width: 180, height: 64 },
  router: { width: 200, height: 90 },
  "human-gate": { width: 220, height: 90 },
  default: { width: 240, height: 110 },
};

export function layoutGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  measured?: Record<string, { width: number; height: number }>
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", ranksep: 120, nodesep: 60 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    const size = measured?.[node.id] ?? DEFAULT_SIZE[node.kind] ?? DEFAULT_SIZE.default;
    g.setNode(node.id, { width: size.width, height: size.height });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }
  dagre.layout(g);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of nodes) {
    const laid = g.node(node.id);
    if (laid) {
      // dagre positions are centers; React Flow expects top-left
      positions[node.id] = { x: laid.x - laid.width / 2, y: laid.y - laid.height / 2 };
    }
  }
  return positions;
}
