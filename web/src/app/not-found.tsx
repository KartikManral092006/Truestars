import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-24">
        <p className="t-num text-[clamp(5rem,14vw,10rem)] text-surface-2">404</p>
        <h1 className="t-h1 mt-4 max-w-2xl">This page has no reviews. Or anything else.</h1>
        <p className="t-lead mt-5">The link may be old or mistyped. Try one of the sample reports instead.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Button asChild size="lg" className="h-12 rounded-full px-6 text-base font-semibold">
            <Link href="/">Go to the home page</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6 text-base">
            <Link href="/analyze?sample=bathroom-scale">Open a sample report</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
