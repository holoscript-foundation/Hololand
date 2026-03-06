/**
 * WebXR Agent Embodiment Types
 *
 * Type definitions for the WebXR agent embodiment fallback component.
 * This is the universal cross-ecosystem bridge that allows agents to have
 * a spatial presence in any WebXR-capable browser, serving as the fallback
 * when native platform SDKs (Meta Quest, visionOS, ARCore) are unavailable.
 *
 * Integrates with:
 * - CrossRealityContinuityTypes: FormFactor, EmbodimentType, MVCPayload, HandoffStatus
 * - AgentStateBuffer: Vec3, Quat, AgentAvatarState (double-buffering pattern)
 * - SharedSpatialAnchorTypes: Anchor system for multi-agent coordination
 *
 * @module webxr-agent-embodiment/types
 */

import type { Vec3, Quat } from '../../AgentStateBuffer';
import type { FormFactor, EmbodimentType, MVCPayload } from '../../CrossRealityContinuityTypes';

// =============================================================================
// WEBXR CAPABILITY DETECTION
// =============================================================================

/**
 * WebXR session capabilities detected from the current browser environment.
 *
 * Probes navigator.xr.isSessionSupported() for session modes and infers
 * feature support from platform heuristics (since individual feature
 * detection is only possible after session creation in WebXR).
 */
export interface WebXRCapabilities {
  /** Whether immersive-vr sessions are supported */
  immersiveVR: boolean;
  /** Whether immersive-ar sessions are supported */
  immersiveAR: boolean;
  /** Whether inline (non-immersive) sessions are supported */
  inline: boolean;
  /** Whether hand tracking input is likely available */
  handTracking: boolean;
  /** Whether hit-test (ray vs real-world) is likely available */
  hitTest: boolean;
  /** Whether persistent anchors are likely available */
  anchors: boolean;
  /** Whether DOM overlay on XR content is likely available */
  domOverlay: boolean;
  /** Whether environment depth sensing is likely available */
  depthSensing: boolean;
  /** Whether real-world light estimation is likely available */
  lightEstimation: boolean;
}

// =============================================================================
// AGENT EMBODIMENT CONFIGURATION
// =============================================================================

/**
 * Visual style for the agent's embodiment in WebXR space.
 *
 * - 'billboard': Camera-facing 2D sprite with speech bubble (lowest cost)
 * - 'volumetric': Simplified 3D representation with basic animation
 * - 'hologram': Semi-transparent 3D with glow/scan-line effects
 * - 'minimal': Position indicator only (dot + name label)
 */
export type AvatarStyle = 'billboard' | 'volumetric' | 'hologram' | 'minimal';

/**
 * Input/interaction mode the agent responds to.
 *
 * - 'gaze': Dwell-based activation (head tracking)
 * - 'controller': XR controller pointer ray
 * - 'hand': Articulated hand tracking gestures
 * - 'voice': Speech recognition commands
 */
export type InteractionMode = 'gaze' | 'controller' | 'hand' | 'voice';

/**
 * Rendering performance tier that determines quality vs speed tradeoffs.
 *
 * - 'low': Minimal rendering (billboard only, no effects)
 * - 'medium': Standard rendering (volumetric, basic effects)
 * - 'high': Full quality (hologram effects, shadows, particles)
 */
export type PerformanceTier = 'low' | 'medium' | 'high';

/**
 * Configuration for creating a WebXR agent embodiment instance.
 */
export interface WebXRAgentEmbodimentConfig {
  /** Unique agent identifier */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** Visual representation style */
  avatarStyle: AvatarStyle;
  /** Primary interaction mode */
  interactionMode: InteractionMode;
  /** Rendering quality tier */
  performanceTier: PerformanceTier;
  /** Whether to show spatial context indicators (landmarks, zones) */
  showSpatialContext: boolean;
  /** Maximum rendering budget in milliseconds per frame */
  maxRenderBudgetMs: number;
}

// =============================================================================
// WEBXR AGENT STATE
// =============================================================================

/**
 * WebXR session mode for the current embodiment.
 */
export type WebXRSessionMode = 'immersive-vr' | 'immersive-ar' | 'inline';

/**
 * WebXR reference space type determining the coordinate system origin.
 *
 * - 'local': Origin at device position on session start
 * - 'local-floor': Origin at floor level below device
 * - 'bounded-floor': Floor with room-scale boundary
 * - 'unbounded': World-scale positioning (AR)
 * - 'viewer': Head-locked (for HUD elements)
 */
export type WebXRReferenceSpaceType =
  | 'local'
  | 'local-floor'
  | 'bounded-floor'
  | 'unbounded'
  | 'viewer';

/**
 * Runtime state of an agent embodiment in a WebXR session.
 * Extends the concept of AgentAvatarState with WebXR-specific fields.
 */
export interface WebXRAgentState {
  /** Unique agent identifier */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** World-space position */
  position: Vec3;
  /** World-space rotation */
  rotation: Quat;
  /** Whether the agent embodiment is visible */
  visible: boolean;
  /** Whether the agent is currently speaking */
  speaking: boolean;
  /** Current speech text (empty if not speaking) */
  speechText: string;
  /** Current emotional state for expression/color/animation */
  emotion: string;
  /** Active WebXR session mode */
  sessionMode: WebXRSessionMode;
  /** Active reference space type */
  referenceSpaceType: WebXRReferenceSpaceType;
  /** Whether this embodiment is ready to participate in a handoff */
  handoffReady: boolean;
  /** Current device form factor */
  currentFormFactor: FormFactor;
}

