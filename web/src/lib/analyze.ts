import type { ChecklistItem, ExtractedReview, ProductInfo, QuoteQuality, Report, Review, ThemesResult } from "./types";
import { postJson } from "./http";
import { buildReport, selectForAnalysis } from "./report";

export type Progress = { stage: "reading" | "grouping" | "checklist" | "done"; done: number; total: number };

const BATCH = 20;
const CONCURRENCY = 2;

function post<T>(url: string, body: unknown, signal?: AbortSignal, baseUrl = ""): Promise<T> {
  return postJson<T>(url, body, { signal, baseUrl });
}

function countLabels(lists: string[][]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const list of lists) for (const l of new Set(list)) counts.set(l, (counts.get(l) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 400);
}

export function dedupeReviews(reviews: Review[]): Review[] {
  const seen = new Set<string>();
  const out: Review[] = [];
  for (const r of reviews) {
    const text = r.text?.trim();
    if (!text) continue;
    const key = `${r.author ?? ""}|${r.date ?? ""}|${r.rating ?? ""}|${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...r, text, id: r.id || `r${out.length + 1}` });
  }
  const ids = new Set<string>();
  return out.map((r, i) => {
    const id = ids.has(r.id) ? `${r.id}-${i}` : r.id;
    ids.add(id);
    return { ...r, id };
  });
}

export async function analyzeReviews(
  rawReviews: Review[],
  product: ProductInfo,
  onProgress: (p: Progress) => void,
  options: { maxReviews?: number; signal?: AbortSignal; baseUrl?: string } = {},
): Promise<Report> {
  const reviews = dedupeReviews(rawReviews);
  const analysed = selectForAnalysis(reviews, options.maxReviews ?? 100);
  const batches: Review[][] = [];
  for (let i = 0; i < analysed.length; i += BATCH) batches.push(analysed.slice(i, i + BATCH));

  const extractions: ExtractedReview[] = [];
  let failedBatches = 0;
  const quality = { proposed: 0, grounded: 0 };
  let lastError: Error | null = null;
  let done = 0;
  onProgress({ stage: "reading", done: 0, total: analysed.length });

  let next = 0;
  async function worker() {
    while (next < batches.length) {
      const batch = batches[next++];
      try {
        const res = await post<{ reviews: ExtractedReview[]; quality?: QuoteQuality }>(
          "/api/extract",
          { reviews: batch.map(({ id, rating, title, text }) => ({ id, rating, title, text })) },
          options.signal,
          options.baseUrl,
        );
        extractions.push(...res.reviews);
        quality.proposed += res.quality?.proposed ?? 0;
        quality.grounded += res.quality?.grounded ?? 0;
      } catch (e) {
        if (options.signal?.aborted) throw e;
        failedBatches++;
        lastError = e as Error;
      }
      done += batch.length;
      onProgress({ stage: "reading", done, total: analysed.length });
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker));

  if (batches.length && failedBatches === batches.length) {
    throw lastError ?? new Error("Could not analyse the reviews.");
  }

  const report = await finishReport(
    { product, reviews, analysed, extractions, failedBatches, quality },
    onProgress,
    options,
  );
  onProgress({ stage: "done", done: analysed.length, total: analysed.length });
  return report;
}

export async function finishReport(
  input: {
    product: ProductInfo;
    reviews: Review[];
    analysed: Review[];
    extractions: ExtractedReview[];
    failedBatches: number;
    quality: QuoteQuality;
  },
  onProgress: (p: Progress) => void,
  options: { signal?: AbortSignal; baseUrl?: string } = {},
): Promise<Report> {
  const { analysed, extractions } = input;
  onProgress({ stage: "grouping", done: analysed.length, total: analysed.length });
  const themes = await post<ThemesResult>(
    "/api/themes",
    {
      problems: countLabels(extractions.map((e) => e.problems.map((p) => p.label))),
      praises: countLabels(extractions.map((e) => e.praises)),
    },
    options.signal,
    options.baseUrl,
  );

  const report = buildReport({ ...input, themes });

  const top = report.dealbreakers.slice(0, 6);
  if (top.length) {
    onProgress({ stage: "checklist", done: analysed.length, total: analysed.length });
    try {
      const res = await post<{ items: ChecklistItem[] }>(
        "/api/checklist",
        {
          problems: top.map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            severity: d.severity,
            timeframes: d.timeframes.slice(0, 6).map((t) => t.slice(0, 60)),
            examples: d.evidence
              .map((e) => e.quote)
              .filter((q): q is string => !!q)
              .slice(0, 3)
              .map((q) => q.slice(0, 300)),
          })),
        },
        options.signal,
        options.baseUrl,
      );
      report.checklist = res.items;
    } catch (e) {
      if (options.signal?.aborted) throw e;
    }
  }
  return report;
}
