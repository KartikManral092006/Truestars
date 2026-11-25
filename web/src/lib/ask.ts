import type { AskAnswer, AskPoint, AskStance, Review } from "./types";
import { buildIndex, search, type SearchIndex } from "./search";

function balanced(hits: Review[], k: number): Review[] {
  const groups: Review[][] = [[], [], []];
  for (const r of hits) {
    const g = r.rating == null ? 1 : r.rating <= 2 ? 0 : r.rating >= 4 ? 2 : 1;
    groups[g].push(r);
  }
  const out: Review[] = [];
  let i = 0;
  while (out.length < k && groups.some((g) => i < g.length)) {
    for (const g of groups) if (i < g.length && out.length < k) out.push(g[i]);
    i++;
  }
  return out;
}

const cache = new WeakMap<Review[], SearchIndex>();

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export async function askReviews(question: string, reviews: Review[]): Promise<AskAnswer> {
  let index = cache.get(reviews);
  if (!index) {
    index = buildIndex(reviews);
    cache.set(reviews, index);
  }
  let terms: string[] = [];
  try {
    terms = (await post<{ terms: string[] }>("/api/ask/terms", { question })).terms;
  } catch {
    terms = [];
  }
  const candidates = balanced(search(index, question, terms, 60), 25);
  const res = await post<{ answer: string; stance: AskStance; points: AskPoint[] }>("/api/ask", {
    question,
    reviews: candidates.map(({ id, rating, title, text }) => ({ id, rating, title, text: text.slice(0, 4000) })),
  });
  return { question, ...res, searched: reviews.length };
}
