# Build context is the repo root (pnpm workspace + shared /prisma).
# docker compose already points at this file with `context: .`.

FROM node:22-alpine AS base
# pnpm 9 doesn't read pnpm-workspace.yaml's patchedDependencies (that's a v10+
# setting) — on a frozen install it errors with ERR_PNPM_LOCKFILE_CONFIG_MISMATCH,
# and on --no-frozen-lockfile it silently drops the patch instead. 11 is the
# oldest version confirmed to apply patches/fontkit@2.0.4.patch correctly —
# but pnpm 11 itself needs Node >=22.13 (uses the node:sqlite builtin), hence
# the base image bump from node:20 alongside this pin.
RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
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
