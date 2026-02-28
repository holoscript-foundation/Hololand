/**
 * Clawdbot HoloScript Generator
 *
 * Converts IoT devices (Home Assistant, MQTT, etc.) into HoloScript compositions
 * for VR digital twin rendering.
 *
 * @module clawdbot-generator
 */

import { getDeviceClass, getDeviceMapping } from './device-mappings.js';
import type {
  HomeAssistantDevice,
  GeneratorOptions,
  GenerationResult,
  DeviceMapping,
} from './types.js';

/**
 * Clawdbot IoT-to-HoloScript Generator
 *
 * Transforms physical IoT devices into virtual HoloScript digital twins
 */
export class ClawdbotGenerator {
  private options: Required<GeneratorOptions>;

  constructor(options: GeneratorOptions = {}) {
    this.options = {
      layoutStrategy: options.layoutStrategy || 'grid',
      version: options.version || '3.4',
      mqttBroker: options.mqttBroker || 'mqtt://homeassistant/state/all',
      customMappings: options.customMappings || {},
      enableBindings: options.enableBindings ?? true,
    };
  }

  /**
   * Generate HoloScript composition from Home Assistant devices
   *
   * @param devices - Array of Home Assistant devices
   * @param compositionName - Name for the composition (default: "IoT Digital Twin")
   * @returns Generation result with HoloScript code and metadata
   */
  async generateFromHomeAssistant(
    devices: HomeAssistantDevice[],
    compositionName: string = 'IoT Digital Twin'
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const skippedDevices: string[] = [];
    const objects: string[] = [];

    // Process each device
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      const deviceClass = getDeviceClass(device.entity_id);
      const mapping = this.options.customMappings[deviceClass] || getDeviceMapping(deviceClass);

      if (!mapping) {
        console.warn(`No mapping for device class: ${deviceClass} (${device.entity_id})`);
        skippedDevices.push(device.entity_id);
        continue;
      }

      const objectCode = this.generateObject(device, mapping, i, devices.length);
      objects.push(objectCode);
    }

    // Build complete composition
    const holoScript = this.buildComposition(compositionName, objects);

