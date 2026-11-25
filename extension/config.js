const TRUESTARS_DEFAULT_APP_URL = "http://localhost:3000";

async function getAppUrl() {
  const { appUrl } = await chrome.storage.local.get("appUrl");
  return (appUrl || TRUESTARS_DEFAULT_APP_URL).replace(/\/+$/, "");
}
