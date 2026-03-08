/**
 * CrossRealityContinuityTypes
 *
 * Type definitions for cross-reality agent continuity -- enabling the same
 * agent to operate seamlessly across VR headset, AR glasses, phone, desktop,
 * and car while maintaining spatial awareness and context.
 *
 * PROBLEM:
 * Individual form factor experiences exist. What does NOT exist is seamless
 * agent persistence across devices. When an agent transfers from VR headset
 * to phone, it loses spatial context, task state, and decision history.
 *
 * SOLUTION:
 * Minimum Viable Continuity (MVC) defines exactly 5 typed objects (<10KB total)
 * that must transfer during a device handoff. Full context is lazy-loaded after
 * the transition completes, but these 5 objects ensure the agent can immediately
 * continue operating on the new device without disorientation.
 *
 * FIVE MVC OBJECTS:
 * 1. DecisionHistory     -- Recent decisions/choices (why the agent is here)
 * 2. ActiveTaskState     -- Current task context (what it's doing)
 * 3. UserPreferences     -- Accessibility, interaction mode, privacy settings
 * 4. SpatialContextSummary -- Compressed spatial awareness (where it was)
 * 5. EvidenceTrail       -- Sources/data supporting current reasoning
 *
 * GEOSPATIAL ANCHORING:
 * WGS84 lat/lon/alt coordinates are the ONLY universal spatial anchor shared
 * across all form factors. Vendor-specific spatial anchors (ARKit, ARCore,
 * Meta Shared Spatial Anchors) do NOT interoperate as of 2026.
 *
 * AUTHENTICATED CRDTs:
 * Every CRDT operation is DID-signed. Merge functions reject untrusted,
 * revoked, or out-of-scope operations. Overhead: ~0.1ms per operation.
 *
 * LATENCY SPECTRUM:
 *   VR Headset:  11.1ms frame budget (90Hz), <5ms agent budget, edge-first
 *   AR Glasses:  16.6ms frame budget (60Hz), <10ms agent budget, edge-first
 *   Car HUD:     <30ms frame budget (safety), <15ms agent budget, safety-critical
 *   Phone:       16.6ms frame budget (60Hz), <100ms agent budget, cloud-first
 *   Desktop:     16.6ms frame budget (60Hz), <200ms agent budget, cloud-first
 *
 * REFERENCES:
 *   - Research: AI_Workspace/uAA2++_Protocol/{0-7}/research/2026-03-06_cross-reality
 *   - Wisdom entries: W.025-W.035 (cross-reality.md)
 *   - OpenXR Spatial Entities: https://www.khronos.org/blog/openxr-spatial-entities
 *   - WebXR Anchors: https://immersive-web.github.io/anchors/
 *   - CRDT-Based VR Sync: doi:10.1109/VR.2024
 *
 * @module CrossRealityContinuityTypes
 */

import type { Vec3, Quat } from './AgentStateBuffer';

// =============================================================================
// GEOSPATIAL COORDINATES (Universal Anchor)
// =============================================================================

/**
 * WGS84 geospatial coordinates -- the only universal spatial reference
 * shared across all form factors and ecosystems.
 *
 * GPS outdoors, with indoor fallback chain:
 * VPS (visual positioning) > WiFi fingerprint > BLE beacons > fiducial markers
 */
export interface GeospatialCoordinate {
  /** Latitude in decimal degrees (WGS84) */
  latitude: number;
  /** Longitude in decimal degrees (WGS84) */
  longitude: number;
  /** Altitude in meters above WGS84 ellipsoid (null if unknown) */
  altitude: number | null;
  /** Horizontal accuracy in meters (95% confidence) */
  horizontalAccuracy: number;
  /** Vertical accuracy in meters (95% confidence, null if altitude unknown) */
  verticalAccuracy: number | null;
  /** Heading in degrees from true north (0-360, null if unavailable) */
  heading: number | null;
  /** Positioning source used to obtain this coordinate */
  source: GeospatialSource;
  /** Timestamp when this coordinate was captured (ms since epoch) */
  capturedAt: number;
}

/**
 * Positioning source, ordered by decreasing accuracy.
 */
