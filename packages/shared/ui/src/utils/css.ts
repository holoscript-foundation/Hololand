/**
 * Utility functions for working with design tokens in inline styles.
 */

import type { ColorTokens } from '../tokens/colors';

/**
 * Generate a CSS gradient string from the brand colors.
 */
export function brandGradient(colors: ColorTokens, direction = '90deg'): string {
  return `linear-gradient(${direction}, ${colors.brandGradientStart}, ${colors.brandGradientEnd})`;
}

/**
 * Convert a hex color to rgba with a given alpha.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Conditionally join style objects (skips falsy values).
 */
export function mergeStyles(...styles: (React.CSSProperties | undefined | false | null)[]): React.CSSProperties {
  const result: React.CSSProperties = {};
  for (const style of styles) {
    if (style) {
      Object.assign(result, style);
    }
  }
  return result;
}
