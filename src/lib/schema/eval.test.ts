import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { EvalCard } from "./eval";

type Json = Record<string, unknown>;
type KeyTree = { [key: string]: KeyTree };

const jsonSchema = JSON.parse(
  readFileSync(new URL("../../../schema/eval.schema.json", import.meta.url), "utf8"),
) as Json;

/** Key tree of a JSON Schema node: property names, descending through arrays and oneOf. */
function schemaKeys(node: Json): KeyTree {
  const out: KeyTree = {};
  const merge = (tree: KeyTree) => {
    for (const [k, v] of Object.entries(tree)) out[k] = { ...(out[k] ?? {}), ...v };
  };
  const props = node.properties as Record<string, Json> | undefined;
  if (props) for (const [k, v] of Object.entries(props)) out[k] = schemaKeys(v);
  if (node.items) merge(schemaKeys(node.items as Json));
  if (Array.isArray(node.oneOf)) for (const o of node.oneOf) merge(schemaKeys(o as Json));
  return out;
}

/** Same walk over a zod schema. */
function zodKeys(schema: z.ZodType): KeyTree {
  const out: KeyTree = {};
  const merge = (tree: KeyTree) => {
    for (const [k, v] of Object.entries(tree)) out[k] = { ...(out[k] ?? {}), ...v };
  };
  const def = (schema as unknown as { def: Record<string, unknown> }).def;
  if (schema instanceof z.ZodObject) {
    for (const [k, v] of Object.entries(schema.shape)) out[k] = zodKeys(v as z.ZodType);
  } else if (schema instanceof z.ZodArray) {
    merge(zodKeys(schema.element as z.ZodType));
  } else if (schema instanceof z.ZodUnion) {
    for (const o of schema.options) merge(zodKeys(o as z.ZodType));
  } else if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    merge(zodKeys(schema.unwrap() as z.ZodType));
  } else if (def.innerType) {
    merge(zodKeys(def.innerType as z.ZodType));
  }
  return out;
}

describe("EvalCard mirrors schema/eval.schema.json", () => {
  it("has the same property names at every depth", () => {
    expect(zodKeys(EvalCard)).toEqual(schemaKeys(jsonSchema));
  });

  it("requires exactly the schema's required top-level fields", () => {
    const required = (jsonSchema.required as string[]).sort();
    const zodRequired = Object.entries(EvalCard.shape)
      .filter(([, v]) => !(v instanceof z.ZodOptional))
      .map(([k]) => k)
      .sort();
    expect(zodRequired).toEqual(required);
  });

  it("detects drift (sanity check of the walker)", () => {
    const smaller = EvalCard.omit({ owner: true });
    expect(zodKeys(smaller)).not.toEqual(schemaKeys(jsonSchema));
  });

  const minimal = {
    schema: "eval-anatomy/v1",
    id: "demo-eval",
    name: "Demo",
    version: "0.1.0",
    language: "es",
    summary: "Una frase.",
    authors: [{ name: "A" }],
    created: "2026-10-01",
  };

  it("accepts a minimal card and rejects unknown keys", () => {
    expect(EvalCard.safeParse(minimal).success).toBe(true);
    expect(EvalCard.safeParse({ ...minimal, surprise: 1 }).success).toBe(false);
    expect(EvalCard.safeParse({ ...minimal, purpose: { nope: 1 } }).success).toBe(false);
  });

  it("rejects bad identity fields", () => {
    expect(EvalCard.safeParse({ ...minimal, id: "Bad Id" }).success).toBe(false);
    expect(EvalCard.safeParse({ ...minimal, version: "1" }).success).toBe(false);
    expect(EvalCard.safeParse({ ...minimal, created: "yesterday" }).success).toBe(false);
  });
});
