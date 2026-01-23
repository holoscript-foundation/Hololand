# @hololand/devtools-extension

Chrome DevTools extension for Hololand with **Brittney AI** assistant.

## Features

- **DevTools Panel**: F12 → "Brittney" tab for AI-powered debugging
- **Hololand Detection**: Automatic detection of Hololand apps via global hook
- **AI Assistant**: Ask Brittney questions about your VR/AR application
- **Scene Inspector**: View registered scenes and components
- **Profiler Integration**: Access @hololand/devtools metrics

## Installation

### Development

```bash
# Install dependencies
cd packages/devtools-extension
pnpm install

# Build extension
pnpm build

# Or watch mode
pnpm dev
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist` folder

### Usage

1. Open any page with a Hololand app
2. Open DevTools (F12)
3. Click the "Brittney" tab
4. Ask questions about your app!

## Architecture

This extension follows the four-layer message bridge pattern:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Page Context  │ ──► │ Content Script  │ ──► │ Service Worker  │ ──► │  DevTools Panel │
│                 │     │                 │     │                 │     │                 │
│ __HOLOLAND_     │     │  postMessage    │     │  chrome.runtime │     │    React UI     │
│ DEVTOOLS_HOOK__ │     │  listener       │     │  .connect()     │     │   (Brittney)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Key Files

- `src/scripts/injected-hook.ts` - Global hook (runs in page context)
- `src/scripts/content-script.ts` - Message bridge (runs in content script context)
- `src/scripts/service-worker.ts` - Message router (background)
- `src/scripts/devtools.ts` - Panel creation (DevTools context)
- `src/panel/Panel.tsx` - Brittney UI (React component)

## Integration with @hololand/core

For your Hololand app to be detected, it should register with the hook:

```typescript
// In @hololand/core initialization
if (window.__HOLOLAND_DEVTOOLS_HOOK__) {
  window.__HOLOLAND_DEVTOOLS_HOOK__.registerApp({
    name: 'My Hololand App',
    version: '1.0.0',
    world: this.world,
    renderer: this.renderer,
  });
}
```

## Patterns Applied

This extension implements patterns from UAA2++ research:

- **P.EXT.015**: Global Hook Installation Pattern
- **P.EXT.016**: Four-Layer Message Bridge Architecture
- **P.EXT.017**: Hybrid AI Integration (local + cloud)

## Gotchas to Avoid

- **G.EXT.009**: Service workers terminate when idle - state in chrome.storage
- **G.EXT.010**: Hook must inject before Hololand - use document_start
- **G.EXT.011**: Panel state lost on tab switch - persist to storage

## License

MIT © Hololand Team
