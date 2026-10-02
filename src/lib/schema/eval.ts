import { z } from "zod";

// Mirrors schema/eval.schema.json (the public contract). src/lib/schema/eval.test.ts
// fails if the property names drift. Do not add fields here that the schema lacks.

const strings = z.array(z.string());
const stringOrNumber = z.union([z.string(), z.number()]);
const realSources = z.enum(["real", "synthetic", "curated", "adversarial"]);
const graderKinds = z.enum(["code", "similarity", "llm-judge", "human", "user-signal"]);

export const Author = z.strictObject({
  name: z.string(),
  url: z.url().optional(),
  github: z.string().optional(),
});

export const Purpose = z.strictObject({
  question: z.string().optional(),
  decision: z.string().optional(),
  construct: z.string().optional(),
  out_of_scope: strings.optional(),
  origin_failures: strings.optional(),
});

export const Taxonomy = z.strictObject({
  origin: z.enum(["public-benchmark", "product-eval"]).optional(),
  purpose: z.enum(["capability", "regression", "comparison", "risk-threshold"]).optional(),
  moment: z.enum(["offline", "online", "backtesting"]).optional(),
  interaction: z.enum(["static", "dynamic"]).optional(),
  structure: z
    .enum(["single-turn", "multi-turn", "agent-outcome", "agent-trajectory", "component"])
    .optional(),
  grader: z.array(graderKinds).optional(),
  judgment: z.enum(["pointwise", "pointwise-reference", "pairwise"]).optional(),
  inputs_origin: z.array(realSources).optional(),
  dimension: z
    .array(
      z.enum([
        "correctness",
        "text-quality",
        "reliability",
        "safety",
        "dangerous-capability",
        "cost-latency",
        "user-experience",
      ]),
    )
    .optional(),
  system_type: z
    .array(
      z.enum([
        "chat",
        "rag",
        "coding-agent",
        "conversational-agent",
        "research-agent",
        "computer-use-agent",
        "summarization",
        "classification",
        "document-generation",
      ]),
    )
    .optional(),
});

