/**
 * Type definitions for IoT Digital Twins
 */

import { z } from 'zod';

// ============================================================================
// Home Assistant Types
// ============================================================================

export const HomeAssistantDeviceSchema = z.object({
  entity_id: z.string(),
  state: z.union([z.string(), z.number(), z.boolean()]),
  attributes: z.record(z.any()),
});

export type HomeAssistantDevice = z.infer<typeof HomeAssistantDeviceSchema>;

// ============================================================================
// Device Mapping Types
// ============================================================================

export interface DeviceMapping {
  /** HoloScript traits for this device type */
  holoTraits: string[];

  /** 3D geometry shape (sphere, box, cylinder, etc.) */
  holoGeometry: string;

  /** State property schema (property_name: type) */
  holoState: Record<string, 'boolean' | 'number' | 'string'>;

  /** Optional icon for UI */
  icon?: string;

  /** Optional color hint */
  color?: string;
}

export type DeviceClass =
  | 'light'
  | 'climate'
  | 'camera'
  | 'lock'
  | 'switch'
  | 'sensor'
  | 'binary_sensor'
  | 'cover'
  | 'fan';

// ============================================================================
// HoloScript Generation Types
// ============================================================================

export interface GeneratorOptions {
  /** Layout strategy for device positioning */
  layoutStrategy?: 'grid' | 'circular' | 'room-based' | 'custom';

  /** HoloScript version to target */
  version?: string;

  /** MQTT broker URL for state binding */
  mqttBroker?: string;

  /** Custom device mappings (extends defaults) */
  customMappings?: Partial<Record<DeviceClass, DeviceMapping>>;

  /** Enable real-time state bindings */
  enableBindings?: boolean;
}

export interface GenerationResult {
  /** Generated HoloScript code */
  holoScript: string;

  /** Number of devices processed */
  deviceCount: number;

  /** Devices that were skipped (no mapping) */
  skippedDevices: string[];

  /** Generation metadata */
  metadata: {
    timestamp: Date;
    version: string;
    layoutStrategy: string;
    bindingsEnabled: boolean;
  };
}

// ============================================================================
// MQTT Bridge Types
// ============================================================================

export interface MQTTConfig {
  /** MQTT broker URL */
  url: string;

  /** Username for authentication */
  username?: string;

  /** Password for authentication */
  password?: string;

  /** Client ID */
  clientId?: string;

  /** Topics to subscribe to */
  topics?: string[];
}

export interface StateUpdate {
  /** Device entity ID */
  entityId: string;

  /** New state value */
  state: string | number | boolean;

  /** Updated attributes */
  attributes?: Record<string, any>;

  /** Timestamp of update */
  timestamp: Date;
}

// ============================================================================
// Compilation Types
// ============================================================================

export type CompilationTarget = 'r3f' | 'dtdl' | 'unity' | 'unreal' | 'urdf' | 'sdf';

export interface CompilationOptions {
  /** Target platforms to compile to */
  targets: CompilationTarget[];

  /** Enable validation before compilation */
  validate?: boolean;

  /** Optimization level (0-3) */
  optimization?: number;
}

export interface CompilationResult {
  /** Success status */
  success: boolean;

  /** Compiled outputs per target */
  outputs: Partial<Record<CompilationTarget, string | object>>;

  /** Compilation errors (if any) */
  errors?: string[];

  /** Warnings */
  warnings?: string[];

  /** Compilation metadata */
  metadata: {
    timestamp: Date;
    inputSize: number;
    outputSizes: Record<string, number>;
    compilationTimeMs: number;
  };
}
