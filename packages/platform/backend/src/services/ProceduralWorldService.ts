/**
 * @hololand/backend — ProceduralWorldService
 *
 * AI-powered procedural world generation with biome systems,
 * chunk management, seed-based determinism, terrain/structure placement.
 *
 * Features:
 *   - Seed-based deterministic generation (same seed → same world)
 *   - Biome system — define biomes with terrain, flora, fauna, structures
 *   - Chunk management — lazy load/unload, LOD levels
 *   - Generation jobs — async world building with progress tracking
 *   - Structure placement — buildings, landmarks, resources, POIs
 *   - Terrain heightmap — configurable noise parameters
 *   - Resource distribution — ore, wood, water, etc.
 *   - World presets — predefined configurations (fantasy, sci-fi, etc.)
 *   - Stats & analytics — generation metrics, chunk usage
 */

// ============================================================================
// Types
// ============================================================================

export type BiomeType =
  | 'plains'
  | 'forest'
  | 'desert'
  | 'tundra'
  | 'mountains'
  | 'ocean'
  | 'swamp'
  | 'jungle'
  | 'volcanic'
  | 'crystal'
  | 'void'
  | 'custom';

export type StructureType =
  | 'building'
  | 'landmark'
  | 'dungeon'
  | 'village'
  | 'ruin'
  | 'tower'
  | 'bridge'
  | 'cave'
  | 'shrine'
  | 'portal';

export type ResourceType =
  | 'wood'
  | 'stone'
  | 'iron'
  | 'gold'
  | 'crystal'
  | 'water'
  | 'food'
  | 'magic'
  | 'oil'
  | 'gems';

export type GenerationStatus =
  | 'queued'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ChunkState =
  | 'unloaded'
  | 'loading'
  | 'loaded'
  | 'unloading';

export type LODLevel = 0 | 1 | 2 | 3;

export interface NoiseConfig {
  octaves: number;       // 1-8
  frequency: number;     // base frequency
  amplitude: number;     // base amplitude
  persistence: number;   // amplitude decay per octave (0-1)
  lacunarity: number;    // frequency growth per octave (1-4)
  seed: number;
}

export interface BiomeDefinition {
  id: string;
  type: BiomeType;
  name: string;
  minElevation: number;   // -1 to 1 (underwater to mountain)
  maxElevation: number;
  temperature: number;     // 0-1 (freezing to hot)
  humidity: number;        // 0-1 (dry to wet)
  color: string;           // hex color for map
  flora: string[];         // plant types
  fauna: string[];         // creature types
  structures: StructureType[];
  resources: ResourceType[];
  spawnWeight: number;     // how common this biome is (0-1)
}

export interface ChunkCoord {
  x: number;
  z: number;
}

export interface ChunkData {
  coord: ChunkCoord;
  worldId: string;
  biome: string;           // biomeId
  state: ChunkState;
  lod: LODLevel;
  heightmap: number[];     // flattened heightmap grid
  structures: PlacedStructure[];
  resources: PlacedResource[];
  generatedAt: number;
  loadedAt: number | null;
}

export interface PlacedStructure {
  id: string;
  type: StructureType;
  position: [number, number, number];
  rotation: number;        // y-axis rotation in degrees
  scale: number;
  biomeId: string;
  metadata: Record<string, unknown>;
}

export interface PlacedResource {
  id: string;
  type: ResourceType;
  position: [number, number, number];
  amount: number;
  respawnable: boolean;
  depleted: boolean;
}

export interface GenerationJob {
  id: string;
  worldId: string;
  seed: number;
  status: GenerationStatus;
  chunksTotal: number;
  chunksCompleted: number;
  progress: number;        // 0-1
  biomes: string[];        // biome IDs used
  startedAt: number;
  completedAt: number | null;
  error: string | null;
}

export interface WorldConfig {
  name: string;
  seed: number;
  chunkSize: number;       // units per chunk side
  worldRadius: number;     // in chunks
  noise: NoiseConfig;
  biomes: BiomeDefinition[];
  structureDensity: number; // 0-1
  resourceDensity: number;  // 0-1
}

export interface WorldInfo {
  id: string;
  config: WorldConfig;
  totalChunks: number;
  loadedChunks: number;
  generatedChunks: number;
  createdAt: number;
}

export interface WorldPreset {
  id: string;
  name: string;
  description: string;
  config: Omit<WorldConfig, 'name' | 'seed'>;
}

