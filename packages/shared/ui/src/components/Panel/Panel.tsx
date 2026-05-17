import { forwardRef, type HTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { spacing, borderRadius, transition } from '../../tokens';
import { fontFamily, fontSize, fontWeight, letterSpacing } from '../../tokens/typography';

export type PanelVariant = 'default' | 'raised' | 'inset';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual style */
  variant?: PanelVariant;
  /** Optional header content */
  header?: ReactNode;
  /** Header title text (shorthand for simple headers) */
  title?: string;
  /** Whether the panel is collapsible */
  collapsible?: boolean;
  /** Controlled collapsed state */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
}

/**
 * Container panel matching the HoloScript IDE panel styling
 * (editor-panel, preview-panel, bottom-panel, ast-panel).
 *
 * @example
 * ```tsx
 * <Panel title="Output" variant="default">
 *   <ConsoleOutput />
 * </Panel>
 * ```
 */
export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  (
    {
      variant = 'default',
      header,
      title,
      collapsible = false,
      collapsed = false,
      onCollapseChange,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const { colors } = useTheme();

    const variantStyles: Record<PanelVariant, CSSProperties> = {
      default: {
        background: colors.bgApp,
        border: 'none',
      },
      raised: {
        background: colors.bgSurface,
        border: `1px solid ${colors.borderDefault}`,
        borderRadius: borderRadius.lg,
      },
      inset: {
        background: colors.bgCanvas,
        border: `1px solid ${colors.borderDefault}`,
      },
    };

    const containerStyle: CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      ...variantStyles[variant],
      ...style,
    };

    const headerStyle: CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      height: '32px',
      padding: `0 ${spacing['3']}`,
      background: colors.bgSurface,
      borderBottom: `1px solid ${colors.borderDefault}`,
      flexShrink: 0,
      cursor: collapsible ? 'pointer' : undefined,
      userSelect: 'none',
    };

    const titleStyle: CSSProperties = {
      fontSize: fontSize.sm,
      fontFamily: fontFamily.sans,
      fontWeight: fontWeight.normal,
      color: colors.textMuted,
      letterSpacing: letterSpacing.wide,
      textTransform: 'uppercase',
    };

    const contentStyle: CSSProperties = {
      flex: 1,
      overflow: 'auto',
      display: collapsed ? 'none' : undefined,
      transition: `height ${transition.slow}`,
    };

    const resolvedHeader = header ?? (title ? <span style={titleStyle}>{title}</span> : null);

    return (
      <div ref={ref} style={containerStyle} {...props}>
        {resolvedHeader && (
          <div
            style={headerStyle}
            onClick={collapsible ? () => onCollapseChange?.(!collapsed) : undefined}
            role={collapsible ? 'button' : undefined}
            tabIndex={collapsible ? 0 : undefined}
            aria-expanded={collapsible ? !collapsed : undefined}
            onKeyDown={
              collapsible
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onCollapseChange?.(!collapsed);
                    }
                  }
                : undefined
            }
          >
            {collapsible && (
              <span
                style={{
                  marginRight: spacing['2'],
                  fontSize: fontSize.xs,
                  color: colors.textMuted,
                  transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: `transform ${transition.normal}`,
                  display: 'inline-block',
                }}
              >
                ▾
              </span>
            )}
            {resolvedHeader}
          </div>
        )}
        <div style={contentStyle}>{children}</div>
      </div>
    );
  }
);

Panel.displayName = 'Panel';
