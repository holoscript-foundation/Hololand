# Hololand Project Templates

Quick-start templates for different use cases. Copy and customize for your project!

## 🚀 Quick Start Templates

### 1. Vanilla JavaScript VR App

**Best for:** Simple projects, prototypes, learning

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My VR App</title>
  <style>
    body { margin: 0; overflow: hidden; }
    canvas { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script type="module">
    import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';
    import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/controls/OrbitControls.js';
    import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/webxr/VRButton.js';

    // Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(VRButton.createButton(renderer));

    const controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(5, 5, 5);

    // Your VR world here!
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Render loop
    renderer.setAnimationLoop(() => {
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
    });
  </script>
</body>
</html>
```

**Usage:**
1. Save as `index.html`
2. Open in browser (or use `python -m http.server`)
3. Start building!

---

### 2. React + TypeScript VR App

**Best for:** Production apps, teams, scalable projects

#### package.json

```json
{
  "name": "my-vr-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@hololand/react-three": "^1.0.0-alpha.1",
    "@hololand/renderer": "^1.0.0-alpha.1",
    "@hololand/world": "^1.0.0-alpha.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "three": "^0.159.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/three": "^0.159.0",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.8"
  }
}
```

#### src/App.tsx

```tsx
import { HololandCanvas, HololandObject } from '@hololand/react-three';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <HololandCanvas
        worldConfig={{ enablePhysics: true }}
        rendererConfig={{ enableVR: true, enableShadows: true }}
      >
        {/* Ground */}
        <HololandObject
          type="plane"
          position={{ x: 0, y: 0, z: 0 }}
          rotation={{ x: -Math.PI / 2, y: 0, z: 0, w: 1 }}
          metadata={{ width: 20, height: 20, color: 0x808080 }}
        />

        {/* Your VR content here */}
        <HololandObject
          type="sphere"
          position={{ x: 0, y: 5, z: 0 }}
          metadata={{ radius: 1, color: 0xff0000 }}
          physics={{ enabled: true, mass: 1 }}
        />
      </HololandCanvas>
    </div>
  );
}

export default App;
```

**Usage:**
1. Create files with content above
2. Run `npm install`
3. Run `npm run dev`
4. Visit http://localhost:3000

---

### 3. VR Shop Template

**Best for:** E-commerce, virtual stores, marketplaces

```typescript
import { HololandWorld } from '@hololand/world';
import { HololandRenderer } from '@hololand/renderer';
import { Shop, MarketplaceManager } from '@hololand/commerce';

// Setup world
const world = new HololandWorld({ enablePhysics: true });
const renderer = new HololandRenderer(canvas, world, { enableVR: true });

// Create shop
const shop = new Shop({
  id: 'my-shop',
  name: 'My VR Store',
  ownerId: 'user-123',
  position: { x: 0, y: 0, z: 0 },
});

// Add products
shop.addItem({
  id: 'product-1',
  name: 'Cool VR Headset',
  price: 299.99,
  quantity: 10,
  metadata: { description: 'Best VR headset ever!' },
});

// Create shop building
world.addObject({
  type: 'box',
  position: { x: 0, y: 2, z: 0 },
  metadata: { width: 10, height: 4, depth: 8, color: 0x8b4513 },
});

// Counter
world.addObject({
  type: 'box',
  position: { x: 0, y: 1, z: 3 },
  metadata: { width: 6, height: 1, depth: 2, color: 0x654321 },
});

// Handle purchases
function buyItem(itemId: string, quantity: number) {
  const transaction = shop.purchase('buyer-id', itemId, quantity);
  if (transaction) {
    console.log('Purchase successful!', transaction);
  } else {
    console.log('Purchase failed - out of stock or invalid item');
  }
}

world.start();
renderer.start();
```

---

### 4. Physics Playground Template

**Best for:** Games, interactive experiences, physics demos

```typescript
import { HololandWorld } from '@hololand/world';
import { HololandRenderer } from '@hololand/renderer';

const world = new HololandWorld({
  enablePhysics: true,
  gravity: { x: 0, y: -9.81, z: 0 },
  tickRate: 60,
});

const renderer = new HololandRenderer(canvas, world, {
  enableVR: true,
  enableShadows: true,
});

// Ground
world.addObject({
  type: 'plane',
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: -Math.PI / 2, y: 0, z: 0, w: 1 },
  metadata: { width: 50, height: 50, color: 0x2c3e50 },
});

// Spawn function
function spawnBall() {
  world.addObject({
    type: 'sphere',
    position: {
      x: (Math.random() - 0.5) * 10,
      y: 10 + Math.random() * 5,
      z: (Math.random() - 0.5) * 10,
    },
    metadata: {
      radius: 0.5 + Math.random() * 0.5,
      color: Math.random() * 0xffffff,
    },
    physics: {
      enabled: true,
      mass: 1,
      restitution: 0.7, // Bounciness
      friction: 0.5,
    },
  });
}

// Spawn on click
document.addEventListener('click', spawnBall);

