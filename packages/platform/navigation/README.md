# @hololand/navigation

**Navigation and pathfinding system for VR worlds**

High-performance navigation and pathfinding library for creating realistic NPC movement, crowd simulation, and intelligent navigation in virtual and augmented reality environments. Supports flow fields, hierarchical pathfinding, and local avoidance.

---

## Features

- ✅ **Flow Fields** - Mass NPC movement (50-200+ agents at 90fps)
- ✅ **Crowd Simulation** - Local avoidance and steering behaviors
- ✅ **Hierarchical Pathfinding** - Zone → Cluster → Cell pathfinding
- ✅ **Path Caching** - Performance optimization for repeated queries
- ✅ **Dynamic Obstacles** - Real-time navmesh updates
- ✅ **3D Navigation** - Full 3D pathfinding support
- ✅ **Grid-Based** - Efficient grid-based navigation mesh
- ✅ **Zero Dependencies** - Lightweight and performant

---

## Installation

```bash
pnpm add @hololand/navigation
```

---

## Quick Start

### Basic Pathfinding

```typescript
import { createHierarchicalPathfinder } from '@hololand/navigation';

// Create pathfinder
const pathfinder = createHierarchicalPathfinder({
  gridSize: { x: 100, y: 50, z: 100 },
  cellSize: 1.0,  // 1 meter cells
  hierarchyLevels: 3
});

// Find path from A to B
const path = pathfinder.findPath(
  { x: 0, y: 0, z: 0 },   // Start
  { x: 50, y: 0, z: 50 }  // Goal
);

// Move character along path
path.forEach(waypoint => {
  character.moveTo(waypoint);
});
```

### Flow Fields (Mass NPCs)

```typescript
import { FlowFieldGenerator } from '@hololand/navigation';

// Create flow field generator
const flowField = new FlowFieldGenerator({
  width: 100,
  height: 100,
  cellSize: 1.0
});

// Set goal position
flowField.setGoal({ x: 50, y: 50 });

// Get direction for any agent
const direction = flowField.getDirection({ x: 10, y: 10 });

// Move 200 NPCs using the same flow field
agents.forEach(agent => {
  const dir = flowField.getDirection(agent.position);
  agent.velocity = dir.multiply(agent.speed);
});
```

### Crowd Simulation

```typescript
import { createCrowdSimulator } from '@hololand/navigation';

// Create crowd simulator
const crowd = createCrowdSimulator({
  maxAgents: 200,
  neighborDistance: 5.0,  // Avoidance radius
  maxSpeed: 3.5,          // m/s
  separationWeight: 1.5
});

// Add agents
const agent = crowd.addAgent({
  position: { x: 0, y: 0, z: 0 },
  goal: { x: 100, y: 0, z: 100 },
  radius: 0.5,
  maxSpeed: 3.5
});

// Update every frame
function update(deltaTime) {
  crowd.update(deltaTime);

  // Apply to characters
  crowd.getAgents().forEach(agent => {
    character.position = agent.position;
    character.velocity = agent.velocity;
  });
}
```

---

## API Reference

### HierarchicalPathfinder

Efficient pathfinding using hierarchical navigation graphs.

#### Methods

##### `createHierarchicalPathfinder(config)`

Create a new pathfinder instance.

```typescript
interface HierarchyConfig {
  gridSize: Vec3;        // Grid dimensions (world space)
  cellSize: number;      // Size of each cell in meters
  hierarchyLevels: number;  // 2-4 recommended
  maxPathLength?: number;   // Max path nodes (default: 1000)
}

const pathfinder = createHierarchicalPathfinder({
  gridSize: { x: 200, y: 50, z: 200 },
  cellSize: 1.0,
  hierarchyLevels: 3
});
```

##### `findPath(start, goal, options?)`

Find a path between two points.

```typescript
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const path = pathfinder.findPath(
  { x: 0, y: 0, z: 0 },
  { x: 50, y: 10, z: 50 },
  {
    smooth: true,          // Smooth path (default: true)
    simplify: true,        // Remove redundant waypoints
    maxIterations: 1000    // A* iteration limit
  }
);

// path = [{ x, y, z }, { x, y, z }, ...]
```

##### `addObstacle(bounds)` / `removeObstacle(id)`

Dynamically add/remove obstacles.

```typescript
// Add obstacle (box)
const obstacleId = pathfinder.addObstacle({
  min: { x: 10, y: 0, z: 10 },
  max: { x: 15, y: 5, z: 15 }
});

// Remove obstacle
pathfinder.removeObstacle(obstacleId);

// Rebuild navmesh
pathfinder.rebuildNavmesh();
```

##### `isWalkable(position)`

Check if a position is walkable.

```typescript
if (pathfinder.isWalkable({ x: 10, y: 0, z: 10 })) {
  console.log('Position is walkable');
}
```

