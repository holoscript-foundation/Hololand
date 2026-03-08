/**
 * SNNModelLoader Tests
 *
 * Unit tests for SNN model loading, feature extraction, and output decoding.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SNNModelLoader, loadSNNModel } from '../src/SNNModelLoader';

describe('SNNModelLoader', () => {
  let loader: SNNModelLoader;

  beforeAll(async () => {
    // In tests, we'd mock the fetch or load from file system
    // For this demo, we'll create a mock model
    const mockModel = {
      metadata: {
        model_name: 'TestWarehouseSNN',
        framework: 'Norse',
        architecture: 'LIF-3Layer',
        training_dataset: 'Test-Dataset',
        training_epochs: 10,
        training_accuracy: 0.85,
        inference_latency_ms: 5.0,
        energy_per_inference_mj: 0.4,
        date_trained: '2026-01-01',
        input_features: 64,
        output_classes: 10,
        timesteps: 20,
        description: 'Test SNN model',
      },
      network_config: {
        input_layer: {
          neuron_count: 64,
          decay: 0.9,
          threshold: 1.0,
          rest_potential: 0.0,
          refractory_period: 2,
        },
        hidden_layer: {
          neuron_count: 128,
          decay: 0.85,
          threshold: 1.2,
          rest_potential: 0.0,
          refractory_period: 3,
        },
        output_layer: {
          neuron_count: 10,
          decay: 0.8,
          threshold: 1.5,
          rest_potential: 0.0,
          refractory_period: 5,
        },
        timesteps_per_inference: 20,
        timestep_ms: 0.5,
      },
      weights: {
        input_to_hidden: {
          shape: [64, 128],
          format: 'compressed_coo',
          sparsity: 0.73,
          comment: 'Mock weights',
          data_placeholder: 'MOCK_DATA',
        },
        hidden_to_output: {
          shape: [128, 10],
          format: 'compressed_coo',
          sparsity: 0.68,
          comment: 'Mock weights',
          data_placeholder: 'MOCK_DATA',
        },
      },
      class_labels: [
        'box',
        'pallet',
        'forklift',
        'person',
        'barcode',
        'shelf',
        'package',
        'cart',
        'scanner',
        'door',
      ],
      preprocessing: {
        input_encoding: 'rate_coding',
        max_spike_rate: 100,
        normalization: 'min_max_0_1',
        feature_extraction: 'resnet18_embeddings',
      },
      benchmark_results: {
        quest3_webgpu: {
          inference_time_ms: 5.0,
          energy_per_inference_mj: 0.4,
          fps_sustained: 200,
          power_consumption_w: 0.9,
        },
        comparison_mobilenetv3: {
          inference_time_ms: 15.0,
          energy_per_inference_mj: 2.5,
          fps_sustained: 66,
          power_consumption_w: 3.0,
        },
        energy_savings_pct: 84.0,
        latency_improvement_pct: 66.7,
      },
      version: '1.0.0',
      license: 'Apache-2.0',
      citation: 'Test Citation',
    };

    loader = new SNNModelLoader();
    // Manually set the model for testing (bypass fetch)
    (loader as any).model = mockModel;
  });

  describe('Model Loading', () => {
    it('should load model metadata', () => {
      const metadata = loader.getMetadata();
      expect(metadata).toBeDefined();
      expect(metadata?.model_name).toBe('TestWarehouseSNN');
      expect(metadata?.input_features).toBe(64);
      expect(metadata?.output_classes).toBe(10);
    });

    it('should load class labels', () => {
      const labels = loader.getClassLabels();
      expect(labels).toHaveLength(10);
      expect(labels[0]).toBe('box');
      expect(labels[1]).toBe('pallet');
    });

    it('should load benchmark data', () => {
      const benchmarks = loader.getBenchmarkData();
      expect(benchmarks).toBeDefined();
      expect(benchmarks?.energy_savings_pct).toBe(84.0);
      expect(benchmarks?.quest3_webgpu.inference_time_ms).toBe(5.0);
    });
  });

  describe('Feature Extraction', () => {
    it('should extract 64-dimensional feature vector', () => {
      const mockObject = {
        position: { x: 5.0, y: 2.0, z: -8.0 },
        velocity: { x: 0.5, y: 0.0, z: 0.2 },
        size: 1.5,
        distanceFromCamera: 10.0,
        angularSize: 0.3,
        hasMoved: true,
      };

      const features = loader.extractFeatures(mockObject);

      expect(features).toHaveLength(64);

      // Position features (normalized to [-1, 1])
      expect(features[0]).toBeCloseTo(0.5, 2); // x: 5/10 = 0.5
      expect(features[1]).toBeCloseTo(0.2, 2); // y: 2/10 = 0.2
      expect(features[2]).toBeCloseTo(-0.8, 2); // z: -8/10 = -0.8

      // Velocity features (normalized to [0, 1])
      expect(features[3]).toBeCloseTo(0.1, 2); // vx: 0.5/5 = 0.1
      expect(features[4]).toBeCloseTo(0.0, 2); // vy: 0.0/5 = 0.0
      expect(features[5]).toBeCloseTo(0.04, 2); // vz: 0.2/5 = 0.04

      // Size (normalized to [0, 1])
      expect(features[6]).toBeCloseTo(0.3, 2); // size: 1.5/5 = 0.3

      // Distance (normalized to [0, 1])
      expect(features[7]).toBeCloseTo(0.2, 2); // distance: 10/50 = 0.2

      // Angular size (normalized to [0, 1])
      expect(features[8]).toBeCloseTo(0.3 / Math.PI, 2);

      // Movement flag
      expect(features[9]).toBe(1); // hasMoved = true

      // Reserved features should be 0
      for (let i = 10; i < 64; i++) {
        expect(features[i]).toBe(0);
      }
    });

    it('should handle objects at origin', () => {
      const mockObject = {
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        size: 0,
        distanceFromCamera: 0,
        angularSize: 0,
        hasMoved: false,
      };

      const features = loader.extractFeatures(mockObject);

      expect(features).toHaveLength(64);
      expect(features[0]).toBe(0);
      expect(features[9]).toBe(0); // hasMoved = false
    });
  });

  describe('Rate Coding', () => {
    it('should encode features as spike rates', () => {
      const features = new Array(64).fill(0);
      features[0] = 0.5; // 50% activation
      features[1] = 1.0; // 100% activation
      features[2] = 0.0; // 0% activation

      const spikeRates = loader.encodeFeatures(features);

      expect(spikeRates).toHaveLength(64);
      expect(spikeRates[0]).toBe(50); // 0.5 * 100 = 50 Hz
      expect(spikeRates[1]).toBe(100); // 1.0 * 100 = 100 Hz
      expect(spikeRates[2]).toBe(0); // 0.0 * 100 = 0 Hz
    });

    it('should throw error if wrong feature count', () => {
      const invalidFeatures = new Array(32).fill(0); // Wrong size

      expect(() => loader.encodeFeatures(invalidFeatures)).toThrow(
        'Expected 64 features, got 32',
      );
    });
  });

  describe('Output Decoding', () => {
    it('should decode spike counts to class probabilities', () => {
      const outputSpikes = [10, 5, 0, 2, 1, 0, 0, 0, 0, 0];

      const detections = loader.decodeOutput(outputSpikes);

      expect(detections).toHaveLength(10);

      // Should be sorted by confidence descending
      expect(detections[0].class_label).toBe('box'); // 10 spikes (highest)
      expect(detections[0].confidence).toBeCloseTo(10 / 18, 2);
      expect(detections[0].spike_count).toBe(10);

      expect(detections[1].class_label).toBe('pallet'); // 5 spikes
      expect(detections[1].confidence).toBeCloseTo(5 / 18, 2);

      expect(detections[2].class_label).toBe('person'); // 2 spikes
      expect(detections[2].confidence).toBeCloseTo(2 / 18, 2);
    });

    it('should handle zero spikes gracefully', () => {
      const outputSpikes = new Array(10).fill(0);

      const detections = loader.decodeOutput(outputSpikes);

      expect(detections).toHaveLength(10);
      detections.forEach((d) => {
        expect(d.confidence).toBe(0);
      });
    });

    it('should throw error if wrong output count', () => {
      const invalidSpikes = new Array(5).fill(0); // Wrong size

      expect(() => loader.decodeOutput(invalidSpikes)).toThrow(
        'Expected 10 output spikes, got 5',
      );
    });
  });

  describe('Integration', () => {
    it('should perform full pipeline: extract → encode → decode', () => {
      const mockObject = {
        position: { x: -5, y: 1.5, z: -7.5 },
        velocity: { x: 0, y: 0, z: 0 },
        size: 0.4,
        distanceFromCamera: 8.0,
        angularSize: 0.05,
        hasMoved: false,
      };

      // Extract features
      const features = loader.extractFeatures(mockObject);
      expect(features).toHaveLength(64);

      // Encode to spike rates
      const spikeRates = loader.encodeFeatures(features);
      expect(spikeRates).toHaveLength(64);

      // Simulate SNN output (in reality, this comes from WebGPU compute)
      const mockOutputSpikes = [15, 3, 1, 0, 0, 0, 0, 0, 0, 0]; // Box detected

      // Decode to detections
      const detections = loader.decodeOutput(mockOutputSpikes);

      expect(detections[0].class_label).toBe('box');
      expect(detections[0].confidence).toBeGreaterThan(0.5);
    });
  });
});