export type GeospatialSource =
  | 'gps'              // Outdoor GPS/GNSS (1-5m accuracy)
  | 'vps'              // Visual Positioning Service (cm-level accuracy)
  | 'wifi-fingerprint' // WiFi RTT fingerprinting (1-3m accuracy)
  | 'ble-beacon'       // BLE beacon triangulation (1-3m accuracy)
  | 'fiducial-marker'  // QR/ArUco marker detection (mm-level accuracy)
  | 'dead-reckoning'   // IMU-based estimation (degrades over time)
  | 'manual'           // User-specified or configured
  | 'unknown';         // Source not determined

// =============================================================================
// FORM FACTOR & EMBODIMENT
// =============================================================================

/**
 * Physical device form factor. Determines agent embodiment, input modality,
 * compute budget, and rendering capabilities.
 */
export type FormFactor =
  | 'vr-headset'   // Meta Quest, PCVR, Apple Vision Pro
  | 'ar-glasses'   // Android XR glasses, visionOS AR mode
  | 'phone'        // iOS/Android smartphones
  | 'desktop'      // Windows/macOS/Linux desktop
  | 'car'          // Android Automotive, CarPlay
  | 'wearable';    // Watch, smart band

/**
 * Agent's visual/interactive presence on a given form factor.
 */
export type EmbodimentType =
  | 'Avatar3D'        // Full 3D character (VR)
  | 'SpatialPersona'  // 3D presence in real-world space (AR)
  | 'VoiceOnly'       // Voice-only, no visual (car safety mode)
  | 'UIMinimal'       // Minimal UI for small screens (wearable)
  | 'VoiceHUD'        // Voice-only with heads-up display (car)
  | 'UI2D'            // 2D interface (phone, wearable)
  | 'FullGUI'         // Multi-window desktop UI (desktop)
  | 'HUDUI'           // Heads-up display UI (car alternate)
  | 'WebXR';          // WebXR fallback (cross-ecosystem bridge)

/**
 * Maps form factor to default agent embodiment.
 */
export const DEFAULT_EMBODIMENT: Record<FormFactor, EmbodimentType> = {
  'vr-headset': 'Avatar3D',
  'ar-glasses': 'SpatialPersona',
  'phone': 'UI2D',
  'desktop': 'UI2D',
  'car': 'VoiceOnly',
  'wearable': 'UIMinimal',
};

/**
 * Performance budget per form factor.
 */
export interface FormFactorBudget {
  /** Target frame time in milliseconds */
  frameBudgetMs: number;
  /** Maximum agent compute time per frame in milliseconds */
  agentBudgetMs: number;
  /** Compute execution model */
  computeModel: 'edge-first' | 'cloud-first' | 'safety-critical';
}

export const FORM_FACTOR_BUDGETS: Record<FormFactor, FormFactorBudget> = {
  'vr-headset':  { frameBudgetMs: 11.1,  agentBudgetMs: 5,    computeModel: 'edge-first' },
  'ar-glasses':  { frameBudgetMs: 16.6,  agentBudgetMs: 10,   computeModel: 'edge-first' },
  'car':         { frameBudgetMs: 30,    agentBudgetMs: 15,   computeModel: 'safety-critical' },
  'phone':       { frameBudgetMs: 16.6,  agentBudgetMs: 100,  computeModel: 'cloud-first' },
  'desktop':     { frameBudgetMs: 16.6,  agentBudgetMs: 200,  computeModel: 'cloud-first' },
  'wearable':    { frameBudgetMs: 50,    agentBudgetMs: 50,   computeModel: 'cloud-first' },
};

/**
 * MVC payload size budgets per form factor.
 * Determines maximum handoff payload size for network transfer.
 */
export interface MVCPayloadBudget {
  /** Minimum acceptable payload size in bytes */
  min: number;
  /** Maximum acceptable payload size in bytes */
  max: number;
  /** Recommended target size in bytes */
  recommended: number;
}

export const MVC_PAYLOAD_SIZE_BUDGETS: Record<FormFactor, MVCPayloadBudget> = {
  'vr-headset':  { min: 8192,  max: 10240,  recommended: 10240 },
  'ar-glasses':  { min: 8192,  max: 10240,  recommended: 10240 },
  'car':         { min: 4096,  max: 8192,   recommended: 6144 },
  'phone':       { min: 8192,  max: 10240,  recommended: 10240 },
  'desktop':     { min: 8192,  max: 102400, recommended: 16384 },
  'wearable':    { min: 2048,  max: 4096,   recommended: 3072 },
};

