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

  const OUT_OF_5 =
    /(\d(?:[.,]\d+)?)\s*(?:out of|of|\/|von|sur|de|su|van|z|из|na|en|中|のうち|점 만점에)\s*(?:5|five)\b/i;
  const RATED = /(?:rated|rating|note|bewertung|valoración|avaliação|valutazione|оценка|評価)\D{0,12}(\d(?:[.,]\d+)?)/i;
  const VERIFIED =
    /verified (purchase|buyer|owner|user|reviewer)|certified buyer|achat vérifié|verifizierter kauf|compra verificada|acquisto verificato|подтвержденная покупка|購入者|구매 인증/i;
  const UI_LINE =
    /^(helpful|report|reply|share|like|read more|see more|show more|more|less|translate|was this review helpful|yes|no|\d+ people found this helpful|\(\d+\)|\d+)$/i;
  const DATE_PATTERNS = [
    /\b(\d{4})-(\d{2})-(\d{2})\b/,
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i,
    /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?,?\s+\d{4}\b/i,

    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*,?\s+\d{4}\b/i,
  ];

  function toIsoDate(s) {
    const d = new Date(s);
    if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return undefined;
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
  }

  function numericDate(l) {
    const m = l.match(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/);
    if (!m) return undefined;
    let [a, b] = [Number(m[1]), Number(m[2])];
    const usStyle = (document.documentElement.lang || "").toLowerCase() === "en-us";
    let day = usStyle ? b : a;
    let month = usStyle ? a : b;
    if (a > 12) [day, month] = [a, b];
    else if (b > 12) [day, month] = [b, a];
    if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
    return new Date(Date.UTC(Number(m[3]), month - 1, day)).toISOString().slice(0, 10);
  }

  function findDate(lines) {
    for (const l of lines) {
      const numeric = numericDate(l);
      if (numeric) return numeric;
      for (const re of DATE_PATTERNS) {
        const m = l.match(re);
        if (m) {
          const iso = toIsoDate(m[0].replace(/,/g, ""));
          if (iso) return iso;
        }
      }
      const rel = l.match(/(\d+)\s+(day|week|month|year)s?\s+ago/i);
      if (rel) {
        const d = new Date();
        const n = Number(rel[1]);
        if (/day/i.test(rel[2])) d.setDate(d.getDate() - n);
        else if (/week/i.test(rel[2])) d.setDate(d.getDate() - 7 * n);
        else if (/month/i.test(rel[2])) d.setMonth(d.getMonth() - n);
        else d.setFullYear(d.getFullYear() - n);
        return d.toISOString().slice(0, 10);
      }
    }
    return undefined;
  }

  function ratingOf(el) {
    for (const attr of ["aria-label", "title", "alt", "data-rating", "data-score", "data-value", "content"]) {
      const v = el.getAttribute && el.getAttribute(attr);
      if (!v) continue;
      const m = v.match(OUT_OF_5) || v.match(RATED);
      if (m) {
        const r = parseFloat(m[1].replace(",", "."));
        if (r >= 0 && r <= 5) return r;
      }
      if (/^(data-rating|data-score|data-value|content)$/.test(attr) && /^\d(?:[.,]\d+)?$/.test(v.trim())) {
        const r = parseFloat(v.replace(",", "."));
        if (r >= 0.5 && r <= 5 && /rat|star|score/i.test(`${el.className} ${el.getAttribute("itemprop") || ""}`)) return r;
      }
    }
    const now = el.getAttribute && el.getAttribute("aria-valuenow");
    if (now && (el.getAttribute("aria-valuemax") || "5") === "5") {
      const r = parseFloat(now);
      if (r >= 0 && r <= 5) return r;
    }
    const cls = typeof el.className === "string" ? el.className : "";
    if (/star|rating/i.test(cls)) {
      const w = el.style && el.style.width;
      if (w && /%$/.test(w)) {
        const r = Math.round((parseFloat(w) / 20) * 2) / 2;
        if (r >= 0.5 && r <= 5) return r;
      }
      const own = (el.textContent || "").trim();
      if (own.length <= 12) {
        const m = own.match(OUT_OF_5) || own.match(/^(\d(?:[.,]\d)?)\s*★?$/) || null;
        if (m) {
          const r = parseFloat(m[1].replace(",", "."));
          if (r >= 0.5 && r <= 5) return r;
        }
        const filled = (own.match(/★/g) || []).length;
        if (filled && /^[★☆\s]+$/.test(own)) return filled;
      }
      const icons = el.querySelectorAll('[class*="full"], [class*="filled"], [class*="active"], [class*="-on"]');
      if (icons.length >= 1 && icons.length <= 5 && el.children.length === 5) return icons.length;
    }
    if (el.childElementCount >= 1 && el.childElementCount <= 3) {
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent)
        .join("")
        .trim();
      if (/^[1-5](?:[.,]\d)?$/.test(own)) {
        const icon = el.querySelector("svg, img, i, [class*='star' i]");
        const label = icon
          ? `${icon.getAttribute("class") || ""} ${icon.getAttribute("alt") || ""} ${icon.getAttribute("aria-label") || ""} ${icon.querySelector("title")?.textContent || ""} ${icon.textContent || ""}`
          : "";
        if (/star|★/i.test(label)) return parseFloat(own.replace(",", "."));
      }
    }
    return null;
  }

  function cardFor(el) {
    let n = el.parentElement;
    for (let i = 0; i < 9 && n && n !== document.body; i++, n = n.parentElement) {
      const t = (n.innerText || "").trim();
      if (t.length > 6000) return null;
      if (t.length >= 40 && t.split("\n").some((l) => l.trim().length >= 25)) return n;
    }
    return null;
  }

  function signature(el) {
    const cls = (typeof el.className === "string" ? el.className : "")
      .split(/\s+/)
      .filter((c) => c && !/\d{3,}/.test(c))
      .sort()
      .join(".");
    return `${el.tagName}|${cls}|${el.parentElement ? el.parentElement.tagName : ""}`;
  }

  function generic() {
    const found = [];
    for (const el of document.querySelectorAll("body *")) {
      if (found.length > 3000) break;
      const r = ratingOf(el);
      if (r == null) continue;
      const card = cardFor(el);
      if (card) found.push({ card, rating: r, indicator: el });
    }
    const byCard = new Map();
    for (const f of found) if (!byCard.has(f.card)) byCard.set(f.card, f);
    let entries = [...byCard.values()];
    entries = entries.filter((e) => !entries.some((o) => o !== e && e.card.contains(o.card)));
    const groups = new Map();
    for (const e of entries) {
      const key = signature(e.card);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    }
    const PRICE = /(?:[$€£¥₹]|rs\.?|inr|usd|eur|aed|sar|r\$|mxn)\s?\d|\d\s?(?:[€₫₽]|zł|kr|lei)/i;
    const isProductTile = (card) => {
      const t = card.innerText || "";
      const link = card.closest("a[href]") || card.querySelector("a[href]");
      const linkText = link ? (link.innerText || "").trim().length : 0;
      return PRICE.test(t) || (linkText > 0 && linkText >= t.trim().length * 0.6);
    };
    const looksLikeReview = (card) => {
      const lines = (card.innerText || "").split("\n").map((l) => l.trim());
      return (
        VERIFIED.test(card.innerText) ||
        /helpful|report|reviewed|review by|ago\b/i.test(card.innerText) ||
        !!findDate(lines) ||
        lines.some((l) => l.length >= 60)
      );
    };
    const ranked = [...groups.values()]
      .filter((g) => g.length >= 2)
      .filter((g) => g.filter((e) => isProductTile(e.card)).length <= g.length * 0.3)
      .filter((g) => g.filter((e) => looksLikeReview(e.card)).length >= g.length * 0.6)
      .sort((a, b) => b.length - a.length);
    const best = ranked[0] || [];
    if (best.length < 2) return { site: "This page", product: { title: document.title }, reviews: [] };

    const reviews = [];
    for (const { card, rating, indicator } of best) {
      const ratingText = (indicator.innerText || "").trim();
      const lines = card.innerText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && l !== ratingText && !UI_LINE.test(l) && !OUT_OF_5.test(l));
      if (!lines.length) continue;
      const date = findDate(lines);
      const blocks = [];
      card.querySelectorAll("*").forEach((el) => {
        if (indicator.contains(el)) return;
        const t = (el.textContent || "").trim();
        if (t.length < 3 || UI_LINE.test(t) || OUT_OF_5.test(t)) return;
        if (t.length < 80 && (VERIFIED.test(t) || /\bago\b/i.test(t) || findDate([t]) && t.length < 30)) return;
        if ([...el.children].some((k) => (k.textContent || "").trim().length >= t.length * 0.5)) return;
        blocks.push({ el, t: clean(el.innerText || t) });
      });
      const strip = (t) => t.replace(/(\.\.\.|…)?\s*(read more|see more|show more|more)$/i, "").trim();
      const bodyBlock = blocks.reduce((a, b) => (strip(b.t).length > strip(a?.t || "").length ? b : a), null);
      const body = bodyBlock ? strip(bodyBlock.t) : lines.reduce((a, b) => (b.length > a.length ? b : a), "");
      if (body.length < 3) continue;
      const heading = card.querySelector("h2, h3, h4, h5, [class*='title' i]");
      let title = heading && !heading.contains(bodyBlock?.el) ? clean(heading.innerText) : "";
      if (!title || title === body || title.length > 150) {
        const before = bodyBlock ? blocks.slice(0, blocks.indexOf(bodyBlock)).reverse() : [];
        const prev = before.find((b) => b.t.length >= 3 && b.t.length <= 160 && !findDate([b.t]) && !VERIFIED.test(b.t));
        title = prev ? prev.t.replace(/^["“]|["”]$/g, "") : "";
      }
      const titleStem = (title || "").replace(/(\.\.\.|…)$/, "").trim();
      const titleRepeatsBody = titleStem.length > 15 && body.startsWith(titleStem);
      reviews.push({
        rating,
        title: title && title !== body && !titleRepeatsBody ? title : undefined,
        text: body,
        date,
        verified: VERIFIED.test(card.innerText),
      });
    }
    return { site: location.hostname.replace(/^www\./, "") || "This page", product: { title: document.title }, reviews };
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

  const run = (fn) => {
    try {
      return fn();
    } catch {
      return { site: "", product: { title: document.title }, reviews: [] };
    }
  };
  const most = (list) => list.sort((a, b) => b.reviews.length - a.reviews.length)[0];

  const picked = run(selection);
  const dedicated = most([run(amazon), run(flipkart), run(googleMaps)]);
  const structured = most([run(jsonLd), run(microdata)]);
  let chosen;
  if (picked.reviews.length >= 3) chosen = picked;
  else if (dedicated.reviews.length >= 2) chosen = dedicated;
  else if (structured.reviews.length >= 3) chosen = structured;
  else {
    const fallback = run(generic);
    chosen = most([fallback, structured, dedicated]);
  }

  return {
    site: chosen.site,
    product: { ...chosen.product, url: location.href, source: chosen.site || location.hostname },
    reviews: chosen.reviews.slice(0, MAX_REVIEWS).map((r, i) => ({ id: `r${i + 1}`, ...r, text: r.text.slice(0, 3000) })),
  };
})();
