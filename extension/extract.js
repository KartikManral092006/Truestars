(async () => {
  const MAX_REVIEWS = 1000;
  const clean = (s) => (s || "").replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  const text = (root, sel) => clean(root.querySelector(sel)?.innerText);

  function parseDate(raw) {
    if (!raw) return undefined;
    const onPart = raw.includes(" on ") ? raw.split(" on ").pop() : raw;
    const d = new Date(onPart);
    if (Number.isNaN(d.getTime())) return undefined;
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
  }

  function parseRating(raw) {
    if (raw == null) return null;
    const m = String(raw).replace(",", ".").match(/(\d+(?:\.\d+)?)/);
    if (!m) return null;
    const v = parseFloat(m[1]);
    return v >= 0 && v <= 5 ? v : null;
  }

  function amazon() {
    const nodes = document.querySelectorAll('[data-hook="review"]');
    const reviews = [];
    const full = (el) => clean((el?.textContent || "").replace(/\s+/g, " "));
    nodes.forEach((n) => {
      const bodyEl =
        n.querySelector('[data-hook="reviewRichContentContainer"]') ||
        n.querySelector('[data-hook="review-body"]') ||
        n.querySelector('[data-hook="reviewText"]');
      const body = full(bodyEl).replace(/\s*(Read more|See more|See less)\s*$/i, "");
      if (!body) return;
      const ratingRaw = n.querySelector(
        '[data-hook="review-star-rating"], [data-hook="cmps-review-star-rating"], [data-hook*="star-rating"]',
      )?.textContent;
      const titleEl = n.querySelector('[data-hook="reviewTitle"], [data-hook="review-title"]');
      const titleSpans = titleEl ? titleEl.querySelectorAll("span") : [];
      const rawTitle = titleSpans.length ? titleSpans[titleSpans.length - 1].textContent : titleEl?.textContent;
      const title = clean((rawTitle || "").replace(/\d(\.\d)? out of 5 stars/i, ""));
      reviews.push({
        rating: parseRating(ratingRaw),
        title: title || undefined,
        text: body,
        date: parseDate(text(n, '[data-hook="review-date"]')),
        verified: !!n.querySelector('[data-hook="avp-badge"], [data-hook="avp-badge-linkless"]'),
        author: text(n, ".a-profile-name") || undefined,
      });
    });
    const title =
      text(document, "#productTitle") || text(document, '[data-hook="product-link"]') || document.title;
    return { site: "Amazon", product: { title }, reviews };
  }

  function walkJsonLd(node, out, product) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach((x) => walkJsonLd(x, out, product));
    const type = [].concat(node["@type"] || []).join(" ");
    if (/Product|LocalBusiness|Restaurant|Hotel|SoftwareApplication|Book|Movie/i.test(type) && node.name && !product.title) {
      product.title = String(node.name);
    }
    if (/\bReview\b/.test(type) && (node.reviewBody || node.description)) {
      const rr = node.reviewRating || {};
      const best = parseFloat(rr.bestRating) || 5;
      const value = parseFloat(rr.ratingValue);
      out.push({
        rating: Number.isFinite(value) ? Math.round((value / best) * 5 * 10) / 10 : null,
        title: node.name ? String(node.name) : undefined,
        text: clean(String(node.reviewBody || node.description)),
        date: parseDate(node.datePublished),
        author: typeof node.author === "string" ? node.author : node.author?.name,
      });
    }
    for (const k of Object.keys(node)) if (k !== "@context") walkJsonLd(node[k], out, product);
  }

  function jsonLd() {
    const reviews = [];
    const product = {};
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try {
        walkJsonLd(JSON.parse(s.textContent), reviews, product);
      } catch {}
    });
    return { site: "Structured data", product: { title: product.title || document.title }, reviews };
  }

  function microdata() {
    const reviews = [];
    document.querySelectorAll('[itemtype*="schema.org/Review"]').forEach((n) => {
      const body = text(n, '[itemprop="reviewBody"]') || text(n, '[itemprop="description"]');
      if (!body) return;
      const ratingEl = n.querySelector('[itemprop="ratingValue"]');
      reviews.push({
        rating: parseRating(ratingEl?.getAttribute("content") ?? ratingEl?.textContent),
        title: text(n, '[itemprop="name"]') || undefined,
        text: body,
        date: parseDate(n.querySelector('[itemprop="datePublished"]')?.getAttribute("content") ?? undefined),
      });
    });
    return { site: "Structured data", product: { title: document.title }, reviews };
  }

  function googleMaps() {
    const reviews = [];
    const seen = new Set();
    document.querySelectorAll("div[data-review-id]").forEach((n) => {
      const id = n.getAttribute("data-review-id");
      if (seen.has(id)) return;
      const body = clean(n.querySelector(".wiI7pd")?.innerText);
      if (!body) return;
      seen.add(id);
      const starEl = n.querySelector('[role="img"][aria-label*="star"]');
      reviews.push({
        rating: parseRating(starEl?.getAttribute("aria-label")),
        text: body,
        author: n.getAttribute("aria-label") || undefined,
      });
    });
    const title = text(document, "h1") || document.title;
    return { site: "Google Maps", product: { title }, reviews };
  }

  const RATING_LINE = /^([1-5])(?:\.\d)?\s*★?$/;
  const CARD_MARKER = /^(Helpful for \d+|Verified Purchase|Certified Buyer)/;
  const BOUNDARY = /^(,|Helpful for \d+|Verified Purchase|Certified Buyer|\d+\s+(day|days|month|months|year|years)\s+ago|·)/i;

  function flipkartCards() {
    const markers = [...document.querySelectorAll("body *")].filter(
      (e) => e.childElementCount === 0 && CARD_MARKER.test((e.textContent || "").trim()),
    );
    const cards = new Set();
    for (const leaf of markers) {
      let n = leaf.parentElement;
      for (let i = 0; i < 14 && n; i++, n = n.parentElement) {
        const t = (n.innerText || "").trim();
        if (t.length > 20 && RATING_LINE.test(t.split("\n")[0].trim())) {
          cards.add(n);
          break;
        }
      }
    }
    const list = [...cards];
    return list.filter((c) => !list.some((o) => o !== c && c.contains(o)));
  }

  function flipkartDate(lines) {
    for (const l of lines) {
      let m = l.match(/\b([A-Z][a-z]{2}),?\s*(\d{4})\b/);
      if (m) {
        const month = "JanFebMarAprMayJunJulAugSepOctNovDec".indexOf(m[1]) / 3;
        if (Number.isInteger(month) && month >= 0) return new Date(Date.UTC(Number(m[2]), month, 1)).toISOString().slice(0, 10);
      }
      m = l.match(/(\d+)\s+(day|month|year)s?\s+ago/i);
      if (m) {
        const d = new Date();
        const n = Number(m[1]);
        if (/day/i.test(m[2])) d.setDate(d.getDate() - n);
        else if (/month/i.test(m[2])) d.setMonth(d.getMonth() - n);
        else d.setFullYear(d.getFullYear() - n);
        return d.toISOString().slice(0, 10);
      }
    }
    return undefined;
  }

  function flipkart() {
    const empty = { site: "Flipkart", product: { title: document.title }, reviews: [] };
    if (!/flipkart\./i.test(location.hostname) && !/Flipkart/.test(document.title)) return empty;
    const reviews = [];
    for (const card of flipkartCards()) {
      const lines = card.innerText.split("\n").map((s) => s.trim()).filter((s) => s && s !== "•");
      const rating = parseRating(lines[0]);
      let i = 1;
      const title = lines[i] && !BOUNDARY.test(lines[i]) ? lines[i++] : undefined;
      if (lines[i] && /^Review for:/i.test(lines[i])) i++;
      let b = i;
      while (b < lines.length && !BOUNDARY.test(lines[b])) b++;
      const bodyEnd = b - 1 > i ? b - 1 : b;
      const body = lines
        .slice(i, bodyEnd)
        .join("\n")
        .replace(/(\.\.\.|…)?\s*(more|READ MORE)$/i, "")
        .trim();
      const textValue = body || title || "";
      if (textValue.length < 3) continue;
      reviews.push({
        rating,
        title: body ? title : undefined,
        text: textValue,
        date: flipkartDate(lines),
        verified: lines.some((l) => /Verified Purchase|Certified Buyer/i.test(l)),
      });
    }
    const heading = clean(document.querySelector("h1")?.innerText) || document.title;
    return { site: "Flipkart", product: { title: heading.split(" Reviews:")[0] }, reviews };
  }

  async function expandTruncated() {
    if (!/flipkart\./i.test(location.hostname)) return;
    const buttons = [...document.querySelectorAll("body *")].filter(
      (e) => e.childElementCount === 0 && /^(more|READ MORE|Read more)$/.test((e.textContent || "").trim()),
    );
    for (const b of buttons.slice(0, 60)) {
      try {
        b.click();
      } catch {}
    }
    if (buttons.length) await new Promise((r) => setTimeout(r, 500));
  }

  function selection() {
    const sel = clean(window.getSelection()?.toString());
    if (!sel || sel.length < 40) return { site: "Selection", product: { title: document.title }, reviews: [] };
    const reviews = sel
      .split(/\n\s*\n+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 15)
      .map((t) => ({ rating: null, text: t }));
    return { site: "Selected text", product: { title: document.title }, reviews };
  }

  await expandTruncated();

  const candidates = [];
  for (const fn of [selection, amazon, flipkart, googleMaps, jsonLd, microdata]) {
    try {
      candidates.push(fn());
    } catch {}
  }
  const best = candidates.sort((a, b) => b.reviews.length - a.reviews.length)[0] || {
    site: "",
    product: { title: document.title },
    reviews: [],
  };
  const selectionWins = candidates.find((c) => c.site === "Selected text" && c.reviews.length >= 3);
  const chosen = selectionWins || best;

  return {
    site: chosen.site,
    product: { ...chosen.product, url: location.href, source: chosen.site || location.hostname },
    reviews: chosen.reviews.slice(0, MAX_REVIEWS).map((r, i) => ({ id: `r${i + 1}`, ...r, text: r.text.slice(0, 3000) })),
  };
})();
