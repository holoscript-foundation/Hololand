import { describe, it, expect } from 'vitest';
import { HomeAssistantDeviceSchema } from '../types';
import type {
  DeviceMapping,
  DeviceClass,
  GeneratorOptions,
  GenerationResult,
  MQTTConfig,
  StateUpdate,
  CompilationTarget,
  CompilationOptions,
  CompilationResult,
} from '../types';

describe('HomeAssistantDeviceSchema', () => {
  it('validates a valid device', () => {
    const device = {
      entity_id: 'light.living_room',
      state: 'on',
      attributes: { brightness: 255, friendly_name: 'Living Room Light' },
    };
    const result = HomeAssistantDeviceSchema.parse(device);
    expect(result.entity_id).toBe('light.living_room');
    expect(result.state).toBe('on');
  });

  it('accepts numeric state', () => {
    const device = {
      entity_id: 'sensor.temperature',
      state: 22.5,
      attributes: { unit_of_measurement: '°C' },
    };
    const result = HomeAssistantDeviceSchema.parse(device);
    expect(result.state).toBe(22.5);
  });

  it('accepts boolean state', () => {
    const device = {
      entity_id: 'binary_sensor.door',
      state: true,
      attributes: {},
    };
    const result = HomeAssistantDeviceSchema.parse(device);
    expect(result.state).toBe(true);
  });

  it('rejects missing entity_id', () => {
    expect(() => HomeAssistantDeviceSchema.parse({
      state: 'on',
      attributes: {},
    })).toThrow();
  });

  it('rejects missing state', () => {
    expect(() => HomeAssistantDeviceSchema.parse({
      entity_id: 'light.test',
      attributes: {},
    })).toThrow();
  });

  it('rejects missing attributes', () => {
    expect(() => HomeAssistantDeviceSchema.parse({
      entity_id: 'light.test',
      state: 'on',
    })).toThrow();
  });

  it('accepts empty attributes', () => {
    const result = HomeAssistantDeviceSchema.parse({
      entity_id: 'switch.plug',
      state: 'off',
      attributes: {},
    });
    expect(result.attributes).toEqual({});
  });
});

describe('Type contracts', () => {
  it('DeviceMapping shape', () => {
    const mapping: DeviceMapping = {
      holoTraits: ['@iot_connect', '@sensor_data'],
      holoGeometry: 'sphere',
      holoState: { brightness: 'number', is_on: 'boolean' },
      icon: 'lightbulb',
      color: '#ffcc00',
    };
    expect(mapping.holoTraits).toHaveLength(2);
    expect(mapping.holoGeometry).toBe('sphere');
  });

  it('DeviceClass union', () => {
    const classes: DeviceClass[] = ['light', 'climate', 'camera', 'lock', 'switch', 'sensor', 'binary_sensor', 'cover', 'fan'];
    expect(classes).toHaveLength(9);
  });

  it('GeneratorOptions defaults', () => {
    const opts: GeneratorOptions = {};
    expect(opts.layoutStrategy).toBeUndefined();
    expect(opts.enableBindings).toBeUndefined();
  });

  it('GenerationResult shape', () => {
    const result: GenerationResult = {
      holoScript: 'composition "test" {}',
      deviceCount: 5,
      skippedDevices: ['unknown.device'],
      metadata: {
        timestamp: new Date(),
        version: '1.0.0',
        layoutStrategy: 'grid',
        bindingsEnabled: true,
      },
    };
    expect(result.deviceCount).toBe(5);
    expect(result.skippedDevices).toHaveLength(1);
  });

  it('MQTTConfig shape', () => {
    const config: MQTTConfig = {
      url: 'mqtt://localhost:1883',
      username: 'user',
      password: 'pass',
      clientId: 'hololand-001',
      topics: ['homeassistant/state/#'],
    };
    expect(config.url).toContain('mqtt://');
  });

  it('StateUpdate shape', () => {
    const update: StateUpdate = {
      entityId: 'light.kitchen',
      state: 'on',
      attributes: { brightness: 200 },
      timestamp: new Date(),
    };
    expect(update.entityId).toBe('light.kitchen');
  });

  it('CompilationTarget values', () => {
    const targets: CompilationTarget[] = ['r3f', 'dtdl', 'unity', 'unreal', 'urdf', 'sdf'];
    expect(targets).toHaveLength(6);
  });

  it('CompilationResult shape', () => {
    const result: CompilationResult = {
      success: true,
      outputs: { r3f: '<mesh />', dtdl: {} },
      metadata: {
        timestamp: new Date(),
        inputSize: 1024,
        outputSizes: { r3f: 512 },
        compilationTimeMs: 42,
      },
    };
    expect(result.success).toBe(true);
    expect(result.metadata.compilationTimeMs).toBe(42);
  });
});
