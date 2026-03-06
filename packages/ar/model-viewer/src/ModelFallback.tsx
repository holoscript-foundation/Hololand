/**
 * ModelFallback — Fallback renderers for non-visionOS browsers
 *
 * Provides two fallback strategies:
 * 1. StaticImageFallback: Renders a poster/fallback image with an optional
 *    Apple Quick Look AR link for iOS devices.
 * 2. ThreeJSFallback: Renders the USDZ model using three.js and USDZLoader
 *    with basic orbit controls.
 *
 * The appropriate fallback is selected automatically by the ModelViewer
 * component based on feature detection results.
 *
 * @module model-viewer/ModelFallback
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { FallbackStrategy } from './featureDetection';
import type { ModelError, ModelLoadingState } from './types';

// ─── Shared Styles ──────────────────────────────────────────────────────────

const containerBaseStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#1a1a2e',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  color: '#ffffff',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '14px',
  zIndex: 1,
};

// ─── Static Image Fallback ──────────────────────────────────────────────────

export interface StaticImageFallbackProps {
  /** URL of the USDZ model (for Quick Look link) */
  src: string;
  /** Alt text */
  alt: string;
  /** Poster/fallback image URL */
  poster?: string;
  /** Explicit fallback image URL (takes priority over poster) */
  fallbackSrc?: string;
  /** Container width */
  width?: string | number;
  /** Container height */
  height?: string | number;
  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Whether to show AR Quick Look link (iOS only) */
  showQuickLook?: boolean;
}

/**
 * Renders a static image fallback for browsers that don't support <model>
 * or WebGL. On iOS, optionally shows an "Open in AR" link that triggers
 * Apple Quick Look.
 */
export function StaticImageFallback({
  src,
  alt,
  poster,
  fallbackSrc,
  width = '100%',
  height = '400px',
  className,
  style,
  showQuickLook = true,
}: StaticImageFallbackProps) {
  const imageSrc = fallbackSrc || poster;

  return (
    <div
      className={className}
      style={{
        ...containerBaseStyle,
        width,
        height,
        ...style,
      }}
      role="img"
      aria-label={alt}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
      ) : (
        <div
          style={{
            color: '#888',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>&#9649;</div>
          <div style={{ fontSize: '14px' }}>3D Model</div>
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.6 }}>
            {alt}
          </div>
        </div>
      )}

      {/* Apple Quick Look AR link for iOS */}
      {showQuickLook && src.endsWith('.usdz') && (
        <a
          href={src}
          rel="ar"
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '13px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backdropFilter: 'blur(4px)',
          }}
          aria-label={`View ${alt} in augmented reality`}
        >
          <span aria-hidden="true" style={{ marginRight: '6px' }}>&#x1F4F1;</span>
          View in AR
        </a>
      )}
    </div>
  );
}

// ─── Three.js Fallback ──────────────────────────────────────────────────────

export interface ThreeJSFallbackProps {
  /** URL of the USDZ model */
  src: string;
  /** Alt text */
  alt: string;
  /** Poster image shown while loading */
  poster?: string;
  /** Container width */
  width?: string | number;
  /** Container height */
  height?: string | number;
  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Called when model loads */
  onLoad?: () => void;
  /** Called on error */
  onError?: (error: ModelError) => void;
  /** Custom loading renderer */
  renderLoading?: () => React.ReactNode;
  /** Custom error renderer */
  renderError?: (error: ModelError, retry: () => void) => React.ReactNode;
}

/**
 * Renders a USDZ model using three.js as a fallback for browsers that
 * support WebGL but not the native <model> element.
 *
 * Dynamically imports three.js and USDZLoader to avoid bundling them
 * when not needed. Shows a poster image while loading.
 *
 * Note: three.js and @three/examples must be available as peer dependencies
 * for this fallback to work.
 */