---

### FlowFieldGenerator

Efficient mass NPC movement using flow fields.

```typescript
const flowField = new FlowFieldGenerator({
  width: 100,       // Grid width
  height: 100,      // Grid height
  cellSize: 1.0     // Cell size in meters
});
```

#### Methods

##### `setGoal(position)`

Set the goal position for the flow field.

```typescript
interface Vec2 {
  x: number;
  y: number;
}

flowField.setGoal({ x: 50, y: 50 });
```

##### `getDirection(position)`

Get movement direction at a position.

```typescript
const direction = flowField.getDirection({ x: 10, y: 10 });
// direction = { x: 0.707, y: 0.707 }  (normalized)

// Apply to agent
agent.velocity.x = direction.x * agent.speed;
agent.velocity.y = direction.y * agent.speed;
```

##### `addObstacle(position)` / `removeObstacle(position)`

Add/remove obstacles from the flow field.

```typescript
// Add obstacle
flowField.addObstacle({ x: 25, y: 25 });

// Remove obstacle
flowField.removeObstacle({ x: 25, y: 25 });

// Recompute flow field
flowField.compute();
```

##### `compute()`

Recompute the flow field after changes.

```typescript
// Make changes
flowField.setGoal({ x: 80, y: 80 });
flowField.addObstacle({ x: 50, y: 50 });

// Recompute
flowField.compute();
```

---

### CrowdSimulator

Local avoidance and steering behaviors for realistic crowds.

```typescript
const crowd = createCrowdSimulator({
  maxAgents: 200,
  neighborDistance: 5.0,
  maxSpeed: 3.5,
  separationWeight: 1.5,
  alignmentWeight: 1.0,
  cohesionWeight: 1.0
});
```

#### Configuration

```typescript
interface CrowdConfig {
  maxAgents: number;        // Maximum number of agents
  neighborDistance: number; // Search radius for neighbors
  maxSpeed: number;         // Maximum agent speed (m/s)
  separationWeight: number; // Avoid neighbors (default: 1.5)
  alignmentWeight: number;  // Match neighbor velocities (default: 1.0)
  cohesionWeight: number;   // Move toward group center (default: 1.0)
}
```

#### Methods

##### `addAgent(config)`

Add an agent to the simulation.

```typescript
interface Agent {
  position: Vec3;
  goal: Vec3;
  radius: number;      // Agent radius for collision
  maxSpeed: number;    // Max speed (m/s)
  priority?: number;   // Higher = more dominant (default: 1)
}

const agent = crowd.addAgent({
  position: { x: 0, y: 0, z: 0 },
  goal: { x: 100, y: 0, z: 100 },
  radius: 0.5,
  maxSpeed: 3.5,
  priority: 1
});

// agent.id = unique identifier
```

##### `removeAgent(agentId)`

Remove an agent from the simulation.

```typescript
crowd.removeAgent(agent.id);
```

##### `setAgentGoal(agentId, goal)`

Update an agent's goal position.

```typescript
crowd.setAgentGoal(agent.id, { x: 50, y: 0, z: 50 });
```

##### `update(deltaTime)`

Update the simulation (call every frame).

```typescript
function gameLoop(deltaTime) {
  // Update crowd simulation
  crowd.update(deltaTime);

  // Apply to game objects
  crowd.getAgents().forEach(agent => {
    const character = getCharacter(agent.id);
    character.position = agent.position;
    character.velocity = agent.velocity;
  });
}
```

##### `getAgents()`

Get all agents in the simulation.

```typescript
const agents = crowd.getAgents();
agents.forEach(agent => {
  console.log(agent.id, agent.position, agent.velocity);
});
```

---

## Advanced Usage

### Combining Flow Fields + Crowd Simulation

Best of both worlds: global navigation + local avoidance.

```typescript
import { FlowFieldGenerator, createCrowdSimulator } from '@hololand/navigation';

// Global navigation (flow field)
const flowField = new FlowFieldGenerator({
  width: 100,
  height: 100,
  cellSize: 1.0
});
flowField.setGoal({ x: 90, y: 90 });

// Local avoidance (crowd sim)
const crowd = createCrowdSimulator({
  maxAgents: 200,
  neighborDistance: 3.0,
  maxSpeed: 4.0
});

// Add 200 agents
for (let i = 0; i < 200; i++) {
  crowd.addAgent({
    position: { x: Math.random() * 10, y: 0, z: Math.random() * 10 },
    goal: { x: 90, y: 0, z: 90 },
    radius: 0.4,
    maxSpeed: 4.0
  });
}

// Update loop
function update(deltaTime) {
  // Get flow field directions
  crowd.getAgents().forEach(agent => {
    const direction = flowField.getDirection({
      x: agent.position.x,
      y: agent.position.z  // 2D flow field uses X/Z
    });

    // Set agent goal based on flow field
    const nextGoal = {
      x: agent.position.x + direction.x * 5,
      y: 0,
      z: agent.position.z + direction.y * 5
    };
    crowd.setAgentGoal(agent.id, nextGoal);
  });

  // Update crowd (handles local avoidance)
  crowd.update(deltaTime);
}
```

