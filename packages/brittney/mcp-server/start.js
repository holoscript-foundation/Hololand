#!/usr/bin/env node
/**
 * Self-bootstrapping MCP server entry point for Hololand/Brittney (ESM).
 * Builds dist/index.js automatically if missing, then starts the server.
 */
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, 'dist', 'index.js');

if (!existsSync(dist)) {
  process.stderr.write('[hololand-mcp] dist not found — building...\n');
  try {
    execSync('pnpm build', { cwd: __dirname, stdio: 'inherit' });
  } catch {
    execSync('npx tsc', { cwd: __dirname, stdio: 'inherit' });
  }
  process.stderr.write('[hololand-mcp] build complete\n');
}

await import(dist);
