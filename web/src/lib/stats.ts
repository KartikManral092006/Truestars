import type { PatternFlag, Review } from "./types";
import { tokens } from "./text";

export function ratingHistogram(reviews: Review[]): number[] {
  const h = [0, 0, 0, 0, 0];
  for (const r of reviews) {
    if (r.rating == null) continue;
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    h[star - 1]++;
  }
  return h;
}

export function averageRating(reviews: Review[]): number | null {
  const rated = reviews.filter((r) => r.rating != null);
  if (!rated.length) return null;
  return rated.reduce((s, r) => s + (r.rating as number), 0) / rated.length;
}

function dayKey(date?: string): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function monthlyTimeline(reviews: Review[]): { month: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of reviews) {
    const k = dayKey(r.date);
    if (!k) continue;
    const m = k.slice(0, 7);
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));
}

function formatDay(day: string): string {
  return new Date(day + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function detectBursts(reviews: Review[]): PatternFlag[] {
  const byDay = new Map<string, Review[]>();
  let dated = 0;
  for (const r of reviews) {
    const k = dayKey(r.date);
    if (!k) continue;
    dated++;
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(r);
  }
  if (dated < 15) return [];
  const flags: PatternFlag[] = [];
  for (const [day, list] of byDay) {
    const five = list.filter((r) => r.rating != null && r.rating >= 5).length;
    if (list.length >= 5 && list.length / dated >= 0.12 && five / list.length >= 0.8) {
      flags.push({
        kind: "burst",
        level: "warning",
        title: `Burst of 5★ reviews on ${formatDay(day)}`,
        detail: `${list.length} reviews (${Math.round((list.length / dated) * 100)}% of all dated reviews) were posted on a single day, and ${five} of them are 5★. Organic reviews usually arrive spread out over time.`,
        reviewIds: list.map((r) => r.id),
      });
    }
  }
  return flags;
}

function shingles(words: string[], n: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(" "));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

function detectDuplicates(reviews: Review[]): PatternFlag[] {
  const items = reviews
    .map((r) => ({ r, w: tokens(r.text) }))
    .filter((x) => x.w.length >= 8)
    .slice(0, 600)
    .map((x) => ({ r: x.r, s: shingles(x.w, 3) }));
  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (jaccard(items[i].s, items[j].s) >= 0.5) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, Review[]>();
  items.forEach((x, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(x.r);
  });
  const clusters = [...groups.values()].filter((g) => g.length >= 2);
  if (!clusters.length) return [];
  const ids = clusters.flat().map((r) => r.id);
  return [
    {
      kind: "duplicates",
      level: "warning",
      title: `${ids.length} reviews reuse near-identical wording`,
      detail: `Found ${clusters.length} group${clusters.length > 1 ? "s" : ""} of reviews that share most of their sentences. Copy-paste reviews are a common sign of coordinated or templated reviewing.`,
      reviewIds: ids,
    },
  ];
}

export const INCENTIVE =
  /(in exchange for (an?|my) (honest|unbiased|fair)? ?review|received (this|the|a) (product|item|sample) (for free|free|at a discount|at a discounted)|free (product|sample) (for|in return)|discount(ed)? in exchange|vine (voice|customer review)|#ad\b|\b(gifted|sponsored) (product|item|review)|\bgot (this|it) for free)/i;

function detectIncentivized(reviews: Review[]): PatternFlag[] {
  const hits = reviews.filter((r) => INCENTIVE.test(`${r.title ?? ""} ${r.text}`));
  if (!hits.length) return [];
  return [
    {
      kind: "incentivized",
      level: hits.length / reviews.length >= 0.05 ? "warning" : "info",
      title: `${hits.length} review${hits.length > 1 ? "s" : ""} say the product was free or discounted`,
      detail: "These reviewers disclose that they received the product for free or at a discount. Incentivised reviews tend to be more positive than paid-for ones, so weigh them less.",
      reviewIds: hits.map((r) => r.id),
    },
  ];
}

function detectLowInfo(reviews: Review[]): PatternFlag[] {
  const five = reviews.filter((r) => r.rating != null && r.rating >= 5);
  if (five.length < 8) return [];
  const thin = five.filter((r) => tokens(r.text).length <= 4);
  if (thin.length / five.length < 0.3) return [];
  return [
    {
      kind: "low-info",
      level: "info",
      title: `${Math.round((thin.length / five.length) * 100)}% of 5★ reviews say almost nothing`,
      detail: `${thin.length} five-star reviews are four words or fewer ("Good", "Nice product"). They raise the average without telling you anything, so the detailed reviews below matter more.`,
      reviewIds: thin.map((r) => r.id),
    },
  ];
}

function detectPolarized(hist: number[], total: number): PatternFlag[] {
  if (total < 20) return [];
  const one = hist[0] / total;
  const five = hist[4] / total;
  if (one < 0.15 || five < 0.45) return [];
  return [
    {
      kind: "polarized",
      level: "info",
      title: "Love-it-or-hate-it ratings",
      detail: `${Math.round(five * 100)}% gave 5★ but ${Math.round(one * 100)}% gave 1★, with little in between. This pattern often points to inconsistent quality: some units are fine, others fail.`,
      reviewIds: [],
    },
  ];
}

function detectUnverified(reviews: Review[]): PatternFlag[] {
  const known = reviews.filter((r) => r.verified !== undefined && r.rating != null);
  if (known.length < 15 || known.length < reviews.length * 0.5) return [];
  const pos = known.filter((r) => (r.rating as number) >= 5);
  const neg = known.filter((r) => (r.rating as number) <= 2);
  if (pos.length < 5) return [];
  const posUnverified = pos.filter((r) => !r.verified);
  const posShare = posUnverified.length / pos.length;
  const negShare = neg.length ? neg.filter((r) => !r.verified).length / neg.length : 0;
  if (posShare < 0.3 || posShare < negShare * 2) return [];
  return [
    {
      kind: "unverified",
      level: "warning",
      title: `${Math.round(posShare * 100)}% of 5★ reviews are not verified purchases`,
      detail: `Among 1–2★ reviews the unverified share is ${Math.round(negShare * 100)}%. Praise coming mostly from people with no confirmed purchase is a warning sign.`,
      reviewIds: posUnverified.map((r) => r.id),
    },
  ];
}

export function detectPatterns(reviews: Review[]): PatternFlag[] {
  const hist = ratingHistogram(reviews);
  const total = hist.reduce((a, b) => a + b, 0);
  return [
    ...detectBursts(reviews),
    ...detectDuplicates(reviews),
    ...detectUnverified(reviews),
    ...detectIncentivized(reviews),
    ...detectPolarized(hist, total),
    ...detectLowInfo(reviews),
  ];
}
