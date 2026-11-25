(() => {
  const MAX_REVIEWS = 1000;
  const clean = (s) => (s || "").replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  const text = (root, sel) => clean(root.querySelector(sel)?.innerText);

  function parseDate(raw) {
    if (!raw) return undefined;
    const onPart = raw.includes(" on ") ? raw.split(" on ").pop() : raw;
    const d = new Date(onPart);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
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
    nodes.forEach((n) => {
      const body = text(n, '[data-hook="review-body"]');
      if (!body) return;
      const ratingRaw =
        n.querySelector('[data-hook="review-star-rating"], [data-hook="cmps-review-star-rating"]')?.textContent;
      const titleEl = n.querySelector('[data-hook="review-title"]');
      const titleSpans = titleEl ? titleEl.querySelectorAll("span") : [];
      const title = clean(titleSpans.length ? titleSpans[titleSpans.length - 1].innerText : titleEl?.innerText);
      reviews.push({
        rating: parseRating(ratingRaw),
        title: title || undefined,
        text: body.replace(/\s*Read more\s*$/i, ""),
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

  const candidates = [];
  for (const fn of [selection, amazon, googleMaps, jsonLd, microdata]) {
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
