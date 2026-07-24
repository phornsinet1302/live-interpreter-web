import { useState } from "react";
import { ArrowLeft, Search, History as HistoryIcon } from "lucide-react";
import { UserAccount, ConversationEntry } from "../types";
import SessionCard from "@/components/ui/features/history/SessionCard";
import BotanicalLeft from "@/components/ui/common/BotanicalLeft";
import Logo from "@/components/ui/common/Logo";

export default function HistoryPage({
  user,
  conversations,
  onBack,
  onDelete,
}: {
  user: UserAccount;
  conversations: ConversationEntry[];
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");

  const langs = ["All", ...Array.from(new Set(conversations.filter(Boolean).map((c) => c.targetLang).filter(Boolean)))];

  const q = search.toLowerCase();
  const filtered = conversations.filter((c) => {
    if (!c) return false;
    const matchSearch = !q ||
      (c.title ?? "").toLowerCase().includes(q) ||
      (c.summary ?? []).some((s) => (s ?? "").toLowerCase().includes(q)) ||
      (c.exchanges ?? []).some(
        (e) =>
          (e?.source ?? "").toLowerCase().includes(q) ||
          (e?.translated ?? "").toLowerCase().includes(q)
      );
    const matchLang = filter === "All" || c.targetLang === filter;
    return matchSearch && matchLang;
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-['DM_Sans']">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <nav className="flex items-center justify-between px-8 md:px-16 py-5 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-40">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={15} />
          Back
        </button>
        <Logo size="text-lg" />
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-['DM_Mono']">
          {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-14">
        <div className="mb-12" style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
          <p className="text-xs font-['DM_Mono'] tracking-[0.2em] uppercase text-accent mb-3">Your sessions</p>
          <h1 className="font-['Playfair_Display'] font-black text-4xl md:text-5xl leading-[1.05] mb-3">
            Translation<br /><em className="italic">history</em>
          </h1>
          <p className="text-muted-foreground text-sm">
            {conversations.length} saved session{conversations.length !== 1 ? "s" : ""} · full transcripts, summaries & next steps
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-10" style={{ animation: "fadeSlideUp 0.35s ease-out" }}>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search sessions, summaries, or transcripts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-full pl-10 pr-4 py-2.5 text-sm font-['DM_Sans'] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {langs.map((lang) => (
              <button
                key={lang}
                onClick={() => setFilter(lang)}
                className={`px-4 py-2 rounded-full text-xs font-['DM_Mono'] tracking-wide transition-colors whitespace-nowrap ${
                  filter === lang
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <HistoryIcon size={22} className="text-muted-foreground" />
            </div>
            <p className="font-['Playfair_Display'] font-bold text-xl mb-2">No sessions found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or language filter.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filtered.map((conv, i) => (
              <SessionCard key={conv.id} conv={conv} index={i} onDelete={onDelete} />
            ))}
          </div>
        )}
        <div className="flex justify-center mt-20 opacity-[0.07] pointer-events-none">
          <div className="w-48 h-48"><BotanicalLeft /></div>
        </div>
      </div>
    </div>
  );
}