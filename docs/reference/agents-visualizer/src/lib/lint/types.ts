export type FindingTarget = "agent" | "node" | "segment" | "tool" | "edge";
export type Severity = "error" | "warn" | "info";

export interface Finding {
  ruleId: string;
  severity: Severity;
  category: string;
  targetType: FindingTarget;
  targetId?: string;
  message: string;
  suggestion?: string;
}

export interface BestPracticeRule {
  id: string;
  category: "prompt" | "tools" | "workflow" | "memory" | "orchestration" | "safety";
  severity: Severity;
  statement: string;
  rationale: string;
  detection: { mode: "deterministic" | "llm-judge"; hint: string };
  source: { claim: string; url: string };
}

export interface BestPractices {
  version: string;
  generated: string;
  rules: BestPracticeRule[];
}
