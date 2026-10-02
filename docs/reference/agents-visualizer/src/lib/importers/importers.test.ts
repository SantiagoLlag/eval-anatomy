import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { AgentArchitectureSchema } from "@/lib/schema/architecture";
import { buildDraft } from "./index";
import { detectFormat } from "./parsers";

const fixture = (name: string) => ({
  name,
  content: readFileSync(path.join(process.cwd(), "fixtures", name), "utf8"),
});

// No LLM key in tests — every path below must work deterministically.

describe("detectFormat", () => {
  it.each([
    ["openai-assistant.json", "openai-assistants"],
    ["elevenlabs.json", "elevenlabs"],
    ["crewai.yaml", "crewai"],
    ["langgraph.json", "langgraph"],
    ["mcp.json", "mcp-config"],
  ] as const)("%s -> %s", (file, expected) => {
    expect(detectFormat(fixture(file))).toBe(expected);
  });
});

describe("buildDraft", () => {
  it("imports an OpenAI assistant", async () => {
    const { draft } = await buildDraft([fixture("openai-assistant.json")]);
    const parsed = AgentArchitectureSchema.parse(draft);
    expect(parsed.identity.name).toBe("Research Assistant");
    expect(parsed.tools.map((t) => t.name)).toContain("web_search");
    expect(parsed.prompt.raw).toContain("research assistant");
    expect(parsed.prompt.segments.map((s) => s.text).join("")).toBe(parsed.prompt.raw);
  });

  it("imports an ElevenLabs agent with unmapped TTS kept in provenance", async () => {
    const { draft } = await buildDraft([fixture("elevenlabs.json")]);
    const parsed = AgentArchitectureSchema.parse(draft);
    expect(parsed.tools[0].name).toBe("book_appointment");
    expect(parsed.tools[0].inputs.map((i) => i.name)).toEqual(["patient_name", "slot_iso"]);
    expect(parsed.provenance.unmappedFields).toHaveProperty("tts");
  });

  it("imports a CrewAI crew as subagent chain", async () => {
    const { draft } = await buildDraft([fixture("crewai.yaml")]);
    const parsed = AgentArchitectureSchema.parse(draft);
    expect(parsed.subagents.map((s) => s.name)).toEqual(["researcher", "writer"]);
    expect(parsed.workflow.nodes.filter((n) => n.kind === "subagent")).toHaveLength(2);
    expect(parsed.workflow.nodes.some((n) => n.kind === "entry")).toBe(true);
    expect(parsed.workflow.nodes.some((n) => n.kind === "terminal")).toBe(true);
  });

  it("imports a LangGraph graph with kinds mapped", async () => {
    const { draft } = await buildDraft([fixture("langgraph.json")]);
    const parsed = AgentArchitectureSchema.parse(draft);
    const kinds = Object.fromEntries(parsed.workflow.nodes.map((n) => [n.id, n.kind]));
    expect(kinds["route"]).toBe("router");
    expect(kinds["search_kb"]).toBe("tool-call");
    expect(kinds["escalate"]).toBe("human-gate");
    expect(parsed.workflow.edges.some((e) => e.kind === "conditional")).toBe(true);
  });

  it("merges an MCP config into another import", async () => {
    const { draft } = await buildDraft([fixture("openai-assistant.json"), fixture("mcp.json")]);
    const parsed = AgentArchitectureSchema.parse(draft);
    expect(parsed.tools.filter((t) => t.source === "mcp")).toHaveLength(2);
  });

  it("survives malformed frontmatter", async () => {
    const { draft, warnings } = await buildDraft([
      { name: "broken.md", content: "---\nname: X\ndescription: has: a: colon problem\n---\nYou are X." },
    ]);
    AgentArchitectureSchema.parse(draft);
    expect(warnings.join(" ")).toMatch(/frontmatter/i);
  });
});
