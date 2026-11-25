import "server-only";
import Groq from "groq-sdk";
import type { z } from "zod";

let client: Groq | null = null;

export class MissingKeyError extends Error {}

function getClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new MissingKeyError("GROQ_API_KEY is not set");
  if (!client) client = new Groq({ apiKey, maxRetries: 3, timeout: 60_000 });
  return client;
}

export const MODELS = {
  extract: process.env.GROQ_EXTRACT_MODEL ?? "openai/gpt-oss-20b",
  reason: process.env.GROQ_REASON_MODEL ?? "openai/gpt-oss-120b",
};

export function repairJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {}
  const fixed = raw
    .trim()
    .replace(/^```(?:json)?\s*|\s*```$/g, "")
    .replace(/,\s*"\s*([}\]])/g, "$1")
    .replace(/"\s*,\s*"\s*([}\]])/g, '"$1')
    .replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(fixed);
}

function failedGeneration(e: unknown): string | null {
  if (!e || typeof e !== "object" || !("status" in e) || e.status !== 400) return null;
  const err = (e as { error?: { error?: { code?: string; failed_generation?: string }; code?: string; failed_generation?: string } }).error;
  const inner = err?.error ?? err;
  return inner?.code === "json_validate_failed" && typeof inner.failed_generation === "string" ? inner.failed_generation : null;
}

export async function jsonCompletion<T>(opts: {
  model: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<T> {
  const groq = getClient();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: string;
    try {
      const res = await groq.chat.completions.create({
        model: opts.model,
        temperature: attempt === 0 ? 0 : 0.3,
        max_tokens: opts.maxTokens ?? 4096,
        response_format: { type: "json_object" },
        ...(opts.model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" as const, include_reasoning: false } : {}),
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      });
      raw = res.choices[0]?.message?.content ?? "";
    } catch (e) {
      const salvage = failedGeneration(e);
      if (salvage == null) throw e;
      raw = salvage;
      lastError = e;
    }
    try {
      const parsed = opts.schema.safeParse(repairJson(raw));
      if (parsed.success) return parsed.data;
      lastError = parsed.error;
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(`Model returned invalid JSON: ${String(lastError).slice(0, 300)}`);
}
