import { useState } from "react";
import { Globe, Smartphone, PanelsTopLeft, Apple, Play, Chrome, Copy, Volume2 } from "lucide-react";
import QRCode from "@/components/ui/common/QRCode";
import Logo from "@/components/ui/common/Logo";

export default function PlatformSection() {
  const [activeTab, setActiveTab] = useState<"web" | "app" | "extension">("web");
  const tabs = [
    { id: "web" as const, label: "Website" },
    { id: "app" as const, label: "Mobile App" },
    { id: "extension" as const, label: "Browser Extension" },
  ];

  return (
    <section className="px-8 md:px-16 py-24 bg-background border-t border-border">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-['DM_Mono'] tracking-[0.2em] uppercase text-accent mb-3">Available everywhere</p>
          <h2 className="font-['Playfair_Display'] font-black text-4xl md:text-5xl leading-tight tracking-tight">
            Fluent on every<br /><em className="italic text-accent">platform</em>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base mt-4 max-w-md mx-auto leading-relaxed">
            One account, three surfaces. Translate on the web, carry it in your pocket, or keep it a keystroke away.
          </p>
        </div>
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center bg-secondary rounded-full p-1 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2 rounded-full text-sm font-['DM_Sans'] font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div key={activeTab} style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
          {activeTab === "web" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center mb-5">
                  <Globe size={20} className="text-primary-foreground" />
                </div>
                <h3 className="font-['Playfair_Display'] font-black text-2xl md:text-3xl leading-tight tracking-tight mb-3">
                  Full power,<br />no install needed.
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
                  Access the complete Fluent suite from any browser. Type, paste, or speak — your translation history syncs across all devices when signed in.
                </p>
                <ul className="space-y-2.5 mb-8">
                  {["Text & voice translation", "English ↔ Khmer", "Saved translation history", "Works on any device"].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-foreground/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-accent transition-colors duration-200">
                  Open Fluent →
                </button>
              </div>
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="relative flex items-center gap-1.5 px-4 py-3 border-b border-border bg-secondary/50">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E5534B]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E5A63B]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3C9D5C]" />
                  <span className="absolute left-1/2 -translate-x-1/2 text-xs font-['DM_Mono'] text-muted-foreground/70 bg-background/60 border border-border rounded-md px-3 py-0.5">
                    fluent.app
                  </span>
                </div>
                <div className="p-5">
                  <div className="mb-4">
                    <Logo size="text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-secondary/40 rounded-xl p-3">
                      <p className="text-[10px] font-['DM_Mono'] tracking-wider uppercase text-muted-foreground mb-1.5">English</p>
                      <p className="text-sm leading-snug">"The world is full of wonders."</p>
                    </div>
                    <div className="bg-secondary/40 rounded-xl p-3">
                      <p className="text-[10px] font-['DM_Mono'] tracking-wider uppercase text-accent mb-1.5">Khmer</p>
                      <p className="text-sm italic text-accent leading-snug">"ពិភពលោកពោរពេញទៅដោយអច្ឆរិយភាព។"</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-semibold">
                      Translate →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "app" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center mb-5">
                  <Smartphone size={20} className="text-accent-foreground" />
                </div>
                <h3 className="font-['Playfair_Display'] font-black text-2xl md:text-3xl leading-tight tracking-tight mb-3">
                  Translation in<br />your pocket.
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
                  The Fluent app brings real-time voice translation offline-ready to iOS and Android. Point your camera at text, or speak — it just works.
                </p>
                <ul className="space-y-2.5 mb-8">
                  {["Offline mode — no data needed", "Camera text translation", "Live voice conversation mode", "Syncs with your web account"].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-foreground/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-3">
                  <button className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent transition-colors duration-200 flex items-center gap-2">
                    <Apple size={15} /> App Store
                  </button>
                  <button className="border border-border text-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-secondary transition-colors duration-200 flex items-center gap-2">
                    <Play size={13} /> Google Play
                  </button>
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl shadow-sm p-8 flex flex-col items-center text-center">
                <p className="text-[10px] font-['DM_Mono'] tracking-[0.2em] uppercase text-muted-foreground mb-5">Scan to download</p>
                <div className="bg-white p-3 rounded-xl border border-border mb-5">
                  <QRCode size={140} />
                </div>
                <div className="w-full border-t border-border pt-4 mt-1">
                  <p className="text-xs text-muted-foreground mb-2">iOS & Android</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3C9D5C]" />
                    Free · 4.9 ★ · 50k+ downloads
                  </p>
                </div>
              </div>
            </div>
          )}
          {activeTab === "extension" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <div className="w-11 h-11 rounded-xl bg-[#3C6AB5] flex items-center justify-center mb-5">
                  <PanelsTopLeft size={20} className="text-white" />
                </div>
                <h3 className="font-['Playfair_Display'] font-black text-2xl md:text-3xl leading-tight tracking-tight mb-3">
                  Translate any<br />page, instantly.
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
                  The Fluent browser extension lets you highlight any text on any webpage and get an instant translation in a clean popover — no switching tabs.
                </p>
                <ul className="space-y-2.5 mb-8">
                  {["Highlight-to-translate on any page", "Right-click context menu", "Popover with phonetics & examples", "Chrome, Firefox & Edge"].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-foreground/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3C6AB5] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-3">
                  <button className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent transition-colors duration-200 flex items-center gap-2">
                    <Chrome size={15} /> Add to Chrome
                  </button>
                  <button className="border border-border text-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-secondary transition-colors duration-200">
                    Firefox Add-on
                  </button>
                  <button className="border border-border text-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-secondary transition-colors duration-200">
                    Edge Extension
                  </button>
                </div>
              </div>
              <div className="relative">
                <div className="bg-card border border-border rounded-2xl shadow-sm p-6 pb-44">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    The ancient city was built at the confluence of two rivers, its{" "}
                    <mark className="bg-accent/20 text-foreground rounded px-1 py-0.5">architecture reflecting centuries</mark>{" "}
                    of cultural exchange and artistic tradition passed down through generations.
                  </p>
                </div>
                <div className="absolute bottom-8 -right-4 w-[58%] bg-popover border border-border rounded-xl shadow-lg p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="flex items-center gap-1 text-[10px] font-['DM_Mono'] tracking-wider uppercase text-accent">
                      <Globe size={11} /> Fluent
                    </span>
                    <span className="text-[10px] font-['DM_Mono'] text-muted-foreground">EN → KM</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">architecture reflecting centuries</p>
                  <p className="font-['Playfair_Display'] italic text-accent text-base mb-3">"ស្ថាបត្យកម្មឆ្លុះបញ្ចាំងសតវត្សរ៍"</p>
                  <div className="flex items-center gap-2">
                    <button className="border border-border rounded-full px-3 py-1 text-xs flex items-center gap-1 hover:bg-secondary transition-colors">
                      <Copy size={11} /> Copy
                    </button>
                    <button className="border border-border rounded-full px-3 py-1 text-xs flex items-center gap-1 hover:bg-secondary transition-colors">
                      <Volume2 size={11} /> Listen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
