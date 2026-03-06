/**
 * Ecological ABM Simulation Engine
 *
 * The core simulation loop that runs the agent-based ecological model.
 * Each tick:
 *   1. Update environment (seasons, weather)
 *   2. Perceive: each agent scans its local neighborhood
 *   3. Decide: evaluate behavior rules in priority order
 *   4. Act: execute chosen action (move, eat, reproduce, etc.)
 *   5. Resolve: handle interactions (predation, competition)
 *   6. Update: age, energy, health, reproduction drive
 *   7. Cull: remove dead agents, trigger decomposition
 *   8. Stats: update population statistics
 *
 * Emergent behavior arises from spatial interactions without
 * explicit global constraints (validated by Knepp Estate 2025).
 *
 * @module abm/EcologicalSimulation
 */

import type {
  ABMConfig,
  EcologicalAgent,
  AgentAction,
  AgentGenome,
  AgentCategory,
  AgentVisual,
  BehaviorRule,
  BiomeType,
  EnvironmentState,
  PerceivedAgent,
  PopulationStats,
  SimulationEventMap,
  SimulationEventType,
  SimulationEventHandler,
  SpatialCell,
  SpeciesType,
  Vector2,
  Vector3,
  WeatherEvent,
  WorldState,
  GraphPattern,
  InitialPopulation,
} from './types';
import { getDefaultBehaviors } from './BehaviorRules';
import { GraphGrammarEngine, getDefaultGrammarRules } from './GraphGrammar';

// =============================================================================
// Seeded RNG
// =============================================================================

class SimRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 0xffffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextGaussian(): number {
    // Box-Muller transform
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
  }
}

// =============================================================================
// Species Templates
// =============================================================================

const SPECIES_TEMPLATES: Record<
  string,
  { category: AgentCategory; genome: Partial<AgentGenome>; visual: Partial<AgentVisual> }
