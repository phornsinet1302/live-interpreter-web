import BotanicalLeft from "./BotanicalLeft";
import BotanicalRight from "./BotanicalRight";
import { Globe } from "lucide-react";

export default function AuthBotanicalPanel() {
  return (
    <div className="relative w-full h-full bg-[#1C1612] overflow-hidden flex flex-col items-center justify-center px-12">
      <div className="absolute -bottom-8 -left-10 w-72 h-[520px] opacity-70">
        <BotanicalLeft />
      </div>
      <div className="absolute -bottom-8 -right-10 w-72 h-[520px] opacity-70">
        <BotanicalRight />
      </div>
      <div className="absolute top-16 right-16 w-32 h-32 rounded-full border border-white/10" />
      <div className="absolute top-20 right-20 w-20 h-20 rounded-full border border-white/8" />
      <div className="relative z-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-10">
          <Globe size={22} className="text-accent" />
          <span className="font-['Playfair_Display'] font-bold text-xl text-white tracking-tight">Lingua</span>
        </div>
        <h2 className="font-['Playfair_Display'] font-black text-4xl md:text-5xl text-white leading-[1.1] mb-5">
          Speak every<br /><em className="italic text-accent">language</em><br />fluently.
        </h2>
        <p className="text-white/50 text-sm font-['DM_Sans'] leading-relaxed max-w-xs mx-auto">
          Neural translation for writers, travelers, and anyone who believes words build bridges.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {["English", "日本語", "Español", "Français", "中文", "한국어", "Deutsch", "عربي"].map((lang) => (
            <span key={lang} className="px-3 py-1 rounded-full border border-white/15 text-white/60 text-xs font-['DM_Mono'] tracking-wide">
              {lang}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}