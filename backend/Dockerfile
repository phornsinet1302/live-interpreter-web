# Build context is the repo root (pnpm workspace + shared /prisma).
# docker compose already points at this file with `context: .`.

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json ./backend/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY prisma ./prisma
COPY backend ./backend
ENV DEBUG=*
RUN pnpm --filter backend db:generate
RUN pnpm --filter backend build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/prisma ./prisma

EXPOSE 4000
CMD ["node", "backend/dist/server.js"]
