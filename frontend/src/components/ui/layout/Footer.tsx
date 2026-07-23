import { Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border px-8 md:px-16 py-10">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-accent" />
          <span className="font-['Playfair_Display'] font-bold text-lg tracking-tight">Lingua</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="hover:text-foreground transition-colors">API Docs</a>
          <a href="#" className="hover:text-foreground transition-colors">Contact</a>
        </div>
        <p className="text-xs font-['DM_Mono'] text-muted-foreground/60">© 2026 Lingua. All rights reserved.</p>
      </div>
    </footer>
  );
}