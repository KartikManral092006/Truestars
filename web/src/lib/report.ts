import type {
  Dealbreaker,
  Evidence,
  ExtractedReview,
  HiddenComplaint,
  PatternFlag,
  Praise,
  ProductInfo,
  QuoteQuality,
  Report,
  Review,
  Severity,
  ThemesResult,
} from "./types";
import { buildLifespan } from "./lifespan";
import { averageRating, detectPatterns, monthlyTimeline, ratingHistogram } from "./stats";
import { tokens } from "./text";

const SEVERITY_RANK: Record<Severity, number> = { minor: 1, major: 2, critical: 3 };

function bucket(r: Review): number {
  return r.rating == null ? 0 : Math.min(5, Math.max(1, Math.round(r.rating)));
}

export function selectForAnalysis(reviews: Review[], max = 100): Review[] {
  const informative = reviews.filter((r) => tokens(r.text).length >= 5);
  const byLength = (a: Review, b: Review) => b.text.length - a.text.length;
  const negative = informative.filter((r) => r.rating == null || r.rating <= 3).sort(byLength);
  const positive = informative.filter((r) => r.rating != null && r.rating > 3).sort(byLength);
  const negCap = Math.min(negative.length, Math.round(max * 0.65));
  const posCap = Math.min(positive.length, max - negCap);
  const extraNeg = Math.min(negative.length - negCap, max - negCap - posCap);
  return [...negative.slice(0, negCap + extraNeg), ...positive.slice(0, posCap)];
}

function stratifiedShare(
  mentioning: Set<string>,
  reviewsById: Map<string, Review>,
  analysedPerBucket: Map<number, number>,
  totalPerBucket: Map<number, number>,
  total: number,
): number {
  const mentionsPerBucket = new Map<number, number>();
  for (const id of mentioning) {
    const r = reviewsById.get(id);
    if (!r) continue;
    const b = bucket(r);
    mentionsPerBucket.set(b, (mentionsPerBucket.get(b) ?? 0) + 1);
  }
  let share = 0;
  for (const [b, analysed] of analysedPerBucket) {
    if (!analysed) continue;
    share += ((mentionsPerBucket.get(b) ?? 0) / analysed) * ((totalPerBucket.get(b) ?? 0) / total);
  }
  return Math.min(1, share);
}

function lowerFirst(s: string): string {
  return /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}

function pct(share: number): string {
  if (share > 0 && share < 0.01) return "under 1%";
  return `${Math.round(share * 100)}%`;
}

