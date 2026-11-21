# Stage 1: Build static React + Vite + TypeScript assets
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies using lockfile when present for deterministic builds
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

# Copy frontend source files
COPY . .

# Vite embeds VITE_* variables at build time (never bake secrets into build args)
ARG VITE_API_BASE_URL=""
ARG VITE_BACKEND_API_URL=""
ARG VITE_APP_ENV="production"

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_BACKEND_API_URL=${VITE_BACKEND_API_URL}
ENV VITE_APP_ENV=${VITE_APP_ENV}

RUN npm run build

# Stage 2: Serve static production build via unprivileged Nginx on Cloud Run port 8080
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

USER root
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
RUN chown -R 101:101 /usr/share/nginx/html /etc/nginx/conf.d/default.conf

USER 101

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
