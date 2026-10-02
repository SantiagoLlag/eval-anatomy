# eval-anatomy — instructions for Claude sessions

Public repo: a visualizer and catalog of AI evals. Read `docs/ARCHITECTURE.md` before any change; it is the spec. Your work package is in `docs/tasks/Tn.md` (the issue that launched you names it).

## Hard rules
- `content/*.json` is generated from a private research vault by `scripts/generate_content.py`. Never edit it by hand. If content is wrong or missing, say so in the PR description; do not invent research.
- `schema/eval.schema.json` is the public contract. Do not change it without being asked; if your task needs a change, propose it in the PR description.
- Do not invent tool field names. Use `content/tools.json` and the fixtures in `research/fixtures/`.
- `docs/reference/agents-visualizer/` is read-only prior art. Copy patterns; do not import from it; exclude it from tsconfig, lint and tests.
- Next.js: read `node_modules/next/dist/docs/` for the installed version before writing routing, data-fetching or config code.
- Default LLM model id: `claude-sonnet-5-5` (overridable by `EVAL_ANATOMY_MODEL`). API keys only from env or a per-request header; never store, log or echo a key.
- No secrets, no analytics, no telemetry.

## Conventions
- TypeScript strict. zod for runtime validation. Pure functions in `src/lib/`, React in `src/components/` and `src/app/`.
- Bilingual UI (es default, en). Strings in `messages/{es,en}.json`. Research text from `content/*.json` (`{es, en}`).
- Spanish copy: short sentences, define technical terms on first use, no vague praise words ("intuitivo", "robusto", "profesional").
- Tests with vitest next to the code (`*.test.ts`). Every importer, coverage rule, flow-graph builder and deterministic lint rule has tests.
- Accessibility: keyboard-navigable diagrams, status never only by colour, WCAG AA, works at 375 px.
- Before opening a PR: `npm run lint && npm test && npm run validate:catalog && npm run build` must pass.

## PRs
- One PR per work package, branch `tN-short-name`, title `TN: <summary>`.
- PR description: what was done, what was not, deviations from the spec and why, screenshots for UI work.
