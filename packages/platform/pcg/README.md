# @hololand/pcg

**Procedural Content Generation for dynamic world building**

Comprehensive procedural generation library for creating infinite, unique VR/AR worlds. Generate terrain, dungeons, vegetation, structures, and more using industry-standard algorithms like Perlin noise, Wave Function Collapse, and L-Systems.

---

## Features

- ✅ **Noise Generators** - Perlin, Simplex, Worley, Value, White noise
- ✅ **Terrain Generation** - Realistic heightmaps and biomes
- ✅ **Dungeon Generation** - BSP trees and cellular automata
- ✅ **L-Systems** - Procedural plants and organic structures
- ✅ **Wave Function Collapse** - Constraint-based level generation
- ✅ **Seeded Random** - Deterministic generation
- ✅ **Infinite Worlds** - Chunk-based streaming
- ✅ **Zero Dependencies** - Lightweight and performant

---

## Installation

```bash
pnpm add @hololand/pcg
```

---

## Quick Start

### Perlin Noise

```typescript
import { PerlinNoise } from '@hololand/pcg';

// Create noise generator
const noise = new PerlinNoise(12345);  // Seed

// Sample noise at coordinates
const value = noise.get(10.5, 20.3);  // Returns -1.0 to 1.0

// Generate terrain heightmap
for (let x = 0; x < 100; x++) {
  for (let z = 0; z < 100; z++) {
    const height = noise.get(x * 0.1, z * 0.1) * 50;
    createBlock(x, height, z);
  }
}
```

### Terrain Generation

```typescript
import { createTerrainGenerator } from '@hololand/pcg';

// Create terrain generator
const terrain = createTerrainGenerator({
  seed: 12345,
  scale: 0.01,      // Noise scale
  octaves: 6,       // Detail levels
  lacunarity: 2.0,  // Frequency multiplier
  persistence: 0.5, // Amplitude multiplier
  waterLevel: 50
});

// Generate chunk
const chunk = terrain.generateChunk(0, 0, 16, 16);

// chunk = {
//   heightmap: number[][], // Height values
//   biomes: string[][],    // Biome types
//   features: Feature[]    // Trees, rocks, etc.
// }
```

### Dungeon Generation

```typescript
import { createDungeonGenerator } from '@hololand/pcg';

// Create dungeon generator
const dungeon = createDungeonGenerator({
  width: 50,
  height: 50,
  roomMinSize: 5,
  roomMaxSize: 12,
  maxRooms: 20
});

// Generate dungeon
const map = dungeon.generate();

// map = {
//   rooms: Room[],        // Room positions
//   corridors: Path[],    // Connecting corridors
//   tiles: number[][]     // 0 = wall, 1 = floor
// }
```

---

## API Reference

### Noise Generators

#### PerlinNoise

Classic Perlin noise - smooth, organic patterns.

```typescript
import { PerlinNoise } from '@hololand/pcg';

const noise = new PerlinNoise(seed);

// 2D noise
const value2D = noise.get(x, y);  // -1.0 to 1.0

// 3D noise
const value3D = noise.get3D(x, y, z);  // -1.0 to 1.0

// Octave noise (fractal)
const fractal = noise.octave(x, y, {
  octaves: 6,
  lacunarity: 2.0,
  persistence: 0.5
});
```

#### SimplexNoise

Improved Perlin noise - faster, no directional artifacts.

```typescript
import { SimplexNoise } from '@hololand/pcg';

const noise = new SimplexNoise(seed);

const value = noise.get(x, y);  // -1.0 to 1.0
```

#### WorleyNoise

Cellular/Voronoi noise - creates cell-like patterns.

```typescript
import { WorleyNoise } from '@hololand/pcg';

const noise = new WorleyNoise(seed);

const value = noise.get(x, y, {
  distanceFunction: 'euclidean',  // 'euclidean', 'manhattan', 'chebyshev'
  combineFunction: 'f1'           // 'f1' (closest), 'f2', 'f2-f1'
});
```

#### Helper Function

```typescript
import { createNoise } from '@hololand/pcg';

// Auto-select best noise type
const noise = createNoise('perlin', 12345);
const value = noise.get(x, y);
```

---

### Terrain Generation

#### createTerrainGenerator(config)

Create a terrain generator with biomes and features.

