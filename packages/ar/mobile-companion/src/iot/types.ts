/**
 * @hololand/ar-mobile-companion - IoT Entity Binding Metadata Schema
 *
 * Defines the complete type system for binding physical IoT devices
 * to spatial anchors in AR space.
 *
 * Design principles:
 * - Protocol-agnostic (BLE, WiFi, Zigbee, Z-Wave, Thread, Matter)
 * - Schema-extensible (JSON-LD compatible, custom capability extensions)
 * - Spatially-anchored (every binding references a spatial anchor)
 * - Temporally-versioned (timestamps and version history)
 * - Privacy-aware (scoped permissions)
 * - HoloScript-native (expressible as trait declarations)
 *
 * Based on W3C Web of Things (WoT) Thing Description pattern.
 */

import type { Pose6DoF, SpatialAnchor } from '../types';

// =============================================================================
// IOT PROTOCOL TYPES
// =============================================================================

/**
 * Supported IoT communication protocols.
 */
export type IoTProtocol =
  | 'ble' // Bluetooth Low Energy
  | 'ble_mesh' // Bluetooth Mesh
  | 'wifi' // WiFi (TCP/UDP)
  | 'wifi_direct' // WiFi Direct (P2P)
  | 'zigbee' // Zigbee 3.0
  | 'zwave' // Z-Wave Plus
  | 'thread' // Thread (IEEE 802.15.4)
  | 'matter' // Matter (Project CHIP)
  | 'mqtt' // MQTT over TCP/TLS
  | 'coap' // CoAP over UDP/DTLS
  | 'http' // HTTP/HTTPS REST
  | 'websocket' // WebSocket
  | 'uwb' // Ultra-Wideband (spatial positioning)
  | 'nfc' // Near Field Communication
  | 'custom'; // Custom protocol

/**
 * Protocol-specific connection parameters.
 */
export interface IoTConnectionParams {
  protocol: IoTProtocol;
  /** BLE-specific */
  ble?: {
    serviceUUID: string;
    characteristicUUIDs: string[];
    requiresPairing: boolean;
    mtu?: number;
  };
  /** WiFi-specific */
  wifi?: {
    host: string;
    port: number;
    useTLS: boolean;
    authType: 'none' | 'basic' | 'bearer' | 'apiKey' | 'certificate';
    credentials?: string; // Encrypted reference, never plaintext
  };
  /** Matter-specific */
  matter?: {
    fabricId: string;
    nodeId: string;
    vendorId: number;
    productId: number;
    discriminator: number;
  };
  /** MQTT-specific */
  mqtt?: {
    brokerUrl: string;
    topicPrefix: string;
    qos: 0 | 1 | 2;
    clientId: string;
    useTLS: boolean;
  };
  /** UWB-specific (for spatial positioning) */
  uwb?: {
    sessionId: number;
    rangingInterval: number; // ms
    channel: number;
  };
}

// =============================================================================
// IOT DEVICE
// =============================================================================

/**
 * Device category classification.
 */
export type IoTDeviceCategory =
  | 'light' // Smart lights, LED strips
  | 'switch' // Smart switches, relays
  | 'sensor' // Environmental sensors
  | 'thermostat' // HVAC controls
  | 'lock' // Smart locks
  | 'camera' // IP cameras, doorbells
  | 'speaker' // Smart speakers
  | 'display' // Smart displays, screens
  | 'appliance' // Kitchen/home appliances
  | 'robot' // Robots, vacuums, drones
  | 'tracker' // Asset/person trackers
  | 'controller' // Buttons, remotes, gamepads
  | 'gateway' // Protocol gateways, hubs
  | 'wearable' // Smartwatches, health devices
  | 'industrial' // Industrial IoT devices
  | 'custom'; // Custom device type

/**
 * Device connection state.
 */
export type IoTDeviceConnectionState =
  | 'disconnected' // Not connected
  | 'connecting' // Connection in progress
  | 'connected' // Connected and operational
  | 'reconnecting' // Lost connection, attempting recovery
  | 'error'; // Connection failed

/**
 * An IoT device discovered or known to the system.
 */
