'use client';

/**
 * RemixButton Component
 *
 * One-click fork button that appears on any published world card or asset card.
 *
 * Features:
 *   - Remix/fork icon with "Remix" label
 *   - Click triggers RemixService.forkScene() or RemixService.forkAsset()
 *   - Loading spinner during fork operation
 *   - Success redirects to Creator Studio with forked content
 *   - Remix count badge (e.g., "42 remixes")
 *   - Compact variant for card overlays
 *   - Full variant for detail pages
 *
 * Wires to RemixService backend via remixApi.
 *
 * @module remix/RemixButton
 */

import { useState, useCallback } from 'react';
import { remixAPI, type ForkResponse } from './remixApi';

// ============================================================================
// Props
// ============================================================================

export interface RemixButtonProps {
  /** Type of content being remixed */
  type: 'scene' | 'asset';
  /** The source world or asset ID to fork */
  sourceId: string;
  /** Title for the new remix (pre-filled, user can change later in studio) */
  defaultTitle?: string;
  /** Number of existing remixes to display as badge */
  remixCount?: number;
  /** Compact variant for card overlays, full variant for detail pages */
  variant?: 'compact' | 'full';
  /** Disabled state (e.g., user owns this world) */
  disabled?: boolean;
  /** Tooltip when disabled */
  disabledReason?: string;
  /** Called on successful fork with the redirect URL */
  onSuccess?: (response: ForkResponse) => void;
  /** Called on fork error */
  onError?: (error: Error) => void;
  /** Custom className for styling overrides */
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

/** Fork/remix icon -- two diverging branches */
function RemixIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Main trunk */}
      <path d="M10 16V10" />
      {/* Left branch */}
      <path d="M10 10L5 5" />
      {/* Right branch */}
      <path d="M10 10L15 5" />
      {/* Branch endpoints */}
      <circle cx={5} cy={4} r={1.5} fill="currentColor" stroke="none" />
      <circle cx={15} cy={4} r={1.5} fill="currentColor" stroke="none" />
      <circle cx={10} cy={17} r={1.5} fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Loading spinner */
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className ?? ''}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx={12}
        cy={12}
        r={10}
        stroke="currentColor"
        strokeWidth={3}
        strokeDasharray="31.4 31.4"
        strokeLinecap="round"
        opacity={0.3}
      />
      <circle
        cx={12}
        cy={12}
        r={10}
        stroke="currentColor"
        strokeWidth={3}
        strokeDasharray="31.4 31.4"
        strokeDashoffset="23.55"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ============================================================================
// Format Helpers
// ============================================================================

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

// ============================================================================
// Component
// ============================================================================

export function RemixButton({
  type,
  sourceId,
  defaultTitle,
  remixCount,
  variant = 'full',
  disabled = false,
  disabledReason,
  onSuccess,
  onError,
  className = '',
}: RemixButtonProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRemix = useCallback(async () => {
    if (disabled || loading) return;

    setLoading(true);
    setSuccess(false);

    try {
      let response: ForkResponse;

      if (type === 'scene') {
        response = await remixAPI.forkScene({
          sourceWorldId: sourceId,
          title: defaultTitle ?? `Remix of ${sourceId}`,
        });
      } else {
        response = await remixAPI.forkAsset({
          sourceAssetId: sourceId,
          title: defaultTitle ?? `Remix of ${sourceId}`,
        });
      }

      setSuccess(true);
      onSuccess?.(response);

      // Redirect to Creator Studio after brief success feedback
      setTimeout(() => {
        window.location.href = response.redirectUrl;
      }, 600);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [type, sourceId, defaultTitle, disabled, loading, onSuccess, onError]);

  // ---- Compact variant (card overlay) ----
  if (variant === 'compact') {
    return (
      <button
        onClick={handleRemix}
        disabled={disabled || loading}
        title={disabled ? disabledReason : 'Remix this'}
        aria-label={
          disabled
            ? disabledReason ?? 'Remix unavailable'
            : `Remix${remixCount != null ? ` (${formatCount(remixCount)} remixes)` : ''}`
        }
        className={`
          group relative inline-flex items-center gap-1.5
          px-2.5 py-1.5 rounded-lg text-xs font-medium
          transition-all duration-200
          ${
            disabled
              ? 'bg-zinc-800/60 text-zinc-500 cursor-not-allowed'
              : success
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-white/10 text-white/80 hover:bg-indigo-500/20 hover:text-indigo-300 border border-white/10 hover:border-indigo-500/30 backdrop-blur-sm'
          }
          ${className}
        `}
      >
        {loading ? (
          <Spinner className="w-3.5 h-3.5" />
        ) : success ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <RemixIcon className="w-3.5 h-3.5" />
        )}
        {remixCount != null && remixCount > 0 && (
          <span className="text-[10px] opacity-70">{formatCount(remixCount)}</span>
        )}
      </button>
    );
  }

  // ---- Full variant (detail page) ----
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <button
        onClick={handleRemix}
        disabled={disabled || loading}
        title={disabled ? disabledReason : undefined}
        aria-label={
          disabled
            ? disabledReason ?? 'Remix unavailable'
            : 'Remix this content'
        }
        className={`
          group relative inline-flex items-center gap-2.5
          px-5 py-2.5 rounded-xl text-sm font-semibold
          transition-all duration-200 shadow-lg
          ${
            disabled
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
              : success
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/10'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/25 active:scale-[0.98]'
          }
        `}
      >
        {loading ? (
          <Spinner className="w-4.5 h-4.5" />
        ) : success ? (
          <svg className="w-4.5 h-4.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <RemixIcon className="w-4.5 h-4.5" />
        )}
        <span>{loading ? 'Remixing...' : success ? 'Remixed!' : 'Remix'}</span>
      </button>

      {/* Remix count badge */}
      {remixCount != null && remixCount > 0 && (
        <div
          className="
            inline-flex items-center gap-1.5 px-3 py-1.5
            rounded-lg bg-white/5 border border-white/10
            text-xs text-zinc-400
          "
          aria-label={`${remixCount} remixes`}
        >
          <RemixIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-medium text-zinc-300">{formatCount(remixCount)}</span>
          <span className="text-zinc-500">remixes</span>
        </div>
      )}
    </div>
  );
}
