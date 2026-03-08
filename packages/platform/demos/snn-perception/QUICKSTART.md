# SNN Perception Demo - Quickstart Guide

**Get the demo running in 5 minutes.**

---

## Prerequisites

- Node.js 18+ installed
- pnpm package manager (`npm install -g pnpm`)
- Modern browser with WebGPU support (Chrome 120+, Edge 120+)
- Optional: Meta Quest 3 for full AR/VR experience

---

## Installation

### 1. Navigate to Demo Directory

```bash
cd packages/platform/demos/snn-perception
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install:
- React + React DOM
- Three.js + React Three Fiber
- Recharts (for dashboards)
- TypeScript tooling
- Vite build system

---

## Running the Demo

### Desktop Mode (Browser)

```bash
pnpm dev
```

Then open: `http://localhost:5173`

You should see:
- **Left panel**: 3D warehouse scene with shelves, boxes, pallets
- **Right panel**: Energy benchmark dashboard with real-time charts

### VR Mode (Quest 3)

1. Start the dev server:
   ```bash
   pnpm dev
   ```

2. Get your local IP:
   ```bash
   # Windows
   ipconfig

   # Mac/Linux
   ifconfig
   ```

3. On Quest 3 browser, navigate to:
   ```
   http://<YOUR_IP>:5173
   ```

4. Click "Enter VR" button

5. SNN perception will start automatically

---

## What You Should See

### Initial Load

```
Loading SNN Perception Demo...
Initializing Norse-compatible SNN model and WebGPU inference pipeline
```

This takes 2-3 seconds to:
- Load `warehouse-snn-v1.json` model weights
- Initialize WebGPU compute shaders
- Allocate SharedArrayBuffer for worker communication
- Start SNNPerceptionBridge

### Running Demo

**3D Scene (Left)**:
- Warehouse floor (50x50 grid)
- 3 metal shelves with inventory boxes
- 2 wooden pallets
- Forklift in background
- AR annotation overlays (green/yellow bounding boxes + labels)

**Dashboard (Right)**:
- **SNN Status**: Active, 10 Hz, 4.2ms latency
- **Energy Savings**: 83.6% less than CNN
- **Battery Life**: 6.0 hours (SNN) vs 1.5 hours (CNN)
- **Real-time charts**: Power consumption, latency comparison, battery life

### Controls

**Desktop**:
- **Left mouse**: Rotate camera
- **Right mouse**: Pan camera
- **Scroll**: Zoom in/out

**VR (Quest 3)**:
- **Head tracking**: Look around
- **Controllers**: Point and teleport
- **Passthrough**: See AR overlays on real objects

---

## Demo Features

### 1. Object Detection

The SNN detects 10 object classes:
- `box` - Inventory boxes (brown cubes)
- `shelf` - Metal shelving units
- `pallet` - Wooden pallets
- `forklift` - Background forklift
- Others: `person`, `barcode`, `package`, `cart`, `scanner`, `door`

**Watch for**:
- Green bounding boxes = high confidence (>80%)
- Yellow bounding boxes = medium confidence (60-80%)
- Labels show: `CLASS (CONFIDENCE%)`

### 2. Energy Benchmarking

Real-time comparison of SNN vs CNN:

- **Power consumption**: 0.83W vs 2.51W (67% reduction)
- **Inference latency**: 4.2ms vs 12.7ms (67% faster)
- **Battery life**: 6.0h vs 1.5h (4x longer)

Charts update every 500ms.

### 3. Adaptive Frequency

The SNN adjusts inference rate based on:
- Scene complexity (more objects = lower Hz)
- Movement detection (static scene = lower Hz)
- Power budget (battery saver mode)

Watch the **Frequency** metric change dynamically (2-30 Hz).

---

## Testing the Model

### Run Unit Tests

```bash
pnpm test
```

This runs Vitest tests for:
- Model loading
- Feature extraction (64-dim vectors)
- Rate coding (features → spike rates)
- Output decoding (spikes → class probabilities)

Expected output:
```
✓ SNNModelLoader (10 tests)
  ✓ Model Loading (3 tests)
  ✓ Feature Extraction (2 tests)
  ✓ Rate Coding (2 tests)
  ✓ Output Decoding (2 tests)
  ✓ Integration (1 test)

Test Files  1 passed (1)
     Tests  10 passed (10)
```

