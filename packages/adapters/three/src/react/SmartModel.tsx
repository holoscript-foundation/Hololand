/**
 * SmartModel Component
 *
 * A React Three Fiber component that renders models loaded via SmartAssetLoader.
 * Supports semantic asset aliases, animations, and automatic LOD selection.
 */

import React, { useRef, useEffect, forwardRef, useMemo, type ComponentProps } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useSmartAsset, type UseSmartAssetOptions } from './useSmartAsset';

// ============================================================================
// Types
// ============================================================================

export interface SmartModelProps extends Omit<ComponentProps<'group'>, 'ref'> {
  /** Asset alias (e.g., "tree", "bench") or full path */
  asset: string;

  /** Animation to play (by name) */
  animation?: string;

  /** Play all animations */
  playAllAnimations?: boolean;

  /** Animation options */
  animationOptions?: {
    loop?: THREE.AnimationActionLoopStyles;
    clampWhenFinished?: boolean;
    timeScale?: number;
  };

  /** Fallback component while loading */
  fallback?: React.ReactNode;

  /** Error component */
  errorFallback?: React.ReactNode | ((error: Error) => React.ReactNode);

  /** Loading options passed to useSmartAsset */
  loadingOptions?: UseSmartAssetOptions;

  /** Called when model is loaded and ready */
  onReady?: (scene: THREE.Group) => void;

  /** Called when animation starts */
  onAnimationStart?: (name: string) => void;

  /** Custom material override */
  material?: THREE.Material;

  /** Apply uniform scale */
  modelScale?: number;

  /** Enable auto-rotation for showcase */
  autoRotate?: boolean;

  /** Auto-rotation speed (radians per second) */
  autoRotateSpeed?: number;
}

// ============================================================================
// SmartModel Component
// ============================================================================

/**
 * Render a 3D model using SmartAssetLoader with semantic aliases
 *
 * @example Basic usage
 * ```tsx
 * <SmartModel asset="tree" position={[0, 0, 0]} />
 * ```
 *
 * @example With animation
 * ```tsx
 * <SmartModel
 *   asset="brittney"
 *   animation="idle"
 *   position={[0, 0, 0]}
 *   scale={1.5}
 * />
 * ```
 *
 * @example With loading fallback
 * ```tsx
 * <SmartModel
 *   asset="complex_building"
 *   fallback={<LoadingBox />}
 *   onReady={(scene) => console.log('Model loaded!', scene)}
 * />
 * ```
 *
 * @example Showcase mode with auto-rotate
 * ```tsx
 * <SmartModel
 *   asset="product"
 *   autoRotate
 *   autoRotateSpeed={0.5}
 *   modelScale={2}
 * />
 * ```
 */