```typescript
interface TerrainConfig {
  seed: number;
  scale: number;        // Noise scale (0.001 - 0.1)
  octaves: number;      // Detail levels (3-8)
  lacunarity: number;   // Frequency multiplier (1.5-2.5)
  persistence: number;  // Amplitude multiplier (0.3-0.7)
  waterLevel: number;   // Y-level for water
  biomes: Biome[];      // Custom biomes
}

const terrain = createTerrainGenerator({
  seed: 12345,
  scale: 0.01,
  octaves: 6,
  lacunarity: 2.0,
  persistence: 0.5,
  waterLevel: 50
});
```

#### generateChunk(chunkX, chunkZ, width, depth)

Generate a terrain chunk.

```typescript
const chunk = terrain.generateChunk(0, 0, 16, 16);

// chunk = {
//   heightmap: number[][], // Height at each position
//   biomes: string[][],    // Biome type (ocean, plains, forest, mountain)
//   features: Feature[]    // Trees, rocks, grass, etc.
// }

// Use heightmap
for (let x = 0; x < 16; x++) {
  for (let z = 0; z < 16; z++) {
    const height = chunk.heightmap[x][z];
    const biome = chunk.biomes[x][z];

    createTerrain(chunkX * 16 + x, height, chunkZ * 16 + z, biome);
  }
}

// Place features
chunk.features.forEach(feature => {
  placeFeature(feature.type, feature.position);
});
```

#### Custom Biomes

```typescript
import { DEFAULT_BIOMES } from '@hololand/pcg';

const customBiomes = [
  ...DEFAULT_BIOMES,
  {
    name: 'volcanic',
    minHeight: 80,
    maxHeight: 150,
    temperature: 0.9,
    humidity: 0.1,
    features: ['lava-pool', 'obsidian', 'ash']
  }
];

const terrain = createTerrainGenerator({
  seed: 12345,
  biomes: customBiomes
});
```

---

### Dungeon Generation

#### createDungeonGenerator(config)

Create a dungeon generator using BSP algorithm.

```typescript
interface DungeonConfig {
  width: number;
  height: number;
  roomMinSize: number;  // Min room dimension
  roomMaxSize: number;  // Max room dimension
  maxRooms: number;     // Target number of rooms
  corridorWidth: number; // Corridor width (default: 2)
}

const dungeon = createDungeonGenerator({
  width: 50,
  height: 50,
  roomMinSize: 5,
  roomMaxSize: 12,
  maxRooms: 20,
  corridorWidth: 2
});
```

#### generate()

Generate dungeon layout.

```typescript
const map = dungeon.generate();

// map = {
//   rooms: Room[],        // { x, y, width, height }
//   corridors: Path[],    // { start, end, points }
//   tiles: number[][],    // 0 = wall, 1 = floor, 2 = door
//   spawnPoint: { x, y }, // Player start
//   exits: { x, y }[]     // Exit points
// }

// Render dungeon
for (let y = 0; y < map.tiles.length; y++) {
  for (let x = 0; x < map.tiles[y].length; x++) {
    if (map.tiles[y][x] === 0) {
      createWall(x, y);
    } else if (map.tiles[y][x] === 1) {
      createFloor(x, y);
    } else if (map.tiles[y][x] === 2) {
      createDoor(x, y);
    }
  }
}

// Place enemies in rooms
map.rooms.forEach(room => {
  const enemyCount = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < enemyCount; i++) {
    const x = room.x + Math.random() * room.width;
    const y = room.y + Math.random() * room.height;
    spawnEnemy(x, y);
  }
});
```

---

### L-System Generation

Generate trees, plants, and organic structures.

#### createLSystem(config)

Create an L-System generator.

```typescript
interface LSystemConfig {
  axiom: string;           // Starting string
  rules: Record<string, string>;  // Production rules
  iterations: number;      // Number of generations
  angle: number;          // Turn angle (degrees)
  stepLength: number;     // Line segment length
}

const tree = createLSystem({
  axiom: 'F',
  rules: {
    'F': 'FF+[+F-F-F]-[-F+F+F]'  // Branching rule
  },
  iterations: 4,
  angle: 25,
  stepLength: 1.0
});
```

#### generate()

Generate L-System string.

```typescript
const result = tree.generate();
// result = "FF+[+F-F-F]-[-F+F+F]FF+[+F-F-F]-[-F+F+F]+[+FF+[+F-F-F]-[-F+F+F]...]"
```

#### interpret(result)

Interpret L-System string as 3D geometry.

```typescript
const geometry = tree.interpret(result);

// geometry = [
//   { start: [x, y, z], end: [x, y, z] },  // Line segments
//   ...
// ]

// Render tree
geometry.forEach(segment => {
  drawLine(segment.start, segment.end);
});
```

