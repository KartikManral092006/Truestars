import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeReviews } from "../src/lib/analyze";

const base = process.argv[2] ?? "http://localhost:3000";
const only = process.argv[3];
const dir = join(import.meta.dirname, "..", "public", "samples");
const index: { slug: string }[] = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));

for (const { slug } of index) {
  if (only && slug !== only) continue;
  const doc = JSON.parse(readFileSync(join(dir, `${slug}.json`), "utf8"));
  const started = Date.now();
  const report = await analyzeReviews(
    doc.reviews,
    doc.product,
    (p) => process.stdout.write(`\r${slug}: ${p.stage} ${p.done}/${p.total}   `),
    { baseUrl: base },
  );
  writeFileSync(join(dir, `${slug}.report.json`), JSON.stringify(report));
  console.log(
    `\n${slug}: ${report.dealbreakers.length} problem themes, ${report.praises.length} praise themes, ` +
      `${report.failedBatches} failed batches, ${((Date.now() - started) / 1000).toFixed(1)}s\n  ${report.headline.text}`,
  );
}
