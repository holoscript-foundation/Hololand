# Example 08: Progressive VR

Progressive Enhancement from Desktop to VR - build accessible VR experiences that work everywhere.

## Overview

This example demonstrates the **Progressive Enhancement** pattern for VR development:

1. **Start Desktop-First** - Full 2D/3D experience with traditional controls
2. **Detect VR Capability** - Automatically check for WebXR support
3. **Seamless Upgrade** - One-click transition to immersive VR
4. **State Preservation** - Settings persist across mode transitions
5. **Graceful Fallback** - Works perfectly without VR hardware

## Why Progressive Enhancement?

Not everyone has a VR headset. By building desktop-first:

- **Wider Audience** - Anyone can use your app
- **Better Development** - Faster iteration on desktop
- **Accessibility** - Screen readers, keyboard nav work in desktop mode
- **Fallback Safety** - App never breaks if VR fails

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3008
```

## Features Demonstrated

### VR Capability Detection

```typescript
const { isVRSupported, vrSession, enterVR, exitVR } = useVRCapability();

// Check if VR is available
if (isVRSupported) {
  // Show VR button
}
```

### Mode Transitions

```typescript
// Smooth transition between modes
const handleEnterVR = async () => {
  setViewMode('transitioning');
  await enterVR();
  setViewMode('vr');
};
```

### State Persistence

```typescript
// State survives page refreshes and mode changes
const [sceneState, setSceneState] = usePersistedState('scene', defaultState);
```

### Adaptive Rendering

```typescript
// Scene adapts to current mode
<Scene3D
  viewMode={viewMode}  // 'desktop' | 'vr'
  vrSession={vrSession}
/>
```

## Architecture

```
src/
├── App.tsx                 # Main app - mode management
├── types.ts                # TypeScript types
├── styles.css              # Desktop UI styles
├── components/
│   ├── Scene3D.tsx        # Three.js scene (adapts to mode)
│   ├── DesktopUI.tsx      # 2D overlay (hidden in VR)
│   └── ModeTransition.tsx # Loading screen
└── hooks/
    ├── useVRCapability.ts  # WebXR detection & session
    └── usePersistedState.ts # localStorage persistence
```

## Desktop Mode Features

- **Orbit Controls** - Click and drag to rotate camera
- **Scene Controls** - Adjust lighting, scale, speed, environment
- **Environment Presets** - Sunset, Night, Studio, Forest, Space
- **Object Selection** - Click objects to select them
- **Keyboard Shortcuts** - Ctrl+V to enter VR, Escape to exit

## VR Mode Features

- **Immersive Session** - Full WebXR immersive-vr
- **Hand Tracking** - Enabled when available
- **Room Scale** - Uses bounded-floor when available
- **Same Scene** - Identical 3D content, just viewed in VR

## Key Patterns

### 1. Progressive Detection

```typescript
// Don't assume VR - check first
useEffect(() => {
  navigator.xr?.isSessionSupported('immersive-vr')
    .then(setIsVRSupported);
}, []);
```

### 2. Conditional UI

```typescript
// Show desktop UI only when needed
{viewMode !== 'vr' && <DesktopUI />}
```

### 3. Unified Scene

```typescript
// Same scene, different camera/controls
if (vrSession) {
  renderer.xr.setSession(vrSession);
  controls.enabled = false;  // VR handles input
} else {
  controls.enabled = true;   // Desktop orbit controls
}
```

### 4. XR Animation Loop

```typescript
// Use XR's built-in loop in VR mode
if (vrSession) {
  renderer.setAnimationLoop((time) => { /* render */ });
} else {
  requestAnimationFrame(animate);
}
```

## Environment Presets

| Preset | Sky Color | Ambient | Best For |
|--------|-----------|---------|----------|
| Sunset | Orange/pink | Warm | Relaxed scenes |
| Night | Dark blue | Cool blue | Dramatic |
| Studio | Gray | White | Product showcase |
| Forest | Sky blue | Green tint | Nature scenes |
| Space | Near black | Purple | Sci-fi |

## Browser Support

| Browser | Desktop | VR |
|---------|---------|-----|
| Chrome | ✅ | ✅ (Quest Link, Steam VR) |
| Edge | ✅ | ✅ (Windows MR) |
| Firefox | ✅ | ✅ (Limited) |
| Safari | ✅ | ❌ (No WebXR) |

## Testing Without VR Hardware

Use browser extensions to simulate WebXR:

1. **Chrome WebXR Emulator** - [Link](https://chrome.google.com/webstore/detail/webxr-api-emulator)
2. **Firefox WebXR Emulator** - Built into dev tools

Or connect a real headset:
- Meta Quest via Quest Link
- Valve Index via SteamVR
- Windows MR headsets natively in Edge

## Learn More

- [WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
- [Three.js WebXR](https://threejs.org/docs/#manual/en/introduction/How-to-create-VR-content)
- [Hololand Renderer](../../packages/renderer)

## Next Steps

After mastering progressive VR:

- Add hand tracking interaction
- Implement teleportation locomotion
- Add spatial UI panels in VR
- Integrate with @hololand/audio for spatial sound

---

**Pro Tip:** Always build and test on desktop first. VR debugging is much harder!
