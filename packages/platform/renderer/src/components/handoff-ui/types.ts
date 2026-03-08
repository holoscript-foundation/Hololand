/**
 * Handoff UI Types
 *
 * Type definitions for the cross-reality handoff UI components.
 * Supports the full HandoffInitiator workflow: device discovery,
 * MVC payload preview, capability warnings, and transfer progress.
 *
 * @module handoff-ui/types
 */

// =============================================================================
// DISCOVERED DEVICE
// =============================================================================

/**
 * A device discovered on the local network or paired via account,
 * eligible as a handoff target.
 */
export interface DiscoveredDevice {
  /** Unique device identifier */
  deviceId: string;
  /** Physical form factor */
  formFactor: string;
  /** Supported embodiment types (Avatar3D, SpatialPersona, UI2D, etc.) */
  embodiments: string[];
  /** Available input modalities (gesture, voice, touch, gaze, keyboard) */
  inputModalities: string[];
  /** Whether the device supports geospatial positioning */
  hasGeospatial: boolean;
}

// =============================================================================
// TRANSFER STATE
// =============================================================================

/**
 * State machine for the handoff transfer lifecycle.
 *
 * Flow: idle -> negotiating -> compressing -> transferring -> verified -> complete
 * Error can occur from any active state.
 */
export type TransferState =
  | 'idle'
  | 'negotiating'
  | 'compressing'
  | 'transferring'
  | 'verified'
  | 'complete'
  | 'error';

// =============================================================================
// MVC PAYLOAD PREVIEW
// =============================================================================

/**
 * Preview of the MVC (Minimum Viable Continuity) payload that will
 * be transferred during the handoff.
 */
export interface PayloadPreview {
  /** Number of recent decisions in DecisionHistory */
  decisionCount: number;
  /** Human-readable description of the active task */
  taskDescription: string;
  /** Number of spatial anchors in SpatialContextSummary */
  spatialAnchors: number;
  /** Number of evidence items in EvidenceTrail */
  evidenceItems: number;
  /** Estimated serialized size in bytes */
  estimatedSizeBytes: number;
}

// =============================================================================
// FORM FACTOR ICONS
// =============================================================================

/**
 * Emoji icons for each form factor.
 */
export const FORM_FACTOR_ICONS: Record<string, string> = {
  'vr-headset': '\uD83E\uDD7D',   // goggles
  'ar-glasses': '\uD83D\uDC53',   // glasses
  'phone': '\uD83D\uDCF1',        // mobile phone
  'desktop': '\uD83D\uDDA5\uFE0F', // desktop computer
  'car': '\uD83D\uDE97',          // car
  'wearable': '\u231A',           // watch
};

/**
 * Get the emoji icon for a form factor, with a fallback.
 */
export function getFormFactorIcon(formFactor: string): string {
  return FORM_FACTOR_ICONS[formFactor] ?? '\uD83D\uDCBB'; // laptop fallback
}

/**
 * Get a human-readable label for a form factor.
 */
export function getFormFactorLabel(formFactor: string): string {
  const labels: Record<string, string> = {
    'vr-headset': 'VR Headset',
    'ar-glasses': 'AR Glasses',
    'phone': 'Phone',
    'desktop': 'Desktop',
    'car': 'Car',
    'wearable': 'Watch',
  };
  return labels[formFactor] ?? formFactor;
}