// =============================================================================
// EMBODIMENT TRANSITIONS
// =============================================================================

/**
 * Animation style for transitioning between embodiment types.
 *
 * - 'fade': Opacity crossfade (safest, lowest disorientation)
 * - 'morph': Geometry morph between source and target shapes
 * - 'dissolve': Particle dissolve effect
 * - 'teleport': Instant snap with brief flash
 */
export type TransitionAnimation = 'fade' | 'morph' | 'dissolve' | 'teleport';

/**
 * State of an in-progress transition between embodiment types.
 * Used during cross-reality handoffs when the agent's visual
 * representation changes between form factors.
 */
export interface EmbodimentTransition {
  /** Embodiment type being transitioned from */
  sourceEmbodiment: EmbodimentType;
  /** Embodiment type being transitioned to */
  targetEmbodiment: EmbodimentType;
  /** Animation style for the transition */
  animationType: TransitionAnimation;
  /** Total duration of the transition in milliseconds */
  durationMs: number;
  /** Current progress (0 = start, 1 = complete) */
  progress: number;
}

// =============================================================================
// RENDER DATA
// =============================================================================

/**
 * Render primitive types produced by the embodiment for the renderer.
 */
export type RenderPrimitiveType =
  | 'billboard-quad'
  | 'speech-bubble'
  | 'name-label'
  | 'position-indicator'
  | 'spatial-context-ring'
  | 'transition-effect';

/**
 * A single render primitive for the renderer to draw.
 * The embodiment produces an array of these each frame.
 */
export interface RenderPrimitive {
  /** Type of primitive */
  type: RenderPrimitiveType;
  /** World-space position */
  position: Vec3;
  /** World-space rotation */
  rotation: Quat;
  /** Scale/dimensions */
  scale: Vec3;
  /** RGBA color (0-1 range) */
  color: { r: number; g: number; b: number; a: number };
  /** Text content (for labels and speech bubbles) */
  text: string;
  /** Whether this primitive is visible */
  visible: boolean;
  /** Custom metadata */
  metadata: Record<string, unknown>;
}

/**
 * Complete render output from the embodiment for a single frame.
 */
export interface RenderData {
  /** Agent identifier */
  agentId: string;
  /** Array of render primitives to draw */
  primitives: RenderPrimitive[];
  /** Total render budget used in milliseconds (estimated) */
  estimatedRenderMs: number;
  /** Sequence number for staleness detection */
  sequence: number;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by the WebXR agent embodiment system.
 */
export interface WebXRAgentEmbodimentEventMap {
  /** Fired when WebXR capabilities have been detected */
  'capabilities-detected': { capabilities: WebXRCapabilities };
  /** Fired when a WebXR session mode has been initialized */
  'session-started': { sessionMode: WebXRSessionMode; referenceSpaceType: WebXRReferenceSpaceType };
  /** Fired when the embodiment is ready to initiate a handoff */
  'handoff-ready': { agentId: string; formFactor: FormFactor };
  /** Fired when a handoff payload has been received and applied */
  'handoff-received': { agentId: string; sourceFormFactor: FormFactor; targetFormFactor: FormFactor };
  /** Fired when agent state is updated */
  'state-updated': { agentId: string; state: WebXRAgentState };
  /** Fired when the embodiment is destroyed */
  'destroyed': { agentId: string };
}

export type WebXRAgentEmbodimentEventType = keyof WebXRAgentEmbodimentEventMap;
export type WebXRAgentEmbodimentEventHandler<T extends WebXRAgentEmbodimentEventType> = (
  event: WebXRAgentEmbodimentEventMap[T],
) => void;

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default configuration values for the WebXR agent embodiment.
 */
export const DEFAULT_WEBXR_AGENT_CONFIG: WebXRAgentEmbodimentConfig = {
  agentId: 'agent-default',
  agentName: 'Agent',
  avatarStyle: 'billboard',
  interactionMode: 'gaze',
  performanceTier: 'medium',
  showSpatialContext: true,
  maxRenderBudgetMs: 4,
};

/**
 * Default WebXR capabilities (all features unavailable).
 */
export const DEFAULT_WEBXR_CAPABILITIES: WebXRCapabilities = {
  immersiveVR: false,
  immersiveAR: false,
  inline: false,
  handTracking: false,
  hitTest: false,
  anchors: false,
  domOverlay: false,
  depthSensing: false,
  lightEstimation: false,
};

/**
 * Colors associated with agent emotions for render primitives.
 */
export const EMOTION_COLORS: Record<string, { r: number; g: number; b: number; a: number }> = {
  neutral:  { r: 0.4, g: 0.6, b: 1.0, a: 1.0 },
  happy:    { r: 0.3, g: 0.9, b: 0.4, a: 1.0 },
  curious:  { r: 0.9, g: 0.7, b: 0.2, a: 1.0 },
  thinking: { r: 0.6, g: 0.4, b: 0.9, a: 1.0 },
  alert:    { r: 1.0, g: 0.3, b: 0.3, a: 1.0 },
  calm:     { r: 0.3, g: 0.7, b: 0.8, a: 1.0 },
};

/**
 * Performance budget multipliers per tier.
 * Applied to maxRenderBudgetMs to determine actual budget.
 */
export const PERFORMANCE_TIER_MULTIPLIERS: Record<PerformanceTier, number> = {
  low: 0.5,
  medium: 1.0,
  high: 1.5,
};
