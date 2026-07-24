import { useState } from "react";
import { ArrowLeftRight, ChevronDown, Sparkles, Trash2 } from "lucide-react";
import { ConversationEntry } from "../../../../types";

export default function SessionCard({
  conv,
  index,
  onDelete,
}: {
  conv: ConversationEntry;
  index: number;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

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
                {formatDate(conv.date)} at {formatTime(conv.date)}
              </span>
            </div>
            <h3 className="font-['Playfair_Display'] font-bold text-xl text-foreground leading-snug">
              {conv.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <span className="text-[11px] font-['DM_Mono'] text-muted-foreground/60 border border-border rounded-full px-3 py-1">
              {conv.duration}
            </span>
            <span className="text-[11px] font-['DM_Mono'] text-muted-foreground/60 border border-border rounded-full px-3 py-1">
              {conv.exchanges.length} exchanges
            </span>
            <button onClick={() => onDelete(conv.id)} className="p-1.5 rounded-full text-muted-foreground/40 hover:text-accent hover:bg-accent/8 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
      <div className="px-7 py-6 flex flex-col gap-7">
        <div>
          <button onClick={() => setExpanded((e) => !e)} className="flex items-center gap-2 text-xs font-['DM_Mono'] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-4 group">
            <span
              className="w-4 h-4 rounded border border-border/80 flex items-center justify-center transition-transform duration-200 group-hover:border-foreground/30"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            >
              <ChevronDown size={10} />
            </span>
            {expanded ? "Hide transcript" : "View full transcript"}
            <span className="text-muted-foreground/40 font-normal normal-case tracking-normal ml-1">
              ({conv.exchanges.length} exchanges)
            </span>
          </button>
          {expanded && (
            <div className="flex flex-col gap-4 pl-2 border-l-2 border-border/40 ml-1">
              {conv.exchanges.map((ex, i) => (
                <div key={i} className="flex flex-col gap-2" style={{ animation: "fadeSlideUp 0.2s ease-out" }}>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-[7px] shrink-0" />
                    <p className="text-sm font-['DM_Sans'] text-foreground/70 leading-relaxed">{ex.source}</p>
                  </div>
                  <div className="flex items-start gap-3 ml-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent/60 mt-[7px] shrink-0" />
                    <p className="text-sm font-['Playfair_Display'] italic text-foreground leading-relaxed">{ex.translated}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="h-px bg-border/50" />
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
          <ul className="flex flex-col gap-2.5">
            {conv.summary.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 mt-[7px] shrink-0" />
                <p className="text-sm font-['DM_Sans'] text-foreground/80 leading-relaxed">{point}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-secondary/40 rounded-2xl px-5 py-5 border border-border/50">
          <p className="text-xs font-['DM_Mono'] tracking-[0.15em] uppercase text-accent font-medium mb-4">
            Next steps
          </p>
          <ul className="flex flex-col gap-2.5">
            {conv.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full border border-border/80 flex items-center justify-center text-[10px] font-['DM_Mono'] text-muted-foreground shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm font-['DM_Sans'] text-foreground leading-relaxed">{step}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}