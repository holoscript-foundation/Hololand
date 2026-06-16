/**
 * consumer-entry.ts — Process B, in genuine OS isolation.
 *
 * This file is spawned as a SEPARATE node process (via tsx). It shares NOTHING
 * with the producer except the bytes on disk. It:
 *   1. reads ONLY the payload file given as argv[2],
 *   2. rehydrates the agent's memory via `consumeExperience`,
 *   3. prints a single JSON line to stdout: { question, answer, recalled, error }.
 *
 * The fact that this runs in its own process — with its own module graph, its
 * own heap, no shared closures — is what makes the continuity claim honest:
 * the experience traveled as 0s and 1s through a file, nothing else.
 *
 * Invoked by run-demo.ts and by the ContinuityDemo isolation test.
 *
 * Usage: tsx consumer-entry.ts <path-to-payload-file>
 */

import { readFileSync } from 'node:fs';
import { consumeExperience, CONTINUITY_QUESTION } from './experienceContinuity';

function main(): void {
  const file = process.argv[2];
  if (!file) {
    process.stderr.write('consumer-entry: missing payload file argument\n');
    process.exit(2);
  }

  // The SOLE channel from Process A: the bytes on disk. Read as raw bytes.
  const buffer = readFileSync(file);
  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const { answer, recalled, error } = consumeExperience(bytes);

  // Emit a single machine-readable line the parent process asserts against.
  process.stdout.write(
    JSON.stringify({ question: CONTINUITY_QUESTION, answer, recalled, error }) + '\n',
  );
  process.exit(error !== null ? 1 : 0);
}

main();