#### Presets

```typescript
import { LSYSTEM_PRESETS } from '@hololand/pcg';

// Bush
const bush = createLSystem(LSYSTEM_PRESETS.bush);

// Fern
const fern = createLSystem(LSYSTEM_PRESETS.fern);

// Tree
const tree = createLSystem(LSYSTEM_PRESETS.tree);

// Available presets:
// - tree, bush, fern, vine, spiral, dragon_curve, sierpinski
```

---

### Wave Function Collapse

Constraint-based level generation.

#### createWFCSolver(config)

Create a WFC solver.

```typescript
interface WFCConfig {
  width: number;
  height: number;
  tileset: Tile[];       // Available tiles
  rules: Rule[];         // Adjacency rules
  seed: number;
}

const wfc = createWFCSolver({
  width: 20,
  height: 20,
  tileset: SIMPLE_TILESET,
  rules: [
    { tile: 'grass', canBeNorth: ['grass', 'path'] },
    { tile: 'path', canBeNorth: ['path', 'stone'] },
    // ...
  ],
  seed: 12345
});
```

#### solve()

Solve the WFC constraint problem.

```typescript
const result = wfc.solve();

// result = {
//   success: true,
//   tiles: string[][],  // Tile IDs at each position
//   iterations: 234
// }

if (result.success) {
  // Render level
  for (let y = 0; y < result.tiles.length; y++) {
    for (let x = 0; x < result.tiles[y].length; x++) {
      const tileId = result.tiles[y][x];
      placeTile(tileId, x, y);
    }
  }
}
```

#### Helper Function

```typescript
import { createWFCFromTileset } from '@hololand/pcg';

// Auto-detect adjacency rules from tileset
const wfc = createWFCFromTileset({
  width: 30,
  height: 30,
  tileset: myTileset,
  seed: 12345
});

const result = wfc.solve();
```

---

## Advanced Usage

### Multi-Octave Terrain

Combine multiple noise layers for realistic terrain.

```typescript
import { PerlinNoise } from '@hololand/pcg';

const noise1 = new PerlinNoise(12345);  // Base terrain
const noise2 = new PerlinNoise(54321);  // Detail
const noise3 = new PerlinNoise(99999);  // Fine detail

function getHeight(x, z) {
  const base = noise1.get(x * 0.01, z * 0.01) * 100;
  const detail = noise2.get(x * 0.05, z * 0.05) * 20;
  const fine = noise3.get(x * 0.1, z * 0.1) * 5;

  return base + detail + fine;
}

// Generate terrain
for (let x = 0; x < 256; x++) {
  for (let z = 0; z < 256; z++) {
    const height = getHeight(x, z);
    createBlock(x, height, z);
  }
}
```

### Biome Blending

Smooth transitions between biomes.

```typescript
function getBlendedBiome(x, z) {
  const temperature = temperatureNoise.get(x * 0.005, z * 0.005);
  const humidity = humidityNoise.get(x * 0.005, z * 0.005);

  // Determine biome
  if (temperature < -0.3) return 'tundra';
  if (temperature > 0.7) return 'desert';
  if (humidity > 0.5) return 'jungle';
  if (humidity < -0.3) return 'savanna';
  return 'plains';
}
```

### Caves & Overhangs (3D Noise)

Use 3D noise for cave systems.

```typescript
const caveNoise = new PerlinNoise(98765);

function isSolid(x, y, z) {
  // Surface terrain
  const surfaceHeight = getHeight(x, z);

  if (y > surfaceHeight) {
    return false;  // Air
  }

  // Cave carving
  const caveValue = caveNoise.get3D(x * 0.05, y * 0.05, z * 0.05);

  if (caveValue > 0.3) {
    return false;  // Cave
  }

  return true;  // Solid
}
```

### Procedural Structures

Generate buildings with WFC.

```typescript
const buildingTileset = [
  { id: 'wall', canConnect: ['wall', 'door', 'window'] },
  { id: 'door', canConnect: ['wall', 'floor'] },
  { id: 'window', canConnect: ['wall'] },
  { id: 'floor', canConnect: ['floor', 'door'] },
  { id: 'roof', canConnect: ['wall', 'roof'] }
];

const building = createWFCFromTileset({
  width: 10,
  height: 10,
  tileset: buildingTileset,
  seed: Date.now()
});

const result = building.solve();
```

---

## Use Cases

### Infinite Procedural World

