# Demo Guide — Live Interpreter (current state)

This describes what actually works in the repo **today**, not the target architecture in
`STRUCTURE.md`. Read this before demoing so you don't promise something the code doesn't do yet.

## What's real vs. mocked right now

| Area | Status |
|---|---|
| Backend `POST /api/v1/auth/register`, `/login`, `/refresh` | Real — Express + Prisma + bcrypt + JWT, backed by Postgres |
| Backend `GET /api/v1/health` | Real |
| Swagger UI (`/api/docs`) | Real, documents the auth endpoints |
| Frontend Sign up / Sign in | **Mocked** — `setTimeout` fake delay, no call to the backend, no persisted session |
| Frontend "Live Translate" | **Mocked** — no microphone, no OpenAI call, no websocket. Typing animation plays back a canned phrase from `DEMO_PHRASES` and returns a canned string from `DEMO_TRANSLATIONS` |
| Frontend History | Local only — held in a Zustand store in memory, resets on page reload |
| translations / summaries / subtitles / speakers / conversations backend modules | Not implemented (empty `.gitkeep` placeholders) |

In short: the backend has a small but genuine auth API, and the frontend is a fully clickable
visual prototype that is **not wired to it yet**. Demo them as two separate things.

## 1. Run the backend and demo the real API

```bash
cd backend
pnpm install
pnpm exec prisma generate
pnpm exec prisma migrate dev
pnpm dev
```

- Open **http://localhost:4000/api/docs** (Swagger UI).
- Demo script:
  1. `POST /auth/register` with `{ "email": "demo@test.com", "password": "password123", "fullName": "Demo User" }` → 201, returns tokens.
  2. `POST /auth/login` with the same email/password → 200, returns access + refresh tokens.
  3. `POST /auth/refresh` with the refresh token → new access token.
  4. `GET /health` → confirms the API is up.

That's the entire real, working surface of the backend today.

## 2. Run the frontend and demo the UI prototype

```bash
cd frontend
pnpm install
pnpm dev
```

- Open **http://localhost:5173** (Vite default).
- Walkthrough:
  1. **About** page loads first — click **Try Live Translate** or **Sign In**.
  2. **Sign in / Sign up** — any email + password (min: non-empty) "succeeds" after a ~1.4s fake spinner. This does **not** call the backend or create a real account.
  3. **Live Translate** — click the mic button. It plays back a scripted phrase word‑by‑word, then shows a canned translated line after ~0.9s. Switching source/target language just changes which canned translation list is used.
  4. **History** — after a translate session + sign-in, the session is saved into an in-memory list. Reload the page and it's gone (no backend persistence).
  5. **Sign out** returns to About.

Frame this half of the demo as "here's the UX we've designed," not "here's the working
translation feature" — the mic/translation pipeline itself doesn't exist yet.

## Known gaps to mention if asked

- Frontend and backend are not integrated: no `fetch`/`axios` calls exist in the frontend at all yet.
- No real speech-to-text or OpenAI translation call anywhere in the code.
- No WebSocket wiring on the frontend despite `socket.io` being a backend dependency.
- `frontend/.env.example` still has `NEXT_PUBLIC_*` vars left over from an earlier Next.js
  plan — the app is actually Vite + React Router state (`App.tsx` swaps pages via `useState`,
  no `next` package installed).