export const System = z.strictObject({
  description: z.string().optional(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  prompt_variants: z.number().int().min(1).optional(),
  fixed: z.boolean().optional(),
});

export const Environment = z.strictObject({
  description: z.string().optional(),
  reset_per_trial: z.boolean().optional(),
  simulated_user: z.string().optional(),
  tools: strings.optional(),
});

export const Cases = z.strictObject({
  count: z.number().int().min(0).optional(),
  file: z.string().optional(),
  source: z.array(realSources).optional(),
  collected: z.string().optional(),
  tags: strings.optional(),
  synthetic_dimensions: strings.optional(),
  splits: z.record(z.string(), z.number().int()).optional(),
  sampling: z.string().optional(),
  examples: z
    .array(
      z.strictObject({
        id: z.string().optional(),
        input: z.unknown(),
        reference: z.unknown().optional(),
        tags: strings.optional(),
      }),
    )
    .optional(),
  modality: strings.optional(),
});

export const Reference = z.strictObject({
  kind: z.enum(["golden-answer", "reference-solution", "none"]).optional(),
  produced_by: z.enum(["human", "llm", "llm-reviewed", "program"]).optional(),
  visible_to_system: z.boolean().optional(),
});

export const Criterion = z.strictObject({
  id: z.string(),
  question: z.string(),
  failure_mode: z.string().optional(),
  evidence: z.string().optional(),
  grader: z.union([z.string(), z.array(z.string()).min(1)]).optional(),
  pass_example: z.string().optional(),
  fail_example: z.string().optional(),
  gate: z.boolean().optional(),
  applies_when: z.string().optional(),
  sources: strings.optional(),
});

export const Grader = z.strictObject({
  id: z.string(),
  kind: graderKinds,
  description: z.string().optional(),
  script: z.string().optional(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  same_model_as_system: z.boolean().optional(),
  swap_order: z.boolean().optional(),
  output_format: z
    .enum(["reason-then-verdict", "verdict-then-reason", "verdict-only", "score-only"])
    .optional(),
});

export const Verdict = z.strictObject({
  scale: z.enum(["binary", "binary-na-unknown", "ordinal", "score-0-1", "pairwise"]).optional(),
  levels: z
    .array(z.strictObject({ value: stringOrNumber, anchor: z.string().optional() }))
    .optional(),
  pass_cut: stringOrNumber.optional(),
  na_rule: z.string().optional(),
});

export const Trials = z.strictObject({
  k: z.number().int().min(1).optional(),
  metric: z.enum(["pass@k", "pass^k", "mean", "majority"]).optional(),
});

export const Aggregation = z.strictObject({
  method: z.string().optional(),
  formula: z.string().optional(),
  uncertainty: z.enum(["standard-error", "confidence-interval", "bootstrap", "none"]).optional(),
  breakdown: z.array(z.enum(["criterion", "subgroup", "case-tag"])).optional(),
  bands: z
    .array(
      z.strictObject({
        score: stringOrNumber,
        min_pass_rate: z.number().optional(),
        anchor: z.string().optional(),
      }),
    )
    .optional(),
});

export const Threshold = z.strictObject({
  per_case: stringOrNumber.optional(),
  overall: stringOrNumber.optional(),
  gates: z
    .array(
      z.union([
        z.string(),
        z.strictObject({
          id: z.string().optional(),
          criteria: z.array(z.string()).min(1),
          applies_when: z.string().optional(),
          effect: z.string().optional(),
        }),
      ]),
    )
    .optional(),
  rationale: z.string().optional(),
});

export const Baseline = z.strictObject({
  kind: z.enum(["previous-version", "other-model", "chance", "human", "none"]).optional(),
  description: z.string().optional(),
  value: stringOrNumber.optional(),
  control_metrics: strings.optional(),
});

export const Validation = z.strictObject({
  judge_vs_human: z
    .strictObject({
      n: z.number().int().optional(),
      tpr: z.number().optional(),
      tnr: z.number().optional(),
      kappa: z.number().optional(),
      split: z.boolean().optional(),
      date: z.string().optional(),
    })
    .optional(),
  reference_solution: z.boolean().optional(),
  planted_failures: z.string().optional(),
  contamination: z
    .strictObject({
      canary: z.string().optional(),
      heldout: z.boolean().optional(),
      test: z.string().optional(),
    })
    .optional(),
  calibration: z.string().optional(),
  meta_eval: z.string().optional(),
});

export const Run = z.strictObject({
  frequency: z.enum(["every-change", "daily", "weekly", "pre-release", "manual"]).optional(),
  command: z.string().optional(),
  ci: z.boolean().optional(),
});

export const HistoryEntry = z.strictObject({
  version: z.string(),
  date: z.string(),
  change: z.string(),
  author: z.string().optional(),
});

export const Maintenance = z.strictObject({
  review_every: z.string().optional(),
  retire_when: z.string().optional(),
});

export const EvalCard = z.strictObject({
  schema: z.literal("eval-anatomy/v1"),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/),
  name: z.string().min(3),
  version: z.string().regex(/^\d+\.\d+(\.\d+)?$/),
  status: z.enum(["draft", "approved", "deprecated"]).optional(),
  language: z.string(),
  summary: z.string().max(280),
  authors: z.array(Author).min(1),
  owner: z.string().optional(),
  license: z.string().optional(),
  created: z.iso.date(),
  updated: z.iso.date().optional(),
  contact: z.string().optional(),
  links: z.record(z.string(), z.url()).optional(),
  source_format: z.string().optional(),
  purpose: Purpose.optional(),
  taxonomy: Taxonomy.optional(),
  system: System.optional(),
  environment: Environment.optional(),
  cases: Cases.optional(),
  reference: Reference.optional(),
  criteria: z.array(Criterion).optional(),
  graders: z.array(Grader).optional(),
  verdict: Verdict.optional(),
  trials: Trials.optional(),
  aggregation: Aggregation.optional(),
  threshold: Threshold.optional(),
  baseline: Baseline.optional(),
  validation: Validation.optional(),
  run: Run.optional(),
  history: z.array(HistoryEntry).optional(),
  limitations: strings.optional(),
  sensitive_data: z.enum(["none", "personal", "offensive", "confidential", "mixed"]).optional(),
  maintenance: Maintenance.optional(),
  applies_to: strings.optional(),
});

export type EvalCard = z.infer<typeof EvalCard>;
