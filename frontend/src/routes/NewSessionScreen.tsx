import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/ui/common/Logo";

// First step of the "New Session" flow (see App.tsx): name the session up
// front so it saves to History under that name instead of Home's default
// "Live Translation Session" title — see SessionLiveScreen, which this hands
// off to.
export default function NewSessionScreen({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const trimmed = name.trim();

  const start = () => {
    if (!trimmed) return;
    onStart(trimmed);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-['DM_Sans'] flex flex-col">
      <nav className="flex items-center justify-between px-8 md:px-16 py-5 border-b border-border/50">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={15} />
          Back
        </button>
        <Logo size="text-lg" />
        <div className="w-8" />
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-14">
        <div className="max-w-md w-full">
          <p className="text-xs font-['DM_Mono'] tracking-[0.2em] uppercase text-accent mb-3">New session</p>
          <h1 className="font-['Playfair_Display'] font-black text-4xl md:text-5xl leading-[1.05] mb-3">
            Name this<br /><em className="italic">conversation.</em>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Give it a name so you can find it later in History — something like "Team Standup" or "Client meeting."
          </p>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") start();
            }}
            placeholder="Team Standup"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={start}
            disabled={!trimmed}
            className="w-full mt-6 bg-primary text-primary-foreground py-3.5 rounded-full text-sm font-semibold hover:bg-accent disabled:opacity-50 transition-colors duration-200"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
