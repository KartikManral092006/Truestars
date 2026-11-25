import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Chrome extension" };

const code = "rounded bg-surface-2 px-1.5 py-0.5 text-ink";

export default function ExtensionPage() {
  const steps = [
    {
      t: "Download TrueStars",
      d: (
        <>
          <a className="font-semibold text-gold-ink underline underline-offset-4" href="/downloads/truestars-extension.zip" download>
            Download the extension
          </a>{" "}
          and unzip it.
        </>
      ),
    },
    {
      t: "Add it to Chrome",
      d: (
        <>
          Open <code className={code}>chrome://extensions</code>, turn on Developer mode in the top right, click Load unpacked, and
          choose the unzipped folder. Pin the gold star to your toolbar.
        </>
      ),
    },
    {
      t: "Open some reviews",
      d: (
        <>
          Open a product&apos;s reviews on Amazon, Flipkart, eBay, Google Maps or most other shops so they load (on Amazon, click See
          more reviews). If a page isn&apos;t recognised, select the review text first.
        </>
      ),
    },
    {
      t: "Click the gold star",
      d: <>A side panel opens with the dealbreakers, how often they happen, and the reviews behind each one.</>,
    },
  ];
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="main" className="mx-auto grid w-full max-w-6xl flex-1 gap-14 px-5 pt-10 pb-28 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <h1
            className="t-h1"
          >
            The report, right next to the product.
          </h1>
          <p className="t-lead mt-6">
            The extension cannot read any website until you click it. Then it reads only the reviews already loaded in that tab.
          </p>
          <p className="mt-6 text-sm text-subtle">
            TrueStars is not in the Chrome Web Store yet, so for now it takes two extra steps to add. It works the same way.
          </p>
          <p className="mt-3 text-sm text-subtle">
            No extension?{" "}
            <Link href="/analyze?mode=paste" className="text-gold-ink underline underline-offset-4">
              Paste reviews
            </Link>{" "}
            from any site instead.
          </p>
        </div>
        <ol className="border-t border-line">
          {steps.map((s, i) => (
            <li key={s.t} className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-line py-6">
              <span className="font-display text-3xl leading-none font-extrabold text-gold-ink tabular-nums">{i + 1}</span>
              <div>
                <p className="t-h3">
                  {s.t}
                </p>
                <p className="mt-1.5 leading-relaxed text-subtle">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
