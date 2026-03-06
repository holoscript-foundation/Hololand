/**
 * Ecological Behavior Rules
 *
 * Predefined behavior rule sets for each agent category. Rules are
 * evaluated in priority order; first matching rule determines the
 * agent's action for that tick.
 *
 * Based on the Knepp Estate 2025 rewilding study: spatial interactions
 * produce emergent ecological behavior without explicit constraints.
 *
 * @module abm/BehaviorRules
 */

import type {
  BehaviorRule,
  EcologicalAgent,
  PerceivedAgent,
  SpatialCell,
  WorldState,
  AgentAction,
  AgentCategory,
  Vector3,
} from './types';

// =============================================================================
// Utility Functions
// =============================================================================

function distance3D(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function moveToward(from: Vector3, to: Vector3, speed: number): Vector3 {
  const dist = distance3D(from, to);
  if (dist <= speed) return { ...to };
  const ratio = speed / dist;
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
    z: from.z + (to.z - from.z) * ratio,
  };
}

function moveAway(from: Vector3, threat: Vector3, speed: number): Vector3 {
  const dx = from.x - threat.x;
  const dy = from.y - threat.y;
  const dz = from.z - threat.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  return {
    x: from.x + (dx / dist) * speed,
    y: from.y + (dy / dist) * speed,
    z: from.z + (dz / dist) * speed,
  };
}

function randomOffset(magnitude: number): Vector3 {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.cos(angle) * magnitude * Math.random(),
    y: 0,
    z: Math.sin(angle) * magnitude * Math.random(),
  };
}

function findNearest(
  agents: PerceivedAgent[],
  category?: AgentCategory,
): PerceivedAgent | null {
  let nearest: PerceivedAgent | null = null;
  for (const a of agents) {
    if (category && a.category !== category) continue;
    if (!nearest || a.distance < nearest.distance) {
      nearest = a;
    }
  }
  return nearest;
}

// =============================================================================
// Flora Behavior Rules
// =============================================================================

export const floraBehaviors: BehaviorRule[] = [
  {
    name: 'flora-die-of-age',
    priority: 0,
    condition: (agent) => agent.age >= agent.genome.maxAge,
    action: (agent) => ({
      type: 'die',
      energyCost: 0,
      data: { cause: 'old-age' },
    }),
  },
  {
    name: 'flora-die-of-health',
    priority: 1,
    condition: (agent) => agent.health <= 0,
    action: () => ({
      type: 'die',
      energyCost: 0,
      data: { cause: 'health-depleted' },
    }),
  },
  {
    name: 'flora-dormant-winter',
    priority: 2,
    condition: (_agent, _perception, _cell, world) =>
      world.environment.season === 'winter',
    action: () => ({
      type: 'rest',
      energyCost: 0.001,
    }),
  },
  {
    name: 'flora-grow',
    priority: 3,
    condition: (agent, _perception, cell) =>
      cell.moisture > 0.2 &&
      cell.lightExposure > 0.3 &&
      agent.energy > 0.3,
    action: (agent, _perception, cell) => ({
      type: 'grow',
      energyCost: 0.02 * agent.genome.metabolism,
      data: {
        growthRate: cell.fertility * cell.moisture * cell.lightExposure,
      },
    }),
  },
  {
    name: 'flora-reproduce-seed',
    priority: 4,
    condition: (agent, _perception, _cell, world) =>
      agent.reproductionDrive >= 1.0 &&
      agent.energy > 0.6 &&
      (world.environment.season === 'spring' ||
        world.environment.season === 'summer'),
    action: (agent) => {
      const offset = randomOffset(agent.genome.perceptionRadius * 2);
      return {
        type: 'reproduce',
        energyCost: 0.3,
        targetPosition: {
          x: agent.position.x + offset.x,
          y: agent.position.y,
          z: agent.position.z + offset.z,
        },
      };
    },
  },
  {
    name: 'flora-photosynthesize',
    priority: 10,
    condition: () => true, // Default behavior
    action: (agent, _perception, cell) => ({
      type: 'rest',
      energyCost: -cell.lightExposure * 0.05 * (1 - agent.genome.metabolism * 0.5),
      data: { activity: 'photosynthesis' },
    }),
  },
];

// =============================================================================
// Herbivore Behavior Rules
// =============================================================================

