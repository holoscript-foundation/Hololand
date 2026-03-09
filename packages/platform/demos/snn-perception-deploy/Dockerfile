# Multi-stage Dockerfile for SNN Perception Demo Production Deployment
# Optimized for minimal size, security hardening, and WebGPU compatibility

# ============================================================================
# Stage 1: Build Stage
# ============================================================================
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy all workspace packages (monorepo structure)
COPY packages ./packages

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Build SNN perception demo
WORKDIR /app/packages/platform/demos/snn-perception
RUN pnpm build

# Build platform renderer (dependency)
WORKDIR /app/packages/platform/renderer
RUN pnpm build

# ============================================================================
# Stage 2: Production Stage
# ============================================================================
FROM nginx:1.25-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    curl \
    tzdata

# Create non-root user for nginx
RUN addgroup -g 1001 -S hololand && \
    adduser -u 1001 -S hololand -G hololand

# Copy built assets from builder
COPY --from=builder --chown=hololand:hololand /app/packages/platform/demos/snn-perception/dist /usr/share/nginx/html

# Copy SNN model files
COPY --from=builder --chown=hololand:hololand /app/packages/platform/demos/snn-perception/models /usr/share/nginx/html/models

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/ssl /etc/nginx/ssl

# Copy health check script
COPY docker/healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Set permissions
RUN chown -R hololand:hololand /usr/share/nginx/html && \
    chown -R hololand:hololand /var/cache/nginx && \
    chown -R hololand:hololand /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R hololand:hololand /var/run/nginx.pid

# Security hardening
RUN rm -rf /usr/share/nginx/html/index.html && \
    rm -rf /etc/nginx/conf.d/default.conf.backup

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Expose ports
EXPOSE 80 443

# Switch to non-root user
USER hololand

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# ============================================================================
# Metadata
# ============================================================================
LABEL maintainer="HoloLand Platform Team"
LABEL version="1.0.0"
LABEL description="SNN Perception Demo - Production Deployment"
LABEL org.opencontainers.image.source="https://github.com/hololand/platform"
LABEL org.opencontainers.image.documentation="https://github.com/hololand/platform/tree/main/packages/platform/demos/snn-perception"

# ============================================================================
# Build Arguments (for customization)
# ============================================================================
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${VCS_REF}"
LABEL org.opencontainers.image.version="${VERSION}"
