/**
 * @hololand/iot-digital-twins
 *
 * Clawdbot IoT Integration: Converts Home Assistant devices into HoloScript digital twins
 *
 * Features:
 * - Device discovery from Home Assistant
 * - Rule-based device → HoloScript mapping
 * - MQTT state bindings for real-time sync
 * - Multi-platform compilation (R3F, DTDL, Unity, Unreal)
 *
 * @module @hololand/iot-digital-twins
 */

export * from './device-mappings.js';
export * from './clawdbot-generator.js';
export * from './mqtt-bridge.js';
export * from './types.js';
