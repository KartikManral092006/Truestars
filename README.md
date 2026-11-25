# TrueStars

**Know what goes wrong before you buy.**

Live: **https://truestars.vercel.app**

A 4.4★ average hides the one problem that will ruin a purchase for you. TrueStars reads hundreds of reviews, finds the real dealbreakers, estimates how many buyers hit each one, and links every claim to the reviews behind it. Tell it how you will use the product and it sorts the problems by how much they matter to you.


## What it does

- **Dealbreakers.** Recurring problems grouped into themes, with severity, an estimate of how many buyers report each one, and when it tends to happen ("after 2 months").
- **Evidence for every claim.** Each theme opens into the reviews behind it, with the exact sentence highlighted.
- **Fits you.** Describe your situation ("it's a gift for my elderly parent") and problems are re-ranked as *matters to you*, *might matter*, or *probably not for you*, each with a one-line reason.
- **Can you trust the stars?** Checks you can verify yourself: bursts of 5★ reviews on one day, copy-paste wording, unverified praise, free-product disclosures, love-it-or-hate-it ratings, and empty 5★ reviews.
- **Ask the reviews.** Type any question ("Does it work on carpet?"). Every review is searched in your browser, and the answer is written only from the matching reviews, with each finding linked to them. If nobody mentions it, it says so.
- **Before your return window closes.** A checklist of things to test early, built from the problems buyers reported, plus a chart of when serious failures tend to show up.
- **Complaints hiding in 4 and 5 star reviews.** Problems that happy reviewers mention but that never pull the average down.
- **Accuracy you can check.** A hand-labelled comparison (precision, recall, Cohen's kappa) and the share of AI quotes that matched the review word for word, published at `/accuracy`.
- **Three ways in.** Sample products on the website, paste reviews from any site, or the Chrome extension, which reads the reviews on the page you are viewing.

## How it works

```
reviews ──► selection ──► /api/extract (LLM, 20 reviews per call) ──► quote check
                                                                    │
            stats (bursts, duplicates, …)                            ▼
                     │                           /api/themes (LLM groups labels)
                     ▼                                               │
                report builder (counts, weighted %, severity) ◄──────┘
                     │
                     ▼
               /api/fit (LLM, optional, on request)
```

1. **Selection.** Up to 100 informative reviews are read in depth: low-star reviews first (up to 65%), then the most detailed positive ones.
2. **Extraction.** An LLM reads each batch and returns, per review, short problem labels with severity, a timeframe and an exact quote, plus praise labels. Output is validated with zod. Any quote that does not appear in the review text is dropped.
3. **Grouping.** A second LLM call merges labels into at most 8 problem themes and 5 praise themes. Labels it invents are discarded.
4. **Counting is done in code, not by the AI.** Because negative reviews are over-sampled, each theme's share is re-weighted to the full rating mix (stratified by star rating), so the percentage estimates how many of *all* buyers report it.
5. **Patterns** are plain statistics over every review and need no AI.

## Responsible AI

- No mystery scores. Every number links to its evidence.
- No "AI-written" accusations. AI-text detectors are unreliable, so TrueStars only flags patterns a person can check.
- No invented quotes. The model must quote the review exactly, or the quote is dropped.
- Review text is treated as data. Prompts tell the model to ignore instructions inside reviews, and outputs are schema-validated.
- No scraping. The extension uses Chrome's `activeTab` permission: it can read nothing until you click it, and then only the tab you are on. Nothing is stored server-side.
- Limitation: people with problems are more likely to write reviews, so the percentages are signals, not guarantees. The report says so.

## Run it locally

Requirements: Node 20+, a free [Groq](https://console.groq.com) API key.

```bash
git clone https://github.com/KartikManral092006/Truestars.git
cd Truestars/web
cp .env.example .env.local      # then put your key in GROQ_API_KEY
npm install
npm run dev                     # http://localhost:3000
```

Pre-compute the three sample reports so they load instantly (uses your Groq quota once):

```bash
npm run precompute              # writes public/samples/*.report.json
```

### Chrome extension

1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, choose the `extension/` folder.
2. In the side panel footer, click **Server** to point it at your deployment (default `http://localhost:3000`).
3. Open an Amazon product, click **See more reviews**, then click the ★ toolbar button.

Supported pages: Amazon review lists, Google Maps reviews, any site with schema.org review data (JSON-LD or microdata), and any selected text.

## Deploy

The live site runs on Vercel and redeploys on every push to `main`.

- Root directory: `web`
- Environment variables: `GROQ_API_KEY`, `GROQ_EXTRACT_MODEL`, `GROQ_REASON_MODEL`, `NEXT_PUBLIC_SITE_URL`
- After changing the extension, rebuild `web/public/downloads/truestars-extension.zip`.

## Tech

Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui, Magic UI, Motion, GSAP (ScrollTrigger, SplitText), Lenis, React Three Fiber with a custom GLSL point shader, Groq (`openai/gpt-oss-20b` for extraction, `openai/gpt-oss-120b` for grouping, fit, checklist and answers; configurable in `.env.local`), zod, Chrome Manifest V3.

## Data

Sample products use real reviews from the Amazon Reviews 2023 dataset: Hou et al., *Bridging Language and Items for Retrieval and Recommendation* (2024), McAuley Lab, UC San Diego. Reviewer IDs are removed, and reviews duplicated across product variants are merged.