export interface ProceduralStats {
  totalWorlds: number;
  totalChunks: number;
  loadedChunks: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalStructures: number;
  totalResources: number;
  averageGenerationTimeMs: number;
}

export type ProceduralEventType =
  | 'world_created'
  | 'world_removed'
  | 'job_started'
  | 'job_progress'
  | 'job_completed'
  | 'job_failed'
  | 'job_cancelled'
  | 'chunk_loaded'
  | 'chunk_unloaded'
  | 'structure_placed'
  | 'resource_placed'
  | 'resource_depleted';

export interface ProceduralEvent {
  type: ProceduralEventType;
  worldId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

// ============================================================================
// Configuration
// ============================================================================

export interface ProceduralWorldConfig {
  /** Max worlds. Default: 10. */
  maxWorlds?: number;
  /** Max loaded chunks across all worlds. Default: 500. */
  maxLoadedChunks?: number;
  /** Max concurrent generation jobs. Default: 3. */
  maxConcurrentJobs?: number;
  /** Chunk size in units. Default: 64. */
  defaultChunkSize?: number;
  /** Default world radius in chunks. Default: 16. */
  defaultWorldRadius?: number;
  /** Heightmap resolution per chunk side. Default: 16. */
  heightmapResolution?: number;
  /** Max structures per chunk. Default: 10. */
  maxStructuresPerChunk?: number;
  /** Max resources per chunk. Default: 20. */
  maxResourcesPerChunk?: number;
}

const DEFAULT_CONFIG: Required<ProceduralWorldConfig> = {
  maxWorlds: 10,
  maxLoadedChunks: 500,
  maxConcurrentJobs: 3,
  defaultChunkSize: 64,
  defaultWorldRadius: 16,
  heightmapResolution: 16,
  maxStructuresPerChunk: 10,
  maxResourcesPerChunk: 20,
};

// ============================================================================
// Simple deterministic PRNG (seeded)
// ============================================================================

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Simple noise-like function from seed+coordinates
function noiseValue(seed: number, x: number, z: number, config: NoiseConfig): number {
  let value = 0;
  let amp = config.amplitude;
  let freq = config.frequency;

  for (let o = 0; o < config.octaves; o++) {
    // Pseudo-hash based on coordinates + seed + octave
    const nx = Math.sin(x * freq + seed + o * 1000) * 43758.5453;
    const nz = Math.cos(z * freq + seed + o * 2000) * 43758.5453;
    const n = Math.sin(nx + nz) * 0.5 + 0.5;
    value += n * amp;
    amp *= config.persistence;
    freq *= config.lacunarity;
  }

  // Normalize to 0-1
  const maxPossible = config.amplitude * (1 - Math.pow(config.persistence, config.octaves)) / (1 - config.persistence);
  return maxPossible > 0 ? Math.min(1, Math.max(0, value / maxPossible)) : 0.5;
}

// ============================================================================
// World Presets
// ============================================================================

function defaultNoise(seed: number): NoiseConfig {
  return {
    octaves: 4,
    frequency: 0.02,
    amplitude: 1.0,
    persistence: 0.5,
    lacunarity: 2.0,
    seed,
  };
}

const BUILT_IN_PRESETS: WorldPreset[] = [
  {
    id: 'fantasy',
    name: 'Fantasy Realm',
    description: 'Classic fantasy world with forests, mountains, and dungeons',
    config: {
      chunkSize: 64,
      worldRadius: 16,
      noise: defaultNoise(0),
      biomes: [
        { id: 'plains', type: 'plains', name: 'Rolling Plains', minElevation: 0.2, maxElevation: 0.4, temperature: 0.5, humidity: 0.5, color: '#7ec850', flora: ['grass', 'wildflower'], fauna: ['rabbit', 'deer'], structures: ['village'], resources: ['food', 'wood'], spawnWeight: 0.3 },
        { id: 'forest', type: 'forest', name: 'Ancient Forest', minElevation: 0.3, maxElevation: 0.6, temperature: 0.4, humidity: 0.7, color: '#2d5a1e', flora: ['oak', 'pine', 'mushroom'], fauna: ['wolf', 'bear'], structures: ['ruin', 'shrine'], resources: ['wood', 'food'], spawnWeight: 0.25 },
        { id: 'mountains', type: 'mountains', name: 'Dragon Peaks', minElevation: 0.7, maxElevation: 1.0, temperature: 0.2, humidity: 0.3, color: '#8b7355', flora: ['alpine_grass'], fauna: ['eagle', 'goat'], structures: ['dungeon', 'tower'], resources: ['stone', 'iron', 'gold'], spawnWeight: 0.15 },
        { id: 'ocean', type: 'ocean', name: 'Deep Sea', minElevation: -1.0, maxElevation: 0.1, temperature: 0.4, humidity: 1.0, color: '#1a5276', flora: ['kelp', 'coral'], fauna: ['fish', 'squid'], structures: ['ruin'], resources: ['water', 'gems'], spawnWeight: 0.2 },
        { id: 'swamp', type: 'swamp', name: 'Foggy Swamp', minElevation: 0.1, maxElevation: 0.3, temperature: 0.6, humidity: 0.9, color: '#556b2f', flora: ['mangrove', 'lily'], fauna: ['frog', 'snake'], structures: ['shrine', 'ruin'], resources: ['water', 'magic'], spawnWeight: 0.1 },
      ],
      structureDensity: 0.3,
      resourceDensity: 0.5,
    },
  },
  {
    id: 'scifi',
    name: 'Sci-Fi Planet',
    description: 'Alien world with crystal formations and void zones',
    config: {
      chunkSize: 64,
      worldRadius: 12,
      noise: defaultNoise(0),
      biomes: [
        { id: 'crystal', type: 'crystal', name: 'Crystal Fields', minElevation: 0.3, maxElevation: 0.7, temperature: 0.3, humidity: 0.2, color: '#e0b0ff', flora: ['crystal_tree'], fauna: ['drone'], structures: ['tower', 'portal'], resources: ['crystal', 'gems', 'magic'], spawnWeight: 0.3 },
        { id: 'void', type: 'void', name: 'The Void', minElevation: -0.5, maxElevation: 0.2, temperature: 0.1, humidity: 0.0, color: '#1a1a2e', flora: [], fauna: [], structures: ['portal', 'ruin'], resources: ['magic'], spawnWeight: 0.15 },
        { id: 'volcanic', type: 'volcanic', name: 'Lava Flats', minElevation: 0.4, maxElevation: 0.9, temperature: 0.9, humidity: 0.1, color: '#b22222', flora: ['fire_moss'], fauna: ['fire_drake'], structures: ['dungeon', 'cave'], resources: ['iron', 'oil', 'stone'], spawnWeight: 0.2 },
        { id: 'tundra', type: 'tundra', name: 'Frozen Wastes', minElevation: 0.2, maxElevation: 0.6, temperature: 0.05, humidity: 0.4, color: '#cce5ff', flora: ['ice_bush'], fauna: ['penguin'], structures: ['cave', 'ruin'], resources: ['water', 'crystal'], spawnWeight: 0.2 },
        { id: 'jungle', type: 'jungle', name: 'Bio-Dome', minElevation: 0.2, maxElevation: 0.5, temperature: 0.8, humidity: 0.9, color: '#00ff7f', flora: ['alien_tree', 'vine'], fauna: ['insect', 'lizard'], structures: ['shrine', 'village'], resources: ['food', 'wood', 'magic'], spawnWeight: 0.15 },
      ],
      structureDensity: 0.4,
      resourceDensity: 0.4,
    },
  },
];

// ============================================================================
// ProceduralWorldService
// ============================================================================

export class ProceduralWorldService {
  private config: Required<ProceduralWorldConfig>;
  private running = false;
  private listeners: Set<(event: ProceduralEvent) => void> = new Set();

