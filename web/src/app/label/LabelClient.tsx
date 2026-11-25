"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { Stars } from "@/components/Stars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { labelSample, type HumanLabel, type LabelFile } from "@/lib/eval";
import type { Review } from "@/lib/types";

const PRODUCTS = ["bathroom-scale", "white-noise-machine", "facial-massager"];

export function LabelClient({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [labeller, setLabeller] = useState("");
  const storageKey = `truestars:labels:${slug}`;
  const [labels, setLabels] = useState<Record<string, HumanLabel>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    fetch(`/samples/${slug}.json`)
      .then((r) => r.json())
      .then((doc) => setReviews(doc.reviews));
  }, [slug]);

  const sample = useMemo(() => (reviews ? labelSample(reviews, slug) : []), [reviews, slug]);
  const doneCount = sample.filter((r) => labels[r.id]).length;

  function set(id: string, patch: Partial<HumanLabel>) {
    setLabels((prev) => {
      const base: HumanLabel = prev[id] ?? { id, hasProblem: false };
      const next = { ...prev, [id]: { ...base, ...patch } };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function download() {
    const file: LabelFile = {
      slug,
      labeller: labeller.trim() || "anonymous",
      labelledAt: new Date().toISOString(),
      labels: sample.filter((r) => labels[r.id]).map((r) => labels[r.id]),
    };
    const blob = new Blob([JSON.stringify(file, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-3xl px-5 pt-6 pb-28">
        <h1 className="t-h1">
          Label reviews by hand
        </h1>
        <p className="mt-3 leading-relaxed text-subtle">
          For each review, decide one thing: does the buyer describe a concrete problem they experienced? Ignore what TrueStars
          found. Your labels become the answer key on the accuracy page.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {PRODUCTS.map((p) => (
            <Link
              key={p}
              href={`/label?sample=${p}`}
              className={`rounded-full border px-3 py-1 text-sm ${p === slug ? "border-gold text-gold-ink" : "border-line text-subtle"}`}
            >
              {p}
            </Link>
          ))}
        </div>

        <ol className="mt-8 space-y-4">
          {sample.map((r, i) => {
            const l = labels[r.id];
            return (
              <li key={r.id} className={`rounded-2xl border p-5 ${l ? "border-green/30" : "border-line"} bg-surface`}>
                <div className="flex items-center gap-3 text-xs text-subtle">
                  <span className="tabular-nums">{i + 1}.</span>
                  <Stars value={r.rating} size={12} />
                  <span>{r.id}</span>
                </div>
                {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                <p className="mt-1 leading-relaxed whitespace-pre-line">{r.text}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-subtle">Concrete problem?</span>
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      onClick={() => set(r.id, { hasProblem: v })}
                      className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${l && l.hasProblem === v ? (v ? "border-coral bg-coral text-ink" : "border-green bg-green text-ink") : "border-line"}`}
                    >
                      {v ? "Yes" : "No"}
                    </button>
                  ))}
                  {l?.hasProblem && (
                    <Input
                      value={l.note ?? ""}
                      onChange={(e) => set(r.id, { note: e.target.value })}
                      placeholder="Problem in a few words (optional)"
                      className="h-9 flex-1 border-line bg-surface"
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="sticky bottom-4 mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface-2/95 p-4 backdrop-blur">
          <span className="text-sm tabular-nums">
            {doneCount} of {sample.length} labelled
          </span>
          <Input
            value={labeller}
            onChange={(e) => setLabeller(e.target.value)}
            placeholder="Your name"
            className="h-10 w-44 border-line bg-surface"
          />
          <Button onClick={download} disabled={!doneCount} className="h-10 rounded-full px-5 font-semibold">
            Download labels
          </Button>
          <span className="text-xs text-subtle">Save the file to web/eval/labels/</span>
        </div>
      </main>
    </div>
  );
}
