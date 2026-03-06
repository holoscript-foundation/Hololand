import { createAccessibilityManager, VisionMode } from './AccessibilityManager';
import { type AccessibilityContext as HSAccessibilityContext } from '@holoscript/core';

/**
 * HoloScriptAccessibilityBridge
 * 
 * Implements the HoloScript AccessibilityContext interface by delegating to 
 * Hololand's AccessibilityManager.
 */
export class HoloScriptAccessibilityBridge implements HSAccessibilityContext {
  private manager = createAccessibilityManager();

  /**
   * Announce text to screen reader
   */
  announce(text: string): void {
    this.manager.announceToScreenReader(text);
  }

  /**
   * Set screen reader focus to a specific node
   */
  setScreenReaderFocus(nodeId: string): void {
    console.log(`[A11yBridge] Setting focus to ${nodeId}`);
    // Wire to DOM or spatial focus manager
  }

  /**
   * Set accessible label for a node
   */
  setAltText(nodeId: string, text: string): void {
    console.log(`[A11yBridge] Node ${nodeId} alt text: ${text}`);
  }

  /**
   * Toggle high contrast mode
   */
  setHighContrast(enabled: boolean): void {
    this.manager.setVisionMode(enabled ? VisionMode.HighContrast : VisionMode.Normal);
  }
}

let instance: HoloScriptAccessibilityBridge | null = null;
export function getHoloScriptAccessibilityBridge(): HoloScriptAccessibilityBridge {
  if (!instance) instance = new HoloScriptAccessibilityBridge();
  return instance;
}
