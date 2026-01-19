# @hololand/holofilter

**HoloFilter** - Unified VRR Scanning & AR Overlay System for Hololand

## Features

### VRR (Virtual Reality Reality)
- 📷 **Object Scanning** - Capture 3D objects from multiple angles
- 🏠 **Room Scanning** - Map entire environments
- 👤 **Face/Body Scanning** - Capture avatars
- 🔷 **Point Cloud Generation** - Dense point cloud from depth data
- 🔺 **Mesh Reconstruction** - Convert to polygonal mesh
- 📤 **Export** - HoloScript orbs, OBJ, PLY formats

### AR (Augmented Reality)
- 😎 **Face Filters** - Sunglasses, masks, effects
- 👑 **Head Attachments** - Crowns, ears, horns
- 🌍 **Environment Effects** - Hologram overlays
- 📍 **Surface Anchoring** - Place objects on surfaces
- 🎭 **Expression Triggers** - React to smile, blink, etc.
- 🔄 **Smooth Tracking** - Jitter-free overlay rendering

## Installation

\`\`\`bash
pnpm add @hololand/holofilter
\`\`\`

## Quick Start

### Unified Interface

\`\`\`typescript
import { createHoloFilter } from '@hololand/holofilter';

const holoFilter = createHoloFilter({
  scanner: { quality: 'high', enableDepth: true },
  ar: { maxFaces: 2, smoothing: 0.3 }
});

// Start scanning an object
holoFilter.startScan('my-object', 'object');
holoFilter.addScanFrame(imageData, depthData);
const result = await holoFilter.finishScan();

// Enable AR filter
holoFilter.activateFilter('sunglasses');
const state = holoFilter.updateAR(faceDetections, deltaTime);
\`\`\`

### VRR Scanning Only

\`\`\`typescript
import { createObjectScanner } from '@hololand/holofilter';

const scanner = createObjectScanner({
  quality: 'high',
  maxFrames: 100,
  enableDepth: true
});

const session = scanner.startSession('furniture', 'object');

// Add frames during capture
scanner.addFrame(imageData, depthData);

// Complete scan
const result = await scanner.stopCapture();

// Export to HoloScript
const holoScript = scanner.exportAsHoloScript({
  orbName: 'ScannedFurniture',
  includeTextures: true
});
\`\`\`

### AR Filters Only

\`\`\`typescript
import { createARFilterManager, createPresetFilters } from '@hololand/holofilter';

const arManager = createARFilterManager({
  maxFaces: 4,
  smoothing: 0.3
});

// Activate preset filter
arManager.activateFilter('sunglasses');

// Update with face detections
const state = arManager.update(faceDetections, deltaTime);

// Get attachment transforms for rendering
const attachments = arManager.getFilterAttachments('sunglasses');
\`\`\`

## HoloScript Integration

Use HoloFilter traits in HoloScript:

\`\`\`holoscript
orb MyScanScene {
  trait holo_scan {
    mode: "object"
    quality: "high"
    export_format: "holoscript"
  }
}

orb MyARFilter {
  trait holo_filter {
    type: "face"
    preset: "sunglasses"
    tracking: true
  }
}
\`\`\`

## API Reference

### HoloFilter (Unified)

| Method | Description |
|--------|-------------|
| \`startScan(id, mode)\` | Start VRR scan session |
| \`addScanFrame(image, depth?)\` | Add frame to scan |
| \`finishScan()\` | Complete scan and get result |
| \`exportToHoloScript()\` | Export scan as HoloScript |
| \`registerFilter(filter)\` | Add custom AR filter |
| \`activateFilter(id)\` | Enable AR filter |
| \`deactivateFilter(id)\` | Disable AR filter |
| \`updateAR(faces, dt)\` | Update AR with detections |

### ObjectScanner (VRR)

| Method | Description |
|--------|-------------|
| \`startSession(id, mode)\` | Start scanning session |
| \`addFrame(image, depth?)\` | Capture frame |
| \`stopCapture()\` | Finish and process |
| \`generatePointCloud()\` | Create point cloud |
| \`reconstructMesh()\` | Generate mesh |
| \`exportAsHoloScript()\` | Export to HoloScript |
| \`exportAsOBJ()\` | Export to OBJ |
| \`exportAsPLY()\` | Export to PLY |

### ARFilterManager (AR)

| Method | Description |
|--------|-------------|
| \`registerFilter(filter)\` | Add filter |
| \`activateFilter(id)\` | Enable filter |
| \`deactivateFilter(id)\` | Disable filter |
| \`update(faces, dt)\` | Update with detections |
| \`getState()\` | Get current overlay state |
| \`getFilterAttachments(id)\` | Get render transforms |

## Scan Modes

| Mode | Description |
|------|-------------|
| \`object\` | Single object from multiple angles |
| \`room\` | Environment/room scanning |
| \`face\` | Face/head capture |
| \`body\` | Full body capture |

## Export Formats

| Format | Description |
|--------|-------------|
| \`holoscript\` | Native HoloScript orb definition |
| \`obj\` | Wavefront OBJ (geometry + materials) |
| \`ply\` | PLY point cloud format |

## License

MIT - Part of the Hololand Ecosystem
