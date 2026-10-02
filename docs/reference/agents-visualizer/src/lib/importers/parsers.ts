import matter from "gray-matter";
import { parse as parseYaml } from "yaml";
import { nanoid } from "nanoid";
import type {
  MemoryStrategy,
  ModelSpec,
  SourceFormat,
  SubagentDef,
  ToolDef,
  WorkflowEdge,
  WorkflowNode,
} from "@/lib/schema/architecture";

export interface ImportFile {
  name: string;
  content: string;
}

export interface ParsedPartial {
  identityName?: string;
  identityDescription?: string;
  model?: ModelSpec;
  promptRaw?: string;
  tools: ToolDef[];
  subagents: Array<Omit<SubagentDef, "prompt"> & { promptRaw?: string }>;
  workflowNodes?: WorkflowNode[];
  workflowEdges?: WorkflowEdge[];
  memory: MemoryStrategy[];
  warnings: string[];
  unmapped: Record<string, unknown>;
}

export const emptyPartial = (): ParsedPartial => ({
  tools: [],
  subagents: [],
  memory: [],
  warnings: [],
  unmapped: {},
});

// gray-matter throws on malformed YAML frontmatter (common in the wild:
// unquoted colons in description lines) — degrade to treating the file as
// plain markdown instead of failing the whole import.
function safeMatter(content: string): { data: Record<string, unknown>; content: string; failed: boolean } {
  try {
    // passing an options object bypasses gray-matter's module-level cache,
    // which otherwise "remembers" a first failed parse as a success
    const parsed = matter(content, {});
    return { data: parsed.data as Record<string, unknown>, content: parsed.content, failed: false };
  } catch {
    return { data: {}, content, failed: true };
  }
}

