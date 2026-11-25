import type { ExtractedReview, Lifespan, LifespanBucket } from "./types";

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  single: 1,
  two: 2,
  couple: 2,
  three: 3,
  few: 3,
  four: 4,
  several: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const UNIT_DAYS: Record<string, number> = { hour: 1 / 24, day: 1, night: 1, week: 7, month: 30, year: 365 };

const ARRIVAL =
  /\b(on arrival|arrived|out of the box|right away|immediately|instantly|first (use|day|time|try|night)|day one|dead on arrival|doa|from the start|from day 1|never worked)\b/;

const SPAN =
  /\b(\d+(?:\.\d+)?|a|an|one|single|two|couple|three|few|four|several|five|six|seven|eight|nine|ten|eleven|twelve)(?:\s*(?:-|to)\s*\d+)?\s*(?:of\s+)?(hour|day|night|week|month|year)s?\b/;

export function timeframeToDays(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (ARRIVAL.test(s)) return 0;
  if (/\buses?\b|\btimes\b|\bwashes\b|\bcharges?\b/.test(s) && !SPAN.test(s)) return null;
  if (/\b(half a|half) year\b/.test(s)) return 182;
  const m = s.match(SPAN);
  if (!m) return null;
  const n = NUMBER_WORDS[m[1]] ?? parseFloat(m[1]);
  const unit = UNIT_DAYS[m[2]];
  if (!Number.isFinite(n) || unit == null) return null;
  return n * unit;
}

const BUCKETS: { label: string; maxDays: number }[] = [
  { label: "On arrival", maxDays: 1 },
  { label: "First week", maxDays: 7 },
  { label: "First month", maxDays: 31 },
  { label: "1–3 months", maxDays: 92 },
  { label: "3–6 months", maxDays: 183 },
  { label: "6–12 months", maxDays: 366 },
  { label: "After a year", maxDays: Infinity },
];

export function buildLifespan(extractions: ExtractedReview[]): Lifespan | null {
  const days: number[] = [];
  for (const ex of extractions) {
    const serious = ex.problems.filter((p) => p.severity !== "minor");
    const d = serious.map((p) => timeframeToDays(p.timeframe)).filter((x): x is number => x != null);
    if (d.length) days.push(Math.min(...d));
  }
  if (days.length < 5) return null;
  const buckets: LifespanBucket[] = BUCKETS.map((b) => ({ ...b, count: 0 }));
  for (const d of days) {
    const b = buckets.find((x) => d <= x.maxDays) ?? buckets[buckets.length - 1];
    b.count++;
  }
  const sorted = [...days].sort((a, b) => a - b);
  const median = sorted[Math.floor((sorted.length - 1) / 2)];
  const medianBucket = buckets.find((x) => median <= x.maxDays) ?? buckets[buckets.length - 1];
  return { samples: days.length, medianLabel: medianBucket.label, buckets };
}
