/**
 * HapticBridge - Haptic feedback bridge for VR/spatial interactions
 *
 * Provides haptic feedback patterns optimized for VR/AR spatial computing:
 * - Light impacts for UI taps and button presses
 * - Medium impacts for object selection in 3D space
 * - Heavy impacts for collisions, errors, and boundary alerts
 * - Selection feedback for scrolling through lists or spatial menus
 * - Custom vibration patterns for game-like interactions
 * - Notification haptics for system events
 *
 * Uses @capacitor/haptics plugin API.
 */

import {
  Haptics,
  ImpactStyle,
  NotificationType,
} from '@capacitor/haptics';

// =============================================================================
// TYPES
// =============================================================================

/** Predefined haptic intensity levels */
export type HapticIntensity = 'light' | 'medium' | 'heavy';

/** Haptic pattern step for custom sequences */
export interface HapticPatternStep {
  /** Duration in milliseconds */
  duration: number;
  /** Whether this step is a vibration (true) or pause (false) */
  vibrate: boolean;
}

// =============================================================================
// HAPTIC BRIDGE
// =============================================================================

export class HapticBridge {
  private available = true;

  constructor() {
    // Check if Haptics plugin is available on this platform
    this.checkAvailability();
  }

  /**
   * Light impact feedback - for UI taps, button presses, toggle switches.
   * Produces a subtle, short vibration appropriate for frequent interactions.
   */
  async lightImpact(): Promise<void> {
    if (!this.available) return;

    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      this.handleError('lightImpact', error);
    }
  }

  /**
   * Medium impact feedback - for object selection in 3D space,
   * grabbing objects, confirming actions.
   * Produces a noticeable but not jarring vibration.
   */
  async mediumImpact(): Promise<void> {
    if (!this.available) return;

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      this.handleError('mediumImpact', error);
    }
  }

  /**
   * Heavy impact feedback - for collisions, errors, boundary alerts,
   * dropping heavy objects, or critical confirmations.
   * Produces a strong, unmistakable vibration.
   */
  async heavyImpact(): Promise<void> {
    if (!this.available) return;

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      this.handleError('heavyImpact', error);
    }
  }

  /**
   * Selection changed feedback - for scrolling through lists,
   * spatial menus, slider adjustments, or stepping through items.
   * Produces a brief, crisp tick sensation.
   */
  async selectionChanged(): Promise<void> {
    if (!this.available) return;

    try {
      await Haptics.selectionChanged();
    } catch (error) {
      this.handleError('selectionChanged', error);
    }
  }

  /**
   * Custom vibration with specified duration.
   * Useful for game-like effects, spatial proximity feedback,
   * or creating custom vibration patterns.
   *
   * @param duration - Vibration duration in milliseconds (clamped to 1-5000ms)
   */
  async vibrate(duration: number): Promise<void> {
    if (!this.available) return;

    // Clamp duration to reasonable bounds
    const clampedDuration = Math.max(1, Math.min(5000, duration));

    try {
      await Haptics.vibrate({ duration: clampedDuration });
    } catch (error) {
      this.handleError('vibrate', error);
    }
  }

  /**
   * Success notification haptic - for successful operations,
   * completed downloads, world loaded confirmations.
   * Produces a positive, satisfying haptic pattern.
   */
  async notificationSuccess(): Promise<void> {
    if (!this.available) return;

    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (error) {
      this.handleError('notificationSuccess', error);
    }
  }

  /**
   * Warning notification haptic - for approaching limits,
   * low battery warnings, or cautionary alerts in VR.
   * Produces a cautionary haptic pattern.
   */
  async notificationWarning(): Promise<void> {
    if (!this.available) return;

    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (error) {
      this.handleError('notificationWarning', error);
    }
  }

  /**
   * Error notification haptic - for failed operations,
   * permission denials, network errors, or critical system events.
   * Produces a sharp, attention-grabbing haptic pattern.
   */
  async notificationError(): Promise<void> {
    if (!this.available) return;

    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (error) {
      this.handleError('notificationError', error);
    }
  }

  /**
   * Play a custom haptic pattern sequence.
   * Alternates between vibration and pause steps.
   *
   * @param steps - Array of haptic pattern steps
   */
  async playPattern(steps: HapticPatternStep[]): Promise<void> {
    if (!this.available) return;

    for (const step of steps) {
      if (step.vibrate) {
        await this.vibrate(step.duration);
      } else {
        // Pause between vibrations
        await this.sleep(step.duration);
      }
    }
  }

  /**
   * Convenience method: spatial proximity feedback.
   * Vibrates with increasing intensity as distance decreases,
   * useful for object approach haptics in AR/VR.
   *
   * @param normalizedDistance - Distance from 0.0 (touching) to 1.0 (far away)
   */
  async proximityFeedback(normalizedDistance: number): Promise<void> {
    if (!this.available) return;

    const clamped = Math.max(0, Math.min(1, normalizedDistance));

    if (clamped < 0.1) {
      await this.heavyImpact();
    } else if (clamped < 0.3) {
      await this.mediumImpact();
    } else if (clamped < 0.6) {
      await this.lightImpact();
    }
    // Beyond 0.6 - no haptic feedback (too far)
  }

  /**
   * Check whether haptic feedback is available on this device.
   */
  isAvailable(): boolean {
    return this.available;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Check if the Haptics plugin is available on the current platform.
   */
  private checkAvailability(): void {
    try {
      // Haptics is available on iOS and Android via Capacitor.
      // On web, it falls back to navigator.vibrate where supported.
      if (typeof window === 'undefined') {
        this.available = false;
        return;
      }

      // Check for Capacitor native runtime
      const win = window as Window & { Capacitor?: { isNativePlatform: () => boolean } };
      if (win.Capacitor?.isNativePlatform()) {
        this.available = true;
        return;
      }

      // Fallback: check for Web Vibration API
      this.available = 'vibrate' in navigator;
    } catch {
      this.available = false;
    }
  }

  /**
   * Handle haptic errors gracefully (non-fatal).
   */
  private handleError(method: string, error: unknown): void {
    console.warn(`[HapticBridge] ${method} failed:`, error);
    // Haptic failures are non-fatal - don't throw
  }

  /**
   * Sleep utility for pattern playback.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
