"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ClipboardPaste } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ReportView } from "@/components/ReportView";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { analyzeReviews, type Progress } from "@/lib/analyze";
import { parsePastedReviews } from "@/lib/parse";
import type { ProductInfo, Report, Review } from "@/lib/types";

type Mode = "sample" | "paste" | "embed";
type Phase = "input" | "loading" | "running" | "done" | "error";
type SampleDoc = { slug: string; product: ProductInfo; reviews: Review[] };

function ReadingSky({ progress, total }: { progress: Progress | null; total: number }) {
  const reduce = useReducedMotion();
  const slots = progress?.total || 100;
  const lit = progress && progress.stage !== "reading" ? slots : (progress?.done ?? 0);
  const label =
    progress?.stage === "grouping"
      ? "Grouping what they said into problems"
      : progress?.stage === "checklist"
        ? "Writing your first-week checklist"
        : progress
        ? `Reading review ${Math.min(progress.done + 1, progress.total)} of ${progress.total}`
        : "Collecting reviews";
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-20 text-center" role="status" aria-live="polite">
      <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-2.5" aria-hidden="true">
        {Array.from({ length: slots }, (_, i) => {
          const on = i < lit;
          return (
            <motion.span
              key={i}
              className="size-2 rounded-full"
              animate={{
                backgroundColor: on ? "#0e1116" : "#e6e8ec",
                scale: on ? 1 : 0.7,
                boxShadow: "0 0 0 rgba(0,0,0,0)",
              }}
              transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : (i % 20) * 0.01 }}
            />
          );
        })}
      </div>
      <p className="t-h2 mt-12">
        {label}
      </p>
      <p className="mt-3 max-w-md text-subtle">
        {total ? `${total.toLocaleString()} reviews found. ` : ""}The critical ones are read first, then the most detailed positive
        ones.
      </p>
    </div>
  );
}

export function AnalyzeClient({
  mode,
  sample,
  initialReport = null,
}: {
  mode: Mode;
  sample?: string;
  initialReport?: Report | null;
}) {
  const [phase, setPhase] = useState<Phase>(initialReport ? "done" : mode === "paste" ? "input" : "loading");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [report, setReport] = useState<Report | null>(initialReport);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(initialReport?.totalReviews ?? 0);
  const [pasted, setPasted] = useState("");
  const [productName, setProductName] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (reviews: Review[], product: ProductInfo) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setTotal(reviews.length);
    setPhase("running");
    setProgress(null);
    setError(null);
    try {
      const r = await analyzeReviews(reviews, product, setProgress, { signal: controller.signal });
      setReport(r);
      setPhase("done");
      window.scrollTo({ top: 0 });
    } catch (e) {
      if (controller.signal.aborted) return;
      setError((e as Error).message);
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    if (mode !== "sample" || !sample || initialReport) return;
    let cancelled = false;
    (async () => {
      try {
        const cached = await fetch(`/samples/${sample}.report.json`);
        if (cached.ok) {
          const r = (await cached.json()) as Report;
          if (!cancelled) {
            setReport(r);
            setTotal(r.totalReviews);
            setPhase("done");
          }
          return;
        }
        const res = await fetch(`/samples/${sample}.json`);
        if (!res.ok) throw new Error("That sample product does not exist.");
        const doc = (await res.json()) as SampleDoc;
        if (!cancelled) run(doc.reviews, doc.product);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, sample, run, initialReport]);

  useEffect(() => {
    if (mode !== "embed") return;
    function onMessage(event: MessageEvent) {
      if (event.source !== window.parent) return;
      const data = event.data;
      if (data?.type !== "truestars:reviews" || !Array.isArray(data.reviews)) return;
      const reviews = (data.reviews as Review[]).slice(0, 2000);
      if (!reviews.length) {
        setError("No reviews were found on this page. Open the product's reviews and click TrueStars again.");
        setPhase("error");
        return;
      }
      run(reviews, (data.product ?? {}) as ProductInfo);
    }
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "truestars:ready" }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, [mode, run]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const parsed = mode === "paste" ? parsePastedReviews(pasted) : [];

  async function loadExample() {
    const res = await fetch("/samples/bathroom-scale.json");
    const doc = (await res.json()) as SampleDoc;
    setProductName(doc.product.title ?? "");
    setPasted(
      doc.reviews
        .slice(0, 60)
        .map((r) => `${r.rating}/5 ${r.title ? r.title + ". " : ""}${r.text.replace(/\n\s*\n/g, "\n")}`)
        .join("\n\n"),
    );
  }

  const embed = mode === "embed";

  return (
    <div className="flex flex-1 flex-col">
      {embed ? (
        <div className="px-5 pt-5">
          <Logo href="/" />
        </div>
      ) : (
        <SiteHeader />
      )}
      <main id="main" className={`mx-auto w-full flex-1 px-5 ${embed ? "max-w-xl py-6" : "max-w-6xl pt-10 pb-28"}`}>
        {phase === "input" && (
          <section className="grid gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-14">
            <div>
              <h1
                className="t-h1"
              >
                Paste reviews from any site.
              </h1>
              <p className="t-lead mt-6">
                Copy reviews from a shop, a restaurant page, or an app store and paste them here. Leave a blank line between
                reviews.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-subtle">
                If you have ratings, start a review with one, like <code className="rounded bg-surface-2 px-1.5 py-0.5 text-ink">4/5</code> or{" "}
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-ink">★★☆☆☆</code>. A JSON list of reviews works too.
              </p>
            </div>
            <div>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="What are the reviews about? (optional)"
                aria-label="Product or place name"
                className="h-12 border-line bg-surface text-base"
              />
              <Textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={14}
                aria-label="Reviews"
                placeholder={"2/5 Stopped charging after a month. The cable gets hot too.\n\n5/5 Great sound for the price, the battery lasts all week."}
                className="mt-3 min-h-80 border-line bg-surface text-[0.95rem] leading-relaxed"
              />
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => run(parsed, { title: productName || undefined, source: "Pasted" })}
                  disabled={parsed.length < 3}
                  className="h-12 rounded-full px-6 text-base font-semibold"
                >
                  {parsed.length >= 3 ? `Analyse ${parsed.length} reviews` : "Analyse reviews"}
                </Button>
                <Button onClick={loadExample} variant="outline" className="h-12 rounded-full bg-transparent px-5 text-base">
                  <ClipboardPaste className="size-4" /> Fill in an example
                </Button>
                {parsed.length > 0 && parsed.length < 3 && (
                  <span className="text-sm text-subtle">Add at least 3 reviews.</span>
                )}
              </div>
            </div>
          </section>
        )}

        {phase === "loading" &&
          (embed ? (
            <p className="py-16 text-center text-subtle">Waiting for the reviews on this page</p>
          ) : (
            <ReadingSky progress={null} total={0} />
          ))}

        {phase === "running" && <ReadingSky progress={progress} total={total} />}

        {phase === "error" && (
          <div className="mx-auto max-w-xl py-20 text-center" role="alert">
            <p className="t-h2">
              The analysis stopped
            </p>
            <p className="mt-4 text-subtle">{error}</p>
            {mode === "paste" && (
              <Button onClick={() => setPhase("input")} variant="outline" className="mt-8 h-11 rounded-full bg-transparent px-5">
                <ArrowLeft className="size-4" /> Back to your reviews
              </Button>
            )}
          </div>
        )}

        {phase === "done" && report && <ReportView report={report} compact={embed} />}
      </main>
    </div>
  );
}
