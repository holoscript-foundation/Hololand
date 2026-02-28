#!/usr/bin/env node

/**
 * 🎥 Recording Helper Script
 *
 * Helps prepare and run the demo for video recording with timing cues.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clearScreen() {
  console.log('\x1Bc'); // Clear screen and reset cursor
}

function countdown(seconds) {
  return new Promise(async (resolve) => {
    for (let i = seconds; i > 0; i--) {
      process.stdout.write(`\r${colors.yellow}${colors.bright}Starting in ${i}...${colors.reset} `);
      await sleep(1000);
    }
    process.stdout.write('\r' + ' '.repeat(30) + '\r');
    resolve();
  });
}

async function recordingMode() {
  clearScreen();

  console.log(colors.cyan + colors.bright);
  console.log('═'.repeat(80));
  console.log('🎥 RECORDING MODE - IoT Digital Twins Demo');
  console.log('═'.repeat(80));
  console.log(colors.reset);

  console.log('\n📋 Pre-Recording Checklist:\n');
  console.log('  ✓ OBS Studio running?');
  console.log('  ✓ Screen resolution 1920x1080?');
  console.log('  ✓ Terminal font size 16-18pt?');
  console.log('  ✓ Notifications disabled?');
  console.log('  ✓ Browser ready with visualizer.html?');
  console.log('  ✓ Microphone tested (if narrating)?');

  console.log('\n' + colors.yellow + '⚠️  Press ENTER when ready to start countdown...' + colors.reset);

  // Wait for user
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  // Countdown
  await countdown(3);

  // Run the demo with recording cues
  clearScreen();

  console.log(colors.green + colors.bright);
  console.log('🔴 RECORDING STARTED');
  console.log(colors.reset);

  await sleep(1000);

  // Import and run the showcase
  const { default: runDemo } = await import('./smart-home-showcase.mjs');

  console.log(colors.yellow + '\n[Recording Cue: Switch to browser after output]' + colors.reset);

  await sleep(2000);

  console.log(colors.green + '\n✅ Recording segment complete!' + colors.reset);
  console.log(colors.yellow + '\n[Next: Show visualizer for 30 seconds, clicking devices]' + colors.reset);

  process.exit(0);
}

async function practiceMode() {
  clearScreen();

  console.log(colors.magenta + colors.bright);
  console.log('🎭 PRACTICE MODE - No Recording');
  console.log(colors.reset);

  console.log('\nThis will run the demo normally without recording cues.');
  console.log('Use this to:');
  console.log('  • Test your narration');
  console.log('  • Time your script');
  console.log('  • Practice mouse movements');
  console.log('  • Check all flows work\n');

  console.log(colors.yellow + 'Starting in 2 seconds...' + colors.reset);
  await sleep(2000);

  clearScreen();

  // Import and run the showcase
  await import('./smart-home-showcase.mjs');
}

async function checklistMode() {
  clearScreen();

  console.log(colors.blue + colors.bright);
  console.log('📋 RECORDING SETUP CHECKLIST');
  console.log(colors.reset);
  console.log('\n' + '─'.repeat(80) + '\n');

  const checklist = [
    {
      category: '🖥️  DISPLAY SETUP',
      items: [
        'Screen resolution set to 1920x1080',
        'Display scaling at 100%',
        'Desktop icons hidden (optional)',
        'Dark wallpaper (recommended)',
      ]
    },
    {
      category: '💻 TERMINAL SETUP',
      items: [
        'Terminal font size 16-18pt',
        'Dark theme enabled',
        'Terminal fullscreen or large window',
        'Working directory: demo/',
      ]
    },
    {
      category: '🌐 BROWSER SETUP',
      items: [
        'visualizer.html opened',
        'Browser zoom at 125%',
        'All other tabs closed',
        'Extensions hidden (Ctrl+Shift+B)',
        'Browser in fullscreen (F11)',
      ]
    },
    {
      category: '🎬 RECORDING SOFTWARE',
      items: [
        'OBS Studio (or alternative) running',
        'Recording format: MP4, 1080p60',
        'Video bitrate: 8000 Kbps',
        'Audio: Desktop + Microphone',
        'Scenes configured',
      ]
    },
    {
      category: '🎤 AUDIO SETUP (if narrating)',
      items: [
        'Microphone connected and tested',
        'Room is quiet',
        'Phone on silent',
        'Audio levels checked in OBS',
        'Mic positioned correctly',
      ]
    },
    {
      category: '🔕 NOTIFICATIONS',
      items: [
        'Windows notifications disabled',
        'Email client closed',
        'Slack/Discord paused',
        'Phone on silent',
        'Calendar notifications off',
      ]
    },
    {
      category: '📝 PREPARATION',
      items: [
        'Script printed or on second monitor',
        'Water nearby (for narration)',
        'Practice run completed',
        'Visual assets ready',
        'Backup plan if demo fails',
      ]
    },
  ];

  let allReady = true;

  for (const section of checklist) {
    console.log(colors.bright + section.category + colors.reset);
    for (const item of section.items) {
      console.log(`  [ ] ${item}`);
    }
    console.log('');
  }

  console.log('─'.repeat(80) + '\n');
  console.log(colors.yellow + '💡 TIP: Run this checklist before every recording session!' + colors.reset);
  console.log(colors.cyan + '\n📖 Full guide: VIDEO_RECORDING_GUIDE.md' + colors.reset);
  console.log('');
}

async function timingMode() {
  clearScreen();

  console.log(colors.cyan + colors.bright);
  console.log('⏱️  TIMING PRACTICE MODE');
  console.log(colors.reset);
  console.log('\nThis mode helps you practice timing for the 2-minute quick demo.\n');

  const timeline = [
    { time: '0:00', duration: 5, action: 'Title card', tip: 'Show "IoT Digital Twins" title' },
    { time: '0:05', duration: 10, action: 'Run demo command', tip: 'Type: node smart-home-showcase.mjs' },
    { time: '0:15', duration: 5, action: 'Show stats', tip: 'Highlight: 2ms, 24 devices, 408 lines' },
    { time: '0:20', duration: 20, action: 'Visualizer load', tip: 'Switch to browser, show all devices' },
    { time: '0:40', duration: 15, action: 'Click devices', tip: 'Click 3-4 different device cards' },
    { time: '0:55', duration: 15, action: 'Generated code', tip: 'Open .holo file in VS Code, scroll' },
    { time: '1:10', duration: 15, action: 'MQTT diagram', tip: 'Show MQTT connection diagram' },
    { time: '1:25', duration: 25, action: 'Platform icons', tip: 'Show all 18+ supported platforms' },
    { time: '1:50', duration: 10, action: 'Call to action', tip: 'GitHub link and star button' },
  ];

  console.log('Timeline for 2-minute demo:\n');
  console.log('─'.repeat(80));
  console.log(colors.bright + ' Time  | Duration | Action                  | Tip' + colors.reset);
  console.log('─'.repeat(80));

  for (const segment of timeline) {
    console.log(
      ` ${segment.time} | ${segment.duration}s`.padEnd(12) +
      ` | ${segment.action.padEnd(23)} | ${colors.yellow}${segment.tip}${colors.reset}`
    );
  }

  console.log('─'.repeat(80));
  console.log(`\n${colors.green}Total: 2:00${colors.reset}`);
  console.log(`\n${colors.cyan}💡 TIP: Practice with a stopwatch until timing is natural${colors.reset}\n`);
}

async function scriptsMode() {
  clearScreen();

  console.log(colors.magenta + colors.bright);
  console.log('📜 NARRATION SCRIPTS');
  console.log(colors.reset);
  console.log('\nChoose a script format:\n');

  console.log('  1. Quick Demo (2 min, no narration, text overlays)');
  console.log('  2. Standard Demo (5-7 min, with narration)');
  console.log('  3. Deep Dive (15 min, technical deep dive)');
  console.log('\n  0. Back to main menu\n');

  console.log(colors.yellow + 'See VIDEO_RECORDING_GUIDE.md for full scripts' + colors.reset);
  console.log('');
}

async function mainMenu() {
  clearScreen();

  console.log(colors.cyan + colors.bright);
  console.log('═'.repeat(80));
  console.log('🎥 IoT Digital Twins - Recording Helper');
  console.log('═'.repeat(80));
  console.log(colors.reset);

  console.log('\nChoose an option:\n');
  console.log('  ' + colors.green + '1. 🔴 Recording Mode' + colors.reset + ' - Ready to record (with countdown)');
  console.log('  ' + colors.magenta + '2. 🎭 Practice Mode' + colors.reset + ' - Practice without recording cues');
  console.log('  ' + colors.blue + '3. 📋 Setup Checklist' + colors.reset + ' - Pre-recording checklist');
  console.log('  ' + colors.cyan + '4. ⏱️  Timing Practice' + colors.reset + ' - Practice 2-minute timing');
  console.log('  ' + colors.yellow + '5. 📜 View Scripts' + colors.reset + ' - Narration script reference');
  console.log('  ' + colors.red + '6. 🚪 Exit' + colors.reset);

  console.log('\n' + '─'.repeat(80));
  console.log(colors.yellow + '\n📖 Full guide: VIDEO_RECORDING_GUIDE.md' + colors.reset);
  console.log(colors.cyan + '🌐 Visualizer: visualizer.html\n' + colors.reset);

  process.stdout.write('Select option (1-6): ');

  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      const choice = data.toString().trim();
      resolve(choice);
    });
  });
}

async function main() {
  // Enable raw mode for better input handling
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }

  while (true) {
    const choice = await mainMenu();

    switch (choice) {
      case '1':
        await recordingMode();
        break;
      case '2':
        await practiceMode();
        break;
      case '3':
        await checklistMode();
        await sleep(1000);
        console.log('\nPress ENTER to continue...');
        await new Promise(resolve => process.stdin.once('data', resolve));
        break;
      case '4':
        await timingMode();
        await sleep(1000);
        console.log('\nPress ENTER to continue...');
        await new Promise(resolve => process.stdin.once('data', resolve));
        break;
      case '5':
        await scriptsMode();
        await sleep(1000);
        console.log('\nPress ENTER to continue...');
        await new Promise(resolve => process.stdin.once('data', resolve));
        break;
      case '6':
        clearScreen();
        console.log(colors.green + '\n🎬 Happy recording! Good luck!\n' + colors.reset);
        process.exit(0);
      default:
        console.log(colors.red + '\nInvalid option. Please choose 1-6.' + colors.reset);
        await sleep(1500);
    }
  }
}

// Run the menu
main().catch(error => {
  console.error(colors.red + '\n❌ Error:' + colors.reset, error);
  process.exit(1);
});
