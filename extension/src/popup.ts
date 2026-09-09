import { DEFAULT_TARGET_LANGUAGE, LANGUAGES, STORAGE_KEY_TARGET_LANGUAGE, WEB_APP_URL } from "./config";

const select = document.getElementById("target-lang") as HTMLSelectElement;
const openApp = document.getElementById("open-app") as HTMLAnchorElement;

openApp.href = WEB_APP_URL;

for (const lang of LANGUAGES) {
  const option = document.createElement("option");
  option.value = lang;
  option.textContent = lang;
  select.appendChild(option);
}

chrome.storage.sync.get(STORAGE_KEY_TARGET_LANGUAGE).then((stored) => {
  select.value = stored[STORAGE_KEY_TARGET_LANGUAGE] ?? DEFAULT_TARGET_LANGUAGE;
});

select.addEventListener("change", () => {
  void chrome.storage.sync.set({ [STORAGE_KEY_TARGET_LANGUAGE]: select.value });
});
