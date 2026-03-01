# 🌐 Hololand Central - The VR Metaverse Hub

**The public gateway to the Hololand metaverse**  
**Phase 0 Status**: ✅ Rotating Themes | ✅ Easter Eggs | ✅ Holoscript UI | ✅ 7 Zones Designed

Experience the future of VR right in your browser. Hololand Central is a fully-functional VR hub showcasing what's possible with the Hololand platform - from VR shops to social spaces to interactive physics playgrounds.

![Hololand Central Banner](https://via.placeholder.com/1200x400/667eea/ffffff?text=Hololand+Central)

## 🎯 What is Hololand Central?

Hololand Central is a **browser-based VR experience** that serves as:
- ✅ A public demo of Hololand capabilities
- ✅ A showcase for businesses interested in VR
- ✅ A template for developers building VR worlds
- ✅ A social hub for the Hololand community

### Features

🌐 **Main Plaza** - Central hub with 5 rotating themes, easter eggs, and zone navigation menu
☕ **Demo Coffee Shop** - Fully-realized VR business example
👥 **Social Lounge** - Elegant meeting space with seating areas
🎮 **Physics Playground** - Interactive demo with real-time physics
🎨 **Art Gallery** (Coming Soon) - Community art and NFT displays
🎰 **7 Downtown Zones** - Welcome Plaza, Builder Shop, Casino, Arcade, B2B Hub, $BRIAN's GYM, Central Park

## 🆕 Phase 0 Systems (Just Integrated)

### 1. **Rotating Themes** (5 Skins)
Click the floating cube in the plaza to cycle through:
- 🌐 Cyberpunk Station (neon purple/pink)
- 🤠 Wild West Frontier (sandy sunset)
- 🏙️ Urban Cityscape (blue neon skyscrapers)
- ❄️ Snowy Village (festive winter)
- 🌴 Tropical Paradise (vibrant island)

### 2. **Easter Eggs System** (16 Seeded)
Hidden discoveries across zones:
- Proximity triggers (walk near objects)
- Sequence puzzles (ordered interactions)
- Time-of-day variants (nighttime secrets)
- Cosmetic rewards (badges, stickers, emotes, titles)

**Plaza Eggs**:
- Hidden concierge NPC behind fountain [1, 0, 3]
- Encoded city origin plaque (sequence trigger)
- Secret sky walkway (tap cube 3x)

### 3. **Holoscript UI System**
Type-safe, theme-aware menus and copy:
- Zone navigation menu (top-left in plaza)
- Theme-reactive text (e.g., "Neon Edition" vs "Winter Festival")
- Composable actions (navigate, start, purchase, submit)
- WCAG-accessible overlays

## 🚀 Quick Start

### Prerequisites

```bash
# Node.js 18+ and pnpm required
node --version  # Should be v18 or higher
pnpm --version  # Should be installed globally
```

### Installation

From the Hololand repository root:

```bash
# Install all dependencies (if not already done)
pnpm install

# Navigate to hololand-central
cd examples/hololand-central

# Start development server
pnpm dev
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Try the New Features

1. **Cycle Themes**: Click purple floating cube at [-6, 2, 6]
2. **Discover Easter Egg**: Walk to [1, 0, 3] behind fountain (check console)
3. **Navigate Zones**: Click menu buttons top-left (logs intents to console)
4. **Watch Theme-Aware Copy**: Menu text changes with each theme

### First-Time Setup

If this is your first time running Hololand Central:

```bash
# From repository root, build all packages first
pnpm build

# Then start hololand-central
cd examples/hololand-central
pnpm dev
```

## 🎮 How to Use

### Desktop Controls (Mouse + Keyboard)

- **🖱️ Left Click + Drag**: Rotate view
- **🖱️ Right Click + Drag**: Pan camera
- **🖱️ Scroll Wheel**: Zoom in/out
- **🎯 Click Portals**: Travel between worlds
- **🎯 Click Buttons**: Interact with objects (Physics Playground)

### VR Mode (Meta Quest, Valve Index, etc.)

1. **Connect VR Headset**: Ensure your VR headset is connected and WebXR is enabled
2. **Click "Enter VR" Button**: Top right of the screen
3. **Use Controllers**: Point and click to interact
4. **Navigate**: Teleport using controller triggers
5. **Exit VR**: Use headset menu or press VR button again

### Supported VR Headsets

- ✅ Meta Quest 2/3/Pro (via browser)
- ✅ Valve Index
- ✅ HTC Vive / Vive Pro
- ✅ Windows Mixed Reality
- ✅ Any WebXR-compatible headset

## 🏗️ Architecture

### Project Structure

```
hololand-central/
├── src/
│   ├── worlds/              # VR world components
│   │   ├── MainPlaza.tsx    # Central hub with portals
│   │   ├── DemoShop.tsx     # Coffee shop example
│   │   ├── SocialLounge.tsx # Meeting space
│   │   └── PhysicsPlayground.tsx # Interactive physics
│   ├── components/
│   │   └── Portal.tsx       # Teleportation portal component
│   ├── App.tsx              # Main application
│   ├── main.tsx             # Entry point
│   └── styles.css           # Global styles
├── index.html               # HTML template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Tech Stack

- **React 18** - UI framework
- **Three.js** - 3D rendering engine
- **React Three Fiber** - React renderer for Three.js
- **@react-three/drei** - Helper components for R3F
- **@react-three/xr** - WebXR/VR support
- **Vite** - Build tool
- **TypeScript** - Type safety
- **@hololand/*** - Hololand platform packages

## 🎨 Customization

### Adding a New World

1. **Create world component** in `src/worlds/`:

```typescript
// src/worlds/MyWorld.tsx
import React from 'react';

export const MyWorld: React.FC = () => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} />

      {/* Your world content */}
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color={0xff0000} />
      </mesh>
    </>
  );
};
```

2. **Register in App.tsx**:

```typescript
// Add to WORLD_INFO
myworld: {
  title: 'My World',
  description: 'My custom VR world',
  icon: '🌟',
}

