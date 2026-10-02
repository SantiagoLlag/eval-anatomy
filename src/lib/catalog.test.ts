import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { catalogRoot, loadCatalog, parseCatalogEntry } from "./catalog";
import { validateCatalog } from "./catalog-validate";

const tmp: string[] = [];
function tmpCatalog(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "catalog-"));
  tmp.push(dir);
  cpSync(catalogRoot(), dir, { recursive: true });
  return dir;
}
afterEach(() => {
  while (tmp.length) rmSync(tmp.pop()!, { recursive: true, force: true });
});

const seed = readFileSync(path.join(catalogRoot(), "e05-carga-cognitiva", "eval.md"), "utf8");

describe("catalog", () => {
  it("loads the seed evals with card, body and dir", () => {
    const entries = loadCatalog();
    expect(entries.map((e) => e.dir)).toEqual(entries.map((e) => e.card.id));
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries[0].body.length).toBeGreaterThan(0);
  });

  it("keeps unquoted-looking dates as strings", () => {
    const entry = parseCatalogEntry("e05-carga-cognitiva", seed.replace('created: "2026-10-01"', "created: 2026-10-01"));
    expect(entry.card.created).toBe("2026-10-01");
  });

  it("rejects an id that differs from the folder name", () => {
    expect(() => parseCatalogEntry("other-folder", seed)).toThrow(/must equal the folder name/);
  });

  it("rejects an unknown key", () => {
    expect(() => parseCatalogEntry("e05-carga-cognitiva", seed.replace("\nowner:", "\nbogus: 1\nowner:"))).toThrow();
  });
});

describe("validateCatalog", () => {
  it("passes on the seed catalog", () => {
    expect(validateCatalog()).toEqual([]);
  });

  it("fails on a broken copy (id differs from folder)", () => {
    const root = tmpCatalog();
    cpSync(path.join(root, "e05-carga-cognitiva"), path.join(root, "broken-copy"), { recursive: true });
    const problems = validateCatalog(root);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((p) => p.dir === "broken-copy")).toBe(true);
  });

  it("fails on a schema violation reported by ajv", () => {
    const root = tmpCatalog();
    const dir = path.join(root, "bad-version");
    mkdirSync(dir);
    writeFileSync(path.join(dir, "eval.md"), seed.replace("id: e05-carga-cognitiva", "id: bad-version").replace('version: "0.1.0"', 'version: "x"'));
    const problems = validateCatalog(root);
    expect(problems.some((p) => p.message.startsWith("schema "))).toBe(true);
    expect(problems.some((p) => p.message.startsWith("zod: "))).toBe(true);
  });

  it("fails on a folder without eval.md and on broken YAML", () => {
    const root = tmpCatalog();
    mkdirSync(path.join(root, "empty-dir"));
    mkdirSync(path.join(root, "bad-yaml"));
    writeFileSync(path.join(root, "bad-yaml", "eval.md"), "---\nid: [unclosed\n---\n");
    const messages = validateCatalog(root).map((p) => `${p.dir}: ${p.message}`);
    expect(messages.some((m) => m.startsWith("empty-dir: missing"))).toBe(true);
    expect(messages.some((m) => m.startsWith("bad-yaml: frontmatter is not valid YAML"))).toBe(true);
  });
});
