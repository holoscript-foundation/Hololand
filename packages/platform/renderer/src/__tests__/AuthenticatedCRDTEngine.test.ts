/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import {
  HybridLogicalClock,
  CRDTOperationSigner,
  AuthenticatedLWWMap,
  AuthenticatedCRDTEngine,
  createAuthenticatedCRDTEngine,
  mergeVectorClocks,
  incrementVectorClock,
  happenedBefore,
} from '../AuthenticatedCRDTEngine';

import type { DIDIdentity, AuthenticatedCRDTOperation } from '../CrossRealityContinuityTypes';

// =============================================================================
// HELPERS
// =============================================================================

function createTestIdentity(suffix: string = '1'): DIDIdentity {
  return {
    did: `did:key:z6Mk${suffix}`,
    publicKey: `pubkey-${suffix}`,
    algorithm: 'Ed25519',
    deviceAttestation: null,
  };
}

function createTestEngine(deviceId: string = 'device-1', suffix: string = '1', scopes: string[] = ['*']) {
  return createAuthenticatedCRDTEngine({
    identity: createTestIdentity(suffix),
    deviceId,
    secretKey: `secret-${suffix}`,
    capabilityScopes: scopes,
  });
}

// =============================================================================
// HYBRID LOGICAL CLOCK
// =============================================================================

describe('HybridLogicalClock', () => {
  it('generates monotonically increasing timestamps', () => {
    const clock = new HybridLogicalClock('node-1');
    const t1 = clock.now();
    const t2 = clock.now();
    expect(HybridLogicalClock.compare(t1, t2)).toBe(-1);
  });

  it('encodes nodeId in timestamp', () => {
    const clock = new HybridLogicalClock('my-device');
    const t = clock.now();
    expect(t).toContain('my-device');
  });

  it('receives remote timestamps and stays ahead', () => {
    const local = new HybridLogicalClock('local');
    const remote = new HybridLogicalClock('remote');

    const remoteTime = remote.now();
    const afterReceive = local.receive(remoteTime);

    // Local clock should be >= remote
    expect(HybridLogicalClock.compare(afterReceive, remoteTime)).toBeGreaterThanOrEqual(0);
  });

  it('compare returns 0 for identical timestamps', () => {
    const clock = new HybridLogicalClock('node');
    const t = clock.now();
    expect(HybridLogicalClock.compare(t, t)).toBe(0);
  });

  it('decode extracts components', () => {
    const decoded = HybridLogicalClock.decode('1709744400000:0001:my-node');
    expect(decoded.physicalTime).toBe(1709744400000);
    expect(decoded.logicalCounter).toBe(1);
    expect(decoded.nodeId).toBe('my-node');
  });
});

// =============================================================================
// VECTOR CLOCKS
// =============================================================================

