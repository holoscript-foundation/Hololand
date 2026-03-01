/**
 * HoloScript Design Token System - Spacing
 *
 * Consistent spacing scale used across all UI components.
 * Based on a 4px grid system.
 */

export const spacing = {
  /** 0px */
  none: '0px',
  /** 2px - Hairline gaps */
  '0.5': '2px',
  /** 4px - Tight inner padding */
  '1': '4px',
  /** 6px - Icon gaps, compact padding */
  '1.5': '6px',
  /** 8px - Default inner padding */
  '2': '8px',
  /** 10px - Button padding */
  '2.5': '10px',
  /** 12px - Standard section padding */
  '3': '12px',
  /** 14px - Card padding */
  '3.5': '14px',
  /** 16px - Major section gaps */
  '4': '16px',
  /** 20px - Large gaps */
  '5': '20px',
  /** 24px - Panel padding */
  '6': '24px',
  /** 32px - Section spacing */
  '8': '32px',
} as const;

export const size = {
  /** 28px - Bottom tab bar height */
  tabBarHeight: '28px',
  /** 32px - Editor tab strip height */
  tabStripHeight: '32px',
  /** 40px - Main toolbar height */
  toolbarHeight: '40px',
  /** 24px - Status bar height */
  statusBarHeight: '24px',
  /** 280px - Side panel (AST, etc.) width */
  sidePanelWidth: '280px',
  /** 160px - Bottom panel default height */
  bottomPanelHeight: '160px',
  /** 300px - Minimum panel width */
  panelMinWidth: '300px',
  /** 4px - Resizer handle size */
  resizerSize: '4px',
} as const;

export const borderRadius = {
  none: '0px',
  /** 3px - Small elements (tags, badges) */
  sm: '3px',
  /** 4px - Buttons, inputs */
  md: '4px',
  /** 6px - Cards, panels */
  lg: '6px',
  /** 8px - Modals, dialogs */
  xl: '8px',
  /** 50% - Circles, indicators */
  full: '50%',
} as const;

export const borderWidth = {
  none: '0px',
  thin: '1px',
  medium: '2px',
  thick: '3px',
} as const;