> = {
  // Flora
  oak: {
    category: 'flora',
    genome: {
      speed: 0, perceptionRadius: 2, maxAge: 5000, metabolism: 0.1,
      reproductionRate: 0.001, size: 3, aggression: 0, sociality: 0,
      camouflage: 0, preferredBiome: 'forest',
      diet: [],
    },
    visual: { meshId: 'tree_oak', scale: 3, animation: 'sway' },
  },
  grass: {
    category: 'flora',
    genome: {
      speed: 0, perceptionRadius: 1, maxAge: 200, metabolism: 0.05,
      reproductionRate: 0.05, size: 0.2, aggression: 0, sociality: 0,
      camouflage: 0, preferredBiome: 'grassland',
      diet: [],
    },
    visual: { meshId: 'grass_patch', scale: 0.5, animation: 'wave' },
  },
  wildflower: {
    category: 'flora',
    genome: {
      speed: 0, perceptionRadius: 1, maxAge: 150, metabolism: 0.08,
      reproductionRate: 0.03, size: 0.3, aggression: 0, sociality: 0,
      camouflage: 0, preferredBiome: 'meadow',
      diet: [],
    },
    visual: { meshId: 'wildflower', scale: 0.4, animation: 'sway' },
  },
  // Herbivores
  deer: {
    category: 'herbivore',
    genome: {
      speed: 3, perceptionRadius: 8, maxAge: 1500, metabolism: 0.3,
      reproductionRate: 0.005, size: 1.5, aggression: 0.1, sociality: 0.7,
      camouflage: 0.4, preferredBiome: 'woodland',
      diet: [
        { target: 'grass', nutritionValue: 0.1, preference: 0.6 },
        { target: 'wildflower', nutritionValue: 0.15, preference: 0.3 },
      ],
    },
    visual: { meshId: 'deer', scale: 1.2, animation: 'walk' },
  },
  rabbit: {
    category: 'herbivore',
    genome: {
      speed: 4, perceptionRadius: 5, maxAge: 500, metabolism: 0.4,
      reproductionRate: 0.02, size: 0.3, aggression: 0, sociality: 0.5,
      camouflage: 0.6, preferredBiome: 'grassland',
      diet: [
        { target: 'grass', nutritionValue: 0.12, preference: 0.7 },
      ],
    },
    visual: { meshId: 'rabbit', scale: 0.4, animation: 'hop' },
  },
  cattle: {
    category: 'herbivore',
    genome: {
      speed: 1.5, perceptionRadius: 6, maxAge: 2000, metabolism: 0.35,
      reproductionRate: 0.003, size: 2.5, aggression: 0.2, sociality: 0.8,
      camouflage: 0.1, preferredBiome: 'grassland',
      diet: [
        { target: 'grass', nutritionValue: 0.15, preference: 0.8 },
      ],
    },
    visual: { meshId: 'cattle', scale: 2.0, animation: 'graze' },
  },
  // Predators
  fox: {
    category: 'predator',
    genome: {
      speed: 4, perceptionRadius: 10, maxAge: 1000, metabolism: 0.35,
      reproductionRate: 0.004, size: 0.8, aggression: 0.7, sociality: 0.2,
      camouflage: 0.5, preferredBiome: 'woodland',
      diet: [
        { target: 'rabbit', nutritionValue: 0.35, preference: 0.8 },
      ],
    },
    visual: { meshId: 'fox', scale: 0.8, animation: 'stalk' },
  },
  owl: {
    category: 'predator',
    genome: {
      speed: 5, perceptionRadius: 12, maxAge: 1200, metabolism: 0.3,
      reproductionRate: 0.003, size: 0.5, aggression: 0.6, sociality: 0.1,
      camouflage: 0.7, preferredBiome: 'forest',
      diet: [
        { target: 'rabbit', nutritionValue: 0.3, preference: 0.7 },
      ],
    },
    visual: { meshId: 'owl', scale: 0.6, animation: 'perch' },
  },
  // Pollinators
  bee: {
    category: 'pollinator',
    genome: {
      speed: 6, perceptionRadius: 8, maxAge: 100, metabolism: 0.5,
      reproductionRate: 0.01, size: 0.05, aggression: 0.1, sociality: 0.9,
      camouflage: 0, preferredBiome: 'meadow',
      diet: [
        { target: 'wildflower', nutritionValue: 0.2, preference: 0.9 },
      ],
    },
    visual: { meshId: 'bee', scale: 0.1, animation: 'buzz' },
  },
  butterfly: {
    category: 'pollinator',
    genome: {
      speed: 3, perceptionRadius: 6, maxAge: 80, metabolism: 0.3,
      reproductionRate: 0.008, size: 0.03, aggression: 0, sociality: 0.3,
      camouflage: 0.3, preferredBiome: 'meadow',
      diet: [
        { target: 'wildflower', nutritionValue: 0.15, preference: 0.8 },
      ],
    },
    visual: { meshId: 'butterfly', scale: 0.08, animation: 'flutter' },
  },
  // Decomposers
  earthworm: {
    category: 'decomposer',
    genome: {
      speed: 0.5, perceptionRadius: 2, maxAge: 300, metabolism: 0.1,
      reproductionRate: 0.01, size: 0.05, aggression: 0, sociality: 0,
      camouflage: 1.0, preferredBiome: 'grassland',
      diet: [],
    },
    visual: { meshId: 'earthworm', scale: 0.05, animation: 'burrow' },
  },
};

// =============================================================================
// Ecological Simulation
// =============================================================================

