import type { Review } from "./types";

const RATING_PATTERNS: RegExp[] = [
  /^\s*(?:rating\s*[:=-]?\s*)?([1-5](?:\.\d)?)\s*(?:\/\s*5|out of 5|stars?|★)\s*[-:.|]?\s*/i,
  /^\s*([★☆]{5})\s*[-:.|]?\s*/,
  /^\s*(★{1,5})(?!★)\s*[-:.|]?\s*/,
];

function readRating(block: string): { rating: number | null; rest: string } {
  for (const re of RATING_PATTERNS) {
    const m = block.match(re);
    if (!m) continue;
    const token = m[1];
    const rating = /^[★☆]+$/.test(token) ? [...token].filter((c) => c === "★").length : Number(token);
    if (rating >= 1 && rating <= 5) return { rating, rest: block.slice(m[0].length).trim() };
  }
  return { rating: null, rest: block.trim() };
}

function fromJson(input: string): Review[] | null {
  try {
    const data = JSON.parse(input);
    const list = Array.isArray(data) ? data : Array.isArray(data?.reviews) ? data.reviews : null;
    if (!list) return null;
    return list
      .map((r: Record<string, unknown>, i: number): Review => ({
        id: String(r.id ?? `r${i + 1}`),
        rating: r.rating == null ? null : Number(r.rating),
        title: typeof r.title === "string" ? r.title : undefined,
        text: String(r.text ?? r.body ?? r.review ?? r.content ?? ""),
        date: typeof r.date === "string" ? r.date : undefined,
        verified: typeof r.verified === "boolean" ? r.verified : undefined,
      }))
      .filter((r: Review) => r.text.trim().length > 0);
  } catch {
    return null;
  }
}

export function parsePastedReviews(input: string): Review[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const json = fromJson(trimmed);
    if (json) return json;
  }
  return trimmed
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      const { rating, rest } = readRating(block);
      return { id: `r${i + 1}`, rating, text: rest };
    })
    .filter((r) => r.text.length > 0);
}
