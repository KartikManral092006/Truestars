"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Marquee } from "@/components/ui/marquee";
import hero from "@/data/hero.json";

gsap.registerPlugin(ScrollTrigger, useGSAP);

function Quote({ text, product }: { text: string; product: string }) {
  return (
    <figure className="w-[22rem] shrink-0 rounded-2xl border border-line bg-surface/80 p-6">
      <blockquote className="text-[1.0625rem] leading-snug text-ink">“{text}”</blockquote>
      <figcaption className="t-caption mt-4 flex items-center gap-2">
        <span className="text-coral-ink" aria-label="1 star">★</span>
        One-star review of the {product.toLowerCase()}
      </figcaption>
    </figure>
  );
}

export function QuoteMarquee() {
  const strip = useRef<HTMLDivElement>(null);
  const half = Math.ceil(hero.quotes.length / 2);
  const rows = [hero.quotes.slice(0, half), hero.quotes.slice(half)];

  useGSAP(
    () => {
      const el = strip.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const skew = gsap.quickTo(el, "skewX", { duration: 0.5, ease: "power3" });
        let rate = 1;
        let cached: Animation[] = [];
        const anims = () => {
          if (!cached.length) cached = el.getAnimations({ subtree: true });
          return cached;
        };
        const st = ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            const v = self.getVelocity();
            skew(gsap.utils.clamp(-7, 7, v / -260));
            rate = 1 + Math.min(Math.abs(v) / 700, 4);
          },
        });
        let applied = 1;
        const tick = () => {
          rate += (1 - rate) * 0.06;
          if (Math.abs(rate - applied) < 0.01) return;
          applied = rate;
          for (const a of anims()) a.playbackRate = rate;
        };
        gsap.ticker.add(tick);
        return () => {
          st.kill();
          gsap.ticker.remove(tick);
        };
      });
      return () => mm.revert();
    },
    { scope: strip },
  );

  return (
    <section className="py-28" aria-labelledby="quotes-heading">
      <div className="mx-auto max-w-6xl px-5">
        <h2 id="quotes-heading" data-reveal="lines" className="t-h2 max-w-2xl">
          None of this shows up in the star average.
        </h2>
        <p data-reveal="fade" className="t-lead mt-5">
          Real sentences from one-star reviews of the sample products.
        </p>
      </div>
      <div className="relative mt-14 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div ref={strip} className="will-change-transform">
          <Marquee pauseOnHover repeat={2} className="[--duration:70s] [--gap:1.25rem]">
            {rows[0].map((q) => (
              <Quote key={q.text} {...q} />
            ))}
          </Marquee>
          <Marquee pauseOnHover reverse repeat={2} className="mt-3 [--duration:80s] [--gap:1.25rem]">
            {rows[1].map((q) => (
              <Quote key={q.text} {...q} />
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
