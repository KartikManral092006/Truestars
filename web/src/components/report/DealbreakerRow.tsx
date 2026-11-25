"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";
import type { Dealbreaker, Fit } from "@/lib/types";
import { EvidenceItem } from "./Evidence";

const SEVERITY = {
  critical: { label: "Critical", dot: "bg-coral", bar: "var(--coral)", text: "text-coral-ink" },
  major: { label: "Major", dot: "bg-ember", bar: "var(--ember)", text: "text-ember-ink" },
  minor: { label: "Minor", dot: "bg-subtle", bar: "var(--subtle)", text: "text-subtle" },
} as const;

const RELEVANCE = {
  high: { label: "Matters to you", cls: "bg-gold text-ink" },
  medium: { label: "Might matter", cls: "border border-gold/60 text-gold-ink" },
  low: { label: "Probably not for you", cls: "border border-line text-subtle" },
} as const;

export function DealbreakerRow({ d, fit, rank, maxShare }: { d: Dealbreaker; fit?: Fit; rank: number; maxShare: number }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const reduce = useReducedMotion();
  const sev = SEVERITY[d.severity];
  const shown = showAll ? d.evidence : d.evidence.slice(0, 3);
  const percent = d.estimatedShare * 100;
  const display = percent > 0 && percent < 1 ? 1 : Math.round(percent);
  const width = Math.max(3, (d.estimatedShare / (maxShare || 1)) * 100);
  const panelId = `evidence-${d.id}`;

  return (
    <motion.li
      layout={!reduce}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className={`border-b border-line py-7 transition-opacity ${fit?.relevance === "low" ? "opacity-55" : ""}`}
    >
      <div className="grid grid-cols-[2rem_1fr] gap-x-4 md:grid-cols-[3rem_1fr_9rem] md:gap-x-6">
        <span className="font-display pt-1 text-2xl font-bold text-subtle/70 tabular-nums">{rank}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="t-h3 text-[1.6rem]">
              {d.name}
            </h3>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${sev.text}`}>
              <span className={`size-2 rounded-full ${sev.dot}`} />
              {sev.label}
            </span>
            {d.isDealbreaker && (
              <span className="rounded-full bg-coral/15 px-2.5 py-0.5 text-xs font-semibold text-coral-ink">Dealbreaker</span>
            )}
            <AnimatePresence>
              {fit && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RELEVANCE[fit.relevance].cls}`}
                >
                  {RELEVANCE[fit.relevance].label}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-1.5 max-w-2xl leading-relaxed text-subtle">{d.description}</p>
          {fit?.reason && <p className="mt-2 max-w-2xl text-ink">{fit.reason}</p>}

          <div className="mt-4 h-1.5 max-w-xl overflow-hidden rounded-full bg-surface-2">
            <motion.div
              className="h-full rounded-full"
              style={{ background: sev.bar }}
              initial={{ width: reduce ? `${width}%` : 0 }}
              whileInView={{ width: `${width}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          {d.timeframes.filter((t) => t.trim().split(/\s+/).length > 1).length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-subtle">Shows up</span>
              {d.timeframes.filter((t) => t.trim().split(/\s+/).length > 1).map((t) => (
                <span key={t} className="rounded-full bg-surface-2 px-2.5 py-1">{t}</span>
              ))}
            </div>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-ink hover:underline hover:underline-offset-4"
          >
            {open ? "Hide the reviews" : `Read the ${d.count} review${d.count === 1 ? "" : "s"} behind this`}
            <ChevronDown className={`size-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className="col-start-2 mt-4 md:col-start-3 md:row-start-1 md:mt-0 md:text-right">
          <p className="t-num text-5xl">
            <NumberTicker value={display} className="tracking-[-0.04em] text-ink" />
            <span className="text-3xl text-subtle">%</span>
          </p>
          <p className="mt-1 text-xs text-subtle">of buyers, from {d.count} review{d.count === 1 ? "" : "s"}</p>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="evidence"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden md:pl-[4.5rem]"
          >
            <ul className="mt-5 space-y-3">
              {shown.map((e) => (
                <EvidenceItem key={e.reviewId} e={e} />
              ))}
            </ul>
            {d.evidence.length > 3 && (
              <button onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm text-subtle hover:text-ink">
                {showAll ? "Show fewer" : `Show all ${d.evidence.length}`}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
