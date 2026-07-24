import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import AuthBotanicalPanel from "@/components/ui/common/AuthBotanicalPanel";
import AuthInput from "@/components/ui/features/auth/AuthInput";
import { UserAccount } from "@/types";

export default function SignInPage({
  onBack,
  onGoSignUp,
  onLogin,
}: {
  onBack: () => void;
  onGoSignUp: () => void;
  onLogin: (u: UserAccount) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setTimeout(() => {
      const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      onLogin({ name, email });
    }, 1400);
  };

  return (
    <div className="fixed inset-0 bg-background flex font-['DM_Sans'] z-50">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="hidden lg:block w-[42%] shrink-0">
        <AuthBotanicalPanel />
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-8 py-5 shrink-0">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={15} />
            Home
          </button>
          <p className="text-sm text-muted-foreground font-['DM_Sans']">
            No account?{" "}
            <button onClick={onGoSignUp} className="text-accent hover:underline font-medium">
              Sign up
            </button>
          </p>
        </div>
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 pb-12" style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
          <div className="max-w-sm w-full mx-auto">
            <p className="text-xs font-['DM_Mono'] tracking-[0.2em] uppercase text-accent mb-3">Welcome back</p>
            <h1 className="font-['Playfair_Display'] font-black text-4xl md:text-5xl leading-[1.05] text-foreground mb-2">
              Sign in to<br /><em className="italic">Fluent</em>
            </h1>
            <p className="text-sm text-muted-foreground mb-10 font-['DM_Sans']">
              Continue where you left off.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <AuthInput label="Email address" type="email" placeholder="you@example.com" value={email} onChange={setEmail} />
              <AuthInput label="Password" type="password" placeholder="Your password" value={password} onChange={setPassword} />
              <div className="flex items-center justify-between mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 accent-[#C85A3A] rounded" />
                  <span className="text-xs text-muted-foreground font-['DM_Sans']">Remember me</span>
                </label>
                <button type="button" className="text-xs text-accent hover:underline font-['DM_Sans']">
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-primary text-primary-foreground py-3.5 rounded-full text-sm font-semibold hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Signing in…</>
                ) : "Sign in"}
              </button>
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-['DM_Mono']">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {["Continue with Google", "Continue with Apple"].map((label) => (
                <button key={label} type="button" className="w-full border border-border bg-card text-foreground py-3 rounded-full text-sm font-medium hover:bg-secondary transition-colors duration-200 font-['DM_Sans']">
                  {label}
                </button>
              ))}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}