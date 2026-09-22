import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  LANGUAGES,
  MAX_LOOKUP_TEXT_LENGTH,
  STORAGE_KEY_SOURCE_LANGUAGE,
  STORAGE_KEY_TARGET_LANGUAGE,
  WEB_APP_URL,
} from "./config";

const select = document.getElementById("target-lang") as HTMLSelectElement;
const sourceSelect = document.getElementById("source-lang") as HTMLSelectElement;
const openApp = document.getElementById("open-app") as HTMLAnchorElement;
const liveToggle = document.getElementById("live-toggle") as HTMLButtonElement;
const liveTitle = liveToggle.querySelector(".action-row__title") as HTMLElement;
const liveStatus = document.getElementById("live-status") as HTMLElement;
const LIVE_IDLE_SUBTITLE = "Live-interpret whatever video/audio is playing in this tab.";

openApp.href = WEB_APP_URL;

function populate(el: HTMLSelectElement) {
  for (const lang of LANGUAGES) {
    const option = document.createElement("option");
    option.value = lang;
    option.textContent = lang;
    el.appendChild(option);
  }
}
populate(select);
populate(sourceSelect);

chrome.storage.sync.get([STORAGE_KEY_TARGET_LANGUAGE, STORAGE_KEY_SOURCE_LANGUAGE]).then((stored) => {
  select.value = stored[STORAGE_KEY_TARGET_LANGUAGE] ?? DEFAULT_TARGET_LANGUAGE;
  sourceSelect.value = stored[STORAGE_KEY_SOURCE_LANGUAGE] ?? DEFAULT_SOURCE_LANGUAGE;
});

select.addEventListener("change", () => {
  void chrome.storage.sync.set({ [STORAGE_KEY_TARGET_LANGUAGE]: select.value });
});
sourceSelect.addEventListener("change", () => {
  void chrome.storage.sync.set({ [STORAGE_KEY_SOURCE_LANGUAGE]: sourceSelect.value });
});

// ---- Live tab-audio interpreter ----

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setToggleState(active: boolean) {
  liveToggle.dataset.active = String(active);
  liveTitle.textContent = active ? "Stop live interpreting" : "Start live interpreting this tab";
  liveStatus.textContent = active ? "Listening to this tab's audio…" : LIVE_IDLE_SUBTITLE;
}

void (async () => {
  const tab = await getActiveTab();
  if (!tab?.id) return;
  const status = (await chrome.runtime.sendMessage({ type: "FLUENT_GET_TAB_CAPTURE_STATUS", tabId: tab.id })) as {
    active: boolean;
  };
  setToggleState(status?.active ?? false);
})();

liveToggle.addEventListener("click", () => {
  void (async () => {
    const active = liveToggle.dataset.active === "true";
    if (active) {
      liveToggle.disabled = true;
      await chrome.runtime.sendMessage({ type: "FLUENT_STOP_TAB_CAPTURE" });
      liveToggle.disabled = false;
      setToggleState(false);
      return;
    }

    const tab = await getActiveTab();
    if (!tab?.id) return;
    liveToggle.disabled = true;
    liveStatus.textContent = "Starting…";
    try {
      // Created first, and awaited, so the (potentially slow, first-time)
      // offscreen document is already up and ready before the short-lived
      // tabCapture stream id below is requested — otherwise the id can go
      // stale while the document is still loading, failing silently.
      await chrome.runtime.sendMessage({ type: "FLUENT_ENSURE_OFFSCREEN" });

      // Called here, directly inside the click handler, to stay as close as
      // possible to the real user gesture — see background.ts's file
      // comment on why the actual capture has to live in an offscreen
      // document rather than here. @types/chrome only exposes this as a
      // callback, not a promise.
      const streamId = await new Promise<string>((resolve, reject) => {
        chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (id) => {
          if (chrome.runtime.lastError || !id) reject(chrome.runtime.lastError ?? new Error("No stream id"));
          else resolve(id);
        });
      });
      await chrome.runtime.sendMessage({
        type: "FLUENT_START_TAB_CAPTURE",
        streamId,
        tabId: tab.id,
        sourceLanguage: sourceSelect.value,
        targetLanguage: select.value,
      });
      setToggleState(true);
    } catch {
      liveStatus.textContent = "Couldn't start — try reloading the page and trying again.";
    } finally {
      liveToggle.disabled = false;
    }
  })();
});

