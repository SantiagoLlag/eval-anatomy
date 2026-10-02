# Eval card format (`eval-anatomy/v1`)

Each catalog entry is a folder:

```
catalog/<id>/
  eval.md          # YAML frontmatter (the card) + Markdown body (how to run it, notes)
  cases.jsonl      # optional: the test cases
  scripts/         # optional: code graders
  examples/        # optional: sample inputs/outputs, known-good and known-bad
```

The frontmatter is validated against [`schema/eval.schema.json`](../schema/eval.schema.json). Only identity fields are required; every other section maps to one part of the anatomy and may be omitted. Omitted parts are not errors: the visualizer shows them as **missing** and the linter explains why they matter.

## Sections and anatomy parts

| Frontmatter key | Anatomy part | Group |
|---|---|---|
| `purpose` | purpose | Intent |
| `cases` | cases | What is tested |
| `reference` | reference | What is tested |
| `system` | system | What is tested |
| `environment` | environment | What is tested |
| — (recorded by runs, not by the card) | output | How it is judged |
| `criteria[]` | criteria | How it is judged |
| `graders[]` | grader | How it is judged |
| `verdict` | verdict | How it is judged |
| `trials` | trials | What is concluded |
| `aggregation` | aggregation | What is concluded |
| `threshold` | threshold | What is concluded |
| `baseline` | baseline | What is concluded |
| `validation` | validation | How it is maintained |
| `version`, `history`, `owner`, `run` | metadata | How it is maintained |
| `authors`, `license`, `contact`, `limitations`, `sensitive_data`, `maintenance` | documentation | How it is maintained |
| `taxonomy`, `applies_to` | classification for catalog filters | — |

Since v1 also allows: a criterion graded by several graders in order (`grader: [count-script, judge]`), per-criterion `sources`, named conditional gates (`threshold.gates: [{id, criteria, applies_when, effect}]`), banded scores (`aggregation.bands`), `validation.calibration` and `validation.meta_eval`, and `system.fixed: false` for evals that check artifacts from any producer.

## Minimal valid card

```yaml
---
schema: eval-anatomy/v1
id: support-no-invented-policies
name: Support assistant does not invent policies
version: 1.0.0
language: en
summary: Checks that a store's support assistant only states policies that exist in its official policy.
authors: [{ name: Jane Doe, github: janedoe }]
created: 2026-10-02
---
```

## Complete example (running example used across the docs)

```yaml
---
schema: eval-anatomy/v1
id: support-no-invented-policies
name: Support assistant does not invent policies
version: 1.2.0
status: approved
language: en
summary: Checks that a store's support assistant only states policies that exist in its official policy.
authors: [{ name: Jane Doe, github: janedoe }]
owner: Jane Doe (support lead)
license: CC-BY-4.0
created: 2026-09-01
updated: 2026-10-02
contact: https://github.com/SantiagoLlag/eval-anatomy/issues

purpose:
  question: Does the assistant answer without stating policies that are not in the official policy?
  decision: Whether a new prompt version can ship.
  construct: A response "invents a policy" if it states a rule, deadline, fee or exception not present in the policy text.
  out_of_scope: [tone, response length]
  origin_failures: ["3 production transcripts where the assistant promised price matching (Sept 2026)"]

taxonomy:
  origin: product-eval
  purpose: regression
  moment: offline
  structure: single-turn
  grader: [code, llm-judge]
  judgment: pointwise-reference
  inputs_origin: [real, adversarial]
  dimension: [correctness, safety]
  system_type: [chat]

system:
  description: Support assistant with the policy pasted into the system prompt.
  model: provider/model-name
  prompt: prompts/support-v2.txt
  params: { temperature: 0 }

cases:
  count: 40
  file: cases.jsonl
  source: [real, adversarial]
  collected: 2026-09
  tags: [typical, edge, adversarial]

reference:
  kind: golden-answer
  produced_by: human
  visible_to_system: false

criteria:
  - id: C1
    question: Does it state only policies that appear in the policy text?
    grader: judge-policy
    pass_example: "Returns are accepted within 30 days with a receipt."
    fail_example: "Yes, we match prices plus 10%."
    gate: true
  - id: C2
    question: If the question is not covered, does it say so and offer a human handoff?
    grader: handoff-check
    pass_example: "Our policy does not cover that; let me hand you to a person."
    fail_example: "Sure, we can do that."

graders:
  - id: handoff-check
    kind: code
    script: scripts/handoff_check.py
  - id: judge-policy
    kind: llm-judge
    model: provider/judge-model
    prompt: prompts/judge-policy.txt
    same_model_as_system: false
    output_format: reason-then-verdict

verdict:
  scale: binary-na-unknown
  na_rule: C2 is NA when the question is covered by the policy.

trials: { k: 5, metric: "pass^k" }

aggregation:
  method: pass-rate
  uncertainty: standard-error
  breakdown: [criterion, case-tag]

threshold:
  overall: 0.95
  gates: [C1]
  rationale: One invented policy can create a legal obligation.

baseline:
  kind: previous-version
  description: support-v1 on the same 40 cases

validation:
  judge_vs_human: { n: 100, tpr: 0.90, tnr: 0.95, split: true, date: 2026-09-20 }

run: { frequency: every-change, command: "npx promptfoo eval -c promptfoo.yaml", ci: true }

history:
  - { version: 1.2.0, date: 2026-10-02, change: Added C2 after 3 real handoff failures. }

limitations: [English questions only, does not check tone]
sensitive_data: none
maintenance: { review_every: 4 weeks, retire_when: "pass rate ≥ 99% for 8 consecutive weeks" }
---

## How to run it
...
```

## Rules of thumb

- One criterion = one failure mode, written as a yes/no question, with a pass and a fail example.
- Prefer code graders; use an LLM judge only where code falls short, and report how it agrees with a human (TPR/TNR).
- The reference goes to the grader only, never to the system under test.
- Say where your cases came from and when.
- Every rule the linter applies is listed with its sources in `content/best-practices.json`.
