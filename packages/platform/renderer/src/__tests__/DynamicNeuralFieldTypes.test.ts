/**
 * @vitest-environment jsdom
 */

/**
 * Tests for DynamicNeuralFieldTypes
 *
 * Validates:
 * - Default configuration values
 * - Factory functions (createEmptyDNFFieldState, etc.)
 * - Type constraints and data structures
 * - Buffer sizing and allocation
 */

import { describe, it, expect } from 'vitest';

import {
  DEFAULT_DNF_KERNEL,
  DEFAULT_DNF_ACTIVATION,
  DEFAULT_DNF_CONFIG,
  DEFAULT_WORLD_MAPPING,
  DEFAULT_SPATIAL_ATTENTION_CONFIG,
  createEmptyDNFFieldState,
  createEmptyDNFStatistics,
  createEmptyVisualizationSnapshot,
} from '../DynamicNeuralFieldTypes';

import type {
  DNFKernelType,
  DNFActivationFunctionType,
  DNFDimensionality,
  DNFFieldState,
  DNFFieldStatistics,
  DNFPeak,
  DNFVisualizationSnapshot,
  DNFKernelConfig,
  DNFActivationConfig,
  DynamicNeuralFieldConfig,
  DNFWorldMapping,
  SpatialAttentionFieldConfig,
} from '../DynamicNeuralFieldTypes';

// =============================================================================
// DEFAULT CONFIGURATION TESTS
// =============================================================================

describe('DynamicNeuralFieldTypes - Default Configurations', () => {
  it('DEFAULT_DNF_KERNEL should have Mexican hat type', () => {
    expect(DEFAULT_DNF_KERNEL.type).toBe('mexican-hat');
    expect(DEFAULT_DNF_KERNEL.excAmp).toBeGreaterThan(0);
    expect(DEFAULT_DNF_KERNEL.excSigma).toBeGreaterThan(0);
    expect(DEFAULT_DNF_KERNEL.inhAmp).toBeGreaterThan(0);
    expect(DEFAULT_DNF_KERNEL.inhSigma).toBeGreaterThan(DEFAULT_DNF_KERNEL.excSigma);
    expect(DEFAULT_DNF_KERNEL.globalInhibition).toBeLessThan(0);
  });

  it('DEFAULT_DNF_ACTIVATION should use sigmoid', () => {
    expect(DEFAULT_DNF_ACTIVATION.type).toBe('sigmoid');
    expect(DEFAULT_DNF_ACTIVATION.beta).toBeGreaterThan(0);
    expect(typeof DEFAULT_DNF_ACTIVATION.threshold).toBe('number');
  });

  it('DEFAULT_DNF_CONFIG should have valid field dimensions', () => {
    expect(DEFAULT_DNF_CONFIG.width).toBe(64);
    expect(DEFAULT_DNF_CONFIG.height).toBe(64);
    expect(DEFAULT_DNF_CONFIG.dimensionality).toBe('2d');
    expect(DEFAULT_DNF_CONFIG.tau).toBeGreaterThan(0);
    expect(DEFAULT_DNF_CONFIG.restingLevel).toBeLessThan(0);
    expect(DEFAULT_DNF_CONFIG.dt).toBeGreaterThan(0);
    expect(DEFAULT_DNF_CONFIG.noiseAmplitude).toBeGreaterThanOrEqual(0);
  });

  it('DEFAULT_DNF_CONFIG kernel and activation should match defaults', () => {
    expect(DEFAULT_DNF_CONFIG.kernel).toEqual(DEFAULT_DNF_KERNEL);
    expect(DEFAULT_DNF_CONFIG.activation).toEqual(DEFAULT_DNF_ACTIVATION);
  });

  it('DEFAULT_WORLD_MAPPING should define a centered ground plane', () => {
    expect(DEFAULT_WORLD_MAPPING.worldOrigin).toEqual({ x: -10, y: 0, z: -10 });
    expect(DEFAULT_WORLD_MAPPING.worldExtent).toEqual({ x: 20, y: 0, z: 20 });
    expect(DEFAULT_WORLD_MAPPING.axisMapping.fieldX).toBe('x');
    expect(DEFAULT_WORLD_MAPPING.axisMapping.fieldY).toBe('z');
  });

  it('DEFAULT_SPATIAL_ATTENTION_CONFIG should reference field config', () => {
    expect(DEFAULT_SPATIAL_ATTENTION_CONFIG.fieldConfig).toEqual(DEFAULT_DNF_CONFIG);
    expect(DEFAULT_SPATIAL_ATTENTION_CONFIG.worldMapping).toEqual(DEFAULT_WORLD_MAPPING);
    expect(DEFAULT_SPATIAL_ATTENTION_CONFIG.snnInputGain).toBeGreaterThan(0);
    expect(DEFAULT_SPATIAL_ATTENTION_CONFIG.snnInputSigma).toBeGreaterThan(0);
    expect(DEFAULT_SPATIAL_ATTENTION_CONFIG.inputDecayRate).toBeGreaterThan(0);
    expect(DEFAULT_SPATIAL_ATTENTION_CONFIG.inputDecayRate).toBeLessThanOrEqual(1);
    expect(DEFAULT_SPATIAL_ATTENTION_CONFIG.snnAttentionThreshold).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_SPATIAL_ATTENTION_CONFIG.maxProjectedObjects).toBeGreaterThan(0);
  });
});

