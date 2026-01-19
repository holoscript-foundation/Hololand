/**
 * Hololand DevTools Service Worker
 *
 * Routes messages between content scripts and DevTools panels.
 *
 * CRITICAL: Manifest V3 service workers are ephemeral (G.EXT.009).
 * - Do NOT store state in memory
 * - Use chrome.storage for persistence
 * - Design for reconnection on wake
 */

// Track connections by tab ID
const connections = new Map<number, chrome.runtime.Port>();

/**
 * Handle DevTools panel connections
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'hololand-devtools-panel') return;

  // Extract tab ID from port (set by DevTools page)
  let tabId: number | undefined;

  port.onMessage.addListener((msg) => {
    // First message should identify the tab
    if (msg.type === 'INIT' && msg.tabId) {
      tabId = msg.tabId;
      connections.set(tabId, port);
      console.log(`[Service Worker] DevTools panel connected for tab ${tabId}`);

      // Notify content script that DevTools is open
      chrome.tabs.sendMessage(tabId, { type: 'DEVTOOLS_OPENED' }).catch(() => {
        // Tab might not have content script yet
      });
    }

    // Forward messages to content script
    if (tabId && msg.type !== 'INIT') {
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

export {};
