import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import SubtitleViewer from './routes/SubtitleViewer';
import './styles/index.css';

// A subtitle "second display" (FR-3) is a bare link with no login and no app
// chrome — this app has no router, so it's just a query-param check ahead of
// the normal app shell rather than a real route. Deliberately outside
// ClerkProvider too: a shareable second-display link has no account behind
// it at all.
const subtitleCode = new URLSearchParams(window.location.search).get('subtitles');

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!clerkPublishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {subtitleCode ? (
      <SubtitleViewer code={subtitleCode} />
    ) : (
      // attribute="class" toggles .dark on <html>, matching styles/theme.css's
      // .dark block and Tailwind's @custom-variant dark. FR-12's theme
      // preference (App.tsx) calls useTheme().setTheme() to drive this.
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ClerkProvider publishableKey={clerkPublishableKey}>
          <App />
        </ClerkProvider>
      </ThemeProvider>
    )}
  </React.StrictMode>
);