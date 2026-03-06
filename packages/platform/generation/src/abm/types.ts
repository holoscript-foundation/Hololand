/**
 * Ecological Agent-Based Model (ABM) - Type Definitions
 *
 * Replaces explicit constraint-based world dynamics with agent-based
 * ecological simulation. Spatial interactions produce emergent behavior
 * (validated by Knepp Estate 2025 rewilding study).
 *
 * Architecture:
 *   Graph Grammar (topology) + ABM (dynamics) + LLM (narrative)
 *
 * @module abm/types
 */

// =============================================================================
// Spatial Grid
// =============================================================================

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

export interface SpatialCell {
  /** Grid coordinates */
  x: number;
  y: number;
  /** Elevation (meters) */
  elevation: number;
  /** Biome classification */
  biome: BiomeType;
  /** Soil moisture (0-1) */
  moisture: number;
  /** Soil fertility (0-1) */
  fertility: number;
  /** Light exposure (0-1, accounts for canopy shading) */
  lightExposure: number;
  /** Temperature (Celsius) */
  temperature: number;
  /** Agents currently occupying this cell */
  occupants: string[];
  /** Terrain features (rocks, water, etc.) */
  features: TerrainFeature[];
}

export type BiomeType =
  | 'grassland'
  | 'woodland'
  | 'wetland'
  | 'scrubland'
  | 'meadow'
  | 'forest'
  | 'riparian'
  | 'rocky'
  | 'urban-edge';

