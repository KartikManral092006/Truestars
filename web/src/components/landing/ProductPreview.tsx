"use client";

import type { ReactNode } from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

export function ProductPreview({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="preview-heading" className="overflow-hidden">
      <ContainerScroll
        titleComponent={
          <div className="px-5">
            <h2 id="preview-heading" className="t-h1 mx-auto max-w-3xl">
              One report. The whole story behind the stars.
            </h2>
            <p className="t-lead mx-auto mt-5 mb-16 max-w-xl">
              This is the real TrueStars report for the bathroom scale, generated from its 1,120 Amazon reviews.
            </p>
          </div>
        }
      >
        {children}
      </ContainerScroll>
    </section>
  );
}