export const herbivoreBehaviors: BehaviorRule[] = [
  {
    name: 'herbivore-die-of-age',
    priority: 0,
    condition: (agent) => agent.age >= agent.genome.maxAge,
    action: () => ({
      type: 'die',
      energyCost: 0,
      data: { cause: 'old-age' },
    }),
  },
  {
    name: 'herbivore-die-of-starvation',
    priority: 1,
    condition: (agent) => agent.energy <= 0,
    action: () => ({
      type: 'die',
      energyCost: 0,
      data: { cause: 'starvation' },
    }),
  },
  {
    name: 'herbivore-flee-predator',
    priority: 2,
    condition: (_agent, perception) => {
      const predator = perception.find(
        (p) => p.category === 'predator' && p.threatLevel > 0.5,
      );
      return predator !== undefined;
    },
    action: (agent, perception) => {
      const predator = perception.find(
        (p) => p.category === 'predator' && p.threatLevel > 0.5,
      )!;
      return {
        type: 'flee',
        targetPosition: moveAway(
          agent.position,
          predator.position,
          agent.genome.speed * 1.5,
        ),
        energyCost: 0.05 * agent.genome.metabolism,
      };
    },
  },
  {
    name: 'herbivore-graze',
    priority: 3,
    condition: (agent, perception) =>
      agent.energy < 0.7 &&
      perception.some(
        (p) =>
          p.category === 'flora' &&
          p.distance <= agent.genome.perceptionRadius * 0.5,
      ),
    action: (agent, perception) => {
      const food = findNearest(
        perception.filter((p) => p.category === 'flora'),
      );
      return {
        type: 'eat',
        targetId: food?.id,
        energyCost: 0.01 * agent.genome.metabolism,
        data: { nutritionGained: 0.15 },
      };
    },
  },
  {
    name: 'herbivore-seek-food',
    priority: 4,
    condition: (agent) => agent.energy < 0.5,
    action: (agent, perception) => {
      const food = findNearest(
        perception.filter((p) => p.category === 'flora'),
      );
      if (food) {
        return {
          type: 'move',
          targetPosition: moveToward(
            agent.position,
            food.position,
            agent.genome.speed,
          ),
          energyCost: 0.02 * agent.genome.metabolism,
        };
      }
      // Wander to find food
      const offset = randomOffset(agent.genome.speed);
      return {
        type: 'move',
        targetPosition: {
          x: agent.position.x + offset.x,
          y: agent.position.y,
          z: agent.position.z + offset.z,
        },
        energyCost: 0.02 * agent.genome.metabolism,
      };
    },
  },
  {
    name: 'herbivore-reproduce',
    priority: 5,
    condition: (agent, perception) =>
      agent.reproductionDrive >= 1.0 &&
      agent.energy > 0.7 &&
      perception.some(
        (p) =>
          p.species === agent.species &&
          p.distance < agent.genome.perceptionRadius,
      ),
    action: (agent, perception) => {
      const mate = perception.find(
        (p) =>
          p.species === agent.species &&
          p.distance < agent.genome.perceptionRadius,
      );
      return {
        type: 'reproduce',
        targetId: mate?.id,
        energyCost: 0.4,
      };
    },
  },
  {
    name: 'herbivore-herd',
    priority: 6,
    condition: (agent, perception) =>
      agent.genome.sociality > 0.5 &&
      perception.some(
        (p) =>
          p.species === agent.species &&
          p.distance > agent.genome.perceptionRadius * 0.3,
      ),
    action: (agent, perception) => {
      // Move toward center of herd (flocking)
      const herdmates = perception.filter(
        (p) => p.species === agent.species,
      );
      if (herdmates.length === 0) {
        return { type: 'rest', energyCost: 0.005 };
      }
      const center: Vector3 = {
        x: herdmates.reduce((s, h) => s + h.position.x, 0) / herdmates.length,
        y: herdmates.reduce((s, h) => s + h.position.y, 0) / herdmates.length,
        z: herdmates.reduce((s, h) => s + h.position.z, 0) / herdmates.length,
      };
      return {
        type: 'move',
        targetPosition: moveToward(
          agent.position,
          center,
          agent.genome.speed * 0.5,
        ),
        energyCost: 0.01 * agent.genome.metabolism,
      };
    },
  },
  {
    name: 'herbivore-wander',
    priority: 10,
    condition: () => true,
    action: (agent) => {
      const offset = randomOffset(agent.genome.speed * 0.5);
      return {
        type: 'move',
        targetPosition: {
          x: agent.position.x + offset.x,
          y: agent.position.y,
          z: agent.position.z + offset.z,
        },
        energyCost: 0.01 * agent.genome.metabolism,
      };
    },
  },
];

