FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.9

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy only the packages needed for MCP server (avoid examples that have unpublished deps)
COPY packages/brittney ./packages/brittney
COPY packages/core ./packages/core
COPY packages/inference ./packages/inference

# Install dependencies ONLY for the MCP server package
RUN pnpm --filter @hololand/mcp-server install --no-frozen-lockfile

# Build MCP server
RUN pnpm --filter @hololand/mcp-server build

# Copy startup script and make it executable
COPY packages/brittney/mcp-server/scripts/railway-start.sh /app/railway-start.sh
RUN chmod +x /app/railway-start.sh

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Navigate to the built package and start both servers
WORKDIR /app/packages/brittney/mcp-server
CMD ["/app/railway-start.sh"]
