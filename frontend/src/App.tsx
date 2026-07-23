import { useState } from "react";
import { useConversationStore } from "./store";
import {useAuth} from "./hooks/useAuth";
import LiveTranslatePage from "./routes/LiveTranslate";
import AboutPage from "./routes/About";
import SignInPage from "./routes/SignIn";
import SignUpPage from "./routes/SignUp";
import HistoryPage from "./routes/History";

export default function App() {
  const [page, setPage] = useState<"live" | "about" | "signin" | "signup" | "history">("about");
  const { user, login, logout } = useAuth();
  const { conversations, addConversation, deleteConversation } = useConversationStore();
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
  if (page === "live") {
    return (
      <LiveTranslatePage
        sourceLang="English"
        targetLang="Spanish"
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
}