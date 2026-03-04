/**
 * CrowdSimulator - Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CrowdSimulator, createCrowdSimulator } from './CrowdSimulator';
import type { CrowdConfig, Agent, Vec3 } from './CrowdSimulator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides?: Partial<CrowdConfig>): CrowdConfig {
  return {
    maxAgents: 100,
    neighborDistance: 5.0,
    maxSpeed: 3.5,
    separationWeight: 1.5,
    alignmentWeight: 1.0,
    cohesionWeight: 1.0,
    ...overrides,
  };
}

function dist3(a: Vec3, b: Vec3): number {
  return Math.sqrt(
    (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CrowdSimulator', () => {
  let crowd: CrowdSimulator;

  beforeEach(() => {
    crowd = new CrowdSimulator(makeConfig());
  });

  // -----------------------------------------------------------------------
  // Construction
  // -----------------------------------------------------------------------

  describe('construction', () => {
    it('should create an instance', () => {
      expect(crowd).toBeDefined();
      expect(crowd.getAgentCount()).toBe(0);
    });

    it('should be creatable via factory function', () => {
      const sim = createCrowdSimulator(makeConfig());
      expect(sim).toBeInstanceOf(CrowdSimulator);
    });
  });

  // -----------------------------------------------------------------------
  // addAgent / removeAgent
  // -----------------------------------------------------------------------

  describe('addAgent', () => {
    it('should add an agent and return it with an id', () => {
      const agent = crowd.addAgent({
        position: { x: 0, y: 0, z: 0 },
        goal: { x: 10, y: 0, z: 10 },
        radius: 0.5,
        maxSpeed: 3.5,
      });

      expect(agent.id).toBeDefined();
      expect(agent.position.x).toBe(0);
      expect(agent.goal.x).toBe(10);
      expect(agent.radius).toBe(0.5);
      expect(agent.maxSpeed).toBe(3.5);
      expect(agent.priority).toBe(1);
      expect(crowd.getAgentCount()).toBe(1);
    });

    it('should assign unique ids to each agent', () => {
      const a1 = crowd.addAgent({
        position: { x: 0, y: 0, z: 0 },
        goal: { x: 10, y: 0, z: 10 },
        radius: 0.5,
        maxSpeed: 3.5,
      });
      const a2 = crowd.addAgent({
        position: { x: 5, y: 0, z: 5 },
        goal: { x: 10, y: 0, z: 10 },
        radius: 0.5,
        maxSpeed: 3.5,
      });

      expect(a1.id).not.toBe(a2.id);
    });

    it('should accept a custom priority', () => {
      const agent = crowd.addAgent({
        position: { x: 0, y: 0, z: 0 },
        goal: { x: 10, y: 0, z: 10 },
        radius: 0.5,
        maxSpeed: 3.5,
        priority: 5,
      });

      expect(agent.priority).toBe(5);
    });

    it('should throw when exceeding maxAgents', () => {
      const small = createCrowdSimulator(makeConfig({ maxAgents: 2 }));
      small.addAgent({ position: { x: 0, y: 0, z: 0 }, goal: { x: 1, y: 0, z: 1 }, radius: 0.5, maxSpeed: 1 });
      small.addAgent({ position: { x: 1, y: 0, z: 1 }, goal: { x: 2, y: 0, z: 2 }, radius: 0.5, maxSpeed: 1 });

      expect(() => {
        small.addAgent({ position: { x: 2, y: 0, z: 2 }, goal: { x: 3, y: 0, z: 3 }, radius: 0.5, maxSpeed: 1 });
      }).toThrow(/maxAgents/);
    });
  });

  describe('removeAgent', () => {
    it('should remove an agent by id', () => {
      const agent = crowd.addAgent({
        position: { x: 0, y: 0, z: 0 },
        goal: { x: 10, y: 0, z: 10 },
        radius: 0.5,
        maxSpeed: 3.5,
      });

      crowd.removeAgent(agent.id);
      expect(crowd.getAgentCount()).toBe(0);
    });

    it('should not throw when removing non-existent agent', () => {
      expect(() => crowd.removeAgent(999)).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // setAgentGoal
  // -----------------------------------------------------------------------

  describe('setAgentGoal', () => {
    it('should update an agent goal', () => {
      const agent = crowd.addAgent({
        position: { x: 0, y: 0, z: 0 },
        goal: { x: 10, y: 0, z: 10 },
        radius: 0.5,
        maxSpeed: 3.5,
      });

      crowd.setAgentGoal(agent.id, { x: 50, y: 0, z: 50 });
      const agents = crowd.getAgents();
      expect(agents[0].goal.x).toBe(50);
      expect(agents[0].goal.z).toBe(50);
    });

    it('should silently ignore invalid agent id', () => {
      expect(() => {
        crowd.setAgentGoal(999, { x: 0, y: 0, z: 0 });
      }).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // getAgents
  // -----------------------------------------------------------------------

  describe('getAgents', () => {
    it('should return empty array when no agents exist', () => {
      expect(crowd.getAgents()).toHaveLength(0);
    });

    it('should return all agents with correct properties', () => {
      crowd.addAgent({ position: { x: 1, y: 2, z: 3 }, goal: { x: 10, y: 0, z: 10 }, radius: 0.5, maxSpeed: 3.5 });
      crowd.addAgent({ position: { x: 4, y: 5, z: 6 }, goal: { x: 20, y: 0, z: 20 }, radius: 1.0, maxSpeed: 5.0 });

      const agents = crowd.getAgents();
      expect(agents).toHaveLength(2);
      expect(agents[0].position.x).toBe(1);
      expect(agents[1].position.x).toBe(4);
    });
  });

  // -----------------------------------------------------------------------
  // update - basic movement
  // -----------------------------------------------------------------------

  describe('update - movement', () => {
    it('should not throw with zero deltaTime', () => {
      crowd.addAgent({ position: { x: 0, y: 0, z: 0 }, goal: { x: 10, y: 0, z: 10 }, radius: 0.5, maxSpeed: 3.5 });
      expect(() => crowd.update(0)).not.toThrow();
    });

    it('should not throw with negative deltaTime', () => {
      crowd.addAgent({ position: { x: 0, y: 0, z: 0 }, goal: { x: 10, y: 0, z: 10 }, radius: 0.5, maxSpeed: 3.5 });
      expect(() => crowd.update(-1)).not.toThrow();
    });

    it('should move a single agent toward its goal', () => {
      crowd.addAgent({
        position: { x: 0, y: 0, z: 0 },
        goal: { x: 100, y: 0, z: 0 },
        radius: 0.5,
        maxSpeed: 10.0,
      });

      // Several update steps
      for (let i = 0; i < 10; i++) {
        crowd.update(0.1);
      }

      const agents = crowd.getAgents();
      // Agent should have moved in the +x direction
      expect(agents[0].position.x).toBeGreaterThan(0);
    });

    it('should not exceed maxSpeed', () => {
      crowd.addAgent({
        position: { x: 0, y: 0, z: 0 },
        goal: { x: 1000, y: 0, z: 0 },
        radius: 0.5,
        maxSpeed: 5.0,
      });

      // Run several steps to let velocity build up
      for (let i = 0; i < 20; i++) {
        crowd.update(0.016);
      }

      const agents = crowd.getAgents();
      const speed = Math.sqrt(
        agents[0].velocity.x ** 2 +
        agents[0].velocity.y ** 2 +
        agents[0].velocity.z ** 2
      );
      expect(speed).toBeLessThanOrEqual(5.0 + 0.01); // small epsilon
    });
  });

  // -----------------------------------------------------------------------
  // update - separation
  // -----------------------------------------------------------------------

  describe('update - separation', () => {
    it('should push overlapping agents apart', () => {
      // Two agents at nearly the same position
      crowd.addAgent({
        position: { x: 0, y: 0, z: 0 },
        goal: { x: 50, y: 0, z: 0 },
        radius: 0.5,
        maxSpeed: 3.5,
      });
      crowd.addAgent({
        position: { x: 0.1, y: 0, z: 0 },
        goal: { x: 50, y: 0, z: 0 },
        radius: 0.5,
        maxSpeed: 3.5,
      });

      for (let i = 0; i < 30; i++) {
        crowd.update(0.016);
      }

      const agents = crowd.getAgents();
      const d = dist3(agents[0].position, agents[1].position);
      // They should have spread out due to separation
      expect(d).toBeGreaterThan(0.2);
    });
  });

  // -----------------------------------------------------------------------
  // update - multiple agents converging
  // -----------------------------------------------------------------------

  describe('update - convergence', () => {
    it('should move multiple agents toward a shared goal', () => {
      const goal = { x: 50, y: 0, z: 50 };

      for (let i = 0; i < 5; i++) {
        crowd.addAgent({
          position: { x: i * 3, y: 0, z: 0 },
          goal,
          radius: 0.5,
          maxSpeed: 5.0,
        });
      }

      const initialDistances = crowd.getAgents().map(a => dist3(a.position, goal));

      // Simulate for a while
      for (let i = 0; i < 60; i++) {
        crowd.update(0.016);
      }

      const finalDistances = crowd.getAgents().map(a => dist3(a.position, goal));

      // All agents should be closer to the goal
      for (let i = 0; i < 5; i++) {
        expect(finalDistances[i]).toBeLessThan(initialDistances[i]);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Stress: many agents
  // -----------------------------------------------------------------------

  describe('stress', () => {
    it('should handle 200 agents without errors', () => {
      const sim = createCrowdSimulator(makeConfig({ maxAgents: 200 }));

      for (let i = 0; i < 200; i++) {
        sim.addAgent({
          position: { x: Math.random() * 100, y: 0, z: Math.random() * 100 },
          goal: { x: 50, y: 0, z: 50 },
          radius: 0.4,
          maxSpeed: 4.0,
        });
      }

      expect(() => {
        for (let frame = 0; frame < 10; frame++) {
          sim.update(0.016);
        }
      }).not.toThrow();

      expect(sim.getAgentCount()).toBe(200);
    });
  });
});
