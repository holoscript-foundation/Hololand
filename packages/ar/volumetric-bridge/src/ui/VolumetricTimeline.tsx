/**
 * VolumetricTimeline — Volumetric Video Timeline with Keyframe Indicators
 *
 * A full-featured timeline control for volumetric video playback that shows:
 * - Playback progress scrubber
 * - Keyframe indicators (I-frames: scheduled, adaptive, seek)
 * - Frame-type strip (I/P frame visualization from the manifest)
 * - Buffered time ranges
 * - Bandwidth usage overlay
 * - Play/pause button
 * - Time display (current / total)
 *
 * Research references:
 *   W.033 - SPZ base frame format (I-frames)
 *   W.036 - 4D-MoDe temporal delta streaming (P-frames)
 *   P.030.04 - Adaptive keyframe insertion at 15% threshold
 *
 * @module volumetric-bridge/ui
 */

import {
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { VolumetricTimelineProps, TimelineKeyframe } from './types';
import type { FrameIndexEntry } from '../volumetric-video/types';

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '12px',
    color: '#e0e0e0',
    userSelect: 'none' as const,
    padding: '8px 0',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  playButton: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '1px solid #555',
    background: '#2a2a2a',
    color: '#e0e0e0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    flexShrink: 0,
    transition: 'border-color 0.15s, background 0.15s',
  },
  timeDisplay: {
    fontSize: '11px',
    fontVariantNumeric: 'tabular-nums' as const,
    color: '#999',
    minWidth: '80px',
    textAlign: 'right' as const,
    flexShrink: 0,
  },
  trackContainer: {
    flex: 1,
    position: 'relative' as const,
    height: '28px',
    cursor: 'pointer',
  },
  trackBackground: {
    position: 'absolute' as const,
    top: '10px',
    left: 0,
    right: 0,
    height: '8px',
    background: '#252525',
    borderRadius: '4px',
    overflow: 'hidden' as const,
  },
  bufferedFill: (startPct: number, widthPct: number) => ({
    position: 'absolute' as const,
    left: `${startPct}%`,
    width: `${widthPct}%`,
    height: '100%',
    background: '#383838',
  }),
  progressFill: (pct: number) => ({
    position: 'absolute' as const,
    left: 0,
    width: `${pct}%`,
    height: '100%',
    background: 'linear-gradient(90deg, #4a9eff, #00d4ff)',
    borderRadius: '4px 0 0 4px',
    transition: 'none',
  }),
  scrubHandle: (pct: number) => ({
    position: 'absolute' as const,
    left: `${pct}%`,
    top: '6px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background: '#00d4ff',
    border: '2px solid #fff',
    transform: 'translateX(-50%)',
    cursor: 'grab',
    zIndex: 10,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.5)',
    transition: 'none',
  }),
  frameStrip: {
    position: 'absolute' as const,
    top: '20px',
    left: 0,
    right: 0,
    height: '4px',
    display: 'flex',
    gap: 0,
    borderRadius: '2px',
    overflow: 'hidden' as const,
  },
  frameTick: (isKeyframe: boolean, widthPct: number) => ({
    width: `${widthPct}%`,
    height: '100%',
    background: isKeyframe ? '#ffa500' : '#2a2a2a',
    minWidth: isKeyframe ? '2px' : '0.5px',
  }),
  keyframeIndicator: (pct: number, type: TimelineKeyframe['type']) => {
    const colorMap: Record<TimelineKeyframe['type'], string> = {
      scheduled: '#ffa500', // orange for scheduled I-frames
      adaptive: '#ff4488', // pink for adaptive keyframes
      seek: '#44ff88', // green for seek keyframes
    };
    return {
      position: 'absolute' as const,
      left: `${pct}%`,
      top: '2px',
      width: '2px',
      height: '6px',
      background: colorMap[type],
      transform: 'translateX(-50%)',
      borderRadius: '1px',
      zIndex: 5,
    };
  },
  bandwidthOverlay: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '10px',
    color: '#666',
    paddingTop: '2px',
  },
  bandwidthValue: (high: boolean) => ({
    fontWeight: 600 as const,
    fontVariantNumeric: 'tabular-nums' as const,
    color: high ? '#ff6b6b' : '#888',
  }),
  legendRow: {
    display: 'flex',
    gap: '12px',
    fontSize: '9px',
    color: '#666',
    marginTop: '2px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },
  legendDot: (color: string) => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  }),
  disabled: {
    opacity: 0.5,
    pointerEvents: 'none' as const,
  },
};

