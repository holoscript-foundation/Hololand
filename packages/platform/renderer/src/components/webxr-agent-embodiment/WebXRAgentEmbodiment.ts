/**
 * WebXR Agent Embodiment
 *
 * Core class for agent presence in WebXR-capable browsers. This is the
 * universal cross-ecosystem fallback that allows any AI agent to have a
 * spatial presence when native platform SDKs (Meta Quest, visionOS, ARCore)
 * are not available.
 *
 * Responsibilities:
 * - Detect WebXR capabilities from navigator.xr
 * - Select optimal session mode and reference space
 * - Manage agent state (position, rotation, emotion, speech)
 * - Generate render primitives (billboard, speech bubble, labels)
 * - Prepare and receive MVC handoff payloads for cross-reality continuity
 * - Emit lifecycle events for integration with the rendering pipeline
 *
 * Usage:
 * ```typescript
 * const embodiment = create({
 *   agentId: 'brittney',
 *   agentName: 'Brittney',
 *   avatarStyle: 'hologram',
 *   interactionMode: 'gaze',
 *   performanceTier: 'medium',
 *   showSpatialContext: true,
 *   maxRenderBudgetMs: 4,
 * });
 *
 * const capabilities = await embodiment.detectCapabilities();
 * const { sessionMode, referenceSpaceType } = embodiment.selectOptimalMode(capabilities);
 * embodiment.initSession(sessionMode, referenceSpaceType);
 *
 * // In render loop:
 * const renderData = embodiment.generateRenderData();
 * drawPrimitives(renderData.primitives);
 * ```
 *
 * @module webxr-agent-embodiment/WebXRAgentEmbodiment
 */

import { logger } from '../../logger';
import type { Vec3, Quat } from '../../AgentStateBuffer';
import type {
  FormFactor,
  EmbodimentType,
  MVCPayload,
} from '../../CrossRealityContinuityTypes';
import {
  DEFAULT_EMBODIMENT,
  createEmptyDecisionHistory,
  createEmptyActiveTaskState,
  createDefaultUserPreferences,
  createEmptySpatialContext,
  createEmptyEvidenceTrail,
} from '../../CrossRealityContinuityTypes';
import type {
  WebXRCapabilities,
  WebXRAgentEmbodimentConfig,
  WebXRAgentState,
  WebXRSessionMode,
  WebXRReferenceSpaceType,
  EmbodimentTransition,
  RenderData,
  RenderPrimitive,
  WebXRAgentEmbodimentEventMap,
  WebXRAgentEmbodimentEventType,
  WebXRAgentEmbodimentEventHandler,
} from './types';
import {
  DEFAULT_WEBXR_CAPABILITIES,
  EMOTION_COLORS,
  PERFORMANCE_TIER_MULTIPLIERS,
} from './types';

// =============================================================================
// WEBXR AGENT EMBODIMENT CLASS
// =============================================================================

/**
 * WebXR Agent Embodiment -- the universal cross-ecosystem bridge for
 * agent spatial presence in any WebXR-capable browser.
 *
 * This class is NOT a React component. It is a pure TypeScript state machine
 * that produces render primitives for any renderer to consume.
 */
export class WebXRAgentEmbodiment {
  // Configuration
  private readonly config: WebXRAgentEmbodimentConfig;

  // State
  private state: WebXRAgentState;
  private capabilities: WebXRCapabilities;
  private transition: EmbodimentTransition | null = null;
  private sequence: number = 0;
  private destroyed: boolean = false;

  // Event system
  private listeners: Map<
    WebXRAgentEmbodimentEventType,
    Set<WebXRAgentEmbodimentEventHandler<any>>
  > = new Map();