// =============================================================================
// MVC OBJECT 1: DECISION HISTORY
// =============================================================================

/**
 * A single decision made by the agent, with rationale and outcome.
 */
export interface AgentDecision {
  /** Unique decision identifier */
  id: string;
  /** What was decided */
  summary: string;
  /** Why this choice was made (compressed rationale) */
  rationale: string;
  /** What alternatives were considered */
  alternatives: string[];
  /** Confidence level (0-1) */
  confidence: number;
  /** Category of decision */
  category: 'navigation' | 'task' | 'interaction' | 'safety' | 'preference' | 'delegation';
  /** When the decision was made (ms since epoch) */
  decidedAt: number;
  /** Outcome if known ('pending' if still in effect) */
  outcome: 'success' | 'failure' | 'partial' | 'pending' | 'superseded';
}

/**
 * MVC Object 1: Recent decision history.
 * Compressed to last N decisions to stay within <2KB budget.
 */
export interface DecisionHistory {
  /** Last 10-20 decisions (most recent first) */
  decisions: AgentDecision[];
  /** Total decisions made in this session */
  totalDecisionCount: number;
  /** Decision success rate this session (0-1) */
  successRate: number;
  /** When this history was last updated */
  updatedAt: number;
}

// =============================================================================
// MVC OBJECT 2: ACTIVE TASK STATE
// =============================================================================

/**
 * A subtask within the active task.
 */
export interface TaskStep {
  /** Step description */
  description: string;
  /** Current status */
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';
  /** Completion percentage (0-100) */
  progress: number;
  /** Blocking reason if status is 'blocked' */
  blockedReason?: string;
}

/**
 * MVC Object 2: What the agent is currently working on.
 */
export interface ActiveTaskState {
  /** Task identifier */
  taskId: string;
  /** Human-readable task description */
  description: string;
  /** Task priority (0 = highest) */
  priority: number;
  /** Who or what initiated this task */
  initiator: 'user' | 'agent' | 'system' | 'schedule';
  /** Overall task progress (0-100) */
  progress: number;
  /** Current phase or step being executed */
  currentStep: string;
  /** Ordered list of subtask steps */
  steps: TaskStep[];
  /** Key-value context needed to resume the task */
  resumeContext: Record<string, unknown>;
  /** When the task was started (ms since epoch) */
  startedAt: number;
  /** Estimated completion time (ms since epoch, null if unknown) */
  estimatedCompletionAt: number | null;
  /** Whether this task can be paused for handoff */
  pausable: boolean;
}

// =============================================================================
// MVC OBJECT 3: USER PREFERENCES
// =============================================================================

/**
 * MVC Object 3: User settings that affect agent behavior across devices.
 */
export interface UserPreferences {
  /** Preferred interaction modality per form factor */
  interactionMode: Record<FormFactor, 'voice' | 'gesture' | 'touch' | 'gaze' | 'keyboard'>;
  /** Accessibility requirements */
  accessibility: {
    /** High contrast mode */
    highContrast: boolean;
    /** Reduced motion (important for VR comfort) */
    reducedMotion: boolean;
    /** Screen reader / audio descriptions */
    screenReader: boolean;
    /** Font size multiplier (1.0 = default) */
    fontScale: number;
    /** Haptic feedback preference */
    hapticFeedback: boolean;
  };
  /** Privacy settings */
  privacy: {
    /** Allow spatial memory recording */
    spatialMemoryConsent: boolean;
    /** Allow emotion detection */
    emotionDetectionConsent: boolean;
    /** Allow cross-device location sharing */
    locationSharingConsent: boolean;
    /** GDPR data retention period in days (0 = session only) */
    dataRetentionDays: number;
  };
  /** Agent personality/communication preferences */
  agentBehavior: {
    /** Verbosity level */
    verbosity: 'minimal' | 'normal' | 'detailed';
    /** Proactive suggestions */
    proactiveSuggestions: boolean;
    /** Preferred language (BCP-47 tag) */
    language: string;
  };
  /** When preferences were last modified */
  updatedAt: number;
}

// =============================================================================
// MVC OBJECT 4: SPATIAL CONTEXT SUMMARY
// =============================================================================

