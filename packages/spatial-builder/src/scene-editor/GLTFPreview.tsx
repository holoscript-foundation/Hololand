/**
 * @hololand/spatial-builder - GLTFPreview
 *
 * Inline 3D preview component for GLTF/GLB assets.
 * Uses Three.js GLTFLoader to load models from Object URLs and renders
 * them in a small R3F Canvas with auto-framing and auto-rotation.
 *
 * Features:
 * - Loads GLTF/GLB from blob/object URLs
 * - Auto-computes bounding box and centers + scales the model to fit
 * - Auto-rotation orbit for visual inspection
 * - Loading spinner and error states
 * - Reports triangle count and bounding box via onLoad callback
 */

import React, { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Vec3 } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface GLTFPreviewProps {
  /** Object URL or blob URL pointing to the GLTF/GLB file */
  url: string;
  /** Width of the preview canvas in pixels */
  width?: number;
  /** Height of the preview canvas in pixels */
  height?: number;
  /** Called when the model loads successfully with metadata */
  onLoad?: (meta: {
    triangleCount: number;
    boundingBox: { min: Vec3; max: Vec3 };
  }) => void;
  /** Called when loading fails */
  onError?: (error: Error) => void;
  /** Whether to auto-rotate the preview */
  autoRotate?: boolean;
  /** Optional CSS class */
  className?: string;
}

// =============================================================================
// MODEL LOADER HOOK
// =============================================================================

interface LoadedModel {
  scene: THREE.Group;
  triangleCount: number;
  boundingBox: { min: Vec3; max: Vec3 };
}

function useGLTFLoader(url: string): {
  model: LoadedModel | null;
  loading: boolean;
  error: Error | null;
} {
  const [model, setModel] = useState<LoadedModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setModel(null);

    const loader = new GLTFLoader();

    loader.load(
      url,
      (gltf) => {
        // Compute bounding box
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const min = box.min;
        const max = box.max;

        // Count triangles
        let triangleCount = 0;
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry) {
            const geo = child.geometry;
            if (geo.index) {
              triangleCount += geo.index.count / 3;
            } else if (geo.attributes.position) {
              triangleCount += geo.attributes.position.count / 3;
            }
          }
        });

        setModel({
          scene: gltf.scene,
          triangleCount: Math.round(triangleCount),
          boundingBox: {
            min: { x: min.x, y: min.y, z: min.z },
            max: { x: max.x, y: max.y, z: max.z },
          },
        });
        setLoading(false);
      },
      undefined, // progress callback (unused)
      (err) => {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setLoading(false);
      },
    );

    return () => {
      // Cleanup: dispose of the loaded scene's geometries and materials
      if (model?.scene) {
        model.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else if (child.material) {
              child.material.dispose();
            }
          }
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { model, loading, error };
}

// =============================================================================
// AUTO-ROTATING GROUP
// =============================================================================

function AutoRotateGroup({
  children,
  enabled,
}: {
  children: React.ReactNode;
  enabled: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (enabled && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

// =============================================================================
// MODEL RENDERER (inside Canvas)
// =============================================================================

function ModelScene({
  url,
  autoRotate,
  onLoad,
  onError,
}: {
  url: string;
  autoRotate: boolean;
  onLoad?: GLTFPreviewProps['onLoad'];
  onError?: GLTFPreviewProps['onError'];
}) {
  const { model, loading, error } = useGLTFLoader(url);
  const hasNotified = useRef(false);

  // Notify parent of load/error
  useEffect(() => {
    if (model && onLoad && !hasNotified.current) {
      hasNotified.current = true;
      onLoad({
        triangleCount: model.triangleCount,
        boundingBox: model.boundingBox,
      });
    }
  }, [model, onLoad]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Auto-frame: center and scale the model to fit a unit sphere
  const { centeredScene, scaleFactor } = useMemo(() => {
    if (!model) return { centeredScene: null, scaleFactor: 1 };

    const scene = model.scene.clone(true);
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 1.5 / maxDim : 1;

    // Center the model
    scene.position.sub(center);

    return { centeredScene: scene, scaleFactor: scale };
  }, [model]);

  if (loading || !centeredScene) {
    // Show a spinning wireframe cube as loading indicator
    return (
      <AutoRotateGroup enabled>
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial color="#6366f1" wireframe />
        </mesh>
      </AutoRotateGroup>
    );
  }

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 3]} intensity={0.8} />
      <directionalLight position={[-2, 2, -3]} intensity={0.3} />

      {/* Model */}
      <AutoRotateGroup enabled={autoRotate}>
        <group scale={[scaleFactor, scaleFactor, scaleFactor]}>
          <primitive object={centeredScene} />
        </group>
      </AutoRotateGroup>
    </>
  );
}

// =============================================================================
// LOADING SPINNER (DOM overlay)
// =============================================================================

function LoadingOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          border: '2px solid rgba(99, 102, 241, 0.3)',
          borderTop: '2px solid #6366f1',
          borderRadius: '50%',
          animation: 'gltf-preview-spin 0.8s linear infinite',
        }}
      />
      <style>{`
        @keyframes gltf-preview-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// GLTFPreview COMPONENT
// =============================================================================

/**
 * GLTFPreview
 *
 * Renders a small inline 3D preview of a GLTF/GLB model loaded from
 * an Object URL. Auto-frames the model and optionally auto-rotates.
 * Reports triangle count and bounding box to parent via onLoad callback.
 */
export const GLTFPreview: React.FC<GLTFPreviewProps> = ({
  url,
  width = 120,
  height = 120,
  onLoad,
  onError,
  autoRotate = true,
  className,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad: GLTFPreviewProps['onLoad'] = (meta) => {
    setIsLoading(false);
    onLoad?.(meta);
  };

  const handleError = (error: Error) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(error);
  };

  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#1a1a2e',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {hasError ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 4,
            padding: 8,
          }}
        >
          <span style={{ fontSize: 20 }}>!</span>
          <span
            style={{
              fontSize: 9,
              color: 'rgba(255, 255, 255, 0.4)',
              textAlign: 'center',
            }}
          >
            Failed to load
          </span>
        </div>
      ) : (
        <>
          <Canvas
            camera={{
              position: [2, 1.5, 2],
              fov: 40,
              near: 0.01,
              far: 100,
            }}
            gl={{ antialias: true, alpha: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <Suspense fallback={null}>
              <ModelScene
                url={url}
                autoRotate={autoRotate}
                onLoad={handleLoad}
                onError={handleError}
              />
            </Suspense>
          </Canvas>
          {isLoading && <LoadingOverlay />}
        </>
      )}
    </div>
  );
};
