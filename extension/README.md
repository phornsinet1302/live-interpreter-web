# Fluent browser extension

Highlight any text on any webpage and get an instant translation — with a phonetic reading and example sentences for single words/short phrases — right there in a popover. Also works via right-click → "Translate '...' with Fluent".

## Build

```
pnpm --filter extension build
```

Bundles `src/background.ts`, `src/content.ts`, `src/popup.ts` with esbuild and assembles everything (manifest, popup.html, popover.css, icons) into `extension/dist/`.

`pnpm --filter extension icons` regenerates the PNG icons from `icons/source.svg` (only needed if you change the source SVG).

## Load it locally

**Chrome / Edge**
1. Go to `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select `extension/dist`.

**Firefox**
1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `extension/dist/manifest.json`.
3. Firefox unloads temporary add-ons on restart — reload it the same way each session.

## Before publishing anywhere real

- `src/config.ts`'s `API_URL` points at `http://localhost:4000/api/v1` — change it to your deployed backend, and add that origin to `manifest.json`'s `host_permissions` (MV3 background fetches are only exempt from the target's CORS policy for hosts explicitly listed there).
- `src/config.ts`'s `WEB_APP_URL` (used by the popup's "Open Fluent" link) likewise points at the local dev frontend.
- `manifest.json`'s `browser_specific_settings.gecko.id` is a placeholder — Firefox requires a real, unique add-on ID before it can be permanently installed (not just loaded temporarily) or submitted to addons.mozilla.org.

## How it works

- **`background.ts`** (service worker) is the only place that talks to the backend — MV3 background workers can fetch a host declared in `host_permissions` regardless of that host's own CORS policy, a privilege content scripts and the popup page don't have. It registers the right-click context menu item and answers lookup requests from the content script.
- **`content.ts`** watches for a text selection on the page, shows a small floating "Translate" trigger near it, and — on click, or when the context-menu path hands back a result — renders the popover inside a Shadow DOM root appended to `<body>`, so its styles can't leak into (or be broken by) the host page.
- **`popup.ts`** is the toolbar-icon popup: pick a target language (persisted via `chrome.storage.sync`) and jump to the main web app.