export interface IoTDevice {
  /** Unique device identifier (MAC address, UUID, or platform-assigned) */
  deviceId: string;
  /** Human-readable device name */
  name: string;
  /** Device manufacturer */
  manufacturer?: string;
  /** Device model */
  model?: string;
  /** Firmware version */
  firmwareVersion?: string;
  /** Hardware version */
  hardwareVersion?: string;
  /** Serial number */
  serialNumber?: string;
  /** Device category */
  category: IoTDeviceCategory;
  /** Communication protocols supported */
  protocols: IoTProtocol[];
  /** Active connection parameters */
  connectionParams?: IoTConnectionParams;
  /** Current connection state */
  connectionState: IoTDeviceConnectionState;
  /** Signal strength (dBm, for wireless devices) */
  signalStrength?: number;
  /** Battery level [0, 100] (null if wired) */
  batteryLevel?: number;
  /** Device capabilities */
  capabilities: IoTCapability[];
  /** Device icon URL or built-in icon name */
  icon?: string;
  /** Device tags for categorization */
  tags: string[];
  /** First discovered timestamp */
  discoveredAt: number;
  /** Last seen timestamp */
  lastSeen: number;
  /** Whether device is currently reachable */
  isReachable: boolean;
}

// =============================================================================
// IOT CAPABILITIES (W3C WoT-inspired)
// =============================================================================

/**
 * Capability affordance type (W3C WoT Thing Description).
 */
export type IoTCapabilityType =
  | 'property' // Observable/writable state value
  | 'action' // Invocable operation
  | 'event'; // Asynchronous notification

/**
 * Data type for capability values.
 */
export type IoTDataType = 'boolean' | 'integer' | 'number' | 'string' | 'object' | 'array' | 'null';

/**
 * Unit of measurement (SI and common units).
 */
export type IoTUnit =
  // Temperature
  | 'celsius'
  | 'fahrenheit'
  | 'kelvin'
  // Light
  | 'lux'
  | 'lumen'
  | 'candela'
  // Electrical
  | 'volt'
  | 'ampere'
  | 'watt'
  | 'kilowatt_hour'
  // Distance
  | 'meter'
  | 'centimeter'
  | 'millimeter'
  | 'foot'
  | 'inch'
  // Mass
  | 'kilogram'
  | 'gram'
  | 'pound'
  // Time
  | 'second'
  | 'millisecond'
  | 'minute'
  | 'hour'
  // Pressure
  | 'pascal'
  | 'bar'
  | 'psi'
  // Sound
  | 'decibel'
  // Percentage
  | 'percent'
  // Color
  | 'rgb'
  | 'hsv'
  | 'kelvin_color_temp'
  // Angle
  | 'degree'
  | 'radian'
  // Speed
  | 'meters_per_second'
  | 'rpm'
  // Volume
  | 'liter'
  | 'milliliter'
  // Other
  | 'none'
  | 'custom';

/**
 * Data schema for a capability value.
 */
export interface IoTDataSchema {
  /** Data type */
  type: IoTDataType;
  /** Unit of measurement */
  unit?: IoTUnit;
  /** Human-readable description */
  description?: string;
  /** Minimum value (for number/integer) */
  minimum?: number;
  /** Maximum value (for number/integer) */
  maximum?: number;
  /** Step/resolution (for number/integer) */
  step?: number;
  /** Enum of allowed values (for string/integer) */
  enum?: (string | number | boolean)[];
  /** Default value */
  default?: unknown;
  /** Whether value is read-only */
  readOnly?: boolean;
  /** Whether value is write-only */
  writeOnly?: boolean;
  /** Format hint for UI rendering */
  format?: 'color' | 'date-time' | 'uri' | 'slider' | 'toggle' | 'dropdown';
  /** Nested schema for object type */
  properties?: Record<string, IoTDataSchema>;
  /** Item schema for array type */
  items?: IoTDataSchema;
}

/**
 * A single IoT capability (property, action, or event).
 */
export interface IoTCapability {
  /** Capability identifier (unique within device) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Capability type */
  type: IoTCapabilityType;
  /** Description */
  description?: string;
  /** Data schema */
  schema: IoTDataSchema;
  /** For actions: input parameters schema */
  inputSchema?: IoTDataSchema;
  /** For actions: output/response schema */
  outputSchema?: IoTDataSchema;
  /** For events: data payload schema */
  eventSchema?: IoTDataSchema;
  /** Update frequency in Hz (for properties) */
  updateFrequency?: number;
  /** Access permissions required */
  accessLevel: IoTAccessLevel;
  /** Whether this capability is currently available */
  isAvailable: boolean;
  /** Protocol-specific endpoint (e.g., BLE characteristic UUID, MQTT topic) */
  endpoint?: string;
  /** Category tags for grouping in UI */
  tags?: string[];
}