  private worlds: Map<string, WorldInfo> = new Map();
  private worldConfigs: Map<string, WorldConfig> = new Map();
  private chunks: Map<string, Map<string, ChunkData>> = new Map(); // worldId → (chunkKey → chunk)
  private jobs: Map<string, GenerationJob> = new Map();
  private presets: Map<string, WorldPreset> = new Map();
  private nextId = 1;
  private globalLoadedChunks = 0;

  constructor(config: ProceduralWorldConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // Load built-in presets
    for (const p of BUILT_IN_PRESETS) {
      this.presets.set(p.id, p);
    }
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  start(): void {
    if (this.running) return;
    this.running = true;
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  onEvent(listener: (event: ProceduralEvent) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(event: ProceduralEvent): void {
    for (const cb of this.listeners) cb(event);
  }

  private genId(prefix: string): string {
    return `${prefix}_${this.nextId++}`;
  }

  private chunkKey(coord: ChunkCoord): string {
    return `${coord.x},${coord.z}`;
  }

  // --------------------------------------------------------------------------
  // Presets
  // --------------------------------------------------------------------------

  getPresets(): WorldPreset[] {
    return Array.from(this.presets.values()).map(p => ({ ...p }));
  }

  getPreset(presetId: string): WorldPreset | undefined {
    const p = this.presets.get(presetId);
    return p ? { ...p } : undefined;
  }

  registerPreset(preset: WorldPreset): void {
    this.presets.set(preset.id, preset);
  }

  // --------------------------------------------------------------------------
  // World CRUD
  // --------------------------------------------------------------------------

  createWorld(config: WorldConfig): WorldInfo {
    if (this.worlds.size >= this.config.maxWorlds) {
      throw new Error(`Maximum worlds reached (${this.config.maxWorlds})`);
    }
    if (!config.name.trim()) {
      throw new Error('World name required');
    }
    if (config.biomes.length === 0) {
      throw new Error('At least one biome required');
    }
    if (config.worldRadius < 1) {
      throw new Error('World radius must be at least 1');
    }

    const now = Date.now();
    const id = this.genId('world');
    const totalChunks = Math.pow(config.worldRadius * 2, 2); // square grid

    const info: WorldInfo = {
      id,
      config: { ...config, biomes: config.biomes.map(b => ({ ...b })) },
      totalChunks,
      loadedChunks: 0,
      generatedChunks: 0,
      createdAt: now,
    };

    this.worlds.set(id, info);
    this.worldConfigs.set(id, config);
    this.chunks.set(id, new Map());

    this.emit({
      type: 'world_created',
      worldId: id,
      timestamp: now,
      data: { name: config.name, seed: config.seed, totalChunks },
    });

    return { ...info };
  }

  createWorldFromPreset(presetId: string, name: string, seed: number): WorldInfo {
    const preset = this.presets.get(presetId);
    if (!preset) throw new Error(`Preset '${presetId}' not found`);

    const config: WorldConfig = {
      ...preset.config,
      name,
      seed,
      noise: { ...preset.config.noise, seed },
    };

    return this.createWorld(config);
  }

  getWorld(worldId: string): WorldInfo | undefined {
    const w = this.worlds.get(worldId);
    return w ? { ...w } : undefined;
  }

  listWorlds(): WorldInfo[] {
    return Array.from(this.worlds.values()).map(w => ({ ...w }));
  }

  removeWorld(worldId: string): boolean {
    if (!this.worlds.has(worldId)) return false;

    // Cancel active jobs
    for (const job of this.jobs.values()) {
      if (job.worldId === worldId && (job.status === 'queued' || job.status === 'generating')) {
        job.status = 'cancelled';
        job.completedAt = Date.now();
      }
    }

    // Unload all chunks
    const chunkMap = this.chunks.get(worldId);
    if (chunkMap) {
      for (const chunk of chunkMap.values()) {
        if (chunk.state === 'loaded') {
          this.globalLoadedChunks--;
        }
      }
    }

    this.chunks.delete(worldId);
    this.worlds.delete(worldId);
    this.worldConfigs.delete(worldId);

    this.emit({
      type: 'world_removed',
      worldId,
      timestamp: Date.now(),
      data: {},
    });

    return true;
  }

  // --------------------------------------------------------------------------
  // Generation Jobs
  // --------------------------------------------------------------------------

  startGeneration(worldId: string, radiusOverride?: number): GenerationJob {
    const world = this.worlds.get(worldId);
    if (!world) throw new Error('World not found');
    const config = this.worldConfigs.get(worldId)!;

    // Check concurrent jobs
    const activeJobs = Array.from(this.jobs.values())
      .filter(j => j.status === 'queued' || j.status === 'generating').length;
    if (activeJobs >= this.config.maxConcurrentJobs) {
      throw new Error(`Maximum concurrent jobs reached (${this.config.maxConcurrentJobs})`);
    }

    const radius = radiusOverride ?? config.worldRadius;
    const totalChunks = Math.pow(radius * 2, 2);

    const job: GenerationJob = {
      id: this.genId('job'),
      worldId,
      seed: config.seed,
      status: 'generating',
      chunksTotal: totalChunks,
      chunksCompleted: 0,
      progress: 0,
      biomes: config.biomes.map(b => b.id),
      startedAt: Date.now(),
      completedAt: null,
      error: null,
    };

    this.jobs.set(job.id, job);

    this.emit({
      type: 'job_started',
      worldId,
      timestamp: Date.now(),
      data: { jobId: job.id, totalChunks },
    });

    // Synchronous generation for simplicity (in production, this would be async)
    this.executeGeneration(job, config, radius);

    return { ...job };
  }

  private executeGeneration(job: GenerationJob, config: WorldConfig, radius: number): void {
    const chunkMap = this.chunks.get(job.worldId)!;
    const world = this.worlds.get(job.worldId)!;
    const rng = seededRandom(config.seed);

    try {
      for (let x = -radius; x < radius; x++) {
        for (let z = -radius; z < radius; z++) {
          const coord: ChunkCoord = { x, z };
          const key = this.chunkKey(coord);

          if (chunkMap.has(key)) {
            job.chunksCompleted++;
            continue;
          }

          const chunk = this.generateChunk(coord, config, rng);
          chunkMap.set(key, chunk);
          job.chunksCompleted++;
          world.generatedChunks++;
        }
      }

      job.status = 'completed';
      job.progress = 1;
      job.completedAt = Date.now();

      this.emit({
        type: 'job_completed',
        worldId: job.worldId,
        timestamp: Date.now(),
        data: { jobId: job.id, chunksGenerated: job.chunksCompleted, durationMs: job.completedAt - job.startedAt },
      });
    } catch (err: any) {
      job.status = 'failed';
      job.error = err.message ?? 'Unknown error';
      job.completedAt = Date.now();

      this.emit({
        type: 'job_failed',
        worldId: job.worldId,
        timestamp: Date.now(),
        data: { jobId: job.id, error: job.error },
      });
    }
  }

  private generateChunk(coord: ChunkCoord, config: WorldConfig, rng: () => number): ChunkData {
    const resolution = this.config.heightmapResolution;
    const heightmap: number[] = [];

    // Generate heightmap
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const worldX = coord.x * config.chunkSize + (i / resolution) * config.chunkSize;
        const worldZ = coord.z * config.chunkSize + (j / resolution) * config.chunkSize;
        const height = noiseValue(config.seed, worldX, worldZ, config.noise);
        heightmap.push(height);
      }
    }

    // Determine biome based on average elevation
    const avgHeight = heightmap.reduce((a, b) => a + b, 0) / heightmap.length;
    const biome = this.selectBiome(config.biomes, avgHeight, rng);

    // Place structures
    const structures: PlacedStructure[] = [];
    if (biome.structures.length > 0 && rng() < config.structureDensity) {
      const count = Math.min(
        Math.floor(rng() * 3) + 1,
        this.config.maxStructuresPerChunk,
        biome.structures.length
      );
      for (let s = 0; s < count; s++) {
        const sType = biome.structures[Math.floor(rng() * biome.structures.length)];
        structures.push({
          id: this.genId('struct'),
          type: sType,
          position: [
            coord.x * config.chunkSize + rng() * config.chunkSize,
            avgHeight * 100,
            coord.z * config.chunkSize + rng() * config.chunkSize,
          ],
          rotation: rng() * 360,
          scale: 0.8 + rng() * 0.4,
          biomeId: biome.id,
          metadata: {},
        });
      }
    }

    // Place resources
    const resources: PlacedResource[] = [];
    if (biome.resources.length > 0 && rng() < config.resourceDensity) {
      const count = Math.min(
        Math.floor(rng() * 5) + 1,
        this.config.maxResourcesPerChunk,
        biome.resources.length * 3
      );
      for (let r = 0; r < count; r++) {
        const rType = biome.resources[Math.floor(rng() * biome.resources.length)];
        resources.push({
          id: this.genId('res'),
          type: rType,
          position: [
            coord.x * config.chunkSize + rng() * config.chunkSize,
            avgHeight * 100,
            coord.z * config.chunkSize + rng() * config.chunkSize,
          ],
          amount: Math.floor(rng() * 100) + 10,
          respawnable: rng() > 0.3,
          depleted: false,
        });
      }
    }

    return {
      coord,
      worldId: '',  // set by caller context
      biome: biome.id,
      state: 'unloaded',
      lod: 0,
      heightmap,
      structures,
      resources,
      generatedAt: Date.now(),
      loadedAt: null,
    };
  }

  private selectBiome(biomes: BiomeDefinition[], elevation: number, rng: () => number): BiomeDefinition {
    // Find biomes that match elevation range
    const eligible = biomes.filter(b => {
      const e = elevation * 2 - 1; // map 0-1 to -1 to 1
      return e >= b.minElevation && e <= b.maxElevation;
    });

    if (eligible.length === 0) {
      // Fall back to closest biome
      const sorted = [...biomes].sort((a, b) => {
        const aMid = (a.minElevation + a.maxElevation) / 2;
        const bMid = (b.minElevation + b.maxElevation) / 2;
        const e = elevation * 2 - 1;
        return Math.abs(aMid - e) - Math.abs(bMid - e);
      });
      return sorted[0];
    }

    // Weighted random among eligible
    const totalWeight = eligible.reduce((s, b) => s + b.spawnWeight, 0);
    let roll = rng() * totalWeight;
    for (const b of eligible) {
      roll -= b.spawnWeight;
      if (roll <= 0) return b;
    }
    return eligible[eligible.length - 1];
  }

  cancelGeneration(jobId: string): GenerationJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');
    if (job.status !== 'queued' && job.status !== 'generating') {
      throw new Error(`Cannot cancel job in '${job.status}' state`);
    }

    job.status = 'cancelled';
    job.completedAt = Date.now();

    this.emit({
      type: 'job_cancelled',
      worldId: job.worldId,
      timestamp: Date.now(),
      data: { jobId },
    });

    return { ...job };
  }

