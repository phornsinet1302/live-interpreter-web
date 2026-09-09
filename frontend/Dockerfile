# Build context is the repo root (pnpm workspace).
# docker-compose.yml points at this file with `context: .`

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── Install dependencies ─────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json  ./backend/package.json
RUN pnpm install --frozen-lockfile

# ── Build the Vite app ───────────────────────────────────────────────
FROM deps AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV VITE_API_URL=$NEXT_PUBLIC_API_URL
COPY tsconfig.base.json ./
COPY frontend ./frontend
RUN pnpm --filter frontend build

# ── Serve with a lightweight static server ───────────────────────────
FROM nginx:stable-alpine AS runtime
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# SPA fallback: send all non-file requests to index.html
RUN printf 'server {\n\
    listen 3000;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
