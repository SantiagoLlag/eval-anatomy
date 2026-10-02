"use client";

import { useMemo } from "react";
import { useArchitectureStore } from "@/lib/store/useArchitectureStore";
import { runDeterministicLint, findingsFor } from "@/lib/lint/engine";
import { NODE_META, SEVERITY_META } from "@/lib/ui/roles";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NodeInspector() {
  const doc = useArchitectureStore((s) => s.doc);
  const selection = useArchitectureStore((s) => s.selection);
  const updateNode = useArchitectureStore((s) => s.updateNode);
  const updateEdge = useArchitectureStore((s) => s.updateEdge);
  const removeNode = useArchitectureStore((s) => s.removeNode);
  const select = useArchitectureStore((s) => s.select);

  const findings = useMemo(() => (doc ? runDeterministicLint(doc) : []), [doc]);

  if (!doc || !selection || (selection.type !== "node" && selection.type !== "edge")) {
    return (
      <aside className="text-muted-foreground w-80 shrink-0 border-l p-4 text-sm">
        Select a node or edge to edit it.
      </aside>
    );
  }

  if (selection.type === "edge") {
    const edge = doc.workflow.edges.find((e) => e.id === selection.id);
    if (!edge) return null;
    return (
      <aside className="w-80 shrink-0 space-y-4 overflow-y-auto border-l p-4">
        <h3 className="text-sm font-semibold">Edge</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">Label (branch condition)</Label>
          <Input value={edge.label ?? ""} onChange={(e) => updateEdge(edge.id, { label: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Kind</Label>
          <Select value={edge.kind ?? "sequence"} onValueChange={(v) => updateEdge(edge.id, { kind: v as never })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["sequence", "conditional", "loop", "error"].map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </aside>
    );
  }

  const node = doc.workflow.nodes.find((n) => n.id === selection.id);
  if (!node) return null;
  const meta = NODE_META[node.kind];
  const nodeFindings = findingsFor(findings, "node", node.id);

  return (
    <aside className="w-80 shrink-0 space-y-4 overflow-y-auto border-l p-4">
      <div className="flex items-center gap-2">
        <span style={{ color: meta.color }}>{meta.icon}</span>
        <h3 className="text-sm font-semibold">{meta.label}</h3>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive ml-auto h-7 px-2 text-xs"
          onClick={() => {
            removeNode(node.id);
            select(null);
          }}
        >
          Delete
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Label</Label>
        <Input value={node.label} onChange={(e) => updateNode(node.id, { label: e.target.value })} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={node.description ?? ""}
          rows={3}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
        />
      </div>

      {(node.kind === "llm-step" || node.kind === "tool-call") && (
        <div className="space-y-1.5">
          <Label className="text-xs">Tools {node.kind === "llm-step" ? "available" : "invoked"}</Label>
          <div className="space-y-1">
            {doc.tools.map((tool) => {
              const checked = (node.toolIds ?? []).includes(tool.id);
              return (
                <label key={tool.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...(node.toolIds ?? []), tool.id]
                        : (node.toolIds ?? []).filter((id) => id !== tool.id);
                      updateNode(node.id, { toolIds: next });
                    }}
                  />
                  <span className="font-mono">{tool.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {node.kind === "router" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Routing logic</Label>
          <Textarea
            value={node.routerLogic ?? ""}
            rows={3}
            onChange={(e) => updateNode(node.id, { routerLogic: e.target.value })}
          />
        </div>
      )}

      {node.kind === "subagent" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Subagent</Label>
          <Select
            value={node.subagentId ?? ""}
            onValueChange={(v) => updateNode(node.id, { subagentId: v })}
          >
            <SelectTrigger><SelectValue placeholder="Pick a subagent" /></SelectTrigger>
            <SelectContent>
              {doc.subagents.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {node.kind === "memory" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Memory strategy</Label>
          <Select value={node.memoryRef ?? ""} onValueChange={(v) => updateNode(node.id, { memoryRef: v })}>
            <SelectTrigger><SelectValue placeholder="Pick a strategy" /></SelectTrigger>
            <SelectContent>
              {doc.memory.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.kind}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {nodeFindings.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">Lint findings</Label>
          {nodeFindings.map((f, i) => (
            <div key={i} className="rounded-md p-2 text-xs" style={{ background: SEVERITY_META[f.severity].bg }}>
              <span className="font-medium" style={{ color: SEVERITY_META[f.severity].color }}>
                {f.ruleId}
              </span>
              <p className="mt-0.5">{f.message}</p>
              {f.suggestion && <p className="text-muted-foreground mt-0.5">{f.suggestion}</p>}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