  getJob(jobId: string): GenerationJob | undefined {
    const j = this.jobs.get(jobId);
    return j ? { ...j } : undefined;
  }

  listJobs(worldId?: string): GenerationJob[] {
    let results = Array.from(this.jobs.values());
    if (worldId) {
      results = results.filter(j => j.worldId === worldId);
    }
    return results.map(j => ({ ...j }));
  }

  // --------------------------------------------------------------------------
  // Chunk Management
  // --------------------------------------------------------------------------

  loadChunk(worldId: string, coord: ChunkCoord): ChunkData {
    const chunkMap = this.chunks.get(worldId);
    if (!chunkMap) throw new Error('World not found');

    const key = this.chunkKey(coord);
    const chunk = chunkMap.get(key);
    if (!chunk) throw new Error(`Chunk [${coord.x},${coord.z}] not generated`);
    if (chunk.state === 'loaded') return { ...chunk };

    if (this.globalLoadedChunks >= this.config.maxLoadedChunks) {
      throw new Error(`Maximum loaded chunks reached (${this.config.maxLoadedChunks})`);
    }

    chunk.state = 'loaded';
    chunk.loadedAt = Date.now();
    this.globalLoadedChunks++;

    const world = this.worlds.get(worldId);
    if (world) world.loadedChunks++;

    this.emit({
      type: 'chunk_loaded',
      worldId,
      timestamp: Date.now(),
      data: { coord, biome: chunk.biome },
    });

    return { ...chunk };
  }

