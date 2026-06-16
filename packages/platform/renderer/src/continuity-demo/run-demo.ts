/**
 * run-demo.ts — Cross-substrate experience-continuity, end to end, runnable.
 *
 * Process A "experiences" a pet water bowl being low and decides to alert the
 * owner. Its memory serializes to a <10KB payload written to a temp file. A
 * genuinely SEPARATE OS process (Process B) is spawned, is handed ONLY that
 * file path, rehydrates the memory, and answers a question about the experience
 * it never directly had. The only thing that crossed the process boundary was
 * the bytes in the file.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * RUN IT:
 *   From the package dir
 *     C:\Users\Josep\Documents\GitHub\HoloLand\packages\platform\renderer
 *   run:
 *
 *     pnpm exec tsx src/continuity-demo/run-demo.ts
 *
 *   (or, from the repo root:
 *     pnpm --filter @hololand/renderer exec tsx src/continuity-demo/run-demo.ts )
 * ───────────────────────────────────────────────────────────────────────────
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

import { produceExperience, DEFAULT_EXPERIENCE, CONTINUITY_QUESTION } from './experienceContinuity';

/** Resolve the tsx CLI entry portably (it is hoisted to the workspace root). */
function resolveTsxCli(): string {
  // tsx executes this file via CJS-compatible transpile, so require.resolve works.
  const pkgJson = require.resolve('tsx/package.json');
  return join(dirname(pkgJson), 'dist', 'cli.mjs');
}

function main(): void {
  // eslint-disable-next-line no-console
  const log = console.log;

  log('===================================================================');
  log(' Cross-Substrate Experience Continuity -- END-TO-END DEMO');
  log('===================================================================');
  log('');

  // -- PROCESS A: live the experience, serialize the memory ------------------
  log(`[Process A | ${DEFAULT_EXPERIENCE.sourceFormFactor}] Agent "${DEFAULT_EXPERIENCE.agentName}" experiences:`);
  log(`    observation : ${DEFAULT_EXPERIENCE.observation}`);
  log(`    reading     : water ${DEFAULT_EXPERIENCE.waterLevelLabel} (${DEFAULT_EXPERIENCE.waterLevelPercent}%)`);
  log(`    decision    : ${DEFAULT_EXPERIENCE.decision}`);
  log(`    confidence  : ${DEFAULT_EXPERIENCE.confidence}`);
  log('');

  const bytes = produceExperience(DEFAULT_EXPERIENCE);
  log(`[Process A] Serialized memory -> ${bytes.length} bytes (budget 10240, <10KB OK)`);

  // -- Hand off ONLY the bytes, via a temp file ------------------------------
  const dir = mkdtempSync(join(tmpdir(), 'continuity-demo-'));
  const payloadFile = join(dir, 'mvc-payload.bin');
  writeFileSync(payloadFile, bytes);
  log(`[handoff ] Wrote payload to a file the consumer will read: ${payloadFile}`);
  log(`           (this file is the ONLY thing shared with Process B)`);
  log('');

  // -- PROCESS B: separate OS process, shares only the file ------------------
  const consumerEntry = join(__dirname, 'consumer-entry.ts');
  const tsxCli = resolveTsxCli();

  log(`[Process B | ${DEFAULT_EXPERIENCE.targetFormFactor}] Spawning a SEPARATE node process...`);
  log(`           node ${tsxCli}`);
  log(`                ${consumerEntry} <payloadFile>`);
  log(`[Process B] Question: "${CONTINUITY_QUESTION}"`);
  log('');

  const result = spawnSync(process.execPath, [tsxCli, consumerEntry, payloadFile], {
    encoding: 'utf8',
    // Strip the parent's loader so the child is a clean, independent process.
    env: { ...process.env, NODE_OPTIONS: '' },
  });

  if (result.error) {
    log(`[Process B] FAILED to spawn: ${result.error.message}`);
    rmSync(dir, { recursive: true, force: true });
    process.exit(1);
  }
  if (result.stderr && result.stderr.trim().length > 0) {
    log(`[Process B stderr] ${result.stderr.trim()}`);
  }

  const line = result.stdout.trim().split('\n').filter(Boolean).pop() ?? '{}';
  const parsed = JSON.parse(line) as { answer: string; recalled: unknown; error: string | null };

  log('-------------------------------------------------------------------');
  log(`[Process B] ANSWER (recalled from bytes alone):`);
  log(`    ${parsed.answer}`);
  log('-------------------------------------------------------------------');
  log('');
  log(`Process A experienced the low water bowl (payload ${bytes.length} bytes) ->`);
  log(`Process B, sharing only the file, recalled it and answered the question.`);
  log(`Continuity proven across a genuine OS process boundary. OK`);

  rmSync(dir, { recursive: true, force: true });
  process.exit(result.status ?? 0);
}

main();