function tryJson(content: string): unknown | null {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function tryYamlOrJson(content: string): unknown | null {
  const json = tryJson(content);
  if (json !== null) return json;
  try {
    const parsed = parseYaml(content);
    return typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

// ---------- detection ----------

export function detectFormat(file: ImportFile): SourceFormat {
  const obj = tryYamlOrJson(file.content) as Record<string, unknown> | null;
  if (obj && typeof obj === "object") {
    if ("mcpServers" in obj) return "mcp-config";
    if ("conversation_config" in obj || ("agent" in obj && typeof obj.agent === "object" && obj.agent !== null && "prompt" in (obj.agent as object))) return "elevenlabs";
    if ("instructions" in obj && Array.isArray(obj.tools)) return "openai-assistants";
    if (("agents" in obj && ("tasks" in obj || "crew" in obj)) || "crew" in obj) return "crewai";
    if (Array.isArray(obj.nodes) && Array.isArray(obj.edges)) return "langgraph";
  }
  if (/^---\n/.test(file.content)) {
    const { data } = safeMatter(file.content);
    if (data.name && (data.description || data.tools || data.model)) return "claude-code";
  }
  if (file.name.endsWith(".md") || file.name.toLowerCase().includes("prompt")) return "claude-code";
  return "freeform";
}

// ---------- helpers ----------

function toolFromSchema(
  name: string,
  description: string | undefined,
  params: Record<string, unknown> | undefined,
  source: ToolDef["source"],
  mcpServer?: string
): ToolDef {
  const properties = (params?.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = new Set((params?.required as string[]) ?? []);
  return {
    id: `tool-${nanoid(8)}`,
    name,
    description,
    inputs: Object.entries(properties).map(([pname, pschema]) => ({
      name: pname,
      type: typeof pschema.type === "string" ? pschema.type : undefined,
      description: typeof pschema.description === "string" ? pschema.description : undefined,
      required: required.has(pname),
      schema: pschema,
    })),
    source,
    mcpServer,
  };
}

// ---------- per-format parsers ----------

export function parseClaudeCode(files: ImportFile[]): ParsedPartial {
  const partial = emptyPartial();
  for (const file of files) {
    const { data, content, failed } = safeMatter(file.content);
    if (failed) {
      partial.warnings.push(`"${file.name}" has malformed YAML frontmatter — imported as plain markdown.`);
    }
    const isSubagentFile =
      /(^|\/)\.claude\/agents\//.test(file.name) || (data.name && data.description && file.name !== "CLAUDE.md");
    if (isSubagentFile && data.name) {
      partial.subagents.push({
        id: `sub-${nanoid(8)}`,
        name: String(data.name),
        description: data.description ? String(data.description) : undefined,
        model: data.model ? { modelId: String(data.model) } : undefined,
        promptRaw: content.trim(),
        sourceFile: file.name,
      });
      if (typeof data.tools === "string") {
        partial.warnings.push(
          `Subagent "${data.name}" declares tools "${data.tools}" — mapped by name where they match known tools.`
        );
      }
    } else {
      // main system prompt (longest markdown wins)
      const body = content.trim() || file.content.trim();
      if (!partial.promptRaw || body.length > partial.promptRaw.length) {
        partial.promptRaw = body;
        if (data.name) partial.identityName = String(data.name);
        if (data.description) partial.identityDescription = String(data.description);
        if (data.model) partial.model = { modelId: String(data.model) };
      }
    }
  }
  return partial;
}

export function parseMcpConfig(file: ImportFile): ParsedPartial {
  const partial = emptyPartial();
  const obj = tryJson(file.content) as { mcpServers?: Record<string, Record<string, unknown>> } | null;
  if (!obj?.mcpServers) return partial;
  for (const [serverName, config] of Object.entries(obj.mcpServers)) {
    partial.tools.push({
      id: `tool-${nanoid(8)}`,
      name: `${serverName} (MCP server)`,
      description: `Tools served by the "${serverName}" MCP server (${config.command ?? config.url ?? "unknown transport"}). Individual tool schemas load at runtime.`,
      inputs: [],
      source: "mcp",
      mcpServer: serverName,
    });
  }
  partial.warnings.push(
    "MCP servers declare tools at runtime — each server is imported as one placeholder tool; split it into real tools once you know the server's tool list."
  );
  return partial;
}

export function parseOpenAiAssistant(file: ImportFile): ParsedPartial {
  const partial = emptyPartial();
  const obj = tryJson(file.content) as Record<string, unknown> | null;
  if (!obj) return partial;
  partial.identityName = typeof obj.name === "string" ? obj.name : undefined;
  partial.identityDescription = typeof obj.description === "string" ? obj.description : undefined;
  partial.promptRaw = typeof obj.instructions === "string" ? obj.instructions : undefined;
  if (typeof obj.model === "string") partial.model = { provider: "openai", modelId: obj.model };
  if (typeof obj.temperature === "number") partial.model = { ...partial.model, params: { temperature: obj.temperature } };
  for (const tool of (obj.tools as Array<Record<string, unknown>>) ?? []) {
    if (tool.type === "function" && tool.function) {
      const fn = tool.function as Record<string, unknown>;
      partial.tools.push(
        toolFromSchema(
          String(fn.name),
          typeof fn.description === "string" ? fn.description : undefined,
          fn.parameters as Record<string, unknown>,
          "custom"
        )
      );
    } else if (typeof tool.type === "string") {
      partial.tools.push({
        id: `tool-${nanoid(8)}`,
        name: String(tool.type),
        description: `OpenAI built-in tool: ${tool.type}`,
        inputs: [],
        source: "built-in",
      });
    }
  }
  return partial;
}

export function parseElevenLabs(file: ImportFile): ParsedPartial {
  const partial = emptyPartial();
  const obj = tryJson(file.content) as Record<string, unknown> | null;
  if (!obj) return partial;
  const conv = (obj.conversation_config ?? obj) as Record<string, unknown>;
  const agent = (conv.agent ?? {}) as Record<string, unknown>;
  const promptObj = (agent.prompt ?? {}) as Record<string, unknown>;
  partial.identityName = typeof obj.name === "string" ? obj.name : undefined;
  partial.promptRaw = typeof promptObj.prompt === "string" ? promptObj.prompt : undefined;
  if (typeof promptObj.llm === "string") partial.model = { modelId: promptObj.llm };
  if (typeof promptObj.temperature === "number")
    partial.model = { ...partial.model, params: { temperature: promptObj.temperature } };
  for (const tool of (promptObj.tools as Array<Record<string, unknown>>) ?? []) {
    partial.tools.push(
      toolFromSchema(
        String(tool.name ?? tool.type ?? "tool"),
        typeof tool.description === "string" ? tool.description : undefined,
        (tool.api_schema as Record<string, unknown>)?.request_body_schema as Record<string, unknown>,
        "framework"
      )
    );
  }
  if (agent.first_message) partial.unmapped.first_message = agent.first_message;
  if (conv.tts) partial.unmapped.tts = conv.tts;
  if (obj.platform_settings) partial.unmapped.platform_settings = obj.platform_settings;
  if (Object.keys(partial.unmapped).length > 0) {
    partial.warnings.push("Voice/TTS and platform settings have no schema home — kept in provenance.unmappedFields.");
  }
  return partial;
}

export function parseCrewAi(file: ImportFile): ParsedPartial {
  const partial = emptyPartial();
  const obj = tryYamlOrJson(file.content) as Record<string, unknown> | null;
  if (!obj) return partial;
  const agents = (Array.isArray(obj.agents) ? obj.agents : Object.entries(obj.agents ?? {}).map(([k, v]) => ({ name: k, ...(v as object) }))) as Array<Record<string, unknown>>;
  const tasks = (Array.isArray(obj.tasks) ? obj.tasks : Object.entries(obj.tasks ?? {}).map(([k, v]) => ({ name: k, ...(v as object) }))) as Array<Record<string, unknown>>;

  for (const agent of agents) {
    const name = String(agent.name ?? agent.role ?? `agent-${nanoid(4)}`);
    partial.subagents.push({
      id: `sub-${nanoid(8)}`,
      name,
      description: [agent.role, agent.goal].filter(Boolean).join(" — ") || undefined,
      promptRaw: [agent.backstory, agent.goal && `Goal: ${agent.goal}`].filter(Boolean).join("\n\n") || undefined,
    });
    for (const toolName of (agent.tools as string[]) ?? []) {
      if (!partial.tools.some((t) => t.name === String(toolName))) {
        partial.tools.push({
          id: `tool-${nanoid(8)}`,
          name: String(toolName),
          description: undefined,
          inputs: [],
          source: "framework",
        });
      }
    }
  }

  // tasks become a sequential chain of llm-steps, one per task, wired to the crew agent
  const nodes: WorkflowNode[] = [{ id: "n-entry", kind: "entry", label: "Start" }];
  const edges: WorkflowEdge[] = [];
  let prev = "n-entry";
  for (const task of tasks) {
    const id = `n-${nanoid(8)}`;
    const agentName = task.agent ? String(task.agent) : undefined;
    const sub = partial.subagents.find((s) => s.name === agentName);
    nodes.push({
      id,
      kind: sub ? "subagent" : "llm-step",
      label: String(task.name ?? task.description ?? "task").slice(0, 60),
      description: typeof task.description === "string" ? task.description : undefined,
      subagentId: sub?.id,
    });
    edges.push({ id: `e-${nanoid(8)}`, source: prev, target: id, kind: "sequence" });
    prev = id;
  }
  nodes.push({ id: "n-done", kind: "terminal", label: "Done" });
  edges.push({ id: `e-${nanoid(8)}`, source: prev, target: "n-done", kind: "sequence" });
  partial.workflowNodes = nodes;
  partial.workflowEdges = edges;
  partial.identityName = typeof obj.name === "string" ? obj.name : "CrewAI crew";
  return partial;
}

export function parseLangGraph(file: ImportFile): ParsedPartial {
  const partial = emptyPartial();
  const obj = tryYamlOrJson(file.content) as Record<string, unknown> | null;
  if (!obj) return partial;
  const rawNodes = (obj.nodes as Array<Record<string, unknown> | string>) ?? [];
  const rawEdges = (obj.edges as Array<Record<string, unknown> | [string, string]>) ?? [];

  const kindOf = (node: Record<string, unknown>): WorkflowNode["kind"] => {
    const type = String(node.type ?? node.kind ?? "").toLowerCase();
    if (type.includes("tool")) return "tool-call";
    if (type.includes("router") || type.includes("conditional") || type.includes("branch")) return "router";
    if (type.includes("human")) return "human-gate";
    if (type.includes("memory") || type.includes("checkpoint")) return "memory";
    return "llm-step";
  };

  const nodes: WorkflowNode[] = rawNodes.map((n) => {
    const node = typeof n === "string" ? { id: n } : n;
    const id = String(node.id ?? node.name);
    return {
      id,
      kind: id === "__start__" ? "entry" : id === "__end__" ? "terminal" : kindOf(node),
      label: id === "__start__" ? "Start" : id === "__end__" ? "End" : String(node.name ?? node.id),
      description: typeof node.description === "string" ? node.description : undefined,
    };
  });
  const ids = new Set(nodes.map((n) => n.id));
  const edges: WorkflowEdge[] = [];
  for (const e of rawEdges) {
    const [source, target, label] = Array.isArray(e)
      ? [e[0], e[1], undefined]
      : [String(e.source ?? e.from), String(e.target ?? e.to), e.condition ? String(e.condition) : undefined];
    for (const endpoint of [source, target]) {
      if (!ids.has(endpoint)) {
        ids.add(endpoint);
        nodes.push({
          id: endpoint,
          kind: endpoint === "__start__" ? "entry" : endpoint === "__end__" ? "terminal" : "llm-step",
          label: endpoint === "__start__" ? "Start" : endpoint === "__end__" ? "End" : endpoint,
        });
      }
    }
    edges.push({ id: `e-${nanoid(8)}`, source, target, label, kind: label ? "conditional" : "sequence" });
  }
  if (!nodes.some((n) => n.kind === "entry")) {
    const entry = typeof obj.entry_point === "string" ? String(obj.entry_point) : nodes[0]?.id;
    partial.warnings.push("No __start__ node — a synthetic entry was added.");
    nodes.unshift({ id: "n-entry", kind: "entry", label: "Start" });
    if (entry) edges.unshift({ id: `e-${nanoid(8)}`, source: "n-entry", target: entry, kind: "sequence" });
  }
  partial.workflowNodes = nodes;
  partial.workflowEdges = edges;
  partial.identityName = typeof obj.name === "string" ? obj.name : "LangGraph agent";
  return partial;
}