### Dynamic Obstacle Updates

Update navmesh in real-time when objects move.

```typescript
// Create pathfinder
const pathfinder = createHierarchicalPathfinder({
  gridSize: { x: 100, y: 50, z: 100 },
  cellSize: 1.0,
  hierarchyLevels: 3
});

// Track obstacles
const obstacles = new Map();

// Add obstacle
function addDynamicObstacle(id, bounds) {
  const obstacleId = pathfinder.addObstacle(bounds);
  obstacles.set(id, obstacleId);
  pathfinder.rebuildNavmesh();
}

// Remove obstacle
function removeDynamicObstacle(id) {
  const obstacleId = obstacles.get(id);
  if (obstacleId) {
    pathfinder.removeObstacle(obstacleId);
    obstacles.delete(id);
    pathfinder.rebuildNavmesh();
  }
}

// When object moves
door.on('open', () => {
  removeDynamicObstacle('door-1');
});

door.on('close', () => {
  addDynamicObstacle('door-1', {
    min: { x: 10, y: 0, z: 20 },
    max: { x: 12, y: 3, z: 22 }
  });
});
```

### Path Smoothing

Smooth paths for more natural movement.

```typescript
function smoothPath(path, smoothness = 0.5) {
  const smoothed = [path[0]];  // Keep start

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];

    smoothed.push({
      x: curr.x + (next.x - prev.x) * smoothness * 0.5,
      y: curr.y + (next.y - prev.y) * smoothness * 0.5,
      z: curr.z + (next.z - prev.z) * smoothness * 0.5
    });
  }

  smoothed.push(path[path.length - 1]);  // Keep end
  return smoothed;
}

// Use smoothed path
const rawPath = pathfinder.findPath(start, goal);
const smoothedPath = smoothPath(rawPath, 0.7);
```

---

## Use Cases

### Game NPCs

```typescript
// Enemy AI pathfinding
class Enemy {
  pathfinder: HierarchicalPathfinder;
  currentPath: Vec3[];
  pathIndex: number = 0;

  chasePlayer(playerPosition: Vec3) {
    // Find path to player
    this.currentPath = this.pathfinder.findPath(
      this.position,
      playerPosition,
      { smooth: true }
    );
    this.pathIndex = 0;
  }

  update(deltaTime: number) {
    if (!this.currentPath || this.pathIndex >= this.currentPath.length) {
      return;
    }

    const target = this.currentPath[this.pathIndex];
    const direction = this.normalize(this.subtract(target, this.position));

    // Move toward waypoint
    this.position.x += direction.x * this.speed * deltaTime;
    this.position.y += direction.y * this.speed * deltaTime;
    this.position.z += direction.z * this.speed * deltaTime;

    // Reached waypoint?
    if (this.distance(this.position, target) < 0.5) {
      this.pathIndex++;
    }
  }
}
```

### Crowd Evacuation

```typescript
// Emergency evacuation simulation
const exits = [
  { x: 0, y: 0, z: 0 },
  { x: 100, y: 0, z: 0 },
  { x: 100, y: 0, z: 100 },
  { x: 0, y: 0, z: 100 }
];

// Create flow fields for each exit
const flowFields = exits.map(exit => {
  const field = new FlowFieldGenerator({
    width: 100,
    height: 100,
    cellSize: 1.0
  });
  field.setGoal({ x: exit.x, y: exit.z });
  return field;
});

// Assign each person to nearest exit
people.forEach(person => {
  const nearestExitIndex = findNearestExit(person.position, exits);
  const flowField = flowFields[nearestExitIndex];

  crowd.addAgent({
    position: person.position,
    goal: exits[nearestExitIndex],
    radius: 0.4,
    maxSpeed: 5.0  // Running speed
  });
});

// Update evacuation
function updateEvacuation(deltaTime) {
  crowd.update(deltaTime);

  // Check if people reached exits
  crowd.getAgents().forEach(agent => {
    if (hasReachedExit(agent.position)) {
      crowd.removeAgent(agent.id);
      console.log('Person evacuated safely');
    }
  });
}
```

### Procedural City Traffic

