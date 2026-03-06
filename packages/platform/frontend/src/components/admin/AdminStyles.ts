/**
 * Admin Dashboard Shared Styles
 *
 * CSS-in-JS style factory following the PostProcessingControls pattern.
 * Provides a consistent dark IDE theme across all admin panels.
 *
 * @module admin/AdminStyles
 */

import type { CSSProperties } from 'react';

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const COLORS = {
  // Base
  bg: '#0f0f19',
  bgPanel: 'rgba(15, 15, 25, 0.92)',
  bgCard: 'rgba(255, 255, 255, 0.03)',
  bgCardHover: 'rgba(255, 255, 255, 0.06)',
  bgInput: 'rgba(255, 255, 255, 0.04)',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.04)',
  borderFocus: 'rgba(99, 102, 241, 0.5)',

  // Text
  textPrimary: '#d4d4d8',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  textDim: '#52525b',

  // Accent
  accent: '#818cf8',
  accentBg: 'rgba(99, 102, 241, 0.2)',
  accentBorder: 'rgba(99, 102, 241, 0.3)',

  // Status
  success: '#4ade80',
  successBg: 'rgba(74, 222, 128, 0.15)',
  warning: '#fbbf24',
  warningBg: 'rgba(251, 191, 36, 0.15)',
  error: '#f87171',
  errorBg: 'rgba(248, 113, 113, 0.15)',
  info: '#60a5fa',
  infoBg: 'rgba(96, 165, 250, 0.15)',

  // Chart colors
  chart1: '#818cf8',
  chart2: '#34d399',
  chart3: '#fbbf24',
  chart4: '#f87171',
  chart5: '#a78bfa',
  chart6: '#22d3ee',
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const FONTS = {
  mono: '"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", monospace',
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;

// =============================================================================
// SHARED STYLES
// =============================================================================

export const adminStyles: Record<string, CSSProperties> = {
  // Layout
  panelRoot: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    lineHeight: 1.5,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.bgPanel,
    backdropFilter: 'blur(12px)',
    borderRadius: 10,
    border: `1px solid ${COLORS.border}`,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },

  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: `1px solid ${COLORS.border}`,
    flexShrink: 0,
  },

  panelTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: COLORS.textSecondary,
    margin: 0,
  },

  panelBody: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '8px 0',
  },

  // Badge
  badge: {
    fontSize: 9,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },

  badgeAccent: {
    backgroundColor: COLORS.accentBg,
    color: COLORS.accent,
  },

  badgeSuccess: {
    backgroundColor: COLORS.successBg,
    color: COLORS.success,
  },

  badgeWarning: {
    backgroundColor: COLORS.warningBg,
    color: COLORS.warning,
  },

  badgeError: {
    backgroundColor: COLORS.errorBg,
    color: COLORS.error,
  },

  badgeInfo: {
    backgroundColor: COLORS.infoBg,
    color: COLORS.info,
  },

  // Buttons
  button: {
    fontSize: 10,
    fontWeight: 600,
    fontFamily: FONTS.mono,
    padding: '5px 12px',
    borderRadius: 5,
    border: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.bgInput,
    color: COLORS.textSecondary,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },

  buttonPrimary: {
    backgroundColor: COLORS.accentBg,
    color: COLORS.accent,
    borderColor: COLORS.accentBorder,
  },

  buttonDanger: {
    backgroundColor: COLORS.errorBg,
    color: COLORS.error,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },

  buttonSuccess: {
    backgroundColor: COLORS.successBg,
    color: COLORS.success,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },

  // Inputs
  input: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    padding: '5px 10px',
    borderRadius: 5,
    border: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.bgInput,
    color: COLORS.textPrimary,
    outline: 'none',
    transition: 'border-color 0.15s ease',
    width: '100%',
    boxSizing: 'border-box',
  },

  select: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    padding: '5px 10px',
    borderRadius: 5,
    border: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.bgInput,
    color: COLORS.textPrimary,
    outline: 'none',
    cursor: 'pointer',
  },

  // Tables
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 10,
  },

  tableHeader: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: COLORS.textMuted,
    padding: '6px 12px',
    textAlign: 'left',
    borderBottom: `1px solid ${COLORS.border}`,
    position: 'sticky',
    top: 0,
    backgroundColor: COLORS.bgPanel,
    zIndex: 1,
  },

  tableCell: {
    padding: '6px 12px',
    borderBottom: `1px solid ${COLORS.borderLight}`,
    color: COLORS.textPrimary,
    whiteSpace: 'nowrap',
  },

  tableRow: {
    transition: 'background-color 0.1s ease',
    cursor: 'pointer',
  },

  tableRowHover: {
    backgroundColor: COLORS.bgCardHover,
  },

  // Cards
  card: {
    padding: '12px 16px',
    backgroundColor: COLORS.bgCard,
    borderRadius: 6,
    border: `1px solid ${COLORS.borderLight}`,
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
  },

  cardSelected: {
    backgroundColor: COLORS.accentBg,
    borderColor: COLORS.accentBorder,
  },

  // Stat card
  statCard: {
    padding: '12px 16px',
    backgroundColor: COLORS.bgCard,
    borderRadius: 6,
    border: `1px solid ${COLORS.borderLight}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },

  statLabel: {
    fontSize: 9,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: COLORS.textMuted,
  },

  statValue: {
    fontSize: 18,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    color: COLORS.textPrimary,
  },

  // Progress bar
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },

  // Toolbar
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 16px',
    borderBottom: `1px solid ${COLORS.borderLight}`,
    flexShrink: 0,
    flexWrap: 'wrap',
  },

  // Section
  section: {
    padding: '8px 16px',
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.textSecondary,
    margin: '0 0 8px 0',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    margin: '4px 16px',
  },

  // Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    color: COLORS.textMuted,
    fontSize: 10,
    gap: 8,
  },

  // Search
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    maxWidth: 280,
  },

  // Severity indicators
  severityInfo: { color: COLORS.info },
  severityWarning: { color: COLORS.warning },
  severityCritical: { color: COLORS.error },

  // Tag / Chip
  tag: {
    fontSize: 8,
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 3,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
  },
};

// =============================================================================
// CHART STYLE HELPERS
// =============================================================================

/** Returns a bar color based on usage percentage */
export function getUsageColor(percent: number): string {
  if (percent >= 90) return COLORS.error;
  if (percent >= 70) return COLORS.warning;
  return COLORS.accent;
}

/** Returns status color for FPS values */
export function getFPSColor(fps: number): string {
  if (fps >= 60) return COLORS.success;
  if (fps >= 30) return COLORS.warning;
  return COLORS.error;
}

/** Returns a chart color by index (cycles through palette) */
export function getChartColor(index: number): string {
  const palette = [
    COLORS.chart1,
    COLORS.chart2,
    COLORS.chart3,
    COLORS.chart4,
    COLORS.chart5,
    COLORS.chart6,
  ];
  return palette[index % palette.length];
}
