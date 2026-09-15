import { Download, X } from "lucide-react";
import BotanicalRight from "@/components/ui/common/BotanicalRight";

export type ExtensionBrowser = "chrome" | "firefox" | "edge";

// The extension isn't published to any store yet (that needs a real deployed
// backend URL, a privacy policy, and a separate submission+review process per
// store — see extension/README.md). Until then, this is the honest way to
// let a visitor actually use it: download the built package and load it as
// an unpacked/temporary extension, same as during development.
const BROWSER_INFO: Record<ExtensionBrowser, { title: string; steps: string[]; note?: string }> = {
  chrome: {
    title: "Install on Chrome",
    steps: [
      "Download the extension below and unzip it.",
      "Go to chrome://extensions in your address bar.",
      'Turn on "Developer mode" (top-right toggle).',
      'Click "Load unpacked" and select the unzipped folder.',
    ],
  },
  edge: {
    title: "Install on Edge",
    steps: [
      "Download the extension below and unzip it.",
      "Go to edge://extensions in your address bar.",
      'Turn on "Developer mode" (left sidebar toggle).',
      'Click "Load unpacked" and select the unzipped folder.',
    ],
  },
  firefox: {
    title: "Install on Firefox",
    steps: [
      "Download the extension below and unzip it.",
      "Go to about:debugging#/runtime/this-firefox in your address bar.",
      'Click "Load Temporary Add-on…" and select the manifest.json file inside the unzipped folder.',
    ],
    note: "Firefox removes temporary add-ons on restart, so you'll need to reload it the same way each session until it's published to addons.mozilla.org.",
  },
};

export default function ExtensionInstallModal({
  browser,
  onClose,
}: {
  browser: ExtensionBrowser;
  onClose: () => void;
}) {
  const info = BROWSER_INFO[browser];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-card border border-border rounded-3xl shadow-xl max-w-md w-full p-8 font-['DM_Sans']"
        style={{ animation: "fadeSlideUp 0.25s ease-out" }}
      >
        <div className="absolute top-0 right-0 w-28 h-28 opacity-10 pointer-events-none overflow-hidden rounded-3xl">
          <BotanicalRight />
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={18} />
        </button>
        <p className="text-xs font-['DM_Mono'] tracking-[0.18em] uppercase text-accent mb-3">Not in the store yet</p>
        <h2 className="font-['Playfair_Display'] font-black text-2xl md:text-3xl leading-tight text-foreground mb-5">
          {info.title}
        </h2>
        <ol className="flex flex-col gap-3 mb-6">
          {info.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        {info.note && <p className="text-xs text-muted-foreground leading-relaxed mb-6">{info.note}</p>}
        <a
          href="/fluent-extension.zip"
          download
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-full text-sm font-semibold hover:bg-accent transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <Download size={15} /> Download extension (.zip)
        </a>
      </div>
    </div>
  );
}
