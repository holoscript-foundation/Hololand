# Hololand Oasis - Production Dockerfile
# Designed for Railway deployment of monorepo subfolder

# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root workspace files for dependency resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all workspace packages that oasis depends on
COPY packages/ packages/
COPY examples/oasis/ examples/oasis/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build the oasis app
WORKDIR /app/examples/oasis
RUN pnpm build

# Production stage - serve static files with nginx
FROM nginx:alpine AS production

# Copy nginx config
COPY examples/oasis/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/examples/oasis/dist /usr/share/nginx/html

# Expose port (Railway will override with $PORT)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
