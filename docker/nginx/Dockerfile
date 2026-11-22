# syntax=docker/dockerfile:1.7

###############################################################################
# Stage 1 — Build the React SPA
###############################################################################
FROM node:22-alpine AS frontend

WORKDIR /app

# The upstream package-lock has an unresolved TypeScript peer range
# (typescript ~7 vs typescript-eslint <6.1); install with legacy peer
# resolution, exactly as documented in README.md.
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json eslint.config.js ./
COPY public ./public
COPY src ./src

ARG VITE_API_BASE=/api
ENV VITE_API_BASE=${VITE_API_BASE}

RUN npm run build

###############################################################################
# Stage 2 — nginx serving the SPA + proxying the API to php-fpm
###############################################################################
FROM nginx:1.27-alpine

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
# Normalize line endings (Windows checkouts may be CRLF).
RUN sed -i 's/\r$//' /etc/nginx/conf.d/default.conf /etc/nginx/snippets/security-headers.conf
COPY --from=frontend /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/healthz || exit 1
