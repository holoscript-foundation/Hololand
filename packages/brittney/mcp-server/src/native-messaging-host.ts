#!/usr/bin/env node
/**
 * Native Messaging Host for Brittney MCP Server
 *
 * This host enables communication between the Chrome DevTools extension
 * and the MCP server. It implements the Chrome Native Messaging protocol.
 *
 * Architecture:
 * Browser Extension ←→ Native Messaging Host ←→ SharedDataBridge ←→ MCP Server
 *
 * Protocol:
 * - Messages are length-prefixed (4-byte little-endian length followed by JSON)
 * - Host reads from stdin, writes to stdout
 * - Extension connects via chrome.runtime.connectNative()
 */

import { sharedDataBridge } from './shared-data-bridge.js';
import { handleBrittneyTool } from './brittney-tools.js';

// =============================================================================
// TYPES
// =============================================================================

interface NativeMessage {
  id: string;
  type: 'request' | 'response' | 'event';
  action: string;
  payload?: unknown;
  error?: string;
}

interface RequestMessage extends NativeMessage {
  type: 'request';
}

interface ResponseMessage extends NativeMessage {
  type: 'response';
  success: boolean;
}

// =============================================================================
// NATIVE MESSAGING PROTOCOL IMPLEMENTATION
// =============================================================================

/**
 * Read a message from stdin using Native Messaging protocol
 * Format: 4-byte length (little-endian) + JSON message
 */
async function readMessage(): Promise<NativeMessage | null> {
  return new Promise((resolve, reject) => {
    // Read 4-byte length prefix
    const lengthBuffer = Buffer.alloc(4);
    let bytesRead = 0;

    const onReadable = () => {
      while (bytesRead < 4) {
        const chunk = process.stdin.read(1);
        if (chunk === null) {
          // No more data available
          return;
        }
        lengthBuffer[bytesRead++] = chunk[0];
      }

      // Parse message length (little-endian)
      const messageLength = lengthBuffer.readUInt32LE(0);

      if (messageLength === 0) {
        process.stdin.removeListener('readable', onReadable);
        resolve(null);
        return;
      }

      if (messageLength > 1024 * 1024) {
        // 1MB limit
        process.stdin.removeListener('readable', onReadable);
        reject(new Error(`Message too large: ${messageLength} bytes`));
        return;
      }

      // Read message content
      const messageBuffer = Buffer.alloc(messageLength);
      let messageBytesRead = 0;

      const readMessageContent = () => {
        while (messageBytesRead < messageLength) {
          const remaining = messageLength - messageBytesRead;
          const chunk = process.stdin.read(Math.min(remaining, 16384));
          if (chunk === null) {
            return; // Wait for more data
          }
          chunk.copy(messageBuffer, messageBytesRead);
          messageBytesRead += chunk.length;
        }

        process.stdin.removeListener('readable', onReadable);
        process.stdin.removeListener('readable', readMessageContent);

        try {
          const message = JSON.parse(messageBuffer.toString('utf8'));
          resolve(message);
        } catch (e) {
          reject(new Error(`Invalid JSON message: ${e}`));
        }
      };

      process.stdin.on('readable', readMessageContent);
      readMessageContent();
    };

    process.stdin.on('readable', onReadable);

    // Handle stdin end
    process.stdin.once('end', () => {
      resolve(null);
    });
  });
}

/**
 * Write a message to stdout using Native Messaging protocol
 * Format: 4-byte length (little-endian) + JSON message
 */
