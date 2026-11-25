const TRUESTARS_DEFAULT_APP_URL = "https://truestars.vercel.app";

async function getAppUrl() {
  const { appUrl } = await chrome.storage.local.get("appUrl");
  return (appUrl || TRUESTARS_DEFAULT_APP_URL).replace(/\/+$/, "");
}
