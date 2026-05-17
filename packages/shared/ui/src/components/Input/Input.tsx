import { forwardRef, type InputHTMLAttributes, type CSSProperties } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, spacing, transition } from '../../tokens';
import { fontFamily, fontSize } from '../../tokens/typography';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Render as monospace (code input) */
  mono?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Visual error state */
  hasError?: boolean;
}

/**
 * Text input matching the HoloScript IDE input/select styling.
 *
 * @example
 * ```tsx
 * <Input placeholder="Search..." fullWidth />
 * <Input mono value={code} onChange={handleChange} />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ mono = false, fullWidth = false, hasError = false, style, ...props }, ref) => {
    const { colors } = useTheme();

    const baseStyle: CSSProperties = {
      padding: `${spacing['0.5']} ${spacing['1.5']}`,
      background: colors.bgInput,
      border: `1px solid ${hasError ? colors.feedbackError : colors.borderDefault}`,
      borderRadius: borderRadius.md,
      color: colors.textSecondary,
      fontSize: fontSize.base,
      fontFamily: mono ? fontFamily.mono : fontFamily.sans,
      outline: 'none',
      transition: `border-color ${transition.normal}`,
      width: fullWidth ? '100%' : undefined,
      ...style,
    };

    return <input ref={ref} style={baseStyle} {...props} />;
  }
);

Input.displayName = 'Input';