// =============================================================================
// HELPERS
// =============================================================================

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatBandwidth(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${kbps} Kbps`;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Volumetric Video Timeline component.
 *
 * Renders a scrubber timeline with keyframe indicators, buffered ranges,
 * and optional frame-type strip and bandwidth display.
 *
 * Usage:
 * ```tsx
 * <VolumetricTimeline
 *   currentTime={2.5}
 *   duration={30}
 *   playbackState="playing"
 *   keyframes={keyframePositions}
 *   onSeek={(t) => player.seek(t)}
 *   onPlayPause={() => player.togglePlayPause()}
 *   showFrameStrip
 *   showBandwidth
 *   bandwidthKbps={1200}
 * />
 * ```
 */
export const VolumetricTimeline = ({
  currentTime,
  duration,
  onSeek,
  playbackState,
  onPlayPause,
  keyframes = [],
  frameIndex,
  qualityTier,
  bufferedRanges = [],
  bandwidthKbps = 0,
  disabled = false,
  showFrameStrip = false,
  showBandwidth = false,
  className,
}: VolumetricTimelineProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isPlaying = playbackState === 'playing';

  // -------------------------------------------------------------------------
  // Scrubbing logic
  // -------------------------------------------------------------------------

  const getTimeFromEvent = useCallback(
    (clientX: number): number => {
      if (!trackRef.current || duration <= 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      return pct * duration;
    },
    [duration]
  );

  const handleTrackClick = useCallback(
    (e: ReactMouseEvent) => {
      if (disabled) return;
      const time = getTimeFromEvent(e.clientX);
      onSeek(time);
    },
    [disabled, getTimeFromEvent, onSeek]
  );

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);

      const handleMouseMove = (ev: MouseEvent) => {
        const time = getTimeFromEvent(ev.clientX);
        onSeek(time);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [disabled, getTimeFromEvent, onSeek]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;
      let delta = 0;
      switch (e.key) {
        case 'ArrowRight':
          delta = 1;
          break;
        case 'ArrowLeft':
          delta = -1;
          break;
        case 'ArrowUp':
          delta = 5;
          break;
        case 'ArrowDown':
          delta = -5;
          break;
        case 'Home':
          onSeek(0);
          return;
        case 'End':
          onSeek(duration);
          return;
        case ' ':
          e.preventDefault();
          onPlayPause();
          return;
        default:
          return;
      }
      e.preventDefault();
      const newTime = Math.max(0, Math.min(duration, currentTime + delta));
      onSeek(newTime);
    },
    [disabled, currentTime, duration, onSeek, onPlayPause]
  );

  // -------------------------------------------------------------------------
  // Frame strip computation
  // -------------------------------------------------------------------------

  const frameStripData = useMemo(() => {
    if (!showFrameStrip || !frameIndex || frameIndex.length === 0) return null;
    const totalFrames = frameIndex.length;
    const tickWidth = 100 / totalFrames;
    return frameIndex.map((entry) => ({
      isKeyframe: entry.type === 'I',
      widthPct: tickWidth,
    }));
  }, [showFrameStrip, frameIndex]);

  // -------------------------------------------------------------------------
  // Keyframe positions on timeline
  // -------------------------------------------------------------------------

  const keyframePositions = useMemo(() => {
    if (duration <= 0) return [];
    return keyframes.map((kf) => ({
      ...kf,
      pct: (kf.time / duration) * 100,
    }));
  }, [keyframes, duration]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className={className}
      style={{
        ...styles.container,
        ...(disabled ? styles.disabled : {}),
      }}
      role="group"
      aria-label="Volumetric video timeline controls"
    >
      <div style={styles.controls}>
        {/* Play/Pause button */}
        <button
          style={styles.playButton}
          onClick={onPlayPause}
          disabled={disabled}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '\u275A\u275A' : '\u25B6'}
        </button>

        {/* Timeline track */}
        <div
          ref={trackRef}
          style={styles.trackContainer}
          onClick={handleTrackClick}
          onKeyDown={handleKeyDown}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          aria-label="Playback position"
          tabIndex={disabled ? -1 : 0}
        >
          {/* Track background */}
          <div style={styles.trackBackground}>
            {/* Buffered ranges */}
            {bufferedRanges.map(([start, end], i) => {
              const startPct = duration > 0 ? (start / duration) * 100 : 0;
              const widthPct = duration > 0 ? ((end - start) / duration) * 100 : 0;
              return <div key={`buf-${i}`} style={styles.bufferedFill(startPct, widthPct)} />;
            })}

            {/* Progress fill */}
            <div style={styles.progressFill(progressPct)} />
          </div>

          {/* Keyframe indicators */}
          {keyframePositions.map((kf, i) => (
            <div
              key={`kf-${kf.frameIndex}-${i}`}
              style={styles.keyframeIndicator(kf.pct, kf.type)}
              title={`${kf.type === 'scheduled' ? 'Scheduled' : kf.type === 'adaptive' ? 'Adaptive' : 'Seek'} keyframe at ${formatTime(kf.time)}`}
            />
          ))}

          {/* Frame-type strip */}
          {frameStripData && (
            <div style={styles.frameStrip}>
              {frameStripData.map((tick, i) => (
                <div key={`fs-${i}`} style={styles.frameTick(tick.isKeyframe, tick.widthPct)} />
              ))}
            </div>
          )}

          {/* Scrub handle */}
          <div
            style={styles.scrubHandle(progressPct)}
            onMouseDown={handleMouseDown}
            role="presentation"
          />
        </div>

        {/* Time display */}
        <span style={styles.timeDisplay}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Bandwidth + quality info row */}
      {(showBandwidth || qualityTier || showFrameStrip) && (
        <div style={styles.bandwidthOverlay}>
          <div style={styles.legendRow}>
            {showFrameStrip && (
              <>
                <div style={styles.legendItem}>
                  <div style={styles.legendDot('#ffa500')} />
                  <span>I-frame</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={styles.legendDot('#2a2a2a')} />
                  <span>P-frame</span>
                </div>
              </>
            )}
            {keyframes.some((kf) => kf.type === 'adaptive') && (
              <div style={styles.legendItem}>
                <div style={styles.legendDot('#ff4488')} />
                <span>Adaptive KF</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {qualityTier && (
              <span style={{ fontSize: '10px', color: '#666' }}>
                Tier:{' '}
                <span style={{ color: '#aaa', fontWeight: 600 }}>{qualityTier.toUpperCase()}</span>
              </span>
            )}
            {showBandwidth && (
              <span style={{ fontSize: '10px' }}>
                <span style={styles.bandwidthValue(bandwidthKbps > 5000)}>
                  {formatBandwidth(bandwidthKbps)}
                </span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

VolumetricTimeline.displayName = 'VolumetricTimeline';
