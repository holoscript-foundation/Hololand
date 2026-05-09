FROM node:20-alpine

WORKDIR /app

# Install the pnpm version declared by the workspace.
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
RUN node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('package.json','utf8')); for (const name of ['@holoscript/agent-protocol','@holoscript/core']) delete (pkg.dependencies||{})[name]; if (pkg.pnpm) delete pkg.pnpm.overrides; fs.writeFileSync('package.json', JSON.stringify(pkg,null,2));"
RUN node -e "const fs=require('fs'); const lines=fs.readFileSync('pnpm-workspace.yaml','utf8').split(/\\r?\\n/).filter((line)=>!line.includes('link:../HoloScript')&&!line.includes('link:../infinitus-shared')); const idx=lines.findIndex((line)=>line.trim()==='overrides:'); if (idx !== -1) lines.splice(idx+1,0,\"  '@holoscript/core': 7.0.0\"); fs.writeFileSync('pnpm-workspace.yaml', lines.join('\\n'));"

# Copy only the packages needed for MCP server (avoid unrelated workspace packages with unpublished deps)
COPY packages/brittney/mcp-server ./packages/brittney/mcp-server
COPY packages/shared/inference ./packages/shared/inference

# Install dependencies ONLY for the MCP server package
RUN pnpm --filter @hololand/mcp-server... install --no-frozen-lockfile --ignore-scripts --config.auto-install-peers=false

# Build MCP server and its local workspace dependencies
RUN pnpm --filter @hololand/mcp-server... build

# Copy startup script and make it executable
COPY packages/brittney/mcp-server/scripts/railway-start.sh /app/railway-start.sh
RUN chmod +x /app/railway-start.sh

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Navigate to the built package and start both servers
WORKDIR /app/packages/brittney/mcp-server
CMD ["/app/railway-start.sh"]
