# ---- build: compile shared + API ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci

COPY infra ./infra
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build --workspace packages/shared && npm run build --workspace apps/api

# ---- runtime: production-only dependencies ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --omit=dev

COPY infra ./infra
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

USER node
CMD ["node", "apps/api/dist/index.js"]
