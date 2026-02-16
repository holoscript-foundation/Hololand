/**
 * TrainingMonkeyBridge Test Suite
 *
 * Tests for mock-mode MCP bridge to TrainingMonkey server.
 * All tests run in mock mode (no live server required).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TrainingMonkeyBridge } from '../src/services/TrainingMonkeyBridge';

describe('TrainingMonkeyBridge', () => {
  let bridge: TrainingMonkeyBridge;

  beforeEach(() => {
    bridge = new TrainingMonkeyBridge({ mockMode: true, endpoint: 'http://localhost:5555' });
  });

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('should create in mock mode', () => {
      expect(bridge).toBeDefined();
    });

    it('should accept custom config', () => {
      const b = new TrainingMonkeyBridge({
        endpoint: 'http://localhost:9999',
        mockMode: true,
        timeoutMs: 5000,
      });
      expect(b).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Generate Training Data
  // --------------------------------------------------------------------------

  describe('generateTraining', () => {
    it('should generate holoscript training data', async () => {
      const result = await bridge.generateTraining({
        domain: 'holoscript',
        category: 'scene_generation',
        count: 10,
        difficulty: 'intermediate',
      });
      expect(result.examples.length).toBeGreaterThan(0);
      expect(result.stats.generated).toBeGreaterThan(0);
    });

    it('should generate uaa2 training data', async () => {
      const result = await bridge.generateTraining({
        domain: 'uaa2',
        category: 'protocol_phases',
        count: 5,
      });
      expect(result.examples.length).toBeGreaterThan(0);
    });

    it('should generate hololand training data', async () => {
      const result = await bridge.generateTraining({
        domain: 'hololand',
        category: 'vr_patterns',
        count: 5,
      });
      expect(result.examples.length).toBeGreaterThan(0);
    });

    it('should generate dynamic training data for default domain', async () => {
      const result = await bridge.generateTraining({
        count: 3,
      });
      expect(result.examples.length).toBeGreaterThan(0);
    });

    it('should report requested count in stats', async () => {
      const result = await bridge.generateTraining({
        domain: 'holoscript',
        count: 7,
      });
      expect(result.stats.requested).toBe(7);
    });
  });

  // --------------------------------------------------------------------------
  // Validate Examples
  // --------------------------------------------------------------------------

  describe('validateExamples', () => {
    it('should validate training examples', async () => {
      const examples = [
        { id: 'v1', instruction: 'Create a cube', output: 'composition "Cube" { }' },
        { id: 'v2', instruction: 'Build a sphere', output: 'composition "Sphere" { }' },
      ];
      const result = await bridge.validateExamples({ examples });
      expect(result.totalChecked).toBe(2);
      expect(result.passedCount).toBe(2);
    });

    it('should return valid result in mock mode', async () => {
      const examples = [
        { id: 'bad', instruction: '', output: '' },
      ];
      const result = await bridge.validateExamples({ examples });
      // Mock mode returns all as valid
      expect(result.valid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Audit Examples
  // --------------------------------------------------------------------------

  describe('auditExamples', () => {
    it('should audit examples', async () => {
      const examples = [
        { id: 'a1', instruction: 'How to build VR', output: 'Use HoloScript' },
      ];
      const result = await bridge.auditExamples({ examples });
      expect(result.totalAudited).toBe(1);
      expect(result.passed).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Health Check
  // --------------------------------------------------------------------------

  describe('healthCheck', () => {
    it('should return healthy in mock mode', async () => {
      const result = await bridge.healthCheck();
      expect(result.healthy).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Capabilities
  // --------------------------------------------------------------------------

  describe('getCapabilities', () => {
    it('should return capabilities result', async () => {
      const result = await bridge.getCapabilities();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});
