import { z } from "zod";
import { jsonCompletion, MODELS } from "@/lib/server/groq";
import { ASK_SYSTEM } from "@/lib/server/prompts";
import { rateLimited } from "@/lib/server/rate-limit";
import { errorResponse, payloadTooLarge, tooLarge, tooMany } from "@/lib/server/respond";
import { quoteIsGrounded, truncate } from "@/lib/text";
import type { AskPoint, AskStance } from "@/lib/types";

export const maxDuration = 60;

const Input = z.object({
  question: z.string().trim().min(3).max(300),
  reviews: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        rating: z.number().min(0).max(5).nullable(),
        title: z.string().max(300).optional(),
        text: z.string().min(1).max(4000),
      }),
    )
    .max(30),
});

const Output = z.object({
  answer: z.string().catch(""),
  stance: z.enum(["yes", "no", "mixed", "not_mentioned"]).catch("mixed"),
  points: z
    .array(
      z.object({
        claim: z.string(),
        reviewIds: z.array(z.coerce.string()).catch([]),
        quote: z.string().nullable().optional(),
      }),
    )
    .catch([]),
});

const NOT_MENTIONED = "None of the reviews we searched clearly answer this. Try asking it a different way.";

export async function POST(request: Request) {
  if (rateLimited(request)) return tooMany();
  if (tooLarge(request)) return payloadTooLarge();
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });
  const { question, reviews } = parsed.data;
  if (!reviews.length) {
    return Response.json({ answer: NOT_MENTIONED, stance: "not_mentioned", points: [] });
  }
  const byId = new Map(reviews.map((r) => [r.id, r]));

  try {
    const out = await jsonCompletion({
      model: MODELS.reason,
      system: ASK_SYSTEM,
      user: `Question: """${question}"""\n\nReviews:\n${JSON.stringify(
        reviews.map((r) => ({ id: r.id, rating: r.rating, title: r.title, text: truncate(r.text, 1200) })),
      )}`,
      schema: Output,
      maxTokens: 1200,
    });

    const points: AskPoint[] = [];
    for (const p of out.points.slice(0, 4)) {
      const ids = [...new Set(p.reviewIds)].filter((id) => byId.has(id));
      if (!ids.length || !p.claim.trim()) continue;
      const quote =
        p.quote && ids.some((id) => quoteIsGrounded(p.quote as string, `${byId.get(id)!.title ?? ""}\n${byId.get(id)!.text}`))
          ? p.quote.trim()
          : null;
      points.push({ claim: p.claim.trim().slice(0, 220), reviewIds: ids, quote });
    }

    let stance: AskStance = out.stance;
    let answer = out.answer.trim().slice(0, 400);
    if (!points.length || stance === "not_mentioned") {
      stance = "not_mentioned";
      answer = answer && out.stance === "not_mentioned" ? answer : NOT_MENTIONED;
      points.length = 0;
    }
    return Response.json({ answer, stance, points });
  } catch (e) {
    return errorResponse(e);
  }
}
