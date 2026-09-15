import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './styles/index.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!clerkPublishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* attribute="class" toggles .dark on <html>, matching styles/theme.css's
        .dark block and Tailwind's @custom-variant dark. FR-12's theme
        preference (App.tsx) calls useTheme().setTheme() to drive this. */}
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <App />
      </ClerkProvider>
    </ThemeProvider>
  </React.StrictMode>
);
