# 🌐 Hololand Hybrid Dashboard Example

**Demonstrates: Universal Platform Capabilities (2D UI + 3D VR in one app)**

This example showcases Hololand's revolutionary hybrid approach - building applications that work seamlessly across desktop, mobile, and VR platforms with a unified codebase.

## 🎯 What This Example Shows

### Universal Platform Features
- ✅ **2D UI Controls** - Traditional sidebar with React components
- ✅ **3D VR Scene** - Immersive data visualization using Three.js
- ✅ **Real-time Sync** - Changes in 2D UI instantly update 3D scene
- ✅ **Multi-Platform** - Works on desktop, mobile, and VR headsets
- ✅ **Mode Switching** - Toggle between desktop and VR modes

### Technical Highlights
- Built with `@hololand/core` for HoloScript parsing
- Uses `@hololand/renderer` for universal rendering
- React Three Fiber for declarative 3D
- Responsive design (desktop + mobile)
- WebXR-ready for VR mode

## 🚀 Getting Started

### Prerequisites
```bash
# From Hololand root directory
pnpm install
```

### Run the Example
```bash
cd examples/hybrid-dashboard
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🎮 Features

### 2D UI Controls (Sidebar)
- **Data Points Slider** - Adjust number of data points (5-50)
- **Visualization Type** - Switch between Bar Chart, Sphere Cloud, Network Graph
- **Color Picker** - Change visualization color
- **Animation Toggle** - Enable/disable animations
- **Enter VR Button** - Switch to immersive VR mode

### 3D Visualizations

#### Bar Chart
- Randomly generated height values
- Rotates around Y-axis (when animation enabled)
- Color matches 2D UI selection

#### Sphere Cloud
- Spheres arranged in circular pattern
- Varies in height and scale
- Rotates on multiple axes

#### Network Graph
- Nodes in circular arrangement
- Random connections between nodes
- Animated rotation

### Stats Overlay
Real-time display of:
- Current mode (Desktop/VR)
- Number of data points
- Active visualization type

## 🏗️ Project Structure

```
hybrid-dashboard/
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx       # 2D UI controls
│   │   └── VRScene.tsx        # 3D visualizations
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # Entry point
│   └── styles.css             # Styling
├── index.html                 # HTML template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 💡 Key Concepts Demonstrated

### 1. Hybrid Architecture
```typescript
// 2D UI + 3D VR in one app
<div className="app">
  <Sidebar data={data} onDataChange={handleDataChange} />
  <VRScene data={data} vrMode={vrMode} />
</div>
```

### 2. Real-time Data Sync
Changes in 2D controls immediately reflect in 3D scene:
```typescript
const handleDataChange = (newData: Partial<DashboardData>) => {
  setData(prev => ({ ...prev, ...newData }));
  // 3D scene automatically re-renders
};
```

### 3. Mode Switching
Seamlessly switch between desktop and VR modes:
```typescript
const enterVR = async () => {
  setVRMode('vr');
  // Sidebar hides, VR controls activate
};
```

### 4. Responsive Design
Works on all screen sizes:
- Desktop: Sidebar + 3D scene side-by-side
- Mobile: Sidebar slides up from bottom
- VR: Full immersive mode

## 🎨 Customization

### Change Visualization
Modify `VRScene.tsx` to add new visualization types:
```typescript
// Add new case in VRScene component
{data.visualization === 'myViz' && <MyVisualization data={data} />}
```

### Add Controls
Extend `Sidebar.tsx` with new controls:
```typescript
<div className="control">
  <label>New Control</label>
  <input onChange={(e) => onDataChange({ newProp: e.target.value })} />
</div>
```

### Customize Styling
Edit `styles.css` to change appearance:
```css
.sidebar {
  background: your-color;
  /* Your styles */
}
```

## 🔮 Future Enhancements (Phase 2)

This example will be updated to use:
- `@hololand/ui` - Declarative 2D UI components in HoloScript
- `@hololand/ar` - AR mode for mobile devices
- `@hololand/geo` - Location-based visualizations
- Full WebXR integration with hand tracking

### Example with @hololand/ui (Coming Soon)
```holoscript
// 2D UI in HoloScript
button dataPointsBtn {
  text: "Adjust Data Points"
  x: 20
  y: 20
  onClick: handleAdjust
}

// 3D VR in HoloScript
orb dataViz {
  position: [0, 0, 0]
  visualization: "bars"
  dataPoints: 10
}
```

## 📚 Learn More

- [Hololand Documentation](../../README.md)
- [Universal Platform Roadmap](../../ROADMAP.md)
- [AR↔VR Mode Switching](../../AR_VR_MODE_SWITCHING.md)
- [HoloScript Guide](../../docs/HOLOSCRIPT.md)

## 🤝 Contributing

This is an example application. To improve it:
1. Fork the repository
2. Make your changes
3. Submit a pull request

## 📝 License

MIT License - see [LICENSE](../../LICENSE) for details

---

**Built with Hololand v1.0.0-alpha.1** - Where Everyone Can Build in VR - And Beyond ✨
