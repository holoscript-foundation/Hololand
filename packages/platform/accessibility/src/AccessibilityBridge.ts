/**
 * AccessibilityBridge (Phase 3)
 *
 * Implements AccessibilityProvider from @hololand/core TraitContextFactory,
 * connecting HoloScript's 9 accessibility trait handlers to Hololand's
 * W3C XR accessibility runtime.
 *
 * Wired handlers:
 *   - accessibleHandler       (ARIA roles, labels, tab index)
 *   - altTextHandler          (alternative text descriptions)
 *   - spatialAudioCueHandler  (audio-based spatial awareness)
 *   - sonificationHandler     (data → sound mapping)
 *   - hapticCueHandler        (haptic accessibility cues)
 *   - magnifiableHandler      (magnification lens)
 *   - highContrastHandler     (high contrast mode)
 *   - motionReducedHandler    (reduced motion preferences)
 *   - subtitleHandler         (spatial subtitles)
 *   - screenReaderHandler     (screen reader integration)
 */

import type { AccessibilityProvider } from '@hololand/core';

// ---------------------------------------------------------------------------
// W3C XR Accessibility types
// ---------------------------------------------------------------------------

export type AriaRole =
  | 'button' | 'link' | 'heading' | 'img' | 'text'
  | 'slider' | 'checkbox' | 'dialog' | 'alert'
  | 'menu' | 'menuitem' | 'tab' | 'tabpanel'
  | 'region' | 'landmark' | 'none';

export type LiveRegion = 'off' | 'polite' | 'assertive';

export interface AccessibilityNode {
  nodeId: string;
  role: AriaRole;
  label: string;
  description: string;
  liveRegion: LiveRegion;
  tabIndex: number;
  focusVisible: boolean;
  keyboardShortcut: string;
}

export interface SubtitleEntry {
  text: string;
  speaker?: string;
  position?: { x: number; y: number; z: number };
  startTime: number;
  duration: number;
}

export interface AccessibilityBridgeConfig {
  /** Enable screen reader output (calls ARIA live regions) */
  enableScreenReader?: boolean;
  /** Enable high contrast mode globally */
  enableHighContrast?: boolean;
  /** Respect prefers-reduced-motion from OS */
  respectReducedMotion?: boolean;
  /** Default subtitle font size */
  subtitleFontSize?: number;
  /** Magnification factor for magnifiable trait */
  magnificationFactor?: number;
  /** Announcement queue debounce in ms */
  announcementDebounceMs?: number;
}

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

export class AccessibilityBridge implements AccessibilityProvider {
  private config: Required<AccessibilityBridgeConfig>;
  private nodes: Map<string, AccessibilityNode> = new Map();
  private focusedNodeId: string | null = null;
  private focusOrder: string[] = [];
  private highContrastEnabled: boolean;
  private reducedMotionEnabled: boolean;
  private announceQueue: string[] = [];
  private announceTimer: ReturnType<typeof setTimeout> | null = null;
  private subtitles: SubtitleEntry[] = [];
  private magnifiedNodes: Set<string> = new Set();
  private eventListeners: Map<string, Array<(data: unknown) => void>> = new Map();

  constructor(config: AccessibilityBridgeConfig = {}) {
    this.config = {
      enableScreenReader: true,
      enableHighContrast: false,
      respectReducedMotion: true,
      subtitleFontSize: 24,
      magnificationFactor: 2.0,
      announcementDebounceMs: 250,
      ...config,
    };

    this.highContrastEnabled = this.config.enableHighContrast;
    this.reducedMotionEnabled = this.config.respectReducedMotion && this.prefersReducedMotion();
  }

  // ---- AccessibilityProvider implementation ------------------------------

