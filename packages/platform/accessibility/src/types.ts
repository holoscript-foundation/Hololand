/**
 * Accessibility Types
 */

export enum VisionMode {
  Normal = 'normal',
  Deuteranopia = 'deuteranopia',
  Protanopia = 'protanopia',
  Tritanopia = 'tritanopia',
  HighContrast = 'high-contrast',
  Grayscale = 'grayscale',
}

export interface HapticsProfile {
  intensity: number;
  audioToHaptics: boolean;
  feedbackDelay: number;
}

export interface MotorProfile {
  dwellTime: number;
  stickyPointer: boolean;
  reducedMotion: boolean;
}

export interface ScreenReaderConfig {
  enabled: boolean;
  verbosity: 'minimal' | 'normal' | 'verbose';
  language: string;
}

export interface AccessibilityConfig {
  vision: VisionMode;
  haptics: HapticsProfile;
  motor: MotorProfile;
  screenReader: ScreenReaderConfig;
}
