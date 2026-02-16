/**
 * DatasetExporter Test Suite
 *
 * Tests for JSONL export/import in Alpaca, ShareGPT, RLHF,
 * Completion, and Custom formats.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DatasetExporter,
} from '../src/services/DatasetExporter';

describe('DatasetExporter', () => {
  let exporter: DatasetExporter;

  const sampleExamples = [
    {
      id: 'ex_1',
      instruction: 'Create a VR cube',
      output: 'composition "CubeScene" { object "Cube" { geometry: "cube" } }',
      system: 'You are Brittney, a HoloScript assistant.',
      category: 'holoscript_generation',
      difficulty: 1,
      metadata: { quality: 0.9, originalOutput: 'bad cube code' },
    },
    {
      id: 'ex_2',
      instruction: 'Explain the @grabbable trait',
      output: 'The @grabbable trait allows VR users to pick up objects with controllers.',
      category: 'trait_explanation',
      difficulty: 2,
      metadata: { quality: 0.8, originalOutput: 'grabbable is a thing' },
    },
    {
      id: 'ex_3',
      instruction: 'Fix this broken HoloScript',
      input: 'template "Broken" { geometry: "sper" }',
      output: 'template "Fixed" {\n  @physics\n  geometry: "sphere"\n}',
      category: 'holoscript_debugging',
      difficulty: 3,
      metadata: { quality: 0.7, originalOutput: 'template "Broken" { geometry: "sper" }' },
    },
  ];

  beforeEach(() => {
    exporter = new DatasetExporter();
  });

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('should create with defaults', () => {
      expect(exporter).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Alpaca Format
  // --------------------------------------------------------------------------

  describe('Alpaca format', () => {
    it('should export to Alpaca JSONL', () => {
      const result = exporter.exportToString(sampleExamples, 'alpaca', { shuffle: false });
      expect(result.content).toBeDefined();
      expect(result.stats.examplesWritten).toBe(3);

      const lines = result.content.trim().split('\n');
      expect(lines.length).toBe(3);

      const parsed = JSON.parse(lines[0]);
      expect(parsed).toHaveProperty('instruction');
      expect(parsed).toHaveProperty('output');
    });

    it('should include input field when present', () => {
      // Export with no shuffle to ensure predictable order
      const result = exporter.exportToString(sampleExamples, 'alpaca', { shuffle: false });
      const lines = result.content.trim().split('\n');
      // Third example has input
      const withInput = JSON.parse(lines[2]);
      expect(withInput.input).toContain('Broken');
    });

    it('should roundtrip Alpaca format', () => {
      const exported = exporter.exportToString(sampleExamples, 'alpaca', { shuffle: false });
      const imported = exporter.importFromString(exported.content, 'alpaca');
      expect(imported.examples.length).toBe(3);
      expect(imported.parseErrors).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // ShareGPT Format
  // --------------------------------------------------------------------------

  describe('ShareGPT format', () => {
    it('should export to ShareGPT JSONL', () => {
      const result = exporter.exportToString(sampleExamples, 'sharegpt', { shuffle: false });
      expect(result.content).toBeDefined();

      const lines = result.content.trim().split('\n');
      const parsed = JSON.parse(lines[0]);
      expect(parsed).toHaveProperty('conversations');
      expect(parsed.conversations.length).toBeGreaterThanOrEqual(2);
    });

    it('should include system turn when system message present', () => {
      const result = exporter.exportToString(sampleExamples, 'sharegpt', { shuffle: false });
      const lines = result.content.trim().split('\n');
      // First example has a system message
      const first = JSON.parse(lines[0]);
      const hasSystem = first.conversations.some((c: any) => c.from === 'system');
      expect(hasSystem).toBe(true);
    });

    it('should roundtrip ShareGPT format', () => {
      const exported = exporter.exportToString(sampleExamples.slice(0, 1), 'sharegpt', { shuffle: false });
      const imported = exporter.importFromString(exported.content, 'sharegpt');
      expect(imported.examples.length).toBe(1);
      expect(imported.parseErrors).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // RLHF Format
  // --------------------------------------------------------------------------

  describe('RLHF format', () => {
    it('should export with chosen/rejected pairs', () => {
      // RLHF uses metadata.originalOutput as 'rejected'
      const result = exporter.exportToString(sampleExamples, 'rlhf', { shuffle: false });
      expect(result.stats.examplesWritten).toBe(3); // all have originalOutput

      const lines = result.content.trim().split('\n');
      const parsed = JSON.parse(lines[0]);
      expect(parsed).toHaveProperty('chosen');
      expect(parsed).toHaveProperty('rejected');
      expect(parsed).toHaveProperty('prompt');
    });

    it('should skip examples without originalOutput', () => {
      const noRejected = [
        {
          id: 'no_rej',
          instruction: 'test',
          output: 'test output',
          metadata: {},
        },
      ];
      const result = exporter.exportToString(noRejected, 'rlhf');
      // Should be 0 because no originalOutput present (returns null)
      expect(result.stats.examplesWritten).toBe(0);
    });

    it('should roundtrip RLHF format', () => {
      const exported = exporter.exportToString(sampleExamples, 'rlhf', { shuffle: false });
      const imported = exporter.importFromString(exported.content, 'rlhf');
      expect(imported.examples.length).toBe(3);
      expect(imported.parseErrors).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Completion Format
  // --------------------------------------------------------------------------

  describe('Completion format', () => {
    it('should export prompt+completion', () => {
      const result = exporter.exportToString(sampleExamples, 'completion', { shuffle: false });
      expect(result.stats.examplesWritten).toBe(3);

      const lines = result.content.trim().split('\n');
      const parsed = JSON.parse(lines[0]);
      expect(parsed).toHaveProperty('prompt');
      expect(parsed).toHaveProperty('completion');
    });

    it('should roundtrip completion format', () => {
      const exported = exporter.exportToString(sampleExamples, 'completion', { shuffle: false });
      const imported = exporter.importFromString(exported.content, 'completion');
      expect(imported.examples.length).toBe(3);
      expect(imported.parseErrors).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Format Stats
  // --------------------------------------------------------------------------

  describe('getFormatStats', () => {
    it('should return statistics from JSONL content', () => {
      const exported = exporter.exportToString(sampleExamples, 'alpaca', { shuffle: false });
      const stats = exporter.getFormatStats(exported.content);
      expect(stats.lineCount).toBe(3);
      expect(stats.totalBytes).toBeGreaterThan(0);
      expect(stats.detectedFormat).toBe('alpaca');
    });

    it('should detect different formats', () => {
      const sharegpt = exporter.exportToString(sampleExamples, 'sharegpt', { shuffle: false });
      const stats = exporter.getFormatStats(sharegpt.content);
      expect(stats.detectedFormat).toBe('sharegpt');
    });

    it('should handle empty content', () => {
      const stats = exporter.getFormatStats('');
      expect(stats.lineCount).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle empty export', () => {
      const result = exporter.exportToString([], 'alpaca');
      expect(result.stats.examplesWritten).toBe(0);
      expect(result.content).toBe('');
    });

    it('should handle malformed JSONL on import', () => {
      const bad = 'not json\n{also bad\n';
      const result = exporter.importFromString(bad, 'alpaca');
      expect(result.parseErrors).toBeGreaterThan(0);
    });

    it('should handle mixed valid/invalid lines', () => {
      const mixed = '{"instruction": "test", "output": "ok"}\nnot json\n{"instruction": "test2", "output": "ok2"}\n';
      const result = exporter.importFromString(mixed, 'alpaca');
      expect(result.examples.length).toBe(2);
      expect(result.parseErrors).toBe(1);
    });
  });
});
