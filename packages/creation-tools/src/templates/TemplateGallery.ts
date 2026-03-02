/**
 * Template Gallery
 *
 * Provides a curated collection of starter scene templates for creators.
 * Each template includes complete HoloScript code, metadata, preview thumbnails,
 * and difficulty ratings.
 *
 * Starter Templates:
 * - Empty Room: Minimal scene with floor and lighting
 * - Forest: Nature scene with trees, grass, and ambient sounds
 * - City Block: Urban environment with buildings and streets
 * - Gallery: Art gallery with frames and display pedestals
 * - Game Arena: PvP arena with spawn points and obstacles
 * - Living Room: Interior residential space
 * - Space Station: Sci-fi corridor environment
 * - Underwater: Oceanic scene with marine elements
 */

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface SceneTemplate {
  /** Unique template identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Category for filtering */
  category: TemplateCategory;
  /** Difficulty level */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Tags for search */
  tags: string[];
  /** HoloScript source code */
  code: string;
  /** Preview thumbnail data URL or path */
  thumbnail: string;
  /** Author attribution */
  author: string;
  /** Estimated object count */
  objectCount: number;
  /** Whether template uses networking features */
  networked: boolean;
  /** Whether template uses physics */
  physics: boolean;
  /** Whether template includes AI/NPC */
  hasAI: boolean;
  /** Creation date */
  createdAt: string;
}

export type TemplateCategory =
  | 'starter'
  | 'environment'
  | 'game'
  | 'social'
  | 'education'
  | 'art'
  | 'utility'
  | 'scifi'
  | 'nature';

export interface TemplateFilter {
  category?: TemplateCategory;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  search?: string;
  tags?: string[];
  networked?: boolean;
  physics?: boolean;
}

// --------------------------------------------------------------------------
// Template Definitions
// --------------------------------------------------------------------------

