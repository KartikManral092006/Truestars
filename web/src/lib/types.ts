export type Review = {
  id: string;
  rating: number | null;
  title?: string;
  text: string;
  date?: string;
  verified?: boolean;
  author?: string;
};

export type ProductInfo = {
  title?: string;
  url?: string;
  source?: string;
};

export type Severity = "minor" | "major" | "critical";

export type ExtractedProblem = {
  label: string;
  quote: string | null;
  severity: Severity;
  timeframe: string | null;
};

export type ExtractedReview = {
  id: string;
  problems: ExtractedProblem[];
  praises: string[];
};

export type ThemeGroup = {
  name: string;
  description: string;
  labels: string[];
};

export type ThemesResult = {
  problemThemes: ThemeGroup[];
  praiseThemes: ThemeGroup[];
};

export type Evidence = {
  reviewId: string;
  quote: string | null;
  rating: number | null;
  date?: string;
  timeframe: string | null;
  severity: Severity;
  text: string;
  title?: string;
};

export type Dealbreaker = {
  id: string;
  name: string;
  description: string;
  count: number;
  estimatedShare: number;
  severity: Severity;
  isDealbreaker: boolean;
  avgRating: number | null;
  timeframes: string[];
  evidence: Evidence[];
};

export type Praise = {
  id: string;
  name: string;
  description: string;
  count: number;
  estimatedShare: number;
  examples: { reviewId: string; text: string; rating: number | null }[];
};

export type PatternLevel = "info" | "warning";

export type PatternFlag = {
  kind: "burst" | "duplicates" | "incentivized" | "low-info" | "polarized" | "unverified";
  level: PatternLevel;
  title: string;
  detail: string;
  reviewIds: string[];
};

export type Fit = {
  id: string;
  relevance: "high" | "medium" | "low";
  reason: string;
};

export type Report = {
  product: ProductInfo;
  totalReviews: number;
  analysedReviews: number;
  failedBatches: number;
  ratingHistogram: number[];
  avgRating: number | null;
  timeline: { month: string; count: number }[];
  headline: { tone: "danger" | "caution" | "ok"; text: string };
  dealbreakers: Dealbreaker[];
  praises: Praise[];
  patterns: PatternFlag[];
  reviews: Record<string, Review>;
  extractions: ExtractedReview[];
  quality: QuoteQuality;
  lifespan: Lifespan | null;
  checklist: ChecklistItem[];
  hiddenComplaints: HiddenComplaint[];
  generatedAt: string;
};

export type QuoteQuality = { proposed: number; grounded: number };

export type LifespanBucket = { label: string; maxDays: number; count: number };

export type Lifespan = {
  samples: number;
  medianLabel: string;
  buckets: LifespanBucket[];
};

export type ChecklistItem = {
  dealbreakerId: string;
  when: "Day 1" | "First week" | "First month";
  action: string;
  why: string;
};

export type HiddenComplaint = {
  reviewId: string;
  rating: number;
  label: string;
  quote: string;
};

export type AskStance = "yes" | "no" | "mixed" | "not_mentioned";

export type AskPoint = { claim: string; reviewIds: string[]; quote: string | null };

export type AskAnswer = {
  question: string;
  answer: string;
  stance: AskStance;
  points: AskPoint[];
  searched: number;
};
