import rulesJson from "../../../best-practices.json";
import type { AgentArchitecture } from "@/lib/schema/architecture";
import { deterministicRules } from "./deterministicRules";
import type { BestPracticeRule, BestPractices, Finding } from "./types";

export const bestPractices = rulesJson as unknown as BestPractices;

export const ruleById = new Map<string, BestPracticeRule>(
  bestPractices.rules.map((r) => [r.id, r])
);

// Deterministic subset — cheap enough to run on every doc change.
export function runDeterministicLint(doc: AgentArchitecture): Finding[] {
  const findings: Finding[] = [];
  for (const rule of bestPractices.rules) {
    if (rule.detection.mode !== "deterministic") continue;
    const fn = deterministicRules[rule.id];
    if (!fn) continue;
    for (const partial of fn(doc)) {
      findings.push({ ...partial, severity: rule.severity, category: rule.category });
    }
  }
  const order = { error: 0, warn: 1, info: 2 } as const;
  return findings.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function findingsFor(findings: Finding[], targetType: Finding["targetType"], targetId?: string): Finding[] {
  return findings.filter((f) => f.targetType === targetType && f.targetId === targetId);
}

export function llmRules(): BestPracticeRule[] {
  return bestPractices.rules.filter((r) => r.detection.mode === "llm-judge");
}
