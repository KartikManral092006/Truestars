import type { Review } from "./types";
import { selectForAnalysis } from "./report";

export const LABELS_PER_PRODUCT = 40;

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function labelSample(reviews: Review[], slug: string): Review[] {
  const pool = selectForAnalysis(reviews, 100);
  let seed = 0;
  for (const c of slug) seed = (seed * 31 + c.charCodeAt(0)) | 0;
  const rand = seeded(seed);
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, LABELS_PER_PRODUCT);
}

export type HumanLabel = { id: string; hasProblem: boolean; note?: string };
export type LabelFile = { slug: string; labeller: string; labelledAt: string; labels: HumanLabel[] };

export type ProductScore = {
  slug: string;
  title: string;
  labelled: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
  precision: number;
  recall: number;
  f1: number;
  agreement: number;
  kappa: number;
  quotesProposed: number;
  quotesGrounded: number;
};

export type EvalResults = {
  generatedAt: string;
  labeller: string;
  products: ProductScore[];
  overall: Omit<ProductScore, "slug" | "title">;
};

export function score(
  labels: HumanLabel[],
  predicted: Map<string, boolean>,
): Pick<ProductScore, "labelled" | "truePositive" | "falsePositive" | "falseNegative" | "trueNegative" | "precision" | "recall" | "f1" | "agreement" | "kappa"> {
  let tp = 0,
    fp = 0,
    fn = 0,
    tn = 0;
  for (const l of labels) {
    if (!predicted.has(l.id)) continue;
    const p = predicted.get(l.id)!;
    if (p && l.hasProblem) tp++;
    else if (p && !l.hasProblem) fp++;
    else if (!p && l.hasProblem) fn++;
    else tn++;
  }
  return summarise(tp, fp, fn, tn);
}

export function summarise(tp: number, fp: number, fn: number, tn: number) {
  const n = tp + fp + fn + tn;
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  const agreement = n ? (tp + tn) / n : 0;
  const pYes = n ? ((tp + fp) / n) * ((tp + fn) / n) : 0;
  const pNo = n ? ((fn + tn) / n) * ((fp + tn) / n) : 0;
  const expected = pYes + pNo;
  const kappa = expected < 1 ? (agreement - expected) / (1 - expected) : 1;
  return { labelled: n, truePositive: tp, falsePositive: fp, falseNegative: fn, trueNegative: tn, precision, recall, f1, agreement, kappa };
}
