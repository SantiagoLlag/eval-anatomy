import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

export type Locale = "es" | "en";

const bilingual = <T extends z.ZodType>(inner: T) => z.object({ es: inner, en: inner });
const Text = bilingual(z.string());
const TextList = bilingual(z.array(z.string()));
export type Bilingual<T = string> = { es: T; en: T };

/** Picks the text for a locale. */
export function t<T>(value: Bilingual<T>, locale: Locale): T {
  return value[locale];
}

// --- anatomy.json ---
const AnatomyGroup = z.object({ id: z.string(), name: Text, question: Text });
const AnatomyPart = z.object({
  id: z.string(),
  group: z.string(),
  level: z.enum(["required", "recommended", "conditional"]),
  levelNote: Text.nullable(),
  condition: Text.nullable(),
  name: Text,
  oneLine: Text,
  explanation: Text,
  whyItMatters: Text,
  bestPractices: TextList,
  commonMistakes: TextList,
  example: Text,
  synonyms: z.array(z.string()),
  sources: z.array(z.string()),
});
export const AnatomyFile = z.object({
  version: z.string(),
  runningExample: Text,
  groups: z.array(AnatomyGroup),
  parts: z.array(AnatomyPart),
  relations: z.array(
    z.object({ from: z.string(), to: z.string(), kind: z.enum(["flow", "control", "defines"]), label: Text }),
  ),
  decision: z.object({ name: Text, oneLine: Text }),
});
export type Anatomy = z.infer<typeof AnatomyFile>;

// --- taxonomy.json ---
export const TaxonomyFile = z.object({
  version: z.string(),
  axes: z.array(
    z.object({
      id: z.string(),
      filter: z.boolean(),
      multiple: z.boolean(),
      name: Text,
      note: Text.nullable(),
      values: z.array(
        z.object({ id: z.string(), label: Text, definition: Text.nullable(), note: Text.nullable() }),
      ),
      sources: z.array(z.string()),
    }),
  ),
  constraints: z.array(
    z.object({
      si: z.record(z.string(), z.unknown()),
      entonces: z.record(z.string(), z.unknown()).optional(),
      nota: z.string().optional(),
      fichas: z.array(z.string()),
      requiere_partes: z.array(z.string()).optional(),
      umbral_tipico: z.string().optional(),
    }),
  ),
});
export type Taxonomy = z.infer<typeof TaxonomyFile>;

// --- best-practices.json ---
export const BestPracticesFile = z.object({
  version: z.string(),
  note: z.string(),
  rules: z.array(
    z.object({
      id: z.string(),
      part: z.string(),
      severity: z.enum(["error", "warn", "info"]),
      detection: z.enum(["deterministic", "llm-judge", "human", "requires-run"]),
      check: z.string(),
      appliesIf: z.record(z.string(), z.unknown()),
      statement: Text,
      rationale: Text,
      sources: z.array(z.string()),
    }),
  ),
});
export type BestPractices = z.infer<typeof BestPracticesFile>;

// --- tools.json ---
export const ToolsFile = z.object({
  version: z.string(),
  openaiNote: z.object({ es: z.string(), en: z.string(), sources: z.array(z.string()) }),
  tools: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      format: z.enum(["declarative", "code"]),
      source: z.string(),
      fixture: z.string().nullable(),
      deprecatedOn: z.string().nullable(),
      detection: z.object({ strong: z.array(z.string()), weak: z.array(z.string()) }),
      fields: z.record(z.string(), z.string().nullable()),
      notes: Text.nullable(),
    }),
  ),
});
export type Tools = z.infer<typeof ToolsFile>;

// --- sources.json ---
const Source = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  url: z.string(),
  type: z.string(),
  evidence: z.string(),
  status: z.string(),
  lens: z.string(),
  verified: z.boolean(),
});
export const SourcesFile = z.object({ sources: z.record(z.string(), Source) });
export type Source = z.infer<typeof Source>;
export type Sources = z.infer<typeof SourcesFile>;

const contentDir = path.join(process.cwd(), "content");

function load<S extends z.ZodType>(file: string, schema: S): z.infer<S> {
  const raw = readFileSync(path.join(contentDir, file), "utf8");
  const parsed = schema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`content/${file} does not match its schema:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

export const loadAnatomy = () => load("anatomy.json", AnatomyFile);
export const loadTaxonomy = () => load("taxonomy.json", TaxonomyFile);
export const loadBestPractices = () => load("best-practices.json", BestPracticesFile);
export const loadTools = () => load("tools.json", ToolsFile);
export const loadSources = () => load("sources.json", SourcesFile);

/** Resolves a source id from any `sources[]` list; throws if it does not exist. */
export function sourceById(sources: Sources, id: string): Source {
  const s = sources.sources[id];
  if (!s) throw new Error(`Unknown source id: ${id}`);
  return s;
}

/** First http(s) URL in a source's `url` field (some entries hold several, with prose). */
export function firstUrl(source: Pick<Source, "url">): string | null {
  return source.url.match(/https?:\/\/[^\s)]+/)?.[0] ?? null;
}
