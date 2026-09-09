import { DEFAULT_TARGET_LANGUAGE, LANGUAGE_SPEECH_CODES, STORAGE_KEY_TARGET_LANGUAGE } from "./config";

interface LookupResult {
  translatedText: string;
  phonetic: string | null;
  examples: string[];
  provider: string;
  confidence: number | null;
}
type LookupOutcome = { ok: true; result: LookupResult } | { ok: false; error: string };

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
  document.body.appendChild(shadowHost);
  shadowRoot = shadowHost.attachShadow({ mode: "open" });
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("popover.css");
  shadowRoot.appendChild(link);
  return shadowRoot;
}

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

async function runLookup(text: string, rect: DOMRect) {
  showPopoverLoading(rect);
  const targetLanguage = await getTargetLanguage();
  const outcome = (await chrome.runtime.sendMessage({ type: "FLUENT_LOOKUP_REQUEST", text })) as LookupOutcome;
  await renderResult(text, rect, outcome, targetLanguage);
}

document.addEventListener("mouseup", (e) => {
  // Ignore clicks on our own trigger/popover — they have their own handlers.
  if (shadowHost && e.composedPath().includes(shadowHost)) return;
  const rect = getSelectionRect();
  if (rect) showTrigger(rect, window.getSelection()!.toString());
  else removeAll();
});

document.addEventListener("mousedown", (e) => {
  if (shadowHost && e.composedPath().includes(shadowHost)) return;
  removeAll();
});

document.addEventListener("keydown", (e) => {
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
