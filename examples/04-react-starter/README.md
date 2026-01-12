# React Starter - Hololand Example

A complete React + TypeScript starter template for building VR applications with Hololand.

## 🎯 What's Included

- ⚛️ **React 18** with TypeScript
- 🥽 **Hololand React Components** - Declarative VR with JSX
- ⚡ **Vite** - Lightning-fast development
- 🎮 **Physics Simulation** - Real-time gravity and collisions
- 🎨 **Interactive Controls** - Spawn objects, control physics
- 🔧 **Hot Module Replacement** - Instant updates during development
- 📦 **Production Ready** - Optimized build configuration

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### 2. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

### 3. Build for Production

```bash
npm run build
npm run preview  # Preview production build
```

## 📁 Project Structure

```
react-starter/
├── src/
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Application entry point
│   └── index.css         # Global styles
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## 💡 Key Features

### Declarative VR Components

```tsx
<HololandCanvas
  worldConfig={{ enablePhysics: true }}
  rendererConfig={{ enableVR: true, enableShadows: true }}
>
  <HololandObject
    type="sphere"
    position={{ x: 0, y: 5, z: 0 }}
    metadata={{ radius: 1, color: 0xff0000 }}
    physics={{ enabled: true, mass: 1 }}
  />
</HololandCanvas>
```

### React Hooks

```tsx
import {
  useHololandObject,
  useWorldEvent,
  usePhysics,
} from '@hololand/react-three';

function MyComponent() {
  const addObject = useHololandObject();
  const { isRunning, start, stop } = usePhysics();

  useWorldEvent('object:added', (data) => {
    console.log('Object added:', data.object.id);
  });

  const spawnBall = () => {
    addObject({
      type: 'sphere',
      position: { x: 0, y: 10, z: 0 },
      physics: { enabled: true, mass: 1 },
    });
  };

  return (
    <button onClick={spawnBall}>Spawn Ball</button>
  );
}
```

### Event-Driven Architecture

- `object:added` - When objects are added
- `object:removed` - When objects are removed
- `tick` - Every physics frame
- Physics control with `usePhysics()` hook

## 🎨 Customization

### Change Colors

```tsx
<HololandObject
  type="sphere"
  metadata={{
    radius: 1,
    color: 0x00ff00,  // Green
    metalness: 0.8,   // Very metallic
    roughness: 0.2,   // Smooth
  }}
/>
```

### Adjust Physics

```tsx
<HololandCanvas
  worldConfig={{
    enablePhysics: true,
    gravity: { x: 0, y: -20, z: 0 },  // Stronger gravity!
    tickRate: 120,  // Higher precision (default: 60)
  }}
>
```

### Camera Position

```tsx
<HololandCanvas
  rendererConfig={{
    cameraPosition: { x: 20, y: 20, z: 20 },  // Further away
    cameraFov: 60,  // Narrower field of view
  }}
>
```

## 🔧 Development Tips

### Hot Reload

Vite provides instant hot module replacement. Edit components and see changes immediately!

### TypeScript

Full TypeScript support with comprehensive types:

```typescript
import type {
  HololandCanvasProps,
  HololandObjectProps,
  Vector3,
  SpatialObject,
} from '@hololand/react-three';
```

### Debugging

```tsx
<HololandCanvas
  onWorldReady={(world) => {
    console.log('World ready:', world);
    window.world = world;  // Access in browser console
  }}
  onRendererReady={(renderer) => {
    console.log('Renderer ready:', renderer);
    window.renderer = renderer;  // Access in browser console
  }}
>
```

## 🥽 VR Mode

1. Connect your VR headset (Quest, Valve Index, Vive, etc.)
2. Ensure HTTPS or localhost
3. Click the "ENTER VR" button
4. Spawn objects and watch physics in VR!

## 📦 Dependencies

### Core

- `@hololand/react-three` - React components and hooks
- `@hololand/renderer` - Three.js renderer with WebXR
- `@hololand/world` - VR world runtime with physics
- `three` - 3D graphics library
- `react` + `react-dom` - React framework

### Development

- `vite` - Build tool and dev server
- `typescript` - Type safety
- `@vitejs/plugin-react` - React support for Vite

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy
```

### Deploy to GitHub Pages

```bash
npm run build
# Upload dist/ folder to GitHub Pages
```

## 🎓 Next Steps

### Add More Complexity

- Add user input handling
- Create custom components
- Implement game logic
- Add multiplayer (coming soon with @hololand/network)

### Explore Other Packages

```tsx
import { Shop, MarketplaceManager } from '@hololand/commerce';
import { Avatar, PresenceManager } from '@hololand/social';
import { HololandAIBridge } from '@hololand/ai-bridge';
```

### Build Something Amazing

- VR Shop
- Physics Game
- Social Space
- Art Gallery
- Training Simulation

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Use different port
npm run dev -- --port 3001
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Check types
npm run lint
```

### VR Not Working

- Use HTTPS or localhost
- Try Chrome or Edge (best WebXR support)
- Check headset connection

## 📚 Resources

- [Hololand Documentation](../../README.md)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Three.js Documentation](https://threejs.org/)
- [WebXR Device API](https://immersiveweb.dev/)

## 📄 License

MIT - Use this template for your own projects!

---

**Happy Building!** 🥽✨
