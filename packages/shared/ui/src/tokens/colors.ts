/**
 * HoloScript Design Token System - Colors
 *
 * Color palette extracted from the existing HoloScript Playground IDE
 * and extended for both Web Studio and Desktop IDE contexts.
 *
 * Naming convention: semantic purpose, not visual appearance.
 * All values are CSS-compatible hex/rgba strings.
 */

// ─── Base Palette ───────────────────────────────────────────────────────────

export const palette = {
  // Neutrals (VS Code-style dark)
  black: '#000000',
  gray950: '#0f0f1a',
  gray900: '#1b1b2f',
  gray850: '#1e1e1e',
  gray800: '#252526',
  gray700: '#2d2d30',
  gray600: '#3c3c3c',
  gray500: '#555555',
  gray400: '#666666',
  gray300: '#888888',
  gray200: '#999999',
  gray150: '#aaaaaa',
  gray100: '#cccccc',
  gray50: '#dddddd',
  white: '#ffffff',

  // Brand - HoloScript gradient endpoints
  holoCyan: '#00d4ff',
  holoGold: '#ffd700',

  // Accent - VS Code Blue
  accentBlue: '#007acc',
  accentBlueDark: '#0e639c',
  accentBlueLight: '#1177bb',
  accentBlueText: '#3794ff',

  // Semantic
  successDark: '#1a7f37',
  success: '#238636',
  successLight: '#89d185',
  warningDark: '#9d8800',
  warning: '#cca700',
  errorDark: '#c72e2e',
  error: '#f14c4c',
  infoCyan: '#00d4ff',

  // Syntax highlighting (matching existing IDE)
  syntaxKeyword: '#569cd6',
  syntaxString: '#ce9178',
  syntaxNumber: '#b5cea8',
  syntaxComment: '#6a9955',
  syntaxFunction: '#dcdcaa',
  syntaxType: '#4ec9b0',
  syntaxVariable: '#9cdcfe',
  syntaxOperator: '#c586c0',
} as const;

// ─── Semantic Color Tokens ──────────────────────────────────────────────────

export interface ColorTokens {
  // Backgrounds
  bgApp: string;
  bgSurface: string;
  bgSurfaceRaised: string;
  bgSurfaceOverlay: string;
  bgInput: string;
  bgCanvas: string;

  // Borders
  borderDefault: string;
  borderSubtle: string;
  borderAccent: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  textInverse: string;
  textLink: string;

  // Interactive
  interactivePrimary: string;
  interactivePrimaryHover: string;
  interactiveSecondary: string;
  interactiveSecondaryHover: string;
  interactiveSuccess: string;
  interactiveSuccessHover: string;

  // Feedback
  feedbackInfo: string;
  feedbackSuccess: string;
  feedbackWarning: string;
  feedbackError: string;

  // Brand
  brandGradientStart: string;
  brandGradientEnd: string;

  // Scrollbar
  scrollbarThumb: string;
  scrollbarTrack: string;

  // Focus
  focusRing: string;
}

export const darkTheme: ColorTokens = {
  bgApp: palette.gray850,
  bgSurface: palette.gray800,
  bgSurfaceRaised: palette.gray700,
  bgSurfaceOverlay: 'rgba(0, 0, 0, 0.5)',
  bgInput: palette.gray600,
  bgCanvas: palette.gray950,

  borderDefault: palette.gray600,
  borderSubtle: palette.gray600,
  borderAccent: palette.accentBlue,

  textPrimary: palette.white,
  textSecondary: palette.gray100,
  textMuted: palette.gray300,
  textDisabled: palette.gray400,
  textInverse: palette.gray850,
  textLink: palette.accentBlueText,

  interactivePrimary: palette.accentBlueDark,
  interactivePrimaryHover: palette.accentBlueLight,
  interactiveSecondary: 'rgba(255, 255, 255, 0.06)',
  interactiveSecondaryHover: 'rgba(255, 255, 255, 0.12)',
  interactiveSuccess: palette.successDark,
  interactiveSuccessHover: palette.success,

  feedbackInfo: palette.accentBlueText,
  feedbackSuccess: palette.successLight,
  feedbackWarning: palette.warning,
  feedbackError: palette.error,

  brandGradientStart: palette.holoCyan,
  brandGradientEnd: palette.holoGold,

  scrollbarThumb: 'rgba(255, 255, 255, 0.15)',
  scrollbarTrack: 'transparent',

  focusRing: palette.accentBlue,
};

/** Light theme for potential future use (doc pages, marketing) */
export const lightTheme: ColorTokens = {
  bgApp: '#f5f5f5',
  bgSurface: '#ffffff',
  bgSurfaceRaised: '#fafafa',
  bgSurfaceOverlay: 'rgba(0, 0, 0, 0.3)',
  bgInput: '#e8e8e8',
  bgCanvas: '#f0f0f8',

  borderDefault: '#d4d4d4',
  borderSubtle: '#e8e8e8',
  borderAccent: palette.accentBlue,

  textPrimary: '#1e1e1e',
  textSecondary: '#333333',
  textMuted: '#666666',
  textDisabled: '#aaaaaa',
  textInverse: '#ffffff',
  textLink: '#0066cc',

  interactivePrimary: palette.accentBlue,
  interactivePrimaryHover: palette.accentBlueLight,
  interactiveSecondary: 'rgba(0, 0, 0, 0.04)',
  interactiveSecondaryHover: 'rgba(0, 0, 0, 0.08)',
  interactiveSuccess: palette.success,
  interactiveSuccessHover: '#2ea043',

  feedbackInfo: '#0066cc',
  feedbackSuccess: '#1a7f37',
  feedbackWarning: '#9a6700',
  feedbackError: '#cf222e',

  brandGradientStart: palette.holoCyan,
  brandGradientEnd: palette.holoGold,

  scrollbarThumb: 'rgba(0, 0, 0, 0.2)',
  scrollbarTrack: 'transparent',

  focusRing: palette.accentBlue,
};

export type ThemeName = 'dark' | 'light';

export const themes: Record<ThemeName, ColorTokens> = {
  dark: darkTheme,
  light: lightTheme,
};
