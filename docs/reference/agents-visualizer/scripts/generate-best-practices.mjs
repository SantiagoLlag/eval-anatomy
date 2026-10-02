// Generates wiki/best-practices.json in the Agent Building SB vault from its
// claim notes, then vendors a copy to this repo's best-practices.json.
//
// Traceability invariant (enforced here, hard-fail):
//   - every rule's source.claim must be an existing notes/<claim>.md
//   - every rule's source.url must equal that note's `source:` frontmatter
//   - a claim with status superseded drops its rules
// The vault is the source of truth; neither JSON is ever hand-edited.
// Run: npm run sync-rules
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const VAULT = "/Users/santiagollagunolopez/Vaults/Agent Building SB";
const APP = fileURLToPath(new URL("..", import.meta.url));
const VERSION = process.argv[2] ?? "1.0.0";
const TODAY = new Date().toISOString().slice(0, 10);

// ---- read claims fresh from disk ----
const notes = new Map();
for (const f of readdirSync(join(VAULT, "notes")).filter((f) => f.endsWith(".md"))) {
  const txt = readFileSync(join(VAULT, "notes", f), "utf8");
  const fm = Object.fromEntries(
    (txt.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "")
      .split("\n")
      .map((l) => l.match(/^([a-z]+):\s*(.*)$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]])
  );
  notes.set(f.replace(/\.md$/, ""), fm);
}

const R = (id, category, severity, claim, statement, rationale, mode, hint) => ({
  id, category, severity,
  statement, rationale,
  detection: { mode, hint },
  source: { claim, url: "" },
});