export const STARTER_TEMPLATES: SceneTemplate[] = [
  // ── Empty Room ──
  {
    id: 'empty-room',
    name: 'Empty Room',
    description: 'A minimal starting scene with floor, walls, and basic lighting. Perfect blank canvas for any project.',
    category: 'starter',
    difficulty: 'beginner',
    tags: ['minimal', 'starter', 'room', 'indoor'],
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect fill="#1a1a2e" width="300" height="200"/><rect fill="#333" x="50" y="120" width="200" height="5"/><rect fill="#2a2a3e" x="50" y="40" width="200" height="80" opacity="0.3"/><text x="150" y="170" text-anchor="middle" fill="#00d4ff" font-size="14">Empty Room</text></svg>'),
    author: 'HoloLand',
    objectCount: 5,
    networked: false,
    physics: false,
    hasAI: false,
    createdAt: '2026-03-01',
    code: `composition "Empty Room" {
  environment {
    skybox: "default"
    ambient_light: 0.6
    grid: true
    theme: "developer-dark"
  }

  // Floor
  object "Floor" {
    geometry: "plane"
    color: "#444444"
    position: [0, 0, 0]
    rotation: [-90, 0, 0]
    scale: [10, 10, 1]
  }

  // Back wall
  object "BackWall" {
    geometry: "plane"
    color: "#3a3a4e"
    position: [0, 2.5, -5]
    scale: [10, 5, 1]
  }

  // Left wall
  object "LeftWall" {
    geometry: "plane"
    color: "#3a3a4e"
    position: [-5, 2.5, 0]
    rotation: [0, 90, 0]
    scale: [10, 5, 1]
  }

  // Right wall
  object "RightWall" {
    geometry: "plane"
    color: "#3a3a4e"
    position: [5, 2.5, 0]
    rotation: [0, -90, 0]
    scale: [10, 5, 1]
  }

  // Ceiling light
  object "CeilingLight" {
    geometry: "sphere"
    color: "#ffffff"
    position: [0, 4.8, 0]
    scale: [0.3, 0.3, 0.3]
    opacity: 0.8
  }
}`,
  },

  // ── Forest ──
  {
    id: 'forest',
    name: 'Enchanted Forest',
    description: 'A lush forest clearing with trees, mushrooms, grass patches, and a glowing crystal centerpiece.',
    category: 'nature',
    difficulty: 'beginner',
    tags: ['nature', 'forest', 'outdoor', 'trees', 'fantasy'],
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect fill="#0a2a0a" width="300" height="200"/><rect fill="#1a3a1a" x="0" y="130" width="300" height="70"/><polygon fill="#2d5a2d" points="60,130 80,50 100,130"/><polygon fill="#2d5a2d" points="140,130 170,30 200,130"/><polygon fill="#2d5a2d" points="220,130 240,60 260,130"/><circle fill="#00ffaa" cx="150" cy="110" r="10" opacity="0.6"/><text x="150" y="180" text-anchor="middle" fill="#44ff44" font-size="14">Enchanted Forest</text></svg>'),
    author: 'HoloLand',
    objectCount: 18,
    networked: false,
    physics: false,
    hasAI: false,
    createdAt: '2026-03-01',
    code: `composition "Enchanted Forest" {
  environment {
    skybox: "forest"
    ambient_light: 0.3
    grid: false
  }

  // Ground
  object "Ground" {
    geometry: "plane"
    color: "#2d5a2d"
    position: [0, 0, 0]
    rotation: [-90, 0, 0]
    scale: [30, 30, 1]
  }

  // Trees
  object "Tree1_Trunk" {
    geometry: "cylinder"
    color: "#5D4037"
    position: [-4, 1.5, -6]
    scale: [0.5, 3, 0.5]
  }

  object "Tree1_Canopy" {
    geometry: "sphere"
    color: "#2E7D32"
    position: [-4, 4, -6]
    scale: [2.5, 2.5, 2.5]
  }

  object "Tree2_Trunk" {
    geometry: "cylinder"
    color: "#5D4037"
    position: [5, 1, -4]
    scale: [0.4, 2, 0.4]
  }

  object "Tree2_Canopy" {
    geometry: "sphere"
    color: "#388E3C"
    position: [5, 3, -4]
    scale: [2, 2, 2]
  }

  object "Tree3_Trunk" {
    geometry: "cylinder"
    color: "#5D4037"
    position: [0, 1.5, -8]
    scale: [0.6, 3, 0.6]
  }

  object "Tree3_Canopy" {
    geometry: "cone"
    color: "#1B5E20"
    position: [0, 5, -8]
    scale: [3, 4, 3]
  }

  // Mushroom cluster
  object "Mushroom1_Stem" {
    geometry: "cylinder"
    color: "#F5DEB3"
    position: [2, 0.15, -2]
    scale: [0.15, 0.3, 0.15]
  }

  object "Mushroom1_Cap" {
    geometry: "sphere"
    color: "#DC143C"
    position: [2, 0.35, -2]
    scale: [0.4, 0.2, 0.4]
  }

  object "Mushroom2_Stem" {
    geometry: "cylinder"
    color: "#F5DEB3"
    position: [2.5, 0.1, -1.8]
    scale: [0.1, 0.2, 0.1]
  }

  object "Mushroom2_Cap" {
    geometry: "sphere"
    color: "#DC143C"
    position: [2.5, 0.25, -1.8]
    scale: [0.25, 0.12, 0.25]
  }

  // Glowing crystal
  object "Crystal" {
    geometry: "octahedron"
    color: "#00ffaa"
    position: [0, 0.8, -3]
    scale: [0.5, 0.8, 0.5]
    opacity: 0.8
  }

  // Rocks
  object "Rock1" {
    geometry: "dodecahedron"
    color: "#666666"
    position: [-2, 0.3, -1]
    scale: [0.6, 0.4, 0.5]
  }

  object "Rock2" {
    geometry: "dodecahedron"
    color: "#555555"
    position: [3, 0.2, -5]
    scale: [0.8, 0.5, 0.7]
  }

  // Grass patches (small green planes)
  object "Grass1" {
    geometry: "plane"
    color: "#4CAF50"
    position: [-1, 0.01, -2]
    rotation: [-90, 0, 0]
    scale: [2, 2, 1]
  }

  object "Grass2" {
    geometry: "plane"
    color: "#66BB6A"
    position: [3, 0.01, 0]
    rotation: [-90, 0, 0]
    scale: [1.5, 1.5, 1]
  }

  // Fireflies (glowing orbs)
  object "Firefly1" {
    geometry: "sphere"
    color: "#FFFF00"
    position: [-1, 1.5, -3]
    scale: [0.05, 0.05, 0.05]
    opacity: 0.8
  }

  object "Firefly2" {
    geometry: "sphere"
    color: "#FFFF00"
    position: [1, 2, -5]
    scale: [0.05, 0.05, 0.05]
    opacity: 0.8
  }
}`,
  },

  // ── City Block ──
  {
    id: 'city-block',
    name: 'City Block',
    description: 'An urban environment with buildings, a street, sidewalks, streetlights, and a park area.',
    category: 'environment',
    difficulty: 'intermediate',
    tags: ['urban', 'city', 'buildings', 'street', 'outdoor'],
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect fill="#1a1a2e" width="300" height="200"/><rect fill="#555" x="0" y="140" width="300" height="60"/><rect fill="#666" x="20" y="40" width="50" height="100"/><rect fill="#777" x="80" y="60" width="40" height="80"/><rect fill="#666" x="140" y="30" width="60" height="110"/><rect fill="#777" x="220" y="50" width="50" height="90"/><rect fill="#333" x="0" y="140" width="300" height="10"/><text x="150" y="180" text-anchor="middle" fill="#00d4ff" font-size="14">City Block</text></svg>'),
    author: 'HoloLand',
    objectCount: 16,
    networked: false,
    physics: false,
    hasAI: false,
    createdAt: '2026-03-01',
    code: `composition "City Block" {
  environment {
    skybox: "default"
    ambient_light: 0.4
    grid: false
  }

  // Street
  object "Street" {
    geometry: "plane"
    color: "#333333"
    position: [0, 0, 0]
    rotation: [-90, 0, 0]
    scale: [30, 30, 1]
  }

  // Sidewalk left
  object "SidewalkLeft" {
    geometry: "box"
    color: "#888888"
    position: [-8, 0.05, 0]
    scale: [4, 0.1, 30]
  }

  // Sidewalk right
  object "SidewalkRight" {
    geometry: "box"
    color: "#888888"
    position: [8, 0.05, 0]
    scale: [4, 0.1, 30]
  }

  // Building 1 - Tall office
  object "Building1" {
    geometry: "box"
    color: "#4a6fa5"
    position: [-12, 6, -5]
    scale: [5, 12, 6]
  }

  // Building 2 - Short shop
  object "Building2" {
    geometry: "box"
    color: "#8B6914"
    position: [-12, 2, 4]
    scale: [5, 4, 5]
  }

  // Building 3 - Apartment
  object "Building3" {
    geometry: "box"
    color: "#6B4226"
    position: [12, 4, -3]
    scale: [5, 8, 7]
  }

  // Building 4 - Glass tower
  object "Building4" {
    geometry: "box"
    color: "#5599bb"
    position: [12, 8, 6]
    scale: [5, 16, 5]
    opacity: 0.9
  }

  // Streetlight 1
  object "StreetlightPole1" {
    geometry: "cylinder"
    color: "#444444"
    position: [-6, 2, -4]
    scale: [0.1, 4, 0.1]
  }

  object "StreetlightBulb1" {
    geometry: "sphere"
    color: "#FFD700"
    position: [-6, 4.2, -4]
    scale: [0.3, 0.3, 0.3]
  }

  // Streetlight 2
  object "StreetlightPole2" {
    geometry: "cylinder"
    color: "#444444"
    position: [6, 2, 3]
    scale: [0.1, 4, 0.1]
  }

  object "StreetlightBulb2" {
    geometry: "sphere"
    color: "#FFD700"
    position: [6, 4.2, 3]
    scale: [0.3, 0.3, 0.3]
  }

  // Park bench
  object "BenchSeat" {
    geometry: "box"
    color: "#8B4513"
    position: [6, 0.4, -6]
    scale: [2, 0.1, 0.5]
  }

  object "BenchBack" {
    geometry: "box"
    color: "#8B4513"
    position: [6, 0.7, -6.2]
    scale: [2, 0.5, 0.05]
  }

  // Tree in park area
  object "ParkTreeTrunk" {
    geometry: "cylinder"
    color: "#5D4037"
    position: [4, 1, -8]
    scale: [0.3, 2, 0.3]
  }

  object "ParkTreeCanopy" {
    geometry: "sphere"
    color: "#2E7D32"
    position: [4, 3, -8]
    scale: [2, 2, 2]
  }
}`,
  },

  // ── Gallery ──
  {
    id: 'gallery',
    name: 'Art Gallery',
    description: 'A clean art gallery space with display walls, pedestals, spotlights, and frames ready for artwork.',
    category: 'art',
    difficulty: 'beginner',
    tags: ['gallery', 'art', 'museum', 'indoor', 'display'],
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect fill="#f0f0f0" width="300" height="200"/><rect fill="#fff" x="30" y="30" width="60" height="80" stroke="#ccc"/><rect fill="#fff" x="120" y="40" width="60" height="60" stroke="#ccc"/><rect fill="#fff" x="210" y="30" width="60" height="80" stroke="#ccc"/><rect fill="#ddd" x="0" y="150" width="300" height="50"/><text x="150" y="180" text-anchor="middle" fill="#333" font-size="14">Art Gallery</text></svg>'),
    author: 'HoloLand',
    objectCount: 15,
    networked: false,
    physics: false,
    hasAI: false,
    createdAt: '2026-03-01',
    code: `composition "Art Gallery" {
  environment {
    skybox: "default"
    ambient_light: 0.3
    grid: false
  }

  // Floor - polished concrete
  object "Floor" {
    geometry: "plane"
    color: "#d0d0d0"
    position: [0, 0, 0]
    rotation: [-90, 0, 0]
    scale: [16, 20, 1]
  }

  // Ceiling
  object "Ceiling" {
    geometry: "plane"
    color: "#ffffff"
    position: [0, 4, 0]
    rotation: [90, 0, 0]
    scale: [16, 20, 1]
  }

  // Back wall
  object "BackWall" {
    geometry: "plane"
    color: "#f5f5f5"
    position: [0, 2, -10]
    scale: [16, 4, 1]
  }

  // Left wall
  object "LeftWall" {
    geometry: "plane"
    color: "#f0f0f0"
    position: [-8, 2, 0]
    rotation: [0, 90, 0]
    scale: [20, 4, 1]
  }

  // Right wall
  object "RightWall" {
    geometry: "plane"
    color: "#f0f0f0"
    position: [8, 2, 0]
    rotation: [0, -90, 0]
    scale: [20, 4, 1]
  }

  // Picture frame 1 (on back wall)
  object "Frame1" {
    geometry: "box"
    color: "#8B4513"
    position: [-4, 2, -9.9]
    scale: [2.2, 1.7, 0.1]
  }

  object "Canvas1" {
    geometry: "plane"
    color: "#4a90d9"
    position: [-4, 2, -9.85]
    scale: [2, 1.5, 1]
  }

  // Picture frame 2 (on back wall)
  object "Frame2" {
    geometry: "box"
    color: "#8B4513"
    position: [0, 2.2, -9.9]
    scale: [1.7, 2.2, 0.1]
  }

  object "Canvas2" {
    geometry: "plane"
    color: "#d94a4a"
    position: [0, 2.2, -9.85]
    scale: [1.5, 2, 1]
  }

  // Picture frame 3 (on back wall)
  object "Frame3" {
    geometry: "box"
    color: "#8B4513"
    position: [4, 2, -9.9]
    scale: [2.2, 1.7, 0.1]
  }

  object "Canvas3" {
    geometry: "plane"
    color: "#4ad97a"
    position: [4, 2, -9.85]
    scale: [2, 1.5, 1]
  }

  // Pedestal 1
  object "Pedestal1" {
    geometry: "cylinder"
    color: "#ffffff"
    position: [-3, 0.5, -5]
    scale: [0.5, 1, 0.5]
  }

  // Sculpture on pedestal
  object "Sculpture1" {
    geometry: "icosahedron"
    color: "#FFD700"
    position: [-3, 1.3, -5]
    scale: [0.4, 0.4, 0.4]
  }

  // Pedestal 2
  object "Pedestal2" {
    geometry: "cylinder"
    color: "#ffffff"
    position: [3, 0.5, -5]
    scale: [0.5, 1, 0.5]
  }

  // Sculpture on pedestal 2
  object "Sculpture2" {
    geometry: "dodecahedron"
    color: "#C0C0C0"
    position: [3, 1.3, -5]
    scale: [0.35, 0.35, 0.35]
  }
}`,
  },

  // ── Game Arena ──
  {
    id: 'game-arena',
    name: 'Game Arena',
    description: 'A competitive PvP arena with spawn platforms, obstacle barriers, power-up pedestals, and a scoring zone.',
    category: 'game',
    difficulty: 'intermediate',
    tags: ['game', 'arena', 'pvp', 'competitive', 'multiplayer'],
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect fill="#1a0a2e" width="300" height="200"/><circle fill="none" stroke="#ff4444" cx="150" cy="100" r="70" stroke-width="2"/><circle fill="none" stroke="#4444ff" cx="150" cy="100" r="40" stroke-width="2"/><rect fill="#333" x="60" y="80" width="20" height="40" rx="3"/><rect fill="#333" x="220" y="80" width="20" height="40" rx="3"/><circle fill="#ffaa00" cx="150" cy="100" r="8"/><text x="150" y="190" text-anchor="middle" fill="#ff4444" font-size="14">Game Arena</text></svg>'),
    author: 'HoloLand',
    objectCount: 20,
    networked: true,
    physics: true,
    hasAI: false,
    createdAt: '2026-03-01',
    code: `composition "Game Arena" {
  environment {
    skybox: "nebula"
    ambient_light: 0.3
    grid: false
  }

  // Arena floor
  object "ArenaFloor" {
    geometry: "plane"
    color: "#1a1a2e"
    position: [0, 0, 0]
    rotation: [-90, 0, 0]
    scale: [25, 25, 1]
  }

  // Arena boundary ring
  object "BoundaryRing" {
    geometry: "torus"
    color: "#ff4444"
    position: [0, 0.1, 0]
    rotation: [90, 0, 0]
    scale: [10, 10, 0.3]
    opacity: 0.5
  }

  // Center scoring zone
  object "CenterZone" {
    geometry: "cylinder"
    color: "#FFD700"
    position: [0, 0.02, 0]
    scale: [2, 0.04, 2]
    opacity: 0.6
  }

  // Spawn platform - Team A (Red)
  object "SpawnA" {
    geometry: "cylinder"
    color: "#ff4444"
    position: [-8, 0.1, 0]
    scale: [2, 0.2, 2]
  }

  object "SpawnA_Marker" {
    geometry: "cone"
    color: "#ff6666"
    position: [-8, 1.5, 0]
    scale: [0.3, 0.5, 0.3]
  }

  // Spawn platform - Team B (Blue)
  object "SpawnB" {
    geometry: "cylinder"
    color: "#4444ff"
    position: [8, 0.1, 0]
    scale: [2, 0.2, 2]
  }

  object "SpawnB_Marker" {
    geometry: "cone"
    color: "#6666ff"
    position: [8, 1.5, 0]
    scale: [0.3, 0.5, 0.3]
  }

  // Obstacle barriers
  object "Barrier1" {
    geometry: "box"
    color: "#444466"
    position: [-3, 0.75, -3]
    scale: [3, 1.5, 0.5]
  }

  object "Barrier2" {
    geometry: "box"
    color: "#444466"
    position: [3, 0.75, 3]
    scale: [3, 1.5, 0.5]
  }

  object "Barrier3" {
    geometry: "box"
    color: "#444466"
    position: [0, 0.75, 5]
    scale: [0.5, 1.5, 3]
  }

  object "Barrier4" {
    geometry: "box"
    color: "#444466"
    position: [0, 0.75, -5]
    scale: [0.5, 1.5, 3]
  }

  // Column obstacles
  object "Column1" {
    geometry: "cylinder"
    color: "#555577"
    position: [-5, 1, -5]
    scale: [0.5, 2, 0.5]
  }

  object "Column2" {
    geometry: "cylinder"
    color: "#555577"
    position: [5, 1, -5]
    scale: [0.5, 2, 0.5]
  }

  object "Column3" {
    geometry: "cylinder"
    color: "#555577"
    position: [-5, 1, 5]
    scale: [0.5, 2, 0.5]
  }

  object "Column4" {
    geometry: "cylinder"
    color: "#555577"
    position: [5, 1, 5]
    scale: [0.5, 2, 0.5]
  }

  // Power-up pedestals
  object "PowerUp1_Pedestal" {
    geometry: "cylinder"
    color: "#333355"
    position: [-3, 0.3, 0]
    scale: [0.4, 0.6, 0.4]
  }

  object "PowerUp1_Orb" {
    geometry: "sphere"
    color: "#00ff88"
    position: [-3, 0.9, 0]
    scale: [0.3, 0.3, 0.3]
    opacity: 0.8
  }

  object "PowerUp2_Pedestal" {
    geometry: "cylinder"
    color: "#333355"
    position: [3, 0.3, 0]
    scale: [0.4, 0.6, 0.4]
  }

  object "PowerUp2_Orb" {
    geometry: "sphere"
    color: "#ff8800"
    position: [3, 0.9, 0]
    scale: [0.3, 0.3, 0.3]
    opacity: 0.8
  }
}`,
  },

  // ── Living Room ──
  {
    id: 'living-room',
    name: 'Cozy Living Room',
    description: 'A warm residential living room with a sofa, coffee table, bookshelf, and fireplace.',
    category: 'social',
    difficulty: 'beginner',
    tags: ['interior', 'home', 'social', 'cozy', 'indoor'],
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect fill="#2a1a0e" width="300" height="200"/><rect fill="#8B4513" x="0" y="150" width="300" height="50"/><rect fill="#654321" x="90" y="100" width="120" height="50" rx="5"/><rect fill="#444" x="120" y="130" width="60" height="20"/><rect fill="#ff6600" x="130" y="60" width="40" height="40" opacity="0.5"/><text x="150" y="185" text-anchor="middle" fill="#ffcc88" font-size="14">Cozy Living Room</text></svg>'),
    author: 'HoloLand',
    objectCount: 14,
    networked: false,
    physics: false,
    hasAI: false,
    createdAt: '2026-03-01',
    code: `composition "Cozy Living Room" {
  environment {
    skybox: "default"
    ambient_light: 0.5
    grid: false
  }

  // Floor - wood
  object "Floor" {
    geometry: "plane"
    color: "#8B5A2B"
    position: [0, 0, 0]
    rotation: [-90, 0, 0]
    scale: [8, 8, 1]
  }

  // Walls
  object "BackWall" {
    geometry: "plane"
    color: "#E8D5B7"
    position: [0, 1.5, -4]
    scale: [8, 3, 1]
  }

  object "LeftWall" {
    geometry: "plane"
    color: "#E8D5B7"
    position: [-4, 1.5, 0]
    rotation: [0, 90, 0]
    scale: [8, 3, 1]
  }

  // Sofa base
  object "SofaBase" {
    geometry: "box"
    color: "#654321"
    position: [0, 0.3, -3]
    scale: [3, 0.6, 1]
  }

  // Sofa back
  object "SofaBack" {
    geometry: "box"
    color: "#654321"
    position: [0, 0.7, -3.4]
    scale: [3, 0.5, 0.2]
  }

  // Sofa cushions
  object "Cushion1" {
    geometry: "box"
    color: "#8B6914"
    position: [-0.7, 0.55, -3]
    scale: [1.2, 0.2, 0.8]
  }

  object "Cushion2" {
    geometry: "box"
    color: "#8B6914"
    position: [0.7, 0.55, -3]
    scale: [1.2, 0.2, 0.8]
  }

  // Coffee table
  object "CoffeeTable" {
    geometry: "box"
    color: "#5C4033"
    position: [0, 0.3, -1.5]
    scale: [1.5, 0.05, 0.8]
  }

  object "CoffeeTableLeg1" {
    geometry: "cylinder"
    color: "#5C4033"
    position: [-0.6, 0.15, -1.2]
    scale: [0.05, 0.3, 0.05]
  }

  object "CoffeeTableLeg2" {
    geometry: "cylinder"
    color: "#5C4033"
    position: [0.6, 0.15, -1.2]
    scale: [0.05, 0.3, 0.05]
  }

  // Bookshelf
  object "Bookshelf" {
    geometry: "box"
    color: "#5C4033"
    position: [-3.8, 1, -2]
    scale: [0.4, 2, 1.5]
  }

  // Fireplace
  object "FireplaceMantel" {
    geometry: "box"
    color: "#8B7355"
    position: [0, 1.2, -3.9]
    scale: [2, 0.15, 0.5]
  }

  object "FireplaceOpening" {
    geometry: "box"
    color: "#1a1a1a"
    position: [0, 0.5, -3.85]
    scale: [1.2, 0.9, 0.3]
  }

  // Rug
  object "Rug" {
    geometry: "plane"
    color: "#8B0000"
    position: [0, 0.01, -2]
    rotation: [-90, 0, 0]
    scale: [3, 2.5, 1]
  }
}`,
  },

  // ── Space Station ──
  {
    id: 'space-station',
    name: 'Space Station',
    description: 'A sci-fi space station corridor with metal walls, viewing windows, control panels, and holographic displays.',
    category: 'scifi',
    difficulty: 'intermediate',
    tags: ['scifi', 'space', 'station', 'futuristic', 'indoor'],
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect fill="#0a0a1a" width="300" height="200"/><rect fill="#1a2a3a" x="30" y="30" width="240" height="140" rx="5"/><rect fill="#0a1a2a" x="50" y="50" width="200" height="100"/><line x1="50" y1="100" x2="250" y2="100" stroke="#00d4ff" stroke-width="1" opacity="0.3"/><line x1="150" y1="50" x2="150" y2="150" stroke="#00d4ff" stroke-width="1" opacity="0.3"/><circle fill="#00d4ff" cx="150" cy="100" r="3" opacity="0.5"/><text x="150" y="185" text-anchor="middle" fill="#00d4ff" font-size="14">Space Station</text></svg>'),
    author: 'HoloLand',
    objectCount: 16,
    networked: true,
    physics: false,
    hasAI: false,
    createdAt: '2026-03-01',
    code: `composition "Space Station" {
  environment {
    skybox: "nebula"
    ambient_light: 0.2
    grid: false
  }

  // Corridor floor
  object "Floor" {
    geometry: "plane"
    color: "#2a2a3a"
    position: [0, 0, 0]
    rotation: [-90, 0, 0]
    scale: [6, 20, 1]
  }

  // Ceiling
  object "Ceiling" {
    geometry: "plane"
    color: "#1a1a2a"
    position: [0, 3, 0]
    rotation: [90, 0, 0]
    scale: [6, 20, 1]
  }

  // Left wall
  object "LeftWall" {
    geometry: "plane"
    color: "#2a3a4a"
    position: [-3, 1.5, 0]
    rotation: [0, 90, 0]
    scale: [20, 3, 1]
  }

  // Right wall
  object "RightWall" {
    geometry: "plane"
    color: "#2a3a4a"
    position: [3, 1.5, 0]
    rotation: [0, -90, 0]
    scale: [20, 3, 1]
  }

  // Viewing window (transparent)
  object "ViewWindow" {
    geometry: "plane"
    color: "#0044aa"
    position: [2.99, 1.5, -4]
    rotation: [0, -90, 0]
    scale: [4, 2, 1]
    opacity: 0.3
  }

  // Floor lighting strips
  object "FloorStrip1" {
    geometry: "box"
    color: "#00d4ff"
    position: [-2.5, 0.01, 0]
    scale: [0.1, 0.02, 20]
    opacity: 0.6
  }

  object "FloorStrip2" {
    geometry: "box"
    color: "#00d4ff"
    position: [2.5, 0.01, 0]
    scale: [0.1, 0.02, 20]
    opacity: 0.6
  }

  // Control panel 1
  object "ControlPanel1" {
    geometry: "box"
    color: "#1a2a3a"
    position: [-2.8, 1, -2]
    scale: [0.3, 0.8, 1.5]
  }

  object "PanelScreen1" {
    geometry: "plane"
    color: "#00aa44"
    position: [-2.64, 1.1, -2]
    rotation: [0, 90, 0]
    scale: [1.3, 0.5, 1]
    opacity: 0.7
  }

  // Control panel 2
  object "ControlPanel2" {
    geometry: "box"
    color: "#1a2a3a"
    position: [-2.8, 1, 3]
    scale: [0.3, 0.8, 1.5]
  }

  object "PanelScreen2" {
    geometry: "plane"
    color: "#00aaff"
    position: [-2.64, 1.1, 3]
    rotation: [0, 90, 0]
    scale: [1.3, 0.5, 1]
    opacity: 0.7
  }

  // Holographic display (center)
  object "HoloBase" {
    geometry: "cylinder"
    color: "#333355"
    position: [0, 0.2, 0]
    scale: [0.6, 0.4, 0.6]
  }

  object "HoloDisplay" {
    geometry: "octahedron"
    color: "#00d4ff"
    position: [0, 1.2, 0]
    scale: [0.4, 0.6, 0.4]
    opacity: 0.5
  }

  // Door frame
  object "DoorFrame" {
    geometry: "box"
    color: "#444466"
    position: [0, 1.5, -10]
    scale: [2.5, 3, 0.2]
  }

  object "DoorOpening" {
    geometry: "box"
    color: "#0a0a1a"
    position: [0, 1.2, -10]
    scale: [1.5, 2.4, 0.3]
  }

  // Ceiling light panels
  object "CeilingLight1" {
    geometry: "plane"
    color: "#ffffff"
    position: [0, 2.99, -3]
    rotation: [90, 0, 0]
    scale: [1, 0.3, 1]
    opacity: 0.6
  }

  object "CeilingLight2" {
    geometry: "plane"
    color: "#ffffff"
    position: [0, 2.99, 3]
    rotation: [90, 0, 0]
    scale: [1, 0.3, 1]
    opacity: 0.6
  }
}`,
  },

  // ── Underwater ──
  {
    id: 'underwater',
    name: 'Underwater World',
    description: 'An oceanic scene with coral, seaweed, fish schools, bubbles, and a sunken treasure chest.',
    category: 'nature',
    difficulty: 'intermediate',
    tags: ['ocean', 'underwater', 'coral', 'fish', 'nature'],
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect fill="#0a2a4a" width="300" height="200"/><ellipse fill="#ff6633" cx="80" cy="150" rx="30" ry="15"/><ellipse fill="#ff3366" cx="200" cy="140" rx="25" ry="20"/><circle fill="#aaddff" cx="100" cy="60" r="5" opacity="0.5"/><circle fill="#aaddff" cx="180" cy="40" r="3" opacity="0.5"/><circle fill="#aaddff" cx="220" cy="80" r="4" opacity="0.5"/><rect fill="#2a1a00" x="0" y="170" width="300" height="30"/><text x="150" y="195" text-anchor="middle" fill="#00aaff" font-size="14">Underwater World</text></svg>'),
    author: 'HoloLand',
    objectCount: 18,
    networked: false,
    physics: false,
    hasAI: false,
    createdAt: '2026-03-01',
    code: `composition "Underwater World" {
  environment {
    skybox: "ocean"
    ambient_light: 0.25
    grid: false
  }

  // Ocean floor
  object "OceanFloor" {
    geometry: "plane"
    color: "#2a1a00"
    position: [0, 0, 0]
    rotation: [-90, 0, 0]
    scale: [30, 30, 1]
  }

  // Coral formations
  object "Coral1" {
    geometry: "cone"
    color: "#FF6347"
    position: [-3, 0.8, -4]
    scale: [0.8, 1.6, 0.8]
  }

  object "Coral2" {
    geometry: "sphere"
    color: "#FF69B4"
    position: [-4, 0.5, -3]
    scale: [1, 1, 0.8]
  }

  object "Coral3" {
    geometry: "cone"
    color: "#FF4500"
    position: [4, 0.6, -5]
    scale: [0.6, 1.2, 0.6]
  }

  object "Coral4" {
    geometry: "sphere"
    color: "#DA70D6"
    position: [5, 0.4, -3]
    scale: [0.8, 0.8, 0.6]
  }

  // Seaweed
  object "Seaweed1" {
    geometry: "cylinder"
    color: "#228B22"
    position: [-2, 1, -6]
    scale: [0.1, 2, 0.1]
  }

  object "Seaweed2" {
    geometry: "cylinder"
    color: "#006400"
    position: [-1.5, 0.8, -5.5]
    scale: [0.1, 1.6, 0.1]
  }

  object "Seaweed3" {
    geometry: "cylinder"
    color: "#228B22"
    position: [3, 1.2, -7]
    scale: [0.1, 2.4, 0.1]
  }

  // Rocks
  object "Rock1" {
    geometry: "dodecahedron"
    color: "#555544"
    position: [1, 0.4, -4]
    scale: [1, 0.6, 0.8]
  }

  object "Rock2" {
    geometry: "dodecahedron"
    color: "#444433"
    position: [-5, 0.3, -6]
    scale: [1.2, 0.5, 1]
  }

  // Fish (simple shapes)
  object "Fish1" {
    geometry: "sphere"
    color: "#FFD700"
    position: [2, 3, -3]
    scale: [0.3, 0.15, 0.1]
  }

  object "Fish2" {
    geometry: "sphere"
    color: "#FF6347"
    position: [-1, 4, -5]
    scale: [0.25, 0.12, 0.08]
  }

  object "Fish3" {
    geometry: "sphere"
    color: "#00CED1"
    position: [3, 2.5, -6]
    scale: [0.2, 0.1, 0.08]
  }

  // Bubbles
  object "Bubble1" {
    geometry: "sphere"
    color: "#aaddff"
    position: [0, 2, -4]
    scale: [0.15, 0.15, 0.15]
    opacity: 0.3
  }

  object "Bubble2" {
    geometry: "sphere"
    color: "#aaddff"
    position: [-2, 3.5, -3]
    scale: [0.1, 0.1, 0.1]
    opacity: 0.3
  }

  object "Bubble3" {
    geometry: "sphere"
    color: "#aaddff"
    position: [1, 5, -5]
    scale: [0.2, 0.2, 0.2]
    opacity: 0.3
  }

  // Treasure chest
  object "TreasureBase" {
    geometry: "box"
    color: "#8B4513"
    position: [0, 0.2, -8]
    scale: [0.8, 0.4, 0.5]
  }

  object "TreasureLid" {
    geometry: "box"
    color: "#A0522D"
    position: [0, 0.45, -8]
    scale: [0.85, 0.15, 0.55]
  }
}`,
  },
];

