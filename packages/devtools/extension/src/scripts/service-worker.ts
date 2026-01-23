/**
 * Hololand DevTools Service Worker
 *
 * Routes messages between content scripts, DevTools panels, and Native Messaging host.
 *
 * CRITICAL: Manifest V3 service workers are ephemeral (G.EXT.009).
 * - Do NOT store state in memory
 * - Use chrome.storage for persistence
 * - Design for reconnection on wake
 *
 * Architecture:
 * IDE Agent ←→ MCP Server ←→ Native Messaging Host ←→ This Service Worker ←→ Content Script ←→ Page
 */

// Track connections by tab ID
const connections = new Map<number, chrome.runtime.Port>();

// Native Messaging host name
const NATIVE_HOST_NAME = 'com.hololand.brittney';

// Track Native Messaging port
let nativePort: chrome.runtime.Port | null = null;
let nativePortReconnecting = false;

/**
 * Handle DevTools panel connections
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'hololand-devtools-panel') return;

  // Extract tab ID from port (set by DevTools page)
  let tabId: number | undefined;

  port.onMessage.addListener((msg) => {
    // First message should identify the tab
    if (msg.type === 'INIT' && typeof msg.tabId === 'number') {
      tabId = msg.tabId;
      connections.set(msg.tabId, port);
      console.log(`[Service Worker] DevTools panel connected for tab ${msg.tabId}`);

      // Notify content script that DevTools is open
      if (tabId !== undefined) {
        chrome.tabs.sendMessage(tabId, { type: 'DEVTOOLS_OPENED' }).catch(() => {
          // Tab might not have content script yet
        });
      }
    }

    // Forward messages to content script
    if (tabId !== undefined && msg.type !== 'INIT') {
      chrome.tabs.sendMessage(tabId, msg).catch((err) => {
        console.error(`[Service Worker] Failed to send to tab ${tabId}:`, err);
      });
    }
  });

  port.onDisconnect.addListener(() => {
    if (tabId) {
      connections.delete(tabId);
      console.log(`[Service Worker] DevTools panel disconnected for tab ${tabId}`);

      // Notify content script that DevTools is closed
      chrome.tabs.sendMessage(tabId, { type: 'DEVTOOLS_CLOSED' }).catch(() => {
        // Ignore errors
      });
    }
  });
});

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Handle ping for health check
  if (msg.type === 'PING') {
    sendResponse({ pong: true });
    return true;
  }

  // Forward hook events to DevTools panel
  if (msg.type === 'HOOK_EVENT' && sender.tab?.id) {
    const port = connections.get(sender.tab.id);
    if (port) {
      port.postMessage({
        type: 'HOOK_EVENT',
        event: msg.event,
        payload: msg.payload,
        tabId: sender.tab.id,
      });
    }

    // Also forward relevant events to native host for IDE agent visibility
    if (nativePort) {
      // Map hook events to native host data format
      switch (msg.event) {
        case 'app-registered':
          // Send browser state update
          nativePort.postMessage({
            id: `browser_${Date.now()}`,
            type: 'request',
            action: 'getBrowserState',
            payload: {
              url: sender.tab.url || '',
              title: sender.tab.title || '',
              isHololandApp: true,
            },
          });
          break;

        case 'profiler-stats':
          // Send profiler stats
          nativePort.postMessage({
            id: `profiler_${Date.now()}`,
            type: 'request',
            action: 'getProfilerStats',
            payload: msg.payload[0],
          });
          break;

        case 'scene-updated':
        case 'scene-list':
          // Send scene data
          nativePort.postMessage({
            id: `scenes_${Date.now()}`,
            type: 'request',
            action: 'listScenes',
            payload: Array.isArray(msg.payload) ? msg.payload : [msg.payload],
          });
          break;

        case 'console-log':
          // Send console log
          nativePort.postMessage({
            id: `log_${Date.now()}`,
            type: 'request',
            action: 'getConsoleLogs',
            payload: msg.payload,
          });
          break;

        case 'runtime-error':
          // Send runtime error
          nativePort.postMessage({
            id: `error_${Date.now()}`,
            type: 'request',
            action: 'getRuntimeErrors',
            payload: msg.payload,
          });
          break;
      }
    }

    // Store app registration in storage for persistence
    if (msg.event === 'app-registered') {
      chrome.storage.session.get(['registeredApps'], (result) => {
        const apps = result.registeredApps || {};
        apps[sender.tab!.id!] = msg.payload[0];
        chrome.storage.session.set({ registeredApps: apps });
      });
    }
  }

  return false;
});

/**
 * Handle tab updates (e.g., navigation)
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    // Clear registration for this tab
    chrome.storage.session.get(['registeredApps'], (result) => {
      const apps = result.registeredApps || {};
      delete apps[tabId];
      chrome.storage.session.set({ registeredApps: apps });
    });

    // Notify DevTools panel of navigation
    const port = connections.get(tabId);
    if (port) {
      port.postMessage({ type: 'TAB_NAVIGATED', tabId });
    }
  }
});

/**
 * Handle tab removal
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  connections.delete(tabId);

  // Clean up storage
  chrome.storage.session.get(['registeredApps'], (result) => {
    const apps = result.registeredApps || {};
    delete apps[tabId];
    chrome.storage.session.set({ registeredApps: apps });
  });
});

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Service Worker] Extension installed:', details.reason);

  // Clear session storage on install/update
  chrome.storage.session.clear();
});

console.log('[Hololand DevTools] Service worker started');

// =============================================================================
// NATIVE MESSAGING - Connection to MCP Server via Native Host
// =============================================================================

/**
 * Connect to Native Messaging host
 * This enables IDE agents to communicate with the browser extension
 */