export type IoTAccessLevel =
  | 'public' // Anyone in the world can read
  | 'read' // Authenticated users can read
  | 'write' // Authorized users can read and write
  | 'admin'; // Only device owner/admin

// =============================================================================
// IOT DEVICE STATE
// =============================================================================

/**
 * Current state of all capabilities for a device.
 */
export interface IoTDeviceState {
  /** Device identifier */
  deviceId: string;
  /** Property values keyed by capability ID */
  properties: Record<string, IoTPropertyValue>;
  /** Timestamp of last state update */
  lastUpdated: number;
  /** Connection quality [0, 1] */
  connectionQuality: number;
}

/**
 * A single property value with metadata.
 */
export interface IoTPropertyValue {
  /** Capability ID */
  capabilityId: string;
  /** Current value */
  value: unknown;
  /** Timestamp when value was last read/updated */
  timestamp: number;
  /** Value quality/confidence [0, 1] */
  quality: number;
  /** Whether value is stale (not updated within expected interval) */
  isStale: boolean;
}

// =============================================================================
// IOT COMMANDS
// =============================================================================

/**
 * Command to send to an IoT device.
 */
export interface IoTCommand {
  /** Target device identifier */
  deviceId: string;
  /** Target capability identifier */
  capabilityId: string;
  /** Command type */
  type: 'set_property' | 'invoke_action' | 'subscribe_event' | 'unsubscribe_event';
  /** Command payload */
  payload: unknown;
  /** Request identifier for response correlation */
  requestId: string;
  /** Timeout in milliseconds */
  timeout: number;
  /** Retry count on failure */
  retries: number;
  /** Source of the command */
  source: IoTCommandSource;
}

export type IoTCommandSource =
  | 'user_interaction' // Direct user tap/gaze in AR
  | 'automation_rule' // Triggered by automation
  | 'holoscript' // Triggered by HoloScript code
  | 'proximity_trigger' // Triggered by interaction zone
  | 'schedule' // Scheduled trigger
  | 'api'; // External API call

/**
 * Command response from device.
 */
export interface IoTCommandResponse {
  /** Original request identifier */
  requestId: string;
  /** Success or failure */
  success: boolean;
  /** Response data (for actions) */
  data?: unknown;
  /** Error information (if failed) */
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
  /** Round-trip time in milliseconds */
  latencyMs: number;
  /** Timestamp */
  timestamp: number;
}

// =============================================================================
// IOT ENTITY BINDING (Core Schema)
// =============================================================================

/**
 * Binding status lifecycle.
 */
export type IoTBindingStatus =
  | 'draft' // Binding created but not activated
  | 'pending' // Waiting for device confirmation
  | 'active' // Binding is live and operational
  | 'paused' // Temporarily suspended
  | 'error' // Binding has errors
  | 'expired' // Binding TTL exceeded
  | 'unbound'; // Explicitly removed

/**
 * The core IoT Entity Binding schema.
 *
 * This is the central type that connects a physical IoT device
 * to a spatial location in a HoloLand AR world.
 */
export interface IoTEntityBinding {
  // ─── Identity ──────────────────────────────────────────────────────────

  /** Unique binding identifier (UUID v7 for time-sortable) */
  bindingId: string;

  /** Schema version for forward compatibility */
  schemaVersion: '1.0.0';

  // ─── World Context ─────────────────────────────────────────────────────

  /** HoloLand world ID this binding belongs to */
  worldId: string;

  /** Room or zone within the world (optional subdivision) */
  roomId?: string;

  /** Floor/level identifier for multi-story buildings */
  floorId?: string;

  // ─── Device Reference ──────────────────────────────────────────────────

  /** Reference to the IoT device */
  device: IoTDeviceReference;

  // ─── Spatial Anchor Reference ──────────────────────────────────────────

  /** Spatial anchor this entity is bound to */
  anchor: IoTSpatialAnchorReference;

