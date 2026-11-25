"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-24">
      <h1 className="t-h1 max-w-2xl">Something on this page stopped working.</h1>
      <p className="t-lead mt-5">
        Your reviews were not sent anywhere new. Try again, and if it keeps happening, reload the page.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Button onClick={() => retry()} size="lg" className="h-12 rounded-full px-6 text-base font-semibold">
          Try again
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6 text-base">
          <Link href="/">Go to the home page</Link>
        </Button>
      </div>
    </main>
  );
}
