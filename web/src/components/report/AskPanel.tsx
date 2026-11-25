"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Loader2 } from "lucide-react";
import { askReviews } from "@/lib/ask";
import type { AskAnswer, Review } from "@/lib/types";
import { Stars } from "@/components/Stars";
import { snippet } from "./Evidence";

const SUGGESTIONS = ["How long does it last?", "Is it easy to set up?", "Is it worth the price?", "Is it good for daily use?"];

const STANCE = {
  yes: { label: "Mostly yes", cls: "bg-green/15 text-green-ink" },
  no: { label: "Mostly no", cls: "bg-coral/15 text-coral-ink" },
  mixed: { label: "Reviewers disagree", cls: "bg-ember/15 text-ember-ink" },
  not_mentioned: { label: "Not mentioned", cls: "bg-surface-2 text-subtle" },
} as const;

function Point({ claim, quote, ids, reviews }: { claim: string; quote: string | null; ids: string[]; reviews: Record<string, Review> }) {
  const [open, setOpen] = useState(false);
  const list = ids.map((id) => reviews[id]).filter(Boolean);
  return (
    <li className="border-t border-line py-4">
      <p className="leading-relaxed">{claim}</p>
      {quote && <p className="mt-2 border-l-2 border-gold pl-3 text-sm text-subtle italic">“{quote}”</p>}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-2 text-sm font-semibold text-gold-ink hover:underline hover:underline-offset-4"
      >
        {open ? "Hide" : `${list.length} review${list.length === 1 ? " says" : "s say"} this`}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 space-y-2 overflow-hidden"
          >
            {list.map((r) => {
              const s = snippet(r.text, quote, 140);
              return (
                <li key={r.id} className="rounded-xl border border-line bg-surface p-3 text-sm">
                  <Stars value={r.rating} size={12} />
                  <p className="mt-1 leading-relaxed">
                    {s.before}
                    {s.match && <mark>{s.match}</mark>}
                    {s.after}
                  </p>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

export function AskPanel({ reviews }: { reviews: Record<string, Review> }) {
  const list = useMemo(() => Object.values(reviews), [reviews]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AskAnswer[]>([]);
  const reduce = useReducedMotion();

  async function ask(q: string) {
    const text = q.trim();
    if (text.length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const a = await askReviews(text, list);
      setAnswers((prev) => [a, ...prev].slice(0, 6));
      setQuestion("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-5 focus-within:border-gold/70"
      >
        <label htmlFor="ask-input" className="sr-only">Ask the reviews a question</label>
        <input
          id="ask-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={300}
          placeholder="Does it work on carpet? Is it loud at night?"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-subtle/70"
        />
        <button
          type="submit"
          disabled={busy || question.trim().length < 3}
          aria-label="Ask"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-opacity disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            disabled={busy}
            className="rounded-full border border-line px-3 py-1 text-xs text-subtle transition-colors hover:border-gold/60 hover:text-ink disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-coral-ink" role="alert">{error}</p>}

      <ul className="mt-8 space-y-5" aria-live="polite">
        <AnimatePresence initial={false}>
          {answers.map((a) => (
            <motion.li
              key={a.question + a.answer}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-line bg-surface p-5 md:p-6"
            >
              <div className="flex flex-wrap items-center gap-3">
                <p className="t-h3">
                  {a.question}
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STANCE[a.stance].cls}`}>
                  {STANCE[a.stance].label}
                </span>
              </div>
              <p className="mt-3 max-w-2xl leading-relaxed text-ink/90">{a.answer}</p>
              {a.points.length > 0 && (
                <ul className="mt-4">
                  {a.points.map((p) => (
                    <Point key={p.claim} claim={p.claim} quote={p.quote} ids={p.reviewIds} reviews={reviews} />
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-subtle">
                Searched all {a.searched.toLocaleString()} reviews. Answers only use what reviewers wrote.
              </p>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
