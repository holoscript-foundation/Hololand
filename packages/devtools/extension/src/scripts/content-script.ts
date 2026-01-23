/**
 * Hololand DevTools Content Script
 *
 * This script runs in the content script context and serves as the bridge
 * between the page (injected hook) and the service worker/DevTools panel.
 *
 * Pattern P.EXT.016: Four-Layer Message Bridge Architecture
 * page → postMessage → content script → runtime.sendMessage → service worker → port → DevTools panel
 */

// Connection to service worker (established when DevTools opens)
let port: chrome.runtime.Port | null = null;
let hololandDetected = false;

/**
 * Inject the hook script into the page context.
 * CRITICAL: Must happen at document_start before any Hololand code runs.
 * See gotcha G.EXT.010: Hook Timing Race
 */
function injectHookScript(): void {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected-hook.js');
    script.onload = () => script.remove();

    // Inject as early as possible
    const target = document.head || document.documentElement;
    target.insertBefore(script, target.firstChild);
  } catch (e) {
    console.error('[Hololand DevTools] Failed to inject hook:', e);
  }
}

/**
 * Listen for messages from the injected hook (page context)
 */
function setupPageMessageListener(): void {
  window.addEventListener('message', (event) => {
    // Only accept messages from same window
    if (event.source !== window) return;

    // Only accept messages from our hook
    if (event.data?.source !== 'hololand-devtools-hook') return;

    const { event: hookEvent, payload } = event.data;

    // Track Hololand detection
    if (hookEvent === 'app-registered') {
      hololandDetected = true;
    }

    // Forward to service worker if connected
    if (port) {
      port.postMessage({
        type: 'HOOK_EVENT',
        event: hookEvent,
        payload,
        tabId: undefined, // Will be filled by service worker
      });
    }

    // Also send via runtime.sendMessage for initial detection
    chrome.runtime.sendMessage({
      type: 'HOOK_EVENT',
      event: hookEvent,
      payload,
    }).catch(() => {
      // Ignore errors when no listeners (DevTools not open)
    });
  });
}

/**
 * Listen for connection from DevTools panel
 */
function setupPortListener(): void {
  chrome.runtime.onConnect.addListener((p) => {
    if (p.name !== 'hololand-devtools') return;

    port = p;
    console.log('[Hololand DevTools] Connected to DevTools panel');

    // Send current detection status
    port.postMessage({
      type: 'STATUS',
      hololandDetected,
    });

    // Listen for commands from DevTools panel
    port.onMessage.addListener((msg) => {
      if (msg.type === 'BRITTNEY_QUERY') {
        executeInPage(`
          if (window.__HOLOLAND_DEVTOOLS_HOOK__?.brittney?.query) {
            window.__HOLOLAND_DEVTOOLS_HOOK__.brittney.query(${JSON.stringify(msg.query)});
          }
        `);
      }

      if (msg.type === 'INSPECT_COMPONENT') {
        executeInPage(`
          if (window.__HOLOLAND_DEVTOOLS_HOOK__?.brittney?.inspect) {
            const component = window.__HOLOLAND_DEVTOOLS_HOOK__.components.get(${JSON.stringify(msg.componentId)});
            if (component) {
              window.__HOLOLAND_DEVTOOLS_HOOK__.brittney.inspect(component);
            }
          }
        `);
      }

      if (msg.type === 'GET_PROFILER_STATS') {
        executeInPage(`
          if (window.__HOLOLAND_DEVTOOLS_HOOK__?.profiler?.getStats) {
            const stats = window.__HOLOLAND_DEVTOOLS_HOOK__.profiler.getStats();
            window.postMessage({
              source: 'hololand-devtools-hook',
              event: 'profiler-stats',
              payload: [stats]
            }, '*');
          }
        `);
      }

      if (msg.type === 'GET_CONSOLE_ENTRIES') {
        executeInPage(`
          if (window.__HOLOLAND_DEVTOOLS_HOOK__?.console?.getEntries) {
            const entries = window.__HOLOLAND_DEVTOOLS_HOOK__.console.getEntries();
            window.postMessage({
              source: 'hololand-devtools-hook',
              event: 'console-entries',
              payload: [entries]
            }, '*');
          }
        `);
      }
    });

    // Handle disconnect
    port.onDisconnect.addListener(() => {
      port = null;
      console.log('[Hololand DevTools] Disconnected from DevTools panel');
    });
  });
}

/**
 * Execute code in the page context
 */
function executeInPage(code: string): void {
  const script = document.createElement('script');
  script.textContent = code;
  document.documentElement.appendChild(script);
  script.remove();
}

/**
 * Handle messages from service worker
 */
function setupRuntimeMessageListener(): void {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'PING') {
      sendResponse({ pong: true, hololandDetected });
      return true;
    }

    if (msg.type === 'CHECK_HOLOLAND') {
      // Check if hook is installed
      executeInPage(`
        window.postMessage({
          source: 'hololand-devtools-hook',
          event: 'hook-check',
          payload: [{
            installed: !!window.__HOLOLAND_DEVTOOLS_HOOK__,
            version: window.__HOLOLAND_DEVTOOLS_HOOK__?.version,
            appsCount: window.__HOLOLAND_DEVTOOLS_HOOK__?.apps?.size || 0
          }]
        }, '*');
      `);
      sendResponse({ checking: true });
      return true;
    }

    return false;
  });
}

// Initialize
injectHookScript();
setupPageMessageListener();
setupPortListener();
setupRuntimeMessageListener();

console.log('[Hololand DevTools] Content script loaded');

export {};
