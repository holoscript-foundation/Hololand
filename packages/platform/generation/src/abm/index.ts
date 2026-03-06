/**
 * Ecological Agent-Based Model (ABM) World Dynamics
 *
 * Replaces explicit constraint-based world dynamics with agent-based
 * ecological simulation where spatial interactions produce emergent behavior.
 *
 * Architecture: Graph Grammar (topology) + ABM (dynamics) + LLM (narrative)
 *
 * @module abm
 */

// Core simulation
export { EcologicalSimulation } from './EcologicalSimulation';

// Graph grammar world topology
export { GraphGrammarEngine, getDefaultGrammarRules } from './GraphGrammar';

// Behavior rules
export {
  floraBehaviors,
  herbivoreBehaviors,
  predatorBehaviors,
  pollinatorBehaviors,
  decomposerBehaviors,
  getDefaultBehaviors,
} from './BehaviorRules';

// Types
export type {
  // Spatial
  Vector2,
  Vector3,
  BoundingBox,
  SpatialCell,
  BiomeType,
  TerrainFeature,
  // Agents
  EcologicalAgent,
  AgentCategory,
  SpeciesType,
  AgentState,
  AgentGenome,
  DietPreference,
  AgentMemory,
  PerceivedAgent,
  AgentVisual,
  // Behavior
  BehaviorRule,
  AgentAction,
  // Graph grammar
  GraphGrammarRule,
  GraphPattern,
  GraphNode,
  GraphEdge,
  // World
  WorldState,
  EnvironmentState,
  WeatherEvent,
  PopulationStats,
  // Configuration
  ABMConfig,
  InitialPopulation,
  // Events
  SimulationEventMap,
  SimulationEventType,
  SimulationEventHandler,
} from './types';
