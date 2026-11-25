"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Copy } from "lucide-react";
import type { ChecklistItem, Dealbreaker, HiddenComplaint, Lifespan } from "@/lib/types";
import { Stars } from "@/components/Stars";

export function LifespanChart({ lifespan }: { lifespan: Lifespan }) {
  const reduce = useReducedMotion();
  const max = Math.max(...lifespan.buckets.map((b) => b.count)) || 1;
  return (
    <div>
      <p className="t-h3">
        Half the serious problems buyers describe show up{" "}
        {lifespan.medianLabel === "On arrival" ? "on arrival" : `by the ${lifespan.medianLabel.toLowerCase()} mark`}.
      </p>
      <ul className="mt-6 space-y-2.5">
        {lifespan.buckets.map((b) => {
          const median = b.label === lifespan.medianLabel;
          return (
            <li key={b.label} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
              <span className={median ? "font-semibold text-ink" : "text-subtle"}>{b.label}</span>
              <div className="h-3 overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  className={`h-full rounded-full ${median ? "bg-coral" : "bg-ember/70"}`}
                  initial={{ width: reduce ? `${(b.count / max) * 100}%` : 0 }}
                  whileInView={{ width: `${(b.count / max) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="text-right text-subtle tabular-nums">{b.count}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-subtle">
        Based on {lifespan.samples} reviews that say when a serious problem started. Products that keep working rarely get a
        review saying so, so this shows when failures happen, not how likely they are.
      </p>
    </div>
  );
}

function storageKey(product: string) {
  let h = 0;
  for (const c of product) h = (h * 31 + c.charCodeAt(0)) | 0;
  return `truestars:checklist:${h}`;
}

export function Checklist({
  items,
  dealbreakers,
  product,
}: {
  items: ChecklistItem[];
  dealbreakers: Dealbreaker[];
  product: string;
}) {
  const key = storageKey(product);
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(key) ?? "{}");
    } catch {
      return {};
    }
  });
  const [copied, setCopied] = useState(false);
  const names = Object.fromEntries(dealbreakers.map((d) => [d.id, d.name]));

  function toggle(id: string) {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  async function copy() {
    const text = items.map((i) => `[ ] ${i.when}: ${i.action}`).join("\n");
    try {
      await navigator.clipboard.writeText(`Things to test early${product ? ` (${product})` : ""}\n${text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div>
      <ul className="space-y-2">
        {items.map((it) => {
          const checked = !!done[it.dealbreakerId];
          return (
            <li key={it.dealbreakerId}>
              <label
                className={`flex cursor-pointer gap-4 rounded-xl border p-4 transition-colors ${checked ? "border-green/40 bg-green/5" : "border-line bg-surface hover:border-gold/40"}`}
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(it.dealbreakerId)} className="peer sr-only" />
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold ${checked ? "border-green bg-green text-ink" : "border-subtle/50"}`}
                  aria-hidden="true"
                >
                  {checked && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="text-xs font-semibold text-gold-ink">{it.when}</span>
                  <span className={`mt-0.5 block font-medium ${checked ? "text-subtle line-through" : ""}`}>{it.action}</span>
                  <span className="mt-1 block text-sm text-subtle">
                    {it.why}
                    {names[it.dealbreakerId] ? ` (${names[it.dealbreakerId]})` : ""}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <button onClick={copy} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-ink hover:underline hover:underline-offset-4">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy the checklist"}
      </button>
    </div>
  );
}

export function HiddenComplaints({ items }: { items: HiddenComplaint[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((h) => (
        <li key={h.reviewId} className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <Stars value={h.rating} size={13} />
            <span className="text-xs text-ember-ink">{h.label}</span>
          </div>
          <p className="mt-3 leading-relaxed">“{h.quote}”</p>
        </li>
      ))}
    </ul>
  );
}