// =============================================================================
// Predator Behavior Rules
// =============================================================================

export const predatorBehaviors: BehaviorRule[] = [
  {
    name: 'predator-die-of-age',
    priority: 0,
    condition: (agent) => agent.age >= agent.genome.maxAge,
    action: () => ({
      type: 'die',
      energyCost: 0,
      data: { cause: 'old-age' },
    }),
  },
  {
    name: 'predator-die-of-starvation',
    priority: 1,
    condition: (agent) => agent.energy <= 0,
    action: () => ({
      type: 'die',
      energyCost: 0,
      data: { cause: 'starvation' },
    }),
  },
  {
    name: 'predator-hunt',
    priority: 2,
    condition: (agent, perception) =>
      agent.energy < 0.6 &&
      perception.some(
        (p) =>
          (p.category === 'herbivore' || p.category === 'omnivore') &&
          p.distance <= agent.genome.perceptionRadius,
      ),
    action: (agent, perception) => {
      // Select weakest prey within perception
      const prey = perception
        .filter(
          (p) =>
            (p.category === 'herbivore' || p.category === 'omnivore') &&
            p.distance <= agent.genome.perceptionRadius,
        )
        .sort((a, b) => a.health - b.health)[0];

      if (!prey) {
        return { type: 'rest', energyCost: 0.01 };
      }

      const dist = distance3D(agent.position, prey.position);
      if (dist <= agent.genome.size * 2) {
        // Close enough to attack
        const successChance =
          (agent.genome.aggression * agent.energy) /
          (prey.health * (1 - agent.genome.camouflage * 0.3));
        if (Math.random() < successChance) {
          return {
            type: 'attack',
            targetId: prey.id,
            energyCost: 0.1 * agent.genome.metabolism,
            data: { damage: agent.genome.aggression * agent.genome.size },
          };
        }
      }

      // Chase prey
      return {
        type: 'move',
        targetPosition: moveToward(
          agent.position,
          prey.position,
          agent.genome.speed,
        ),
        energyCost: 0.03 * agent.genome.metabolism,
      };
    },
  },
  {
    name: 'predator-eat-kill',
    priority: 3,
    condition: (agent, perception) =>
      perception.some(
        (p) =>
          !p.health && // Dead prey
          p.distance <= agent.genome.size * 2 &&
          (p.category === 'herbivore' || p.category === 'omnivore'),
      ),
    action: (_agent, perception) => {
      const carcass = perception.find(
        (p) =>
          !p.health &&
          (p.category === 'herbivore' || p.category === 'omnivore'),
      );
      return {
        type: 'eat',
        targetId: carcass?.id,
        energyCost: 0.01,
        data: { nutritionGained: 0.4 },
      };
    },
  },
  {
    name: 'predator-territory',
    priority: 4,
    condition: (agent, perception) =>
      agent.genome.aggression > 0.6 &&
      perception.some(
        (p) =>
          p.species === agent.species &&
          p.id !== agent.id &&
          p.distance < agent.genome.perceptionRadius * 0.5,
      ),
    action: (agent) => ({
      type: 'mark-territory',
      energyCost: 0.005,
      data: { radius: agent.genome.perceptionRadius },
    }),
  },
  {
    name: 'predator-reproduce',
    priority: 5,
    condition: (agent, perception, _cell, world) =>
      agent.reproductionDrive >= 1.0 &&
      agent.energy > 0.8 &&
      (world.environment.season === 'spring' ||
        world.environment.season === 'summer') &&
      perception.some(
        (p) =>
          p.species === agent.species &&
          p.distance < agent.genome.perceptionRadius,
      ),
    action: (agent, perception) => {
      const mate = perception.find(
        (p) => p.species === agent.species,
      );
      return {
        type: 'reproduce',
        targetId: mate?.id,
        energyCost: 0.5,
      };
    },
  },
  {
    name: 'predator-rest',
    priority: 6,
    condition: (agent) => agent.energy > 0.6,
    action: () => ({
      type: 'rest',
      energyCost: 0.005,
    }),
  },
  {
    name: 'predator-patrol',
    priority: 10,
    condition: () => true,
    action: (agent) => {
      const offset = randomOffset(agent.genome.speed);
      return {
        type: 'move',
        targetPosition: {
          x: agent.position.x + offset.x,
          y: agent.position.y,
          z: agent.position.z + offset.z,
        },
        energyCost: 0.015 * agent.genome.metabolism,
      };
    },
  },
];