function writeMessage(message: NativeMessage): void {
  const json = JSON.stringify(message);
  const jsonBuffer = Buffer.from(json, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(jsonBuffer.length, 0);

  process.stdout.write(lengthBuffer);
  process.stdout.write(jsonBuffer);
}

/**
 * Send a response message
 */
function sendResponse(id: string, success: boolean, payload?: unknown, error?: string): void {
  writeMessage({
    id,
    type: 'response',
    action: 'response',
    payload,
    success,
    error,
  } as ResponseMessage);
}

/**
 * Send an event message (unsolicited notification to extension)
 */
function sendEvent(action: string, payload: unknown): void {
  writeMessage({
    id: `event_${Date.now()}`,
    type: 'event',
    action,
    payload,
  });
}

// =============================================================================
// REQUEST HANDLERS
// =============================================================================

/**
 * Handle incoming request from browser extension
 */
async function handleRequest(message: RequestMessage): Promise<void> {
  const { id, action, payload } = message;

  try {
    switch (action) {
      // Ping/health check
      case 'ping': {
        sendResponse(id, true, { pong: true, timestamp: Date.now() });
        break;
      }

      // Get host info
      case 'getHostInfo': {
        sendResponse(id, true, {
          name: 'brittney-mcp-host',
          version: '1.0.0',
          mcpServerVersion: '1.0.0',
          capabilities: [
            'browser-inspection',
            'ai-analysis',
            'code-execution',
            'native-messaging',
          ],
        });
        break;
      }

      // Forward to Brittney tools via MCP handlers
      case 'getBrowserState': {
        // Browser extension is sending us the current browser state
        const state = payload as { url: string; title: string; isHololandApp: boolean };
        sharedDataBridge.setBrowserState({
          ...state,
          connectionStatus: 'connected',
        });
        sendResponse(id, true, { stored: true, action });
        break;
      }

      case 'listScenes': {
        // Browser extension is sending us the scene list
        sharedDataBridge.setScenes(payload as any[]);
        sendResponse(id, true, { stored: true, action });
        break;
      }

      case 'getProfilerStats': {
        // Browser extension is sending us profiler stats
        sharedDataBridge.setProfilerStats(payload as any);
        sendResponse(id, true, { stored: true, action });
        break;
      }

      case 'getConsoleLogs': {
        // Browser extension is sending us console logs
        sharedDataBridge.setConsoleLogs(payload as any[]);
        sendResponse(id, true, { stored: true, action });
        break;
      }

      case 'getRuntimeErrors': {
        // Browser extension is sending us runtime errors
        sharedDataBridge.setRuntimeErrors(payload as any[]);
        sendResponse(id, true, { stored: true, action });
        break;
      }

      case 'inspectComponent':
      case 'takeScreenshot':
      case 'executeCode':
      case 'reloadScene': {
        // These actions require direct forwarding - store generic data
        sharedDataBridge.write({ [action]: payload } as any);
        sendResponse(id, true, { stored: true, action });
        break;
      }

      // MCP tool invocation (IDE agent calling through to extension)
      case 'invokeTool': {
        const { toolName, args } = payload as { toolName: string; args: Record<string, unknown> };

        // Check if it's a Brittney tool
        if (toolName.startsWith('brittney_')) {
          const result = await handleBrittneyTool(toolName, args);
          sendResponse(id, !result.isError, result.content[0]?.text);
        } else {
          sendResponse(id, false, undefined, `Unknown tool: ${toolName}`);
        }
        break;
      }

      // Request data from browser (MCP server needs fresh data)
      case 'requestBrowserData': {
        const { dataType } = payload as { dataType: string };
        // Send event to extension requesting fresh data
        sendEvent('requestData', { dataType, requestId: id });
        // Response will come back via handleRequest when extension sends data
        break;
      }

      default:
        sendResponse(id, false, undefined, `Unknown action: ${action}`);
    }
  } catch (error: any) {
    sendResponse(id, false, undefined, error.message);
  }
}

// =============================================================================
// MAIN LOOP
// =============================================================================

async function main(): Promise<void> {
  // Log to stderr (stdout is for messages only)
  console.error('Brittney Native Messaging Host started');
  console.error(`PID: ${process.pid}`);
  console.error(`Node version: ${process.version}`);
  console.error(`SharedDataBridge file: ${sharedDataBridge.getBridgeFilePath()}`);

  // Set stdin to raw mode for binary reading
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  // Mark as connected via shared bridge
  sharedDataBridge.setConnected(true);

  // Send ready event
  sendEvent('hostReady', {
    version: '1.0.0',
    timestamp: Date.now(),
    bridgePath: sharedDataBridge.getBridgeFilePath(),
  });

  // Main message loop
  while (true) {
    try {
      const message = await readMessage();

      if (message === null) {
        // stdin closed, exit gracefully
        console.error('stdin closed, exiting');
        break;
      }

      if (message.type === 'request') {
        await handleRequest(message as RequestMessage);
      }
    } catch (error: any) {
      console.error('Error reading message:', error.message);
      // Continue processing messages
    }
  }

  sharedDataBridge.setConnected(false);
  console.error('Brittney Native Messaging Host stopped');
  process.exit(0);
}

// Handle process signals
process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down');
  process.exit(0);
});

// Start the host
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
