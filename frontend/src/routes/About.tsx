import { useState, useCallback } from "react";
import { ArrowLeftRight, Globe, Mic, Volume2, Copy, Check, Sparkles, Zap, BookOpen } from "lucide-react";
import Navbar from "@/components/ui/layout/Navbar";
import Footer from "@/components/ui/layout/Footer";
import PlatformSection from "@/components/ui/features/marketing/PlatformSection";
import LanguageSelect from "@/components/ui/features/translation/LanguageSelect";
import BotanicalLeft from "@/components/ui/common/BotanicalLeft";
import BotanicalRight from "@/components/ui/common/BotanicalRight";
import { useInView } from "@/hooks/useInView";
import { UserAccount } from "@/types";

export default function AboutPage({
  user,
  onLive,
  onSignIn,
  onSignUp,
  onHistory,
  onSignOut,
}: {
  user: UserAccount | null;
  onLive: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onHistory: () => void;
  onSignOut: () => void;
}) {
  const [sourceLang, setSourceLang] = useState("English");
  const [targetLang, setTargetLang] = useState("Khmer");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const { ref: whyRef, inView: whyInView } = useInView<HTMLDivElement>();

  const handleSourceChange = (text: string) => {
    if (text.length <= 5000) {
      setSourceText(text);
      setCharCount(text.length);
      setTranslatedText("");
    }
  };

  const handleSwap = () => {
    const tmp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(tmp);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
    setCharCount(translatedText.length);
  };

  const handleTranslate = useCallback(() => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    setTimeout(() => {
      const samples: Record<string, string> = {
        Khmer: "សួស្តី សូមស្វាគមន៍មកកាន់ពិភពនៃលទ្ធភាពគ្មានដែនកំណត់។ ការបកប្រែភ្ជាប់វប្បធម៌ និងបើកទ្វារទៅរកទស្សនវិស័យថ្មីៗ។",
      };
      setTranslatedText(samples[targetLang] || `[${targetLang} translation of your text would appear here. Connect to a translation API to enable live translations.]`);
      setIsTranslating(false);
    }, 1100);
  }, [sourceText, targetLang]);

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-['DM_Sans'] overflow-x-hidden">
      <Navbar user={user} onLive={onLive} onSignIn={onSignIn} onSignUp={onSignUp} onHistory={onHistory} onSignOut={onSignOut} />

      <section className="relative px-8 md:px-16 pt-14 pb-4 overflow-hidden">
        <style>{`
          @keyframes heroFadeUp {
            from { opacity: 0; transform: translateY(28px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[220px_1fr_220px] items-end gap-0">
          <div className="hidden md:block h-[340px] -mb-4"><BotanicalLeft /></div>
          <div className="text-center py-4">
            <p
              className="text-xs font-['DM_Mono'] tracking-[0.2em] uppercase text-accent mb-4"
              style={{ animation: "heroFadeUp 0.6s ease-out both" }}
            >
              English · Khmer · Neural translation
            </p>
            <h1 className="font-['Playfair_Display'] font-black text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-foreground mb-5">
              <span className="block overflow-hidden">
                <span className="block" style={{ animation: "heroFadeUp 0.7s ease-out 0.1s both" }}>Translate the</span>
              </span>
              <span className="block overflow-hidden">
                <span className="block" style={{ animation: "heroFadeUp 0.7s ease-out 0.25s both" }}>
                  <em className="italic text-accent">World,</em> One
                </span>
              </span>
              <span className="block overflow-hidden">
                <span className="block" style={{ animation: "heroFadeUp 0.7s ease-out 0.4s both" }}>Word at a Time</span>
              </span>
            </h1>
            <p
              className="text-muted-foreground text-base md:text-lg max-w-md mx-auto leading-relaxed"
              style={{ animation: "heroFadeUp 0.6s ease-out 0.55s both" }}
            >
              Elegant, accurate, and instant translations powered by neural AI — crafted for writers, travelers, and explorers.
            </p>
            <div
              className="flex items-center justify-center gap-3 mt-7"
              style={{ animation: "heroFadeUp 0.6s ease-out 0.7s both" }}
            >
              <button onClick={onLive} className="bg-primary text-primary-foreground px-7 py-3 rounded-full text-sm font-semibold hover:bg-accent transition-colors duration-200 flex items-center gap-2">
                <Mic size={14} />
                Start translating
              </button>
              <button className="border border-border text-foreground px-7 py-3 rounded-full text-sm font-medium hover:bg-secondary transition-colors duration-200">
                ▶ How it works
              </button>
            </div>
          </div>
          <div className="hidden md:block h-[340px] -mb-4"><BotanicalRight /></div>
        </div>
      </section>

      <section className="px-8 md:px-16 pb-16 pt-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch border-b border-border">
              <div className="flex items-center gap-4 px-6 py-3.5 border-r border-border">
                <LanguageSelect value={sourceLang} onChange={setSourceLang} />
              </div>
              <div className="flex items-center justify-center px-4">
                <button onClick={handleSwap} className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:scale-110 transition-transform duration-200">
                  <ArrowLeftRight size={15} />
                </button>
              </div>
              <div className="flex items-center gap-4 px-6 py-3.5 border-l border-border">
                <LanguageSelect value={targetLang} onChange={setTargetLang} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 min-h-[260px]">
              <div className="relative flex flex-col border-b md:border-b-0 md:border-r border-border">
                <textarea
                  value={sourceText}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  placeholder="Type or paste text here…"
                  className="flex-1 resize-none bg-transparent px-6 pt-5 pb-14 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 outline-none min-h-[220px] font-['DM_Sans']"
                />
                <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
                  <span className="text-xs font-['DM_Mono'] text-muted-foreground/60">{charCount} / 5000</span>
                  <button
                    onClick={handleTranslate}
                    disabled={!sourceText.trim() || isTranslating}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-semibold hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
                  >
                    {isTranslating ? (
                      <><span className="w-3 h-3 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />Translating…</>
                    ) : "Translate →"}
                  </button>
                </div>
              </div>
              <div className="relative flex flex-col bg-secondary/30">
                <div className="flex-1 px-6 pt-5 pb-14 text-[15px] leading-relaxed min-h-[220px] font-['DM_Sans']">
                  {translatedText ? (
                    <p className="text-foreground">{translatedText}</p>
                  ) : (
                    <p className="text-muted-foreground/40 italic">
                      {isTranslating ? "Translating your text…" : "Translation will appear here"}
                    </p>
                  )}
                </div>
                {translatedText && (
                  <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Volume2 size={13} />Listen
                    </button>
                    <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {copied ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-8 md:px-16 pb-20 bg-secondary/40 border-t border-border">
        <div ref={whyRef} className="max-w-5xl mx-auto pt-16">
          <p
            className="text-xs font-['DM_Mono'] tracking-[0.2em] uppercase text-accent mb-3 text-center transition-all duration-700 ease-out"
            style={{ opacity: whyInView ? 1 : 0, transform: whyInView ? "translateY(0)" : "translateY(20px)" }}
          >
            Why Fluent
          </p>
          <h2
            className="font-['Playfair_Display'] font-bold text-3xl md:text-4xl text-center mb-14 tracking-tight transition-all duration-700 ease-out"
            style={{ opacity: whyInView ? 1 : 0, transform: whyInView ? "translateY(0)" : "translateY(20px)", transitionDelay: whyInView ? "80ms" : "0ms" }}
          >
            Translation that feels <em className="italic">human</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Sparkles, color: "bg-[#5C8A5A]", title: "Neural Accuracy", desc: "Context-aware AI that understands idioms, tone, and cultural nuance — not just words." },
              { icon: Zap, color: "bg-accent", title: "Instant Results", desc: "Sub-second translations for up to 5,000 characters, powered by our low-latency inference pipeline." },
              { icon: BookOpen, color: "bg-[#3C6AB5]", title: "Khmer ↔ English", desc: "Purpose-built for Khmer and English, capturing tone, idiom, and cultural nuance that generic translators miss." },
            ].map(({ icon: Icon, color, title, desc }, i) => (
              <div
                key={title}
                className="bg-card rounded-2xl border border-border p-6 hover:shadow-md"
                style={{
                  opacity: whyInView ? 1 : 0,
                  transform: whyInView ? "translateY(0)" : "translateY(28px)",
                  transition: "opacity 0.6s ease-out, transform 0.6s ease-out, box-shadow 0.2s ease-out",
                  transitionDelay: whyInView ? `${180 + i * 130}ms` : "0ms",
                }}
              >
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="font-['Playfair_Display'] font-bold text-lg mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PlatformSection />
      <Footer />
    </div>
  );
}