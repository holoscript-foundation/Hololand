/**
 * AssetDropZone Component
 *
 * A drag-and-drop zone for importing assets into the Studio IDE.
 * Supports file drag-over detection, file type validation on hover,
 * visual state transitions, and click-to-browse fallback.
 *
 * Visual States:
 *   IDLE        -> Default appearance with upload instructions
 *   DRAG_ACTIVE -> User is dragging files over the browser window
 *   DRAG_OVER   -> Files are directly over the drop zone
 *   PROCESSING  -> Files have been dropped and are being ingested
 *   REJECTED    -> Drop was rejected (wrong types, too many files)
 *
 * @module studio/AssetDropZone
 */

import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  type DragEvent,
  type CSSProperties,
} from 'react';
import { DropZoneState, type ImportQueueConfig, DEFAULT_IMPORT_QUEUE_CONFIG } from './types';
import { getAcceptString } from './assetUtils';

// =============================================================================
// TYPES
// =============================================================================

export interface AssetDropZoneProps {
  /** Called when files are dropped or selected */
  onFilesSelected: (files: FileList | File[]) => void;

  /** Current drop zone state (can be controlled externally) */
  state?: DropZoneState;

  /** Whether the drop zone is disabled */
  disabled?: boolean;

  /** Import queue config for file acceptance rules */
  config?: Partial<ImportQueueConfig>;

  /** Whether to show the compact inline variant */
  compact?: boolean;

  /** Additional CSS class name */
  className?: string;

  /** Override styles */
  style?: CSSProperties;

  /** Children to render inside the drop zone (replaces default content) */
  children?: React.ReactNode;

  /** Label text for the drop zone */
  label?: string;

  /** Sub-label / instructions text */
  sublabel?: string;

  /** Accessible label for the drop zone region */
  ariaLabel?: string;
}

// =============================================================================
// STYLES
// =============================================================================

const baseStyles: Record<string, CSSProperties> = {
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
    borderRadius: '12px',
    border: '2px dashed',
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',
    outline: 'none',
    userSelect: 'none',
    minHeight: '200px',
  },
  containerCompact: {
    minHeight: '80px',
    padding: '16px',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '12px',
    lineHeight: 1,
  },
  iconCompact: {
    fontSize: '24px',
    marginBottom: '0',
    marginRight: '12px',
  },
  label: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '4px',
    textAlign: 'center' as const,
  },
  sublabel: {
    fontSize: '13px',
    opacity: 0.7,
    textAlign: 'center' as const,
  },
  input: {
    position: 'absolute' as const,
    width: 0,
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    pointerEvents: 'none' as const,
  },
  badge: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
  },
};

/**
 * Color themes for each drop zone state
 */
const stateThemes: Record<
  DropZoneState,
  { border: string; bg: string; text: string; iconColor: string }
> = {
  [DropZoneState.IDLE]: {
    border: '#555',
    bg: 'rgba(255, 255, 255, 0.02)',
    text: '#aaa',
    iconColor: '#666',
  },
  [DropZoneState.DRAG_ACTIVE]: {
    border: '#4488ff',
    bg: 'rgba(68, 136, 255, 0.05)',
    text: '#88bbff',
    iconColor: '#4488ff',
  },
  [DropZoneState.DRAG_OVER]: {
    border: '#00ccff',
    bg: 'rgba(0, 204, 255, 0.1)',
    text: '#00ccff',
    iconColor: '#00ccff',
  },
  [DropZoneState.PROCESSING]: {
    border: '#ffaa00',
    bg: 'rgba(255, 170, 0, 0.05)',
    text: '#ffcc44',
    iconColor: '#ffaa00',
  },
  [DropZoneState.REJECTED]: {
    border: '#ff4444',
    bg: 'rgba(255, 68, 68, 0.05)',
    text: '#ff6666',
    iconColor: '#ff4444',
  },
};

// =============================================================================
// ICON COMPONENTS (SVG, no external dependencies)
// =============================================================================