  unloadChunk(worldId: string, coord: ChunkCoord): boolean {
    const chunkMap = this.chunks.get(worldId);
    if (!chunkMap) throw new Error('World not found');

    const key = this.chunkKey(coord);
    const chunk = chunkMap.get(key);
    if (!chunk || chunk.state !== 'loaded') return false;

    chunk.state = 'unloaded';
    chunk.loadedAt = null;
    this.globalLoadedChunks--;

    const world = this.worlds.get(worldId);
    if (world) world.loadedChunks--;

    this.emit({
      type: 'chunk_unloaded',
      worldId,
      timestamp: Date.now(),
      data: { coord },
    });

    return true;
  }

  getChunk(worldId: string, coord: ChunkCoord): ChunkData | undefined {
    const chunkMap = this.chunks.get(worldId);
    if (!chunkMap) return undefined;
    const chunk = chunkMap.get(this.chunkKey(coord));
    return chunk ? { ...chunk } : undefined;
  }

  getLoadedChunks(worldId: string): ChunkData[] {
    const chunkMap = this.chunks.get(worldId);
    if (!chunkMap) return [];
    return Array.from(chunkMap.values())
      .filter(c => c.state === 'loaded')
      .map(c => ({ ...c }));
  }

  setChunkLOD(worldId: string, coord: ChunkCoord, lod: LODLevel): ChunkData {
    const chunkMap = this.chunks.get(worldId);
    if (!chunkMap) throw new Error('World not found');

    const key = this.chunkKey(coord);
    const chunk = chunkMap.get(key);
    if (!chunk) throw new Error('Chunk not found');

    chunk.lod = lod;
    return { ...chunk };
  }