const rules = [
  // ---- prompt ----
  R("prompt-right-altitude", "prompt", "warn", "Write prompts at the right altitude with heuristics, not brittle if-else",
    "Prompt sections must state strong heuristics, not exhaustive if-else rules and not vague guidance that assumes unshared context.",
    "Hardcoded conditional chains are fragile and overtrigger; vague guidance underdetermines behavior. The right altitude is specific-yet-flexible.",
    "llm-judge", "Read the constraints and task-instructions segments: flag chains of 3+ conditional rules that enumerate cases, and one-line vague instructions carrying no operative detail."),
  R("prompt-structured-sections", "prompt", "warn", "Organize system prompts into distinct XML or Markdown sections",
    "The system prompt must be organized into distinct labeled sections covering at least identity, task instructions, and output format.",
    "Sectioned prompts reduce misinterpretation when content kinds mix, and are the precondition for auditing what each part does.",
    "deterministic", "Fail if the dissected prompt has fewer than 3 non-whitespace segment roles, or lacks any of: role-identity, task-instructions, output-format."),
  R("prompt-has-role", "prompt", "info", "Be explicit, set a role, and give the why behind every rule",
    "The prompt opens with a role definition, even a single sentence.",
    "A one-sentence role measurably focuses behavior and tone; it is the cheapest prompt lever.",
    "deterministic", "Fail if no segment has role role-identity."),
  R("prompt-rules-have-why", "prompt", "info", "Be explicit, set a role, and give the why behind every rule",
    "Hard rules in the prompt carry their motivation, and instructions state what to do rather than only what not to do.",
    "The model generalizes from the explanation behind a rule; a bare prohibition transfers worse than a motivated one.",
    "llm-judge", "Read constraints and guardrail segments: flag bare prohibitions with no why, and not-X instructions with no positive alternative."),
  R("prompt-fewshot-band", "prompt", "info", "Few-shot pays off for format and tone with 3 to 5 curated examples",
    "If few-shot examples are present, there are 3 to 5 curated, diverse ones; one token example or a laundry list of edge cases both underperform.",
    "Examples are the strongest format/tone steering; the value is in a small canonical set, not exhaustive enumeration.",
    "deterministic", "Count few-shot-example segments: 0 passes silently, 1-2 or more than 5 raises this finding."),

  // ---- tools ----
  R("tools-description-quality", "tools", "error", "Tool descriptions are prompts and deserve the same engineering care",
    "Every tool has a description of at least two sentences stating when to use it, and every parameter is documented with an unambiguous name.",
    "Tool definitions load into the agent's context and are what the model decides from; description refinements alone dramatically cut error rates.",
    "deterministic", "Fail per tool: description missing or under 80 chars, any input lacking a description, or single-word ambiguous parameter names like user or id."),
  R("tools-error-design", "tools", "info", "Tool descriptions are prompts and deserve the same engineering care",
    "Tool error responses steer the agent with specific, actionable guidance instead of opaque codes or stack traces.",
    "The error path is part of the interface: an actionable error lets the agent recover; a traceback wastes a turn.",
    "llm-judge", "Where tool descriptions or configs mention failure behavior, judge whether errors are described as actionable; flag tools whose failure mode is undefined."),
  R("tools-consolidate-wrappers", "tools", "warn", "A few high-level workflow tools beat many thin API-endpoint wrappers",
    "Multi-step operations are consolidated into workflow-level tools; sets of thin per-endpoint wrappers that are always used together should merge.",
    "More tools do not improve outcomes, and definition overhead grows with every wrapper; consolidation spends the agent's context on work, not plumbing.",
    "llm-judge", "Look for 3+ tools that mirror CRUD endpoints of the same entity or are only meaningful in sequence; propose the consolidated workflow tool."),
  R("tools-token-efficient-responses", "tools", "warn", "Token-efficient tool responses need format control, pagination, filtering",
    "Tools that return collections expose pagination, filtering, or a response-format control; no tool returns unbounded output.",
    "Tools budget the agent's context: bounded, filterable responses keep long loops alive and precise.",
    "deterministic", "For tools whose name starts with list_, search_, get_all, or query_, fail when inputs include none of: limit, page, cursor, filter, query, response_format."),
  R("tools-poka-yoke-args", "tools", "info", "Poka-yoke argument design makes agent mistakes structurally impossible",
    "Tool arguments are designed so mistakes are structurally impossible: absolute over relative references, enums over free strings, no formats requiring bookkeeping.",
    "Changing the arguments eliminated whole error classes in production; schema strictness beats prompt reminders.",
    "llm-judge", "Inspect input types: flag free-string params that could be enums, relative path/reference params, and formats needing escaping or counting."),

  // ---- workflow ----
  R("workflow-simplest-first", "workflow", "info", "Start with the simplest composition and add agency only when it pays",
    "The architecture is no more agentic than its task requires; a simpler composition meeting the stated purpose is preferred.",
    "Every rung up the ladder trades latency and cost for performance; escalation must be justified by measured need.",
    "llm-judge", "Given the agent's description and workflow, judge whether a single augmented call or a fixed workflow would plausibly meet the stated purpose."),
  R("workflow-predictable-path", "workflow", "warn", "Workflows fit predictable paths and agents fit unpredictable ones",
    "If the task decomposes into enumerable fixed steps, the architecture uses a predefined workflow, not a freeform agent loop.",
    "Predefined paths buy predictability and consistency; agent autonomy costs more and compounds errors on tasks that never needed it.",
    "llm-judge", "Judge from the workflow graph and description: an llm-step loop with full tool freedom on a task whose steps are evidently fixed raises this finding."),
  R("workflow-pattern-structure", "workflow", "info", "Chaining, routing, and parallelization each match one task structure",
    "The workflow pattern in use matches the task structure: chaining for fixed sequences, routing for distinct input categories, parallelization for independent subtasks.",
    "Pattern choice is a structural read of the task; a mismatched pattern adds machinery without its payoff.",
    "llm-judge", "Compare the graph shape (router nodes, parallel branches, loops) with the task the description states; name the mismatch."),
  R("workflow-graph-integrity", "workflow", "error", "Workflows fit predictable paths and agents fit unpredictable ones",
    "The workflow graph is sound: exactly one entry, at least one terminal, no orphan nodes, no unreachable nodes.",
    "A graph with dead branches or no defined entry cannot be reasoned about, executed, or audited.",
    "deterministic", "Graph checks: entry count == 1, terminal count >= 1, no node without edges when the graph has 2+ nodes, all nodes reachable from entry."),
  R("workflow-evals-declared", "workflow", "info", "Grade agent outcomes with calibrated judges on real-failure tasks",
    "The architecture declares how success is graded: outcome checks on real-failure tasks, not prescribed step sequences.",
    "Without outcome evals, changes to the agent are unfalsifiable; step-sequence assertions produce brittle tests.",
    "llm-judge", "Look for any declared eval loop, success criteria, or grading strategy in the description or config; absence raises this finding."),
  R("workflow-framework-justified", "workflow", "info", "Default to direct API calls and reduce abstraction in production",
    "Framework usage is justified by needed runtime infrastructure (durability, interrupts, tracing), not by prompt wrapping.",
    "Frameworks obscure prompts and responses; the documented counter-position is that their runtime infrastructure pays off in production - the disagreement is real, so this rule only asks that the choice be deliberate.",
    "llm-judge", "If provenance shows a framework, judge whether the architecture uses framework runtime features or only its prompt plumbing."),

  // ---- memory ----
  R("memory-compaction-policy", "memory", "warn", "Compaction must preserve decisions and discard stale tool output",
    "A long-horizon agent declares a compaction policy that preserves decisions, constraints, and open questions while discarding stale tool output.",
    "Compaction extends runs and cuts tokens dramatically, but uniform summarization loses the load-bearing facts.",
    "llm-judge", "If the workflow loops or the description implies long sessions, inspect memory strategies for a summarization policy naming what is preserved; absence or an unspecified policy fails."),
  R("memory-strategy-declared", "memory", "info", "External memory notes lift long-horizon and cross-session performance",
    "An agent doing long-horizon or multi-session work declares at least one memory strategy.",
    "External notes and stores measurably lift long-task performance and are the only path to cross-session recall.",
    "deterministic", "Fail if memory[] is empty while the graph contains a loop edge or a memory node reference, or the description mentions sessions or long-running work."),
  R("memory-minimal-context", "memory", "info", "Minimal focused context beats full-history prompts across models",
    "The prompt carries the minimal high-signal set: no preloaded corpora that tools could fetch at runtime.",
    "Performance degrades with input length even under the limit; focused prompts beat full-history prompts on the same information.",
    "deterministic", "Raise when total prompt token estimate exceeds 4000, or a context-background segment alone exceeds 1500 tokens; suggest just-in-time retrieval via a tool."),

  // ---- orchestration ----
  R("orchestration-single-agent-first", "orchestration", "warn", "Multi-agent wins on parallelizable breadth-first tasks at 15x token cost",
    "Multiple agents appear only where subtasks are parallelizable and context-isolated; otherwise one agent with better tools wins.",
    "Multi-agent costs about 15x chat tokens and is documented to fail on tightly coupled work; the opposing fragmentation case is kept open in the vault.",
    "deterministic", "Fail when subagents exist but no router or parallel branch structure exists in the graph, or when two subagents write to the same memory strategy."),
  R("orchestration-explicit-briefs", "orchestration", "warn", "Delegate with explicit briefs and receive distilled summaries back",
    "Every subagent has an explicit brief: objective, output format, and task boundaries in its description; returns are distilled summaries, not full transcripts.",
    "Vague delegation produces duplicated work and coverage gaps; unbounded returns re-fragment the lead's context.",
    "llm-judge", "Judge each subagent description for objective, output format, boundaries; flag one-line descriptions like a name restated."),
  R("orchestration-fragmentation-risk", "orchestration", "warn", "Parallel subagents drift on conflicting assumptions when context fragments",
    "Parallel subagents do not make interdependent decisions: work products that must agree are produced by one context, not reconciled after.",
    "Subagents seeing only a subtask make conflicting implicit decisions; supervisors paraphrasing results lose information telephone-game style.",
    "llm-judge", "Identify pairs of parallel subagents whose outputs must be mutually consistent (shared artifact, shared style, shared plan); each pair raises this finding."),

  // ---- safety ----
  R("safety-lethal-trifecta", "safety", "error", "Removing one lethal-trifecta leg beats filtering injection attacks",
    "No agent combines private-data access, untrusted-content exposure, and an external send channel; one leg must be removed or gated.",
    "Filters are bypassable by iteration; every documented production exploit was fixed by cutting a leg, not by better filtering.",
    "llm-judge", "Classify each tool: reads private data, ingests untrusted content, sends externally. If all three classes are reachable in one flow without a human gate between ingestion and send, fail."),
  R("safety-untrusted-to-action", "safety", "error", "Untrusted input must be structurally unable to trigger consequential actions",
    "Between any node ingesting untrusted content and any consequential tool call there is a structural barrier: a gate, a plan fixed before ingestion, or a quarantined context.",
    "Prompt-level instructions cannot reliably resist injected content; only structure gives guarantees.",
    "llm-judge", "Trace graph paths from untrusted-ingestion nodes (web, email, file uploads) to consequential tools (write, send, spend); a path with no human-gate or structural barrier fails."),
  R("safety-human-gate-irreversible", "safety", "error", "Place human approval at irreversible, high-stakes actions",
    "Every irreversible or high-stakes tool call (money movement, deletion, external sends at scale) sits behind a human-gate node.",
    "All major vendors converge: human approval belongs at consequential decision points, relaxing only as measured reliability grows.",
    "deterministic", "For tools whose riskNotes or description mention irreversible, refund, payment, delete, or send: fail if no human-gate node precedes every tool-call node using them."),
  R("safety-least-privilege", "safety", "warn", "Scope agent tools to least privilege, elevated only on demand",
    "The agent carries no unused tools; every tool is referenced by the workflow, and high-privilege tools exist only where a step needs them.",
    "An unused high-privilege tool is standing risk enabling privilege chaining, not neutral surface.",
    "deterministic", "Fail per tool not referenced by any workflow node or subagent; escalate severity when the unused tool is high-risk by riskNotes."),
  R("safety-gates-outside-model", "safety", "warn", "Deterministic policy gates screen every tool call before execution",
    "High-risk enforcement lives outside the model: permission rules, policy engines, or approval steps - never only prompt instructions.",
    "A prompt sentence is a soft control competing with the whole context window; deterministic gates give testable hard limits.",
    "llm-judge", "If guardrail segments prohibit actions that the tool set still permits unconditionally (no gate node, no declared permission layer), fail those pairs."),
];