/**
 * A notable spatial feature near the agent's last known position.
 */
export interface SpatialLandmark {
  /** Landmark name or label */
  label: string;
  /** Relative direction from agent ('left', 'right', 'ahead', 'behind', 'above', 'below') */
  relativeDirection: string;
  /** Distance in meters */
  distanceMeters: number;
  /** Landmark type */
  type: 'object' | 'person' | 'region' | 'waypoint' | 'hazard';
}

/**
 * MVC Object 4: Compressed spatial awareness from the previous form factor.
 *
 * This is NOT the full spatial map -- it's a compressed summary that lets
 * the agent orient itself immediately on the new device.
 */
export interface SpatialContextSummary {
  /** Geospatial position (universal anchor) */
  geospatial: GeospatialCoordinate | null;
  /** Local-space position relative to nearest anchor */
  localPosition: Vec3 | null;
  /** Agent's facing direction (normalized) */
  facingDirection: Vec3 | null;
  /** Agent's up vector (for orientation on tilted surfaces) */
  upVector: Vec3;
  /** ID of nearest shared spatial anchor (for local coordinate reconciliation) */
  nearestAnchorId: string | null;
  /** Notable landmarks within immediate vicinity (max 5) */
  nearbyLandmarks: SpatialLandmark[];
  /** Active spatial zone the agent is within (null if none) */
  activeZoneId: string | null;
  /** Previous form factor (where the agent came from) */
  previousFormFactor: FormFactor;
  /** Previous embodiment type */
  previousEmbodiment: EmbodimentType;
  /** When this context was captured (ms since epoch) */
  capturedAt: number;
}

// =============================================================================
// MVC OBJECT 5: EVIDENCE TRAIL
// =============================================================================

/**
 * A single piece of evidence supporting current reasoning.
 */
export interface EvidenceItem {
  /** Evidence identifier */
  id: string;
  /** What this evidence shows or proves */
  summary: string;
  /** Source type */
  sourceType: 'observation' | 'user-input' | 'sensor' | 'inference' | 'memory' | 'external-api';
  /** Source identifier (file path, URL, sensor ID, etc.) */
  sourceRef: string;
  /** Confidence in this evidence (0-1) */
  confidence: number;
  /** When this evidence was gathered (ms since epoch) */
  gatheredAt: number;
  /** Whether this evidence is still valid or has been superseded */
  stale: boolean;
}

/**
 * MVC Object 5: Sources and data supporting the agent's current reasoning.
 * Enables the receiving device to understand WHY the agent is doing what it's doing.
 */
export interface EvidenceTrail {
  /** Active evidence items (max 20, most relevant first) */
  items: EvidenceItem[];
  /** Total evidence items gathered this session */
  totalItemCount: number;
  /** Overall confidence in current reasoning chain (0-1) */
  aggregateConfidence: number;
  /** When this trail was last updated */
  updatedAt: number;
}

// =============================================================================
// MVC PAYLOAD (Complete Handoff Package)
// =============================================================================

/**
 * The complete Minimum Viable Continuity payload transferred during
 * a cross-device agent handoff.
 *
 * Target size: <10KB serialized.
 * Transfer time: <100ms on any network.
 */
export interface MVCPayload {
  /** Schema version for backwards compatibility */
  version: 1;
  /** Unique handoff transaction ID */
  handoffId: string;
  /** Agent identity */
  agentId: string;
  /** Agent display name */
  agentName: string;

  /** MVC Object 1: Why the agent made its recent choices */
  decisionHistory: DecisionHistory;
  /** MVC Object 2: What the agent is currently doing */
  activeTask: ActiveTaskState;
  /** MVC Object 3: How the user wants to interact */
  userPreferences: UserPreferences;
  /** MVC Object 4: Where the agent was spatially */
  spatialContext: SpatialContextSummary;
  /** MVC Object 5: What evidence supports current reasoning */
  evidenceTrail: EvidenceTrail;

  /** Source device form factor */
  sourceFormFactor: FormFactor;
  /** Target device form factor */
  targetFormFactor: FormFactor;
  /** Source embodiment type */
  sourceEmbodiment: EmbodimentType;
  /** Target embodiment type (auto-selected from DEFAULT_EMBODIMENT) */
  targetEmbodiment: EmbodimentType;

