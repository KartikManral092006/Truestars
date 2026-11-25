"use client";

import type { ReactNode } from "react";
import { ArrowUp, BadgeCheck, CircleAlert, ListChecks, MessageCircleQuestion, ShieldCheck, Timer, UserRound } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import fitExample from "@/data/fit-example.json";
import preview from "@/data/preview.json";
import type { Lifespan } from "@/lib/types";

function Tile({
  className = "",
  icon,
  title,
  body,
  children,
}: {
  className?: string;
  icon: ReactNode;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div data-reveal="fade" className={`rounded-3xl ${className}`}>
      <MagicCard
        className="h-full rounded-3xl shadow-card"
        gradientSize={260}
        gradientColor="#fbf3dc"
        gradientOpacity={0.7}
        gradientFrom="#e0a100"
        gradientTo="#e5484d"
      >
        <div className="relative z-40 flex h-full flex-col p-6 md:p-7">
          <div className="flex items-center gap-2.5 text-subtle">
            {icon}
            <h3 className="t-h3 text-ink">{title}</h3>
          </div>
          <p className="t-small mt-2 max-w-md text-subtle">{body}</p>
          <div className="mt-6 flex-1">{children}</div>
        </div>
      </MagicCard>
    </div>
  );
}


export function FeatureBento() {
  const lifespan = preview.lifespan as Lifespan | null;
  const maxBucket = lifespan ? Math.max(...lifespan.buckets.map((b) => b.count)) || 1 : 1;
  const grounded = preview.quality.proposed ? Math.round((preview.quality.grounded / preview.quality.proposed) * 100) : 0;
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-32" aria-labelledby="features-heading">
      <h2 id="features-heading" data-reveal="lines" className="t-h2 max-w-2xl">
        More than a score. Answers you can check.
      </h2>
      <p data-reveal="fade" className="t-lead mt-5">
        Every part of the report links back to what real buyers wrote.
      </p>

      <div className="mt-14 grid gap-4 md:grid-cols-6">
        <Tile
          className="md:col-span-4"
          icon={<MessageCircleQuestion className="size-5" />}
          title="Ask the reviews"
          body="Ask anything. The answer only uses what reviewers wrote, and shows you the reviews it came from."
        >
          <div className="flex items-center gap-2 rounded-full border border-line bg-canvas py-1.5 pr-1.5 pl-4 shadow-card">
            <span className="flex-1 text-[0.95rem]">Does it work on carpet?</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-ink text-white">
              <ArrowUp className="size-4" />
            </span>
          </div>
          <figure className="mt-4 rounded-2xl border border-line bg-surface p-4">
            <blockquote className="text-[0.95rem] leading-relaxed">
              “Works as described. <mark>Needs a hard floor to show the correct reading (won&apos;t work on the carpet).</mark>”
            </blockquote>
            <figcaption className="t-caption mt-2">A real 5-star review of the bathroom scale</figcaption>
          </figure>
        </Tile>

        <Tile
          className="md:col-span-2"
          icon={<UserRound className="size-5" />}
          title="Fits you"
          body="Say how you will use it. Problems are sorted by how much they matter to you."
        >
          <p className="rounded-2xl bg-surface p-3 text-sm">“{fitExample.profile}”</p>
          <ul className="mt-3 space-y-2.5 text-sm">
            {fitExample.fits.map((f) => (
              <li key={f.name}>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium">{f.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${f.relevance === "high" ? "bg-ink text-white" : f.relevance === "medium" ? "border border-line-strong" : "text-subtle"}`}
                  >
                    {f.relevance === "high" ? "Matters" : f.relevance === "medium" ? "Maybe" : "Not for you"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Tile>

        <Tile
          className="md:col-span-2"
          icon={<ListChecks className="size-5" />}
          title="First-week checklist"
          body="Tests to run before your return window closes, built from what went wrong for others."
        >
          <ul className="space-y-2.5">
            {preview.checklist.slice(0, 2).map((c) => (
              <li key={c.action} className="flex gap-2.5 text-sm leading-snug">
                <span className="mt-0.5 size-4 shrink-0 rounded border border-line-strong" />
                <span>
                  <span className="font-semibold text-gold-ink">{c.when}. </span>
                  {c.action}
                </span>
              </li>
            ))}
          </ul>
        </Tile>

        <Tile
          className="md:col-span-2"
          icon={<Timer className="size-5" />}
          title={lifespan ? "When things break" : "Hidden complaints"}
          body={
            lifespan
              ? `When serious problems show up, from ${lifespan.samples} reviews that say so.`
              : "Problems mentioned in 4 and 5 star reviews, which never pull the average down."
          }
        >
          {lifespan ? (
            <ul className="space-y-1.5">
              {lifespan.buckets.slice(0, 6).map((b) => (
                <li key={b.label} className="grid grid-cols-[5.5rem_1fr] items-center gap-2 text-xs">
                  <span className={b.label === lifespan.medianLabel ? "font-semibold" : "text-subtle"}>{b.label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <span
                      data-fill
                      className={`block h-full rounded-full ${b.label === lifespan.medianLabel ? "bg-coral" : "bg-ember/50"}`}
                      style={{ width: `${(b.count / maxBucket) * 100}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {preview.hidden.map((h) => (
                <li key={h.reviewId} className="rounded-xl bg-surface p-3 text-sm">“{h.quote}”</li>
              ))}
            </ul>
          )}
        </Tile>

        <Tile
          className="md:col-span-2"
          icon={<ShieldCheck className="size-5" />}
          title="Can you trust the stars?"
          body="Checks you can verify yourself. No guessing whether a review was written by AI."
        >
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-start gap-2 text-green-ink">
              <BadgeCheck className="mt-0.5 size-4 shrink-0" /> {grounded}% of AI quotes matched the review word for word
            </li>
            {preview.patterns.map((p) => (
              <li key={p.title} className="flex items-start gap-2 text-subtle">
                <CircleAlert className="mt-0.5 size-4 shrink-0" /> {p.title}
              </li>
            ))}
          </ul>
          <p className="t-caption mt-3">From the real bathroom-scale report</p>
        </Tile>
      </div>
    </section>
  );
}