export function ThreeJSFallback({
  src,
  alt,
  poster,
  width = '100%',
  height = '400px',
  className,
  style,
  onLoad,
  onError,
  renderLoading,
  renderError,
}: ThreeJSFallbackProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [loadingState, setLoadingState] = useState<ModelLoadingState>('loading');
  const [error, setError] = useState<ModelError | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const initThreeScene = useCallback(async () => {
    const container = canvasContainerRef.current;
    if (!container) return;

    setLoadingState('loading');
    setError(null);

    try {
      // Dynamic import three.js to avoid bundling it when not needed
      const THREE = await import('three');

      // Dynamic import OrbitControls
      let OrbitControls: any;
      try {
        const controlsModule = await import('three/examples/jsm/controls/OrbitControls.js');
        OrbitControls = controlsModule.OrbitControls;
      } catch {
        // OrbitControls not available, proceed without
      }

      // Dynamic import USDZLoader
      let USDZLoader: any;
      try {
        const loaderModule = await import('three/examples/jsm/loaders/USDZLoader.js');
        USDZLoader = loaderModule.USDZLoader;
      } catch {
        throw new Error(
          'USDZLoader not available. Install three.js with examples: npm install three',
        );
      }

      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 7);
      scene.add(directionalLight);

      // Camera
      const aspect = container.clientWidth / container.clientHeight;
      const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
      camera.position.set(0, 1, 3);

      // Renderer
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      // Controls
      let controls: any;
      if (OrbitControls) {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 0.5, 0);
        controls.update();
      }

      // Load USDZ model
      const loader = new USDZLoader();
      const model = await new Promise<any>((resolve, reject) => {
        loader.load(
          src,
          (group: any) => resolve(group),
          undefined,
          (err: Error) => reject(err),
        );
      });

      // Center and scale the model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
      scene.add(model);

      // Animation loop
      let animationId: number;
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        controls?.update();
        renderer.render(scene, camera);
      };
      animate();

      // Handle resize
      const handleResize = () => {
        if (!container) return;
        const newAspect = container.clientWidth / container.clientHeight;
        camera.aspect = newAspect;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      setLoadingState('ready');
      onLoad?.();

      // Cleanup function
      cleanupRef.current = () => {
        cancelAnimationFrame(animationId);
        resizeObserver.disconnect();
        controls?.dispose();
        renderer.dispose();
        if (renderer.domElement.parentElement === container) {
          container.removeChild(renderer.domElement);
        }
        scene.traverse((obj: any) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m: any) => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
      };
    } catch (err) {
      const modelError: ModelError = {
        message: err instanceof Error ? err.message : `Failed to load model: ${src}`,
      };
      setLoadingState('error');
      setError(modelError);
      onError?.(modelError);
    }
  }, [src, onLoad, onError]);

  useEffect(() => {
    initThreeScene();

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [initThreeScene]);

  const retry = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    initThreeScene();
  }, [initThreeScene]);

  return (
    <div
      className={className}
      style={{
        ...containerBaseStyle,
        width,
        height,
        ...style,
      }}
      role="img"
      aria-label={alt}
    >
      {/* Canvas container for three.js */}
      <div
        ref={canvasContainerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />

      {/* Loading overlay */}
      {loadingState === 'loading' && (
        <div style={overlayStyle}>
          {renderLoading ? (
            renderLoading()
          ) : (
            <div style={{ textAlign: 'center' }}>
              {poster && (
                <img
                  src={poster}
                  alt={`Loading ${alt}`}
                  style={{
                    maxWidth: '80%',
                    maxHeight: '60%',
                    objectFit: 'contain',
                    opacity: 0.5,
                    marginBottom: '12px',
                  }}
                />
              )}
              <div>Loading 3D model...</div>
            </div>
          )}
        </div>
      )}

      {/* Error overlay */}
      {loadingState === 'error' && error && (
        <div style={overlayStyle}>
          {renderError ? (
            renderError(error, retry)
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                Failed to load 3D model
              </div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '12px' }}>
                {error.message}
              </div>
              <button
                onClick={retry}
                style={{
                  backgroundColor: '#4a4a8a',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
                type="button"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Fallback Selector ──────────────────────────────────────────────────────

export interface FallbackRendererProps {
  /** Detected fallback strategy */
  strategy: FallbackStrategy;
  /** URL of the USDZ model */
  src: string;
  /** Alt text */
  alt: string;
  /** Poster image */
  poster?: string;
  /** Fallback image */
  fallbackSrc?: string;
  /** Container width */
  width?: string | number;
  /** Container height */
  height?: string | number;
  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Called on load */
  onLoad?: () => void;
  /** Called on error */
  onError?: (error: ModelError) => void;
  /** Custom loading renderer */
  renderLoading?: () => React.ReactNode;
  /** Custom error renderer */
  renderError?: (error: ModelError, retry: () => void) => React.ReactNode;
}

/**
 * Renders the appropriate fallback based on the detected strategy.
 * Used internally by ModelViewer when native <model> is not supported.
 */
export function FallbackRenderer({
  strategy,
  src,
  alt,
  poster,
  fallbackSrc,
  width,
  height,
  className,
  style,
  onLoad,
  onError,
  renderLoading,
  renderError,
}: FallbackRendererProps) {
  switch (strategy) {
    case 'threejs':
      return (
        <ThreeJSFallback
          src={src}
          alt={alt}
          poster={poster}
          width={width}
          height={height}
          className={className}
          style={style}
          onLoad={onLoad}
          onError={onError}
          renderLoading={renderLoading}
          renderError={renderError}
        />
      );

    case 'quicklook':
      return (
        <StaticImageFallback
          src={src}
          alt={alt}
          poster={poster}
          fallbackSrc={fallbackSrc}
          width={width}
          height={height}
          className={className}
          style={style}
          showQuickLook={true}
        />
      );

    case 'image':
    case 'none':
    default:
      return (
        <StaticImageFallback
          src={src}
          alt={alt}
          poster={poster}
          fallbackSrc={fallbackSrc}
          width={width}
          height={height}
          className={className}
          style={style}
          showQuickLook={false}
        />
      );
  }
}
