import { DEFAULT_TARGET_LANGUAGE, LANGUAGE_SPEECH_CODES, MAX_LOOKUP_TEXT_LENGTH, STORAGE_KEY_TARGET_LANGUAGE } from "./config";

// A stale content script (left running in a tab that was already open when
// the extension got reloaded in chrome://extensions — normal during
// development) throws "Extension context invalidated" the instant ANY of
// its listeners fires, not just the ones that directly call a chrome.* API —
// Chrome tears down the whole isolated world, and the exact reported line
// can end up pointing at whichever listener happened to run first rather
// than the real cause. A per-listener guard (see extensionContextGone()
// below) covers the main entry points; this catches everything else (the
// caption bar's drag handlers, its Stop button, the popover's Copy/Listen
// buttons, etc.) in one place instead of guarding each individually. Doesn't
// affect real errors elsewhere in the page — only this exact, expected one.
window.addEventListener("error", (e) => {
  if (e.message?.includes("Extension context invalidated")) e.preventDefault();
});

interface LookupResult {
  translatedText: string;
  phonetic: string | null;
  examples: string[];
  provider: string;
  confidence: number | null;
}
type LookupOutcome = { ok: true; result: LookupResult } | { ok: false; error: string };

// True once this content script's connection to its extension is gone — the
// normal outcome of reloading the extension in chrome://extensions while a
// tab loaded before that reload is still open. The old script keeps running
// but every chrome.* call on it now throws "Extension context invalidated";
// checked at the top of every listener below so a stale tab just goes quiet
// instead of spamming the console until the page itself is refreshed.
function extensionContextGone(): boolean {
  try {
    return !chrome.runtime?.id;
  } catch {
    return true;
  }
}

// Everything this content script renders lives inside one Shadow DOM host
// appended to <body> — its styles (loaded via a <link> to the bundled
// popover.css, referenced through chrome.runtime.getURL so it works as a
// web-accessible resource) can't leak into the host page, and the host
// page's own CSS can't reach in and break it either.
let shadowHost: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;

function ensureShadowRoot(): ShadowRoot {
  if (shadowRoot) return shadowRoot;
  shadowHost = document.createElement("div");
  shadowHost.id = "fluent-extension-root";
  (document.fullscreenElement ?? document.body).appendChild(shadowHost);
  shadowRoot = shadowHost.attachShadow({ mode: "open" });
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("popover.css");
  shadowRoot.appendChild(link);
  return shadowRoot;
}

// A page going fullscreen (e.g. a video player) hides everything outside
// document.fullscreenElement, including anything appended to <body> before
// that happened — re-parent the host so the live-caption bar (see below)
// doesn't just disappear the moment someone maximizes the video.
document.addEventListener("fullscreenchange", () => {
  if (extensionContextGone()) return;
  const container = document.fullscreenElement ?? document.body;
  if (shadowHost) container.appendChild(shadowHost);
  if (captionHost) container.appendChild(captionHost);
});

function clearShadowChildren() {
  const root = ensureShadowRoot();
  // Keep the stylesheet <link> (first child), drop everything rendered after it.
  while (root.childNodes.length > 1) root.removeChild(root.lastChild!);
}

function removeAll() {
  clearShadowChildren();
}

function clampToViewport(top: number, left: number, width: number, height: number) {
  const margin = 8;
  const maxLeft = window.innerWidth - width - margin;
  const maxTop = window.innerHeight - height - margin;
  return {
    top: Math.max(margin, Math.min(top, maxTop)),
    left: Math.max(margin, Math.min(left, maxLeft)),
  };
}

function getSelectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
}

function showTrigger(rect: DOMRect, text: string) {
  removeAll();
  const root = ensureShadowRoot();
  const btn = document.createElement("button");
  btn.className = "fluent-trigger";
  btn.textContent = "🌐 Translate";
  const { top, left } = clampToViewport(rect.bottom + 8, rect.left, 110, 32);
  btn.style.top = `${top}px`;
  btn.style.left = `${left}px`;
  btn.addEventListener("mousedown", (e) => e.preventDefault()); // don't collapse the selection
  btn.addEventListener("click", () => {
    void runLookup(text, rect);
  });
  root.appendChild(btn);
}

async function getTargetLanguage(): Promise<string> {
  const stored = await chrome.storage.sync.get(STORAGE_KEY_TARGET_LANGUAGE);
  return stored[STORAGE_KEY_TARGET_LANGUAGE] ?? DEFAULT_TARGET_LANGUAGE;
}

function showPopoverLoading(rect: DOMRect) {
  removeAll();
  const root = ensureShadowRoot();
  const el = document.createElement("div");
  el.className = "fluent-popover";
  const { top, left } = clampToViewport(rect.bottom + 8, rect.left, 300, 90);
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
  el.innerHTML = `<p class="fluent-popover__status">Translating…</p>`;
  root.appendChild(el);
}

