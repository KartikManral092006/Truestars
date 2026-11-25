import "server-only";
import { MissingKeyError } from "./groq";

export function errorResponse(e: unknown): Response {
  if (e instanceof MissingKeyError) {
    return Response.json(
      { error: "The AI service is not set up on this server yet, so new reviews cannot be analysed." },
      { status: 503 },
    );
  }
  const status = typeof e === "object" && e && "status" in e && typeof e.status === "number" ? e.status : 500;
  if (status === 429) {
    return Response.json({ error: "The AI provider is rate-limiting us. Try again in a minute." }, { status: 429 });
  }
  console.error(e);
  return Response.json({ error: "Analysis failed. Please try again." }, { status: 502 });
}

export const tooMany = () =>
  Response.json({ error: "Too many requests. Slow down a little." }, { status: 429 });

const MAX_BODY_BYTES = 1_000_000;

export function tooLarge(request: Request): boolean {
  return Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES;
}

export const payloadTooLarge = () =>
  Response.json({ error: "That is too much text to analyse at once." }, { status: 413 });
