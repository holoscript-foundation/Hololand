# Brittney AI Mobile

**V1 Expert - Best Quality, Free Forever** 🎉

Brittney AI powers the **Hololand Central** mobile experience - your local-first AI assistant for HoloScript world building on iOS and Android. Part of the 3-layer Hololand architecture.

## 🏗️ 3-Layer Architecture

```
┌─────────────────────────────────────────┐
│  UI LAYER                               │
│  Touch interface, gestures, overlays    │
├─────────────────────────────────────────┤
│  WORLD LAYER                            │
│  3D AR/VR content, HoloScript scenes    │
├─────────────────────────────────────────┤
│  BACKGROUND LAYER                       │
│  Brittney AI inference (WASM/Cloud)     │
└─────────────────────────────────────────┘
```

Brittney runs in the **Background Layer**, providing AI assistance while users build and explore worlds in the **World Layer**, all controlled via the **UI Layer**.

## Features

- 📱 **Native Experience** - Runs on iOS and Android
- 🤖 **On-Device AI** - WebAssembly-based inference (or cloud fallback)
- 🔑 **Optional Cloud** - Bring your own API key
- 📳 **Haptic Feedback** - Native feel
- ⌨️ **Keyboard Handling** - Smooth input experience
- 🔒 **Secure Storage** - API keys stored locally

## Quick Start

```bash
# Install dependencies
pnpm install

# Build web assets
pnpm build

# Add iOS platform
pnpm cap:add:ios

# Add Android platform  
pnpm cap:add:android

# Open in Xcode (iOS)
pnpm cap:open:ios

# Open in Android Studio
pnpm cap:open:android
```

## Development

```bash
# Start dev server
pnpm dev

# Sync changes to native projects
pnpm cap:sync
```

## Building for App Store

### iOS

1. Open in Xcode: `pnpm cap:open:ios`
2. Set your signing team
3. Build for archive: Product → Archive
4. Upload to App Store Connect

### Android

1. Open in Android Studio: `pnpm cap:open:android`
2. Build signed APK/AAB: Build → Generate Signed Bundle
3. Upload to Google Play Console

## Model Strategy

Mobile uses a different inference approach than desktop:

| Platform           | Primary                      | Fallback  |
|--------------------|------------------------------|-----------|
| Desktop (Tauri)    | Native GGUF (node-llama-cpp) | Cloud API |
| Mobile (Capacitor) | WASM GGUF (smaller quantized)| Cloud API |

The mobile GGUF model uses Q4 quantization for smaller size and faster loading.

## Required Assets

Create these directories for native builds:

```text
ios/App/App/Assets.xcassets/
android/app/src/main/res/
```

App icons and splash screens should be added to both platforms.

## License

**Brittney AI License** - Free for local use, education, research, and game development.

| ✅ Permitted | ❌ Prohibited |
|-------------|--------------|
| Local/offline use | Hosting as API service |
| Schools & education | Reverse engineering |
| Research projects | Weight extraction |
| Game development | Model distillation |
| Mobile apps | Commercial API hosting |

See [LICENSE.md](../../packages/brittney/models/LICENSE.md) for full terms.
