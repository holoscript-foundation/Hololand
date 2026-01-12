/**
 * @hololand/core
 *
 * HoloScript: VR/AI Inspired Programming Language
 * The first programming language designed for Virtual Reality environments.
 *
 * Core engine with no UI dependencies.
 */

// Core Engine
export { HoloScriptParser } from './HoloScriptParser';
export { HoloScriptRuntime } from './HoloScriptRuntime';

// Logger Interface
export { setHoloScriptLogger, resetLogger, type HoloScriptLogger } from './logger';

// Types
export type {
  SpatialPosition,
  HologramProperties,
  VoiceCommand,
  GestureData,
  ASTNode,
  OrbNode,
  MethodNode,
  ParameterNode,
  ConnectionNode,
  GateNode,
  StreamNode,
  TransformationNode,
} from './HoloScriptParser';

export type {
  RuntimeContext,
  ExecutionResult,
  ParticleSystem,
} from './HoloScriptRuntime';

// Constants and Configuration
export const HOLOSCRIPT_VERSION = '1.0.0-alpha.1';

export const HOLOSCRIPT_SUPPORTED_PLATFORMS = [
  'WebXR',
  'Oculus Quest',
  'HTC Vive',
  'Valve Index',
  'Apple Vision Pro',
  'Windows Mixed Reality',
];

export const HOLOSCRIPT_VOICE_COMMANDS = [
  'create orb [name]',
  'summon function [name]',
  'connect [from] to [to]',
  'execute [function]',
  'debug program',
  'visualize [data]',
  'gate [condition]',
  'stream [source] through [transformations]',
];

export const HOLOSCRIPT_GESTURES = [
  'pinch - create object',
  'swipe - connect objects',
  'rotate - modify properties',
  'grab - select object',
  'spread - expand view',
  'fist - execute action',
];

// Utility Functions
export function createHoloScriptEnvironment() {
  return {
    parser: new HoloScriptParser(),
    runtime: new HoloScriptRuntime(),
    version: HOLOSCRIPT_VERSION,
  };
}

export function isHoloScriptSupported(): boolean {
  // Check if we're in a browser environment
  if (typeof globalThis === 'undefined') return false;
  const win = (globalThis as any).window;
  if (!win) return false;

  return !!(
    win.navigator?.xr ||
    win.navigator?.getVRDisplays ||
    win.webkitGetUserMedia
  );
}

// Demo Scripts
export const HOLOSCRIPT_DEMO_SCRIPTS = {
  helloWorld: `orb greeting {
  message: "Hello, HoloScript World!"
  color: "#00ffff"
  glow: true
}

function displayGreeting() {
  show greeting
}`,

  aiAgent: `orb agentCore {
  personality: "helpful"
  capabilities: ["conversation", "problem_solving", "learning"]
  energy: 100
}

function processQuery(query: string): string {
  analyze query
  generate response
  return response
}`,

  neuralNetwork: `orb inputLayer { neurons: 784 }
orb hiddenLayer { neurons: 128 }
orb outputLayer { neurons: 10 }

connect inputLayer to hiddenLayer as "weights"
connect hiddenLayer to outputLayer as "weights"

function trainNetwork(data: array): object {
  forward_pass data
  calculate_loss
  backward_pass
  update_weights
  return metrics
}`,
};

// Export everything as default for convenience
import { HoloScriptParser } from './HoloScriptParser';
import { HoloScriptRuntime } from './HoloScriptRuntime';

export default {
  HoloScriptParser,
  HoloScriptRuntime,
  createHoloScriptEnvironment,
  isHoloScriptSupported,
  HOLOSCRIPT_DEMO_SCRIPTS,
  HOLOSCRIPT_VERSION,
  HOLOSCRIPT_SUPPORTED_PLATFORMS,
  HOLOSCRIPT_VOICE_COMMANDS,
  HOLOSCRIPT_GESTURES,
};
