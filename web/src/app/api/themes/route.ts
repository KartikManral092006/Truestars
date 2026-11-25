import { z } from "zod";
import { jsonCompletion, MODELS } from "@/lib/server/groq";
import { THEMES_SYSTEM } from "@/lib/server/prompts";
import { rateLimited } from "@/lib/server/rate-limit";
import { errorResponse, payloadTooLarge, tooLarge, tooMany } from "@/lib/server/respond";
import type { ThemeGroup } from "@/lib/types";

export const maxDuration = 60;

const LabelCount = z.object({ label: z.string().min(1).max(60), count: z.number().int().min(1) });

const Input = z.object({
  problems: z.array(LabelCount).max(400),
  praises: z.array(LabelCount).max(400),
});

const Group = z.object({
  name: z.string(),
  description: z.string().catch(""),
  labels: z.array(z.string()).catch([]),
});

const Output = z.object({
  problemThemes: z.array(Group).catch([]),
  praiseThemes: z.array(Group).catch([]),
});

function sanitize(groups: ThemeGroup[], allowed: Set<string>, max: number): ThemeGroup[] {
  const used = new Set<string>();
  const out: ThemeGroup[] = [];
  for (const g of groups) {
    const labels = g.labels.filter((l) => allowed.has(l) && !used.has(l));
    labels.forEach((l) => used.add(l));
    if (!labels.length || !g.name.trim()) continue;
    out.push({ name: g.name.trim().slice(0, 60), description: g.description.trim().slice(0, 240), labels });
    if (out.length >= max) break;
  }
  return out;
}

export async function POST(request: Request) {
  if (rateLimited(request)) return tooMany();
  if (tooLarge(request)) return payloadTooLarge();
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });
  const { problems, praises } = parsed.data;
  if (!problems.length && !praises.length) {
    return Response.json({ problemThemes: [], praiseThemes: [] });
  }

  try {
    const out = await jsonCompletion({
      model: MODELS.reason,
      system: THEMES_SYSTEM,
      user: `Problem labels with counts:\n${JSON.stringify(problems)}\n\nPraise labels with counts:\n${JSON.stringify(praises)}`,
      schema: Output,
      maxTokens: 4000,
    });
    return Response.json({
      problemThemes: sanitize(out.problemThemes, new Set(problems.map((p) => p.label)), 8),
      praiseThemes: sanitize(out.praiseThemes, new Set(praises.map((p) => p.label)), 5),
      model: MODELS.reason,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
