import { z } from "zod";
import { jsonCompletion, MODELS } from "@/lib/server/groq";
import { FIT_SYSTEM } from "@/lib/server/prompts";
import { rateLimited } from "@/lib/server/rate-limit";
import { errorResponse, payloadTooLarge, tooLarge, tooMany } from "@/lib/server/respond";
import type { Fit } from "@/lib/types";

export const maxDuration = 60;

const Input = z.object({
  profile: z.string().trim().min(3).max(500),
  themes: z
    .array(
      z.object({
        id: z.string().max(64),
        name: z.string().max(80),
        description: z.string().max(300),
        examples: z.array(z.string().max(300)).max(3),
      }),
    )
    .min(1)
    .max(10),
});

const Output = z.object({
  fits: z.array(
    z.object({
      id: z.coerce.string(),
      relevance: z.enum(["high", "medium", "low"]).catch("medium"),
      reason: z.string().catch(""),
    }),
  ),
});

export async function POST(request: Request) {
  if (rateLimited(request)) return tooMany();
  if (tooLarge(request)) return payloadTooLarge();
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });
  const ids = new Set(parsed.data.themes.map((t) => t.id));

  try {
    const out = await jsonCompletion({
      model: MODELS.reason,
      system: FIT_SYSTEM,
      user: `Shopper says:\n"""${parsed.data.profile}"""\n\nProblems reported by other buyers:\n${JSON.stringify(parsed.data.themes)}`,
      schema: Output,
      maxTokens: 1500,
    });
    const fits: Fit[] = out.fits
      .filter((f) => ids.has(f.id))
      .map((f) => ({ id: f.id, relevance: f.relevance, reason: f.reason.trim().slice(0, 200) }));
    return Response.json({ fits });
  } catch (e) {
    return errorResponse(e);
  }
}