export class EcologicalSimulation {
  private world: WorldState;
  private config: ABMConfig;
  private rng: SimRNG;
  private behaviorRules: Map<AgentCategory, BehaviorRule[]>;
  private agentIdCounter = 0;
  private eventHandlers = new Map<string, Array<(...args: any[]) => void>>();
  private running = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<ABMConfig> = {}) {
    this.config = {
      worldWidth: config.worldWidth ?? 64,
      worldHeight: config.worldHeight ?? 64,
      tickRate: config.tickRate ?? 10,
      maxAgents: config.maxAgents ?? 5000,
      initialPopulation: config.initialPopulation ?? this.defaultPopulation(),
      grammarRules: config.grammarRules ?? getDefaultGrammarRules(),
      behaviorRules: config.behaviorRules ?? getDefaultBehaviors(),
      environment: config.environment ?? {},
      seed: config.seed ?? Date.now(),
      narrativeEnabled: config.narrativeEnabled ?? false,
      narrativeInterval: config.narrativeInterval ?? 100,
    };

    this.rng = new SimRNG(this.config.seed);
    this.behaviorRules = this.config.behaviorRules;

    // Generate world topology via graph grammar
    const grammar = new GraphGrammarEngine(
      this.config.grammarRules,
      this.config.seed,
    );
    const topology = grammar.generate();

    // Initialize world state
    this.world = {
      tick: 0,
      width: this.config.worldWidth,
      height: this.config.worldHeight,
      grid: this.createGrid(topology),
      agents: new Map(),
      environment: this.createEnvironment(),
      topology,
      stats: this.emptyStats(),
    };

    // Spawn initial population
    this.spawnInitialPopulation();
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  private defaultPopulation(): InitialPopulation[] {
    return [
      { species: 'grass', category: 'flora', count: 300 },
      { species: 'wildflower', category: 'flora', count: 100 },
      { species: 'oak', category: 'flora', count: 30 },
      { species: 'deer', category: 'herbivore', count: 20 },
      { species: 'rabbit', category: 'herbivore', count: 40 },
      { species: 'cattle', category: 'herbivore', count: 10, region: 'grassland' },
      { species: 'fox', category: 'predator', count: 8 },
      { species: 'owl', category: 'predator', count: 5, region: 'forest' },
      { species: 'bee', category: 'pollinator', count: 50 },
      { species: 'butterfly', category: 'pollinator', count: 30 },
      { species: 'earthworm', category: 'decomposer', count: 100 },
    ];
  }

  private createGrid(topology: GraphPattern): SpatialCell[][] {
    const grid: SpatialCell[][] = [];
    const w = this.config.worldWidth;
    const h = this.config.worldHeight;

    // Assign biomes based on topology nodes (Voronoi-like)
    const biomePoints: Array<{ x: number; y: number; biome: BiomeType; elevation: number }> = [];
    for (const node of topology.nodes) {
      const pos = (node.metadata?.layoutPosition as { x: number; y: number }) ?? {
        x: this.rng.next() * w,
        y: this.rng.next() * h,
      };
      biomePoints.push({
        x: (pos.x + 50) / 100 * w,
        y: (pos.y + 50) / 100 * h,
        biome: node.type,
        elevation: node.elevation,
      });
    }

    // If no topology nodes, use default grassland
    if (biomePoints.length === 0) {
      biomePoints.push({ x: w / 2, y: h / 2, biome: 'grassland', elevation: 100 });
    }

    for (let y = 0; y < h; y++) {
      grid[y] = [];
      for (let x = 0; x < w; x++) {
        // Find nearest biome point (Voronoi assignment)
        let nearestDist = Infinity;
        let nearestBiome: BiomeType = 'grassland';
        let nearestElevation = 100;

        for (const bp of biomePoints) {
          const dx = x - bp.x;
          const dy = y - bp.y;
          const dist = dx * dx + dy * dy;
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestBiome = bp.biome;
            nearestElevation = bp.elevation;
          }
        }

        grid[y][x] = {
          x,
          y,
          elevation: nearestElevation + (this.rng.nextGaussian() * 5),
          biome: nearestBiome,
          moisture: this.biomeMoisture(nearestBiome) + (this.rng.next() - 0.5) * 0.2,
          fertility: this.biomeFertility(nearestBiome) + (this.rng.next() - 0.5) * 0.1,
          lightExposure: nearestBiome === 'forest' ? 0.3 : nearestBiome === 'woodland' ? 0.5 : 0.8,
          temperature: 15 + (this.rng.next() - 0.5) * 5,
          occupants: [],
          features: [],
        };
      }
    }

    return grid;
  }

  private biomeMoisture(biome: BiomeType): number {
    const map: Record<BiomeType, number> = {
      'grassland': 0.5, 'woodland': 0.6, 'wetland': 0.9, 'scrubland': 0.3,
      'meadow': 0.5, 'forest': 0.7, 'riparian': 0.85, 'rocky': 0.2,
      'urban-edge': 0.3,
    };
    return map[biome] ?? 0.5;
  }

  private biomeFertility(biome: BiomeType): number {
    const map: Record<BiomeType, number> = {
      'grassland': 0.6, 'woodland': 0.7, 'wetland': 0.8, 'scrubland': 0.3,
      'meadow': 0.7, 'forest': 0.8, 'riparian': 0.9, 'rocky': 0.1,
      'urban-edge': 0.2,
    };
    return map[biome] ?? 0.5;
  }

  private createEnvironment(): EnvironmentState {
    return {
      season: (this.config.environment?.season as EnvironmentState['season']) ?? 'spring',
      dayInSeason: 0,
      timeOfDay: 8,
      temperatureModifier: 0,
      moistureModifier: 0,
      wind: { direction: 0, strength: 5 },
      weatherEvents: [],
    };
  }

  private emptyStats(): PopulationStats {
    return {
      populationBySpecies: new Map(),
      populationByCategory: new Map(),
      totalBiomass: 0,
      biodiversityIndex: 0,
      birthsThisTick: 0,
      deathsThisTick: 0,
      averageHealth: 0,
    };
  }

  private spawnInitialPopulation(): void {
    for (const pop of this.config.initialPopulation) {
      for (let i = 0; i < pop.count; i++) {
        const cell = this.findSpawnCell(pop.region);
        if (cell) {
          this.spawnAgent(pop.species, pop.category, cell, pop.genome);
        }
      }
    }
  }

  private findSpawnCell(preferredBiome?: BiomeType): SpatialCell | null {
    for (let attempt = 0; attempt < 100; attempt++) {
      const x = this.rng.nextInt(0, this.config.worldWidth - 1);
      const y = this.rng.nextInt(0, this.config.worldHeight - 1);
      const cell = this.world.grid[y]?.[x];
      if (cell && (!preferredBiome || cell.biome === preferredBiome)) {
        return cell;
      }
    }
    // Fallback: any cell
    const x = this.rng.nextInt(0, this.config.worldWidth - 1);
    const y = this.rng.nextInt(0, this.config.worldHeight - 1);
    return this.world.grid[y]?.[x] ?? null;
  }

  // ===========================================================================
  // Agent Spawning
  // ===========================================================================

  private spawnAgent(
    species: SpeciesType,
    category: AgentCategory,
    cell: SpatialCell,
    genomeOverrides?: Partial<AgentGenome>,
    parentId?: string,
  ): EcologicalAgent {
    const template = SPECIES_TEMPLATES[species];
    const baseGenome: AgentGenome = {
      speed: 1, perceptionRadius: 5, maxAge: 500, metabolism: 0.3,
      reproductionRate: 0.01, size: 1, aggression: 0.3, sociality: 0.5,
      camouflage: 0.3, preferredBiome: 'grassland', diet: [], traits: {},
      ...(template?.genome ?? {}),
      ...(genomeOverrides ?? {}),
    };

    // Add genetic variation
    const mutate = (val: number, range: number = 0.1): number =>
      Math.max(0, val + this.rng.nextGaussian() * range * val);

    const genome: AgentGenome = {
      ...baseGenome,
      speed: mutate(baseGenome.speed),
      perceptionRadius: mutate(baseGenome.perceptionRadius),
      maxAge: Math.round(mutate(baseGenome.maxAge, 0.05)),
      metabolism: mutate(baseGenome.metabolism),
      size: mutate(baseGenome.size, 0.05),
    };

    const visual: AgentVisual = {
      meshId: template?.visual.meshId ?? species,
      scale: template?.visual.scale ?? 1,
      tint: { r: 1, g: 1, b: 1 },
      animation: template?.visual.animation ?? 'idle',
      lodLevel: 0,
    };

    const agent: EcologicalAgent = {
      id: `agent-${++this.agentIdCounter}`,
      species,
      category,
      position: {
        x: cell.x + this.rng.next(),
        y: cell.elevation,
        z: cell.y + this.rng.next(),
      },
      cell: { x: cell.x, y: cell.y },
      age: 0,
      health: 1.0,
      energy: 0.5 + this.rng.next() * 0.5,
      reproductionDrive: 0,
      state: 'idle',
      genome,
      memory: [],
      visual,
      alive: true,
      bornAt: this.world.tick,
    };

    this.world.agents.set(agent.id, agent);
    cell.occupants.push(agent.id);

    this.emit('agent:born', { agent, parentId });
    return agent;
  }

  // ===========================================================================
  // Simulation Loop
  // ===========================================================================

  /**
   * Start the simulation loop at the configured tick rate.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.tickTimer = setInterval(
      () => this.tick(),
      1000 / this.config.tickRate,
    );
  }

  /**
   * Stop the simulation loop.
   */
  stop(): void {
    this.running = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /**
   * Execute a single simulation tick.
   */
  tick(): void {
    const tickStart = performance.now();

    // 1. Update environment
    this.updateEnvironment();

    // 2-6. Agent loop: perceive, decide, act, resolve
    const agents = Array.from(this.world.agents.values()).filter((a) => a.alive);
    const births: EcologicalAgent[] = [];
    const deaths: string[] = [];

    for (const agent of agents) {
      if (!agent.alive) continue;

      // Perceive
      const perception = this.perceive(agent);

      // Get cell
      const cellX = Math.floor(Math.max(0, Math.min(agent.position.x, this.world.width - 1)));
      const cellY = Math.floor(Math.max(0, Math.min(agent.position.z, this.world.height - 1)));
      const cell = this.world.grid[cellY]?.[cellX];
      if (!cell) continue;

      // Decide (evaluate behavior rules)
      const rules = this.behaviorRules.get(agent.category) ?? [];
      const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

      let action: AgentAction | null = null;
      for (const rule of sortedRules) {
        if (rule.condition(agent, perception, cell, this.world)) {
          action = rule.action(agent, perception, cell, this.world);
          break;
        }
      }

      if (!action) continue;

      // Act
      this.executeAction(agent, action, cell, births, deaths);

      // Update agent state
      this.updateAgent(agent, cell);
    }

    // 7. Process births and deaths
    for (const deadId of deaths) {
      const dead = this.world.agents.get(deadId);
      if (dead) {
        dead.alive = false;
        dead.diedAt = this.world.tick;
        // Remove from cell
        const cell = this.world.grid[dead.cell.y]?.[dead.cell.x];
        if (cell) {
          cell.occupants = cell.occupants.filter((id) => id !== deadId);
        }
      }
    }

    // 8. Update stats
    this.updateStats();

    // Advance tick
    this.world.tick++;
    const deltaMs = performance.now() - tickStart;
    this.emit('tick', { tick: this.world.tick, deltaMs });

    // Narrative generation (if enabled)
    if (
      this.config.narrativeEnabled &&
      this.world.tick % this.config.narrativeInterval === 0
    ) {
      this.generateNarrative();
    }

    // Periodic cleanup: remove long-dead agents
    if (this.world.tick % 100 === 0) {
      this.cleanupDeadAgents(500);
    }
  }

  // ===========================================================================
  // Perception
  // ===========================================================================

  private perceive(agent: EcologicalAgent): PerceivedAgent[] {
    const perceived: PerceivedAgent[] = [];
    const radius = agent.genome.perceptionRadius;

    // Scan nearby cells
    const cellX = Math.floor(agent.position.x);
    const cellZ = Math.floor(agent.position.z);
    const cellRadius = Math.ceil(radius);

    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const cy = cellZ + dy;
        const cx = cellX + dx;
        if (cx < 0 || cx >= this.world.width || cy < 0 || cy >= this.world.height) continue;

        const cell = this.world.grid[cy]?.[cx];
        if (!cell) continue;

        for (const occupantId of cell.occupants) {
          if (occupantId === agent.id) continue;
          const other = this.world.agents.get(occupantId);
          if (!other || !other.alive) continue;

          const dist = this.distance3D(agent.position, other.position);
          if (dist > radius) continue;

          // Camouflage check
          if (this.rng.next() < other.genome.camouflage * 0.5 && dist > radius * 0.3) {
            continue;
          }

          perceived.push({
            id: other.id,
            species: other.species,
            category: other.category,
            position: { ...other.position },
            distance: dist,
            health: other.health,
            state: other.state,
            threatLevel: this.calculateThreat(agent, other),
          });
        }
      }
    }

    return perceived;
  }

  private calculateThreat(observer: EcologicalAgent, other: EcologicalAgent): number {
    if (other.category === 'predator' && observer.category !== 'predator') {
      return other.genome.aggression * other.genome.size / (observer.genome.size || 1);
    }
    if (other.category === observer.category && other.genome.aggression > 0.5) {
      return other.genome.aggression * 0.3;
    }
    return 0;
  }

  // ===========================================================================
  // Action Execution
  // ===========================================================================

  private executeAction(
    agent: EcologicalAgent,
    action: AgentAction,
    cell: SpatialCell,
    births: EcologicalAgent[],
    deaths: string[],
  ): void {
    // Apply energy cost
    agent.energy = Math.max(0, agent.energy - action.energyCost);

    switch (action.type) {
      case 'move':
        if (action.targetPosition) {
          const oldPos = { ...agent.position };
          agent.position = this.clampPosition(action.targetPosition);
          agent.state = 'foraging';
          this.updateAgentCell(agent, cell);
          this.emit('agent:moved', { agent, from: oldPos, to: agent.position });
        }
        break;

      case 'eat':
        if (action.targetId) {
          const prey = this.world.agents.get(action.targetId);
          if (prey && prey.alive) {
            const nutrition = (action.data?.nutritionGained as number) ?? 0.1;
            agent.energy = Math.min(1.0, agent.energy + nutrition);
            prey.health -= nutrition * 2; // Damage to prey
            if (prey.health <= 0) {
              deaths.push(prey.id);
              this.emit('agent:died', { agent: prey, cause: 'eaten' });
            }
            agent.state = 'grazing';
            this.emit('agent:ate', { predator: agent, prey });
          }
        }
        break;

      case 'attack':
        if (action.targetId) {
          const target = this.world.agents.get(action.targetId);
          if (target && target.alive) {
            const damage = (action.data?.damage as number) ?? 0.3;
            target.health -= damage;
            if (target.health <= 0) {
              deaths.push(target.id);
              agent.energy = Math.min(1.0, agent.energy + 0.3);
              this.emit('agent:died', { agent: target, cause: 'predation' });
            }
            agent.state = 'hunting';
          }
        }
        break;

      case 'reproduce':
        if (
          this.world.agents.size < this.config.maxAgents &&
          agent.energy > 0.3
        ) {
          const spawnPos = action.targetPosition ?? {
            x: agent.position.x + (this.rng.next() - 0.5) * 2,
            y: agent.position.y,
            z: agent.position.z + (this.rng.next() - 0.5) * 2,
          };
          const spawnCellX = Math.floor(
            Math.max(0, Math.min(spawnPos.x, this.world.width - 1)),
          );
          const spawnCellY = Math.floor(
            Math.max(0, Math.min(spawnPos.z, this.world.height - 1)),
          );
          const spawnCell = this.world.grid[spawnCellY]?.[spawnCellX];
          if (spawnCell) {
            const offspring = this.spawnAgent(
              agent.species,
              agent.category,
              spawnCell,
              agent.genome,
              agent.id,
            );
            births.push(offspring);
            agent.reproductionDrive = 0;
            agent.state = 'reproducing';
            this.emit('agent:reproduced', { parent: agent, offspring });
          }
        }
        break;

      case 'flee':
        if (action.targetPosition) {
          const oldPos = { ...agent.position };
          agent.position = this.clampPosition(action.targetPosition);
          agent.state = 'fleeing';
          this.updateAgentCell(agent, cell);
          this.emit('agent:moved', { agent, from: oldPos, to: agent.position });
        }
        break;

      case 'rest':
        agent.state = 'resting';
        agent.health = Math.min(1.0, agent.health + 0.005);
        break;

      case 'grow':
        agent.state = 'growing';
        agent.genome.size = Math.min(
          agent.genome.size * 1.5,
          agent.genome.size + 0.01 * ((action.data?.growthRate as number) ?? 1),
        );
        agent.visual.scale = agent.genome.size;
        break;

      case 'die':
        agent.alive = false;
        agent.diedAt = this.world.tick;
        deaths.push(agent.id);
        this.emit('agent:died', {
          agent,
          cause: (action.data?.cause as string) ?? 'unknown',
        });
        break;

      case 'pollinate':
        if (action.targetId) {
          const flower = this.world.agents.get(action.targetId);
          if (flower && flower.alive) {
            flower.reproductionDrive = Math.min(
              1.0,
              flower.reproductionDrive + ((action.data?.pollinationStrength as number) ?? 0.1),
            );
          }
          agent.state = 'pollinating';
          agent.energy = Math.min(1.0, agent.energy + 0.05);
        }
        break;

      case 'decompose':
        if (action.targetId) {
          const dead = this.world.agents.get(action.targetId);
          if (dead) {
            this.world.agents.delete(action.targetId);
            // Increase local soil fertility
            cell.fertility = Math.min(1.0, cell.fertility + ((action.data?.fertilityIncrease as number) ?? 0.05));
          }
          agent.state = 'decomposing';
          agent.energy = Math.min(1.0, agent.energy + 0.1);
        }
        break;

      case 'mark-territory':
        agent.state = 'territorial';
        agent.memory.push({
          type: 'territory',
          position: { ...agent.position },
          tick: this.world.tick,
          importance: 0.8,
        });
        break;
    }
  }

  // ===========================================================================
  // Agent Updates
  // ===========================================================================

  private updateAgent(agent: EcologicalAgent, cell: SpatialCell): void {
    agent.age++;

    // Metabolism: consume energy each tick
    agent.energy -= agent.genome.metabolism * 0.001;

    // Reproduction drive increases over time
    agent.reproductionDrive = Math.min(
      1.0,
      agent.reproductionDrive + agent.genome.reproductionRate,
    );

    // Biome affinity: bonus in preferred biome
    if (cell.biome === agent.genome.preferredBiome) {
      agent.health = Math.min(1.0, agent.health + 0.002);
    } else {
      agent.health -= 0.001;
    }

    // Seasonal effects
    if (this.world.environment.season === 'winter' && agent.category !== 'flora') {
      agent.energy -= 0.005; // Extra energy drain in winter
    }

    // Memory cleanup (forget old memories)
    agent.memory = agent.memory.filter(
      (m) => this.world.tick - m.tick < 50 || m.importance > 0.7,
    );

    // Clamp values
    agent.energy = Math.max(0, Math.min(1.0, agent.energy));
    agent.health = Math.max(0, Math.min(1.0, agent.health));
  }

  private updateAgentCell(agent: EcologicalAgent, oldCell: SpatialCell): void {
    const newCellX = Math.floor(Math.max(0, Math.min(agent.position.x, this.world.width - 1)));
    const newCellZ = Math.floor(Math.max(0, Math.min(agent.position.z, this.world.height - 1)));

    if (newCellX !== agent.cell.x || newCellZ !== agent.cell.y) {
      // Remove from old cell
      oldCell.occupants = oldCell.occupants.filter((id) => id !== agent.id);
      // Add to new cell
      const newCell = this.world.grid[newCellZ]?.[newCellX];
      if (newCell) {
        newCell.occupants.push(agent.id);
        agent.cell = { x: newCellX, y: newCellZ };
      }
    }
  }

  // ===========================================================================
  // Environment
  // ===========================================================================

  private updateEnvironment(): void {
    const env = this.world.environment;

    // Time of day (1 tick = ~15 minutes)
    env.timeOfDay = (env.timeOfDay + 0.25) % 24;

    // Day in season
    if (env.timeOfDay < 0.25) {
      env.dayInSeason++;
      if (env.dayInSeason >= 90) {
        const oldSeason = env.season;
        const seasons: EnvironmentState['season'][] = [
          'spring', 'summer', 'autumn', 'winter',
        ];
        const idx = seasons.indexOf(env.season);
        env.season = seasons[(idx + 1) % 4];
        env.dayInSeason = 0;
        this.emit('season:changed', { from: oldSeason, to: env.season });
      }
    }

    // Temperature
    const seasonTemp: Record<string, number> = {
      spring: 12, summer: 22, autumn: 10, winter: 2,
    };
    env.temperatureModifier = seasonTemp[env.season] ?? 15;

    // Update grid temperatures
    for (const row of this.world.grid) {
      for (const cell of row) {
        cell.temperature = env.temperatureModifier +
          (cell.elevation - 100) * -0.01 +
          (this.rng.next() - 0.5) * 2;
        cell.lightExposure = cell.biome === 'forest'
          ? 0.3
          : env.timeOfDay > 6 && env.timeOfDay < 20 ? 0.8 : 0.1;
      }
    }

    // Weather events
    if (this.rng.next() < 0.02) {
      const eventTypes: WeatherEvent['type'][] = ['rain', 'storm', 'drought', 'frost', 'heatwave'];
      const event: WeatherEvent = {
        type: eventTypes[this.rng.nextInt(0, eventTypes.length - 1)],
        intensity: this.rng.next(),
        center: {
          x: this.rng.nextInt(0, this.config.worldWidth),
          y: this.rng.nextInt(0, this.config.worldHeight),
        },
        radius: this.rng.nextInt(5, 20),
        duration: this.rng.nextInt(10, 50),
        remaining: 0,
      };
      event.remaining = event.duration;
      env.weatherEvents.push(event);
      this.emit('weather:started', { event });
    }

    // Update weather
    env.weatherEvents = env.weatherEvents.filter((e) => {
      e.remaining--;
      if (e.remaining <= 0) {
        this.emit('weather:ended', { event: e });
        return false;
      }
      // Apply weather effects to grid cells
      this.applyWeatherToGrid(e);
      return true;
    });
  }

  private applyWeatherToGrid(event: WeatherEvent): void {
    const cx = event.center.x;
    const cy = event.center.y;
    const r = event.radius;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const gx = Math.round(cx + dx);
        const gy = Math.round(cy + dy);
        if (gx < 0 || gx >= this.world.width || gy < 0 || gy >= this.world.height) continue;
        if (dx * dx + dy * dy > r * r) continue;

        const cell = this.world.grid[gy][gx];
        switch (event.type) {
          case 'rain':
            cell.moisture = Math.min(1.0, cell.moisture + event.intensity * 0.02);
            break;
          case 'storm':
            cell.moisture = Math.min(1.0, cell.moisture + event.intensity * 0.04);
            break;
          case 'drought':
            cell.moisture = Math.max(0, cell.moisture - event.intensity * 0.03);
            break;
          case 'frost':
            cell.temperature -= event.intensity * 5;
            break;
          case 'heatwave':
            cell.temperature += event.intensity * 5;
            cell.moisture = Math.max(0, cell.moisture - event.intensity * 0.01);
            break;
        }
      }
    }
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  private updateStats(): void {
    const stats = this.world.stats;
    stats.populationBySpecies.clear();
    stats.populationByCategory.clear();
    stats.totalBiomass = 0;
    stats.birthsThisTick = 0;
    stats.deathsThisTick = 0;
    let healthSum = 0;
    let aliveCount = 0;

    for (const agent of this.world.agents.values()) {
      if (!agent.alive) continue;
      aliveCount++;

      const speciesCount = stats.populationBySpecies.get(agent.species) ?? 0;
      stats.populationBySpecies.set(agent.species, speciesCount + 1);

      const catCount = stats.populationByCategory.get(agent.category) ?? 0;
      stats.populationByCategory.set(agent.category, catCount + 1);

      stats.totalBiomass += agent.genome.size;
      healthSum += agent.health;
    }

    stats.averageHealth = aliveCount > 0 ? healthSum / aliveCount : 0;

    // Simpson's Biodiversity Index
    const total = aliveCount;
    if (total > 1) {
      let sum = 0;
      for (const count of stats.populationBySpecies.values()) {
        sum += (count * (count - 1)) / (total * (total - 1));
      }
      stats.biodiversityIndex = 1 - sum;
    } else {
      stats.biodiversityIndex = 0;
    }
  }

  // ===========================================================================
  // Narrative Generation (LLM Integration Point)
  // ===========================================================================

  private generateNarrative(): void {
    const stats = this.world.stats;
    const context: Record<string, unknown> = {
      tick: this.world.tick,
      season: this.world.environment.season,
      dayInSeason: this.world.environment.dayInSeason,
      totalPopulation: Array.from(stats.populationBySpecies.values()).reduce(
        (s, v) => s + v, 0,
      ),
      biodiversity: stats.biodiversityIndex,
      dominantSpecies: this.getDominantSpecies(),
      weather: this.world.environment.weatherEvents.map((e) => e.type),
    };

    // Placeholder: in production, this calls an LLM endpoint
    const text = `[Tick ${this.world.tick}] ${this.world.environment.season} — ` +
      `Population: ${context.totalPopulation}, ` +
      `Biodiversity: ${(stats.biodiversityIndex * 100).toFixed(1)}%, ` +
      `Dominant: ${context.dominantSpecies}`;

    this.emit('narrative:generated', { text, tick: this.world.tick, context });
  }

  private getDominantSpecies(): string {
    let max = 0;
    let dominant = 'none';
    for (const [species, count] of this.world.stats.populationBySpecies) {
      if (count > max) {
        max = count;
        dominant = species;
      }
    }
    return dominant;
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  private cleanupDeadAgents(ticksBeforeRemoval: number): void {
    const threshold = this.world.tick - ticksBeforeRemoval;
    for (const [id, agent] of this.world.agents) {
      if (!agent.alive && (agent.diedAt ?? 0) < threshold) {
        this.world.agents.delete(id);
      }
    }
  }

  // ===========================================================================
  // Utility
  // ===========================================================================

  private distance3D(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private clampPosition(pos: Vector3): Vector3 {
    return {
      x: Math.max(0, Math.min(pos.x, this.world.width - 1)),
      y: pos.y,
      z: Math.max(0, Math.min(pos.z, this.world.height - 1)),
    };
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  on<K extends SimulationEventType>(
    event: K,
    handler: SimulationEventHandler<K>,
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    };
  }

  private emit<K extends SimulationEventType>(
    event: K,
    data: SimulationEventMap[K],
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        (handler as SimulationEventHandler<K>)(data);
      }
    }
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  getWorldState(): Readonly<WorldState> {
    return this.world;
  }

  getStats(): Readonly<PopulationStats> {
    return this.world.stats;
  }

  getAgent(id: string): EcologicalAgent | undefined {
    return this.world.agents.get(id);
  }

  getAgentsBySpecies(species: SpeciesType): EcologicalAgent[] {
    return Array.from(this.world.agents.values()).filter(
      (a) => a.species === species && a.alive,
    );
  }

  getAgentsByCategory(category: AgentCategory): EcologicalAgent[] {
    return Array.from(this.world.agents.values()).filter(
      (a) => a.category === category && a.alive,
    );
  }

  getCell(x: number, y: number): SpatialCell | null {
    return this.world.grid[y]?.[x] ?? null;
  }

  isRunning(): boolean {
    return this.running;
  }

  getTick(): number {
    return this.world.tick;
  }

  dispose(): void {
    this.stop();
    this.world.agents.clear();
    this.eventHandlers.clear();
  }
}