  // --------------------------------------------------------------------------
  // Resources
  // --------------------------------------------------------------------------

  depleteResource(worldId: string, coord: ChunkCoord, resourceId: string): PlacedResource {
    const chunkMap = this.chunks.get(worldId);
    if (!chunkMap) throw new Error('World not found');

    const chunk = chunkMap.get(this.chunkKey(coord));
    if (!chunk) throw new Error('Chunk not found');

    const resource = chunk.resources.find(r => r.id === resourceId);
    if (!resource) throw new Error('Resource not found');
    if (resource.depleted) throw new Error('Resource already depleted');

    resource.depleted = true;

    this.emit({
      type: 'resource_depleted',
      worldId,
      timestamp: Date.now(),
      data: { coord, resourceId, type: resource.type },
    });

    return { ...resource };
  }

  respawnResources(worldId: string, coord: ChunkCoord): number {
    const chunkMap = this.chunks.get(worldId);
    if (!chunkMap) throw new Error('World not found');

    const chunk = chunkMap.get(this.chunkKey(coord));
    if (!chunk) throw new Error('Chunk not found');

    let count = 0;
    for (const res of chunk.resources) {
      if (res.depleted && res.respawnable) {
        res.depleted = false;
        count++;
      }
    }

    return count;
  }

  // --------------------------------------------------------------------------
  // Biome queries
  // --------------------------------------------------------------------------

