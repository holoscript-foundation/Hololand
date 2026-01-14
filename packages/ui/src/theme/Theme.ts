/**
 * @hololand/ui - Theme System
 * Provides theming support for UI components
 */

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Secondary colors
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;

  // Background colors
  background: string;
  surface: string;
  surfaceVariant: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  textOnPrimary: string;
  textOnSecondary: string;

  // Border colors
  border: string;
  borderLight: string;
  borderDark: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Overlay
  overlay: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface ThemeTypography {
  fontFamily: string;
  fontFamilyMono: string;
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  fontWeight: {
    light: string;
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface ThemeBorders {
  radiusNone: number;
  radiusSm: number;
  radiusMd: number;
  radiusLg: number;
  radiusFull: number;
  width: {
    thin: number;
    medium: number;
    thick: number;
  };
}

export interface ThemeShadows {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeTransitions {
  fast: number;
  normal: number;
  slow: number;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  borders: ThemeBorders;
  shadows: ThemeShadows;
  transitions: ThemeTransitions;
}

/**
 * Light theme preset
 */
export const lightTheme: Theme = {
  name: 'light',
  colors: {
    primary: '#3498db',
    primaryLight: '#5dade2',
    primaryDark: '#2980b9',
    secondary: '#9b59b6',
    secondaryLight: '#af7ac5',
    secondaryDark: '#7d3c98',
    background: '#ffffff',
    surface: '#f5f5f5',
    surfaceVariant: '#eeeeee',
    textPrimary: '#333333',
    textSecondary: '#666666',
    textDisabled: '#9e9e9e',
    textOnPrimary: '#ffffff',
    textOnSecondary: '#ffffff',
    border: '#e0e0e0',
    borderLight: '#f0f0f0',
    borderDark: '#bdbdbd',
    success: '#27ae60',
    warning: '#f39c12',
    error: '#e74c3c',
    info: '#3498db',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyMono: '"SF Mono", Monaco, Consolas, "Liberation Mono", monospace',
    fontSize: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 20,
      xxl: 24,
    },
    fontWeight: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  borders: {
    radiusNone: 0,
    radiusSm: 2,
    radiusMd: 4,
    radiusLg: 8,
    radiusFull: 9999,
    width: {
      thin: 1,
      medium: 2,
      thick: 4,
    },
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
  },
  transitions: {
    fast: 100,
    normal: 200,
    slow: 400,
  },
};

/**
 * Dark theme preset
 */
export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: '#5dade2',
    primaryLight: '#85c1e9',
    primaryDark: '#3498db',
    secondary: '#af7ac5',
    secondaryLight: '#c39bd3',
    secondaryDark: '#9b59b6',
    background: '#1a1a2e',
    surface: '#16213e',
    surfaceVariant: '#0f3460',
    textPrimary: '#e0e0e0',
    textSecondary: '#b0b0b0',
    textDisabled: '#666666',
    textOnPrimary: '#1a1a2e',
    textOnSecondary: '#1a1a2e',
    border: '#333333',
    borderLight: '#444444',
    borderDark: '#222222',
    success: '#2ecc71',
    warning: '#f1c40f',
    error: '#e74c3c',
    info: '#5dade2',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  spacing: lightTheme.spacing,
  typography: lightTheme.typography,
  borders: lightTheme.borders,
  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.4)',
  },
  transitions: lightTheme.transitions,
};

/**
 * High contrast theme preset
 */
export const highContrastTheme: Theme = {
  name: 'high-contrast',
  colors: {
    primary: '#0066cc',
    primaryLight: '#0088ff',
    primaryDark: '#004499',
    secondary: '#6600cc',
    secondaryLight: '#8800ff',
    secondaryDark: '#440099',
    background: '#ffffff',
    surface: '#ffffff',
    surfaceVariant: '#f0f0f0',
    textPrimary: '#000000',
    textSecondary: '#333333',
    textDisabled: '#767676',
    textOnPrimary: '#ffffff',
    textOnSecondary: '#ffffff',
    border: '#000000',
    borderLight: '#333333',
    borderDark: '#000000',
    success: '#006600',
    warning: '#cc6600',
    error: '#cc0000',
    info: '#0066cc',
    overlay: 'rgba(0, 0, 0, 0.8)',
  },
  spacing: lightTheme.spacing,
  typography: {
    ...lightTheme.typography,
    fontWeight: {
      light: '400',
      regular: '500',
      medium: '600',
      semibold: '700',
      bold: '800',
    },
  },
  borders: {
    ...lightTheme.borders,
    width: {
      thin: 2,
      medium: 3,
      thick: 4,
    },
  },
  shadows: lightTheme.shadows,
  transitions: lightTheme.transitions,
};

/**
 * Theme context for managing current theme
 */
export class ThemeContext {
  private static _instance: ThemeContext;
  private _currentTheme: Theme = lightTheme;
  private _listeners: Set<(theme: Theme) => void> = new Set();

  private constructor() {}

  static getInstance(): ThemeContext {
    if (!ThemeContext._instance) {
      ThemeContext._instance = new ThemeContext();
    }
    return ThemeContext._instance;
  }

  get theme(): Theme {
    return this._currentTheme;
  }

  set theme(theme: Theme) {
    this._currentTheme = theme;
    this.notifyListeners();
  }

  /**
   * Set theme by name
   */
  setTheme(themeName: 'light' | 'dark' | 'high-contrast' | Theme): void {
    if (typeof themeName === 'string') {
      switch (themeName) {
        case 'light':
          this._currentTheme = lightTheme;
          break;
        case 'dark':
          this._currentTheme = darkTheme;
          break;
        case 'high-contrast':
          this._currentTheme = highContrastTheme;
          break;
      }
    } else {
      this._currentTheme = themeName;
    }
    this.notifyListeners();
  }

  /**
   * Create custom theme by extending a base theme
   */
  createTheme(name: string, baseTheme: Theme, overrides: Partial<Theme>): Theme {
    return {
      ...baseTheme,
      ...overrides,
      name,
      colors: { ...baseTheme.colors, ...overrides.colors },
      spacing: { ...baseTheme.spacing, ...overrides.spacing },
      typography: { ...baseTheme.typography, ...overrides.typography },
      borders: { ...baseTheme.borders, ...overrides.borders },
      shadows: { ...baseTheme.shadows, ...overrides.shadows },
      transitions: { ...baseTheme.transitions, ...overrides.transitions },
    };
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(listener: (theme: Theme) => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Notify all listeners of theme change
   */
  private notifyListeners(): void {
    this._listeners.forEach(listener => listener(this._currentTheme));
  }
}

// Export singleton instance
export const themeContext = ThemeContext.getInstance();
