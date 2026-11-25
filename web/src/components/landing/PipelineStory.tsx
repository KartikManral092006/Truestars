"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { BadgeCheck, ScanText, UserRound, MessagesSquare } from "lucide-react";
import { Stars } from "@/components/Stars";
import hero from "@/data/hero.json";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STEPS = [
  {
    icon: MessagesSquare,
    title: "Reviews come in",
    body: "From a sample product, text you paste, or the page you have open in Chrome.",
  },
  {
    icon: ScanText,
    title: "The AI reads",
    body: "A language model finds each concrete problem, how serious it is, and the exact sentence that says so.",
  },
  {
    icon: BadgeCheck,
    title: "Code checks and counts",
    body: "If the sentence is not word for word in the review, it is thrown out. Counting is done by code, never by the AI.",
  },
  {
    icon: UserRound,
    title: "You decide",
    body: "Say how you will use it, and each problem is marked as mattering to you or not.",
  },
];

export function PipelineStory() {
  const root = useRef<HTMLElement>(null);
  const story = hero.story;
  const [before, after] = story.text.split(story.quote);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const steps = q("[data-step]");
        gsap.set(steps.slice(1), { opacity: 0.32 });
        gsap.set(q("[data-stage]"), { autoAlpha: 0, y: 24 });
        gsap.set(q("[data-hl]"), { backgroundSize: "0% 100%" });
        gsap.set(q("[data-countbar]"), { scaleX: 0 });
        gsap.set(q("[data-rail]"), { scaleY: 0 });

        const tl = gsap.timeline({
          defaults: { ease: "power2.out", duration: 0.6 },
          scrollTrigger: {
            trigger: q("[data-pin]")[0],
            start: "top top",
            end: "+=260%",
            pin: true,
            scrub: 0.7,
            anticipatePin: 1,
          },
        });
        tl.to(q("[data-rail]"), { scaleY: 1, ease: "none", duration: 3 }, 0);
        const activate = (i: number, at: number) => {
          tl.to(steps[i], { opacity: 1 }, at).to(steps[i - 1], { opacity: 0.32 }, at);
        };
        activate(1, 0.4);
        tl.to(q("[data-hl]"), { backgroundSize: "100% 100%", duration: 0.7, ease: "none" }, 0.45)
          .to(q("[data-stage='read']"), { autoAlpha: 1, y: 0 }, 0.8);
        activate(2, 1.4);
        tl.to(q("[data-stage='check']"), { autoAlpha: 1, y: 0 }, 1.45).to(
          q("[data-countbar]"),
          { scaleX: 1, duration: 0.8, ease: "power2.inOut" },
          1.7,
        );
        activate(3, 2.4);
        tl.to(q("[data-stage='fit']"), { autoAlpha: 1, y: 0 }, 2.45).to({}, { duration: 0.6 }, 3);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section id="how" ref={root} className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 pt-28">
        <h2 data-reveal="lines" className="t-h2 max-w-2xl">
          The AI reads. The arithmetic stays honest.
        </h2>
        <p data-reveal="fade" className="t-lead mt-5">
          Follow one real one-star review through TrueStars.
        </p>
      </div>

      <div data-pin className="md:h-svh">
        <div className="mx-auto grid h-full max-w-6xl items-center gap-12 px-5 py-14 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-16 md:py-0">
          <ol className="relative space-y-8 pl-14">
            <span className="absolute top-2 bottom-2 left-[1.15rem] w-px bg-line" aria-hidden="true" />
            <span
              data-rail
              className="absolute top-2 bottom-2 left-[1.15rem] w-px origin-top bg-linear-to-b from-gold to-green"
              aria-hidden="true"
            />
            {STEPS.map((s, i) => (
              <li key={s.title} data-step className="relative">
                <span className="absolute top-0 -left-14 flex size-9 items-center justify-center rounded-full border border-line bg-canvas text-gold-ink">
                  <s.icon className="size-[1.1rem]" />
                </span>
                <p className="t-caption tabular-nums">Step {i + 1}</p>
                <h3 className="t-h3 mt-0.5">{s.title}</h3>
                <p className="t-small mt-1.5 max-w-sm text-subtle">{s.body}</p>
              </li>
            ))}
          </ol>

          <figure className="relative">
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-float md:p-8">
              <div className="flex items-center justify-between gap-3">
                <Stars value={story.rating} size={16} />
                <span className="t-caption">
                  {new Date(story.date).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </span>
              </div>
              <p className="t-h3 mt-4">{story.title}</p>
              <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink/90">
                {before}
                <span
                  data-hl
                  className="bg-no-repeat"
                  style={{
                    backgroundImage:
                      "linear-gradient(to bottom, rgb(255 214 102 / 0.45) 0, rgb(255 214 102 / 0.45) calc(100% - 2px), var(--gold) calc(100% - 2px), var(--gold) 100%)",
                    backgroundSize: "100% 100%",
                  }}
                >
                  {story.quote}
                </span>
                {after}
              </p>

              <div data-stage="read" className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
                <span className="t-caption mr-1">AI found</span>
                <span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold">Inconsistent readings</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ember/15 px-3 py-1 text-sm font-semibold text-ember-ink">
                  <span className="size-1.5 rounded-full bg-ember" /> Major
                </span>
              </div>

              <div data-stage="check" className="mt-4 space-y-3">
                <p className="flex items-center gap-2 text-sm text-green-ink">
                  <BadgeCheck className="size-4" /> Quote matches the review word for word
                </p>
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-subtle">Counted with every review that says the same</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div data-countbar className="h-full w-full origin-left rounded-full bg-ember" />
                  </div>
                </div>
              </div>

              <div data-stage="fit" className="mt-6 rounded-2xl border border-gold/30 bg-surface p-4">
                <p className="t-caption">You said</p>
                <p className="mt-1">“I weigh myself every morning to track a diet.”</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gold px-3 py-1 text-sm font-semibold text-ink">Matters to you</span>
                  <span className="text-sm text-subtle">Daily tracking needs readings you can trust.</span>
                </div>
              </div>
            </div>
            <figcaption className="t-caption mt-4">
              A real review from the bathroom-scale sample. The labels show how TrueStars handles it.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
