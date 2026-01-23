/**
 * Hololand DevTools Page
 *
 * This script runs when DevTools opens and creates the "Brittney" panel.
 * The panel.html/panel.tsx are loaded when the user clicks on the Brittney tab.
 *
 * Note: Panel state is lost when switching tabs (G.EXT.011).
 * State must be stored in service worker or chrome.storage.
 */

// Create the Brittney panel in DevTools
chrome.devtools.panels.create(
  'Brittney', // Panel title
  'icons/brittney-48.png', // Icon path
  'panel.html', // Panel HTML page
  (panel) => {
    console.log('[DevTools] Brittney panel created');

    let panelWindow: Window | null = null;

    // Track when panel is shown
    panel.onShown.addListener((win) => {
      panelWindow = win;

      // Notify panel that it's visible
      win.postMessage({ type: 'PANEL_SHOWN' }, '*');
    });

    // Track when panel is hidden
    panel.onHidden.addListener(() => {
      panelWindow = null;
    });

    // Handle search in panel (Ctrl+F in DevTools)
    panel.onSearch.addListener((action, query) => {
      if (panelWindow && action === 'performSearch') {
        panelWindow.postMessage({ type: 'SEARCH', query }, '*');
      }
    });
  }
);

// Establish connection to service worker
const tabId = chrome.devtools.inspectedWindow.tabId;
const port = chrome.runtime.connect({ name: 'hololand-devtools-panel' });

// Identify ourselves to the service worker
port.postMessage({ type: 'INIT', tabId });

// Forward messages from service worker to panel
port.onMessage.addListener((msg) => {
  // Store in session storage for panel to access
  chrome.storage.session.set({
    [`panel_message_${Date.now()}`]: msg,
    lastMessage: msg,
  });
});

// Handle connection errors
port.onDisconnect.addListener(() => {
  console.log('[DevTools] Disconnected from service worker');
});

console.log('[Hololand DevTools] DevTools page loaded for tab', tabId);

export {};
