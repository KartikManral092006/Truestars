chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
  readReviews(tab);
});

async function readReviews(tab) {
  const key = `tab:${tab.id}`;
  await chrome.storage.session.set({ [key]: { status: "reading", at: Date.now() } });
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["extract.js"],
    });
    const data = result?.result ?? { reviews: [], product: {} };
    await chrome.storage.session.set({
      [key]: { status: "ready", at: Date.now(), url: tab.url, ...data },
    });
  } catch {
    await chrome.storage.session.set({
      [key]: {
        status: "error",
        at: Date.now(),
        error: "TrueStars can't read this page. Browser pages and the Chrome Web Store are off-limits to extensions.",
      },
    });
  }
}