world.start();
renderer.start();
```

---

### 5. Social VR Space Template

**Best for:** Meeting rooms, collaborative spaces, social experiences

```typescript
import { HololandWorld } from '@hololand/world';
import { HololandRenderer } from '@hololand/renderer';
import { Avatar, PresenceManager } from '@hololand/social';

const world = new HololandWorld({ enablePhysics: false });
const renderer = new HololandRenderer(canvas, world, { enableVR: true });
const presenceManager = new PresenceManager();

// Create room structure
world.addObject({
  type: 'box',
  position: { x: 0, y: 3, z: 0 },
  metadata: { width: 15, height: 6, depth: 15, color: 0xf5f5f5 },
});

// Add avatar
const myAvatar = new Avatar({
  id: 'avatar-1',
  userId: 'user-123',
  displayName: 'John Doe',
  position: { x: 0, y: 1.6, z: 0 },
});

presenceManager.addAvatar(myAvatar);

// Represent avatar in world
world.addObject({
  id: 'avatar-1-body',
  type: 'sphere',
  position: { x: 0, y: 1.6, z: 0 },
  metadata: { radius: 0.3, color: 0x4fc3f7 },
});

// Update avatar position
function updateAvatarPosition(x: number, y: number, z: number) {
  myAvatar.setPosition({ x, y, z });

  const avatarObj = world.getObject('avatar-1-body');
  if (avatarObj) {
    avatarObj.setPosition({ x, y, z });
  }
}

world.start();
renderer.start();
```

---

### 6. AI-Powered Building Template

**Best for:** No-code experiences, voice building, AI assistance

```typescript
import { HololandWorld } from '@hololand/world';
import { HololandRenderer } from '@hololand/renderer';
import { HololandAIBridge } from '@hololand/ai-bridge';

const world = new HololandWorld({ enablePhysics: true });
const renderer = new HololandRenderer(canvas, world, { enableVR: true });
const aiBridge = new HololandAIBridge({
  enableVoice: true,
  confidenceThreshold: 0.7,
});

// Build from natural language
async function buildFromText(description: string) {
  const result = await aiBridge.translateToHoloScript({
    naturalLanguage: description,
    context: { userLevel: 'beginner' },
  });

  if (result.success) {
    console.log('Generated HoloScript:', result.holoScript);
    console.log('Confidence:', result.confidence);

    // Execute the code (simplified example)
    // In reality, you'd parse and execute the HoloScript
  } else {
    console.error('Translation failed');
  }
}

// Build from voice
async function buildFromVoice() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(chunks);
    const audioBuffer = await audioBlob.arrayBuffer();

    const result = await aiBridge.processVoiceCommand(audioBuffer);
    if (!result.needsClarification) {
      await buildFromText(result.text);
    }
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 3000); // Record for 3 seconds
}

// Example usage
buildFromText('create a coffee shop with a counter');

world.start();
renderer.start();
```

---

## 📦 Package Installation Commands

### Minimal Setup

```bash
npm install @hololand/world @hololand/renderer three
```

### React Setup

```bash
npm install @hololand/react-three @hololand/world @hololand/renderer three react react-dom
npm install -D @types/react @types/react-dom @types/three typescript vite @vitejs/plugin-react
```

### Full Stack (All Features)

```bash
npm install @hololand/core @hololand/ai-bridge @hololand/world @hololand/renderer @hololand/react-three @hololand/commerce @hololand/social @hololand/builder three react react-dom
```

---

## 🎯 Use Case Templates

### Game Development

- Start with: **Physics Playground Template**
- Add: Character controllers, scoring, multiplayer
- Packages: `@hololand/world`, `@hololand/renderer`

### E-Commerce

- Start with: **VR Shop Template**
- Add: Payment processing, product catalog, analytics
- Packages: `@hololand/commerce`, `@hololand/world`, `@hololand/renderer`

### Social/Collaboration

- Start with: **Social VR Space Template**
- Add: Voice chat, screen sharing, whiteboarding
- Packages: `@hololand/social`, `@hololand/world`, `@hololand/renderer`

### Educational

- Start with: **Vanilla JavaScript Template**
- Add: Lessons, quizzes, progress tracking
- Packages: `@hololand/world`, `@hololand/renderer`

### Creative Tools

- Start with: **AI-Powered Building Template**
- Add: Asset library, saving/loading, collaboration
- Packages: `@hololand/ai-bridge`, `@hololand/world`, `@hololand/renderer`

---

## 🚀 Quick Commands

### Create New Project

```bash
# Clone starter
git clone https://github.com/brianonbased-dev/Hololand.git
cd Hololand/examples/04-react-starter
npm install
npm run dev
```

### Bootstrap From Scratch

```bash
# Create directory
mkdir my-vr-app && cd my-vr-app

# Initialize
npm init -y

# Install deps
npm install @hololand/react-three @hololand/world @hololand/renderer three react react-dom vite @vitejs/plugin-react

# Copy template files from examples/04-react-starter
# Start building!
```

---

## 📚 More Resources

- [Examples Directory](./examples/) - Working examples
- [Package Documentation](./packages/) - API references
- [Main README](./README.md) - Getting started guide

---

**Choose a template, customize it, and start building your VR experience!** 🥽✨
