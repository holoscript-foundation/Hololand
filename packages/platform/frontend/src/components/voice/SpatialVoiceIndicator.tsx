/**
 * SpatialVoiceIndicator Component
 *
 * 3D overlay component for VR/spatial view that renders:
 *   - Floating speaker icon above avatar heads showing who's talking
 *   - Distance-based opacity (fade at distance)
 *   - Directional indicator arrow showing voice direction
 *
 * Designed as an HTML overlay positioned via CSS transforms to align
 * with 3D world coordinates projected to screen space. Parent component
 * is responsible for projecting 3D positions to 2D screen coordinates
 * and passing them as SpatialSpeaker objects.
 *
 * @module voice/SpatialVoiceIndicator
 */

import React, { useMemo } from 'react';
import type { SpatialSpeaker } from './useVoice';

// ============================================================================
// Props
// ============================================================================

export interface SpatialVoiceIndicatorProps {
  /** Array of speakers with their screen-projected positions and state. */
  speakers: SpatialSpeaker[];
  /** Maximum distance at which indicator is fully visible (meters). */
  nearDistance?: number;
  /** Distance at which indicator fully fades out (meters). */
  farDistance?: number;
  /** Whether the spatial overlay is enabled. */
  enabled?: boolean;
  /** Optional CSS class name for the root overlay container. */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_NEAR_DISTANCE = 5;
const DEFAULT_FAR_DISTANCE = 50;
const MIN_OPACITY = 0.05;

// ============================================================================
// Helper: calculate opacity from distance
// ============================================================================

function calculateOpacity(
  distance: number,
  nearDist: number,
  farDist: number,
): number {
  if (distance <= nearDist) return 1.0;
  if (distance >= farDist) return MIN_OPACITY;
  // Linear fade between near and far
  const t = (distance - nearDist) / (farDist - nearDist);
  return 1.0 - t * (1.0 - MIN_OPACITY);
}

// ============================================================================
// Speaker Indicator (individual floating element)
// ============================================================================

function SpeakerIndicator({
  speaker,
  nearDistance,
  farDistance,
}: {
  speaker: SpatialSpeaker;
  nearDistance: number;
  farDistance: number;
}) {
  const opacity = useMemo(
    () => calculateOpacity(speaker.distance, nearDistance, farDistance),
    [speaker.distance, nearDistance, farDistance],
  );

  // Scale down with distance (but never below 0.5)
  const scale = useMemo(() => {
    const t = Math.min(1, speaker.distance / farDistance);
    return Math.max(0.5, 1 - t * 0.5);
  }, [speaker.distance, farDistance]);

  // Direction arrow rotation (convert radians to degrees)
  const arrowRotation = useMemo(
    () => (speaker.direction * 180) / Math.PI,
    [speaker.direction],
  );

  // Don't render fully faded indicators
  if (opacity <= MIN_OPACITY) return null;

  return (
    <div
      className="absolute pointer-events-none flex flex-col items-center"
      style={{
        left: speaker.position.x,
        top: speaker.position.y,
        transform: `translate(-50%, -100%) scale(${scale})`,
        opacity,
        transition: 'opacity 0.15s ease, transform 0.15s ease',
      }}
      role="status"
      aria-label={`${speaker.displayName} is ${speaker.isSpeaking ? 'speaking' : 'silent'}, ${Math.round(speaker.distance)} meters away`}
    >
      {/* Direction arrow */}
      <div
        className="mb-0.5"
        style={{ transform: `rotate(${arrowRotation}deg)` }}
        aria-hidden="true"
      >
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
          <path
            d="M6 0L11 8H1L6 0Z"
            fill={speaker.isSpeaking ? '#4ade80' : '#6b7280'}
            fillOpacity={0.8}
          />
        </svg>
      </div>

      {/* Speaker icon bubble */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm border transition-colors ${
          speaker.isSpeaking
            ? 'bg-green-900/70 border-green-400/50 shadow-[0_0_12px_rgba(74,222,128,0.3)]'
            : 'bg-neutral-900/60 border-neutral-600/40'
        }`}
      >
        {/* Animated speaker waves when talking */}
        <SpeakerWaveIcon
          isSpeaking={speaker.isSpeaking}
          className="w-3.5 h-3.5"
        />

        {/* Display name */}
        <span
          className={`text-xs font-medium whitespace-nowrap max-w-[80px] truncate ${
            speaker.isSpeaking ? 'text-green-300' : 'text-neutral-400'
          }`}
        >
          {speaker.displayName}
        </span>
      </div>

      {/* Distance label */}
      <span
        className="text-[10px] text-neutral-500 mt-0.5"
        aria-hidden="true"
      >
        {speaker.distance < 1
          ? '<1m'
          : `${Math.round(speaker.distance)}m`}
      </span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SpatialVoiceIndicator({
  speakers,
  nearDistance = DEFAULT_NEAR_DISTANCE,
  farDistance = DEFAULT_FAR_DISTANCE,
  enabled = true,
  className = '',
}: SpatialVoiceIndicatorProps) {
  // Only render speaking participants or recently-speaking ones
  const visibleSpeakers = useMemo(
    () => speakers.filter((s) => s.distance < farDistance),
    [speakers, farDistance],
  );

  if (!enabled || visibleSpeakers.length === 0) return null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-50 ${className}`}
      role="group"
      aria-label="Spatial voice indicators"
    >
      {visibleSpeakers.map((speaker) => (
        <SpeakerIndicator
          key={speaker.participantId}
          speaker={speaker}
          nearDistance={nearDistance}
          farDistance={farDistance}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Inline SVG Icons
// ============================================================================

function SpeakerWaveIcon({
  isSpeaking,
  className = '',
}: {
  isSpeaking: boolean;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke={isSpeaking ? '#4ade80' : '#6b7280'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Speaker body */}
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      {/* Sound waves - animate when speaking */}
      <path
        d="M15.54 8.46a5 5 0 0 1 0 7.07"
        className={isSpeaking ? 'animate-pulse' : ''}
        strokeOpacity={isSpeaking ? 1 : 0.3}
      />
      <path
        d="M19.07 4.93a10 10 0 0 1 0 14.14"
        className={isSpeaking ? 'animate-pulse' : ''}
        strokeOpacity={isSpeaking ? 0.7 : 0.15}
        style={isSpeaking ? { animationDelay: '0.15s' } : undefined}
      />
    </svg>
  );
}
