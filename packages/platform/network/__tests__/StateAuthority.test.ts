/**
 * StateAuthority Tests
 *
 * Tests for centralized authority management of networked entities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StateAuthority,
  type AuthorityEvent,
  type AuthorityConfig,
} from '../src/StateAuthority';

// =============================================================================
// TESTS
// =============================================================================

describe('StateAuthority', () => {
  let authority: StateAuthority;

  beforeEach(() => {
    authority = new StateAuthority({
      localPeerId: 'local-peer',
      hostPeerId: 'host-peer',
      defaultMode: 'owner',
      conflictStrategy: 'priority',
      claimTimeout: 5000,
    });
  });

  describe('construction', () => {
    it('should create with defaults', () => {
      const a = new StateAuthority();
      expect(a.getEntityCount()).toBe(0);
    });

    it('should create with custom config', () => {
      const a = new StateAuthority({
        defaultMode: 'shared',
        conflictStrategy: 'host_wins',
        claimTimeout: 3000,
      });
      expect(a.getEntityCount()).toBe(0);
    });
  });

  describe('entity registration', () => {
    it('should register an entity', () => {
      const entry = authority.register('entity-1', 'local-peer');
      expect(entry.entityId).toBe('entity-1');
      expect(entry.owner).toBe('local-peer');
      expect(entry.mode).toBe('owner');
      expect(entry.transferable).toBe(true);
      expect(entry.locked).toBe(false);
    });

    it('should register with custom options', () => {
      const entry = authority.register('entity-2', null, {
        mode: 'shared',
        transferable: false,
      });
      expect(entry.owner).toBeNull();
      expect(entry.mode).toBe('shared');
      expect(entry.transferable).toBe(false);
    });

    it('should track entity count', () => {
      authority.register('e1', 'p1');
      authority.register('e2', 'p2');
      authority.register('e3', null);
      expect(authority.getEntityCount()).toBe(3);
    });

    it('should unregister an entity', () => {
      authority.register('e1', 'p1');
      authority.unregister('e1');
      expect(authority.getEntityCount()).toBe(0);
      expect(authority.getEntry('e1')).toBeUndefined();
    });

    it('should handle unregistering non-existent entity', () => {
      expect(() => authority.unregister('nonexistent')).not.toThrow();
    });
  });

  describe('authority queries', () => {
    beforeEach(() => {
      authority.register('e1', 'peer-a');
      authority.register('e2', 'peer-b');
      authority.register('e3', null);
    });

    it('should get owner', () => {
      expect(authority.getOwner('e1')).toBe('peer-a');
      expect(authority.getOwner('e2')).toBe('peer-b');
      expect(authority.getOwner('e3')).toBeNull();
    });

    it('should check hasAuthority', () => {
      expect(authority.hasAuthority('e1', 'peer-a')).toBe(true);
      expect(authority.hasAuthority('e1', 'peer-b')).toBe(false);
    });

    it('should check isLocalAuthority', () => {
      authority.register('e4', 'local-peer');
      expect(authority.isLocalAuthority('e4')).toBe(true);
      expect(authority.isLocalAuthority('e1')).toBe(false);
    });

    it('should get entities owned by a peer', () => {
      authority.register('e4', 'peer-a');
      const owned = authority.getEntitiesOwnedBy('peer-a');
      expect(owned).toContain('e1');
      expect(owned).toContain('e4');
      expect(owned).not.toContain('e2');
    });

    it('should get unowned entities', () => {
      const unowned = authority.getUnownedEntities();
      expect(unowned).toContain('e3');
      expect(unowned).not.toContain('e1');
    });

    it('should return null for unknown entity owner', () => {
      expect(authority.getOwner('nonexistent')).toBeNull();
    });
  });

  describe('requestAuthority', () => {
    it('should grant authority for unclaimed entity (owner mode)', () => {
      authority.register('e1', null, { mode: 'owner' });

      const granted = authority.requestAuthority('e1', 'peer-a');
      expect(granted).toBe(true);
      expect(authority.getOwner('e1')).toBe('peer-a');
    });

    it('should return true if already the owner', () => {
      authority.register('e1', 'peer-a');
      expect(authority.requestAuthority('e1', 'peer-a')).toBe(true);
    });

    it('should deny if not transferable', () => {
      authority.register('e1', 'peer-a', { transferable: false });
      const events: AuthorityEvent[] = [];
      authority.onEvent((e) => events.push(e));

      const granted = authority.requestAuthority('e1', 'peer-b');
      expect(granted).toBe(false);
      expect(events[0].type).toBe('authority_denied');
    });

    it('should deny if entity is locked', () => {
      authority.register('e1', 'peer-a');
      authority.lock('e1');
      const events: AuthorityEvent[] = [];
      authority.onEvent((e) => events.push(e));

      const granted = authority.requestAuthority('e1', 'peer-b');
      expect(granted).toBe(false);
      expect(events.some((e) => e.type === 'authority_denied')).toBe(true);
    });

    it('should return false for non-existent entity', () => {
      expect(authority.requestAuthority('nonexistent', 'peer-a')).toBe(false);
    });

    describe('server mode', () => {
      it('should grant authority to host peer', () => {
        authority.register('e1', null, { mode: 'server' });

        const granted = authority.requestAuthority('e1', 'host-peer');
        expect(granted).toBe(true);
        expect(authority.getOwner('e1')).toBe('host-peer');
      });

      it('should deny non-host and create pending claim', () => {
        authority.register('e1', null, { mode: 'server' });

        const granted = authority.requestAuthority('e1', 'regular-peer');
        expect(granted).toBe(false);
      });
    });

    describe('owner mode', () => {
      it('should grant unclaimed entity immediately', () => {
        authority.register('e1', null, { mode: 'owner' });

        expect(authority.requestAuthority('e1', 'peer-a')).toBe(true);
        expect(authority.getOwner('e1')).toBe('peer-a');
      });

      it('should not grant when owned by another', () => {
        authority.register('e1', 'peer-a', { mode: 'owner' });

        const granted = authority.requestAuthority('e1', 'peer-b');
        expect(granted).toBe(false);
        expect(authority.getOwner('e1')).toBe('peer-a');
      });
    });

    describe('shared mode', () => {
      it('should grant unclaimed entity', () => {
        authority.register('e1', null, { mode: 'shared' });

        expect(authority.requestAuthority('e1', 'peer-a')).toBe(true);
        expect(authority.getOwner('e1')).toBe('peer-a');
      });

      it('should transfer via priority strategy', () => {
        const sharedAuth = new StateAuthority({
          localPeerId: 'local',
          defaultMode: 'shared',
          conflictStrategy: 'priority',
        });
        sharedAuth.register('e1', 'peer-a', { mode: 'shared' });

        const events: AuthorityEvent[] = [];
        sharedAuth.onEvent((e) => events.push(e));

        const granted = sharedAuth.requestAuthority('e1', 'peer-b');
        expect(granted).toBe(true);
        expect(sharedAuth.getOwner('e1')).toBe('peer-b');

        const transfer = events.find((e) => e.type === 'authority_transferred');
        expect(transfer).toBeDefined();
      });

      it('should deny with first_wins strategy', () => {
        const firstWins = new StateAuthority({
          localPeerId: 'local',
          defaultMode: 'shared',
          conflictStrategy: 'first_wins',
        });
        firstWins.register('e1', 'peer-a', { mode: 'shared' });

        const granted = firstWins.requestAuthority('e1', 'peer-b');
        expect(granted).toBe(false);
        expect(firstWins.getOwner('e1')).toBe('peer-a');
      });

      it('should grant to host with host_wins strategy', () => {
        const hostWins = new StateAuthority({
          localPeerId: 'local',
          hostPeerId: 'host-peer',
          defaultMode: 'shared',
          conflictStrategy: 'host_wins',
        });
        hostWins.register('e1', 'peer-a', { mode: 'shared' });

        const granted = hostWins.requestAuthority('e1', 'host-peer');
        expect(granted).toBe(true);
        expect(hostWins.getOwner('e1')).toBe('host-peer');
      });

      it('should deny non-host with host_wins strategy', () => {
        const hostWins = new StateAuthority({
          localPeerId: 'local',
          hostPeerId: 'host-peer',
          defaultMode: 'shared',
          conflictStrategy: 'host_wins',
        });
        hostWins.register('e1', 'peer-a', { mode: 'shared' });

        const granted = hostWins.requestAuthority('e1', 'peer-b');
        expect(granted).toBe(false);
      });
    });
  });

  describe('releaseAuthority', () => {
    it('should release and emit event', () => {
      authority.register('e1', 'peer-a');
      const events: AuthorityEvent[] = [];
      authority.onEvent((e) => events.push(e));

      authority.releaseAuthority('e1', 'peer-a');

      expect(authority.getOwner('e1')).toBeNull();
      expect(events[0].type).toBe('authority_released');
    });

    it('should not release if not the owner', () => {
      authority.register('e1', 'peer-a');
      authority.releaseAuthority('e1', 'peer-b');
      expect(authority.getOwner('e1')).toBe('peer-a');
    });

    it('should grant to pending claimant after release', () => {
      authority.register('e1', 'peer-a', { mode: 'owner' });

      // peer-b tries to claim but gets queued
      authority.requestAuthority('e1', 'peer-b');
      expect(authority.getOwner('e1')).toBe('peer-a');

      // peer-a releases
      const events: AuthorityEvent[] = [];
      authority.onEvent((e) => events.push(e));
      authority.releaseAuthority('e1', 'peer-a');

      // peer-b should now be the owner
      expect(authority.getOwner('e1')).toBe('peer-b');
    });
  });

  describe('forceTransfer', () => {
    it('should transfer authority regardless of mode', () => {
      authority.register('e1', 'peer-a');
      const events: AuthorityEvent[] = [];
      authority.onEvent((e) => events.push(e));

      const result = authority.forceTransfer('e1', 'peer-b');
      expect(result).toBe(true);
      expect(authority.getOwner('e1')).toBe('peer-b');
      expect(events[0].type).toBe('authority_transferred');
    });

    it('should emit granted (not transferred) when no prior owner', () => {
      authority.register('e1', null);
      const events: AuthorityEvent[] = [];
      authority.onEvent((e) => events.push(e));

      authority.forceTransfer('e1', 'peer-a');
      expect(events[0].type).toBe('authority_granted');
    });

    it('should return false for non-existent entity', () => {
      expect(authority.forceTransfer('nonexistent', 'peer-a')).toBe(false);
    });
  });

  describe('lock / unlock', () => {
    it('should lock entity to prevent transfers', () => {
      authority.register('e1', 'peer-a');
      authority.lock('e1');

      expect(authority.requestAuthority('e1', 'peer-b')).toBe(false);
    });

    it('should unlock entity to allow transfers', () => {
      authority.register('e1', null, { mode: 'shared' });
      authority.lock('e1');
      authority.unlock('e1');

      expect(authority.requestAuthority('e1', 'peer-a')).toBe(true);
    });

    it('should be safe to lock/unlock non-existent entity', () => {
      expect(() => authority.lock('nonexistent')).not.toThrow();
      expect(() => authority.unlock('nonexistent')).not.toThrow();
    });
  });

  describe('peer disconnect handling', () => {
    it('should release all entities owned by disconnected peer', () => {
      authority.register('e1', 'peer-a');
      authority.register('e2', 'peer-a');
      authority.register('e3', 'peer-b');

      authority.handlePeerDisconnect('peer-a');

      expect(authority.getOwner('e1')).toBeNull();
      expect(authority.getOwner('e2')).toBeNull();
      expect(authority.getOwner('e3')).toBe('peer-b');
    });

    it('should emit authority_released for each released entity', () => {
      authority.register('e1', 'peer-a');
      authority.register('e2', 'peer-a');

      const events: AuthorityEvent[] = [];
      authority.onEvent((e) => events.push(e));

      authority.handlePeerDisconnect('peer-a');

      const releases = events.filter((e) => e.type === 'authority_released');
      expect(releases.length).toBe(2);
    });

    it('should grant to pending claimants after disconnect', () => {
      authority.register('e1', 'peer-a', { mode: 'owner' });
      authority.requestAuthority('e1', 'peer-b');

      authority.handlePeerDisconnect('peer-a');
      expect(authority.getOwner('e1')).toBe('peer-b');
    });

    it('should remove disconnected peer pending claims', () => {
      authority.register('e1', 'peer-x', { mode: 'owner' });
      authority.requestAuthority('e1', 'peer-a');
      authority.requestAuthority('e1', 'peer-b');

      authority.handlePeerDisconnect('peer-a');

      // Release the owner
      authority.releaseAuthority('e1', 'peer-x');
      // peer-b should get it (peer-a's claim was removed)
      expect(authority.getOwner('e1')).toBe('peer-b');
    });
  });

  describe('events', () => {
    it('should subscribe to events', () => {
      const events: AuthorityEvent[] = [];
      authority.onEvent((e) => events.push(e));

      authority.register('e1', null);
      authority.requestAuthority('e1', 'peer-a');

      expect(events.length).toBeGreaterThan(0);
    });

    it('should unsubscribe from events', () => {
      const events: AuthorityEvent[] = [];
      const handler = (e: AuthorityEvent) => events.push(e);

      authority.onEvent(handler);
      authority.register('e1', null);
      authority.requestAuthority('e1', 'peer-a');

      const count = events.length;

      authority.offEvent(handler);
      authority.register('e2', null);
      authority.requestAuthority('e2', 'peer-b');

      expect(events.length).toBe(count);
    });
  });

  describe('setHostPeer', () => {
    it('should update host peer', () => {
      const a = new StateAuthority({
        localPeerId: 'local',
        hostPeerId: null,
        defaultMode: 'server',
      });

      a.register('e1', null, { mode: 'server' });

      // No host set — regular peer should fail
      expect(a.requestAuthority('e1', 'peer-a')).toBe(false);

      // Set host
      a.setHostPeer('peer-a');
      expect(a.requestAuthority('e1', 'peer-a')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid register/unregister', () => {
      for (let i = 0; i < 100; i++) {
        authority.register(`e-${i}`, `peer-${i % 5}`);
      }
      expect(authority.getEntityCount()).toBe(100);

      for (let i = 0; i < 100; i++) {
        authority.unregister(`e-${i}`);
      }
      expect(authority.getEntityCount()).toBe(0);
    });

    it('should handle same entity re-registration', () => {
      authority.register('e1', 'peer-a');
      authority.register('e1', 'peer-b'); // Override
      expect(authority.getOwner('e1')).toBe('peer-b');
    });
  });
});
