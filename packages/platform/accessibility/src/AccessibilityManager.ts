
export enum VisionMode {
  Normal = 'normal',
  Protanopia = 'protanopia',
  Deuteranopia = 'deuteranopia',
  Tritanopia = 'tritanopia',
  HighContrast = 'high-contrast'
}

export type AccessibilityEventType = 'focus-change' | 'announcement' | 'vision-mode-change';

export interface AccessibilityEvent {
  type: AccessibilityEventType;
  timestamp: number;
  data: any;
}

export type AccessibilityEventListener = (event: AccessibilityEvent) => void;

export class AccessibilityManager {
  private visionMode: VisionMode = VisionMode.Normal;
  private listeners: Set<AccessibilityEventListener> = new Set();

  setVisionMode(mode: VisionMode): void {
    this.visionMode = mode;
    this.emit({ type: 'vision-mode-change', timestamp: Date.now(), data: { mode } });
  }

  announceToScreenReader(text: string): void {
    console.log(`[A11y] Screen Reader: ${text}`);
    this.emit({ type: 'announcement', timestamp: Date.now(), data: { text } });
  }

  addEventListener(listener: AccessibilityEventListener): void {
    this.listeners.add(listener);
  }

  private emit(event: AccessibilityEvent): void {
    this.listeners.forEach(l => l(event));
  }
}

export function createAccessibilityManager(): AccessibilityManager {
  return new AccessibilityManager();
}
