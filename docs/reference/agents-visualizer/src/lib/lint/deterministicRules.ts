import type { AgentArchitecture } from "@/lib/schema/architecture";
import { toolUsageMap, orphanNodeIds, unreachableNodeIds } from "@/lib/graph/utils";
import type { Finding } from "./types";

type RuleFn = (doc: AgentArchitecture) => Omit<Finding, "severity" | "category">[];

const RISKY = /irreversible|refund|payment|delete|money|transfer|spend|send/i;
const COLLECTION_TOOL = /^(list_|search_|get_all|query_)/;
const BOUNDING_PARAM = /^(limit|page|cursor|filter|query|response_format|max)/i;
const AMBIGUOUS_PARAM = new Set(["user", "id", "name", "data", "value", "input", "item"]);

// Keyed by rule id in best-practices.json (detection.mode === "deterministic").
export const deterministicRules: Record<string, RuleFn> = {
  "prompt-structured-sections": (doc) => {
    const roles = new Set(doc.prompt.segments.map((s) => s.role).filter((r) => r !== "whitespace"));
    const findings: ReturnType<RuleFn> = [];
    if (roles.size < 3 && doc.prompt.raw.length > 0) {
      findings.push({
        ruleId: "prompt-structured-sections",
        targetType: "agent",
        message: `The prompt dissects into only ${roles.size} distinct section role(s) — it reads as an unstructured block.`,
        suggestion: "Split the prompt into labeled sections: identity, task instructions, constraints, output format.",
      });
    }
    for (const required of ["role-identity", "task-instructions", "output-format"] as const) {
      if (doc.prompt.raw.length > 0 && !roles.has(required)) {
        findings.push({
          ruleId: "prompt-structured-sections",
          targetType: "agent",
          message: `No ${required.replace("-", " ")} section found in the prompt.`,
          suggestion: `Add an explicit ${required.replace("-", " ")} block.`,
        });
      }
    }
    return findings;
  },

  "prompt-has-role": (doc) =>
    doc.prompt.raw.length > 0 && !doc.prompt.segments.some((s) => s.role === "role-identity")
      ? [
          {
            ruleId: "prompt-has-role",
            targetType: "agent",
            message: "The prompt never states who the agent is.",
            suggestion: "Open with a one-sentence role: even that measurably focuses behavior and tone.",
          },
        ]
      : [],

  "prompt-fewshot-band": (doc) => {
    const n = doc.prompt.segments.filter((s) => s.role === "few-shot-example").length;
    if (n === 0 || (n >= 3 && n <= 5)) return [];
    return [
      {
        ruleId: "prompt-fewshot-band",
        targetType: "agent",
        message: `${n} few-shot example segment(s) found — the effective band is 3 to 5 curated, diverse examples.`,
        suggestion: n < 3 ? "Either remove the token example or grow the set to 3-5 canonical ones." : "Trim to the 3-5 most canonical examples; an edge-case laundry list underperforms.",
      },
    ];
  },

  "tools-description-quality": (doc) => {
    const findings: ReturnType<RuleFn> = [];
    for (const tool of doc.tools) {
      if (!tool.description || tool.description.length < 80) {
        findings.push({
          ruleId: "tools-description-quality",
          targetType: "tool",
          targetId: tool.id,
          message: `Tool "${tool.name}" has ${tool.description ? "a description under 80 characters" : "no description"}.`,
          suggestion: "Write it like a docstring for a new teammate: when to use it, when not to, what it returns.",
        });
      }
      for (const input of tool.inputs) {
        if (!input.description) {
          findings.push({
            ruleId: "tools-description-quality",
            targetType: "tool",
            targetId: tool.id,
            message: `Parameter "${input.name}" of "${tool.name}" is undocumented.`,
          });
        }
        if (AMBIGUOUS_PARAM.has(input.name.toLowerCase())) {
          findings.push({
            ruleId: "tools-description-quality",
            targetType: "tool",
            targetId: tool.id,
            message: `Parameter name "${input.name}" of "${tool.name}" is ambiguous.`,
            suggestion: `Qualify it (e.g. "${input.name}_id", "customer_${input.name}").`,
          });
        }
      }
    }
    return findings;
  },

  "tools-token-efficient-responses": (doc) =>
    doc.tools
      .filter(
        (t) =>
          COLLECTION_TOOL.test(t.name) &&
          !t.inputs.some((i) => BOUNDING_PARAM.test(i.name))
      )
      .map((t) => ({
        ruleId: "tools-token-efficient-responses",
        targetType: "tool" as const,
        targetId: t.id,
        message: `"${t.name}" returns a collection but exposes no limit, pagination, filter, or response-format control.`,
        suggestion: "Add a bounding parameter with a sensible default so responses cannot flood the context.",
      })),

  "workflow-graph-integrity": (doc) => {
    const findings: ReturnType<RuleFn> = [];
    const entries = doc.workflow.nodes.filter((n) => n.kind === "entry");
    const terminals = doc.workflow.nodes.filter((n) => n.kind === "terminal");
    if (doc.workflow.nodes.length > 0 && entries.length !== 1) {
      findings.push({
        ruleId: "workflow-graph-integrity",
        targetType: "agent",
        message: `The graph has ${entries.length} entry nodes; it needs exactly one.`,
      });
    }
    if (doc.workflow.nodes.length > 1 && terminals.length === 0) {
      findings.push({
        ruleId: "workflow-graph-integrity",
        targetType: "agent",
        message: "The graph has no terminal node — no defined way for a run to end.",
      });
    }
    for (const id of orphanNodeIds(doc.workflow)) {
      findings.push({
        ruleId: "workflow-graph-integrity",
        targetType: "node",
        targetId: id,
        message: `Node "${doc.workflow.nodes.find((n) => n.id === id)?.label ?? id}" has no edges — it can never run.`,
        suggestion: "Connect it to the flow or remove it.",
      });
    }
    for (const id of unreachableNodeIds(doc.workflow)) {
      if (orphanNodeIds(doc.workflow).includes(id)) continue;
      findings.push({
        ruleId: "workflow-graph-integrity",
        targetType: "node",
        targetId: id,
        message: `Node "${doc.workflow.nodes.find((n) => n.id === id)?.label ?? id}" is unreachable from the entry.`,
      });
    }
    return findings;
  },

  "memory-strategy-declared": (doc) => {
    const hasLoop = doc.workflow.edges.some((e) => e.kind === "loop");
    const referencesMemory = doc.workflow.nodes.some((n) => n.kind === "memory");
    if (doc.memory.length === 0 && (hasLoop || referencesMemory)) {
      return [
        {
          ruleId: "memory-strategy-declared",
          targetType: "agent",
          message: "The workflow implies long-horizon work but no memory strategy is declared.",
          suggestion: "Declare how state survives: compaction, notes, or an external store.",
        },
      ];
    }
    return [];
  },

  "memory-minimal-context": (doc) => {
    const findings: ReturnType<RuleFn> = [];
    const total = doc.prompt.segments.reduce((a, s) => a + (s.tokenEstimate ?? 0), 0);
    if (total > 4000) {
      findings.push({
        ruleId: "memory-minimal-context",
        targetType: "agent",
        message: `The prompt weighs ~${total} tokens — context this heavy degrades recall even under the limit.`,
        suggestion: "Move reference material behind a retrieval tool; keep the prompt to the minimal high-signal set.",
      });
    }
    for (const seg of doc.prompt.segments) {
      if (seg.role === "context-background" && (seg.tokenEstimate ?? 0) > 1500) {
        findings.push({
          ruleId: "memory-minimal-context",
          targetType: "segment",
          targetId: seg.id,
          message: `Background segment "${seg.label ?? seg.id}" alone weighs ~${seg.tokenEstimate} tokens.`,
          suggestion: "Fetch this just-in-time via a tool instead of preloading it.",
        });
      }
    }
    return findings;
  },

  "orchestration-single-agent-first": (doc) => {
    if (doc.subagents.length === 0) return [];
    const hasBranching = doc.workflow.nodes.some((n) => n.kind === "router");
    const outDegree = new Map<string, number>();
    for (const e of doc.workflow.edges) outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1);
    const hasParallel = [...outDegree.values()].some((d) => d > 1);
    if (!hasBranching && !hasParallel) {
      return [
        {
          ruleId: "orchestration-single-agent-first",
          targetType: "agent",
          message: `${doc.subagents.length} subagent(s) exist but the graph has no parallel or branching structure — the decomposition buys token cost without the parallelism that justifies it.`,
          suggestion: "Fold the subagent's duties into the main agent with better tools, or restructure for genuinely parallel subtasks.",
        },
      ];
    }
    return [];
  },

  "safety-human-gate-irreversible": (doc) => {
    const riskyToolIds = new Set(
      doc.tools.filter((t) => RISKY.test(`${t.riskNotes ?? ""} ${t.description ?? ""}`)).map((t) => t.id)
    );
    if (riskyToolIds.size === 0) return [];
    // predecessors map
    const preds = new Map<string, string[]>();
    for (const e of doc.workflow.edges) preds.set(e.target, [...(preds.get(e.target) ?? []), e.source]);
    const gateProtects = (nodeId: string): boolean => {
      const seen = new Set<string>();
      const queue = [...(preds.get(nodeId) ?? [])];
      while (queue.length) {
        const current = queue.shift()!;
        if (seen.has(current)) continue;
        seen.add(current);
        const node = doc.workflow.nodes.find((n) => n.id === current);
        if (node?.kind === "human-gate") return true;
        queue.push(...(preds.get(current) ?? []));
      }
      return false;
    };
    const findings: ReturnType<RuleFn> = [];
    for (const node of doc.workflow.nodes) {
      const usesRisky = (node.toolIds ?? []).some((tid) => riskyToolIds.has(tid));
      const subagentRisky =
        node.kind === "subagent" &&
        (doc.subagents.find((s) => s.id === node.subagentId)?.toolIds ?? []).some((tid) =>
          riskyToolIds.has(tid)
        );
      if ((usesRisky || subagentRisky) && !gateProtects(node.id)) {
        findings.push({
          ruleId: "safety-human-gate-irreversible",
          targetType: "node",
          targetId: node.id,
          message: `"${node.label}" can execute an irreversible or high-stakes tool with no human-gate upstream.`,
          suggestion: "Route this step through an explicit approval node.",
        });
      }
    }
    return findings;
  },

  "safety-least-privilege": (doc) => {
    const usage = toolUsageMap(doc);
    return doc.tools
      .filter((t) => (usage.get(t.id) ?? []).length === 0)
      .map((t) => ({
        ruleId: "safety-least-privilege",
        targetType: "tool" as const,
        targetId: t.id,
        message: `Tool "${t.name}" is never used by any workflow step or subagent${RISKY.test(t.riskNotes ?? "") ? " — and it is high-risk" : ""}.`,
        suggestion: "Remove it, or wire the step that actually needs it. Unused privilege is standing risk.",
      }));
  },
};
