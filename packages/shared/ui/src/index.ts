/**
 * @hololand/ui - Shared React/TypeScript UI Component Library
 *
 * Provides design tokens, themed components, and Monaco Editor integration
 * for both the HoloScript Web Studio (browser) and Desktop IDE (Electron/Tauri).
 *
 * @example
 * ```tsx
 * import { ThemeProvider, Button, Toolbar, MonacoEditor } from '@hololand/ui';
 * import { darkTheme, spacing } from '@hololand/ui/tokens';
 * ```
 */

// ─── Design Tokens ──────────────────────────────────────────────────────────
export {
  palette,
  darkTheme,
  lightTheme,
  themes,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyle,
  spacing,
  size,
  borderRadius,
  borderWidth,
  shadow,
  transition,
  zIndex,
} from './tokens';
export type { ColorTokens, ThemeName } from './tokens';

// ─── Theme Provider & Hooks ─────────────────────────────────────────────────
export { ThemeProvider, useTheme, useResizable } from './hooks';
export type {
  ThemeContextValue,
  ThemeProviderProps,
  UseResizableOptions,
  UseResizableReturn,
  ResizeDirection,
} from './hooks';

// ─── Components ─────────────────────────────────────────────────────────────
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';

export { Input } from './components/Input';
export type { InputProps } from './components/Input';

export { Panel } from './components/Panel';
export type { PanelProps, PanelVariant } from './components/Panel';

export { Toolbar, ToolbarSeparator, ToolbarSpacer, ToolbarBrand } from './components/Toolbar';
export type { ToolbarProps } from './components/Toolbar';

export { StatusBar, StatusBarItem } from './components/StatusBar';
export type { StatusBarProps, StatusBarItemProps } from './components/StatusBar';

export { Tabs } from './components/Tabs';
export type { TabsProps, TabItem } from './components/Tabs';

// ─── Monaco Editor ──────────────────────────────────────────────────────────
export { MonacoEditor } from './components/MonacoEditor';
export type { MonacoEditorProps, MonacoEditorRef } from './components/MonacoEditor';
export {
  getEditorConfig,
  mergeEditorConfig,
  webStudioConfig,
  desktopIdeConfig,
} from './components/MonacoEditor';
export type { EditorContext, HoloEditorConfig } from './components/MonacoEditor';

// ─── Utilities ──────────────────────────────────────────────────────────────
export { brandGradient, hexToRgba, mergeStyles } from './utils';
