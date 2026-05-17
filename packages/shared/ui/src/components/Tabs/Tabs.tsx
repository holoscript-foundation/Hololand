import {
  forwardRef,
  useState,
  useCallback,
  type HTMLAttributes,
  type CSSProperties,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { useTheme } from '../../hooks/useTheme';
import { spacing, transition } from '../../tokens';
import { fontFamily, fontSize } from '../../tokens/typography';

export interface TabItem {
  /** Unique tab identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Whether the tab can be closed */
  closable?: boolean;
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Tab items to display */
  items: TabItem[];
  /** Currently active tab ID (controlled) */
  activeId?: string;
  /** Callback when active tab changes */
  onChange?: (id: string) => void;
  /** Callback when a tab close button is clicked */
  onClose?: (id: string) => void;
  /** Visual size: 'sm' for bottom panel tabs, 'md' for editor tabs */
  size?: 'sm' | 'md';
}

/**
 * Tab strip matching the HoloScript IDE editor tabs and bottom panel tabs.
 *
 * @example
 * ```tsx
 * <Tabs
 *   items={[
 *     { id: 'main', label: 'main.holo' },
 *     { id: 'output', label: 'Output' },
 *   ]}
 *   activeId="main"
 *   onChange={setActiveTab}
 * />
 * ```
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    { items, activeId: controlledActiveId, onChange, onClose, size = 'md', style, ...props },
    ref
  ) => {
    const { colors } = useTheme();
    const [internalActiveId, setInternalActiveId] = useState(items[0]?.id ?? '');

    const activeId = controlledActiveId ?? internalActiveId;

    const handleSelect = useCallback(
      (id: string) => {
        if (onChange) {
          onChange(id);
        } else {
          setInternalActiveId(id);
        }
      },
      [onChange]
    );

    const handleKeyDown = useCallback(
      (e: KeyboardEvent, currentIndex: number) => {
        let nextIndex = currentIndex;
        if (e.key === 'ArrowRight') {
          nextIndex = (currentIndex + 1) % items.length;
        } else if (e.key === 'ArrowLeft') {
          nextIndex = (currentIndex - 1 + items.length) % items.length;
        } else if (e.key === 'Home') {
          nextIndex = 0;
        } else if (e.key === 'End') {
          nextIndex = items.length - 1;
        } else {
          return;
        }
        e.preventDefault();
        handleSelect(items[nextIndex].id);
      },
      [items, handleSelect]
    );

    const isSmall = size === 'sm';
    const tabHeight = isSmall ? '28px' : '32px';

    const containerStyle: CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      height: tabHeight,
      background: colors.bgSurface,
      borderBottom: `1px solid ${colors.borderDefault}`,
      padding: `0 ${spacing['1']}`,
      gap: spacing['0.5'],
      overflowX: 'auto',
      flexShrink: 0,
      ...style,
    };

    return (
      <div ref={ref} role="tablist" style={containerStyle} {...props}>
        {items.map((item, index) => {
          const isActive = item.id === activeId;

          const tabStyle: CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing['1'],
            padding: `${spacing['1']} ${spacing['3']}`,
            fontSize: isSmall ? fontSize.sm : fontSize.base,
            fontFamily: fontFamily.sans,
            color: isActive ? colors.textPrimary : colors.textMuted,
            borderBottom: `2px solid ${isActive ? colors.borderAccent : 'transparent'}`,
            background: isActive ? colors.bgApp : 'transparent',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: `all ${transition.normal}`,
            outline: 'none',
            border: 'none',
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
            borderBottomColor: isActive ? colors.borderAccent : 'transparent',
          };

          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              style={tabStyle}
              onClick={() => handleSelect(item.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {item.icon}
              {item.label}
              {item.closable && (
                <span
                  role="button"
                  aria-label={`Close ${item.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose?.(item.id);
                  }}
                  style={{
                    marginLeft: spacing['1'],
                    fontSize: fontSize.xs,
                    color: colors.textMuted,
                    cursor: 'pointer',
                    opacity: 0.6,
                  }}
                >
                  x
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';
