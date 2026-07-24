import BotanicalRight from "../../common/BotanicalRight";

export default function ExitModal({
  onSave,
  onDiscard,
  onCancel,
  hasContent,
}: {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  hasContent: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative bg-card border border-border rounded-3xl shadow-xl max-w-md w-full p-8 font-['DM_Sans']"
        style={{ animation: "fadeSlideUp 0.25s ease-out" }}
      >
        <div className="absolute top-0 right-0 w-28 h-28 opacity-10 pointer-events-none overflow-hidden rounded-3xl">
          <BotanicalRight />
        </div>
        <p className="text-xs font-['DM_Mono'] tracking-[0.18em] uppercase text-accent mb-3">Before you go</p>
        <h2 className="font-['Playfair_Display'] font-black text-2xl md:text-3xl leading-tight text-foreground mb-3">
          Save this<br /><em className="italic">conversation?</em>
        </h2>
        {hasContent ? (
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            You have translated content in this session. Sign in to save it to your history — or clear it and start fresh.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Are you sure you want to clear this session?
          </p>
        )}
        <div className="flex flex-col gap-3">
          {hasContent && (
            <button
              onClick={onSave}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-full text-sm font-semibold hover:bg-accent transition-colors duration-200 flex items-center justify-center gap-2"
            >
              Sign in to save →
            </button>
          )}
          <button
            onClick={onDiscard}
            className="w-full border border-border bg-transparent text-foreground py-3.5 rounded-full text-sm font-medium hover:bg-secondary transition-colors duration-200"
          >
            {hasContent ? "Clear and start fresh" : "Yes, clear session"}
          </button>
          <button
            onClick={onCancel}
            className="w-full text-muted-foreground text-sm py-2 hover:text-foreground transition-colors"
          >
            Stay on this page
          </button>
        </div>
      </div>
    </div>
  );
}