describe('Vector Clocks', () => {
  it('mergeVectorClocks takes max of each entry', () => {
    const a = { 'node-1': 3, 'node-2': 1 };
    const b = { 'node-1': 1, 'node-2': 5, 'node-3': 2 };
    const merged = mergeVectorClocks(a, b);
    expect(merged).toEqual({ 'node-1': 3, 'node-2': 5, 'node-3': 2 });
  });

  it('incrementVectorClock increases specific node', () => {
    const clock = { 'node-1': 3, 'node-2': 1 };
    const incremented = incrementVectorClock(clock, 'node-1');
    expect(incremented['node-1']).toBe(4);
    expect(incremented['node-2']).toBe(1);
  });

  it('incrementVectorClock creates new entry for unknown node', () => {
    const clock = { 'node-1': 3 };
    const incremented = incrementVectorClock(clock, 'node-2');
    expect(incremented['node-2']).toBe(1);
  });

  it('happenedBefore detects causal ordering', () => {
    expect(happenedBefore({ a: 1 }, { a: 2 })).toBe(true);
    expect(happenedBefore({ a: 2 }, { a: 1 })).toBe(false);
    expect(happenedBefore({ a: 1 }, { a: 1 })).toBe(false); // Same = not before
  });

  it('happenedBefore handles concurrent clocks', () => {
    // Concurrent: neither happened-before the other
    expect(happenedBefore({ a: 2, b: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(happenedBefore({ a: 1, b: 2 }, { a: 2, b: 1 })).toBe(false);
  });
});

// =============================================================================
// OPERATION SIGNER
// =============================================================================

describe('CRDTOperationSigner', () => {
  it('signs and verifies operations', () => {
    const identity = createTestIdentity();
    const signer = new CRDTOperationSigner(identity, 'dev-1', 'secret');

    const sig = signer.sign('op-1', 'key.path', { x: 1 }, '1000:0000:dev-1');

    const op: AuthenticatedCRDTOperation = {
      operationId: 'op-1',
      authorDID: identity.did,
      deviceId: 'dev-1',
      type: 'set',
      key: 'key.path',
      value: { x: 1 },
      hlcTimestamp: '1000:0000:dev-1',
      vectorClock: {},
      signature: sig,
      capabilityScope: [],
      createdAt: Date.now(),
    };

    expect(signer.verify(op)).toBe(true);
  });

  it('rejects tampered operations', () => {
    const identity = createTestIdentity();
    const signer = new CRDTOperationSigner(identity, 'dev-1', 'secret');

    const sig = signer.sign('op-1', 'key', 'value', '1000:0000:dev-1');

    const op: AuthenticatedCRDTOperation = {
      operationId: 'op-1',
      authorDID: identity.did,
      deviceId: 'dev-1',
      type: 'set',
      key: 'key',
      value: 'TAMPERED',
      hlcTimestamp: '1000:0000:dev-1',
      vectorClock: {},
      signature: sig,
      capabilityScope: [],
      createdAt: Date.now(),
    };

    expect(signer.verify(op)).toBe(false);
  });

  it('produces deterministic signatures', () => {
    const identity = createTestIdentity();
    const signer = new CRDTOperationSigner(identity, 'dev-1', 'secret');

    const sig1 = signer.sign('op-1', 'key', 'val', '1000:0000:dev-1');
    const sig2 = signer.sign('op-1', 'key', 'val', '1000:0000:dev-1');
    expect(sig1).toBe(sig2);
  });
});

// =============================================================================
// AUTHENTICATED LWW MAP
// =============================================================================

describe('AuthenticatedLWWMap', () => {
  let signer: CRDTOperationSigner;
  let identity: DIDIdentity;
  let hlc: HybridLogicalClock;

  beforeEach(() => {
    identity = createTestIdentity();
    signer = new CRDTOperationSigner(identity, 'dev-1', 'secret');
    hlc = new HybridLogicalClock('dev-1');
  });

  function makeOp<T>(key: string, value: T, type: 'set' | 'delete' = 'set'): AuthenticatedCRDTOperation<T> {
    const opId = `op-${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = hlc.now();
    const sig = signer.sign(opId, key, value, timestamp);
    return {
      operationId: opId,
      authorDID: identity.did,
      deviceId: 'dev-1',
      type,
      key,
      value,
      hlcTimestamp: timestamp,
      vectorClock: {},
      signature: sig,
      capabilityScope: ['*'],
      createdAt: Date.now(),
    };
  }

  it('applies set operations', () => {
    const map = new AuthenticatedLWWMap();
    const op = makeOp('agent.name', 'Brittney');
    const result = map.apply(op, signer);

    expect(result.valid).toBe(true);
    expect(map.get('agent.name')).toBe('Brittney');
    expect(map.size).toBe(1);
  });

  it('applies delete operations', () => {
    const map = new AuthenticatedLWWMap();
    map.apply(makeOp('key', 'value'), signer);
    expect(map.has('key')).toBe(true);

    map.apply(makeOp('key', null as any, 'delete'), signer);
    expect(map.has('key')).toBe(false);
  });

  it('LWW: later timestamp wins', () => {
    const map = new AuthenticatedLWWMap();
    map.apply(makeOp('key', 'first'), signer);
    map.apply(makeOp('key', 'second'), signer);
    expect(map.get('key')).toBe('second');
  });

  it('rejects operations from revoked DIDs', () => {
    const map = new AuthenticatedLWWMap();
    map.revokeDID(identity.did);

    const result = map.apply(makeOp('key', 'value'), signer);
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe('revoked-did');
  });

  it('rejects operations with invalid signatures', () => {
    const map = new AuthenticatedLWWMap();
    const op = makeOp('key', 'value');
    op.signature = 'forged-signature';

    const result = map.apply(op, signer);
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe('invalid-signature');
  });

  it('rejects out-of-scope operations', () => {
    const map = new AuthenticatedLWWMap();
    const op = makeOp('secret.data', 'value');
    op.capabilityScope = ['agent:read']; // Doesn't cover 'secret' prefix

    const result = map.apply(op, signer);
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe('out-of-scope');
  });

  it('maintains GDPR audit log', () => {
    const map = new AuthenticatedLWWMap();
    map.apply(makeOp('key1', 'val1'), signer);
    map.apply(makeOp('key2', 'val2'), signer);

    const log = map.getAuditLog();
    expect(log).toHaveLength(2);
    expect(log[0].allowed).toBe(true);
    expect(log[0].authorDID).toBe(identity.did);
  });

  it('clearAuditLog removes all entries', () => {
    const map = new AuthenticatedLWWMap();
    map.apply(makeOp('key', 'val'), signer);
    expect(map.getAuditLog().length).toBeGreaterThan(0);

    map.clearAuditLog();
    expect(map.getAuditLog()).toHaveLength(0);
  });

  it('getAll returns all entries', () => {
    const map = new AuthenticatedLWWMap();
    map.apply(makeOp('a', 1), signer);
    map.apply(makeOp('b', 2), signer);

    const all = map.getAll();
    expect(all['a']).toBe(1);
    expect(all['b']).toBe(2);
  });

  it('validation completes under 1ms', () => {
    const map = new AuthenticatedLWWMap();
    const result = map.apply(makeOp('key', 'value'), signer);
    expect(result.validationMs).toBeLessThan(1);
  });
});

// =============================================================================
// AUTHENTICATED CRDT ENGINE
// =============================================================================

describe('AuthenticatedCRDTEngine', () => {
  it('creates engine with identity', () => {
    const engine = createTestEngine();
    expect(engine.getIdentity().did).toBe('did:key:z6Mk1');
  });

  it('set and get values', () => {
    const engine = createTestEngine();
    engine.set('agent.position', { x: 1, y: 2, z: 3 });
    expect(engine.get('agent.position')).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('delete removes values', () => {
    const engine = createTestEngine();
    engine.set('key', 'value');
    expect(engine.get('key')).toBe('value');

    engine.delete('key');
    expect(engine.get('key')).toBeUndefined();
  });

  it('getState returns all entries', () => {
    const engine = createTestEngine();
    engine.set('a', 1);
    engine.set('b', 2);

    const state = engine.getState();
    expect(state['a']).toBe(1);
    expect(state['b']).toBe(2);
  });

  it('tracks vector clock', () => {
    const engine = createTestEngine('dev-1');
    engine.set('key', 'val');

    const vc = engine.getVectorClock();
    expect(vc['dev-1']).toBeGreaterThan(0);
  });

  it('cross-device sync: operations from different engines merge correctly', () => {
    const engine1 = createTestEngine('quest3', 'a');
    const engine2 = createTestEngine('phone', 'b');

    // Engine 1 sets a value
    const op1 = engine1.set('agent.mood', 'curious');

    // Engine 2 applies the remote operation
    const result = engine2.applyRemote(op1);
    expect(result.valid).toBe(true);
    expect(engine2.get('agent.mood')).toBe('curious');
  });

  it('cross-device sync: LWW resolves concurrent writes', () => {
    const engine1 = createTestEngine('quest3', 'a');
    const engine2 = createTestEngine('phone', 'b');

    // Both set the same key (nearly simultaneously)
    const op1 = engine1.set('agent.mood', 'curious');
    const op2 = engine2.set('agent.mood', 'focused');

    // Apply both to a third engine
    const engine3 = createTestEngine('desktop', 'c');
    engine3.applyRemote(op1);
    engine3.applyRemote(op2);

    // LWW: one of the two values should win (timing-dependent).
    // The key test: BOTH ops were applied, and the state has a definitive value.
    const result = engine3.get('agent.mood');
    expect(result === 'curious' || result === 'focused').toBe(true);

    // Verify that applying in reverse order on a fresh engine yields the same winner
    const engine4 = createTestEngine('laptop', 'd');
    engine4.applyRemote(op2);
    engine4.applyRemote(op1);
    expect(engine4.get('agent.mood')).toBe(result); // Same winner regardless of order
  });

  it('revokeDID blocks future operations from that DID', () => {
    const engine1 = createTestEngine('quest3', 'a');
    const engine2 = createTestEngine('phone', 'b');

    engine2.revokeDID('did:key:z6Mka');

    const op = engine1.set('key', 'value');
    const result = engine2.applyRemote(op);
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe('revoked-did');
  });

  it('emits crdt:operation-rejected event on invalid remote ops', () => {
    const engine = createTestEngine('phone', 'b');
    engine.revokeDID('did:key:z6Mka');

    const handler = vi.fn();
    engine.on('crdt:operation-rejected', handler);

    const remoteEngine = createTestEngine('quest3', 'a');
    const op = remoteEngine.set('key', 'val');
    engine.applyRemote(op);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'revoked-did' }),
    );
  });

  it('applyRemoteBatch processes multiple operations', () => {
    const engine1 = createTestEngine('quest3', 'a');
    const engine2 = createTestEngine('phone', 'b');

    const ops = [
      engine1.set('a', 1),
      engine1.set('b', 2),
      engine1.set('c', 3),
    ];

    const results = engine2.applyRemoteBatch(ops);
    expect(results).toHaveLength(3);
    expect(results.every(r => r.valid)).toBe(true);
    expect(engine2.size).toBe(3);
  });

  it('maintains audit log', () => {
    const engine = createTestEngine();
    engine.set('key1', 'val1');
    engine.set('key2', 'val2');

    const log = engine.getAuditLog();
    expect(log.length).toBeGreaterThanOrEqual(2);
  });

  it('clearAuditLog works', () => {
    const engine = createTestEngine();
    engine.set('key', 'val');
    expect(engine.getAuditLog().length).toBeGreaterThan(0);

    engine.clearAuditLog();
    expect(engine.getAuditLog()).toHaveLength(0);
  });
});
