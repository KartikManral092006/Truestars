import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dedupeReviews, finishReport } from "../src/lib/analyze";
import { selectForAnalysis } from "../src/lib/report";
import type { Report } from "../src/lib/types";

const base = process.argv[2] ?? "http://localhost:3000";
const only = process.argv[3];
const dir = join(import.meta.dirname, "..", "public", "samples");
const index: { slug: string }[] = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));

for (const { slug } of index) {
  if (only && slug !== only) continue;
  const doc = JSON.parse(readFileSync(join(dir, `${slug}.json`), "utf8"));
  const old: Report = JSON.parse(readFileSync(join(dir, `${slug}.report.json`), "utf8"));
  const reviews = dedupeReviews(doc.reviews);
  const analysed = selectForAnalysis(reviews, 100);
  const report = await finishReport(
    { product: old.product, reviews, analysed, extractions: old.extractions, failedBatches: old.failedBatches, quality: old.quality },
    () => {},
    { baseUrl: base },
  );
  writeFileSync(join(dir, `${slug}.report.json`), JSON.stringify(report));
  console.log(`${slug}: ${report.headline.text}`);
  for (const d of report.dealbreakers) console.log(`  ${d.name} | ${d.severity} | ${(d.estimatedShare * 100).toFixed(1)}% | n=${d.count}`);
  console.log(`  lifespan: ${report.lifespan ? report.lifespan.medianLabel + " (" + report.lifespan.samples + ")" : "none"}; checklist ${report.checklist.length}`);
}
