import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useConversationStore } from "./store";
import {useAuth} from "./hooks/useAuth";
import LiveTranslatePage from "./routes/LiveTranslate";
import AboutPage from "./routes/About";
import SignInPage from "./routes/SignIn";
import SignUpPage from "./routes/SignUp";
import HistoryPage from "./routes/History";
import { useMotionPrefs } from "./hooks/useMotionPrefs";

export default function App() {
  const [page, setPage] = useState<"live" | "about" | "signin" | "signup" | "history">("about");
  const { user, login, logout } = useAuth();
  const { conversations, addConversation, deleteConversation } = useConversationStore();
  const { reduceMotion } = useMotionPrefs();
  const [pendingConversation, setPendingConversation] = useState<{
    sourceLang: string;
    targetLang: string;
    sourceText: string;
    translatedText: string;
  } | null>(null);

  const handleLogin = (loggedInUser: { name: string; email: string }) => {
    login(loggedInUser);
    if (pendingConversation) {
      const entry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        sourceLang: pendingConversation.sourceLang,
        targetLang: pendingConversation.targetLang,
        title: "Live Translation Session",
        duration: "< 1 min",
        exchanges: [{ source: pendingConversation.sourceText, translated: pendingConversation.translatedText }],
        summary: [`Translated from ${pendingConversation.sourceLang} to ${pendingConversation.targetLang}.`, "Session captured from live voice translation."],
        nextSteps: ["Review the translated content.", "Share or export if needed."],
      };
      addConversation(entry);
      setPendingConversation(null);
    }
    setPage("live");
  };

  const handleSignOut = () => {
    logout();
    setPage("about");
  };

  // Page routing
  const renderPage = () => {
    if (page === "live") {
      return (
        <LiveTranslatePage
          sourceLang="English"
          targetLang="Khmer"
          user={user}
          onGoAbout={() => setPage("about")}
          onGoSignIn={(conv) => {
            if (conv) setPendingConversation(conv);
            setPage("signin");
          }}
          onGoSignUp={() => setPage("signup")}
          onGoHistory={() => setPage("history")}
          onSignOut={handleSignOut}
        />
      );
    }

    if (page === "signin") {
      return (
        <SignInPage
          onBack={() => setPage("about")}
          onGoSignUp={() => setPage("signup")}
          onLogin={handleLogin}
        />
      );
    }

    if (page === "signup") {
      return (
        <SignUpPage
          onBack={() => setPage("about")}
          onGoSignIn={() => setPage("signin")}
          onLogin={handleLogin}
        />
      );
    }

    if (page === "history" && user) {
      return (
        <HistoryPage
          user={user}
          conversations={conversations}
          onBack={() => setPage("live")}
          onDelete={deleteConversation}
        />
      );
    }

    // default: about page
    return (
      <AboutPage
        user={user}
        onLive={() => setPage("live")}
        onSignIn={() => setPage("signin")}
        onSignUp={() => setPage("signup")}
        onHistory={() => setPage("history")}
        onSignOut={handleSignOut}
      />
    );
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={page}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
        transition={{ duration: reduceMotion ? 0.15 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {renderPage()}
      </motion.div>
    </AnimatePresence>
  );
}