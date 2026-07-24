import UserNav from "./UserNav";
import Logo from "@/components/ui/common/Logo";
import { UserAccount } from "@/types";

export default function Navbar({
  user,
  onLive,
  onSignIn,
  onSignUp,
  onHistory,
  onSignOut,
}: {
  user: UserAccount | null;
  onLive: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onHistory: () => void;
  onSignOut: () => void;
}) {
  return (
    <nav className="flex items-center justify-between px-8 md:px-16 py-5 border-b border-border/50">
      <button onClick={onLive} className="hover:opacity-80 transition-opacity">
        <Logo size="text-xl" />
      </button>
      <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
        <a href="#" className="hover:text-foreground transition-colors duration-200">Features</a>
        <a href="#" className="hover:text-foreground transition-colors duration-200">Languages</a>
        <a href="#" className="hover:text-foreground transition-colors duration-200">API</a>
        <a href="#" className="hover:text-foreground transition-colors duration-200">Pricing</a>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <UserNav user={user} onHistory={onHistory} onSignOut={onSignOut} />
        ) : (
          <>
            <button onClick={onSignIn} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </button>
            <button onClick={onSignUp} className="bg-primary text-primary-foreground text-sm px-5 py-2 rounded-full hover:bg-accent transition-colors duration-200 font-medium">
              Get started
            </button>
          </>
        )}
      </div>
    </nav>
  );
}