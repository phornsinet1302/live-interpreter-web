# Project Structure

```
live-interpreter-web/
├── backend/             # Node.js + Express API (also serves the future mobile app)
│   ├── src/
│   │   ├── server.ts    #   boot: http + websocket
│   │   ├── app.ts       #   express app, mounts /api/v1/* routers
│   │   ├── config/      #   env parsing / typed config
│   │   ├── lib/         #   prisma jwt bcrypt openai logger
│   │   ├── middleware/  #   auth role validation rate-limit error
│   │   ├── websocket/   #   socket events handlers
│   │   ├── utils/ types/ constants/
│   │   └── modules/     #   FEATURE-FIRST, layered (see pattern below)
│   │       ├── auth/  users/  workspaces/  conversations/
│   │       ├── translations/ summaries/ subtitles/ speakers/
│   │       └── suggestions/ exports/ notifications/ analytics/ health/
│   └── tsconfig.json  package.json
│
├── prisma/              # schema.prisma, migrations/, seed.ts  (used by backend)
├── docs/                # swagger.yaml, api.md, database.md, architecture.md
├── tests/               # unit/ integration/ e2e/
├── public/              # static assets
│
├── package.json         # workspace root scripts (dev / build / lint)
├── pnpm-workspace.yaml  # packages: backend
├── tsconfig.base.json   # shared compiler options
└── README.md
```

## Backend module pattern

Every folder under `backend/src/modules/<feature>/` uses the same layering.
`auth/` is the reference — copy it for each new feature:

| File                | Responsibility                                        |
|---------------------|-------------------------------------------------------|
| `*.route.ts`        | URL → controller mapping. No logic.                   |
| `*.controller.ts`   | Parse/validate request, call service, shape response. |
| `*.service.ts`      | Business rules & orchestration. No req/res, no DB.    |
| `*.repository.ts`   | The only layer that talks to Prisma/DB.               |
| `*.validator.ts`    | Zod input schemas.                                    |
| `*.types.ts` / `*.constants.ts` | Module-local types and constants.         |

Call direction: **route → controller → service → repository**. Never skip upward.

## Commands

```bash
pnpm install          # install backend dependencies
pnpm dev              # backend only (http://localhost:4000)
pnpm db:migrate       # prisma migrate (schema in /prisma)
```

## Notes

- **`prisma/` lives at the repo root** (shared). `backend/package.json` points Prisma
  at it via `"prisma": { "schema": "../prisma/schema.prisma" }`.
- **`public/` at the root** holds shared static assets.
- The **mobile app** is a separate project; it consumes `backend` over HTTP/WebSocket.
