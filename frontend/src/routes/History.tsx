import { useEffect, useState } from "react";
import { ArrowLeft, LayoutDashboard, RotateCcw, Search, Settings, Star, History as HistoryIcon } from "lucide-react";
import { UserAccount, ConversationEntry } from "../types";
import { listConversations, deleteConversation, updateConversation } from "@/lib/api/conversations";
import SessionCard from "@/components/ui/features/history/SessionCard";
import BotanicalLeft from "@/components/ui/common/BotanicalLeft";
import Logo from "@/components/ui/common/Logo";
import { backendOrigin } from "@/lib/api/utils/authFetch";

export default function HistoryPage({
  user,
  onBack,
  onDashboard,
  onSettings,
}: {
  user: UserAccount;
  onBack: () => void;
  onDashboard: () => void;
  onSettings: () => void;
}) {
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(null);
    listConversations()
      .then(setConversations)
      .catch(() => setLoadError("Couldn't load your history — please try again."))
      .finally(() => setLoading(false));
  };

  // Real, account-synced history (FR-5) — fetched fresh every time this page
  // opens, so it reflects sessions saved from any device, not just this browser.
  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    const previous = conversations;
    setConversations((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteConversation(id);
    } catch {
      setConversations(previous);
    }
  };

  const handleToggleFavorite = async (id: string, next: boolean) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, isFavorite: next } : c)));
    try {
      await updateConversation(id, { isFavorite: next });
    } catch {
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, isFavorite: !next } : c)));
    }
  };

  const handleSummaryUpdate = (id: string, summary: ConversationEntry["summary"]) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, summary } : c)));
  };

  const langs = ["All", ...Array.from(new Set(conversations.map((c) => c.targetLang).filter(Boolean)))];

  const q = search.toLowerCase();
  const filtered = conversations.filter((c) => {
    const matchSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      (c.summary?.summary ?? "").toLowerCase().includes(q) ||
      (c.summary?.keyPoints ?? []).some((k) => k.toLowerCase().includes(q)) ||
      (c.summary?.keywords ?? []).some((k) => k.toLowerCase().includes(q));
    const matchLang = filter === "All" || c.targetLang === filter;
    const matchFavorite = !favoritesOnly || c.isFavorite;
    return matchSearch && matchLang && matchFavorite;
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
        <div className="flex items-center gap-4">
          <button onClick={onDashboard} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <LayoutDashboard size={15} />
            Dashboard
          </button>
          <button onClick={onSettings} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Settings size={15} />
            Settings
          </button>
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-['DM_Mono'] overflow-hidden">
            {user.avatarUrl ? (
              <img src={`${backendOrigin()}${user.avatarUrl}`} alt="" className="w-full h-full object-cover" />
            ) : (
              user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
            )}
          </div>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-14">
        <div className="mb-12" style={{ animation: "fadeSlideUp 0.3s ease-out" }}>
          <p className="text-xs font-['DM_Mono'] tracking-[0.2em] uppercase text-accent mb-3">Your sessions</p>
          <h1 className="font-['Playfair_Display'] font-black text-4xl md:text-5xl leading-[1.05] mb-3">
            Translation<br /><em className="italic">history</em>
          </h1>
          <p className="text-muted-foreground text-sm">
            {conversations.length} saved session{conversations.length !== 1 ? "s" : ""} · synced to your account
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-10" style={{ animation: "fadeSlideUp 0.35s ease-out" }}>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search sessions, summaries, or keywords…"
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
            <button
              onClick={() => setFavoritesOnly((f) => !f)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-['DM_Mono'] tracking-wide transition-colors whitespace-nowrap ${
                favoritesOnly
                  ? "bg-accent text-accent-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star size={11} fill={favoritesOnly ? "currentColor" : "none"} />
              Favorites
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-28">
            <span className="flex items-center gap-1">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </span>
            Loading your history…
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 py-28 text-center">
            <p className="text-sm text-destructive" role="alert">{loadError}</p>
            <button onClick={load} className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors">
              <RotateCcw size={13} /> Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <HistoryIcon size={22} className="text-muted-foreground" />
            </div>
            <p className="font-['Playfair_Display'] font-bold text-xl mb-2">No sessions found</p>
            <p className="text-sm text-muted-foreground">
              {conversations.length === 0
                ? "Finish a live translation session while signed in to save it here."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filtered.map((conv, i) => (
              <SessionCard
                key={conv.id}
                conv={conv}
                index={i}
                onDelete={handleDelete}
                onToggleFavorite={handleToggleFavorite}
                onSummaryUpdate={handleSummaryUpdate}
              />
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