// ---- enforce traceability ----
const errors = [];
for (const rule of rules) {
  const fm = notes.get(rule.source.claim);
  if (!fm) { errors.push(`UNTRACEABLE: rule ${rule.id} -> missing note "${rule.source.claim}"`); continue; }
  if (fm.status === "superseded") { errors.push(`SUPERSEDED: rule ${rule.id} -> claim "${rule.source.claim}" (drop or rewrite the rule)`); continue; }
  if (!fm.source) { errors.push(`NO SOURCE: claim "${rule.source.claim}" has no source frontmatter`); continue; }
  rule.source.url = fm.source;
}
const ids = new Set();
for (const r of rules) {
  if (ids.has(r.id)) errors.push(`DUPLICATE ID: ${r.id}`);
  ids.add(r.id);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

const doc = {
  version: VERSION,
  generated: TODAY,
  vault: VAULT,
  generator: "derived from notes/*.md via scripts/generate-best-practices.mjs — regenerate, never hand-edit; a rule with no backing claim note is invalid by definition",
  categories: ["prompt", "tools", "workflow", "memory", "orchestration", "safety"],
  rules,
};

const json = JSON.stringify(doc, null, 2) + "\n";
writeFileSync(join(VAULT, "wiki", "best-practices.json"), json);
writeFileSync(join(APP, "best-practices.json"), json);
console.log(`v${VERSION}: ${rules.length} rules from ${new Set(rules.map((r) => r.source.claim)).size} claims -> vault wiki/ + app root`);
