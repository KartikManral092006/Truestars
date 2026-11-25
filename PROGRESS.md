# TrueStars progress

Hackathon: SLAY HACKS 2026 (Devpost). Deadline **2026-12-08 03:30 IST**. Needs a deployed demo, GitHub repo, screenshots, and a 2–4 min video.

## Done (2026-11-25)

- `web/`: Next.js 16 app. Landing page, `/analyze` (sample, paste, embed modes), `/extension` install page.
- Engine: `src/lib/stats.ts` (pattern checks), `src/lib/report.ts` (selection, weighted shares, report), `src/lib/analyze.ts` (client orchestration), `src/lib/parse.ts` (paste parser).
- API: `/api/extract`, `/api/themes`, `/api/fit` (Groq, zod-validated, quote grounding, per-IP rate limit).
- Samples: 3 real Amazon products in `web/public/samples/` (scale, white-noise machine, facial massager), de-duplicated.
- Pattern checks verified on samples: fixed false positives (variant duplicates, the word "ad" matching "read").
- `extension/`: MV3 side panel, `activeTab` only. Extractors for Amazon, Google Maps, JSON-LD, microdata, and selected text.
- `npm run build` passes, and tsc and eslint are clean.

## UI redesign (2026-11-25)

- Design: "Every star is a review". Observatory indigo #101735, starlight gold #FFC940 (ratings), signal coral #FF6B5B (dealbreakers), aurora mint #4FE3B5 (trust), mist #A9B3DA. Bricolage Grotesque (display, wdth axis) + Hanken Grotesk.
- Hero: React Three Fiber shader of 1,120 real review points (src/components/hero). Star → rating histogram → cluster of the 264 one/two-star reviews, driven by GSAP ScrollTrigger + Lenis. SplitText headline reveal. Paused off-screen, reduced-motion fallback.
- shadcn/ui (radix, Tailwind v4) + Magic UI (number-ticker, animated-beam, marquee). Motion for layout re-ordering on "fits you", evidence expand, the reading progress dots.
- Report rebuilt as src/components/report/* with the new tokens. NOT yet visually checked with real data (needs the Groq key).
- Sample product images are stored locally in public/samples/img.

## Features round 2 (2026-11-25)

- Ask the reviews: `src/lib/search.ts` (BM25, ~1 ms over 1,120 reviews), `src/lib/ask.ts` (LLM keyword expansion via /api/ask/terms, rating-balanced top 25), `/api/ask` (answers only from given reviews, ids and quotes validated, "not mentioned" fallback). UI `components/report/AskPanel.tsx`.
- Lifespan: `src/lib/lifespan.ts` parses timeframes ("after a couple of months" = 60 days), tested on 20 phrasings. Chart + caveat in `report/AfterYouBuy.tsx`.
- First-week checklist: `/api/checklist`, generated after themes; ticks saved in localStorage; copy button.
- Complaints hiding in 4 and 5 star reviews (from extractions, no extra AI call).
- Quote-grounding stats recorded per run and shown in the method note.
- Accuracy: `/label` (dev only) labelling tool, 40 seeded reviews per product, downloads `eval/labels/<slug>.json`; `npm run eval` scores precision/recall/kappa (maths verified) into `public/eval/results.json`; `/accuracy` page shows "not run yet" until then.
- NOTE: the dev server's file watcher sometimes misses edits; restart it (`rm -rf .next`) if pages look stale.

## Polish round (2026-11-25)

- Type system: `t-display / t-h1 / t-h2 / t-h3 / t-lead / t-body / t-small / t-caption / t-num` utilities in globals.css. Body 17px/1.65, balanced headings, pretty paragraphs, tabular numerals. No more per-file font sizes.
- `components/motion/ScrollFX.tsx`: attribute-driven scroll effects (`data-reveal="lines"` SplitText mask reveal, `data-reveal="fade"` batched, `data-fill` bars, `data-parallax`). Rendered last on the page. Reduced motion respected via gsap.matchMedia.
- `ScrollProgress` gold bar; header hides on scroll down, frosted after the hero.
- `landing/PipelineStory.tsx` replaces HowItWorks: pinned (desktop) story of real review r28 through read → check → count → fit. Highlight is a background-size sweep so it wraps on mobile. Mobile/reduced motion shows the end state.
- Quote marquee skews and speeds up with scroll velocity (WAAPI playbackRate).
- Report: sticky section nav with sliding active pill, section titles reveal on scroll.

## Light redesign + real data (2026-11-25)

- Theme: clean light. Tokens in globals.css (canvas, surface, ink, subtle, line, gold for stars only, coral problems, green verified). Font: Instrument Sans (wdth axis for display). Old dark token names were renamed everywhere.
- Groq: llama models were retired; now openai/gpt-oss-20b (extract) and gpt-oss-120b (reason) with reasoning_effort low.
- Real sample reports generated (`npm run precompute`, then `npm run rebuild` re-groups with the stricter theme prompt). Scale: "Biggest risk: unreliable weight readings, ~27%", 111/114 quotes grounded.
- New landing sections: Aceternity ContainerScroll with live ReportPreview (real data, `npm run preview` writes src/data/preview.json), Magic UI MagicCard bento (FeatureBento), DotPattern hero background. 21st.dev registry needs a paid login, so components come from the free original registries (Magic UI, Aceternity).
- Fixed: double-rounded averages (3.85 shown as 3.9; real 3.848 = 3.8), duplicate id="ask", headline grammar, one-off themes hidden, lifespan counts major+critical.
- Known limitation: Ask quotes are verified, but the AI's claim about a quote can still misread it (seen once with a negation). Prompt tightened; not re-tested yet.
- Groq calls used so far: about 34.

## Production round (2026-11-25)

- React Bits (src/components/bits, vendored): ScrollReveal (Statement section), CountUp (ProofBand with real aggregate stats from preview.json), Magnet (hero + CTA buttons), StarBorder (extension CTA), RotatingText (supported sites). Lint rules react-hooks/refs and set-state-in-effect relaxed for bits/ only.
- GSAP: new `data-scale-in` scrubbed effect; Lenis unchanged.
- Production: metadata + title template, OG image (app/opengraph-image.tsx), robots, sitemap, manifest, 404, error boundary (Next 16 uses `retry`), skip link + main landmarks, security headers (frame-ancestors allows chrome-extension: only on /analyze), no X-Powered-By, API 1 MB body limit, next/image, outputFileTracingIncludes for sample reports (needed on Vercel).
- Accessibility: text-only colours coral-ink / ember-ink / green-ink (all >= 4.5:1).
- Performance: 3D sky rewritten in plain three.js (R3F removed, 906 KB -> 530 KB), starts after idle, 30 fps when settled, time-based intro. Sample reports server-rendered (report LCP 4.1 s -> 1.4 s).
- Lighthouse (prod build, headless, software WebGL): home 83-87 / 96 / 100 / 100, report 99 / 100 / 100 / 100. Home a11y 96 is the ScrollReveal words at 12% opacity before reveal (full text is in aria-label).
- RTK shell hook rewrites `next start`; run `node node_modules/next/dist/bin/next start -p 3001` instead.
- Deploy: set NEXT_PUBLIC_SITE_URL to the real domain (sitemap, OG URLs).

## Next

1. Add the Groq key to `web/.env.local`, run the samples live, and check report quality.
2. `npm run precompute` to bake the sample reports (now includes checklist, lifespan, extractions).
2b. Label 40 reviews per product at /label, save to web/eval/labels/, run `npm run eval`.
3. Test the extension on a real Amazon page.
4. Push to GitHub, deploy to Vercel (set `GROQ_API_KEY`, `NEXT_PUBLIC_REPO_URL`), and set the extension's default server URL in `extension/config.js`.
5. Evaluation: hand-label dealbreakers on ~10 products and compare. Measure quote-grounding rate.
6. Devpost write-up, screenshots, demo video.
