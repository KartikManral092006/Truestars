import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { score, summarise, type EvalResults, type LabelFile, type ProductScore } from "../src/lib/eval";
import type { Report } from "../src/lib/types";

const root = join(import.meta.dirname, "..");
const labelDir = join(root, "eval", "labels");
const samplesDir = join(root, "public", "samples");

if (!existsSync(labelDir)) {
  console.error(`No labels yet. Label reviews at http://localhost:3000/label and save the files to ${labelDir}`);
  process.exit(1);
}

const products: ProductScore[] = [];
const labellers = new Set<string>();
for (const file of readdirSync(labelDir).filter((f) => f.endsWith(".json"))) {
  const labels: LabelFile = JSON.parse(readFileSync(join(labelDir, file), "utf8"));
  const reportPath = join(samplesDir, `${labels.slug}.report.json`);
  if (!existsSync(reportPath)) {
    console.warn(`Skipping ${labels.slug}: no report. Run npm run precompute first.`);
    continue;
  }
  const report: Report = JSON.parse(readFileSync(reportPath, "utf8"));
  const predicted = new Map(report.extractions.map((e) => [e.id, e.problems.length > 0]));
  const s = score(labels.labels, predicted);
  labellers.add(labels.labeller);
  products.push({
    slug: labels.slug,
    title: report.product.title ?? labels.slug,
    ...s,
    quotesProposed: report.quality?.proposed ?? 0,
    quotesGrounded: report.quality?.grounded ?? 0,
  });
  console.log(
    `${labels.slug}: n=${s.labelled} precision=${s.precision.toFixed(2)} recall=${s.recall.toFixed(2)} agreement=${s.agreement.toFixed(2)} kappa=${s.kappa.toFixed(2)}`,
  );
}

if (!products.length) {
  console.error("Nothing to score.");
  process.exit(1);
}

const sum = (k: keyof ProductScore) => products.reduce((a, p) => a + (p[k] as number), 0);
const overall = {
  ...summarise(sum("truePositive"), sum("falsePositive"), sum("falseNegative"), sum("trueNegative")),
  quotesProposed: sum("quotesProposed"),
  quotesGrounded: sum("quotesGrounded"),
};

const results: EvalResults = {
  generatedAt: new Date().toISOString(),
  labeller: [...labellers].join(", "),
  products,
  overall,
};
mkdirSync(join(root, "public", "eval"), { recursive: true });
writeFileSync(join(root, "public", "eval", "results.json"), JSON.stringify(results, null, 1));
console.log(`\nOverall: precision=${overall.precision.toFixed(2)} recall=${overall.recall.toFixed(2)} kappa=${overall.kappa.toFixed(2)}`);
