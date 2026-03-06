/**
 * ModelGallery — Composite component for browsing multiple USDZ models
 *
 * Displays a grid of ModelViewer components with optional titles/captions,
 * selection state, and lazy loading for models outside the viewport.
 *
 * Usage:
 * ```tsx
 * <ModelGallery
 *   models={[
 *     { id: '1', src: 'robot.usdz', alt: 'Robot', title: 'Industrial Robot' },
 *     { id: '2', src: 'car.usdz', alt: 'Car', title: 'Sports Car' },
 *     { id: '3', src: 'chair.usdz', alt: 'Chair', title: 'Office Chair' },
 *   ]}
 *   columns={3}
 *   onSelect={(index, model) => console.log('Selected:', model.title)}
 * />
 * ```
 *
 * @module model-viewer/ModelGallery
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { ModelGalleryProps, ModelGalleryItem } from './types';
import { ModelViewer } from './ModelViewer';

// ─── Gallery Styles ─────────────────────────────────────────────────────────

const galleryContainerStyle: React.CSSProperties = {
  display: 'grid',
  width: '100%',
};

const galleryItemStyle: React.CSSProperties = {
  position: 'relative',
  cursor: 'pointer',
  borderRadius: '8px',
  overflow: 'hidden',
  border: '2px solid transparent',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  backgroundColor: '#1a1a2e',
};

const galleryItemSelectedStyle: React.CSSProperties = {
  borderColor: '#4a8af4',
  boxShadow: '0 0 0 1px rgba(74, 138, 244, 0.3)',
};

const galleryItemHoverStyle: React.CSSProperties = {
  borderColor: 'rgba(74, 138, 244, 0.5)',
};

const captionStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(4px)',
};

const captionTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '2px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const captionDescStyle: React.CSSProperties = {
  fontSize: '12px',
  opacity: 0.7,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

// ─── Lazy Load Observer Hook ────────────────────────────────────────────────

/**
 * Hook that returns whether an element is visible in the viewport.
 * Used for lazy loading models that are not currently on screen.
 */
function useIntersectionObserver(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
): boolean {
  const [isVisible, setIsVisible] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    // Check if IntersectionObserver is available (not in all jsdom envs)
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, stop observing (load once)
          observer.unobserve(element);
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, enabled]);

  return isVisible;
}

// ─── Gallery Item ───────────────────────────────────────────────────────────

interface GalleryItemProps {
  model: ModelGalleryItem;
  index: number;
  isSelected: boolean;
  showCaption: boolean;
  lazyLoad: boolean;
  itemWidth: string | number;
  itemHeight: string | number;
  viewerProps?: Partial<Omit<import('./types').ModelViewerProps, 'src' | 'alt'>>;
  onSelect: (index: number, model: ModelGalleryItem) => void;
}

function GalleryItem({
  model,
  index,
  isSelected,
  showCaption,
  lazyLoad,
  itemWidth,
  itemHeight,
  viewerProps,
  onSelect,
}: GalleryItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isVisible = useIntersectionObserver(itemRef, lazyLoad);

  const handleClick = useCallback(() => {
    onSelect(index, model);
  }, [index, model, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(index, model);
      }
    },
    [index, model, onSelect],
  );

  const itemStyles = useMemo(
    () => ({
      ...galleryItemStyle,
      ...(isSelected ? galleryItemSelectedStyle : {}),
      ...(isHovered && !isSelected ? galleryItemHoverStyle : {}),
    }),
    [isSelected, isHovered],
  );

  return (
    <div
      ref={itemRef}
      style={itemStyles}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={model.title || model.alt}
      data-testid={`gallery-item-${index}`}
    >
      {isVisible ? (
        <ModelViewer
          src={model.src}
          alt={model.alt}
          poster={model.poster}
          fallbackSrc={model.fallbackSrc}
          width={itemWidth}
          height={itemHeight}
          {...viewerProps}
        />
      ) : (
        <div
          style={{
            width: itemWidth,
            height: itemHeight,
            backgroundColor: '#1a1a2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#555',
            fontSize: '12px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          aria-label={`${model.alt} (loading)`}
        >
          {model.poster ? (
            <img
              src={model.poster}
              alt={model.alt}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                opacity: 0.4,
              }}
              loading="lazy"
            />
          ) : (
            <span>Scroll to load</span>
          )}
        </div>
      )}

      {/* Caption */}
      {showCaption && (model.title || model.description) && (
        <div style={captionStyle}>
          {model.title && <div style={captionTitleStyle}>{model.title}</div>}
          {model.description && <div style={captionDescStyle}>{model.description}</div>}
        </div>
      )}
    </div>
  );
}

// ─── ModelGallery Component ─────────────────────────────────────────────────

/**
 * ModelGallery displays a grid of USDZ models with selection state,
 * captions, and lazy loading.
 */
export function ModelGallery({
  models,
  className,
  style,
  columns = 3,
  gap = 16,
  itemWidth = '100%',
  itemHeight = '300px',
  selectedIndex: controlledSelectedIndex,
  onSelect,
  showCaptions = true,
  lazyLoad = true,
  viewerProps,
}: ModelGalleryProps) {
  // Support both controlled and uncontrolled selection
  const [internalSelectedIndex, setInternalSelectedIndex] = useState(-1);
  const selectedIndex =
    controlledSelectedIndex !== undefined ? controlledSelectedIndex : internalSelectedIndex;

  const handleSelect = useCallback(
    (index: number, model: ModelGalleryItem) => {
      if (controlledSelectedIndex === undefined) {
        setInternalSelectedIndex(index);
      }
      onSelect?.(index, model);
    },
    [controlledSelectedIndex, onSelect],
  );

  if (models.length === 0) {
    return (
      <div
        className={className}
        style={{
          ...style,
          textAlign: 'center',
          padding: '40px 20px',
          color: '#888',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        role="status"
        data-testid="gallery-empty"
      >
        No models to display
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        ...galleryContainerStyle,
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
        ...style,
      }}
      role="group"
      aria-label={`Model gallery with ${models.length} items`}
      data-testid="model-gallery"
    >
      {models.map((model, index) => (
        <GalleryItem
          key={model.id}
          model={model}
          index={index}
          isSelected={index === selectedIndex}
          showCaption={showCaptions}
          lazyLoad={lazyLoad}
          itemWidth={itemWidth}
          itemHeight={itemHeight}
          viewerProps={viewerProps}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}

ModelGallery.displayName = 'ModelGallery';