    return {
      holoScript,
      deviceCount: objects.length,
      skippedDevices,
      metadata: {
        timestamp: new Date(),
        version: this.options.version,
        layoutStrategy: this.options.layoutStrategy,
        bindingsEnabled: this.options.enableBindings,
      },
    };
  }

  /**
   * Generate HoloScript object from device
   */
  private generateObject(
    device: HomeAssistantDevice,
    mapping: DeviceMapping,
    index: number,
    total: number
  ): string {
    const name = device.attributes.friendly_name || device.entity_id.replace(/\./g, '_');
    const position = this.calculatePosition(index, total);
    const state = this.mapDeviceState(device, mapping.holoState);
    const bindings = this.options.enableBindings
      ? this.generateBindings(device.entity_id, mapping.holoState)
      : null;

    let objectCode = `  object "${name}" {\n`;
    objectCode += `    ${mapping.holoTraits.join(' ')}\n`;
    objectCode += `    geometry: "${mapping.holoGeometry}"\n`;
    objectCode += `    position: [${position.join(', ')}]\n`;

    // Add color if specified in mapping
    if (mapping.color) {
      objectCode += `    material: { color: "${mapping.color}" }\n`;
    }

    // State block
    objectCode += `    state {\n`;
    for (const [key, value] of Object.entries(state)) {
      const serialized = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
      objectCode += `      ${key}: ${serialized}\n`;
    }
    objectCode += `    }\n`;

    // Bindings (if enabled)
    if (bindings && Object.keys(bindings).length > 0) {
      objectCode += `\n`;
      objectCode += `    // Real-time MQTT bindings\n`;
      for (const [key, binding] of Object.entries(bindings)) {
        objectCode += `    // ${key}: ${binding}\n`;
      }
    }

    objectCode += `  }\n`;
    return objectCode;
  }

  /**
   * Calculate 3D position based on layout strategy
   */
  private calculatePosition(index: number, total: number): [number, number, number] {
    switch (this.options.layoutStrategy) {
      case 'grid': {
        // Grid layout: 5 devices per row, 2m spacing
        const row = Math.floor(index / 5);
        const col = index % 5;
        return [col * 2, 2.5, row * -2];
      }

      case 'circular': {
        // Circular layout: devices arranged in a circle
        const radius = Math.max(3, total * 0.3);
        const angle = (index / total) * 2 * Math.PI;
        return [Math.cos(angle) * radius, 2.5, Math.sin(angle) * radius];
      }

      case 'room-based': {
        // Room-based layout (simple grid for now, could be enhanced with room parsing)
        const row = Math.floor(index / 5);
        const col = index % 5;
        return [col * 2, 2.5, row * -2];
      }

      case 'custom': {
        // Custom layout (default to grid)
        const row = Math.floor(index / 5);
        const col = index % 5;
        return [col * 2, 2.5, row * -2];
      }

      default:
        return [0, 2.5, 0];
    }
  }

  /**
   * Map Home Assistant device state to HoloScript state
   */
  private mapDeviceState(
    device: HomeAssistantDevice,
    stateSchema: Record<string, 'boolean' | 'number' | 'string'>
  ): Record<string, any> {
    const state: Record<string, any> = {};

    for (const [key, type] of Object.entries(stateSchema)) {
      let value: any;

      // Try to get value from device attributes or state
      if (key in device.attributes) {
        value = device.attributes[key];
      } else if (key === 'power') {
        value = device.state === 'on';
      } else if (key === 'brightness' && device.attributes.brightness !== undefined) {
        // Normalize Home Assistant brightness (0-255) to 0-1
        value = device.attributes.brightness / 255;
      } else if (key === 'color' && device.attributes.rgb_color) {
        // Convert RGB array to hex color
        const [r, g, b] = device.attributes.rgb_color;
        value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      } else if (key === 'state' && type === 'boolean') {
        value = device.state === 'on' || device.state === true;
      } else {
        value = this.getDefaultForType(type);
      }

      state[key] = value;
    }

    return state;
  }

  /**
   * Generate reactive MQTT bindings
   */
  private generateBindings(
    entityId: string,
    stateSchema: Record<string, string>
  ): Record<string, string> {
    const bindings: Record<string, string> = {};
    const cleanId = entityId.replace(/\./g, '_');

    for (const key of Object.keys(stateSchema)) {
      bindings[key] = `bind("state.devices.${cleanId}.${key}")`;
    }

    return bindings;
  }

  /**
   * Get default value for a type
   */
  private getDefaultForType(type: 'boolean' | 'number' | 'string'): any {
    if (type === 'boolean') return false;
    if (type === 'number') return 0;
    if (type === 'string') return '';
    return null;
  }

  /**
   * Build complete HoloScript composition
   */
  private buildComposition(name: string, objects: string[]): string {
    let holo = `// @holoscript-version ${this.options.version}\n`;
    holo += `// Generated by Clawdbot IoT Generator\n`;
    holo += `// ${new Date().toISOString()}\n`;
    holo += `// ${objects.length} device(s) mapped to HoloScript\n\n`;

    holo += `composition "${name}" {\n`;

    // State bindings (if enabled)
    if (this.options.enableBindings) {
      holo += `  state {\n`;
      holo += `    devices: bind("${this.options.mqttBroker}")\n`;
      holo += `  }\n\n`;
    }

    // Objects
    for (const objectCode of objects) {
      holo += objectCode;
      holo += `\n`;
    }

    holo += `}\n`;
    return holo;
  }
}

/**
 * Quick helper: Generate HoloScript from devices
 *
 * @param devices - Array of Home Assistant devices
 * @param options - Generator options
 * @returns HoloScript code string
 */
export async function generateHoloScript(
  devices: HomeAssistantDevice[],
  options?: GeneratorOptions & { compositionName?: string }
): Promise<string> {
  const generator = new ClawdbotGenerator(options);
  const result = await generator.generateFromHomeAssistant(
    devices,
    options?.compositionName
  );
  return result.holoScript;
}