  /**
   * Offset from anchor origin to entity position.
   * Allows precise placement relative to the anchor.
   */
  spatialOffset: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    scale: number;
  };

  // ─── Capabilities ──────────────────────────────────────────────────────

  /**
   * Capabilities exposed through this binding.
   * This may be a subset of the device's total capabilities.
   */
  exposedCapabilities: string[]; // Capability IDs from the device

  /**
   * Capability overrides (e.g., restrict range, change units).
   */
  capabilityOverrides?: Record<string, Partial<IoTCapability>>;

  // ─── Interaction Zones ─────────────────────────────────────────────────

  /**
   * Spatial interaction zones around this entity.
   * Trigger actions when users enter, exit, or gaze at zones.
   */
  interactionZones: IoTInteractionZone[];

  // ─── Visual Representation ─────────────────────────────────────────────

  /**
   * How this entity appears in AR.
   */
  visualization: IoTEntityVisualization;

  // ─── State Channel ─────────────────────────────────────────────────────

  /**
   * Real-time state synchronization channel.
   */
  stateChannel: IoTStateChannel;

  // ─── Automation Rules ──────────────────────────────────────────────────

  /**
   * Automation rules associated with this binding.
   */
  automationRules: IoTAutomationRule[];

  // ─── Permissions ───────────────────────────────────────────────────────

  /**
   * Access control for this binding.
   */
  permissions: IoTBindingPermissions;

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  /** Current binding status */
  status: IoTBindingStatus;

  /** Binding creation timestamp */
  createdAt: number;

  /** Last update timestamp */
  updatedAt: number;

  /** Created by (user ID) */
  createdBy: string;

  /** Last updated by (user ID) */
  updatedBy: string;

  /** Version number (incremented on each update) */
  version: number;

  /** Time-to-live in milliseconds (0 = never expires) */
  ttl: number;

  /** Tags for search and categorization */
  tags: string[];

  /** Free-form metadata */
  metadata: Record<string, unknown>;
}

// =============================================================================
// BINDING SUB-SCHEMAS
// =============================================================================

/**
 * Reference to an IoT device within a binding.
 */
export interface IoTDeviceReference {
  /** Device identifier */
  deviceId: string;
  /** Device name (cached for display) */
  deviceName: string;
  /** Device category */
  category: IoTDeviceCategory;
  /** Primary communication protocol */
  primaryProtocol: IoTProtocol;
  /** Connection parameters */
  connectionParams: IoTConnectionParams;
}

/**
 * Reference to a spatial anchor within a binding.
 */
export interface IoTSpatialAnchorReference {
  /** Anchor identifier */
  anchorId: string;
  /** Cloud anchor identifier (for cross-device persistence) */
  cloudAnchorId?: string;
  /** Anchor type */
  anchorType: 'qr' | 'apriltag' | 'cloud' | 'geospatial' | 'plane' | 'manual';
  /** Anchor payload (e.g., QR content, AprilTag ID) */
  anchorPayload?: string;
  /** Last known anchor pose in world coordinates */
  lastKnownPose: Pose6DoF;
  /** Geospatial coordinates (if geospatial anchor) */
  geospatial?: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
}

/**
 * Spatial interaction zone around an IoT entity.
 */
export interface IoTInteractionZone {
  /** Zone identifier */
  zoneId: string;
  /** Human-readable name */
  name: string;
  /** Zone shape */
  shape: 'sphere' | 'cylinder' | 'box' | 'cone';
  /** Shape dimensions (meters) */
  dimensions: {
    radius?: number; // sphere, cylinder, cone base
    width?: number; // box
    height?: number; // cylinder, box, cone
    depth?: number; // box
    topRadius?: number; // cone top (0 = point)
  };
  /** Offset from entity position */
  offset: { x: number; y: number; z: number };
  /** Rotation of the zone */
  rotation: { x: number; y: number; z: number; w: number };
  /** Trigger on user entering zone */
  triggerOnEnter: boolean;
  /** Trigger on user exiting zone */
  triggerOnExit: boolean;
  /** Trigger on user gazing at entity within zone */
  triggerOnGaze: boolean;
  /** Gaze angle threshold (degrees from center) */
  gazeAngleThreshold: number;
  /** Dwell time before gaze trigger fires (ms) */
  dwellTime: number;
  /** Cooldown between triggers (ms) */
  cooldown: number;
  /** Actions to execute when triggered */
  actions: IoTInteractionAction[];
  /** Whether zone is currently active */
  isActive: boolean;
  /** Visual indicator style */
  visualIndicator: 'none' | 'ring' | 'pulse' | 'boundary' | 'highlight';
}

/**
 * Action to execute when an interaction zone triggers.
 */
