#!/usr/bin/env node
// Relational-intent classifier check for HoloShell's Brittney chat.
//
// The classifier decides whether a live-mode message is the founder talking WITH Brittney
// (relational: her own voice, her memory of him) or asking her to operate something. On
// 2026-09-22 an independent review showed five of eight ordinary operational phrasings routing
// relational because bare single words ("memory", "connection", "feel", ...) matched anywhere;
// the first fix (a pronoun anywhere in the message) scored 1/10 on operational phrases written
// AFTER the tuning set. The rule now requires a pronoun attached to the bare word.
//
// The held-out set lives in holoshell-relational-intent.heldout.mjs and was written BEFORE the
// rule it scores. Do not tune the rule to this file; if a phrase here is wrong, argue it in the
// held-out file's history, not by deleting it. Run: node scripts/__tests__/holoshell-relational-intent.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATIONAL, RELATIONAL } from './holoshell-relational-intent.heldout.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const serve = path.join(here, '..', '..', 'packages', 'holoshell', 'serve.mjs');

// serve.mjs starts a server on import, so lift the pure classifier out by brace matching.
function extractFunction(source, header) {
  const start = source.indexOf(header);
  assert.ok(start >= 0, `classifier header not found: ${header}`);
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') { depth -= 1; if (depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces while extracting the classifier');
}

const source = readFileSync(serve, 'utf8').replace(/\r\n/g, '\n');
const body = extractFunction(source, 'function looksLikeRelationalIntent(message) {');
// Desktop-control intent is a separate classifier; stub it so this test scores only the relational rule.
const looksLikeRelationalIntent = new Function('looksLikeDesktopControlIntent', `${body}; return looksLikeRelationalIntent;`)(() => false);

const wrongOperational = OPERATIONAL.filter((m) => looksLikeRelationalIntent(m));
const wrongRelational = RELATIONAL.filter((m) => !looksLikeRelationalIntent(m));
console.log(`held-out: operational ${OPERATIONAL.length - wrongOperational.length}/${OPERATIONAL.length}, relational ${RELATIONAL.length - wrongRelational.length}/${RELATIONAL.length}`);
for (const m of wrongOperational) console.log(`  routed relational, should be operational: ${m}`);
for (const m of wrongRelational) console.log(`  routed operational, should be relational: ${m}`);
assert.equal(wrongOperational.length, 0, 'operational phrases routed relational');
assert.equal(wrongRelational.length, 0, 'relational phrases routed operational');

// The tuning set from the review that found the bug, kept for the record; it is NOT the proof.
const tuning = [
  ['how much memory is the jetson using?', false],
  ['check memory pressure on the jetson', false],
  ['is the network connection to the anchor up?', false],
  ['what is the GPU memory headroom right now', false],
  ['did the miner grow its hashrate today', false],
  ['do you remember what we decided about pricing', true],
];
for (const [m, expected] of tuning) assert.equal(looksLikeRelationalIntent(m), expected, `tuning phrase: ${m}`);

// The founder's own questions from the build that made her remember him.
for (const m of ['What do you remember about me, Joseph?', 'who am i to you', 'how are you today']) {
  assert.equal(looksLikeRelationalIntent(m), true, `founder phrase must be relational: ${m}`);
}
// Operational imperatives stay operational even with a relational word inside.
assert.equal(looksLikeRelationalIntent('check the connection to the anchor and tell me'), false);

console.log('holoshell-relational-intent: OK');
