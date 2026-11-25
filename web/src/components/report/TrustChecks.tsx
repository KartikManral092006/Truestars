"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Info, ShieldCheck } from "lucide-react";
import type { PatternFlag, Praise, Review } from "@/lib/types";
import { Stars } from "@/components/Stars";
import { formatMonth } from "./Evidence";
import { pct } from "@/lib/report";

function Check({ p, reviews }: { p: PatternFlag; reviews: Record<string, Review> }) {
  const [open, setOpen] = useState(false);
  const list = p.reviewIds.map((id) => reviews[id]).filter(Boolean).slice(0, 12);
  const warn = p.level === "warning";
  return (
    <li className="border-b border-line py-5 first:pt-0">
      <div className="flex gap-3">
        {warn ? (
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-ember-ink" aria-label="Warning" />
        ) : (
          <Info className="mt-0.5 size-5 shrink-0 text-subtle" aria-label="Note" />
        )}
        <div className="min-w-0">
          <p className="font-semibold">{p.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-subtle">{p.detail}</p>
          {list.length > 0 && (
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="mt-2 text-sm font-semibold text-gold-ink hover:underline hover:underline-offset-4"
            >
              {open ? "Hide the reviews" : `See the ${p.reviewIds.length} reviews`}
            </button>
          )}
          <AnimatePresence initial={false}>
            {open && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mt-3 space-y-2 overflow-hidden"
              >
                {list.map((r) => (
                  <li key={r.id} className="rounded-xl border border-line bg-surface p-3 text-sm">
                    <div className="mb-1 flex flex-wrap items-center gap-x-3 text-xs text-subtle">
                      <Stars value={r.rating} size={12} />
                      {formatMonth(r.date)}
                      {r.verified === false && <span>Not a verified purchase</span>}
                    </div>
                    <p className="line-clamp-4 whitespace-pre-line">{r.title ? `${r.title}. ` : ""}{r.text}</p>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </li>
  );
}

export function TrustChecks({ patterns, reviews }: { patterns: PatternFlag[]; reviews: Record<string, Review> }) {
  if (!patterns.length) {
    return (
      <div className="flex gap-3 text-subtle">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-green-ink" />
        <p>No review bursts, copy-paste wording, or free-product disclosures found.</p>
      </div>
    );
  }
  return (
    <ul>
      {patterns.map((p, i) => (
        <Check key={`${p.kind}-${i}`} p={p} reviews={reviews} />
      ))}
    </ul>
  );
}

export function PraiseList({ praises }: { praises: Praise[] }) {
  if (!praises.length) return <p className="text-subtle">No specific praise came up in the reviews we read.</p>;
  const max = Math.max(...praises.map((p) => p.estimatedShare)) || 1;
  return (
    <ul>
      {praises.map((p) => (
        <li key={p.id} className="border-b border-line py-5 first:pt-0">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-semibold">{p.name}</p>
            <span className="shrink-0 text-sm text-green-ink tabular-nums">{pct(p.estimatedShare)}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-subtle">{p.description}</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2">
            <motion.div
              className="h-full rounded-full bg-green"
              initial={{ width: 0 }}
              whileInView={{ width: `${(p.estimatedShare / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
