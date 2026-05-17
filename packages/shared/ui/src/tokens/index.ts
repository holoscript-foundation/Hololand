/**
 * @hololand/ui - Design Token System
 *
 * Central export for all design tokens.
 * Import from '@hololand/ui/tokens' for token-only access.
 */

export { palette, darkTheme, lightTheme, themes } from './colors';
export type { ColorTokens, ThemeName } from './colors';

export {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyle,
} from './typography';

export { spacing, size, borderRadius, borderWidth } from './spacing';

export { shadow, transition, zIndex } from './shadows';
