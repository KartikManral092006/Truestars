"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

export function ScrollFX() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>("[data-reveal='lines']").forEach((el) => {
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "reveal-line",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.1,
              ease: "expo.out",
              stagger: 0.09,
              scrollTrigger: { trigger: el, start: "top 86%", once: true },
            }),
        });
      });

      gsap.set("[data-reveal='fade']", { autoAlpha: 0, y: 32 });
      ScrollTrigger.batch("[data-reveal='fade']", {
        start: "top 90%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.95, ease: "power3.out", stagger: 0.09, overwrite: true }),
      });

      gsap.set("[data-fill]", { scaleX: 0, transformOrigin: "left center" });
      ScrollTrigger.batch("[data-fill]", {
        start: "top 92%",
        once: true,
        onEnter: (batch) => gsap.to(batch, { scaleX: 1, duration: 1.3, ease: "expo.out", stagger: 0.12, delay: 0.15 }),
      });

      gsap.utils.toArray<HTMLElement>("[data-scale-in]").forEach((el) => {
        gsap.fromTo(
          el,
          { scale: 0.92, borderRadius: "3.5rem" },
          {
            scale: 1,
            borderRadius: "2rem",
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "top 35%", scrub: 0.6 },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
        const amount = parseFloat(el.dataset.parallax || "15");
        gsap.fromTo(
          el,
          { yPercent: -amount },
          {
            yPercent: amount,
            ease: "none",
            scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
    });

    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => mm.revert();
  });
  return null;
}
