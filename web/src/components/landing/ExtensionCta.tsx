"use client";

import Link from "next/link";
import { Puzzle } from "lucide-react";
import Magnet from "@/components/bits/Magnet";
import RotatingText from "@/components/bits/RotatingText";
import StarBorder from "@/components/bits/StarBorder";

const SITES = ["Amazon", "Flipkart", "Google Maps", "shops that publish review data", "any review text you select"];

export function ExtensionCta() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-32">
      <div
        data-scale-in
        className="relative overflow-hidden rounded-[2rem] border border-line bg-surface px-8 py-16 shadow-card md:px-16 md:py-24"
      >
        <div
          data-parallax="18"
          className="pointer-events-none absolute -top-40 -right-32 size-[30rem] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--gold-soft), transparent 65%)" }}
        />
        <h2 data-reveal="lines" className="t-h2 relative max-w-xl">
          Get the report right next to the product.
        </h2>
        <p className="t-lead relative mt-6 flex flex-wrap items-baseline gap-x-2">
          <span>The Chrome extension works on</span>
          <RotatingText
            texts={SITES}
            rotationInterval={2600}
            staggerDuration={0.012}
            mainClassName="font-semibold text-ink"
            splitBy="words"
          />
        </p>
        <div className="relative mt-10">
          <Magnet magnetStrength={5} maxOffset={10} padding={60} wrapperClassName="inline-block">
            <StarBorder
              as={Link}
              href="/extension"
              theme="light"
              color="#e0a100"
              trailColor="#e5484d"
              radius={999}
              thickness={1.5}
              duration={5}
              backgroundColor="#0e1116"
              textColor="#ffffff"
              borderColor="rgba(14,17,22,0.15)"
              className="text-base font-semibold"
            >
              <span className="flex items-center gap-2 px-7 py-3.5">
                <Puzzle className="size-5" /> Install the extension
              </span>
            </StarBorder>
          </Magnet>
        </div>
      </div>
    </section>
  );
}
