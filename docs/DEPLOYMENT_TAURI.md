# HoloScript Tauri Desktop Deployment Guide

## Overview

Deploy HoloScript applications to Windows, macOS, and Linux using Tauri with native capabilities, offline-first architecture, and optional cloud sync.

**Platforms**: Windows, macOS, Linux  
**Framework**: Tauri + React + TypeScript  
**Architecture**: Client-side (file system access, native APIs)  
**Target**: Desktop multiplayer, offline parties, persistent data

---

## Prerequisites

### System Requirements

```bash
# Check prerequisites
rustc --version   # 1.56.0 or higher
cargo --version   # Latest stable

# Node.js 16+
node --version

# Platform-specific:
# Windows: Visual Studio Build Tools 2019+
# macOS: Xcode Command Line Tools
# Linux: Build essentials
```

### Install Tauri

```bash
pnpm add -D tauri @tauri-apps/api
pnpm add -D @tauri-apps/cli

# Check installation
pnpm tauri --version
```

---

## Project Setup

### 1. Initialize Tauri

```bash
cd packages/playground

# Create Tauri configuration
pnpm tauri init

# Choose:
# App Name: HoloScript
# Website: http://tauri.localhost
# Frontend Port: 5173
# Backend Dist: ../dist
```

### 2. Update tauri.conf.json

```json
{
  "build": {
    "beforeBuildCommand": "pnpm build",
    "beforeDevCommand": "pnpm dev",
    "devPath": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{
      "fullscreen": false,
      "width": 1280,
      "height": 720,
      "resizable": true,
      "title": "HoloScript"
    }],
    "security": {
      "csp": "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*"
    }
  },
  "tauri": {
    "allowlist": {
      "fs": {
        "all": true,
        "readFile": true,
        "writeFile": true,
        "createDir": true,
        "removeFile": true,
        "removeDir": true
      },
      "path": {
        "all": true
      },
      "window": {
        "all": true
      }
    }
  }
}
```

### 3. Create Tauri Bridge

**src-tauri/src/main.rs**:
```rust
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::fs;
use std::path::PathBuf;
use tauri::api::path;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_party_data,
            load_party_data,
            save_analytics,
            load_analytics,
            list_saved_worlds
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Save party data to file system
#[tauri::command]
async fn save_party_data(party_id: String, data: String) -> Result<String, String> {
    let app_data_dir = path::app_data_dir(&Default::default())
        .ok_or("Could not get app data dir")?;
    
    let parties_dir = app_data_dir.join("parties");
    fs::create_dir_all(&parties_dir)
        .map_err(|e| format!("Failed to create dir: {}", e))?;
    
    let file_path = parties_dir.join(format!("{}.json", party_id));
    fs::write(&file_path, data)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(file_path.to_string_lossy().to_string())
}

// Load party data from file system
#[tauri::command]
async fn load_party_data(party_id: String) -> Result<String, String> {
    let app_data_dir = path::app_data_dir(&Default::default())
        .ok_or("Could not get app data dir")?;
    
    let file_path = app_data_dir.join("parties").join(format!("{}.json", party_id));
    fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

// Save analytics data
#[tauri::command]
async fn save_analytics(session_id: String, data: String) -> Result<(), String> {
    let app_data_dir = path::app_data_dir(&Default::default())
        .ok_or("Could not get app data dir")?;
    
    let analytics_dir = app_data_dir.join("analytics");
    fs::create_dir_all(&analytics_dir)
        .map_err(|e| format!("Failed to create dir: {}", e))?;
    
    let file_path = analytics_dir.join(format!("{}.csv", session_id));
    fs::write(file_path, data)
        .map_err(|e| format!("Failed to write file: {}", e))
}

// Load analytics data
#[tauri::command]
async fn load_analytics(session_id: String) -> Result<String, String> {
    let app_data_dir = path::app_data_dir(&Default::default())
        .ok_or("Could not get app data dir")?;
    
    let file_path = app_data_dir.join("analytics").join(format!("{}.csv", session_id));
    fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

// List saved worlds
#[tauri::command]
async fn list_saved_worlds() -> Result<Vec<String>, String> {
    let app_data_dir = path::app_data_dir(&Default::default())
        .ok_or("Could not get app data dir")?;
    
    let worlds_dir = app_data_dir.join("worlds");
    if !worlds_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut worlds = Vec::new();
    for entry in fs::read_dir(worlds_dir)
        .map_err(|e| format!("Failed to read dir: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.extension().map(|e| e == "json").unwrap_or(false) {
            worlds.push(path.file_stem().unwrap().to_string_lossy().to_string());
        }
    }
    
    Ok(worlds)
}
```

