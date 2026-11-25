"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    gsap.fromTo(
      bar.current,
      { scaleX: 0 },
      { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } },
    );
  });
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px]" aria-hidden="true">
      <div ref={bar} className="h-full origin-left bg-linear-to-r from-gold via-gold to-green" />
    </div>
  );
}
