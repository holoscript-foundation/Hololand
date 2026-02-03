#!/usr/bin/env node
import http from 'http';

/**
 * HTTP Health Check Server for Railway
 * Runs alongside the stdio MCP server
 */

const PORT = Number(process.env.PORT || 3000);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        service: 'hololand-mcp',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      })
    );
    return;
  }

  if (req.url === '/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        service: 'Hololand MCP Server',
        transport: 'stdio',
        tools: 'brittney + holoscript + agent tools',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
      })
    );
    return;
  }

  if (req.url === '/info' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        name: 'Hololand',
        description: 'Hololand MCP Server for HoloScript + Brittney tools',
        docs: 'https://github.com/brianonbased-dev/Hololand',
      })
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      error: 'Not Found',
      available_endpoints: ['/health', '/status', '/info'],
    })
  );
});

server.listen(PORT, () => {
  console.log(`🏥 Hololand health server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing health server...');
  server.close(() => {
    console.log('Health server closed');
    process.exit(0);
  });
});

export default server;