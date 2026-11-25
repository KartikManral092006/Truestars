import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SiteHeader } from "@/components/SiteHeader";
import type { EvalResults } from "@/lib/eval";

export const metadata: Metadata = { title: "How accurate is TrueStars?" };

function load(): EvalResults | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "public", "eval", "results.json"), "utf8"));
  } catch {
    return null;
  }
}

const pctText = (v: number) => `${Math.round(v * 100)}%`;

function Metric({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="border-t border-line pt-5">
      <p className="t-num text-6xl">
        {value}
      </p>
      <p className="mt-3 font-semibold">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-subtle">{detail}</p>
    </div>
  );
}

export default function AccuracyPage() {
  const r = load();
  const o = r?.overall;
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-6xl px-5 pt-10 pb-28">
        <h1
          className="t-h1 max-w-3xl"
        >
          How accurate is TrueStars?
        </h1>
        <p className="t-lead mt-6 max-w-2xl">
          We check the AI against a person. For each sample product, a human reads 40 reviews and marks whether each one
          describes a concrete problem. Then we compare that with what TrueStars found.
        </p>

        {o ? (
          <>
            <div className="mt-14 grid gap-10 md:grid-cols-4">
              <Metric
                value={pctText(o.quotesProposed ? o.quotesGrounded / o.quotesProposed : 0)}
                label="Quotes found word for word"
                detail={`${o.quotesGrounded} of ${o.quotesProposed} quotes the AI gave matched the review exactly. The rest were thrown out before you saw them.`}
              />
              <Metric
                value={pctText(o.precision)}
                label="Precision"
                detail="When TrueStars says a review reports a problem, how often the person agreed."
              />
              <Metric
                value={pctText(o.recall)}
                label="Recall"
                detail="Of the reviews the person marked as reporting a problem, how many TrueStars caught."
              />
              <Metric
                value={o.kappa.toFixed(2)}
                label="Agreement beyond chance"
                detail="Cohen's kappa. 0 means no better than chance, 1 means perfect agreement. Above 0.6 is usually called substantial."
              />
            </div>

            <div className="mt-16 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <caption className="sr-only">Results per product</caption>
                <thead className="text-subtle">
                  <tr className="border-b border-line">
                    <th className="py-3 font-medium">Product</th>
                    <th className="py-3 font-medium">Reviews labelled</th>
                    <th className="py-3 font-medium">Precision</th>
                    <th className="py-3 font-medium">Recall</th>
                    <th className="py-3 font-medium">Kappa</th>
                    <th className="py-3 font-medium">Quotes exact</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {r!.products.map((p) => (
                    <tr key={p.slug} className="border-b border-line">
                      <td className="max-w-xs py-3 pr-4">
                        <span className="line-clamp-1">{p.title}</span>
                      </td>
                      <td className="py-3">{p.labelled}</td>
                      <td className="py-3">{pctText(p.precision)}</td>
                      <td className="py-3">{pctText(p.recall)}</td>
                      <td className="py-3">{p.kappa.toFixed(2)}</td>
                      <td className="py-3">{p.quotesProposed ? pctText(p.quotesGrounded / p.quotesProposed) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="mt-14 max-w-2xl rounded-2xl border border-line bg-surface p-6 leading-relaxed text-subtle">
            The hand-labelled check has not been run yet, so there are no numbers to show. We would rather show nothing than
            show numbers we have not measured.
          </p>
        )}

        <section className="mt-20 grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="t-h3">
              What this does and does not show
            </h2>
            <ul className="mt-4 space-y-3 leading-relaxed text-subtle">
              <li>It measures whether TrueStars spots that a review reports a problem. It does not check every theme name.</li>
              <li>
                {r ? `Labels were made by ${r.labeller}, one person.` : "Labels are made by one person."} A second labeller would
                make the result stronger.
              </li>
              <li>Three products and 40 reviews each is a small sample. Treat the numbers as a sanity check, not a benchmark.</li>
            </ul>
          </div>
          <div>
            <h2 className="t-h3">Check any report yourself</h2>
            <p className="mt-4 leading-relaxed text-subtle">
              You never have to take a number on trust. Every problem in a report opens to the reviews behind it, with the
              exact sentence highlighted, so you can judge for yourself.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
