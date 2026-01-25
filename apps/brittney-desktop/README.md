# Brittney AI Desktop

**V1 Free - Production Ready** 🎉

Local-first AI assistant for HoloScript world building, packaged as a desktop application with Tauri.

## Features

- 🤖 **Free AI Model** - Brittney V1 (2.0 GB) runs 100% locally
- 🔒 **No Cloud Required** - Works completely offline
- 🔑 **Optional Cloud APIs** - Bring your own API keys for enhanced capabilities
- 🎨 **Holographic UI** - Beautiful, responsive chat interface
- 🌍 **HoloScript Expert** - Trained specifically for world building
- 📱 **Cross-Platform** - Windows, macOS, Linux

## Quick Start

```bash
# Install dependencies
pnpm install

# Download the free V1 model (~2 GB)
pnpm download:model

# For low-memory devices (1.2 GB quantized version)
pnpm download:model:q4

# Start development
pnpm tauri:dev

# Build for production
pnpm tauri:build
```

## Download Options

| Model | Command | Size | RAM Required |
|-------|---------|------|--------------|
| V1 Free (Full) | `pnpm download:model` | 2.0 GB | 4 GB |
| V1 Q4 (Quantized) | `pnpm download:model:q4` | 1.2 GB | 2 GB |

## Model Location

After download, models are stored in:

```
src-tauri/
├── models/
│   └── brittney-f16.gguf  ← Model file (downloaded)
├── src/
│   └── main.rs
└── tauri.conf.json
```

## Alternative Model Sources

### From GitHub Releases

```bash
curl -L -o src-tauri/models/brittney-f16.gguf \
  https://github.com/hololand/hololand/releases/download/brittney-v1.0.0/brittney-v1-free.gguf
```

### Using npx

```bash
npx @hololand/brittney-models download v1-free --dest ./src-tauri/models
```

## Architecture

```text
brittney-desktop/
├── index.html            # Main HTML shell
├── src/
│   └── main.ts          # TypeScript app entry
├── src-tauri/
│   ├── Cargo.toml       # Rust dependencies
│   ├── tauri.conf.json  # Tauri configuration
│   ├── src/
│   │   └── main.rs      # Rust backend
│   └── models/
│       └── brittney-f16.gguf  # Bundled AI model
└── scripts/
    ├── download-model.mjs  # ModAI model (downloaded)
└── scripts/
    ├── download-model.mjs  # Model download script
    └── check-model.mjs     # Postinstall check
```

## Cloud API Support (Optional)

Brittney can optionally use cloud APIs for enhanced capabilities:

| Provider  | Models              | Use Case              |
|-----------|---------------------|-----------------------|
| OpenAI    | GPT-4o, GPT-4o-mini | Fallback for complex queries |
| Anthropic | Claude 3.5 Sonnet   | Alternative AI backend |
| Ollama    | Local models        | Additional local models |

Click the settings icon to configure API keys.

## Building for Distribution

### Windows

```bash
pnpm tauri:build
# Output: src-tauri/target/release/bundle/msi/Brittney AI_*.msi
```

### macOS

```bash
pnpm tauri:build
# Output: src-tauri/target/release/bundle/macos/Brittney AI.app
```

### Linux

```bash
pnpm tauri:build
# Output: src-tauri/target/release/bundle/deb/brittney-ai_*.deb
#         src-tauri/target/release/bundle/appimage/Brittney AI_*.AppImage
```

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| RAM | 4 GB | 8 GB |
| Storage | 3 GB | 5 GB |
| OS | Windows 10, macOS 10.15, Ubuntu 20.04 | Latest |

## License

MIT License - Free for personal and commercial use.

## Links

- [Hololand](https://hololand.io)
- [HoloScript Documentation](https://hololand.io/docs/holoscript)
- [Brittney Toolkit](https://www.npmjs.com/package/@hololand/brittney-toolkit)
- [Model Downloads](https://github.com/hololand/hololand/releases?q=brittney-v)