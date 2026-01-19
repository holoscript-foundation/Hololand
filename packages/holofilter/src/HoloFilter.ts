/**
 * HoloFilter - Unified VRR + AR Interface
 *
 * Main entry point combining:
 * - ObjectScanner for 3D scanning (VRR)
 * - ARFilterManager for AR overlays
 *
 * Features:
 * - Single API for both VRR and AR
 * - Shared camera/sensor access
 * - Cross-system integration (scan → filter)
 * - HoloScript integration
 */

import { ObjectScanner, ObjectScannerConfig, createObjectScanner } from './vrr/ObjectScanner';
import { ARFilterManager, ARFilterManagerConfig, createARFilterManager } from './ar/ARFilterManager';
import type {
  ScanSession,
  ScanResult,
  ScanFrame,
  FaceDetection,
  AROverlayState,
  ARFilter,
  HoloFilterConfig,
} from './types';

export interface HoloFilterInstance {
  // VRR Methods
  startScan(objectId: string, mode?: 'object' | 'room' | 'face' | 'body'): ScanSession;
  addScanFrame(frame: Omit<import('./types').ScanFrame, 'id' | 'timestamp'>): void;
  finishScan(): Promise<ScanResult>;
  getLastResult(): ScanResult | null;

  // AR Methods
  registerFilter(filter: ARFilter): void;
  activateFilter(filterId: string): boolean;
  deactivateFilter(filterId: string): void;
  updateAR(faces: FaceDetection[], deltaTime: number): AROverlayState;
  getARState(): AROverlayState;

  // Unified Methods
  getActiveMode(): 'idle' | 'scanning' | 'ar' | 'both';
  setMode(mode: 'idle' | 'scanning' | 'ar' | 'both'): void;

  // Access to underlying systems
  scanner: ObjectScanner;
  arManager: ARFilterManager;
}

/**
 * HoloFilter - Main Class
 */
export class HoloFilter implements HoloFilterInstance {
  public scanner: ObjectScanner;
  public arManager: ARFilterManager;

  private currentSession: ScanSession | null = null;
  private lastResult: ScanResult | null = null;
  private currentMode: 'idle' | 'scanning' | 'ar' | 'both' = 'idle';

  constructor(config?: Partial<HoloFilterConfig>) {
    const scannerConfig = config?.scanner as Partial<ObjectScannerConfig> | undefined;
    const arConfig = config?.ar as Partial<ARFilterManagerConfig> | undefined;

    this.scanner = createObjectScanner(scannerConfig);
    this.arManager = createARFilterManager(arConfig);
  }

  // ========================================
  // VRR Methods
  // ========================================

  startScan(objectId: string, mode: 'object' | 'room' | 'face' | 'body' = 'object'): ScanSession {
    // Map simple mode names to CaptureMode
    const captureMode = mode === 'object' ? 'photogrammetry' as const : 'photogrammetry' as const;
    this.currentSession = this.scanner.startSession(objectId, captureMode);
    if (this.currentMode === 'ar') {
      this.currentMode = 'both';
    } else {
      this.currentMode = 'scanning';
    }
    return this.currentSession;
  }

  addScanFrame(frame: Omit<ScanFrame, 'id' | 'timestamp'>): void {
    if (!this.currentSession) {
      throw new Error('No active scan session. Call startScan() first.');
    }
    this.scanner.addFrame(frame);
  }

  async finishScan(): Promise<ScanResult> {
    if (!this.currentSession) {
      throw new Error('No active scan session.');
    }

    const result = await this.scanner.stopCapture();
    this.lastResult = result;
    this.currentSession = null;

    if (this.currentMode === 'both') {
      this.currentMode = 'ar';
    } else {
      this.currentMode = 'idle';
    }

    return result;
  }

  getLastResult(): ScanResult | null {
    return this.lastResult;
  }

  // ========================================
  // AR Methods
  // ========================================

  registerFilter(filter: ARFilter): void {
    this.arManager.registerFilter(filter);
  }

  activateFilter(filterId: string): boolean {
    const success = this.arManager.activateFilter(filterId);
    if (success && this.currentMode === 'idle') {
      this.currentMode = 'ar';
    } else if (success && this.currentMode === 'scanning') {
      this.currentMode = 'both';
    }
    return success;
  }

