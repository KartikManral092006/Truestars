"use client";

import CountUp from "@/components/bits/CountUp";
import preview from "@/data/preview.json";

export function ProofBand() {
  const s = preview.stats;
  const grounded = s.proposed ? Math.round((s.grounded / s.proposed) * 100) : 0;
  const items = [
    { value: s.reviews, suffix: "", label: "real Amazon reviews behind the three sample reports" },
    { value: s.analysed, suffix: "", label: "reviews read in depth by the AI, critical ones first" },
    {
      value: grounded,
      suffix: "%",
      label: `of AI quotes matched the review word for word (${s.grounded} of ${s.proposed}). The rest were dropped.`,
    },
    { value: s.problems, suffix: "", label: "recurring problems found that no star average shows" },
  ];
  return (
    <section className="border-y border-line bg-sunk" aria-label="TrueStars in numbers">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 px-5 md:grid-cols-4">
        {items.map((it, i) => (
          <div
            key={it.label}
            data-reveal="fade"
            className={`py-12 pr-6 ${i % 2 === 1 ? "pl-6 md:pl-8" : ""} ${i > 0 ? "md:border-l md:border-line md:pl-8" : ""} ${i === 1 ? "border-l border-line" : ""} ${i === 3 ? "border-l border-line md:border-l" : ""} ${i >= 2 ? "border-t border-line md:border-t-0" : ""}`}
          >
            <dt className="sr-only">{it.label}</dt>
            <dd>
              <span className="t-num block text-[clamp(2.6rem,5vw,4rem)]">
                <CountUp to={it.value} separator="," duration={1.6} suffix={it.suffix} />
              </span>
              <span className="t-small mt-3 block max-w-[15rem] text-subtle">{it.label}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