  /**
   * Private constructor -- use the `create()` factory function instead.
   */
  constructor(config: WebXRAgentEmbodimentConfig) {
    this.config = { ...config };
    this.capabilities = { ...DEFAULT_WEBXR_CAPABILITIES };

    // Initialize default agent state
    this.state = {
      agentId: config.agentId,
      agentName: config.agentName,
      position: { x: 0, y: 1.5, z: -2 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      visible: true,
      speaking: false,
      speechText: '',
      emotion: 'neutral',
      sessionMode: 'inline',
      referenceSpaceType: 'viewer',
      handoffReady: false,
      currentFormFactor: 'desktop',
    };

    logger.info(
      `[WebXRAgentEmbodiment] Created embodiment for agent "${config.agentId}" ` +
      `(style=${config.avatarStyle}, tier=${config.performanceTier})`,
    );
  }

  // ===========================================================================
  // CAPABILITY DETECTION
  // ===========================================================================

  /**
   * Detect WebXR capabilities from the current browser environment.
   *
   * Probes navigator.xr.isSessionSupported() for the three session modes
   * and infers feature availability based on session mode support patterns.
   *
   * @returns Detected capabilities (also stored internally)
   */
  async detectCapabilities(): Promise<WebXRCapabilities> {
    this.assertNotDestroyed();

    // Check if WebXR API is available
    const xr = this.getXRSystem();
    if (!xr) {
      logger.warn('[WebXRAgentEmbodiment] navigator.xr not available -- all capabilities disabled');
      this.capabilities = { ...DEFAULT_WEBXR_CAPABILITIES };
      this.emit('capabilities-detected', { capabilities: this.capabilities });
      return this.capabilities;
    }

    // Probe session modes in parallel
    const [immersiveVR, immersiveAR, inline] = await Promise.all([
      this.probeSessionMode(xr, 'immersive-vr'),
      this.probeSessionMode(xr, 'immersive-ar'),
      this.probeSessionMode(xr, 'inline'),
    ]);

    // Build capabilities from session mode results
    // Feature availability is inferred from session modes since WebXR
    // requires an active session to enumerate individual features
    this.capabilities = {
      immersiveVR,
      immersiveAR,
      inline,
      // Hand tracking is typically available on VR headsets
      handTracking: immersiveVR,
      // Hit-test is available on AR-capable devices
      hitTest: immersiveAR,
      // Anchors are available on AR-capable devices
      anchors: immersiveAR,
      // DOM overlay is available on AR-capable devices
      domOverlay: immersiveAR,
      // Depth sensing is available on some AR devices
      depthSensing: immersiveAR,
      // Light estimation is available on some AR devices
      lightEstimation: immersiveAR,
    };

    logger.info(
      `[WebXRAgentEmbodiment] Capabilities detected: ` +
      `VR=${immersiveVR}, AR=${immersiveAR}, inline=${inline}`,
    );

    this.emit('capabilities-detected', { capabilities: this.capabilities });
    return this.capabilities;
  }

  /**
   * Get the currently detected capabilities.
   */
  getCapabilities(): WebXRCapabilities {
    return { ...this.capabilities };
  }

  // ===========================================================================
  // MODE SELECTION
  // ===========================================================================

  /**
   * Select the optimal WebXR session mode and reference space based on
   * detected capabilities. Prefers immersive modes over inline.
   *
   * Priority order:
   * 1. immersive-vr with local-floor (best spatial experience)
   * 2. immersive-ar with local-floor (AR fallback)
   * 3. inline with viewer (minimal, runs in any browser)
   *
   * @param capabilities - Detected capabilities (from detectCapabilities)
   * @returns Recommended session mode and reference space
   */
  selectOptimalMode(capabilities: WebXRCapabilities): {
    sessionMode: WebXRSessionMode;
    referenceSpaceType: WebXRReferenceSpaceType;
  } {
    this.assertNotDestroyed();

    if (capabilities.immersiveVR) {
      return {
        sessionMode: 'immersive-vr',
        referenceSpaceType: 'local-floor',
      };
    }

    if (capabilities.immersiveAR) {
      return {
        sessionMode: 'immersive-ar',
        referenceSpaceType: 'local-floor',
      };
    }

    return {
      sessionMode: 'inline',
      referenceSpaceType: 'viewer',
    };
  }

  // ===========================================================================
  // SESSION INITIALIZATION
  // ===========================================================================

  /**
   * Initialize the embodiment's session state. This does NOT create an actual
   * XRSession (that is the renderer's responsibility). It sets the mode and
   * reference space so that state updates and render data generation use the
   * correct coordinate system.
   *
   * @param sessionMode - The WebXR session mode to target
   * @param referenceSpaceType - The reference space type to use
   */
  initSession(
    sessionMode: WebXRSessionMode,
    referenceSpaceType: WebXRReferenceSpaceType,
  ): void {
    this.assertNotDestroyed();

    this.state = {
      ...this.state,
      sessionMode,
      referenceSpaceType,
      handoffReady: true,
      currentFormFactor: this.inferFormFactor(sessionMode),
    };

    logger.info(
      `[WebXRAgentEmbodiment] Session initialized: ` +
      `mode=${sessionMode}, space=${referenceSpaceType}, ` +
      `formFactor=${this.state.currentFormFactor}`,
    );

    this.emit('session-started', { sessionMode, referenceSpaceType });
  }

  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================

  /**
   * Update the agent's embodiment state. Partial updates are merged
   * with the current state.
   *
   * @param update - Partial agent state to merge
   */
  updateState(update: Partial<WebXRAgentState>): void {
    this.assertNotDestroyed();

    this.state = { ...this.state, ...update };
    this.sequence++;

    logger.debug(
      `[WebXRAgentEmbodiment] State updated for "${this.config.agentId}" ` +
      `(seq=${this.sequence})`,
    );

    this.emit('state-updated', { agentId: this.config.agentId, state: { ...this.state } });
  }

  /**
   * Get the current agent state.
   */
  getState(): WebXRAgentState {
    return { ...this.state };
  }

  /**
   * Get the current embodiment configuration.
   */
  getConfig(): WebXRAgentEmbodimentConfig {
    return { ...this.config };
  }

  // ===========================================================================
  // HANDOFF (CROSS-REALITY CONTINUITY)
  // ===========================================================================

  /**
   * Prepare an MVC handoff payload for transferring this agent to another
   * form factor. Captures the current spatial context, agent identity,
   * and embodiment metadata into an MVCPayload.
   *
   * @param targetFormFactor - The form factor the agent is transferring to
   * @returns MVCPayload ready for transfer
   */
  prepareHandoff(targetFormFactor: FormFactor): MVCPayload {
    this.assertNotDestroyed();

    const now = Date.now();
    const handoffId = `handoff:${this.config.agentId}:${now}:${Math.random().toString(36).substring(2, 8)}`;

    const spatialContext = createEmptySpatialContext(this.state.currentFormFactor);
    spatialContext.localPosition = { ...this.state.position };
    spatialContext.facingDirection = { x: 0, y: 0, z: -1 };
    spatialContext.previousFormFactor = this.state.currentFormFactor;
    spatialContext.previousEmbodiment = 'WebXR';
    spatialContext.capturedAt = now;

    const payload: MVCPayload = {
      version: 1,
      handoffId,
      agentId: this.config.agentId,
      agentName: this.config.agentName,
      decisionHistory: createEmptyDecisionHistory(),
      activeTask: createEmptyActiveTaskState(),
      userPreferences: createDefaultUserPreferences(),
      spatialContext,
      evidenceTrail: createEmptyEvidenceTrail(),
      sourceFormFactor: this.state.currentFormFactor,
      targetFormFactor,
      sourceEmbodiment: 'WebXR',
      targetEmbodiment: DEFAULT_EMBODIMENT[targetFormFactor],
      createdAt: now,
      expiresAt: now + 5 * 60 * 1000,
    };

    logger.info(
      `[WebXRAgentEmbodiment] Handoff prepared: ` +
      `${this.state.currentFormFactor} -> ${targetFormFactor} ` +
      `(handoffId=${handoffId})`,
    );

    this.emit('handoff-ready', {
      agentId: this.config.agentId,
      formFactor: targetFormFactor,
    });

    return payload;
  }

  /**
   * Receive an MVC handoff payload from another form factor and restore
   * the agent's state from it. Updates position, name, and form factor
   * context from the incoming payload.
   *
   * @param payload - The incoming MVCPayload
   */
  receiveHandoff(payload: MVCPayload): void {
    this.assertNotDestroyed();

    // Restore position from spatial context
    const position = payload.spatialContext.localPosition ?? { x: 0, y: 1.5, z: -2 };

    this.state = {
      ...this.state,
      agentId: payload.agentId,
      agentName: payload.agentName,
      position,
      visible: true,
      handoffReady: true,
      currentFormFactor: payload.targetFormFactor,
    };

    this.sequence++;

    logger.info(
      `[WebXRAgentEmbodiment] Handoff received from ${payload.sourceFormFactor}: ` +
      `agent="${payload.agentId}", handoffId=${payload.handoffId}`,
    );

    this.emit('handoff-received', {
      agentId: payload.agentId,
      sourceFormFactor: payload.sourceFormFactor,
      targetFormFactor: payload.targetFormFactor,
    });
  }

  // ===========================================================================
  // RENDER DATA GENERATION
  // ===========================================================================

  /**
   * Generate render primitives for the current frame.
   *
   * Produces an array of typed render primitives (billboard quad, speech
   * bubble, name label, etc.) based on the agent's current state and
   * configured avatar style. The renderer is responsible for drawing these.
   *
   * @returns RenderData containing all primitives for this frame
   */
  generateRenderData(): RenderData {
    this.assertNotDestroyed();

    const primitives: RenderPrimitive[] = [];
    const emotionColor = EMOTION_COLORS[this.state.emotion] ?? EMOTION_COLORS['neutral'];
    const budgetMultiplier = PERFORMANCE_TIER_MULTIPLIERS[this.config.performanceTier];
    const effectiveBudget = this.config.maxRenderBudgetMs * budgetMultiplier;

    // Always generate position indicator
    primitives.push({
      type: 'position-indicator',
      position: { ...this.state.position },
      rotation: { ...this.state.rotation },
      scale: { x: 0.1, y: 0.1, z: 0.1 },
      color: emotionColor,
      text: '',
      visible: this.state.visible,
      metadata: { agentId: this.config.agentId },
    });

    // Name label (always shown except in 'minimal' below position indicator)
    primitives.push({
      type: 'name-label',
      position: {
        x: this.state.position.x,
        y: this.state.position.y + 0.3,
        z: this.state.position.z,
      },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 0.5, y: 0.15, z: 1 },
      color: { r: 1, g: 1, b: 1, a: 0.9 },
      text: this.state.agentName,
      visible: this.state.visible,
      metadata: {},
    });

    // Billboard quad (for billboard, volumetric, and hologram styles)
    if (this.config.avatarStyle !== 'minimal') {
      const alpha = this.config.avatarStyle === 'hologram' ? 0.7 : 1.0;
      primitives.push({
        type: 'billboard-quad',
        position: { ...this.state.position },
        rotation: { ...this.state.rotation },
        scale: { x: 0.8, y: 1.2, z: 1 },
        color: { ...emotionColor, a: alpha },
        text: '',
        visible: this.state.visible,
        metadata: {
          avatarStyle: this.config.avatarStyle,
          emotion: this.state.emotion,
        },
      });
    }

    // Speech bubble (shown when agent is speaking)
    if (this.state.speaking && this.state.speechText) {
      primitives.push({
        type: 'speech-bubble',
        position: {
          x: this.state.position.x + 0.5,
          y: this.state.position.y + 0.4,
          z: this.state.position.z,
        },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1.0, y: 0.4, z: 1 },
        color: { r: 0.1, g: 0.1, b: 0.15, a: 0.9 },
        text: this.state.speechText,
        visible: true,
        metadata: {},
      });
    }