### 4. Create Tauri Service Layer

**src/services/TauriFileStorage.ts**:
```typescript
import { invoke } from '@tauri-apps/api/tauri'

export class TauriFileStorage {
  async savePartyData(partyId: string, data: any): Promise<void> {
    await invoke('save_party_data', {
      partyId,
      data: JSON.stringify(data)
    })
  }
  
  async loadPartyData(partyId: string): Promise<any> {
    const data = await invoke<string>('load_party_data', { partyId })
    return JSON.parse(data)
  }
  
  async saveAnalytics(sessionId: string, csv: string): Promise<void> {
    await invoke('save_analytics', { sessionId, data: csv })
  }
  
  async loadAnalytics(sessionId: string): Promise<string> {
    return await invoke<string>('load_analytics', { sessionId })
  }
  
  async listSavedWorlds(): Promise<string[]> {
    return await invoke<string[]>('list_saved_worlds')
  }
}

export const tauriStorage = new TauriFileStorage()
```

---

## Development Workflow

### 1. Start Development

```bash
# Terminal 1: Frontend dev server
pnpm dev

# Terminal 2: Tauri dev app
pnpm tauri dev

# App window opens with hot reload
```

### 2. Create Desktop-Specific Component

**src/components/DesktopHoloScript.tsx**:
```typescript
import React from 'react'
import { useAllSystems } from '../hooks/useHoloScriptSystems'
import { tauriStorage } from '../services/TauriFileStorage'

export function DesktopHoloScript() {
  const { party, analytics, sync } = useAllSystems()
  const [savedWorlds, setSavedWorlds] = React.useState<string[]>([])
  
  React.useEffect(() => {
    // Load saved worlds on startup
    tauriStorage.listSavedWorlds().then(setSavedWorlds)
  }, [])
  
  const handleCreateParty = async () => {
    const newParty = party.createParty('Desktop Party', { maxPlayers: 4 })
    
    // Persist to disk
    await tauriStorage.savePartyData(newParty.partyId, newParty)
  }
  
  const handleExportAnalytics = async () => {
    const csv = analytics.exportAsCSV()
    const sessionId = analytics.sessionId || 'session'
    await tauriStorage.saveAnalytics(sessionId, csv)
    alert(`Analytics exported to ${sessionId}.csv`)
  }
  
  return (
    <div className="desktop-app">
      <h1>🖥️ HoloScript Desktop</h1>
      
      <section>
        <h2>Party Management</h2>
        <button onClick={handleCreateParty}>Create Party</button>
        <p>Current: {party.party?.name || 'None'}</p>
      </section>
      
      <section>
        <h2>Analytics</h2>
        <button onClick={() => analytics.startSession('DesktopPlayer')}>
          Start Recording
        </button>
        <button onClick={handleExportAnalytics}>
          Export to File
        </button>
      </section>
      
      <section>
        <h2>Saved Worlds</h2>
        <ul>
          {savedWorlds.map(w => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```

### 3. Run Tests

```bash
# Tests run in both dev and production contexts
pnpm test -- --coverage
```

---

## Building for Desktop

### 1. Build Application

