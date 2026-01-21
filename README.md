# Hololand

**Build VR/AR experiences in minutes, not months.**

<p align="center">
  <img src="docs/assets/gifs/hololand-hero.gif" alt="Hololand in action - building a VR world with voice commands" width="700">
  <br>
  <em>"Create a floating island with waterfalls" → Built in seconds</em>
</p>

---

> 💬 **Talk or type to your AI assistant.** Powered by [Infinity Assistant](https://infinityassistant.io).
>
> - 🥽 **VR:** "Create a treehouse with a rope ladder and fairy lights"
> - 🌍 **VRR:** "Scan my storefront and turn it into a virtual shop" *(coming soon)*
> - 📱 **AR:** "Show me how this couch looks in my room"

```tsx
import { HololandCanvas, HololandObject } from '@hololand/react-three';

function App() {
  return (
    <HololandCanvas worldConfig={{ enablePhysics: true }}>
      <HololandObject type="sphere" position={{ x: 0, y: 2, z: 0 }} 
        physics={{ enabled: true, mass: 1 }} />
    </HololandCanvas>
  );
}
```

That's it. VR-ready, physics-enabled, runs everywhere.

## Why Hololand?

- **One codebase** → Web, VR headsets, AR, mobile, desktop
- **React components** → Build VR like you build web apps
- **Voice & AI** → "Create a coffee shop" and watch it appear
- **Physics included** → Gravity, collisions, interactions
- **Open source** → MIT licensed, build anything

## Install

```bash
npm install @hololand/react-three @hololand/world @hololand/renderer three
```

## Quick Start

### React (Recommended)

```tsx
import { HololandCanvas, HololandObject } from '@hololand/react-three';

function MyWorld() {
  return (
    <HololandCanvas rendererConfig={{ enableVR: true }}>
      {/* Ground */}
      <HololandObject type="plane" 
        rotation={{ x: -Math.PI / 2 }} 
        metadata={{ width: 50, height: 50 }} />
      
      {/* Bouncing ball */}
      <HololandObject type="sphere"
        position={{ x: 0, y: 5, z: 0 }}
        metadata={{ radius: 1, color: 0xff0000 }}
        physics={{ enabled: true, restitution: 0.8 }} />
    </HololandCanvas>
  );
}
```

### Natural Language

```typescript
import { HololandAIBridge } from '@hololand/ai-bridge';

const bridge = new HololandAIBridge();
const result = await bridge.translateToHoloScript({
  naturalLanguage: "create a cozy reading nook with bookshelves"
});
// Result: Working HoloScript code
```

## Packages

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@hololand/react-three` | 1.0.0 | React components for VR | ✅ |
| `@hololand/world` | 1.0.0 | Physics & world runtime | ✅ |
| `@hololand/renderer` | 1.0.0 | Three.js + WebXR | ✅ |
| `@hololand/ai-bridge` | 1.0.0 | Natural language → code | ✅ |
| `@hololand/network` | 1.0.0 | Multiplayer | ✅ |
| `@hololand/social` | 1.0.0 | Friends, avatars, chat | ✅ |
| `@hololand/commerce` | 1.0.0 | Shops & marketplace | ✅ |

See [full package list](./ECOSYSTEM_STATUS.md) for all 22 packages.

## Runs On

- **VR**: Quest, Valve Index, Vive, Apple Vision Pro
- **Web**: Chrome, Firefox, Safari
- **AR**: iOS, Android (WebXR)
- **Desktop**: Windows, Mac, Linux

## HoloScript

Hololand uses [HoloScript](https://github.com/brianonbased-dev/HoloScript) - a declarative language that reduces codebase size by up to 90%.

### File Types

> ⚠️ **Note:** `.holo` is the legacy format for learning. All new projects should use **`.hsplus`**.

| Extension | What It's For | Status |
|-----------|---------------|--------|
| `.hsplus` | Production apps with all features | ✅ **Recommended** |
| `.holo` | Learning & simple apps | ⚠️ Legacy (still supported) |

### `.hsplus` - Full Power (Recommended)
```hsplus
// Production-ready with all 10 system APIs
import { NetworkedWorldState } from "./systems/NetworkedWorldState.hsplus"

networked_object player {
  sync_rate: 20hz
  interpolation: true
  position: synced
}
```

### `.holo` - Simple & Clean (Legacy)
```holo
// Great for learning and simple applications
cube my_cube {
  position: [0, 1, 0]
  color: "#ff0000"
  on_click: toggle_color
}
```

**Use `.hsplus`** for all new projects.  
**Use `.holo`** only for learning tutorials.

See [HoloScript File Types Guide](./docs/HOLOSCRIPT_FILE_TYPES.md) for complete documentation.

## AI Agents

AI can see and build inside Hololand *(perception coming soon)*:

```typescript
import { HololandAgentBridge } from '@hololand/ai-bridge';

const agent = new HololandAgentBridge({
  name: 'BuilderBot',
  provider: 'openai',
  capabilities: { perception: true, creation: true }
});

await agent.enterWorld('my-world');
// Agent can now see and create in VR
```

Access **Brittney** (AI building assistant) at [infinityassistant.io](https://infinityassistant.io).

## Examples

```bash
# Clone and run an example
git clone https://github.com/brianonbased-dev/Hololand.git
cd Hololand/examples/01-hello-vr-world
open index.html  # No build required
```

- `01-hello-vr-world` - Basic VR scene
- `02-physics-playground` - Interactive physics
- `03-vr-shop` - Virtual store
- `09-multiplayer-lobby` - Real-time collaboration

## Development

```bash
git clone https://github.com/brianonbased-dev/Hololand.git
cd Hololand
pnpm install
pnpm build
pnpm test
```

## Contributing

MIT license. PRs welcome.

1. Fork → Branch → Commit → PR
2. Follow TypeScript best practices
3. Add tests for new features

## License

MIT - Use it anywhere, for anything.

## Links

- [HoloScript](https://github.com/brianonbased-dev/HoloScript) - The language
- [Infinity Assistant](https://infinityassistant.io) - AI building service
- [Examples](./examples/) - Working demos
- [Full Docs](./ECOSYSTEM_STATUS.md) - Complete ecosystem

---

**Built with ❤️ by the Hololand community**

*Where everyone can build in VR.*
