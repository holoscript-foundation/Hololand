/**
 * @hololand/ui - AdaptiveLayout
 * Manages device-aware layouts and theme configurations.
 */

import { themeContext, Theme, lightTheme, darkTheme } from './theme';
export type DeviceType =
  | 'mobile'
  | 'tablet'
  | 'quest2'
  | 'quest3'
  | 'questPro'
  | 'pcvr'
  | 'desktop'
  | 'unknown';

export type UserMode = 'simple' | 'expert';

/**
 * Kid-friendly theme: Vibrant, rounded, large spacing.
 */
export const kidTheme: Theme = {
  ...lightTheme,
  name: 'kid',
  colors: {
    ...lightTheme.colors,
    primary: '#FF4081',
    secondary: '#7C4DFF',
    background: '#FFF9C4',
    surface: '#FFFFFF',
    textPrimary: '#3F51B5'
  },
  spacing: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48
  },
  borders: {
    ...lightTheme.borders,
    radiusMd: 12,
    radiusLg: 24
  }
};

/**
 * Expert/Developer theme: Dark, compact, high information density.
 */
export const expertTheme: Theme = {
  ...darkTheme,
  name: 'expert',
  colors: {
    ...darkTheme.colors,
    primary: '#00E676',
    background: '#0D0D0D',
    surface: '#1A1A1A',
    textPrimary: '#00E676' // Matrix-style
  },
  spacing: {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 20
  }
};

export class AdaptiveLayout {
  private _userMode: UserMode = 'simple';

  constructor(private deviceType: DeviceType) {
    this.applyInitialState();
  }

  private applyInitialState(): void {
    if (this.deviceType === 'mobile' || this.deviceType === 'quest2') {
      this.setUserMode('simple');
    } else {
      this.setUserMode('expert');
    }
  }

  public setUserMode(mode: UserMode): void {
    this._userMode = mode;
    if (mode === 'simple') {
      themeContext.theme = kidTheme;
    } else {
      themeContext.theme = expertTheme;
    }
  }

  public get userMode(): UserMode {
    return this._userMode;
  }

  /**
   * Returns recommended font size scaling factor based on device
   */
  public get fontScale(): number {
    switch (this.deviceType) {
      case 'mobile': return 1.2;
      case 'tablet': return 1.5;
      case 'quest3':
      case 'questPro': return 2.0; // VR needs larger text
      default: return 1.0;
    }
  }
}
