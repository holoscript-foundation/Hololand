# Brittney Model Directory

Place `brittney-f16.gguf` (2.05 GB) in this directory.

## How to get the model:

1. **From training output:**
   ```bash
   cp ../../../✱brittney/✦brittney/brittney-f16.gguf ./
   ```

2. **From Ollama (if installed):**
   The model is stored in `~/.ollama/models/` as blobs.

3. **Using download script:**
   ```bash
   cd apps/brittney-desktop
   pnpm download:model
   ```

## Note

This file will be excluded from git (see .gitignore).
The model is bundled into the Tauri app during build.
