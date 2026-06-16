/**
 * @vitest-environment node
 */

/**
 * Tests for the cross-substrate experience-continuity demo.
 *
 * Proves the thesis end to end:
 *   - round-trip: produceExperience → consumeExperience recalls the exact
 *     decision + evidence + confidence + water reading.
 *   - size gate: the produced payload is < MVC_MAX_SIZE_BYTES (<10KB).
 *   - isolation: a GENUINELY SEPARATE OS process (spawned node + tsx) reads
 *     ONLY the bytes off disk and produces the correct answer on stdout.
 *   - tamper: a truncated / garbage buffer deserializes to an error and the
 *     consumer reports "no memory" instead of throwing.
 *
 * Process-isolation honesty level achieved: CHILD-PROCESS (the strongest).
 * tsx@4.20.6 is hoisted to the workspace root and node@24 is on PATH, so the
 * consumer runs in its own OS process with its own module graph and heap.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';

import {
  produceExperience,
  consumeExperience,
  DEFAULT_EXPERIENCE,
  CONTINUITY_QUESTION,
} from '../continuity-demo/experienceContinuity';
import { MVC_MAX_SIZE_BYTES } from '../MVCSerializer';

// =============================================================================
// ROUND-TRIP
// =============================================================================

describe('continuity demo — round-trip (in-process)', () => {
  it('consumeExperience recalls the exact decision, evidence, confidence, reading', () => {
    const bytes = produceExperience(DEFAULT_EXPERIENCE);
    const { recalled, error } = consumeExperience(bytes);

    expect(error).toBeNull();
    expect(recalled).not.toBeNull();
    if (!recalled) throw new Error('recalled was null');

    expect(recalled.agentId).toBe(DEFAULT_EXPERIENCE.agentId);
    expect(recalled.agentName).toBe(DEFAULT_EXPERIENCE.agentName);
    expect(recalled.decision).toBe(DEFAULT_EXPERIENCE.decision);
    expect(recalled.rationale).toBe(DEFAULT_EXPERIENCE.rationale);
    expect(recalled.confidence).toBeCloseTo(DEFAULT_EXPERIENCE.confidence, 5);
    expect(recalled.waterLevelPercent).toBe(DEFAULT_EXPERIENCE.waterLevelPercent);
    expect(recalled.waterLevelLabel).toBe(DEFAULT_EXPERIENCE.waterLevelLabel);
    expect(recalled.observation).toBe(DEFAULT_EXPERIENCE.observation);
    expect(recalled.sourceFormFactor).toBe(DEFAULT_EXPERIENCE.sourceFormFactor);
  });

  it('produces a natural-language answer containing the load-bearing facts', () => {
    const bytes = produceExperience(DEFAULT_EXPERIENCE);
    const { answer } = consumeExperience(bytes);

    expect(answer).toContain('12%');
    expect(answer).toContain('LOW');
    expect(answer.toLowerCase()).toContain('alert the owner');
    expect(answer).toContain('0.92');
  });
});

// =============================================================================
// SIZE GATE
// =============================================================================

describe('continuity demo — size gate', () => {
  it('produced payload is < MVC_MAX_SIZE_BYTES (<10KB)', () => {
    const bytes = produceExperience(DEFAULT_EXPERIENCE);
    expect(bytes.length).toBeLessThan(MVC_MAX_SIZE_BYTES);
    expect(MVC_MAX_SIZE_BYTES).toBe(10_240);
  });
});

// =============================================================================
// ISOLATION — genuinely separate OS process (CHILD-PROCESS honesty level)
// =============================================================================

/** Resolve the tsx CLI entry (hoisted to the workspace root). */
function resolveTsxCli(): string {
  const require = createRequire(import.meta.url);
  const pkgJson = require.resolve('tsx/package.json');
  return join(dirname(pkgJson), 'dist', 'cli.mjs');
}

describe('continuity demo — isolation (separate OS process)', () => {
  it('a spawned node process recalls the experience from bytes on disk alone', () => {
    // Process A: produce + persist the bytes.
    const bytes = produceExperience(DEFAULT_EXPERIENCE);
    const dir = mkdtempSync(join(tmpdir(), 'continuity-test-'));
    const payloadFile = join(dir, 'mvc-payload.bin');
    writeFileSync(payloadFile, bytes);

    try {
      // Process B: a SEPARATE OS process that gets ONLY the file path.
      const consumerEntry = join(__dirname, '..', 'continuity-demo', 'consumer-entry.ts');
      const tsxCli = resolveTsxCli();

      const result = spawnSync(process.execPath, [tsxCli, consumerEntry, payloadFile], {
        encoding: 'utf8',
        env: { ...process.env, NODE_OPTIONS: '' },
      });

      expect(result.error, result.error?.message).toBeUndefined();
      expect(result.status).toBe(0);

      const line = result.stdout.trim().split('\n').filter(Boolean).pop() ?? '{}';
      const parsed = JSON.parse(line) as {
        question: string;
        answer: string;
        recalled: { decision: string; confidence: number; waterLevelPercent: number } | null;
        error: string | null;
      };

      expect(parsed.error).toBeNull();
      expect(parsed.question).toBe(CONTINUITY_QUESTION);
      // The answer the OTHER process produced contains the load-bearing facts.
      expect(parsed.answer).toContain('12%');
      expect(parsed.answer).toContain('LOW');
      expect(parsed.answer.toLowerCase()).toContain('alert the owner');
      expect(parsed.recalled).not.toBeNull();
      expect(parsed.recalled?.decision).toBe(DEFAULT_EXPERIENCE.decision);
      expect(parsed.recalled?.confidence).toBeCloseTo(DEFAULT_EXPERIENCE.confidence, 5);
      expect(parsed.recalled?.waterLevelPercent).toBe(DEFAULT_EXPERIENCE.waterLevelPercent);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);
});

// =============================================================================
// TAMPER / NEGATIVE
// =============================================================================

describe('continuity demo — tamper / negative', () => {
  it('a truncated payload yields an error and "no memory" rather than throwing', () => {
    const bytes = produceExperience(DEFAULT_EXPERIENCE);
    const truncated = bytes.slice(0, Math.floor(bytes.length / 2));

    // Does not throw on corrupt input.
    expect(() => consumeExperience(truncated)).not.toThrow();

    const out = consumeExperience(truncated);
    expect(out.error).not.toBeNull();
    expect(out.recalled).toBeNull();
    expect(out.answer.toLowerCase()).toContain('no memory');
  });

  it('a garbage buffer yields an error and "no memory" rather than throwing', () => {
    const garbage = new Uint8Array([0x00, 0xff, 0x42, 0x13, 0x37, 0x99, 0xde, 0xad]);

    // Does not throw on garbage input.
    expect(() => consumeExperience(garbage)).not.toThrow();

    const out = consumeExperience(garbage);
    expect(out.error).not.toBeNull();
    expect(out.recalled).toBeNull();
    expect(out.answer.toLowerCase()).toContain('no memory');
  });
});
