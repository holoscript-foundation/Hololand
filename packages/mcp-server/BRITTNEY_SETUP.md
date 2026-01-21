# Brittney IDE Agent Integration - Setup Guide

## Overview

Brittney is an AI-powered browser development tool that gives IDE agents (GitHub Copilot, Claude, Cursor) real-time visibility into running Hololand applications. Instead of debugging blind, your IDE agent can see actual browser state, performance metrics, console logs, and errors.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              IDE (VS Code)                                   │
│  ┌─────────────────────┐                                                     │
│  │  GitHub Copilot     │                                                     │
│  │  (or Claude/Cursor) │                                                     │
│  └─────────┬───────────┘                                                     │
│            │ MCP Protocol (stdio)                                            │
│  ┌─────────▼───────────┐                                                     │
│  │  MCP Server         │                                                     │
│  │  @hololand/mcp-srv  │                                                     │
│  └─────────┬───────────┘                                                     │
│            │ SharedDataBridge (temp file)                                    │
└────────────┼────────────────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────┐      Native Messaging Protocol (stdio)              │
│  │  Native Host        │◄──────────────────────────────────────────┐         │
│  │  brittney-host.bat  │                                           │         │
│  └─────────────────────┘                                           │         │
│                                                                     │         │
└─────────────────────────────────────────────────────────────────────┼─────────┘
                                                                      │
┌─────────────────────────────────────────────────────────────────────┼─────────┐
│                              Chrome/Edge                            │         │
│  ┌─────────────────────────────────────────────────────────────────┐│         │
│  │  Hololand DevTools Extension                                    ││         │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  ││         │
│  │  │ DevTools     │  │ Service      │  │ Content Script       │  ││         │
│  │  │ Panel (React)│◄─│ Worker       │◄─│ (injects hook)       │  ││         │
│  │  └──────────────┘  └──────┬───────┘  └──────────┬───────────┘  ││         │
│  │                           │                      │              ││         │
│  │                           │ chrome.runtime.      │ window.      ││         │
│  │                           │ connectNative()      │ postMessage  ││         │
│  │                           └──────────────────────┼──────────────┘│         │
│  │                                                  ▼               │         │
│  │  ┌─────────────────────────────────────────────────────────────┐│         │
│  │  │  Hololand App (Three.js/HoloScript)                         ││         │
│  │  │  - Scenes, Objects, Components                              ││         │
│  │  │  - Performance Profiler                                     ││         │
│  │  │  - Console Logs & Errors                                    ││         │
│  │  └─────────────────────────────────────────────────────────────┘│         │
│  └──────────────────────────────────────────────────────────────────┘         │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Hololand App** runs in browser, exposing performance metrics, scene data, logs
2. **Injected Hook** (content script) collects data from page via `window.__HOLOLAND_DEVTOOLS__`
3. **Content Script** sends data to Service Worker via `chrome.runtime.sendMessage`
4. **Service Worker** forwards to Native Messaging Host via `chrome.runtime.connectNative`
5. **Native Host** writes data to SharedDataBridge (temp file at `%TEMP%\hololand-mcp\browser-data.json`)
6. **MCP Server** reads from SharedDataBridge when IDE agent calls tools
7. **IDE Agent** receives real browser data instead of mock data

## Setup Instructions

### Step 1: Build the DevTools Extension

```powershell
cd packages/devtools-extension
pnpm build
```

This creates `dist/` folder with the extension files.

### Step 2: Load Extension in Chrome/Edge

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `packages/devtools-extension/dist/` folder
5. **Copy the Extension ID** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### Step 3: Register Native Messaging Host

Run the installation script with your extension ID:

```powershell
cd packages/mcp-server/native-host
.\install-host.ps1 -ExtensionId "YOUR_EXTENSION_ID_HERE"
```

This registers the native host with Chrome and Edge.

### Step 4: Verify MCP Server Configuration

Ensure your VS Code settings include the Hololand MCP server. In `.vscode/mcp.json` or VS Code settings:

```json
{
  "mcpServers": {
    "hololand": {
      "command": "node",
      "args": ["C:/path/to/Hololand/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### Step 5: Test the Integration

1. Start a Hololand app in Chrome (e.g., `http://localhost:3000`)
2. Open Chrome DevTools (F12)
3. Look for "Hololand" panel in DevTools
4. In VS Code, use Copilot to ask about browser state:

```
@workspace What's the current FPS in the running Hololand app?
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `mcp_hololand_brittney_check_service` | Check if Brittney AI service is running |
| `mcp_hololand_brittney_get_profiler_stats` | Get FPS, frame time, draw calls, triangles, memory |
| `mcp_hololand_brittney_get_browser_state` | Get current URL, page title, connection status |
| `mcp_hololand_brittney_get_console_logs` | Get recent console log entries |
| `mcp_hololand_brittney_get_runtime_errors` | Get JavaScript errors from the page |
| `mcp_hololand_brittney_list_scenes` | List all VR scenes and their object counts |
| `mcp_hololand_brittney_reload_scene` | Force reload the current scene |
| `mcp_hololand_brittney_suggest_fix` | Ask Brittney to suggest code fixes |
| `mcp_hololand_brittney_execute_in_browser` | Execute JavaScript in browser context |

## Troubleshooting

### Extension Not Connecting

1. Check that extension is loaded in `chrome://extensions/`
2. Verify native host is registered: check registry at `HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.hololand.brittney`
3. Check that Node.js is in PATH

### MCP Tools Return Mock Data

Mock data is returned when:
- Extension not installed
- DevTools not open on a Hololand page
- Native host not registered
- SharedDataBridge file doesn't exist or is stale

Check the bridge file at: `%TEMP%\hololand-mcp\browser-data.json`

### Native Host Errors

Run the native host manually to see errors:
```powershell
cd packages/mcp-server
node dist/native-messaging-host.js
```

### MCP Server Issues

Check MCP server logs in VS Code Output panel under "Hololand MCP".

## Development

### Running in Development Mode

```powershell
# Terminal 1: MCP Server
cd packages/mcp-server
pnpm dev

# Terminal 2: DevTools Extension (watch mode)
cd packages/devtools-extension
pnpm dev
```

### Testing the SharedDataBridge

You can manually write test data to verify the bridge works:

```javascript
// In Node.js REPL
const { sharedDataBridge } = require('./packages/mcp-server/dist/shared-data-bridge.js');
sharedDataBridge.setProfilerStats({ fps: 60, drawCalls: 100, triangles: 50000 });
console.log(sharedDataBridge.getProfilerStats());
```

## File Locations

| Component | Path |
|-----------|------|
| DevTools Extension | `packages/devtools-extension/dist/` |
| MCP Server | `packages/mcp-server/dist/` |
| Native Host | `packages/mcp-server/native-host/` |
| SharedDataBridge | `%TEMP%\hololand-mcp\browser-data.json` |
| Chrome Registry | `HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.hololand.brittney` |
