import { forwardRef, type HTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { spacing, size } from '../../tokens';

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Content to render on the left */
  left?: ReactNode;
  /** Content to render in the center (auto-fills space) */
  center?: ReactNode;
  /** Content to render on the right */
  right?: ReactNode;
}

/**
 * Separator element for use within Toolbar.
 */
export function ToolbarSeparator() {
  const { colors } = useTheme();
  return (
    <div
      role="separator"
      style={{
        width: '1px',
        height: '20px',
        background: colors.borderDefault,
        margin: `0 ${spacing['1']}`,
        flexShrink: 0,
      }}
    />
  );
}

/**
 * Spacer element that fills available space in a Toolbar.
 */
export function ToolbarSpacer() {
  return <div style={{ flex: 1 }} />;
}

/**
 * Brand text with the HoloScript gradient.
 */
export function ToolbarBrand({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <span
      style={{
        fontWeight: 600,
        fontSize: '14px',
        background: `linear-gradient(90deg, ${colors.brandGradientStart}, ${colors.brandGradientEnd})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginRight: spacing['2'],
      }}
    >
      {children}
    </span>
  );
}

/**
 * Toolbar matching the HoloScript IDE top toolbar.
 *
 * @example
 * ```tsx
 * <Toolbar
 *   left={<><ToolbarBrand>HoloScript</ToolbarBrand><ToolbarSeparator /></>}
 *   right={<Button variant="primary">Run</Button>}
 * />
 * ```
 */
export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  ({ left, center, right, children, style, ...props }, ref) => {
    const { colors } = useTheme();

    const containerStyle: CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: spacing['2'],
      height: size.toolbarHeight,
      padding: `0 ${spacing['3']}`,
      background: colors.bgSurface,
      borderBottom: `1px solid ${colors.borderDefault}`,
      flexShrink: 0,
      ...style,
    };

    // If children are provided, render them directly (simple mode)
    if (children) {
      return (
        <div ref={ref} role="toolbar" style={containerStyle} {...props}>
          {children}
        </div>
      );
    }

    // Structured mode with left/center/right slots
    return (
      <div ref={ref} role="toolbar" style={containerStyle} {...props}>
        {left}
        {center ? (
          <>
            <div style={{ flex: 1 }}>{center}</div>
          </>
        ) : (
          <div style={{ flex: 1 }} />
        )}
        {right}
      </div>
    );
  }
);

Toolbar.displayName = 'Toolbar';
