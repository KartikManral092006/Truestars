import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Report } from "../src/lib/types";

const root = join(import.meta.dirname, "..");
const dir = join(root, "public", "samples");
const index: { slug: string }[] = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));

const products: Record<string, { tone: string; text: string }> = {};
const stats = { reviews: 0, analysed: 0, proposed: 0, grounded: 0, problems: 0 };
let main: Report | null = null;
for (const { slug } of index) {
  const p = join(dir, `${slug}.report.json`);
  if (!existsSync(p)) continue;
  const r: Report = JSON.parse(readFileSync(p, "utf8"));
  products[slug] = r.headline;
  stats.reviews += r.totalReviews;
  stats.analysed += r.analysedReviews;
  stats.proposed += r.quality?.proposed ?? 0;
  stats.grounded += r.quality?.grounded ?? 0;
  stats.problems += r.dealbreakers.length;
  if (slug === "bathroom-scale") main = r;
}
if (!main) throw new Error("bathroom-scale report missing; run npm run precompute first");

const preview = {
  slug: "bathroom-scale",
  title: "Utopia digital bathroom scale",
  headline: main.headline,
  avg: main.avgRating,
  hist: main.ratingHistogram,
  total: main.totalReviews,
  analysed: main.analysedReviews,
  quality: main.quality,
  dealbreakers: main.dealbreakers.slice(0, 4).map((d) => ({
    name: d.name,
    severity: d.severity,
    share: d.estimatedShare,
    count: d.count,
    isDealbreaker: d.isDealbreaker,
    quote: d.evidence.find((e) => e.quote)?.quote ?? null,
  })),
  checklist: main.checklist.slice(0, 3),
  patterns: main.patterns.slice(0, 2).map((p) => ({ title: p.title, level: p.level })),
  praises: main.praises.slice(0, 3).map((p) => ({ name: p.name, share: p.estimatedShare })),
  lifespan: main.lifespan,
  hidden: main.hiddenComplaints.slice(0, 2),
  products,
  stats,
};
writeFileSync(join(root, "src", "data", "preview.json"), JSON.stringify(preview, null, 1));
console.log("wrote src/data/preview.json", Object.keys(products));