// Add to renderWorld()
case 'myworld':
  return <MyWorld />;
```

3. **Add portal** in `MainPlaza.tsx`:

```typescript
<Portal
  position={[x, y, z]}
  color={0xff0000}
  label="My World"
  onClick={() => onPortalClick('myworld')}
/>
```

### Customizing Existing Worlds

All worlds are React components in `src/worlds/`. Edit them directly:

```typescript
// Modify colors, positions, sizes, etc.
<mesh position={[0, 1, 0]}>
  <boxGeometry args={[1, 1, 1]} />
  <meshStandardMaterial color={0x00ff00} /> {/* Change color */}
</mesh>
```

### Styling the UI

Edit `src/styles.css` to customize the 2D UI overlay:

```css
/* Change primary color */
:root {
  --primary-color: #667eea; /* Your color here */
}

/* Customize portal cards */
.portal-card {
  background: your-color;
  /* Your styles */
}
```

## 📦 Building for Production

### Local Build

```bash
# From hololand-central directory
pnpm build
```

Output will be in `dist/` directory.

### Preview Production Build

```bash
pnpm preview
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Deploy**:
```bash
cd examples/hololand-central
pnpm build
vercel --prod
```

3. **Configure** (first time):
- Project name: `hololand-central`
- Root directory: `./`
- Build command: `pnpm build`
- Output directory: `dist`

Your site will be live at `https://hololand-central.vercel.app` (or your custom domain)

### Deploy to Netlify

1. **Build**:
```bash
pnpm build
```

2. **Deploy via Netlify CLI**:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

