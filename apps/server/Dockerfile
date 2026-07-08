# --- Build Stage ---
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy lockfile and workspace configurations
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy packages and applications configurations
COPY packages/schema/package.json ./packages/schema/
COPY packages/nodes/package.json ./packages/nodes/
COPY packages/engine/package.json ./packages/engine/
COPY packages/export-codegen/package.json ./packages/export-codegen/
COPY apps/server/package.json ./apps/server/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy source directories
COPY packages/ ./packages/
COPY apps/server/ ./apps/server/

# Build all workspace packages and apps
RUN pnpm --filter @skein/schema build && \
    pnpm --filter @skein/nodes build && \
    pnpm --filter @skein/engine build && \
    pnpm --filter @skein/export-codegen build && \
    pnpm --filter @skein/server build

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy lockfile and workspace configs
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy built outputs and packages
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/server/ ./apps/server/

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Expose backend REST & WebSockets port
EXPOSE 3001

# Run the Fastify server
CMD ["node", "apps/server/dist/index.js"]
