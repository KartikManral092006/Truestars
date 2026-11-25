"use client";

import ScrollReveal from "@/components/bits/ScrollReveal";
import preview from "@/data/preview.json";

export function Statement() {
  const top = preview.dealbreakers[0];
  const share = Math.round(top.share * 100);
  const avg = preview.avg?.toFixed(1);
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-36" aria-label="Why star ratings are not enough">
      <ScrollReveal
        effect="fade"
        enableBlur
        blurStrength={6}
        baseOpacity={0.12}
        baseRotation={0}
        stagger={0.04}
        textClassName="t-h2 max-w-4xl text-ink !leading-[1.12]"
        containerClassName="!my-0"
        rotationEnd="bottom center"
        wordAnimationEnd="bottom 55%"
      >
        {`A ${avg}-star average says nothing about the ${share}% of buyers who report ${top.name.toLowerCase()}. TrueStars tells you before you pay, and shows you the reviews that prove it.`}
      </ScrollReveal>
    </section>
  );
}
