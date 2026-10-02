import { z } from "zod";

// ---------- Identity & model ----------

export const AgentIdentitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const ModelSpecSchema = z.object({
  provider: z.string().optional(),
  modelId: z.string().optional(),
  params: z
    .object({
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
      topP: z.number().optional(),
      topK: z.number().optional(),
      stopSequences: z.array(z.string()).optional(),
      extra: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

// ---------- Prompt as ordered segments ----------

export const SEGMENT_ROLES = [
  "role-identity",
  "task-instructions",
  "constraints",
  "tone-style",
  "tool-guidance",
  "output-format",
  "few-shot-example",
  "guardrail-safety",
  "context-background",
  "workflow-process",
  "escalation-handoff",
  "whitespace",
  "other",
] as const;

export const SegmentRoleSchema = z.enum(SEGMENT_ROLES);
export type SegmentRole = z.infer<typeof SegmentRoleSchema>;

export const PromptSegmentSchema = z.object({
  id: z.string().min(1),
  role: SegmentRoleSchema,
  label: z.string().optional(),
  text: z.string(),
  sourceStart: z.number().int().nonnegative(),
  sourceEnd: z.number().int().nonnegative(),
  summary: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  tokenEstimate: z.number().int().nonnegative().optional(),
});
export type PromptSegment = z.infer<typeof PromptSegmentSchema>;

// Partition invariant: segments are ordered, contiguous, and their
// concatenation reproduces `raw` exactly — this is what makes segment
// editing losslessly reassemblable.
export const PromptSpecSchema = z
  .object({
    raw: z.string(),
    segments: z.array(PromptSegmentSchema),
    dissectedAt: z.string().optional(),
  })
  .superRefine((prompt, ctx) => {
    let cursor = 0;
    for (const [i, seg] of prompt.segments.entries()) {
      if (seg.sourceStart !== cursor) {
        ctx.addIssue({
          code: "custom",
          path: ["segments", i, "sourceStart"],
          message: `segment ${i} starts at ${seg.sourceStart}, expected ${cursor} (segments must partition the prompt)`,
        });
        return;
      }
      if (seg.sourceEnd !== seg.sourceStart + seg.text.length) {
        ctx.addIssue({
          code: "custom",
          path: ["segments", i, "sourceEnd"],
          message: `segment ${i} end does not match its text length`,
        });
        return;
      }
      if (prompt.raw.slice(seg.sourceStart, seg.sourceEnd) !== seg.text) {
        ctx.addIssue({
          code: "custom",
          path: ["segments", i, "text"],
          message: `segment ${i} text is not a verbatim slice of raw`,
        });
        return;
      }
      cursor = seg.sourceEnd;
    }
    if (prompt.segments.length > 0 && cursor !== prompt.raw.length) {
      ctx.addIssue({
        code: "custom",
        path: ["segments"],
        message: `segments cover ${cursor} of ${prompt.raw.length} chars — they must cover the whole prompt`,
      });
    }
  });
export type PromptSpec = z.infer<typeof PromptSpecSchema>;

// ---------- Tools ----------

export const ToolInputSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
});
export type ToolInput = z.infer<typeof ToolInputSchema>;

export const TOOL_SOURCES = ["built-in", "mcp", "custom", "framework", "unknown"] as const;

export const ToolDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  inputs: z.array(ToolInputSchema),
  purpose: z.string().optional(),
  riskNotes: z.string().optional(),
  source: z.enum(TOOL_SOURCES),
  mcpServer: z.string().optional(),
});
export type ToolDef = z.infer<typeof ToolDefSchema>;

// ---------- Workflow graph ----------

export const NODE_KINDS = [
  "entry",
  "llm-step",
  "tool-call",
  "router",
  "human-gate",
  "subagent",
  "memory",
  "terminal",
] as const;
export const NodeKindSchema = z.enum(NODE_KINDS);
export type NodeKind = z.infer<typeof NodeKindSchema>;

export const WorkflowNodeSchema = z.object({
  id: z.string().min(1),
  kind: NodeKindSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  toolIds: z.array(z.string()).optional(),
  subagentId: z.string().optional(),
  memoryRef: z.string().optional(),
  routerLogic: z.string().optional(),
  promptSegmentIds: z.array(z.string()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

export const EDGE_KINDS = ["sequence", "conditional", "loop", "error"] as const;

export const WorkflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
  kind: z.enum(EDGE_KINDS).optional(),
});
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;

export const WorkflowGraphSchema = z.object({
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  inferred: z.boolean(),
});
export type WorkflowGraph = z.infer<typeof WorkflowGraphSchema>;

// ---------- Subagents ----------

export const SubagentDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  model: ModelSpecSchema.optional(),
  prompt: PromptSpecSchema.optional(),
  toolIds: z.array(z.string()).optional(),
  sourceFile: z.string().optional(),
});
export type SubagentDef = z.infer<typeof SubagentDefSchema>;

