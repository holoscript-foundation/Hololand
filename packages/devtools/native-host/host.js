#!/usr/bin/env node

/**
 * Holoverse Native Messaging Host
 * 
 * Enables external applications (like IDEs) to communicate directly
 * with the Holoverse Chrome Extension.
 * 
 * Usages:
 * - IDE -> Browser: "Push code change"
 * - Browser -> IDE: "Report runtime error"
 */

import * as fs from 'fs';
import * as path from 'path';

// Standard Input/Output for Native Messaging
const stdin = process.stdin;
const stdout = process.stdout;

// Helper to send message
function sendMessage(msg: unknown) {
  const buffer = Buffer.from(JSON.stringify(msg));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);
  stdout.write(header);
  stdout.write(buffer);
}

// Helper to read message
let inputBuffer = Buffer.alloc(0);
let expectedLength: number | null = null;

stdin.on('readable', () => {
  let chunk;
  while ((chunk = stdin.read())) {
    inputBuffer = Buffer.concat([inputBuffer, chunk]);

    while (true) {
      if (expectedLength === null) {
        if (inputBuffer.length >= 4) {
          expectedLength = inputBuffer.readUInt32LE(0);
          inputBuffer = inputBuffer.slice(4);
        } else {
          break; // Wait for more data
        }
      }

      if (expectedLength !== null) {
        if (inputBuffer.length >= expectedLength) {
          const msgBuffer = inputBuffer.slice(0, expectedLength);
          inputBuffer = inputBuffer.slice(expectedLength);
          expectedLength = null;

          try {
            const msg = JSON.parse(msgBuffer.toString());
            handleMessage(msg);
          } catch (err) {
            logError(`Error parsing message: ${err}`);
          }
        } else {
          break; // Wait for more data
        }
      }
    }
  }
});

function handleMessage(msg: any) {
  log(`Received: ${JSON.stringify(msg)}`);

  try {
    if (msg.type === 'ping') {
      sendMessage({ type: 'pong', timestamp: Date.now() });
    }
    else if (msg.type === 'push_code') {
      // Forward code update to Hololand (simulated via file for now)
      // In production, this would use a localized WebSocket or specialized pipe
      const tempPath = path.join(process.cwd(), '.holoverse', 'live-update.json');
      fs.writeFileSync(tempPath, JSON.stringify(msg.payload));
      sendMessage({ success: true, action: 'code_pushed' });
    }
    else {
      sendMessage({ error: 'Unknown message type' });
    }
  } catch (err) {
    sendMessage({ error: String(err) });
  }
}

function log(msg: string) {
  fs.appendFileSync(path.join(__dirname, 'native-host.log'), `[${new Date().toISOString()}] ${msg}\n`);
}

function logError(msg: string) {
  fs.appendFileSync(path.join(__dirname, 'native-host.error.log'), `[${new Date().toISOString()}] ${msg}\n`);
}

log('Native host started');
