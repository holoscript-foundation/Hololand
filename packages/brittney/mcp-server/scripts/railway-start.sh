#!/bin/sh
set -e

echo "🚀 Hololand MCP Server Startup"

# Start Health Server in background (for Railway health checks on HTTP)
echo "🏥 Starting Health Check Server on port ${PORT:-3000}..."
node dist/health-server.js &
HEALTH_PID=$!
echo "   PID: $HEALTH_PID"

# Give health server time to start
sleep 2

# Start MCP server in foreground
echo "🎺 Starting Hololand MCP Server on stdio..."
node dist/index.js &
MCP_PID=$!

# Wait for both processes, exit if either fails
wait $HEALTH_PID $MCP_PID