// ---------- Memory / context ----------

export const MEMORY_KINDS = [
  "conversation-buffer",
  "sliding-window",
  "summarization",
  "vector-store",
  "file-based",
  "kv-store",
  "none",
  "custom",
] as const;

export const MemoryStrategySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(MEMORY_KINDS),
  description: z.string().optional(),
  scope: z.enum(["session", "persistent", "shared"]).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});
export type MemoryStrategy = z.infer<typeof MemoryStrategySchema>;

// ---------- Provenance ----------

export const SOURCE_FORMATS = [
  "claude-code",
  "langgraph",
  "crewai",
  "elevenlabs",
  "openai-assistants",
  "mcp-config",
  "freeform",
  "manual",
] as const;
export const SourceFormatSchema = z.enum(SOURCE_FORMATS);
export type SourceFormat = z.infer<typeof SourceFormatSchema>;

export const ImportProvenanceSchema = z.object({
  format: SourceFormatSchema,
  importedAt: z.string(),
  importerVersion: z.string(),
  sourceFiles: z.array(
    z.object({ name: z.string(), sha256: z.string(), bytes: z.number().int().nonnegative() })
  ),
  rawSources: z.record(z.string(), z.string()).optional(),
  llmAssisted: z.boolean(),
  llmModel: z.string().optional(),
  warnings: z.array(z.string()),
  unmappedFields: z.record(z.string(), z.unknown()).optional(),
});
export type ImportProvenance = z.infer<typeof ImportProvenanceSchema>;

// ---------- Root ----------

export const AgentArchitectureSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9][a-z0-9-]*$/, "id must be a kebab-case slug (it doubles as the filename)"),
    identity: AgentIdentitySchema,
    model: ModelSpecSchema,
    prompt: PromptSpecSchema,
    tools: z.array(ToolDefSchema),
    workflow: WorkflowGraphSchema,
    subagents: z.array(SubagentDefSchema),
    memory: z.array(MemoryStrategySchema),
    provenance: ImportProvenanceSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .superRefine((doc, ctx) => {
    const toolIds = new Set(doc.tools.map((t) => t.id));
    const subagentIds = new Set(doc.subagents.map((s) => s.id));
    const memoryIds = new Set(doc.memory.map((m) => m.id));
    const nodeIds = new Set(doc.workflow.nodes.map((n) => n.id));
    const segmentIds = new Set(doc.prompt.segments.map((s) => s.id));

    doc.workflow.nodes.forEach((node, i) => {
      for (const tid of node.toolIds ?? []) {
        if (!toolIds.has(tid))
          ctx.addIssue({
            code: "custom",
            path: ["workflow", "nodes", i, "toolIds"],
            message: `node "${node.id}" references unknown tool "${tid}"`,
          });
      }
      if (node.subagentId && !subagentIds.has(node.subagentId))
        ctx.addIssue({
          code: "custom",
          path: ["workflow", "nodes", i, "subagentId"],
          message: `node "${node.id}" references unknown subagent "${node.subagentId}"`,
        });
      if (node.memoryRef && !memoryIds.has(node.memoryRef))
        ctx.addIssue({
          code: "custom",
          path: ["workflow", "nodes", i, "memoryRef"],
          message: `node "${node.id}" references unknown memory strategy "${node.memoryRef}"`,
        });
      for (const sid of node.promptSegmentIds ?? []) {
        if (!segmentIds.has(sid))
          ctx.addIssue({
            code: "custom",
            path: ["workflow", "nodes", i, "promptSegmentIds"],
            message: `node "${node.id}" references unknown prompt segment "${sid}"`,
          });
      }
    });

    doc.workflow.edges.forEach((edge, i) => {
      if (!nodeIds.has(edge.source))
        ctx.addIssue({
          code: "custom",
          path: ["workflow", "edges", i, "source"],
          message: `edge "${edge.id}" source "${edge.source}" is not a node`,
        });
      if (!nodeIds.has(edge.target))
        ctx.addIssue({
          code: "custom",
          path: ["workflow", "edges", i, "target"],
          message: `edge "${edge.id}" target "${edge.target}" is not a node`,
        });
    });

    doc.subagents.forEach((sub, i) => {
      for (const tid of sub.toolIds ?? []) {
        if (!toolIds.has(tid))
          ctx.addIssue({
            code: "custom",
            path: ["subagents", i, "toolIds"],
            message: `subagent "${sub.id}" references unknown tool "${tid}"`,
          });
      }
    });
  });

export type AgentArchitecture = z.infer<typeof AgentArchitectureSchema>;
export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;
export type ModelSpec = z.infer<typeof ModelSpecSchema>;

// Listing shape returned by GET /api/architectures
export interface ArchitectureSummary {
  id: string;
  name: string;
  description?: string;
  format: SourceFormat;
  updatedAt: string;
  toolCount: number;
  nodeCount: number;
  subagentCount: number;
}
