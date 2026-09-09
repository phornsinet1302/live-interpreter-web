import { useState, useEffect, useRef } from "react";
import { ChevronDown, History, LayoutDashboard, User, LogOut } from "lucide-react";
import { UserAccount } from "@/types";
import { backendOrigin } from "@/lib/api/utils/authFetch";

export default function UserNav({
  user,
  onHistory,
  onDashboard,
  onSettings,
  onSignOut,
}: {
  user: UserAccount;
  onHistory: () => void;
  onDashboard: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const avatarSrc = user.avatarUrl ? `${backendOrigin()}${user.avatarUrl}` : null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 group">
        <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-['DM_Mono'] font-medium group-hover:bg-accent transition-colors duration-200 overflow-hidden">
          {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : initials}
        </div>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-3 w-64 bg-card border border-border rounded-2xl shadow-lg overflow-hidden z-50" style={{ animation: "fadeSlideUp 0.2s ease-out" }}>
          <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <div className="px-4 py-4 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-['DM_Mono'] font-medium shrink-0 overflow-hidden">
                {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : initials}
              </div>
              <div className="min-w-0">
                <p className="font-['Playfair_Display'] font-bold text-sm text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground font-['DM_Sans'] truncate">{user.email}</p>
              </div>
            </div>
          </div>
          <div className="py-2">
            <button onClick={() => { setOpen(false); onDashboard(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-['DM_Sans'] text-foreground hover:bg-secondary/60 transition-colors text-left">
              <LayoutDashboard size={15} className="text-muted-foreground" />
              Analytics dashboard
            </button>
            <button onClick={() => { setOpen(false); onHistory(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-['DM_Sans'] text-foreground hover:bg-secondary/60 transition-colors text-left">
              <History size={15} className="text-muted-foreground" />
              Translation history
            </button>
            <button onClick={() => { setOpen(false); onSettings(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-['DM_Sans'] text-foreground hover:bg-secondary/60 transition-colors text-left">
              <User size={15} className="text-muted-foreground" />
              Account settings
            </button>
          </div>
          <div className="border-t border-border py-2">
            <button onClick={() => { setOpen(false); onSignOut(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-['DM_Sans'] text-accent hover:bg-accent/8 transition-colors text-left">
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}