// =============================================================================
// FACTORY FUNCTION TESTS
// =============================================================================

describe('DynamicNeuralFieldTypes - Factory Functions', () => {
  describe('createEmptyDNFFieldState', () => {
    it('should create a field state with correct dimensions', () => {
      const state = createEmptyDNFFieldState(32, 32);
      expect(state.width).toBe(32);
      expect(state.height).toBe(32);
      expect(state.activation.length).toBe(32 * 32);
      expect(state.output.length).toBe(32 * 32);
      expect(state.input.length).toBe(32 * 32);
    });

    it('should initialize activation to resting level', () => {
      const restingLevel = -3.0;
      const state = createEmptyDNFFieldState(8, 8, restingLevel);

      for (let i = 0; i < state.activation.length; i++) {
        expect(state.activation[i]).toBe(restingLevel);
      }
    });

    it('should use default resting level of -5.0', () => {
      const state = createEmptyDNFFieldState(4, 4);
      expect(state.activation[0]).toBe(-5.0);
    });

    it('should initialize output and input to zero', () => {
      const state = createEmptyDNFFieldState(8, 8);

      for (let i = 0; i < state.output.length; i++) {
        expect(state.output[i]).toBe(0);
      }
      for (let i = 0; i < state.input.length; i++) {
        expect(state.input[i]).toBe(0);
      }
    });

    it('should start with zero simulation time', () => {
      const state = createEmptyDNFFieldState(4, 4);
      expect(state.simulationTime).toBe(0);
      expect(state.timestepCount).toBe(0);
    });

    it('should handle 1D fields (height=1)', () => {
      const state = createEmptyDNFFieldState(64, 1);
      expect(state.activation.length).toBe(64);
    });

    it('should handle large fields', () => {
      const state = createEmptyDNFFieldState(128, 128);
      expect(state.activation.length).toBe(128 * 128);
    });
  });

  describe('createEmptyDNFStatistics', () => {
    it('should create zeroed statistics', () => {
      const stats = createEmptyDNFStatistics();

      expect(stats.meanActivation).toBe(0);
      expect(stats.maxActivation).toBe(0);
      expect(stats.minActivation).toBe(0);
      expect(stats.stdActivation).toBe(0);
      expect(stats.meanOutput).toBe(0);
      expect(stats.activePositionCount).toBe(0);
      expect(stats.activeFraction).toBe(0);
      expect(stats.peaks).toEqual([]);
      expect(stats.totalInputStrength).toBe(0);
    });
  });

  describe('createEmptyVisualizationSnapshot', () => {
    it('should create a valid empty snapshot', () => {
      const snapshot = createEmptyVisualizationSnapshot();

      expect(snapshot.snapshotId).toBe(0);
      expect(snapshot.timestamp).toBe(0);
      expect(snapshot.label).toBe('');
      expect(snapshot.width).toBe(0);
      expect(snapshot.height).toBe(0);
      expect(snapshot.activationHeatmap.length).toBe(0);
      expect(snapshot.outputHeatmap.length).toBe(0);
      expect(snapshot.inputOverlay.length).toBe(0);
      expect(snapshot.peaks).toEqual([]);
      expect(snapshot.statistics).toBeDefined();
      expect(snapshot.performance.stepTimeMs).toBe(0);
      expect(snapshot.performance.convolutionTimeMs).toBe(0);
      expect(snapshot.performance.currentHz).toBe(0);
      expect(snapshot.performance.totalTimesteps).toBe(0);
    });
  });
});

// =============================================================================
// TYPE CONSTRAINT TESTS
// =============================================================================

describe('DynamicNeuralFieldTypes - Type Constraints', () => {
  it('DNFKernelType should support all documented types', () => {
    const types: DNFKernelType[] = ['mexican-hat', 'gaussian', 'oscillatory', 'custom'];
    expect(types).toHaveLength(4);
  });

  it('DNFActivationFunctionType should support all types', () => {
    const types: DNFActivationFunctionType[] = ['sigmoid', 'heaviside', 'piecewise-linear'];
    expect(types).toHaveLength(3);
  });

  it('DNFDimensionality should support 1d and 2d', () => {
    const dims: DNFDimensionality[] = ['1d', '2d'];
    expect(dims).toHaveLength(2);
  });

  it('DNFPeak should have required fields', () => {
    const peak: DNFPeak = {
      position: [32, 32],
      normalizedPosition: [0.5, 0.5],
      amplitude: 5.0,
      width: 3.0,
      mass: 25.0,
      isStable: true,
    };

    expect(peak.position[0]).toBe(32);
    expect(peak.position[1]).toBe(32);
    expect(peak.normalizedPosition[0]).toBe(0.5);
    expect(peak.amplitude).toBe(5.0);
    expect(peak.width).toBe(3.0);
    expect(peak.mass).toBe(25.0);
    expect(peak.isStable).toBe(true);
  });
});
