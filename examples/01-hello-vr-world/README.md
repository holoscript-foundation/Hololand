# Hello VR World - Hololand Example

The simplest possible VR world using Hololand. Perfect for beginners!

## 🎯 What You'll Learn

- Setting up a basic 3D scene
- Adding lights and shadows
- Creating simple 3D objects
- Enabling VR mode with one line
- Camera controls for desktop

## 🚀 Quick Start

### Option 1: Open in Browser

Simply open `index.html` in your browser. That's it!

```bash
# No build step required!
open index.html
```

### Option 2: Local Server (Recommended)

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Then visit http://localhost:8000
```

## 🥽 VR Mode

1. Open in a WebXR-compatible browser (Chrome, Edge, Firefox)
2. Connect your VR headset (Quest, Valve Index, Vive, etc.)
3. Click the "ENTER VR" button
4. Enjoy your first VR world!

## 📝 Code Walkthrough

### 1. Setup Scene

```javascript
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
```

### 2. Enable VR

```javascript
renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));
```

That's it! VR is now enabled.

### 3. Add Objects

```javascript
const geometry = new THREE.BoxGeometry(1, 2, 0.2);
const material = new THREE.MeshStandardMaterial({ color: 0xff4444 });
const box = new THREE.Mesh(geometry, material);
scene.add(box);
```

### 4. Animation Loop

```javascript
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
```

## 🎨 What's Included

- **Ground plane** with shadow receiving
- **"HELLO VR" text** made from colored boxes
- **Floating sphere** with animation
- **Lights** (ambient + directional)
- **Shadows** enabled
- **OrbitControls** for mouse navigation
- **VR Button** for instant VR mode

## 🔧 Customization Ideas

Try modifying these values:

```javascript
// Change colors
const material = new THREE.MeshStandardMaterial({
  color: 0xff0000,  // Try different hex colors!
  metalness: 0.7,   // 0.0 = not metallic, 1.0 = very metallic
  roughness: 0.3,   // 0.0 = smooth, 1.0 = rough
});

// Change sphere animation
sphere.position.y = 3 + Math.sin(time * 2) * 1.0;  // Faster, higher

// Change background color
scene.background = new THREE.Color(0x87ceeb);  // Sky blue!
```

## 📚 Next Steps

Once you're comfortable with this example:

1. **Add more objects** - Experiment with different geometries
2. **Try physics** - See example `02-physics-playground`
3. **Build a shop** - See example `03-vr-shop`
4. **Use React** - See example `04-react-starter`

## 🆘 Troubleshooting

### VR Button Doesn't Appear

- Make sure you're using HTTPS or localhost
- Check that your browser supports WebXR
- Try Chrome or Edge (best WebXR support)

### Objects Don't Show Up

- Check browser console for errors
- Make sure camera is positioned correctly
- Verify objects are added to the scene

### Performance Issues

- Reduce shadow map size: `directionalLight.shadow.mapSize.width = 1024`
- Lower antialiasing: `antialias: false`
- Reduce object count

## 🔗 Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [WebXR Device API](https://immersiveweb.dev/)
- [Hololand Docs](../../README.md)

## 📄 License

MIT - Feel free to use this example as a starting point for your projects!
