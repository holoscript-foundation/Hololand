/**
 * YjsCollaboration Tests
 *
 * Tests for the Yjs-compatible CRDT collaboration layer:
 *   - AwarenessProtocol: cursor presence, selection sync, typing indicators
 *   - ConflictDetector: conflict detection and resolution strategies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AwarenessProtocol,
  ConflictDetector,
  createAwarenessProtocol,
  createConflictDetector,
} from '../src/YjsCollaboration';
import type {
  AwarenessState,
  AwarenessEvent,
  CursorPosition,
  SelectionRange,
  EditConflict,
  ConflictingEdit,
  UserColor,
} from '../src/YjsCollaboration';
import { createVectorClock, incrementClock } from '../src/crdt';

// =============================================================================
// Helper Factories
// =============================================================================

function makeCursor(line: number, column: number, offset: number): CursorPosition {
  return { line, column, offset };
}

function makeSelection(
  anchorLine: number,
  anchorCol: number,
  anchorOffset: number,
  headLine: number,
  headCol: number,
  headOffset: number,
): SelectionRange {
  return {
    anchor: { line: anchorLine, column: anchorCol, offset: anchorOffset },
    head: { line: headLine, column: headCol, offset: headOffset },
    isReversed: anchorOffset > headOffset,
  };
}

function makeRemoteState(overrides: Partial<AwarenessState> = {}): AwarenessState {
  return {
    clientId: 'remote-1',
    displayName: 'Remote User',
    color: { color: '#ef4444', light: '#fca5a5' },
    cursor: null,
    selection: null,
    isTyping: false,
    isOnline: true,
    lastActivity: Date.now(),
    ...overrides,
  };
}

function makeConflictingEdit(overrides: Partial<ConflictingEdit> = {}): ConflictingEdit {
  return {
    clientId: 'user-1',
    displayName: 'User 1',
    color: { color: '#3b82f6', light: '#93c5fd' },
    text: 'hello',
    timestamp: Date.now(),
    vectorClock: createVectorClock('user-1'),
    ...overrides,
  };
}

// =============================================================================
// AwarenessProtocol Tests
// =============================================================================

describe('AwarenessProtocol', () => {
  let awareness: AwarenessProtocol;

  beforeEach(() => {
    vi.useFakeTimers();
    awareness = createAwarenessProtocol({
      clientId: 'local-user',
      displayName: 'Local User',
    });
  });

  afterEach(() => {
    awareness.destroy();
    vi.useRealTimers();
  });

  describe('construction', () => {
    it('should create with defaults', () => {
      const state = awareness.getLocalState();
      expect(state.clientId).toBe('local-user');
      expect(state.displayName).toBe('Local User');
      expect(state.isOnline).toBe(true);
      expect(state.cursor).toBeNull();
      expect(state.selection).toBeNull();
      expect(state.isTyping).toBe(false);
    });

    it('should assign a color to the local user', () => {
      const state = awareness.getLocalState();
      expect(state.color).toBeDefined();
      expect(state.color.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(state.color.light).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should use custom color when provided', () => {
      const custom: UserColor = { color: '#ff0000', light: '#ff9999' };
      const a = createAwarenessProtocol({
        clientId: 'custom-user',
        displayName: 'Custom',
        colorStrategy: 'custom',
        customColor: custom,
      });
      expect(a.getLocalState().color).toEqual(custom);
      a.destroy();
    });

    it('should use hash-based color strategy by default', () => {
      const a1 = createAwarenessProtocol({ clientId: 'aaa', displayName: 'A' });
      const a2 = createAwarenessProtocol({ clientId: 'aaa', displayName: 'A2' });
      // Same clientId should produce same color
      expect(a1.getLocalState().color.color).toBe(a2.getLocalState().color.color);
      a1.destroy();
      a2.destroy();
    });
  });

  describe('cursor management', () => {
    it('should set local cursor position', () => {
      const cursor = makeCursor(5, 10, 120);
      awareness.setLocalCursor(cursor);

      const state = awareness.getLocalState();
      expect(state.cursor).toEqual(cursor);
    });

    it('should clear local cursor', () => {
      awareness.setLocalCursor(makeCursor(5, 10, 120));
      awareness.setLocalCursor(null);

      expect(awareness.getLocalState().cursor).toBeNull();
    });

    it('should emit cursor-move event', () => {
      const handler = vi.fn();
      awareness.on('cursor-move', handler);

      const cursor = makeCursor(3, 7, 45);
      awareness.setLocalCursor(cursor);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cursor-move',
          clientId: 'local-user',
          state: { cursor },
        }),
      );
    });

    it('should update lastActivity on cursor change', () => {
      const before = awareness.getLocalState().lastActivity;
      vi.advanceTimersByTime(1000);
      awareness.setLocalCursor(makeCursor(0, 0, 0));
      const after = awareness.getLocalState().lastActivity;
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  describe('selection management', () => {
    it('should set local selection', () => {
      const selection = makeSelection(1, 0, 10, 3, 5, 45);
      awareness.setLocalSelection(selection);

      expect(awareness.getLocalState().selection).toEqual(selection);
    });

    it('should clear local selection', () => {
      awareness.setLocalSelection(makeSelection(0, 0, 0, 1, 0, 10));
      awareness.setLocalSelection(null);

      expect(awareness.getLocalState().selection).toBeNull();
    });

    it('should emit selection-change event', () => {
      const handler = vi.fn();
      awareness.on('selection-change', handler);

      const selection = makeSelection(2, 3, 20, 5, 8, 60);
      awareness.setLocalSelection(selection);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'selection-change',
          clientId: 'local-user',
          state: { selection },
        }),
      );
    });
  });

  describe('typing indicator', () => {
    it('should set isTyping to true', () => {
      awareness.setLocalTyping();
      expect(awareness.getLocalState().isTyping).toBe(true);
    });

    it('should emit typing-start event', () => {
      const handler = vi.fn();
      awareness.on('typing-start', handler);

      awareness.setLocalTyping();

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'typing-start',
          clientId: 'local-user',
        }),
      );
    });

    it('should auto-reset typing after debounce timeout', () => {
      awareness.setLocalTyping();
      expect(awareness.getLocalState().isTyping).toBe(true);

      // Default debounce is 2000ms
      vi.advanceTimersByTime(2000);

      expect(awareness.getLocalState().isTyping).toBe(false);
    });

    it('should emit typing-stop after debounce', () => {
      const handler = vi.fn();
      awareness.on('typing-stop', handler);

      awareness.setLocalTyping();
      vi.advanceTimersByTime(2000);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should reset debounce timer on repeated typing signals', () => {
      awareness.setLocalTyping();
      vi.advanceTimersByTime(1500); // 1.5s -- not yet timed out

      awareness.setLocalTyping(); // reset timer
      vi.advanceTimersByTime(1500); // 1.5s from reset -- still under 2s

      expect(awareness.getLocalState().isTyping).toBe(true);

      vi.advanceTimersByTime(500); // Now 2s from last reset
      expect(awareness.getLocalState().isTyping).toBe(false);
    });

    it('should not emit duplicate typing-start events', () => {
      const handler = vi.fn();
      awareness.on('typing-start', handler);

      awareness.setLocalTyping();
      awareness.setLocalTyping();
      awareness.setLocalTyping();

      // Should only emit once (first call sets isTyping=true, subsequent calls dont re-emit)
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('remote peer management', () => {
    it('should receive remote peer state', () => {
      const remote = makeRemoteState({
        clientId: 'remote-1',
        displayName: 'Alice',
        cursor: makeCursor(3, 5, 30),
      });

      awareness.receiveRemoteState(remote);

      const peers = awareness.getPeers();
      expect(peers.size).toBe(1);
      expect(peers.get('remote-1')).toBeDefined();
      expect(peers.get('remote-1')?.displayName).toBe('Alice');
      expect(peers.get('remote-1')?.cursor).toEqual(makeCursor(3, 5, 30));
    });

    it('should emit awareness-add for new peers', () => {
      const handler = vi.fn();
      awareness.on('awareness-add', handler);

      awareness.receiveRemoteState(makeRemoteState({ clientId: 'new-peer' }));

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'awareness-add',
          clientId: 'new-peer',
        }),
      );
    });

    it('should emit awareness-update for existing peers', () => {
      awareness.receiveRemoteState(makeRemoteState({ clientId: 'peer-a' }));

      const handler = vi.fn();
      awareness.on('awareness-update', handler);

      awareness.receiveRemoteState(
        makeRemoteState({
          clientId: 'peer-a',
          cursor: makeCursor(10, 0, 100),
        }),
      );

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should not receive own state', () => {
      const selfState = makeRemoteState({ clientId: 'local-user' });
      awareness.receiveRemoteState(selfState);

      expect(awareness.getPeers().size).toBe(0);
    });

    it('should remove a peer', () => {
      awareness.receiveRemoteState(makeRemoteState({ clientId: 'peer-x' }));
      expect(awareness.getPeers().size).toBe(1);

      awareness.removePeer('peer-x');
      expect(awareness.getPeers().size).toBe(0);
    });

    it('should emit awareness-remove when peer is removed', () => {
      awareness.receiveRemoteState(makeRemoteState({ clientId: 'peer-y' }));

      const handler = vi.fn();
      awareness.on('awareness-remove', handler);

      awareness.removePeer('peer-y');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should enforce maxPeers limit', () => {
      const small = createAwarenessProtocol({
        clientId: 'local',
        displayName: 'Local',
        maxPeers: 2,
      });

      small.receiveRemoteState(makeRemoteState({ clientId: 'peer-1' }));
      small.receiveRemoteState(makeRemoteState({ clientId: 'peer-2' }));
      small.receiveRemoteState(makeRemoteState({ clientId: 'peer-3' }));

      expect(small.getPeers().size).toBe(2);
      small.destroy();
    });

    it('should get a specific peer by ID', () => {
      awareness.receiveRemoteState(makeRemoteState({ clientId: 'peer-z', displayName: 'Zara' }));

      const peer = awareness.getPeer('peer-z');
      expect(peer?.displayName).toBe('Zara');
    });

    it('should return local state when getPeer called with local ID', () => {
      const local = awareness.getPeer('local-user');
      expect(local?.clientId).toBe('local-user');
    });
  });

  describe('queries', () => {
    it('should return all states (local + remote)', () => {
      awareness.receiveRemoteState(makeRemoteState({ clientId: 'r1' }));
      awareness.receiveRemoteState(makeRemoteState({ clientId: 'r2' }));

      const all = awareness.getAllStates();
      expect(all.length).toBe(3); // local + 2 remote
    });

    it('should return active cursors (excluding local user)', () => {
      awareness.receiveRemoteState(
        makeRemoteState({
          clientId: 'r1',
          cursor: makeCursor(1, 0, 0),
          displayName: 'Alice',
        }),
      );
      awareness.receiveRemoteState(
        makeRemoteState({
          clientId: 'r2',
          cursor: null,
        }),
      );

      const cursors = awareness.getActiveCursors();
      expect(cursors.length).toBe(1);
      expect(cursors[0].clientId).toBe('r1');
    });

    it('should return active selections (excluding local user)', () => {
      awareness.receiveRemoteState(
        makeRemoteState({
          clientId: 'r1',
          selection: makeSelection(0, 0, 0, 2, 5, 30),
        }),
      );

      const selections = awareness.getActiveSelections();
      expect(selections.length).toBe(1);
      expect(selections[0].clientId).toBe('r1');
    });

    it('should return online peer count', () => {
      awareness.receiveRemoteState(makeRemoteState({ clientId: 'r1', isOnline: true }));
      awareness.receiveRemoteState(makeRemoteState({ clientId: 'r2', isOnline: false }));

      expect(awareness.getOnlinePeerCount()).toBe(1);
    });

    it('should return vector clock', () => {
      const clock = awareness.getVectorClock();
      expect(clock).toBeDefined();
      expect(clock['local-user']).toBeDefined();
    });
  });

  describe('offline detection', () => {
    it('should mark peers as offline after timeout', () => {
      awareness.start();

      awareness.receiveRemoteState(
        makeRemoteState({
          clientId: 'stale-peer',
          lastActivity: Date.now() - 20_000,
        }),
      );

      // Default offline timeout is 10s, check interval is 5s
      vi.advanceTimersByTime(5000);

      const peer = awareness.getPeer('stale-peer');
      expect(peer?.isOnline).toBe(false);
    });
  });

  describe('broadcast', () => {
    it('should call broadcast function when state changes', () => {
      const broadcastFn = vi.fn();
      awareness.setBroadcastFunction(broadcastFn);

      awareness.setLocalCursor(makeCursor(1, 2, 3));

      expect(broadcastFn).toHaveBeenCalledOnce();
      expect(broadcastFn).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'local-user',
          cursor: { line: 1, column: 2, offset: 3 },
        }),
      );
    });

    it('should periodically broadcast when started', () => {
      const broadcastFn = vi.fn();
      awareness.setBroadcastFunction(broadcastFn);
      awareness.start();

      // Default broadcast interval is 200ms
      vi.advanceTimersByTime(1000);

      // Should have broadcast at least 5 times (1000/200)
      expect(broadcastFn.mock.calls.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('metadata', () => {
    it('should set local metadata', () => {
      awareness.setLocalMetadata({ role: 'editor', theme: 'dark' });

      const state = awareness.getLocalState();
      expect(state.metadata).toEqual({ role: 'editor', theme: 'dark' });
    });

    it('should merge metadata updates', () => {
      awareness.setLocalMetadata({ role: 'editor' });
      awareness.setLocalMetadata({ theme: 'dark' });

      const state = awareness.getLocalState();
      expect(state.metadata).toEqual({ role: 'editor', theme: 'dark' });
    });
  });

  describe('lifecycle', () => {
    it('should mark local user offline on destroy', () => {
      const broadcastFn = vi.fn();
      awareness.setBroadcastFunction(broadcastFn);

      awareness.destroy();

      // Last broadcast should have isOnline: false
      const lastCall = broadcastFn.mock.calls[broadcastFn.mock.calls.length - 1];
      expect(lastCall[0].isOnline).toBe(false);
    });

    it('should stop timers on stop', () => {
      awareness.start();
      awareness.stop();

      const broadcastFn = vi.fn();
      awareness.setBroadcastFunction(broadcastFn);

      vi.advanceTimersByTime(5000);

      // Should not have been called because timers are stopped
      expect(broadcastFn).not.toHaveBeenCalled();
    });
  });

  describe('event unsubscribe', () => {
    it('should unsubscribe from events', () => {
      const handler = vi.fn();
      const unsub = awareness.on('cursor-move', handler);

      awareness.setLocalCursor(makeCursor(0, 0, 0));
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();
      awareness.setLocalCursor(makeCursor(1, 1, 1));
      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });
  });
});

// =============================================================================
// ConflictDetector Tests
// =============================================================================

describe('ConflictDetector', () => {
  let detector: ConflictDetector;

  beforeEach(() => {
    detector = createConflictDetector('last-writer-wins');
  });

  describe('construction', () => {
    it('should create with default strategy', () => {
      const d = createConflictDetector();
      expect(d.getActiveConflicts()).toEqual([]);
    });

    it('should create with custom strategy', () => {
      const d = createConflictDetector('merge-both');
      expect(d.getActiveConflicts()).toEqual([]);
    });
  });

  describe('range overlap detection', () => {
    it('should detect overlapping ranges', () => {
      const a = makeSelection(0, 0, 10, 0, 0, 30);
      const b = makeSelection(0, 0, 20, 0, 0, 40);

      expect(detector.rangesOverlap(a, b)).toBe(true);
    });

    it('should detect non-overlapping ranges', () => {
      const a = makeSelection(0, 0, 10, 0, 0, 20);
      const b = makeSelection(0, 0, 30, 0, 0, 40);

      expect(detector.rangesOverlap(a, b)).toBe(false);
    });

    it('should detect adjacent ranges as non-overlapping', () => {
      const a = makeSelection(0, 0, 10, 0, 0, 20);
      const b = makeSelection(0, 0, 20, 0, 0, 30);

      expect(detector.rangesOverlap(a, b)).toBe(false);
    });

    it('should detect contained ranges as overlapping', () => {
      const outer = makeSelection(0, 0, 0, 0, 0, 100);
      const inner = makeSelection(0, 0, 20, 0, 0, 40);

      expect(detector.rangesOverlap(outer, inner)).toBe(true);
    });
  });

  describe('conflict detection', () => {
    it('should detect conflict for concurrent edits', () => {
      // Two independent vector clocks = concurrent edits
      let clockA = createVectorClock('user-a');
      clockA = incrementClock(clockA, 'user-a');

      let clockB = createVectorClock('user-b');
      clockB = incrementClock(clockB, 'user-b');

      const editA = makeConflictingEdit({
        clientId: 'user-a',
        displayName: 'Alice',
        text: 'hello',
        vectorClock: clockA,
      });

      const editB = makeConflictingEdit({
        clientId: 'user-b',
        displayName: 'Bob',
        text: 'world',
        vectorClock: clockB,
      });

      const region = makeSelection(0, 0, 0, 0, 0, 20);
      const conflict = detector.detectConflict(editA, editB, region);

      expect(conflict).not.toBeNull();
      expect(conflict!.status).toBe('detected');
      expect(conflict!.edits.length).toBe(2);
    });

    it('should not detect conflict for causally ordered edits', () => {
      // Clock B includes Clock A = not concurrent
      let clockA = createVectorClock('user-a');
      clockA = incrementClock(clockA, 'user-a');

      let clockB = { ...clockA }; // B has seen A
      clockB = incrementClock(clockB, 'user-b');

      const editA = makeConflictingEdit({
        clientId: 'user-a',
        vectorClock: clockA,
      });

      const editB = makeConflictingEdit({
        clientId: 'user-b',
        vectorClock: clockB,
      });

      const region = makeSelection(0, 0, 0, 0, 0, 20);
      const conflict = detector.detectConflict(editA, editB, region);

      expect(conflict).toBeNull();
    });

    it('should assign unique IDs to conflicts', () => {
      let c1Clock = createVectorClock('u1');
      c1Clock = incrementClock(c1Clock, 'u1');
      let c2Clock = createVectorClock('u2');
      c2Clock = incrementClock(c2Clock, 'u2');

      const region = makeSelection(0, 0, 0, 0, 0, 10);

      const conflict1 = detector.detectConflict(
        makeConflictingEdit({ vectorClock: c1Clock }),
        makeConflictingEdit({ vectorClock: c2Clock }),
        region,
      );

      let c3Clock = createVectorClock('u3');
      c3Clock = incrementClock(c3Clock, 'u3');
      let c4Clock = createVectorClock('u4');
      c4Clock = incrementClock(c4Clock, 'u4');

      const conflict2 = detector.detectConflict(
        makeConflictingEdit({ vectorClock: c3Clock }),
        makeConflictingEdit({ vectorClock: c4Clock }),
        region,
      );

      expect(conflict1!.id).not.toBe(conflict2!.id);
    });
  });

  describe('conflict resolution', () => {
    let conflictId: string;

    beforeEach(() => {
      let clockA = createVectorClock('user-a');
      clockA = incrementClock(clockA, 'user-a');

      let clockB = createVectorClock('user-b');
      clockB = incrementClock(clockB, 'user-b');

      const editA = makeConflictingEdit({
        clientId: 'user-a',
        displayName: 'Alice',
        text: 'alice-text',
        timestamp: 1000,
        vectorClock: clockA,
      });

      const editB = makeConflictingEdit({
        clientId: 'user-b',
        displayName: 'Bob',
        text: 'bob-text',
        timestamp: 2000,
        vectorClock: clockB,
      });

      const region = makeSelection(0, 0, 0, 0, 0, 20);
      const conflict = detector.detectConflict(editA, editB, region)!;
      conflictId = conflict.id;
    });

    it('should resolve with last-writer-wins', () => {
      const winner = detector.resolveConflict(conflictId, 'last-writer-wins');

      expect(winner).not.toBeNull();
      expect(winner!.clientId).toBe('user-b'); // Later timestamp
      expect(winner!.text).toBe('bob-text');

      const conflict = detector.getConflict(conflictId);
      expect(conflict!.status).toBe('auto-resolved');
      expect(conflict!.resolvedWith).toBe('last-writer-wins');
    });

    it('should resolve with first-writer-wins', () => {
      const winner = detector.resolveConflict(conflictId, 'first-writer-wins');

      expect(winner).not.toBeNull();
      expect(winner!.clientId).toBe('user-a'); // Earlier timestamp
      expect(winner!.text).toBe('alice-text');
    });

    it('should resolve with merge-both', () => {
      const winner = detector.resolveConflict(conflictId, 'merge-both');

      expect(winner).not.toBeNull();
      expect(winner!.text).toBe('alice-textbob-text'); // Concatenated
    });

    it('should return null for user-choice strategy', () => {
      const winner = detector.resolveConflict(conflictId, 'user-choice');
      expect(winner).toBeNull();
    });

    it('should resolve manually', () => {
      const chosenEdit = makeConflictingEdit({
        clientId: 'user-a',
        text: 'custom-resolution',
      });

      detector.resolveConflictManually(conflictId, chosenEdit);

      const conflict = detector.getConflict(conflictId);
      expect(conflict!.status).toBe('user-resolved');
      expect(conflict!.resolvedWith).toBe('user-choice');
      expect(conflict!.resolvedEdit!.text).toBe('custom-resolution');
    });

    it('should dismiss a conflict', () => {
      detector.dismissConflict(conflictId);

      const conflict = detector.getConflict(conflictId);
      expect(conflict!.status).toBe('dismissed');
    });

    it('should not resolve already-resolved conflict', () => {
      detector.resolveConflict(conflictId, 'last-writer-wins');
      const secondAttempt = detector.resolveConflict(conflictId, 'first-writer-wins');
      expect(secondAttempt).toBeNull();
    });
  });

  describe('conflict queries', () => {
    it('should return active conflicts', () => {
      let c1 = createVectorClock('a');
      c1 = incrementClock(c1, 'a');
      let c2 = createVectorClock('b');
      c2 = incrementClock(c2, 'b');

      const region = makeSelection(0, 0, 0, 0, 0, 10);

      detector.detectConflict(
        makeConflictingEdit({ vectorClock: c1 }),
        makeConflictingEdit({ vectorClock: c2 }),
        region,
      );

      expect(detector.getActiveConflicts().length).toBe(1);
    });

    it('should not include resolved conflicts in active list', () => {
      let c1 = createVectorClock('a');
      c1 = incrementClock(c1, 'a');
      let c2 = createVectorClock('b');
      c2 = incrementClock(c2, 'b');

      const region = makeSelection(0, 0, 0, 0, 0, 10);
      const conflict = detector.detectConflict(
        makeConflictingEdit({ vectorClock: c1 }),
        makeConflictingEdit({ vectorClock: c2 }),
        region,
      )!;

      detector.resolveConflict(conflict.id, 'last-writer-wins');

      expect(detector.getActiveConflicts().length).toBe(0);
    });

    it('should return all conflicts including resolved', () => {
      let c1 = createVectorClock('a');
      c1 = incrementClock(c1, 'a');
      let c2 = createVectorClock('b');
      c2 = incrementClock(c2, 'b');

      const region = makeSelection(0, 0, 0, 0, 0, 10);
      const conflict = detector.detectConflict(
        makeConflictingEdit({ vectorClock: c1 }),
        makeConflictingEdit({ vectorClock: c2 }),
        region,
      )!;

      detector.resolveConflict(conflict.id, 'last-writer-wins');

      expect(detector.getAllConflicts().length).toBe(1);
    });

    it('should clear resolved conflicts', () => {
      let c1 = createVectorClock('a');
      c1 = incrementClock(c1, 'a');
      let c2 = createVectorClock('b');
      c2 = incrementClock(c2, 'b');

      const region = makeSelection(0, 0, 0, 0, 0, 10);
      const conflict = detector.detectConflict(
        makeConflictingEdit({ vectorClock: c1 }),
        makeConflictingEdit({ vectorClock: c2 }),
        region,
      )!;

      detector.resolveConflict(conflict.id, 'last-writer-wins');
      detector.clearResolved();

      expect(detector.getAllConflicts().length).toBe(0);
    });
  });

  describe('conflict events', () => {
    it('should emit detected event', () => {
      const handler = vi.fn();
      detector.onConflict('detected', handler);

      let c1 = createVectorClock('a');
      c1 = incrementClock(c1, 'a');
      let c2 = createVectorClock('b');
      c2 = incrementClock(c2, 'b');

      detector.detectConflict(
        makeConflictingEdit({ vectorClock: c1 }),
        makeConflictingEdit({ vectorClock: c2 }),
        makeSelection(0, 0, 0, 0, 0, 10),
      );

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'detected' }),
      );
    });

    it('should emit resolved event', () => {
      const handler = vi.fn();
      detector.onConflict('resolved', handler);

      let c1 = createVectorClock('a');
      c1 = incrementClock(c1, 'a');
      let c2 = createVectorClock('b');
      c2 = incrementClock(c2, 'b');

      const conflict = detector.detectConflict(
        makeConflictingEdit({ vectorClock: c1 }),
        makeConflictingEdit({ vectorClock: c2 }),
        makeSelection(0, 0, 0, 0, 0, 10),
      )!;

      detector.resolveConflict(conflict.id, 'last-writer-wins');

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should unsubscribe from conflict events', () => {
      const handler = vi.fn();
      const unsub = detector.onConflict('detected', handler);

      let c1 = createVectorClock('a');
      c1 = incrementClock(c1, 'a');
      let c2 = createVectorClock('b');
      c2 = incrementClock(c2, 'b');

      detector.detectConflict(
        makeConflictingEdit({ vectorClock: c1 }),
        makeConflictingEdit({ vectorClock: c2 }),
        makeSelection(0, 0, 0, 0, 0, 10),
      );

      expect(handler).toHaveBeenCalledTimes(1);

      unsub();

      let c3 = createVectorClock('c');
      c3 = incrementClock(c3, 'c');
      let c4 = createVectorClock('d');
      c4 = incrementClock(c4, 'd');

      detector.detectConflict(
        makeConflictingEdit({ vectorClock: c3 }),
        makeConflictingEdit({ vectorClock: c4 }),
        makeSelection(0, 0, 0, 0, 0, 10),
      );

      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });
  });
});
