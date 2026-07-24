import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import AuthBotanicalPanel from "@/components/ui/common/AuthBotanicalPanel";
import AuthInput from "@/components/ui/features/auth/AuthInput";
import { UserAccount } from "../types";

export default function SignUpPage({
  onBack,
  onGoSignIn,
  onLogin,
}: {
  onBack: () => void;
  onGoSignIn: () => void;
  onLogin: (u: UserAccount) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !agreed) return;
    setLoading(true);
    setTimeout(() => { onLogin({ name, email }); }, 1400);
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
            Have an account?{" "}
            <button onClick={onGoSignIn} className="text-accent hover:underline font-medium">
              Sign in
            </button>
          </p>
        </div>
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 pb-12" style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
          <div className="max-w-sm w-full mx-auto">
            <p className="text-xs font-['DM_Mono'] tracking-[0.2em] uppercase text-accent mb-3">Free forever</p>
            <h1 className="font-['Playfair_Display'] font-black text-4xl md:text-5xl leading-[1.05] text-foreground mb-2">
              Create your<br /><em className="italic">account</em>
            </h1>
            <p className="text-sm text-muted-foreground mb-10 font-['DM_Sans']">
              Join thousands of translators, travelers, and wordsmiths.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <AuthInput label="Full name" type="text" placeholder="Ada Lovelace" value={name} onChange={setName} />
              <AuthInput label="Email address" type="email" placeholder="you@example.com" value={email} onChange={setEmail} />
              <AuthInput label="Password" type="password" placeholder="At least 8 characters" value={password} onChange={setPassword} hint="Use a mix of letters, numbers, and symbols." />
              <label className="flex items-start gap-2.5 cursor-pointer mt-1">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-3.5 h-3.5 mt-0.5 accent-[#C85A3A] shrink-0 rounded" />
                <span className="text-xs text-muted-foreground font-['DM_Sans'] leading-relaxed">
                  I agree to the{" "}
                  <span className="text-accent underline cursor-pointer">Terms of Service</span>{" "}
                  and{" "}
                  <span className="text-accent underline cursor-pointer">Privacy Policy</span>
                </span>
              </label>
              <button
                type="submit"
                disabled={loading || !name || !email || !password || !agreed}
                className="w-full bg-primary text-primary-foreground py-3.5 rounded-full text-sm font-semibold hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Creating account…</>
                ) : "Create account"}
              </button>
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-['DM_Mono']">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {["Sign up with Google", "Sign up with Apple"].map((label) => (
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