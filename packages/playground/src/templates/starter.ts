/**
 * Starter Code Template
 * 
 * This is what users see when they first open the playground.
 */

export const STARTER_CODE = `// 🌐 Welcome to HoloScript Playground!
// Build 3D worlds with code. Changes appear in real-time.

composition "My First World" {
  
  environment {
    skybox: "nebula"
    ambient_light: 0.4
  }
  
  // A glowing orb floating in space
  object "FloatingOrb" {
    @grabbable
    @glowing
    
    position: [0, 1.5, 0]
    geometry: "sphere"
    color: "#00d4ff"
  }
  
  // A platform to stand on
  object "Platform" {
    @collidable
    
    position: [0, 0, 0]
    geometry: "box"
    scale: [4, 0.2, 4]
    color: "#2d2d44"
  }
  
  // Decorative cubes
  object "Cube1" {
    position: [-2, 0.5, -2]
    geometry: "box"
    color: "#a855f7"
  }
  
  object "Cube2" {
    position: [2, 0.5, -2]
    geometry: "box"
    color: "#ff6b9d"
  }
  
  object "Cube3" {
    position: [0, 0.5, 2]
    geometry: "box"
    color: "#ffd700"
    @glowing
  }
}

// Try these:
// 1. Change colors (use hex like "#ff0000")
// 2. Move objects (change position values)
// 3. Add @glowing to make things glow
// 4. Create new objects!
`;

export const EXAMPLES = {
  helloWorld: STARTER_CODE,
  
  physics: `composition "Physics Demo" {
  environment {
    skybox: "sunset"
    ambient_light: 0.5
  }
  
  // A bouncy ball
  object "Ball" {
    @physics
    @collidable
    @grabbable
    
    position: [0, 5, 0]
    geometry: "sphere"
    color: "#ff6b9d"
  }
  
  // Ground plane
  object "Ground" {
    @collidable
    
    position: [0, 0, 0]
    geometry: "plane"
    scale: [20, 20, 1]
    rotation: [-90, 0, 0]
    color: "#1a1a2e"
  }
}`,

  vrShop: `composition "VR Shop" {
  environment {
    skybox: "studio"
    ambient_light: 0.6
  }
  
  // Product display
  spatial_group "Products" {
    object "Product1" {
      @grabbable
      @hoverable
      position: [-1, 1, 0]
      geometry: "box"
      color: "#00d4ff"
    }
    
    object "Product2" {
      @grabbable
      @hoverable
      position: [0, 1, 0]
      geometry: "sphere"
      color: "#a855f7"
    }
    
    object "Product3" {
      @grabbable
      @hoverable
      position: [1, 1, 0]
      geometry: "cylinder"
      color: "#ffd700"
    }
  }
  
  // Display shelf
  object "Shelf" {
    position: [0, 0.5, 0]
    geometry: "box"
    scale: [4, 0.1, 1]
    color: "#2d2d44"
  }
}`
};
