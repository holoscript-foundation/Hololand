import { forwardRef, type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing, transition } from '../../tokens';
import { fontFamily, fontSize } from '../../tokens/typography';

export type ButtonVariant = 'default' | 'primary' | 'success' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Full width */
  fullWidth?: boolean;
}

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: {
    padding: `${spacing['0.5']} ${spacing['2']}`,
    fontSize: fontSize.sm,
  },
  md: {
    padding: `${spacing['1']} ${spacing['2.5']}`,
    fontSize: fontSize.base,
  },
  lg: {
    padding: `${spacing['2']} ${spacing['3']}`,
    fontSize: fontSize.md,
  },
};

/**
 * Multi-variant button component matching the HoloScript IDE toolbar button styles.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleRun}>Run</Button>
 * <Button variant="success" size="sm">Deploy</Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', fullWidth = false, style, disabled, ...props }, ref) => {
    const { colors } = useTheme();

    const variantStyles: Record<ButtonVariant, CSSProperties> = {
      default: {
        background: colors.interactiveSecondary,
        border: `1px solid ${colors.borderDefault}`,
        color: colors.textSecondary,
      },
      primary: {
        background: colors.interactivePrimary,
        border: `1px solid ${colors.interactivePrimaryHover}`,
        color: colors.textPrimary,
      },
      success: {
        background: colors.interactiveSuccess,
        border: `1px solid ${colors.interactiveSuccessHover}`,
        color: colors.textPrimary,
      },
      ghost: {
        background: 'transparent',
        border: '1px solid transparent',
        color: colors.textSecondary,
      },
      danger: {
        background: colors.feedbackError,
        border: `1px solid ${colors.feedbackError}`,
        color: colors.textPrimary,
      },
    };

    const baseStyle: CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing['1.5'],
      borderRadius: borderRadius.md,
      fontFamily: fontFamily.sans,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: `all ${transition.normal}`,
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? '100%' : undefined,
      whiteSpace: 'nowrap',
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...style,
    };

    return <button ref={ref} style={baseStyle} disabled={disabled} {...props} />;
  }
);

Button.displayName = 'Button';
