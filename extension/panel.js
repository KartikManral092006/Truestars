const statusEl = document.getElementById("status");
const frame = document.getElementById("app");
let currentTabId = null;
let lastRunAt = 0;
let pending = null;

function showStatus(title, hint) {
  frame.hidden = true;
  statusEl.hidden = false;
  statusEl.innerHTML = "";
  const t = document.createElement("p");
  t.className = "title";
  t.textContent = title;
  statusEl.appendChild(t);
  if (hint) {
    const h = document.createElement("p");
    h.className = "hint";
    h.textContent = hint;
    statusEl.appendChild(h);
  }
}

async function startAnalysis(entry) {
  const appUrl = await getAppUrl();
  pending = { entry, origin: new URL(appUrl).origin };
  statusEl.hidden = true;
  frame.hidden = false;
  frame.src = `${appUrl}/analyze?embed=1&t=${entry.at}`;
}

window.addEventListener("message", (event) => {
  if (!pending || event.source !== frame.contentWindow || event.origin !== pending.origin) return;
  if (event.data?.type !== "truestars:ready") return;
  frame.contentWindow.postMessage(
    { type: "truestars:reviews", reviews: pending.entry.reviews, product: pending.entry.product },
    pending.origin,
  );
});

async function render(entry) {
  if (!entry) return;
  if (entry.status === "reading") return showStatus("Reading reviews on this page…");
  if (entry.status === "error") return showStatus("Can't read this page", entry.error);
  if (entry.status !== "ready" || entry.at === lastRunAt) return;
  lastRunAt = entry.at;
  if (!entry.reviews?.length) {
    return showStatus(
      "No reviews found on this page",
      "Open the product's reviews (on Amazon: “See more reviews”), scroll so they load, then click TrueStars again. Or select review text on the page first.",
    );
  }
  if (entry.reviews.length < 3) {
    return showStatus("Only " + entry.reviews.length + " review(s) found", "Load more reviews on the page, then click TrueStars again.");
  }
  startAnalysis(entry);
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab?.id ?? null;
  if (currentTabId == null) return;
  const key = `tab:${currentTabId}`;
  const stored = await chrome.storage.session.get(key);
  render(stored[key]);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "session" && changes[key]) render(changes[key].newValue);
  });
}

document.getElementById("settings").addEventListener("click", async () => {
  const current = await getAppUrl();
  const next = prompt("TrueStars server URL", current);
  if (!next) return;
  try {
    const url = new URL(next);
    await chrome.storage.local.set({ appUrl: url.origin });
  } catch {
    alert("That doesn't look like a valid URL.");
  }
});

init();