```bash
# Build for current platform
pnpm tauri build

# Output:
# - Windows: src-tauri/target/release/HoloScript.exe
# - macOS: src-tauri/target/release/bundle/macos/HoloScript.app
# - Linux: src-tauri/target/release/holoscript

# Create installers
pnpm tauri build -- --bundle all
```

### 2. Platform-Specific Configuration

**Windows (NSIS Installer)**:
```json
{
  "tauri": {
    "bundle": {
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "signingIdentity": null,
        "timestampUrl": ""
      }
    }
  }
}
```

**macOS (DMG + Code Signing)**:
```json
{
  "tauri": {
    "bundle": {
      "macOS": {
        "frameworks": [],
        "minimumSystemVersion": "10.13",
        "signingIdentity": "Apple Development",
        "entitlements": null
      }
    }
  }
}
```

**Linux (AppImage)**:
```json
{
  "tauri": {
    "bundle": {
      "linux": {
        "appimage": {},
        "deb": {}
      }
    }
  }
}
```

---

## Data Storage

### File Locations

Party data: `~/.config/holoscript/parties/*.json`  
Analytics: `~/.config/holoscript/analytics/*.csv`  
Worlds: `~/.config/holoscript/worlds/*.json`

### Access Pattern

```typescript
// Save locally
await tauriStorage.savePartyData('party-123', partyData)

// Load locally
const data = await tauriStorage.loadPartyData('party-123')

// Export analytics
const csv = analytics.exportAsCSV()
await tauriStorage.saveAnalytics('session-id', csv)
```

---

## Native Integrations

### File Dialogs

```typescript
import { open, save } from '@tauri-apps/api/dialog'

const file = await open({
  defaultPath: appDataDir,
  filters: [{ name: 'World', extensions: ['json'] }]
})
```

### Window Management

```typescript
import { getCurrentWindow } from '@tauri-apps/api/window'

const window = getCurrentWindow()
await window.minimize()
await window.maximize()
```

### System Tray

```json
{
  "tauri": {
    "systemTray": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true,
      "menu": [
        { "id": "quit", "label": "Quit" }
      ]
    }
  }
}
```

---

## Performance Optimization

### File I/O

```typescript
// Batch writes for better performance
const updates = [
  { id: 'obj1', state: { x: 5 } },
  { id: 'obj2', state: { y: 10 } }
]

await tauriStorage.savePartyData('party-id', {
  updates,
  timestamp: Date.now()
})
```

### Memory Management

```typescript
// Clear old data
const maxSize = 100 * 1024 * 1024 // 100 MB
const stats = await invoke('get_storage_stats')
if (stats.size > maxSize) {
  // Cleanup old files
}
```

---

## Troubleshooting

### Build Errors

```bash
# Clean build
pnpm tauri dev -- --no-watch
cargo clean
pnpm tauri build
```

### File Access Issues

```typescript
// Check permissions
import { BaseDirectory, readDir } from '@tauri-apps/api/fs'

const entries = await readDir('.', { dir: BaseDirectory.AppData })
```

### Event Handling

```typescript
// Tauri event listening
import { listen } from '@tauri-apps/api/event'

const unlisten = await listen('app:update', event => {
  console.log('Update available', event.payload)
})
```

---

## Distribution

### Installer Creation

```bash
# Windows NSIS installer
pnpm tauri build -- --bundle nsis

# macOS DMG
pnpm tauri build -- --bundle dmg

# Linux AppImage
pnpm tauri build -- --bundle appimage
```

### Signing & Notarization

**macOS Notarization**:
```bash
xcrun altool --notarize-app \
  -f HoloScript.dmg \
  -t osx \
  --apple-id your-email@apple.com
```

---

## Next Steps

1. ✅ Tauri setup complete
2. → Implement native file dialogs
3. → Add system tray integration
4. → Create auto-update mechanism
5. → Distribute via GitHub Releases

---

**Desktop ready!** 🚀