// ---- Clipboard translation ----
//
// Reuses the exact same FLUENT_LOOKUP_REQUEST message and doLookup() pipeline
// background.ts already runs for the highlight-to-translate popover (see
// content.ts) — a dictionary-style lookup (translation + phonetic + example
// sentences) is exactly as useful for a clipboard's worth of text as it is
// for a page selection.

interface LookupResult {
  translatedText: string;
  phonetic: string | null;
  examples: string[];
}
type LookupOutcome = { ok: true; result: LookupResult } | { ok: false; error: string };

const clipboardBtn = document.getElementById("clipboard-translate") as HTMLButtonElement;
const clipboardStatus = document.getElementById("clipboard-status") as HTMLElement;
const CLIPBOARD_IDLE_SUBTITLE = "Translate whatever's on your clipboard right now.";
const clipboardResultEl = document.getElementById("clipboard-result") as HTMLDivElement;
const clipboardSourceEl = document.getElementById("clipboard-source") as HTMLParagraphElement;
const clipboardTranslatedEl = document.getElementById("clipboard-translated") as HTMLParagraphElement;
const clipboardPhoneticEl = document.getElementById("clipboard-phonetic") as HTMLParagraphElement;
const clipboardCopyBtn = document.getElementById("clipboard-copy") as HTMLButtonElement;

clipboardBtn.addEventListener("click", () => {
  void (async () => {
    clipboardResultEl.hidden = true;
    clipboardBtn.disabled = true;
    clipboardStatus.textContent = "Reading clipboard…";
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        clipboardStatus.textContent = "Clipboard is empty — copy some text first.";
        return;
      }
      if (text.length > MAX_LOOKUP_TEXT_LENGTH) {
        clipboardStatus.textContent = `That's too long to translate at once (${text.length} characters) — try copying a shorter passage, under ${MAX_LOOKUP_TEXT_LENGTH}.`;
        return;
      }

      clipboardStatus.textContent = "Translating…";
      const outcome = (await chrome.runtime.sendMessage({ type: "FLUENT_LOOKUP_REQUEST", text })) as LookupOutcome;
      if (!outcome.ok) {
        clipboardStatus.textContent = outcome.error;
        return;
      }

      clipboardStatus.textContent = CLIPBOARD_IDLE_SUBTITLE;
      clipboardSourceEl.textContent = text;
      clipboardTranslatedEl.textContent = outcome.result.translatedText;
      if (outcome.result.phonetic) {
        clipboardPhoneticEl.textContent = outcome.result.phonetic;
        clipboardPhoneticEl.hidden = false;
      } else {
        clipboardPhoneticEl.hidden = true;
      }
      clipboardCopyBtn.textContent = "Copy translation";
      clipboardResultEl.hidden = false;
    } catch {
      // navigator.clipboard.readText() throws if the user never granted
      // clipboard-read permission (or denied it) — the "clipboardRead"
      // manifest permission covers most cases, but some browsers still
      // gate it behind a one-time prompt the first time it's used.
      clipboardStatus.textContent = "Couldn't read the clipboard — allow clipboard access for Fluent and try again.";
    } finally {
      clipboardBtn.disabled = false;
    }
  })();
});

clipboardCopyBtn.addEventListener("click", () => {
  void navigator.clipboard.writeText(clipboardTranslatedEl.textContent ?? "").then(() => {
    clipboardCopyBtn.textContent = "Copied!";
    setTimeout(() => {
      clipboardCopyBtn.textContent = "Copy translation";
    }, 1500);
  });
});