// --------------------------------------------------------------------------
// Template Gallery Class
// --------------------------------------------------------------------------

/**
 * Template Gallery
 *
 * Manages the collection of starter scene templates.
 * Supports filtering, searching, and custom template registration.
 */
export class TemplateGallery {
  private templates: Map<string, SceneTemplate> = new Map();

  constructor() {
    // Load built-in templates
    for (const template of STARTER_TEMPLATES) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Get all templates
   */
  getAll(): SceneTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get a template by ID
   */
  get(id: string): SceneTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Filter templates by criteria
   */
  filter(filter: TemplateFilter): SceneTemplate[] {
    let results = this.getAll();

    if (filter.category) {
      results = results.filter(t => t.category === filter.category);
    }

    if (filter.difficulty) {
      results = results.filter(t => t.difficulty === filter.difficulty);
    }

    if (filter.networked !== undefined) {
      results = results.filter(t => t.networked === filter.networked);
    }

    if (filter.physics !== undefined) {
      results = results.filter(t => t.physics === filter.physics);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(t =>
        filter.tags!.some(tag => t.tags.includes(tag)),
      );
    }

    if (filter.search) {
      const search = filter.search.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.tags.some(tag => tag.toLowerCase().includes(search)),
      );
    }

    return results;
  }

  /**
   * Get all available categories
   */
  getCategories(): TemplateCategory[] {
    const categories = new Set<TemplateCategory>();
    for (const template of this.templates.values()) {
      categories.add(template.category);
    }
    return Array.from(categories);
  }

  /**
   * Register a custom template
   */
  register(template: SceneTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Remove a template
   */
  remove(id: string): boolean {
    return this.templates.delete(id);
  }

  /**
   * Get template count
   */
  get count(): number {
    return this.templates.size;
  }
}
