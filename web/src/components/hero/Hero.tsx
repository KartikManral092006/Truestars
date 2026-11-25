"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "motion/react";
import Magnet from "@/components/bits/Magnet";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/ui/dot-pattern";
import hero from "@/data/hero.json";
import type { SkyProgress } from "./StarSky";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const StarSky = dynamic(() => import("./StarSky"), { ssr: false });

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const RATING_COLORS = ["var(--coral)", "var(--ember)", "var(--subtle)", "#f5c84c", "var(--gold)"];

export function Hero() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef<SkyProgress>({ t1: 0, t2: 0 });
  const reduce = useReducedMotion() ?? false;
  const [showSky, setShowSky] = useState(false);

  useEffect(() => {
    let idle = 0;
    const start = () => setShowSky(true);
    const t = setTimeout(() => {
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(start, { timeout: 1500 });
      else start();
    }, 700);
    return () => {
      clearTimeout(t);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, []);
  const [one, two, , , five] = hero.hist;
  const total = hero.ratings.length;
  const low = one + two;
  const cell = reduce ? "" : "col-start-1 row-start-1";
  const hidden = reduce ? "" : "invisible opacity-0";

  useGSAP(
    () => {
      const q = gsap.utils.selector(section);
      if (reduce) {
        gsap.set(q("[data-panel]"), { autoAlpha: 1, y: 0 });
        return;
      }
      SplitText.create(q("[data-headline]")[0], {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, { yPercent: 115, duration: 1.15, ease: "expo.out", stagger: 0.09, delay: 0.2 }),
      });
      gsap.from(q("[data-intro]"), { autoAlpha: 0, y: 18, duration: 0.9, ease: "power3.out", stagger: 0.1, delay: 0.75 });

      const panels = q("[data-panel]");
      gsap.set(panels.slice(1), { autoAlpha: 0, y: 60 });
      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: {
          trigger: section.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: (self) => {
            const p = self.progress * 10;
            progress.current.t1 = clamp01((p - 2) / 2);
            progress.current.t2 = clamp01((p - 6) / 2);
          },
        },
      });
      tl.to(panels[0], { autoAlpha: 0, y: -60, duration: 1 }, 2)
        .to(panels[1], { autoAlpha: 1, y: 0, duration: 1 }, 3)
        .to(panels[1], { autoAlpha: 0, y: -60, duration: 1 }, 6)
        .to(panels[2], { autoAlpha: 1, y: 0, duration: 1 }, 7)
        .to(q("[data-cue]"), { autoAlpha: 0, duration: 0.5 }, 0.3)
        .to({}, { duration: 2 }, 8);
    },
    { scope: section, dependencies: [reduce] },
  );

  return (
    <section ref={section} className={reduce ? "relative" : "relative h-[360svh]"}>
      <div className={reduce ? "relative min-h-svh" : "sticky top-0 h-svh overflow-hidden"}>
        <DotPattern
          width={22}
          height={22}
          cr={1}
          className="text-line-strong [mask-image:radial-gradient(60%_60%_at_68%_45%,black,transparent)]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-canvas to-transparent" />
        {showSky && <StarSky ratings={hero.ratings} progress={progress} reduceMotion={reduce} />}

        <div className={reduce ? "relative mx-auto flex max-w-6xl flex-col gap-28 px-5 py-28" : "relative mx-auto grid h-full max-w-6xl items-end px-5 pb-14 md:items-center md:pb-0"}>
          <div data-panel className={`${cell} max-w-xl`}>
            <h1
              data-headline
              className="t-display"
            >
              Star ratings are averages. Averages hide things.
            </h1>
            <p data-intro className="t-lead mt-7 max-w-md">
              TrueStars reads every review and tells you what actually goes wrong, how often it happens, and whether it
              matters to you.
            </p>
            <div data-intro className="mt-8 flex flex-wrap gap-3">
              <Magnet magnetStrength={5} maxOffset={8} padding={50} wrapperClassName="inline-block">
                <Button asChild size="lg" className="h-12 rounded-full px-6 text-base font-semibold">
                  <a href="#try">Analyse a real product</a>
                </Button>
              </Magnet>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full bg-canvas/70 px-6 text-base backdrop-blur">
                <Link href="/analyze?mode=paste">Paste reviews</Link>
              </Button>
            </div>
            <p data-intro className="t-caption mt-10 max-w-sm">
              Each dot is one of {total.toLocaleString()} real reviews of a digital bathroom scale rated{" "}
              {hero.avg.toFixed(1)}★ on Amazon.
            </p>
          </div>

          <div data-panel className={`${cell} ${hidden} max-w-lg`}>
            <h2
              className="t-h1"
            >
              {hero.avg.toFixed(1)} stars is a split, not a consensus.
            </h2>
            <p className="t-lead mt-6">
              {five.toLocaleString()} buyers gave it five stars. {one} gave it one. The average describes almost nobody.
            </p>
            <ul className="mt-6 space-y-1.5 text-sm tabular-nums">
              {[5, 4, 3, 2, 1].map((s) => (
                <li key={s} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: RATING_COLORS[s - 1] }} />
                  <span className="w-8 text-subtle">{s}★</span>
                  <span>{hero.hist[s - 1].toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>

          <div data-panel className={`${cell} ${hidden} max-w-lg`}>
            <h2
              className="t-h1"
            >
              So we read what the unhappy {low} said.
            </h2>
            <p className="t-lead mt-6">
              Their reviews are grouped into the problems they describe, counted, and linked back to the exact sentence,
              so you can check every claim yourself.
            </p>
            <Button asChild size="lg" className="mt-8 h-12 rounded-full px-6 text-base font-semibold">
              <Link href={`/analyze?sample=${hero.slug}`}>Open the full report</Link>
            </Button>
          </div>
        </div>

        {!reduce && (
          <div data-cue className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs text-subtle md:flex">
            Scroll to see what the stars hide
            <span className="h-10 w-px animate-pulse bg-linear-to-b from-ink/60 to-transparent" />
          </div>
        )}
      </div>
    </section>
  );
}