```typescript
// Traffic simulation
const roadNetwork = createRoadNetwork();
const vehicles = createCrowdSimulator({
  maxAgents: 500,
  neighborDistance: 10.0,
  maxSpeed: 15.0,  // ~50 km/h
  separationWeight: 2.0  // Avoid collisions
});

// Spawn vehicles
for (let i = 0; i < 100; i++) {
  const startNode = roadNetwork.getRandomNode();
  const endNode = roadNetwork.getRandomNode();

  vehicles.addAgent({
    position: startNode.position,
    goal: endNode.position,
    radius: 2.0,  // Car length
    maxSpeed: 15.0
  });
}

// Update traffic
function updateTraffic(deltaTime) {
  vehicles.update(deltaTime);

  // Handle intersections, traffic lights, etc.
  vehicles.getAgents().forEach(vehicle => {
    if (atIntersection(vehicle.position)) {
      handleTrafficLight(vehicle);
    }
  });
}
```

---

## Performance Tips

### Flow Field Optimization

```typescript
// ❌ Bad - Recompute every frame
function badUpdate() {
  flowField.setGoal(target);
  flowField.compute();  // Expensive!
}

// ✅ Good - Recompute only when goal changes
let lastGoal = null;
function goodUpdate() {
  if (!lastGoal || distance(lastGoal, target) > 5.0) {
    flowField.setGoal(target);
    flowField.compute();
    lastGoal = target;
  }
}
```

### Hierarchical Pathfinding Levels

```typescript
// Small world (< 50x50)
const small = createHierarchicalPathfinder({
  gridSize: { x: 50, y: 10, z: 50 },
  cellSize: 0.5,
  hierarchyLevels: 2  // Fast, less overhead
});

// Medium world (50-200)
const medium = createHierarchicalPathfinder({
  gridSize: { x: 150, y: 20, z: 150 },
  cellSize: 1.0,
  hierarchyLevels: 3  // Balanced
});

// Large world (200+)
const large = createHierarchicalPathfinder({
  gridSize: { x: 500, y: 50, z: 500 },
  cellSize: 2.0,
  hierarchyLevels: 4  // Best for huge maps
});
```

### Agent Count Guidelines

| Agent Count | Recommended System | Target FPS |
|-------------|-------------------|------------|
| 1-50 | Any | 90 FPS |
| 50-100 | Flow field | 90 FPS |
| 100-200 | Flow field + spatial partitioning | 60 FPS |
| 200+ | Flow field + LOD system | 60 FPS |

### Spatial Partitioning

```typescript
// Divide world into chunks for better performance
class SpatialGrid {
  chunks = new Map();

  addAgent(agent) {
    const chunkId = this.getChunkId(agent.position);
    if (!this.chunks.has(chunkId)) {
      this.chunks.set(chunkId, []);
    }
    this.chunks.get(chunkId).push(agent);
  }

  getNearbyAgents(position, radius) {
    const chunkIds = this.getOverlappingChunks(position, radius);
    return chunkIds.flatMap(id => this.chunks.get(id) || []);
  }
}

// Use with crowd simulator
const grid = new SpatialGrid();
crowd.getAgents().forEach(agent => grid.addAgent(agent));
```

---

## Browser Support

| Browser | Pathfinding | Flow Fields | Crowd Sim |
|---------|-------------|-------------|-----------|
| **Chrome/Edge** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Firefox** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Safari** | ✅ Yes | ✅ Yes | ✅ Yes |

**Note**: All features work in any modern JavaScript environment.

---

## Examples

See [examples/navigation](../../../examples/navigation) for complete demos:
- Basic pathfinding
- Flow field crowds
- Dynamic obstacles
- Traffic simulation
- Evacuation scenarios

---

## TypeScript

Full TypeScript support with complete type definitions:

```typescript
import type {
  Vec2,
  Vec3,
  FlowFieldConfig,
  HierarchyConfig,
  CrowdConfig,
  Agent
} from '@hololand/navigation';

// Type-safe pathfinding
const pathfinder = createHierarchicalPathfinder({
  gridSize: { x: 100, y: 50, z: 100 },
  cellSize: 1.0,
  hierarchyLevels: 3
});

const path: Vec3[] = pathfinder.findPath(
  { x: 0, y: 0, z: 0 },
  { x: 50, y: 0, z: 50 }
);
```

---

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

---

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](../../../CONTRIBUTING.md).

**Areas we'd love help with**:
- New pathfinding algorithms (D*, Theta*, JPS)
- Performance optimizations
- More crowd behaviors (flocking, formation)
- Documentation improvements

---

## License

Elastic License 2.0 - See [LICENSE](../../../LICENSE)

---

## Related Packages

- [@hololand/physics](../physics) - Physics simulation and collision
- [@hololand/lod](../lod) - Level of detail for performance
- [@hololand/ai](../ai) - AI behaviors and decision making
- [@hololand/world](../world) - World building and management

---

**Last Updated**: February 21, 2026

---

*Part of the [Hololand](https://github.com/brianonbased-dev/Hololand) VR/AR platform*