async function renderResult(text: string, rect: DOMRect, outcome: LookupOutcome, targetLanguage: string) {
  removeAll();
  const root = ensureShadowRoot();
  const el = document.createElement("div");
  el.className = "fluent-popover";

  if (!outcome.ok) {
    el.innerHTML = `
      <div class="fluent-popover__header">
        <span class="fluent-popover__brand">🌐 Fluent</span>
        <button class="fluent-popover__close" aria-label="Close">×</button>
      </div>
      <p class="fluent-popover__error">${escapeHtml(outcome.error)}</p>
    `;
  } else {
    const { result } = outcome;
    const speechCode = LANGUAGE_SPEECH_CODES[targetLanguage] ?? "en-US";
    el.innerHTML = `
      <div class="fluent-popover__header">
        <span class="fluent-popover__brand">🌐 Fluent</span>
        <span class="fluent-popover__lang">AUTO → ${escapeHtml(targetLanguage).toUpperCase()}</span>
        <button class="fluent-popover__close" aria-label="Close">×</button>
      </div>
      <p class="fluent-popover__source">${escapeHtml(text)}</p>
      <p class="fluent-popover__translated">"${escapeHtml(result.translatedText)}"</p>
      ${result.phonetic ? `<p class="fluent-popover__phonetic">${escapeHtml(result.phonetic)}</p>` : ""}
      ${
        result.examples.length
          ? `<ul class="fluent-popover__examples">${result.examples
              .map((ex) => `<li>${escapeHtml(ex)}</li>`)
              .join("")}</ul>`
          : ""
      }
      <div class="fluent-popover__actions">
        <button data-action="copy">📋 Copy</button>
        <button data-action="listen">🔊 Listen</button>
      </div>
    `;
    el.querySelector('[data-action="copy"]')?.addEventListener("click", () => {
      void navigator.clipboard.writeText(result.translatedText);
    });
    el.querySelector('[data-action="listen"]')?.addEventListener("click", () => {
      const utterance = new SpeechSynthesisUtterance(result.translatedText);
      utterance.lang = speechCode;
      speechSynthesis.speak(utterance);
    });
  }

  el.querySelector(".fluent-popover__close")?.addEventListener("click", removeAll);

  const { top, left } = clampToViewport(rect.bottom + 8, rect.left, 300, 260);
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
  root.appendChild(el);
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

// ---- Live tab-audio interpreter overlay ----
//
// Deliberately a separate Shadow DOM host from the highlight-translate
// trigger/popover above: that one gets wiped by removeAll() on every
// mousedown/selection change on the page (see the listeners below), which
// would otherwise blink this persistent caption bar out of existence every
// time the viewer clicked anywhere.
let captionHost: HTMLDivElement | null = null;
let captionRoot: ShadowRoot | null = null;

function ensureCaptionRoot(): ShadowRoot {
  if (captionRoot) return captionRoot;
  captionHost = document.createElement("div");
  captionHost.id = "fluent-caption-root";
  (document.fullscreenElement ?? document.body).appendChild(captionHost);
  captionRoot = captionHost.attachShadow({ mode: "open" });
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("popover.css");
  captionRoot.appendChild(link);
  return captionRoot;
}

// Drags the bar by its header — switches it from the CSS default's
// centered/bottom-anchored position to an explicit top/left the moment a
// drag starts, so it can then be placed anywhere without fighting the
// original centering transform.
function makeDraggable(bar: HTMLElement, handle: HTMLElement) {
  let dragging = false;
  let grabX = 0;
  let grabY = 0;

  handle.addEventListener("mousedown", (e) => {
    if ((e.target as HTMLElement).closest(".fluent-caption-bar__stop")) return;
    dragging = true;
    const rect = bar.getBoundingClientRect();
    grabX = e.clientX - rect.left;
    grabY = e.clientY - rect.top;
    bar.style.left = `${rect.left}px`;
    bar.style.top = `${rect.top}px`;
    bar.style.bottom = "auto";
    bar.style.transform = "none";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const maxLeft = window.innerWidth - bar.offsetWidth - 8;
    const maxTop = window.innerHeight - bar.offsetHeight - 8;
    bar.style.left = `${Math.min(Math.max(8, e.clientX - grabX), Math.max(8, maxLeft))}px`;
    bar.style.top = `${Math.min(Math.max(8, e.clientY - grabY), Math.max(8, maxTop))}px`;
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
  });
}

function showCaptionBar() {
  const root = ensureCaptionRoot();
  if (root.querySelector(".fluent-caption-bar")) return;
  const bar = document.createElement("div");
  bar.className = "fluent-caption-bar";
  bar.innerHTML = `
    <div class="fluent-caption-bar__header">
      <span class="fluent-popover__brand">🌐 Fluent — Live</span>
      <button class="fluent-caption-bar__stop">Stop</button>
    </div>
    <p class="fluent-caption-bar__source">Listening…</p>
    <p class="fluent-caption-bar__translated"></p>
  `;
  bar.querySelector(".fluent-caption-bar__stop")?.addEventListener("click", () => {
    void chrome.runtime.sendMessage({ type: "FLUENT_STOP_TAB_CAPTURE" });
    hideCaptionBar();
  });
  const header = bar.querySelector(".fluent-caption-bar__header") as HTMLElement | null;
  if (header) makeDraggable(bar, header);
  root.appendChild(bar);
}

function updateCaptionBar(transcript: string, translatedText: string) {
  showCaptionBar();
  const bar = ensureCaptionRoot().querySelector(".fluent-caption-bar");
  if (!bar) return;
  const source = bar.querySelector(".fluent-caption-bar__source");
  const translated = bar.querySelector(".fluent-caption-bar__translated");
  if (source) source.textContent = transcript;
  if (translated) translated.textContent = translatedText;
}

function hideCaptionBar() {
  captionRoot?.querySelector(".fluent-caption-bar")?.remove();
}

async function runLookup(text: string, rect: DOMRect) {
  showPopoverLoading(rect);
  const targetLanguage = await getTargetLanguage();
  if (text.length > MAX_LOOKUP_TEXT_LENGTH) {
    await renderResult(
      text,
      rect,
      { ok: false, error: `That's too long to translate at once — try selecting under ${MAX_LOOKUP_TEXT_LENGTH} characters.` },
      targetLanguage
    );
    return;
  }
  const outcome = (await chrome.runtime.sendMessage({ type: "FLUENT_LOOKUP_REQUEST", text })) as LookupOutcome;
  await renderResult(text, rect, outcome, targetLanguage);
}

document.addEventListener("mouseup", (e) => {
  if (extensionContextGone()) return;
  // Ignore clicks on our own trigger/popover — they have their own handlers.
  if (shadowHost && e.composedPath().includes(shadowHost)) return;
  const rect = getSelectionRect();
  if (rect) showTrigger(rect, window.getSelection()!.toString());
  else removeAll();
});

document.addEventListener("mousedown", (e) => {
  if (extensionContextGone()) return;
  if (shadowHost && e.composedPath().includes(shadowHost)) return;
  removeAll();
});

document.addEventListener("keydown", (e) => {
  if (extensionContextGone()) return;
  if (e.key === "Escape") removeAll();
});

// Right-click "Translate '%s' with Fluent" path — background.ts already did
// the fetch (it has the selection text from the context-menu event itself),
// so this just needs to re-read the still-live selection to anchor the
// popover and render what was handed back.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "FLUENT_SHOW_RESULT") return;
  const rect = getSelectionRect();
  if (!rect) return;
  void getTargetLanguage().then((targetLanguage) => {
    void renderResult(message.text as string, rect, message.outcome as LookupOutcome, targetLanguage);
  });
});

