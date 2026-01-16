#!/usr/bin/env node

import { Command } from 'commander';
import { HoloScriptBuilder, runBuild } from './build';
import { watch } from './watch';

const program = new Command();

program
  .name('holoscript')
  .description('HoloScript compiler CLI - compile .hs files to React Three Fiber components')
  .version('0.1.0');

// Build command
program
  .command('build <input>')
  .description('Build a HoloScript file to React Three Fiber')
  .option('-o, --output <path>', 'Output file path (default: same directory with .tsx extension)')
  .option('-w, --watch', 'Watch for file changes (experimental)')
  .option('--optimize', 'Enable code optimization')
  .option('--source-maps', 'Generate source maps')
  .option('-v, --verbose', 'Verbose output')
  .action(async (input, options) => {
    if (options.watch) {
      console.log('🔍 Watching for changes...');
      watch(input, options);
    } else {
      await runBuild(input, options);
    }
  });

// Compile command (alias for build)
program
  .command('compile <input>')
  .description('Compile a HoloScript file (alias for build)')
  .option('-o, --output <path>', 'Output file path')
  .option('-v, --verbose', 'Verbose output')
  .action(async (input, options) => {
    await runBuild(input, options);
  });

// Help command
program
  .command('help')
  .description('Show help information')
  .action(() => {
    program.outputHelp();
  });

// Version
program.on('--version', () => {
  console.log('HoloScript CLI v0.1.0');
  process.exit(0);
});

// Error handling
program.on('command:*', () => {
  console.error('Invalid command. Use "holoscript --help" for usage information.');
  process.exit(1);
});

// Parse and run
program.parse(process.argv);

// Show help if no args
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
