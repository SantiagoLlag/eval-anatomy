"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { NodeKind } from "@/lib/schema/architecture";
import { NODE_META, SEVERITY_META } from "@/lib/ui/roles";

export type AgentNodeData = {
  kind: NodeKind;
  label: string;
  toolNames: string[];
  subagentName?: string;
  routerLogic?: string;
  lint: { error: number; warn: number; info: number };
};

export type AgentFlowNode = Node<AgentNodeData, "agent">;

function AgentNodeInner({ data, selected }: NodeProps<AgentFlowNode>) {
  const meta = NODE_META[data.kind];
  const worst = data.lint.error > 0 ? "error" : data.lint.warn > 0 ? "warn" : data.lint.info > 0 ? "info" : null;
  const total = data.lint.error + data.lint.warn + data.lint.info;
  return (
    <div
      className="rounded-lg border-2 bg-white shadow-sm dark:bg-neutral-900"
      style={{
        borderColor: selected ? meta.color : `${meta.color}55`,
        minWidth: 170,
        maxWidth: 240,
      }}
    >
      {data.kind !== "entry" && <Handle type="target" position={Position.Left} style={{ background: meta.color }} />}
      <div className="flex items-center gap-2 px-3 pt-2">
        <span style={{ color: meta.color }} className="text-sm leading-none">{meta.icon}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: meta.color }}>
          {meta.label}
        </span>
        {worst && (
          <span
            className="ml-auto rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
            style={{ background: SEVERITY_META[worst].bg, color: SEVERITY_META[worst].color }}
            title={`${total} lint finding(s)`}
          >
            {total}
          </span>
        )}
      </div>
      <div className="px-3 pb-2 pt-0.5">
        <div className="text-sm font-medium leading-snug">{data.label}</div>
        {data.subagentName && (
          <div className="text-muted-foreground mt-0.5 text-[11px]">→ {data.subagentName}</div>
        )}
        {data.routerLogic && (
          <div className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] italic">{data.routerLogic}</div>
        )}
        {data.toolNames.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {data.toolNames.map((name) => (
              <span
                key={name}
                className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                style={{ background: `${NODE_META["tool-call"].color}18`, color: NODE_META["tool-call"].color }}
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
      {data.kind !== "terminal" && <Handle type="source" position={Position.Right} style={{ background: meta.color }} />}
    </div>
  );
}

export const AgentNode = memo(AgentNodeInner);
