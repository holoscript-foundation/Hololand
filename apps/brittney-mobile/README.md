# Brittney AI Mobile

Mobile app for iOS and Android, powered by Capacitor.

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

MIT
