import { forwardRef, type HTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { spacing, size } from '../../tokens';
import { fontFamily, fontSize } from '../../tokens/typography';

export interface StatusBarItemProps {
  /** Icon or prefix element */
  icon?: ReactNode;
  /** Text content */
  children: ReactNode;
  /** Semantic color */
  color?: 'default' | 'info' | 'success' | 'warning' | 'error';
  /** Whether this item is clickable */
  onClick?: () => void;
}

/**
 * Individual status bar item.
 */
export function StatusBarItem({ icon, children, color = 'default', onClick }: StatusBarItemProps) {
  const { colors } = useTheme();

  const colorMap: Record<string, string> = {
    default: colors.textMuted,
    info: colors.feedbackInfo,
    success: colors.feedbackSuccess,
    warning: colors.feedbackWarning,
    error: colors.feedbackError,
  };

  const itemStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing['1'],
    padding: `0 ${spacing['2']}`,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.sans,
    color: colorMap[color],
    cursor: onClick ? 'pointer' : 'default',
    whiteSpace: 'nowrap',
  };

  return (
    <span style={itemStyle} onClick={onClick} role={onClick ? 'button' : undefined}>
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
}

export interface StatusBarProps extends HTMLAttributes<HTMLDivElement> {
  /** Content on the left side */
  left?: ReactNode;
  /** Content on the right side */
  right?: ReactNode;
}

/**
 * IDE-style status bar that sits at the bottom of the layout.
 *
 * @example
 * ```tsx
 * <StatusBar
 *   left={
 *     <>
 *       <StatusBarItem icon="*" color="success">Connected</StatusBarItem>
 *       <StatusBarItem>Ln 42, Col 18</StatusBarItem>
 *     </>
 *   }
 *   right={
 *     <StatusBarItem>HoloScript v2.1</StatusBarItem>
 *   }
 * />
 * ```
 */
export const StatusBar = forwardRef<HTMLDivElement, StatusBarProps>(
  ({ left, right, children, style, ...props }, ref) => {
    const { colors } = useTheme();

    const containerStyle: CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      height: size.statusBarHeight,
      background: colors.bgSurface,
      borderTop: `1px solid ${colors.borderDefault}`,
      flexShrink: 0,
      overflow: 'hidden',
      ...style,
    };

    if (children) {
      return (
        <div ref={ref} role="status" style={containerStyle} {...props}>
          {children}
        </div>
      );
    }

    return (
      <div ref={ref} role="status" style={containerStyle} {...props}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>{left}</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>{right}</div>
      </div>
    );
  },
);

StatusBar.displayName = 'StatusBar';
