import type { Review } from "./types";
import { normalize, tokens } from "./text";

const STOP = new Set(
  "a an and are as at be but by can do does did for from has have how i if in into is it its it's me my no not of on or so that the their them then there these they this to too was we were what when where which who why will with would you your yours".split(
    " ",
  ),
);

export function stem(word: string): string {
  if (word.length <= 4) return word;
  for (const suffix of ["ingly", "edly", "ing", "ness", "ed", "ly", "es", "s"]) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) return word.slice(0, -suffix.length);
  }
  return word;
}

function terms(text: string): string[] {
  return tokens(text)
    .filter((t) => !STOP.has(t))
    .map(stem);
}

export type SearchIndex = {
  docs: { review: Review; tf: Map<string, number>; len: number; norm: string }[];
  df: Map<string, number>;
  avgLen: number;
};

export function buildIndex(reviews: Review[]): SearchIndex {
  const df = new Map<string, number>();
  const docs = reviews.map((review) => {
    const full = `${review.title ?? ""} ${review.text}`;
    const list = terms(full);
    const tf = new Map<string, number>();
    for (const t of list) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return { review, tf, len: list.length, norm: normalize(full) };
  });
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / (docs.length || 1);
  return { docs, df, avgLen };
}

export function search(index: SearchIndex, query: string, extraTerms: string[] = [], k = 25): Review[] {
  const queryTerms = new Set([...terms(query), ...extraTerms.flatMap((t) => terms(t))]);
  const phrases = extraTerms.map((t) => normalize(t)).filter((t) => t.includes(" "));
  const n = index.docs.length;
  const k1 = 1.2;
  const b = 0.75;
  const scored = index.docs.map((d) => {
    let score = 0;
    for (const t of queryTerms) {
      const f = d.tf.get(t);
      if (!f) continue;
      const df = index.df.get(t) ?? 0;
      const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
      score += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / (index.avgLen || 1)));
    }
    for (const p of phrases) if (d.norm.includes(p)) score += 2;
    return { review: d.review, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.review);
}