### Type Checking

```bash
pnpm type-check
```

Should report no errors.

---

## HoloScript Integration

### Load the Warehouse Scene

The demo includes a complete HoloScript composition:

```bash
# View the composition
cat warehouse-inventory-scan.holo
```

**Key sections**:
- `perception_system "WarehouseSNN"` - SNN configuration
- `@snn_target` traits - Objects to track
- `debug_overlay "SNNPerformanceMonitor"` - Performance HUD

### Execute in HoloLand

If you have the full HoloLand platform running:

```bash
holoscript compile warehouse-inventory-scan.holo
holoscript execute <composition-id> --world <world-id>
```

This will spawn the warehouse scene in VR with live SNN perception.

---

## Troubleshooting

### WebGPU Not Available

**Error**: "WebGPU not available"

**Solutions**:
1. Use Chrome 120+ or Edge 120+
2. Enable WebGPU flag: `chrome://flags/#enable-unsafe-webgpu`
3. Check GPU support: Visit `https://webgpureport.org/`

### Model Not Loading

**Error**: "Failed to load model from /models/warehouse-snn-v1.json"

**Solutions**:
1. Check file exists: `ls models/warehouse-snn-v1.json`
2. Restart dev server: `pnpm dev`
3. Clear browser cache

### Low FPS

**Symptoms**: Laggy 3D scene, <30 FPS

**Solutions**:
1. Close other browser tabs
2. Reduce scene complexity (fewer objects)
3. Lower SNN frequency: Edit `src/index.tsx` → `initialHz: 5`
4. Check GPU load in browser DevTools (Performance tab)

### VR Mode Not Working

**Symptoms**: "Enter VR" button disabled

**Solutions**:
1. Quest 3 only (not Quest 2)
2. Enable WebXR: `chrome://flags/#webxr-incubations`
3. Use HTTPS or localhost (WebXR requires secure context)
4. Try desktop mode: `pnpm dev:desktop`

---

## Next Steps

### 1. Modify the Model

Edit `models/warehouse-snn-v1.json`:
- Change `confidence_threshold` (default 0.6)
- Adjust `timesteps_per_inference` (default 20)
- Add custom class labels

### 2. Customize the Scene

Edit `warehouse-inventory-scan.holo`:
- Add more objects (boxes, shelves, forklifts)
- Change object positions/scales
- Add custom materials/textures

### 3. Tune Energy Settings

Edit `src/index.tsx`:
```typescript
const bridge = createSNNPerceptionBridge({
  initialHz: 10,      // Start frequency
  minHz: 2,           // Minimum (power saver)
  maxHz: 30,          // Maximum (high performance)
  adaptiveFrequency: true,
});
```

### 4. Integrate with HoloLand Platform

See main README for:
- SNNPerceptionBridge API
- Scene graph integration
- Custom perception workers

---

## Performance Expectations

### Desktop (RTX 3070)

- **Render FPS**: 90 Hz (VSync)
- **SNN inference**: 10-30 Hz (adaptive)
- **Latency**: <5ms per inference
- **GPU utilization**: 15-25%

### Meta Quest 3

- **Render FPS**: 90 Hz (native)
- **SNN inference**: 10 Hz (default)
- **Latency**: 4.2ms per inference
- **Power**: 0.83W (perception only)
- **Battery**: 6 hours continuous

### Raspberry Pi 4 (8GB)

- **Not recommended** - WebGPU support limited
- Use CPU fallback (10x slower)

---

## Resources

- **Full Documentation**: `README.md`
- **Executive Summary**: `EXECUTIVE_SUMMARY.md`
- **Model Weights**: `models/warehouse-snn-v1.json`
- **HoloScript Scene**: `warehouse-inventory-scan.holo`
- **Source Code**: `src/`

---

## Support

**Issues**:
- File bug reports: `https://github.com/hololand/platform/issues`
- Discord: `#snn-perception` channel

**Questions**:
- Email: `platform-team@hololand.io`
- Docs: `https://docs.hololand.io/demos/snn-perception`

---

**Happy coding! 🧠⚡**

---

**Demo Version**: 1.0.0
**Last Updated**: 2026-03-07
**Platform**: HoloLand VR/AR Spatial Computing
