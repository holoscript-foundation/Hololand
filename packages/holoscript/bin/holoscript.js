#!/usr/bin/env node

/**
 * HoloScript CLI Executable
 * 
 * This is a wrapper that loads the compiled TypeScript CLI
 * and ensures proper Node.js execution.
 */

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
  },
});

require('../src/cli/index.ts');
