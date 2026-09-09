import { API_URL, DEFAULT_TARGET_LANGUAGE, STORAGE_KEY_TARGET_LANGUAGE } from "./config";

// Background service worker: the only place in this extension that talks to
// the backend. MV3 service workers can fetch a host declared in
// manifest.json's host_permissions without needing that host's CORS policy
// to allow the extension's origin — content scripts and the popup page
// don't get that privilege, so they never fetch directly; they message this
// worker instead (see content.ts / popup.ts).

const CONTEXT_MENU_ID = "fluent-translate-selection";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Translate "%s" with Fluent',
    contexts: ["selection"],
  });
});

interface LookupResult {
  translatedText: string;
  phonetic: string | null;
  examples: string[];
  provider: string;
  confidence: number | null;
}

async function getTargetLanguage(): Promise<string> {
  const stored = await chrome.storage.sync.get(STORAGE_KEY_TARGET_LANGUAGE);
  return stored[STORAGE_KEY_TARGET_LANGUAGE] ?? DEFAULT_TARGET_LANGUAGE;
}

async function doLookup(text: string): Promise<{ ok: true; result: LookupResult } | { ok: false; error: string }> {
  try {
    const targetLanguage = await getTargetLanguage();
    const res = await fetch(`${API_URL}/translate/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, sourceLanguage: "auto", targetLanguage }),
    });
    if (!res.ok) {
      return { ok: false, error: `Translation failed (${res.status})` };
    }
    const result = (await res.json()) as LookupResult;
    return { ok: true, result };
  } catch {
    return { ok: false, error: "Couldn't reach Fluent — check your connection." };
  }
}

// Right-click path: the selection is still live in the page at click time,
// so the content script can re-read window.getSelection() itself to anchor
// the popover — this just tells it what was clicked and hands back the
// already-fetched result together, so the content script doesn't need a
// second round trip.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !info.selectionText || !tab?.id) return;
  const outcome = await doLookup(info.selectionText);
  chrome.tabs.sendMessage(tab.id, { type: "FLUENT_SHOW_RESULT", text: info.selectionText, outcome });
});

// Highlight-trigger-button path (see content.ts): the content script asks
// this worker to do the actual network call.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "FLUENT_LOOKUP_REQUEST") return undefined;
  doLookup(message.text as string).then(sendResponse);
  return true; // keep the message channel open for the async sendResponse
});
