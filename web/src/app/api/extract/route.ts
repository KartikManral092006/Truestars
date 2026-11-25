import { z } from "zod";
import { jsonCompletion, MODELS } from "@/lib/server/groq";
import { EXTRACT_SYSTEM } from "@/lib/server/prompts";
import { rateLimited } from "@/lib/server/rate-limit";
import { errorResponse, payloadTooLarge, tooLarge, tooMany } from "@/lib/server/respond";
import { cleanLabel, quoteIsGrounded, truncate } from "@/lib/text";
import type { ExtractedReview } from "@/lib/types";

export const maxDuration = 60;

const Input = z.object({
  reviews: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        rating: z.number().min(0).max(5).nullable(),
        title: z.string().max(300).optional(),
        text: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(25),
});

const Severity = z.enum(["minor", "major", "critical"]).catch("major");

const Output = z.object({
  reviews: z.array(
    z.object({
      id: z.coerce.string(),
      problems: z
        .array(
          z.object({
            label: z.string(),
            quote: z.string().nullable().optional(),
            severity: Severity,
            timeframe: z.string().nullable().optional(),
          }),
        )
        .catch([]),
      praises: z.array(z.string()).catch([]),
    }),
  ),
});

export async function POST(request: Request) {
  if (rateLimited(request)) return tooMany();
  if (tooLarge(request)) return payloadTooLarge();
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const byId = new Map(parsed.data.reviews.map((r) => [r.id, r]));
  const payload = parsed.data.reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title ? truncate(r.title, 150) : undefined,
    text: truncate(r.text, 900),
  }));

  try {
    const out = await jsonCompletion({
      model: MODELS.extract,
      system: EXTRACT_SYSTEM,
      user: `Reviews:\n${JSON.stringify(payload)}`,
      schema: Output,
      maxTokens: 6000,
    });

    const seen = new Set<string>();
    const reviews: ExtractedReview[] = [];
    const quality = { proposed: 0, grounded: 0 };
    for (const item of out.reviews) {
      const source = byId.get(item.id);
      if (!source || seen.has(item.id)) continue;
      seen.add(item.id);
      const fullText = `${source.title ?? ""}\n${source.text}`;
      const problems = item.problems
        .map((p) => {
          const proposed = !!p.quote?.trim();
          const grounded = proposed && quoteIsGrounded(p.quote as string, fullText);
          if (proposed) quality.proposed++;
          if (grounded) quality.grounded++;
          return {
            label: cleanLabel(p.label),
            quote: grounded ? (p.quote as string).trim() : null,
            severity: p.severity,
            timeframe: p.timeframe?.trim() || null,
          };
        })
        .filter((p) => p.label.length > 1 && p.label.length <= 60)
        .slice(0, 6);
      reviews.push({
        id: item.id,
        problems,
        praises: item.praises.map(cleanLabel).filter((l) => l.length > 1 && l.length <= 60).slice(0, 3),
      });
    }
    return Response.json({ reviews, quality, model: MODELS.extract });
  } catch (e) {
    return errorResponse(e);
  }
}
