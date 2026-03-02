# Migrating from Ready Player Me to @hololand/avatar-studio

> **Context**: Ready Player Me was acquired by Netflix in December 2025 and shut down its
> public developer services on January 31, 2026. This guide helps the ~25,000 displaced
> developers migrate their avatar integration to HoloLand's open, VRM-native Avatar Studio SDK.

---

## Table of Contents

1. [Why Migrate to HoloLand Avatar Studio](#1-why-migrate-to-hololand-avatar-studio)
2. [Feature Comparison](#2-feature-comparison)
3. [Quick Start (5-Minute Setup)](#3-quick-start-5-minute-setup)
4. [Package Setup](#4-package-setup)
5. [Migration by Integration Mode](#5-migration-by-integration-mode)
   - [5.1 Iframe Integration](#51-iframe-integration)
   - [5.2 Popup Integration](#52-popup-integration)
   - [5.3 React Integration](#53-react-integration)
   - [5.4 REST API Integration](#54-rest-api-integration)
6. [Avatar Data Model Changes](#6-avatar-data-model-changes)
7. [Loading Avatars in Your App](#7-loading-avatars-in-your-app)
8. [Advanced: Inline Mode (No Iframe)](#8-advanced-inline-mode-no-iframe)
9. [Advanced: AI-Powered Creation](#9-advanced-ai-powered-creation)
10. [Cloud Service and CDN](#10-cloud-service-and-cdn)
11. [Creator Economy and Marketplace](#11-creator-economy-and-marketplace)
12. [HoloScript Bridge](#12-holoscript-bridge)
13. [Webhook Migration](#13-webhook-migration)
14. [Troubleshooting](#14-troubleshooting)
15. [API Reference Summary](#15-api-reference-summary)

---

## 1. Why Migrate to HoloLand Avatar Studio

| Concern | Ready Player Me (defunct) | HoloLand Avatar Studio |
|---------|--------------------------|------------------------|
| **Availability** | Shut down Jan 31, 2026 | Active, MIT licensed |
| **Avatar Format** | GLB (proprietary pipeline) | VRM 1.0 (open standard) |
| **Platform Lock-in** | RPM CDN only | Self-host or HoloLand CDN |
| **Integration Modes** | Iframe, WebView | Iframe, Popup, Inline (no iframe), API |
| **Customization Depth** | Predefined options | Full blueprint system with 50+ sliders |
| **Creator Economy** | None | Built-in marketplace for user-created assets |
| **Export Formats** | GLB | VRM, GLB, glTF, FBX |
| **Performance Budgeting** | None | Built-in poly/texture/draw-call budgets |
| **Undo/Redo** | None | Full undo/redo with 50-step history |
| **Physics** | None | Spring bone physics for hair and clothing |
| **AI Creation** | None | Natural language to avatar |
| **Pricing** | Free tier + paid | Open source (MIT) + optional hosted service |

---

## 2. Feature Comparison

### Integration Modes

| Mode | RPM | HoloLand | Notes |
|------|-----|----------|-------|
| Iframe embed | `<subdomain>.readyplayer.me/avatar?frameApi` | `sdk.embedIframe(container)` | Drop-in replacement |
| Popup window | Custom implementation | `sdk.openPopup()` | Built-in with error handling |
| React component | `@readyplayerme/rpm-react-sdk` | `AvatarStudioSDK` + React wrapper | See Section 5.3 |
| Inline (no iframe) | Not available | `sdk.mountInline(container)` | Best performance |
| REST API | `api.readyplayer.me/v1/` | `studio.hololand.io/api/v1/` | Similar patterns |
| Unity WebView | `rpm-unity-sdk-webview` | Coming soon | Iframe mode works now |
| Photo-to-avatar | Yes | `sdk.createFromPhoto(blob)` | AI-powered |
| Text-to-avatar | Not available | `sdk.createFromDescription(text)` | New capability |

### Avatar Features

| Feature | RPM | HoloLand |
|---------|-----|----------|
| Body presets | 3 (fullbody, halfbody, face) | 4 (slim, average, athletic, heavy) |
| Gender presentation | Binary | Masculine, feminine, androgynous |
| Body sliders | Limited | 10 proportion sliders (0.0-1.0) |
| Face customization | Preset-based | 6 face shapes + 7 morph sliders |
| Eye options | Color + shape | Color, shape, size, tilt, separation, heterochromia |
| Hair styles | ~40 | 12 built-in + marketplace |
| Hair physics | No | Spring bone (none/simple/full) |
| Clothing slots | 4 | 9 (head, face, neck, upper, lower, feet, hands, full, outerwear) |
| Accessory slots | Limited | 12 (hat, glasses, earrings, necklace, bracelets, rings, backpack, wings, tail, custom) |
| Expressions | Basic | 17 standard VRM expressions + custom |
| Export quality | Single | Full, Optimized, Mobile |
| Texture compression | No | KTX2/Basis compression |
| Performance metrics | No | Real-time FPS, triangles, draw calls, texture memory |

---

## 3. Quick Start (5-Minute Setup)

If you just want to get avatars working again as fast as possible, here is the minimal
migration path.

### Before (Ready Player Me -- BROKEN after Jan 31, 2026)

```html
<iframe
  id="rpm-frame"
  src="https://my-app.readyplayer.me/avatar?frameApi"
  allow="camera *; microphone *"
  style="width: 100%; height: 600px; border: none;">
</iframe>

<script>
  window.addEventListener('message', (event) => {
    const json = typeof event.data === 'string'
      ? JSON.parse(event.data)
      : event.data;

    if (json.source !== 'readyplayerme') return;

    if (json.eventName === 'v1.avatar.exported') {
      const avatarUrl = json.data.url;
      // https://models.readyplayer.me/<id>.glb  <-- DEAD URL
      loadAvatarInMyApp(avatarUrl);
    }
  });

  const iframe = document.getElementById('rpm-frame');
  iframe.contentWindow.postMessage(
    JSON.stringify({
      target: 'readyplayerme',
      type: 'subscribe',
      eventName: 'v1.**',
    }),
    '*'
  );
</script>
```

### After (HoloLand Avatar Studio SDK)

```html
<div id="avatar-container" style="width: 100%; height: 600px;"></div>

<script type="module">
  import { AvatarStudioSDK } from '@hololand/avatar-studio';

  const sdk = new AvatarStudioSDK({
    appId: 'my-app',
    onAvatarCreated: (result) => {
      const avatarUrl = result.vrmUrl;       // Hosted VRM URL (persistent)
      const avatarBlob = result.vrmBlob;     // Or use the blob directly
      const thumbnail = result.thumbnailUrl; // Avatar thumbnail
      const avatarId = result.avatarId;      // For future reference

      loadAvatarInMyApp(avatarUrl);
    },
    onCancel: () => {
      console.log('User cancelled avatar creation');
    },
    onError: (error) => {
      console.error('Avatar studio error:', error.code, error.message);
    },
  });

  // Drop-in iframe replacement
  sdk.embedIframe(document.getElementById('avatar-container'));
</script>
```

**Key differences:**
- No manual `postMessage` handling -- callbacks are built in
- Avatar URLs use the VRM format (open standard) instead of proprietary GLB
- Error handling is structured with error codes
- Cleanup is automatic via `sdk.dispose()`

---

## 4. Package Setup

### npm / pnpm / yarn

```bash
# Install the avatar studio SDK
npm install @hololand/avatar-studio

# Required peer dependencies
npm install three @pixiv/three-vrm

# Optional: spring bone physics for hair/clothing dynamics
npm install @pixiv/three-vrm-springbone
```

### package.json

```json
{
  "dependencies": {
    "@hololand/avatar-studio": "^0.1.0",
    "three": "^0.160.0",
    "@pixiv/three-vrm": "^2.0.0"
  },
  "optionalDependencies": {
    "@pixiv/three-vrm-springbone": "^2.0.0"
  }
}
```

### CDN (for quick prototyping)

```html
<script type="importmap">
{
  "imports": {
    "@hololand/avatar-studio": "https://cdn.hololand.io/avatar-studio/latest/index.js",
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "@pixiv/three-vrm": "https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@2.0.0/lib/three-vrm.module.js"
  }
}
</script>
```

### TypeScript

The package ships with full TypeScript declarations. No `@types/` package needed.

```typescript
import {
  AvatarStudioSDK,
  AvatarStudioSDKConfig,
  AvatarCreationResult,
  AvatarStudioError,
} from '@hololand/avatar-studio';
```

---

## 5. Migration by Integration Mode

### 5.1 Iframe Integration

This is the most common RPM integration pattern and the easiest to migrate.

#### Before (RPM)

```javascript
const subdomain = 'my-app';
const iframe = document.createElement('iframe');
iframe.src = `https://${subdomain}.readyplayer.me/avatar?frameApi`;
iframe.style.width = '100%';
iframe.style.height = '100%';
iframe.style.border = 'none';
iframe.allow = 'camera *; microphone *';
document.getElementById('container').appendChild(iframe);

window.addEventListener('message', (event) => {
  const json = typeof event.data === 'string'
    ? JSON.parse(event.data)
    : event.data;

  if (json.source !== 'readyplayerme') return;

  switch (json.eventName) {
    case 'v1.frame.ready':
      // Subscribe to all events
      iframe.contentWindow.postMessage(
        JSON.stringify({
          target: 'readyplayerme',
          type: 'subscribe',
          eventName: 'v1.**',
        }),
        '*'
      );
      break;

    case 'v1.avatar.exported':
      console.log('Avatar URL:', json.data.url);
      // URL format: https://models.readyplayer.me/<avatar-id>.glb
      break;

    case 'v1.user.set':
      console.log('User ID:', json.data.id);
      break;
  }
});
```

#### After (HoloLand)

```javascript
import { AvatarStudioSDK } from '@hololand/avatar-studio';

const sdk = new AvatarStudioSDK({
  appId: 'my-app',              // Register at studio.hololand.io
  apiKey: 'your-api-key',       // Optional: for authenticated operations
  exportQuality: 'optimized',   // 'full' | 'optimized' | 'mobile'
  uploadToCDN: true,            // Auto-upload to HoloLand CDN
  theme: 'auto',                // 'light' | 'dark' | 'auto'
  locale: 'en',                 // UI language

  onAvatarCreated: (result) => {
    console.log('Avatar VRM URL:', result.vrmUrl);
    console.log('Avatar GLB URL:', result.glbUrl);
    console.log('Thumbnail:', result.thumbnailUrl);
    console.log('Avatar ID:', result.avatarId);
    console.log('Stats:', result.stats);
    // result.stats = { polyCount, textureMemoryMB, fileSizeKB }
  },

  onCancel: () => {
    console.log('User cancelled');
  },

  onError: (error) => {
    console.error(`Error [${error.code}]: ${error.message}`);
  },
});

// One line replaces all the iframe + postMessage boilerplate
const iframe = sdk.embedIframe(
  document.getElementById('container'),
  { width: '100%', height: '100%' }
);

// Cleanup when done
// sdk.removeIframe();
// sdk.dispose();
```

**Migration checklist for iframe mode:**
- Replace RPM subdomain URL with `sdk.embedIframe()`
- Replace `postMessage` event listener with `onAvatarCreated` callback
- Replace `.glb` URL handling with `.vrm` URL handling
- Remove manual `subscribe` postMessage calls
- Add `sdk.dispose()` to your component unmount/cleanup

### 5.2 Popup Integration

#### Before (RPM)

RPM did not have a built-in popup mode. Developers typically used `window.open`:

```javascript
const subdomain = 'my-app';
const popup = window.open(
  `https://${subdomain}.readyplayer.me/avatar?frameApi`,
  'rpm-avatar-creator',
  'width=1024,height=768'
);

// Polling or message-based approach to get the result
window.addEventListener('message', (event) => {
  // Same postMessage handling as iframe mode...
});
```

#### After (HoloLand)

```javascript
import { AvatarStudioSDK } from '@hololand/avatar-studio';

const sdk = new AvatarStudioSDK({
  appId: 'my-app',
  onAvatarCreated: (result) => {
    console.log('Avatar ready:', result.vrmUrl);
  },
  onError: (error) => {
    if (error.code === 'POPUP_BLOCKED') {
      // Fallback to iframe mode
      sdk.embedIframe(document.getElementById('fallback-container'));
    }
  },
});

// Built-in popup with automatic centering and error handling
sdk.openPopup({ width: 1024, height: 768 });

// Close programmatically if needed
// sdk.closePopup();
```

**Migration checklist for popup mode:**
- Replace `window.open` with `sdk.openPopup()`
- Handle `POPUP_BLOCKED` error code for graceful fallback
- Remove manual popup centering calculations
- Replace postMessage listener with `onAvatarCreated` callback

### 5.3 React Integration

#### Before (RPM React SDK)

```bash
npm install @readyplayerme/rpm-react-sdk
```

```tsx
import { AvatarCreator, AvatarCreatorViewer } from '@readyplayerme/rpm-react-sdk';
import { Avatar } from '@readyplayerme/visage';

interface EditorConfig {
  clearCache: boolean;
  bodyType: 'fullbody' | 'halfbody';
  quickStart: string;
  language: string;
}

function AvatarPage() {
  const [avatarUrl, setAvatarUrl] = useState<string>();

  const editorConfig: EditorConfig = {
    clearCache: true,
    bodyType: 'fullbody',
    quickStart: 'false',
    language: 'en',
  };

  return (
    <div>
      <AvatarCreator
        subdomain="my-app"
        editorConfig={editorConfig}
        onAvatarExported={(url: string) => setAvatarUrl(url)}
      />
      {avatarUrl && <Avatar modelSrc={avatarUrl} />}
    </div>
  );
}
```

#### After (HoloLand Avatar Studio SDK in React)

```bash
npm install @hololand/avatar-studio three @pixiv/three-vrm
```

```tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  AvatarStudioSDK,
  AvatarCreationResult,
} from '@hololand/avatar-studio';

function AvatarPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<AvatarStudioSDK | null>(null);
  const [avatarResult, setAvatarResult] = useState<AvatarCreationResult>();

  useEffect(() => {
    const sdk = new AvatarStudioSDK({
      appId: 'my-app',
      apiKey: process.env.REACT_APP_HOLOLAND_API_KEY,
      theme: 'auto',
      locale: 'en',
      exportQuality: 'optimized',

      onAvatarCreated: (result) => {
        setAvatarResult(result);
      },
      onCancel: () => {
        console.log('Avatar creation cancelled');
      },
      onError: (error) => {
        console.error('Avatar error:', error);
      },
    });

    sdkRef.current = sdk;

    if (containerRef.current) {
      sdk.embedIframe(containerRef.current, {
        width: '100%',
        height: '600px',
      });
    }

    return () => {
      sdk.dispose();
    };
  }, []);

  return (
    <div>
      <div ref={containerRef} style={{ width: '100%', height: 600 }} />

      {avatarResult && (
        <div>
          <img src={avatarResult.thumbnailUrl} alt="Avatar" />
          <p>Avatar ID: {avatarResult.avatarId}</p>
          <p>VRM URL: {avatarResult.vrmUrl}</p>
          <p>Polygons: {avatarResult.stats?.polyCount}</p>
          <a href={avatarResult.vrmUrl} download>Download VRM</a>
        </div>
      )}
    </div>
  );
}
```

**React-specific migration notes:**
- Replace `@readyplayerme/rpm-react-sdk` with `@hololand/avatar-studio`
- Replace `@readyplayerme/visage` Avatar component with your own VRM loader
  (use `@pixiv/three-vrm` with a Three.js canvas or `react-three-fiber`)
- `onAvatarExported(url)` becomes `onAvatarCreated(result)` where `result.vrmUrl` is the URL
- Call `sdk.dispose()` in the React cleanup function (return from `useEffect`)

### 5.4 REST API Integration

#### Before (RPM REST API)

```javascript
// Create avatar via API
const response = await fetch('https://api.readyplayer.me/v1/avatars', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${RPM_API_KEY}`,
  },
  body: JSON.stringify({
    partner: 'my-app',
    bodyType: 'fullbody',
    gender: 'male',
    assets: {
      hairStyle: 'short-01',
      outfit: 'casual-01',
    },
  }),
});

const { id, glbUrl } = await response.json();
// glbUrl: https://models.readyplayer.me/<id>.glb  <-- DEAD
```

#### After (HoloLand REST API)

```javascript
// Option 1: Create from blueprint (structured)
const response = await fetch('https://studio.hololand.io/api/v1/avatars/from-blueprint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-ID': 'my-app',
    'Authorization': `Bearer ${HOLOLAND_API_KEY}`,
  },
  body: JSON.stringify({
    blueprint: {
      name: 'My Avatar',
      body: {
        preset: 'athletic',
        genderPresentation: 'masculine',
        height: 1.8,
        skinColor: { hex: '#e0b896' },
        proportions: {
          headScale: 0.5,
          shoulderWidth: 0.65,
          chestSize: 0.6,
          waistSize: 0.4,
          hipWidth: 0.45,
          armLength: 0.5,
          legLength: 0.5,
          handSize: 0.5,
          footSize: 0.5,
          muscleTone: 0.75,
        },
      },
      hair: {
        styleId: 'hair-short-01',
        primaryColor: { hex: '#3d2b1f' },
        physics: 'simple',
        lengthFactor: 0.5,
        volume: 0.5,
        gradientPosition: 1.0,
      },
    },
    exportQuality: 'optimized',
    uploadToCDN: true,
  }),
});

const result = await response.json();
// result.vrmUrl:       https://cdn.hololand.io/avatars/<id>.vrm
// result.glbUrl:       https://cdn.hololand.io/avatars/<id>.glb
// result.thumbnailUrl: https://cdn.hololand.io/avatars/<id>_thumb.png
// result.avatarId:     'avt_abc123'

// Option 2: Create from natural language description (AI-powered)
const aiResponse = await fetch('https://studio.hololand.io/api/v1/avatars/from-description', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-ID': 'my-app',
    'Authorization': `Bearer ${HOLOLAND_API_KEY}`,
  },
  body: JSON.stringify({
    description: 'Athletic male build, dark curly hair, blue eyes, wearing a hoodie',
    exportQuality: 'optimized',
    uploadToCDN: true,
  }),
});
```

**REST API migration checklist:**
- Replace `api.readyplayer.me/v1/` with `studio.hololand.io/api/v1/`
- Replace `partner` field with `X-App-ID` header
- Replace `bodyType`/`gender` with `body.preset`/`body.genderPresentation`
- Replace `assets` object with full `blueprint` object
- Handle `vrmUrl` instead of `glbUrl` (or use both -- HoloLand provides both)
- Add `exportQuality` for platform-specific optimization

---

## 6. Avatar Data Model Changes

### RPM Avatar Data (Approximate)

```json
{
  "id": "abc123",
  "partner": "my-app",
  "gender": "male",
  "bodyType": "fullbody",
  "assets": {
    "hairStyle": "short-01",
    "hairColor": "#3d2b1f",
    "skinColor": "#e0b896",
    "eyeColor": "#6b4423",
    "outfit": "casual-01"
  },
  "glbUrl": "https://models.readyplayer.me/abc123.glb"
}
```

### HoloLand AvatarBlueprint

```json
{
  "id": "avt_abc123",
  "name": "My Avatar",
  "version": 1,
  "createdAt": 1706745600000,
  "updatedAt": 1706745600000,
  "body": {
    "preset": "average",
    "genderPresentation": "androgynous",
    "height": 1.7,
    "proportions": {
      "headScale": 0.5,
      "shoulderWidth": 0.5,
      "chestSize": 0.5,
      "waistSize": 0.5,
      "hipWidth": 0.5,
      "armLength": 0.5,
      "legLength": 0.5,
      "handSize": 0.5,
      "footSize": 0.5,
      "muscleTone": 0.3
    },
    "skinColor": { "hex": "#e0b896" }
  },
  "face": {
    "shape": "oval",
    "morphs": {
      "jawWidth": 0.5,
      "jawHeight": 0.5,
      "chinSize": 0.5,
      "cheekboneHeight": 0.5,
      "cheekFullness": 0.5,
      "foreheadHeight": 0.5,
      "browRidge": 0.3
    },
    "eyes": {
      "shape": "almond",
      "irisColor": { "hex": "#6b4423" },
      "pupilSize": 0.5,
      "separation": 0.5,
      "tilt": 0.5,
      "size": 0.5,
      "scleraColor": { "hex": "#ffffff" }
    },
    "nose": { "shape": "straight", "bridgeWidth": 0.5, "tipHeight": 0.5, "nostrilWidth": 0.5, "size": 0.5 },
    "mouth": { "shape": "medium", "lipColor": { "hex": "#c47070" }, "width": 0.5, "upperFullness": 0.5, "lowerFullness": 0.5 },
    "eyebrows": { "styleId": "default", "color": { "hex": "#3d2b1f" }, "thickness": 0.5, "archHeight": 0.5, "height": 0.5 },
    "ears": { "size": 0.5, "pointedness": 0.0, "angle": 0.5 },
    "faceOverlays": []
  },
  "hair": {
    "styleId": "hair-short-01",
    "primaryColor": { "hex": "#3d2b1f" },
    "gradientPosition": 1.0,
    "physics": "simple",
    "lengthFactor": 0.5,
    "volume": 0.5
  },
  "clothing": [
    {
      "slot": "upperBody",
      "assetId": "cloth-hoodie-01",
      "name": "Hoodie",
      "fit": 0,
      "purchased": false
    }
  ],
  "accessories": [],
  "expressions": [
    { "name": "happy", "isStandard": true, "blendShapeWeights": { "happy": 1.0 } },
    { "name": "sad", "isStandard": true, "blendShapeWeights": { "sad": 1.0 } },
    { "name": "angry", "isStandard": true, "blendShapeWeights": { "angry": 1.0 } },
    { "name": "surprised", "isStandard": true, "blendShapeWeights": { "surprised": 1.0 } },
    { "name": "neutral", "isStandard": true, "blendShapeWeights": { "neutral": 1.0 } },
    { "name": "blink", "isStandard": true, "blendShapeWeights": { "blink": 1.0 } }
  ],
  "vrmMeta": {
    "title": "My Avatar",
    "description": "Avatar created with HoloLand Avatar Studio",
    "author": "HoloLand User",
    "version": "1.0",
    "allowedUser": "Everyone",
    "violentUsage": false,
    "sexualUsage": false,
    "commercialUsage": true,
    "license": "CC_BY"
  }
}
```

### Field Mapping (RPM to HoloLand)

| RPM Field | HoloLand Field | Notes |
|-----------|----------------|-------|
| `id` | `id` | Format changes from UUID to `avt_<timestamp>_<random>` |
| `partner` | Config `appId` | Moved to SDK config, not per-avatar |
| `gender` | `body.genderPresentation` | `'male'` -> `'masculine'`, `'female'` -> `'feminine'` |
| `bodyType` | `body.preset` | `'fullbody'` -> `'average'`, more options available |
| `assets.hairStyle` | `hair.styleId` | IDs differ, see asset catalog |
| `assets.hairColor` | `hair.primaryColor.hex` | Now supports dual-color gradients |
| `assets.skinColor` | `body.skinColor.hex` | Same format |
| `assets.eyeColor` | `face.eyes.irisColor.hex` | Nested under face config |
| `assets.outfit` | `clothing[]` | Array of slot-based items instead of single outfit |
| `glbUrl` | `vrmUrl` / `glbUrl` | Both formats available |

---

## 7. Loading Avatars in Your App

### Before (RPM GLB in Three.js)

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const loader = new GLTFLoader();
loader.load(
  'https://models.readyplayer.me/<avatar-id>.glb',  // DEAD URL
  (gltf) => {
    scene.add(gltf.scene);
  }
);
```

### After (HoloLand VRM in Three.js)

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

loader.load(
  'https://cdn.hololand.io/avatars/<avatar-id>.vrm',
  (gltf) => {
    const vrm = gltf.userData.vrm;

    // VRM gives you much more than a plain GLB:
    scene.add(vrm.scene);

    // Expressions (blend shapes)
    vrm.expressionManager?.setValue('happy', 1.0);
    vrm.expressionManager?.update();

    // Look-at (eye tracking)
    vrm.lookAt?.target = camera;

    // Spring bone physics (hair/clothing dynamics)
    // Updated automatically in your render loop:
    function animate() {
      requestAnimationFrame(animate);
      vrm.update(clock.getDelta());
      renderer.render(scene, camera);
    }
  }
);
```

### After (HoloLand GLB fallback -- if you cannot use VRM)

```javascript
// HoloLand also provides GLB URLs for backward compatibility
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const loader = new GLTFLoader();
loader.load(
  'https://cdn.hololand.io/avatars/<avatar-id>.glb',
  (gltf) => {
    scene.add(gltf.scene);
    // Works exactly like RPM GLB loading,
    // but you miss out on VRM features (expressions, physics, look-at)
  }
);
```

---

## 8. Advanced: Inline Mode (No Iframe)

HoloLand offers a mode that RPM never had: mounting the full avatar studio directly
into your page DOM without an iframe. This gives you the best performance and deepest
integration.

```javascript
import { AvatarStudioSDK } from '@hololand/avatar-studio';

const sdk = new AvatarStudioSDK({
  appId: 'my-app',
  theme: 'dark',
  onAvatarCreated: (result) => {
    console.log('Avatar ready:', result.vrmUrl);
  },
});

// Mount directly into a div -- no iframe, no cross-origin restrictions
await sdk.mountInline(document.getElementById('avatar-editor'));

// The studio renders directly in your page's DOM
// Automatically handles resize via ResizeObserver

// Cleanup
sdk.unmountInline();
sdk.dispose();
```

**When to use inline mode:**
- You need tight integration with your app's UI
- You want to avoid cross-origin restrictions
- You need the best possible rendering performance
- You want to style the studio with your app's CSS

---

## 9. Advanced: AI-Powered Creation

HoloLand provides capabilities RPM never offered: creating avatars from natural
language descriptions or selfie photos.

### Text-to-Avatar

```javascript
import { AvatarStudioSDK } from '@hololand/avatar-studio';

const sdk = new AvatarStudioSDK({
  appId: 'my-app',
  apiKey: 'your-api-key',
});

// Create an avatar from a text description
const result = await sdk.createFromDescription(
  'Athletic build, dark curly hair, blue eyes, wearing a leather jacket and jeans'
);

console.log(result.vrmUrl);       // Hosted VRM URL
console.log(result.thumbnailUrl); // Thumbnail image
console.log(result.blueprint);    // Full blueprint (editable)
```

### Photo-to-Avatar

```javascript
// From a file input
const fileInput = document.getElementById('selfie-upload');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const result = await sdk.createFromPhoto(file);
  console.log(result.vrmUrl);
});

// From a webcam capture
const canvas = document.getElementById('webcam-canvas');
canvas.toBlob(async (blob) => {
  const result = await sdk.createFromPhoto(blob);
  console.log(result.vrmUrl);
}, 'image/jpeg');
```

---

## 10. Cloud Service and CDN

HoloLand provides a full cloud persistence layer that RPM developers can use for
avatar storage, versioning, and sharing.

```javascript
import { AvatarCloudService } from '@hololand/avatar-studio';

const cloud = new AvatarCloudService({
  apiUrl: 'https://studio.hololand.io',
  appId: 'my-app',
  apiKey: 'your-api-key',
  userToken: 'user-jwt-token',
});

// Save avatar to cloud
const savedAvatar = await cloud.createAvatar(blueprint, {
  tags: ['player-avatar', 'custom'],
  isPublic: false,
});

// Load avatar
const avatar = await cloud.getAvatar(savedAvatar.id);

// List user's avatars
const { avatars, total, hasMore } = await cloud.listAvatars({
  limit: 10,
  sortBy: 'updatedAt',
  sortDirection: 'desc',
});

// Upload VRM to CDN
const uploadResult = await cloud.uploadVRM(
  savedAvatar.id,
  vrmBlob,
  thumbnailBlob,
  (progress) => console.log(`Upload: ${progress}%`)
);
console.log(uploadResult.vrmUrl); // CDN URL with edge caching

// Version history
const versions = await cloud.getVersionHistory(savedAvatar.id);
await cloud.restoreVersion(savedAvatar.id, 2);

// Sharing
const { shareUrl } = await cloud.createShareLink(savedAvatar.id);
// https://studio.hololand.io/shared/<token>

// Public gallery
const publicAvatars = await cloud.browsePublicAvatars({
  search: 'cyberpunk',
  sortBy: 'trending',
  limit: 20,
});

// Clone a public avatar
const cloned = await cloud.cloneAvatar(publicAvatars.avatars[0].id);
```

### Self-Hosting

The cloud service API can be self-hosted. Point the config to your own backend:

```javascript
const cloud = new AvatarCloudService({
  apiUrl: 'https://my-server.com',  // Your backend
  appId: 'my-app',
  apiKey: 'your-key',
});
```

---

## 11. Creator Economy and Marketplace

HoloLand includes a built-in asset marketplace that RPM lacked. Your users can
browse and equip creator-made assets.

```javascript
import { AvatarStudio } from '@hololand/avatar-studio';

const studio = new AvatarStudio({
  canvas: document.getElementById('preview'),
  width: 800,
  height: 600,
  catalog: {
    apiEndpoint: 'https://api.hololand.io/marketplace',
  },
});

await studio.initialize();

// Search marketplace for creator-made clothing
const { assets } = await studio.searchAssets({
  category: 'clothing',
  search: 'cyberpunk jacket',
  priceRange: { min: 0, max: 9.99 },
  sortBy: 'popularity',
});

// Browse by category
const hairStyles = await studio.getAssetsByCategory('hair');
const accessories = await studio.getAssetsByCategory('accessory');

// Get featured items
const featured = await studio.getFeaturedAssets();

// Equip a marketplace item
studio.equipClothing({
  slot: 'upperBody',
  assetId: assets[0].id,
  name: assets[0].name,
  creatorId: assets[0].creatorId,
  purchased: true,
  fit: 0,
});
```

### Built-in Asset Catalog

The SDK ships with 40+ free default assets:

| Category | Count | Examples |
|----------|-------|---------|
| Hair | 12 | Short Crop, Medium Layered, Long Flowing, Curly Natural, Braided, Afro, Bob, Mohawk |
| Clothing | 12 | T-Shirt, Hoodie, Leather Jacket, Jeans, Shorts, Skirt, Dress, Suit, Sneakers, Boots |
| Accessories | 11 | Round Glasses, Sunglasses, Beanie, Cap, Stud Earrings, Necklace, Wristwatch, Backpack, Angel Wings, Cat Ears |
| Eyebrows | 5 | Natural, Thick, Thin, High Arch, Straight |

---

## 12. HoloScript Bridge

For developers using HoloLand's spatial computing platform, avatars can be declared
in HoloScript and imported/exported from the studio.

```javascript
import { HoloScriptAvatarBridge } from '@hololand/avatar-studio';

const bridge = new HoloScriptAvatarBridge();

// Export blueprint to HoloScript
const holoScript = bridge.blueprintToHoloScript(blueprint, 'player');
// Produces:
// avatar#player
//   @skeleton(type: "humanoid", ik_enabled: true)
//   @body(preset: "athletic", height: 1.8)
//   @face(shape: "oval")
//   @expressive(blend_shapes: true, auto_blink: true)
//   @locomotion(style: "realistic", walk_speed: 1.4)
// { ... }

// Import HoloScript avatar declaration back to blueprint
const node = bridge.parseHoloScriptAvatar(holoScriptSource);
const partialBlueprint = bridge.holoScriptToBlueprint(node);
```

---

## 13. Webhook Migration

### Before (RPM)

RPM used a custom webhook system for server-side avatar notifications.

### After (HoloLand)

```javascript
const sdk = new AvatarStudioSDK({
  appId: 'my-app',
  apiKey: 'your-api-key',

  // Server-side webhook notification
  webhookUrl: 'https://my-server.com/webhooks/avatar',
});
```

Webhook payload:

```json
{
  "event": "avatar.created",
  "appId": "my-app",
  "avatarId": "avt_abc123",
  "vrmUrl": "https://cdn.hololand.io/avatars/avt_abc123.vrm",
  "thumbnailUrl": "https://cdn.hololand.io/avatars/avt_abc123_thumb.png",
  "timestamp": "2026-02-15T10:30:00.000Z"
}
```

The webhook includes the `X-API-Key` header with your API key for verification.

---

## 14. Troubleshooting

### Common Migration Issues

**"My RPM avatar URLs are dead"**

RPM CDN URLs (`models.readyplayer.me`) are permanently offline. You need to re-create
avatars using HoloLand and update stored URLs. If you have RPM avatar configurations
saved, map them to HoloLand blueprints using the field mapping in Section 6.

**"I get POPUP_BLOCKED errors"**

Browsers block popups that are not triggered by a direct user interaction. Ensure
`sdk.openPopup()` is called inside a click handler:

```javascript
button.addEventListener('click', () => {
  sdk.openPopup(); // Must be inside user gesture
});
```

Or use iframe mode as a fallback.

**"VRM files are larger than RPM GLB files"**

VRM includes additional metadata (expressions, physics, licensing). Use the
`'mobile'` export quality for smaller files:

```javascript
const sdk = new AvatarStudioSDK({
  appId: 'my-app',
  exportQuality: 'mobile', // Aggressive optimization
});
```

| Quality | Typical Size | Poly Count | Use Case |
|---------|-------------|------------|----------|
| `full` | 15-25 MB | Unlimited | Archival, high-end desktop |
| `optimized` | 3-8 MB | ~70,000 | Desktop VR, Quest |
| `mobile` | 1-3 MB | ~30,000 | Mobile AR, web |

**"I need GLB, not VRM"**

HoloLand provides both formats. The SDK `result.glbUrl` gives you a standard GLB URL.
You can also export directly:

```javascript
const result = await studio.exportVRM({ format: 'glb', quality: 'optimized' });
```

**"Three.js cannot load VRM files"**

Install the VRM loader plugin:

```bash
npm install @pixiv/three-vrm
```

```javascript
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));
```

**"Performance is worse than RPM avatars"**

Check your performance budget. HoloLand avatars are more feature-rich (physics,
expressions) which uses more GPU. You can check and tune metrics:

```javascript
const metrics = studio.getPerformanceMetrics();
console.log(metrics);
// { fps: 60, triangles: 45000, drawCalls: 12, textureMemoryMB: 32, withinBudget: true }

const estimate = studio.estimateExportPerformance();
console.log(estimate);
// { estimatedPolyCount: 48000, estimatedTextureMemoryMB: 22, estimatedDrawCalls: 8 }
```

**"I need to convert existing RPM avatars"**

If you have RPM `.glb` files saved locally, load them into Three.js and use
HoloLand's VRM exporter to convert:

```javascript
import { VRMExporter } from '@hololand/avatar-studio';

const exporter = new VRMExporter();
// Load your RPM GLB into a Three.js scene, then:
const result = await exporter.export(blueprint, scene, { quality: 'optimized' });
```

---

## 15. API Reference Summary

### AvatarStudioSDK (Embeddable SDK -- RPM Replacement)

```typescript
class AvatarStudioSDK {
  constructor(config: AvatarStudioSDKConfig);

  // Integration modes
  openPopup(options?: { width?: number; height?: number }): void;
  closePopup(): void;
  embedIframe(container: HTMLElement, options?: { width?: string; height?: string }): HTMLIFrameElement;
  removeIframe(): void;
  mountInline(container: HTMLElement): Promise<void>;
  unmountInline(): void;

  // Programmatic creation
  createFromDescription(description: string): Promise<AvatarCreationResult>;
  createFromBlueprint(blueprint: Partial<AvatarBlueprint>): Promise<AvatarCreationResult>;
  createFromPhoto(photoBlob: Blob): Promise<AvatarCreationResult>;

  // Avatar management
  loadAvatar(avatarId: string): Promise<AvatarCreationResult>;
  listAvatars(options?: { limit?: number; offset?: number }): Promise<{ avatars: AvatarCreationResult[]; total: number; hasMore: boolean }>;
  deleteAvatar(avatarId: string): Promise<void>;

  // Cleanup
  dispose(): void;
}
```

### AvatarStudio (Full Studio -- For Deep Integration)

```typescript
class AvatarStudio {
  constructor(config: AvatarStudioConfig);

  // Lifecycle
  initialize(): Promise<void>;
  dispose(): void;
  resize(width: number, height: number): void;

  // Body
  setBody(body: Partial<BodyConfig>): void;
  setBodyProportions(proportions: Partial<BodyProportions>): void;
  setSkinColor(hex: string): void;
  setHeight(height: number): void;
  applyBodyPreset(preset: 'slim' | 'average' | 'athletic' | 'heavy'): void;

  // Face
  setFace(face: Partial<FaceConfig>): void;
  setFaceMorphs(morphs: Partial<FaceMorphs>): void;
  setEyeColor(hex: string): void;

  // Hair
  setHair(hair: Partial<HairConfig>): void;
  setHairColor(primaryHex: string, secondaryHex?: string): void;
  setHairStyle(styleId: string): void;

  // Clothing & Accessories
  equipClothing(slot: ClothingSlot): void;
  unequipClothing(slotName: ClothingSlotName): void;
  equipAccessory(slot: AccessorySlot): void;
  unequipAccessory(slotName: AccessorySlotName): void;

  // Expressions
  setExpression(expression: ExpressionPreset): void;
  previewExpression(expression: ExpressionPreset): void;

  // Export
  exportVRM(config?: Partial<ExportConfig>, onProgress?: ExportProgressCallback): Promise<ExportResult>;
  exportAndDownload(config?: Partial<ExportConfig>, onProgress?: ExportProgressCallback): Promise<ExportResult>;
  validateForExport(): { valid: boolean; warnings: string[]; errors: string[] };

  // Asset Catalog
  searchAssets(filter?: AssetFilter): Promise<{ assets: CatalogAsset[]; total: number; hasMore: boolean }>;

  // State
  save(): string;
  load(json: string): void;
  reset(): void;
  undo(): boolean;
  redo(): boolean;
  randomize(): void;

  // Events
  on(type: StudioEventType, handler: StudioEventHandler): () => void;
  off(type: StudioEventType, handler: StudioEventHandler): void;

  // Performance
  getPerformanceMetrics(): { fps: number; triangles: number; drawCalls: number; textureMemoryMB: number; withinBudget: boolean };
}
```

### Key Types

```typescript
interface AvatarStudioSDKConfig {
  appId: string;                              // Required
  apiKey?: string;
  studioUrl?: string;                         // Default: 'https://studio.hololand.io'
  onAvatarCreated?: (result: AvatarCreationResult) => void;
  onCancel?: () => void;
  onError?: (error: AvatarStudioError) => void;
  exportQuality?: 'full' | 'optimized' | 'mobile';
  uploadToCDN?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  locale?: string;
  containerClass?: string;
  allowedBodyPresets?: string[];
  allowedClothingCategories?: string[];
  showExportButton?: boolean;
  initialBlueprint?: Partial<AvatarBlueprint>;
  webhookUrl?: string;
  userToken?: string;
}

interface AvatarCreationResult {
  blueprint: AvatarBlueprint;
  vrmBlob?: Blob;
  vrmUrl?: string;
  glbUrl?: string;
  thumbnailUrl?: string;
  thumbnailDataUrl?: string;
  avatarId: string;
  stats?: { polyCount: number; textureMemoryMB: number; fileSizeKB: number };
}

interface AvatarStudioError {
  code: string;       // 'POPUP_BLOCKED' | 'MOUNT_FAILED' | etc.
  message: string;
  details?: unknown;
}
```

---

## Migration Effort Estimate

| Your Current RPM Integration | Estimated Migration Time | Difficulty |
|------------------------------|--------------------------|------------|
| Simple iframe embed | 30 minutes | Easy |
| Iframe + postMessage events | 1-2 hours | Easy |
| React component (`rpm-react-sdk`) | 2-4 hours | Medium |
| REST API integration | 2-4 hours | Medium |
| Unity WebView | 4-8 hours | Medium |
| Custom RPM pipeline with CDN | 1-2 days | Complex |
| Full avatar system with marketplace | 3-5 days | Complex |

---

## Getting Help

- **Documentation**: [studio.hololand.io/docs](https://studio.hololand.io/docs)
- **API Reference**: [studio.hololand.io/api](https://studio.hololand.io/api)
- **Source Code**: [github.com/hololand/avatar-studio](https://github.com/hololand/avatar-studio)
- **Discord**: [discord.gg/hololand](https://discord.gg/hololand)
- **Register App ID**: [studio.hololand.io/developers](https://studio.hololand.io/developers)

---

*This migration guide covers @hololand/avatar-studio v0.1.0.
Last updated: March 2026.*
