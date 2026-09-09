import { ArrowLeft } from "lucide-react";
import { SignIn as ClerkSignIn } from "@clerk/clerk-react";
import AuthBotanicalPanel from "@/components/ui/common/AuthBotanicalPanel";

// Clerk's own mountable component drives the actual sign-in flow (including
// email verification, password reset, and any social providers enabled in
// the Clerk Dashboard) — routing="virtual" keeps it a self-contained step
// machine with no react-router dependency, fitting this app's manual
// page-state model. A successful sign-in is detected in App.tsx by watching
// Clerk's isSignedIn transition, not via a callback prop here.
export default function SignInPage({
  onBack,
  onGoSignUp,
}: {
  onBack: () => void;
  onGoSignUp: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-background flex font-['DM_Sans'] z-50">
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
        <div className="flex-1 flex items-center justify-center px-8 pb-12">
          <ClerkSignIn
            routing="virtual"
            signUpUrl="#"
            appearance={{
              // Clerk computes hover/active shades from these in JS, so they
              // need literal color values — a CSS var() reference only means
              // something to the browser's renderer, not to Clerk's own
              // color math, and silently produced an invisible (transparent
              // background, white text) submit button.
              variables: {
                colorPrimary: "#C85A3A",
                colorBackground: "#FDFAF4",
                colorText: "#1C1612",
                colorTextSecondary: "#7A6F62",
                borderRadius: "1rem",
                fontFamily: "'DM Sans', sans-serif",
              },
              elements: {
                card: "shadow-none border border-[var(--border)] bg-[var(--card)]",
                headerTitle: "font-['Playfair_Display']",
                // This app has no router, so Clerk's own footer link (which
                // just navigates to signUpUrl="#" — a no-op hash change, not
                // a real page switch) can't actually get anywhere. The
                // header above already has a working "No account? Sign up"
                // link wired to this app's own page-switching, so hide the
                // redundant, non-functional one instead of the reverse.
                footerAction: "!hidden",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