function UploadIcon({ color, size = 48 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ProcessingIcon({ color, size = 48 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M4.93 4.93l2.83 2.83" />
      <path d="M16.24 16.24l2.83 2.83" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4.93 19.07l2.83-2.83" />
      <path d="M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function RejectIcon({ color, size = 48 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Asset import drop zone with drag-and-drop support.
 *
 * @example Basic usage
 * ```tsx
 * function AssetPanel() {
 *   const { addFiles } = useAssetImport();
 *
 *   return (
 *     <AssetDropZone onFilesSelected={addFiles} />
 *   );
 * }
 * ```
 *
 * @example Compact inline variant
 * ```tsx
 * <AssetDropZone
 *   onFilesSelected={addFiles}
 *   compact
 *   label="Drop assets here"
 * />
 * ```
 *
 * @example Controlled state
 * ```tsx
 * <AssetDropZone
 *   onFilesSelected={addFiles}
 *   state={isProcessing ? DropZoneState.PROCESSING : undefined}
 * />
 * ```
 */
export const AssetDropZone = React.memo<AssetDropZoneProps>(function AssetDropZone({
  onFilesSelected,
  state: controlledState,
  disabled = false,
  config: configOverrides,
  compact = false,
  className,
  style,
  children,
  label,
  sublabel,
  ariaLabel = 'Asset import drop zone',
}) {
  const resolvedConfig = { ...DEFAULT_IMPORT_QUEUE_CONFIG, ...configOverrides };
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);
  const [internalState, setInternalState] = useState<DropZoneState>(DropZoneState.IDLE);
  const rejectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentState = controlledState ?? internalState;

  // Clean up reject timer
  useEffect(() => {
    return () => {
      if (rejectTimerRef.current) {
        clearTimeout(rejectTimerRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Window-level drag detection (DRAG_ACTIVE state)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (disabled) return;

    const handleWindowDragEnter = (e: globalThis.DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        setInternalState((prev) =>
          prev === DropZoneState.IDLE ? DropZoneState.DRAG_ACTIVE : prev,
        );
      }
    };

    const handleWindowDragLeave = (e: globalThis.DragEvent) => {
      // Only reset when leaving the window entirely
      if (
        e.clientX <= 0 ||
        e.clientY <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        setInternalState(DropZoneState.IDLE);
      }
    };

    const handleWindowDrop = () => {
      // If dropped outside the zone, reset
      setInternalState((prev) =>
        prev === DropZoneState.DRAG_ACTIVE ? DropZoneState.IDLE : prev,
      );
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [disabled]);

  // -------------------------------------------------------------------------
  // Drop zone drag handlers
  // -------------------------------------------------------------------------

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      dragCountRef.current++;
      if (e.dataTransfer?.types.includes('Files')) {
        setInternalState(DropZoneState.DRAG_OVER);
      }
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      // Set the drop effect
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      dragCountRef.current--;
      if (dragCountRef.current <= 0) {
        dragCountRef.current = 0;
        setInternalState(DropZoneState.IDLE);
      }
    },
    [],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current = 0;

      if (disabled) return;

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) {
        setInternalState(DropZoneState.REJECTED);
        rejectTimerRef.current = setTimeout(() => setInternalState(DropZoneState.IDLE), 2000);
        return;
      }

      // Quick pre-validation: check file count
      if (files.length > resolvedConfig.maxFiles) {
        setInternalState(DropZoneState.REJECTED);
        rejectTimerRef.current = setTimeout(() => setInternalState(DropZoneState.IDLE), 2000);
        return;
      }

      setInternalState(DropZoneState.PROCESSING);
      onFilesSelected(files);

      // Auto-reset to idle after a short delay
      setTimeout(() => setInternalState(DropZoneState.IDLE), 1500);
    },
    [disabled, resolvedConfig.maxFiles, onFilesSelected],
  );

  // -------------------------------------------------------------------------
  // Click to browse
  // -------------------------------------------------------------------------

  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        setInternalState(DropZoneState.PROCESSING);
        onFilesSelected(files);
        setTimeout(() => setInternalState(DropZoneState.IDLE), 1500);
      }
      // Reset the input so the same file(s) can be selected again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [onFilesSelected],
  );

  // -------------------------------------------------------------------------
  // Keyboard accessibility
  // -------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const theme = stateThemes[currentState];
  const iconSize = compact ? 24 : 48;

  const containerStyle: CSSProperties = {
    ...baseStyles.container,
    ...(compact ? baseStyles.containerCompact : {}),
    ...(compact ? { flexDirection: 'row' as const } : {}),
    borderColor: theme.border,
    backgroundColor: theme.bg,
    color: theme.text,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...style,
  };

  const renderIcon = () => {
    switch (currentState) {
      case DropZoneState.PROCESSING:
        return <ProcessingIcon color={theme.iconColor} size={iconSize} />;
      case DropZoneState.REJECTED:
        return <RejectIcon color={theme.iconColor} size={iconSize} />;
      default:
        return <UploadIcon color={theme.iconColor} size={iconSize} />;
    }
  };

  const renderLabel = () => {
    switch (currentState) {
      case DropZoneState.DRAG_ACTIVE:
        return 'Drag files to this area';
      case DropZoneState.DRAG_OVER:
        return 'Release to import';
      case DropZoneState.PROCESSING:
        return 'Processing files...';
      case DropZoneState.REJECTED:
        return 'Files rejected';
      default:
        return label ?? 'Drop assets here or click to browse';
    }
  };

  const renderSublabel = () => {
    switch (currentState) {
      case DropZoneState.DRAG_OVER:
        return 'Files will be validated and previewed';
      case DropZoneState.PROCESSING:
        return 'Generating previews and validating...';
      case DropZoneState.REJECTED:
        return 'Check file types and count limits';
      default:
        return sublabel ?? 'Supports 3D models, textures, audio, video, and HoloScript files';
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      className={className}
      style={containerStyle}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={getAcceptString(resolvedConfig)}
        style={baseStyles.input}
        onChange={handleFileInputChange}
        tabIndex={-1}
        aria-hidden="true"
      />

      {children ?? (
        <>
          <div style={compact ? baseStyles.iconCompact : baseStyles.icon}>
            {renderIcon()}
          </div>
          <div style={baseStyles.label}>{renderLabel()}</div>
          {!compact && <div style={baseStyles.sublabel}>{renderSublabel()}</div>}
        </>
      )}

      {currentState === DropZoneState.DRAG_OVER && (
        <div
          style={{
            ...baseStyles.badge,
            backgroundColor: theme.border,
            color: '#fff',
          }}
        >
          DROP
        </div>
      )}

      {/* Inject keyframes for the processing spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

export default AssetDropZone;