export interface IoTInteractionAction {
  /** Action type */
  type: 'device_command' | 'show_ui' | 'play_sound' | 'haptic' | 'holoscript' | 'webhook';
  /** Device command (if type is 'device_command') */
  deviceCommand?: {
    capabilityId: string;
    value: unknown;
  };
  /** UI panel to show (if type is 'show_ui') */
  uiPanel?: {
    panelId: string;
    position: 'floating' | 'anchored' | 'billboard';
    offset: { x: number; y: number; z: number };
  };
  /** Sound to play (if type is 'play_sound') */
  sound?: {
    url: string;
    volume: number;
    spatial: boolean;
  };
  /** Haptic feedback (if type is 'haptic') */
  haptic?: {
    pattern: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error';
    duration: number;
  };
  /** HoloScript code to execute (if type is 'holoscript') */
  holoscript?: {
    code: string;
    worldId: string;
  };
  /** Webhook URL to call (if type is 'webhook') */
  webhook?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT';
    headers: Record<string, string>;
    body?: unknown;
  };
}

/**
 * How an IoT entity appears in AR.
 */
export interface IoTEntityVisualization {
  /** Visualization mode */
  mode: 'icon' | 'model' | 'widget' | 'invisible';
  /** 3D model URL (if mode is 'model') */
  modelUrl?: string;
  /** Icon name or URL (if mode is 'icon') */
  icon?: string;
  /** Icon/model scale */
  scale: number;
  /** Billboard behavior (always face camera) */
  billboard: boolean;
  /** Opacity [0, 1] */
  opacity: number;
  /** Glow/emission when active */
  activeEmission: number;
  /** Label text shown above entity */
  label?: string;
  /** Label always visible or only on gaze */
  labelVisibility: 'always' | 'onGaze' | 'onProximity' | 'never';
  /** Status indicator (colored dot) */
  statusIndicator: boolean;
  /** Custom material properties */
  material?: {
    color: string;
    metalness: number;
    roughness: number;
  };
  /** Animation for state changes */
  stateAnimations: Record<string, IoTStateAnimation>;
}

/**
 * Animation triggered by state changes.
 */
export interface IoTStateAnimation {
  /** Property to animate */
  property: 'scale' | 'opacity' | 'color' | 'position' | 'rotation' | 'emission';
  /** Start value */
  from: unknown;
  /** End value */
  to: unknown;
  /** Duration in ms */
  duration: number;
  /** Easing function */
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'spring';
}

/**
 * Real-time state synchronization channel.
 */
export interface IoTStateChannel {
  /** Channel type */
  type: 'mqtt' | 'websocket' | 'polling' | 'ble_notify';
  /** Channel endpoint (URL, topic, or characteristic UUID) */
  endpoint: string;
  /** Update interval (ms, for polling) */
  pollInterval?: number;
  /** QoS level (for MQTT) */
  qos?: 0 | 1 | 2;
  /** Data encoding */
  encoding: 'json' | 'msgpack' | 'protobuf' | 'cbor';
  /** Whether channel is currently connected */
  isConnected: boolean;
  /** Last received message timestamp */
  lastMessageAt?: number;
}

/**
 * Automation rule for an IoT entity binding.
 */
export interface IoTAutomationRule {
  /** Rule identifier */
  ruleId: string;
  /** Human-readable name */
  name: string;
  /** Whether rule is enabled */
  enabled: boolean;
  /** Trigger condition */
  trigger: IoTAutomationTrigger;
  /** Condition to check (optional) */
  condition?: IoTAutomationCondition;
  /** Action to execute */
  action: IoTInteractionAction;
  /** Maximum executions per day (0 = unlimited) */
  maxExecutionsPerDay: number;
  /** Execution count today */
  executionsToday: number;
  /** Last triggered timestamp */
  lastTriggered?: number;
}

/**
 * Automation trigger types.
 */
export interface IoTAutomationTrigger {
  type: 'property_change' | 'threshold' | 'schedule' | 'event' | 'proximity';
  /** For property_change: which capability property */
  capabilityId?: string;
  /** For threshold: comparison operator and value */
  threshold?: {
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
    value: number | string | boolean;
  };
  /** For schedule: cron expression */
  cronExpression?: string;
  /** For proximity: distance in meters */
  proximityDistance?: number;
}

/**
 * Automation condition (must be true for action to execute).
 */
export interface IoTAutomationCondition {
  type: 'and' | 'or' | 'not' | 'property_check' | 'time_range';
  /** Sub-conditions for and/or/not */
  conditions?: IoTAutomationCondition[];
  /** For property_check: capability and expected value */
  propertyCheck?: {
    capabilityId: string;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
    value: unknown;
  };
  /** For time_range: start and end times (HH:MM) */
  timeRange?: {
    start: string;
    end: string;
    timezone: string;
  };
}

