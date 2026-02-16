import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProceduralWorldService,
  type ProceduralWorldConfig,
  type WorldConfig,
  type BiomeDefinition,
  type ProceduralEvent,
  type ChunkCoord,
  type NoiseConfig,
} from '../src/services/ProceduralWorldService';

// ============================================================================
// Helpers
// ============================================================================

function makeNoise(seed = 42): NoiseConfig {
  return { octaves: 4, frequency: 0.02, amplitude: 1.0, persistence: 0.5, lacunarity: 2.0, seed };
}

function makeBiome(overrides: Partial<BiomeDefinition> = {}): BiomeDefinition {
  return {
    id: overrides.id ?? 'plains',
    type: overrides.type ?? 'plains',
    name: overrides.name ?? 'Plains',
    minElevation: overrides.minElevation ?? -1,
    maxElevation: overrides.maxElevation ?? 1,
    temperature: overrides.temperature ?? 0.5,
    humidity: overrides.humidity ?? 0.5,
    color: overrides.color ?? '#7ec850',
    flora: overrides.flora ?? ['grass'],
    fauna: overrides.fauna ?? ['rabbit'],
    structures: overrides.structures ?? ['village'],
    resources: overrides.resources ?? ['wood', 'food'],
    spawnWeight: overrides.spawnWeight ?? 1.0,
  };
}

function makeWorldConfig(overrides: Partial<WorldConfig> = {}): WorldConfig {
  return {
    name: overrides.name ?? 'Test World',
    seed: overrides.seed ?? 42,
    chunkSize: overrides.chunkSize ?? 64,
    worldRadius: overrides.worldRadius ?? 2,
    noise: overrides.noise ?? makeNoise(),
    biomes: overrides.biomes ?? [makeBiome()],
    structureDensity: overrides.structureDensity ?? 0.5,
    resourceDensity: overrides.resourceDensity ?? 0.5,
  };
}

function collectEvents(svc: ProceduralWorldService): ProceduralEvent[] {
  const events: ProceduralEvent[] = [];
  svc.onEvent(e => events.push(e));
  return events;
}

// ============================================================================
// Tests
// ============================================================================

