# HoloScript Playground - Production Dockerfile
# Multi-stage build for optimized production image

# ============================================
# Stage 1: Build
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm build

# ============================================
# Stage 2: Production Runtime
# ============================================
FROM node:18-alpine

WORKDIR /app

# Install lightweight HTTP server
RUN npm install -g serve

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

# Expose port
EXPOSE 3000

# Run server
CMD ["serve", "-s", "dist", "-l", "3000"]