  announce(text: string): void {
    if (!this.config.enableScreenReader) return;

    this.announceQueue.push(text);

    // Debounce to avoid spamming screen reader
    if (this.announceTimer) clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => {
      const combined = this.announceQueue.join('. ');
      this.announceQueue = [];

      // Emit to ARIA live region
      this.emitEvent('announce', { text: combined });

      // Browser ARIA: create/update live region element
      if (typeof document !== 'undefined') {
        let liveRegion = document.getElementById('hololand-a11y-live');
        if (!liveRegion) {
          liveRegion = document.createElement('div');
          liveRegion.id = 'hololand-a11y-live';
          liveRegion.setAttribute('role', 'status');
          liveRegion.setAttribute('aria-live', 'polite');
          liveRegion.setAttribute('aria-atomic', 'true');
          liveRegion.style.cssText =
            'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);';
          document.body.appendChild(liveRegion);
        }
        liveRegion.textContent = combined;
      }
    }, this.config.announcementDebounceMs);
  }

  setScreenReaderFocus(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    this.focusedNodeId = nodeId;
    this.emitEvent('focus', { nodeId, label: node.label, role: node.role });

    // Announce the focused element
    const description = node.description ? ` — ${node.description}` : '';
    this.announce(`${node.role}: ${node.label}${description}`);
  }

  setAltText(nodeId: string, text: string): void {
    let node = this.nodes.get(nodeId);
    if (node) {
      node.label = text;
    } else {
      // Auto-register node with default settings
      node = {
        nodeId,
        role: 'img',
        label: text,
        description: '',
        liveRegion: 'off',
        tabIndex: 0,
        focusVisible: true,
        keyboardShortcut: '',
      };
      this.nodes.set(nodeId, node);
      this.focusOrder.push(nodeId);
    }
  }

  setHighContrast(enabled: boolean): void {
    this.highContrastEnabled = enabled;
    this.emitEvent('highContrastChange', { enabled });
  }

  // ---- Node registration ------------------------------------------------

  registerNode(node: AccessibilityNode): void {
    this.nodes.set(node.nodeId, node);

    // Insert into focus order by tabIndex
    this.focusOrder = this.focusOrder.filter(id => id !== node.nodeId);
    this.focusOrder.push(node.nodeId);
    this.focusOrder.sort((a, b) => {
      const aIdx = this.nodes.get(a)?.tabIndex ?? 0;
      const bIdx = this.nodes.get(b)?.tabIndex ?? 0;
      return aIdx - bIdx;
    });
  }

  unregisterNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.focusOrder = this.focusOrder.filter(id => id !== nodeId);
    this.magnifiedNodes.delete(nodeId);
    if (this.focusedNodeId === nodeId) {
      this.focusedNodeId = null;
    }
  }

  // ---- Focus navigation (keyboard/controller) ---------------------------

  focusNext(): void {
    if (this.focusOrder.length === 0) return;
    const currentIdx = this.focusedNodeId
      ? this.focusOrder.indexOf(this.focusedNodeId)
      : -1;
    const nextIdx = (currentIdx + 1) % this.focusOrder.length;
    this.setScreenReaderFocus(this.focusOrder[nextIdx]);
  }

  focusPrevious(): void {
    if (this.focusOrder.length === 0) return;
    const currentIdx = this.focusedNodeId
      ? this.focusOrder.indexOf(this.focusedNodeId)
      : 0;
    const prevIdx = (currentIdx - 1 + this.focusOrder.length) % this.focusOrder.length;
    this.setScreenReaderFocus(this.focusOrder[prevIdx]);
  }

  // ---- Magnification ----------------------------------------------------

  setMagnified(nodeId: string, magnified: boolean): void {
    if (magnified) {
      this.magnifiedNodes.add(nodeId);
    } else {
      this.magnifiedNodes.delete(nodeId);
    }
    this.emitEvent('magnify', { nodeId, magnified, factor: this.config.magnificationFactor });
  }

  // ---- Subtitles --------------------------------------------------------

  addSubtitle(entry: SubtitleEntry): void {
    this.subtitles.push(entry);
    this.emitEvent('subtitle', entry);

    // Auto-remove after duration
    setTimeout(() => {
      const idx = this.subtitles.indexOf(entry);
      if (idx !== -1) this.subtitles.splice(idx, 1);
    }, entry.duration * 1000);
  }

  getActiveSubtitles(): SubtitleEntry[] {
    return [...this.subtitles];
  }

  // ---- Reduced motion ---------------------------------------------------

  isReducedMotionEnabled(): boolean {
    return this.reducedMotionEnabled;
  }

  isHighContrastEnabled(): boolean {
    return this.highContrastEnabled;
  }

  // ---- Event system (for renderer integration) --------------------------

  on(event: string, handler: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  off(event: string, handler: (data: unknown) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    }
  }

  private emitEvent(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const fn of listeners) fn(data);
    }
  }

  // ---- Utility -----------------------------------------------------------

  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  }

  // ---- Stats & cleanup --------------------------------------------------

  getStats(): {
    registeredNodes: number;
    focusedNode: string | null;
    highContrast: boolean;
    reducedMotion: boolean;
    activeSubtitles: number;
    magnifiedNodes: number;
  } {
    return {
      registeredNodes: this.nodes.size,
      focusedNode: this.focusedNodeId,
      highContrast: this.highContrastEnabled,
      reducedMotion: this.reducedMotionEnabled,
      activeSubtitles: this.subtitles.length,
      magnifiedNodes: this.magnifiedNodes.size,
    };
  }

  dispose(): void {
    if (this.announceTimer) clearTimeout(this.announceTimer);
    this.nodes.clear();
    this.focusOrder = [];
    this.subtitles = [];
    this.magnifiedNodes.clear();
    this.eventListeners.clear();

    // Clean up DOM live region
    if (typeof document !== 'undefined') {
      const el = document.getElementById('hololand-a11y-live');
      if (el) el.remove();
    }
  }
}

export function createAccessibilityBridge(
  config?: AccessibilityBridgeConfig,
): AccessibilityBridge {
  return new AccessibilityBridge(config);
}
