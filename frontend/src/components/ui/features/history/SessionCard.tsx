import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, CheckSquare, ChevronDown, RotateCcw, Share2, Sparkles, Star, Tag, Trash2 } from "lucide-react";
import { ConversationEntry, ConversationMessage } from "../../../../types";
import { getConversationMessages, generateSummary } from "@/lib/api/conversations";
import { downloadExport, requestExport, ExportError, type ExportFormat } from "@/lib/api/exports";
import { shareOrDownloadFile } from "@/lib/shareFile";

function formatDuration(conv: ConversationEntry): string {
  if (conv.startedAt && conv.endedAt) {
    const ms = new Date(conv.endedAt).getTime() - new Date(conv.startedAt).getTime();
    const minutes = Math.max(1, Math.round(ms / 60000));
    return `${minutes} min`;
  }
  if (conv.status === "ended") return "—";
  return conv.status;
}

export default function SessionCard({
  conv,
  index,
  onDelete,
  onToggleFavorite,
  onSummaryUpdate,
}: {
  conv: ConversationEntry;
  index: number;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, next: boolean) => void;
  onSummaryUpdate: (id: string, summary: ConversationEntry["summary"]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[] | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<ExportFormat | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setExportMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Lazy — the list view already has everything else it needs (summary,
  // message count) up front; the full transcript is only fetched once a
  // card is actually expanded, and cached after that first fetch.
  const handleToggleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && messages === null) {
      setMessagesLoading(true);
      try {
        setMessages(await getConversationMessages(conv.id));
      } catch {
        toast.error("Couldn't load the transcript — please try again.");
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    }
  };

  const handleRegenerateSummary = async () => {
    setRegenerating(true);
    try {
      const result = (await generateSummary(conv.id)) as {
        summary: string;
        keyPoints: string[];
        actionItems: { text: string }[];
        keywords: string[];
      };
      onSummaryUpdate(conv.id, result);
      toast.success("Summary generated");
    } catch {
      toast.error("Couldn't generate a summary — please try again.");
    } finally {
      setRegenerating(false);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    setExportMenuOpen(false);
    setPendingFormat(format);
    try {
      const record = await requestExport(conv.id, "full", format);
      if (record.status !== "completed") {
        toast.error("Couldn't generate that export — please try again.");
        return;
      }
      const { blob, filename } = await downloadExport(record.id, `${conv.title}.${format}`);
      const outcome = await shareOrDownloadFile(blob, filename, { title: conv.title });
      if (outcome !== "cancelled") toast.success(outcome === "shared" ? "Shared" : "Downloaded");
    } catch (err) {
      toast.error(err instanceof ExportError ? err.message : "Something went wrong — please try again.");
    } finally {
      setPendingFormat(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="bg-card border border-border rounded-3xl overflow-hidden transition-shadow duration-300 hover:shadow-md"
      style={{ animation: `fadeSlideUp ${0.25 + index * 0.07}s ease-out` }}
    >
      <div className="px-7 pt-6 pb-5 border-b border-border/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <span className="text-[10px] font-['DM_Mono'] tracking-[0.18em] uppercase text-muted-foreground">
                {conv.sourceLang}
              </span>
              <ArrowLeftRight size={10} className="text-muted-foreground/40 shrink-0" />
              <span className="text-[10px] font-['DM_Mono'] tracking-[0.18em] uppercase text-accent">
                {conv.targetLang}
              </span>
              <span className="text-[10px] font-['DM_Mono'] text-muted-foreground/40 ml-1">·</span>
              <span className="text-[10px] font-['DM_Mono'] text-muted-foreground/60">
                {formatDate(conv.createdAt)} at {formatTime(conv.createdAt)}
              </span>
            </div>
            <h3 className="font-['Playfair_Display'] font-bold text-xl text-foreground leading-snug">
              {conv.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <span className="text-[11px] font-['DM_Mono'] text-muted-foreground/60 border border-border rounded-full px-3 py-1">
              {formatDuration(conv)}
            </span>
            <span className="text-[11px] font-['DM_Mono'] text-muted-foreground/60 border border-border rounded-full px-3 py-1">
              {conv.messageCount} exchanges
            </span>
            <button
              onClick={() => onToggleFavorite(conv.id, !conv.isFavorite)}
              aria-label={conv.isFavorite ? "Remove from favorites" : "Add to favorites"}
              className={`p-1.5 rounded-full transition-colors ${
                conv.isFavorite ? "text-accent hover:bg-accent/8" : "text-muted-foreground/40 hover:text-accent hover:bg-accent/8"
              }`}
            >
              <Star size={13} fill={conv.isFavorite ? "currentColor" : "none"} />
            </button>
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setExportMenuOpen((o) => !o)}
                aria-label="Export or share conversation"
                className="p-1.5 rounded-full text-muted-foreground/40 hover:text-accent hover:bg-accent/8 transition-colors"
              >
                {pendingFormat ? (
                  <span className="block w-[13px] h-[13px] border-2 border-muted-foreground/30 border-t-accent rounded-full animate-spin" />
                ) : (
                  <Share2 size={13} />
                )}
              </button>
              {exportMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-20"
                  style={{ animation: "fadeSlideUp 0.15s ease-out" }}
                >
                  {(["pdf", "docx", "txt"] as ExportFormat[]).map((format) => (
                    <button
                      key={format}
                      onClick={() => handleExport(format)}
                      className="w-full px-4 py-2.5 text-xs font-['DM_Mono'] uppercase tracking-wide text-foreground hover:bg-secondary/60 transition-colors text-left"
                    >
                      Export as {format}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => onDelete(conv.id)} className="p-1.5 rounded-full text-muted-foreground/40 hover:text-accent hover:bg-accent/8 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
      <div className="px-7 py-6 flex flex-col gap-7">
        <div>
          <button onClick={handleToggleExpand} className="flex items-center gap-2 text-xs font-['DM_Mono'] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-4 group">
            <span
              className="w-4 h-4 rounded border border-border/80 flex items-center justify-center transition-transform duration-200 group-hover:border-foreground/30"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            >
              <ChevronDown size={10} />
            </span>
            {expanded ? "Hide transcript" : "View full transcript"}
            <span className="text-muted-foreground/40 font-normal normal-case tracking-normal ml-1">
              ({conv.messageCount} exchanges)
            </span>
          </button>
          {expanded && (
            messagesLoading ? (
              <p className="text-sm text-muted-foreground pl-2">Loading transcript…</p>
            ) : (
              <div className="flex flex-col gap-4 pl-2 border-l-2 border-border/40 ml-1">
                {(messages ?? []).map((m) => (
                  <div key={m.id} className="flex flex-col gap-2" style={{ animation: "fadeSlideUp 0.2s ease-out" }}>
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-[7px] shrink-0" />
                      <p className="text-sm font-['DM_Sans'] text-foreground/70 leading-relaxed">{m.originalText}</p>
                    </div>
                    <div className="flex items-start gap-3 ml-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent/60 mt-[7px] shrink-0" />
                      <p className="text-sm font-['Playfair_Display'] italic text-foreground leading-relaxed">{m.translatedText}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        <div className="h-px bg-border/50" />

        {conv.summary ? (
          <>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-xs font-['DM_Mono'] tracking-[0.15em] uppercase text-foreground/80 font-medium">
                  Session summary
                </p>
                <span className="flex items-center gap-1 text-[10px] font-['DM_Mono'] text-accent border border-accent/30 rounded-full px-2 py-0.5">
                  <Sparkles size={9} />
                  AI
                </span>
              </div>
              <p className="text-sm font-['DM_Sans'] text-foreground/80 leading-relaxed">{conv.summary.summary}</p>
              {conv.summary.keyPoints.length > 0 && (
                <ul className="flex flex-col gap-2.5 mt-3">
                  {conv.summary.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 mt-[7px] shrink-0" />
                      <p className="text-sm font-['DM_Sans'] text-foreground/80 leading-relaxed">{point}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {conv.summary.actionItems.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-['DM_Mono'] tracking-[0.15em] uppercase text-foreground/80 font-medium mb-4">
                  <CheckSquare size={13} /> Action items
                </p>
                <ul className="flex flex-col gap-2.5">
                  {conv.summary.actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-3.5 h-3.5 rounded border border-border/80 shrink-0 mt-1" />
                      <p className="text-sm font-['DM_Sans'] text-foreground/80 leading-relaxed">{item.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {conv.summary.keywords.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-['DM_Mono'] tracking-[0.15em] uppercase text-foreground/80 font-medium mb-4">
                  <Tag size={13} /> Keywords
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {conv.summary.keywords.map((keyword, i) => (
                    <span key={i} className="text-xs text-foreground/70 bg-secondary/60 border border-border/50 rounded-full px-2.5 py-1">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground italic">No summary available for this session.</p>
            <button
              onClick={handleRegenerateSummary}
              disabled={regenerating}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 disabled:opacity-50 transition-colors shrink-0"
            >
              <RotateCcw size={12} className={regenerating ? "animate-spin" : ""} />
              {regenerating ? "Generating…" : "Generate summary"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
