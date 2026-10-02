import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GRADER_KINDS, GROUP_IDS } from "./tokens";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1], m[2]]));
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each([
  ["light", ":root"],
  ["dark", ".dark"],
])("design tokens (%s)", (_name, selector) => {
  const t = block(selector);
  const names = [
    ...GROUP_IDS.map((g) => `group-${g}`),
    ...GRADER_KINDS.map((k) => `grader-${k}`),
  ];
  it("defines every group and grader token", () => {
    for (const n of names) expect(t[n], n).toBeDefined();
  });
  it.each(names)("%s has AA contrast on the background", (n) => {
    expect(contrast(t[n], t.background)).toBeGreaterThanOrEqual(4.5);
  });
  it("text and muted text have AA contrast", () => {
    expect(contrast(t.foreground, t.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["muted-foreground"], t.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["muted-foreground"], t.muted)).toBeGreaterThanOrEqual(4.5);
  });
});
