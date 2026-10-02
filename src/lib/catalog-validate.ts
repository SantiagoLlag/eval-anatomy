import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { catalogDirs, parseCatalogEntry, parseEvalMarkdown } from "./catalog";

export interface CatalogProblem {
  dir: string;
  message: string;
}

function makeValidator(schemaPath: string) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(JSON.parse(readFileSync(schemaPath, "utf8")));
}

/**
 * Validates every catalog/<id>/eval.md with the JSON Schema (ajv) and the zod EvalCard,
 * and checks that id equals the folder name. Returns all problems; empty array means valid.
 */
export function validateCatalog(
  root = path.join(process.cwd(), "catalog"),
  schemaPath = path.join(process.cwd(), "schema", "eval.schema.json"),
): CatalogProblem[] {
  const validate = makeValidator(schemaPath);
  const problems: CatalogProblem[] = [];
  for (const dir of catalogDirs(root)) {
    const file = path.join(root, dir, "eval.md");
    if (!existsSync(file)) {
      problems.push({ dir, message: "missing eval.md" });
      continue;
    }
    const text = readFileSync(file, "utf8");
    let data: unknown;
    try {
      data = parseEvalMarkdown(text).data;
    } catch (e) {
      problems.push({ dir, message: `frontmatter is not valid YAML: ${(e as Error).message}` });
      continue;
    }
    if (!validate(data)) {
      for (const err of validate.errors ?? []) {
        problems.push({ dir, message: `schema ${err.instancePath || "/"} ${err.message}` });
      }
    }
    try {
      parseCatalogEntry(dir, text);
    } catch (e) {
      problems.push({ dir, message: `zod: ${(e as Error).message}` });
    }
  }
  return problems;
}
