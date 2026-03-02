/**
 * useVolumetricTimeline — React hook for volumetric video playback controls
 *
 * Bridges the React UI with VolumetricVideoPlayer, providing timeline state,
 * keyframe positions, quality tier control, and bandwidth monitoring.
 *
 * @module volumetric-bridge/ui/hooks
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { VolumetricVideoPlayer } from '../../volumetric-video/VolumetricVideoPlayer';
import type {
  VolumetricQualityTier,
  PlaybackState,
  PlayerStatus,
  VolumetricVideoEvent,
} from '../../volumetric-video/types';
import type {
  TimelineKeyframe,
  VolumetricTimelineState,
} from '../types';

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseVolumetricTimelineOptions {
  /** Reference to the VolumetricVideoPlayer instance */
  player: VolumetricVideoPlayer | null;
  /** Polling interval for status updates in ms (default: 100) */
  pollInterval?: number;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * React hook for managing volumetric video timeline state.
 *
 * Provides declarative access to:
 * - Current time, duration, and playback state
 * - Keyframe indicator positions (scheduled, adaptive, seek)
 * - Quality tier selection and adaptive quality control
 * - Bandwidth usage tracking
 * - Buffered time ranges
 *
 * Usage:
 * ```tsx
 * const timeline = useVolumetricTimeline({ player });
 *
 * return (
 *   <VolumetricTimeline
 *     currentTime={timeline.currentTime}
 *     duration={timeline.duration}
 *     playbackState={timeline.playbackState}
 *     keyframes={timeline.keyframes}
 *     onSeek={timeline.seek}
 *     onPlayPause={timeline.togglePlayPause}
 *     qualityTier={timeline.qualityTier}
 *     bandwidthKbps={timeline.bandwidthKbps}
 *   />
 * );
 * ```
 */
export function useVolumetricTimeline(
  options: UseVolumetricTimelineOptions,
): VolumetricTimelineState {
  const { player, pollInterval = 100 } = options;

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [keyframes, setKeyframes] = useState<TimelineKeyframe[]>([]);
  const [bufferedRanges, setBufferedRanges] = useState<Array<[number, number]>>([]);
  const [bandwidthKbps, setBandwidthKbps] = useState(0);
  const [qualityTier, setQualityTierState] = useState<VolumetricQualityTier>('mid');
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus | null>(null);

  // Bandwidth tracking
  const bytesReceivedRef = useRef(0);
  const lastBandwidthCheckRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // -------------------------------------------------------------------------
  // Event subscription
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!player) return;

    const unsub = player.on((event: VolumetricVideoEvent) => {
      switch (event.type) {
        case 'state-change':
          setPlaybackState(event.state);
          break;

        case 'progress':
          setCurrentTime(event.currentTime);
          setDuration(event.duration);
          break;

        case 'manifest-loaded':
          setDuration(event.manifest.duration);
          // Extract keyframe positions from manifest
          const kfPositions: TimelineKeyframe[] = event.manifest.frameIndex
            .filter((f) => f.type === 'I')
            .map((f) => ({
              frameIndex: f.index,
              time: f.timestamp,
              type: 'scheduled' as const,
              active: false,
            }));
          setKeyframes(kfPositions);
          break;

        case 'keyframe-inserted':
          setKeyframes((prev) => {
            // Mark all as inactive, add new keyframe
            const updated = prev.map((kf) => ({ ...kf, active: false }));
            updated.push({
              frameIndex: event.frameIndex,
              time: event.frameIndex / 30, // Approximate; ideally from manifest
              type: event.reason,
              active: true,
            });
            return updated;
          });
          break;

        case 'quality-change':
          setQualityTierState(event.tier);
          break;

        case 'buffer-update':
          // Convert buffer health to time ranges (simplified)
          // In a full implementation, this would track actual byte ranges
          const currentT = player.getCurrentTime();
          const bufferSeconds = (event.bufferedFrames / 30) * 1; // Approximate
          setBufferedRanges([[0, currentT + bufferSeconds]]);
          break;

        case 'frame-rendered':
          // Track bytes for bandwidth estimation
          bytesReceivedRef.current += 1000; // Approximate per-frame
          break;

        default:
          break;
      }
    });

    unsubRef.current = unsub;

    return () => {
      unsub();
      unsubRef.current = null;
    };
  }, [player]);

  // -------------------------------------------------------------------------
  // Polling for status updates
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!player) return;

    pollRef.current = setInterval(() => {
      const status = player.getStatus();
      setPlayerStatus(status);
      setCurrentTime(status.currentTime);
      setDuration(status.duration);
      setPlaybackState(status.state);
      setQualityTierState(status.qualityTier);

      // Bandwidth calculation
      const now = performance.now();
      if (lastBandwidthCheckRef.current > 0) {
        const dt = (now - lastBandwidthCheckRef.current) / 1000; // seconds
        if (dt > 0) {
          const kbps = (bytesReceivedRef.current * 8) / (dt * 1000);
          setBandwidthKbps(Math.round(kbps));
          bytesReceivedRef.current = 0;
        }
      }
      lastBandwidthCheckRef.current = now;
    }, pollInterval);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [player, pollInterval]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const togglePlayPause = useCallback(() => {
    if (!player) return;
    const state = player.getState();
    if (state === 'playing') {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const seek = useCallback(
    (time: number) => {
      if (!player) return;
      player.seek(time);
    },
    [player],
  );

  const setQualityTier = useCallback(
    (tier: VolumetricQualityTier) => {
      if (!player) return;
      player.setQualityTier(tier);
      setQualityTierState(tier);
    },
    [player],
  );

  const setAdaptiveQuality = useCallback(
    (enabled: boolean) => {
      if (!player) return;
      player.setAdaptiveQuality(enabled);
    },
    [player],
  );

  // -------------------------------------------------------------------------
  // Return state
  // -------------------------------------------------------------------------

  return {
    currentTime,
    duration,
    playbackState,
    keyframes,
    bufferedRanges,
    bandwidthKbps,
    qualityTier,
    playerStatus,
    togglePlayPause,
    seek,
    setQualityTier,
    setAdaptiveQuality,
  };
}
