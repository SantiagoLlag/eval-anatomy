import "server-only";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

// Prefers a direct Anthropic key; falls back to the AI Gateway model string
// (needs AI_GATEWAY_API_KEY, or nothing when deployed on Vercel).
const MODEL_ID = process.env.STUDIO_LLM_MODEL ?? "claude-sonnet-5";

export function studioModel(): LanguageModel {
  if (process.env.ANTHROPIC_API_KEY) return anthropic(MODEL_ID);
  return `anthropic/${MODEL_ID}`;
}

export function llmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL);
}

export const llmModelLabel = MODEL_ID;
