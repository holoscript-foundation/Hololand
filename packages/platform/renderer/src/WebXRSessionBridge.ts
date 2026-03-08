/**
 * WebXR Session Bridge
 *
 * Bridges the WebXR Device API with cross-reality handoff pipeline.
 * Handles XR session lifecycle, reference spaces, and handoff coordination.
 */

export type XRSessionMode = 'immersive-vr' | 'immersive-ar' | 'inline';
export type XRReferenceSpaceType = 'viewer' | 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';

export interface WebXRCapabilities {
  immersiveVR: boolean;
  immersiveAR: boolean;
  inline: boolean;
  handTracking: boolean;
  planeDetection: boolean;
  anchors: boolean;
}

export interface XRSessionState {
  mode: XRSessionMode | null;
  referenceSpace: XRReferenceSpaceType | null;
  inputSources: string[];
  isPresenting: boolean;
  frameRate: number;
  visibilityState: 'visible' | 'visible-blurred' | 'hidden';
}

export class WebXRSessionBridge {
  private capabilities: WebXRCapabilities | null = null;
  private sessionState: XRSessionState;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.sessionState = {
      mode: null, referenceSpace: null, inputSources: [],
      isPresenting: false, frameRate: 0, visibilityState: 'visible',
    };
  }

  async detectCapabilities(): Promise<WebXRCapabilities> {
    if (typeof navigator === 'undefined' || !('xr' in navigator)) {
      this.capabilities = { immersiveVR: false, immersiveAR: false, inline: true, handTracking: false, planeDetection: false, anchors: false };
      return this.capabilities;
    }
    const xr = (navigator as any).xr;
    const [vr, ar] = await Promise.all([
      xr.isSessionSupported?.('immersive-vr').catch(() => false) ?? false,
      xr.isSessionSupported?.('immersive-ar').catch(() => false) ?? false,
    ]);
    this.capabilities = { immersiveVR: vr, immersiveAR: ar, inline: true, handTracking: false, planeDetection: false, anchors: false };
    return this.capabilities;
  }

  getBestReferenceSpace(mode: XRSessionMode): XRReferenceSpaceType {
    if (mode === 'immersive-vr') return 'local-floor';
    if (mode === 'immersive-ar') return 'local';
    return 'viewer';
  }

  formFactorToSessionMode(formFactor: string): XRSessionMode {
    if (formFactor === 'vr-headset') return 'immersive-vr';
    if (formFactor === 'ar-glasses') return 'immersive-ar';
    return 'inline';
  }

  async prepareHandoffOut(): Promise<{ spatialState: { position: number[]; rotation: number[] } | null; sessionEndReason: 'handoff' }> {
    const spatialState = this.sessionState.isPresenting ? { position: [0, 0, 0], rotation: [0, 0, 0, 1] } : null;
    if (this.sessionState.isPresenting) await this.endSession();
    return { spatialState, sessionEndReason: 'handoff' };
  }

  async prepareHandoffIn(targetMode: XRSessionMode): Promise<{ ready: boolean; mode: XRSessionMode; referenceSpace: XRReferenceSpaceType; reason?: string }> {
    if (!this.capabilities) await this.detectCapabilities();
    if (targetMode === 'immersive-vr' && !this.capabilities!.immersiveVR) return { ready: false, mode: targetMode, referenceSpace: 'viewer', reason: 'immersive-vr not supported' };
    if (targetMode === 'immersive-ar' && !this.capabilities!.immersiveAR) return { ready: false, mode: targetMode, referenceSpace: 'viewer', reason: 'immersive-ar not supported' };
    const refSpace = this.getBestReferenceSpace(targetMode);
    this.sessionState = { mode: targetMode, referenceSpace: refSpace, inputSources: [], isPresenting: targetMode !== 'inline', frameRate: targetMode === 'immersive-vr' ? 90 : targetMode === 'immersive-ar' ? 60 : 30, visibilityState: 'visible' };
    this.emit('session-started', { mode: targetMode, referenceSpace: refSpace });
    return { ready: true, mode: targetMode, referenceSpace: refSpace };
  }

  async endSession(): Promise<void> {
    if (this.sessionState.isPresenting) {
      this.emit('session-ending', { mode: this.sessionState.mode });
      this.sessionState = { mode: null, referenceSpace: null, inputSources: [], isPresenting: false, frameRate: 0, visibilityState: 'visible' };
      this.emit('session-ended', {});
    }
  }

  getSessionState(): XRSessionState { return { ...this.sessionState }; }
  getCapabilities(): WebXRCapabilities | null { return this.capabilities ? { ...this.capabilities } : null; }

  getMetrics() {
    return { isPresenting: this.sessionState.isPresenting, mode: this.sessionState.mode, frameRate: this.sessionState.frameRate };
  }

  on(event: string, handler: (data: any) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: (data: any) => void): void { this.listeners.get(event)?.delete(handler); }
  private emit(event: string, data: any): void { this.listeners.get(event)?.forEach(h => h(data)); }
  dispose(): void { this.listeners.clear(); }
}

export function createWebXRSessionBridge(): WebXRSessionBridge { return new WebXRSessionBridge(); }