export function buildReport(input: {
  product: ProductInfo;
  reviews: Review[];
  analysed: Review[];
  extractions: ExtractedReview[];
  themes: ThemesResult;
  failedBatches: number;
  quality: QuoteQuality;
}): Report {
  const { product, reviews, analysed, extractions, themes, failedBatches } = input;
  const reviewsById = new Map(reviews.map((r) => [r.id, r]));
  const extractedIds = new Set(extractions.map((e) => e.id));
  const analysedOk = analysed.filter((r) => extractedIds.has(r.id));

  const totalPerBucket = new Map<number, number>();
  for (const r of reviews) totalPerBucket.set(bucket(r), (totalPerBucket.get(bucket(r)) ?? 0) + 1);
  const analysedPerBucket = new Map<number, number>();
  for (const r of analysedOk) analysedPerBucket.set(bucket(r), (analysedPerBucket.get(bucket(r)) ?? 0) + 1);
  const total = reviews.length;

  const problemTheme = new Map<string, number>();
  themes.problemThemes.forEach((t, i) => t.labels.forEach((l) => problemTheme.set(l, i)));
  const praiseTheme = new Map<string, number>();
  themes.praiseThemes.forEach((t, i) => t.labels.forEach((l) => praiseTheme.set(l, i)));

  const dealbreakers: Dealbreaker[] = themes.problemThemes.map((t, i) => {
    const evidenceById = new Map<string, Evidence>();
    for (const ex of extractions) {
      for (const p of ex.problems) {
        if (problemTheme.get(p.label) !== i) continue;
        const r = reviewsById.get(ex.id);
        if (!r) continue;
        const prev = evidenceById.get(ex.id);
        const better =
          !prev ||
          SEVERITY_RANK[p.severity] > SEVERITY_RANK[prev.severity] ||
          (!prev.quote && p.quote != null);
        if (better) {
          evidenceById.set(ex.id, {
            reviewId: ex.id,
            quote: p.quote,
            rating: r.rating,
            date: r.date,
            timeframe: p.timeframe ?? prev?.timeframe ?? null,
            severity: p.severity,
            text: r.text,
            title: r.title,
          });
        }
      }
    }
    const evidence = [...evidenceById.values()].sort(
      (a, b) =>
        SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
        Number(b.quote != null) - Number(a.quote != null) ||
        (a.rating ?? 3) - (b.rating ?? 3),
    );
    const count = evidence.length;
    const severityCounts = { minor: 0, major: 0, critical: 0 };
    evidence.forEach((e) => severityCounts[e.severity]++);
    const severity: Severity =
      severityCounts.critical >= Math.max(1, Math.min(2, count)) && severityCounts.critical / count >= 0.25
        ? "critical"
        : severityCounts.major + severityCounts.critical >= count / 2
          ? "major"
          : "minor";
    const estimatedShare = stratifiedShare(
      new Set(evidence.map((e) => e.reviewId)),
      reviewsById,
      analysedPerBucket,
      totalPerBucket,
      total,
    );
    const rated = evidence.filter((e) => e.rating != null);
    const timeframes = [...new Set(evidence.map((e) => e.timeframe).filter((x): x is string => !!x))].slice(0, 6);
    return {
      id: `p${i}`,
      name: t.name,
      description: t.description,
      count,
      estimatedShare,
      severity,
      isDealbreaker:
        count >= 2 && (severity === "critical" || (severity === "major" && estimatedShare >= 0.08)),
      avgRating: rated.length ? rated.reduce((s, e) => s + (e.rating as number), 0) / rated.length : null,
      timeframes,
      evidence,
    };
  });

  const weight = (d: Dealbreaker) => d.estimatedShare * SEVERITY_RANK[d.severity] + d.count * 0.0001;
  const sortedDealbreakers = dealbreakers
    .filter((d) => d.count >= 2 || (d.count === 1 && d.severity === "critical"))
    .sort((a, b) => weight(b) - weight(a));

  const praises: Praise[] = themes.praiseThemes
    .map((t, i) => {
      const ids = new Set<string>();
      for (const ex of extractions) if (ex.praises.some((p) => praiseTheme.get(p) === i)) ids.add(ex.id);
      const examples = [...ids]
        .map((id) => reviewsById.get(id))
        .filter((r): r is Review => !!r)
        .slice(0, 3)
        .map((r) => ({ reviewId: r.id, text: r.text, rating: r.rating }));
      return {
        id: `g${i}`,
        name: t.name,
        description: t.description,
        count: ids.size,
        estimatedShare: stratifiedShare(ids, reviewsById, analysedPerBucket, totalPerBucket, total),
        examples,
      };
    })
    .filter((p) => p.count > 0)
    .sort((a, b) => b.estimatedShare - a.estimatedShare);

  const patterns: PatternFlag[] = detectPatterns(reviews);
  const warnings = patterns.filter((p) => p.level === "warning").length;
  const top = sortedDealbreakers.find((d) => d.isDealbreaker);

  let headline: Report["headline"];
  if (top && top.severity === "critical" && top.estimatedShare >= 0.05) {
    headline = {
      tone: "danger",
      text: `Main risk: ${lowerFirst(top.name)}. Roughly ${pct(top.estimatedShare)} of buyers report it.`,
    };
  } else if (top) {
    headline = {
      tone: "caution",
      text: `Biggest risk: ${lowerFirst(top.name)}. Roughly ${pct(top.estimatedShare)} of buyers mention it.`,
    };
  } else if (warnings) {
    headline = {
      tone: "caution",
      text: `No common dealbreaker, but ${warnings} suspicious review pattern${warnings > 1 ? "s" : ""} found.`,
    };
  } else {
    headline = {
      tone: "ok",
      text: `No major red flags in ${analysedOk.length} reviews analysed.`,
    };
  }

  return {
    product,
    totalReviews: total,
    analysedReviews: analysedOk.length,
    failedBatches,
    ratingHistogram: ratingHistogram(reviews),
    avgRating: averageRating(reviews),
    timeline: monthlyTimeline(reviews),
    headline,
    dealbreakers: sortedDealbreakers,
    praises,
    patterns,
    reviews: Object.fromEntries(reviews.map((r) => [r.id, r])),
    extractions,
    quality: input.quality,
    lifespan: buildLifespan(extractions),
    checklist: [],
    hiddenComplaints: findHiddenComplaints(extractions, reviewsById),
    generatedAt: new Date().toISOString(),
  };
}

function findHiddenComplaints(extractions: ExtractedReview[], reviewsById: Map<string, Review>): HiddenComplaint[] {
  const out: HiddenComplaint[] = [];
  for (const ex of extractions) {
    const r = reviewsById.get(ex.id);
    if (!r || r.rating == null || r.rating < 4) continue;
    const p = ex.problems
      .filter((x) => x.quote && x.severity !== "minor")
      .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])[0];
    if (p) out.push({ reviewId: r.id, rating: r.rating, label: p.label, quote: p.quote as string });
  }
  return out.slice(0, 8);
}

export { pct };
