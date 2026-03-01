/**
 * AssetPreviewCard Component
 *
 * Displays a progressive preview of an asset being imported.
 * Shows file type icons, thumbnails, 3D model metadata, audio waveforms,
 * progress indicators, validation status, and editable metadata fields.
 *
 * Preview Stages (displayed progressively):
 *   NONE          -> Skeleton / loading placeholder
 *   ICON          -> File type icon with category color
 *   THUMBNAIL     -> Low-res image preview
 *   FULL_PREVIEW  -> Full resolution image / 3D metadata / waveform
 *
 * @module studio/AssetPreviewCard
 */

import React, { useMemo, type CSSProperties } from 'react';
import {
  AssetCategory,
  ImportState,
  PreviewStage,
  ValidationSeverity,
  type ImportEntry,
} from './types';
import { formatFileSize, formatDuration, getCategoryLabel } from './assetUtils';

// =============================================================================
// TYPES
// =============================================================================

export interface AssetPreviewCardProps {
  /** The import entry to display */
  entry: ImportEntry;
  /** Called when the user changes the alias */
  onAliasChange?: (id: string, alias: string) => void;
  /** Called when the user clicks remove */
  onRemove?: (id: string) => void;
  /** Called when the user clicks retry */
  onRetry?: (id: string) => void;
  /** Called when the user clicks cancel */
  onCancel?: (id: string) => void;
  /** Called when the user clicks the card (selection toggle) */
  onSelect?: (id: string) => void;
  /** Whether to show the compact layout */
  compact?: boolean;
  /** Additional CSS class name */
  className?: string;
}

// =============================================================================
// CATEGORY STYLING
// =============================================================================

const categoryColors: Record<AssetCategory, string> = {
  [AssetCategory.MODEL_3D]: '#00ccff',
  [AssetCategory.TEXTURE]: '#ff8844',
  [AssetCategory.AUDIO]: '#44cc44',
  [AssetCategory.VIDEO]: '#cc44cc',
  [AssetCategory.HOLOSCRIPT]: '#ffcc00',
  [AssetCategory.CONFIG]: '#8888aa',
  [AssetCategory.UNKNOWN]: '#666666',
};

const categoryIcons: Record<AssetCategory, string> = {
  [AssetCategory.MODEL_3D]: 'M12 2L2 7v10l10 5 10-5V7L12 2z',
  [AssetCategory.TEXTURE]: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
  [AssetCategory.AUDIO]: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
  [AssetCategory.VIDEO]: 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z',
  [AssetCategory.HOLOSCRIPT]: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
  [AssetCategory.CONFIG]: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41L9.25 5.35c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  [AssetCategory.UNKNOWN]: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z',
};

// =============================================================================
// STYLES
// =============================================================================

