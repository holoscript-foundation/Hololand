import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceChannel } from '../src/services/VoiceChannel';
import type { VoiceChannelConfig, VoiceChannelEvent } from '../src/services/VoiceChannel';

describe('VoiceChannel', () => {
  let vc: VoiceChannel;

  beforeEach(() => {
    vc = new VoiceChannel();
  });

  afterEach(() => {
    vc.destroy();
  });

  // ============================================================================
  // Construction
  // ============================================================================

  describe('construction', () => {
    it('creates with default config', () => {
      const stats = vc.getStats();
      expect(stats.channels).toBe(0);
      expect(stats.participants).toBe(0);
      expect(stats.spatialChannels).toBe(0);
      expect(stats.speaking).toBe(0);
      expect(stats.muted).toBe(0);
    });

    it('creates with custom config', () => {
      const custom = new VoiceChannel({
        maxChannels: 10,
        defaultMaxParticipants: 25,
        autoDestroyEmpty: false,
        speakingTimeout: 500,
      });
      // Just verify it doesn't crash
      expect(custom.getStats().channels).toBe(0);
      custom.destroy();
    });
  });

  // ============================================================================
  // Channel Management
  // ============================================================================

  describe('channel management', () => {
    it('creates a channel', () => {
      const ch = vc.createChannel({ name: 'General' });
      expect(ch.id).toBeTruthy();
      expect(ch.name).toBe('General');
      expect(ch.roomId).toBeNull();
      expect(ch.maxParticipants).toBe(50); // default
      expect(ch.spatial).toBe(false);
      expect(ch.persistent).toBe(false);
      expect(ch.participantIds.size).toBe(0);
    });

    it('creates a channel with all options', () => {
      const ch = vc.createChannel({
        name: 'Spatial Room',
        roomId: 'room-1',
        maxParticipants: 10,
        spatial: true,
        persistent: true,
        metadata: { customKey: 'val' },
      });
      expect(ch.roomId).toBe('room-1');
      expect(ch.maxParticipants).toBe(10);
      expect(ch.spatial).toBe(true);
      expect(ch.persistent).toBe(true);
      expect(ch.metadata.customKey).toBe('val');
    });

    it('throws on maxParticipants < 1', () => {
      expect(() => vc.createChannel({ name: 'X', maxParticipants: 0 })).toThrow();
    });

    it('throws when channel limit reached', () => {
      const small = new VoiceChannel({ maxChannels: 2 });
      small.createChannel({ name: 'A' });
      small.createChannel({ name: 'B' });
      expect(() => small.createChannel({ name: 'C' })).toThrow('Maximum channel limit');
      small.destroy();
    });

    it('destroys a channel', () => {
      const ch = vc.createChannel({ name: 'Temp' });
      expect(vc.destroyChannel(ch.id)).toBe(true);
      expect(vc.getChannel(ch.id)).toBeUndefined();
    });

    it('returns false destroying non-existent channel', () => {
      expect(vc.destroyChannel('nope')).toBe(false);
    });

    it('destroyChannel removes all participants', () => {
      const ch = vc.createChannel({ name: 'Group', persistent: true });
      vc.join(ch.id, 'p1');
      vc.join(ch.id, 'p2');
      vc.destroyChannel(ch.id);
      expect(vc.isInChannel('p1')).toBe(false);
      expect(vc.isInChannel('p2')).toBe(false);
    });

    it('getChannelInfo returns public view', () => {
      const ch = vc.createChannel({ name: 'Info' });
      vc.join(ch.id, 'p1');
      const info = vc.getChannelInfo(ch.id);
      expect(info).toBeTruthy();
      expect(info!.name).toBe('Info');
      expect(info!.participantCount).toBe(1);
      expect((info as any).participantIds).toBeUndefined();
    });

    it('getChannelInfo returns undefined for unknown', () => {
      expect(vc.getChannelInfo('x')).toBeUndefined();
    });

    it('getChannels returns all channels', () => {
      vc.createChannel({ name: 'A' });
      vc.createChannel({ name: 'B' });
      expect(vc.getChannels()).toHaveLength(2);
    });

    it('getChannelsByRoom filters by roomId', () => {
      vc.createChannel({ name: 'R1A', roomId: 'r1' });
      vc.createChannel({ name: 'R1B', roomId: 'r1' });
      vc.createChannel({ name: 'R2A', roomId: 'r2' });
      expect(vc.getChannelsByRoom('r1')).toHaveLength(2);
      expect(vc.getChannelsByRoom('r2')).toHaveLength(1);
      expect(vc.getChannelsByRoom('r3')).toHaveLength(0);
    });
  });

  // ============================================================================
  // Participant Management
  // ============================================================================

  describe('participant management', () => {
    let channelId: string;

    beforeEach(() => {
      const ch = vc.createChannel({ name: 'Test', persistent: true });
      channelId = ch.id;
    });

    it('joins a channel', () => {
      const p = vc.join(channelId, 'p1');
      expect(p.peerId).toBe('p1');
      expect(p.channelId).toBe(channelId);
      expect(p.muted).toBe(false);
      expect(p.deafened).toBe(false);
      expect(p.speaking).toBe(false);
      expect(p.volume).toBe(1.0);
    });

    it('throws joining non-existent channel', () => {
      expect(() => vc.join('bad', 'p1')).toThrow('not found');
    });

    it('throws joining full channel', () => {
      const ch = vc.createChannel({ name: 'Small', maxParticipants: 1, persistent: true });
      vc.join(ch.id, 'p1');
      expect(() => vc.join(ch.id, 'p2')).toThrow('full');
    });

    it('auto-leaves previous channel on join', () => {
      const ch2 = vc.createChannel({ name: 'Other', persistent: true });
      vc.join(channelId, 'p1');
      vc.join(ch2.id, 'p1');

      expect(vc.getChannelForPeer('p1')).toBe(ch2.id);
      const participants = vc.getParticipants(channelId);
      expect(participants.find(p => p.peerId === 'p1')).toBeUndefined();
    });

    it('leaves a channel', () => {
      vc.join(channelId, 'p1');
      expect(vc.leave('p1')).toBe(true);
      expect(vc.isInChannel('p1')).toBe(false);
    });

    it('leave returns false for unknown peer', () => {
      expect(vc.leave('nobody')).toBe(false);
    });

    it('isInChannel checks correctly', () => {
      expect(vc.isInChannel('p1')).toBe(false);
      vc.join(channelId, 'p1');
      expect(vc.isInChannel('p1')).toBe(true);
    });

    it('getParticipant returns state', () => {
      vc.join(channelId, 'p1');
      const p = vc.getParticipant('p1');
      expect(p).toBeTruthy();
      expect(p!.peerId).toBe('p1');
    });

    it('getParticipant returns undefined for unknown', () => {
      expect(vc.getParticipant('nobody')).toBeUndefined();
    });

    it('getParticipants lists all in channel', () => {
      vc.join(channelId, 'p1');
      vc.join(channelId, 'p2');
      vc.join(channelId, 'p3');
      const list = vc.getParticipants(channelId);
      expect(list).toHaveLength(3);
      // should be VoiceParticipantInfo (no metadata)
      expect(list[0].peerId).toBeTruthy();
    });

    it('getParticipants returns empty for unknown channel', () => {
      expect(vc.getParticipants('bad')).toEqual([]);
    });

    it('getChannelForPeer returns channel id', () => {
      vc.join(channelId, 'p1');
      expect(vc.getChannelForPeer('p1')).toBe(channelId);
    });

    it('getChannelForPeer returns null for unknown', () => {
      expect(vc.getChannelForPeer('nobody')).toBeNull();
    });
  });

  // ============================================================================
  // Auto-destroy Empty Channels
  // ============================================================================

  describe('auto-destroy empty channels', () => {
    it('auto-destroys empty non-persistent channel', () => {
      const ch = vc.createChannel({ name: 'Temp', persistent: false });
      vc.join(ch.id, 'p1');
      vc.leave('p1');
      expect(vc.getChannel(ch.id)).toBeUndefined();
    });

    it('does not auto-destroy persistent channel', () => {
      const ch = vc.createChannel({ name: 'Persist', persistent: true });
      vc.join(ch.id, 'p1');
      vc.leave('p1');
      expect(vc.getChannel(ch.id)).toBeTruthy();
    });

    it('does not auto-destroy if autoDestroyEmpty=false', () => {
      const noAutoVC = new VoiceChannel({ autoDestroyEmpty: false });
      const ch = noAutoVC.createChannel({ name: 'Temp', persistent: false });
      noAutoVC.join(ch.id, 'p1');
      noAutoVC.leave('p1');
      expect(noAutoVC.getChannel(ch.id)).toBeTruthy();
      noAutoVC.destroy();
    });
  });

  // ============================================================================
  // Mute / Deafen
  // ============================================================================

  describe('mute and deafen', () => {
    let channelId: string;

    beforeEach(() => {
      const ch = vc.createChannel({ name: 'Mute', persistent: true });
      channelId = ch.id;
      vc.join(channelId, 'p1');
    });

    it('sets muted', () => {
      expect(vc.setMuted('p1', true)).toBe(true);
      expect(vc.getParticipant('p1')!.muted).toBe(true);
    });

    it('sets unmuted', () => {
      vc.setMuted('p1', true);
      vc.setMuted('p1', false);
      expect(vc.getParticipant('p1')!.muted).toBe(false);
    });

    it('returns false for unknown peer', () => {
      expect(vc.setMuted('nobody', true)).toBe(false);
    });

    it('muting stops speaking', () => {
      vc.setSpeaking('p1', true);
      expect(vc.getParticipant('p1')!.speaking).toBe(true);
      vc.setMuted('p1', true);
      expect(vc.getParticipant('p1')!.speaking).toBe(false);
    });

    it('sets deafened', () => {
      expect(vc.setDeafened('p1', true)).toBe(true);
      expect(vc.getParticipant('p1')!.deafened).toBe(true);
    });

    it('deafening also mutes', () => {
      vc.setDeafened('p1', true);
      expect(vc.getParticipant('p1')!.muted).toBe(true);
    });

    it('deafening stops speaking', () => {
      vc.setSpeaking('p1', true);
      vc.setDeafened('p1', true);
      expect(vc.getParticipant('p1')!.speaking).toBe(false);
    });

    it('returns false for deafen unknown peer', () => {
      expect(vc.setDeafened('nobody', true)).toBe(false);
    });

    it('no-op when already in target state', () => {
      vc.setMuted('p1', false); // already false
      expect(vc.getParticipant('p1')!.muted).toBe(false);
    });
  });

  // ============================================================================
  // Speaking
  // ============================================================================

  describe('speaking', () => {
    let channelId: string;

    beforeEach(() => {
      vi.useFakeTimers();
      vc.destroy(); // clean up real-timer instance
      vc = new VoiceChannel({ speakingTimeout: 1000 });
      const ch = vc.createChannel({ name: 'Speak', persistent: true });
      channelId = ch.id;
      vc.join(channelId, 'p1');
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('sets speaking', () => {
      expect(vc.setSpeaking('p1', true)).toBe(true);
      expect(vc.getParticipant('p1')!.speaking).toBe(true);
    });

    it('returns false for unknown peer', () => {
      expect(vc.setSpeaking('nobody', true)).toBe(false);
    });

    it('cannot speak while muted', () => {
      vc.setMuted('p1', true);
      expect(vc.setSpeaking('p1', true)).toBe(false);
      expect(vc.getParticipant('p1')!.speaking).toBe(false);
    });

    it('auto-stops speaking after timeout', () => {
      vc.setSpeaking('p1', true);
      expect(vc.getParticipant('p1')!.speaking).toBe(true);

      vi.advanceTimersByTime(1001);
      expect(vc.getParticipant('p1')!.speaking).toBe(false);
    });

    it('resets timer on repeated setSpeaking(true)', () => {
      vc.setSpeaking('p1', true);
      vi.advanceTimersByTime(500);
      vc.setSpeaking('p1', true); // reset timer
      vi.advanceTimersByTime(600);
      // 500 + 600 = 1100ms total, but timer was reset at 500ms
      // so only 600ms since last setSpeaking — still speaking
      expect(vc.getParticipant('p1')!.speaking).toBe(true);

      vi.advanceTimersByTime(500);
      // Now 1100ms since last setSpeaking — timeout triggered
      expect(vc.getParticipant('p1')!.speaking).toBe(false);
    });

    it('manually stops speaking', () => {
      vc.setSpeaking('p1', true);
      vc.setSpeaking('p1', false);
      expect(vc.getParticipant('p1')!.speaking).toBe(false);
    });
  });

  // ============================================================================
  // Volume
  // ============================================================================

  describe('volume', () => {
    let channelId: string;

    beforeEach(() => {
      const ch = vc.createChannel({ name: 'Vol', persistent: true });
      channelId = ch.id;
      vc.join(channelId, 'p1');
    });

    it('sets volume', () => {
      expect(vc.setVolume('p1', 1.5)).toBe(true);
      expect(vc.getParticipant('p1')!.volume).toBe(1.5);
    });

    it('clamps volume to 0-2', () => {
      vc.setVolume('p1', -1);
      expect(vc.getParticipant('p1')!.volume).toBe(0);

      vc.setVolume('p1', 5);
      expect(vc.getParticipant('p1')!.volume).toBe(2);
    });

    it('returns false for unknown peer', () => {
      expect(vc.setVolume('nobody', 1)).toBe(false);
    });
  });

  // ============================================================================
  // Spatial Voice
  // ============================================================================

  describe('spatial voice', () => {
    let channelId: string;

    beforeEach(() => {
      const ch = vc.createChannel({
        name: 'Spatial',
        spatial: true,
        persistent: true,
        spatialConfig: { maxDistance: 50 },
      });
      channelId = ch.id;
    });

    it('creates spatial mixer for spatial channel', () => {
      expect(vc.getMixer(channelId)).toBeTruthy();
    });

    it('no mixer for non-spatial channel', () => {
      const ch = vc.createChannel({ name: 'Flat', persistent: true });
      expect(vc.getMixer(ch.id)).toBeUndefined();
    });

    it('updatePosition works for spatial channel participant', () => {
      vc.join(channelId, 'p1');
      expect(vc.updatePosition('p1', { x: 5, y: 1.6, z: 3 })).toBe(true);
    });

    it('updatePosition returns false for non-spatial', () => {
      const ch = vc.createChannel({ name: 'Flat', persistent: true });
      vc.join(ch.id, 'p1');
      expect(vc.updatePosition('p1', { x: 1, y: 2, z: 3 })).toBe(false);
    });

    it('updatePosition returns false for unknown peer', () => {
      expect(vc.updatePosition('nobody', { x: 1, y: 2, z: 3 })).toBe(false);
    });

    it('getVoiceGains returns spatial gains', () => {
      vc.join(channelId, 'p1');
      vc.join(channelId, 'p2');
      vc.updatePosition('p1', { x: 0, y: 0, z: 0 });
      vc.updatePosition('p2', { x: 5, y: 0, z: 0 });

      const gains = vc.getVoiceGains('p1');
      expect(gains).toHaveLength(1);
      expect(gains[0].peerId).toBe('p2');
      expect(gains[0].gain).toBeGreaterThan(0);
      expect(gains[0].distance).toBeCloseTo(5);
    });

    it('getVoiceGains filters muted speakers', () => {
      vc.join(channelId, 'p1');
      vc.join(channelId, 'p2');
      vc.updatePosition('p1', { x: 0, y: 0, z: 0 });
      vc.updatePosition('p2', { x: 5, y: 0, z: 0 });
      vc.setMuted('p2', true);

      const gains = vc.getVoiceGains('p1');
      expect(gains).toHaveLength(0);
    });

    it('getVoiceGains filters deafened listener', () => {
      vc.join(channelId, 'p1');
      vc.join(channelId, 'p2');
      vc.updatePosition('p1', { x: 0, y: 0, z: 0 });
      vc.updatePosition('p2', { x: 5, y: 0, z: 0 });
      vc.setDeafened('p1', true);

      const gains = vc.getVoiceGains('p1');
      expect(gains).toHaveLength(0);
    });

    it('getVoiceGains applies volume multiplier', () => {
      vc.join(channelId, 'p1');
      vc.join(channelId, 'p2');
      vc.updatePosition('p1', { x: 0, y: 0, z: 0 });
      vc.updatePosition('p2', { x: 0.5, y: 0, z: 0 }); // close = gain ~1

      vc.setVolume('p2', 0.5);
      const gains = vc.getVoiceGains('p1');
      expect(gains[0].gain).toBeLessThanOrEqual(0.5);
    });

    it('destroyChannel destroys mixer', () => {
      vc.destroyChannel(channelId);
      expect(vc.getMixer(channelId)).toBeUndefined();
    });
  });

  // ============================================================================
  // Non-Spatial Gains
  // ============================================================================

  describe('non-spatial gains', () => {
    let channelId: string;

    beforeEach(() => {
      const ch = vc.createChannel({ name: 'Flat', persistent: true });
      channelId = ch.id;
    });

    it('returns gains for all non-muted peers', () => {
      vc.join(channelId, 'p1');
      vc.join(channelId, 'p2');
      vc.join(channelId, 'p3');

      const gains = vc.getVoiceGains('p1');
      expect(gains).toHaveLength(2);
      expect(gains.every(g => g.pan === 0)).toBe(true);
      expect(gains.every(g => g.distance === 0)).toBe(true);
    });

    it('excludes muted speakers', () => {
      vc.join(channelId, 'p1');
      vc.join(channelId, 'p2');
      vc.setMuted('p2', true);

      const gains = vc.getVoiceGains('p1');
      expect(gains).toHaveLength(0);
    });

    it('returns empty for deafened listener', () => {
      vc.join(channelId, 'p1');
      vc.join(channelId, 'p2');
      vc.setDeafened('p1', true);

      const gains = vc.getVoiceGains('p1');
      expect(gains).toHaveLength(0);
    });

    it('returns empty for unknown peer', () => {
      expect(vc.getVoiceGains('nobody')).toEqual([]);
    });

    it('applies speaker volume', () => {
      vc.join(channelId, 'p1');
      vc.join(channelId, 'p2');
      vc.setVolume('p2', 1.5);

      const gains = vc.getVoiceGains('p1');
      expect(gains[0].gain).toBe(1.5);
    });
  });

  // ============================================================================
  // Voice Routing
  // ============================================================================

  describe('voice routing', () => {
    let channelId: string;

    beforeEach(() => {
      const ch = vc.createChannel({ name: 'Route', persistent: true });
      channelId = ch.id;
    });

    it('getListeners returns peers who can hear speaker', () => {
      vc.join(channelId, 'p1');
      vc.join(channelId, 'p2');
      vc.join(channelId, 'p3');

      const listeners = vc.getListeners('p1');
      expect(listeners).toContain('p2');
      expect(listeners).toContain('p3');
      expect(listeners).not.toContain('p1'); // no self
    });

    it('getListeners returns empty if speaker is muted', () => {
      vc.join(channelId, 'p1');
      vc.join(channelId, 'p2');
      vc.setMuted('p1', true);

      expect(vc.getListeners('p1')).toEqual([]);
    });

    it('getListeners excludes deafened listeners', () => {
      vc.join(channelId, 'p1');
      vc.join(channelId, 'p2');
      vc.join(channelId, 'p3');
      vc.setDeafened('p2', true);

      const listeners = vc.getListeners('p1');
      expect(listeners).not.toContain('p2');
      expect(listeners).toContain('p3');
    });

    it('getListeners returns empty for unknown peer', () => {
      expect(vc.getListeners('nobody')).toEqual([]);
    });

    it('getRoutingTable returns full table', () => {
      vc.join(channelId, 'p1');
      vc.join(channelId, 'p2');
      vc.join(channelId, 'p3');

      const table = vc.getRoutingTable(channelId);
      expect(table.size).toBe(3);
      expect(table.get('p1')).toContain('p2');
      expect(table.get('p1')).toContain('p3');
    });

    it('getRoutingTable empty for unknown channel', () => {
      expect(vc.getRoutingTable('bad').size).toBe(0);
    });

    it('spatial routing filters by distance', () => {
      const ch = vc.createChannel({
        name: 'Spatial',
        spatial: true,
        persistent: true,
        spatialConfig: { maxDistance: 10 },
      });

      vc.join(ch.id, 'p1');
      vc.join(ch.id, 'near');
      vc.join(ch.id, 'far');
      vc.updatePosition('p1', { x: 0, y: 0, z: 0 });
      vc.updatePosition('near', { x: 5, y: 0, z: 0 });
      vc.updatePosition('far', { x: 50, y: 0, z: 0 });

      const listeners = vc.getListeners('p1');
      expect(listeners).toContain('near');
      expect(listeners).not.toContain('far');
    });
  });

  // ============================================================================
  // Events
  // ============================================================================

  describe('events', () => {
    it('emits channel_created', () => {
      const events: VoiceChannelEvent[] = [];
      vc.onEvent((e) => events.push(e));

      vc.createChannel({ name: 'Test' });
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('channel_created');
    });

    it('emits channel_destroyed', () => {
      const events: VoiceChannelEvent[] = [];
      const ch = vc.createChannel({ name: 'Test', persistent: true });
      vc.onEvent((e) => events.push(e));

      vc.destroyChannel(ch.id);
      expect(events.some(e => e.type === 'channel_destroyed')).toBe(true);
    });

    it('emits participant_joined', () => {
      const events: VoiceChannelEvent[] = [];
      const ch = vc.createChannel({ name: 'Test', persistent: true });
      vc.onEvent((e) => events.push(e));

      vc.join(ch.id, 'p1');
      expect(events.some(e => e.type === 'participant_joined' && e.peerId === 'p1')).toBe(true);
    });

    it('emits participant_left', () => {
      const events: VoiceChannelEvent[] = [];
      const ch = vc.createChannel({ name: 'Test', persistent: true });
      vc.join(ch.id, 'p1');
      vc.onEvent((e) => events.push(e));

      vc.leave('p1');
      expect(events.some(e => e.type === 'participant_left' && e.peerId === 'p1')).toBe(true);
    });

    it('emits muted/unmuted events', () => {
      const events: VoiceChannelEvent[] = [];
      const ch = vc.createChannel({ name: 'Test', persistent: true });
      vc.join(ch.id, 'p1');
      vc.onEvent((e) => events.push(e));

      vc.setMuted('p1', true);
      expect(events.some(e => e.type === 'participant_muted')).toBe(true);

      vc.setMuted('p1', false);
      expect(events.some(e => e.type === 'participant_unmuted')).toBe(true);
    });

    it('emits deafened/undeafened events', () => {
      const events: VoiceChannelEvent[] = [];
      const ch = vc.createChannel({ name: 'Test', persistent: true });
      vc.join(ch.id, 'p1');
      vc.onEvent((e) => events.push(e));

      vc.setDeafened('p1', true);
      expect(events.some(e => e.type === 'participant_deafened')).toBe(true);

      vc.setDeafened('p1', false);
      expect(events.some(e => e.type === 'participant_undeafened')).toBe(true);
    });

    it('emits speaking/stopped_speaking events', () => {
      const events: VoiceChannelEvent[] = [];
      const ch = vc.createChannel({ name: 'Test', persistent: true });
      vc.join(ch.id, 'p1');
      vc.onEvent((e) => events.push(e));

      vc.setSpeaking('p1', true);
      expect(events.some(e => e.type === 'participant_speaking')).toBe(true);

      vc.setSpeaking('p1', false);
      expect(events.some(e => e.type === 'participant_stopped_speaking')).toBe(true);
    });

    it('emits volume_changed event', () => {
      const events: VoiceChannelEvent[] = [];
      const ch = vc.createChannel({ name: 'Test', persistent: true });
      vc.join(ch.id, 'p1');
      vc.onEvent((e) => events.push(e));

      vc.setVolume('p1', 0.5);
      expect(events.some(e => e.type === 'participant_volume_changed')).toBe(true);
    });

    it('offEvent stops notifications', () => {
      const events: VoiceChannelEvent[] = [];
      const cb = (e: VoiceChannelEvent) => events.push(e);
      vc.onEvent(cb);
      vc.offEvent(cb);

      vc.createChannel({ name: 'Test' });
      expect(events).toHaveLength(0);
    });

    it('onEvent returns unsubscribe function', () => {
      const events: VoiceChannelEvent[] = [];
      const unsub = vc.onEvent((e) => events.push(e));
      unsub();

      vc.createChannel({ name: 'Test' });
      expect(events).toHaveLength(0);
    });

    it('swallows listener errors', () => {
      vc.onEvent(() => { throw new Error('boom'); });
      expect(() => vc.createChannel({ name: 'Test' })).not.toThrow();
    });
  });

  // ============================================================================
  // Stats
  // ============================================================================

  describe('stats', () => {
    it('reports channels and participants', () => {
      const ch = vc.createChannel({ name: 'A', persistent: true });
      vc.createChannel({ name: 'B', spatial: true, persistent: true });
      vc.join(ch.id, 'p1');
      vc.join(ch.id, 'p2');

      const stats = vc.getStats();
      expect(stats.channels).toBe(2);
      expect(stats.participants).toBe(2);
      expect(stats.spatialChannels).toBe(1);
    });

    it('reports speaking and muted counts', () => {
      const ch = vc.createChannel({ name: 'Test', persistent: true });
      vc.join(ch.id, 'p1');
      vc.join(ch.id, 'p2');
      vc.join(ch.id, 'p3');

      vc.setMuted('p1', true);
      vc.setMuted('p2', true);
      vc.setSpeaking('p3', true);

      const stats = vc.getStats();
      expect(stats.muted).toBe(2);
      expect(stats.speaking).toBe(1);
    });
  });

  // ============================================================================
  // Destroy
  // ============================================================================

  describe('destroy', () => {
    it('clears all state', () => {
      const ch = vc.createChannel({ name: 'Test', persistent: true, spatial: true });
      vc.join(ch.id, 'p1');
      vc.setSpeaking('p1', true);

      vc.destroy();

      expect(vc.getStats().channels).toBe(0);
      expect(vc.getStats().participants).toBe(0);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('join with metadata', () => {
      const ch = vc.createChannel({ name: 'Meta', persistent: true });
      const p = vc.join(ch.id, 'p1', { role: 'admin' });
      expect(p.metadata.role).toBe('admin');
    });

    it('leave clears speaking timer', () => {
      vi.useFakeTimers();
      const ch = vc.createChannel({ name: 'Timer', persistent: true });
      vc.join(ch.id, 'p1');
      vc.setSpeaking('p1', true);
      vc.leave('p1');
      // Advancing time should not throw
      vi.advanceTimersByTime(5000);
      vi.useRealTimers();
    });

    it('channels have unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const ch = vc.createChannel({ name: `Ch${i}`, persistent: true });
        expect(ids.has(ch.id)).toBe(false);
        ids.add(ch.id);
      }
    });

    it('participant count in channel info updates', () => {
      const ch = vc.createChannel({ name: 'Count', persistent: true });
      expect(vc.getChannelInfo(ch.id)!.participantCount).toBe(0);

      vc.join(ch.id, 'p1');
      expect(vc.getChannelInfo(ch.id)!.participantCount).toBe(1);

      vc.join(ch.id, 'p2');
      expect(vc.getChannelInfo(ch.id)!.participantCount).toBe(2);

      vc.leave('p1');
      expect(vc.getChannelInfo(ch.id)!.participantCount).toBe(1);
    });
  });
});
