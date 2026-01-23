/**
 * @hololand/react-three - HololandCanvas Component
 *
 * Main canvas component that creates and manages HololandWorld and HololandRenderer
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { HololandWorld } from '@hololand/world';
import { HololandRenderer } from '@hololand/renderer';
// Note: setHololandRendererLogger exported for advanced usage but not used in this component
import type { RendererConfig } from '@hololand/renderer';
import type { WorldConfig } from '@hololand/world';
import { HololandContext } from './HololandContext';

export interface HololandCanvasProps {
  worldConfig?: Partial<WorldConfig>;
  rendererConfig?: Partial<RendererConfig>;
  children?: React.ReactNode;
  onWorldReady?: (world: HololandWorld) => void;
  onRendererReady?: (renderer: HololandRenderer) => void;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * HololandCanvas - Main component for Hololand VR worlds in React
 *
 * @example
 * ```tsx
 * <HololandCanvas
 *   worldConfig={{ enablePhysics: true }}
 *   rendererConfig={{ enableVR: true, enableShadows: true }}
 * >
 *   <HololandObject type="sphere" position={{ x: 0, y: 5, z: 0 }} />
 * </HololandCanvas>
 * ```
 */
export const HololandCanvas: React.FC<HololandCanvasProps> = ({
  worldConfig,
  rendererConfig,
  children,
  onWorldReady,
  onRendererReady,
  style,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [world, setWorld] = useState<HololandWorld | null>(null);
  const [renderer, setRenderer] = useState<HololandRenderer | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Create world and renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const newWorld = new HololandWorld({
      name: worldConfig?.name || 'react-world',
      bounds: worldConfig?.bounds,
      gravity: worldConfig?.gravity,
      enablePhysics: worldConfig?.enablePhysics ?? true,
      tickRate: worldConfig?.tickRate,
    });

    const newRenderer = new HololandRenderer(canvasRef.current, newWorld, {
      enableShadows: rendererConfig?.enableShadows ?? true,
      enableVR: rendererConfig?.enableVR ?? true,
      enableControls: rendererConfig?.enableControls ?? true,
      antialias: rendererConfig?.antialias ?? true,
      backgroundColor: rendererConfig?.backgroundColor,
      cameraPosition: rendererConfig?.cameraPosition,
      cameraFov: rendererConfig?.cameraFov,
    });

    newWorld.start();
    newRenderer.start();

    setWorld(newWorld);
    setRenderer(newRenderer);
    setIsReady(true);

    onWorldReady?.(newWorld);
    onRendererReady?.(newRenderer);

    // Handle resize
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        newRenderer.resize(canvas.clientWidth, canvas.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      newRenderer.stop();
      newRenderer.dispose();
      newWorld.stop();
    };
  }, []); // Only run once on mount

  // Canvas default style
  const defaultStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'block',
    ...style,
  };

  // Context value
  const contextValue = useMemo(
    () => ({ world, renderer, isReady }),
    [world, renderer, isReady]
  );

  return (
    <HololandContext.Provider value={contextValue}>
      <canvas ref={canvasRef} style={defaultStyle} className={className} />
      {isReady && children}
    </HololandContext.Provider>
  );
};