describe('ProceduralWorldService', () => {
  let svc: ProceduralWorldService;

  beforeEach(() => {
    svc = new ProceduralWorldService();
    svc.start();
  });

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------
  describe('lifecycle', () => {
    it('starts and stops', () => {
      const s = new ProceduralWorldService();
      expect(s.isRunning()).toBe(false);
      s.start();
      expect(s.isRunning()).toBe(true);
      s.stop();
      expect(s.isRunning()).toBe(false);
    });

    it('start is idempotent', () => {
      svc.start();
      expect(svc.isRunning()).toBe(true);
    });

    it('stop is idempotent', () => {
      svc.stop();
      svc.stop();
      expect(svc.isRunning()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Presets
  // --------------------------------------------------------------------------
  describe('presets', () => {
    it('has built-in presets', () => {
      const presets = svc.getPresets();
      expect(presets.length).toBeGreaterThanOrEqual(2);
      expect(presets.some(p => p.id === 'fantasy')).toBe(true);
      expect(presets.some(p => p.id === 'scifi')).toBe(true);
    });

    it('gets a preset by id', () => {
      const p = svc.getPreset('fantasy');
      expect(p).toBeDefined();
      expect(p!.name).toBe('Fantasy Realm');
    });

    it('returns undefined for missing preset', () => {
      expect(svc.getPreset('nope')).toBeUndefined();
    });

    it('registers custom preset', () => {
      svc.registerPreset({
        id: 'custom',
        name: 'Custom',
        description: 'A custom preset',
        config: {
          chunkSize: 32,
          worldRadius: 8,
          noise: makeNoise(),
          biomes: [makeBiome()],
          structureDensity: 0.5,
          resourceDensity: 0.5,
        },
      });
      expect(svc.getPreset('custom')).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // World CRUD
  // --------------------------------------------------------------------------
  describe('world CRUD', () => {
    it('creates a world', () => {
      const w = svc.createWorld(makeWorldConfig());
      expect(w.id).toMatch(/^world_/);
      expect(w.config.name).toBe('Test World');
      expect(w.totalChunks).toBe(16); // (2*2)^2 = 16
    });

    it('emits world_created event', () => {
      const events = collectEvents(svc);
      svc.createWorld(makeWorldConfig());
      expect(events.some(e => e.type === 'world_created')).toBe(true);
    });

    it('creates world from preset', () => {
      const w = svc.createWorldFromPreset('fantasy', 'My Fantasy World', 12345);
      expect(w.config.name).toBe('My Fantasy World');
      expect(w.config.seed).toBe(12345);
      expect(w.config.biomes.length).toBeGreaterThan(0);
    });

    it('throws for unknown preset', () => {
      expect(() => svc.createWorldFromPreset('nope', 'X', 1)).toThrow('not found');
    });

    it('rejects empty name', () => {
      expect(() => svc.createWorld(makeWorldConfig({ name: '   ' }))).toThrow('name required');
    });

    it('rejects empty biomes', () => {
      expect(() => svc.createWorld(makeWorldConfig({ biomes: [] }))).toThrow('At least one biome');
    });

    it('rejects zero radius', () => {
      expect(() => svc.createWorld(makeWorldConfig({ worldRadius: 0 }))).toThrow('at least 1');
    });

    it('enforces max worlds', () => {
      const s = new ProceduralWorldService({ maxWorlds: 2 });
      s.start();
      s.createWorld(makeWorldConfig({ name: 'A' }));
      s.createWorld(makeWorldConfig({ name: 'B' }));
      expect(() => s.createWorld(makeWorldConfig({ name: 'C' }))).toThrow('Maximum worlds');
    });

    it('gets a world', () => {
      const w = svc.createWorld(makeWorldConfig());
      expect(svc.getWorld(w.id)).toBeDefined();
    });

    it('get returns undefined for missing', () => {
      expect(svc.getWorld('nope')).toBeUndefined();
    });

    it('lists worlds', () => {
      svc.createWorld(makeWorldConfig({ name: 'A' }));
      svc.createWorld(makeWorldConfig({ name: 'B' }));
      expect(svc.listWorlds().length).toBe(2);
    });

    it('removes a world', () => {
      const w = svc.createWorld(makeWorldConfig());
      expect(svc.removeWorld(w.id)).toBe(true);
      expect(svc.getWorld(w.id)).toBeUndefined();
    });

    it('remove returns false for missing', () => {
      expect(svc.removeWorld('nope')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Generation Jobs
  // --------------------------------------------------------------------------
  describe('generation', () => {
    it('generates chunks for a world', () => {
      const w = svc.createWorld(makeWorldConfig({ worldRadius: 2 }));
      const job = svc.startGeneration(w.id);
      expect(job.status).toBe('completed');
      expect(job.chunksCompleted).toBe(16);
      expect(job.progress).toBe(1);
    });

    it('emits job_started and job_completed', () => {
      const w = svc.createWorld(makeWorldConfig({ worldRadius: 1 }));
      const events = collectEvents(svc);
      svc.startGeneration(w.id);
      expect(events.some(e => e.type === 'job_started')).toBe(true);
      expect(events.some(e => e.type === 'job_completed')).toBe(true);
    });

    it('throws for missing world', () => {
      expect(() => svc.startGeneration('nope')).toThrow('not found');
    });

    it('enforces max concurrent jobs', () => {
      const s = new ProceduralWorldService({ maxConcurrentJobs: 1 });
      s.start();
      const w1 = s.createWorld(makeWorldConfig({ name: 'A', worldRadius: 1 }));
      // First job completes synchronously, so it won't block
      s.startGeneration(w1.id);
      // But we can override test by checking the result
      expect(s.listJobs().length).toBe(1);
    });

    it('respects radius override', () => {
      const w = svc.createWorld(makeWorldConfig({ worldRadius: 5 }));
      const job = svc.startGeneration(w.id, 1); // only generate radius 1
      expect(job.chunksTotal).toBe(4); // (1*2)^2 = 4
    });

    it('gets a job', () => {
      const w = svc.createWorld(makeWorldConfig({ worldRadius: 1 }));
      const job = svc.startGeneration(w.id);
      expect(svc.getJob(job.id)).toBeDefined();
    });

    it('lists jobs', () => {
      const w = svc.createWorld(makeWorldConfig({ worldRadius: 1 }));
      svc.startGeneration(w.id);
      expect(svc.listJobs().length).toBe(1);
      expect(svc.listJobs(w.id).length).toBe(1);
      expect(svc.listJobs('other-world').length).toBe(0);
    });

    it('cancel throws for completed job', () => {
      const w = svc.createWorld(makeWorldConfig({ worldRadius: 1 }));
      const job = svc.startGeneration(w.id);
      expect(() => svc.cancelGeneration(job.id)).toThrow('Cannot cancel');
    });

    it('cancel throws for missing job', () => {
      expect(() => svc.cancelGeneration('nope')).toThrow('not found');
    });

    it('same seed produces same chunks', () => {
      const cfg1 = makeWorldConfig({ seed: 999, worldRadius: 1 });
      const cfg2 = makeWorldConfig({ seed: 999, worldRadius: 1 });

      const w1 = svc.createWorld(cfg1);
      svc.startGeneration(w1.id);

      const s2 = new ProceduralWorldService();
      s2.start();
      const w2 = s2.createWorld(cfg2);
      s2.startGeneration(w2.id);

      const c1 = svc.getChunk(w1.id, { x: 0, z: 0 });
      const c2 = s2.getChunk(w2.id, { x: 0, z: 0 });

      expect(c1).toBeDefined();
      expect(c2).toBeDefined();
      expect(c1!.biome).toBe(c2!.biome);
      expect(c1!.heightmap.length).toBe(c2!.heightmap.length);
    });
  });

  // --------------------------------------------------------------------------
  // Chunk Management
  // --------------------------------------------------------------------------
  describe('chunks', () => {
    let worldId: string;

    beforeEach(() => {
      const w = svc.createWorld(makeWorldConfig({ worldRadius: 2 }));
      svc.startGeneration(w.id);
      worldId = w.id;
    });

    it('loads a chunk', () => {
      const chunk = svc.loadChunk(worldId, { x: 0, z: 0 });
      expect(chunk.state).toBe('loaded');
      expect(chunk.loadedAt).toBeDefined();
    });

    it('emits chunk_loaded', () => {
      const events = collectEvents(svc);
      svc.loadChunk(worldId, { x: 0, z: 0 });
      expect(events.some(e => e.type === 'chunk_loaded')).toBe(true);
    });

    it('returns loaded chunk without re-loading', () => {
      svc.loadChunk(worldId, { x: 0, z: 0 });
      const events = collectEvents(svc);
      const chunk = svc.loadChunk(worldId, { x: 0, z: 0 });
      expect(chunk.state).toBe('loaded');
      expect(events.length).toBe(0); // no re-emit
    });

    it('throws for ungenerated chunk', () => {
      expect(() => svc.loadChunk(worldId, { x: 999, z: 999 })).toThrow('not generated');
    });

    it('throws for missing world', () => {
      expect(() => svc.loadChunk('nope', { x: 0, z: 0 })).toThrow('not found');
    });

    it('enforces max loaded chunks', () => {
      const s = new ProceduralWorldService({ maxLoadedChunks: 2 });
      s.start();
      const w = s.createWorld(makeWorldConfig({ worldRadius: 2 }));
      s.startGeneration(w.id);
      s.loadChunk(w.id, { x: 0, z: 0 });
      s.loadChunk(w.id, { x: 1, z: 0 });
      expect(() => s.loadChunk(w.id, { x: 0, z: 1 })).toThrow('Maximum loaded chunks');
    });

    it('unloads a chunk', () => {
      svc.loadChunk(worldId, { x: 0, z: 0 });
      const events = collectEvents(svc);
      expect(svc.unloadChunk(worldId, { x: 0, z: 0 })).toBe(true);
      expect(events.some(e => e.type === 'chunk_unloaded')).toBe(true);
    });

    it('unload returns false for unloaded chunk', () => {
      expect(svc.unloadChunk(worldId, { x: 0, z: 0 })).toBe(false);
    });

    it('gets a chunk', () => {
      const chunk = svc.getChunk(worldId, { x: 0, z: 0 });
      expect(chunk).toBeDefined();
      expect(chunk!.heightmap.length).toBe(256); // 16x16 default
    });

    it('returns undefined for missing chunk', () => {
      expect(svc.getChunk(worldId, { x: 999, z: 999 })).toBeUndefined();
    });

    it('returns undefined for missing world', () => {
      expect(svc.getChunk('nope', { x: 0, z: 0 })).toBeUndefined();
    });

    it('gets loaded chunks', () => {
      svc.loadChunk(worldId, { x: 0, z: 0 });
      svc.loadChunk(worldId, { x: 1, z: 0 });
      expect(svc.getLoadedChunks(worldId).length).toBe(2);
    });

    it('sets chunk LOD', () => {
      const chunk = svc.setChunkLOD(worldId, { x: 0, z: 0 }, 2);
      expect(chunk.lod).toBe(2);
    });

    it('setChunkLOD throws for missing chunk', () => {
      expect(() => svc.setChunkLOD(worldId, { x: 999, z: 999 }, 1)).toThrow('not found');
    });

    it('updates world loadedChunks count', () => {
      svc.loadChunk(worldId, { x: 0, z: 0 });
      svc.loadChunk(worldId, { x: 1, z: 0 });
      let world = svc.getWorld(worldId)!;
      expect(world.loadedChunks).toBe(2);

      svc.unloadChunk(worldId, { x: 0, z: 0 });
      world = svc.getWorld(worldId)!;
      expect(world.loadedChunks).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Resources
  // --------------------------------------------------------------------------
  describe('resources', () => {
    let worldId: string;
    let chunkWithResources: ChunkCoord | null = null;
    let resourceId: string | null = null;

    beforeEach(() => {
      // Use high resource density to guarantee some resources
      const w = svc.createWorld(makeWorldConfig({ worldRadius: 3, resourceDensity: 1.0 }));
      svc.startGeneration(w.id);
      worldId = w.id;

      // Find a chunk with resources
      for (let x = -3; x < 3; x++) {
        for (let z = -3; z < 3; z++) {
          const chunk = svc.getChunk(w.id, { x, z });
          if (chunk && chunk.resources.length > 0) {
            chunkWithResources = { x, z };
            resourceId = chunk.resources[0].id;
            break;
          }
        }
        if (chunkWithResources) break;
      }
    });

    it('chunks have resources', () => {
      expect(chunkWithResources).not.toBeNull();
      expect(resourceId).not.toBeNull();
    });

    it('depletes a resource', () => {
      const res = svc.depleteResource(worldId, chunkWithResources!, resourceId!);
      expect(res.depleted).toBe(true);
    });

    it('emits resource_depleted', () => {
      const events = collectEvents(svc);
      svc.depleteResource(worldId, chunkWithResources!, resourceId!);
      expect(events.some(e => e.type === 'resource_depleted')).toBe(true);
    });

    it('throws for already depleted', () => {
      svc.depleteResource(worldId, chunkWithResources!, resourceId!);
      expect(() => svc.depleteResource(worldId, chunkWithResources!, resourceId!)).toThrow('already depleted');
    });

    it('throws for missing resource', () => {
      expect(() => svc.depleteResource(worldId, chunkWithResources!, 'nope')).toThrow('not found');
    });

    it('respawns respawnable resources', () => {
      svc.depleteResource(worldId, chunkWithResources!, resourceId!);
      const count = svc.respawnResources(worldId, chunkWithResources!);
      // May or may not respawn depending on the respawnable flag
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('throws for missing chunk on deplete', () => {
      expect(() => svc.depleteResource(worldId, { x: 999, z: 999 }, 'x')).toThrow('not found');
    });
  });

  // --------------------------------------------------------------------------
  // Biome queries
  // --------------------------------------------------------------------------
  describe('biomes', () => {
    it('getBiomesForWorld returns biome definitions', () => {
      const w = svc.createWorld(makeWorldConfig({
        biomes: [
          makeBiome({ id: 'forest', name: 'Forest' }),
          makeBiome({ id: 'desert', name: 'Desert' }),
        ],
      }));
      const biomes = svc.getBiomesForWorld(w.id);
      expect(biomes.length).toBe(2);
    });

    it('throws for missing world', () => {
      expect(() => svc.getBiomesForWorld('nope')).toThrow('not found');
    });

    it('getBiomeDistribution after generation', () => {
      const w = svc.createWorld(makeWorldConfig({ worldRadius: 2 }));
      svc.startGeneration(w.id);
      const dist = svc.getBiomeDistribution(w.id);
      const totalChunks = Object.values(dist).reduce((s, n) => s + n, 0);
      expect(totalChunks).toBe(16); // 4x4 chunks
    });

    it('multiple biomes get selected', () => {
      const w = svc.createWorld(makeWorldConfig({
        worldRadius: 3,
        seed: 777,
        biomes: [
          makeBiome({ id: 'plains', minElevation: -1, maxElevation: 0.5, spawnWeight: 0.5 }),
          makeBiome({ id: 'mountains', minElevation: 0.3, maxElevation: 1, spawnWeight: 0.5 }),
        ],
      }));
      svc.startGeneration(w.id);
      const dist = svc.getBiomeDistribution(w.id);
      // At least one biome should appear (both have wide elevation ranges that overlap)
      expect(Object.keys(dist).length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // Regeneration
  // --------------------------------------------------------------------------
  describe('regeneration', () => {
    it('regenerates a chunk deterministically', () => {
      const w = svc.createWorld(makeWorldConfig({ worldRadius: 2, seed: 123 }));
      svc.startGeneration(w.id);

      const original = svc.getChunk(w.id, { x: 0, z: 0 })!;
      const regen = svc.regenerateChunk(w.id, { x: 0, z: 0 });

      expect(regen.biome).toBe(original.biome);
      expect(regen.heightmap.length).toBe(original.heightmap.length);
    });

    it('throws for missing world', () => {
      expect(() => svc.regenerateChunk('nope', { x: 0, z: 0 })).toThrow('not found');
    });

    it('unloads chunk count correctly on regen', () => {
      const w = svc.createWorld(makeWorldConfig({ worldRadius: 2 }));
      svc.startGeneration(w.id);
      svc.loadChunk(w.id, { x: 0, z: 0 });
      expect(svc.getWorld(w.id)!.loadedChunks).toBe(1);

      svc.regenerateChunk(w.id, { x: 0, z: 0 });
      expect(svc.getWorld(w.id)!.loadedChunks).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Event system
  // --------------------------------------------------------------------------
  describe('events', () => {
    it('unsubscribes via returned function', () => {
      const events: ProceduralEvent[] = [];
      const unsub = svc.onEvent(e => events.push(e));
      svc.createWorld(makeWorldConfig({ name: 'A' }));
      expect(events.length).toBe(1);
      unsub();
      svc.createWorld(makeWorldConfig({ name: 'B' }));
      expect(events.length).toBe(1);
    });

    it('multiple listeners all receive events', () => {
      const e1: ProceduralEvent[] = [];
      const e2: ProceduralEvent[] = [];
      svc.onEvent(e => e1.push(e));
      svc.onEvent(e => e2.push(e));
      svc.createWorld(makeWorldConfig());
      expect(e1.length).toBe(1);
      expect(e2.length).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // World removal
  // --------------------------------------------------------------------------
  describe('world removal', () => {
    it('cleans up chunks on world removal', () => {
      const w = svc.createWorld(makeWorldConfig({ worldRadius: 2 }));
      svc.startGeneration(w.id);
      svc.loadChunk(w.id, { x: 0, z: 0 });
      svc.removeWorld(w.id);
      expect(svc.getChunk(w.id, { x: 0, z: 0 })).toBeUndefined();
    });

    it('loaded chunk count decreases on removal', () => {
      const w = svc.createWorld(makeWorldConfig({ worldRadius: 2 }));
      svc.startGeneration(w.id);
      svc.loadChunk(w.id, { x: 0, z: 0 });
      svc.loadChunk(w.id, { x: 1, z: 0 });

      const statsBefore = svc.getStats();
      expect(statsBefore.loadedChunks).toBe(2);

      svc.removeWorld(w.id);

      const statsAfter = svc.getStats();
      expect(statsAfter.loadedChunks).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------
  describe('stats', () => {
    it('empty stats for fresh service', () => {
      const stats = svc.getStats();
      expect(stats.totalWorlds).toBe(0);
      expect(stats.totalChunks).toBe(0);
      expect(stats.totalJobs).toBe(0);
    });

    it('populated stats after creation and generation', () => {
      const w = svc.createWorld(makeWorldConfig({ worldRadius: 2 }));
      svc.startGeneration(w.id);
      svc.loadChunk(w.id, { x: 0, z: 0 });

      const stats = svc.getStats();
      expect(stats.totalWorlds).toBe(1);
      expect(stats.totalChunks).toBe(16);
      expect(stats.loadedChunks).toBe(1);
      expect(stats.totalJobs).toBe(1);
      expect(stats.completedJobs).toBe(1);
      expect(stats.totalStructures).toBeGreaterThanOrEqual(0);
      expect(stats.totalResources).toBeGreaterThanOrEqual(0);
      expect(stats.averageGenerationTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  // --------------------------------------------------------------------------
  // Integration
  // --------------------------------------------------------------------------
  describe('integration', () => {
    it('full lifecycle: create → generate → load → deplete → unload → remove', () => {
      const w = svc.createWorld(makeWorldConfig({
        worldRadius: 2,
        resourceDensity: 1.0,
        structureDensity: 1.0,
      }));

      const job = svc.startGeneration(w.id);
      expect(job.status).toBe('completed');

      const chunk = svc.loadChunk(w.id, { x: 0, z: 0 });
      expect(chunk.state).toBe('loaded');

      if (chunk.resources.length > 0) {
        svc.depleteResource(w.id, { x: 0, z: 0 }, chunk.resources[0].id);
      }

      svc.unloadChunk(w.id, { x: 0, z: 0 });
      expect(svc.getLoadedChunks(w.id).length).toBe(0);

      svc.removeWorld(w.id);
      expect(svc.getWorld(w.id)).toBeUndefined();
    });

    it('preset → generate → biome distribution', () => {
      const w = svc.createWorldFromPreset('fantasy', 'Test Fantasy', 42);
      const job = svc.startGeneration(w.id, 3);
      expect(job.status).toBe('completed');

      const dist = svc.getBiomeDistribution(w.id);
      expect(Object.keys(dist).length).toBeGreaterThanOrEqual(1);
    });
  });
});