// =============================================================================
// Pollinator Behavior Rules
// =============================================================================

export const pollinatorBehaviors: BehaviorRule[] = [
  {
    name: 'pollinator-die',
    priority: 0,
    condition: (agent) =>
      agent.age >= agent.genome.maxAge || agent.health <= 0,
    action: () => ({
      type: 'die',
      energyCost: 0,
      data: { cause: 'natural' },
    }),
  },
  {
    name: 'pollinator-dormant-cold',
    priority: 1,
    condition: (_agent, _perception, _cell, world) =>
      world.environment.season === 'winter' ||
      world.environment.temperatureModifier < -5,
    action: () => ({
      type: 'rest',
      energyCost: 0.001,
    }),
  },
  {
    name: 'pollinator-pollinate',
    priority: 2,
    condition: (agent, perception) =>
      agent.energy > 0.3 &&
      perception.some(
        (p) =>
          p.category === 'flora' &&
          p.distance <= agent.genome.perceptionRadius,
      ),
    action: (agent, perception) => {
      const flower = findNearest(
        perception.filter((p) => p.category === 'flora'),
      );
      if (flower && distance3D(agent.position, flower.position) <= agent.genome.size * 3) {
        return {
          type: 'pollinate',
          targetId: flower.id,
          energyCost: 0.01,
          data: { pollinationStrength: agent.genome.size * 0.5 },
        };
      }
      return {
        type: 'move',
        targetPosition: flower
          ? moveToward(agent.position, flower.position, agent.genome.speed)
          : agent.position,
        energyCost: 0.02 * agent.genome.metabolism,
      };
    },
  },
  {
    name: 'pollinator-wander',
    priority: 10,
    condition: () => true,
    action: (agent) => {
      const offset = randomOffset(agent.genome.speed);
      return {
        type: 'move',
        targetPosition: {
          x: agent.position.x + offset.x,
          y: agent.position.y + (Math.random() - 0.5) * 0.5,
          z: agent.position.z + offset.z,
        },
        energyCost: 0.01 * agent.genome.metabolism,
      };
    },
  },
];

// =============================================================================
// Decomposer Behavior Rules
// =============================================================================

export const decomposerBehaviors: BehaviorRule[] = [
  {
    name: 'decomposer-decompose-dead',
    priority: 1,
    condition: (_agent, perception) =>
      perception.some((p) => p.health <= 0 && p.category !== 'environmental'),
    action: (_agent, perception) => {
      const dead = perception.find(
        (p) => p.health <= 0 && p.category !== 'environmental',
      );
      return {
        type: 'decompose',
        targetId: dead?.id,
        energyCost: 0.005,
        data: { fertilityIncrease: 0.1 },
      };
    },
  },
  {
    name: 'decomposer-spread',
    priority: 2,
    condition: (agent, _perception, cell) =>
      agent.energy > 0.5 &&
      cell.moisture > 0.4 &&
      agent.reproductionDrive >= 1.0,
    action: (agent) => {
      const offset = randomOffset(agent.genome.speed);
      return {
        type: 'reproduce',
        energyCost: 0.2,
        targetPosition: {
          x: agent.position.x + offset.x,
          y: agent.position.y,
          z: agent.position.z + offset.z,
        },
      };
    },
  },
  {
    name: 'decomposer-rest',
    priority: 10,
    condition: () => true,
    action: () => ({
      type: 'rest',
      energyCost: 0.002,
    }),
  },
];

// =============================================================================
// Behavior Rule Registry
// =============================================================================

export function getDefaultBehaviors(): Map<AgentCategory, BehaviorRule[]> {
  const map = new Map<AgentCategory, BehaviorRule[]>();
  map.set('flora', floraBehaviors);
  map.set('herbivore', herbivoreBehaviors);
  map.set('predator', predatorBehaviors);
  map.set('omnivore', herbivoreBehaviors); // Omnivores use herbivore rules as base
  map.set('pollinator', pollinatorBehaviors);
  map.set('decomposer', decomposerBehaviors);
  map.set('environmental', []); // Environmental agents use custom rules
  return map;
}
