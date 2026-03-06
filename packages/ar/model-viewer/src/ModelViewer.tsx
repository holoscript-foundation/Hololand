/**
 * ModelViewer — React component wrapping the HTML <model> element for USDZ display
 *
 * Renders a native <model> element on visionOS Safari, with automatic fallback
 * to three.js or static image on unsupported browsers. Provides loading/error
 * states, CSS styling passthrough, and full control over the model's JS API
 * through the useModelElement hook.
 *
 * Usage:
 * ```tsx
 * <ModelViewer
 *   src="robot.usdz"
 *   alt="Industrial robot arm"
 *   interactive
 *   autoplay
 *   width={600}
 *   height={400}
 *   onLoad={() => console.log('Model loaded!')}
 * />
 * ```
 *
 * @module model-viewer/ModelViewer
 */

import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import type { ModelViewerProps, UseModelElementReturn } from './types';
import { useModelElement } from './useModelElement';
import { detectModelElementSupport } from './featureDetection';
import { FallbackRenderer } from './ModelFallback';

// ─── Default Styles ─────────────────────────────────────────────────────────

const defaultContainerStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
};

const loadingOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(26, 26, 46, 0.8)',
  color: '#ffffff',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '14px',
  zIndex: 2,
  transition: 'opacity 0.3s ease',
};

const errorOverlayStyle: React.CSSProperties = {
  ...loadingOverlayStyle,
  backgroundColor: 'rgba(40, 20, 20, 0.9)',
};

const defaultLoadingSpinner: React.CSSProperties = {
  width: '32px',
  height: '32px',
  border: '3px solid rgba(255, 255, 255, 0.2)',
  borderTopColor: '#ffffff',
  borderRadius: '50%',
  animation: 'model-viewer-spin 0.8s linear infinite',
  marginBottom: '12px',
};

// ─── ModelViewer Component ──────────────────────────────────────────────────

/**
 * ModelViewer renders a USDZ 3D model using the native HTML <model> element
 * on visionOS Safari, with automatic fallback for other browsers.
 *
 * The component manages its own loading/error state and provides a ref-based
 * imperative handle for controlling playback and entity transforms.
 *
 * Ref handle exposes the full `UseModelElementReturn` API.
 */
export const ModelViewer = forwardRef<UseModelElementReturn, ModelViewerProps>(
  function ModelViewer(
    {
      src,
      alt,
      interactive = true,
      autoplay = false,
      loop = false,
      initialAnimation,
      className,
      style,
      width = '100%',
      height = '400px',
      poster,
      fallbackSrc,
      onLoad,
      onError,
      onPlaybackChange,
      onTimeUpdate,
      onEntityChange,
      renderLoading,
      renderError,
      modelAttributes,
    },
    forwardedRef,
  ) {
    // Detect browser support
    const support = useMemo(() => detectModelElementSupport(), []);

    // Hook into the model element API
    const hookReturn = useModelElement({
      src,
      autoplay,
      initialAnimation,
      loop,
      onLoad,
      onError,
      onPlaybackChange,
      onTimeUpdate,
      onEntityChange,
    });

    const {
      ref: modelRef,
      loadingState,
      error,
      retry,
    } = hookReturn;

    // Expose the hook API via the forwarded ref
    useImperativeHandle(forwardedRef, () => hookReturn, [hookReturn]);

    // ── Render fallback for unsupported browsers ──────────────────────

    if (!support.supported) {
      return (
        <FallbackRenderer
          strategy={support.fallbackStrategy}
          src={src}
          alt={alt}
          poster={poster}
          fallbackSrc={fallbackSrc}
          width={width}
          height={height}
          className={className}
          style={style}
          onLoad={onLoad}
          onError={onError}
          renderLoading={renderLoading ? () => renderLoading() : undefined}
          renderError={renderError}
        />
      );
    }

    // ── Render native <model> element ─────────────────────────────────

    // Build the model element attributes
    const modelProps: Record<string, any> = {
      src,
      alt,
      ...(modelAttributes || {}),
    };

    // Use empty string for boolean attributes to ensure they render
    // as HTML attributes (e.g., <model interactive autoplay loop>)
    // React treats 'true' booleans specially and may drop them on
    // non-custom-element tag names (no hyphen), so we use ''.
    if (interactive) {
      modelProps.interactive = '';
    }
    if (autoplay) {
      modelProps.autoplay = '';
    }
    if (loop) {
      modelProps.loop = '';
    }

    return (
      <div
        className={className}
        style={{
          ...defaultContainerStyle,
          width,
          height,
          ...style,
        }}
        data-testid="model-viewer-container"
      >
        {/* Inject keyframes for loading spinner */}
        <style>{`
          @keyframes model-viewer-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* Native <model> element */}
        {React.createElement('model', {
          ref: modelRef,
          ...modelProps,
          style: {
            width: '100%',
            height: '100%',
            display: 'block',
          },
          'data-testid': 'model-element',
        })}

        {/* Loading overlay */}
        {loadingState === 'loading' && (
          <div
            style={{
              ...loadingOverlayStyle,
              opacity: loadingState === 'loading' ? 1 : 0,
              pointerEvents: loadingState === 'loading' ? 'auto' : 'none',
            }}
            data-testid="model-viewer-loading"
            role="status"
            aria-label={`Loading ${alt}`}
          >
            {renderLoading ? (
              renderLoading()
            ) : (
              <div style={{ textAlign: 'center' }}>
                {poster && (
                  <img
                    src={poster}
                    alt=""
                    aria-hidden="true"
                    style={{
                      maxWidth: '60%',
                      maxHeight: '40%',
                      objectFit: 'contain',
                      opacity: 0.4,
                      marginBottom: '16px',
                    }}
                  />
                )}
                <div style={defaultLoadingSpinner} aria-hidden="true" />
                <div>Loading model...</div>
              </div>
            )}
          </div>
        )}

        {/* Error overlay */}
        {loadingState === 'error' && error && (
          <div
            style={errorOverlayStyle}
            data-testid="model-viewer-error"
            role="alert"
          >
            {renderError ? (
              renderError(error, retry)
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>&#9888;</div>
                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                  Failed to load model
                </div>
                <div
                  style={{ fontSize: '12px', opacity: 0.7, marginBottom: '16px', maxWidth: '300px' }}
                >
                  {error.message}
                </div>
                <button
                  onClick={retry}
                  type="button"
                  style={{
                    backgroundColor: '#5a3a3a',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    padding: '8px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

ModelViewer.displayName = 'ModelViewer';
