"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Fit, Report } from "@/lib/types";
import { RatingBar } from "./RatingBar";
import { Stars } from "./Stars";
import { AskPanel } from "./report/AskPanel";
import { Checklist, HiddenComplaints, LifespanChart } from "./report/AfterYouBuy";
import { DealbreakerRow } from "./report/DealbreakerRow";
import { FitPanel } from "./report/FitPanel";
import { PraiseList, TrustChecks } from "./report/TrustChecks";

const TONE = {
  danger: { bar: "bg-coral", text: "text-coral-ink", label: "Think twice" },
  caution: { bar: "bg-ember", text: "text-ember-ink", label: "Know this first" },
  ok: { bar: "bg-green", text: "text-green-ink", label: "Looks solid" },
} as const;

const ORDER = { high: 0, medium: 1, low: 2 } as const;
const EASE = [0.22, 1, 0.36, 1] as const;

function SectionTitle({ children, sub }: { children: React.ReactNode; sub: string }) {
  const reduce = useReducedMotion();
  const anim = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 28 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-10% 0px" },
        transition: { duration: 0.8, ease: EASE },
      };
  return (
    <motion.div {...anim} className="mb-10">
      <h2 className="t-h2">{children}</h2>
      <p className="t-lead mt-4">{sub}</p>
    </motion.div>
  );
}

type NavItem = { id: string; label: string };

