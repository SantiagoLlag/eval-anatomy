import { describe, expect, it } from "vitest";
import {
  firstUrl,
  loadAnatomy,
  loadBestPractices,
  loadSources,
  loadTaxonomy,
  loadTools,
  sourceById,
  t,
} from "./content";

describe("content loaders", () => {
  const sources = loadSources();

  it("parses every content file", () => {
    expect(loadAnatomy().parts).toHaveLength(16);
    expect(loadAnatomy().groups).toHaveLength(5);
    expect(loadTaxonomy().axes.length).toBeGreaterThan(0);
    expect(loadBestPractices().rules.length).toBeGreaterThan(0);
    expect(loadTools().tools.length).toBeGreaterThan(0);
    expect(Object.keys(sources.sources).length).toBeGreaterThan(0);
  });

  it("resolves every cited source id", () => {
    const ids = new Set<string>();
    for (const p of loadAnatomy().parts) p.sources.forEach((s) => ids.add(s));
    for (const a of loadTaxonomy().axes) a.sources.forEach((s) => ids.add(s));
    for (const r of loadBestPractices().rules) r.sources.forEach((s) => ids.add(s));
    for (const tool of loadTools().tools) ids.add(tool.source);
    loadTools().openaiNote.sources.forEach((s) => ids.add(s));
    for (const id of ids) expect(() => sourceById(sources, id), id).not.toThrow();
  });

  it("t() picks the locale", () => {
    expect(t({ es: "hola", en: "hello" }, "es")).toBe("hola");
    expect(t({ es: "hola", en: "hello" }, "en")).toBe("hello");
  });

  it("firstUrl extracts the first link", () => {
    expect(firstUrl({ url: "https://a.org/x (respuesta) y https://b.org" })).toBe("https://a.org/x");
    expect(firstUrl({ url: "sin enlace" })).toBeNull();
  });
});
