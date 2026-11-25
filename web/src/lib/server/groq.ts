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
    const res = await groq.chat.completions.create({
      model: opts.model,
      temperature: 0,
      max_tokens: opts.maxTokens ?? 4096,
      response_format: { type: "json_object" },
      ...(opts.model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" as const, include_reasoning: false } : {}),
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    });
    const raw = res.choices[0]?.message?.content ?? "";
    try {
      const parsed = opts.schema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
      lastError = parsed.error;
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(`Model returned invalid JSON: ${String(lastError).slice(0, 300)}`);
}
