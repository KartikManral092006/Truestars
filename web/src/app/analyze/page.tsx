import type { Metadata } from "next";
import { Suspense } from "react";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Report } from "@/lib/types";
import { AnalyzeClient } from "./AnalyzeClient";

export const metadata: Metadata = { title: "Analyse reviews" };

type Params = PageProps<"/analyze">["searchParams"];

async function AnalyzeWithParams({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const sample = one(params.sample);
  const embed = one(params.embed) === "1";
  const mode = embed ? "embed" : sample ? "sample" : "paste";
  const safeSample = sample && /^[a-z0-9-]+$/.test(sample) ? sample : undefined;
  const initialReport = safeSample ? await loadSampleReport(safeSample) : null;
  return <AnalyzeClient mode={mode} sample={safeSample} initialReport={initialReport} />;
}

async function loadSampleReport(slug: string): Promise<Report | null> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), "public", "samples", `${slug}.report.json`), "utf8"));
  } catch {
    return null;
  }
}

export default function AnalyzePage({ searchParams }: PageProps<"/analyze">) {
  return (
    <Suspense fallback={null}>
      <AnalyzeWithParams searchParams={searchParams} />
    </Suspense>
  );
}
