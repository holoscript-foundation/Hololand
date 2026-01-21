# Brittney AI Desktop

Local-first AI assistant for HoloScript world building, packaged as a desktop application with Tauri.

## Features

- 🤖 **Bundled AI Model** - Brittney V1 (brittney-f16.gguf) runs 100% locally
- 🔒 **No Cloud Required** - Works completely offline
- 🔑 **Optional Cloud APIs** - Bring your own API keys for enhanced capabilities
- 🎨 **Holographic UI** - Beautiful, responsive chat interface
- 🌍 **HoloScript Expert** - Trained specifically for world building

## Quick Start

```bash
# Install dependencies
pnpm install

# Download the model (required for first run)
pnpm download:model

# Start development
pnpm tauri:dev

# Build for production
pnpm tauri:build
```

## Model Setup

The Brittney GGUF model (~2.05 GB) needs to be placed in `src-tauri/models/`:

```
src-tauri/
├── models/
│   └── brittney-f16.gguf  ← Place model here
├── src/
│   └── main.rs
└── tauri.conf.json
```

### Getting the Model

1. **From Ollama** (if you have brittney installed):

   ```bash
   # The model is stored in Ollama's blob storage
   # Check: ~/.ollama/models/
   ```

2. **Direct copy** from the training output:

   ```bash
   cp ../../✱brittney/✦brittney/brittney-f16.gguf src-tauri/models/
   ```

3. **Download script**:

   ```bash
   pnpm download:model
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
    ├── download-model.mjs  # Model download script
    └── check-model.mjs     # Postinstall check
```

## Cloud API Support

Users can optionally add their own API keys for cloud providers:

| Provider  | Models              | Environment Variable  |
|-----------|---------------------|-----------------------|
| OpenAI    | GPT-4o, GPT-4o-mini | `OPENAI_API_KEY`      |
| Anthropic | Claude 3.5 Sonnet   | `ANTHROPIC_API_KEY`   |
| Google    | Gemini 1.5 Pro      | `GOOGLE_API_KEY`      |
| Groq      | Llama 3.1 70B       | `GROQ_API_KEY`        |
| Together  | Various             | `TOGETHER_API_KEY`    |
| Ollama    | Local models        | (no key needed)       |

Click the "Add API Key" button in the sidebar to configure.

## Building for Distribution

### Windows

```bash
pnpm tauri:build
# Output: src-tauri/target/release/bundle/msi/
```

### macOS

```bash
pnpm tauri:build
# Output: src-tauri/target/release/bundle/dmg/
```

### Linux

```bash
pnpm tauri:build
# Output: src-tauri/target/release/bundle/appimage/
```

## System Requirements

- **Minimum**: 4GB RAM, 4GB disk space
- **Recommended**: 8GB RAM, SSD
- **GPU**: Optional (CPU inference supported)
- **OS**: Windows 10+, macOS 10.15+, Linux (glibc 2.31+)

## License

MIT