    // Spatial context ring (if enabled and not minimal style)
    if (this.config.showSpatialContext && this.config.avatarStyle !== 'minimal') {
      primitives.push({
        type: 'spatial-context-ring',
        position: {
          x: this.state.position.x,
          y: this.state.position.y - 0.75,
          z: this.state.position.z,
        },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1.0, y: 0.02, z: 1.0 },
        color: { ...emotionColor, a: 0.3 },
        text: '',
        visible: this.state.visible,
        metadata: { formFactor: this.state.currentFormFactor },
      });
    }

    // Transition effect (if a transition is active)
    if (this.transition && this.transition.progress < 1) {
      primitives.push({
        type: 'transition-effect',
        position: { ...this.state.position },
        rotation: { ...this.state.rotation },
        scale: { x: 1.5, y: 1.5, z: 1.5 },
        color: { ...emotionColor, a: 1 - this.transition.progress },
        text: '',
        visible: true,
        metadata: {
          animationType: this.transition.animationType,
          progress: this.transition.progress,
          sourceEmbodiment: this.transition.sourceEmbodiment,
          targetEmbodiment: this.transition.targetEmbodiment,
        },
      });
    }

    return {
      agentId: this.config.agentId,
      primitives,
      estimatedRenderMs: Math.min(primitives.length * 0.5, effectiveBudget),
      sequence: this.sequence,
    };
  }

  // ===========================================================================
  // TRANSITION MANAGEMENT
  // ===========================================================================

  /**
   * Start an embodiment transition animation.
   *
   * @param transition - Transition configuration
   */
  startTransition(transition: EmbodimentTransition): void {
    this.assertNotDestroyed();
    this.transition = { ...transition };
  }

  /**
   * Update transition progress.
   *
   * @param progress - New progress value (0-1)
   */
  updateTransitionProgress(progress: number): void {
    if (this.transition) {
      this.transition.progress = Math.max(0, Math.min(1, progress));
      if (this.transition.progress >= 1) {
        this.transition = null;
      }
    }
  }

  /**
   * Get the current transition state, or null if no transition is active.
   */
  getTransition(): EmbodimentTransition | null {
    return this.transition ? { ...this.transition } : null;
  }

  // ===========================================================================
  // EVENT SYSTEM
  // ===========================================================================

  /**
   * Register an event listener.
   *
   * @param event - Event type to listen for
   * @param handler - Callback function
   */
  on<T extends WebXRAgentEmbodimentEventType>(
    event: T,
    handler: WebXRAgentEmbodimentEventHandler<T>,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  /**
   * Remove an event listener.
   *
   * @param event - Event type
   * @param handler - Previously registered callback
   */
  off<T extends WebXRAgentEmbodimentEventType>(
    event: T,
    handler: WebXRAgentEmbodimentEventHandler<T>,
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Destroy this embodiment instance and release all resources.
   * After calling destroy(), all methods will throw.
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.transition = null;

    logger.info(`[WebXRAgentEmbodiment] Destroyed embodiment for agent "${this.config.agentId}"`);

    this.emit('destroyed', { agentId: this.config.agentId });

    // Clear all listeners after emitting destroyed event
    this.listeners.clear();
  }

  /**
   * Check if this embodiment has been destroyed.
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Emit an event to all registered listeners.
   */
  private emit<T extends WebXRAgentEmbodimentEventType>(
    event: T,
    payload: WebXRAgentEmbodimentEventMap[T],
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (err) {
          logger.error(
            `[WebXRAgentEmbodiment] Event handler error for "${event}": ${err}`,
          );
        }
      }
    }
  }

  /**
   * Probe a single WebXR session mode.
   */
  private async probeSessionMode(xr: XRSystem, mode: string): Promise<boolean> {
    try {
      return await xr.isSessionSupported(mode as XRSessionMode);
    } catch {
      logger.warn(`[WebXRAgentEmbodiment] Failed to probe session mode "${mode}"`);
      return false;
    }
  }

  /**
   * Get the XRSystem from navigator, if available.
   */
  private getXRSystem(): XRSystem | null {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) {
      return (navigator as Navigator & { xr: XRSystem }).xr;
    }
    return null;
  }

  /**
   * Infer the device form factor from the active session mode.
   */
  private inferFormFactor(sessionMode: WebXRSessionMode): FormFactor {
    switch (sessionMode) {
      case 'immersive-vr':
        return 'vr-headset';
      case 'immersive-ar':
        return 'ar-glasses';
      case 'inline':
        return 'desktop';
      default:
        return 'desktop';
    }
  }

  /**
   * Assert that this embodiment has not been destroyed.
   * @throws Error if the embodiment has been destroyed
   */
  private assertNotDestroyed(): void {
    if (this.destroyed) {
      throw new Error(
        `[WebXRAgentEmbodiment] Cannot use destroyed embodiment (agentId="${this.config.agentId}")`,
      );
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new WebXR agent embodiment instance.
 *
 * @param config - Embodiment configuration
 * @returns A new WebXRAgentEmbodiment instance
 */
export function create(config: WebXRAgentEmbodimentConfig): WebXRAgentEmbodiment {
  return new WebXRAgentEmbodiment(config);
}
