# ---- build: compile shared + web ----
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies using the workspace root
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci

# Build shared first, then web
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
RUN npm run build --workspace packages/shared

COPY apps/web ./apps/web
# VITE_API_URL is intentionally empty — Nginx proxies API requests,
# so the frontend uses relative URLs (same origin, no CORS needed).
ENV VITE_API_URL=""
RUN npm run build --workspace apps/web

# ---- runtime: Nginx serves SPA + proxies API ----
FROM nginx:1.27-alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