function connectNativeHost(): void {
  if (nativePort || nativePortReconnecting) return;

  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);
    console.log('[Service Worker] Connected to native host:', NATIVE_HOST_NAME);

    nativePort.onMessage.addListener(handleNativeMessage);

    nativePort.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError;
      console.log('[Service Worker] Native host disconnected:', error?.message || 'unknown');
      nativePort = null;

      // Attempt reconnection after delay
      if (!nativePortReconnecting) {
        nativePortReconnecting = true;
        setTimeout(() => {
          nativePortReconnecting = false;
          connectNativeHost();
        }, 5000);
      }
    });

    // Send ready message
    nativePort.postMessage({
      id: `init_${Date.now()}`,
      type: 'event',
      action: 'extensionReady',
      payload: {
        version: '1.0.0',
        capabilities: ['hook-events', 'profiler', 'screenshots'],
      },
    });
  } catch (error) {
    console.error('[Service Worker] Failed to connect to native host:', error);
  }
}

/**
 * Handle messages from Native Messaging host
 */
function handleNativeMessage(message: {
  id: string;
  type: string;
  action: string;
  payload?: unknown;
}): void {
  console.log('[Service Worker] Native message:', message.action);

  switch (message.action) {
    case 'requestData': {
      // Host is requesting fresh data from the browser
      const { dataType, requestId } = message.payload as {
        dataType: string;
        requestId?: string;
      };
      handleDataRequest(dataType, message.id);
      break;
    }

    case 'executeInTab': {
      // Execute code in a specific tab
      const { tabId, code } = message.payload as { tabId: number; code: string };
      executeInTab(tabId, code, message.id);
      break;
    }

    case 'getActiveTab': {
      // Get info about the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        sendNativeResponse(message.id, true, {
          tabId: tab?.id,
          url: tab?.url,
          title: tab?.title,
        });
      });
      break;
    }

    case 'ping': {
      sendNativeResponse(message.id, true, { pong: true, timestamp: Date.now() });
      break;
    }

    default:
      console.warn('[Service Worker] Unknown native action:', message.action);
  }
}

/**
 * Handle data request from native host
 */
async function handleDataRequest(dataType: string, requestId: string): Promise<void> {
  // Get the active tab with Hololand app
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;

  if (!tabId) {
    sendNativeResponse(requestId, false, undefined, 'No active tab');
    return;
  }

  // Check if this tab has a Hololand app registered
  const storage = await chrome.storage.session.get(['registeredApps']);
  const apps = storage.registeredApps || {};

  if (!apps[tabId]) {
    sendNativeResponse(requestId, false, undefined, 'No Hololand app in active tab');
    return;
  }

  // Request data from content script
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'REQUEST_DATA',
      dataType,
      requestId,
    });

    sendNativeResponse(requestId, true, response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendNativeResponse(requestId, false, undefined, errorMessage);
  }
}

/**
 * Execute code in a tab and return result
 */
async function executeInTab(
  tabId: number,
  code: string,
  requestId: string
): Promise<void> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (codeToExecute: string) => {
        try {
          // eslint-disable-next-line no-eval
          return { success: true, result: eval(codeToExecute) };
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          return { success: false, error: errorMessage };
        }
      },
      args: [code],
    });

    const result = results[0]?.result;
    if (result?.success) {
      sendNativeResponse(requestId, true, result.result);
    } else {
      sendNativeResponse(requestId, false, undefined, result?.error || 'Execution failed');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendNativeResponse(requestId, false, undefined, errorMessage);
  }
}

/**
 * Send response to native host
 */
function sendNativeResponse(
  id: string,
  success: boolean,
  payload?: unknown,
  error?: string
): void {
  if (!nativePort) {
    console.warn('[Service Worker] Cannot send response - native port not connected');
    return;
  }

  nativePort.postMessage({
    id,
    type: 'response',
    action: 'response',
    success,
    payload,
    error,
  });
}

/**
 * Forward hook events to native host (for IDE agent visibility)
 */
function forwardToNativeHost(event: string, payload: unknown): void {
  if (!nativePort) return;

  nativePort.postMessage({
    id: `event_${Date.now()}`,
    type: 'event',
    action: event,
    payload,
  });
}

// Connect to native host on service worker start
connectNativeHost();

// Also try to connect when the extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  connectNativeHost();
});

export {};

