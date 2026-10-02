import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import YAML from "yaml";
import { z } from "zod";
import { EvalCard } from "./schema/eval";

export interface CatalogEntry {
  card: EvalCard;
  body: string;
  /** Folder name under catalog/ (equals card.id). */
  dir: string;
}

export const catalogRoot = () => path.join(process.cwd(), "catalog");

// YAML 1.2 core schema (the `yaml` package) keeps unquoted dates as strings, unlike gray-matter's default.
const matterOptions = { engines: { yaml: { parse: (s: string) => YAML.parse(s) as object } } };

/** Splits an eval.md into raw frontmatter data and markdown body. Throws on malformed YAML. */
export function parseEvalMarkdown(text: string): { data: unknown; body: string } {
  const { data, content } = matter(text, matterOptions);
  return { data, body: content };
}

/** Parses and zod-validates one eval.md; also checks that `id` equals its folder name. Throws with a readable message. */
export function parseCatalogEntry(dir: string, text: string): CatalogEntry {
  const { data, body } = parseEvalMarkdown(text);
  const parsed = EvalCard.safeParse(data);
  if (!parsed.success) throw new Error(z.prettifyError(parsed.error));
  if (parsed.data.id !== dir) {
    throw new Error(`id "${parsed.data.id}" must equal the folder name "${dir}"`);
  }
  return { card: parsed.data, body, dir };
}

export function catalogDirs(root = catalogRoot()): string[] {
  return readdirSync(root)
    .filter((name) => statSync(path.join(root, name)).isDirectory())
    .sort();
}

/** Reads catalog/<id>/eval.md for every folder. Throws on the first invalid entry. */
export function loadCatalog(root = catalogRoot()): CatalogEntry[] {
  return catalogDirs(root).map((dir) => {
    const file = path.join(root, dir, "eval.md");
    try {
      return parseCatalogEntry(dir, readFileSync(file, "utf8"));
    } catch (e) {
      throw new Error(`catalog/${dir}/eval.md: ${(e as Error).message}`);
    }
  });
}
