import { describe, it, expect } from 'vitest';
import {
  PLATFORM_CHANNELS,
  validateChannelMessage,
  generateRequestId,
} from '../bridge/FlutterBridge';

describe('PLATFORM_CHANNELS', () => {
  it('defines all 8 channels', () => {
    const channels = Object.values(PLATFORM_CHANNELS);
    expect(channels).toHaveLength(8);
  });

  it('all channels start with io.hololand.ar/', () => {
    Object.values(PLATFORM_CHANNELS).forEach(ch => {
      expect(ch).toMatch(/^io\.hololand\.ar\//);
    });
  });

  it('has session channels', () => {
    expect(PLATFORM_CHANNELS.SESSION).toBe('io.hololand.ar/session');
    expect(PLATFORM_CHANNELS.SESSION_EVENTS).toBe('io.hololand.ar/session_events');
  });

  it('has mesh channels', () => {
    expect(PLATFORM_CHANNELS.MESH).toBe('io.hololand.ar/mesh');
    expect(PLATFORM_CHANNELS.MESH_EVENTS).toBe('io.hololand.ar/mesh_events');
  });

  it('has anchor channels', () => {
    expect(PLATFORM_CHANNELS.ANCHORS).toBe('io.hololand.ar/anchors');
    expect(PLATFORM_CHANNELS.ANCHOR_EVENTS).toBe('io.hololand.ar/anchor_events');
  });

  it('has IoT channels', () => {
    expect(PLATFORM_CHANNELS.IOT).toBe('io.hololand.ar/iot');
    expect(PLATFORM_CHANNELS.IOT_EVENTS).toBe('io.hololand.ar/iot_events');
  });
});

describe('validateChannelMessage', () => {
  it('accepts valid channel and method', () => {
    const result = validateChannelMessage(
      'io.hololand.ar/session',
      'initSession',
      { mode: 'world' }
    );
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects unknown channel', () => {
    const result = validateChannelMessage('io.unknown/channel', 'method', {});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unknown channel');
  });

  it('rejects empty method', () => {
    const result = validateChannelMessage('io.hololand.ar/session', '', {});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('non-empty string');
  });

  it('rejects non-string method', () => {
    const result = validateChannelMessage('io.hololand.ar/session', 123 as any, {});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('non-empty string');
  });

  it('rejects non-serializable args', () => {
    const circular: any = {};
    circular.self = circular;
    const result = validateChannelMessage('io.hololand.ar/session', 'init', circular);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('JSON-serializable');
  });

  it('accepts null args', () => {
    const result = validateChannelMessage('io.hololand.ar/mesh', 'startScan', null);
    expect(result.valid).toBe(true);
  });

  it('accepts complex serializable args', () => {
    const result = validateChannelMessage('io.hololand.ar/iot', 'sendCommand', {
      deviceId: 'dev-1',
      action: 'toggle',
      params: { brightness: 200 },
    });
    expect(result.valid).toBe(true);
  });

  it('validates all channel names', () => {
    Object.values(PLATFORM_CHANNELS).forEach(ch => {
      const result = validateChannelMessage(ch, 'test', {});
      expect(result.valid).toBe(true);
    });
  });
});

describe('generateRequestId', () => {
  it('returns string starting with req_', () => {
    const id = generateRequestId();
    expect(id).toMatch(/^req_/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
    expect(ids.size).toBe(100);
  });

  it('contains timestamp and random parts', () => {
    const id = generateRequestId();
    const parts = id.split('_');
    expect(parts.length).toBe(3); // req, timestamp, random
  });
});