// Live tab-audio interpreter path (see background.ts / offscreen.ts) — this
// tab was told to start capturing, a transcribed segment arrived, or capture
// stopped (either the user's own Stop click, elsewhere, or an auto-stop from
// this tab closing/navigating).
// If nothing has come back within this long, something's stuck (bad audio
// signal, a capture that silently failed to actually start, etc.) — rather
// than leave the bar on "Listening…" forever with no clue why, say so
// directly in the page. No dev tools required to see this one.
const NO_SIGNAL_TIMEOUT_MS = 12000;
let noSignalTimer: ReturnType<typeof setTimeout> | null = null;
// Set as soon as ANY segment comes back from the backend (even an empty
// one) — proves the tab-capture -> VAD -> network pipeline is alive, so the
// timeout message below can tell "nothing is even being captured" apart
// from "audio is captured but no speech is being recognized in it".
let sawAnySegment = false;

function clearNoSignalTimer() {
  if (noSignalTimer !== null) {
    clearTimeout(noSignalTimer);
    noSignalTimer = null;
  }
}

function armNoSignalTimer() {
  clearNoSignalTimer();
  sawAnySegment = false;
  noSignalTimer = setTimeout(() => {
    const bar = captionRoot?.querySelector(".fluent-caption-bar");
    const translated = bar?.querySelector(".fluent-caption-bar__translated");
    if (!translated || translated.textContent) return;
    translated.textContent = sawAnySegment
      ? "Hearing audio, but not recognizing clear speech in it yet — check the \"Speaking\" language in the popup matches the video, and that it's not just music/background noise."
      : "Not picking up any audio from this tab yet — make sure the video is actually playing (not paused/muted), then reload this page and hit Start again from the toolbar icon.";
  }, NO_SIGNAL_TIMEOUT_MS);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "FLUENT_TAB_CAPTURE_STARTED") {
    showCaptionBar();
    armNoSignalTimer();
  } else if (message?.type === "FLUENT_TAB_SEGMENT_PROCESSED") {
    sawAnySegment = true;
  } else if (message?.type === "FLUENT_TAB_CAPTION") {
    clearNoSignalTimer();
    updateCaptionBar(message.transcript as string, message.translatedText as string);
  } else if (message?.type === "FLUENT_TAB_CAPTURE_STOPPED") {
    clearNoSignalTimer();
    hideCaptionBar();
  } else if (message?.type === "FLUENT_TAB_CAPTURE_ERROR") {
    clearNoSignalTimer();
    showCaptionBar();
    const bar = ensureCaptionRoot().querySelector(".fluent-caption-bar");
    const translated = bar?.querySelector(".fluent-caption-bar__translated");
    if (translated) translated.textContent = "Couldn't start — try again from the toolbar icon.";
  }
});
