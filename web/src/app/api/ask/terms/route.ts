import { z } from "zod";
import { jsonCompletion, MODELS } from "@/lib/server/groq";
import { ASK_TERMS_SYSTEM } from "@/lib/server/prompts";
import { rateLimited } from "@/lib/server/rate-limit";
import { errorResponse, payloadTooLarge, tooLarge, tooMany } from "@/lib/server/respond";

export const maxDuration = 30;

const Input = z.object({ question: z.string().trim().min(3).max(300) });
const Output = z.object({ terms: z.array(z.string()).catch([]) });

export async function POST(request: Request) {
  if (rateLimited(request)) return tooMany();
  if (tooLarge(request)) return payloadTooLarge();
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ask a question of at least a few words." }, { status: 400 });
  try {
    const out = await jsonCompletion({
      model: MODELS.extract,
      system: ASK_TERMS_SYSTEM,
      user: `Question: """${parsed.data.question}"""`,
      schema: Output,
      maxTokens: 300,
    });
    const terms = [...new Set(out.terms.map((t) => t.toLowerCase().trim()).filter((t) => t.length > 1 && t.length < 40))].slice(0, 12);
    return Response.json({ terms });
  } catch (e) {
    return errorResponse(e);
  }
}