/**
 * Access control for a binding.
 */
export interface IoTBindingPermissions {
  /** Owner user ID (full control) */
  ownerId: string;
  /** Users with read access */
  readAccess: string[];
  /** Users with write access (control device) */
  writeAccess: string[];
  /** Users with admin access (modify binding) */
  adminAccess: string[];
  /** Whether binding is visible to all users in the world */
  publiclyVisible: boolean;
  /** Whether device can be controlled by anyone in proximity */
  proximityControl: boolean;
  /** Proximity control range (meters) */
  proximityRange: number;
}

// =============================================================================
// IOT ENTITY BINDING - DEFAULT VALUES
// =============================================================================

export const DEFAULT_IOT_BINDING_PERMISSIONS: IoTBindingPermissions = {
  ownerId: '',
  readAccess: [],
  writeAccess: [],
  adminAccess: [],
  publiclyVisible: true,
  proximityControl: false,
  proximityRange: 2.0,
};

export const DEFAULT_IOT_VISUALIZATION: IoTEntityVisualization = {
  mode: 'icon',
  scale: 0.1,
  billboard: true,
  opacity: 1.0,
  activeEmission: 0.3,
  labelVisibility: 'onProximity',
  statusIndicator: true,
  stateAnimations: {},
};

export const DEFAULT_IOT_STATE_CHANNEL: IoTStateChannel = {
  type: 'websocket',
  endpoint: '',
  encoding: 'json',
  isConnected: false,
};

// =============================================================================
// IOT BINDING EVENTS
// =============================================================================

/**
 * Events emitted by the IoT binding system.
 */
export type IoTBindingEventType =
  | 'binding_created'
  | 'binding_updated'
  | 'binding_activated'
  | 'binding_paused'
  | 'binding_removed'
  | 'device_connected'
  | 'device_disconnected'
  | 'state_updated'
  | 'interaction_triggered'
  | 'automation_executed'
  | 'error';

export interface IoTBindingEvent {
  type: IoTBindingEventType;
  bindingId: string;
  deviceId: string;
  timestamp: number;
  data: unknown;
}

// =============================================================================
// IOT DISCOVERY
// =============================================================================

/**
 * Discovery scan configuration.
 */
export interface IoTDiscoveryConfig {
  /** Protocols to scan */
  protocols: IoTProtocol[];
  /** Scan duration (ms). Default: 10000 */
  scanDuration: number;
  /** Filter by device category */
  categoryFilter?: IoTDeviceCategory[];
  /** Filter by signal strength (minimum dBm) */
  minSignalStrength?: number;
  /** Filter by name pattern (regex) */
  namePattern?: string;
  /** Whether to auto-connect discovered devices */
  autoConnect: boolean;
}

export const DEFAULT_IOT_DISCOVERY_CONFIG: IoTDiscoveryConfig = {
  protocols: ['ble', 'matter', 'wifi'],
  scanDuration: 10000,
  autoConnect: false,
};

/**
 * Discovery scan result.
 */
export interface IoTDiscoveryResult {
  /** Discovered devices */
  devices: IoTDevice[];
  /** Scan duration (actual ms) */
  scanDuration: number;
  /** Protocols scanned */
  protocols: IoTProtocol[];
  /** Errors during scan */
  errors: Array<{
    protocol: IoTProtocol;
    code: string;
    message: string;
  }>;
}

// =============================================================================
// JSON-LD CONTEXT (for schema interoperability)
// =============================================================================

/**
 * JSON-LD context for IoT Entity Binding.
 * Enables interoperability with W3C WoT and Schema.org.
 */
export const IOT_BINDING_JSONLD_CONTEXT = {
  '@context': {
    '@vocab': 'https://hololand.io/schema/iot/',
    wot: 'https://www.w3.org/2019/wot/td#',
    schema: 'https://schema.org/',
    geo: 'http://www.w3.org/2003/01/geo/wgs84_pos#',
    deviceId: '@id',
    name: 'schema:name',
    manufacturer: 'schema:manufacturer',
    category: 'wot:hasSecurityScheme',
    capabilities: 'wot:hasPropertyAffordance',
    latitude: 'geo:lat',
    longitude: 'geo:long',
    altitude: 'geo:alt',
  },
} as const;
