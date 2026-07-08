# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package lock and workspace configurations
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy package descriptors
COPY packages/schema/package.json ./packages/schema/
COPY packages/nodes/package.json ./packages/nodes/
COPY packages/engine/package.json ./packages/engine/
COPY packages/export-codegen/package.json ./packages/export-codegen/
COPY apps/web/package.json ./apps/web/

# Install workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy source directories
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Build packages and compile frontend Vite bundle
RUN pnpm --filter @skein/schema build && \
    pnpm --filter @skein/web build

# --- Production Nginx Stage ---
FROM nginx:alpine

# Copy static built client code to nginx HTML directory
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Expose Nginx server port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