  /** When this payload was created (ms since epoch) */
  createdAt: number;
  /** Payload expiry (ms since epoch, typically createdAt + 5 minutes) */
  expiresAt: number;
}

// =============================================================================
// AUTHENTICATED CRDT OPERATIONS
// =============================================================================

/**
 * DID-based identity for CRDT operation signing.
 */
export interface DIDIdentity {
  /** Decentralized Identifier (e.g., 'did:key:z6Mk...') */
  did: string;
  /** Public key for signature verification (base64url) */
  publicKey: string;
  /** Key algorithm */
  algorithm: 'Ed25519' | 'secp256k1';
  /** Device-specific hardware attestation token (null if unavailable) */
  deviceAttestation: string | null;
}

/**
 * A CRDT operation signed with a DID.
 *
 * Every state mutation in the cross-reality sync layer is wrapped in this
 * envelope. Merge functions verify the signature before applying.
 * Overhead: ~0.1ms per operation.
 */
export interface AuthenticatedCRDTOperation<T = unknown> {
  /** Operation identifier */
  operationId: string;
  /** DID of the agent that created this operation */
  authorDID: string;
  /** Device that originated this operation */
  deviceId: string;
  /** Operation type */
  type: 'set' | 'delete' | 'increment' | 'append' | 'merge';
  /** The key or path being modified */
  key: string;
  /** The value being set (null for delete operations) */
  value: T | null;
  /** Hybrid Logical Clock timestamp for causal ordering */
  hlcTimestamp: string;
  /** Vector clock for multi-device causal ordering */
  vectorClock: Record<string, number>;
  /** Ed25519 signature over (operationId + authorDID + key + value + hlcTimestamp) */
  signature: string;
  /** Capability scope (which resources this operation is authorized to modify) */
  capabilityScope: string[];
  /** When this operation was created (ms since epoch) */
  createdAt: number;
}

/**
 * Result of validating an authenticated CRDT operation.
 */
export interface CRDTValidationResult {
  /** Whether the operation is valid and should be applied */
  valid: boolean;
  /** Rejection reason if invalid */
  rejectionReason?: 'invalid-signature' | 'expired-capability' | 'revoked-did' | 'out-of-scope' | 'clock-drift';
  /** Validation latency in milliseconds */
  validationMs: number;
}

// =============================================================================
// HANDOFF PROTOCOL
// =============================================================================

/**
 * Phases of a cross-reality device handoff.
 */
export type HandoffPhase =
  | 'capability-negotiation'  // Target device reports its capabilities
  | 'mvc-transfer'            // 5 MVC objects are sent (<10KB, <100ms)
  | 'embodiment-adaptation'   // Agent adapts to target form factor
  | 'context-loading'         // Full context lazy-loaded in background
  | 'complete';               // Handoff finished, agent operational

/**
 * Status of an in-progress cross-reality handoff.
 */
export interface HandoffStatus {
  /** Handoff transaction ID */
  handoffId: string;
  /** Current phase */
  phase: HandoffPhase;
  /** Overall progress (0-100) */
  progress: number;
  /** Source device info */
  source: {
    formFactor: FormFactor;
    deviceId: string;
    embodiment: EmbodimentType;
  };
  /** Target device info */
  target: {
    formFactor: FormFactor;
    deviceId: string;
    embodiment: EmbodimentType;
    capabilities: string[];
  };
  /** Time elapsed since handoff started (ms) */
  elapsedMs: number;
  /** Errors encountered during handoff */
  errors: string[];
  /** When the handoff was initiated (ms since epoch) */
  initiatedAt: number;
}

// =============================================================================
// EVENTS
// =============================================================================

/**
 * Events emitted by the cross-reality continuity system.
 */
export interface CrossRealityEventMap {
  /** Fired when a handoff is initiated */
  'handoff:initiated': { handoffId: string; source: FormFactor; target: FormFactor };
  /** Fired when MVC payload is transferred */
  'handoff:mvc-transferred': { handoffId: string; payloadSizeBytes: number; transferMs: number };
  /** Fired when embodiment adaptation completes */
  'handoff:embodiment-adapted': { handoffId: string; embodiment: EmbodimentType };
  /** Fired when handoff completes successfully */
  'handoff:complete': { handoffId: string; totalMs: number };
  /** Fired when handoff fails */
  'handoff:failed': { handoffId: string; phase: HandoffPhase; error: string };
  /** Fired when a CRDT operation is rejected */
  'crdt:operation-rejected': { operationId: string; reason: string };
  /** Fired when geospatial position is updated */
  'spatial:geospatial-updated': { coordinate: GeospatialCoordinate };
}

