import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LabelClient } from "./LabelClient";

export const metadata: Metadata = { title: "Label reviews", robots: { index: false } };

async function WithParams({ searchParams }: { searchParams: PageProps<"/label">["searchParams"] }) {
  const p = await searchParams;
  const slug = Array.isArray(p.sample) ? p.sample[0] : p.sample;
  return <LabelClient slug={slug && /^[a-z0-9-]+$/.test(slug) ? slug : "bathroom-scale"} />;
}

export default function LabelPage({ searchParams }: PageProps<"/label">) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense fallback={null}>
      <WithParams searchParams={searchParams} />
    </Suspense>
  );
}