export const SmartModel = forwardRef<THREE.Group, SmartModelProps>(function SmartModel(
  {
    asset,
    animation,
    playAllAnimations = false,
    animationOptions,
    fallback = null,
    errorFallback = null,
    loadingOptions,
    onReady,
    onAnimationStart,
    material,
    modelScale,
    autoRotate = false,
    autoRotateSpeed = 1,
    children,
    ...groupProps
  },
  ref
) {
  const groupRef = useRef<THREE.Group>(null);
  const {
    scene,
    animations,
    isLoading,
    error,
  } = useSmartAsset(asset, {
    ...loadingOptions,
    onLoad: (result) => {
      loadingOptions?.onLoad?.(result);
      if (result.scene) {
        onReady?.(result.scene);
      }
    },
  });

  // Clone the scene for this instance
  const clonedScene = useMemo(() => {
    if (!scene) return null;
    const clone = scene.clone();

    // Apply material override if specified
    if (material) {
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material;
        }
      });
    }

    return clone;
  }, [scene, material]);

  // Set up animations
  const { actions, mixer } = useAnimations(animations, clonedScene ?? undefined);

  // Play specified animation
  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return;

    if (playAllAnimations) {
      // Play all animations
      Object.entries(actions).forEach(([name, action]) => {
        if (action) {
          action.reset();
          if (animationOptions?.loop !== undefined) {
            action.setLoop(animationOptions.loop, Infinity);
          }
          if (animationOptions?.clampWhenFinished !== undefined) {
            action.clampWhenFinished = animationOptions.clampWhenFinished;
          }
          if (animationOptions?.timeScale !== undefined) {
            action.timeScale = animationOptions.timeScale;
          }
          action.play();
          onAnimationStart?.(name);
        }
      });
    } else if (animation && actions[animation]) {
      // Play specific animation
      const action = actions[animation];
      if (action) {
        action.reset();
        if (animationOptions?.loop !== undefined) {
          action.setLoop(animationOptions.loop, Infinity);
        }
        if (animationOptions?.clampWhenFinished !== undefined) {
          action.clampWhenFinished = animationOptions.clampWhenFinished;
        }
        if (animationOptions?.timeScale !== undefined) {
          action.timeScale = animationOptions.timeScale;
        }
        action.play();
        onAnimationStart?.(animation);
      }
    } else if (Object.keys(actions).length > 0) {
      // Play first animation as default
      const firstActionName = Object.keys(actions)[0];
      const firstAction = actions[firstActionName];
      if (firstAction) {
        firstAction.reset().play();
        onAnimationStart?.(firstActionName);
      }
    }

    return () => {
      // Stop all animations on unmount
      Object.values(actions).forEach((action) => action?.stop());
    };
  }, [actions, animation, playAllAnimations, animationOptions]);

  // Auto-rotate effect
  useFrame((state, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += autoRotateSpeed * delta;
    }
  });

  // Forward ref
  useEffect(() => {
    if (ref && groupRef.current) {
      if (typeof ref === 'function') {
        ref(groupRef.current);
      } else {
        ref.current = groupRef.current;
      }
    }
  }, [ref, clonedScene]);

  // Loading state
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Error state
  if (error) {
    if (errorFallback) {
      return (
        <>
          {typeof errorFallback === 'function' ? errorFallback(error) : errorFallback}
        </>
      );
    }
    console.error(`[SmartModel] Failed to load asset "${asset}":`, error);
    return null;
  }

  // No scene loaded
  if (!clonedScene) {
    return null;
  }

  return (
    <group ref={groupRef} {...groupProps}>
      <primitive
        object={clonedScene}
        scale={modelScale !== undefined ? [modelScale, modelScale, modelScale] : undefined}
      />
      {children}
    </group>
  );
});

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * SmartModel with a loading box placeholder
 */
export function SmartModelWithLoader({
  asset,
  loaderColor = '#00ffff',
  ...props
}: SmartModelProps & { loaderColor?: string }) {
  return (
    <SmartModel
      asset={asset}
      fallback={
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={loaderColor} wireframe />
        </mesh>
      }
      {...props}
    />
  );
}

/**
 * Multiple instances of the same SmartModel with different transforms
 */
export interface SmartModelInstancesProps {
  asset: string;
  instances: Array<{
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number] | number;
  }>;
  loadingOptions?: UseSmartAssetOptions;
}

export function SmartModelInstances({
  asset,
  instances,
  loadingOptions,
}: SmartModelInstancesProps) {
  const { scene, isLoading } = useSmartAsset(asset, loadingOptions);

  if (isLoading || !scene) {
    return null;
  }

  return (
    <>
      {instances.map((instance, index) => {
        const cloned = scene.clone();
        const scale = instance.scale;
        const scaleArray: [number, number, number] =
          typeof scale === 'number'
            ? [scale, scale, scale]
            : scale ?? [1, 1, 1];

        return (
          <primitive
            key={index}
            object={cloned}
            position={instance.position ?? [0, 0, 0]}
            rotation={instance.rotation ?? [0, 0, 0]}
            scale={scaleArray}
          />
        );
      })}
    </>
  );
}

export default SmartModel;
