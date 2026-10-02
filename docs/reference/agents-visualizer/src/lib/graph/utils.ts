import type { AgentArchitecture, WorkflowGraph } from "@/lib/schema/architecture";

// tool id -> node ids that reference it (tool-call invocations and llm-step availability)
export function toolUsageMap(doc: AgentArchitecture): Map<string, string[]> {
  const usage = new Map<string, string[]>(doc.tools.map((t) => [t.id, []]));
  for (const node of doc.workflow.nodes) {
    for (const tid of node.toolIds ?? []) {
      usage.get(tid)?.push(node.id);
    }
  }
  for (const sub of doc.subagents) {
    for (const tid of sub.toolIds ?? []) {
      const owners = doc.workflow.nodes.filter((n) => n.subagentId === sub.id).map((n) => n.id);
      const list = usage.get(tid);
      if (list) list.push(...owners.filter((id) => !list.includes(id)));
    }
  }
  return usage;
}

export function unusedToolIds(doc: AgentArchitecture): string[] {
  const usage = toolUsageMap(doc);
  return doc.tools.filter((t) => (usage.get(t.id) ?? []).length === 0).map((t) => t.id);
}

export function orphanNodeIds(graph: WorkflowGraph): string[] {
  const connected = new Set<string>();
  for (const e of graph.edges) {
    connected.add(e.source);
    connected.add(e.target);
  }
  return graph.nodes.filter((n) => !connected.has(n.id) && graph.nodes.length > 1).map((n) => n.id);
}

// nodes not reachable from any entry node (or from the first node when no entry exists)
export function unreachableNodeIds(graph: WorkflowGraph): string[] {
  if (graph.nodes.length === 0) return [];
  const entries = graph.nodes.filter((n) => n.kind === "entry").map((n) => n.id);
  const roots = entries.length > 0 ? entries : [graph.nodes[0].id];
  const adjacency = new Map<string, string[]>();
  for (const e of graph.edges) {
    adjacency.set(e.source, [...(adjacency.get(e.source) ?? []), e.target]);
  }
  const seen = new Set<string>(roots);
  const queue = [...roots];
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return graph.nodes.filter((n) => !seen.has(n.id)).map((n) => n.id);
}
