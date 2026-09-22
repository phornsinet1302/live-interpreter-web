import { API_URL, DEFAULT_TARGET_LANGUAGE, MAX_LOOKUP_TEXT_LENGTH, STORAGE_KEY_TARGET_LANGUAGE } from "./config";

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
  // Shared by all three entry points (the highlight trigger, the right-click
  // context menu, and the popup's clipboard button) — checked once here
  // rather than in each of them, so none of them can bypass it and round-trip
  // to the server just to get back a bare "Translation failed (400)" (the
  // backend's lookupSchema rejects text over this length).
  if (text.length > MAX_LOOKUP_TEXT_LENGTH) {
    return {
      ok: false,
      error: `That's too long to translate at once (${text.length} characters) — try a passage under ${MAX_LOOKUP_TEXT_LENGTH}.`,
    };
  }
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

// ---- Live tab-audio interpreter ----
//
// MV3 service workers can't call getUserMedia() themselves, so the actual
// capture happens in an offscreen document (see offscreen.ts) that this
// worker creates/tears down and relays messages through:
//
//   popup.ts --FLUENT_START_TAB_CAPTURE--> background.ts
//     --FLUENT_OFFSCREEN_START--> offscreen.ts (captures + VADs + segments)
//       --FLUENT_TAB_SEGMENT_READY--> background.ts --fetch /transcribe-->
//         --FLUENT_TAB_CAPTION--> content.ts (renders the caption bar)

const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";

// Only one tab's audio is ever captured at a time (matching Chrome's own
// one-active-capture-per-extension model), so a single set of variables is
// enough rather than a map keyed by tab.
let activeCaptureTabId: number | null = null;
let activeSourceLanguage = DEFAULT_TARGET_LANGUAGE;
let activeTargetLanguage = DEFAULT_TARGET_LANGUAGE;

async function ensureOffscreenDocument(): Promise<void> {
  const has = await chrome.offscreen.hasDocument();
  if (has) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: "Captures the active tab's audio to transcribe/translate it live.",
  });
}

async function closeOffscreenDocumentIfOpen(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) {
    await chrome.offscreen.closeDocument();
  }
}

async function stopTabCapture(): Promise<void> {
  const tabId = activeCaptureTabId;
  activeCaptureTabId = null;
  if (await chrome.offscreen.hasDocument()) {
    chrome.runtime.sendMessage({ type: "FLUENT_OFFSCREEN_STOP" }).catch(() => {});
  }
  await closeOffscreenDocumentIfOpen();
  if (tabId !== null) {
    chrome.tabs.sendMessage(tabId, { type: "FLUENT_TAB_CAPTURE_STOPPED" }).catch(() => {});
  }
}

// A closed or navigated-away-from tab can't keep being captured — without
// this, the offscreen document (and the tab-capture indicator in Chrome's
// toolbar) would linger forever after the user just closes the tab.
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeCaptureTabId) void stopTabCapture();
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId === activeCaptureTabId && changeInfo.status === "loading" && changeInfo.url) {
    void stopTabCapture();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // A tabCapture streamId is only valid for a very short window — called by
  // the popup BEFORE it requests one, so the (potentially slow, first-time)
  // offscreen document creation below never eats into that window. By the
  // time FLUENT_START_TAB_CAPTURE arrives, the document already exists and
  // this becomes an instant no-op.
  if (message?.type === "FLUENT_ENSURE_OFFSCREEN") {
    void ensureOffscreenDocument().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "FLUENT_START_TAB_CAPTURE") {
    const { streamId, tabId, sourceLanguage, targetLanguage } = message as {
      streamId: string;
      tabId: number;
      sourceLanguage: string;
      targetLanguage: string;
    };
    void (async () => {
      activeCaptureTabId = tabId;
      activeSourceLanguage = sourceLanguage;
      activeTargetLanguage = targetLanguage;
      await ensureOffscreenDocument();
      chrome.runtime.sendMessage({ type: "FLUENT_OFFSCREEN_START", streamId, tabId }).catch(() => {});
      chrome.tabs.sendMessage(tabId, { type: "FLUENT_TAB_CAPTURE_STARTED" }).catch(() => {});
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === "FLUENT_OFFSCREEN_ERROR") {
    const { tabId, error } = message as { tabId: number; error: string };
    console.error("Fluent: offscreen capture failed", error);
    chrome.tabs.sendMessage(tabId, { type: "FLUENT_TAB_CAPTURE_ERROR", error }).catch(() => {});
    void stopTabCapture();
    return undefined;
  }

  if (message?.type === "FLUENT_STOP_TAB_CAPTURE") {
    void stopTabCapture().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "FLUENT_GET_TAB_CAPTURE_STATUS") {
    const { tabId } = message as { tabId: number };
    sendResponse({ active: tabId === activeCaptureTabId });
    return undefined;
  }

  if (message?.type === "FLUENT_TAB_SEGMENT_READY") {
    const { tabId, audioBase64, mimeType } = message as { tabId: number; audioBase64: string; mimeType: string };
    if (tabId !== activeCaptureTabId) return undefined;
    void (async () => {
      try {
        const res = await fetch(`${API_URL}/transcribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: audioBase64,
            mimeType,
            sourceLanguage: activeSourceLanguage,
            targetLanguage: activeTargetLanguage,
          }),
        });
        if (!res.ok) {
          console.error("Fluent: /transcribe segment failed", res.status, await res.text().catch(() => ""));
          // Still tell the tab a segment came through — distinguishes "the
          // mic/tab-capture pipeline never even detects audio" from "audio is
          // detected but something downstream keeps failing", without
          // needing dev tools open to tell them apart.
          chrome.tabs.sendMessage(tabId, { type: "FLUENT_TAB_SEGMENT_PROCESSED", hadTranscript: false }).catch(() => {});
          return;
        }
        const result = (await res.json()) as { transcript: string; translatedText: string };
        chrome.tabs.sendMessage(tabId, { type: "FLUENT_TAB_SEGMENT_PROCESSED", hadTranscript: !!result.transcript }).catch(() => {});
        if (!result.transcript) return; // VAD triggered, but Gemini decided it wasn't real speech
        chrome.tabs.sendMessage(tabId, {
          type: "FLUENT_TAB_CAPTION",
          transcript: result.transcript,
          translatedText: result.translatedText,
        }).catch(() => {});
      } catch (error) {
        // A single dropped segment isn't worth surfacing to the user as an
        // error — the next one a few seconds later just picks up where this
        // one left off — but it's still logged so a persistent failure (as
        // opposed to one flaky segment) is diagnosable.
        console.error("Fluent: segment processing failed", error);
      }
    })();
    return undefined;
  }

  return undefined;
});