```typescript
// Minecraft-style infinite world
class ProceduralWorld {
  chunks = new Map();
  terrain = createTerrainGenerator({ seed: 12345 });

  loadChunk(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;

    if (this.chunks.has(key)) {
      return this.chunks.get(key);
    }

    // Generate new chunk
    const chunk = this.terrain.generateChunk(chunkX, chunkZ, 16, 16);
    this.chunks.set(key, chunk);

    return chunk;
  }

  update(playerX, playerZ) {
    const chunkX = Math.floor(playerX / 16);
    const chunkZ = Math.floor(playerZ / 16);

    // Load surrounding chunks
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        this.loadChunk(chunkX + dx, chunkZ + dz);
      }
    }

    // Unload distant chunks
    this.chunks.forEach((chunk, key) => {
      const [cx, cz] = key.split(',').map(Number);
      const distance = Math.max(Math.abs(cx - chunkX), Math.abs(cz - chunkZ));

      if (distance > 5) {
        this.chunks.delete(key);
      }
    });
  }
}
```

### Roguelike Dungeon

```typescript
// Generate multi-floor dungeon
class RoguelikeDungeon {
  floors = [];
  dungeon = createDungeonGenerator({
    width: 50,
    height: 50,
    roomMinSize: 5,
    roomMaxSize: 12,
    maxRooms: 20
  });

  generateFloor(depth) {
    const floor = this.dungeon.generate();

    // Increase difficulty with depth
    floor.rooms.forEach(room => {
      const enemyCount = Math.min(depth + 1, 10);
      for (let i = 0; i < enemyCount; i++) {
        this.spawnEnemy(room, depth);
      }
    });

    // Place loot
    const lootRoom = floor.rooms[floor.rooms.length - 1];
    this.placeLoot(lootRoom, depth);

    this.floors.push(floor);
    return floor;
  }
}
```

### Procedural Forest

```typescript
// Generate realistic forest
const treeNoise = new WorleyNoise(12345);

for (let x = 0; x < 200; x++) {
  for (let z = 0; z < 200; z++) {
    const density = treeNoise.get(x * 0.05, z * 0.05);

    if (density > 0.6) {
      // Place tree
      const treeType = Math.random() < 0.5 ? 'oak' : 'pine';
      const tree = createLSystem(LSYSTEM_PRESETS.tree);
      const geometry = tree.interpret(tree.generate());

      placeTree(x, z, geometry, treeType);
    }
  }
}
```

---

## Performance Tips

### Chunk-Based Generation

```typescript
// ❌ Bad - Generate entire world at once
const world = terrain.generate(10000, 10000);  // 100M cells!

// ✅ Good - Generate chunks on-demand
const chunk = terrain.generateChunk(chunkX, chunkZ, 16, 16);
```

### Noise Caching

```typescript
// Cache noise values for reuse
const noiseCache = new Map();

function getCachedNoise(x, z) {
  const key = `${x},${z}`;

  if (!noiseCache.has(key)) {
    noiseCache.set(key, noise.get(x, z));
  }

  return noiseCache.get(key);
}
```

### Seed Consistency

```typescript
// Same seed = same world
const world1 = createTerrainGenerator({ seed: 12345 });
const world2 = createTerrainGenerator({ seed: 12345 });

// world1 and world2 generate identical terrain
```

---

## Examples

See [examples/pcg](../../../examples/pcg) for complete demos:
- Infinite terrain generation
- Dungeon crawler
- Procedural cities
- L-System forests
- WFC level design

---

## TypeScript

Full TypeScript support:

```typescript
import type {
  NoiseGenerator,
  TerrainConfig,
  DungeonConfig,
  LSystemConfig,
  WFCConfig,
  Biome,
  Chunk
} from '@hololand/pcg';

const terrain: TerrainConfig = {
  seed: 12345,
  scale: 0.01,
  octaves: 6,
  lacunarity: 2.0,
  persistence: 0.5,
  waterLevel: 50
};
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
- New noise algorithms (Gradient, Curl, Domain warping)
- More dungeon algorithms (Drunkard's walk, Cellular automata)
- Procedural structure templates
- Performance optimizations

---

## License

Elastic License 2.0 - See [LICENSE](../../../LICENSE)

---

## Related Packages

- [@hololand/world](../world) - World building and management
- [@hololand/lod](../lod) - Level of detail optimization
- [@hololand/streaming](../streaming) - Asset streaming
- [@hololand/physics](../physics) - Physics simulation

---

**Last Updated**: February 21, 2026

---

*Part of the [Hololand](https://github.com/brianonbased-dev/Hololand) VR/AR platform*
