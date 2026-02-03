FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.9

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps ./apps
COPY examples ./examples

# Install dependencies (skip frozen-lockfile for monorepo)
RUN pnpm install --no-frozen-lockfile --prefer-offline

# Build MCP server
RUN pnpm --filter @hololand/mcp-server build

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start health server + MCP server
CMD ["pnpm", "--filter", "@hololand/mcp-server", "start"]