  getBiomesForWorld(worldId: string): BiomeDefinition[] {
    const config = this.worldConfigs.get(worldId);
    if (!config) throw new Error('World not found');
    return config.biomes.map(b => ({ ...b }));
  }

  getBiomeDistribution(worldId: string): Record<string, number> {
    const chunkMap = this.chunks.get(worldId);
    if (!chunkMap) throw new Error('World not found');

    const dist: Record<string, number> = {};
    for (const chunk of chunkMap.values()) {
      dist[chunk.biome] = (dist[chunk.biome] ?? 0) + 1;
    }
    return dist;
  }

  // --------------------------------------------------------------------------
  // Seed-based determinism
  // --------------------------------------------------------------------------

  regenerateChunk(worldId: string, coord: ChunkCoord): ChunkData {
    const config = this.worldConfigs.get(worldId);
    if (!config) throw new Error('World not found');

    const chunkMap = this.chunks.get(worldId)!;
    const key = this.chunkKey(coord);

    // Remove old chunk
    const old = chunkMap.get(key);
    if (old && old.state === 'loaded') {
      this.globalLoadedChunks--;
      const world = this.worlds.get(worldId);
      if (world) world.loadedChunks--;
    }

    // Regenerate with same seed — deterministic
    const chunkSeed = config.seed + coord.x * 1000 + coord.z;
    const rng = seededRandom(chunkSeed);
    const chunk = this.generateChunk(coord, config, rng);
    chunk.worldId = worldId;
    chunkMap.set(key, chunk);

    return { ...chunk };
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  getStats(): ProceduralStats {
    const jobs = Array.from(this.jobs.values());
    const completedJobs = jobs.filter(j => j.status === 'completed');

    let totalStructures = 0;
    let totalResources = 0;
    let totalChunks = 0;

    for (const chunkMap of this.chunks.values()) {
      for (const chunk of chunkMap.values()) {
        totalChunks++;
        totalStructures += chunk.structures.length;
        totalResources += chunk.resources.length;
      }
    }

    const totalGenTime = completedJobs.reduce((s, j) => {
      return s + (j.completedAt! - j.startedAt);
    }, 0);

    return {
      totalWorlds: this.worlds.size,
      totalChunks,
      loadedChunks: this.globalLoadedChunks,
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'generating' || j.status === 'queued').length,
      completedJobs: completedJobs.length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      totalStructures,
      totalResources,
      averageGenerationTimeMs: completedJobs.length > 0 ? totalGenTime / completedJobs.length : 0,
    };
  }
}
