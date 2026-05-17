import { useCallback, useRef, useState, useEffect } from 'react';

export type ResizeDirection = 'horizontal' | 'vertical';

export interface UseResizableOptions {
  /** Direction of resize */
  direction: ResizeDirection;
  /** Initial size in pixels */
  initialSize: number;
  /** Minimum size in pixels */
  minSize?: number;
  /** Maximum size in pixels */
  maxSize?: number;
  /** Callback when resizing */
  onResize?: (size: number) => void;
}

export interface UseResizableReturn {
  /** Current size */
  size: number;
  /** Whether currently resizing */
  isResizing: boolean;
  /** Props to spread on the resizer handle element */
  resizerProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
    role: string;
    'aria-orientation': 'horizontal' | 'vertical';
    tabIndex: number;
  };
}

/**
 * Hook for creating resizable panels (matching the HoloScript IDE resizers).
 *
 * @example
 * ```tsx
 * const { size, resizerProps } = useResizable({
 *   direction: 'horizontal',
 *   initialSize: 500,
 *   minSize: 300,
 * });
 *
 * return (
 *   <div style={{ display: 'flex' }}>
 *     <div style={{ width: size }}>Editor</div>
 *     <div {...resizerProps} />
 *     <div style={{ flex: 1 }}>Preview</div>
 *   </div>
 * );
 * ```
 */
export function useResizable({
  direction,
  initialSize,
  minSize = 100,
  maxSize = Infinity,
  onResize,
}: UseResizableOptions): UseResizableReturn {
  const [size, setSize] = useState(initialSize);
  const [isResizing, setIsResizing] = useState(false);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
      startSizeRef.current = size;
    },
    [direction, size]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPosRef.current;
      const newSize = Math.min(maxSize, Math.max(minSize, startSizeRef.current + delta));
      setSize(newSize);
      onResize?.(newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, direction, minSize, maxSize, onResize]);

  const isHorizontal = direction === 'horizontal';

  const resizerProps = {
    onMouseDown: handleMouseDown,
    style: {
      width: isHorizontal ? '4px' : '100%',
      height: isHorizontal ? '100%' : '4px',
      cursor: isHorizontal ? 'col-resize' : 'row-resize',
      background: isResizing ? '#007acc' : 'transparent',
      transition: 'background 0.2s',
      flexShrink: 0,
    } as React.CSSProperties,
    role: 'separator' as const,
    'aria-orientation': (isHorizontal ? 'vertical' : 'horizontal') as 'horizontal' | 'vertical',
    tabIndex: 0,
  };

  return { size, isResizing, resizerProps };
}
