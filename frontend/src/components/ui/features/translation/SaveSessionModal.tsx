import BotanicalRight from "../../common/BotanicalRight";

// Shown when a signed-in user taps the mic to stop a session that has
// content — unlike ExitModal (guests leaving the page), this user already
// has an account, so the choice is simply whether to persist the session to
// their history, discard it, or keep talking. See LiveTranslate.tsx's
// stopListening for how each choice is handled.
export default function SaveSessionModal({
  onSave,
  onDiscard,
  onContinue,
  saving,
}: {
  onSave: () => void;
  onDiscard: () => void;
  onContinue: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={saving ? undefined : onContinue} />
      <div
        className="relative bg-card border border-border rounded-3xl shadow-xl max-w-md w-full p-8 font-['DM_Sans']"
        style={{ animation: "fadeSlideUp 0.25s ease-out" }}
      >
        <div className="absolute top-0 right-0 w-28 h-28 opacity-10 pointer-events-none overflow-hidden rounded-3xl">
          <BotanicalRight />
        </div>
        <p className="text-xs font-['DM_Mono'] tracking-[0.18em] uppercase text-accent mb-3">Session stopped</p>
        <h2 className="font-['Playfair_Display'] font-black text-2xl md:text-3xl leading-tight text-foreground mb-3">
          Save this<br /><em className="italic">conversation?</em>
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Save it to your translation history, discard it, or keep talking to add more to it.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-full text-sm font-semibold hover:bg-accent disabled:opacity-60 transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              "Save to history"
            )}
          </button>
          <button
            onClick={onDiscard}
            disabled={saving}
            className="w-full border border-border bg-transparent text-foreground py-3.5 rounded-full text-sm font-medium hover:bg-secondary disabled:opacity-60 transition-colors duration-200"
          >
            Don't save
          </button>
          <button
            onClick={onContinue}
            disabled={saving}
            className="w-full text-muted-foreground text-sm py-2 hover:text-foreground disabled:opacity-60 transition-colors"
          >
            Continue talking
          </button>
        </div>
      </div>
    </div>
  );
}
