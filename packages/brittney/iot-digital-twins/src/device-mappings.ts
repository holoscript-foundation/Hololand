/**
 * Device-to-HoloScript Mappings
 *
 * Rule-based mappings from IoT device types to HoloScript traits, geometry, and state.
 * Implements P.HOLOSCRIPT.10: Device-to-HoloScript Mapping Pattern
 */

import type { DeviceMapping, DeviceClass } from './types.js';

/**
 * Default device mappings for common IoT devices
 *
 * Each mapping defines:
 * - holoTraits: HoloScript traits (@sensor, @controllable, etc.)
 * - holoGeometry: 3D shape for visualization
 * - holoState: State properties with their types
 * - icon: Optional icon identifier
 * - color: Optional default color
 */
export const DEVICE_MAPPINGS: Record<DeviceClass, DeviceMapping> = {
  // ============================================================================
  // Lighting Devices
  // ============================================================================
  light: {
    holoTraits: ['@sensor', '@controllable', '@networked', '@emissive'],
    holoGeometry: 'sphere',
    holoState: {
      power: 'boolean',
      brightness: 'number', // 0-1 normalized
      color: 'string', // #RRGGBB hex color
    },
    icon: 'lightbulb',
    color: '#FFD700',
  },

  // ============================================================================
  // Climate Control
  // ============================================================================
  climate: {
    holoTraits: ['@sensor', '@observable', '@networked', '@controllable'],
    holoGeometry: 'box',
    holoState: {
      temperature: 'number', // Current temp in °C
      target_temperature: 'number', // Target temp in °C
      mode: 'string', // heat|cool|auto|off
      humidity: 'number', // Optional: 0-100%
    },
    icon: 'thermostat',
    color: '#4A90E2',
  },

  // ============================================================================
  // Security Cameras
  // ============================================================================
  camera: {
    holoTraits: ['@sensor', '@observable', '@networked'],
    holoGeometry: 'cylinder',
    holoState: {
      motion_detected: 'boolean',
      recording: 'boolean',
      last_motion: 'string', // ISO timestamp
    },
    icon: 'videocam',
    color: '#2ECC71',
  },

  // ============================================================================
  // Smart Locks
  // ============================================================================
  lock: {
    holoTraits: ['@controllable', '@networked', '@sensor'],
    holoGeometry: 'box',
    holoState: {
      locked: 'boolean',
      battery_level: 'number', // 0-100%
      jammed: 'boolean', // Optional: lock jam detection
    },
    icon: 'lock',
    color: '#E74C3C',
  },

  // ============================================================================
  // Switches
  // ============================================================================
  switch: {
    holoTraits: ['@controllable', '@networked', '@sensor'],
    holoGeometry: 'box',
    holoState: {
      power: 'boolean',
      energy: 'number', // Optional: power consumption in watts
    },
    icon: 'toggle_on',
    color: '#9B59B6',
  },

  // ============================================================================
  // Sensors (Generic)
  // ============================================================================
  sensor: {
    holoTraits: ['@sensor', '@observable', '@networked'],
    holoGeometry: 'sphere',
    holoState: {
      value: 'number',
      unit: 'string',
    },
    icon: 'sensors',
    color: '#95A5A6',
  },

  // ============================================================================
  // Binary Sensors (Motion, Door, etc.)
  // ============================================================================
  binary_sensor: {
    holoTraits: ['@sensor', '@observable', '@networked'],
    holoGeometry: 'sphere',
    holoState: {
      state: 'boolean', // on/off, detected/clear, open/closed
      battery_level: 'number', // Optional: 0-100%
    },
    icon: 'radio_button_checked',
    color: '#F39C12',
  },

  // ============================================================================
  // Covers (Blinds, Garage Doors, etc.)
  // ============================================================================
  cover: {
    holoTraits: ['@controllable', '@networked', '@sensor'],
    holoGeometry: 'box',
    holoState: {
      position: 'number', // 0-100% (0 = closed, 100 = open)
      state: 'string', // opening|closing|open|closed
    },
    icon: 'roller_shades',
    color: '#34495E',
  },

  // ============================================================================
  // Fans
  // ============================================================================
  fan: {
    holoTraits: ['@controllable', '@networked', '@sensor'],
    holoGeometry: 'cylinder',
    holoState: {
      power: 'boolean',
      speed: 'number', // 0-100% or discrete levels
      oscillating: 'boolean', // Optional
    },
    icon: 'air',
    color: '#3498DB',
  },
} as const;

/**
 * Get device class from Home Assistant entity_id
 *
 * @param entityId - Entity ID (e.g., "light.living_room", "climate.bedroom")
 * @returns Device class or 'sensor' as fallback
 */
export function getDeviceClass(entityId: string): DeviceClass {
  const domain = entityId.split('.')[0];

  // Map Home Assistant domains to device classes
  const domainMapping: Record<string, DeviceClass> = {
    light: 'light',
    climate: 'climate',
    camera: 'camera',
    lock: 'lock',
    switch: 'switch',
    sensor: 'sensor',
    binary_sensor: 'binary_sensor',
    cover: 'cover',
    fan: 'fan',
  };

  return (domainMapping[domain] as DeviceClass) || 'sensor';
}

/**
 * Get device mapping for a given device class
 *
 * @param deviceClass - Device class
 * @returns Device mapping or undefined if not found
 */
export function getDeviceMapping(deviceClass: DeviceClass): DeviceMapping | undefined {
  return DEVICE_MAPPINGS[deviceClass];
}

/**
 * Check if a device class is supported
 *
 * @param deviceClass - Device class to check
 * @returns True if supported, false otherwise
 */
export function isSupportedDevice(deviceClass: DeviceClass): boolean {
  return deviceClass in DEVICE_MAPPINGS;
}

/**
 * Get all supported device classes
 *
 * @returns Array of supported device class names
 */
export function getSupportedDeviceClasses(): DeviceClass[] {
  return Object.keys(DEVICE_MAPPINGS) as DeviceClass[];
}
