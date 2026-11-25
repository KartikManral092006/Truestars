import "server-only";

const WINDOW_MS = 60_000;
const LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 40);
const hits = new Map<string, number[]>();

export function rateLimited(request: Request): boolean {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}