function ReportNav({ items }: { items: NavItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const reduce = useReducedMotion();

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="Report sections"
      className="sticky top-0 z-30 -mx-5 border-b border-line bg-canvas/80 px-5 backdrop-blur-xl"
    >
      <ul className="flex gap-1 overflow-x-auto py-2.5 [scrollbar-width:none]">
        {items.map((i) => {
          const on = active === i.id;
          return (
            <li key={i.id} className="relative shrink-0">
              {on && (
                <motion.span
                  layoutId="report-nav-pill"
                  className="absolute inset-0 rounded-full bg-surface-2"
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                />
              )}
              <a
                href={`#${i.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(i.id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
                }}
                aria-current={on ? "true" : undefined}
                className={`relative block rounded-full px-3.5 py-1.5 text-[0.9375rem] transition-colors ${on ? "text-ink" : "text-subtle hover:text-ink"}`}
              >
                {i.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function ReportView({ report, compact = false }: { report: Report; compact?: boolean }) {
  const [fits, setFits] = useState<Record<string, Fit>>({});
  const reduce = useReducedMotion();
  const hasFits = Object.keys(fits).length > 0;
  const dealbreakers = useMemo(() => {
    if (!hasFits) return report.dealbreakers;
    return [...report.dealbreakers].sort(
      (a, b) => ORDER[fits[a.id]?.relevance ?? "medium"] - ORDER[fits[b.id]?.relevance ?? "medium"],
    );
  }, [fits, hasFits, report.dealbreakers]);
  const maxShare = Math.max(0, ...report.dealbreakers.map((d) => d.estimatedShare));
  const tone = TONE[report.headline.tone];
  const hasAfter = !!report.lifespan || report.checklist.length > 0;
  const hasHidden = report.hiddenComplaints.length > 0;

  const nav = useMemo<NavItem[]>(
    () =>
      [
        { id: "problems", label: "What goes wrong" },
        { id: "ask", label: "Ask the reviews" },
        hasAfter ? { id: "after", label: "After you buy" } : null,
        hasHidden ? { id: "hidden", label: "Hidden complaints" } : null,
        { id: "trust", label: "Trust and strengths" },
      ].filter((x): x is NavItem => !!x),
    [hasAfter, hasHidden],
  );

  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, delay, ease: EASE },
        };

  const gap = compact ? "space-y-16" : "space-y-28";
  const sectionClass = "scroll-mt-20";

  return (
    <div>
      <section className={compact ? "pb-14" : "pb-16"}>
        <motion.div {...enter(0)} className="t-small flex flex-wrap items-center gap-x-4 gap-y-2 text-subtle">
          <span className={`inline-flex items-center gap-2 font-semibold ${tone.text}`}>
            <span className={`size-2 rounded-full ${tone.bar}`} />
            {tone.label}
          </span>
          {report.product.title && (
            <span className="line-clamp-1 max-w-xl">
              {report.product.url ? (
                <a href={report.product.url} target="_blank" rel="noreferrer" className="hover:text-ink hover:underline">
                  {report.product.title}
                </a>
              ) : (
                report.product.title
              )}
            </span>
          )}
        </motion.div>

        <h1 className={`mt-5 max-w-4xl ${compact ? "t-h2" : "t-h1"}`}>
          {report.headline.text}
        </h1>

        <motion.div
          {...enter(0.2)}
          className={`mt-12 grid gap-10 ${compact ? "" : "md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-14"}`}
        >
          <div>
            <div className="flex items-end gap-5">
              <span className="t-num text-[5.5rem]">{report.avgRating?.toFixed(1) ?? "–"}</span>
              <div className="pb-2">
                <Stars value={report.avgRating} size={18} />
                <p className="t-caption mt-1.5">average rating</p>
              </div>
            </div>
            <RatingBar hist={report.ratingHistogram} className="mt-7 h-2.5" />
            <dl className="mt-7 grid grid-cols-2 gap-6 border-t border-line pt-5">
              <div>
                <dt className="t-caption">Reviews</dt>
                <dd className="t-num mt-1.5 text-3xl">{report.totalReviews.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="t-caption">Read in depth by AI</dt>
                <dd className="t-num mt-1.5 text-3xl">{report.analysedReviews}</dd>
              </div>
            </dl>
          </div>
          {report.dealbreakers.length > 0 && (
            <FitPanel dealbreakers={report.dealbreakers} onFits={setFits} hasFits={hasFits} />
          )}
        </motion.div>
      </section>

      {!compact && <ReportNav items={nav} />}

      <div className={`${gap} ${compact ? "" : "pt-20"}`}>
        <section id="problems" className={sectionClass}>
          <SectionTitle sub="Problems real buyers report, most serious and most common first. Open any of them to read the reviews behind it.">
            What goes wrong
          </SectionTitle>
          {dealbreakers.length ? (
            <ul className="border-t border-line">
              {dealbreakers.map((d, i) => (
                <DealbreakerRow key={d.id} d={d} fit={fits[d.id]} rank={i + 1} maxShare={maxShare} />
              ))}
            </ul>
          ) : (
            <p className="text-subtle">No recurring problems came up in the reviews we read.</p>
          )}
        </section>

        <section id="ask" className={sectionClass}>
          <SectionTitle sub="Ask anything. The answer comes only from what reviewers wrote, with the reviews to prove it.">
            Ask the reviews
          </SectionTitle>
          <AskPanel reviews={report.reviews} />
        </section>

        {hasAfter && (
          <section id="after" className={sectionClass}>
            <SectionTitle sub="Most stores give you a short window to return things. Use it to check for the problems other buyers hit.">
              Before your return window closes
            </SectionTitle>
            <div className={`grid gap-14 ${compact ? "" : "md:grid-cols-2 md:gap-16"}`}>
              {report.checklist.length > 0 && (
                <Checklist items={report.checklist} dealbreakers={report.dealbreakers} product={report.product.title ?? ""} />
              )}
              {report.lifespan && <LifespanChart lifespan={report.lifespan} />}
            </div>
          </section>
        )}

        {hasHidden && (
          <section id="hidden" className={sectionClass}>
            <SectionTitle sub="Happy reviewers still mention problems. These never pull the average down.">
              Complaints hiding in 4 and 5 star reviews
            </SectionTitle>
            <HiddenComplaints items={report.hiddenComplaints} />
          </section>
        )}

        <div id="trust" className={`${sectionClass} grid gap-20 ${compact ? "" : "md:grid-cols-2 md:gap-16"}`}>
          <section>
            <SectionTitle sub="Patterns you can verify yourself. We never guess whether a review was written by AI.">
              Can you trust the stars?
            </SectionTitle>
            <TrustChecks patterns={report.patterns} reviews={report.reviews} />
          </section>
          <section>
            <SectionTitle sub="Specific strengths, so you can weigh them against the risks.">What people love</SectionTitle>
            <PraiseList praises={report.praises} />
          </section>
        </div>

        <section className="t-small border-t border-line pt-8 text-subtle">
          <p className="font-semibold text-ink">How these numbers were made</p>
          <p className="mt-2 max-w-3xl">
            We read {report.analysedReviews} of {report.totalReviews.toLocaleString()} reviews in depth: low-star reviews first,
            then the most detailed positive ones. Because critical reviews are over-sampled, every percentage is re-weighted to
            the full rating mix, so it estimates how many of all buyers mention the problem. People with problems are more likely
            to write reviews, so read these as signals, not guarantees.
            {report.quality?.proposed > 0 && (
              <>
                {" "}
                The AI proposed {report.quality.proposed} quotes; {report.quality.grounded} (
                {Math.round((report.quality.grounded / report.quality.proposed) * 100)}%) matched the review word for word and
                the rest were thrown out.
              </>
            )}
            {report.failedBatches > 0 && (
              <strong className="text-ember-ink">
                {" "}
                {report.failedBatches} batch{report.failedBatches > 1 ? "es" : ""} of reviews could not be read, so some counts may
                be low.
              </strong>
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
