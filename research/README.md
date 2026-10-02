# Research artifacts

`fixtures/` holds one example eval — "the support assistant of Example Store must not invent policies" — written in the
native format of each tool studied (promptfoo, Inspect AI, OpenAI Evals registry and API, lm-evaluation-harness, DeepEval,
Braintrust, ElevenLabs agent tests). Each file has a comment with the documentation URL it follows. All of them parse;
field names were checked against the official docs on 2026-10-02. They are importer test fixtures.

Note: the OpenAI Evals platform goes read-only on 2026-10-31 and shuts down on 2026-11-30 (OpenAI recommends promptfoo).

These files are generated copies; the source is the private research vault (see `scripts/generate_content.py`).