Or drag `dist/` folder to [Netlify Drop](https://app.netlify.com/drop)

### Deploy to GitHub Pages

1. **Install gh-pages**:
```bash
pnpm add -D gh-pages
```

2. **Add deploy script** to `package.json`:
```json
"scripts": {
  "deploy": "pnpm build && gh-pages -d dist"
}
```

3. **Deploy**:
```bash
pnpm deploy
```

### Custom Domain

For any hosting platform:
1. Build the project
2. Upload `dist/` contents
3. Point your domain's DNS to the hosting provider
4. Enable HTTPS (required for WebXR/VR)

**Important**: HTTPS is **required** for VR features to work!

## 🧪 Development

### Hot Reload

```bash
pnpm dev
```

Changes auto-refresh in browser.

### Type Checking

```bash
pnpm build  # Runs TypeScript compiler
```

### Debugging

1. **Browser DevTools**: Open console (F12)
2. **React DevTools**: Install browser extension
3. **Three.js Inspector**: Use `<Stats />` component from `@react-three/drei`

### Common Issues

**❌ "Cannot find module '@hololand/...'"**

Solution: Build Hololand packages first
```bash
cd ../..  # Go to repo root
pnpm build
cd examples/hololand-central
pnpm dev
```

**❌ "VR button not appearing"**

Solution: Ensure HTTPS and WebXR support:
- Use `https://localhost:3000` (Vite auto-configures)
- Update browser to latest version
- Check VR headset connection

**❌ "Performance issues"**

Solution: Reduce complexity or enable optimizations:
- Lower number of lights
- Reduce particle count
- Enable `shadowMap.autoUpdate = false` for static scenes
- Use `PerformanceMonitor` from `@react-three/drei`

## 🎓 Learning Resources

### Hololand Docs
- [Main README](../../README.md) - Platform overview
- [Architecture](../../docs/ARCHITECTURE_DECISIONS.md) - System design
- [HoloScript Guide](../../docs/HOLOSCRIPT.md) - Language spec

### Three.js & React Three Fiber
- [Three.js Docs](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Drei Components](https://github.com/pmndrs/drei)

### WebXR & VR
- [WebXR API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
- [React XR](https://github.com/pmndrs/react-xr)

## 📊 Performance

### Benchmarks (Desktop)

- **FPS**: 60 (locked)
- **Load Time**: < 2 seconds
- **Memory**: ~150 MB
- **Bundle Size**: ~500 KB (gzipped)

### Optimization Tips

1. **Use instanced meshes** for repeated objects
2. **Enable frustum culling** for large worlds
3. **Optimize textures** (compress, resize)
4. **Lazy load worlds** (import dynamically)
5. **Enable shadows** only where needed

## 🤝 Contributing

Want to improve Hololand Central? Contributions welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-world`)
3. Make your changes
4. Test thoroughly (desktop + VR)
5. Submit a pull request

### Ideas for Contributions

- 🎨 New worlds (gaming, education, art, etc.)
- 🎮 Interactive elements and mini-games
- 👥 Multiplayer/networking features
- 📱 Mobile optimizations
- 🌐 Internationalization
- 📚 More examples and tutorials

## 📝 License

MIT License - see [LICENSE](../../LICENSE) for details

## 🌟 Showcase

Using Hololand Central for your project? Let us know!

- Add your site to our showcase
- Tag us on Twitter: @HololandDev
- Join discussions on GitHub

## 🔗 Links

- **Live Demo**: [central.hololand.io](https://central.hololand.io) (coming soon)
- **Main Repo**: [github.com/brianonbased-dev/Hololand](https://github.com/brianonbased-dev/Hololand)
- **Documentation**: [Hololand Docs](../../README.md)
- **Discord**: [Join Community](https://discord.gg/hololand) (coming soon)

---

**Built with ❤️ by the Hololand Community**

*Powered by @hololand/core | Enhanced with React Three Fiber | Open to Everyone*

🌐 **Where Everyone Can Build in VR - And Beyond** ✨
