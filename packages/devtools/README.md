# @hololand/devtools

Developer tools for Hololand - performance profiler, visual debugger, network inspector, and in-VR console.

## Features

- **Performance Profiler**: FPS, frame times, memory usage, draw calls
- **Visual Debugger**: Object inspection, hierarchy viewer, transform gizmos
- **Network Inspector**: Real-time packet visualization, latency monitoring
- **In-VR Console**: Debug console accessible in VR
- **State Inspector**: View and modify world state in real-time

## Installation

```bash
pnpm add @hololand/devtools
```

## Usage

```typescript
import { DevTools, Profiler, DebugConsole } from '@hololand/devtools';

// Initialize devtools
const devtools = new DevTools({
  enabled: process.env.NODE_ENV === 'development',
  showFPS: true,
  showMemory: true,
});

// Attach to world
devtools.attach(world);

// Start profiling
Profiler.start('render-loop');
// ... rendering code ...
Profiler.end('render-loop');

// Log to VR console
DebugConsole.log('Player spawned at', player.position);
DebugConsole.warn('High latency detected');
DebugConsole.error('Failed to load asset');
```

## Profiler

```typescript
import { Profiler } from '@hololand/devtools';

// Profile a function
const result = Profiler.measure('physics-update', () => {
  world.stepPhysics(deltaTime);
});

// Get performance report
const report = Profiler.getReport();
console.log(report.averageFPS);
console.log(report.frameTimeP95);
```

## Network Inspector

```typescript
import { NetworkInspector } from '@hololand/devtools';

const inspector = new NetworkInspector(network);

// Monitor all packets
inspector.onPacket((packet) => {
  console.log(`${packet.type}: ${packet.size} bytes`);
});

// Get network stats
const stats = inspector.getStats();
console.log(`Latency: ${stats.latency}ms`);
console.log(`Bandwidth: ${stats.bandwidth} KB/s`);
```

## API Reference

### DevTools

Main devtools container.

- `attach(world)` - Attach to world instance
- `show()` / `hide()` - Toggle visibility
- `setOption(key, value)` - Configure options

### Profiler

Performance profiling.

- `start(label)` - Start timing
- `end(label)` - End timing
- `measure(label, fn)` - Profile function
- `getReport()` - Get performance report

### DebugConsole

In-VR debugging console.

- `log(...)` - Log message
- `warn(...)` - Warning message
- `error(...)` - Error message
- `clear()` - Clear console

## License

MIT © Hololand Team
