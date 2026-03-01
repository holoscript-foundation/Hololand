/**
 * HoloScript Design Token System - Typography
 *
 * Font families, sizes, weights, and line heights used
 * across Web Studio and Desktop IDE.
 */

export const fontFamily = {
  /** Primary UI font - used for labels, buttons, navigation */
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  /** Code editor font - used for editor, console, code snippets */
  mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
} as const;

export const fontSize = {
  /** 10px - Timestamps, micro labels */
  xs: '0.625rem',
  /** 11px - Tab labels, status bar, secondary info */
  sm: '0.6875rem',
  /** 12px - Default body text, buttons, form inputs */
  base: '0.75rem',
  /** 13px - Slightly larger body text */
  md: '0.8125rem',
  /** 14px - Prominent labels, brand text */
  lg: '0.875rem',
  /** 16px - Section headings */
  xl: '1rem',
  /** 20px - Card metric values */
  '2xl': '1.25rem',
  /** 28px - Page titles */
  '3xl': '1.75rem',
} as const;

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.6,
  loose: 1.8,
} as const;

export const letterSpacing = {
  /** For uppercase micro labels */
  wide: '0.5px',
  normal: '0px',
  tight: '-0.01em',
} as const;

/**
 * Pre-composed text styles for common use cases.
 */
export const textStyle = {
  /** Brand text (gradient) - toolbar title */
  brand: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
  },
  /** Section headings */
  heading: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
  },
  /** Default body/UI text */
  body: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  /** Buttons, tab labels */
  label: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.tight,
  },
  /** Small secondary text */
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  /** Micro text (timestamps, status) */
  micro: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase' as const,
  },
  /** Code / editor text */
  code: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.relaxed,
  },
  /** Console output */
  console: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.relaxed,
  },
} as const;