export interface TerrainFeature {
  type: 'rock' | 'water' | 'path' | 'structure' | 'deadwood' | 'burrow';
  position: Vector3;
  radius: number;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Ecological Agent
// =============================================================================

/**
 * Base ecological agent. Every entity in the simulation (plant, animal,
 * fungus, weather system) is an agent with behavior rules.
 */
export interface EcologicalAgent {
  /** Unique agent ID */
  id: string;
  /** Species or entity type */
  species: SpeciesType;
  /** Agent category */
  category: AgentCategory;
  /** Current position in world space */
  position: Vector3;
  /** Current grid cell */
  cell: Vector2;
  /** Age in simulation ticks */
  age: number;
  /** Health/vitality (0-1, dies at 0) */
  health: number;
  /** Energy reserves (0-1, starves at 0) */
  energy: number;
  /** Reproduction readiness (0-1, reproduces at 1) */
  reproductionDrive: number;
  /** Current behavioral state */
  state: AgentState;
  /** Genome: heritable traits that affect behavior */
  genome: AgentGenome;
  /** Memory of recent interactions */
  memory: AgentMemory[];
  /** Visual representation data */
  visual: AgentVisual;
  /** Whether this agent is alive */
  alive: boolean;
  /** Tick this agent was born */
  bornAt: number;
  /** Tick this agent died (if dead) */
  diedAt?: number;
}

export type AgentCategory =
  | 'flora'       // Plants, trees, fungi
  | 'herbivore'   // Grazing/browsing animals
  | 'predator'    // Carnivores
  | 'omnivore'    // Mixed diet
  | 'decomposer'  // Fungi, bacteria
  | 'pollinator'  // Insects, birds
  | 'environmental'; // Weather, water, fire

export type SpeciesType =
  // Flora
  | 'oak' | 'birch' | 'hawthorn' | 'bramble' | 'grass' | 'wildflower'
  | 'fern' | 'moss' | 'lichen' | 'mushroom' | 'ivy' | 'reed'
  // Herbivores
  | 'deer' | 'rabbit' | 'cattle' | 'pig' | 'pony' | 'sheep'
  // Predators
  | 'fox' | 'owl' | 'hawk' | 'stoat' | 'badger'
  // Pollinators
  | 'bee' | 'butterfly' | 'beetle' | 'moth'
  // Decomposers
  | 'earthworm' | 'fungal-network'
  // Environmental
  | 'rain-system' | 'wind-system' | 'fire' | 'stream'
  // Generic
  | string;

export type AgentState =
  | 'idle'
  | 'foraging'
  | 'grazing'
  | 'hunting'
  | 'fleeing'
  | 'resting'
  | 'reproducing'
  | 'migrating'
  | 'growing'
  | 'dormant'
  | 'decomposing'
  | 'pollinating'
  | 'territorial'
  | 'socializing';

// =============================================================================
// Agent Genome (Heritable Traits)
// =============================================================================

export interface AgentGenome {
  /** Movement speed (cells per tick) */
  speed: number;
  /** Perception radius (cells) */
  perceptionRadius: number;
  /** Maximum lifespan (ticks) */
  maxAge: number;
  /** Energy efficiency (lower = less energy consumed per tick) */
  metabolism: number;
  /** Reproduction threshold and cooldown */
  reproductionRate: number;
  /** Size (affects interactions, carrying capacity) */
  size: number;
  /** Aggression level (0-1) */
  aggression: number;
  /** Sociality (0-1, affects flocking/herding) */
  sociality: number;
  /** Camouflage effectiveness (0-1) */
  camouflage: number;
  /** Adaptation to biome (bonus in preferred biome) */
  preferredBiome: BiomeType;
  /** Diet preferences */
  diet: DietPreference[];
  /** Custom traits */
  traits: Record<string, number>;
}

export interface DietPreference {
  /** Target species */
  target: SpeciesType;
  /** Nutritional value (energy gained per unit consumed) */
  nutritionValue: number;
  /** Preference weight (higher = more likely to pursue) */
  preference: number;
}

// =============================================================================
// Agent Memory & Perception
// =============================================================================

export interface AgentMemory {
  /** What was perceived */
  type: 'food' | 'threat' | 'mate' | 'shelter' | 'territory';
  /** Location */
  position: Vector3;
  /** When (tick) */
  tick: number;
  /** Target agent ID (if applicable) */
  targetId?: string;
  /** Importance (higher = remembered longer) */
  importance: number;
}

export interface PerceivedAgent {
  id: string;
  species: SpeciesType;
  category: AgentCategory;
  position: Vector3;
  distance: number;
  health: number;
  state: AgentState;
  /** Perceived threat level */
  threatLevel: number;
}

// =============================================================================
// Agent Visual Representation
// =============================================================================

export interface AgentVisual {
  /** 3D model/mesh identifier */
  meshId: string;
  /** Scale multiplier */
  scale: number;
  /** Color tint (for seasonal/health variation) */
  tint: { r: number; g: number; b: number };
  /** Animation state */
  animation: string;
  /** LOD level (for rendering optimization) */
  lodLevel: number;
}

// =============================================================================
// Behavior Rules
// =============================================================================

/**
 * Behavior rule evaluated each tick. Rules are prioritized;
 * first matching rule determines agent action.
 */
export interface BehaviorRule {
  /** Rule name for debugging */
  name: string;
  /** Priority (lower = evaluated first) */
  priority: number;
  /** Condition function: should this rule fire? */
  condition: (
    agent: EcologicalAgent,
    perception: PerceivedAgent[],
    cell: SpatialCell,
    world: WorldState,
  ) => boolean;
  /** Action function: what does the agent do? */
  action: (
    agent: EcologicalAgent,
    perception: PerceivedAgent[],
    cell: SpatialCell,
    world: WorldState,
  ) => AgentAction;
}

export interface AgentAction {
  /** Action type */
  type:
    | 'move'
    | 'eat'
    | 'reproduce'
    | 'attack'
    | 'flee'
    | 'rest'
    | 'grow'
    | 'die'
    | 'pollinate'
    | 'decompose'
    | 'mark-territory';
  /** Target position (for move, flee) */
  targetPosition?: Vector3;
  /** Target agent (for eat, attack, reproduce) */
  targetId?: string;
  /** Energy cost of this action */
  energyCost: number;
  /** Additional data */
  data?: Record<string, unknown>;
}

// =============================================================================
// Graph Grammar World Structure
// =============================================================================

/**
 * Graph grammar defines world topology. Nodes are regions,
 * edges are connections/transitions between regions.
 */
export interface GraphGrammarRule {
  /** Rule name */
  name: string;
  /** Pattern to match (left-hand side) */
  lhs: GraphPattern;
  /** Replacement (right-hand side) */
  rhs: GraphPattern;
  /** Application probability (0-1) */
  probability: number;
  /** Minimum number of applications */
  minApplications: number;
  /** Maximum number of applications */
  maxApplications: number;
}

export interface GraphPattern {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: BiomeType;
  size: number;
  elevation: number;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'adjacent' | 'path' | 'waterway' | 'elevation-transition';
  weight: number;
}

// =============================================================================
// World State
// =============================================================================

export interface WorldState {
  /** Current simulation tick */
  tick: number;
  /** World dimensions (cells) */
  width: number;
  height: number;
  /** Spatial grid */
  grid: SpatialCell[][];
  /** All agents */
  agents: Map<string, EcologicalAgent>;
  /** Global environmental conditions */
  environment: EnvironmentState;
  /** Graph grammar topology */
  topology: GraphPattern;
  /** Population statistics */
  stats: PopulationStats;
}

export interface EnvironmentState {
  /** Current season */
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  /** Day within season (0-90) */
  dayInSeason: number;
  /** Time of day (0-24) */
  timeOfDay: number;
  /** Global temperature modifier */
  temperatureModifier: number;
  /** Global moisture modifier */
  moistureModifier: number;
  /** Wind direction and strength */
  wind: { direction: number; strength: number };
  /** Active weather events */
  weatherEvents: WeatherEvent[];
}

export interface WeatherEvent {
  type: 'rain' | 'storm' | 'drought' | 'frost' | 'heatwave';
  intensity: number;
  center: Vector2;
  radius: number;
  duration: number;
  remaining: number;
}

export interface PopulationStats {
  /** Agent count per species */
  populationBySpecies: Map<SpeciesType, number>;
  /** Agent count per category */
  populationByCategory: Map<AgentCategory, number>;
  /** Total biomass estimate */
  totalBiomass: number;
  /** Biodiversity index (Simpson's) */
  biodiversityIndex: number;
  /** Births this tick */
  birthsThisTick: number;
  /** Deaths this tick */
  deathsThisTick: number;
  /** Average health */
  averageHealth: number;
}

// =============================================================================
// Simulation Configuration
// =============================================================================

export interface ABMConfig {
  /** World size in cells */
  worldWidth: number;
  worldHeight: number;
  /** Simulation speed (ticks per second) */
  tickRate: number;
  /** Maximum agents before population pressure kicks in */
  maxAgents: number;
  /** Initial population configuration */
  initialPopulation: InitialPopulation[];
  /** Graph grammar rules for topology generation */
  grammarRules: GraphGrammarRule[];
  /** Behavior rule sets per species category */
  behaviorRules: Map<AgentCategory, BehaviorRule[]>;
  /** Environmental configuration */
  environment: Partial<EnvironmentState>;
  /** Random seed */
  seed: number;
  /** Enable LLM narrative generation */
  narrativeEnabled: boolean;
  /** LLM narrative generation interval (ticks) */
  narrativeInterval: number;
}

export interface InitialPopulation {
  species: SpeciesType;
  category: AgentCategory;
  count: number;
  region?: BiomeType;
  genome?: Partial<AgentGenome>;
}

// =============================================================================
// Simulation Events
// =============================================================================

export interface SimulationEventMap {
  'tick': { tick: number; deltaMs: number };
  'agent:born': { agent: EcologicalAgent; parentId?: string };
  'agent:died': { agent: EcologicalAgent; cause: string };
  'agent:moved': { agent: EcologicalAgent; from: Vector3; to: Vector3 };
  'agent:ate': { predator: EcologicalAgent; prey: EcologicalAgent };
  'agent:reproduced': { parent: EcologicalAgent; offspring: EcologicalAgent };
  'biome:changed': { cell: Vector2; from: BiomeType; to: BiomeType };
  'season:changed': { from: string; to: string };
  'weather:started': { event: WeatherEvent };
  'weather:ended': { event: WeatherEvent };
  'population:threshold': { species: SpeciesType; count: number; threshold: 'low' | 'high' };
  'narrative:generated': { text: string; tick: number; context: Record<string, unknown> };
}

export type SimulationEventType = keyof SimulationEventMap;
export type SimulationEventHandler<K extends SimulationEventType> = (
  event: SimulationEventMap[K],
) => void;