  deactivateFilter(filterId: string): void {
    this.arManager.deactivateFilter(filterId);
    if (this.arManager.getActiveFilterIds().length === 0) {
      if (this.currentMode === 'both') {
        this.currentMode = 'scanning';
      } else if (this.currentMode === 'ar') {
        this.currentMode = 'idle';
      }
    }
  }

  updateAR(faces: FaceDetection[], deltaTime: number): AROverlayState {
    return this.arManager.update(faces, deltaTime);
  }

  getARState(): AROverlayState {
    return this.arManager.getState();
  }

  // ========================================
  // Unified Methods
  // ========================================

  getActiveMode(): 'idle' | 'scanning' | 'ar' | 'both' {
    return this.currentMode;
  }

  setMode(mode: 'idle' | 'scanning' | 'ar' | 'both'): void {
    if (mode === 'idle') {
      // Stop everything
      if (this.currentSession) {
        this.scanner.stopCapture();
        this.currentSession = null;
      }
      for (const filterId of this.arManager.getActiveFilterIds()) {
        this.arManager.deactivateFilter(filterId);
      }
    }
    this.currentMode = mode;
  }
}

/**
 * Create a HoloFilter instance
 */
export function createHoloFilter(config?: Partial<HoloFilterConfig>): HoloFilterInstance {
  return new HoloFilter(config);
}

// ============================================================
// HoloScript Integration - Scan & Filter Traits
// ============================================================

/**
 * HoloScript trait definitions for scanning and filtering
 *
 * Usage in HoloScript:
 * ```holoscript
 * orb MyScanScene {
 *   trait holo_scan {
 *     mode: "object"
 *     quality: "high"
 *     export_format: "holoscript"
 *   }
 *
 *   trait holo_filter {
 *     type: "face"
 *     preset: "sunglasses"
 *     tracking: true
 *   }
 * }
 * ```
 */
export const HOLOSCRIPT_SCAN_TRAIT = `
trait holo_scan {
  mode: string        // "object" | "room" | "face" | "body"
  quality: string     // "draft" | "standard" | "high" | "ultra"
  depth_enabled: bool // Use depth sensor
  export_format: string // "holoscript" | "obj" | "ply"
}
`;

export const HOLOSCRIPT_FILTER_TRAIT = `
trait holo_filter {
  type: string        // "face" | "body" | "environment" | "object" | "portal" | "hologram"
  preset: string      // Preset filter ID
  custom_model: string // Custom 3D model URL
  tracking: bool      // Enable tracking
  animation: string   // "loop" | "trigger" | "expression"
}
`;

/**
 * Parse HoloScript scan trait
 */
export function parseHoloScriptScanTrait(
  traitBlock: string
): { mode: 'object' | 'room' | 'face' | 'body'; quality: string; depthEnabled: boolean } | null {
  const modeMatch = traitBlock.match(/mode:\s*"(\w+)"/);
  const qualityMatch = traitBlock.match(/quality:\s*"(\w+)"/);
  const depthMatch = traitBlock.match(/depth_enabled:\s*(true|false)/);

  if (!modeMatch) return null;

  return {
    mode: modeMatch[1] as 'object' | 'room' | 'face' | 'body',
    quality: qualityMatch?.[1] || 'standard',
    depthEnabled: depthMatch?.[1] === 'true',
  };
}

/**
 * Parse HoloScript filter trait
 */
export function parseHoloScriptFilterTrait(traitBlock: string): {
  type: string;
  preset?: string;
  customModel?: string;
  tracking: boolean;
  animation?: string;
} | null {
  const typeMatch = traitBlock.match(/type:\s*"(\w+)"/);
  if (!typeMatch) return null;

  const presetMatch = traitBlock.match(/preset:\s*"(\w+)"/);
  const modelMatch = traitBlock.match(/custom_model:\s*"([^"]+)"/);
  const trackingMatch = traitBlock.match(/tracking:\s*(true|false)/);
  const animMatch = traitBlock.match(/animation:\s*"(\w+)"/);

  return {
    type: typeMatch[1],
    preset: presetMatch?.[1],
    customModel: modelMatch?.[1],
    tracking: trackingMatch?.[1] !== 'false',
    animation: animMatch?.[1],
  };
}