const styles: Record<string, CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
    position: 'relative',
  },
  cardSelected: {
    borderColor: '#4488ff',
    backgroundColor: 'rgba(68, 136, 255, 0.08)',
  },
  cardError: {
    borderColor: '#ff4444',
    backgroundColor: 'rgba(255, 68, 68, 0.04)',
  },
  cardComplete: {
    borderColor: '#44cc44',
    backgroundColor: 'rgba(68, 204, 68, 0.04)',
  },
  previewArea: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/10',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  categoryBadge: {
    position: 'absolute',
    top: '6px',
    left: '6px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  stateBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
  },
  infoArea: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fileName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#ddd',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    color: '#888',
  },
  aliasInput: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    color: '#ccc',
    width: '100%',
    outline: 'none',
  },
  progressBar: {
    height: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  actions: {
    display: 'flex',
    gap: '4px',
    padding: '0 12px 10px',
  },
  actionButton: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '11px',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'background-color 0.15s ease',
  },
  modelInfo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2px',
    fontSize: '10px',
    color: '#999',
    padding: '4px 0',
  },
  waveform: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '1px',
    height: '40px',
    padding: '4px 0',
  },
  validationMsg: {
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '4px',
    margin: '2px 0',
  },
  // Compact layout styles
  cardCompact: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: '8px 12px',
    gap: '12px',
  },
  previewCompact: {
    width: '40px',
    height: '40px',
    aspectRatio: 'auto',
    borderRadius: '6px',
    flexShrink: 0,
  },
  infoCompact: {
    flex: 1,
    padding: 0,
    minWidth: 0,
  },
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function CategoryIcon({
  category,
  size = 24,
}: {
  category: AssetCategory;
  size?: number;
}) {
  const color = categoryColors[category];
  const path = categoryIcons[category];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

function ProgressBar({
  progress,
  state,
}: {
  progress: number;
  state: ImportState;
}) {
  const getColor = () => {
    switch (state) {
      case ImportState.ERROR:
        return '#ff4444';
      case ImportState.COMPLETE:
        return '#44cc44';
      case ImportState.CANCELLED:
        return '#888';
      default:
        return '#00ccff';
    }
  };

  return (
    <div style={styles.progressBar} role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div
        style={{
          ...styles.progressFill,
          width: `${progress * 100}%`,
          backgroundColor: getColor(),
        }}
      />
    </div>
  );
}

function WaveformDisplay({ waveform }: { waveform: Float32Array }) {
  const bars = useMemo(() => {
    // Downsample to ~50 bars for display
    const targetBars = 50;
    const step = Math.max(1, Math.floor(waveform.length / targetBars));
    const result: number[] = [];
    for (let i = 0; i < waveform.length; i += step) {
      result.push(waveform[i]);
    }
    return result;
  }, [waveform]);

  return (
    <div style={styles.waveform} aria-label="Audio waveform">
      {bars.map((value, i) => (
        <div
          key={i}
          style={{
            width: '2px',
            height: `${Math.max(2, value * 40)}px`,
            backgroundColor: '#44cc44',
            borderRadius: '1px',
            opacity: 0.7 + value * 0.3,
          }}
        />
      ))}
    </div>
  );
}

function ModelMetadata({ info }: { info: NonNullable<ImportEntry['preview']['modelInfo']> }) {
  return (
    <div style={styles.modelInfo}>
      <span>Vertices: {info.vertexCount.toLocaleString()}</span>
      <span>Faces: {info.faceCount.toLocaleString()}</span>
      <span>Materials: {info.materialCount}</span>
      <span>Textures: {info.textureCount}</span>
      {info.animationCount > 0 && (
        <span>Animations: {info.animationCount}</span>
      )}
      {info.hasSkinnedMeshes && <span>Skinned</span>}
      {info.hasMorphTargets && <span>Morph Targets</span>}
      <span>
        GPU: ~{formatFileSize(info.estimatedGPUMemory)}
      </span>
    </div>
  );
}

function ValidationMessages({ entry }: { entry: ImportEntry }) {
  if (!entry.validation) return null;

  const visibleMessages = entry.validation.messages.filter(
    (m) => m.severity !== ValidationSeverity.INFO,
  );

  if (visibleMessages.length === 0) return null;

  return (
    <div>
      {visibleMessages.map((msg, i) => {
        const bgColor =
          msg.severity === ValidationSeverity.ERROR
            ? 'rgba(255, 68, 68, 0.1)'
            : 'rgba(255, 170, 0, 0.1)';
        const textColor =
          msg.severity === ValidationSeverity.ERROR ? '#ff6666' : '#ffaa44';

        return (
          <div
            key={i}
            style={{ ...styles.validationMsg, backgroundColor: bgColor, color: textColor }}
            role="alert"
          >
            {msg.severity === ValidationSeverity.ERROR ? 'Error: ' : 'Warning: '}
            {msg.message}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Display card for an asset being imported.
 *
 * Shows progressive preview (icon -> thumbnail -> full), file metadata,
 * editable alias, validation messages, progress bar, and action buttons.
 *
 * @example
 * ```tsx
 * {entries.map(entry => (
 *   <AssetPreviewCard
 *     key={entry.id}
 *     entry={entry}
 *     onAliasChange={updateAlias}
 *     onRemove={removeEntry}
 *     onRetry={retryEntry}
 *     onCancel={cancelEntry}
 *     onSelect={toggleSelection}
 *   />
 * ))}
 * ```
 */
export const AssetPreviewCard = React.memo<AssetPreviewCardProps>(
  function AssetPreviewCard({
    entry,
    onAliasChange,
    onRemove,
    onRetry,
    onCancel,
    onSelect,
    compact = false,
    className,
  }) {
    const isActive =
      entry.state !== ImportState.COMPLETE &&
      entry.state !== ImportState.ERROR &&
      entry.state !== ImportState.CANCELLED &&
      entry.state !== ImportState.QUEUED;

    const stateLabel = getStateLabel(entry.state);
    const stateColor = getStateColor(entry.state);

    // -----------------------------------------------------------------------
    // Card style
    // -----------------------------------------------------------------------

    const cardStyle: CSSProperties = {
      ...styles.card,
      ...(compact ? styles.cardCompact : {}),
      ...(entry.selected ? styles.cardSelected : {}),
      ...(entry.state === ImportState.ERROR ? styles.cardError : {}),
      ...(entry.state === ImportState.COMPLETE ? styles.cardComplete : {}),
    };

    // -----------------------------------------------------------------------
    // Compact layout
    // -----------------------------------------------------------------------

    if (compact) {
      return (
        <div
          style={cardStyle}
          className={className}
          onClick={() => onSelect?.(entry.id)}
          role="listitem"
          aria-label={`Asset: ${entry.file.name}`}
          aria-selected={entry.selected}
        >
          <div style={styles.previewCompact}>
            {entry.preview.imageUrl ? (
              <img
                src={entry.preview.imageUrl}
                alt={entry.file.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '6px',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                }}
              >
                <CategoryIcon category={entry.category} size={20} />
              </div>
            )}
          </div>

          <div style={styles.infoCompact}>
            <div style={styles.fileName}>{entry.file.name}</div>
            <div style={styles.metaRow}>
              <span>{formatFileSize(entry.file.size)}</span>
              <span style={{ color: stateColor }}>{stateLabel}</span>
            </div>
          </div>

          {isActive && (
            <div style={{ width: '60px', flexShrink: 0 }}>
              <ProgressBar progress={entry.progress} state={entry.state} />
            </div>
          )}

          {onRemove && (
            <button
              style={{
                ...styles.actionButton,
                backgroundColor: 'rgba(255, 68, 68, 0.15)',
                color: '#ff6666',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(entry.id);
              }}
              aria-label={`Remove ${entry.file.name}`}
            >
              Remove
            </button>
          )}
        </div>
      );
    }

    // -----------------------------------------------------------------------
    // Full layout
    // -----------------------------------------------------------------------

    return (
      <div
        style={cardStyle}
        className={className}
        onClick={() => onSelect?.(entry.id)}
        role="listitem"
        aria-label={`Asset: ${entry.file.name}`}
        aria-selected={entry.selected}
      >
        {/* Preview area */}
        <div
          style={{
            ...styles.previewArea,
            backgroundColor: entry.preview.dominantColor
              ? `${entry.preview.dominantColor}22`
              : 'rgba(0, 0, 0, 0.3)',
          }}
        >
          {entry.preview.stage === PreviewStage.NONE && (
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                animation: 'pulse 1.5s ease infinite',
              }}
            />
          )}

          {entry.preview.stage === PreviewStage.ICON && (
            <CategoryIcon category={entry.category} size={48} />
          )}

          {(entry.preview.stage === PreviewStage.THUMBNAIL ||
            entry.preview.stage === PreviewStage.FULL_PREVIEW) &&
            entry.preview.imageUrl && (
              <img
                src={entry.preview.imageUrl}
                alt={`Preview of ${entry.file.name}`}
                style={styles.previewImage}
                loading="lazy"
              />
            )}

          {entry.preview.stage >= PreviewStage.THUMBNAIL &&
            !entry.preview.imageUrl &&
            entry.category === AssetCategory.MODEL_3D && (
              <div style={{ textAlign: 'center' }}>
                <CategoryIcon category={AssetCategory.MODEL_3D} size={36} />
                {entry.preview.modelInfo && (
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                    {entry.preview.modelInfo.vertexCount.toLocaleString()} verts
                  </div>
                )}
              </div>
            )}

          {/* Category badge */}
          <div
            style={{
              ...styles.categoryBadge,
              backgroundColor: `${categoryColors[entry.category]}22`,
              color: categoryColors[entry.category],
            }}
          >
            {getCategoryLabel(entry.category)}
          </div>

          {/* State badge */}
          {entry.state !== ImportState.QUEUED && (
            <div
              style={{
                ...styles.stateBadge,
                backgroundColor: `${stateColor}22`,
                color: stateColor,
              }}
            >
              {stateLabel}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {isActive && <ProgressBar progress={entry.progress} state={entry.state} />}

        {/* Info area */}
        <div style={styles.infoArea}>
          <div style={styles.fileName} title={entry.file.name}>
            {entry.file.name}
          </div>

          <div style={styles.metaRow}>
            <span>{formatFileSize(entry.file.size)}</span>
            <span>{entry.file.type || 'Unknown type'}</span>
          </div>

          {/* Editable alias */}
          {onAliasChange && entry.state !== ImportState.COMPLETE && (
            <input
              style={styles.aliasInput}
              value={entry.alias}
              onChange={(e) => onAliasChange(entry.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Asset alias"
              aria-label="Asset alias"
            />
          )}

          {/* Model metadata */}
          {entry.preview.modelInfo && <ModelMetadata info={entry.preview.modelInfo} />}

          {/* Audio waveform and metadata */}
          {entry.preview.audioInfo && (
            <>
              <div style={styles.metaRow}>
                <span>Duration: {formatDuration(entry.preview.audioInfo.duration)}</span>
                <span>{entry.preview.audioInfo.sampleRate} Hz</span>
                <span>{entry.preview.audioInfo.channels}ch</span>
              </div>
              {entry.preview.audioInfo.waveform && (
                <WaveformDisplay waveform={entry.preview.audioInfo.waveform} />
              )}
            </>
          )}

          {/* Validation messages */}
          <ValidationMessages entry={entry} />

          {/* Error message */}
          {entry.error && (
            <div
              style={{
                ...styles.validationMsg,
                backgroundColor: 'rgba(255, 68, 68, 0.1)',
                color: '#ff6666',
              }}
              role="alert"
            >
              {entry.error}
            </div>
          )}

          {/* Duplicate warning */}
          {entry.validation?.isDuplicate && (
            <div
              style={{
                ...styles.validationMsg,
                backgroundColor: 'rgba(255, 170, 0, 0.1)',
                color: '#ffaa44',
              }}
              role="alert"
            >
              Duplicate detected
              {entry.validation.duplicatePath && ` (${entry.validation.duplicatePath})`}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={styles.actions}>
          {entry.state === ImportState.ERROR && onRetry && (
            <button
              style={{
                ...styles.actionButton,
                backgroundColor: 'rgba(68, 136, 255, 0.15)',
                color: '#88bbff',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onRetry(entry.id);
              }}
              aria-label={`Retry importing ${entry.file.name}`}
            >
              Retry
            </button>
          )}

          {isActive && onCancel && (
            <button
              style={{
                ...styles.actionButton,
                backgroundColor: 'rgba(255, 170, 0, 0.15)',
                color: '#ffaa44',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onCancel(entry.id);
              }}
              aria-label={`Cancel importing ${entry.file.name}`}
            >
              Cancel
            </button>
          )}

          {onRemove && (
            <button
              style={{
                ...styles.actionButton,
                backgroundColor: 'rgba(255, 68, 68, 0.15)',
                color: '#ff6666',
                marginLeft: 'auto',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(entry.id);
              }}
              aria-label={`Remove ${entry.file.name}`}
            >
              Remove
            </button>
          )}
        </div>

        {/* Pulse animation for skeleton loading */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
          }
        `}</style>
      </div>
    );
  },
);

// =============================================================================
// HELPERS
// =============================================================================

function getStateLabel(state: ImportState): string {
  const labels: Record<ImportState, string> = {
    [ImportState.QUEUED]: 'Queued',
    [ImportState.VALIDATING]: 'Validating',
    [ImportState.GENERATING_PREVIEW]: 'Preview',
    [ImportState.READING]: 'Reading',
    [ImportState.OPTIMIZING]: 'Optimizing',
    [ImportState.IMPORTING]: 'Importing',
    [ImportState.COMPLETE]: 'Done',
    [ImportState.ERROR]: 'Error',
    [ImportState.CANCELLED]: 'Cancelled',
  };
  return labels[state];
}

function getStateColor(state: ImportState): string {
  const colors: Record<ImportState, string> = {
    [ImportState.QUEUED]: '#888',
    [ImportState.VALIDATING]: '#ffaa00',
    [ImportState.GENERATING_PREVIEW]: '#00ccff',
    [ImportState.READING]: '#00ccff',
    [ImportState.OPTIMIZING]: '#ffaa00',
    [ImportState.IMPORTING]: '#00ccff',
    [ImportState.COMPLETE]: '#44cc44',
    [ImportState.ERROR]: '#ff4444',
    [ImportState.CANCELLED]: '#888',
  };
  return colors[state];
}

export default AssetPreviewCard;
