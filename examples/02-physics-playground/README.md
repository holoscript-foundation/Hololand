# 🎮 Physics Playground

An interactive physics simulation demonstrating gravity, collisions, and realistic object behavior.

## 🎯 What You'll Learn

- **Physics Simulation** - Gravity, velocity, damping
- **Collision Detection** - Ground and wall collisions
- **Object Properties** - Mass, restitution (bounciness), friction
- **Interactive Controls** - Spawning objects dynamically
- **Performance** - FPS monitoring and optimization

## 🚀 Quick Start

1. **Open the file**:
   ```bash
   # Navigate to this example
   cd examples/02-physics-playground

   # Open in browser (or use a local server)
   python -m http.server 8000
   # OR
   npx serve
   ```

2. **Visit**: http://localhost:8000

3. **Play around**:
   - Click "🔴 Spawn Ball" to add bouncing balls
   - Click "🟦 Spawn Box" to add tumbling boxes
   - Click "🟢 Spawn Cylinder" to add rolling cylinders
   - Click "🗑️ Clear All" to reset

## 🥽 VR Mode

Click the **"ENTER VR"** button (appears when you have a VR headset connected) to experience the physics playground in immersive VR!

## 📖 Code Walkthrough

### Physics Object Class

```javascript
class PhysicsObject {
  constructor(mesh, mass = 1, restitution = 0.7) {
    this.mesh = mesh;              // The 3D mesh
    this.mass = mass;              // How heavy (affects response)
    this.restitution = restitution; // Bounciness (0 = no bounce, 1 = perfect bounce)
    this.velocity = new THREE.Vector3(); // Movement speed
    this.angularVelocity = new THREE.Vector3(); // Rotation speed
  }

  update(deltaTime) {
    // Apply gravity
    this.velocity.y += gravity * deltaTime;

    // Update position
    this.mesh.position.add(this.velocity.multiplyScalar(deltaTime));

    // Update rotation
    this.mesh.rotation.x += this.angularVelocity.x * deltaTime;

    // Handle collisions...
  }
}
```

### Ground Collision

```javascript
// Detect collision with ground
if (this.mesh.position.y - radius < groundY) {
  // Move object to ground surface
  this.mesh.position.y = groundY + radius;

  // Reverse velocity and apply restitution (bounciness)
  this.velocity.y = -this.velocity.y * this.restitution;

  // Apply friction to horizontal movement
  this.velocity.x *= damping;
  this.velocity.z *= damping;
}
```

### Wall Collision

```javascript
// Detect collision with walls
const boundaryX = 19;
if (Math.abs(this.mesh.position.x) > boundaryX) {
  // Move object inside boundary
  this.mesh.position.x = Math.sign(this.mesh.position.x) * boundaryX;

  // Bounce off wall
  this.velocity.x = -this.velocity.x * this.restitution;
}
```

## 🎨 Customization Ideas

### Change Gravity

```javascript
// Stronger gravity (objects fall faster)
const gravity = -20;

// Weaker gravity (moon-like)
const gravity = -1.62;

// Zero gravity (space!)
const gravity = 0;
```

### Adjust Bounciness

```javascript
// Super bouncy balls
const physicsObj = new PhysicsObject(mesh, 1, 0.95); // 95% energy retained

// Dead bounce (like clay)
const physicsObj = new PhysicsObject(mesh, 1, 0.1); // Only 10% energy retained
```

### Add More Object Types

```javascript
window.spawnPyramid = function() {
  const geometry = new THREE.ConeGeometry(0.5, 1, 4);
  const material = new THREE.MeshStandardMaterial({
    color: Math.random() * 0xffffff,
  });
  const mesh = new THREE.Mesh(geometry, material);
  // ... position and add to scene

  const physicsObj = new PhysicsObject(mesh, 0.8, 0.6);
  objects.push(physicsObj);
};
```

### Change Environment

```javascript
// Different sky color
scene.background = new THREE.Color(0x000033); // Night sky

// Different ground material
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x00ff00,  // Green grass
  roughness: 1.0,   // Very rough
  metalness: 0.0,   // Not metallic
});
```

## 🔧 Physics Properties Explained

| Property | What It Does | Example Values |
|----------|-------------|----------------|
| **mass** | How heavy the object is | 0.5 (light), 2.0 (heavy) |
| **restitution** | Bounciness (0-1) | 0.0 (dead), 0.7 (bouncy), 0.95 (super bouncy) |
| **damping** | Energy loss over time | 0.95 (slow down), 0.99 (keep moving) |
| **friction** | Resistance to sliding | Applied through damping on collision |

## 🎯 Challenges

Try implementing these features:

1. **Object-to-Object Collision**
   - Detect when two objects touch
   - Calculate collision response
   - Transfer momentum between objects

2. **Different Materials**
   - Wood (medium bounce)
   - Rubber (high bounce)
   - Metal (low bounce, high density)

3. **Wind Force**
   - Add horizontal force to all objects
   - Make it affect lighter objects more

4. **Slow Motion**
   - Add a button to slow down time
   - Multiply deltaTime by 0.1 for dramatic effect

## 📚 Learn More

- **Three.js Physics**: This is a simplified physics engine for learning. For production, consider:
  - [Cannon.js](https://github.com/schteppe/cannon.js) - Full physics engine
  - [Ammo.js](https://github.com/kripken/ammo.js/) - Bullet physics port
  - [Rapier](https://rapier.rs/) - Modern Rust-based physics

- **Next Example**: Check out [03-vr-shop](../03-vr-shop/) to see commerce features

- **React Version**: See [04-react-starter](../04-react-starter/) for the same concepts in React

## 🐛 Troubleshooting

**Objects fall through the ground?**
- Check that `groundY` matches your ground plane position
- Ensure collision detection happens before position update

**Objects move too fast?**
- Reduce initial velocity
- Increase damping (closer to 1.0)
- Cap maximum velocity

**Low FPS?**
- Reduce number of objects
- Simplify geometry (fewer polygons)
- Disable shadows on some objects

**Jittery movement?**
- Use consistent time steps: `deltaTime = Math.min(deltaTime, 0.1)`
- Enable `controls.enableDamping`
- Check for NaN values in physics calculations

---

**Have fun experimenting with physics!** 🎮✨
