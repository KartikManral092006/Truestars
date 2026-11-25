import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/hero/Hero";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { PipelineStory } from "@/components/landing/PipelineStory";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { ProofBand } from "@/components/landing/ProofBand";
import { Statement } from "@/components/landing/Statement";
import { ExtensionCta } from "@/components/landing/ExtensionCta";
import { ReportPreview } from "@/components/landing/ReportPreview";
import preview from "@/data/preview.json";
import { QuoteMarquee } from "@/components/landing/QuoteMarquee";
import { LogoMark } from "@/components/Logo";
import { ScrollFX } from "@/components/motion/ScrollFX";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { SiteHeader } from "@/components/SiteHeader";
import { SmoothScroll } from "@/components/SmoothScroll";
import samples from "../../public/samples/index.json";

const QUESTION: Record<string, string> = {
  "bathroom-scale": "A best-seller at 3.8★. Can you trust the numbers it shows?",
  "white-noise-machine": "A cult favourite at 4.5★. Is there a catch?",
  "facial-massager": "A cheap gadget at 3.1★. Where does it go wrong?",
};

const SHORT_NAME: Record<string, string> = {
  "bathroom-scale": "Utopia digital bathroom scale",
  "white-noise-machine": "Marpac Dohm white-noise machine",
  "facial-massager": "ChiTronic 5-in-1 facial massager",
};

const RATING_COLORS = ["var(--coral)", "var(--ember)", "var(--subtle)", "#f5c84c", "var(--gold)"];

const PRINCIPLES = [
  ["Every number has receipts", "Open any problem and read the reviews it came from, with the exact sentence highlighted."],
  ["No “written by AI” guesses", "AI-text detectors are unreliable. We only flag patterns you can verify: review bursts, copy-paste wording, free-product disclosures."],
  ["Nothing is scraped", "The extension can read nothing until you click it, and then only the reviews already loaded in that tab. Nothing is stored afterwards."],
  ["Quotes are checked, not trusted", "If the AI cannot point to a word-for-word sentence in the review, its quote is dropped."],
];

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <ScrollProgress />
      <SiteHeader fixed />
      <main id="main" className="flex-1">
        <Hero />
        <ProductPreview>
          <ReportPreview />
        </ProductPreview>
        <ProofBand />

        <section id="try" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 pt-32 pb-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <h2 data-reveal="lines" className="t-h2 max-w-2xl">
              Pick a product. See what its reviews really say.
            </h2>
            <p data-reveal="fade" className="t-caption max-w-xs md:text-right">
              Real Amazon reviews, analysed by TrueStars.
            </p>
          </div>
          <ul className="mt-14 border-t border-line">
            {samples.map((s) => {
              const total = s.hist.reduce((a, b) => a + b, 0) || 1;
              return (
                <li key={s.slug} data-reveal="fade" className="border-b border-line">
                  <Link
                    href={`/analyze?sample=${s.slug}`}
                    className="group grid grid-cols-[4.5rem_1fr] items-center gap-x-5 gap-y-4 py-7 transition-colors md:grid-cols-[6.5rem_1.35fr_1fr_auto] md:gap-x-10 md:px-4 md:hover:bg-surface/50"
                  >
                    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-white p-2.5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-2 group-hover:scale-[1.05]">
                      <Image src={s.image ?? ""} alt="" width={160} height={160} sizes="104px" className="max-h-full w-auto object-contain" />
                    </div>
                    <div>
                      <h3 className="t-h3">{SHORT_NAME[s.slug] ?? s.title}</h3>
                      <p className="t-small mt-1.5 text-subtle">{QUESTION[s.slug]}</p>
                      {(preview.products as Record<string, { tone: string; text: string }>)[s.slug] && (
                        <p className="t-small mt-2 flex items-start gap-2 font-medium text-ink">
                          <span
                            className={`mt-[0.45rem] size-2 shrink-0 rounded-full ${(preview.products as Record<string, { tone: string }>)[s.slug].tone === "danger" ? "bg-coral" : (preview.products as Record<string, { tone: string }>)[s.slug].tone === "caution" ? "bg-ember" : "bg-green"}`}
                          />
                          {(preview.products as Record<string, { text: string }>)[s.slug].text}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <div
                        className="flex h-2 overflow-hidden rounded-full bg-surface-2"
                        role="img"
                        aria-label={`${s.avg.toFixed(1)} star average from ${s.count} reviews`}
                      >
                        <div data-fill className="flex w-full">
                          {[1, 2, 3, 4, 5].map((st) => (
                            <span key={st} style={{ width: `${(s.hist[st - 1] / total) * 100}%`, background: RATING_COLORS[st - 1] }} />
                          ))}
                        </div>
                      </div>
                      <p className="t-caption mt-2.5 tabular-nums">
                        {s.avg.toFixed(1)}★ average from {s.count.toLocaleString()} reviews
                      </p>
                    </div>
                    <span className="col-span-2 inline-flex h-11 items-center justify-center rounded-full border border-line px-6 text-[0.9375rem] font-semibold transition-[background-color,border-color,color] duration-300 group-hover:border-ink group-hover:bg-ink group-hover:text-white md:col-span-1">
                      See the report
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <Statement />
        <FeatureBento />
        <PipelineStory />
        <QuoteMarquee />

        <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-32 md:grid-cols-[1fr_1.3fr] md:gap-16">
          <div>
            <h2 data-reveal="lines" className="t-h2">
              Built so you can check our work.
            </h2>
          </div>
          <dl className="border-t border-line">
            {PRINCIPLES.map(([t, d]) => (
              <div key={t} data-reveal="fade" className="grid gap-1 border-b border-line py-6 md:grid-cols-[13rem_1fr] md:gap-8">
                <dt className="font-semibold">{t}</dt>
                <dd className="t-small text-subtle">{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        <ExtensionCta />
      </main>

      <footer className="overflow-hidden border-t border-line">
        <div className="mx-auto max-w-6xl px-5 pt-16">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div className="max-w-sm">
              <LogoMark size={28} />
              <p className="t-small mt-4 text-subtle">Know what goes wrong before you buy.</p>
            </div>
            <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-[0.9375rem]" aria-label="Footer">
              <Link href="/analyze?mode=paste" className="text-subtle hover:text-ink">Paste reviews</Link>
              <Link href="/extension" className="text-subtle hover:text-ink">Chrome extension</Link>
              <Link href="/#how" className="text-subtle hover:text-ink">How it works</Link>
            </nav>
          </div>
          <p
            data-reveal="lines"
            aria-hidden="true"
            className="font-display mt-16 bg-linear-to-b from-ink/90 to-ink/0 bg-clip-text text-center text-[clamp(4.5rem,19vw,17rem)] leading-[0.82] font-extrabold tracking-[-0.022em] text-transparent select-none"
            style={{ fontVariationSettings: "'wdth' 80" }}
          >
            TrueStars
          </p>
          <p className="t-caption border-t border-line py-6">
            © TrueStars. Sample reviews from the public Amazon Reviews 2023 dataset by McAuley Lab, UC San Diego.
          </p>
        </div>
      </footer>
      <ScrollFX />
    </>
  );
}