export type CrossRealityEventType = keyof CrossRealityEventMap;
export type CrossRealityEventHandler<T extends CrossRealityEventType> = (
  event: CrossRealityEventMap[T],
) => void;

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create an empty DecisionHistory.
 */
export function createEmptyDecisionHistory(): DecisionHistory {
  return {
    decisions: [],
    totalDecisionCount: 0,
    successRate: 0,
    updatedAt: 0,
  };
}

/**
 * Create an empty ActiveTaskState.
 */
export function createEmptyActiveTaskState(): ActiveTaskState {
  return {
    taskId: '',
    description: '',
    priority: 0,
    initiator: 'system',
    progress: 0,
    currentStep: '',
    steps: [],
    resumeContext: {},
    startedAt: 0,
    estimatedCompletionAt: null,
    pausable: true,
  };
}

/**
 * Create default UserPreferences.
 */
export function createDefaultUserPreferences(): UserPreferences {
  return {
    interactionMode: {
      'vr-headset': 'gesture',
      'ar-glasses': 'gesture',
      'phone': 'touch',
      'desktop': 'keyboard',
      'car': 'voice',
      'wearable': 'touch',
    },
    accessibility: {
      highContrast: false,
      reducedMotion: false,
      screenReader: false,
      fontScale: 1.0,
      hapticFeedback: true,
    },
    privacy: {
      spatialMemoryConsent: false,
      emotionDetectionConsent: false,
      locationSharingConsent: false,
      dataRetentionDays: 0,
    },
    agentBehavior: {
      verbosity: 'normal',
      proactiveSuggestions: true,
      language: 'en',
    },
    updatedAt: 0,
  };
}

/**
 * Create an empty SpatialContextSummary.
 */
export function createEmptySpatialContext(previousFormFactor: FormFactor): SpatialContextSummary {
  return {
    geospatial: null,
    localPosition: null,
    facingDirection: null,
    upVector: { x: 0, y: 1, z: 0 },
    nearestAnchorId: null,
    nearbyLandmarks: [],
    activeZoneId: null,
    previousFormFactor,
    previousEmbodiment: DEFAULT_EMBODIMENT[previousFormFactor],
    capturedAt: 0,
  };
}

/**
 * Create an empty EvidenceTrail.
 */
export function createEmptyEvidenceTrail(): EvidenceTrail {
  return {
    items: [],
    totalItemCount: 0,
    aggregateConfidence: 0,
    updatedAt: 0,
  };
}

/**
 * Create an MVC payload for a cross-reality handoff.
 */
export function createMVCPayload(
  agentId: string,
  agentName: string,
  sourceFormFactor: FormFactor,
  targetFormFactor: FormFactor,
  overrides?: Partial<MVCPayload>,
): MVCPayload {
  const now = Date.now();
  const handoffId = `handoff:${agentId}:${now}:${Math.random().toString(36).substring(2, 8)}`;
  return {
    version: 1,
    handoffId,
    agentId,
    agentName,
    decisionHistory: overrides?.decisionHistory ?? createEmptyDecisionHistory(),
    activeTask: overrides?.activeTask ?? createEmptyActiveTaskState(),
    userPreferences: overrides?.userPreferences ?? createDefaultUserPreferences(),
    spatialContext: overrides?.spatialContext ?? createEmptySpatialContext(sourceFormFactor),
    evidenceTrail: overrides?.evidenceTrail ?? createEmptyEvidenceTrail(),
    sourceFormFactor,
    targetFormFactor,
    sourceEmbodiment: DEFAULT_EMBODIMENT[sourceFormFactor],
    targetEmbodiment: overrides?.targetEmbodiment ?? DEFAULT_EMBODIMENT[targetFormFactor],
    createdAt: now,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes
  };
}

/**
 * Estimate the serialized size of an MVC payload in bytes.
 * Target: <10KB.
 */
export function estimateMVCPayloadSize(payload: MVCPayload): number {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}
