import { z } from "zod";
import { jsonCompletion, MODELS } from "@/lib/server/groq";
import { CHECKLIST_SYSTEM } from "@/lib/server/prompts";
import { rateLimited } from "@/lib/server/rate-limit";
import { errorResponse, payloadTooLarge, tooLarge, tooMany } from "@/lib/server/respond";
import type { ChecklistItem } from "@/lib/types";

export const maxDuration = 60;

const Input = z.object({
  problems: z
    .array(
      z.object({
        id: z.string().max(64),
        name: z.string().max(80),
        description: z.string().max(300),
        severity: z.enum(["minor", "major", "critical"]),
        timeframes: z.array(z.string().max(60)).max(6),
        examples: z.array(z.string().max(300)).max(3),
      }),
    )
    .min(1)
    .max(8),
});

const WHEN = ["Day 1", "First week", "First month"] as const;

const Output = z.object({
  items: z.array(
    z.object({
      id: z.coerce.string(),
      when: z.enum(WHEN).catch("First week"),
      action: z.string(),
      why: z.string().catch(""),
    }),
  ),
});

export async function POST(request: Request) {
  if (rateLimited(request)) return tooMany();
  if (tooLarge(request)) return payloadTooLarge();
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });
  const ids = new Set(parsed.data.problems.map((p) => p.id));

  try {
    const out = await jsonCompletion({
      model: MODELS.reason,
      system: CHECKLIST_SYSTEM,
      user: `Problems reported by buyers:\n${JSON.stringify(parsed.data.problems)}`,
      schema: Output,
      maxTokens: 1500,
    });
    const used = new Set<string>();
    const items: ChecklistItem[] = [];
    for (const it of out.items) {
      if (!ids.has(it.id) || used.has(it.id) || !it.action.trim()) continue;
      used.add(it.id);
      items.push({
        dealbreakerId: it.id,
        when: it.when,
        action: it.action.trim().slice(0, 200),
        why: it.why.trim().slice(0, 160),
      });
      if (items.length >= 6) break;
    }
    items.sort((a, b) => WHEN.indexOf(a.when) - WHEN.indexOf(b.when));
    return Response.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}
